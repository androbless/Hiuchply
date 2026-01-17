<?php
// src/views/pages/valoraciones.php

declare(strict_types=1);

function e(string $value): string
{
  return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

// Base URL para instalaciones en subcarpeta (ej: /huichply)
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
$baseUrl = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
$baseUrl = ($baseUrl === '/' ? '' : $baseUrl);

$asset = function (string $path) use ($baseUrl): string {
  $path = '/' . ltrim($path, '/');
  return $baseUrl . $path;
};

$projectRoot = dirname(__DIR__, 3);          // .../public_html
$partialsDir = dirname(__DIR__) . '/partials'; // .../src/views/partials

$compatHeader = $projectRoot . '/public/header.html';
$compatFooter = $projectRoot . '/public/footer_componente.html';

// Ruta destino del botón “Deja tu valoración”
$valorarUrl = $baseUrl . '/Valorar';

// Base de API (si tienes endpoints /api/... en el mismo host, esto funciona)
$apiBase = $baseUrl; // ej: '' o '/huichply'
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Valoraciones</title>

  <!-- Estilos globales -->
  <link rel="stylesheet" href="<?= e($asset('/assets/css/main.css')) ?>" />

  <!-- Estilos de página -->
  <link rel="stylesheet" href="<?= e($asset('/assets/css/pages/valoraciones.css')) ?>" />
</head>

<body>
  <?php
    // Header (prioridad: partial PHP -> compat HTML)
    if (is_file($partialsDir . '/header.php')) {
      require $partialsDir . '/header.php';
    } elseif (is_file($compatHeader)) {
      readfile($compatHeader);
    }
  ?>

  <!-- Página: Valoraciones -->
  <section id="valoraciones" class="valoraciones section-container">
    <div class="container">
      <div class="valoraciones-header">
        <h2>Lo que dicen nuestros clientes</h2>
        <p id="valoraciones-subtitulo">Reseñas destacadas</p>
      </div>

      <div class="valoraciones-grid" id="valoraciones-grid"></div>

      <div class="valoraciones-footer">
        <div class="valoracion-promedio">
          <div class="promedio-estrellas" id="promedio-estrellas">
            <span class="estrella grande activa">★</span>
            <span class="estrella grande activa">★</span>
            <span class="estrella grande activa">★</span>
            <span class="estrella grande activa">★</span>
            <span class="estrella grande activa">★</span>
          </div>
          <div class="promedio-texto">
            <div class="promedio-puntuacion" id="promedio-puntuacion">4.9</div>
            <div class="promedio-desc">de 5 estrellas</div>
          </div>
        </div>

        <div class="valoracion-cta">
          <a href="<?= e($valorarUrl) ?>" class="btn-ghost">Deja tu valoración</a>
        </div>
      </div>
    </div>
  </section>

  <?php
    // Footer (prioridad: partial PHP -> compat HTML)
    if (is_file($partialsDir . '/footer.php')) {
      require $partialsDir . '/footer.php';
    } elseif (is_file($compatFooter)) {
      readfile($compatFooter);
    }
  ?>

  <!-- Config JS -->
  <script>
    window.__HUICHPLY_API_BASE__ = <?= json_encode($apiBase, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
    // Para desactivar intentos a /api/... en esta página: window.__HUICHPLY_API_ENABLED__ = false;
  </script>

  <!-- JS de página -->
  <script src="<?= e($asset('/assets/js/pages/valoraciones.js')) ?>" defer></script>
</body>
</html>
