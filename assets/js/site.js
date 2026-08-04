(function () {
  "use strict";

  const body = document.body;
  const sidebar = document.getElementById("siteSidebar");
  const menuButton = document.getElementById("menuButton");
  const closeButton = document.getElementById("sidebarCloseButton");
  const backdrop = document.getElementById("sidebarBackdrop");
  const dashboardToggle = document.getElementById("dashboardMenuButton");
  const dashboardMenu = document.getElementById("dashboardMenu");

  function markCurrentDashboard() {
    if (!dashboardMenu) return;
    const currentPage = window.location.pathname.split("/").pop();
    dashboardMenu.querySelectorAll("a[href]").forEach(link => {
      const active = link.getAttribute("href") === currentPage;
      link.toggleAttribute("aria-current", active);
      link.classList.toggle("bg-pyo-700", active);
      link.classList.toggle("font-semibold", active);
      link.classList.toggle("text-white", active);
      link.classList.toggle("text-slate-300", !active);
    });
  }

  function setSidebarOpen(open) {
    if (!sidebar || !backdrop || !menuButton) return;
    sidebar.classList.toggle("-translate-x-full", !open);
    backdrop.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    body.classList.toggle("overflow-hidden", open);
    if (open) closeButton?.focus();
  }

  function setDashboardMenuOpen(open) {
    if (!dashboardMenu || !dashboardToggle) return;
    dashboardMenu.hidden = !open;
    dashboardToggle.setAttribute("aria-expanded", String(open));
    dashboardToggle.querySelector("[data-chevron]")?.classList.toggle("rotate-180", open);
  }

  menuButton?.addEventListener("click", () => setSidebarOpen(true));
  closeButton?.addEventListener("click", () => setSidebarOpen(false));
  backdrop?.addEventListener("click", () => setSidebarOpen(false));
  dashboardToggle?.addEventListener("click", () => {
    setDashboardMenuOpen(dashboardMenu?.hidden ?? true);
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    setSidebarOpen(false);
    setDashboardMenuOpen(false);
  });

  window.matchMedia("(min-width: 1024px)").addEventListener("change", event => {
    if (event.matches) setSidebarOpen(false);
  });

  markCurrentDashboard();
})();
