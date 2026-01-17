<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';

date_default_timezone_set($config['app']['timezone'] ?? 'Europe/Madrid');

$storage = $config['paths']['storage'] ?? (dirname(__DIR__) . '/storage');
@is_dir($storage . '/logs') || @mkdir($storage . '/logs', 0755, true);
@is_dir($storage . '/ratelimit') || @mkdir($storage . '/ratelimit', 0755, true);

ini_set('log_errors', '1');
ini_set('error_log', $storage . '/logs/php-error.log');

if (($config['env'] ?? 'production') === 'development') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(E_ALL);
}

require __DIR__ . '/http.php';
require __DIR__ . '/db.php';
require __DIR__ . '/security.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/reviews.php';

start_secure_session($config);

set_exception_handler(function (Throwable $e) use ($config) {
    $isApi = str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api');
    $msg = (($config['env'] ?? 'production') === 'development')
        ? $e->getMessage()
        : 'Error interno.';

    if ($isApi) {
        json_response(['error' => $msg], 500);
        return;
    }

    http_response_code(500);
    echo 'Error interno.';
});
