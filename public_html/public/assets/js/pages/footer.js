(function () {
    function setFooterYear() {
        document.querySelectorAll(".yv-footer").forEach(function (footer) {
            var yearEl = footer.querySelector("[data-yv-footer-year]");
            if (yearEl) yearEl.textContent = String(new Date().getFullYear());
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setFooterYear);
    } else {
        setFooterYear();
    }
})();
