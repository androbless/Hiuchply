<?php
// src/views/pages/Pedidos.php

$mapsKey = getenv('GOOGLE_MAPS_KEY') ?: '';
?>
<!doctype html>
<html lang="es">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Realizar Pedido - Huichply</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"
    integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
    rel="stylesheet" />

  <link rel="stylesheet" href="/assets/css/pages/Pedidos.css" />
</head>

<body>

  <div id="header-container"></div>

  <div id="app-alert-overlay" class="app-alert-overlay" aria-hidden="true">
    <div id="app-alert" class="app-alert warning" role="alertdialog" aria-modal="true" aria-labelledby="app-alert-title"
      aria-describedby="app-alert-message" tabindex="-1">
      <div class="app-alert-head">
        <div class="app-alert-icon" id="app-alert-icon" aria-hidden="true">⚠️</div>
        <div>
          <h3 class="app-alert-title" id="app-alert-title">Aviso</h3>
          <p class="app-alert-body" id="app-alert-message"></p>
        </div>
      </div>
      <div class="app-alert-actions">
        <button type="button" class="btn-alert primary" id="app-alert-ok">Entendido</button>
      </div>
    </div>
  </div>

  <section class="order-section">
    <div class="container order-container">
      <div class="order-header">
        <h1>Realiza tu pedido</h1>
        <p>Completa los siguientes pasos para solicitar tu servicio de transporte</p>
      </div>

      <div class="order-progress">
        <div class="order-progress-track">
          <div class="order-progress-bar" id="order-progress-bar"></div>
        </div>
      </div>

      <div class="order-steps">

        <div class="order-step active" id="step1">
          <div class="step-card">
            <div class="step-header">
              <h2>Direcciones de recogida, entrega y puntos intermedios</h2>
              <p>Agrega todas las direcciones en el orden correcto de tu ruta (máximo 4 direcciones)</p>
            </div>

            <div class="map-container">
              <div class="map-placeholder" id="map-placeholder">
                Mapa de Google Maps (requiere API key)
              </div>
              <div id="map" style="height:100%; display:none;"></div>
            </div>

            <div class="address-container" id="address-container"></div>

            <button class="btn-add-address" type="button" id="add-address-btn">
              + Agregar otra dirección (máximo 4)
            </button>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" disabled>Anterior</button>
              <button class="btn-step next" type="button" id="next-step1">Siguiente</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step2">
          <div class="step-card">
            <div class="step-header">
              <h2>Detalles de acceso a las direcciones</h2>
              <p>Indica si es <strong>chalet</strong>, <strong>piso</strong> o <strong>tienda</strong> y completa el
                dato correspondiente.</p>
            </div>

            <div class="address-details-container">
              <p><strong>Acceso por cada dirección:</strong></p>
              <p class="details-note">Esta información nos ayuda a llegar mejor, no afecta al precio.</p>
              <div id="address-details-content"></div>
            </div>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" id="prev-step2">Anterior</button>
              <button class="btn-step next" type="button" id="next-step2">Siguiente</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step3">
          <div class="step-card">
            <div class="step-header">
              <h2>Selecciona el tipo de servicio</h2>
              <p>Elige la modalidad base del servicio. En el siguiente paso añadirás lo que vas a transportar.</p>
            </div>

            <div class="service-options">
              <div class="service-option" data-service="domicilio">
                <div class="service-icon">🏠</div>
                <div class="service-name">Domicilio / Tienda</div>
                <div class="service-description">Recogidas y entregas en casa o comercio</div>
                <div class="service-limits-info" style="font-size:12px; color:var(--muted); margin-top:8px;">
                  Máximo: 3 objetos pesados y 3 pequeños
                </div>
              </div>

              <div class="service-option" data-service="punto">
                <div class="service-icon">♻️</div>
                <div class="service-name">Punto limpio</div>
                <div class="service-description">Retiro de enseres y entrega en punto limpio</div>
                <div class="service-limits-info" style="font-size:12px; color:var(--muted); margin-top:8px;">
                  Máximo: 3 objetos pesados y 3 pequeños
                </div>
              </div>

              <div class="service-option" data-service="mini">
                <div class="service-icon">🚐</div>
                <div class="service-name">Furgoneta llena / Minimudanza</div>
                <div class="service-description">Ideal para un traslado compacto</div>
                <div class="service-limits-info" style="font-size:12px; color:var(--muted); margin-top:8px;">
                  Añade hasta <strong>3 objetos pesados</strong>. No es necesario listar objetos pequeños.
                </div>
              </div>
            </div>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" id="prev-step3">Anterior</button>
              <button class="btn-step next" type="button" id="next-step3">Siguiente</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step4">
          <div class="step-card">
            <div class="step-header">
              <h2>¿Qué vas a transportar?</h2>
              <p>Añade los objetos que necesitas transportar</p>

              <p id="mini-mudanza-info" style="display:none; color:var(--brand-blue); font-size:14px; margin-top:8px;">
                <strong>💡 Para minimudanza:</strong> solo necesitas añadir <strong>objetos pesados</strong> (máx. 3).
                No es necesario añadir objetos pequeños.
              </p>

              <div id="products-message" class="alert-message alert-info" style="display:none;"></div>
            </div>

            <div class="product-limits" id="product-limits" style="display:none;">
              <div class="limit-counter" id="heavy-counter">
                <div class="limit-label">Objetos pesados</div>
                <div class="limit-value" id="heavy-count">0/3</div>
              </div>
              <div class="limit-counter" id="light-counter">
                <div class="limit-label">Objetos pequeños</div>
                <div class="limit-value" id="light-count">0/3</div>
              </div>
            </div>

            <div class="products-container" id="products-list" style="display:none;"></div>

            <div class="add-product-form" id="add-product-form" style="display:none;">
              <input type="text" id="product-name" class="form-control" list="product-name-suggestions"
                placeholder="Nombre del objeto (ej: Sofá de 3 plazas)">
              <datalist id="product-name-suggestions"></datalist>

              <input type="text" id="product-description" class="form-control"
                placeholder="Descripción, medidas o peso (ej: Sofá azul, 210x90x85cm, ~60kg)">

              <button class="btn-cta" type="button" id="add-product">Añadir</button>
            </div>

            <p class="ai-preview" id="ai-preview" style="display:none;"></p>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" id="prev-step4">Anterior</button>
              <button class="btn-step next" type="button" id="next-step4">Siguiente</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step5">
          <div class="step-card">
            <div class="step-header">
              <h2>Modalidad del servicio</h2>
              <p>Elige el nivel de ayuda que necesitas</p>
            </div>

            <div class="assist-container">
              <div class="assist-head">
                <div>
                  <p class="assist-title">Modalidad del servicio</p>
                  <p class="assist-sub">Elige la modalidad según el nivel de ayuda que necesites.</p>
                </div>
                <div class="assist-selected" id="assist-selected-text">Seleccionado: Solo Transporte</div>
              </div>

              <div class="assist-options" role="radiogroup" aria-label="Modalidad del servicio">
                <label class="assist-option" for="assist-solo">
                  <input type="radio" id="assist-solo" name="assistLevel" value="solo" checked>
                  <div class="assist-main">
                    <div class="assist-name-row">
                      <div class="assist-name">Solo Transporte</div>
                      <div class="assist-price">+0€</div>
                    </div>
                    <div class="assist-desc">Traslado con conductor. Precio base del servicio.</div>
                  </div>
                </label>

                <label class="assist-option" for="assist-ayuda">
                  <input type="radio" id="assist-ayuda" name="assistLevel" value="ayuda">
                  <div class="assist-main">
                    <div class="assist-name-row">
                      <div class="assist-name">Transporte con Ayuda</div>
                      <div class="assist-price">+5€</div>
                    </div>
                    <div class="assist-desc">Una ayuda adicional puntual para carga/descarga.</div>
                  </div>
                </label>

                <label class="assist-option" for="assist-completo">
                  <input type="radio" id="assist-completo" name="assistLevel" value="completo">
                  <div class="assist-main">
                    <div class="assist-name-row">
                      <div class="assist-name">Transporte Completo</div>
                      <div class="assist-price">+12€</div>
                    </div>
                    <div class="assist-desc">Servicio con mayor nivel de asistencia durante el traslado.</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" id="prev-step5">Anterior</button>
              <button class="btn-step next" type="button" id="next-step5">Siguiente</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step6">
          <div class="step-card">
            <div class="step-header">
              <h2>Programación del servicio</h2>
              <p>Elige cuándo quieres que realicemos tu servicio</p>
            </div>

            <div class="urgency-container">
              <h3 style="font-size: 18px; margin-bottom: 16px;">¿Cuándo necesitas el servicio?</h3>

              <div class="urgency-options">
                <div class="urgency-option" id="urgency-immediate">
                  <div class="urgency-icon">⚡</div>
                  <div class="urgency-content">
                    <div class="urgency-title">
                      ¡Lo necesito ya!
                      <span class="urgency-badge">URGENTE</span>
                    </div>
                    <div class="urgency-description">
                      Servicio inmediato. Sin coste extra, prioridad en la asignación.
                    </div>
                  </div>
                </div>

                <div class="urgency-option selected" id="urgency-scheduled">
                  <div class="urgency-icon">📅</div>
                  <div class="urgency-content">
                    <div class="urgency-title">Programar para más tarde</div>
                    <div class="urgency-description">
                      Elige una fecha y hora específicas para tu servicio.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="datetime-grid" id="datetime-fields">
              <div class="form-group">
                <label class="form-label" for="service-date">Fecha del servicio</label>
                <input type="date" id="service-date" class="form-control">
              </div>

              <div class="form-group">
                <label class="form-label" for="service-time">Franja horaria preferida</label>
                <select id="service-time" class="form-select">
                  <option value="">Selecciona una franja</option>
                  <option value="09:00 - 11:00">09:00 - 11:00</option>
                  <option value="11:00 - 13:00">11:00 - 13:00</option>
                  <option value="13:00 - 15:00">13:00 - 15:00</option>
                  <option value="16:00 - 18:00">16:00 - 18:00</option>
                  <option value="18:00 - 20:00">18:00 - 20:00</option>
                </select>
                <p class="field-helper">Los horarios son aproximados y se confirmarán por teléfono o WhatsApp.</p>
              </div>
            </div>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" id="prev-step6">Anterior</button>
              <button class="btn-step next" type="button" id="next-step6">Siguiente</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step7">
          <div class="step-card">
            <div class="step-header">
              <h2>Resumen de tu pedido</h2>
              <p>Revisa que toda la información sea correcta antes de continuar</p>
            </div>

            <div class="summary-card">
              <div class="summary-header">
                <h3>Detalles del servicio</h3>
              </div>

              <div class="summary-item">
                <div class="summary-label">Nombre:</div>
                <div class="summary-value" id="summary-user-name">-</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Teléfono:</div>
                <div class="summary-value" id="summary-user-phone">-</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Email:</div>
                <div class="summary-value" id="summary-user-email">-</div>
              </div>

              <div class="summary-item">
                <div class="summary-label">Tipo de servicio:</div>
                <div class="summary-value" id="summary-service-type">-</div>
              </div>

              <div class="summary-item">
                <div class="summary-label">Modalidad:</div>
                <div class="summary-value" id="summary-assist">-</div>
              </div>

              <div class="summary-item">
                <div class="summary-label">Programación:</div>
                <div class="summary-value" id="summary-service-urgency">-</div>
              </div>

              <div class="summary-item">
                <div class="summary-label">Fecha y hora:</div>
                <div class="summary-value" id="summary-datetime">-</div>
              </div>

              <div class="summary-item">
                <div class="summary-label">Distancia total:</div>
                <div class="summary-value" id="summary-distance">-</div>
              </div>

              <div class="summary-item">
                <div class="summary-label">Número de paradas:</div>
                <div class="summary-value" id="summary-stops">-</div>
              </div>

              <div class="summary-item" id="summary-heavy-row">
                <div class="summary-label">Productos pesados:</div>
                <div class="summary-value" id="summary-heavy-items">0</div>
              </div>

              <div class="summary-item" id="summary-light-row">
                <div class="summary-label">Productos pequeños:</div>
                <div class="summary-value" id="summary-light-items">0</div>
              </div>

              <div class="summary-item">
                <div class="summary-label">Direcciones (en orden):</div>
                <div class="summary-value">
                  <div id="summary-addresses-list" style="text-align: left; font-size: 14px;"></div>
                </div>
              </div>

              <div class="summary-total">
                <div class="summary-label">Total:</div>
                <div class="total-price" id="summary-total">0€</div>
              </div>
            </div>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" id="prev-step7">Anterior</button>
              <button class="btn-step next" type="button" id="next-step7">Continuar al pago</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step8">
          <div class="step-card">
            <div class="step-header">
              <h2>Método de pago</h2>
              <p>Selecciona cómo prefieres pagar por el servicio</p>
            </div>

            <div class="payment-methods">
              <div class="payment-method" data-payment="bizum">
                <div class="payment-icon">📱</div>
                <div class="payment-name">Bizum</div>
                <div class="payment-description">Pago instantáneo con tu móvil</div>
              </div>

              <div class="payment-method" data-payment="tarjeta">
                <div class="payment-icon">💳</div>
                <div class="payment-name">Tarjeta</div>
                <div class="payment-description">Pago seguro con tarjeta de crédito/débito</div>
              </div>

              <div class="payment-method" data-payment="efectivo">
                <div class="payment-icon">💵</div>
                <div class="payment-name">Efectivo</div>
                <div class="payment-description">Paga en efectivo al conductor</div>
              </div>
            </div>

            <div id="efectivo-message" class="alert-message alert-info" style="display:none;">
              <strong>Importante:</strong> Al seleccionar pago en efectivo, recibirás una llamada para confirmar todos
              los detalles de tu servicio.
            </div>

            <div class="step-navigation">
              <button class="btn-step prev" type="button" id="prev-step8">Anterior</button>
              <button class="btn-step next" type="button" id="confirm-order">Confirmar pedido</button>
            </div>
          </div>
        </div>

        <div class="order-step" id="step-confirmation" style="display:none;">
          <div class="step-card">
            <div class="step-header">
              <h2>¡Pedido confirmado!</h2>
              <p>Tu solicitud ha sido enviada correctamente</p>
            </div>

            <div id="confirmation-bizum" class="alert-message alert-success" style="display:none;">
              <strong>¡Perfecto!</strong> Tu pedido ha sido confirmado. Te hemos enviado un enlace de pago por Bizum.
            </div>

            <div id="confirmation-tarjeta" class="alert-message alert-success" style="display:none;">
              <strong>¡Perfecto!</strong> Tu pedido ha sido confirmado. Serás redirigido a la pasarela de pago.
            </div>

            <div id="confirmation-efectivo" class="alert-message alert-success" style="display:none;">
              <strong>¡Perfecto!</strong> Tu solicitud ha sido enviada. Te llamaremos en las próximas horas para
              confirmar todos los detalles.
            </div>

            <div id="confirmation-urgent" class="alert-message alert-success" style="display:none;">
              <strong>¡Perfecto! Servicio urgente confirmado.</strong><br>
              Hemos enviado tu solicitud a nuestros autónomos disponibles. Recibirás una llamada en los próximos minutos
              para coordinar la recogida inmediata.
            </div>

            <div class="step-navigation">
              <button class="btn-step" type="button" id="back-to-home">Volver al inicio</button>
              <button class="btn-step next" type="button" id="view-order">Ver mi pedido</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>

  <div id="footer-container"></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
    integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
    crossorigin="anonymous"></script>

  <script src="/database.js"></script>
  <script src="/assets/js/app.js"></script>
  <script src="/assets/js/pages/Pedidos.js"></script>

  <?php if (!empty($mapsKey)): ?>
    <script
      src="https://maps.googleapis.com/maps/api/js?key=<?= htmlspecialchars($mapsKey, ENT_QUOTES, 'UTF-8') ?>&libraries=places&callback=initMap"
      async defer></script>
  <?php endif; ?>

</body>

</html>
