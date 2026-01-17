/* File: /assets/js/header.js */
(function () {
    'use strict';

    if (window.__huichplyHeaderMounted) return;
    window.__huichplyHeaderMounted = true;

    // =========================
    // RUTAS (NO CAMBIAR)
    // =========================
    const ROUTES = {
        home: "/",
        sesion: "/sesion",
        cuenta: "/cuenta_usuario",
        usuario: "/Usuario",
        pedidos: "/Pedidos",
        valorar: "/Valorar",
        valoraciones: "/valoraciones",
    };

    // =========================
    // STORAGE (solo cache UI)
    // =========================
    const STORAGE = {
        loggedInNew: "huichplyIsLoggedIn",
        userNew: "huichplyUser",
        loggedInOld: "yevhoIsLoggedIn",
        userOld: "yevhoUser",
    };

    // =========================
    // API BASE
    // =========================
    function apiBase() {
        const cfg = window.huichplyConfig || {};
        return String(cfg.apiBase || "/api").replace(/\/$/, "");
    }

    // =========================
    // HELPERS
    // =========================
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
        return (location.pathname || "/") + (location.search || "") + (location.hash || "");
    }

    function isSafeInternalRedirect(p) {
        const v = String(p || "").trim();
        if (!v) return false;
        if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("//")) return false;
        if (v.toLowerCase().startsWith("javascript:")) return false;
        if (v.includes("..")) return false;
        return true;
    }

    function buildSessionUrl(tab, redirect) {
        const safe = isSafeInternalRedirect(redirect) ? redirect : "";
        const base = `${ROUTES.sesion}?tab=${encodeURIComponent(tab || "login")}`;
        return safe ? `${base}&redirect=${encodeURIComponent(safe)}` : base;
    }

    function readUserJson(key) {
        try { return JSON.parse(localStorage.getItem(key) || "null"); }
        catch (_) { return null; }
    }

    function clearAuthCache() {
        localStorage.removeItem(STORAGE.userNew);
        localStorage.removeItem(STORAGE.loggedInNew);
        localStorage.removeItem(STORAGE.userOld);
        localStorage.removeItem(STORAGE.loggedInOld);
    }

    function writeAuthCache(user) {
        // Guardar en NEW
        localStorage.setItem(STORAGE.userNew, JSON.stringify(user || null));
        localStorage.setItem(STORAGE.loggedInNew, user ? "true" : "false");

        // Compat LEGACY
        localStorage.setItem(STORAGE.userOld, JSON.stringify(user || null));
        localStorage.setItem(STORAGE.loggedInOld, user ? "true" : "false");
    }

    function getAuthStateFromCache() {
        const isLoggedInNew = localStorage.getItem(STORAGE.loggedInNew) === "true";
        const isLoggedInOld = localStorage.getItem(STORAGE.loggedInOld) === "true";

        const userNew = readUserJson(STORAGE.userNew);
        const userOld = readUserJson(STORAGE.userOld);

        const user = userNew || userOld || null;
        const isLoggedIn = Boolean((isLoggedInNew || isLoggedInOld) && user);

        return { isLoggedIn, user };
    }

    function dispatchAuthChanged(detail) {
        try { document.dispatchEvent(new CustomEvent("huichply:auth-changed", { detail })); } catch (_) { }
        try { document.dispatchEvent(new CustomEvent("yevho:auth-changed", { detail })); } catch (_) { }
    }

    // =========================
    // CSRF (cookie) + API fetch
    // =========================
    function getCookie(name) {
        const cookies = document.cookie ? document.cookie.split(";") : [];
        for (const c of cookies) {
            const s = c.trim();
            if (!s) continue;
            if (s.startsWith(name + "=")) return decodeURIComponent(s.slice(name.length + 1));
        }
        return "";
    }

    // ✅ Unificado con sesion.js / cuenta_usuario.js
    function getCsrfToken() {
        return getCookie("XSRF-TOKEN");
    }

    async function ensureCsrfToken() {
        const existing = getCsrfToken();
        if (existing) return existing;

        try {
            await fetch(`${apiBase()}/csrf`, {
                method: "GET",
                credentials: "include",
                headers: { Accept: "application/json" },
            });
        } catch (_) { }

        return getCsrfToken();
    }

    async function apiJson(path, opts) {
        const method = (opts && opts.method) ? String(opts.method).toUpperCase() : "GET";
        const headers = Object.assign({ Accept: "application/json" }, (opts && opts.headers) ? opts.headers : {});
        const body = (opts && "body" in opts) ? opts.body : undefined;

        // CSRF solo en métodos mutadores
        if (method !== "GET" && method !== "HEAD") {
            const csrf = await ensureCsrfToken();
            if (csrf) headers["X-CSRF-Token"] = csrf;
        }

        const res = await fetch(`${apiBase()}${path}`, {
            method,
            headers,
            body,
            credentials: "include",
        });

        let data = null;
        try { data = await res.json(); } catch (_) { }
        return { res, data };
    }

    // =========================
    // Sync sesión real (cookie HttpOnly)
    // =========================
    async function syncSession() {
        try {
            const { res, data } = await apiJson("/auth/me", { method: "GET" });

            if (res.ok && data && data.user) {
                writeAuthCache(data.user);
                dispatchAuthChanged({ isLoggedIn: true, user: data.user });
                return { isLoggedIn: true, user: data.user };
            }

            clearAuthCache();
            dispatchAuthChanged({ isLoggedIn: false, user: null });
            return { isLoggedIn: false, user: null };
        } catch (_) {
            // fallback cache local (modo degradado)
            return getAuthStateFromCache();
        }
    }

    async function logout(redirectTo) {
        try { await apiJson("/auth/logout", { method: "POST" }); } catch (_) { }
        clearAuthCache();
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
            { requireCompleteProfile: false, redirectTo: currentRelativeUrl() },
            opts || {}
        );

        const { isLoggedIn, user } = getAuthStateFromCache();
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

    // =========================
    // API pública (para páginas)
    // =========================
    window.huichplyAuth = {
        ROUTES,
        ready: null,
        syncSession,
        requireAuth,
        logout,
        goToLogin,
        goToCompleteProfile,
        getAuthState: getAuthStateFromCache,
        getUser: () => getAuthStateFromCache().user,
        isLoggedIn: () => getAuthStateFromCache().isLoggedIn,
        ensureCsrfToken,
        getCsrfToken,
        apiJson,
    };
    window.yevhoAuth = window.huichplyAuth;

    // =========================
    // Protección de rutas
    // =========================
    function protectRoute() {
        const key = normalizeRouteKey();

        // ✅ valoraciones ES PUBLICA -> NO se protege
        const RULES = {
            pedidos: { requireCompleteProfile: true },
            usuario: { requireCompleteProfile: true },
            valorar: { requireCompleteProfile: true },
            cuenta_usuario: { requireCompleteProfile: false },
        };

        // Si ya completó perfil y está en /cuenta_usuario -> lo mandamos a /Usuario
        if (key === "cuenta_usuario") {
            const { isLoggedIn, user } = getAuthStateFromCache();
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

    // =========================
    // Render UI auth
    // =========================
    function renderAuth() {
        const authSection = document.getElementById("authSection");
        const mobileAuthSection = document.getElementById("mobileAuthSection");
        if (!authSection || !mobileAuthSection) return;

        const { isLoggedIn, user } = getAuthStateFromCache();
        const redirect = currentRelativeUrl();

        if (isLoggedIn && user) {
            const displayNameRaw = user.name || user.companyName || "Usuario";
            const displayName = escapeHtml(displayNameRaw);
            const email = escapeHtml(user.email || "");
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
            userMenuButton.addEventListener("click", (e) => {
                e.stopPropagation();
                const isActive = userDropdown.classList.toggle("active");
                userMenuButton.setAttribute("aria-expanded", isActive ? "true" : "false");
            }, { signal });

            document.addEventListener("click", (event) => {
                if (!userDropdown.contains(event.target) && !userMenuButton.contains(event.target)) {
                    userDropdown.classList.remove("active");
                    userMenuButton.setAttribute("aria-expanded", "false");
                }
            }, { signal });

            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    userDropdown.classList.remove("active");
                    userMenuButton.setAttribute("aria-expanded", "false");
                }
            }, { signal });
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

        window.addEventListener("resize", () => {
            if (window.innerWidth > 1150) setMenu(false);
        }, { passive: true });
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

    // =========================
    // INIT
    // =========================
    const ready = syncSession();
    window.huichplyAuth.ready = ready;

    (async function init() {
        await ready;

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

        try { document.dispatchEvent(new CustomEvent("huichply:header-ready")); } catch (_) { }
        try { document.dispatchEvent(new CustomEvent("yevho:header-ready")); } catch (_) { }
    })();
})();
