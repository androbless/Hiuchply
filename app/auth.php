<?php
declare(strict_types=1);

function user_public(array $row): array {
    return [
        'id' => (int)$row['id'],
        'name' => $row['name'] ?? '',
        'email' => $row['email'] ?? '',
        'accountType' => $row['account_type'] ?? null,
        'phone' => $row['phone'] ?? null,
        'age' => isset($row['age']) ? (int)$row['age'] : null,
        'memberSince' => isset($row['member_since']) ? (string)$row['member_since'] : null,
        'createdAt' => $row['created_at'] ?? null,
    ];
}

function current_user(): ?array {
    $uid = $_SESSION['user_id'] ?? null;
    if (!$uid) return null;

    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $st->execute([(int)$uid]);
    $row = $st->fetch();
    if (!$row) return null;
    return user_public($row);
}

function require_user(): array {
    $u = current_user();
    if (!$u) fail(401, 'No autenticado.');
    return $u;
}

function auth_login(string $email, string $password, array $config): array {
    rate_limit('login', 12, 300, $config); // 12 intentos / 5 min

    $email = clean_email($email);

    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $st->execute([$email]);
    $row = $st->fetch();

    // Respuesta uniforme (no filtrar si existe o no)
    if (!$row) {
        fail(401, 'Credenciales incorrectas.');
    }

    // Bloqueo por intentos
    $lockUntil = $row['lock_until'] ?? null;
    if ($lockUntil && strtotime((string)$lockUntil) > time()) {
        fail(429, 'Cuenta temporalmente bloqueada. Intenta más tarde.');
    }

    $hash = (string)($row['password_hash'] ?? '');
    if ($hash === '' || !password_verify($password, $hash)) {
        // sumar intento fallido
        $fails = (int)($row['failed_login_attempts'] ?? 0);
        $fails++;

        $lock = null;
        if ($fails >= 8) { // umbral
            $lock = date('Y-m-d H:i:s', time() + 15 * 60); // 15 min
            $fails = 0; // resetea contador tras bloquear
        }

        $up = $pdo->prepare('UPDATE users SET failed_login_attempts = ?, lock_until = ? WHERE id = ?');
        $up->execute([$fails, $lock, (int)$row['id']]);

        fail(401, 'Credenciales incorrectas.');
    }

    // Login OK
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$row['id'];

    $pdo->prepare('UPDATE users SET failed_login_attempts = 0, lock_until = NULL, last_login_at = NOW() WHERE id = ?')
        ->execute([(int)$row['id']]);

    return user_public($row);
}

function auth_register(string $name, string $email, string $password, array $config): array {
    rate_limit('register', 8, 300, $config); // 8 / 5 min

    $name = str_limit(trim($name), 120);
    $email = clean_email($email);

    if ($name === '' || mb_strlen($name) < 2) fail(422, 'Nombre inválido.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail(422, 'Email inválido.');
    if (strlen($password) < 8) fail(422, 'La contraseña debe tener al menos 8 caracteres.');

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!$hash) fail(500, 'No se pudo crear la contraseña.');

    $pdo = db();

    try {
        $st = $pdo->prepare('INSERT INTO users (name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
        $st->execute([$name, $email, $hash]);
        $id = (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
        // Duplicado email
        if ($e->getCode() === '23000') {
            fail(409, 'Ese email ya está registrado.');
        }
        throw $e;
    }

    // Autologin
    session_regenerate_id(true);
    $_SESSION['user_id'] = $id;

    $st2 = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $st2->execute([$id]);
    $row = $st2->fetch();
    return $row ? user_public($row) : ['id' => $id, 'name' => $name, 'email' => $email];
}

function auth_logout(): void {
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
        session_destroy();
    }
}
