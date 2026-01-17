/* Carga de componentes (compat demo) */
window.__yevhoHeaderLoaded = fetch('/header.html')
    .then(r => r.text())
    .then(html => {
        const container = document.getElementById('header-container');
        if (!container) return;
        container.innerHTML = html;

        // Re-ejecutar scripts embebidos dentro del componente
        [...container.querySelectorAll('script')].forEach(oldScript => {
            const s = document.createElement('script');
            if (oldScript.src) s.src = oldScript.src;
            else s.textContent = oldScript.textContent;
            document.body.appendChild(s);
            oldScript.remove();
        });
    })
    .catch(err => console.error('Error cargando el header:', err));

window.__yevhoFooterLoaded = fetch('/footer_componente.html')
    .then(r => r.text())
    .then(html => {
        const container = document.getElementById('footer-container');
        if (!container) return;
        container.innerHTML = html;

        // Re-ejecutar scripts embebidos dentro del componente
        [...container.querySelectorAll('script')].forEach(oldScript => {
            const s = document.createElement('script');
            if (oldScript.src) s.src = oldScript.src;
            else s.textContent = oldScript.textContent;
            document.body.appendChild(s);
            oldScript.remove();
        });
    })
    .catch(err => console.error('Error cargando el footer:', err));

/* API */
const API_BASE = (window.__YEVHO_REVIEWS_API__ || '').replace(/\/$/, '');

/* Validación de texto */
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

        for (const term of BLOCK_TERMS) {
            if (!term) continue;
            if (t.includes(term)) return true;
        }
        for (const re of INSULT_PATTERNS) {
            if (re.test(text)) return true;
        }
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
            return {
                okToSend: false,
                reason: 'El comentario debe tener al menos 10 caracteres.',
                score: 0,
                flags: { tooShort: true }
            };
        }

        if (containsBlockedLanguage(raw)) {
            return {
                okToSend: false,
                reason: 'El comentario contiene lenguaje inapropiado. Por favor, sé respetuoso.',
                score: 0,
                flags: { offensive: true }
            };
        }

        const score = qualityScore(raw);
        const spam = looksLikeSpam(raw);

        return { okToSend: true, reason: 'OK', score, flags: { spam } };
    }

    return { evaluate };
})();

/* Helpers */
function getServiceTypeName(serviceType) {
    switch (serviceType) {
        case 'domicilio': return 'Domicilio / Tienda';
        case 'punto': return 'Punto limpio';
        case 'minimudanza': return 'Minimudanza';
        default: return 'Otro';
    }
}

function getUserOrders(userId) {
    try {
        const userOrders = JSON.parse(localStorage.getItem('yevhoUserOrders') || '{}');
        return userOrders[userId] || [];
    } catch (e) {
        return [];
    }
}

function setUserOrders(userId, orders) {
    try {
        const all = JSON.parse(localStorage.getItem('yevhoUserOrders') || '{}');
        all[userId] = orders;
        localStorage.setItem('yevhoUserOrders', JSON.stringify(all));
    } catch (e) { /* noop */ }
}

function pickLastCompletedOrder(orders) {
    const completed = orders.filter(o => o.status === 'completado');
    if (completed.length === 0) return null;
    const sorted = [...completed].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0] || null;
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function getStoredValoraciones() {
    try { return JSON.parse(localStorage.getItem('yevhoValoraciones') || '[]'); }
    catch (e) { return []; }
}

function saveValoraciones(list) {
    localStorage.setItem('yevhoValoraciones', JSON.stringify(list));
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

async function apiPostReview(payload) {
    const url = `${API_BASE}/api/reviews`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

/* Estrellas */
function setStars(value) {
    const v = Number(value) || 0;
    const hidden = document.getElementById('hiddenStars');
    if (hidden) hidden.value = String(v);

    document.querySelectorAll('.star').forEach(l => {
        const n = Number(l.getAttribute('data-value'));
        l.classList.toggle('is-active', n <= v);
    });

    const hint = document.getElementById('starsHint');
    if (hint) hint.textContent = `Has seleccionado: ${v} ${v === 1 ? 'estrella' : 'estrellas'}`;
}

function wireStars() {
    document.querySelectorAll('input[name="stars"]').forEach(r => {
        r.addEventListener('change', () => setStars(r.value));
    });

    const labels = document.querySelectorAll('.star');
    labels.forEach(l => {
        l.addEventListener('mouseenter', () => {
            const v = Number(l.getAttribute('data-value'));
            document.querySelectorAll('.star').forEach(s => {
                const n = Number(s.getAttribute('data-value'));
                s.classList.toggle('is-active', n <= v);
            });
        });

        l.addEventListener('mouseleave', () => {
            const selected = document.querySelector('input[name="stars"]:checked');
            setStars(selected ? selected.value : 5);
        });
    });

    const selected = document.querySelector('input[name="stars"]:checked');
    setStars(selected ? selected.value : 5);
}

/* Validación en vivo */
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

/* Init */
window.__yevhoHeaderLoaded?.then(() => {
    const user = window.yevhoAuth?.requireAuth({ requireCompleteProfile: true });
    if (!user) return;

    const email = user.email || 'sin-correo@ejemplo.com';
    const fullName = user.name || (user.username || email.split('@')[0] || 'Usuario');

    const orders = getUserOrders(user.id);
    const orderIdFromUrl = getQueryParam('orderId');

    let order = null;
    if (orderIdFromUrl) order = orders.find(o => o.id === orderIdFromUrl) || null;
    if (!order) order = pickLastCompletedOrder(orders);

    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');

    if (avatarEl) avatarEl.textContent = initialsFromName(fullName);
    if (nameEl) nameEl.textContent = fullName;
    if (emailEl) emailEl.textContent = email;

    const serviceSelect = document.getElementById('serviceSelect');
    if (serviceSelect && order && order.serviceType) {
        const serviceType = order.serviceType === 'mini' ? 'minimudanza' : order.serviceType;
        if (['domicilio', 'punto', 'minimudanza'].includes(serviceType)) {
            serviceSelect.value = serviceType;
        }
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

        await new Promise(resolve => setTimeout(resolve, 250));

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

        const colorStops = generateColorStops();

        const reviewPayload = {
            id: createId(),
            userId: user.id || null,
            orderId: thisOrderId || null,

            nombre: fullName,
            email: email,
            iniciales: initialsFromName(fullName),

            color: colorStops,

            tipoRaw: servicioSeleccionado,
            tipo: servicioNombre,

            estrellas: estrellas,
            comentario: comentario,
            createdAt: new Date().toISOString(),

            // Metadatos internos (filtrado/publicación)
            moderation: { score: evalRes.score, flags: evalRes.flags },

            // Campos para rotación local (los usa la página de valoraciones)
            isFeatured: false,
            featuredOrder: null,
            timesFeatured: 0,
            lastFeaturedAt: null
        };

        let savedToServer = false;

        try {
            // Intento de guardado en servidor (si existe /api/reviews)
            const resp = await apiPostReview(reviewPayload);
            savedToServer = true;

            // Cache local opcional
            const cached = getStoredValoraciones();
            cached.unshift({ ...reviewPayload, id: resp.id || reviewPayload.id, serverStored: true });
            saveValoraciones(cached);
        } catch (err) {
            // Rechazo controlado del servidor
            if (err && (err.status === 400 || err.status === 422 || err.status === 409)) {
                alert(err.message || 'No se pudo guardar la valoración.');
                submitBtn.disabled = false;
                submitText.textContent = 'Enviar valoración';
                submitSpinner.style.display = 'none';
                return;
            }

            // Fallback local
            valoraciones.unshift({ ...reviewPayload, serverStored: false });
            saveValoraciones(valoraciones);
        }

        // Marcar pedido como valorado
        if (order && thisOrderId) {
            const idx = orders.findIndex(o => o.id === thisOrderId);
            if (idx !== -1) {
                orders[idx].rated = true;
                orders[idx].ratedService = servicioSeleccionado;
                setUserOrders(user.id, orders);
            }
        }

        submitText.textContent = '¡Enviado!';
        await new Promise(resolve => setTimeout(resolve, 600));

        alert(savedToServer
            ? '¡Gracias! Tu valoración se registró.'
            : '¡Gracias! Tu valoración se registró (modo local).'
        );

        window.location.href = '/valoraciones';
    });
});
