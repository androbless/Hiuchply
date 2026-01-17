/* File: /assets/js/pages/Valorar.js */
(function () {
    'use strict';

    // Header/Footer
    window.__huichplyHeaderLoaded = fetch('/header.html', { cache: 'no-cache', credentials: 'same-origin' })
        .then(r => r.ok ? r.text() : '')
        .then(html => {
            const container = document.getElementById('header-container');
            if (!container || !html) return;
            container.innerHTML = html;

            [...container.querySelectorAll('script')].forEach(oldScript => {
                const s = document.createElement('script');
                if (oldScript.src) { s.src = oldScript.src; s.async = false; }
                else s.textContent = oldScript.textContent;
                document.body.appendChild(s);
                oldScript.remove();
            });
        })
        .catch(err => console.error('Error cargando el header:', err));

    window.__huichplyFooterLoaded = fetch('/footer_componente.html', { cache: 'no-cache', credentials: 'same-origin' })
        .then(r => r.ok ? r.text() : '')
        .then(html => {
            const container = document.getElementById('footer-container');
            if (!container || !html) return;
            container.innerHTML = html;

            [...container.querySelectorAll('script')].forEach(oldScript => {
                const s = document.createElement('script');
                if (oldScript.src) { s.src = oldScript.src; s.async = false; }
                else s.textContent = oldScript.textContent;
                document.body.appendChild(s);
                oldScript.remove();
            });
        })
        .catch(err => console.error('Error cargando el footer:', err));

    // API base
    const API_BASE = String((window.huichplyConfig && window.huichplyConfig.apiBase) ? window.huichplyConfig.apiBase : '/api').replace(/\/$/, '');

    // Validación texto (tu lógica original)
    const ReviewPolicy = (() => {
        const LEET = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't' };

        function stripAccents(s) {
            return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        function normalizeText(s) {
            let t = stripAccents(String(s || '').toLowerCase());
            t = t.replace(/[@431!0$7]/g, ch => LEET[ch] || ch);
            t = t.replace(/[^a-zñ\s]/g, ' ');
            t = t.replace(/\s+/g, ' ').trim();
            return t;
        }

        const BLOCK_TERMS = [
            'hijoputa', 'hijo de puta', 'hija de puta', 'hdp',
            'puta', 'puto',
            'mierda', 'cabron', 'cabrón', 'gilipollas', 'subnormal', 'imbecil', 'imbécil',
            'maricon', 'maricón', 'idiota', 'estupido', 'estúpido',
            'coño', 'joder', 'hostia', 'carajo', 'pendejo', 'pendeja',
            'verga', 'culo', 'polla', 'chinga', 'chingar'
        ].map(normalizeText);

        const INSULT_PATTERNS = [
            /\b(eres|sois|son)\s+(un|una)?\s*(idiota|imbecil|subnormal|gilipollas|estupido)\b/i,
            /\b(vaya|menudo)\s+(idiota|imbecil|subnormal)\b/i,
            /\bque\s+(asco|mierda)\b/i
        ];

        function containsBlockedLanguage(text) {
            const t = normalizeText(text);
            if (!t) return false;
            for (const term of BLOCK_TERMS) if (term && t.includes(term)) return true;
            for (const re of INSULT_PATTERNS) if (re.test(text)) return true;
            return false;
        }

        function looksLikeSpam(text) {
            const raw = String(text || '');
            const hasUrl = /(https?:\/\/|www\.)/i.test(raw);
            const manyEmojis = ((raw.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length) > 8;
            const repeated = /(.)\1{6,}/.test(raw);
            const repeatedPunct = /([!?.,])\1{4,}/.test(raw);
            return hasUrl || manyEmojis || repeated || repeatedPunct;
        }

        function qualityScore(text) {
            const raw = String(text || '').trim();
            if (!raw) return 0;

            const words = raw.split(/\s+/).filter(Boolean);
            const wordCount = words.length;
            const len = raw.length;

            const letters = (raw.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]/g) || []).length;
            const upper = (raw.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
            const upperRatio = letters ? (upper / letters) : 0;

            const unique = new Set(words.map(w => normalizeText(w))).size;
            const uniqueRatio = wordCount ? unique / wordCount : 0;

            const hasSentencePunct = /[.!?]/.test(raw);
            const hasComma = /,/.test(raw);

            const fLen = Math.max(0, Math.min(1, (len - 20) / 120));
            const fWords = Math.max(0, Math.min(1, (wordCount - 6) / 20));
            const fUnique = Math.max(0, Math.min(1, (uniqueRatio - 0.35) / 0.35));
            const fPunct = (hasSentencePunct ? 0.7 : 0) + (hasComma ? 0.3 : 0);
            const fUpper = 1 - Math.max(0, Math.min(1, (upperRatio - 0.25) / 0.75));
            const fSpam = looksLikeSpam(raw) ? 0 : 1;

            const score =
                (0.22 * fLen) +
                (0.22 * fWords) +
                (0.18 * fUnique) +
                (0.15 * fPunct) +
                (0.13 * fUpper) +
                (0.10 * fSpam);

            return Math.max(0, Math.min(1, score));
        }

        function evaluate(text) {
            const raw = String(text || '').trim();

            if (raw.length < 10) {
                return { okToSend: false, reason: 'El comentario debe tener al menos 10 caracteres.', score: 0, flags: { tooShort: true } };
            }
            if (containsBlockedLanguage(raw)) {
                return { okToSend: false, reason: 'El comentario contiene lenguaje inapropiado. Por favor, sé respetuoso.', score: 0, flags: { offensive: true } };
            }

            const score = qualityScore(raw);
            const spam = looksLikeSpam(raw);
            return { okToSend: true, reason: 'OK', score, flags: { spam } };
        }

        return { evaluate };
    })();

    // Helpers
    function getServiceTypeName(serviceType) {
        switch (serviceType) {
            case 'domicilio': return 'Domicilio / Tienda';
            case 'punto': return 'Punto limpio';
            case 'minimudanza':
            case 'mini': return 'Minimudanza';
            default: return 'Otro';
        }
    }

    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }

    function initialsFromName(name) {
        const n = (name || '').trim();
        if (!n) return 'A';
        const parts = n.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
        return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
    }

    function createId() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function generateColorStops() {
        const colores = [
            '#2D51FF, #1c2fbf',
            '#E4FC53, #c9e046',
            '#63666F, #4a4d55',
            '#FF6B6B, #e05555',
            '#4ECDC4, #3bb5ae'
        ];
        return colores[Math.floor(Math.random() * colores.length)];
    }

    function getStoredValoraciones() {
        try { return JSON.parse(localStorage.getItem('yevhoValoraciones') || '[]'); }
        catch (_) { return []; }
    }
    function saveValoraciones(list) {
        localStorage.setItem('yevhoValoraciones', JSON.stringify(list));
        // compat con la home (si usa huichply.valoraciones)
        try {
            const existing = JSON.parse(localStorage.getItem('huichply.valoraciones') || '[]');
            localStorage.setItem('huichply.valoraciones', JSON.stringify([...(list || []), ...(existing || [])]));
        } catch (_) { }
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

    async function apiPostReview(payload) {
        const csrf = window.huichplyAuth?.ensureCsrfToken ? await window.huichplyAuth.ensureCsrfToken() : '';
        const res = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
                Accept: 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const msg = data && data.error ? data.error : 'No se pudo guardar la reseña.';
            const err = new Error(msg);
            err.status = res.status;
            throw err;
        }
        return data;
    }

    function wireStars() {
        const starsHint = document.getElementById('starsHint');
        const hiddenStars = document.getElementById('hiddenStars');

        const labels = Array.from(document.querySelectorAll('.star'));
        labels.forEach(label => {
            label.addEventListener('click', () => {
                const value = Number(label.getAttribute('data-value') || '5');
                if (hiddenStars) hiddenStars.value = String(value);
                if (starsHint) starsHint.textContent = `Has seleccionado: ${value} ${value === 1 ? 'estrella' : 'estrellas'}`;
            });
        });
    }

    function setupValidacionesEnTiempoReal() {
        const comentarioInput = document.getElementById('comentario');
        const comentarioValidation = document.getElementById('comentarioValidation');
        const submitBtn = document.getElementById('submitBtn');
        if (!comentarioInput || !comentarioValidation || !submitBtn) return;

        comentarioInput.addEventListener('input', () => {
            const texto = comentarioInput.value;

            if (texto.length === 0) {
                comentarioValidation.classList.remove('error', 'success');
                comentarioValidation.textContent = '';
                submitBtn.disabled = false;
                return;
            }

            const evalRes = ReviewPolicy.evaluate(texto);

            if (!evalRes.okToSend) {
                comentarioValidation.classList.add('error');
                comentarioValidation.classList.remove('success');
                comentarioValidation.textContent = evalRes.reason;
                submitBtn.disabled = true;
                return;
            }

            submitBtn.disabled = false;
            comentarioValidation.classList.remove('error');

            if (texto.trim().length > 50) {
                comentarioValidation.classList.add('success');
                comentarioValidation.textContent = '✓ Gracias, comentario recibido.';
            } else {
                comentarioValidation.classList.remove('success');
                comentarioValidation.textContent = '';
            }
        });
    }

    // Init
    (window.__huichplyHeaderLoaded || Promise.resolve()).then(async () => {
        try { await (window.huichplyAuth?.ready || Promise.resolve()); } catch (_) { }

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

        const email = user.email || 'sin-correo@ejemplo.com';
        const fullName = user.name || (email.split('@')[0] || 'Usuario');

        let orders = await fetchOrdersApi();
        if (!orders) orders = []; // si no hay, igual permitimos valorar “general”

        const orderIdFromUrl = getQueryParam('orderId');
        let order = null;

        if (orderIdFromUrl) order = orders.find(o => o.id === orderIdFromUrl) || null;
        if (!order && orders.length) order = orders[0];

        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');

        if (avatarEl) avatarEl.textContent = initialsFromName(fullName);
        if (nameEl) nameEl.textContent = fullName;
        if (emailEl) emailEl.textContent = email;

        const serviceSelect = document.getElementById('serviceSelect');
        if (serviceSelect && order && order.serviceType) {
            const stype = (order.serviceType === 'mini') ? 'minimudanza' : order.serviceType;
            if (['domicilio', 'punto', 'minimudanza'].includes(stype)) serviceSelect.value = stype;
        }

        const hiddenUserId = document.getElementById('hiddenUserId');
        const hiddenOrderId = document.getElementById('hiddenOrderId');
        if (hiddenUserId) hiddenUserId.value = user.id || '';
        if (hiddenOrderId) hiddenOrderId.value = order ? (order.id || '') : '';

        wireStars();
        setupValidacionesEnTiempoReal();

        const form = document.getElementById('formValorar');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('submitBtn');
            const submitText = document.getElementById('submitText');
            const submitSpinner = document.getElementById('submitSpinner');

            if (!submitBtn || !submitText || !submitSpinner) return;

            submitBtn.disabled = true;
            submitText.textContent = 'Enviando...';
            submitSpinner.style.display = 'inline-block';

            await new Promise(resolve => setTimeout(resolve, 200));

            const comentarioEl = document.getElementById('comentario');
            const comentario = (comentarioEl ? comentarioEl.value : '').trim();

            const estrellas = Number((document.getElementById('hiddenStars')?.value || '0'));
            const servicioSeleccionado = serviceSelect ? serviceSelect.value : 'domicilio';
            const servicioNombre = getServiceTypeName(servicioSeleccionado);

            const evalRes = ReviewPolicy.evaluate(comentario);
            if (!evalRes.okToSend) {
                alert(evalRes.reason);
                if (comentarioEl) comentarioEl.focus();
                submitBtn.disabled = false;
                submitText.textContent = 'Enviar valoración';
                submitSpinner.style.display = 'none';
                return;
            }

            // Evitar duplicado local por (userId + orderId)
            const valoraciones = getStoredValoraciones();
            const thisOrderId = document.getElementById('hiddenOrderId')?.value || '';

            if (thisOrderId) {
                const exists = valoraciones.some(v => v.userId === user.id && v.orderId === thisOrderId);
                if (exists) {
                    alert('Ya valoraste este servicio. ¡Gracias!');
                    window.location.href = '/valoraciones';
                    return;
                }
            }

            const reviewPayload = {
                id: createId(),
                userId: user.id || null,
                orderId: thisOrderId || null,
                nombre: fullName,
                email: email,
                iniciales: initialsFromName(fullName),
                color: generateColorStops(),
                tipoRaw: servicioSeleccionado,
                tipo: servicioNombre,
                estrellas: estrellas,
                comentario: comentario,
                createdAt: new Date().toISOString(),
                moderation: { score: evalRes.score, flags: evalRes.flags }
            };

            let savedToServer = false;

            try {
                const resp = await apiPostReview(reviewPayload);
                savedToServer = true;
                valoraciones.unshift({ ...reviewPayload, id: resp.id || reviewPayload.id, serverStored: true });
                saveValoraciones(valoraciones);
            } catch (err) {
                if (err && (err.status === 400 || err.status === 422 || err.status === 409)) {
                    alert(err.message || 'No se pudo guardar la valoración.');
                    submitBtn.disabled = false;
                    submitText.textContent = 'Enviar valoración';
                    submitSpinner.style.display = 'none';
                    return;
                }
                valoraciones.unshift({ ...reviewPayload, serverStored: false });
                saveValoraciones(valoraciones);
            }

            submitText.textContent = '¡Enviado!';
            await new Promise(resolve => setTimeout(resolve, 500));

            alert(savedToServer
                ? '¡Gracias! Tu valoración se registró.'
                : '¡Gracias! Tu valoración se registró (modo local).'
            );

            window.location.href = '/valoraciones';
        });
    });
})();
