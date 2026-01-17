<?php
declare(strict_types=1);

function method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function wants_json(): bool {
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return str_contains($accept, 'application/json') || str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api');
}

function request_json(): array {
    $ct = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (!str_contains($ct, 'application/json')) return [];
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function query_string(string $key, string $default = ''): string {
    $v = $_GET[$key] ?? $default;
    return is_string($v) ? $v : $default;
}

function query_int(string $key, int $default = 0, int $min = PHP_INT_MIN, int $max = PHP_INT_MAX): int {
    $raw = $_GET[$key] ?? null;
    if ($raw === null) return $default;
    $n = filter_var($raw, FILTER_VALIDATE_INT);
    if ($n === false) return $default;
    if ($n < $min) return $min;
    if ($n > $max) return $max;
    return $n;
}

function json_response(array $data, int $status = 200): void {
    if (headers_sent()) return;

    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $error, array $extra = []): void {
    $payload = array_merge(['error' => $error], $extra);
    json_response($payload, $status);
}

function ok(array $data = [], int $status = 200): void {
    json_response($data, $status);
}
