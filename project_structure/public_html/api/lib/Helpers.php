<?php
class Helpers {
    public static function jsonInput(): array {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '{}', true);
        return is_array($data) ? $data : [];
    }

    public static function ok(array $payload = []): void {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => true, 'data' => $payload], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function fail(string $message, int $code = 400, array $errors = []): void {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'message' => $message, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function str($val): string {
        return trim((string)($val ?? ''));
    }

    public static function cleanEmail($val): string {
        return filter_var(self::str($val), FILTER_SANITIZE_EMAIL) ?: '';
    }

    public static function ip(): string {
        return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public static function hasPHPMailer(): bool {
        return file_exists(__DIR__ . '/../vendor/PHPMailer/src/PHPMailer.php');
    }
}
