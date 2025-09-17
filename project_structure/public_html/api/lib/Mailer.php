<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/Helpers.php';

class Mailer {

    public static function send(string $subject, string $htmlBody, string $altBody = ''): bool {
        // Si hay PHPMailer disponible y SMTP habilitado, usarlo
        if (SMTP_ENABLED && Helpers::hasPHPMailer()) {
            try {
                require_once __DIR__ . '/../vendor/PHPMailer/src/PHPMailer.php';
                require_once __DIR__ . '/../vendor/PHPMailer/src/SMTP.php';
                require_once __DIR__ . '/../vendor/PHPMailer/src/Exception.php';

                $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                if (strtolower(SMTP_SECURE) === 'ssl') {
                    $mail->isSMTP();
                    $mail->Host       = SMTP_HOST;
                    $mail->SMTPAuth   = true;
                    $mail->Username   = SMTP_USER;
                    $mail->Password   = SMTP_PASS;
                    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // ssl
                    $mail->Port       = SMTP_PORT;
                } else {
                    $mail->isSMTP();
                    $mail->Host       = SMTP_HOST;
                    $mail->SMTPAuth   = true;
                    $mail->Username   = SMTP_USER;
                    $mail->Password   = SMTP_PASS;
                    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS; // tls
                    $mail->Port       = SMTP_PORT;
                }

                $mail->CharSet = 'UTF-8';
                $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
                $mail->addAddress(MAIL_TO);
                $mail->Subject = $subject;
                $mail->isHTML(true);
                $mail->Body    = $htmlBody;
                $mail->AltBody = $altBody ?: strip_tags($htmlBody);
                $mail->send();
                return true;
            } catch (\Throwable $e) {
                if (APP_ENV !== 'production') error_log('SMTP error: ' . $e->getMessage());
                if (!MAIL_FALLBACK_TO_PHP_MAIL) return false;
                // Fallback a mail() si permitido
            }
        }

        if (!MAIL_FALLBACK_TO_PHP_MAIL) return false;

        // Fallback sencillo a mail()
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM . ">\r\n";
        return @mail(MAIL_TO, $subject, $htmlBody, $headers);
    }
}
