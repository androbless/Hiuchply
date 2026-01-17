/* File: /assets/js/app.js */
(function () {
    'use strict';

    // ======================================================
    // Config global para backend real
    // ======================================================
    window.huichplyConfig = window.huichplyConfig || {};
    if (!window.huichplyConfig.apiBase) window.huichplyConfig.apiBase = '/api';
    window.__HUICHPLY_API_BASE__ = window.__HUICHPLY_API_BASE__ ?? window.huichplyConfig.apiBase;

    // ======================================================
    // Base opcional (si algún día alojas en subcarpeta)
    // Si NO existe meta app-base, el BASE será ''
    // ======================================================
    function getBase() {
        var meta = document.querySelector('meta[name="app-base"]');
        var v = (meta && meta.getAttribute('content')) ? meta.getAttribute('content') : '/';
        return String(v || '/');
    }

    var BASE = getBase().replace(/\/+$/, '');
    if (BASE === '/') BASE = '';

    function withBase(path) {
        var p = String(path || '');
        if (!p) return BASE || '';
        if (/^https?:\/\//i.test(p) || p.startsWith('//')) return p;
        var normalized = p.startsWith('/') ? p : '/' + p;
        return (BASE ? BASE : '') + normalized;
    }

    // ======================================================
    // Helpers
    // ======================================================
    function fetchText(url) {
        return fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.text() : ''; });
    }

    // Re-ejecutar <script> dentro de HTML insertado
    function reExecuteScripts(container) {
        if (!container) return;

        var scripts = Array.prototype.slice.call(container.querySelectorAll('script'));
        scripts.forEach(function (oldScript) {
            var s = document.createElement('script');

            Array.prototype.slice.call(oldScript.attributes || []).forEach(function (attr) {
                s.setAttribute(attr.name, attr.value);
            });

            if (oldScript.src) {
                s.src = oldScript.src;
                s.async = false;
            } else {
                s.textContent = oldScript.textContent || '';
            }

            document.body.appendChild(s);
            oldScript.remove();
        });
    }

    function setPromiseOnce(key, promise) {
        var existing = window[key];
        if (existing && typeof existing.then === 'function') return existing;
        window[key] = promise;
        return promise;
    }

    function fetchIntoContainer(url, containerId) {
        var el = document.getElementById(containerId);
        if (!el) return Promise.resolve(null);

        return fetchText(url)
            .then(function (html) {
                if (!html) return null;
                el.innerHTML = html;
                reExecuteScripts(el);
                return el;
            })
            .catch(function () { return null; });
    }

    function safeJson(url) {
        return fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
    }

    function debounce(fn, wait) {
        var t = null;
        return function () {
            var args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(null, args); }, wait);
        };
    }

    // Ajusta --header-h en función de la altura real del header
    function syncHeaderHeight() {
        var header = document.querySelector('.site-header') || document.querySelector('header');
        if (!header) return;
        var h = Math.ceil(header.getBoundingClientRect().height);
        if (h > 0) document.documentElement.style.setProperty('--header-h', h + 'px');
    }

    // ======================================================
    // Header / Footer load (una sola vez)
    // ======================================================
    var headerPromise = setPromiseOnce('__huichplyHeaderLoaded',
        fetchIntoContainer(withBase('/header.html'), 'header-container')
    );

    var footerPromise = setPromiseOnce('__huichplyFooterLoaded',
        fetchIntoContainer(withBase('/footer_componente.html'), 'footer-container')
    );

    // Compat legacy
    window.__yevhoHeaderLoaded = window.__yevhoHeaderLoaded || headerPromise;
    window.__yevhoFooterLoaded = window.__yevhoFooterLoaded || footerPromise;

    // Al cargar header, sincronizar altura
    Promise.resolve(headerPromise).then(function () {
        requestAnimationFrame(syncHeaderHeight);
        setTimeout(syncHeaderHeight, 150);
    });

    window.addEventListener('resize', debounce(syncHeaderHeight, 100));

    // ======================================================
    // Home: CTA empresas -> abre FAQ empresas
    // ======================================================
    function initFaqCta() {
        var ctaEmpresas = document.getElementById('ctaEmpresas');
        if (!ctaEmpresas) return;

        ctaEmpresas.addEventListener('click', function (e) {
            e.preventDefault();
            var el = document.getElementById('faq-empresas');
            if (el) {
                el.open = true;
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                location.hash = '#faq';
            }
        });
    }

    // ======================================================
    // Home: calculadora (RECUPERADA)
    // ======================================================
    function initCalculator() {
        var tipoEl = document.getElementById('tipo');
        var kmEl = document.getElementById('km');
        var kmValueEl = document.getElementById('km-value');
        var pesEl = document.getElementById('pesados');
        var pesValueEl = document.getElementById('pesados-value');
        var asistenciaEl = document.getElementById('asistencia');
        var asistenciaEstimateEl = document.getElementById('asistencia-estimate');
        var estOut = document.getElementById('estimate');
        var calcCta = document.getElementById('calculatorCta');

        if (!tipoEl || !kmEl || !pesEl || !asistenciaEl || !estOut) return;

        function euro(n) {
            return new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0
            }).format(n);
        }

        function updateCalculator() {
            var tipo = tipoEl.value || 'domicilio';
            var km = parseInt(kmEl.value || '0', 10);
            var pes = parseInt(pesEl.value || '0', 10);
            var asistencia = parseInt(asistenciaEl.value || '0', 10);

            var base = 0;
            var extra = 0;

            if (tipo === 'domicilio') {
                if (km <= 10) base = 40;
                else if (km <= 20) base = 50;
                else if (km <= 30) base = 60;
                else if (km <= 40) base = 70;
                else if (km <= 50) base = 80;
                else if (km <= 60) base = 90;
                else if (km <= 70) base = 100;
                else if (km <= 80) base = 110;
                else if (km <= 90) base = 120;
                else base = 130;

                extra = 10 * pes;
            }

            if (tipo === 'punto') {
                base = 35;
                if (km > 10) {
                    var kmExtra = Math.ceil((km - 10) / 10);
                    base += kmExtra * 10;
                }
                extra = 10 * pes;
            }

            if (tipo === 'mini') {
                base = 80;
                if (km > 10) {
                    var kmExtra2 = Math.ceil((km - 10) / 10);
                    base += kmExtra2 * 10;
                }
                extra = 10 * pes;
            }

            var asistenciaText =
                asistencia === 5 ? 'Transporte con Ayuda (+5€)'
                    : asistencia === 12 ? 'Transporte Completo (+12€)'
                        : 'Solo Transporte';

            if (asistenciaEstimateEl) {
                if (asistencia > 0) {
                    asistenciaEstimateEl.textContent = asistenciaText;
                    asistenciaEstimateEl.style.display = 'block';
                } else {
                    asistenciaEstimateEl.style.display = 'none';
                }
            }

            var total = base + extra + asistencia;
            estOut.textContent = euro(total);

            if (kmValueEl) kmValueEl.textContent = km + ' km';
            if (pesValueEl) pesValueEl.textContent = String(pes);
        }

        [tipoEl, kmEl, pesEl, asistenciaEl].forEach(function (el) {
            el.addEventListener('input', updateCalculator);
        });

        updateCalculator();

        if (calcCta) {
            calcCta.addEventListener('click', function () {
                window.location.href = '/Pedidos';
            });
        }
    }

    // ======================================================
    // Home: cargar bloque valoraciones (snippet)
    // ======================================================
    function maybeLoadHomeValoraciones() {
        var container = document.getElementById('valoraciones-container');
        if (!container) return;
        if (container.children && container.children.length > 0) return;

        fetchIntoContainer(withBase('/legacy/valoraciones.html'), 'valoraciones-container');
    }

    // ======================================================
    // Home: counters (API si existe, fallback si no)
    // ======================================================
    function animateCounter(el, to, durationMs) {
        if (!el) return;
        var start = 0;
        var end = Math.max(0, Number(to) || 0);
        var duration = Math.max(300, Number(durationMs) || 1200);
        var startTime = performance.now();

        function tick(now) {
            var t = Math.min(1, (now - startTime) / duration);
            var value = Math.floor(start + (end - start) * t);
            el.textContent = String(value);
            if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function initCounters() {
        var usuariosCounter = document.getElementById('usuarios-counter');
        var pedidosCounter = document.getElementById('pedidos-counter');
        var statsSection = document.querySelector('.stats-counter');
        if (!usuariosCounter || !pedidosCounter || !statsSection) return;

        function runCounters(users, orders) {
            animateCounter(usuariosCounter, users, 1200);
            animateCounter(pedidosCounter, orders, 1200);
        }

        function fallbackOrdersLocal() {
            try {
                var raw = localStorage.getItem('yevhoUserOrders');
                if (!raw) return 0;
                var obj = JSON.parse(raw);
                var sum = 0;
                Object.keys(obj || {}).forEach(function (k) {
                    var list = obj[k];
                    if (Array.isArray(list)) sum += list.length;
                });
                return sum;
            } catch (_) { return 0; }
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                // API (si existe): /api/public/stats -> { users, orders }
                safeJson((window.huichplyConfig.apiBase || '/api') + '/public/stats')
                    .then(function (data) {
                        runCounters((data && data.users) ? data.users : 0, (data && data.orders) ? data.orders : 0);
                    })
                    .catch(function () {
                        // Fallback: pedidos del localStorage, usuarios 0
                        runCounters(0, fallbackOrdersLocal());
                    });

                observer.unobserve(entry.target);
            });
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }

    // ======================================================
    // BOOT
    // ======================================================
    function boot() {
        maybeLoadHomeValoraciones();
        initFaqCta();
        initCalculator();
        initCounters();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
