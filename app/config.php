<?php
declare(strict_types=1);

$root = realpath(__DIR__ . '/..') ?: dirname(__DIR__);

return [
    'env' => 'production', // pon 'development' en local si quieres ver errores

    'app' => [
        'name' => 'Huichply',
        'timezone' => 'Europe/Madrid',
    ],

    'paths' => [
        'root' => $root,
        'storage' => $root . '/storage',
    ],

    // IMPORTANTE: rellena con los datos de tu BD de Hostinger
    'db' => [
        'host' => 'localhost',
        'name' => 'CAMBIA_ESTE_NOMBRE',
        'user' => 'CAMBIA_ESTE_USUARIO',
        'pass' => 'CAMBIA_ESTA_PASSWORD',
        'charset' => 'utf8mb4',
    ],

    'security' => [
        'session_name' => 'huichply_sess',
        // 'auto' = secure si detecta HTTPS
        'cookie_secure' => 'auto',

        // CSRF (doble submit: cookie legible por JS + header)
        'csrf_cookie' => 'XSRF-TOKEN',
        'csrf_header' => 'X-CSRF-Token',

        // Clave app (mínimo 32 chars). CAMBIAR en producción.
        // Ej: pega un valor largo aleatorio.
        'app_key' => 'CHANGE_ME__PUT_A_LONG_RANDOM_STRING_HERE_32+_CHARS',
    ],
];
