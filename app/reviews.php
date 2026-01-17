<?php
declare(strict_types=1);

/**
 * Moderación simple server-side (para no depender de checks del JS)
 * y publicación según umbrales similares a valoraciones.js :contentReference[oaicite:4]{index=4}
 */

function initials(string $name): string {
    $name = trim($name);
    if ($name === '') return 'C';
    $parts = preg_split('/\s+/', $name) ?: [];
    $parts = array_values(array_filter($parts, fn($x) => trim((string)$x) !== ''));
    if (count($parts) === 1) return mb_strtoupper(mb_substr($parts[0], 0, 1));
    $a = mb_substr($parts[0], 0, 1);
    $b = mb_substr($parts[count($parts) - 1], 0, 1);
    return mb_strtoupper($a . $b);
}

function normalize_text(string $s): string {
    $s = mb_strtolower($s);
    // quitar acentos
    $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
    $s = preg_replace('/[^a-z0-9ñ\s]/u', ' ', $s) ?? $s;
    $s = preg_replace('/\s+/', ' ', $s) ?? $s;
    return trim($s);
}

function contains_offensive(string $text): bool {
    $t = normalize_text($text);

    $blocked = [
        'hijoputa', 'hijo de puta', 'hija de puta', 'hdp',
        'puta', 'puto', 'mierda', 'cabron', 'gilipollas', 'subnormal',
        'imbecil', 'maricon', 'idiota', 'estupido', 'coño', 'joder',
        'hostia', 'carajo', 'pendejo', 'verga', 'culo', 'polla'
    ];

    foreach ($blocked as $term) {
        $term = normalize_text($term);
        if ($term !== '' && str_contains($t, $term)) return true;
    }

    $patterns = [
        '/\b(eres|sois|son)\s+(un|una)?\s*(idiota|imbecil|subnormal|gilipollas|estupido)\b/u',
        '/\bque\s+(asco|mierda)\b/u'
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $t)) return true;
    }

    return false;
}

function looks_like_spam(string $text): bool {
    $t = trim($text);
    if ($t === '') return false;

    // URLs múltiples
    preg_match_all('/https?:\/\/|www\./i', $t, $m);
    if (count($m[0]) >= 2) return true;

    // demasiados símbolos repetidos
    if (preg_match('/([!?.])\1{4,}/', $t)) return true;

    // demasiadas mayúsculas
    $letters = preg_replace('/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]/u', '', $t) ?? '';
    if (mb_strlen($letters) >= 20) {
        $upper = preg_replace('/[^A-ZÁÉÍÓÚÜÑ]/u', '', $t) ?? '';
        $ratio = mb_strlen($upper) / max(1, mb_strlen($letters));
        if ($ratio > 0.7) return true;
    }

    return false;
}

function quality_score(string $text): float {
    $t = trim($text);
    $len = mb_strlen($t);
    if ($len < 10) return 0.0;

    $words = preg_split('/\s+/', $t) ?: [];
    $words = array_values(array_filter($words, fn($w) => trim((string)$w) !== ''));
    $wc = count($words);

    $unique = count(array_unique(array_map('mb_strtolower', $words)));
    $uniqueRatio = $unique / max(1, $wc);

    $hasPunct = (bool)preg_match('/[.!?]/', $t);
    $hasComma = (bool)preg_match('/,/', $t);

    $fLen = max(0.0, min(1.0, ($len - 20) / 120));
    $fWords = max(0.0, min(1.0, ($wc - 6) / 20));
    $fUnique = max(0.0, min(1.0, ($uniqueRatio - 0.35) / 0.35));
    $fPunct = ($hasPunct ? 0.7 : 0.0) + ($hasComma ? 0.3 : 0.0);

    $spam = looks_like_spam($t) ? 0.0 : 1.0;

    $score = (0.25 * $fLen) + (0.25 * $fWords) + (0.20 * $fUnique) + (0.15 * $fPunct) + (0.15 * $spam);
    return max(0.0, min(1.0, $score));
}

function publish_decision(int $stars, string $comment, float $score, bool $spam, bool $offensive): bool {
    // Umbrales alineados con valoraciones.js :contentReference[oaicite:5]{index=5}
    if ($offensive || $spam) return false;
    if ($stars < 3) return false;
    if (mb_strlen(trim($comment)) < 25) return false;
    if ($score < 0.65) return false;
    return true;
}
