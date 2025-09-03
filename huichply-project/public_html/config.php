<?php
// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_NAME', 'tu_base_de_datos');
define('DB_USER', 'tu_usuario');
define('DB_PASS', 'tu_contraseña');

// Configuración de correo electrónico
define('EMAIL_RECIPIENT', 'tu_email@dominio.com');
define('EMAIL_SUBJECT_PREFIX', 'Nuevo formulario de Huichply: ');

// Intentar conectar a la base de datos
function connectDB() {
    $connection = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    // Verificar conexión
    if ($connection->connect_error) {
        die("Error de conexión: " . $connection->connect_error);
    }
    
    // Establecer charset
    $connection->set_charset("utf8mb4");
    
    return $connection;
}

// Función para crear las tablas si no existen
function createTables($connection) {
    $sqlPedidos = "CREATE TABLE IF NOT EXISTS formulario_pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        productos TEXT NOT NULL,
        peso_estimado INT DEFAULT 0,
        confirmacion ENUM('si', 'no') NULL,
        direccion_recogida TEXT NOT NULL,
        piso_recogida VARCHAR(50),
        cp_recogida VARCHAR(5) NOT NULL,
        direccion_entrega TEXT NOT NULL,
        piso_entrega VARCHAR(50),
        cp_entrega VARCHAR(5) NOT NULL,
        fecha DATE NOT NULL,
        franja_horaria VARCHAR(20) NOT NULL,
        medio_contacto VARCHAR(20) NOT NULL,
        contacto_detalle VARCHAR(100) NOT NULL,
        comentarios TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    $sqlAfiliados = "CREATE TABLE IF NOT EXISTS formulario_afiliados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_cliente VARCHAR(8) NOT NULL,
        nombre_afiliado VARCHAR(100) NOT NULL,
        telefono_afiliado VARCHAR(20) NOT NULL,
        direccion_recogida TEXT NOT NULL,
        piso_recogida VARCHAR(50),
        cp_recogida VARCHAR(5) NOT NULL,
        direccion_entrega TEXT NOT NULL,
        piso_entrega VARCHAR(50),
        cp_entrega VARCHAR(5) NOT NULL,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        tipo_producto VARCHAR(20) NOT NULL,
        producto_desc TEXT,
        comentarios TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    $sqlAfiliaciones = "CREATE TABLE IF NOT EXISTS formulario_afiliaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_empresa VARCHAR(100) NOT NULL,
        cif VARCHAR(10) NOT NULL,
        responsable VARCHAR(100) NOT NULL,
        telefono_empresa VARCHAR(20) NOT NULL,
        email_empresa VARCHAR(100) NOT NULL,
        volumen_envios VARCHAR(20) NOT NULL,
        volumen_otro INT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    if (!$connection->query($sqlPedidos)) {
        die("Error creando tabla pedidos: " . $connection->error);
    }
    
    if (!$connection->query($sqlAfiliados)) {
        die("Error creando tabla afiliados: " . $connection->error);
    }
    
    if (!$connection->query($sqlAfiliaciones)) {
        die("Error creando tabla afiliaciones: " . $connection->error);
    }
}

// Función para enviar correo electrónico
function enviarEmail($asunto, $mensaje) {
    $para = EMAIL_RECIPIENT;
    $cabeceras = "From: no-reply@huichply.com\r\n";
    $cabeceras .= "Reply-To: no-reply@huichply.com\r\n";
    $cabeceras .= "MIME-Version: 1.0\r\n";
    $cabeceras .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    return mail($para, EMAIL_SUBJECT_PREFIX . $asunto, $mensaje, $cabeceras);
}

// Función para sanitizar datos
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    
    return $data;
}
?>