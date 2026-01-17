-- Base de datos: Huichply (MySQL/MariaDB - Hostinger)
-- Charset recomendado
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_type ENUM('particular','empresa') NULL,
  phone VARCHAR(30) NULL,
  age TINYINT UNSIGNED NULL,
  member_since VARCHAR(10) NULL,

  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  lock_until DATETIME NULL,
  last_login_at DATETIME NULL,

  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(60) NOT NULL DEFAULT 'Principal',
  address_text VARCHAR(255) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_user_primary (user_id, is_primary),
  KEY idx_user_addresses_user (user_id),
  CONSTRAINT fk_user_addresses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  public_ref VARCHAR(40) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  service_type VARCHAR(30) NULL,
  urgency VARCHAR(20) NULL,

  distance_km DECIMAL(10,2) NOT NULL DEFAULT 0,
  heavy_items INT UNSIGNED NOT NULL DEFAULT 0,
  light_items INT UNSIGNED NOT NULL DEFAULT 0,
  assist_level VARCHAR(20) NOT NULL DEFAULT 'solo',

  service_date DATE NULL,
  service_time VARCHAR(30) NULL,
  payment_method VARCHAR(30) NULL,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,

  pickup_address VARCHAR(255) NULL,
  delivery_address VARCHAR(255) NULL,

  raw_json LONGTEXT NULL,

  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_ref (public_ref),
  KEY idx_orders_user (user_id),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_stops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  stop_order INT UNSIGNED NOT NULL DEFAULT 0,
  stop_type VARCHAR(30) NULL,
  label VARCHAR(80) NULL,
  address_text VARCHAR(255) NOT NULL,

  access_type VARCHAR(40) NULL,
  chalet_number VARCHAR(30) NULL,
  floor VARCHAR(30) NULL,
  door VARCHAR(30) NULL,
  store_name VARCHAR(80) NULL,

  created_at DATETIME NOT NULL,

  PRIMARY KEY (id),
  KEY idx_stops_order (order_id),
  CONSTRAINT fk_stops_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  is_heavy TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,

  PRIMARY KEY (id),
  KEY idx_items_order (order_id),
  CONSTRAINT fk_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  order_public_ref VARCHAR(40) NULL,

  name VARCHAR(120) NOT NULL,
  initials VARCHAR(6) NOT NULL,
  color VARCHAR(40) NULL,

  service_type_raw VARCHAR(30) NULL,
  service_type VARCHAR(60) NULL,

  stars TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(1000) NOT NULL,

  moderation_score DECIMAL(4,3) NOT NULL DEFAULT 0,
  moderation_flags_json VARCHAR(255) NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,

  raw_json LONGTEXT NULL,
  created_at DATETIME NOT NULL,

  PRIMARY KEY (id),
  KEY idx_reviews_user (user_id),
  KEY idx_reviews_published (is_published, created_at),
  UNIQUE KEY uq_review_per_order (user_id, order_public_ref),

  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
