/* Carga de componentes (compat demo) */
window.__yevhoHeaderLoaded = fetch('/header.html')
    .then(r => r.text())
    .then(html => {
        const container = document.getElementById('header-container');
        if (!container) return;

        container.innerHTML = html;

        // Re-ejecutar scripts internos del componente
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

        // Re-ejecutar scripts internos del componente
        [...container.querySelectorAll('script')].forEach(oldScript => {
            const s = document.createElement('script');
            if (oldScript.src) s.src = oldScript.src;
            else s.textContent = oldScript.textContent;
            document.body.appendChild(s);
            oldScript.remove();
        });
    })
    .catch(err => console.error('Error cargando el footer:', err));

/* ===========================
   Wizard: completar cuenta
   =========================== */

// Usuario en sesión (demo: localStorage)
function getStoredUser() {
    try {
        const isLogged = localStorage.getItem('yevhoIsLoggedIn') === 'true';
        if (!isLogged) return null;

        const raw = localStorage.getItem('yevhoUser');
        if (!raw) return null;

        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

// Query params
function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || '';
}

// Redirección interna segura (sin protocolos, sin //, sin ..)
function isSafeInternalRedirect(p) {
    const v = String(p || '').trim();
    if (!v) return false;
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('//')) return false;
    if (v.toLowerCase().startsWith('javascript:')) return false;
    if (v.includes('..')) return false;
    return true;
}

/* Teléfono ES */
function parseESPhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    let d = digits;

    if (d.startsWith('0034')) d = d.slice(4);
    else if (d.startsWith('34')) d = d.slice(2);

    const national = d.slice(0, 9);
    return { national };
}

function formatESPhone(rawOrNationalDigits) {
    const { national } = parseESPhone(rawOrNationalDigits);
    const a = national.slice(0, 3);
    const b = national.slice(3, 6);
    const c = national.slice(6, 9);

    let out = '+34';
    if (a) out += ' ' + a;
    if (b) out += ' ' + b;
    if (c) out += ' ' + c;
    return out;
}

function isValidESPhone(raw) {
    const { national } = parseESPhone(raw);
    return national.length === 9;
}

/* Pasos (particular) */
const stepsConfig = [
    {
        id: 'fullName',
        label: '¿Cómo te llamas?',
        description: 'Nombre y apellidos tal y como aparecerán en tus reservas.',
        type: 'text',
        placeholder: 'Nombre y apellidos',
        autocomplete: 'name'
    },
    {
        id: 'age',
        label: '¿Qué edad tienes?',
        description: 'Solo para fines internos y estadísticas. No compartimos este dato.',
        type: 'number',
        placeholder: 'Tu edad en años',
        min: 18,
        max: 99
    },
    {
        id: 'phone',
        label: '¿Cuál es tu número de contacto?',
        description: 'Lo utilizaremos para confirmar horarios por WhatsApp o llamada.',
        type: 'tel',
        placeholder: '+34 600 123 456'
    },
    {
        id: 'address',
        label: '¿Cuál es tu dirección principal?',
        description: 'Puedes usarla como origen o destino habitual. Incluye código postal.',
        type: 'text',
        placeholder: 'Calle, número, piso, ciudad, código postal'
    }
];

let currentStepIndex = 0;
let currentData = {};
let userCache = null;

document.addEventListener('DOMContentLoaded', function () {
    const user = getStoredUser();
    userCache = user;

    if (!user) {
        window.location.href = '/sesion?tab=register';
        return;
    }

    const mini = document.getElementById('userMiniEmail');
    const miniText = document.getElementById('userMiniEmailText');
    if (user.email && mini && miniText) {
        miniText.textContent = user.email;
        mini.style.display = 'block';
    }

    currentData = getInitialData(user);
    renderWizard();

    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            if (currentStepIndex > 0) {
                currentStepIndex--;
                renderWizard();
            } else {
                window.location.href = '/';
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            handleNext();
        });
    }
});

function getInitialData(user) {
    user = user || {};
    const addr = Array.isArray(user.addresses) && user.addresses.length ? user.addresses[0] : (user.mainAddress || '');
    const phone = user.phone ? formatESPhone(user.phone) : '';
    return {
        fullName: user.name || '',
        age: user.age ? String(user.age) : '',
        phone: phone,
        address: addr || ''
    };
}

function renderWizard() {
    const step = stepsConfig[currentStepIndex];

    const titleEl = document.getElementById('wizardTitle');
    const descEl = document.getElementById('wizardDescription');
    const stepTextEl = document.getElementById('wizardStepText');
    const typeTextEl = document.getElementById('wizardTypeText');
    const barEl = document.getElementById('wizardStepBar');
    const inputArea = document.getElementById('wizardInputArea');
    const errorEl = document.getElementById('wizardError');
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');

    if (!step || !titleEl || !descEl || !stepTextEl || !inputArea || !barEl) return;

    if (typeTextEl) typeTextEl.textContent = 'Cuenta particular';

    stepTextEl.textContent = 'Paso ' + (currentStepIndex + 1) + ' de ' + stepsConfig.length;

    const progress = ((currentStepIndex + 1) / stepsConfig.length) * 100;
    barEl.style.width = progress + '%';

    titleEl.textContent = step.label;
    descEl.textContent = step.description || '';

    if (errorEl) errorEl.textContent = '';
    inputArea.innerHTML = '';

    if (prevBtn) prevBtn.style.display = currentStepIndex === 0 ? 'none' : 'inline-flex';

    if (nextBtn) {
        nextBtn.textContent = (currentStepIndex === stepsConfig.length - 1)
            ? 'Guardar y continuar'
            : 'Continuar';
    }

    const input = document.createElement('input');
    input.className = 'form-control';
    input.id = 'wizardInput';
    input.type = step.type || 'text';
    input.placeholder = step.placeholder || '';
    if (step.autocomplete) input.autocomplete = step.autocomplete;
    if (typeof step.min !== 'undefined') input.min = step.min;
    if (typeof step.max !== 'undefined') input.max = step.max;

    if (step.id === 'age') input.inputMode = 'numeric';
    if (step.id === 'phone') input.inputMode = 'tel';

    input.value = currentData[step.id] || '';

    if (step.id === 'phone') {
        if (input.value && input.value.trim()) input.value = formatESPhone(input.value);

        input.addEventListener('input', function () {
            input.classList.remove('error');
            if (errorEl) errorEl.textContent = '';

            const onlyDigits = String(input.value || '').replace(/\D/g, '');
            if (!onlyDigits) {
                input.value = '';
                return;
            }

            input.value = formatESPhone(input.value);
            try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) { }
        });
    } else {
        input.addEventListener('input', function () {
            input.classList.remove('error');
            if (errorEl) errorEl.textContent = '';
        });
    }

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNext();
        }
    });

    inputArea.appendChild(input);
    input.focus();
}

function handleNext() {
    const step = stepsConfig[currentStepIndex];
    const errorEl = document.getElementById('wizardError');
    if (!step) return;

    if (errorEl) errorEl.textContent = '';

    const input = document.getElementById('wizardInput');
    if (!input) return;

    let value = (input.value || '').trim();

    if (!value) {
        input.classList.add('error');
        if (errorEl) errorEl.textContent = 'Por favor, completa este dato para continuar.';
        return;
    }

    if (step.id === 'age') {
        const ageNum = parseInt(value, 10);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
            input.classList.add('error');
            if (errorEl) errorEl.textContent = 'Introduce una edad válida (entre 18 y 99 años).';
            return;
        }
    }

    if (step.id === 'phone') {
        if (!isValidESPhone(value)) {
            input.classList.add('error');
            if (errorEl) errorEl.textContent = 'Introduce un número válido de 9 dígitos (España).';
            return;
        }
        value = formatESPhone(value);
        input.value = value;
    }

    currentData[step.id] = value;

    if (currentStepIndex < stepsConfig.length - 1) {
        currentStepIndex++;
        renderWizard();
    } else {
        handleFinish();
    }
}

function handleFinish() {
    let user = getStoredUser();
    if (!user) {
        window.location.href = '/sesion?tab=login';
        return;
    }

    const now = new Date();
    const year = String(now.getFullYear());

    const fullName = (currentData.fullName || '').trim();
    const ageNum = parseInt(currentData.age || '', 10);
    const phone = (currentData.phone || '').trim();
    const address = (currentData.address || '').trim();

    user.accountType = 'particular';
    if (fullName) user.name = fullName;
    if (!isNaN(ageNum)) user.age = ageNum;
    if (phone) user.phone = phone;
    if (address) {
        user.addresses = [address];
        user.mainAddress = address;
    }
    if (!user.memberSince) user.memberSince = year;

    // Persistencia demo (database.js)
    if (window.db && typeof window.db.updateUser === 'function') {
        window.db.updateUser(user.id, user);
    } else {
        console.warn('db.updateUser no está disponible (database.js).');
    }

    localStorage.setItem('yevhoUser', JSON.stringify(user));
    localStorage.setItem('yevhoIsLoggedIn', 'true');

    const redirect = getQueryParam('redirect');
    if (isSafeInternalRedirect(redirect)) window.location.href = redirect;
    else window.location.href = '/Usuario';
}
