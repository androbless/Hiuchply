<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

$config = require __DIR__ . '/../app/config.php';

$path = $_GET['path'] ?? '';
if (!is_string($path)) $path = '';
$path = trim($path, '/');

$segments = $path === '' ? [] : explode('/', $path);
$m = method();

// Helpers
function must_method(string $expected): void {
    if (method() !== strtoupper($expected)) fail(405, 'Método no permitido.');
}

function body(): array {
    // JSON preferente, fallback form
    $j = request_json();
    if (!empty($j)) return $j;
    return is_array($_POST) ? $_POST : [];
}

// ROUTES
// GET /api/health
if ($segments === ['health'] && $m === 'GET') {
    ok(['ok' => true, 'time' => date('c')]);
}

// GET /api/csrf  -> devuelve token y refresca cookie XSRF
if ($segments === ['csrf'] && $m === 'GET') {
    $t = csrf_token($config);
    ok(['csrfToken' => $t]);
}

// AUTH
// POST /api/auth/register
if (count($segments) === 2 && $segments[0] === 'auth' && $segments[1] === 'register') {
    must_method('POST');
    csrf_verify($config);

    $b = body();
    $name = (string)($b['name'] ?? '');
    $email = (string)($b['email'] ?? '');
    $password = (string)($b['password'] ?? '');

    $user = auth_register($name, $email, $password, $config);
    ok(['user' => $user]);
}

// POST /api/auth/login
if (count($segments) === 2 && $segments[0] === 'auth' && $segments[1] === 'login') {
    must_method('POST');
    csrf_verify($config);

    $b = body();
    $email = (string)($b['email'] ?? '');
    $password = (string)($b['password'] ?? '');

    $user = auth_login($email, $password, $config);
    ok(['user' => $user]);
}

// POST /api/auth/logout
if (count($segments) === 2 && $segments[0] === 'auth' && $segments[1] === 'logout') {
    must_method('POST');
    csrf_verify($config);

    auth_logout();
    ok(['ok' => true]);
}

// GET /api/auth/me
if (count($segments) === 2 && $segments[0] === 'auth' && $segments[1] === 'me' && $m === 'GET') {
    $u = current_user();
    ok(['user' => $u]);
}

// PROFILE
// POST /api/profile/complete  (para completar cuenta_usuario)
if (count($segments) === 2 && $segments[0] === 'profile' && $segments[1] === 'complete') {
    must_method('POST');
    csrf_verify($config);

    $u = require_user();
    $b = body();

    $fullName = str_limit((string)($b['fullName'] ?? $b['name'] ?? ''), 120);
    $age = (int)($b['age'] ?? 0);
    $phone = str_limit((string)($b['phone'] ?? ''), 30);
    $address = str_limit((string)($b['address'] ?? ''), 255);

    if ($fullName === '' || mb_strlen($fullName) < 2) fail(422, 'Nombre inválido.');
    if ($age < 18 || $age > 99) fail(422, 'Edad inválida.');
    if ($phone === '' || mb_strlen($phone) < 9) fail(422, 'Teléfono inválido.');
    if ($address === '' || mb_strlen($address) < 8) fail(422, 'Dirección inválida.');

    $pdo = db();
    $st = $pdo->prepare('UPDATE users SET name=?, age=?, phone=?, account_type=?, member_since=?, updated_at=NOW() WHERE id=?');
    $memberSince = (string)date('Y');
    $st->execute([$fullName, $age, $phone, 'particular', $memberSince, (int)$u['id']]);

    // dirección principal
    $pdo->prepare('INSERT INTO user_addresses (user_id, label, address_text, is_primary, created_at)
                   VALUES (?, ?, ?, 1, NOW())
                   ON DUPLICATE KEY UPDATE address_text=VALUES(address_text), updated_at=NOW()')
        ->execute([(int)$u['id'], 'Principal', $address]);

    $fresh = current_user();
    ok(['user' => $fresh]);
}

// ORDERS
// POST /api/orders   y  POST /api/orders/create  (Pedidos.js lo intenta así) 
if (count($segments) >= 1 && $segments[0] === 'orders') {
    // /api/orders (GET list)
    if (count($segments) === 1 && $m === 'GET') {
        $u = require_user();
        $pdo = db();
        $st = $pdo->prepare('SELECT public_ref, status, service_type, total_price, created_at, raw_json
                             FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 200');
        $st->execute([(int)$u['id']]);
        $items = [];
        while ($r = $st->fetch()) {
            $raw = json_decode((string)$r['raw_json'], true);
            $items[] = array_merge(
                [
                    'id' => $r['public_ref'],
                    'status' => $r['status'],
                    'serviceType' => $r['service_type'],
                    'totalPrice' => (float)$r['total_price'],
                    'createdAt' => $r['created_at'],
                ],
                is_array($raw) ? $raw : []
            );
        }
        ok(['items' => $items]);
    }

    // /api/orders (POST create)
    if (count($segments) === 1 && $m === 'POST') {
        csrf_verify($config);
        $u = require_user();

        $order = request_json();
        if (!is_array($order) || empty($order)) fail(400, 'Payload inválido.');

        // Permitir que el front mande su "id" tipo YEV-...
        $publicRef = str_limit((string)($order['id'] ?? ''), 40);
        if ($publicRef === '') {
            $publicRef = 'YEV-' . time();
        }

        $serviceType = str_limit((string)($order['serviceType'] ?? $order['service_type'] ?? ''), 30);
        $status = str_limit((string)($order['status'] ?? 'pendiente'), 20);
        $urgency = str_limit((string)($order['urgency'] ?? $order['serviceUrgency'] ?? ''), 20);

        $distance = (float)($order['distance'] ?? 0);
        $heavyItems = (int)($order['heavyItems'] ?? 0);
        $lightItems = (int)($order['lightItems'] ?? 0);
        $assistLevel = str_limit((string)($order['assistLevel'] ?? 'solo'), 20);

        $serviceDate = str_limit((string)($order['serviceDate'] ?? ''), 20);
        $serviceTime = str_limit((string)($order['serviceTime'] ?? ''), 30);
        $paymentMethod = str_limit((string)($order['paymentMethod'] ?? ''), 30);
        $totalPrice = (float)($order['totalPrice'] ?? 0);

        $pickupAddress = str_limit((string)($order['pickupAddress'] ?? ''), 255);
        $deliveryAddress = str_limit((string)($order['deliveryAddress'] ?? ''), 255);

        $rawJson = json_encode($order, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare('INSERT INTO orders
                (user_id, public_ref, status, service_type, urgency, distance_km, heavy_items, light_items, assist_level,
                 service_date, service_time, payment_method, total_price, pickup_address, delivery_address, raw_json,
                 created_at, updated_at)
                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');

            $st->execute([
                (int)$u['id'], $publicRef, $status, $serviceType, $urgency,
                $distance, $heavyItems, $lightItems, $assistLevel,
                $serviceDate !== '' ? $serviceDate : null,
                $serviceTime !== '' ? $serviceTime : null,
                $paymentMethod !== '' ? $paymentMethod : null,
                $totalPrice,
                $pickupAddress !== '' ? $pickupAddress : null,
                $deliveryAddress !== '' ? $deliveryAddress : null,
                $rawJson,
            ]);

            $orderId = (int)$pdo->lastInsertId();

            // Stops
            $stops = $order['addressStops'] ?? [];
            if (is_array($stops) && count($stops) > 0) {
                $ins = $pdo->prepare('INSERT INTO order_stops
                    (order_id, stop_order, stop_type, label, address_text, access_type, chalet_number, floor, door, store_name, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');

                foreach ($stops as $s) {
                    if (!is_array($s)) continue;
                    $access = is_array($s['access'] ?? null) ? $s['access'] : [];
                    $ins->execute([
                        $orderId,
                        (int)($s['order'] ?? 0),
                        str_limit((string)($s['type'] ?? ''), 30),
                        str_limit((string)($s['label'] ?? ''), 80),
                        str_limit((string)($s['address'] ?? ''), 255),
                        str_limit((string)($access['accessType'] ?? ''), 40),
                        str_limit((string)($access['chaletNumber'] ?? ''), 30),
                        str_limit((string)($access['floor'] ?? ''), 30),
                        str_limit((string)($access['door'] ?? ''), 30),
                        str_limit((string)($access['storeName'] ?? ''), 80),
                    ]);
                }
            }

            // Items / products
            $products = $order['products'] ?? [];
            if (is_array($products) && count($products) > 0) {
                $insP = $pdo->prepare('INSERT INTO order_items (order_id, name, description, is_heavy, created_at)
                                       VALUES (?, ?, ?, ?, NOW())');
                foreach ($products as $p) {
                    if (!is_array($p)) continue;
                    $insP->execute([
                        $orderId,
                        str_limit((string)($p['name'] ?? ''), 120),
                        str_limit((string)($p['description'] ?? ''), 255),
                        !empty($p['isHeavy']) ? 1 : 0
                    ]);
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        // Devuelve "id" como string (tu front espera string) 
        ok(['id' => $publicRef]);
    }

    // /api/orders/create (alias)
    if (count($segments) === 2 && $segments[1] === 'create') {
        // re-rutear a /orders POST
        if ($m !== 'POST') fail(405, 'Método no permitido.');
        // Simula que era /orders POST
        $_GET['path'] = 'orders';
        require __DIR__ . '/index.php';
    }
}

// REVIEWS
// GET /api/reviews/featured?limit=3   (valoraciones.js lo consume) 
if (count($segments) >= 1 && $segments[0] === 'reviews') {
    // POST /api/reviews (Valorar.js) :contentReference[oaicite:9]{index=9}
    if (count($segments) === 1 && $m === 'POST') {
        csrf_verify($config);
        $u = require_user();

        $payload = request_json();
        if (!is_array($payload) || empty($payload)) fail(400, 'Payload inválido.');

        $stars = (int)($payload['estrellas'] ?? $payload['stars'] ?? 0);
        $comment = (string)($payload['comentario'] ?? $payload['comment'] ?? '');
        $tipoRaw = str_limit((string)($payload['tipoRaw'] ?? ''), 30);
        $tipo = str_limit((string)($payload['tipo'] ?? ''), 60);
        $color = str_limit((string)($payload['color'] ?? ''), 40);
        $orderId = $payload['orderId'] ?? null;

        if ($stars < 1 || $stars > 5) fail(422, 'Estrellas inválidas.');
        $comment = str_limit(trim($comment), 1000);
        if (mb_strlen($comment) < 10) fail(422, 'El comentario debe tener al menos 10 caracteres.');

        $off = contains_offensive($comment);
        $spam = looks_like_spam($comment);
        $score = quality_score($comment);
        $publish = publish_decision($stars, $comment, $score, $spam, $off);

        $name = str_limit((string)($u['name'] ?? 'Cliente'), 120);
        $ini = initials($name);

        $rawJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $pdo = db();

        // Dedupe: 1 reseña por usuario y orderId (si viene)
        if (is_string($orderId) && trim($orderId) !== '') {
            $chk = $pdo->prepare('SELECT id FROM reviews WHERE user_id=? AND order_public_ref=? LIMIT 1');
            $chk->execute([(int)$u['id'], str_limit(trim($orderId), 40)]);
            if ($chk->fetch()) {
                fail(409, 'Ya valoraste este servicio.');
            }
        }

        $st = $pdo->prepare('INSERT INTO reviews
            (user_id, order_public_ref, name, initials, color, service_type_raw, service_type, stars, comment,
             moderation_score, moderation_flags_json, is_published, raw_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');

        $flags = ['spam' => $spam, 'offensive' => $off];
        $st->execute([
            (int)$u['id'],
            (is_string($orderId) && trim($orderId) !== '') ? str_limit(trim($orderId), 40) : null,
            $name,
            $ini,
            $color !== '' ? $color : '#2D51FF, #1c2fbf',
            $tipoRaw !== '' ? $tipoRaw : null,
            $tipo !== '' ? $tipo : null,
            $stars,
            $comment,
            $score,
            json_encode($flags, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $publish ? 1 : 0,
            $rawJson,
        ]);

        $rid = (int)$pdo->lastInsertId();
        ok(['id' => $rid, 'published' => $publish, 'moderation' => ['score' => $score, 'flags' => $flags]]);
    }

    // GET /api/reviews/featured
    if (count($segments) === 2 && $segments[1] === 'featured' && $m === 'GET') {
        $limit = query_int('limit', 3, 1, 12);

        $pdo = db();
        $st = $pdo->prepare('SELECT name, initials, color, service_type, stars, comment, created_at
                             FROM reviews
                             WHERE is_published=1
                             ORDER BY stars DESC, moderation_score DESC, created_at DESC
                             LIMIT ' . (int)$limit);
        $st->execute();

        $items = [];
        while ($r = $st->fetch()) {
            $items[] = [
                'nombre' => $r['name'],
                'iniciales' => $r['initials'],
                'color' => $r['color'],
                'tipo' => $r['service_type'] ?? 'Servicio',
                'estrellas' => (int)$r['stars'],
                'comentario' => $r['comment'],
                'createdAt' => $r['created_at'],
            ];
        }

        ok(['items' => $items]);
    }

    // GET /api/reviews/summary
    if (count($segments) === 2 && $segments[1] === 'summary' && $m === 'GET') {
        $pdo = db();
        $st = $pdo->query('SELECT COUNT(*) AS total, COALESCE(AVG(stars),0) AS avg
                           FROM reviews WHERE is_published=1');
        $r = $st->fetch() ?: ['total' => 0, 'avg' => 0];

        ok(['total' => (int)$r['total'], 'avg' => round((float)$r['avg'], 1)]);
    }
}

fail(404, 'No encontrado.');
