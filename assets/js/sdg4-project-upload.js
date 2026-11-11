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
const pageTitle = document.getElementById("projectPageTitle");
const formHeading = document.getElementById("projectFormHeading");
const formHint = document.getElementById("projectFormHint");
const coverHint = document.getElementById("projectCoverHint");
const coverRequired = document.getElementById("projectCoverRequired");
const cancelLink = document.getElementById("projectCancelLink");
const firebaseConfig = window.PYOEDU_CONFIG?.firebase;
const configured = Boolean(firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(firebaseConfig[field] || "").trim()));
const authApi = configured ? await import("./auth-client.js") : null;
let authenticatedUser = null;
let standardAgencies = new Set();
const editProjectId = String(new URLSearchParams(window.location.search).get("projectId") || "").trim();
const editing = Boolean(editProjectId);
let existingCoverUrl = "";
let existingCoverPublicId = "";
let preparedCoverFile = null;
let coverProcessingPromise = null;
let coverSelectionVersion = 0;
const OBEC_DEPARTMENT = "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน";
const COVER_SOURCE_MAX_BYTES = 15 * 1024 * 1024;
const COVER_OUTPUT_MAX_BYTES = 1.2 * 1024 * 1024;
const COVER_MAX_LONG_EDGE = 1600;
const COVER_MIN_LONG_EDGE = 800;
const COVER_MIN_SHORT_EDGE = 450;

if (editing) {
  pageTitle.textContent = "แก้ไขโครงการ | SDG4 จังหวัดพะเยา";
  formHeading.textContent = "แก้ไขรายละเอียดโครงการ SDG4";
  submit.textContent = "บันทึกการแก้ไข";
  coverFile.required = false;
  formHint.textContent = "แก้ไขข้อมูลที่ต้องการแล้วกดบันทึก ระบบจะคงรหัสโครงการและวันที่รายงานเดิมไว้";
  coverHint.textContent = "ระบบจะแสดงภาพหน้าปกเดิม หากเลือกภาพใหม่จะปรับด้านยาวไม่เกิน 1,600 พิกเซลและบีบอัดเป็น WebP ก่อนอัปโหลด";
  coverRequired.hidden = true;
  cancelLink.href = "project-manage.html";
  cancelLink.textContent = "ยกเลิกการแก้ไข";
  coverFileName.textContent = "หากไม่ต้องการเปลี่ยนภาพ สามารถเว้นช่องนี้ไว้ได้";
}

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
      label.className = "sdg4-target-option flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50";
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

function validateCoverFile(requirePrepared = false) {
  const file = coverFile.files[0];
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  let message = "";
  if (file && !allowedTypes.has(file.type)) message = "รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP";
  else if (file && file.size > COVER_SOURCE_MAX_BYTES) message = "ภาพต้นฉบับต้องมีขนาดไม่เกิน 15 MB";
  else if (requirePrepared && file && !preparedCoverFile) message = coverFile.validationMessage || "กรุณารอให้ระบบเตรียมภาพหน้าปกเสร็จสิ้น";
  coverFile.setCustomValidity(message);
  return Boolean((file || (editing && existingCoverUrl)) && !message);
}

function fileSize(value) {
  return `${(Number(value || 0) / 1024 / 1024).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB`;
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("เบราว์เซอร์ไม่สามารถบีบอัดภาพนี้ได้")), type, quality));
}

async function imageSource(file) {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch (_) {}
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ภาพได้")); });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

async function prepareCoverImage(file) {
  if (!validateCoverFile()) throw new Error(coverFile.validationMessage || "กรุณาเลือกภาพหน้าปก");
  const loaded = await imageSource(file);
  try {
    const sourceLong = Math.max(loaded.width, loaded.height);
    const sourceShort = Math.min(loaded.width, loaded.height);
    if (sourceLong < COVER_MIN_LONG_EDGE || sourceShort < COVER_MIN_SHORT_EDGE) throw new Error("ภาพมีความละเอียดต่ำเกินไป กรุณาใช้ภาพอย่างน้อยประมาณ 800 × 450 พิกเซล");
    let scale = Math.min(1, COVER_MAX_LONG_EDGE / sourceLong);
    if (Math.round(sourceShort * scale) < COVER_MIN_SHORT_EDGE) throw new Error("สัดส่วนภาพกว้างหรือสูงเกินไป กรุณาเลือกภาพที่เหมาะกับการแสดงเป็นภาพหน้าปก");
    let bestBlob = null;
    let outputWidth = 0;
    let outputHeight = 0;
    const qualities = [0.82, 0.75, 0.68, 0.61, 0.55];
    for (let resizeRound = 0; resizeRound < 5; resizeRound += 1) {
      outputWidth = Math.max(1, Math.round(loaded.width * scale));
      outputHeight = Math.max(1, Math.round(loaded.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("เบราว์เซอร์ไม่รองรับการปรับขนาดภาพ");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(loaded.source, 0, 0, outputWidth, outputHeight);
      for (const quality of qualities) {
        const blob = await canvasBlob(canvas, "image/webp", quality);
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (blob.size <= COVER_OUTPUT_MAX_BYTES) {
          const outputName = `${file.name.replace(/\.[^.]+$/, "") || "project-cover"}.webp`;
          return { file: new File([blob], outputName, { type: "image/webp", lastModified: Date.now() }), width: outputWidth, height: outputHeight };
        }
      }
      const nextScale = scale * 0.85;
      if (Math.round(sourceLong * nextScale) < COVER_MIN_LONG_EDGE || Math.round(sourceShort * nextScale) < COVER_MIN_SHORT_EDGE) break;
      scale = nextScale;
    }
    if (!bestBlob || bestBlob.size > COVER_OUTPUT_MAX_BYTES) throw new Error("ไม่สามารถลดขนาดภาพให้ต่ำกว่า 1.2 MB ได้ กรุณาเลือกภาพอื่น");
    const outputName = `${file.name.replace(/\.[^.]+$/, "") || "project-cover"}.webp`;
    return { file: new File([bestBlob], outputName, { type: "image/webp", lastModified: Date.now() }), width: outputWidth, height: outputHeight };
  } finally {
    loaded.release();
  }
}

async function renderCoverPreview() {
  const file = coverFile.files[0];
  const version = ++coverSelectionVersion;
  preparedCoverFile = null;
  coverPreview.replaceChildren();
  if (!file || !validateCoverFile()) {
    if (editing && existingCoverUrl && !file) {
      const image = document.createElement("img");
      image.src = existingCoverUrl;
      image.alt = "ภาพหน้าปกโครงการปัจจุบัน";
      image.className = "h-full w-full object-contain";
      coverPreview.append(image);
      coverFileName.textContent = "กำลังใช้ภาพเดิม เลือกไฟล์ใหม่เมื่อต้องการเปลี่ยนภาพ";
      return;
    }
    const message = document.createElement("span");
    message.textContent = coverFile.validationMessage || "เลือกภาพจากเครื่องเพื่อดูตัวอย่าง";
    message.className = coverFile.validationMessage ? "text-rose-700" : "";
    coverPreview.append(message);
    coverFileName.textContent = coverFile.validationMessage || "รองรับ JPG, PNG หรือ WebP ต้นฉบับไม่เกิน 15 MB";
    return;
  }
  coverFileName.textContent = `กำลังปรับขนาดและบีบอัด ${file.name}…`;
  const loading = document.createElement("span");
  loading.textContent = "กำลังเตรียมภาพสำหรับอัปโหลด…";
  coverPreview.append(loading);
  try {
    const prepared = await prepareCoverImage(file);
    if (version !== coverSelectionVersion) return;
    preparedCoverFile = prepared.file;
    coverFile.setCustomValidity("");
    const url = URL.createObjectURL(prepared.file);
    const image = document.createElement("img");
    image.src = url;
    image.alt = "ตัวอย่างภาพหน้าปกโครงการหลังปรับขนาด";
    image.className = "h-full w-full object-contain";
    image.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    coverPreview.replaceChildren(image);
    coverFileName.textContent = `${prepared.width.toLocaleString("th-TH")} × ${prepared.height.toLocaleString("th-TH")} px · ${fileSize(file.size)} → ${fileSize(prepared.file.size)} (WebP)`;
  } catch (error) {
    if (version !== coverSelectionVersion) return;
    coverFile.setCustomValidity(error.message || "ไม่สามารถเตรียมภาพได้");
    const message = document.createElement("span");
    message.className = "text-rose-700";
    message.textContent = coverFile.validationMessage;
    coverPreview.replaceChildren(message);
    coverFileName.textContent = coverFile.validationMessage;
  }
}

function projectPayload(uploadedCover) {
  const data = new FormData(form);
  return {
    YEAR: Number(data.get("YEAR")),
    PROJECT_TITLE: String(data.get("PROJECT_TITLE") || "").trim(),
    PROJECT_DETAIL: String(data.get("PROJECT_DETAIL") || "").trim(),
    DEPARTMENT_NAME_AGENCY: String(data.get("DEPARTMENT_NAME_AGENCY") || "").trim(),
    TARGET_GROUP_COUNT: Number(data.get("TARGET_GROUP_COUNT")),
    BUDGET_AMOUNT: data.get("BUDGET_AMOUNT") === "" ? 0 : Number(data.get("BUDGET_AMOUNT")),
    SDG4_TARGET_ID: selectedTargets().join("|"),
    PROJECT_TYPE: String(data.get("PROJECT_TYPE") || "").trim(),
    COVER_IMAGE_URL: safeHttpsUrl(uploadedCover.url),
    COVER_IMAGE_PUBLIC_ID: String(uploadedCover.publicId || "").trim(),
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
  const file = preparedCoverFile;
  if (!file || !validateCoverFile(true)) throw new Error(coverFile.validationMessage || "กรุณารอให้ระบบเตรียมภาพหน้าปกเสร็จสิ้น");
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
  return { url, publicId: String(result.public_id || `${signature.folder}/${signature.publicId}`).trim() };
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value == null ? "" : String(value);
}

async function loadProjectForEdit(idToken) {
  if (!editing) return;
  showStatus("กำลังโหลดรายละเอียดโครงการ…", "info");
  const result = await postApi({ operation: "getSdg4ProjectForEdit", idToken, requestId: crypto.randomUUID(), projectId: editProjectId });
  const project = result.project || {};
  setInputValue("projectYear", project.YEAR);
  setInputValue("projectAgency", project.DEPARTMENT_NAME_AGENCY);
  setInputValue("projectTitle", project.PROJECT_TITLE);
  setInputValue("projectDetail", project.PROJECT_DETAIL);
  setInputValue("projectTargetGroupCount", project.TARGET_GROUP_COUNT);
  setInputValue("projectBudget", project.BUDGET_AMOUNT);
  setInputValue("projectType", project.PROJECT_TYPE);
  setInputValue("projectAdditionalUrl", project.ADDITIONAL_IMAGES_URL);
  setInputValue("projectReferenceUrl", project.REFERENCE_URL);
  existingCoverUrl = safeHttpsUrl(project.COVER_IMAGE_URL);
  existingCoverPublicId = String(project.COVER_IMAGE_PUBLIC_ID || "").trim();
  const selected = new Set(String(project.SDG4_TARGET_ID || "").split(/[|,;/]+/).map(value => value.trim()).filter(Boolean));
  targetContainer.querySelectorAll('input[name="SDG4_TARGET_ID"]').forEach(input => { input.checked = selected.has(input.value); });
  detail.dispatchEvent(new Event("input"));
  validateAgency();
  validateTargets();
  renderCoverPreview();
  status.hidden = true;
}

detail.addEventListener("input", () => { detailCount.textContent = `${detail.value.length.toLocaleString("th-TH")}/1,000`; });
coverFile.addEventListener("change", () => { coverProcessingPromise = renderCoverPreview(); });
agencyInput.addEventListener("input", validateAgency);
agencyInput.addEventListener("change", validateAgency);

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (coverProcessingPromise) await coverProcessingPromise;
  validateAgency();
  const targetsValid = validateTargets();
  validateCoverFile(true);
  if (!authenticatedUser || !authApi || !form.reportValidity() || !targetsValid) {
    if (!targetsValid) targetContainer.querySelector("input")?.focus();
    return;
  }
  submit.disabled = true;
  showStatus("กำลังตรวจสอบสิทธิ์และอัปโหลดภาพหน้าปก กรุณาอย่าปิดหน้านี้…", "info");
  try {
    const idToken = await authApi.getIdToken(true);
    const uploadedCover = coverFile.files[0] ? await uploadCoverImage(idToken) : { url: existingCoverUrl, publicId: existingCoverPublicId };
    showStatus(coverFile.files[0] ? "อัปโหลดภาพสำเร็จ กำลังบันทึกข้อมูลโครงการ…" : "กำลังบันทึกข้อมูลโครงการ…", "info");
    const project = projectPayload(uploadedCover);
    const result = await postApi({ operation: editing ? "updateSdg4Project" : "createSdg4Project", idToken, requestId: crypto.randomUUID(), projectId: editProjectId, project });
    await window.PYOEDUDataClient.clearCache();
    showStatus(`${editing ? "แก้ไข" : "บันทึก"}โครงการสำเร็จ รหัสโครงการ ${result.projectId} กำลังกลับไปยังหน้ารวมโครงการ…`, "success");
    setTimeout(() => window.location.replace(editing ? "project-manage.html" : "projects.html"), 1400);
  } catch (error) {
    console.error("Project submission failed", error);
    showStatus(error.message || "บันทึกโครงการไม่สำเร็จ กรุณาลองใหม่", "error");
    submit.disabled = false;
  }
});

if (!editing) document.getElementById("projectYear").value = String(new Date().getFullYear() + 543);

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
    (async () => {
      try {
        await Promise.all([loadTargets(), loadAgencies()]);
        if (editing) await loadProjectForEdit(await authApi.getIdToken(true));
      } catch (error) {
        console.error("Project form initialization failed", error);
        if (editing) {
          form.hidden = true;
          block("ไม่สามารถเปิดโครงการนี้ได้", error.message || "คุณอาจไม่มีสิทธิ์จัดการโครงการ หรือไม่พบโครงการดังกล่าว");
          guardAction.href = "projects.html";
          guardAction.textContent = "กลับหน้ารวมโครงการ";
        }
      }
    })();
  });
}
