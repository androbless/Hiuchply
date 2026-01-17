<?php
declare(strict_types=1);

function is_https(): bool {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if (($_SERVER['SERVER_PORT'] ?? '') === '443') return true;
    if (strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') return true;
    return false;
}

function start_secure_session(array $config): void {
    $sec = $config['security'] ?? [];
    $name = (string)($sec['session_name'] ?? 'app_sess');

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');

    $secureOpt = $sec['cookie_secure'] ?? 'auto';
    $secure = ($secureOpt === 'auto') ? is_https() : (bool)$secureOpt;

    session_name($name);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    // CSRF token preparado siempre (y cookie XSRF para JS)
    csrf_ensure_cookie($config);
}

function client_ip(): string {
    // En shared hosting suele ser suficiente REMOTE_ADDR
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return is_string($ip) ? $ip : '0.0.0.0';
}

function rate_limit(string $bucket, int $max, int $windowSeconds, array $config): void {
    $storage = $config['paths']['storage'] ?? (dirname(__DIR__) . '/storage');
    $dir = $storage . '/ratelimit';
    @is_dir($dir) || @mkdir($dir, 0755, true);

    $ip = client_ip();
    $key = preg_replace('/[^a-zA-Z0-9._-]/', '_', $bucket) . '_' . md5($ip) . '.json';
    $file = $dir . '/' . $key;

    $now = time();

    $fh = @fopen($file, 'c+');
    if (!$fh) return; // si no se puede escribir, no bloquea

    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $state = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
        if (!is_array($state)) $state = ['reset_at' => $now + $windowSeconds, 'count' => 0];

        $resetAt = (int)($state['reset_at'] ?? ($now + $windowSeconds));
        $count = (int)($state['count'] ?? 0);

        if ($now >= $resetAt) {
            $resetAt = $now + $windowSeconds;
            $count = 0;
        }

        $count++;

        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode(['reset_at' => $resetAt, 'count' => $count]));

        if ($count > $max) {
            $retry = max(1, $resetAt - $now);
            header('Retry-After: ' . $retry);
            fail(429, 'Demasiadas peticiones. Intenta más tarde.', ['retryAfter' => $retry]);
        }
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function same_origin_or_fail(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!$origin) return; // algunos navegadores/requests no lo mandan

    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (!$host) return;

    $originHost = parse_url($origin, PHP_URL_HOST);
    if (!$originHost) return;

    if (strcasecmp($originHost, $host) !== 0) {
        fail(403, 'Origen no permitido.');
    }
}

function csrf_token(array $config): string {
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token']) || strlen($_SESSION['csrf_token']) < 32) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    csrf_ensure_cookie($config);
    return $_SESSION['csrf_token'];
}

function csrf_ensure_cookie(array $config): void {
    $sec = $config['security'] ?? [];
    $cookieName = (string)($sec['csrf_cookie'] ?? 'XSRF-TOKEN');

    if (headers_sent()) return;

    $secureOpt = $sec['cookie_secure'] ?? 'auto';
    $secure = ($secureOpt === 'auto') ? is_https() : (bool)$secureOpt;

    $token = $_SESSION['csrf_token'] ?? null;
    if (!is_string($token) || strlen($token) < 32) {
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
    }

    // Cookie NO HttpOnly para poder leerlo desde JS y mandarlo en header
    setcookie($cookieName, $token, [
        'expires' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}

function csrf_verify(array $config): void {
    $m = method();
    if (!in_array($m, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) return;

    same_origin_or_fail();

    $sec = $config['security'] ?? [];
    $headerName = strtoupper(str_replace('-', '_', (string)($sec['csrf_header'] ?? 'X-CSRF-Token')));
    $headerKey = 'HTTP_' . $headerName;

    $sent = $_SERVER[$headerKey] ?? '';
    $sent = is_string($sent) ? $sent : '';

    $expected = $_SESSION['csrf_token'] ?? '';
    $expected = is_string($expected) ? $expected : '';

    if ($sent === '' || $expected === '' || !hash_equals($expected, $sent)) {
        fail(403, 'CSRF inválido o ausente.');
    }
}

function clean_email(string $email): string {
    return strtolower(trim($email));
}

function str_limit(string $s, int $max): string {
    $s = trim($s);
    if (mb_strlen($s) <= $max) return $s;
    return mb_substr($s, 0, $max);
}
