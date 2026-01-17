// Carga del header (compat demo)
window.__huichplyHeaderLoaded = fetch('/header.html')
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

// Carga del footer (compat demo)
window.__huichplyFooterLoaded = fetch('/footer_componente.html')
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

// Estado de autenticación
const authState = {
    currentUser: null,
    isLoggedIn: false
};

// Obtener parámetro de URL
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Validar redirect interno
function isSafeInternalRedirect(p) {
    const v = String(p || '').trim();
    if (!v) return false;
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('//')) return false;
    if (v.startsWith('javascript:')) return false;
    return true;
}

function getSafeRedirect() {
    const r = getUrlParameter('redirect');
    return isSafeInternalRedirect(r) ? r : '';
}

// Elementos del DOM
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const emailOnlyBtn = document.getElementById('emailOnlyBtn');

// Cambiar entre pestañas
function switchTab(tabName) {
    if (tabName === 'register') {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'flex';
        loginForm.style.display = 'none';
    } else {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    }
}

// Construir URL de la pestaña manteniendo redirect
function buildTabUrl(tab) {
    const redirect = getUrlParameter('redirect');
    const base = `${window.location.pathname}?tab=${encodeURIComponent(tab)}`;
    return redirect ? `${base}&redirect=${encodeURIComponent(redirect)}` : base;
}

// Selección de pestaña al cargar
document.addEventListener('DOMContentLoaded', function () {
    const tabParam = getUrlParameter('tab');
    if (tabParam === 'register') switchTab('register');
    else switchTab('login');
});

// Clicks de pestañas
loginTab.addEventListener('click', () => {
    switchTab('login');
    history.replaceState(null, '', buildTabUrl('login'));
});

registerTab.addEventListener('click', () => {
    switchTab('register');
    history.replaceState(null, '', buildTabUrl('register'));
});

// Validaciones
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) errorElement.textContent = message;

    const inputId = elementId.replace('Error', '');
    const inputElement = document.getElementById(inputId);
    if (inputElement) inputElement.classList.add('error');
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) errorElement.textContent = '';

    const inputId = elementId.replace('Error', '');
    const inputElement = document.getElementById(inputId);
    if (inputElement) inputElement.classList.remove('error');
}

function ensureDb() {
    if (typeof window.db === 'undefined') {
        console.error('database.js no está cargado o no expone window.db');
        alert('No se pudo cargar el sistema de usuarios (database.js).');
        return false;
    }
    return true;
}

// Login con correo y contraseña
loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!ensureDb()) return;

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    let isValid = true;

    if (!email) {
        showError('loginEmailError', 'El correo electrónico es obligatorio');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('loginEmailError', 'Por favor, introduce un correo válido');
        isValid = false;
    } else {
        clearError('loginEmailError');
    }

    if (!password) {
        showError('loginPasswordError', 'La contraseña es obligatoria');
        isValid = false;
    } else if (!validatePassword(password)) {
        showError('loginPasswordError', 'La contraseña debe tener al menos 6 caracteres');
        isValid = false;
    } else {
        clearError('loginPasswordError');
    }

    if (!isValid) return;

    const user = window.db.findUserByEmail(email);

    if (user && user.password === password) {
        localStorage.setItem('yevhoUser', JSON.stringify(user));
        localStorage.setItem('yevhoIsLoggedIn', 'true');

        const redirect = getSafeRedirect();

        if (redirect) {
            window.location.href = redirect;
            return;
        }

        // Rutas objetivo en el nuevo esquema
        if (user.accountType) {
            window.location.href = '/Usuario';
        } else {
            window.location.href = '/cuenta_usuario';
        }
    } else {
        showError('loginEmailError', 'Correo o contraseña incorrectos');
    }
});

// Registro de usuario
registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!ensureDb()) return;

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    let isValid = true;

    if (!name) {
        showError('registerNameError', 'El nombre es obligatorio');
        isValid = false;
    } else {
        clearError('registerNameError');
    }

    if (!email) {
        showError('registerEmailError', 'El correo electrónico es obligatorio');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('registerEmailError', 'Por favor, introduce un correo válido');
        isValid = false;
    } else {
        clearError('registerEmailError');
    }

    if (!password) {
        showError('registerPasswordError', 'La contraseña es obligatoria');
        isValid = false;
    } else if (!validatePassword(password)) {
        showError('registerPasswordError', 'La contraseña debe tener al menos 6 caracteres');
        isValid = false;
    } else {
        clearError('registerPasswordError');
    }

    if (!confirmPassword) {
        showError('registerConfirmPasswordError', 'Confirma tu contraseña');
        isValid = false;
    } else if (password !== confirmPassword) {
        showError('registerConfirmPasswordError', 'Las contraseñas no coinciden');
        isValid = false;
    } else {
        clearError('registerConfirmPasswordError');
    }

    if (isValid && window.db.findUserByEmail(email)) {
        showError('registerEmailError', 'Este correo electrónico ya está registrado');
        isValid = false;
    }

    if (!isValid) return;

    const user = window.db.createUser({
        name: name,
        email: email,
        password: password,
        servicesCount: 0,
        rating: 0,
        addresses: []
    });

    localStorage.setItem('yevhoUser', JSON.stringify(user));
    localStorage.setItem('yevhoIsLoggedIn', 'true');

    const redirect = getSafeRedirect();
    if (redirect) {
        window.location.href = redirect;
        return;
    }

    if (user.accountType) {
        window.location.href = '/Usuario';
    } else {
        window.location.href = '/cuenta_usuario';
    }
});

// Login solo con correo
emailOnlyBtn.addEventListener('click', function () {
    if (!ensureDb()) return;

    const email = prompt('Por favor, introduce tu correo electrónico:');

    if (!email) return;

    if (!validateEmail(email)) {
        alert('Por favor, introduce un correo electrónico válido');
        return;
    }

    const redirect = getSafeRedirect();
    let user = window.db.findUserByEmail(email);

    if (user) {
        localStorage.setItem('yevhoUser', JSON.stringify(user));
        localStorage.setItem('yevhoIsLoggedIn', 'true');

        if (redirect) window.location.href = redirect;
        else window.location.href = user.accountType ? '/Usuario' : '/cuenta_usuario';
        return;
    }

    user = window.db.createUser({
        name: email.split('@')[0],
        email: email,
        password: '',
        servicesCount: Math.floor(Math.random() * 10) + 1,
        rating: (Math.random() * 2 + 3).toFixed(1),
        addresses: [
            'Calle Principal 123, Madrid',
            'Avenida Secundaria 45, Barcelona'
        ]
    });

    localStorage.setItem('yevhoUser', JSON.stringify(user));
    localStorage.setItem('yevhoIsLoggedIn', 'true');

    if (redirect) window.location.href = redirect;
    else window.location.href = user.accountType ? '/Usuario' : '/cuenta_usuario';
});
