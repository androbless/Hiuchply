/* File: /assets/js/pages/sesion.js */
(() => {
    'use strict';

    // =========================
    // Cargar header/footer (si existen)
    // =========================
    const HEADER_PROMISE_KEY = '__huichplyHeaderLoaded';
    const FOOTER_PROMISE_KEY = '__huichplyFooterLoaded';

    async function fetchFirstOk(urls) {
        for (const url of urls) {
            try {
                const res = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
                if (res.ok) return { url, text: await res.text() };
            } catch (_) { }
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
        const existing = window[HEADER_PROMISE_KEY];
        if (existing && typeof existing.then === 'function') return existing;

        const p = (async () => {
            const container = document.getElementById('header-container');
            if (!container) return;
            if (container.children && container.children.length > 0) return;

            const result = await fetchFirstOk(['/header.html', 'header.html', '../header.html']);
            if (!result) return;

            container.innerHTML = result.text;
            reExecuteInlineScripts(container);
        })();

        window[HEADER_PROMISE_KEY] = p;
        return p;
    }

    function loadFooterOnce() {
        const existing = window[FOOTER_PROMISE_KEY];
        if (existing && typeof existing.then === 'function') return existing;

        const p = (async () => {
            const container = document.getElementById('footer-container');
            if (!container) return;
            if (container.children && container.children.length > 0) return;

            const result = await fetchFirstOk(['/footer_componente.html', 'footer_componente.html', '../footer_componente.html']);
            if (!result) return;

            container.innerHTML = result.text;
            reExecuteInlineScripts(container);
        })();

        window[FOOTER_PROMISE_KEY] = p;
        return p;
    }

    loadHeaderOnce();
    loadFooterOnce();

    // =========================
    // Utils
    // =========================
    function qs(id) { return document.getElementById(id); }

    function setError(id, msg) {
        const el = qs(id);
        if (!el) return;
        el.textContent = msg || '';
        el.style.display = msg ? 'block' : 'none';
    }

    function clearErrors() {
        [
            'loginEmailError', 'loginPasswordError',
            'registerNameError', 'registerEmailError', 'registerPasswordError', 'registerConfirmPasswordError'
        ].forEach(id => setError(id, ''));
    }

    function getParam(name) {
        try {
            const u = new URL(location.href);
            return u.searchParams.get(name);
        } catch (_) {
            return null;
        }
    }

    function safeRedirectUrl() {
        const r = getParam('redirect');
        if (!r) return null;
        if (r.startsWith('http://') || r.startsWith('https://') || r.startsWith('//')) return null;
        if (r.startsWith('javascript:')) return null;
        return r;
    }

    async function ensureReadyAuth() {
        try { await (window.huichplyAuth?.ready || Promise.resolve()); } catch (_) { }
    }

    // =========================
    // Tabs
    // =========================
    function showTab(tab) {
        const loginTab = qs('loginTab');
        const registerTab = qs('registerTab');
        const loginForm = qs('loginForm');
        const registerForm = qs('registerForm');

        if (!loginTab || !registerTab || !loginForm || !registerForm) return;

        if (tab === 'register') {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.style.display = '';
            loginForm.style.display = 'none';
        } else {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = '';
            registerForm.style.display = 'none';
        }

        clearErrors();
    }

    // =========================
    // API calls
    // =========================
    async function apiJson(path, options) {
        // usamos el helper del header si existe
        if (window.huichplyAuth?.apiJson) return window.huichplyAuth.apiJson(path, options);

        const base = '/api';
        const method = (options?.method || 'GET').toUpperCase();
        const headers = Object.assign({ Accept: 'application/json' }, options?.headers || {});
        const body = ('body' in (options || {})) ? options.body : undefined;

        // CSRF (si no está el helper, asumimos endpoint /api/csrf)
        if (method !== 'GET' && method !== 'HEAD') {
            try {
                await fetch(base + '/csrf', { credentials: 'include' });
            } catch (_) { }
            const m = document.cookie.match(/(?:^|;)\s*HUICHPLY_CSRF=([^;]+)/);
            if (m && m[1]) headers['X-CSRF-Token'] = decodeURIComponent(m[1]);
        }

        const res = await fetch(base + path, { method, headers, body, credentials: 'include' });
        let data = null;
        try { data = await res.json(); } catch (_) { }
        return { res, data };
    }

    async function doLogin(email, password) {
        const payload = JSON.stringify({ email, password });
        const { res, data } = await apiJson('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        });

        if (!res.ok) throw new Error((data && data.error) ? data.error : 'No se pudo iniciar sesión.');
        return data;
    }

    async function doRegister(name, email, password) {
        const payload = JSON.stringify({ name, email, password });
        const { res, data } = await apiJson('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        });

        if (!res.ok) throw new Error((data && data.error) ? data.error : 'No se pudo crear la cuenta.');
        return data;
    }

    // =========================
    // Init
    // =========================
    (async () => {
        await ensureReadyAuth();

        // Si ya hay sesión real -> a donde corresponda
        try {
            const me = await window.huichplyAuth?.syncSession?.();
            if (me?.isLoggedIn && me.user) {
                const r = safeRedirectUrl();
                window.location.href = r || (me.user.accountType ? '/Usuario' : '/cuenta_usuario');
                return;
            }
        } catch (_) { }

        const tab = (getParam('tab') || 'login').toLowerCase();
        showTab(tab === 'register' ? 'register' : 'login');

        qs('loginTab')?.addEventListener('click', () => showTab('login'));
        qs('registerTab')?.addEventListener('click', () => showTab('register'));

        // Botón “solo correo”
        qs('emailOnlyBtn')?.addEventListener('click', () => {
            const email = qs('loginEmail')?.value || qs('registerEmail')?.value || '';
            alert(email ? `Continuar con: ${email}` : 'Introduce tu correo y continúa.');
        });

        // LOGIN
        qs('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const email = String(qs('loginEmail')?.value || '').trim();
            const password = String(qs('loginPassword')?.value || '');

            let ok = true;
            if (!email) { setError('loginEmailError', 'Introduce tu correo.'); ok = false; }
            if (!password) { setError('loginPasswordError', 'Introduce tu contraseña.'); ok = false; }
            if (!ok) return;

            try {
                await doLogin(email, password);

                // refrescar cache + UI
                await window.huichplyAuth?.syncSession?.();

                const { user } = window.huichplyAuth?.getAuthState?.() || {};
                const r = safeRedirectUrl();

                if (r) window.location.href = r;
                else if (user && !user.accountType) window.location.href = '/cuenta_usuario';
                else window.location.href = '/Usuario';
            } catch (err) {
                setError('loginPasswordError', err.message || 'Credenciales inválidas.');
            }
        });

        // REGISTER
        qs('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();

            const name = String(qs('registerName')?.value || '').trim();
            const email = String(qs('registerEmail')?.value || '').trim();
            const password = String(qs('registerPassword')?.value || '');
            const confirm = String(qs('registerConfirmPassword')?.value || '');

            let ok = true;
            if (!name) { setError('registerNameError', 'Introduce tu nombre.'); ok = false; }
            if (!email) { setError('registerEmailError', 'Introduce tu correo.'); ok = false; }
            if (!password || password.length < 8) { setError('registerPasswordError', 'Mínimo 8 caracteres.'); ok = false; }
            if (confirm !== password) { setError('registerConfirmPasswordError', 'Las contraseñas no coinciden.'); ok = false; }
            if (!ok) return;

            try {
                await doRegister(name, email, password);

                // refrescar cache + UI
                await window.huichplyAuth?.syncSession?.();

                const r = safeRedirectUrl();
                window.location.href = r || '/cuenta_usuario';
            } catch (err) {
                setError('registerEmailError', err.message || 'No se pudo crear la cuenta.');
            }
        });
    })();
})();
