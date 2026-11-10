(function () {
  "use strict";

  const body = document.body;
  const sidebar = document.getElementById("siteSidebar");
  const menuButton = document.getElementById("menuButton");
  const closeButton = document.getElementById("sidebarCloseButton");
  const backdrop = document.getElementById("sidebarBackdrop");
  const dashboardToggle = document.getElementById("dashboardMenuButton");
  const dashboardMenu = document.getElementById("dashboardMenu");
  const sdg4Toggle = document.getElementById("sdg4MenuButton");
  const sdg4Menu = document.getElementById("sdg4Menu");

  function markCurrentLinks(menu) {
    if (!menu) return;
    const currentPage = window.location.pathname.split("/").pop();
    menu.querySelectorAll("a[href]").forEach(link => {
      const linkPage = link.getAttribute("href")?.split("/").pop();
      const active = linkPage === currentPage;
      link.toggleAttribute("aria-current", active);
      link.classList.toggle(menu === sdg4Menu ? "bg-emerald-700" : "bg-pyo-700", active);
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

  function setSdg4MenuOpen(open) {
    if (!sdg4Menu || !sdg4Toggle) return;
    sdg4Menu.hidden = !open;
    sdg4Toggle.setAttribute("aria-expanded", String(open));
    sdg4Toggle.querySelector("[data-chevron]")?.classList.toggle("rotate-180", open);
  }

  menuButton?.addEventListener("click", () => setSidebarOpen(true));
  closeButton?.addEventListener("click", () => setSidebarOpen(false));
  backdrop?.addEventListener("click", () => setSidebarOpen(false));
  dashboardToggle?.addEventListener("click", () => {
    setDashboardMenuOpen(dashboardMenu?.hidden ?? true);
  });
  sdg4Toggle?.addEventListener("click", () => {
    setSdg4MenuOpen(sdg4Menu?.hidden ?? true);
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    setSidebarOpen(false);
    setDashboardMenuOpen(false);
    setSdg4MenuOpen(false);
  });

  window.matchMedia("(min-width: 1024px)").addEventListener("change", event => {
    if (event.matches) setSidebarOpen(false);
  });

  markCurrentLinks(dashboardMenu);
  markCurrentLinks(sdg4Menu);
})();
