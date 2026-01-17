// Carga de header (compat demo)
window.__yevhoHeaderLoaded = fetch('header.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
        var container = document.getElementById('header-container');
        if (!container) return;

        container.innerHTML = html;

        // Re-ejecutar scripts del componente
        Array.from(container.querySelectorAll('script')).forEach(function (oldScript) {
            var s = document.createElement('script');
            if (oldScript.src) s.src = oldScript.src;
            else s.textContent = oldScript.textContent;
            document.body.appendChild(s);
            oldScript.remove();
        });
    })
    .catch(function (err) { console.error('Error cargando el header:', err); });

// Carga de footer (compat demo)
window.__yevhoFooterLoaded = fetch('footer_componente.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
        var container = document.getElementById('footer-container');
        if (!container) return;

        container.innerHTML = html;

        // Re-ejecutar scripts del componente
        Array.from(container.querySelectorAll('script')).forEach(function (oldScript) {
            var s = document.createElement('script');
            if (oldScript.src) s.src = oldScript.src;
            else s.textContent = oldScript.textContent;
            document.body.appendChild(s);
            oldScript.remove();
        });
    })
    .catch(function (err) { console.error('Error cargando el footer:', err); });

/* Datos */
function getUserOrders(userId) {
    try {
        var userOrders = JSON.parse(localStorage.getItem('yevhoUserOrders') || '{}');
        return userOrders[userId] || [];
    } catch (e) {
        return [];
    }
}

function getServiceTypeName(serviceType) {
    switch (serviceType) {
        case 'domicilio': return 'Domicilio / Tienda';
        case 'punto': return 'Punto limpio';
        case 'mini': return 'Furgoneta llena';
        default: return serviceType;
    }
}

function formatDate(dateString) {
    var date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDisplayDate(isoDate) {
    if (!isoDate) return '';
    var parts = isoDate.split('-');
    var year = parts[0];
    var month = parts[1];
    var day = parts[2];
    return day + '/' + month + '/' + year;
}

/* Valoraciones */
function getStoredValoraciones() {
    try {
        return JSON.parse(localStorage.getItem('yevhoValoraciones') || '[]');
    } catch (e) {
        return [];
    }
}

function hasRatedOrder(userId, orderId) {
    if (!userId || !orderId) return false;
    var valoraciones = getStoredValoraciones();
    return valoraciones.some(function (v) { return v.userId === userId && v.orderId === orderId; });
}

function getLastCompletedOrder(orders) {
    var completed = orders.filter(function (o) { return o.status === 'completado'; });
    if (completed.length === 0) return null;
    var sorted = completed.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    return sorted[0] || null;
}

function setupRatingCard(user, orders) {
    var titleEl = document.getElementById('rateTitle');
    var descEl = document.getElementById('rateDesc');
    var btnEl = document.getElementById('rateBtn');
    var secondaryEl = document.getElementById('rateSecondaryLink');

    if (!titleEl || !descEl || !btnEl) return;

    var lastCompleted = getLastCompletedOrder(orders);

    if (!lastCompleted) {
        titleEl.textContent = 'Valora nuestros servicios';
        descEl.textContent = 'Tu opinión nos ayuda a mejorar. Cuéntanos cómo fue tu experiencia.';
        btnEl.textContent = 'Agrega un comentario';
        btnEl.href = 'Valorar';
        if (secondaryEl) {
            secondaryEl.href = 'index#valoraciones';
            secondaryEl.textContent = 'Ver valoraciones';
        }
        return;
    }

    var alreadyRated = hasRatedOrder(user.id, lastCompleted.id);

    if (alreadyRated) {
        titleEl.textContent = '¡Gracias por tu valoración!';
        descEl.textContent = 'Ya valoraste tu último servicio. Si quieres, revisa las valoraciones.';
        btnEl.textContent = 'Ver valoraciones';
        btnEl.href = 'index#valoraciones';
        if (secondaryEl) {
            secondaryEl.href = 'Pedidos';
            secondaryEl.textContent = 'Hacer un pedido';
        }
        return;
    }

    var serviceName = getServiceTypeName(lastCompleted.serviceType);
    titleEl.textContent = 'Valora tu último servicio';
    descEl.textContent = 'Último servicio: ' + serviceName + '. Tu opinión nos ayuda a mejorar.';
    btnEl.textContent = 'Agrega un comentario';
    btnEl.href = 'Valorar?orderId=' + encodeURIComponent(lastCompleted.id);
    if (secondaryEl) {
        secondaryEl.href = 'index#valoraciones';
        secondaryEl.textContent = 'Ver valoraciones';
    }
}

/* Rating interno */
function calculateUserRating(orders) {
    if (orders.length === 0) return '0';
    var agendadoOrders = orders.filter(function (order) { return order.status === 'agendado'; }).length;
    var baseRating = agendadoOrders * 0.5;
    var completadoOrders = orders.filter(function (order) { return order.status === 'completado'; }).length;
    baseRating += completadoOrders * 1.0;
    var finalRating = Math.min(5, baseRating);
    return finalRating.toFixed(1);
}

/* Modal */
function openServiceModal(order) {
    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    setText('modal-user-name', order.userName || '-');
    setText('modal-user-phone', order.userPhone || '-');
    setText('modal-user-email', order.userEmail || '-');
    setText('modal-service-type', getServiceTypeName(order.serviceType));
    setText('modal-distance', order.distance ? (order.distance + ' km') : '-');

    var heavy = (order.heavyItems !== undefined && order.heavyItems !== null) ? order.heavyItems : 0;
    var light = (order.lightItems !== undefined && order.lightItems !== null) ? order.lightItems : 0;
    var total = (order.totalPrice !== undefined && order.totalPrice !== null) ? order.totalPrice : 0;

    setText('modal-heavy-items', String(heavy));
    setText('modal-light-items', String(light));
    setText('modal-helper', order.helper ? 'Sí' : 'No');

    var dateTimeText = order.serviceDate
        ? (formatDisplayDate(order.serviceDate) + (order.serviceTime ? (' · ' + order.serviceTime) : ''))
        : '-';
    setText('modal-datetime', dateTimeText);

    setText('modal-pickup', order.pickupAddress || '-');
    setText('modal-delivery', order.deliveryAddress || '-');
    setText('modal-total', String(total) + '€');

    var cancelBtn = document.getElementById('cancelServiceBtn');
    var cancelationInfo = document.getElementById('cancelationInfo');

    if (cancelBtn && cancelationInfo) {
        if (canCancelService(order)) {
            cancelBtn.disabled = false;
            cancelationInfo.textContent = 'Puedes cancelar el servicio sin coste.';
            cancelationInfo.style.color = 'var(--brand-blue)';
        } else {
            cancelBtn.disabled = true;
            cancelationInfo.textContent = 'Solo puedes cancelar el servicio con al menos 24 horas de antelación.';
            cancelationInfo.style.color = 'var(--muted)';
        }
        cancelBtn.setAttribute('data-order-id', order.id);
    }

    var modalEl = document.getElementById('serviceDetailsModal');
    if (modalEl && window.bootstrap && bootstrap.Modal) {
        var modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function canCancelService(order) {
    if (!order.serviceDate) return false;
    var serviceDate = new Date(order.serviceDate);
    var now = new Date();
    var timeDiff = serviceDate.getTime() - now.getTime();
    var hoursDiff = timeDiff / (1000 * 3600);
    return hoursDiff > 24;
}

function cancelService(orderId, user) {
    if (!user || !orderId) return;

    var userOrders = JSON.parse(localStorage.getItem('yevhoUserOrders') || '{}');
    if (userOrders[user.id]) {
        var orderIndex = userOrders[user.id].findIndex(function (order) { return order.id === orderId; });
        if (orderIndex !== -1) {
            userOrders[user.id][orderIndex].status = 'cancelado';
            localStorage.setItem('yevhoUserOrders', JSON.stringify(userOrders));

            var alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-5';
            alertDiv.style.zIndex = '9999';
            alertDiv.textContent = 'Servicio cancelado correctamente.';
            document.body.appendChild(alertDiv);

            setTimeout(function () { alertDiv.remove(); }, 3000);

            var modalEl = document.getElementById('serviceDetailsModal');
            if (modalEl && window.bootstrap && bootstrap.Modal) {
                var modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            setTimeout(function () { location.reload(); }, 500);
        }
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', function () {

    function initPage() {
        var user = window.yevhoAuth && window.yevhoAuth.requireAuth
            ? window.yevhoAuth.requireAuth({
                requireCompleteProfile: true,
                enforceAccountType: 'particular'
            })
            : null;

        if (!user) return;

        var orders = getUserOrders(user.id);

        var servicesCountEl = document.getElementById('servicesCount');
        if (servicesCountEl) servicesCountEl.textContent = orders.length;

        var completedOrders = orders.filter(function (order) { return order.status === 'completado'; }).length;
        var userRating = calculateUserRating(orders);

        var email = user.email || 'sin-correo@ejemplo.com';
        var username = (user.username || ((email.split('@')[0] || 'usuario'))).toLowerCase();
        var fullName = user.name || username;
        var addresses = Array.isArray(user.addresses) ? user.addresses : [];
        var mainAddress = addresses[0] || 'Añade tu dirección principal.';
        var phone = user.phone || '+34 600 000 000';
        var memberSince = user.memberSince || '2023';

        var avatar = document.getElementById('profileAvatar');
        if (avatar) avatar.textContent = String(fullName || 'Y').trim().charAt(0).toUpperCase();

        function setText(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = val;
        }

        setText('profileName', fullName);
        setText('profileEmail', email);
        setText('profileUsername', '@' + username);
        setText('profileServicesCount', String(completedOrders));
        setText('profileRating', userRating);
        setText('profileMemberSince', memberSince);

        setText('summaryServices', String(completedOrders));
        setText('summaryServicesHelper', String(completedOrders) + (completedOrders === 1 ? ' vez' : ' veces'));

        var lastServiceDateEl = document.getElementById('summaryLastServiceDate');
        var lastServiceInfoEl = document.getElementById('summaryLastServiceInfo');
        var summaryFavTypeEl = document.getElementById('summaryFavType');

        var lastService = null;
        var favType = null;

        if (orders.length > 0) {
            var sortedOrdersForSummary = orders.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
            lastService = sortedOrdersForSummary[0];

            var completedOrdersList = orders.filter(function (order) { return order.status === 'completado'; });
            var typeCount = {};
            completedOrdersList.forEach(function (h) {
                typeCount[h.serviceType] = (typeCount[h.serviceType] || 0) + 1;
            });

            var keys = Object.keys(typeCount);
            if (keys.length > 0) {
                var maxCount = Math.max.apply(null, Object.values(typeCount));
                favType = keys.find(function (type) { return typeCount[type] === maxCount; });
            }
        }

        if (lastServiceDateEl && lastServiceInfoEl) {
            if (lastService) {
                lastServiceDateEl.textContent = formatDate(lastService.date);
                lastServiceInfoEl.textContent =
                    getServiceTypeName(lastService.serviceType) + ' · ' +
                    (lastService.pickupAddress && lastService.pickupAddress.length > 30
                        ? lastService.pickupAddress.substring(0, 30) + '...'
                        : (lastService.pickupAddress || 'Sin dirección especificada'));
            } else {
                lastServiceDateEl.textContent = '—';
                lastServiceInfoEl.textContent = 'Aún no has realizado tu primer servicio con nosotros.';
            }
        }

        if (summaryFavTypeEl) summaryFavTypeEl.textContent = favType ? getServiceTypeName(favType) : '—';

        var historyContainer = document.getElementById('servicesHistory');
        if (historyContainer) {
            if (orders.length !== 0) {
                var sortedOrders = orders.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

                historyContainer.innerHTML = sortedOrders.map(function (order) {
                    var badgeClass = '';
                    var badgeText = '';

                    switch (order.status) {
                        case 'agendado': badgeClass = 'agendado'; badgeText = 'Agendado'; break;
                        case 'pendiente': badgeClass = 'pendiente'; badgeText = 'Pendiente'; break;
                        case 'completado': badgeClass = ''; badgeText = 'Completado'; break;
                        case 'cancelado': badgeClass = 'cancelado'; badgeText = 'Cancelado'; break;
                        default: badgeClass = 'pendiente'; badgeText = order.status || 'Pendiente';
                    }

                    var pickupShort = (order.pickupAddress && order.pickupAddress.length > 40)
                        ? order.pickupAddress.substring(0, 40) + '...'
                        : (order.pickupAddress || 'Sin dirección');

                    return (
                        '<article class="service-item" data-order-id="' + order.id + '">' +
                        '  <div class="service-main">' +
                        '    <div class="service-header">' +
                        '      <div class="service-type">' + getServiceTypeName(order.serviceType) + '</div>' +
                        '      <div class="service-badge ' + badgeClass + '">' + badgeText + '</div>' +
                        '    </div>' +
                        '    <div class="service-date text-muted">' + formatDate(order.date) + '</div>' +
                        '    <div class="service-meta">' + pickupShort + '</div>' +
                        '  </div>' +
                        '  <div class="service-extra">' +
                        '    <div class="service-amount">' + order.totalPrice + '€</div>' +
                        '    <div class="service-id">Ref: ' + order.id + '</div>' +
                        '  </div>' +
                        '</article>'
                    );
                }).join('');

                Array.from(document.querySelectorAll('.service-item')).forEach(function (item) {
                    item.addEventListener('click', function () {
                        var orderId = this.getAttribute('data-order-id');
                        var order = orders.find(function (o) { return o.id === orderId; });
                        if (order) openServiceModal(order);
                    });
                });
            }
        }

        var addressesList = document.getElementById('addressesList');
        if (addressesList) {
            if (addresses.length !== 0) {
                addressesList.innerHTML = addresses.map(function (addr, idx) {
                    return (
                        '<div class="address-item">' +
                        '  <div class="address-tag ' + (idx === 0 ? 'principal' : '') + '">' +
                        (idx === 0 ? 'Principal' : ('Secundaria ' + idx)) + '</div>' +
                        '  <div style="font-size: 16px; font-weight: 500;">' + addr + '</div>' +
                        '</div>'
                    );
                }).join('');
            }
        }

        setText('fieldFullName', fullName);
        setText('fieldUsername', '@' + username);
        setText('fieldEmail', email);
        setText('fieldPhone', phone);
        setText('fieldAddress', mainAddress);

        setText('sideEmail', email);
        setText('sidePhone', phone);
        setText('sideAddress', mainAddress);

        var tabButtons = document.querySelectorAll('.card-tab');
        var tabPanels = document.querySelectorAll('.tab-panel');

        Array.from(tabButtons).forEach(function (btn) {
            btn.addEventListener('click', function () {
                var target = btn.getAttribute('data-tab');
                Array.from(tabButtons).forEach(function (b) { b.classList.remove('active'); });
                Array.from(tabPanels).forEach(function (p) { p.classList.remove('active'); });
                btn.classList.add('active');
                var panel = document.getElementById('tab-' + target);
                if (panel) panel.classList.add('active');
            });
        });

        var pedirYaBtn = document.getElementById('pedirYaBtn');
        var cambiarEmpresaBtn = document.getElementById('cambiarEmpresaBtn');

        if (pedirYaBtn) {
            pedirYaBtn.addEventListener('click', function () {
                window.location.href = 'Pedidos';
            });
        }

        if (cambiarEmpresaBtn) {
            cambiarEmpresaBtn.addEventListener('click', function () {
                alert('¡Próximamente podrás cambiar a una cuenta de empresa! Mientras tanto, contacta con nosotros en info@yevho.com');
            });
        }

        var cancelBtn = document.getElementById('cancelServiceBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                var orderId = this.getAttribute('data-order-id');
                if (orderId && confirm('¿Estás seguro de que quieres cancelar este servicio?')) {
                    cancelService(orderId, user);
                }
            });
        }

        setupRatingCard(user, orders);
    }

    if (window.__yevhoHeaderLoaded && typeof window.__yevhoHeaderLoaded.then === 'function') {
        window.__yevhoHeaderLoaded.then(initPage);
    } else {
        initPage();
    }
});
