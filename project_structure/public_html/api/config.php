<?php
// Seguridad básica: bloquear acceso directo si se intenta abrir este archivo
if (basename($_SERVER['SCRIPT_NAME']) === basename(__FILE__)) { http_response_code(403); exit; }

// ===== MySQL (Hostinger) =====
define('DB_HOST', 'localhost'); // En Hostinger suele ser localhost
define('DB_NAME', 'u672528510_huichplydata');
define('DB_USER', 'u672528510_admindatabase');
define('DB_PASS', 'B8LOwG4mb?c');
define('DB_CHARSET', 'utf8mb4');

// ===== Email =====
// Dirección receptora (a dónde llegará el resumen de cada solicitud)
define('MAIL_TO', 'solicitudes.clientes@huichply.com');

// Dirección remitente: usa el mismo buzón del dominio para máxima entregabilidad.
define('MAIL_FROM', 'solicitudes.clientes@huichply.com');
define('MAIL_FROM_NAME', 'Huichply Notificador');

// Modo preferente: SMTP (Hostinger)
define('SMTP_ENABLED', true);
define('SMTP_HOST', 'smtp.hostinger.com'); // habitual en Hostinger
define('SMTP_PORT', 465);                  // 465 (SSL) o 587 (TLS)
define('SMTP_SECURE', 'ssl');              // 'ssl' o 'tls'
define('SMTP_USER', 'solicitudes.clientes@huichply.com');
define('SMTP_PASS', 'Solicitudes_databasehuichply09');

// Si no está PHPMailer disponible o SMTP falla, se probará mail() como fallback.
define('MAIL_FALLBACK_TO_PHP_MAIL', true);

// ===== Varios =====
define('APP_ENV', 'production');           // 'development' para debug extendido
