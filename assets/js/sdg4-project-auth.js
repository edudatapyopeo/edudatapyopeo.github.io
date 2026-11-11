const uploadButton = document.getElementById("projectUploadButton");
const manageButton = document.getElementById("projectManageButton");
const accessStatus = document.getElementById("projectAccessStatus");
const notice = document.getElementById("sdg4Notice");
const config = window.PYOEDU_CONFIG?.firebase;
const configured = Boolean(config && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(config[field] || "").trim()));
let authApi = null;
let authenticatedUser = null;
const ACCESS_CACHE_KEY = "pyoedu:sdg4-project-access";
const ACCESS_CACHE_TTL = 5 * 60 * 1000;

function cachedAccess(email) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(ACCESS_CACHE_KEY) || "null");
    return cached && cached.email === String(email || "").trim().toLowerCase() && Number(cached.expiresAt) > Date.now() ? cached : null;
  } catch (_) {
    return null;
  }
}

function rememberAccess(access, email) {
  try {
    sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ role: access?.role || "staff", email: String(email || "").trim().toLowerCase(), expiresAt: Date.now() + ACCESS_CACHE_TTL }));
  } catch (_) {}
}

function showActions() {
  uploadButton.hidden = false;
  if (manageButton) manageButton.hidden = false;
  if (accessStatus) accessStatus.hidden = true;
}

function hideActions(checking = false) {
  uploadButton.hidden = true;
  if (manageButton) manageButton.hidden = true;
  if (accessStatus) {
    accessStatus.hidden = !checking;
    accessStatus.textContent = "กำลังตรวจสอบสิทธิ์…";
  }
}

function showNotice(message, type = "error") {
  if (!notice) return;
  notice.hidden = false;
  notice.className = `mt-5 rounded-xl border p-4 text-sm leading-6 ${type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`;
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

async function loadAccess() {
  if (!authenticatedUser || !authApi) return;
  const idToken = await authApi.getIdToken(true);
  const access = await postApi({ operation: "getSdg4ProjectAccess", idToken, requestId: crypto.randomUUID() });
  return access;
}

if (uploadButton && configured) {
  authApi = await import("./auth-client.js");
  authApi.observeAuth(async user => {
    authenticatedUser = user && user.emailVerified ? user : null;
    hideActions(Boolean(authenticatedUser));
    if (!authenticatedUser) {
      sessionStorage.removeItem(ACCESS_CACHE_KEY);
      return;
    }
    if (cachedAccess(authenticatedUser.email)) showActions();
    try {
      const access = await loadAccess();
      rememberAccess(access, authenticatedUser.email);
      showActions();
    } catch (error) {
      sessionStorage.removeItem(ACCESS_CACHE_KEY);
      hideActions(false);
      console.error("Project access lookup failed", error);
      showNotice("ไม่สามารถตรวจสอบสิทธิ์บัญชีได้ ปุ่มรายงานและจัดการโครงการจึงถูกซ่อนไว้ชั่วคราว");
    }
  });
} else if (uploadButton) {
  hideActions(false);
}
