// script.js (frontend puro, con envío al backend)
// Características conservadas:
// - Animaciones: body.is-ready (page load), .is-open en wizards y modal, reveal-on-scroll.
// - Validaciones reforzadas y UX de envío con spinner y scroll a errores.
// - Recolección de datos y generación dinámica de resúmenes y campos de medidas/peso por producto.
// - En el “envío”, ahora se manda el payload al backend vía fetch a /api/submit.php y se emite un CustomEvent `form:submitted` con el payload y el backendId.

$(document).ready(function () {
  // -------------------------
  // Estado general
  // -------------------------
  let currentWizard = null;

  // -------------------------
  // Animación: al cargar (logo + hero)
  // -------------------------
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
  $(window).on('load', function () {
    document.body.classList.add('is-ready');
  });

  // -------------------------
  // Helpers de animación (wizards / modal)
  // -------------------------
  function openWizard(id, { reset = true } = {}) {
    const $w = $('#' + id);
    if (!$w.length) return;
    $w.css('display', 'block');
    requestAnimationFrame(() => {
      $w.addClass('is-open');
      $('body').addClass('modal-open');
    });
    currentWizard = id;
    if (reset) resetWizard(id);
  }

  function closeWizard(id) {
    const $w = $('#' + id);
    if (!$w.length) return;
    $w.removeClass('is-open');
    $w.one('transitionend', function () {
      $w.css('display', 'none');
      $('body').removeClass('modal-open');
    });
    setTimeout(() => {
      if ($w.hasClass('is-open')) return;
      $w.css('display', 'none');
      $('body').removeClass('modal-open');
    }, 400);
    if (currentWizard === id) currentWizard = null;
  }

  function hideWizardInstant(id) {
    const $w = $('#' + id);
    $w.removeClass('is-open').css('display', 'none');
    $('body').removeClass('modal-open');
    if (currentWizard === id) currentWizard = null;
  }

  function openModal(id) {
    const $m = $('#' + id);
    if (!$m.length) return;
    $m.css('display', 'flex');
    requestAnimationFrame(() => {
      $m.addClass('is-open');
      $('body').addClass('modal-open');
    });
  }
  function closeModal(id) {
    const $m = $('#' + id);
    if (!$m.length) return;
    $m.removeClass('is-open');
    $m.one('transitionend', function () {
      $m.css('display', 'none');
      $('body').removeClass('modal-open');
    });
    setTimeout(() => {
      if ($m.hasClass('is-open')) return;
      $m.css('display', 'none');
      $('body').removeClass('modal-open');
    }, 400);
  }

  // -------------------------
  // Apertura de wizards
  // -------------------------
  $('#btn-pide-ya').on('click', function () {
    openWizard('wizard-pide-ya-seleccion');
  });
  $('#btn-empresas').on('click', function () {
    openWizard('wizard-empresa-seleccion');
  });

  // Selección de servicio (pide ya)
  $('#wizard-pide-ya-seleccion .empresa-option').on('click', function () {
    const tipo = $(this).data('option');
    hideWizardInstant('wizard-pide-ya-seleccion');
    if (tipo === 'domicilio') {
      openWizard('wizard-domicilio');
    } else if (tipo === 'punto-limpio') {
      openWizard('wizard-punto-limpio');
    }
  });

  // Selección de empresa
  $('#wizard-empresa-seleccion .empresa-option').on('click', function () {
    const tipo = $(this).data('option');
    hideWizardInstant('wizard-empresa-seleccion');
    if (tipo === 'afiliado') {
      openWizard('wizard-empresas');
    } else if (tipo === 'afiliacion') {
      openWizard('wizard-afiliacion');
    }
  });

  // -------------------------
  // Resetear wizard
  // -------------------------
  function resetWizard(wizardId) {
    const $wizard = $('#' + wizardId);
    $wizard.find('.wizard-step').removeClass('active');
    $wizard.find('.wizard-step:first').addClass('active');

    // Limpiar campos
    $wizard.find('input, select, textarea').not('[type="button"]').each(function () {
      const type = $(this).attr('type');
      if (type === 'checkbox' || type === 'radio') {
        $(this).prop('checked', false);
      } else {
        $(this).val('');
      }
    });

    $wizard.find('.input-error').removeClass('input-error');
    $wizard
      .find('.product-button, .radio-button-option, .volume-option, .contacto-button')
      .removeClass('selected');
    $wizard.find('.product-button-quantity').val('1');

    // Ocultar mensajes de error y especiales
    $wizard.find('.error-message').hide();
    $wizard.find('.special-input-container, .contacto-detalle-container').hide();

    // Ocultar controles de cantidad
    $wizard.find('.quantity-controls').hide();
    $wizard.find('.product-name').show();
  }

  // -------------------------
  // Navegación entre pasos
  // -------------------------
  $('.wizard-next').on('click', function () {
    const currentStep = $(this).closest('.wizard-step');
    if (validateStep(currentStep)) {
      const nextStep = currentStep.next('.wizard-step');
      currentStep.removeClass('active');
      nextStep.addClass('active');

      // Generar resúmenes y medidas según el paso siguiente
      const $wizard = currentStep.closest('.wizard-container');
      const wizardId = $wizard.attr('id');

      if (wizardId === 'wizard-domicilio') {
        if (nextStep.data('step') === 3) generateProductMeasurements('domicilio');
        if (nextStep.data('step') === 9) generateResumenPedidoDomicilio();
      } else if (wizardId === 'wizard-punto-limpio') {
        if (nextStep.data('step') === 3) generateProductMeasurements('punto-limpio');
        if (nextStep.data('step') === 8) generateResumenPuntoLimpio();
      } else if (wizardId === 'wizard-empresas') {
        if (nextStep.data('step') === 6) generateResumenAfiliado();
      } else if (wizardId === 'wizard-afiliacion') {
        if (nextStep.data('step') === 6) generateResumenAfiliacion();
      }
    }
  });

  $('.wizard-prev').on('click', function () {
    const currentStep = $(this).closest('.wizard-step');
    const prevStep = currentStep.prev('.wizard-step');
    currentStep.removeClass('active');
    prevStep.addClass('active');
  });

  // -------------------------
  // Cerrar wizard
  // -------------------------
  $('.wizard-close').on('click', function () {
    const $w = $(this).closest('.wizard-container');
    closeWizard($w.attr('id'));
  });

  $('.wizard-close-confirm, .wizard-close-x').on('click', function () {
    openModal('close-confirm-modal');
  });
  $('#modal-cancel').on('click', function () {
    closeModal('close-confirm-modal');
  });
  $('#modal-confirm').on('click', function () {
    closeModal('close-confirm-modal');
    if (currentWizard) closeWizard(currentWizard);
  });

  // -------------------------
  // Validaciones por paso
  // -------------------------
  function validateStep(step) {
    let isValid = true;

    step.find('.error-message').hide();
    step.find('.input-error').removeClass('input-error');

    // Campos required + pattern + email
    step.find('input[required], select[required], textarea[required]').each(function () {
      const $el = $(this);
      const val = ($el.val() || '').toString().trim();

      if (!val) {
        isValid = false;
        markError($el);
        return;
      }

      // Email
      if ($el.attr('type') === 'email' && val) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(val)) {
          isValid = false;
          markError($el, 'Ingresa un email válido');
        }
      }

      // Pattern
      if ($el.attr('pattern') && val) {
        const pattern = new RegExp('^' + $el.attr('pattern') + '$');
        if (!pattern.test(val)) {
          isValid = false;
          markError($el);
        }
      }
    });

    // Validaciones específicas por wizard/paso
    // Productos (paso 2 de domicilio y punto limpio)
    if (
      (step.data('step') === 2 && step.closest('#wizard-domicilio').length) ||
      (step.data('step') === 2 && step.closest('#wizard-punto-limpio').length)
    ) {
      const checked = step.find('.product-checkbox:checked');
      if (checked.length === 0) {
        isValid = false;
        $('#transport-error-domicilio, #transport-error-punto-limpio').show();
      }

      // Campos especiales visibles
      const visibleElectro = $('#electrodomesticos-domicilio-container:visible, #electrodomesticos-punto-limpio-container:visible');
      if (visibleElectro.length) {
        const electroInput = $('#electrodomesticos-desc-domicilio:visible, #electrodomesticos-desc-punto-limpio:visible');
        if (!electroInput.val() || !electroInput.val().toString().trim()) {
          isValid = false;
          markError(electroInput, 'Por favor, describe los electrodomésticos');
        }
      }
      const visibleOtros = $('#otros-domicilio-container:visible, #otros-punto-limpio-container:visible');
      if (visibleOtros.length) {
        const otrosInput = $('#otros-desc-domicilio:visible, #otros-desc-punto-limpio:visible');
        if (!otrosInput.val() || !otrosInput.val().toString().trim()) {
          isValid = false;
          markError(otrosInput, 'Por favor, describe qué necesitas transportar');
        }
      }
    }

    // Confirmación furgoneta (paso 4 de ambos)
    if (
      (step.data('step') === 4 && step.closest('#wizard-domicilio').length) ||
      (step.data('step') === 4 && step.closest('#wizard-punto-limpio').length)
    ) {
      if (!step.find('input[name^="confirmacion"]:checked').length) {
        isValid = false;
        $('#confirmacion-error-domicilio, #confirmacion-error-punto-limpio').show();
      }
    }

    // Medios de contacto (domicilio paso 8 / punto limpio paso 7)
    if (
      (step.data('step') === 8 && step.closest('#wizard-domicilio').length) ||
      (step.data('step') === 7 && step.closest('#wizard-punto-limpio').length)
    ) {
      const contactosSeleccionados = step.find('.contacto-checkbox:checked');
      if (contactosSeleccionados.length === 0) {
        isValid = false;
        $('#contacto-error-domicilio, #contacto-error-punto-limpio').show();
      } else {
        contactosSeleccionados.each(function () {
          const detalleContainer = $(this).closest('.contacto-option').find('.contacto-detalle-container');
          const detalleInput = detalleContainer.find('.contacto-detalle');
          const valor = (detalleInput.val() || '').toString().trim();
          if (!valor) {
            isValid = false;
            markError(detalleInput);
          } else if ($(this).attr('id').includes('email')) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(valor)) {
              isValid = false;
              markError(detalleInput, 'Ingresa un email válido');
            }
          } else if ($(this).attr('id').includes('whatsapp') || $(this).attr('id').includes('llamada')) {
            const phonePattern = /^[0-9]{9,}$/;
            if (!phonePattern.test(valor)) {
              isValid = false;
              markError(detalleInput, 'Ingresa un número válido (9 dígitos)');
            }
          }
        });
      }
    }

    // Tipo de producto (empresas, paso 5)
    if (step.data('step') === 5 && step.closest('#wizard-empresas').length) {
      if (!step.find('input[name="tipo-producto"]:checked').length) {
        isValid = false;
        $('#tipo-producto-error').show();
      }
      if ($('#producto-no-acordado-container').is(':visible')) {
        const productoInput = $('#producto-no-acordado-desc');
        if (!productoInput.val() || !productoInput.val().toString().trim()) {
          isValid = false;
          markError(productoInput);
        }
      }
    }

    // Volumen (afiliación, paso 5)
    if (step.data('step') === 5 && step.closest('#wizard-afiliacion').length) {
      if (!step.find('input[name="volumen-envios"]:checked').length) {
        isValid = false;
        $('#volumen-error').show();
      }
      if ($('#volumen-otro-container').is(':visible')) {
        const volumenInput = $('#volumen-otro-desc');
        if (!volumenInput.val() || parseInt(volumenInput.val(), 10) <= 0) {
          isValid = false;
          markError(volumenInput);
        }
      }
    }

    return isValid;
  }

  function markError($input, msg) {
    $input.addClass('input-error');
    let $err = $input.next('.error-message');
    if (!$err.length) {
      $err = $('<div class="error-message"></div>').insertAfter($input);
    }
    $err.text(msg || $err.text() || 'Revisa este campo').show();
  }

  // -------------------------
  // Generación de campos de medidas/peso por producto
  // -------------------------
  function generateProductMeasurements(wizardType) {
    const container = $(`#product-measurements-${wizardType}`);
    container.empty();

    $(`#wizard-${wizardType} .product-checkbox:checked`).each(function () {
      const productName = $(this).data('product');
      const cantidad = $(this).closest('.product-button').find('.product-button-quantity').val();
      const productId = $(this).attr('id');

      let detailBits = [];
      if (productId === `electrodomesticos-${wizardType}`) {
        const desc = $(`#electrodomesticos-desc-${wizardType}`).val();
        if (desc) detailBits.push(`${desc}`);
      }
      if (productId === `otros-${wizardType}`) {
        const desc = $(`#otros-desc-${wizardType}`).val();
        if (desc) detailBits.push(`${desc}`);
      }

      let title = `${productName}: ${cantidad}`;
      if (detailBits.length) title += ` (${detailBits.join(', ')})`;

      const measurementHtml = `
        <div class="product-measurement-item" data-product="${productId}">
          <div class="summary-title">${escapeHtml(title)}</div>
          <div class="measurement-fields">
            <div class="measurement-field">
              <label for="medidas-${productId}">Medidas (opcional)</label>
              <input type="text" id="medidas-${productId}" class="product-measurement-input" placeholder="Ej: 120x80x60 cm" data-type="medidas">
            </div>
            <div class="measurement-field">
              <label for="peso-${productId}">Peso en kg (opcional)</label>
              <input type="number" id="peso-${productId}" class="product-measurement-input" placeholder="Ej: 25" min="0" step="0.01" data-type="peso">
            </div>
          </div>
        </div>
      `;
      container.append(measurementHtml);
    });

    if (container.children().length === 0) {
      container.html('<p>No hay productos seleccionados</p>');
    }
  }

  // -------------------------
  // Resúmenes
  // -------------------------
  function generateResumenPedidoDomicilio() {
    const resumenContainer = $('#resumen-pedido-domicilio');
    resumenContainer.empty();

    let html = `
      <div class="summary-section">
        <div class="summary-title">Nombre</div>
        <div class="summary-content">${escapeHtml($('#nombre-domicilio').val())}</div>
      </div>
    `;

    let productosHtml = '<ul>';
    let hasProducts = false;

    $('#wizard-domicilio .product-checkbox:checked').each(function () {
      hasProducts = true;
      const productName = $(this).data('product');
      const cantidad = $(this).closest('.product-button').find('.product-button-quantity').val();
      const productId = $(this).attr('id');
      let productText = `${cantidad} x ${productName}`;
      const details = [];

      if (productId === 'electrodomesticos-domicilio') {
        const descripcion = $('#electrodomesticos-desc-domicilio').val();
        if (descripcion) details.push(descripcion);
      } else if (productId === 'otros-domicilio') {
        const descripcion = $('#otros-desc-domicilio').val();
        if (descripcion) details.push(descripcion);
      }

      const medidas = $(`#medidas-${productId}`).val();
      const peso = $(`#peso-${productId}`).val();
      if (medidas) details.push(`Medidas: ${medidas}`);
      if (peso) details.push(`Peso: ${peso} kg`);
      if (details.length > 0) productText += ` (${details.map(escapeHtml).join(', ')})`;

      productosHtml += `<li>${escapeHtml(productText)}</li>`;
    });

    productosHtml += '</ul>';
    if (hasProducts) {
      html += `
        <div class="summary-section">
          <div class="summary-title">Productos a transportar</div>
          <div class="summary-content">${productosHtml}</div>
        </div>
      `;
    }

    if ($('#comentario-transporte-domicilio').val()) {
      html += `
        <div class="summary-section">
          <div class="summary-title">Comentarios adicionales sobre el transporte</div>
          <div class="summary-content">${escapeHtml($('#comentario-transporte-domicilio').val())}</div>
        </div>
      `;
    }

    html += `
      <div class="summary-section">
        <div class="summary-title">¿Todo cabe en una furgoneta?</div>
        <div class="summary-content">
          ${$('#confirm-si-domicilio').is(':checked') ? 'Sí, estoy seguro' : 'No lo estoy'}
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-title">Dirección de recogida</div>
        <div class="summary-content">
          ${escapeHtml($('#direccion-recogida-domicilio').val())}<br>
          ${$('#piso-recogida-domicilio').val() ? `Piso: ${escapeHtml($('#piso-recogida-domicilio').val())}<br>` : ''}
          CP: ${escapeHtml($('#cp-recogida-domicilio').val())}
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-title">Dirección de entrega</div>
        <div class="summary-content">
          ${escapeHtml($('#direccion-entrega-domicilio').val())}<br>
          ${$('#piso-entrega-domicilio').val() ? `Piso: ${escapeHtml($('#piso-entrega-domicilio').val())}<br>` : ''}
          CP: ${escapeHtml($('#cp-entrega-domicilio').val())}
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-title">Fecha y hora</div>
        <div class="summary-content">
          Fecha: ${escapeHtml($('#fecha-domicilio').val())}<br>
          Franja horaria: ${escapeHtml($('#franja-horaria-domicilio option:selected').text())}
        </div>
      </div>
    `;

    let contactosHtml = '<ul>';
    let hasContacts = false;
    if ($('#contacto-whatsapp-domicilio').is(':checked')) {
      hasContacts = true;
      contactosHtml += `<li>WhatsApp: ${escapeHtml($('#wizard-domicilio input[data-tipo="whatsapp"]').val())}</li>`;
    }
    if ($('#contacto-email-domicilio').is(':checked')) {
      hasContacts = true;
      contactosHtml += `<li>Email: ${escapeHtml($('#wizard-domicilio input[data-tipo="email"]').val())}</li>`;
    }
    if ($('#contacto-llamada-domicilio').is(':checked')) {
      hasContacts = true;
      contactosHtml += `<li>Llamada: ${escapeHtml($('#wizard-domicilio input[data-tipo="llamada"]').val())}</li>`;
    }
    contactosHtml += '</ul>';

    if (hasContacts) {
      html += `
        <div class="summary-section">
          <div class="summary-title">Medios de contacto</div>
          <div class="summary-content">${contactosHtml}</div>
        </div>
      `;
    }

    resumenContainer.html(html);
  }

  function generateResumenPuntoLimpio() {
    const resumenContainer = $('#resumen-pedido-punto-limpio');
    resumenContainer.empty();

    let html = `
      <div class="summary-section">
        <div class="summary-title">Nombre</div>
        <div class="summary-content">${escapeHtml($('#nombre-punto-limpio').val())}</div>
      </div>
    `;

    let productosHtml = '<ul>';
    let hasProducts = false;

    $('#wizard-punto-limpio .product-checkbox:checked').each(function () {
      hasProducts = true;
      const productName = $(this).data('product');
      const cantidad = $(this).closest('.product-button').find('.product-button-quantity').val();
      const productId = $(this).attr('id');
      let productText = `${cantidad} x ${productName}`;
      const details = [];

    if (productId === 'electrodomesticos-punto-limpio') {
        const descripcion = $('#electrodomesticos-desc-punto-limpio').val();
        if (descripcion) details.push(descripcion);
      } else if (productId === 'otros-punto-limpio') {
        const descripcion = $('#otros-desc-punto-limpio').val();
        if (descripcion) details.push(descripcion);
      }

      const medidas = $(`#medidas-${productId}`).val();
      const peso = $(`#peso-${productId}`).val();
      if (medidas) details.push(`Medidas: ${medidas}`);
      if (peso) details.push(`Peso: ${peso} kg`);
      if (details.length > 0) productText += ` (${details.map(escapeHtml).join(', ')})`;

      productosHtml += `<li>${escapeHtml(productText)}</li>`;
    });

    productosHtml += '</ul>';
    if (hasProducts) {
      html += `
        <div class="summary-section">
          <div class="summary-title">Productos a transportar</div>
          <div class="summary-content">${productosHtml}</div>
        </div>
      `;
    }

    if ($('#comentario-transporte-punto-limpio').val()) {
      html += `
        <div class="summary-section">
          <div class="summary-title">Comentarios adicionales</div>
          <div class="summary-content">${escapeHtml($('#comentario-transporte-punto-limpio').val())}</div>
        </div>
      `;
    }

    html += `
      <div class="summary-section">
        <div class="summary-title">¿Todo cabe en una furgoneta?</div>
        <div class="summary-content">
          ${$('#confirm-si-punto-limpio').is(':checked') ? 'Sí, estoy seguro' : 'No lo estoy'}
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-title">Dirección de recogida</div>
        <div class="summary-content">
          ${escapeHtml($('#direccion-recogida-punto-limpio').val())}<br>
          ${$('#piso-recogida-punto-limpio').val() ? `Piso: ${escapeHtml($('#piso-recogida-punto-limpio').val())}<br>` : ''}
          CP: ${escapeHtml($('#cp-recogida-punto-limpio').val())}
        </div>
      </div>
      <div class="summary-section">
        <div class="summary-title">Fecha y hora</div>
        <div class="summary-content">
          Fecha: ${escapeHtml($('#fecha-punto-limpio').val())}<br>
          Franja horaria: ${escapeHtml($('#franja-horaria-punto-limpio option:selected').text())}
        </div>
      </div>
    `;

    let contactosHtml = '<ul>';
    let hasContacts = false;
    if ($('#contacto-whatsapp-punto-limpio').is(':checked')) {
      hasContacts = true;
      contactosHtml += `<li>WhatsApp: ${escapeHtml($('#wizard-punto-limpio input[data-tipo="whatsapp"]').val())}</li>`;
    }
    if ($('#contacto-email-punto-limpio').is(':checked')) {
      hasContacts = true;
      contactosHtml += `<li>Email: ${escapeHtml($('#wizard-punto-limpio input[data-tipo="email"]').val())}</li>`;
    }
    if ($('#contacto-llamada-punto-limpio').is(':checked')) {
      hasContacts = true;
      contactosHtml += `<li>Llamada: ${escapeHtml($('#wizard-punto-limpio input[data-tipo="llamada"]').val())}</li>`;
    }
    contactosHtml += '</ul>';

    if (hasContacts) {
      html += `
        <div class="summary-section">
          <div class="summary-title">Medios de contacto</div>
          <div class="summary-content">${contactosHtml}</div>
        </div>
      `;
    }

    resumenContainer.html(html);
  }

  function generateResumenAfiliado() {
    const resumenContainer = $('#resumen-afiliado');
    resumenContainer.empty();

    const addSection = (title, content) => {
      if (content && String(content).trim() !== '') {
        const sectionHtml = `
          <div class="summary-section">
            <div class="summary-title">${escapeHtml(title)}</div>
            <div class="summary-content">${content}</div>
          </div>
        `;
        resumenContainer.append(sectionHtml);
      }
    };

    addSection('Código de cliente', escapeHtml($('#codigo-cliente').val()));
    addSection(
      'Datos del cliente',
      `Nombre: ${escapeHtml($('#nombre-afiliado').val())}<br>Teléfono: ${escapeHtml($('#telefono-afiliado').val())}`
    );

    const recogidaContent = `
      ${escapeHtml($('#afiliado-recogida').val())}<br>
      ${$('#piso-recogida-afiliado').val() ? `Piso: ${escapeHtml($('#piso-recogida-afiliado').val())}<br>` : ''}
      CP: ${escapeHtml($('#cp-recogida-afiliado').val())}
    `;
    addSection('Dirección de recogida', recogidaContent);

    const entregaContent = `
      ${escapeHtml($('#afiliado-entrega').val())}<br>
      ${$('#piso-entrega-afiliado').val() ? `Piso: ${escapeHtml($('#piso-entrega-afiliado').val())}<br>` : ''}
      CP: ${escapeHtml($('#cp-entrega-afiliado').val())}
    `;
    addSection('Dirección de entrega', entregaContent);

    const fechaHoraContent = `
      Fecha: ${escapeHtml($('#afiliado-fecha').val())}<br>
      Hora: ${escapeHtml($('#afiliado-hora').val())}
    `;
    addSection('Fecha y hora de recogida', fechaHoraContent);

    const tipoProductoInput = $('#wizard-empresas').find('input[name="tipo-producto"]:checked');
    if (tipoProductoInput.length > 0) {
      let tipoProductoText = escapeHtml(tipoProductoInput.parent().text().trim());
      if (tipoProductoInput.val() === 'no-acordado') {
        const desc = $('#producto-no-acordado-desc').val();
        if (desc) tipoProductoText += `: ${escapeHtml(desc)}`;
      }
      addSection('Tipo de producto', tipoProductoText);
    }

    addSection('Comentarios adicionales', escapeHtml($('#comentarios').val()));
  }

  function generateResumenAfiliacion() {
    const resumenContainer = $('#resumen-afiliacion');
    resumenContainer.empty();

    let html = `
      <div class="summary-section">
        <div class="summary-title">Nombre de la empresa</div>
        <div class="summary-content">${escapeHtml($('#nombre-empresa').val())}</div>
      </div>
      <div class="summary-section">
        <div class="summary-title">CIF</div>
        <div class="summary-content">${escapeHtml($('#cif').val())}</div>
      </div>
      <div class="summary-section">
        <div class="summary-title">Persona responsable</div>
        <div class="summary-content">${escapeHtml($('#responsable').val())}</div>
      </div>
      <div class="summary-section">
        <div class="summary-title">Contacto</div>
        <div class="summary-content">
          Teléfono: ${escapeHtml($('#telefono-empresa').val())}<br>
          Email: ${escapeHtml($('#email-empresa').val())}
        </div>
      </div>
    `;

    const volumen = $('input[name="volumen-envios"]:checked').val();
    if (volumen) {
      let volumenText = '';
      if (volumen === 'otro') {
        volumenText = `Otro: ${escapeHtml($('#volumen-otro-desc').val())} envíos mensuales`;
      } else {
        volumenText = $(`label[for="volumen-${volumen.replaceAll(' ', '')}"]`).text().trim() || volumen;
      }
      html += `
        <div class="summary-section">
          <div class="summary-title">Volumen de envíos mensuales</div>
          <div class="summary-content">${escapeHtml(volumenText)}</div>
        </div>
      `;
    }

    resumenContainer.html(html);
  }

  // -------------------------
  // “Envíos” (ahora vía backend)
  // -------------------------
  $('#finalizar-pedido-domicilio').on('click', function () {
    const $btn = $(this);
    const currentStep = $btn.closest('.wizard-step');
    if (!validateStep(currentStep)) return false;
    const payload = collectDomicilioData();
    submitForm(payload, 'wizard-domicilio', $btn);
  });

  $('#finalizar-pedido-pl').on('click', function () {
    const $btn = $(this);
    const currentStep = $btn.closest('.wizard-step');
    if (!validateStep(currentStep)) return false;
    const payload = collectPuntoLimpioData();
    submitForm(payload, 'wizard-punto-limpio', $btn);
  });

  $('#finalizar-afiliado').on('click', function () {
    const $btn = $(this);
    const currentStep = $btn.closest('.wizard-step');
    if (!validateStep(currentStep)) return false;
    const payload = collectAfiliadoData();
    submitForm(payload, 'wizard-empresas', $btn);
  });

  $('#finalizar-afiliacion').on('click', function () {
    const $btn = $(this);
    const currentStep = $btn.closest('.wizard-step');
    if (!validateStep(currentStep)) return false;
    const payload = collectAfiliacionData();
    submitForm(payload, 'wizard-afiliacion', $btn);
  });

  // NUEVA implementación: envío real al backend
  function submitForm(formData, wizardId, $button) {
    const originalHtml = $button.html();
    $button.html('<i class="fas fa-spinner fa-spin"></i> Enviando...').prop('disabled', true);

    // Endpoint backend: lee de data-api del <body> si existe, si no usa /api/submit.php
    const API_URL = (document.body && document.body.dataset && document.body.dataset.api) || '/api/submit.php';

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        let data = {};
        try { data = await res.json(); } catch (e) {}
        if (!res.ok || !data || data.ok !== true) {
          const msg = (data && data.message) ? data.message : ('Error ' + res.status);
          throw new Error(msg);
        }

        // Éxito: avanzar al paso final del wizard
        const $current = $('#' + wizardId + ' .wizard-step.active');
        $current.removeClass('active');
        $current.next('.wizard-step').addClass('active');
        $('html, body').animate({ scrollTop: $('#' + wizardId).offset().top }, 400);

        // Evento para integraciones (incluye backendId si viene en data.data.id)
        document.dispatchEvent(new CustomEvent('form:submitted', {
          detail: {
            wizardId,
            data: formData,
            backendId: data && data.data ? data.data.id : undefined
          }
        }));
      })
      .catch((err) => {
        alert('No se pudo enviar tu solicitud. ' + (err && err.message ? err.message : 'Intenta de nuevo.'));
        console.error('[submitForm] ', err);
      })
      .finally(() => {
        $button.html(originalHtml).prop('disabled', false);
      });
  }

  // -------------------------
  // Recolección de datos (sin honeypot/ts/csrf)
  // -------------------------
  function collectDomicilioData() {
    const productos = [];
    $('#wizard-domicilio .product-checkbox:checked').each(function () {
      const productName = $(this).data('product');
      const cantidad = $(this).closest('.product-button').find('.product-button-quantity').val();
      const productId = $(this).attr('id');
      let descripcion = '';
      if (productId === 'electrodomesticos-domicilio') {
        descripcion = $('#electrodomesticos-desc-domicilio').val();
      } else if (productId === 'otros-domicilio') {
        descripcion = $('#otros-desc-domicilio').val();
      }
      productos.push({
        id: productId,
        nombre: productName,
        cantidad: cantidad,
        descripcion: descripcion,
      });
    });

    const medidasPeso = {};
    $('#wizard-domicilio .product-measurement-input').each(function () {
      const productId = $(this).closest('.product-measurement-item').data('product');
      const type = $(this).data('type');
      const value = $(this).val();
      if (!medidasPeso[productId]) medidasPeso[productId] = {};
      medidasPeso[productId][type] = value;
    });

    return {
      tipo_formulario: 'domicilio',
      nombre: $('#nombre-domicilio').val(),
      productos: productos,
      direccion_recogida: $('#direccion-recogida-domicilio').val(),
      piso_recogida: $('#piso-recogida-domicilio').val(),
      cp_recogida: $('#cp-recogida-domicilio').val(),
      direccion_entrega: $('#direccion-entrega-domicilio').val(),
      piso_entrega: $('#piso-entrega-domicilio').val(),
      cp_entrega: $('#cp-entrega-domicilio').val(),
      fecha: $('#fecha-domicilio').val(),
      franja_horaria: $('#franja-horaria-domicilio').val(),
      confirmacion_furgoneta: $('input[name="confirmacion-domicilio"]:checked').val(),
      comentarios: $('#comentario-transporte-domicilio').val(),
      contacto_whatsapp: $('#contacto-whatsapp-domicilio').is(':checked') ? $('#wizard-domicilio input[data-tipo="whatsapp"]').val() : '',
      contacto_email: $('#contacto-email-domicilio').is(':checked') ? $('#wizard-domicilio input[data-tipo="email"]').val() : '',
      contacto_llamada: $('#contacto-llamada-domicilio').is(':checked') ? $('#wizard-domicilio input[data-tipo="llamada"]').val() : '',
      medidas_peso: Object.keys(medidasPeso).length > 0 ? medidasPeso : null,
    };
  }

  function collectPuntoLimpioData() {
    const productos = [];
    $('#wizard-punto-limpio .product-checkbox:checked').each(function () {
      const productName = $(this).data('product');
      const cantidad = $(this).closest('.product-button').find('.product-button-quantity').val();
      const productId = $(this).attr('id');
      let descripcion = '';
      if (productId === 'electrodomesticos-punto-limpio') {
        descripcion = $('#electrodomesticos-desc-punto-limpio').val();
      } else if (productId === 'otros-punto-limpio') {
        descripcion = $('#otros-desc-punto-limpio').val();
      }
      productos.push({
        id: productId,
        nombre: productName,
        cantidad: cantidad,
        descripcion: descripcion,
      });
    });

    const medidasPeso = {};
    $('#wizard-punto-limpio .product-measurement-input').each(function () {
      const productId = $(this).closest('.product-measurement-item').data('product');
      const type = $(this).data('type');
      const value = $(this).val();
      if (!medidasPeso[productId]) medidasPeso[productId] = {};
      medidasPeso[productId][type] = value;
    });

    return {
      tipo_formulario: 'punto_limpio',
      nombre: $('#nombre-punto-limpio').val(),
      productos: productos,
      direccion_recogida: $('#direccion-recogida-punto-limpio').val(),
      piso_recogida: $('#piso-recogida-punto-limpio').val(),
      cp_recogida: $('#cp-recogida-punto-limpio').val(),
      fecha: $('#fecha-punto-limpio').val(),
      franja_horaria: $('#franja-horaria-punto-limpio').val(),
      confirmacion_furgoneta: $('input[name="confirmacion-punto-limpio"]:checked').val(),
      comentarios: $('#comentario-transporte-punto-limpio').val(),
      contacto_whatsapp: $('#contacto-whatsapp-punto-limpio').is(':checked') ? $('#wizard-punto-limpio input[data-tipo="whatsapp"]').val() : '',
      contacto_email: $('#contacto-email-punto-limpio').is(':checked') ? $('#wizard-punto-limpio input[data-tipo="email"]').val() : '',
      contacto_llamada: $('#contacto-llamada-punto-limpio').is(':checked') ? $('#wizard-punto-limpio input[data-tipo="llamada"]').val() : '',
      medidas_peso: Object.keys(medidasPeso).length > 0 ? medidasPeso : null,
    };
  }

  function collectAfiliadoData() {
    return {
      tipo_formulario: 'empresas_afiliado',
      codigo_cliente: $('#codigo-cliente').val(),
      nombre_cliente: $('#nombre-afiliado').val(),
      telefono_cliente: $('#telefono-afiliado').val(),
      direccion_recogida: $('#afiliado-recogida').val(),
      piso_recogida: $('#piso-recogida-afiliado').val(),
      cp_recogida: $('#cp-recogida-afiliado').val(),
      direccion_entrega: $('#afiliado-entrega').val(),
      piso_entrega: $('#piso-entrega-afiliado').val(),
      cp_entrega: $('#cp-entrega-afiliado').val(),
      fecha: $('#afiliado-fecha').val(),
      hora: $('#afiliado-hora').val(),
      tipo_producto: $('input[name="tipo-producto"]:checked').val(),
      producto_no_acordado_desc:
        $('input[name="tipo-producto"]:checked').val() === 'no-acordado'
          ? $('#producto-no-acordado-desc').val()
          : '',
      comentarios: $('#comentarios').val(),
    };
  }

  function collectAfiliacionData() {
    return {
      tipo_formulario: 'afiliacion',
      nombre_empresa: $('#nombre-empresa').val(),
      cif: $('#cif').val(),
      responsable: $('#responsable').val(),
      telefono_empresa: $('#telefono-empresa').val(),
      email_empresa: $('#email-empresa').val(),
      volumen_envios: $('input[name="volumen-envios"]:checked').val(),
      volumen_otro:
        $('input[name="volumen-envios"]:checked').val() === 'otro'
          ? parseInt($('#volumen-otro-desc').val() || '0', 10)
          : 0,
    };
  }

  // -------------------------
  // Controles UI (cantidad, productos, contacto, radios)
  // -------------------------
  $(document).on('click', '.quantity-plus', function () {
    const input = $(this).closest('.quantity-controls').find('.product-button-quantity');
    input.val(parseInt(input.val(), 10) + 1).trigger('change');
  });

  $(document).on('click', '.quantity-minus', function () {
    const input = $(this).closest('.quantity-controls').find('.product-button-quantity');
    const curr = parseInt(input.val(), 10) || 1;
    if (curr > 1) input.val(curr - 1).trigger('change');
  });

  $(document).on('change', '.product-button-quantity', function () {
    const v = parseInt($(this).val(), 10);
    if (isNaN(v) || v < 1) $(this).val(1);
  });

  $('.product-button').on('click', function (e) {
    if ($(e.target).closest('.quantity-controls').length) return;
    const checkbox = $(this).find('input[type="checkbox"]');
    checkbox.prop('checked', !checkbox.prop('checked'));
    const isChecked = checkbox.prop('checked');
    $(this).toggleClass('selected', isChecked);
    const quantityControls = $(this).find('.quantity-controls');
    if (isChecked) {
      quantityControls.css('display', 'flex');
    } else {
      quantityControls.hide();
      quantityControls.find('.product-button-quantity').val(1);
    }
    // Campos especiales
    const specialType = checkbox.data('special');
    if (specialType) {
      const container = $('#' + specialType + '-container');
      if (container.length) container.toggle(isChecked);
    }
  });

  $('.contacto-button').on('click', function () {
    const checkbox = $(this).find('input[type="checkbox"]');
    checkbox.prop('checked', !checkbox.prop('checked'));
    $(this).toggleClass('selected', checkbox.prop('checked'));
    const detalleContainer = $(this).closest('.contacto-option').find('.contacto-detalle-container');
    detalleContainer.toggle(checkbox.prop('checked'));
    if (!checkbox.prop('checked')) {
      detalleContainer.find('input').val('');
    }
  });

  $('.radio-button-option, .volume-option').on('click', function () {
    const radio = $(this).find('input[type="radio"]');
    const groupName = radio.attr('name');
    $(`input[name="${groupName}"]`).prop('checked', false).parent().removeClass('selected');
    radio.prop('checked', true);
    $(this).addClass('selected');

    if (radio.attr('id') === 'producto-no-acordado') {
      $('#producto-no-acordado-container').show();
    } else if (radio.attr('id') === 'volumen-otro') {
      $('#volumen-otro-container').show();
    } else {
      $('#producto-no-acordado-container, #volumen-otro-container').hide();
    }
  });

  // Solo números en teléfonos
  $('input[type="tel"]').on('input', function () {
    $(this).val($(this).val().replace(/[^0-9]/g, ''));
  });

  // Micro feedback táctil
  $('button, .product-button, .empresa-option, .radio-button-option, .volume-option, .quantity-btn, .contacto-button')
    .on('touchstart', function () {
      $(this).css('transform', 'scale(0.98)');
    })
    .on('touchend', function () {
      $(this).css('transform', '');
    });

  // -------------------------
  // Reveal on scroll
  // -------------------------
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('reveal--visible'));
  }

  // -------------------------
  // Utilidades
  // -------------------------
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
});
