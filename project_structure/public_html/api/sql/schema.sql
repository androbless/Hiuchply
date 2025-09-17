-- Charset y modo seguro
SET NAMES utf8mb4;
SET time_zone = "+00:00";

-- DOMICILIO
CREATE TABLE IF NOT EXISTS domicilio_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  direccion_recogida VARCHAR(255) NOT NULL,
  piso_recogida VARCHAR(50) NULL,
  cp_recogida VARCHAR(10) NOT NULL,
  direccion_entrega VARCHAR(255) NOT NULL,
  piso_entrega VARCHAR(50) NULL,
  cp_entrega VARCHAR(10) NOT NULL,
  fecha DATE NOT NULL,
  franja_horaria VARCHAR(50) NOT NULL,
  confirmacion_furgoneta VARCHAR(10) NULL,
  comentarios TEXT NULL,
  contacto_whatsapp VARCHAR(30) NULL,
  contacto_email VARCHAR(200) NULL,
  contacto_telefono VARCHAR(30) NULL,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS domicilio_products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNSIGNED NOT NULL,
  producto VARCHAR(120) NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  descripcion VARCHAR(255) NULL,
  medidas VARCHAR(120) NULL,
  peso DECIMAL(10,2) NULL,
  FOREIGN KEY (request_id) REFERENCES domicilio_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- PUNTO LIMPIO
CREATE TABLE IF NOT EXISTS punto_limpio_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  direccion_recogida VARCHAR(255) NOT NULL,
  piso_recogida VARCHAR(50) NULL,
  cp_recogida VARCHAR(10) NOT NULL,
  fecha DATE NOT NULL,
  franja_horaria VARCHAR(50) NOT NULL,
  confirmacion_furgoneta VARCHAR(10) NULL,
  comentarios TEXT NULL,
  contacto_whatsapp VARCHAR(30) NULL,
  contacto_email VARCHAR(200) NULL,
  contacto_telefono VARCHAR(30) NULL,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS punto_limpio_products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNSIGNED NOT NULL,
  producto VARCHAR(120) NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  descripcion VARCHAR(255) NULL,
  medidas VARCHAR(120) NULL,
  peso DECIMAL(10,2) NULL,
  FOREIGN KEY (request_id) REFERENCES punto_limpio_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- EMPRESAS (AFILIADO)
CREATE TABLE IF NOT EXISTS empresas_afiliado_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo_cliente VARCHAR(20) NOT NULL,
  nombre_cliente VARCHAR(150) NOT NULL,
  telefono_cliente VARCHAR(30) NOT NULL,
  direccion_recogida VARCHAR(255) NOT NULL,
  piso_recogida VARCHAR(50) NULL,
  cp_recogida VARCHAR(10) NOT NULL,
  direccion_entrega VARCHAR(255) NOT NULL,
  piso_entrega VARCHAR(50) NULL,
  cp_entrega VARCHAR(10) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tipo_producto VARCHAR(40) NOT NULL,
  producto_no_acordado_desc VARCHAR(255) NULL,
  comentarios TEXT NULL,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AFILIACIÓN (QUIERO AFILIARME)
CREATE TABLE IF NOT EXISTS afiliacion_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_empresa VARCHAR(200) NOT NULL,
  cif VARCHAR(20) NOT NULL,
  responsable VARCHAR(150) NOT NULL,
  telefono_empresa VARCHAR(30) NOT NULL,
  email_empresa VARCHAR(200) NOT NULL,
  volumen_envios VARCHAR(30) NOT NULL,
  volumen_otro INT UNSIGNED NOT NULL DEFAULT 0,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
