/* File: /assets/js/pages/Usuario.js */
(() => {
    'use strict';

    // =========================
    // Header/Footer
    // =========================
    function loadComponent(url, containerId, key) {
        if (window[key] && typeof window[key].then === 'function') return window[key];

        const p = fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
            .then(r => r.ok ? r.text() : '')
            .then(html => {
                const container = document.getElementById(containerId);
                if (!container || !html) return;
                container.innerHTML = html;

                // re-ejecutar scripts dentro del componente
                Array.from(container.querySelectorAll('script')).forEach(oldScript => {
                    const s = document.createElement('script');
                    if (oldScript.src) { s.src = oldScript.src; s.async = false; }
                    else s.textContent = oldScript.textContent || '';
                    document.body.appendChild(s);
                    oldScript.remove();
                });
            })
            .catch(err => console.error('Error cargando componente:', url, err));

        window[key] = p;
        return p;
    }

    const headerLoaded = loadComponent('/header.html', 'header-container', '__huichplyHeaderLoaded');
    loadComponent('/footer_componente.html', 'footer-container', '__huichplyFooterLoaded');

    // =========================
    // Helpers
    // =========================
    function getServiceTypeName(serviceType) {
        switch (serviceType) {
            case 'domicilio': return 'Domicilio / Tienda';
            case 'punto': return 'Punto limpio';
            case 'mini':
            case 'minimudanza': return 'Furgoneta llena / Minimudanza';
            default: return serviceType || 'Servicio';
        }
    }


    function formatDate(dateString) {
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatDisplayDate(isoDate) {
        if (!isoDate) return '';
        const parts = isoDate.split('-');
        if (parts.length !== 3) return isoDate;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val ?? '';
    }

    // ===== local fallback (por si API cae)
    function getUserOrdersLocal(userId) {
        try {
            const userOrders = JSON.parse(localStorage.getItem('yevhoUserOrders') || '{}');
            return userOrders[userId] || [];
        } catch (_) { return []; }
    }

    async function fetchOrdersApi() {
        try {
            const res = await fetch('/api/orders', { credentials: 'include', headers: { Accept: 'application/json' } });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return null;
            return Array.isArray(data.items) ? data.items : [];
        } catch (_) {
            return null;
        }
    }

    // Valoraciones (solo para UI “ya valorado”)
    function getStoredValoraciones() {
        try { return JSON.parse(localStorage.getItem('yevhoValoraciones') || '[]'); }
        catch (_) { return []; }
    }
    function hasRatedOrder(userId, orderId) {
        if (!userId || !orderId) return false;
        const valoraciones = getStoredValoraciones();
        return valoraciones.some(v => v.userId === userId && v.orderId === orderId);
    }

    function getLastOrder(orders) {
        if (!orders.length) return null;
        const sorted = orders.slice().sort((a, b) => new Date((b.date || b.createdAt || 0)) - new Date((a.date || a.createdAt || 0)));
        return sorted[0] || null;
    }

    function setupRatingCard(user, orders) {
        const titleEl = document.getElementById('rateTitle');
        const descEl = document.getElementById('rateDesc');
        const btnEl = document.getElementById('rateBtn');
        const secondaryEl = document.getElementById('rateSecondaryLink');
        if (!titleEl || !descEl || !btnEl) return;

        const last = getLastOrder(orders);

        if (!last) {
            titleEl.textContent = 'Valora nuestros servicios';
            descEl.textContent = 'Tu opinión nos ayuda a mejorar. Cuéntanos cómo fue tu experiencia.';
            btnEl.textContent = 'Agrega un comentario';
            btnEl.href = '/Valorar';
            if (secondaryEl) {
                secondaryEl.href = '/valoraciones';
                secondaryEl.textContent = 'Ver valoraciones';
            }
            return;
        }

        const alreadyRated = hasRatedOrder(user.id, last.id);

        if (alreadyRated) {
            titleEl.textContent = '¡Gracias por tu valoración!';
            descEl.textContent = 'Ya valoraste tu último servicio. Si quieres, revisa las valoraciones.';
            btnEl.textContent = 'Ver valoraciones';
            btnEl.href = '/valoraciones';
            if (secondaryEl) {
                secondaryEl.href = '/Pedidos';
                secondaryEl.textContent = 'Hacer un pedido';
            }
            return;
        }

        const serviceName = getServiceTypeName(last.serviceType);
        titleEl.textContent = 'Valora tu último servicio';
        descEl.textContent = 'Último servicio: ' + serviceName + '. Tu opinión nos ayuda a mejorar.';
        btnEl.textContent = 'Agrega un comentario';
        btnEl.href = '/Valorar?orderId=' + encodeURIComponent(last.id);
        if (secondaryEl) {
            secondaryEl.href = '/valoraciones';
            secondaryEl.textContent = 'Ver valoraciones';
        }
    }

    function calculateUserRating(orders) {
        if (!orders.length) return '0.0';
        // rating “demo”: como no hay estado final real aún, lo dejamos conservador
        const completed = orders.filter(o => String(o.status || '').toLowerCase() === 'completado').length;
        const score = Math.min(5, completed * 1.0);
        return score.toFixed(1);
    }

    // =========================
    // Modal detalles
    // =========================
    function canCancelService(order) {
        if (!order?.serviceDate) return false;
        const serviceDate = new Date(order.serviceDate);
        if (Number.isNaN(serviceDate.getTime())) return false;
        const now = new Date();
        const hoursDiff = (serviceDate.getTime() - now.getTime()) / (1000 * 3600);
        return hoursDiff > 24;
    }

    async function cancelService(orderId) {
        if (!orderId) return false;

        // Endpoint backend recomendado: POST /api/orders/cancel
        try {
            const csrf = window.huichplyAuth?.ensureCsrfToken ? await window.huichplyAuth.ensureCsrfToken() : '';
            const res = await fetch('/api/orders/cancel', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-Token': csrf } : {})
                },
                body: JSON.stringify({ id: orderId })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || 'No se pudo cancelar el servicio.');

            return true;
        } catch (e) {
            console.warn('Cancelación API falló:', e);
            return false;
        }
    }

    function openServiceModal(order) {
        setText('modal-user-name', order.userName || '-');
        setText('modal-user-phone', order.userPhone || '-');
        setText('modal-user-email', order.userEmail || '-');
        setText('modal-service-type', getServiceTypeName(order.serviceType));
        setText('modal-distance', order.distance ? (order.distance + ' km') : '-');

        const heavy = (order.heavyItems ?? 0);
        const light = (order.lightItems ?? 0);
        const total = (order.totalPrice ?? 0);

        setText('modal-heavy-items', String(heavy));
        setText('modal-light-items', String(light));
        setText('modal-helper', order.helper ? 'Sí' : 'No');

        const dateTimeText = order.serviceDate
            ? (formatDisplayDate(order.serviceDate) + (order.serviceTime ? (' · ' + order.serviceTime) : ''))
            : '-';
        setText('modal-datetime', dateTimeText);

        setText('modal-pickup', order.pickupAddress || '-');
        setText('modal-delivery', order.deliveryAddress || '-');
        setText('modal-total', String(total) + '€');

        const cancelBtn = document.getElementById('cancelServiceBtn');
        const cancelationInfo = document.getElementById('cancelationInfo');

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

        const modalEl = document.getElementById('serviceDetailsModal');
        if (modalEl && window.bootstrap && bootstrap.Modal) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    // =========================
    // Init
    // =========================
    document.addEventListener('DOMContentLoaded', async () => {
        await headerLoaded;
        try { await (window.huichplyAuth?.ready || Promise.resolve()); } catch (_) { }

        // auth real
        const st = window.huichplyAuth?.getAuthState?.() || {};
        if (!st.isLoggedIn || !st.user) {
            const r = location.pathname + location.search + location.hash;
            window.location.href = `/sesion?tab=login&redirect=${encodeURIComponent(r)}`;
            return;
        }
        if (!st.user.accountType) {
            const r = location.pathname + location.search + location.hash;
            window.location.href = `/cuenta_usuario?redirect=${encodeURIComponent(r)}`;
            return;
        }

        const user = st.user;

        // pedidos desde API (fallback local)
        let orders = await fetchOrdersApi();
        if (!orders) orders = getUserOrdersLocal(user.id);

        const completedOrders = orders.filter(o => String(o.status || '').toLowerCase() === 'completado').length;
        const rating = calculateUserRating(orders);

        const email = user.email || 'sin-correo@ejemplo.com';
        const username = (user.username || (email.split('@')[0] || 'usuario')).toLowerCase();
        const fullName = user.name || username;
        const addresses = Array.isArray(user.addresses) ? user.addresses : [];
        const mainAddress = user.mainAddress || addresses[0] || 'Añade tu dirección principal.';
        const phone = user.phone || '+34 600 000 000';
        const memberSince = user.memberSince || '2023';

        const avatar = document.getElementById('profileAvatar');
        if (avatar) avatar.textContent = String(fullName || 'U').trim().charAt(0).toUpperCase();

        setText('profileName', fullName);
        setText('profileEmail', email);
        setText('profileUsername', '@' + username);
        setText('profileServicesCount', String(completedOrders));
        setText('profileRating', rating);
        setText('profileMemberSince', memberSince);

        setText('summaryServices', String(completedOrders));
        setText('summaryServicesHelper', String(completedOrders) + (completedOrders === 1 ? ' vez' : ' veces'));

        // resumen último servicio
        const lastServiceDateEl = document.getElementById('summaryLastServiceDate');
        const lastServiceInfoEl = document.getElementById('summaryLastServiceInfo');
        const summaryFavTypeEl = document.getElementById('summaryFavType');

        const last = getLastOrder(orders);
        if (lastServiceDateEl && lastServiceInfoEl) {
            if (last) {
                lastServiceDateEl.textContent = formatDate(last.date || last.createdAt);
                lastServiceInfoEl.textContent = getServiceTypeName(last.serviceType) + ' · ' + (last.pickupAddress || 'Sin dirección');
            } else {
                lastServiceDateEl.textContent = '—';
                lastServiceInfoEl.textContent = 'Aún no has realizado tu primer servicio con nosotros.';
            }
        }
        if (summaryFavTypeEl) summaryFavTypeEl.textContent = last ? getServiceTypeName(last.serviceType) : '—';

        // historial
        const historyContainer = document.getElementById('servicesHistory');
        if (historyContainer) {
            if (orders.length) {
                const sorted = orders.slice().sort((a, b) => new Date((b.date || b.createdAt || 0)) - new Date((a.date || a.createdAt || 0)));

                historyContainer.innerHTML = sorted.map(order => {
                    const status = String(order.status || '').toLowerCase();
                    let badgeClass = 'pendiente';
                    let badgeText = order.status || 'Pendiente';

                    if (status === 'agendado' || status === 'confirmado') { badgeClass = 'agendado'; badgeText = 'Agendado'; }
                    if (status === 'pendiente') { badgeClass = 'pendiente'; badgeText = 'Pendiente'; }
                    if (status === 'completado') { badgeClass = ''; badgeText = 'Completado'; }
                    if (status === 'cancelado') { badgeClass = 'cancelado'; badgeText = 'Cancelado'; }

                    const pickupShort = (order.pickupAddress && order.pickupAddress.length > 40)
                        ? order.pickupAddress.substring(0, 40) + '...'
                        : (order.pickupAddress || 'Sin dirección');

                    const when = formatDate(order.date || order.createdAt);

                    return `
            <article class="service-item" data-order-id="${order.id}">
              <div class="service-main">
                <div class="service-header">
                  <div class="service-type">${escapeHtml(getServiceTypeName(order.serviceType))}</div>
                  <div class="service-badge ${badgeClass}">${escapeHtml(badgeText)}</div>
                </div>
                <div class="service-date text-muted">${escapeHtml(when)}</div>
                <div class="service-meta">${escapeHtml(pickupShort)}</div>
              </div>
              <div class="service-extra">
                <div class="service-amount">${escapeHtml(String(order.totalPrice ?? 0))}€</div>
                <div class="service-id">Ref: ${escapeHtml(order.id)}</div>
              </div>
            </article>
          `;
                }).join('');

                Array.from(document.querySelectorAll('.service-item')).forEach(item => {
                    item.addEventListener('click', () => {
                        const orderId = item.getAttribute('data-order-id');
                        const order = orders.find(o => o.id === orderId);
                        if (order) openServiceModal(order);
                    });
                });
            } else {
                historyContainer.innerHTML = `<p class="text-muted">Aún no tienes pedidos.</p>`;
            }
        }

        // direcciones
        const addressesList = document.getElementById('addressesList');
        if (addressesList) {
            if (addresses.length) {
                addressesList.innerHTML = addresses.map((addr, idx) => `
          <div class="address-item">
            <div class="address-tag ${idx === 0 ? 'principal' : ''}">${idx === 0 ? 'Principal' : ('Secundaria ' + idx)}</div>
            <div style="font-size: 16px; font-weight: 500;">${escapeHtml(addr)}</div>
          </div>
        `).join('');
            } else {
                addressesList.innerHTML = `<p class="text-muted">No hay direcciones guardadas.</p>`;
            }
        }

        // panel datos
        setText('fieldFullName', fullName);
        setText('fieldUsername', '@' + username);
        setText('fieldEmail', email);
        setText('fieldPhone', phone);
        setText('fieldAddress', mainAddress);

        setText('sideEmail', email);
        setText('sidePhone', phone);
        setText('sideAddress', mainAddress);

        // tabs
        const tabButtons = document.querySelectorAll('.card-tab');
        const tabPanels = document.querySelectorAll('.tab-panel');
        Array.from(tabButtons).forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-tab');
                Array.from(tabButtons).forEach(b => b.classList.remove('active'));
                Array.from(tabPanels).forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById('tab-' + target);
                if (panel) panel.classList.add('active');
            });
        });

        // acciones
        document.getElementById('pedirYaBtn')?.addEventListener('click', () => {
            window.location.href = '/Pedidos';
        });

        // cancelar
        const cancelBtn = document.getElementById('cancelServiceBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                const orderId = cancelBtn.getAttribute('data-order-id');
                if (!orderId) return;
                if (!confirm('¿Estás seguro de que quieres cancelar este servicio?')) return;

                const ok = await cancelService(orderId);
                if (!ok) {
                    alert('No se pudo cancelar el servicio ahora mismo.');
                    return;
                }

                alert('Servicio cancelado correctamente.');

                // recargar para ver estado actualizado
                location.reload();
            });
        }

        setupRatingCard(user, orders);
    });

    // escapeHtml local para plantilla
    function escapeHtml(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
})();
