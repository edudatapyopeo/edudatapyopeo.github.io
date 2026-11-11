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
    });
  }

  const icon = name => ({
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    sdg4: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21c-2.2-2.5-3.3-5.5-3.3-9S9.8 5.5 12 3Z"/></svg>'
  }[name] || "");

  function applyNavigationIcons() {
    const homeIcon = sidebar?.querySelector('nav > a span[aria-hidden="true"]');
    const dashboardIcon = dashboardToggle?.querySelector('span[aria-hidden="true"]');
    const sdg4Icon = sdg4Toggle?.querySelector('span[aria-hidden="true"]');
    if (homeIcon) homeIcon.innerHTML = icon("home");
    if (dashboardIcon) dashboardIcon.innerHTML = icon("dashboard");
    if (sdg4Icon) sdg4Icon.innerHTML = icon("sdg4");
  }

  function applyCardIcons() {
    const cardIcons = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2M8 14h2m4 0h2M9 21v-3h6v3"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 11a4 4 0 0 1 4 4v3"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
    ];
    document.querySelectorAll("#dashboardList .grid > a > span:first-child").forEach((node, index) => {
      node.classList.add("app-card-icon");
      node.innerHTML = cardIcons[index] || cardIcons[0];
    });
  }

  function markPageIntro() {
    const firstSection = document.querySelector("main > section:first-child");
    if (firstSection && !firstSection.classList.contains("hero-grid")) {
      firstSection.classList.add("app-page-intro");
    }
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
  applyNavigationIcons();
  applyCardIcons();
  markPageIntro();
})();
