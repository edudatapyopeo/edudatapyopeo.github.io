(() => {
  "use strict";

  if (document.getElementById("siteSidebar")) return;

  const currentPage = window.location.pathname.split("/").pop() || "basic.html";
  const links = [
    ["basic.html", "ข้อมูลพื้นฐาน"],
    ["students.html", "ข้อมูลนักเรียน"],
    ["teachers.html", "ครูและบุคลากร"],
    ["curriculum.html", "หลักสูตร"],
    ["infrastructure.html", "โครงสร้างพื้นฐาน"]
  ];

  const backdrop = document.createElement("div");
  backdrop.id = "sidebarBackdrop";
  backdrop.className = "sidebar-backdrop";
  backdrop.hidden = true;

  const sidebar = document.createElement("aside");
  sidebar.id = "siteSidebar";
  sidebar.className = "fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col bg-slate-950 text-slate-100 shadow-2xl transition-transform duration-200 lg:translate-x-0";
  sidebar.setAttribute("aria-label", "เมนูหลัก");
  sidebar.innerHTML = `
    <div class="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
      <img src="../assets/images/moe-icon.png" alt="ตรากระทรวงศึกษาธิการ" class="h-14 w-14 object-contain">
      <div class="min-w-0"><p class="font-semibold leading-5 text-white">ข้อมูลการศึกษาพะเยา</p><p class="mt-1 text-xs text-slate-400">PYO Education Data</p></div>
      <button id="sidebarCloseButton" type="button" class="focus-ring ml-auto rounded-lg p-2 text-slate-300 hover:bg-slate-800 lg:hidden" aria-label="ปิดเมนู">✕</button>
    </div>
    <nav class="flex-1 overflow-y-auto px-3 py-5">
      <a href="../index.html" class="focus-ring flex items-center gap-3 rounded-lg px-4 py-3 text-slate-200 hover:bg-slate-800"><span aria-hidden="true">⌂</span><span>หน้าแรก</span></a>
      <button id="dashboardMenuButton" type="button" class="focus-ring mt-2 flex w-full items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 text-left text-white" aria-expanded="true" aria-controls="dashboardMenu"><span aria-hidden="true">▦</span><span class="flex-1">แดชบอร์ด</span><span data-chevron class="rotate-180 transition-transform" aria-hidden="true">⌄</span></button>
      <div id="dashboardMenu" class="ml-5 border-l border-slate-700 pl-3">
        ${links.map(([href, label]) => `<a href="${href}"${href === currentPage ? ' aria-current="page"' : ""} class="focus-ring block rounded-md px-3 py-2 text-sm ${href === currentPage ? "bg-pyo-700 font-semibold text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}">${label}</a>`).join("")}
      </div>
    </nav>
    <div class="border-t border-slate-800 p-4"><a href="../admin/login.html?returnTo=${encodeURIComponent(window.location.href)}" class="focus-ring block rounded-lg border border-slate-700 px-4 py-2.5 text-center text-sm font-semibold hover:border-pyo-500">เข้าสู่ระบบเจ้าหน้าที่</a></div>`;

  const content = document.createElement("div");
  content.className = "min-h-screen lg:pl-72";
  const movable = [...document.body.children].filter(node => !["SCRIPT"].includes(node.tagName) && node.tagName !== "A");
  movable.forEach(node => content.append(node));

  const pageHeader = content.querySelector("header");
  const headerInner = pageHeader?.firstElementChild || pageHeader;
  if (headerInner) {
    const menuButton = document.createElement("button");
    menuButton.id = "menuButton";
    menuButton.type = "button";
    menuButton.className = "focus-ring shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 shadow-sm lg:hidden";
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-controls", "siteSidebar");
    menuButton.setAttribute("aria-label", "เปิดเมนู");
    menuButton.textContent = "☰";
    headerInner.prepend(menuButton);
  }

  document.body.prepend(backdrop, sidebar, content);
  const authNavigation = document.createElement("script");
  authNavigation.type = "module";
  authNavigation.src = "../assets/js/auth-navigation.js";
  document.head.append(authNavigation);
})();
