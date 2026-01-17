(function () {
    'use strict';

    // Base para assets/URLs si el proyecto vive en subcarpeta
    function getBase() {
        const meta = document.querySelector('meta[name="app-base"]');
        const v = (meta && meta.getAttribute('content')) ? meta.getAttribute('content') : '/';
        return String(v || '/');
    }

    const BASE = getBase().replace(/\/+$/, '');

    function withBase(path) {
        const p = String(path || '');
        if (!p) return BASE || '';
        if (/^https?:\/\//i.test(p) || p.startsWith('//')) return p;
        const normalized = p.startsWith('/') ? p : '/' + p;
        return (BASE ? BASE : '') + normalized;
    }

    // Inserta HTML remoto en un contenedor y re-ejecuta scripts embebidos
    function fetchIntoContainer(url, containerId) {
        const el = document.getElementById(containerId);
        if (!el) return Promise.resolve(null);

        return fetch(url, { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status + ' al cargar ' + url);
                return r.text();
            })
            .then(function (html) {
                el.innerHTML = html;

                // Los <script> dentro de innerHTML no se ejecutan; se recrean aquí
                Array.from(el.querySelectorAll('script')).forEach(function (oldScript) {
                    const s = document.createElement('script');

                    Array.from(oldScript.attributes).forEach(function (attr) {
                        s.setAttribute(attr.name, attr.value);
                    });

                    if (oldScript.src) {
                        s.src = oldScript.src;
                    } else {
                        s.textContent = oldScript.textContent;
                    }

                    document.body.appendChild(s);
                    oldScript.remove();
                });

                return el;
            })
            .catch(function (err) {
                console.error('[app] Error cargando componente:', url, err);
                return null;
            });
    }

    // Ajusta el padding superior usando la altura real del header (si existe)
    function syncHeaderHeight() {
        const header =
            document.querySelector('.site-header') ||
            document.querySelector('header');

        if (!header) return;

        const h = Math.ceil(header.getBoundingClientRect().height);
        if (h > 0) {
            document.documentElement.style.setProperty('--header-h', h + 'px');
        }
    }

    function debounce(fn, wait) {
        let t = null;
        return function () {
            const args = arguments;
            clearTimeout(t);
            t = setTimeout(function () {
                fn.apply(null, args);
            }, wait);
        };
    }

    // Home: CTA empresas -> abre FAQ empresas
    function initFaqCta() {
        const ctaEmpresas = document.getElementById('ctaEmpresas');
        if (!ctaEmpresas) return;

        ctaEmpresas.addEventListener('click', function (e) {
            e.preventDefault();
            const el = document.getElementById('faq-empresas');
            if (el) {
                el.open = true;
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                location.hash = '#faq';
            }
        });
    }

    // Home: calculadora
    function initCalculator() {
        const tipoEl = document.getElementById('tipo');
        const kmEl = document.getElementById('km');
        const kmValueEl = document.getElementById('km-value');
        const pesEl = document.getElementById('pesados');
        const pesValueEl = document.getElementById('pesados-value');
        const asistenciaEl = document.getElementById('asistencia');
        const asistenciaEstimateEl = document.getElementById('asistencia-estimate');
        const estOut = document.getElementById('estimate');
        const calcCta = document.getElementById('calculatorCta');

        if (!tipoEl || !kmEl || !pesEl || !asistenciaEl || !estOut) return;

        function euro(n) {
            return new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0
            }).format(n);
        }

        function updateCalculator() {
            const tipo = tipoEl.value || 'domicilio';
            const km = parseInt(kmEl.value || '0', 10);
            const pes = parseInt(pesEl.value || '0', 10);
            const asistencia = parseInt(asistenciaEl.value || '0', 10);

            let base = 0;
            let extra = 0;

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
                    const kmExtra = Math.ceil((km - 10) / 10);
                    base += kmExtra * 10;
                }
                extra = 10 * pes;
            }

            if (tipo === 'mini') {
                base = 80;
                if (km > 10) {
                    const kmExtra = Math.ceil((km - 10) / 10);
                    base += kmExtra * 10;
                }
                extra = 10 * pes;
            }

            const asistenciaText =
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

            const total = base + extra + asistencia;
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
                const link = document.getElementById('cta');
                if (link) link.click();
            });
        }
    }

    // Home: animación contadores
    function initCounters() {
        const usuariosCounter = document.getElementById('usuarios-counter');
        const pedidosCounter = document.getElementById('pedidos-counter');
        const statsSection = document.querySelector('.stats-counter');

        if (!usuariosCounter || !pedidosCounter || !statsSection) return;

        const usuariosFinal = 24;
        const pedidosFinal = 19;

        const duration = 1500;
        const interval = 30;

        function animateCounter(element, finalValue) {
            let currentValue = 0;
            const increment = finalValue / (duration / interval);

            const counter = setInterval(function () {
                currentValue += increment;

                if (currentValue >= finalValue) {
                    currentValue = finalValue;
                    clearInterval(counter);
                }

                element.textContent = String(Math.floor(currentValue));
            }, interval);
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(usuariosCounter, usuariosFinal);
                    animateCounter(pedidosCounter, pedidosFinal);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }

    // Ajusta enlaces internos del bloque de valoraciones cuando se inserta desde /legacy/
    function patchValoracionesLinks(container) {
        if (!container) return;

        Array.from(container.querySelectorAll('a[href]')).forEach(function (a) {
            const href = a.getAttribute('href') || '';

            if (href === 'Valorar.html') {
                a.setAttribute('href', withBase('/legacy/Valorar.html'));
            }

            if (href === 'Valoraciones.html') {
                a.setAttribute('href', withBase('/legacy/valoraciones.html'));
            }
        });
    }

    // Montaje de componentes + init de página
    function boot() {
        window.__yevhoHeaderLoaded = fetchIntoContainer(withBase('/header.html'), 'header-container');
        window.__yevhoFooterLoaded = fetchIntoContainer(withBase('/footer_componente.html'), 'footer-container');

        fetchIntoContainer(withBase('/legacy/valoraciones.html'), 'valoraciones-container')
            .then(function (container) {
                patchValoracionesLinks(container);
            });

        Promise.resolve(window.__yevhoHeaderLoaded).then(function () {
            requestAnimationFrame(syncHeaderHeight);
            setTimeout(syncHeaderHeight, 150);
        });

        window.addEventListener('resize', debounce(syncHeaderHeight, 100));

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
