/* File: /assets/js/footer.js */
(function () {
    'use strict';

    function setFooterYear() {
        document.querySelectorAll(".yv-footer").forEach(function (footer) {
            var yearEl = footer.querySelector("[data-yv-footer-year]");
            if (yearEl) yearEl.textContent = String(new Date().getFullYear());
        });
    }

    // Si el footer se inserta por fetch después de DOMContentLoaded,
    // intentamos también cuando el header avisa que está listo (opcional)
    function boot() {
        setFooterYear();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    document.addEventListener("huichply:header-ready", function () {
        setFooterYear();
    });
})();
