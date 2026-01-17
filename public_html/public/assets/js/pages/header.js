/* File: public/assets/js/header.js */
(function () {
    if (window.__huichplyHeaderMounted) return;
    window.__huichplyHeaderMounted = true;

    // Rutas base (ajusta aquí si cambian en el router)
    const ROUTES = {
        home: "/",
        sesion: "/sesion",
        cuenta: "/cuenta_usuario",
        usuario: "/Usuario",
        pedidos: "/Pedidos",
        valorar: "/Valorar",
        valoraciones: "/valoraciones",
    };

    // Claves de storage (incluye lectura/limpieza de claves antiguas)
    const STORAGE = {
        loggedInNew: "huichplyIsLoggedIn",
        userNew: "huichplyUser",
        loggedInOld: "yevhoIsLoggedIn",
        userOld: "yevhoUser",
    };

    function escapeHtml(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeRouteKey() {
        const raw = (location.pathname || "/").replace(/\/+$/, "");
        const seg = raw.split("/").pop() || "";
        if (!seg || seg.toLowerCase() === "index.php") return "home";
        return seg.replace(/\.(php|html)$/i, "").toLowerCase();
    }

    function currentRelativeUrl() {
        const p = location.pathname || "/";
        return p + (location.search || "") + (location.hash || "");
    }

    function isSafeInternalRedirect(p) {
        const v = String(p || "").trim();
        if (!v) return false;
        if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("//")) return false;
        if (v.startsWith("javascript:")) return false;
        return true;
    }

    function buildSessionUrl(tab, redirect) {
        const safe = isSafeInternalRedirect(redirect) ? redirect : "";
        const base = `${ROUTES.sesion}?tab=${encodeURIComponent(tab || "login")}`;
        return safe ? `${base}&redirect=${encodeURIComponent(safe)}` : base;
    }

    function readUserJson(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "null");
        } catch (_) {
            return null;
        }
    }

    function getAuthState() {
        const isLoggedInNew = localStorage.getItem(STORAGE.loggedInNew) === "true";
        const isLoggedInOld = localStorage.getItem(STORAGE.loggedInOld) === "true";

        const userNew = readUserJson(STORAGE.userNew);
        const userOld = readUserJson(STORAGE.userOld);

        const user = userNew || userOld || null;
        const isLoggedIn = Boolean((isLoggedInNew || isLoggedInOld) && user);

        return { isLoggedIn, user };
    }

    function dispatchAuthChanged(detail) {
        try {
            document.dispatchEvent(new CustomEvent("huichply:auth-changed", { detail }));
        } catch (_) { }

        // Compatibilidad con eventos antiguos
        try {
            document.dispatchEvent(new CustomEvent("yevho:auth-changed", { detail }));
        } catch (_) { }
    }

    function logout(redirectTo) {
        localStorage.removeItem(STORAGE.userNew);
        localStorage.removeItem(STORAGE.loggedInNew);
        localStorage.removeItem(STORAGE.userOld);
        localStorage.removeItem(STORAGE.loggedInOld);

        dispatchAuthChanged({ isLoggedIn: false, user: null });
        window.location.href = redirectTo || ROUTES.home;
    }

    function goToLogin(redirectTo) {
        const r = isSafeInternalRedirect(redirectTo) ? redirectTo : currentRelativeUrl();
        window.location.href = buildSessionUrl("login", r);
    }

    function goToCompleteProfile(redirectTo) {
        const r = isSafeInternalRedirect(redirectTo) ? redirectTo : currentRelativeUrl();
        window.location.href = `${ROUTES.cuenta}?redirect=${encodeURIComponent(r)}`;
    }

    function requireAuth(opts) {
        const options = Object.assign(
            {
                requireCompleteProfile: false,
                redirectTo: currentRelativeUrl(),
            },
            opts || {}
        );

        const { isLoggedIn, user } = getAuthState();
        if (!isLoggedIn || !user) {
            goToLogin(options.redirectTo);
            return null;
        }

        if (options.requireCompleteProfile && !user.accountType) {
            goToCompleteProfile(options.redirectTo);
            return null;
        }

        return user;
    }

    // API pública para páginas
    window.huichplyAuth = {
        getAuthState,
        isLoggedIn: () => getAuthState().isLoggedIn,
        getUser: () => getAuthState().user,
        logout,
        requireAuth,
        goToLogin,
        goToCompleteProfile,
    };

    // Alias de compatibilidad
    window.yevhoAuth = window.huichplyAuth;

    function protectRoute() {
        const key = normalizeRouteKey();

        const RULES = {
            pedidos: { requireCompleteProfile: true },
            usuario: { requireCompleteProfile: true },
            valorar: { requireCompleteProfile: true },
            valoraciones: { requireCompleteProfile: true },
            cuenta_usuario: { requireCompleteProfile: false },
        };

        // Si ya hay perfil completo y entra a completar cuenta, redirige al perfil
        if (key === "cuenta_usuario") {
            const { isLoggedIn, user } = getAuthState();
            if (isLoggedIn && user && user.accountType) {
                window.location.href = ROUTES.usuario;
                return true;
            }
        }

        if (RULES[key]) {
            const u = requireAuth(Object.assign({ redirectTo: currentRelativeUrl() }, RULES[key]));
            if (!u) return true;
        }

        return false;
    }

    function renderAuth() {
        const authSection = document.getElementById("authSection");
        const mobileAuthSection = document.getElementById("mobileAuthSection");
        if (!authSection || !mobileAuthSection) return;

        const { isLoggedIn, user } = getAuthState();
        const redirect = currentRelativeUrl();

        if (isLoggedIn && user) {
            const displayNameRaw = user.name || user.companyName || "Usuario";
            const displayName = escapeHtml(displayNameRaw);
            const email = escapeHtml(user.email || "correo@ejemplo.com");
            const userInitial = escapeHtml(String(displayNameRaw).trim().charAt(0).toUpperCase() || "U");
            const userType = user.accountType === "empresa" ? "Empresa" : "Cliente";
            const profileHref = ROUTES.usuario;

            authSection.innerHTML = `
        <div class="user-menu">
          <button class="user-pill" id="userMenuButton" type="button" aria-haspopup="true" aria-expanded="false">
            <div class="avatar-initial">${userInitial}</div>
            <div class="user-meta">
              <span class="user-name">${displayName}</span>
              <span class="user-tier">${escapeHtml(userType)}</span>
            </div>
            <span class="user-caret">▾</span>
          </button>
          <div class="user-dropdown" id="userDropdown" aria-label="Menú de usuario">
            <div class="user-dropdown-header">
              <div class="avatar-initial">${userInitial}</div>
              <div class="user-meta">
                <span class="user-name">${displayName}</span>
                <small>${email}</small>
              </div>
            </div>
            <a href="${profileHref}">Ver perfil</a>
            <button type="button" id="logoutBtn">Cerrar sesión</button>
          </div>
        </div>
      `;

            mobileAuthSection.innerHTML = `
        <div class="mobile-user-box">
          <div class="mobile-user-row">
            <div class="avatar-initial">${userInitial}</div>
            <div class="user-meta" style="align-items:center;">
              <span class="user-name">${displayName}</span>
              <span class="user-tier">${escapeHtml(userType)}</span>
            </div>
          </div>
          <small class="mobile-user-email">${email}</small>
        </div>
        <a href="${profileHref}">Mi perfil</a>
        <button type="button" id="mobileLogoutBtn">Cerrar sesión</button>
      `;
        } else {
            const loginUrl = buildSessionUrl("login", redirect);
            const registerUrl = buildSessionUrl("register", redirect);

            authSection.innerHTML = `
        <a href="${loginUrl}">Entrar</a>
        <a href="${registerUrl}" class="signup">Crear cuenta</a>
      `;

            mobileAuthSection.innerHTML = `
        <a href="${loginUrl}">Entrar</a>
        <a href="${registerUrl}" class="signup">Crear cuenta</a>
      `;
        }
    }

    let authWiringAbort = null;

    function wireAuthInteractions() {
        if (authWiringAbort) authWiringAbort.abort();
        authWiringAbort = new AbortController();
        const signal = authWiringAbort.signal;

        const userMenuButton = document.getElementById("userMenuButton");
        const userDropdown = document.getElementById("userDropdown");
        const logoutBtn = document.getElementById("logoutBtn");
        const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

        if (userMenuButton && userDropdown) {
            userMenuButton.addEventListener(
                "click",
                (e) => {
                    e.stopPropagation();
                    const isActive = userDropdown.classList.toggle("active");
                    userMenuButton.setAttribute("aria-expanded", isActive ? "true" : "false");
                },
                { signal }
            );

            document.addEventListener(
                "click",
                (event) => {
                    if (!userDropdown.contains(event.target) && !userMenuButton.contains(event.target)) {
                        userDropdown.classList.remove("active");
                        userMenuButton.setAttribute("aria-expanded", "false");
                    }
                },
                { signal }
            );

            document.addEventListener(
                "keydown",
                (e) => {
                    if (e.key === "Escape") {
                        userDropdown.classList.remove("active");
                        userMenuButton.setAttribute("aria-expanded", "false");
                    }
                },
                { signal }
            );
        }

        if (logoutBtn) logoutBtn.addEventListener("click", () => logout(ROUTES.home), { signal });
        if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", () => logout(ROUTES.home), { signal });
    }

    function initScrollEffect() {
        const header = document.querySelector(".site-header");
        if (!header) return;

        function onScroll() {
            if (window.scrollY > 50) header.classList.add("scrolled");
            else header.classList.remove("scrolled");
        }

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
    }

    function initMobileMenu() {
        const mobileMenuToggle = document.getElementById("mobileMenuToggle");
        const mobileMenu = document.getElementById("mobileMenu");
        if (!mobileMenuToggle || !mobileMenu) return;

        function setMenu(open) {
            mobileMenu.classList.toggle("active", open);
            mobileMenuToggle.textContent = open ? "✕" : "☰";
            mobileMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
            if (open) mobileMenu.removeAttribute("hidden");
            else mobileMenu.setAttribute("hidden", "");
        }

        mobileMenuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            const open = !mobileMenu.classList.contains("active");
            setMenu(open);
        });

        mobileMenu.addEventListener("click", (e) => {
            const t = e.target;
            if (t && t.matches("a, button")) setMenu(false);
        });

        document.addEventListener("click", (event) => {
            if (!mobileMenu.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                setMenu(false);
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") setMenu(false);
        });

        window.addEventListener(
            "resize",
            () => {
                if (window.innerWidth > 1150) setMenu(false);
            },
            { passive: true }
        );
    }

    function initHeaderHeightSync() {
        const header = document.querySelector(".site-header");
        if (!header) return;

        const update = () => {
            const h = Math.ceil(header.getBoundingClientRect().height);
            document.documentElement.style.setProperty("--header-h", h + "px");
        };

        update();
        setTimeout(update, 0);
        setTimeout(update, 120);

        if ("ResizeObserver" in window) {
            const ro = new ResizeObserver(update);
            ro.observe(header);
        } else {
            window.addEventListener("resize", update, { passive: true });
            window.addEventListener("orientationchange", update, { passive: true });
        }
    }

    function refreshAuthUI() {
        renderAuth();
        wireAuthInteractions();

        try {
            const header = document.querySelector(".site-header");
            if (header) {
                const h = Math.ceil(header.getBoundingClientRect().height);
                document.documentElement.style.setProperty("--header-h", h + "px");
            }
        } catch (_) { }
    }

    // Inicio
    if (protectRoute()) return;

    initScrollEffect();
    initMobileMenu();
    refreshAuthUI();
    initHeaderHeightSync();

    window.addEventListener("storage", (e) => {
        if (
            e.key === STORAGE.userNew ||
            e.key === STORAGE.loggedInNew ||
            e.key === STORAGE.userOld ||
            e.key === STORAGE.loggedInOld
        ) {
            refreshAuthUI();
        }
    });

    document.addEventListener("huichply:auth-changed", refreshAuthUI);
    document.addEventListener("yevho:auth-changed", refreshAuthUI);

    try {
        document.dispatchEvent(new CustomEvent("huichply:header-ready"));
    } catch (_) { }

    try {
        document.dispatchEvent(new CustomEvent("yevho:header-ready"));
    } catch (_) { }
})();
