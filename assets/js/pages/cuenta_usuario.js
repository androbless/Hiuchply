/* File: /assets/js/pages/cuenta_usuario.js */
(() => {
    'use strict';

    // =========================
    // Header/Footer
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
            if (oldScript.src) { s.src = oldScript.src; s.async = false; }
            else s.textContent = oldScript.textContent || '';
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
    // Helpers
    // =========================
    function qs(id) { return document.getElementById(id); }

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

    async function ensureAuthReady() {
        try { await (window.huichplyAuth?.ready || Promise.resolve()); } catch (_) { }
        try { await window.huichplyAuth?.syncSession?.(); } catch (_) { }
    }

    async function apiJson(path, options) {
        if (window.huichplyAuth?.apiJson) return window.huichplyAuth.apiJson(path, options);

        const base = '/api';
        const method = (options?.method || 'GET').toUpperCase();
        const headers = Object.assign({ Accept: 'application/json' }, options?.headers || {});
        const body = ('body' in (options || {})) ? options.body : undefined;

        if (method !== 'GET' && method !== 'HEAD') {
            try { await fetch(base + '/csrf', { credentials: 'include' }); } catch (_) { }
            const m = document.cookie.match(/(?:^|;)\s*HUICHPLY_CSRF=([^;]+)/);
            if (m && m[1]) headers['X-CSRF-Token'] = decodeURIComponent(m[1]);
        }

        const res = await fetch(base + path, { method, headers, body, credentials: 'include' });
        let data = null;
        try { data = await res.json(); } catch (_) { }
        return { res, data };
    }

    // =========================
    // Wizard config
    // =========================
    const steps = [
        {
            title: "¿Qué tipo de cuenta quieres?",
            description: "Selecciona si eres particular o empresa.",
            render: () => {
                const wrap = document.createElement('div');
                wrap.className = 'wizard-choice-grid';
                wrap.innerHTML = `
          <button type="button" class="wizard-choice" data-value="particular">Cuenta particular</button>
          <button type="button" class="wizard-choice" data-value="empresa">Cuenta empresa</button>
        `;
                return wrap;
            },
            read: (area) => area.querySelector('.wizard-choice.selected')?.getAttribute('data-value') || '',
            validate: (val) => val === 'particular' || val === 'empresa' ? '' : 'Selecciona un tipo de cuenta.',
        },
        {
            title: "Teléfono",
            description: "Necesitamos un teléfono de contacto.",
            render: () => {
                const input = document.createElement('input');
                input.type = 'tel';
                input.className = 'form-control';
                input.placeholder = '+34 600 000 000';
                input.id = 'wizardPhone';
                input.autocomplete = 'tel';
                return input;
            },
            read: (area) => String(area.querySelector('#wizardPhone')?.value || '').trim(),
            validate: (val) => (val && val.length >= 7) ? '' : 'Introduce un teléfono válido.',
        },
        {
            title: "Dirección principal",
            description: "Usaremos esta dirección como referencia principal.",
            render: () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control';
                input.placeholder = 'Calle, número, ciudad';
                input.id = 'wizardAddress';
                input.autocomplete = 'street-address';
                return input;
            },
            read: (area) => String(area.querySelector('#wizardAddress')?.value || '').trim(),
            validate: (val) => (val && val.length >= 6) ? '' : 'Introduce una dirección válida.',
        },
        {
            title: "Edad (opcional)",
            description: "Esto nos ayuda a mejorar la experiencia (puedes omitirlo).",
            render: () => {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'form-control';
                input.placeholder = 'Ej: 28';
                input.id = 'wizardAge';
                input.min = '0';
                input.max = '120';
                input.inputMode = 'numeric';
                return input;
            },
            read: (area) => String(area.querySelector('#wizardAge')?.value || '').trim(),
            validate: (val) => {
                if (!val) return '';
                const n = Number(val);
                if (!Number.isFinite(n)) return 'Edad inválida.';
                if (n < 0 || n > 120) return 'Edad fuera de rango.';
                return '';
            },
        },
    ];

    const state = {
        step: 0,
        accountType: '',
        phone: '',
        address: '',
        age: '',
    };

    function updateUI() {
        const stepText = qs('wizardStepText');
        const typeText = qs('wizardTypeText');
        const bar = qs('wizardStepBar');
        const title = qs('wizardTitle');
        const desc = qs('wizardDescription');
        const area = qs('wizardInputArea');
        const prevBtn = qs('wizardPrevBtn');
        const nextBtn = qs('wizardNextBtn');
        const err = qs('wizardError');

        if (!title || !desc || !area || !prevBtn || !nextBtn) return;

        const total = steps.length;
        const s = steps[state.step];

        if (stepText) stepText.textContent = `Paso ${state.step + 1} de ${total}`;
        if (typeText) typeText.textContent = state.accountType === 'empresa' ? 'Cuenta empresa' : 'Cuenta particular';
        if (bar) bar.style.width = `${Math.round(((state.step + 1) / total) * 100)}%`;

        title.textContent = s.title;
        desc.textContent = s.description;

        area.innerHTML = '';
        const node = s.render();
        area.appendChild(node);

        if (err) { err.textContent = ''; err.style.display = 'none'; }

        prevBtn.style.visibility = state.step === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = state.step === total - 1 ? 'Finalizar' : 'Continuar';

        // Restaurar valores
        if (state.step === 0) {
            const buttons = Array.from(area.querySelectorAll('.wizard-choice'));
            buttons.forEach(b => {
                b.addEventListener('click', () => {
                    buttons.forEach(x => x.classList.remove('selected'));
                    b.classList.add('selected');
                });
            });
            if (state.accountType) {
                const selected = area.querySelector(`.wizard-choice[data-value="${state.accountType}"]`);
                if (selected) selected.classList.add('selected');
            }
        }
        if (state.step === 1) area.querySelector('#wizardPhone') && (area.querySelector('#wizardPhone').value = state.phone || '');
        if (state.step === 2) area.querySelector('#wizardAddress') && (area.querySelector('#wizardAddress').value = state.address || '');
        if (state.step === 3) area.querySelector('#wizardAge') && (area.querySelector('#wizardAge').value = state.age || '');
    }

    function saveStepValue() {
        const area = qs('wizardInputArea');
        const err = qs('wizardError');
        const s = steps[state.step];
        const val = s.read(area);
        const msg = s.validate(val);

        if (msg) {
            if (err) { err.textContent = msg; err.style.display = 'block'; }
            return false;
        }

        if (state.step === 0) state.accountType = val;
        if (state.step === 1) state.phone = val;
        if (state.step === 2) state.address = val;
        if (state.step === 3) state.age = val;
        return true;
    }

    async function submitProfile() {
        const payload = {
            accountType: state.accountType,
            phone: state.phone,
            mainAddress: state.address,
            age: state.age ? Number(state.age) : null
        };

        const { res, data } = await apiJson('/profile/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error((data && data.error) ? data.error : 'No se pudo completar el perfil.');
        return data;
    }

    // =========================
    // Init
    // =========================
    (async () => {
        await ensureAuthReady();

        // Si no hay sesión -> login
        const st = window.huichplyAuth?.getAuthState?.() || {};
        if (!st.isLoggedIn) {
            const r = safeRedirectUrl() || (location.pathname + location.search);
            window.location.href = `/sesion?tab=login&redirect=${encodeURIComponent(r)}`;
            return;
        }

        // Si ya completó -> usuario
        if (st.user && st.user.accountType) {
            window.location.href = '/Usuario';
            return;
        }

        // mini email
        const mini = qs('userMiniEmail');
        const miniText = qs('userMiniEmailText');
        if (mini && miniText && st.user?.email) {
            miniText.textContent = st.user.email;
            mini.style.display = '';
        }

        updateUI();

        qs('wizardPrevBtn')?.addEventListener('click', () => {
            if (state.step > 0) state.step--;
            updateUI();
        });

        qs('wizardNextBtn')?.addEventListener('click', async () => {
            if (!saveStepValue()) return;

            if (state.step < steps.length - 1) {
                state.step++;
                updateUI();
                return;
            }

            // Finalizar
            const btn = qs('wizardNextBtn');
            if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

            try {
                await submitProfile();

                // refrescar sesión + cache
                await window.huichplyAuth?.syncSession?.();

                const r = safeRedirectUrl();
                window.location.href = r || '/Usuario';
            } catch (e) {
                const err = qs('wizardError');
                if (err) { err.textContent = e.message || 'Error guardando perfil.'; err.style.display = 'block'; }
                if (btn) { btn.disabled = false; btn.textContent = 'Finalizar'; }
            }
        });
    })();
})();
