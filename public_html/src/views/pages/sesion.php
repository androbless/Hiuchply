<!doctype html>
<html lang="es">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Iniciar Sesión - Huichply</title>

  <!-- Bootstrap (grid y utilidades) -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous" />

  <!-- Fuente -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
    rel="stylesheet" />

  <!-- Estilos de la página -->
  <link rel="stylesheet" href="/assets/css/pages/sesion.css" />
</head>

<body>

  <!-- Header (compat demo: se inyecta desde /public/header.html) -->
  <div id="header-container"></div>

  <!-- Sección de autenticación -->
  <section class="auth-section">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1>Accede a tu cuenta</h1>
          <p>Gestiona tus servicios y direcciones guardadas</p>
        </div>

        <div class="auth-tabs">
          <div class="auth-tab active" id="loginTab">Iniciar Sesión</div>
          <div class="auth-tab" id="registerTab">Registrarse</div>
        </div>

        <!-- Formulario de inicio de sesión -->
        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label for="loginEmail">Correo electrónico</label>
            <input type="email" id="loginEmail" class="form-control" placeholder="tu@email.com" required>
            <div class="error-message" id="loginEmailError"></div>
          </div>

          <div class="form-group">
            <label for="loginPassword">Contraseña</label>
            <input type="password" id="loginPassword" class="form-control" placeholder="••••••••" required>
            <div class="error-message" id="loginPasswordError"></div>
          </div>

          <button type="submit" class="btn-auth">Iniciar Sesión</button>
        </form>

        <!-- Formulario de registro -->
        <form id="registerForm" class="auth-form" style="display: none;">
          <div class="form-group">
            <label for="registerName">Nombre completo</label>
            <input type="text" id="registerName" class="form-control" placeholder="Tu nombre completo" required>
            <div class="error-message" id="registerNameError"></div>
          </div>

          <div class="form-group">
            <label for="registerEmail">Correo electrónico</label>
            <input type="email" id="registerEmail" class="form-control" placeholder="tu@email.com" required>
            <div class="error-message" id="registerEmailError"></div>
          </div>

          <div class="form-group">
            <label for="registerPassword">Contraseña</label>
            <input type="password" id="registerPassword" class="form-control" placeholder="••••••••" required>
            <div class="error-message" id="registerPasswordError"></div>
          </div>

          <div class="form-group">
            <label for="registerConfirmPassword">Confirmar contraseña</label>
            <input type="password" id="registerConfirmPassword" class="form-control" placeholder="••••••••" required>
            <div class="error-message" id="registerConfirmPasswordError"></div>
          </div>

          <button type="submit" class="btn-auth">Crear Cuenta</button>
        </form>

        <div class="divider">
          <span>O</span>
        </div>

        <button class="btn-email-only" id="emailOnlyBtn">
          Continuar solo con correo electrónico
        </button>

        <div class="form-footer">
          Al continuar, aceptas nuestros <a href="#">Términos de Servicio</a> y <a href="#">Política de Privacidad</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer (compat demo: se inyecta desde /public/footer_componente.html) -->
  <div id="footer-container"></div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
    integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
    crossorigin="anonymous"></script>

  <!-- Compat demo (base de datos en JS) -->
  <script src="/database.js"></script>

  <!-- JS de la página -->
  <script src="/assets/js/pages/sesion.js"></script>
</body>

</html>
