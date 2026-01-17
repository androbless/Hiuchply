/* public/assets/js/pages/valoraciones.js */

(function () {
    const API_ENABLED = (window.__HUICHPLY_API_ENABLED__ !== false);
    const API_BASE = String(window.__HUICHPLY_API_BASE__ ?? window.__REVIEWS_API_BASE__ ?? '')
        .replace(/\/$/, '');

    const PUBLISH = {
        limitCards: 3,
        rotationDays: 15,
        minStars: 3,
        minLenToShow: 25,
        minScore: 0.65
    };

    const LS_KEYS = {
        reviews: 'huichply.valoraciones',
        meta: 'huichply.valoraciones.meta' // { lastRotationAt: ISO }
    };

    function escapeHTML(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function apiGet(path) {
        const url = `${API_BASE}${path}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    // Evaluación local (calidad / spam / lenguaje)
    const ReviewQuality = (() => {
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
            for (const term of BLOCK_TERMS) {
                if (term && t.includes(term)) return true;
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

        function ensureQuality(review) {
            const r = review || {};
            const text = String(r.comentario || '').trim();

            // Compatibilidad: si existe r.ai (antiguo), lo mapeamos a r.qc
            if (!r.qc && r.ai && typeof r.ai === 'object') {
                r.qc = r.ai;
            }

            const qc = r.qc || {};
            const flags = qc.flags || {};

            // Si ya venía calculado, lo respetamos
            if (typeof qc.score === 'number' && qc.flags) {
                r.qc = { score: qc.score, flags: { ...flags } };
                return r;
            }

            const offensive = containsBlockedLanguage(text);
            const spam = looksLikeSpam(text);
            const score = qualityScore(text);

            r.qc = { score, flags: { ...flags, spam, offensive } };
            return r;
        }

        return { ensureQuality };
    })();

    function readReviews() {
        try { return JSON.parse(localStorage.getItem(LS_KEYS.reviews) || '[]'); }
        catch { return []; }
    }

    function writeReviews(list) {
        localStorage.setItem(LS_KEYS.reviews, JSON.stringify(list));
    }

    function readMeta() {
        try { return JSON.parse(localStorage.getItem(LS_KEYS.meta) || '{}'); }
        catch { return {}; }
    }

    function writeMeta(meta) {
        localStorage.setItem(LS_KEYS.meta, JSON.stringify(meta || {}));
    }

    function dateISO(r) {
        return r.createdAt || r.fecha || new Date().toISOString();
    }

    function isEligibleForFeatured(r) {
        const stars = Number(r.estrellas) || 0;
        const text = String(r.comentario || '').trim();
        const lenOk = text.length >= PUBLISH.minLenToShow;

        r = ReviewQuality.ensureQuality(r);
        const score = Number(r.qc?.score) || 0;
        const spam = !!r.qc?.flags?.spam;
        const offensive = !!r.qc?.flags?.offensive;

        return (!offensive && !spam && stars >= PUBLISH.minStars && lenOk && score >= PUBLISH.minScore);
    }

    function featuredSort(a, b) {
        const sa = Number(a.estrellas) || 0;
        const sb = Number(b.estrellas) || 0;
        if (sb !== sa) return sb - sa;

        const qa = Number(a.qc?.score || a.ai?.score) || 0;
        const qb = Number(b.qc?.score || b.ai?.score) || 0;
        if (qb !== qa) return qb - qa;

        const ta = Number(a.timesFeatured) || 0;
        const tb = Number(b.timesFeatured) || 0;
        if (ta !== tb) return ta - tb;

        const la = a.lastFeaturedAt ? new Date(a.lastFeaturedAt).getTime() : 0;
        const lb = b.lastFeaturedAt ? new Date(b.lastFeaturedAt).getTime() : 0;
        if (la !== lb) return la - lb;

        return new Date(dateISO(a)).getTime() - new Date(dateISO(b)).getTime();
    }

    function ensureFeaturedLocal(reviews) {
        const meta = readMeta();
        const last = meta.lastRotationAt ? new Date(meta.lastRotationAt).getTime() : null;
        const now = Date.now();
        const due = !last || (now - last >= PUBLISH.rotationDays * 24 * 60 * 60 * 1000);

        const currentFeatured = reviews
            .filter(r => r.isFeatured === true)
            .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

        if (!due) return { reviews, featured: currentFeatured };

        reviews.forEach(r => ReviewQuality.ensureQuality(r));

        const eligible = reviews.filter(isEligibleForFeatured).sort(featuredSort);

        if (eligible.length === 0) return { reviews, featured: currentFeatured };

        const currentIds = new Set(currentFeatured.map(r => r.id));
        const hasNewCandidate = eligible.some(r => !currentIds.has(r.id));

        if (currentFeatured.length > 0 && !hasNewCandidate) {
            return { reviews, featured: currentFeatured };
        }

        const picked = [];
        for (const r of eligible) {
            if (picked.length >= PUBLISH.limitCards) break;
            if (currentIds.has(r.id) && eligible.length > PUBLISH.limitCards) continue;
            picked.push(r);
        }
        if (picked.length < PUBLISH.limitCards) {
            for (const r of eligible) {
                if (picked.length >= PUBLISH.limitCards) break;
                if (!picked.find(x => x.id === r.id)) picked.push(r);
            }
        }

        const pickedIds = new Set(picked.map(r => r.id));

        reviews.forEach(r => {
            if (pickedIds.has(r.id)) {
                r.isFeatured = true;
                r.featuredOrder = picked.findIndex(x => x.id === r.id);
                r.lastFeaturedAt = new Date().toISOString();
                r.timesFeatured = Number(r.timesFeatured || 0) + 1;
            } else if (r.isFeatured) {
                r.isFeatured = false;
                r.featuredOrder = null;
            }

            // Normalizar: guardar siempre qc (y no duplicar)
            ReviewQuality.ensureQuality(r);
            if (r.ai) delete r.ai;
        });

        writeMeta({ ...meta, lastRotationAt: new Date().toISOString() });
        writeReviews(reviews);

        const featured = reviews
            .filter(r => r.isFeatured === true)
            .sort((a, b) => (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999));

        return { reviews, featured };
    }

    function calcularPromedio(valoraciones) {
        if (valoraciones.length === 0) return '0.0';
        const suma = valoraciones.reduce((acc, v) => acc + (Number(v.estrellas) || 0), 0);
        return (suma / valoraciones.length).toFixed(1);
    }

    function formatearFecha(fechaISO) {
        const ahora = new Date();
        const diffTiempo = ahora - new Date(fechaISO);
        const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
        if (diffDias === 0) return 'Hoy';
        if (diffDias === 1) return 'Ayer';
        if (diffDias < 7) return `Hace ${diffDias} días`;
        if (diffDias < 30) {
            const w = Math.floor(diffDias / 7);
            return `Hace ${w} semana${w > 1 ? 's' : ''}`;
        }
        const m = Math.floor(diffDias / 30);
        return `Hace ${m} mes${m > 1 ? 'es' : ''}`;
    }

    function generarHTMLValoracion(valoracion) {
        const estrellas = Math.max(0, Math.min(5, Number(valoracion.estrellas) || 0));
        const estrellasHTML = Array.from({ length: 5 }, (_, i) =>
            `<span class="estrella ${i < estrellas ? 'activa' : ''}">★</span>`
        ).join('');

        const colorStops = valoracion.color || '#2D51FF, #1c2fbf';
        const nombre = escapeHTML(valoracion.nombre || 'Cliente');
        const iniciales = escapeHTML(valoracion.iniciales || 'C');
        const comentario = escapeHTML(valoracion.comentario || '');
        const tipo = escapeHTML(valoracion.tipo || 'Servicio');
        const createdAt = dateISO(valoracion);

        return `
      <div class="valoracion-card">
        <div class="valoracion-header">
          <div class="cliente-info">
            <div class="cliente-avatar" style="background: linear-gradient(135deg, ${escapeHTML(colorStops)});">${iniciales}</div>
            <div class="cliente-datos">
              <div class="cliente-nombre">${nombre}</div>
              <div class="cliente-fecha">${formatearFecha(createdAt)}</div>
            </div>
          </div>
          <div class="valoracion-estrellas">${estrellasHTML}</div>
        </div>
        <div class="valoracion-texto">"${comentario}"</div>
        <div class="valoracion-tipo"><span class="tipo-badge">${tipo}</span></div>
      </div>
    `;
    }

    function actualizarPromedio(promedio) {
        const promedioPuntuacion = document.getElementById('promedio-puntuacion');
        const promedioEstrellas = document.getElementById('promedio-estrellas');

        if (promedioPuntuacion) promedioPuntuacion.textContent = promedio;

        if (promedioEstrellas) {
            const p = Number(promedio) || 0;
            const llenas = Math.floor(p);
            const media = p % 1 >= 0.5;

            promedioEstrellas.innerHTML = Array.from({ length: 5 }, (_, i) => {
                if (i < llenas) return '<span class="estrella grande activa">★</span>';
                if (i === llenas && media) return '<span class="estrella grande activa">★</span>';
                return '<span class="estrella grande">★</span>';
            }).join('');
        }
    }

    function initValoracionesAnimations() {
        if (!('IntersectionObserver' in window)) return;

        const cards = document.querySelectorAll('.valoracion-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.transitionDelay = `${index * 0.1}s`;
            observer.observe(card);
        });
    }

    async function renderizar() {
        const grid = document.getElementById('valoraciones-grid');
        const subtitulo = document.getElementById('valoraciones-subtitulo');
        if (!grid) return;

        // 1) Intentar API (/api/...) si existe; si falla, se usa fallback local
        if (API_ENABLED) {
            try {
                const featured = await apiGet(`/api/reviews/featured?limit=${PUBLISH.limitCards}`);
                const summary = await apiGet('/api/reviews/summary');

                const list = Array.isArray(featured?.items) ? featured.items : [];
                if (subtitulo && typeof summary?.total === 'number') {
                    subtitulo.textContent = `Más de ${summary.total} reseñas registradas`;
                }

                if (list.length > 0) {
                    grid.innerHTML = list.map(generarHTMLValoracion).join('');
                    actualizarPromedio(String(summary?.avg ?? '0.0'));
                    initValoracionesAnimations();
                    return;
                }
            } catch (e) {
                // Fallback local
            }
        }

        // 2) Fallback local: localStorage con rotación
        let reviews = readReviews();

        // Seed inicial (solo si está vacío)
        if (reviews.length === 0) {
            reviews = [
                {
                    id: 'seed1',
                    nombre: 'María G.',
                    iniciales: 'M',
                    color: '#2D51FF, #1c2fbf',
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    estrellas: 5,
                    comentario: 'Increíble servicio. Recogieron mi sofá a la hora exacta y lo entregaron sin un rasguño. Muy profesionales y amables.',
                    tipo: 'Mudanza',
                    qc: { score: 0.9, flags: { spam: false, offensive: false } },
                    isFeatured: true, featuredOrder: 0, timesFeatured: 1, lastFeaturedAt: new Date().toISOString()
                },
                {
                    id: 'seed2',
                    nombre: 'Javier L.',
                    iniciales: 'J',
                    color: '#E4FC53, #c9e046',
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    estrellas: 4,
                    comentario: 'Necesitaba llevar varios muebles al punto limpio y el servicio fue impecable. Precio justo y muy eficientes.',
                    tipo: 'Punto Limpio',
                    qc: { score: 0.82, flags: { spam: false, offensive: false } },
                    isFeatured: true, featuredOrder: 1, timesFeatured: 1, lastFeaturedAt: new Date().toISOString()
                },
                {
                    id: 'seed3',
                    nombre: 'Ana R.',
                    iniciales: 'A',
                    color: '#63666F, #4a4d55',
                    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    estrellas: 5,
                    comentario: 'Como pequeña empresa, hemos encontrado una solución perfecta para nuestros envíos locales. Rápidos y confiables.',
                    tipo: 'Empresa',
                    qc: { score: 0.88, flags: { spam: false, offensive: false } },
                    isFeatured: true, featuredOrder: 2, timesFeatured: 1, lastFeaturedAt: new Date().toISOString()
                }
            ];
            writeReviews(reviews);
            writeMeta({ lastRotationAt: new Date().toISOString() });
        } else {
            // Normalizar entradas antiguas y persistir (qc)
            reviews.forEach(r => ReviewQuality.ensureQuality(r));
            reviews.forEach(r => { if (r.ai) delete r.ai; });
            writeReviews(reviews);
        }

        const state = ensureFeaturedLocal(reviews);
        const featured = (state.featured || []).slice(0, PUBLISH.limitCards);

        if (subtitulo) subtitulo.textContent = `Reseñas destacadas (actualizan cada ${PUBLISH.rotationDays} días)`;

        let html = '';
        if (featured.length > 0) {
            featured.forEach(v => { html += generarHTMLValoracion(v); });
            for (let i = featured.length; i < PUBLISH.limitCards; i++) {
                html += `
          <div class="valoracion-card" style="opacity: 0.5;">
            <div class="valoracion-texto" style="text-align: center;">
              Sé el ${i === 0 ? 'primero' : 'siguiente'} en dejar una reseña
            </div>
          </div>
        `;
            }
        } else {
            html = `
        <div class="valoracion-card" style="grid-column: 1 / -1; text-align: center;">
          <div class="valoracion-texto">
            Aún no hay reseñas destacadas. ¡Sé el primero en opinar!
          </div>
        </div>
      `;
        }

        grid.innerHTML = html;
        actualizarPromedio(calcularPromedio(reviews));
        initValoracionesAnimations();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderizar);
    } else {
        renderizar();
    }
})();
