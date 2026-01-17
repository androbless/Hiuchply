/* Pedidos.js */

(() => {
    'use strict';

    // =========================
    // Header (carga única)
    // =========================
    const HEADER_PROMISE_KEY = '__huichplyHeaderLoaded';
    const LEGACY_HEADER_PROMISE_KEY = '__yevhoHeaderLoaded';

    async function fetchFirstOk(urls) {
        for (const url of urls) {
            try {
                const res = await fetch(url, { cache: 'no-cache' });
                if (res.ok) return { url, text: await res.text() };
            } catch (_) { /* noop */ }
        }
        return null;
    }

    function reExecuteInlineScripts(container) {
        const scripts = Array.from(container.querySelectorAll('script'));
        for (const oldScript of scripts) {
            const s = document.createElement('script');
            if (oldScript.src) {
                s.src = oldScript.src;
                s.async = false;
            } else {
                s.textContent = oldScript.textContent || '';
            }
            document.body.appendChild(s);
            oldScript.remove();
        }
    }

    function loadHeaderOnce() {
        const existing = window[HEADER_PROMISE_KEY] || window[LEGACY_HEADER_PROMISE_KEY];
        if (existing && typeof existing.then === 'function') return existing;

        const p = (async () => {
            const container = document.getElementById('header-container');
            if (!container) return;

            // Si ya hay header renderizado, no recargar
            if (container.children && container.children.length > 0) return;

            const candidates = [
                '/header.html',
                'header.html',
                '../header.html',
                '../../header.html'
            ];

            const result = await fetchFirstOk(candidates);
            if (!result) {
                console.error('No se pudo cargar el header (header.html).');
                return;
            }

            container.innerHTML = result.text;
            reExecuteInlineScripts(container);
        })().catch((err) => console.error('Error cargando el header:', err));

        window[HEADER_PROMISE_KEY] = p;
        window[LEGACY_HEADER_PROMISE_KEY] = p;
        return p;
    }

    loadHeaderOnce();

    // =========================
    // Google Maps callback
    // =========================
    function initMap() {
        // Placeholder: la integración real se activa al configurar API Key y el mapa
        // console.log('Google Maps API cargada');
    }
    window.initMap = initMap;

    // =========================
    // App principal
    // =========================
    function initOrderApp(currentUser) {
        const ASSIST_LEVELS = {
            solo: { label: 'Solo Transporte', extra: 0 },
            ayuda: { label: 'Transporte con Ayuda', extra: 5 },
            completo: { label: 'Transporte Completo', extra: 12 }
        };

        const TOTAL_STEPS = 8;

        const orderState = {
            currentStep: 1,
            serviceType: null,
            distance: 0,
            heavyItems: 0,
            lightItems: 0,
            assistLevel: 'solo',
            products: [],
            addresses: [],
            addressDetails: {},
            serviceUrgency: 'scheduled', // 'immediate' | 'scheduled'
            serviceDate: '',
            serviceTime: '',
            paymentMethod: null,
            totalPrice: 0
        };

        // =========================
        // Alertas centradas
        // =========================
        const appAlertOverlay = document.getElementById('app-alert-overlay');
        const appAlertBox = document.getElementById('app-alert');
        const appAlertIcon = document.getElementById('app-alert-icon');
        const appAlertTitle = document.getElementById('app-alert-title');
        const appAlertMessage = document.getElementById('app-alert-message');
        const appAlertOk = document.getElementById('app-alert-ok');
        let lastFocusedEl = null;

        function showAppAlert(message, kind = 'warning', title = 'Aviso') {
            if (!appAlertOverlay || !appAlertBox) return;
            lastFocusedEl = document.activeElement;

            appAlertBox.classList.remove('warning', 'info', 'success');
            appAlertBox.classList.add(kind);

            const iconMap = { warning: '⚠️', info: 'ℹ️', success: '✅' };
            if (appAlertIcon) appAlertIcon.textContent = iconMap[kind] || '⚠️';

            if (appAlertTitle) appAlertTitle.textContent = title || 'Aviso';
            if (appAlertMessage) appAlertMessage.textContent = String(message || '');

            appAlertOverlay.classList.add('active');
            appAlertOverlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('no-scroll');

            if (appAlertOk) appAlertOk.focus();
            else appAlertBox.focus();
        }

        function hideAppAlert() {
            if (!appAlertOverlay) return;
            appAlertOverlay.classList.remove('active');
            appAlertOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('no-scroll');

            if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
                try { lastFocusedEl.focus(); } catch (_) { /* noop */ }
            }
            lastFocusedEl = null;
        }

        if (appAlertOk) appAlertOk.addEventListener('click', hideAppAlert);
        if (appAlertOverlay) {
            appAlertOverlay.addEventListener('click', (e) => {
                if (e.target === appAlertOverlay) hideAppAlert();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (!appAlertOverlay || !appAlertOverlay.classList.contains('active')) return;
            if (e.key === 'Escape' || e.key === 'Enter') {
                e.preventDefault();
                hideAppAlert();
            }
        });

        // =========================
        // Referencias DOM
        // =========================
        const stepElements = {
            1: document.getElementById('step1'),
            2: document.getElementById('step2'),
            3: document.getElementById('step3'),
            4: document.getElementById('step4'),
            5: document.getElementById('step5'),
            6: document.getElementById('step6'),
            7: document.getElementById('step7'),
            8: document.getElementById('step8'),
            confirmation: document.getElementById('step-confirmation')
        };

        const progressBar = document.getElementById('order-progress-bar');

        // Paso 3
        const serviceOptions = document.querySelectorAll('.service-option');

        // Paso 4
        const miniMudanzaInfo = document.getElementById('mini-mudanza-info');
        const productsList = document.getElementById('products-list');
        const productNameInput = document.getElementById('product-name');
        const productDescInput = document.getElementById('product-description');
        const addProductBtn = document.getElementById('add-product');
        const productNameDatalist = document.getElementById('product-name-suggestions');
        const productLimits = document.getElementById('product-limits');
        const addProductForm = document.getElementById('add-product-form');

        const heavyCountElement = document.getElementById('heavy-count');
        const lightCountElement = document.getElementById('light-count');
        const lightCounter = document.getElementById('light-counter');
        const classificationPreviewEl = document.getElementById('ai-preview');
        const productsMessage = document.getElementById('products-message');

        // Paso 5
        const assistSelectedText = document.getElementById('assist-selected-text');
        const assistRadios = Array.from(document.querySelectorAll('input[name="assistLevel"]'));

        // Paso 1
        const addressContainer = document.getElementById('address-container');
        const addAddressBtn = document.getElementById('add-address-btn');
        const MAX_ADDRESSES = 4;
        let addressIdCounter = 2;

        // Paso 2
        const addressDetailsContent = document.getElementById('address-details-content');

        // Paso 6
        const urgencyImmediate = document.getElementById('urgency-immediate');
        const urgencyScheduled = document.getElementById('urgency-scheduled');
        const datetimeFields = document.getElementById('datetime-fields');
        const serviceDateInput = document.getElementById('service-date');
        const serviceTimeSelect = document.getElementById('service-time');

        if (!addressContainer || !productNameInput || !productDescInput || !addProductBtn) {
            console.error('Pedidos.js: faltan elementos del DOM necesarios en la página.');
            return;
        }

        // =========================
        // Utilidades
        // =========================
        function escapeHtml(str) {
            return String(str || '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');
        }

        function getHeaderHeight() {
            const header = document.querySelector('.site-header');
            if (header) {
                const h = header.getBoundingClientRect().height;
                if (h && !Number.isNaN(h)) return h;
            }
            const v = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim();
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
        }

        function scrollToStepTop(activeStepEl) {
            if (!activeStepEl) return;
            const target = activeStepEl.querySelector('.step-card') || activeStepEl;
            const headerH = getHeaderHeight();
            const y = target.getBoundingClientRect().top + window.scrollY - headerH - 14;

            const docEl = document.documentElement;
            const prev = docEl.style.scrollBehavior;
            docEl.style.scrollBehavior = 'auto';
            window.scrollTo(0, Math.max(0, y));
            docEl.style.scrollBehavior = prev || '';
        }

        function focusStep(activeStepEl) {
            const card = activeStepEl?.querySelector('.step-card');
            if (!card) return;
            card.setAttribute('tabindex', '-1');
            try { card.focus({ preventScroll: true }); } catch (_) { /* noop */ }
        }

        function hashStringFNV1a(str) {
            let h = 2166136261;
            for (let i = 0; i < str.length; i++) {
                h ^= str.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        }

        function pseudoKmBetween(addrA, addrB) {
            const a = String(addrA || '').trim().toLowerCase();
            const b = String(addrB || '').trim().toLowerCase();
            const key = `${a}__${b}`;
            const h = hashStringFNV1a(key);
            const MIN = 3, MAX = 35;
            return MIN + (h % (MAX - MIN + 1));
        }

        // =========================
        // Clasificador local de objetos (heurístico)
        // =========================
        const ItemClassifier = (() => {
            const EPS = 1e-12;

            function normalize(s) {
                return (s || '')
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9\s./x×*"'-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            function stem(w) {
                let t = (w || '').trim();
                if (t.length <= 3) return t;
                if (t.endsWith('es') && t.length >= 5) return t.slice(0, -2);
                if (t.endsWith('s') && t.length >= 4) return t.slice(0, -1);
                return t;
            }

            const stop = new Set([
                'de', 'la', 'el', 'y', 'o', 'un', 'una', 'unos', 'unas', 'para', 'con', 'sin',
                'en', 'por', 'al', 'del', 'los', 'las', 'mi', 'tu', 'su', 'es', 'muy', 'mas',
                'aprox', 'aproximado', 'aproximada', 'aproximadamente', 'kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos',
                'cm', 'cms', 'mm', 'm', 'metros', 'metro', 'pulgadas', 'in', 'inch', 'inches',
                'x', '×', '*', 'the', 'a', 'an', 'and', 'or', 'with', 'without', 'by'
            ]);

            function tokenize(s) {
                const t = normalize(s);
                if (!t) return [];
                return t.split(' ').map(stem).filter(w => w.length >= 2 && !stop.has(w));
            }

            function levenshtein(a, b) {
                a = a || ''; b = b || '';
                if (a === b) return 0;
                const al = a.length, bl = b.length;
                if (al === 0) return bl;
                if (bl === 0) return al;

                const v0 = new Array(bl + 1);
                const v1 = new Array(bl + 1);
                for (let i = 0; i <= bl; i++) v0[i] = i;

                for (let i = 0; i < al; i++) {
                    v1[0] = i + 1;
                    for (let j = 0; j < bl; j++) {
                        const cost = a[i] === b[j] ? 0 : 1;
                        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
                    }
                    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
                }
                return v0[bl];
            }

            function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
            function sigmoid(x) { if (x >= 20) return 1; if (x <= -20) return 0; return 1 / (1 + Math.exp(-x)); }
            function logit(p) { const pp = clamp(p, 1e-6, 1 - 1e-6); return Math.log(pp / (1 - pp)); }

            function extractWeightKg(raw) {
                const s = (raw || '').toLowerCase();
                if (/\b(no pesa|sin peso|no pesa nada|no pesa casi|no pesa mucho|ligerisimo|ligerisima|muy ligero|muy liviano|livianito|livianita|ultralight|super light)\b/i.test(s)) return 0;

                const gMatch = s.match(/(\d{1,5}(?:[.,]\d{1,2})?)\s*(g|gr|gramos?)/i);
                if (gMatch) return parseFloat(gMatch[1].replace(',', '.')) / 1000;

                const kgMatch = s.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(kg|kgs|kilos?|kilogramos?)/i);
                if (kgMatch) return parseFloat(kgMatch[1].replace(',', '.'));

                const pesaMatch = s.match(/\b(pesa|peso)\s*(\d{1,4}(?:[.,]\d{1,2})?)/i);
                if (pesaMatch) return parseFloat(pesaMatch[2].replace(',', '.'));

                const lbMatch = s.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(lb|lbs|libras?)/i);
                if (lbMatch) return parseFloat(lbMatch[1].replace(',', '.')) * 0.453592;

                return null;
            }

            function hasUpperBoundPhrase(raw) {
                const s = (raw || '').toLowerCase();
                return /\b(menos de|menos del|<|under|below|at most|maximo|max|hasta)\b/.test(s);
            }

            function extractDimsCm(raw) {
                let s = normalize(raw || '');
                if (!s) return null;
                s = s.replace(/\bby\b/g, ' x ');

                const perUnit = s.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(mm|cm|m|in|")\s*[x×*]\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(mm|cm|m|in|")(?:\s*[x×*]\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(mm|cm|m|in|"))?/);
                if (perUnit) {
                    const a = parseFloat(perUnit[1].replace(',', '.'));
                    const ua = perUnit[2];
                    const b = parseFloat(perUnit[3].replace(',', '.'));
                    const ub = perUnit[4];
                    const c = perUnit[5] ? parseFloat(perUnit[5].replace(',', '.')) : null;
                    const uc = perUnit[6] || null;

                    const conv = (unit) => unit === 'mm' ? 0.1 : unit === 'm' ? 100 : (unit === 'in' || unit === '"') ? 2.54 : 1;
                    const dims = [a * conv(ua), b * conv(ub)];
                    if (typeof c === 'number' && !Number.isNaN(c) && uc) dims.push(c * conv(uc));
                    return dims.filter(n => Number.isFinite(n) && n > 0);
                }

                const tailUnit = s.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*[x×*]\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:[x×*]\s*(\d{1,4}(?:[.,]\d{1,2})?))?\s*(cm|mm|m|in|")\b/);
                if (tailUnit) {
                    const a = parseFloat(tailUnit[1].replace(',', '.'));
                    const b = parseFloat(tailUnit[2].replace(',', '.'));
                    const c = tailUnit[3] ? parseFloat(tailUnit[3].replace(',', '.')) : null;
                    const unit = tailUnit[4];
                    const conv = unit === 'mm' ? 0.1 : unit === 'm' ? 100 : (unit === 'in' || unit === '"') ? 2.54 : 1;

                    const dims = [a * conv, b * conv];
                    if (typeof c === 'number' && !Number.isNaN(c)) dims.push(c * conv);
                    return dims.filter(n => Number.isFinite(n) && n > 0);
                }

                const plain = s.match(/(\d{2,4}(?:[.,]\d{1,2})?)\s*[x×*]\s*(\d{2,4}(?:[.,]\d{1,2})?)(?:\s*[x×*]\s*(\d{2,4}(?:[.,]\d{1,2})?))?/);
                if (plain) {
                    const a = parseFloat(plain[1].replace(',', '.'));
                    const b = parseFloat(plain[2].replace(',', '.'));
                    const c = plain[3] ? parseFloat(plain[3].replace(',', '.')) : null;
                    const nearM = /\b(m|metro|metros)\b/.test(s);
                    const conv = nearM ? 100 : 1;

                    const dims = [a * conv, b * conv];
                    if (typeof c === 'number' && !Number.isNaN(c)) dims.push(c * conv);
                    return dims.filter(n => Number.isFinite(n) && n > 0);
                }

                return null;
            }

            function dimsFeatures(dimsCm) {
                if (!dimsCm || !dimsCm.length) return null;
                const sorted = [...dimsCm].sort((a, b) => b - a);
                const maxDim = sorted[0];
                const vol = dimsCm.length >= 3 ? (dimsCm[0] * dimsCm[1] * dimsCm[2]) : (dimsCm[0] * dimsCm[1] * 6);
                return { maxDim, approxVolumeCm3: vol };
            }

            const KB_ITEMS = [
                { id: 'sofa', label: 'Sofá / Sillón', heavy: true, aliases: ['sofa', 'sofá', 'sillon', 'sillón', 'couch', 'sectional', 'chaise longue', 'love seat', 'loveseat', '3 plazas', 'dos plazas', 'tres plazas'] },
                { id: 'armario', label: 'Armario / Ropero', heavy: true, aliases: ['armario', 'ropero', 'closet', 'wardrobe', 'roperito', 'guardarropa'] },
                { id: 'fridge', label: 'Frigorífico / Nevera', heavy: true, aliases: ['frigorifico', 'frigorífico', 'nevera', 'refrigerador', 'refri', 'heladera', 'fridge', 'refrigerator', 'freezer', 'congelador', 'congeladora'] },
                { id: 'washer', label: 'Lavadora', heavy: true, aliases: ['lavadora', 'lavador', 'washer', 'washing machine'] },
                { id: 'dryer', label: 'Secadora', heavy: true, aliases: ['secadora', 'dryer', 'clothes dryer'] },
                { id: 'dishwasher', label: 'Lavavajillas', heavy: true, aliases: ['lavavajillas', 'lavaplatos', 'dishwasher', 'dish washer'] },
                { id: 'oven', label: 'Horno', heavy: true, aliases: ['horno', 'oven', 'horno electrico', 'horno eléctrico'] },
                { id: 'bed', label: 'Cama / Somier', heavy: true, aliases: ['cama', 'somier', 'base', 'bed', 'king bed', 'queen bed', 'litera', 'cama nido', 'canape', 'canapé', 'cabecero'] },
                { id: 'mattress', label: 'Colchón', heavy: true, aliases: ['colchon', 'colchón', 'mattress', 'colchoneta'] },
                { id: 'table_big', label: 'Mesa grande', heavy: true, aliases: ['mesa comedor', 'mesa grande', 'dining table', 'mesa madera maciza', 'mesa de salon', 'mesa de salón', 'mesa pesada'] },
                { id: 'dresser', label: 'Cómoda / Aparador', heavy: true, aliases: ['comoda', 'cómoda', 'aparador', 'vitrina', 'mueble', 'sideboard', 'dresser', 'buffet'] },
                { id: 'piano', label: 'Piano', heavy: true, aliases: ['piano', 'upright piano', 'grand piano'] },

                { id: 'box', label: 'Cajas', heavy: false, aliases: ['caja', 'cajas', 'paquete', 'package', 'box', 'moving box'] },
                { id: 'bags', label: 'Bolsas', heavy: false, aliases: ['bolsa', 'bolsas', 'bag', 'bags', 'bulto', 'bultos'] },
                { id: 'suitcase', label: 'Maleta', heavy: false, aliases: ['maleta', 'valija', 'suitcase', 'luggage'] },
                { id: 'chair', label: 'Silla', heavy: false, aliases: ['silla', 'sillas', 'chair', 'folding chair', 'silla plegable', 'silla oficina'] },
                { id: 'tv', label: 'Televisor', heavy: false, aliases: ['tele', 'television', 'televisor', 'tv', 'smart tv', 'pantalla'] },
                { id: 'microwave', label: 'Microondas', heavy: false, aliases: ['microondas', 'microwave'] },
                { id: 'monitor', label: 'Monitor', heavy: false, aliases: ['monitor', 'pantalla pc', 'screen', 'computer monitor'] },
                { id: 'printer', label: 'Impresora', heavy: false, aliases: ['impresora', 'printer'] },
                { id: 'lamp', label: 'Lámpara', heavy: false, aliases: ['lampara', 'lámpara', 'lamp', 'floor lamp', 'lampara pie', 'lámpara de pie'] },
            ];

            const CUES_LIGHT = ['pequeno', 'pequena', 'chico', 'mini', 'ligero', 'liviano', 'no pesa', 'light', 'small', 'tiny'];
            const CUES_HEAVY = ['pesado', 'voluminoso', 'grande', 'enorme', 'big', 'heavy', 'bulky'];
            function textHasCue(norm, cues) { return cues.some(c => norm.includes(c)); }

            const aliasRecords = [];
            const knownWordSet = new Set();

            for (const item of KB_ITEMS) {
                for (const a of item.aliases) {
                    const an = normalize(a);
                    if (!an) continue;
                    const toks = tokenize(an);
                    aliasRecords.push({
                        itemId: item.id,
                        itemLabel: item.label,
                        heavy: !!item.heavy,
                        alias: a,
                        aliasNorm: an,
                        aliasTokens: toks
                    });
                    toks.forEach(t => knownWordSet.add(t));
                }
                tokenize(item.label).forEach(t => knownWordSet.add(t));
            }

            const examples = [
                { text: 'sofa 3 plazas 60kg', y: 1 }, { text: 'lavadora 55kg', y: 1 }, { text: 'frigorifico nevera 65kg', y: 1 },
                { text: 'armario 2 puertas grande', y: 1 }, { text: 'cama matrimonio somier', y: 1 }, { text: 'colchon 150x190', y: 1 },
                { text: 'mesa comedor grande madera maciza', y: 1 }, { text: 'piano', y: 1 },

                { text: 'caja de ropa', y: 0 }, { text: 'bolsas', y: 0 }, { text: 'maleta', y: 0 }, { text: 'silla plegable', y: 0 },
                { text: 'lampara', y: 0 }, { text: 'televisor 42 pulgadas', y: 0 }, { text: 'microondas', y: 0 },
                { text: 'monitor ordenador', y: 0 }, { text: 'impresora', y: 0 }
            ];

            const vocab = new Map();
            const counts = { heavy: new Map(), light: new Map(), heavyTotal: 0, lightTotal: 0, heavyDocs: 0, lightDocs: 0 };
            function inc(map, key, by = 1) { map.set(key, (map.get(key) || 0) + by); }

            for (const ex of examples) {
                const toks = tokenize(ex.text);
                if (ex.y === 1) {
                    counts.heavyDocs++;
                    for (const tok of toks) { inc(counts.heavy, tok, 1); counts.heavyTotal++; vocab.set(tok, true); knownWordSet.add(tok); }
                } else {
                    counts.lightDocs++;
                    for (const tok of toks) { inc(counts.light, tok, 1); counts.lightTotal++; vocab.set(tok, true); knownWordSet.add(tok); }
                }
            }

            const V = Math.max(1, vocab.size);
            const priorHeavy = counts.heavyDocs / Math.max(1, (counts.heavyDocs + counts.lightDocs));
            const priorLight = 1 - priorHeavy;

            function nbProbHeavy(rawText) {
                const toks = tokenize(rawText);
                let logH = Math.log(Math.max(EPS, priorHeavy));
                let logL = Math.log(Math.max(EPS, priorLight));
                for (const t of toks) {
                    const cH = (counts.heavy.get(t) || 0);
                    const cL = (counts.light.get(t) || 0);
                    const pTH = (cH + 1) / (counts.heavyTotal + V);
                    const pTL = (cL + 1) / (counts.lightTotal + V);
                    logH += Math.log(pTH);
                    logL += Math.log(pTL);
                }
                return sigmoid(logH - logL);
            }

            function tokenMatchScore(textTokens, aliasTokens) {
                if (!aliasTokens.length) return 0;
                let matched = 0;
                for (const at of aliasTokens) {
                    let best = Infinity;
                    for (const tt of textTokens) {
                        const d = levenshtein(at, tt);
                        if (d < best) best = d;
                        if (best === 0) break;
                    }
                    const tol = at.length >= 7 ? 2 : 1;
                    if (best <= tol) matched++;
                }
                return matched / aliasTokens.length;
            }

            function matchObject(rawText) {
                const norm = normalize(rawText);
                if (!norm) return null;

                const textTokens = tokenize(norm);
                if (!textTokens.length) return null;

                let best = null;
                const scored = [];

                for (const rec of aliasRecords) {
                    let score = 0;
                    if (rec.aliasNorm.length >= 3 && norm.includes(rec.aliasNorm)) {
                        score = 0.90 + Math.min(0.10, rec.aliasNorm.length / 80);
                    } else {
                        const tm = tokenMatchScore(textTokens, rec.aliasTokens);
                        score = tm;
                        if (rec.aliasTokens.length >= 2 && tm >= 0.9) score += 0.08;
                    }
                    if (score > 0) scored.push({ rec, score });
                    if (!best || score > best.score) best = { rec, score };
                }

                scored.sort((a, b) => b.score - a.score);
                const top = scored.slice(0, 6).filter(x => x.score >= 0.55);
                if (!best || best.score < 0.55) return null;

                return {
                    itemId: best.rec.itemId,
                    label: best.rec.itemLabel,
                    heavy: best.rec.heavy,
                    score: Math.round(best.score * 100) / 100,
                    matchedAlias: best.rec.alias,
                    suggestions: top.map(x => ({ label: x.rec.itemLabel, alias: x.rec.alias, score: Math.round(x.score * 100) / 100 }))
                };
            }

            function typoSuggestionsFromName(name) {
                const toks = tokenize(name);
                const suggestions = [];
                for (const t of toks) {
                    if (t.length < 4) continue;
                    if (knownWordSet.has(t)) continue;

                    let best = { w: null, d: Infinity };
                    for (const w of knownWordSet) {
                        if (Math.abs(w.length - t.length) > 2) continue;
                        const d = levenshtein(t, w);
                        if (d < best.d) best = { w, d };
                        if (best.d === 1) break;
                    }
                    if (best.w && best.d === 1) suggestions.push({ from: t, to: best.w });
                }

                const uniq = [];
                const seen = new Set();
                for (const s of suggestions) {
                    const key = s.from + '->' + s.to;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    uniq.push(s);
                }
                return uniq.slice(0, 3);
            }

            function suggestNames(prefixRaw, descRaw) {
                const text = normalize(`${prefixRaw || ''} ${descRaw || ''}`);
                if (!text) return [];

                const obj = matchObject(text);
                if (obj?.suggestions?.length) {
                    const labels = obj.suggestions.map(s => s.label);
                    return [...new Set(labels)].slice(0, 8);
                }

                const toks = tokenize(text);
                if (!toks.length) return [];

                const scores = [];
                for (const item of KB_ITEMS) {
                    const aliasToksAll = new Set();
                    for (const a of item.aliases) tokenize(a).forEach(x => aliasToksAll.add(x));
                    const atoks = [...aliasToksAll];
                    const s = tokenMatchScore(toks, atoks.slice(0, Math.min(6, atoks.length)));
                    if (s > 0.3) scores.push({ label: item.label, s });
                }
                scores.sort((a, b) => b.s - a.s);
                return scores.slice(0, 8).map(x => x.label);
            }

            function predict(name, desc) {
                const raw = `${name || ''} ${desc || ''}`.trim();
                const norm = normalize(raw);

                const obj = matchObject(raw);
                const typos = typoSuggestionsFromName(name || '');
                const w = extractWeightKg(raw);
                const upperBound = (typeof w === 'number' && !Number.isNaN(w)) ? hasUpperBoundPhrase(raw) : false;

                const dims = extractDimsCm(raw);
                const dimF = dimsFeatures(dims);

                const nb = nbProbHeavy(raw);
                let L = logit(nb);

                const flags = [];
                if (typeof w === 'number' && !Number.isNaN(w)) {
                    if (w === 0) { L -= 4.0; flags.push('no_pesa'); }
                    else {
                        const wEff = upperBound ? Math.max(0, w - 4) : w;
                        if (upperBound) flags.push('peso_menos_de');
                        if (wEff >= 45) L += 4.0;
                        else if (wEff <= 25) { L -= 3.0; flags.push('peso_bajo'); }
                        else L += (wEff >= 35 ? 1.1 : -0.6);
                    }
                }

                if (dimF) {
                    if (dimF.maxDim >= 160) L += 2.2;
                    else if (dimF.maxDim >= 120) L += 1.4;
                    else if (dimF.maxDim <= 60) L -= 1.0;

                    if (dimF.approxVolumeCm3 >= 650000) L += 1.2;
                    else if (dimF.approxVolumeCm3 <= 180000) L -= 0.7;
                }

                if (norm) {
                    if (textHasCue(norm, CUES_HEAVY)) L += 1.1;
                    if (textHasCue(norm, CUES_LIGHT)) L -= 1.2;
                }

                if (obj) {
                    const strength = obj.score >= 0.75 ? 2.5 : 1.4;
                    L += obj.heavy ? strength : -strength;

                    if (typeof w === 'number' && w > 0) {
                        if (obj.heavy && w <= 25) flags.push('inconsistente_obj_peso_bajo');
                        if (!obj.heavy && w >= 45) flags.push('inconsistente_obj_peso_alto');
                    }
                }

                const prob = sigmoid(L);
                const isHeavy = prob >= 0.55;

                const reasonParts = [];
                if (obj) reasonParts.push(`obj:${obj.label}(${obj.score})`);
                if (typeof w === 'number' && !Number.isNaN(w)) reasonParts.push(`${upperBound ? '≤' : ''}kg:${Math.round(w * 10) / 10}`);
                if (dimF) reasonParts.push(`dimMax:${Math.round(dimF.maxDim)}cm`);
                if (flags.length) reasonParts.push(`flags:${flags.join(',')}`);

                return {
                    isHeavy,
                    probHeavy: prob,
                    weightKg: (typeof w === 'number' && !Number.isNaN(w)) ? (Math.round(w * 10) / 10) : null,
                    weightUpperBound: !!upperBound,
                    dimsCm: dims && dims.length ? dims.map(x => Math.round(x * 10) / 10) : null,
                    object: obj,
                    typos,
                    flags,
                    reason: reasonParts.join(' | ') || 'signals'
                };
            }

            return { predict, suggestNames };
        })();

        // =========================
        // Direcciones
        // =========================
        function ensureAddressDetails(id) {
            if (!orderState.addressDetails[id]) {
                orderState.addressDetails[id] = {
                    accessType: '', // 'chalet' | 'piso' | 'tienda'
                    chaletNumber: '',
                    floor: '',
                    door: '',
                    storeName: ''
                };
            }
        }

        function recalcAddressRoles() {
            orderState.addresses.forEach((addr, index) => {
                if (index === 0) { addr.type = 'pickup'; addr.label = 'Recogida'; }
                else if (index === orderState.addresses.length - 1) { addr.type = 'delivery'; addr.label = 'Entrega'; }
                else { addr.type = 'intermediate'; addr.label = `Parada ${index}`; }
            });
        }

        function initializeAddresses() {
            addressIdCounter = 2;
            orderState.addresses = [
                { id: 1, address: '', type: 'pickup', label: 'Recogida' },
                { id: 2, address: '', type: 'delivery', label: 'Entrega' }
            ];
            orderState.addresses.forEach(a => ensureAddressDetails(a.id));
            renderAddresses();
            updateAddAddressButton();
        }

        function renderAddresses() {
            addressContainer.innerHTML = '';

            orderState.addresses.forEach((addr, index) => {
                const addressItem = document.createElement('div');
                addressItem.className = 'address-item';
                addressItem.setAttribute('data-id', String(addr.id));

                const typeClass = addr.type === 'pickup' ? 'pickup' : addr.type === 'delivery' ? 'delivery' : 'intermediate';
                const typeLabel = addr.type === 'pickup' ? 'Punto de recogida' : addr.type === 'delivery' ? 'Punto de entrega' : 'Parada intermedia';

                const canMoveUp = index > 1;
                const canMoveDown = index > 0 && index < orderState.addresses.length - 1;
                const canRemove = index > 0 && index < orderState.addresses.length - 1;

                addressItem.innerHTML = `
          <div class="address-item-header">
            <div class="address-number">
              <div class="address-number-badge">${index + 1}</div>
              <span>${addr.label}</span>
            </div>
            <div class="address-actions">
              ${canMoveUp ? '<button type="button" class="btn-move move-up" title="Mover arriba">↑</button>' : '<button type="button" class="btn-move" disabled>↑</button>'}
              ${canMoveDown ? '<button type="button" class="btn-move move-down" title="Mover abajo">↓</button>' : '<button type="button" class="btn-move" disabled>↓</button>'}
              ${canRemove ? '<button type="button" class="btn-remove remove-address" title="Eliminar">✕</button>' : ''}
            </div>
          </div>
          <div class="address-type ${typeClass}">${typeLabel}</div>
          <input type="text" class="form-control address-input"
            placeholder="Dirección (ej: Calle Gran Vía 1, Madrid)"
            value="${escapeHtml(addr.address)}"
            data-id="${addr.id}">
        `;
                addressContainer.appendChild(addressItem);
            });

            document.querySelectorAll('.address-input').forEach(input => {
                input.addEventListener('input', function () {
                    const id = parseInt(this.getAttribute('data-id') || '0', 10);
                    updateAddress(id, this.value.trim());
                });
            });

            document.querySelectorAll('.move-up').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.closest('.address-item')?.getAttribute('data-id') || '0', 10);
                    moveAddressUp(id);
                });
            });

            document.querySelectorAll('.move-down').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.closest('.address-item')?.getAttribute('data-id') || '0', 10);
                    moveAddressDown(id);
                });
            });

            document.querySelectorAll('.remove-address').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = parseInt(this.closest('.address-item')?.getAttribute('data-id') || '0', 10);
                    removeAddress(id);
                });
            });
        }

        function updateAddress(id, value) {
            const address = orderState.addresses.find(addr => addr.id === id);
            if (address) {
                address.address = value;
                ensureAddressDetails(id);
                calculateRouteDistance();
            }
        }

        function moveAddressUp(id) {
            const index = orderState.addresses.findIndex(addr => addr.id === id);
            if (index > 1) {
                [orderState.addresses[index], orderState.addresses[index - 1]] =
                    [orderState.addresses[index - 1], orderState.addresses[index]];
                recalcAddressRoles();
                renderAddresses();
                calculateRouteDistance();
            }
        }

        function moveAddressDown(id) {
            const index = orderState.addresses.findIndex(addr => addr.id === id);
            if (index > 0 && index < orderState.addresses.length - 1) {
                [orderState.addresses[index], orderState.addresses[index + 1]] =
                    [orderState.addresses[index + 1], orderState.addresses[index]];
                recalcAddressRoles();
                renderAddresses();
                calculateRouteDistance();
            }
        }

        function removeAddress(id) {
            if (orderState.addresses.length <= 2) {
                showAppAlert('Debe haber al menos una dirección de recogida y una de entrega', 'warning');
                return;
            }

            orderState.addresses = orderState.addresses.filter(addr => addr.id !== id);
            delete orderState.addressDetails[id];

            recalcAddressRoles();
            renderAddresses();
            updateAddAddressButton();
            calculateRouteDistance();
        }

        function addNewAddress() {
            if (orderState.addresses.length >= MAX_ADDRESSES) {
                showAppAlert(`Máximo ${MAX_ADDRESSES} direcciones permitidas`, 'warning');
                return;
            }

            const newId = ++addressIdCounter;

            orderState.addresses.push({ id: newId, address: '', type: 'delivery', label: 'Entrega' });
            ensureAddressDetails(newId);

            recalcAddressRoles();
            renderAddresses();
            updateAddAddressButton();
        }

        function updateAddAddressButton() {
            if (!addAddressBtn) return;
            addAddressBtn.disabled = orderState.addresses.length >= MAX_ADDRESSES;
            addAddressBtn.textContent = orderState.addresses.length >= MAX_ADDRESSES
                ? `Máximo ${MAX_ADDRESSES} direcciones alcanzado`
                : `+ Agregar otra dirección (${orderState.addresses.length}/${MAX_ADDRESSES})`;
        }

        function calculateRouteDistance() {
            let totalDistance = 0;
            for (let i = 0; i < orderState.addresses.length - 1; i++) {
                const addr1 = orderState.addresses[i].address;
                const addr2 = orderState.addresses[i + 1].address;
                if (addr1 && addr2) totalDistance += pseudoKmBetween(addr1, addr2);
            }
            orderState.distance = Math.round(totalDistance);
            calculatePrice();
        }

        // =========================
        // Detalles de acceso (Paso 2)
        // =========================
        function accessTypeLabel(t) {
            if (t === 'piso') return 'Piso';
            if (t === 'chalet') return 'Chalet';
            if (t === 'tienda') return 'Tienda';
            return '';
        }

        function toggleAccessFields(addrId, accessType) {
            const container = document.getElementById(`access-fields-${addrId}`);
            if (!container) return;

            container.querySelectorAll('[data-access]').forEach(el => {
                el.style.display = (el.getAttribute('data-access') === accessType) ? 'block' : 'none';
            });
        }

        function renderAddressDetails() {
            if (!addressDetailsContent) return;
            addressDetailsContent.innerHTML = '';

            orderState.addresses.forEach((addr, index) => {
                ensureAddressDetails(addr.id);
                const details = orderState.addressDetails[addr.id];

                const detailsSection = document.createElement('div');
                detailsSection.className = 'address-details-section';
                detailsSection.style.marginBottom = '20px';
                detailsSection.style.padding = '15px';
                detailsSection.style.border = '1px solid var(--ring)';
                detailsSection.style.borderRadius = '12px';
                detailsSection.style.backgroundColor = 'var(--surface)';

                detailsSection.innerHTML = `
          <h4 style="margin-bottom: 12px; font-size: 16px; color: var(--brand-blue);">
            ${index + 1}. ${addr.label}: ${escapeHtml(addr.address || 'Sin dirección')}
          </h4>

          <div class="address-details-grid">
            <div class="form-group">
              <label class="form-label" for="accessType-${addr.id}">¿Es chalet, piso o tienda?</label>
              <select class="form-select" id="accessType-${addr.id}"
                data-id="${addr.id}" data-field="accessType">
                <option value="">Selecciona una opción</option>
                <option value="chalet" ${details.accessType === 'chalet' ? 'selected' : ''}>Chalet / Casa</option>
                <option value="piso" ${details.accessType === 'piso' ? 'selected' : ''}>Piso / Apartamento</option>
                <option value="tienda" ${details.accessType === 'tienda' ? 'selected' : ''}>Tienda / Local</option>
              </select>
            </div>
          </div>

          <div id="access-fields-${addr.id}" style="margin-top: 12px;">
            <div data-access="chalet" style="display:none;">
              <div class="address-details-grid">
                <div class="form-group">
                  <label class="form-label" for="chaletNumber-${addr.id}">Número de chalet</label>
                  <input type="text" class="form-control" id="chaletNumber-${addr.id}"
                    placeholder="Ej: 12, Chalet 7, Casa 3"
                    value="${escapeHtml(details.chaletNumber)}"
                    data-id="${addr.id}" data-field="chaletNumber">
                </div>
              </div>
            </div>

            <div data-access="piso" style="display:none;">
              <div class="address-details-grid">
                <div class="form-group">
                  <label class="form-label" for="floor-${addr.id}">Número de piso</label>
                  <input type="text" class="form-control" id="floor-${addr.id}"
                    placeholder="Ej: 3, Bajo, Entreplanta"
                    value="${escapeHtml(details.floor)}"
                    data-id="${addr.id}" data-field="floor">
                </div>

                <div class="form-group">
                  <label class="form-label" for="door-${addr.id}">Puerta</label>
                  <input type="text" class="form-control" id="door-${addr.id}"
                    placeholder="Ej: 4B, Ático 1"
                    value="${escapeHtml(details.door)}"
                    data-id="${addr.id}" data-field="door">
                </div>
              </div>
            </div>

            <div data-access="tienda" style="display:none;">
              <div class="address-details-grid">
                <div class="form-group">
                  <label class="form-label" for="storeName-${addr.id}">Nombre de la tienda</label>
                  <input type="text" class="form-control" id="storeName-${addr.id}"
                    placeholder="Ej: Tienda Pepe / ZARA / Ferretería López"
                    value="${escapeHtml(details.storeName)}"
                    data-id="${addr.id}" data-field="storeName">
                </div>
              </div>
            </div>
          </div>
        `;

                addressDetailsContent.appendChild(detailsSection);
                toggleAccessFields(addr.id, details.accessType || '');
            });

            document.querySelectorAll('.address-details-section input, .address-details-section select').forEach(field => {
                field.addEventListener('change', updateAddressDetail);
                field.addEventListener('input', updateAddressDetail);
            });
        }

        function updateAddressDetail() {
            const id = parseInt(this.getAttribute('data-id') || '0', 10);
            const field = this.getAttribute('data-field');
            const value = (this.value ?? '').toString().trim();

            ensureAddressDetails(id);

            if (field === 'accessType') {
                orderState.addressDetails[id].accessType = value;

                if (value === 'chalet') {
                    orderState.addressDetails[id].floor = '';
                    orderState.addressDetails[id].door = '';
                    orderState.addressDetails[id].storeName = '';
                } else if (value === 'piso') {
                    orderState.addressDetails[id].chaletNumber = '';
                    orderState.addressDetails[id].storeName = '';
                } else if (value === 'tienda') {
                    orderState.addressDetails[id].chaletNumber = '';
                    orderState.addressDetails[id].floor = '';
                    orderState.addressDetails[id].door = '';
                } else {
                    orderState.addressDetails[id].chaletNumber = '';
                    orderState.addressDetails[id].floor = '';
                    orderState.addressDetails[id].door = '';
                    orderState.addressDetails[id].storeName = '';
                }

                toggleAccessFields(id, value);
                return;
            }

            orderState.addressDetails[id][field] = value;
        }

        function validateAccessDetails() {
            for (let i = 0; i < orderState.addresses.length; i++) {
                const addr = orderState.addresses[i];
                ensureAddressDetails(addr.id);
                const d = orderState.addressDetails[addr.id];

                if (!d.accessType) {
                    return { ok: false, msg: `Selecciona si la dirección #${i + 1} (${addr.label}) es chalet, piso o tienda.` };
                }

                if (d.accessType === 'chalet') {
                    if (!d.chaletNumber) return { ok: false, msg: `Completa el número de chalet en la dirección #${i + 1} (${addr.label}).` };
                } else if (d.accessType === 'piso') {
                    if (!d.floor || !d.door) return { ok: false, msg: `Completa piso y puerta en la dirección #${i + 1} (${addr.label}).` };
                } else if (d.accessType === 'tienda') {
                    if (!d.storeName) return { ok: false, msg: `Completa el nombre de la tienda en la dirección #${i + 1} (${addr.label}).` };
                }
            }
            return { ok: true };
        }

        // =========================
        // Urgencia (Paso 6)
        // =========================
        function setupUrgencyOptions() {
            if (!urgencyImmediate || !urgencyScheduled || !datetimeFields) return;

            urgencyImmediate.addEventListener('click', function () {
                urgencyImmediate.classList.add('selected');
                urgencyScheduled.classList.remove('selected');
                orderState.serviceUrgency = 'immediate';
                datetimeFields.style.display = 'none';

                const now = new Date();
                orderState.serviceDate = now.toISOString().split('T')[0];
                orderState.serviceTime = 'INMEDIATO';

                calculatePrice();
            });

            urgencyScheduled.addEventListener('click', function () {
                urgencyScheduled.classList.add('selected');
                urgencyImmediate.classList.remove('selected');
                orderState.serviceUrgency = 'scheduled';
                datetimeFields.style.display = 'grid';

                if (!orderState.serviceDate && serviceDateInput) {
                    const today = new Date();
                    serviceDateInput.value = today.toISOString().split('T')[0];
                    orderState.serviceDate = serviceDateInput.value;
                }

                calculatePrice();
            });

            if (serviceDateInput) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isoToday = today.toISOString().split('T')[0];
                serviceDateInput.min = isoToday;

                serviceDateInput.addEventListener('input', function () {
                    orderState.serviceDate = this.value;
                });
            }

            if (serviceTimeSelect) {
                serviceTimeSelect.addEventListener('change', function () {
                    orderState.serviceTime = this.value;
                });
            }
        }

        // =========================
        // Mensajes de productos
        // =========================
        function showProductsMessage(kind, html) {
            if (!productsMessage) return;
            productsMessage.classList.remove('alert-info', 'alert-warning', 'alert-success');
            if (kind) productsMessage.classList.add(kind);
            productsMessage.innerHTML = html || '';
            productsMessage.style.display = html ? 'block' : 'none';
        }

        function applyServiceRules() {
            if (!miniMudanzaInfo || !productsList || !addProductForm || !productLimits) return;

            if (orderState.serviceType === 'mini') {
                miniMudanzaInfo.style.display = 'block';
                if (lightCounter) lightCounter.style.display = 'none';

                const hadLight = orderState.products.some(p => !p.isHeavy);
                if (hadLight) {
                    orderState.products = orderState.products.filter(p => p.isHeavy);
                    orderState.heavyItems = orderState.products.length;
                    orderState.lightItems = 0;
                    renderProducts();
                    updateProductLimits();
                    calculatePrice();
                    showProductsMessage(
                        'alert-info',
                        `<strong>Minimudanza:</strong> hemos quitado los objetos pequeños (no es necesario añadirlos). Añade solo <strong>objetos pesados</strong> (máx. 3).`
                    );
                }
            } else {
                miniMudanzaInfo.style.display = 'none';
                if (lightCounter) lightCounter.style.display = 'block';
                showProductsMessage(null, '');
            }

            updateProductInputState();
            updateClassificationPreview();
        }

        function updateClassificationPreview() {
            if (!classificationPreviewEl) return;

            const name = productNameInput.value.trim();
            const desc = productDescInput.value.trim();

            if (productNameDatalist) {
                const suggestions = ItemClassifier.suggestNames(name, desc);
                productNameDatalist.innerHTML = suggestions.map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
            }

            if (!name && !desc) {
                classificationPreviewEl.style.display = 'none';
                classificationPreviewEl.innerHTML = '';
                updateProductInputState();
                return;
            }

            const pred = ItemClassifier.predict(name, desc);
            const pct = Math.round((pred.probHeavy || 0) * 100);
            const label = pred.isHeavy ? 'Pesado' : 'Pequeño';
            const cls = pred.isHeavy ? 'heavy' : 'light';

            const weightNote = (typeof pred.weightKg === 'number' && !Number.isNaN(pred.weightKg))
                ? (pred.weightKg === 0 ? ` · <strong>"no pesa"</strong> detectado` : ` · <strong>${pred.weightUpperBound ? '≤' : ''}${pred.weightKg}kg</strong> detectados`)
                : '';

            const dimsNote = (pred.dimsCm && pred.dimsCm.length >= 2) ? ` · <strong>medidas</strong> ${pred.dimsCm.join('×')}cm` : '';

            const objTag = pred.object?.label
                ? `<span class="tag neutral">Objeto: ${escapeHtml(pred.object.label)} · ${(pred.object.score * 100) | 0}%</span>`
                : '';

            const typoHint = (pred.typos && pred.typos.length)
                ? `<span class="hint">Sugerencia: ¿quisiste decir <strong>${escapeHtml(pred.typos[0].to)}</strong>? (detecté 1 letra distinta)</span>`
                : '';

            const inconsHint = (pred.flags || []).includes('inconsistente_obj_peso_bajo')
                ? `<span class="hint">⚠️ Nota: el objeto parece <strong>${escapeHtml(pred.object?.label || 'pesado')}</strong> pero el peso indicado es bajo. Si es correcto, perfecto; si no, ajusta el peso o la descripción.</span>`
                : '';

            const upperHint = (pred.flags || []).includes('peso_menos_de')
                ? `<span class="hint">ℹ️ Detecté "menos de / under / &lt;", así que interpreto el peso como un máximo (más ligero).</span>`
                : '';

            classificationPreviewEl.style.display = 'block';
            classificationPreviewEl.innerHTML = `
        <span class="tag ${cls}">Clasificación: ${label} · ${pct}%</span>
        ${objTag}
        ${weightNote ? `<span class="tag neutral">Señal: peso${weightNote}</span>` : ''}
        ${dimsNote ? `<span class="tag neutral">Señal: medidas${dimsNote}</span>` : ''}
        ${typoHint}
        ${upperHint}
        ${inconsHint}
        <span class="hint">Tip: si no coincide, añade un peso aproximado (ej: <strong>60kg</strong>, <strong>menos de 10kg</strong>) o medidas (ej: <strong>210x90x85cm</strong>, <strong>2m x 1.5m</strong>).</span>
      `;

            updateProductInputState(pred);
        }

        function updateProductInputState(predOverride) {
            const hasService = !!orderState.serviceType;
            if (!hasService) {
                productNameInput.disabled = true;
                productDescInput.disabled = true;
                addProductBtn.disabled = true;
                return;
            }

            const pred = predOverride || ItemClassifier.predict(productNameInput.value.trim(), productDescInput.value.trim());
            const isMini = orderState.serviceType === 'mini';

            productNameInput.disabled = false;
            productDescInput.disabled = false;

            if (isMini && orderState.heavyItems >= 3) {
                productNameInput.disabled = true;
                productDescInput.disabled = true;
                addProductBtn.disabled = true;
                showProductsMessage('alert-warning', `<strong>Máximo alcanzado:</strong> en minimudanza puedes añadir hasta <strong>3 objetos pesados</strong>.`);
                return;
            }

            if (!isMini && (orderState.serviceType === 'domicilio' || orderState.serviceType === 'punto')) {
                if (pred && pred.isHeavy && orderState.heavyItems >= 3) { addProductBtn.disabled = true; return; }
                if (pred && !pred.isHeavy && orderState.lightItems >= 3) { addProductBtn.disabled = true; return; }
            }

            if (isMini && pred && !pred.isHeavy) { addProductBtn.disabled = true; return; }

            const name = productNameInput.value.trim();
            addProductBtn.disabled = !name;
        }

        // =========================
        // Servicio (Paso 3)
        // =========================
        serviceOptions.forEach(option => {
            option.addEventListener('click', function () {
                serviceOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                orderState.serviceType = this.getAttribute('data-service');

                if (productLimits) productLimits.style.display = 'flex';
                if (productsList) productsList.style.display = 'block';
                if (addProductForm) addProductForm.style.display = 'flex';

                updateProductLimits();
                calculatePrice();
                applyServiceRules();
            });
        });

        // =========================
        // Modalidad (Paso 5)
        // =========================
        function updateAssistUI() {
            const cfg = ASSIST_LEVELS[orderState.assistLevel] || ASSIST_LEVELS.solo;
            if (assistSelectedText) {
                const extraTxt = cfg.extra > 0 ? ` (+${cfg.extra}€)` : '';
                assistSelectedText.textContent = `Seleccionado: ${cfg.label}${extraTxt}`;
            }
        }

        assistRadios.forEach(r => {
            r.addEventListener('change', function () {
                if (!this.checked) return;
                orderState.assistLevel = this.value;
                updateAssistUI();
                calculatePrice();
            });
        });

        // =========================
        // Productos (Paso 4)
        // =========================
        function updateProductLimits() {
            const heavyCount = orderState.heavyItems;
            const lightCount = orderState.lightItems;

            if (heavyCountElement) {
                heavyCountElement.textContent = `${heavyCount}/3`;
                heavyCountElement.className = heavyCount > 3 ? 'limit-value exceeded' : 'limit-value';
            }

            if (orderState.serviceType === 'mini') {
                if (lightCountElement) lightCountElement.textContent = `${lightCount}`;
            } else {
                if (lightCountElement) {
                    lightCountElement.textContent = `${lightCount}/3`;
                    lightCountElement.className = lightCount > 3 ? 'limit-value exceeded' : 'limit-value';
                }
            }
        }

        function getProductMeta(product) {
            return product.ai || {};
        }

        function renderProducts() {
            if (!productsList) return;
            productsList.innerHTML = '';

            if (orderState.products.length === 0) {
                productsList.innerHTML = '<p style="text-align:center; color:var(--muted); padding:20px;">Añade los objetos que necesitas transportar</p>';
                return;
            }

            orderState.products.forEach(product => {
                const meta = getProductMeta(product);
                const pct = Math.round(((meta?.probHeavy ?? (product.isHeavy ? 1 : 0)) * 100));
                const weightTxt = (typeof meta?.weightKg === 'number' && !Number.isNaN(meta.weightKg))
                    ? (meta.weightKg === 0 ? ` · "no pesa"` : ` · ${meta.weightUpperBound ? '≤' : ''}${meta.weightKg}kg`)
                    : '';

                const objTxt = meta?.object?.label ? ` · ${escapeHtml(meta.object.label)}` : '';
                const dimsTxt = (meta?.dimsCm && meta.dimsCm.length >= 2) ? ` · ${meta.dimsCm.join('×')}cm` : '';

                const productElement = document.createElement('div');
                productElement.className = 'product-item';
                productElement.innerHTML = `
          <div class="product-info">
            <div class="product-name">${escapeHtml(product.name)}</div>
            ${product.description ? `<div class="product-description">${escapeHtml(product.description)}</div>` : ''}
            ${meta?.object?.label ? `<div class="product-description"><strong>Detectado:</strong> ${escapeHtml(meta.object.label)}</div>` : ''}
          </div>
          <div class="product-weight ${product.isHeavy ? 'heavy' : 'light'}" title="Clasificación (${pct}%)${objTxt}${weightTxt}${dimsTxt}">
            ${product.isHeavy ? 'Pesado' : 'Pequeño'} · ${pct}%${weightTxt}
          </div>
          <div class="product-actions">
            <button class="btn-remove" type="button" data-id="${product.id}" aria-label="Eliminar">✕</button>
          </div>
        `;
                productsList.appendChild(productElement);
            });

            document.querySelectorAll('.btn-remove').forEach(btn => {
                btn.addEventListener('click', function () {
                    const productId = parseInt(this.getAttribute('data-id') || '0', 10);
                    removeProduct(productId);
                });
            });

            updateProductInputState();
        }

        function removeProduct(productId) {
            const idx = orderState.products.findIndex(p => p.id === productId);
            if (idx !== -1) {
                const product = orderState.products[idx];
                if (product.isHeavy) orderState.heavyItems--;
                else orderState.lightItems--;
                orderState.products.splice(idx, 1);
                renderProducts();
                calculatePrice();
                updateProductLimits();
                applyServiceRules();
            }
        }

        if (addProductBtn) {
            addProductBtn.addEventListener('click', function () {
                const name = productNameInput.value.trim();
                if (!name) return;

                const description = productDescInput.value.trim();
                const pred = ItemClassifier.predict(name, description);
                const isHeavy = pred.isHeavy;

                if (orderState.serviceType === 'mini' && !isHeavy) {
                    showProductsMessage('alert-warning', `<strong>Minimudanza:</strong> no es necesario añadir objetos pequeños. Añade solo <strong>objetos pesados</strong> (máx. 3).`);
                    return;
                }

                if (orderState.serviceType === 'domicilio' || orderState.serviceType === 'punto') {
                    if (isHeavy && orderState.heavyItems >= 3) {
                        showAppAlert('Has alcanzado el límite de 3 objetos pesados. Si necesitas transportar más, selecciona "Furgoneta llena / Minimudanza".', 'warning', 'Límite alcanzado');
                        return;
                    }
                    if (!isHeavy && orderState.lightItems >= 3) {
                        showAppAlert('Has alcanzado el límite de 3 objetos pequeños. Si necesitas transportar más, selecciona "Furgoneta llena / Minimudanza".', 'warning', 'Límite alcanzado');
                        return;
                    }
                } else if (orderState.serviceType === 'mini') {
                    if (isHeavy && orderState.heavyItems >= 3) {
                        showAppAlert('El servicio de minimudanza incluye hasta 3 objetos pesados.', 'warning', 'Límite alcanzado');
                        return;
                    }
                }

                const product = {
                    id: Date.now(),
                    name,
                    description,
                    isHeavy,
                    ai: {
                        probHeavy: pred.probHeavy,
                        weightKg: pred.weightKg,
                        weightUpperBound: pred.weightUpperBound,
                        dimsCm: pred.dimsCm,
                        object: pred.object ? { id: pred.object.itemId, label: pred.object.label, score: pred.object.score } : null,
                        typos: pred.typos,
                        flags: pred.flags,
                        reason: pred.reason
                    }
                };

                orderState.products.push(product);
                if (isHeavy) orderState.heavyItems++;
                else orderState.lightItems++;

                renderProducts();
                calculatePrice();
                updateProductLimits();

                productNameInput.value = '';
                productDescInput.value = '';
                productNameInput.focus();

                showProductsMessage(null, '');
                updateClassificationPreview();
                applyServiceRules();
            });
        }

        [productNameInput, productDescInput].forEach(inp => {
            inp.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); addProductBtn.click(); }
            });
            inp.addEventListener('input', updateClassificationPreview);
        });

        // =========================
        // Resumen (Paso 7)
        // =========================
        function getAssistLabel(level) {
            const cfg = ASSIST_LEVELS[level] || ASSIST_LEVELS.solo;
            return cfg.extra > 0 ? `${cfg.label} (+${cfg.extra}€)` : cfg.label;
        }

        function formatDisplayDate(isoDate) {
            if (!isoDate) return '';
            const [year, month, day] = isoDate.split('-');
            return `${day}/${month}/${year}`;
        }

        function formatPrice(price) {
            return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
        }

        function getServiceName(serviceType) {
            switch (serviceType) {
                case 'domicilio': return 'Domicilio / Tienda';
                case 'punto': return 'Punto limpio';
                case 'mini': return 'Furgoneta llena / Minimudanza';
                default: return '-';
            }
        }

        function formatAccessSummary(details) {
            if (!details || !details.accessType) return '';
            if (details.accessType === 'chalet') return `Chalet: ${details.chaletNumber}`;
            if (details.accessType === 'piso') return `Piso: ${details.floor} · Puerta: ${details.door}`;
            if (details.accessType === 'tienda') return `Tienda: ${details.storeName}`;
            return '';
        }

        function updateSummary() {
            const user = currentUser || null;

            if (user) {
                const n = document.getElementById('summary-user-name');
                const p = document.getElementById('summary-user-phone');
                const e = document.getElementById('summary-user-email');
                if (n) n.textContent = user.name || '-';
                if (p) p.textContent = user.phone || '-';
                if (e) e.textContent = user.email || '-';
            }

            const st = document.getElementById('summary-service-type');
            if (st) st.textContent = getServiceName(orderState.serviceType);

            const assistEl = document.getElementById('summary-assist');
            if (assistEl) assistEl.textContent = getAssistLabel(orderState.assistLevel);

            const urgencyEl = document.getElementById('summary-service-urgency');
            if (urgencyEl) {
                urgencyEl.textContent = orderState.serviceUrgency === 'immediate'
                    ? 'Servicio Urgente (¡Lo necesito ya!)'
                    : 'Servicio Programado';
            }

            const distEl = document.getElementById('summary-distance');
            const stopsEl = document.getElementById('summary-stops');
            if (distEl) distEl.textContent = orderState.distance ? orderState.distance + ' km' : '-';
            if (stopsEl) stopsEl.textContent = orderState.addresses ? orderState.addresses.length + ' paradas' : '-';

            const heavyEl = document.getElementById('summary-heavy-items');
            if (heavyEl) heavyEl.textContent = String(orderState.heavyItems);

            const lightRow = document.getElementById('summary-light-row');
            const lightEl = document.getElementById('summary-light-items');
            if (orderState.serviceType === 'mini') {
                if (lightRow) lightRow.style.display = 'none';
            } else {
                if (lightRow) lightRow.style.display = 'flex';
                if (lightEl) lightEl.textContent = String(orderState.lightItems);
            }

            const dateTimeSummary = document.getElementById('summary-datetime');
            if (dateTimeSummary) {
                if (orderState.serviceUrgency === 'immediate') {
                    dateTimeSummary.textContent = 'INMEDIATO (Servicio Urgente)';
                } else if (orderState.serviceDate) {
                    const dateText = formatDisplayDate(orderState.serviceDate);
                    const timeText = orderState.serviceTime ? ` · ${orderState.serviceTime}` : '';
                    dateTimeSummary.textContent = `${dateText}${timeText}`;
                } else {
                    dateTimeSummary.textContent = '-';
                }
            }

            const addressesList = document.getElementById('summary-addresses-list');
            if (addressesList && orderState.addresses) {
                let html = '';
                orderState.addresses.forEach((addr, index) => {
                    const typeIcon = addr.type === 'pickup' ? '📦' : addr.type === 'delivery' ? '🏁' : '📍';
                    const addressText = addr.address || '(Dirección no especificada)';

                    const d = orderState.addressDetails[addr.id] || {};
                    const access = formatAccessSummary(d);
                    const accessText = access
                        ? `<br><small style="color:var(--muted);">${escapeHtml(accessTypeLabel(d.accessType))} · ${escapeHtml(access)}</small>`
                        : '';

                    html += `<div style="margin-bottom: 8px;">${typeIcon} <strong>${index + 1}.</strong> ${escapeHtml(addressText)}${accessText}</div>`;
                });
                addressesList.innerHTML = html;
            }

            const totalEl = document.getElementById('summary-total');
            if (totalEl) totalEl.textContent = formatPrice(orderState.totalPrice);
        }

        // =========================
        // Pago (Paso 8)
        // =========================
        const paymentMethods = document.querySelectorAll('.payment-method');
        const efectivoMessage = document.getElementById('efectivo-message');

        paymentMethods.forEach(method => {
            method.addEventListener('click', function () {
                paymentMethods.forEach(m => m.classList.remove('selected'));
                this.classList.add('selected');
                orderState.paymentMethod = this.getAttribute('data-payment');

                if (efectivoMessage) {
                    efectivoMessage.style.display = orderState.paymentMethod === 'efectivo' ? 'block' : 'none';
                }
            });
        });

        // =========================
        // Precio
        // =========================
        function calculateDistanceExtra(distanceKm) {
            if (!distanceKm || distanceKm <= 10) return 0;
            return Math.ceil((distanceKm - 10) / 10) * 10;
        }

        function calculateBase(serviceType, distanceKm) {
            if (!serviceType) return 0;
            if (!distanceKm || distanceKm === 0) return 0;
            if (serviceType === 'domicilio') return 40;
            if (serviceType === 'punto') return 35;
            if (serviceType === 'mini') return 80;
            return 0;
        }

        function calculatePrice() {
            const base = calculateBase(orderState.serviceType, orderState.distance);
            const distanceExtra = calculateDistanceExtra(orderState.distance);
            const heavyExtra = (orderState.heavyItems || 0) * 10;
            const assistCfg = ASSIST_LEVELS[orderState.assistLevel] || ASSIST_LEVELS.solo;
            const assistExtra = assistCfg.extra || 0;

            const urgencyExtra = 0;

            orderState.totalPrice = base + distanceExtra + heavyExtra + assistExtra + urgencyExtra;

            if (orderState.currentStep >= 7) updateSummary();
        }

        // =========================
        // Navegación de pasos
        // =========================
        function goToStep(step) {
            const isConfirmation = step === 'confirmation';
            const stepKey = isConfirmation ? 'confirmation' : step;

            Object.keys(stepElements).forEach(key => {
                const el = stepElements[key];
                if (el) { el.style.display = 'none'; el.classList.remove('active'); }
            });

            const activeStepEl = stepElements[stepKey];
            if (activeStepEl) {
                activeStepEl.style.display = 'block';
                activeStepEl.classList.add('active');
            }

            const currentStepNum = isConfirmation ? TOTAL_STEPS : step;
            orderState.currentStep = currentStepNum;

            if (progressBar) {
                const percentage = ((currentStepNum - 1) / (TOTAL_STEPS - 1)) * 100;
                progressBar.style.transition = 'none';
                progressBar.style.width = '0%';
                setTimeout(() => {
                    progressBar.style.transition = 'width .35s ease';
                    progressBar.style.width = `${percentage}%`;
                }, 10);
            }

            if (currentStepNum >= 7) updateSummary();
            if (currentStepNum === 4 && orderState.serviceType) applyServiceRules();

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (activeStepEl) {
                        focusStep(activeStepEl);
                        scrollToStepTop(activeStepEl);
                    }
                });
            });
        }

        // =========================
        // Botones de navegación
        // =========================
        const next1 = document.getElementById('next-step1');
        const prev2 = document.getElementById('prev-step2');
        const next2 = document.getElementById('next-step2');
        const prev3 = document.getElementById('prev-step3');
        const next3 = document.getElementById('next-step3');
        const prev4 = document.getElementById('prev-step4');
        const next4 = document.getElementById('next-step4');
        const prev5 = document.getElementById('prev-step5');
        const next5 = document.getElementById('next-step5');
        const prev6 = document.getElementById('prev-step6');
        const next6 = document.getElementById('next-step6');
        const prev7 = document.getElementById('prev-step7');
        const next7 = document.getElementById('next-step7');
        const prev8 = document.getElementById('prev-step8');
        const confirmBtn = document.getElementById('confirm-order');

        if (next1) {
            next1.addEventListener('click', function () {
                const emptyAddresses = orderState.addresses.filter(addr => !addr.address.trim());
                if (emptyAddresses.length > 0) {
                    showAppAlert('Por favor, completa todas las direcciones', 'warning', 'Falta información');
                    return;
                }
                if (orderState.addresses.length < 2) {
                    showAppAlert('Debe haber al menos una dirección de recogida y una de entrega', 'warning');
                    return;
                }

                calculateRouteDistance();
                renderAddressDetails();
                goToStep(2);
            });
        }

        if (prev2) prev2.addEventListener('click', function () { goToStep(1); });
        if (next2) {
            next2.addEventListener('click', function () {
                const v = validateAccessDetails();
                if (!v.ok) {
                    showAppAlert(v.msg, 'warning', 'Falta información');
                    return;
                }
                goToStep(3);
            });
        }

        if (prev3) prev3.addEventListener('click', function () { goToStep(2); });
        if (next3) {
            next3.addEventListener('click', function () {
                if (!orderState.serviceType) {
                    showAppAlert('Por favor, selecciona un tipo de servicio', 'warning', 'Falta información');
                    return;
                }
                goToStep(4);
            });
        }

        if (prev4) prev4.addEventListener('click', function () { goToStep(3); });
        if (next4) {
            next4.addEventListener('click', function () {
                if (!orderState.serviceType) {
                    showAppAlert('Por favor, selecciona un tipo de servicio', 'warning', 'Falta información');
                    return;
                }

                if (orderState.serviceType === 'domicilio' || orderState.serviceType === 'punto') {
                    if (orderState.heavyItems > 3 || orderState.lightItems > 3) {
                        showAppAlert('Has excedido los límites de objetos para este servicio. Elimina algunos objetos o selecciona "Furgoneta llena / Minimudanza".', 'warning', 'Límite excedido');
                        return;
                    }
                } else if (orderState.serviceType === 'mini') {
                    if (orderState.heavyItems > 3) {
                        showAppAlert('El servicio de minimudanza incluye hasta 3 objetos pesados.', 'warning', 'Límite excedido');
                        return;
                    }
                    if (orderState.lightItems > 0) {
                        orderState.lightItems = 0;
                        orderState.products = orderState.products.filter(p => p.isHeavy);
                        renderProducts();
                        updateProductLimits();
                        calculatePrice();
                    }
                }

                goToStep(5);
            });
        }

        if (prev5) prev5.addEventListener('click', function () { goToStep(4); });
        if (next5) next5.addEventListener('click', function () { goToStep(6); });

        if (prev6) prev6.addEventListener('click', function () { goToStep(5); });
        if (next6) {
            next6.addEventListener('click', function () {
                if (orderState.serviceUrgency === 'scheduled') {
                    orderState.serviceDate = serviceDateInput?.value || '';
                    orderState.serviceTime = serviceTimeSelect?.value || '';

                    if (!orderState.serviceDate || !orderState.serviceTime) {
                        showAppAlert('Por favor, selecciona la fecha y la franja horaria del servicio', 'warning', 'Falta información');
                        return;
                    }
                } else {
                    const now = new Date();
                    orderState.serviceDate = now.toISOString().split('T')[0];
                    orderState.serviceTime = 'INMEDIATO';
                }
                goToStep(7);
            });
        }

        if (prev7) prev7.addEventListener('click', function () { goToStep(6); });
        if (next7) next7.addEventListener('click', function () { goToStep(8); });

        if (prev8) prev8.addEventListener('click', function () { goToStep(7); });

        // =========================
        // Persistencia del pedido
        // =========================
        function isLegacyPage() {
            const p = (location.pathname || '').toLowerCase();
            return p.includes('/legacy/') || p.endsWith('.html');
        }

        function goHome() {
            if (isLegacyPage()) window.location.href = 'index.html';
            else window.location.href = '/';
        }

        function goUserArea(user) {
            const isEmpresa = user && user.accountType === 'empresa';
            if (isLegacyPage()) {
                window.location.href = isEmpresa ? 'Usuario_empresa.html' : 'Usuario.html';
            } else {
                // En el esquema nuevo, por defecto dejamos Usuario.php
                window.location.href = 'Usuario.php';
            }
        }

        async function trySaveOrderToApi(order) {
            const cfg = window.huichplyConfig || {};
            const apiBase = (cfg.apiBase || '/api').replace(/\/$/, '');

            const candidates = [
                cfg.ordersCreateEndpoint,
                `${apiBase}/orders`,
                `${apiBase}/orders/create`
            ].filter(Boolean);

            for (const url of candidates) {
                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(order)
                    });
                    if (!res.ok) continue;
                    const data = await res.json().catch(() => ({}));
                    return data || {};
                } catch (_) { /* noop */ }
            }
            return null;
        }

        function saveOrderToLocalStorage(userId, order) {
            let userOrders = JSON.parse(localStorage.getItem('yevhoUserOrders') || '{}');
            if (!userOrders[userId]) userOrders[userId] = [];
            userOrders[userId].push(order);
            localStorage.setItem('yevhoUserOrders', JSON.stringify(userOrders));

            localStorage.setItem('yevhoLastOrder', JSON.stringify(order));
            localStorage.setItem('yevhoLastOrderId', order.id);
        }

        function updateUserStatistics(userId, order) {
            const users = JSON.parse(localStorage.getItem('yevhoUsers') || '[]');
            const userIndex = users.findIndex(u => u.id === userId);

            if (userIndex !== -1) {
                const user = users[userIndex];
                user.servicesCount = (user.servicesCount || 0) + 1;

                const addrStrings = Array.isArray(order.addresses)
                    ? order.addresses
                    : (Array.isArray(order.addressStops) ? order.addressStops.map(s => s.address) : []);

                if (addrStrings.length && !user.addresses) {
                    user.addresses = [...addrStrings];
                } else if (addrStrings.length && user.addresses) {
                    addrStrings.forEach(a => { if (a && !user.addresses.includes(a)) user.addresses.push(a); });
                }

                users[userIndex] = user;
                localStorage.setItem('yevhoUsers', JSON.stringify(users));
                localStorage.setItem('yevhoUser', JSON.stringify(user));
            }
        }

        async function saveOrder() {
            const user = currentUser || null;
            if (!user) return;

            const orderId = 'YEV-' + Date.now();

            const addressStops = orderState.addresses.map((a, idx) => {
                const d = orderState.addressDetails[a.id] || {};
                return {
                    order: idx + 1,
                    id: a.id,
                    type: a.type,
                    label: a.label,
                    address: a.address,
                    access: {
                        accessType: d.accessType || '',
                        chaletNumber: d.chaletNumber || '',
                        floor: d.floor || '',
                        door: d.door || '',
                        storeName: d.storeName || ''
                    }
                };
            });

            const routeAddresses = addressStops.map(s => s.address);
            const pickupAddress = addressStops[0]?.address || '';
            const deliveryAddress = addressStops[addressStops.length - 1]?.address || '';

            const order = {
                id: orderId,
                userId: user.id,
                date: new Date().toISOString(),
                status: orderState.paymentMethod === 'efectivo' ? 'pendiente' : 'confirmado',
                urgency: orderState.serviceUrgency,
                userName: user.name,
                userPhone: user.phone,
                userEmail: user.email,

                ...orderState,

                addresses: routeAddresses,
                addressStops,
                pickupAddress,
                deliveryAddress,
                routeAddresses
            };

            // Intento API (si existe), si no, localStorage
            const apiResult = await trySaveOrderToApi(order);
            if (apiResult && apiResult.id && typeof apiResult.id === 'string') {
                order.id = apiResult.id;
            }

            saveOrderToLocalStorage(user.id, order);
            updateUserStatistics(user.id, order);
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async function () {
                if (!orderState.paymentMethod) {
                    showAppAlert('Por favor, selecciona un método de pago', 'warning', 'Falta información');
                    return;
                }

                await saveOrder();
                goToStep('confirmation');

                const confirmationBizum = document.getElementById('confirmation-bizum');
                const confirmationTarjeta = document.getElementById('confirmation-tarjeta');
                const confirmationEfectivo = document.getElementById('confirmation-efectivo');
                const confirmationUrgent = document.getElementById('confirmation-urgent');

                if (confirmationBizum) confirmationBizum.style.display = 'none';
                if (confirmationTarjeta) confirmationTarjeta.style.display = 'none';
                if (confirmationEfectivo) confirmationEfectivo.style.display = 'none';
                if (confirmationUrgent) confirmationUrgent.style.display = 'none';

                if (orderState.serviceUrgency === 'immediate') {
                    if (confirmationUrgent) confirmationUrgent.style.display = 'block';
                } else if (orderState.paymentMethod === 'bizum') {
                    if (confirmationBizum) confirmationBizum.style.display = 'block';
                } else if (orderState.paymentMethod === 'tarjeta') {
                    if (confirmationTarjeta) confirmationTarjeta.style.display = 'block';
                } else if (orderState.paymentMethod === 'efectivo') {
                    if (confirmationEfectivo) confirmationEfectivo.style.display = 'block';
                }
            });
        }

        const backToHomeBtn = document.getElementById('back-to-home');
        if (backToHomeBtn) backToHomeBtn.addEventListener('click', goHome);

        const viewOrderBtn = document.getElementById('view-order');
        if (viewOrderBtn) viewOrderBtn.addEventListener('click', function () { goUserArea(currentUser); });

        if (addAddressBtn) addAddressBtn.addEventListener('click', addNewAddress);

        // =========================
        // Enter para avanzar
        // =========================
        function clickIfPossible(id) {
            const btn = document.getElementById(id);
            if (!btn) return false;
            if (btn.disabled) return false;
            btn.click();
            return true;
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
            if (appAlertOverlay && appAlertOverlay.classList.contains('active')) return;

            const activeStepEl = document.querySelector('.order-step.active');
            if (!activeStepEl) return;

            const ae = document.activeElement;

            if (ae && (ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
            if (activeStepEl.id === 'step4' && (ae === productNameInput || ae === productDescInput)) return;
            if (ae && ae.tagName === 'SELECT') return;
            if (ae && ae.classList.contains('address-input')) return;

            let did = false;
            switch (activeStepEl.id) {
                case 'step1': did = clickIfPossible('next-step1'); break;
                case 'step2': did = clickIfPossible('next-step2'); break;
                case 'step3': did = clickIfPossible('next-step3'); break;
                case 'step4': did = clickIfPossible('next-step4'); break;
                case 'step5': did = clickIfPossible('next-step5'); break;
                case 'step6': did = clickIfPossible('next-step6'); break;
                case 'step7': did = clickIfPossible('next-step7'); break;
                case 'step8': did = clickIfPossible('confirm-order'); break;
                default: did = false;
            }
            if (did) e.preventDefault();
        });

        // =========================
        // Inicialización
        // =========================
        initializeAddresses();
        setupUrgencyOptions();
        calculatePrice();
        renderProducts();
        updateProductLimits();
        updateAssistUI();

        productNameInput.disabled = true;
        productDescInput.disabled = true;
        addProductBtn.disabled = true;

        setTimeout(() => { if (progressBar) progressBar.style.width = '0%'; }, 100);

        requestAnimationFrame(() => {
            const s1 = document.getElementById('step1');
            if (s1) { focusStep(s1); scrollToStepTop(s1); }
        });
    }

    // =========================
    // Arranque con header + auth
    // =========================
    (window.__huichplyHeaderLoaded || window.__yevhoHeaderLoaded || Promise.resolve()).then(() => {
        const user = window.yevhoAuth?.requireAuth?.({ requireCompleteProfile: true });
        if (!user) return;
        initOrderApp(user);
    });
})();
