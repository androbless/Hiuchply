<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Incluir configuración
require_once 'config.php';

// Conectar a la base de datos
$connection = connectDB();

// Crear tablas si no existen
createTables($connection);

// Obtener y decodificar los datos JSON
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Datos no válidos']);
    exit;
}

// Sanitizar todos los datos
$tipo = sanitizeInput($data['tipo']);
$datos = sanitizeInput($data['datos']);

try {
    $result = false;
    $emailContent = "";
    $asunto = "";
    
    switch ($tipo) {
        case 'pedido':
            $result = procesarPedido($connection, $datos);
            $asunto = "Nuevo Pedido";
            $emailContent = generarEmailPedido($datos);
            break;
            
        case 'afiliado':
            $result = procesarAfiliado($connection, $datos);
            $asunto = "Nuevo Pedido de Afiliado";
            $emailContent = generarEmailAfiliado($datos);
            break;
            
        case 'afiliacion':
            $result = procesarAfiliacion($connection, $datos);
            $asunto = "Nueva Solicitud de Afiliación";
            $emailContent = generarEmailAfiliacion($datos);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Tipo de formulario no válido']);
            exit;
    }
    
    if ($result) {
        // Enviar correo electrónico
        $emailEnviado = enviarEmail($asunto, $emailContent);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Formulario procesado correctamente',
            'email_enviado' => $emailEnviado
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al procesar el formulario']);
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

$connection->close();

// Funciones para procesar cada tipo de formulario
function procesarPedido($connection, $datos) {
    $stmt = $connection->prepare("INSERT INTO formulario_pedidos 
        (nombre, productos, peso_estimado, confirmacion, direccion_recogida, piso_recogida, cp_recogida, 
        direccion_entrega, piso_entrega, cp_entrega, fecha, franja_horaria, medio_contacto, contacto_detalle, comentarios) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $productosJson = json_encode($datos['productos']);
    
    $stmt->bind_param("ssissssssssssss", 
        $datos['nombre'],
        $productosJson,
        $datos['peso_estimado'],
        $datos['confirmacion'],
        $datos['direccion_recogida'],
        $datos['piso_recogida'],
        $datos['cp_recogida'],
        $datos['direccion_entrega'],
        $datos['piso_entrega'],
        $datos['cp_entrega'],
        $datos['fecha'],
        $datos['franja_horaria'],
        $datos['medio_contacto'],
        $datos['contacto_detalle'],
        $datos['comentarios']
    );
    
    return $stmt->execute();
}

function procesarAfiliado($connection, $datos) {
    $stmt = $connection->prepare("INSERT INTO formulario_afiliados 
        (codigo_cliente, nombre_afiliado, telefono_afiliado, direccion_recogida, piso_recogida, cp_recogida, 
        direccion_entrega, piso_entrega, cp_entrega, fecha, hora, tipo_producto, producto_desc, comentarios) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->bind_param("ssssssssssssss", 
        $datos['codigo_cliente'],
        $datos['nombre_afiliado'],
        $datos['telefono_afiliado'],
        $datos['direccion_recogida'],
        $datos['piso_recogida'],
        $datos['cp_recogida'],
        $datos['direccion_entrega'],
        $datos['piso_entrega'],
        $datos['cp_entrega'],
        $datos['fecha'],
        $datos['hora'],
        $datos['tipo_producto'],
        $datos['producto_desc'],
        $datos['comentarios']
    );
    
    return $stmt->execute();
}

function procesarAfiliacion($connection, $datos) {
    $stmt = $connection->prepare("INSERT INTO formulario_afiliaciones 
        (nombre_empresa, cif, responsable, telefono_empresa, email_empresa, volumen_envios, volumen_otro) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->bind_param("ssssssi", 
        $datos['nombre_empresa'],
        $datos['cif'],
        $datos['responsable'],
        $datos['telefono_empresa'],
        $datos['email_empresa'],
        $datos['volumen_envios'],
        $datos['volumen_otro']
    );
    
    return $stmt->execute();
}

// Funciones para generar contenido de email
function generarEmailPedido($datos) {
    $html = "<h2>Nuevo Pedido de Huichply</h2>";
    $html .= "<p><strong>Nombre:</strong> " . $datos['nombre'] . "</p>";
    $html .= "<p><strong>Productos:</strong><br>";
    
    foreach ($datos['productos'] as $producto) {
        $html .= "- " . $producto['nombre'] . " (Cantidad: " . $producto['cantidad'] . ")";
        if (!empty($producto['descripcion'])) {
            $html .= " - " . $producto['descripcion'];
        }
        $html .= "<br>";
    }
    
    $html .= "</p>";
    $html .= "<p><strong>Peso estimado:</strong> " . $datos['peso_estimado'] . " kg</p>";
    $html .= "<p><strong>Confirmación de furgoneta:</strong> " . ($datos['confirmacion'] == 'si' ? 'Sí' : 'No') . "</p>";
    $html .= "<p><strong>Dirección de recogida:</strong> " . $datos['direccion_recogida'] . ", " . $datos['piso_recogida'] . ", CP: " . $datos['cp_recogida'] . "</p>";
    $html .= "<p><strong>Dirección de entrega:</strong> " . $datos['direccion_entrega'] . ", " . $datos['piso_entrega'] . ", CP: " . $datos['cp_entrega'] . "</p>";
    $html .= "<p><strong>Fecha:</strong> " . $datos['fecha'] . "</p>";
    $html .= "<p><strong>Franja horaria:</strong> " . $datos['franja_horaria'] . "</p>";
    $html .= "<p><strong>Medio de contacto:</strong> " . $datos['medio_contacto'] . " - " . $datos['contacto_detalle'] . "</p>";
    
    if (!empty($datos['comentarios'])) {
        $html .= "<p><strong>Comentarios:</strong> " . $datos['comentarios'] . "</p>";
    }
    
    return $html;
}

function generarEmailAfiliado($datos) {
    $html = "<h2>Nuevo Pedido de Afiliado</h2>";
    $html .= "<p><strong>Código de cliente:</strong> " . $datos['codigo_cliente'] . "</p>";
    $html .= "<p><strong>Nombre del cliente:</strong> " . $datos['nombre_afiliado'] . "</p>";
    $html .= "<p><strong>Teléfono:</strong> " . $datos['telefono_afiliado'] . "</p>";
    $html .= "<p><strong>Dirección de recogida:</strong> " . $datos['direccion_recogida'] . ", " . $datos['piso_recogida'] . ", CP: " . $datos['cp_recogida'] . "</p>";
    $html .= "<p><strong>Dirección de entrega:</strong> " . $datos['direccion_entrega'] . ", " . $datos['piso_entrega'] . ", CP: " . $datos['cp_entrega'] . "</p>";
    $html .= "<p><strong>Fecha y hora:</strong> " . $datos['fecha'] . " a las " . $datos['hora'] . "</p>";
    $html .= "<p><strong>Tipo de producto:</strong> " . $datos['tipo_producto'] . "</p>";
    
    if (!empty($datos['producto_desc'])) {
        $html .= "<p><strong>Descripción del producto:</strong> " . $datos['producto_desc'] . "</p>";
    }
    
    if (!empty($datos['comentarios'])) {
        $html .= "<p><strong>Comentarios:</strong> " . $datos['comentarios'] . "</p>";
    }
    
    return $html;
}

function generarEmailAfiliacion($datos) {
    $html = "<h2>Nueva Solicitud de Afiliación</h2>";
    $html .= "<p><strong>Nombre de la empresa:</strong> " . $datos['nombre_empresa'] . "</p>";
    $html .= "<p><strong>CIF:</strong> " . $datos['cif'] . "</p>";
    $html .= "<p><strong>Responsable:</strong> " . $datos['responsable'] . "</p>";
    $html .= "<p><strong>Teléfono:</strong> " . $datos['telefono_empresa'] . "</p>";
    $html .= "<p><strong>Email:</strong> " . $datos['email_empresa'] . "</p>";
    $html .= "<p><strong>Volumen de envíos:</strong> " . $datos['volumen_envios'];
    
    if (!empty($datos['volumen_otro'])) {
        $html .= " (" . $datos['volumen_otro'] . " envíos/mes)";
    }
    
    $html .= "</p>";
    
    return $html;
}
?>