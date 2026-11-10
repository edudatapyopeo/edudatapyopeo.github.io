const guard = document.getElementById("projectUploadGuard");
const guardTitle = document.getElementById("projectUploadGuardTitle");
const guardMessage = document.getElementById("projectUploadGuardMessage");
const guardAction = document.getElementById("projectUploadGuardAction");
const form = document.getElementById("projectUploadForm");
const submit = document.getElementById("projectUploadSubmit");
const status = document.getElementById("projectUploadStatus");
const uploader = document.getElementById("projectUploaderAccount");
const detail = document.getElementById("projectDetail");
const detailCount = document.getElementById("projectDetailCount");
const coverFile = document.getElementById("projectCoverFile");
const coverFileName = document.getElementById("projectCoverFileName");
const coverPreview = document.getElementById("projectCoverPreview");
const targetContainer = document.getElementById("projectSdgTargets");
const targetError = document.getElementById("projectTargetError");
const agencyInput = document.getElementById("projectAgency");
const agencyOptions = document.getElementById("projectAgencyOptions");
const firebaseConfig = window.PYOEDU_CONFIG?.firebase;
const configured = Boolean(firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(firebaseConfig[field] || "").trim()));
const authApi = configured ? await import("./auth-client.js") : null;
let authenticatedUser = null;
let standardAgencies = new Set();
const OBEC_DEPARTMENT = "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน";

function loginUrl() {
  const url = new URL("../admin/login.html", window.location.href);
  url.searchParams.set("returnTo", window.location.href);
  return url.href;
}

function block(title, message) {
  guard.hidden = false;
  guardTitle.textContent = title;
  guardMessage.textContent = message;
  guardAction.href = loginUrl();
  guardAction.hidden = false;
}

function showStatus(message, type = "info") {
  const classes = {
    info: "border-blue-200 bg-blue-50 text-blue-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800"
  };
  status.hidden = false;
  status.className = `mt-4 rounded-xl border p-4 text-sm ${classes[type]}`;
  status.textContent = message;
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url.href : "";
  } catch (_) {
    return "";
  }
}

async function loadTargets() {
  try {
    const rows = await window.PYOEDUDataClient.allRows("DB6_SDG4_MONITORING", "SDG4_Target_Master");
    targetContainer.replaceChildren(...rows.map(row => {
      const label = document.createElement("label");
      label.className = "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "SDG4_TARGET_ID";
      checkbox.value = String(row.TARGET_ID || "").trim();
      checkbox.className = "mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-700";
      checkbox.addEventListener("change", validateTargets);
      const content = document.createElement("span");
      const code = document.createElement("strong");
      code.className = "block text-emerald-800";
      code.textContent = `SDG ${checkbox.value}`;
      const description = document.createElement("span");
      description.className = "mt-1 block text-sm font-normal leading-6 text-slate-600";
      description.textContent = String(row.TARGET_NAME_TH || "").trim();
      content.append(code, description);
      label.append(checkbox, content);
      return label;
    }));
  } catch (error) {
    const message = document.createElement("p");
    message.className = "rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800";
    message.textContent = "โหลดเป้าหมายไม่สำเร็จ กรุณารีเฟรชหน้า";
    targetContainer.replaceChildren(message);
    showStatus("ไม่สามารถโหลดรายการเป้าหมาย SDG4 ได้ กรุณารีเฟรชหน้าแล้วลองใหม่", "error");
  }
}

function selectedTargets() {
  return [...targetContainer.querySelectorAll('input[name="SDG4_TARGET_ID"]:checked')].map(input => input.value);
}

function validateTargets() {
  const valid = selectedTargets().length > 0;
  targetError.hidden = valid;
  return valid;
}

async function loadAgencies() {
  try {
    const rows = await window.PYOEDUDataClient.allRows("DB1", "School_Info");
    const agencies = [...new Set(rows.map(row => {
      const department = String(row.DEPARTMENT_NAME || "").trim();
      const area = String(row.EDU_AREA_NAME || "").trim();
      return department === OBEC_DEPARTMENT ? area : department;
    }).filter(Boolean))].sort((left, right) => left.localeCompare(right, "th"));
    standardAgencies = new Set(agencies);
    agencyOptions.replaceChildren(...agencies.map(name => new Option(name, name)));
    agencyInput.disabled = false;
    agencyInput.placeholder = "พิมพ์เพื่อค้นหาและเลือกหน่วยงาน";
    validateAgency();
  } catch (error) {
    agencyInput.placeholder = "โหลดรายชื่อหน่วยงานไม่สำเร็จ";
    showStatus("ไม่สามารถโหลดรายชื่อหน่วยงานจากข้อมูลสถานศึกษาได้ กรุณารีเฟรชหน้าแล้วลองใหม่", "error");
  }
}

function validateAgency() {
  const value = agencyInput.value.trim();
  if (!value) {
    agencyInput.setCustomValidity("");
    return false;
  }
  const valid = standardAgencies.has(value);
  agencyInput.setCustomValidity(valid ? "" : "กรุณาเลือกชื่อหน่วยงานจากรายการที่ระบบแนะนำ");
  return valid;
}

function validateCoverFile() {
  const file = coverFile.files[0];
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  let message = "";
  if (file && !allowedTypes.has(file.type)) message = "รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP";
  else if (file && file.size > 5 * 1024 * 1024) message = "ภาพหน้าปกต้องมีขนาดไม่เกิน 5 MB";
  coverFile.setCustomValidity(message);
  return Boolean(file && !message);
}

function renderCoverPreview() {
  const file = coverFile.files[0];
  coverPreview.replaceChildren();
  if (!file || !validateCoverFile()) {
    const message = document.createElement("span");
    message.textContent = coverFile.validationMessage || "เลือกภาพจากเครื่องเพื่อดูตัวอย่าง";
    message.className = coverFile.validationMessage ? "text-rose-700" : "";
    coverPreview.append(message);
    coverFileName.textContent = coverFile.validationMessage || "รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB";
    return;
  }
  const url = URL.createObjectURL(file);
  const image = document.createElement("img");
  image.src = url;
  image.alt = "ตัวอย่างภาพหน้าปกโครงการ";
  image.className = "h-full w-full object-contain";
  image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
  coverPreview.append(image);
  coverFileName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toLocaleString("th-TH", { maximumFractionDigits: 2 })} MB`;
}

function projectPayload(uploadedCoverUrl) {
  const data = new FormData(form);
  return {
    YEAR: Number(data.get("YEAR")),
    PROJECT_TITLE: String(data.get("PROJECT_TITLE") || "").trim(),
    PROJECT_DETAIL: String(data.get("PROJECT_DETAIL") || "").trim(),
    DEPARTMENT_NAME_AGENCY: String(data.get("DEPARTMENT_NAME_AGENCY") || "").trim(),
    BUDGET_AMOUNT: data.get("BUDGET_AMOUNT") === "" ? 0 : Number(data.get("BUDGET_AMOUNT")),
    SDG4_TARGET_ID: selectedTargets().join("|"),
    PROJECT_TYPE: String(data.get("PROJECT_TYPE") || "").trim(),
    COVER_IMAGE_URL: safeHttpsUrl(uploadedCoverUrl),
    ADDITIONAL_IMAGES_URL: safeHttpsUrl(data.get("ADDITIONAL_IMAGES_URL")),
    REFERENCE_URL: safeHttpsUrl(data.get("REFERENCE_URL"))
  };
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

async function uploadCoverImage(idToken) {
  const file = coverFile.files[0];
  if (!file || !validateCoverFile()) throw new Error(coverFile.validationMessage || "กรุณาเลือกภาพหน้าปก");
  const signature = await postApi({ operation: "createCloudinarySignature", idToken, requestId: crypto.randomUUID() });
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signature.apiKey);
  body.append("timestamp", String(signature.timestamp));
  body.append("signature", signature.signature);
  body.append("folder", signature.folder);
  body.append("public_id", signature.publicId);
  body.append("overwrite", "false");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`, { method: "POST", body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "อัปโหลดภาพหน้าปกไม่สำเร็จ");
  const url = safeHttpsUrl(result.secure_url);
  if (!url) throw new Error("ระบบจัดเก็บภาพไม่ได้ส่งลิงก์ HTTPS กลับมา");
  return url;
}

detail.addEventListener("input", () => { detailCount.textContent = `${detail.value.length.toLocaleString("th-TH")}/1,000`; });
coverFile.addEventListener("change", renderCoverPreview);
agencyInput.addEventListener("input", validateAgency);
agencyInput.addEventListener("change", validateAgency);

form.addEventListener("submit", async event => {
  event.preventDefault();
  validateAgency();
  const targetsValid = validateTargets();
  validateCoverFile();
  if (!authenticatedUser || !authApi || !form.reportValidity() || !targetsValid) {
    if (!targetsValid) targetContainer.querySelector("input")?.focus();
    return;
  }
  submit.disabled = true;
  showStatus("กำลังตรวจสอบสิทธิ์และอัปโหลดภาพหน้าปก กรุณาอย่าปิดหน้านี้…", "info");
  try {
    const idToken = await authApi.getIdToken(true);
    const uploadedCoverUrl = await uploadCoverImage(idToken);
    showStatus("อัปโหลดภาพสำเร็จ กำลังบันทึกข้อมูลโครงการ…", "info");
    const project = projectPayload(uploadedCoverUrl);
    const result = await postApi({ operation: "createSdg4Project", idToken, requestId: crypto.randomUUID(), project });
    await window.PYOEDUDataClient.clearCache();
    showStatus(`บันทึกโครงการสำเร็จ รหัสโครงการ ${result.projectId} กำลังกลับไปยังหน้ารวมโครงการ…`, "success");
    setTimeout(() => window.location.replace("projects.html"), 1400);
  } catch (error) {
    console.error("Project submission failed", error);
    showStatus(error.message || "บันทึกโครงการไม่สำเร็จ กรุณาลองใหม่", "error");
    submit.disabled = false;
  }
});

document.getElementById("projectYear").value = String(new Date().getFullYear() + 543);

if (!configured) {
  block("ยังไม่ได้ตั้งค่า Firebase", "กรุณาตั้งค่าระบบบัญชีก่อนใช้งานแบบฟอร์มรายงานโครงการ");
} else {
  authApi.observeAuth(user => {
    if (!user) {
      window.location.replace(loginUrl());
      return;
    }
    if (!user.emailVerified) {
      block("บัญชียังไม่ได้ยืนยันอีเมล", "กรุณายืนยันอีเมลและเข้าสู่ระบบใหม่");
      return;
    }
    authenticatedUser = user;
    uploader.textContent = `บัญชีผู้รายงาน: ${user.email || "เจ้าหน้าที่"}`;
    guard.hidden = true;
    Promise.all([loadTargets(), loadAgencies()]);
  });
}
