// NUEVO CÓDIGO JAVASCRIPT SIMPLIFICADO Y MEJORADO

$(document).ready(function() {
    // Variables globales
    let currentWizard = null;
    let currentStep = 0;
    let formData = {};
    
    // Configuración de los wizards y sus pasos
    const wizardsConfig = {
        'wizard-seleccion-servicio': {
            steps: 1,
            flow: 'service-selection'
        },
        'wizard-domicilio': {
            steps: 11,
            flow: 'domicilio'
        },
        'wizard-punto-limpio': {
            steps: 10,
            flow: 'punto-limpio'
        },
        'wizard-empresas': {
            steps: 7,
            flow: 'business'
        },
        'wizard-afiliacion': {
            steps: 5,
            flow: 'affiliation'
        }
    };
    
    // Inicialización
    function init() {
        setupEventListeners();
        setupTouchEvents();
        setupNumericValidation();
        
        // Inicializar fecha mínima
        const hoy = new Date().toISOString().split('T')[0];
        $('input[type="date"]').attr('min', hoy);
    }
    
    // Configurar event listeners
    function setupEventListeners() {
        // Botones principales
        $('#btn-pide-ya').click(() => openWizard('wizard-seleccion-servicio'));
        $('#btn-empresas').click(() => openWizard('wizard-empresa-seleccion'));
        
        // Navegación wizard
        $('.wizard-next').click(handleNext);
        $('.wizard-prev').click(handlePrevious);
        
        // Cerrar wizards
        $('.wizard-close-x').click(handleCloseWizard);
        $('.wizard-close').click(handleCloseWizard);
        $('.wizard-close-confirm').click(() => $('#close-confirm-modal').show());
        
        // Modal de confirmación
        $('#modal-cancel').click(() => $('#close-confirm-modal').hide());
        $('#modal-confirm').click(confirmCloseWizard);
        
        // Selección de tipo de empresa
        $('.empresa-option').click(handleEmpresaOption);
        
        // Controles de cantidad
        $(document).on('click', '.quantity-plus', handleQuantityChange);
        $(document).on('click', '.quantity-minus', handleQuantityChange);
        $('.product-button-quantity').change(validateQuantityInput);
        
        // Botones de productos
        $('.product-button').click(handleProductSelection);
        
        // Botones de contacto
        $('.contacto-button').click(handleContactSelection);
        
        // Botones de opción
        $('.radio-button-option, .volume-option').click(handleOptionSelection);
        
        // Slider de peso
        $('.weight-slider').on('input', updateWeightValue);
        $('.unknown-button').click(resetWeight);
        
        // Validación de teléfono
        $('input[type="tel"]').on('input', validatePhoneInput);
        
        // Envío de formularios
        $('#finalizar-pedido-domicilio').click(() => submitForm('domicilio'));
        $('#finalizar-pedido-pl').click(() => submitForm('punto-limpio'));
        $('#finalizar-pedido-afiliado').click(() => submitForm('afiliado'));
        $('#finalizar-afiliacion').click(() => submitForm('afiliacion'));
    }
    
    // Configurar eventos táctiles
    function setupTouchEvents() {
        const touchElements = 'button, .product-button, .empresa-option, .radio-button-option, .volume-option, .quantity-btn, .contacto-button';
        
        $(touchElements).on('touchstart', function() {
            $(this).addClass('touch-active');
        }).on('touchend', function() {
            $(this).removeClass('touch-active');
        });
    }
    
    // Configurar validación numérica
    function setupNumericValidation() {
        $('input[type="tel"], .numeric-input').on('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
    
    // Abrir wizard
    function openWizard(wizardId) {
        // Cerrar wizard actual si hay uno abierto
        if (currentWizard) {
            $(`#${currentWizard}`).hide();
        }
        
        // Mostrar wizard seleccionado
        $(`#${wizardId}`).show();
        currentWizard = wizardId;
        
        // Reiniciar estado
        resetWizard(wizardId);
    }
    
    // Reiniciar wizard
    function resetWizard(wizardId) {
        const wizard = $(`#${wizardId}`);
        
        // Ocultar todos los pasos y mostrar el primero
        wizard.find('.wizard-step').removeClass('active');
        wizard.find('.wizard-step:first').addClass('active');
        currentStep = 0;
        
        // Limpiar campos
        wizard.find('input, select, textarea').not('[type="button"]').val('');
        wizard.find('.input-error').removeClass('input-error');
        
        // Reiniciar selecciones
        wizard.find('.product-button, .radio-button-option, .volume-option, .contacto-button').removeClass('selected');
        wizard.find('input[type="checkbox"], input[type="radio"]').prop('checked', false);
        
        // Reiniciar cantidades
        wizard.find('.product-button-quantity').val('1');
        
        // Ocultar mensajes de error
        wizard.find('.error-message').hide();
        
        // Ocultar campos especiales
        $('.special-input-container, .contacto-detalle-container').hide();
        
        // Reiniciar datos del formulario
        formData = {};
    }
    
    // Manejar siguiente paso
    function handleNext() {
        const stepElement = $(this).closest('.wizard-step');
        const currentStepIndex = parseInt(stepElement.data('step'));
        
        // Validar paso actual
        if (!validateStep(stepElement)) {
            return;
        }
        
        // Guardar datos del paso actual
        saveStepData(stepElement);
        
        // Determinar el siguiente paso
        let nextStepIndex = currentStepIndex + 1;
        
        // Lógica especial para el wizard de selección de servicio
        if (currentWizard === 'wizard-seleccion-servicio' && currentStepIndex === 0) {
            const serviceType = $('input[name="tipo-servicio"]:checked').val();
            
            if (serviceType === 'domicilio') {
                // Cambiar al wizard de domicilio
                $('#wizard-seleccion-servicio').hide();
                $('#wizard-domicilio').show();
                currentWizard = 'wizard-domicilio';
                resetWizard('wizard-domicilio');
                return;
            } else if (serviceType === 'punto-limpio') {
                // Cambiar al wizard de punto limpio
                $('#wizard-seleccion-servicio').hide();
                $('#wizard-punto-limpio').show();
                currentWizard = 'wizard-punto-limpio';
                resetWizard('wizard-punto-limpio');
                return;
            }
        }
        
        // Navegar al siguiente paso
        navigateToStep(nextStepIndex);
        
        // Acciones especiales para pasos específicos
        if (currentWizard === 'wizard-domicilio' && nextStepIndex === 9) {
            generateResumen('domicilio');
        } else if (currentWizard === 'wizard-punto-limpio' && nextStepIndex === 8) {
            generateResumen('punto-limpio');
        } else if (currentWizard === 'wizard-empresas' && nextStepIndex === 6) {
            generateResumen('afiliado');
        } else if (currentWizard === 'wizard-afiliacion' && nextStepIndex === 4) {
            generateResumen('afiliacion');
        }
    }
    
    // Manejar paso anterior
    function handlePrevious() {
        const stepElement = $(this).closest('.wizard-step');
        const currentStepIndex = parseInt(stepElement.data('step'));
        
        // Navegar al paso anterior
        navigateToStep(currentStepIndex - 1);
    }
    
    // Navegar a un paso específico
    function navigateToStep(stepIndex) {
        const wizard = $(`#${currentWizard}`);
        
        // Ocultar paso actual
        wizard.find('.wizard-step.active').removeClass('active');
        
        // Mostrar paso solicitado
        wizard.find(`.wizard-step[data-step="${stepIndex}"]`).addClass('active');
        
        // Actualizar estado
        currentStep = stepIndex;
    }
    
    // Validar paso actual
    function validateStep(stepElement) {
        let isValid = true;
        const stepIndex = parseInt(stepElement.data('step'));
        
        // Ocultar mensajes de error previos
        stepElement.find('.error-message').hide();
        stepElement.find('.input-error').removeClass('input-error');
        
        // Validar campos requeridos
        stepElement.find('input[required], select[required], textarea[required]').each(function() {
            if (!$(this).val().trim()) {
                markFieldAsInvalid($(this), 'Este campo es obligatorio');
                isValid = false;
                return false;
            }
            
            // Validaciones específicas por tipo de campo
            if ($(this).attr('type') === 'email') {
                if (!isValidEmail($(this).val())) {
                    markFieldAsInvalid($(this), 'Ingresa un email válido');
                    isValid = false;
                    return false;
                }
            }
            
            if ($(this).attr('pattern')) {
                const pattern = new RegExp($(this).attr('pattern'));
                if (!pattern.test($(this).val())) {
                    markFieldAsInvalid($(this), 'El formato no es válido');
                    isValid = false;
                    return false;
                }
            }
        });
        
        if (!isValid) return false;
        
        // Validaciones específicas por wizard
        switch (currentWizard) {
            case 'wizard-seleccion-servicio':
                return validateSeleccionServicioStep(stepElement, stepIndex);
            case 'wizard-domicilio':
                return validateDomicilioStep(stepElement, stepIndex);
            case 'wizard-punto-limpio':
                return validatePuntoLimpioStep(stepElement, stepIndex);
            case 'wizard-empresas':
                return validateEmpresasStep(stepElement, stepIndex);
            case 'wizard-afiliacion':
                return validateAfiliacionStep(stepElement, stepIndex);
            default:
                return true;
        }
    }
    
    // Guardar datos del paso actual
    function saveStepData(stepElement) {
        const stepIndex = parseInt(stepElement.data('step'));
        
        // Recopilar datos de todos los campos del paso
        stepElement.find('input, select, textarea').each(function() {
            const fieldName = $(this).attr('id');
            const fieldValue = $(this).val();
            
            if (fieldName) {
                formData[fieldName] = fieldValue;
            }
        });
        
        // Guardar selecciones de productos
        if ((currentWizard === 'wizard-domicilio' && stepIndex === 2) || 
            (currentWizard === 'wizard-punto-limpio' && stepIndex === 2)) {
            formData.productos = [];
            $('.product-checkbox:checked').each(function() {
                const product = {
                    nombre: $(this).data('product'),
                    cantidad: $(this).closest('.product-button').find('.product-button-quantity').val()
                };
                
                // Agregar descripción para productos especiales
                if ($(this).attr('id').includes('electrodomesticos')) {
                    product.descripcion = $(`#${$(this).attr('id').replace('electrodomesticos', 'electrodomesticos-desc')}`).val();
                } else if ($(this).attr('id').includes('otros')) {
                    product.descripcion = $(`#${$(this).attr('id').replace('otros', 'otros-desc')}`).val();
                }
                
                formData.productos.push(product);
            });
        }
        
        // Guardar medios de contacto seleccionados
        if ((currentWizard === 'wizard-domicilio' && stepIndex === 8) || 
            (currentWizard === 'wizard-punto-limpio' && stepIndex === 7)) {
            formData.mediosContacto = [];
            $('.contacto-checkbox:checked').each(function() {
                const contacto = {
                    tipo: $(this).data('contacto'),
                    valor: $(this).closest('.contacto-option').find('.contacto-detalle').val()
                };
                formData.mediosContacto.push(contacto);
            });
        }
    }
    
    // Funciones de validación específicas para cada wizard
    function validateSeleccionServicioStep(stepElement, stepIndex) {
        let isValid = true;
        
        if (stepIndex === 0) {
            if (!$('input[name="tipo-servicio"]:checked').length) {
                $('#servicio-error').show();
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    function validateDomicilioStep(stepElement, stepIndex) {
        let isValid = true;
        
        switch (stepIndex) {
            case 2: // Selección de productos
                if ($('.product-checkbox:checked').length === 0) {
                    $('#transport-error-domicilio').show();
                    isValid = false;
                }
                
                // Validar campos especiales si están visibles
                if ($('#electrodomesticos-container-domicilio:visible').length) {
                    if (!$('#electrodomesticos-desc-domicilio').val().trim()) {
                        markFieldAsInvalid($('#electrodomesticos-desc-domicilio'), 'Describe los electrodomésticos');
                        isValid = false;
                    }
                }
                
                if ($('#otros-container-domicilio:visible').length) {
                    if (!$('#otros-desc-domicilio').val().trim()) {
                        markFieldAsInvalid($('#otros-desc-domicilio'), 'Describe qué necesitas transportar');
                        isValid = false;
                    }
                }
                break;
                
            case 4: // Confirmación
                if (!$('input[name="confirmacion-domicilio"]:checked').length) {
                    $('#confirmacion-error-domicilio').show();
                    isValid = false;
                }
                break;
                
            case 8: // Medios de contacto
                const contactosSeleccionados = $('.contacto-checkbox:checked');
                if (contactosSeleccionados.length === 0) {
                    $('#contacto-error-domicilio').show();
                    isValid = false;
                } else {
                    contactosSeleccionados.each(function() {
                        const detalleInput = $(this).closest('.contacto-option').find('.contacto-detalle');
                        if (!detalleInput.val().trim()) {
                            markFieldAsInvalid(detalleInput, 'Este campo es obligatorio');
                            isValid = false;
                        } else if ($(this).attr('id') === 'contacto-email-domicilio') {
                            if (!isValidEmail(detalleInput.val())) {
                                markFieldAsInvalid(detalleInput, 'Ingresa un email válido');
                                isValid = false;
                            }
                        } else if ($(this).attr('id') === 'contacto-whatsapp-domicilio' || $(this).attr('id') === 'contacto-llamada-domicilio') {
                            if (!isValidPhone(detalleInput.val())) {
                                markFieldAsInvalid(detalleInput, 'Ingresa un número válido');
                                isValid = false;
                            }
                        }
                    });
                }
                break;
        }
        
        return isValid;
    }
    
    function validatePuntoLimpioStep(stepElement, stepIndex) {
        let isValid = true;
        
        switch (stepIndex) {
            case 2: // Selección de productos
                if ($('.product-checkbox:checked').length === 0) {
                    $('#transport-error-pl').show();
                    isValid = false;
                }
                
                // Validar campos especiales si están visibles
                if ($('#electrodomesticos-container-pl:visible').length) {
                    if (!$('#electrodomesticos-desc-pl').val().trim()) {
                        markFieldAsInvalid($('#electrodomesticos-desc-pl'), 'Describe los electrodomésticos');
                        isValid = false;
                    }
                }
                
                if ($('#otros-container-pl:visible').length) {
                    if (!$('#otros-desc-pl').val().trim()) {
                        markFieldAsInvalid($('#otros-desc-pl'), 'Describe qué necesitas transportar');
                        isValid = false;
                    }
                }
                break;
                
            case 4: // Confirmación
                if (!$('input[name="confirmacion-pl"]:checked').length) {
                    $('#confirmacion-error-pl').show();
                    isValid = false;
                }
                break;
                
            case 7: // Medios de contacto
                const contactosSeleccionados = $('.contacto-checkbox:checked');
                if (contactosSeleccionados.length === 0) {
                    $('#contacto-error-pl').show();
                    isValid = false;
                } else {
                    contactosSeleccionados.each(function() {
                        const detalleInput = $(this).closest('.contacto-option').find('.contacto-detalle');
                        if (!detalleInput.val().trim()) {
                            markFieldAsInvalid(detalleInput, 'Este campo es obligatorio');
                            isValid = false;
                        } else if ($(this).attr('id') === 'contacto-email-pl') {
                            if (!isValidEmail(detalleInput.val())) {
                                markFieldAsInvalid(detalleInput, 'Ingresa an email válido');
                                isValid = false;
                            }
                        } else if ($(this).attr('id') === 'contacto-whatsapp-pl' || $(this).attr('id') === 'contacto-llamada-pl') {
                            if (!isValidPhone(detalleInput.val())) {
                                markFieldAsInvalid(detalleInput, 'Ingresa un número válido');
                                isValid = false;
                            }
                        }
                    });
                }
                break;
        }
        
        return isValid;
    }
    
    // Validación para wizard de empresas
    function validateEmpresasStep(stepElement, stepIndex) {
        let isValid = true;
        
        switch (stepIndex) {
            case 1: // Código de cliente
                const codigoCliente = $('#codigo-cliente');
                if (!codigoCliente.val().trim() || !/^\d{8}$/.test(codigoCliente.val())) {
                    markFieldAsInvalid(codigoCliente, 'El código debe tener 8 dígitos numéricos');
                    isValid = false;
                }
                break;
                
            case 5: // Tipo de producto
                if (!$('input[name="tipo-producto"]:checked').length) {
                    $('#tipo-producto-error').show();
                    isValid = false;
                }
                
                // Validar campo de producto no acordado si está visible
                if ($('#producto-no-acordado-container:visible').length) {
                    const productoInput = $('#producto-no-acordado-desc');
                    if (!productoInput.val().trim()) {
                        markFieldAsInvalid(productoInput, 'Describe el producto');
                        isValid = false;
                    }
                }
                break;
        }
        
        return isValid;
    }
    
    // Validación para wizard de afiliación
    function validateAfiliacionStep(stepElement, stepIndex) {
        let isValid = true;
        
        switch (stepIndex) {
            case 1: // CIF
                const cif = $('#cif');
                if (!cif.val().trim() || !/^[A-Za-z]{1}[0-9]{7}[A-Za-z]{1}$/.test(cif.val())) {
                    markFieldAsInvalid(cif, 'El CIF debe tener el formato: Letra + 7 números + Letra');
                    isValid = false;
                }
                break;
                
            case 3: // Volumen de envíos
                if (!$('input[name="volumen-envios"]:checked').length) {
                    $('#volumen-error').show();
                    isValid = false;
                }
                
                // Validar campo de volumen otro si está visible
                if ($('#volumen-otro-container:visible').length) {
                    const volumenInput = $('#volumen-otro-desc');
                    if (!volumenInput.val().trim() || parseInt(volumenInput.val()) <= 0) {
                        markFieldAsInvalid(volumenInput, 'Ingresa un número válido');
                        isValid = false;
                    }
                }
                break;
        }
        
        return isValid;
    }
    
    // Funciones auxiliares
    function markFieldAsInvalid(field, message) {
        field.addClass('input-error');
        field.next('.error-message').text(message).show();
    }
    
    function isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }
    
    function isValidPhone(phone) {
        const phonePattern = /^[0-9]{9,}$/;
        return phonePattern.test(phone);
    }
    
    // Manejar selección de tipo de empresa
    function handleEmpresaOption() {
        const tipo = $(this).data('option');
        $('#wizard-empresa-seleccion').hide();
        
        if (tipo === 'afiliado') {
            openWizard('wizard-empresas');
        } else if (tipo === 'afiliacion') {
            openWizard('wizard-afiliacion');
        }
    }
    
    // Manejar cambios de cantidad
    function handleQuantityChange() {
        const input = $(this).closest('.quantity-controls').find('.product-button-quantity');
        let value = parseInt(input.val()) || 0;
        
        if ($(this).hasClass('quantity-plus')) {
            input.val(value + 1);
        } else if ($(this).hasClass('quantity-minus') && value > 1) {
            input.val(value - 1);
        }
        
        input.trigger('change');
    }
    
    // Validar entrada de cantidad
    function validateQuantityInput() {
        let value = parseInt($(this).val());
        if (isNaN(value) || value < 1) {
            $(this).val(1);
        }
    }
    
    // Manejar selección de productos
    function handleProductSelection(e) {
        const checkbox = $(this).find('input[type="checkbox"]');
        const quantityControls = $(this).find('.quantity-controls');
        
        // Si el clic no fue en los controles de cantidad
        if (!quantityControls.is(e.target) && quantityControls.has(e.target).length === 0) {
            checkbox.prop('checked', !checkbox.prop('checked'));
            $(this).toggleClass('selected', checkbox.prop('checked'));
            
            // Manejar campos especiales si existen
            const specialType = checkbox.data('special');
            if (specialType) {
                $(`#${specialType}-container-${currentWizard === 'wizard-domicilio' ? 'domicilio' : 'pl'}`).toggle(checkbox.prop('checked'));
                if (!checkbox.prop('checked')) {
                    $(`#${specialType}-desc-${currentWizard === 'wizard-domicilio' ? 'domicilio' : 'pl'}`).val('');
                }
            }
        }
    }
    
    // Manejar selección de contacto
    function handleContactSelection() {
        const checkbox = $(this).find('input[type="checkbox"]');
        checkbox.prop('checked', !checkbox.prop('checked'));
        $(this).toggleClass('selected', checkbox.prop('checked'));
        
        // Mostrar/ocultar campo de detalle
        const detalleContainer = $(this).closest('.contacto-option').find('.contacto-detalle-container');
        detalleContainer.toggle(checkbox.prop('checked'));
        
        if (!checkbox.prop('checked')) {
            detalleContainer.find('input').val('');
        }
    }
    
    // Manejar selección de opciones
    function handleOptionSelection() {
        const radio = $(this).find('input[type="radio"]');
        const groupName = radio.attr('name');
        
        // Deseleccionar otros botones en el mismo grupo
        $(`input[name="${groupName}"]`).prop('checked', false).parent().removeClass('selected');
        
        // Seleccionar el actual
        radio.prop('checked', true);
        $(this).addClass('selected');
        
        // Mostrar/ocultar campos especiales según la selección
        if (radio.attr('id') === 'producto-no-acordado') {
            $('#producto-no-acordado-container').show();
        } else if (radio.attr('id') === 'volumen-otro') {
            $('#volumen-otro-container').show();
        } else {
            // Ocultar campos especiales si no son relevantes
            $('#producto-no-acordado-container, #volumen-otro-container').hide();
        }
    }
    
    // Actualizar valor del peso
    function updateWeightValue() {
        const sliderId = $(this).attr('id');
        const valueId = sliderId.replace('slider', 'value');
        $(`#${valueId}`).text($(this).val() + ' kg');
    }
    
    // Reiniciar peso
    function resetWeight() {
        const buttonId = $(this).attr('id');
        const sliderId = buttonId.replace('unknown-weight', 'weight-slider');
        $(`#${sliderId}`).val(0);
        $(`#${sliderId.replace('slider', 'value')}`).text('0 kg');
    }
    
    // Validar entrada de teléfono
    function validatePhoneInput() {
        this.value = this.value.replace(/[^0-9]/g, '');
    }
    
    // Cerrar wizard
    function handleCloseWizard() {
        const wizardId = $(this).data('wizard') || currentWizard;
        $(`#${wizardId}`).hide();
        currentWizard = null;
    }
    
    // Confirmar cierre de wizard
    function confirmCloseWizard() {
        $('#close-confirm-modal').hide();
        if (currentWizard) {
            $(`#${currentWizard}`).hide();
            currentWizard = null;
        }
    }
    
    // Funciones para generar resúmenes
    function generateResumen(tipo) {
        const resumen = $(`#resumen-pedido-${tipo}`);
        let html = '<div class="summary-section"><div class="summary-title">Resumen del pedido</div>';
        html += '<div class="summary-content">';
        
        // Agregar datos básicos según el tipo
        if (tipo === 'domicilio' || tipo === 'punto-limpio') {
            if (formData[`nombre-${tipo}`]) {
                html += `<div class="summary-item"><strong>Nombre:</strong> ${formData[`nombre-${tipo}`]}</div>`;
            }
            
            // Agregar productos
            if (formData.productos && formData.productos.length > 0) {
                html += `<div class="summary-item"><strong>Productos:</strong> `;
                formData.productos.forEach((producto, index) => {
                    html += `${producto.nombre} (${producto.cantidad})`;
                    if (producto.descripcion) {
                        html += ` - ${producto.descripcion}`;
                    }
                    if (index < formData.productos.length - 1) {
                        html += ', ';
                    }
                });
                html += `</div>`;
            }
            
            // Agregar peso y medidas
            if (formData[`weight-slider-${tipo}`] && formData[`weight-slider-${tipo}`] > 0) {
                html += `<div class="summary-item"><strong>Peso aproximado:</strong> ${formData[`weight-slider-${tipo}`]} kg</div>`;
            }
            
            if (formData[`medidas-${tipo}`]) {
                html += `<div class="summary-item"><strong>Medidas aproximadas:</strong> ${formData[`medidas-${tipo}`]}</div>`;
            }
            
            // Agregar confirmación
            if (formData[`confirmacion-${tipo}`]) {
                const confirmacion = formData[`confirmacion-${tipo}`] === 'si' ? 'Sí, estoy seguro' : 'No lo estoy';
                html += `<div class="summary-item"><strong>Confirmación:</strong> ${confirmacion}</div>`;
            }
            
            // Agregar dirección de recogida
            if (formData[`direccion-recogida-${tipo}`]) {
                html += `<div class="summary-item"><strong>Dirección de recogida:</strong> ${formData[`direccion-recogida-${tipo}`]}`;
                if (formData[`piso-recogida-${tipo}`]) {
                    html += `, ${formData[`piso-recogida-${tipo}`]}`;
                }
                if (formData[`cp-recogida-${tipo}`]) {
                    html += `, CP: ${formData[`cp-recogida-${tipo}`]}`;
                }
                html += `</div>`;
            }
            
            // Solo para domicilio: agregar dirección de entrega
            if (tipo === 'domicilio' && formData[`direccion-entrega-${tipo}`]) {
                html += `<div class="summary-item"><strong>Dirección de entrega:</strong> ${formData[`direccion-entrega-${tipo}`]}`;
                if (formData[`piso-entrega-${tipo}`]) {
                    html += `, ${formData[`piso-entrega-${tipo}`]}`;
                }
                if (formData[`cp-entrega-${tipo}`]) {
                    html += `, CP: ${formData[`cp-entrega-${tipo}`]}`;
                }
                html += `</div>`;
            }
            
            // Agregar fecha y hora
            if (formData[`fecha-${tipo}`]) {
                html += `<div class="summary-item"><strong>Fecha:</strong> ${formData[`fecha-${tipo}`]}</div>`;
            }
            
            if (formData[`franja-horaria-${tipo}`]) {
                html += `<div class="summary-item"><strong>Franja horaria:</strong> ${formData[`franja-horaria-${tipo}`]}</div>`;
            }
            
            // Agregar medios de contacto
            if (formData.mediosContacto && formData.mediosContacto.length > 0) {
                html += `<div class="summary-item"><strong>Medios de contacto:</strong> `;
                formData.mediosContacto.forEach((contacto, index) => {
                    html += `${contacto.tipo}: ${contacto.valor}`;
                    if (index < formData.mediosContacto.length - 1) {
                        html += ', ';
                    }
                });
                html += `</div>`;
            }
            
            // Agregar comentarios adicionales
            if (formData[`comentario-transporte-${tipo}`]) {
                html += `<div class="summary-item"><strong>Comentarios adicionales:</strong> ${formData[`comentario-transporte-${tipo}`]}</div>`;
            }
        } else if (tipo === 'afiliado') {
            // Resumen para afiliados
            if (formData.codigo_cliente) {
                html += `<div class="summary-item"><strong>Código de cliente:</strong> ${formData.codigo_cliente}</div>`;
            }
            
            if (formData.nombre_afiliado) {
                html += `<div class="summary-item"><strong>Nombre:</strong> ${formData.nombre_afiliado}</div>`;
            }
            
            if (formData.telefono_afiliado) {
                html += `<div class="summary-item"><strong>Teléfono:</strong> ${formData.telefono_afiliado}</div>`;
            }
            
            // Agregar direcciones
            if (formData.afiliado_recogida) {
                html += `<div class="summary-item"><strong>Dirección de recogida:</strong> ${formData.afiliado_recogida}`;
                if (formData.piso_recogida_afiliado) {
                    html += `, ${formData.piso_recogida_afiliado}`;
                }
                if (formData.cp_recogida_afiliado) {
                    html += `, CP: ${formData.cp_recogida_afiliado}`;
                }
                html += `</div>`;
            }
            
            if (formData.afiliado_entrega) {
                html += `<div class="summary-item"><strong>Dirección de entrega:</strong> ${formData.afiliado_entrega}`;
                if (formData.piso_entrega_afiliado) {
                    html += `, ${formData.piso_entrega_afiliado}`;
                }
                if (formData.cp_entrega_afiliado) {
                    html += `, CP: ${formData.cp_entrega_afiliado}`;
                }
                html += `</div>`;
            }
            
            // Agregar fecha y hora
            if (formData.afiliado_fecha) {
                html += `<div class="summary-item"><strong>Fecha:</strong> ${formData.afiliado_fecha}</div>`;
            }
            
            if (formData.afiliado_hora) {
                html += `<div class="summary-item"><strong>Hora:</strong> ${formData.afiliado_hora}</div>`;
            }
            
            // Agregar tipo de producto
            const tipoProducto = $('input[name="tipo-producto"]:checked');
            if (tipoProducto.length) {
                let tipoText = tipoProducto.parent().text().trim();
                if (tipoProducto.val() === 'no-acordado' && formData.producto_no_acordado_desc) {
                    tipoText += `: ${formData.producto_no_acordado_desc}`;
                }
                html += `<div class="summary-item"><strong>Tipo de producto:</strong> ${tipoText}</div>`;
            }
        } else if (tipo === 'afiliacion') {
            // Resumen para afiliación
            if (formData.nombre_empresa) {
                html += `<div class="summary-item"><strong>Nombre de la empresa:</strong> ${formData.nombre_empresa}</div>`;
            }
            
            if (formData.cif) {
                html += `<div class="summary-item"><strong>CIF:</strong> ${formData.cif}</div>`;
            }
            
            if (formData.responsable) {
                html += `<div class="summary-item"><strong>Responsable:</strong> ${formData.responsable}</div>`;
            }
            
            if (formData.telefono_empresa) {
                html += `<div class="summary-item"><strong>Teléfono:</strong> ${formData.telefono_empresa}</div>`;
            }
            
            if (formData.email_empresa) {
                html += `<div class="summary-item"><strong>Email:</strong> ${formData.email_empresa}</div>`;
            }
            
            // Agregar dirección
            if (formData.direccion_empresa) {
                html += `<div class="summary-item"><strong>Dirección:</strong> ${formData.direccion_empresa}`;
                if (formData.piso_empresa) {
                    html += `, ${formData.piso_empresa}`;
                }
                if (formData.cp_empresa) {
                    html += `, CP: ${formData.cp_empresa}`;
                }
                html += `</div>`;
            }
            
            // Agregar volumen de envíos
            const volumen = $('input[name="volumen-envios"]:checked');
            if (volumen.length) {
                let volumenText = volumen.parent().text().trim();
                if (volumen.val() === 'otro' && formData.volumen_otro_desc) {
                    volumenText += `: ${formData.volumen_otro_desc} envíos/mes`;
                } else {
                    volumenText += ' envíos/mes';
                }
                html += `<div class="summary-item"><strong>Volumen de envíos:</strong> ${volumenText}</div>`;
            }
        }
        
        html += '</div></div>';
        resumen.html(html);
    }
    
    // Enviar formulario
    function submitForm(tipo) {
        // Aquí se enviarían los datos a PHP
        // Por ahora solo navegamos a la pantalla de éxito
        navigateToStep(tipo === 'domicilio' ? 10 : 
                      tipo === 'punto-limpio' ? 9 : 
                      tipo === 'afiliado' ? 7 : 5);
        
        // En un entorno real, aquí enviaríamos los datos:
        /*
        $.ajax({
            url: 'procesar_formulario.php',
            type: 'POST',
            data: {
                tipo: tipo,
                datos: formData
            },
            success: function(response) {
                navigateToStep(tipo === 'domicilio' ? 10 : 
                              tipo === 'punto-limpio' ? 9 : 
                              tipo === 'afiliado' ? 7 : 5);
            },
            error: function() {
                alert('Error al enviar el formulario. Por favor, inténtalo de nuevo.');
            }
        });
        */
    }
    
    // Inicializar la aplicación
    init();
});