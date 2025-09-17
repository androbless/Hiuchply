<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Helpers.php';
require_once __DIR__ . '/lib/Mailer.php';

header('Access-Control-Allow-Origin: https://huichply.com'); // mismo dominio (ajusta si usas subdominio)
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Helpers::fail('Método no permitido', 405);
}

$data = Helpers::jsonInput();
$tipo = Helpers::str($data['tipo_formulario'] ?? '');

if (!$tipo) Helpers::fail('Falta tipo_formulario');

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $createdId = null;
    $subject   = '';
    $html      = '';
    $table     = '';
    $ip        = Helpers::ip();

    switch ($tipo) {
        case 'domicilio': {
            // Validaciones mínimas
            $nombre = Helpers::str($data['nombre'] ?? '');
            $dirRec = Helpers::str($data['direccion_recogida'] ?? '');
            $cpRec  = Helpers::str($data['cp_recogida'] ?? '');
            $dirEnt = Helpers::str($data['direccion_entrega'] ?? '');
            $cpEnt  = Helpers::str($data['cp_entrega'] ?? '');
            $fecha  = Helpers::str($data['fecha'] ?? '');
            $franja = Helpers::str($data['franja_horaria'] ?? '');
            if ($nombre === '' || $dirRec === '' || $cpRec === '' || $dirEnt === '' || $cpEnt === '' || $fecha === '' || $franja === '') {
                Helpers::fail('Datos incompletos (domicilio)');
            }

            $stmt = $pdo->prepare("
                INSERT INTO domicilio_requests
                (nombre, direccion_recogida, piso_recogida, cp_recogida, direccion_entrega, piso_entrega, cp_entrega, fecha, franja_horaria, confirmacion_furgoneta, comentarios, contacto_whatsapp, contacto_email, contacto_telefono, ip)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $nombre,
                $dirRec,
                Helpers::str($data['piso_recogida'] ?? ''),
                $cpRec,
                $dirEnt,
                Helpers::str($data['piso_entrega'] ?? ''),
                $cpEnt,
                $fecha,
                $franja,
                Helpers::str($data['confirmacion_furgoneta'] ?? ''),
                Helpers::str($data['comentarios'] ?? ''),
                Helpers::str($data['contacto_whatsapp'] ?? ''),
                Helpers::cleanEmail($data['contacto_email'] ?? ''),
                Helpers::str($data['contacto_llamada'] ?? ''),
                $ip
            ]);
            $createdId = (int)$pdo->lastInsertId();

            // Productos
            $productos = is_array($data['productos'] ?? null) ? $data['productos'] : [];
            $medidasPeso = is_array($data['medidas_peso'] ?? null) ? $data['medidas_peso'] : [];

            if ($productos) {
                $ins = $pdo->prepare("
                    INSERT INTO domicilio_products (request_id, producto, cantidad, descripcion, medidas, peso)
                    VALUES (?,?,?,?,?,?)
                ");
                foreach ($productos as $p) {
                    $pid   = (string)($p['id'] ?? '');
                    $med   = $medidasPeso[$pid]['medidas'] ?? '';
                    $peso  = $medidasPeso[$pid]['peso'] ?? null;
                    $ins->execute([
                        $createdId,
                        Helpers::str($p['nombre'] ?? ''),
                        (int)($p['cantidad'] ?? 1),
                        Helpers::str($p['descripcion'] ?? ''),
                        Helpers::str((string)$med),
                        $peso !== null && $peso !== '' ? (float)$peso : null
                    ]);
                }
            }

            $subject = "Nueva solicitud: A un domicilio #{$createdId}";
            $html    = buildEmailHTML('A un domicilio', $createdId, $data, $productos, $medidasPeso);
            break;
        }

        case 'punto_limpio': {
            $nombre = Helpers::str($data['nombre'] ?? '');
            $dirRec = Helpers::str($data['direccion_recogida'] ?? '');
            $cpRec  = Helpers::str($data['cp_recogida'] ?? '');
            $fecha  = Helpers::str($data['fecha'] ?? '');
            $franja = Helpers::str($data['franja_horaria'] ?? '');
            if ($nombre === '' || $dirRec === '' || $cpRec === '' || $fecha === '' || $franja === '') {
                Helpers::fail('Datos incompletos (punto limpio)');
            }

            $stmt = $pdo->prepare("
                INSERT INTO punto_limpio_requests
                (nombre, direccion_recogida, piso_recogida, cp_recogida, fecha, franja_horaria, confirmacion_furgoneta, comentarios, contacto_whatsapp, contacto_email, contacto_telefono, ip)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $nombre,
                $dirRec,
                Helpers::str($data['piso_recogida'] ?? ''),
                $cpRec,
                $fecha,
                $franja,
                Helpers::str($data['confirmacion_furgoneta'] ?? ''),
                Helpers::str($data['comentarios'] ?? ''),
                Helpers::str($data['contacto_whatsapp'] ?? ''),
                Helpers::cleanEmail($data['contacto_email'] ?? ''),
                Helpers::str($data['contacto_llamada'] ?? ''),
                $ip
            ]);
            $createdId = (int)$pdo->lastInsertId();

            $productos = is_array($data['productos'] ?? null) ? $data['productos'] : [];
            $medidasPeso = is_array($data['medidas_peso'] ?? null) ? $data['medidas_peso'] : [];
            if ($productos) {
                $ins = $pdo->prepare("
                    INSERT INTO punto_limpio_products (request_id, producto, cantidad, descripcion, medidas, peso)
                    VALUES (?,?,?,?,?,?)
                ");
                foreach ($productos as $p) {
                    $pid   = (string)($p['id'] ?? '');
                    $med   = $medidasPeso[$pid]['medidas'] ?? '';
                    $peso  = $medidasPeso[$pid]['peso'] ?? null;
                    $ins->execute([
                        $createdId,
                        Helpers::str($p['nombre'] ?? ''),
                        (int)($p['cantidad'] ?? 1),
                        Helpers::str($p['descripcion'] ?? ''),
                        Helpers::str((string)$med),
                        $peso !== null && $peso !== '' ? (float)$peso : null
                    ]);
                }
            }

            $subject = "Nueva solicitud: Punto limpio #{$createdId}";
            $html    = buildEmailHTML('Punto limpio', $createdId, $data, $productos, $medidasPeso);
            break;
        }

        case 'empresas_afiliado': {
            $codigo = Helpers::str($data['codigo_cliente'] ?? '');
            $nombre = Helpers::str($data['nombre_cliente'] ?? '');
            $tel    = Helpers::str($data['telefono_cliente'] ?? '');
            $dirRec = Helpers::str($data['direccion_recogida'] ?? '');
            $cpRec  = Helpers::str($data['cp_recogida'] ?? '');
            $dirEnt = Helpers::str($data['direccion_entrega'] ?? '');
            $cpEnt  = Helpers::str($data['cp_entrega'] ?? '');
            $fecha  = Helpers::str($data['fecha'] ?? '');
            $hora   = Helpers::str($data['hora'] ?? '');
            $tipoP  = Helpers::str($data['tipo_producto'] ?? '');
            if ($codigo === '' || $nombre === '' || $tel === '' || $dirRec === '' || $cpRec === '' || $dirEnt === '' || $cpEnt === '' || $fecha === '' || $hora === '' || $tipoP === '') {
                Helpers::fail('Datos incompletos (empresas afiliado)');
            }

            $stmt = $pdo->prepare("
                INSERT INTO empresas_afiliado_requests
                (codigo_cliente, nombre_cliente, telefono_cliente, direccion_recogida, piso_recogida, cp_recogida, direccion_entrega, piso_entrega, cp_entrega, fecha, hora, tipo_producto, producto_no_acordado_desc, comentarios, ip)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $codigo,
                $nombre,
                $tel,
                $dirRec,
                Helpers::str($data['piso_recogida'] ?? ''),
                $cpRec,
                $dirEnt,
                Helpers::str($data['piso_entrega'] ?? ''),
                $cpEnt,
                $fecha,
                $hora,
                $tipoP,
                Helpers::str($data['producto_no_acordado_desc'] ?? ''),
                Helpers::str($data['comentarios'] ?? ''),
                $ip
            ]);
            $createdId = (int)$pdo->lastInsertId();

            $subject = "Pedido afiliado #{$createdId} (código {$codigo})";
            $html    = buildEmailHTML('Afiliados (Empresas)', $createdId, $data);
            break;
        }

        case 'afiliacion': {
            $nomEmp = Helpers::str($data['nombre_empresa'] ?? '');
            $cif    = Helpers::str($data['cif'] ?? '');
            $resp   = Helpers::str($data['responsable'] ?? '');
            $tel    = Helpers::str($data['telefono_empresa'] ?? '');
            $email  = Helpers::cleanEmail($data['email_empresa'] ?? '');
            $vol    = Helpers::str($data['volumen_envios'] ?? '');
            $otro   = (int)($data['volumen_otro'] ?? 0);
            if ($nomEmp === '' || $cif === '' || $resp === '' || $tel === '' || $email === '' || $vol === '') {
                Helpers::fail('Datos incompletos (afiliación)');
            }

            $stmt = $pdo->prepare("
                INSERT INTO afiliacion_requests
                (nombre_empresa, cif, responsable, telefono_empresa, email_empresa, volumen_envios, volumen_otro, ip)
                VALUES (?,?,?,?,?,?,?,?)
            ");
            $stmt->execute([
                $nomEmp, $cif, $resp, $tel, $email, $vol, $otro, $ip
            ]);
            $createdId = (int)$pdo->lastInsertId();

            $subject = "Nueva solicitud de afiliación #{$createdId}";
            $html    = buildEmailHTML('Solicitud de afiliación', $createdId, $data);
            break;
        }

        default:
            Helpers::fail('tipo_formulario no reconocido');
    }

    // Envío de correo
    $sent = Mailer::send($subject, $html);
    if (!$sent) {
        // No abortamos la transacción si el correo falla, pero lo reportamos
        if (APP_ENV !== 'production') error_log('No se pudo enviar email para ' . $subject);
    }

    $pdo->commit();
    Helpers::ok(['id' => $createdId, 'mail_sent' => $sent]);

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if (APP_ENV !== 'production') error_log($e->getMessage());
    Helpers::fail('Error interno del servidor', 500);
}

// ============== RENDER EMAIL =================
function buildEmailHTML(string $titulo, int $id, array $data, array $productos = [], array $medidasPeso = []): string {
    $escape = fn($v) => htmlspecialchars((string)($v ?? ''), ENT_QUOTES, 'UTF-8');
    $rows = '';
    foreach ($data as $k => $v) {
        if (in_array($k, ['productos','medidas_peso'], true)) continue;
        $rows .= "<tr><td style='padding:6px 8px;border-bottom:1px solid #eee;'><strong>{$escape($k)}</strong></td><td style='padding:6px 8px;border-bottom:1px solid #eee;'>{$escape(is_scalar($v)?$v:json_encode($v,JSON_UNESCAPED_UNICODE))}</td></tr>";
    }

    $productosHtml = '';
    if ($productos) {
        $productosHtml .= "<h3 style='margin:16px 0 8px;'>Productos</h3><table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;border:1px solid #eee'>";
        $productosHtml .= "<tr><th style='text-align:left;padding:8px;border-bottom:1px solid #eee;'>Producto</th><th style='text-align:left;padding:8px;border-bottom:1px solid #eee;'>Cant.</th><th style='text-align:left;padding:8px;border-bottom:1px solid #eee;'>Descripción</th><th style='text-align:left;padding:8px;border-bottom:1px solid #eee;'>Medidas</th><th style='text-align:left;padding:8px;border-bottom:1px solid #eee;'>Peso</th></tr>";
        foreach ($productos as $p) {
            $pid  = (string)($p['id'] ?? '');
            $med  = $medidasPeso[$pid]['medidas'] ?? '';
            $peso = $medidasPeso[$pid]['peso'] ?? '';
            $productosHtml .= "<tr>
                <td style='padding:6px 8px;border-bottom:1px solid #eee;'>{$escape($p['nombre'] ?? '')}</td>
                <td style='padding:6px 8px;border-bottom:1px solid #eee;'>{$escape($p['cantidad'] ?? 1)}</td>
                <td style='padding:6px 8px;border-bottom:1px solid #eee;'>{$escape($p['descripcion'] ?? '')}</td>
                <td style='padding:6px 8px;border-bottom:1px solid #eee;'>{$escape($med)}</td>
                <td style='padding:6px 8px;border-bottom:1px solid #eee;'>{$escape($peso)}</td>
            </tr>";
        }
        $productosHtml .= "</table>";
    }

    $html = "
    <div style='font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222'>
      <h2 style='margin:0 0 8px'>{$escape($titulo)} — ID #{$id}</h2>
      <p style='margin:0 0 14px'>Se recibió una nueva solicitud desde la web.</p>
      <table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;border:1px solid #eee'>{$rows}</table>
      {$productosHtml}
      <p style='margin-top:16px;color:#777'>IP origen: {$escape(Helpers::ip())}</p>
    </div>";
    return $html;
}
