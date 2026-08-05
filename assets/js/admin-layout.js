(() => {
  "use strict";

  const main = document.querySelector("main");
  const headerActions = document.getElementById("adminHeaderActions");
  const account = document.getElementById("adminAccountCard");
  const accountSlot = document.getElementById("adminAccountSlot");
  const coverage = document.getElementById("coverageTracker");
  const upload = document.getElementById("uploadConsole");
  const editor = document.getElementById("recordEditor");
  if (!main || !headerActions || !account || !coverage || !upload || !editor) return;

  const email = document.getElementById("adminAccountEmail");
  const verification = document.getElementById("adminAccountVerification");
  const actions = account.querySelector("div");
  const message = document.getElementById("adminAccountMessage");
  const identity = document.createElement("div");
  const avatar = document.createElement("span");
  account.className = "flex min-w-0 flex-wrap items-center gap-3 border-l border-slate-200 pl-4";
  account.querySelector("p.text-sm")?.classList.add("sr-only");
  avatar.className = "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pyo-100 text-sm font-bold text-pyo-800";
  avatar.textContent = "ผู้ใช้";
  identity.className = "min-w-0";
  email.className = "max-w-52 truncate text-sm font-bold text-slate-900";
  verification.className = "mt-0.5 text-xs font-medium text-emerald-700";
  identity.append(email, verification);
  actions.className = "flex flex-wrap gap-2";
  document.getElementById("adminResetPassword").textContent = "เปลี่ยนรหัสผ่าน";
  account.querySelectorAll("button").forEach(button => {
    button.classList.remove("rounded-xl", "px-4", "py-2.5");
    button.classList.add("rounded-lg", "px-3", "py-2", "text-xs");
  });
  message.className = "basis-full text-right text-xs";
  account.prepend(avatar, identity);
  headerActions.prepend(account);
  accountSlot?.remove();

  const hero = main.querySelector("section");
  hero.after(coverage);

  const chooser = document.createElement("section");
  chooser.className = "mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft";
  chooser.innerHTML = `<p class="text-sm font-bold text-pyo-700">เลือกเครื่องมือทำงาน</p><h2 class="mt-1 text-xl font-bold">คุณต้องการจัดการข้อมูลแบบใด</h2><p class="mt-1 text-sm text-slate-500">เลือกหนึ่งเครื่องมือ ระบบจะแสดงเฉพาะขั้นตอนที่เกี่ยวข้อง</p><div class="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" data-tool="upload" class="focus-ring rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-5 text-left"><strong class="text-emerald-800">EXCEL UPLOAD</strong><span class="mt-1 block text-sm text-slate-600">นำเข้าหรือปรับปรุงข้อมูลหลายรายการจากไฟล์ Excel</span></button><button type="button" data-tool="editor" class="focus-ring rounded-2xl border-2 border-slate-200 p-5 text-left"><strong class="text-blue-800">SCHOOL RECORD EDITOR</strong><span class="mt-1 block text-sm text-slate-600">ค้นหาและแก้ไขข้อมูลเฉพาะรายการของสถานศึกษา</span></button></div>`;
  upload.before(chooser);

  function selectTool(tool) {
    upload.hidden = tool !== "upload";
    editor.hidden = tool !== "editor";
    chooser.querySelectorAll("[data-tool]").forEach(button => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("border-emerald-600", active && tool === "upload");
      button.classList.toggle("bg-emerald-50", active && tool === "upload");
      button.classList.toggle("border-blue-600", active && tool === "editor");
      button.classList.toggle("bg-blue-50", active && tool === "editor");
      button.classList.toggle("border-slate-200", !active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  chooser.addEventListener("click", event => {
    const button = event.target.closest("[data-tool]");
    if (button) selectTool(button.dataset.tool);
  });
  selectTool("upload");
})();
