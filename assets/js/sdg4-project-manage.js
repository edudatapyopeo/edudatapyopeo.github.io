const guard = document.getElementById("projectManageGuard");
const guardTitle = document.getElementById("projectManageGuardTitle");
const guardMessage = document.getElementById("projectManageGuardMessage");
const guardAction = document.getElementById("projectManageGuardAction");
const account = document.getElementById("projectManageAccount");
const notice = document.getElementById("projectManageNotice");
const summary = document.getElementById("projectManageSummary");
const search = document.getElementById("projectManageSearch");
const tableBody = document.getElementById("projectManageTableBody");
const empty = document.getElementById("projectManageEmpty");
const pagination = document.getElementById("projectManagePagination");
const pageSummary = document.getElementById("projectManagePageSummary");
const pageSelect = document.getElementById("projectManagePage");
const previous = document.getElementById("projectManagePrevious");
const next = document.getElementById("projectManageNext");
const firebaseConfig = window.PYOEDU_CONFIG?.firebase;
const configured = Boolean(firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(firebaseConfig[field] || "").trim()));
const authApi = configured ? await import("./auth-client.js") : null;
const state = { projects: [], filtered: [], page: 1, pageSize: 20, role: "staff", user: null };
const ACCESS_CACHE_KEY = "pyoedu:sdg4-project-access";

function text(value) { return String(value ?? "").trim(); }
function html(value) { return text(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character])); }

function cachedAccess(email) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(ACCESS_CACHE_KEY) || "null");
    return cached && cached.email === text(email).toLowerCase() && Number(cached.expiresAt) > Date.now() ? cached : null;
  } catch (_) {
    return null;
  }
}

function rememberAccess(role) {
  if (!state.user) return;
  try {
    sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({
      email: text(state.user.email).toLowerCase(),
      role: role || "staff",
      expiresAt: Date.now() + 5 * 60 * 1000
    }));
  } catch (_) {}
}

function clearAccessCache() {
  try { sessionStorage.removeItem(ACCESS_CACHE_KEY); } catch (_) {}
}

function applyProjectResult(result) {
  state.role = result.role || "staff";
  state.projects = Array.isArray(result.projects) ? result.projects.sort((left, right) => Number(right.YEAR || 0) - Number(left.YEAR || 0) || text(right.DATE_UPLOAD).localeCompare(text(left.DATE_UPLOAD))) : [];
  account.textContent = `${state.role === "admin" ? "ผู้ดูแลระบบ" : "บัญชีผู้รายงาน"}: ${state.user.email || "เจ้าหน้าที่"}`;
  render();
}

function loginUrl() {
  const url = new URL("../admin/login.html", window.location.href);
  url.searchParams.set("returnTo", window.location.href);
  return url.href;
}

function block(title, message, actionText = "เข้าสู่ระบบ", actionUrl = loginUrl()) {
  guard.hidden = false;
  guardTitle.textContent = title;
  guardMessage.textContent = message;
  guardAction.textContent = actionText;
  guardAction.href = actionUrl;
  guardAction.hidden = false;
}

function showNotice(message, type = "error") {
  const styles = type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900";
  notice.hidden = false;
  notice.className = `mt-5 rounded-xl border p-4 text-sm leading-6 ${styles}`;
  notice.textContent = message;
}

async function postApi(payload) {
  const response = await fetch(window.PYOEDU_CONFIG.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8", Accept: "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`API ตอบกลับ HTTP ${response.status}`);
  const result = await response.json();
  if (!result.success) throw new Error(result.message || "Apps Script ปฏิเสธคำขอ");
  return result.result;
}

function targetBadges(raw) {
  return text(raw).split(/[|,;/]+/).map(value => value.trim()).filter(Boolean).map(value => `<span class="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">${html(value)}</span>`).join(" ") || "–";
}

function statusBadge(value) {
  const status = text(value).toUpperCase();
  const published = status === "PUBLISHED";
  return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}">${published ? "เผยแพร่แล้ว" : html(status || "ไม่ระบุ")}</span>`;
}

function render() {
  const query = search.value.trim().toLocaleLowerCase("th");
  state.filtered = state.projects.filter(project => !query || `${project.PROJECT_ID} ${project.PROJECT_TITLE} ${project.DEPARTMENT_NAME_AGENCY}`.toLocaleLowerCase("th").includes(query));
  const totalPages = Math.max(Math.ceil(state.filtered.length / state.pageSize), 1);
  state.page = Math.min(Math.max(state.page, 1), totalPages);
  const start = (state.page - 1) * state.pageSize;
  const rows = state.filtered.slice(start, start + state.pageSize);
  summary.textContent = `${state.role === "admin" ? "บัญชีแอดมิน · " : ""}พบ ${state.filtered.length.toLocaleString("th-TH")} โครงการ`;
  tableBody.innerHTML = rows.map(project => `<tr class="align-top hover:bg-slate-50">
    <td class="whitespace-nowrap px-4 py-4 font-semibold">${html(project.YEAR) || "–"}</td>
    <td class="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-500">${html(project.PROJECT_ID) || "–"}</td>
    <td class="px-4 py-4"><strong class="block leading-6 text-slate-900">${html(project.PROJECT_TITLE) || "–"}</strong>${state.role === "admin" ? `<span class="mt-1 block text-xs text-slate-500">ผู้บันทึก: ${html(project.UPLOADER_EMAIL) || "ไม่พบข้อมูลเจ้าของ"}</span>` : ""}</td>
    <td class="px-4 py-4 leading-6 text-slate-600">${html(project.DEPARTMENT_NAME_AGENCY) || "–"}</td>
    <td class="whitespace-nowrap px-4 py-4 font-semibold">${project.TARGET_GROUP_COUNT !== null && project.TARGET_GROUP_COUNT !== "" ? `${Number(project.TARGET_GROUP_COUNT).toLocaleString("th-TH")} คน` : "–"}</td>
    <td class="px-4 py-4"><div class="flex min-w-32 flex-wrap gap-1">${targetBadges(project.SDG4_TARGET_ID)}</div></td>
    <td class="whitespace-nowrap px-4 py-4">${statusBadge(project.PUBLICATION_STATUS)}</td>
    <td class="whitespace-nowrap px-4 py-4"><div class="flex justify-center gap-2"><a href="project-upload.html?projectId=${encodeURIComponent(text(project.PROJECT_ID))}" class="focus-ring rounded-lg bg-amber-50 px-3 py-2 font-bold text-amber-800 hover:bg-amber-100">แก้ไข</a><button type="button" data-delete-project="${html(project.PROJECT_ID)}" data-project-title="${html(project.PROJECT_TITLE)}" class="focus-ring rounded-lg bg-rose-50 px-3 py-2 font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50">ลบ</button></div></td>
  </tr>`).join("");
  empty.hidden = state.filtered.length > 0;
  pagination.hidden = state.filtered.length <= state.pageSize;
  pageSelect.replaceChildren(...Array.from({ length: totalPages }, (_, index) => new Option(String(index + 1), String(index + 1), false, index + 1 === state.page)));
  previous.disabled = state.page <= 1;
  next.disabled = state.page >= totalPages;
  pageSummary.textContent = state.filtered.length ? `แสดง ${start + 1}–${Math.min(start + state.pageSize, state.filtered.length)} จาก ${state.filtered.length.toLocaleString("th-TH")} โครงการ` : "ไม่พบข้อมูล";
}

async function loadProjects() {
  const idToken = await authApi.getIdToken(true);
  const result = await postApi({ operation: "listManageableSdg4Projects", idToken, requestId: crypto.randomUUID() });
  applyProjectResult(result);
  rememberAccess(result.role);
}

search.addEventListener("input", () => { state.page = 1; render(); });
pageSelect.addEventListener("change", () => { state.page = Number(pageSelect.value) || 1; render(); });
previous.addEventListener("click", () => { state.page -= 1; render(); });
next.addEventListener("click", () => { state.page += 1; render(); });

tableBody.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete-project]");
  if (!button || !state.user) return;
  const projectId = text(button.dataset.deleteProject);
  const title = text(button.dataset.projectTitle) || projectId;
  if (!projectId || !window.confirm(`ยืนยันการลบโครงการ “${title}”\n\nเมื่อลบแล้วจะไม่สามารถเรียกคืนข้อมูลโครงการได้`)) return;
  button.disabled = true;
  button.textContent = "กำลังลบ…";
  try {
    const idToken = await authApi.getIdToken(true);
    const result = await postApi({ operation: "deleteSdg4Project", idToken, requestId: crypto.randomUUID(), projectId });
    state.projects = state.projects.filter(project => text(project.PROJECT_ID) !== projectId);
    await window.PYOEDUDataClient.clearCache();
    showNotice(result.coverImageDeleted ? "ลบโครงการและภาพหน้าปกจาก Cloudinary เรียบร้อยแล้ว" : "ลบโครงการเรียบร้อยแล้ว", "success");
    render();
  } catch (error) {
    console.error("Project deletion failed", error);
    showNotice(error.message || "ลบโครงการไม่สำเร็จ กรุณาลองใหม่");
    button.disabled = false;
    button.textContent = "ลบ";
  }
});

if (!configured) {
  block("ยังไม่ได้ตั้งค่า Firebase", "กรุณาตั้งค่าระบบบัญชีก่อนใช้งานหน้าจัดการโครงการ", "กลับหน้ารายงานโครงการ", "projects.html");
} else {
  authApi.observeAuth(async user => {
    if (!user) {
      clearAccessCache();
      window.location.replace(loginUrl());
      return;
    }
    if (!user.emailVerified) {
      block("บัญชียังไม่ได้ยืนยันอีเมล", "กรุณายืนยันอีเมลและเข้าสู่ระบบใหม่");
      return;
    }
    state.user = user;
    const cached = cachedAccess(user.email);
    if (cached) {
      state.role = cached.role || "staff";
      account.textContent = `${state.role === "admin" ? "ผู้ดูแลระบบ" : "บัญชีผู้รายงาน"}: ${user.email || "เจ้าหน้าที่"}`;
      guard.hidden = true;
    }
    try {
      await loadProjects();
      guard.hidden = true;
    } catch (error) {
      console.error("Project management initialization failed", error);
      clearAccessCache();
      if (cached) showNotice("ไม่สามารถโหลดรายการโครงการปัจจุบันได้ กรุณารีเฟรชหน้าแล้วลองใหม่");
      else block("ไม่สามารถเปิดหน้าจัดการโครงการได้", error.message || "กรุณาตรวจสอบสิทธิ์แล้วลองใหม่", "กลับหน้ารายงานโครงการ", "projects.html");
    }
  });
}
