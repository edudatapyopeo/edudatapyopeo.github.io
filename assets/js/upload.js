import { MAX_UPLOAD_ROWS, validateRowsYear, validateWorksheet } from "./upload-validator.js";

const nf = new Intl.NumberFormat("th-TH");
const schema = window.PYOEDU_SCHEMA || {};
const firebaseConfig = window.PYOEDU_CONFIG?.firebase;
const firebaseConfigured = Boolean(firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(firebaseConfig[field] || "").trim()));
const authApi = firebaseConfigured ? await import("./auth-client.js") : null;
const sheetLabels = {
  School_Info: "ข้อมูลสถานศึกษา", Student_Count: "จำนวนนักเรียน", Teacher_Count: "จำนวนครูและบุคลากร", Classroom_Count: "จำนวนห้องเรียน",
  Curriculum_HigherEdu: "หลักสูตรอุดมศึกษา", Curriculum_VocationalEdu: "หลักสูตรอาชีวศึกษา",
  RepeatGrade_Student: "นักเรียนเรียนซ้ำ", Disabled_Student: "นักเรียนพิการ", NonThai_Student: "นักเรียนไม่มีสัญชาติไทย", Disadvantaged_Student: "นักเรียนด้อยโอกาส", Dropout_Student: "นักเรียนออกกลางคัน", Graduated_Student: "ผู้สำเร็จการศึกษา",
  TeachingLevel_Teacher: "ระดับที่สอนของครู", GraduatedLevel_Teacher: "วุฒิการศึกษาของครู", Infrastructure_School: "โครงสร้างพื้นฐานสถานศึกษา"
};
const elements = Object.fromEntries([
  "uploadDataset", "downloadTemplate", "uploadFile", "uploadFileName", "validateUpload", "submitUpload", "uploadStatus",
  "uploadTotal", "uploadInserted", "uploadUpdated", "uploadSkipped", "uploadPreviewSummary", "uploadPreviewHead", "uploadPreviewBody",
  "uploadYear", "uploadYearHint"
].map(id => [id, document.getElementById(id)]));
let validated = null;

function populateDatasets() {
  Object.entries(schema).forEach(([dbKey, sheets]) => {
    const group = document.createElement("optgroup");
    group.label = dbKey;
    Object.keys(sheets).forEach(sheetName => {
      group.append(new Option(`${sheetLabels[sheetName] || sheetName} (${sheetName})`, `${dbKey}|${sheetName}`));
    });
    elements.uploadDataset.append(group);
  });
}

function selectedSchema() {
  const [dbKey, sheetName] = elements.uploadDataset.value.split("|");
  const definition = schema[dbKey]?.[sheetName];
  return definition ? { dbKey, sheetName, definition } : null;
}

function showStatus(text, type = "info") {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800"
  };
  elements.uploadStatus.hidden = false;
  elements.uploadStatus.className = `rounded-xl border p-4 text-sm ${styles[type]}`;
  elements.uploadStatus.textContent = text;
}

function resetValidation() {
  validated = null;
  elements.submitUpload.disabled = true;
  elements.uploadPreviewSummary.textContent = "ยังไม่มีข้อมูล";
  elements.uploadPreviewHead.replaceChildren();
  elements.uploadPreviewBody.replaceChildren();
}

async function readAndValidate() {
  const selected = selectedSchema();
  const file = elements.uploadFile.files[0];
  if (!selected) throw new Error("กรุณาเลือกชุดข้อมูล");
  if (!file) throw new Error("กรุณาเลือกไฟล์ .xlsx");
  if (!/\.xlsx$/i.test(file.name)) throw new Error("รองรับเฉพาะไฟล์ .xlsx เท่านั้น");
  if (!window.ExcelJS) throw new Error("ไม่สามารถโหลดเครื่องมืออ่าน Excel ได้ กรุณารีเฟรชหน้า");

  const workbook = new window.ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const rows = validateWorksheet(workbook.worksheets[0], selected.definition, { maxRows: MAX_UPLOAD_ROWS });
  validateRowsYear(rows, selected.definition, elements.uploadYear.value);
  return { ...selected, rows };
}

function renderPreview(data) {
  const headerRow = document.createElement("tr");
  data.definition.columns.forEach(name => { const th = document.createElement("th"); th.className = "whitespace-nowrap px-3 py-2 text-left font-semibold"; th.textContent = name; headerRow.append(th); });
  elements.uploadPreviewHead.replaceChildren(headerRow);
  elements.uploadPreviewBody.replaceChildren(...data.rows.slice(0, 5).map(row => {
    const tr = document.createElement("tr"); tr.className = "border-t border-slate-100";
    row.forEach(value => { const td = document.createElement("td"); td.className = "max-w-52 truncate px-3 py-2"; td.textContent = value === "" ? "(ว่าง)" : String(value); tr.append(td); });
    return tr;
  }));
  elements.uploadPreviewSummary.textContent = `ผ่านการตรวจ ${nf.format(data.rows.length)} แถว · แสดงตัวอย่างสูงสุด 5 แถว`;
}

elements.uploadDataset.addEventListener("change", () => {
  resetValidation();
  const selected = selectedSchema();
  const hasYear = Boolean(selected && (selected.definition.columns.includes("YEAR") || selected.definition.columns.includes("GRADUATED_YEAR")));
  elements.uploadYear.disabled = !hasYear;
  elements.uploadYear.required = hasYear;
  if (!hasYear) elements.uploadYear.value = "";
  elements.uploadYearHint.textContent = hasYear ? "ระบบจะตรวจว่าทุกแถวในไฟล์เป็นปีเดียวกับที่ระบุ" : "ชุดข้อมูลนี้ไม่มีคอลัมน์ปี จึงไม่ต้องตรวจปี";
  elements.downloadTemplate.disabled = !selectedSchema();
  elements.validateUpload.disabled = !(selectedSchema() && elements.uploadFile.files[0]);
});

elements.uploadFile.addEventListener("change", () => {
  resetValidation();
  const file = elements.uploadFile.files[0];
  elements.uploadFileName.textContent = file ? `${file.name} · ${nf.format(file.size)} bytes` : "รองรับ .xlsx เท่านั้น";
  elements.validateUpload.disabled = !(selectedSchema() && file);
});

elements.uploadYear.addEventListener("input", resetValidation);

elements.downloadTemplate.addEventListener("click", () => {
  const selected = selectedSchema();
  if (!selected) return;
  const link = document.createElement("a");
  link.href = `../assets/templates/${selected.dbKey}_${selected.sheetName}_template.xlsx`;
  link.download = `${selected.dbKey}_${selected.sheetName}_template.xlsx`;
  link.click();
});

elements.validateUpload.addEventListener("click", async () => {
  elements.validateUpload.disabled = true;
  showStatus("กำลังอ่านและตรวจสอบไฟล์…", "info");
  try {
    validated = await readAndValidate();
    renderPreview(validated);
    elements.submitUpload.disabled = !authApi;
    showStatus(`ไฟล์ผ่านการตรวจสอบ ${nf.format(validated.rows.length)} แถว พร้อมอัปโหลด`, "success");
  } catch (error) {
    resetValidation();
    showStatus(error.message || "ตรวจสอบไฟล์ไม่สำเร็จ", "error");
  } finally {
    elements.validateUpload.disabled = !(selectedSchema() && elements.uploadFile.files[0]);
  }
});

elements.submitUpload.addEventListener("click", async () => {
  if (!validated || !authApi) return;
  elements.submitUpload.disabled = true;
  showStatus("กำลังตรวจสิทธิ์และบันทึกข้อมูล กรุณาอย่าปิดหน้านี้…", "info");
  try {
    const idToken = await authApi.getIdToken(true);
    const response = await fetch(window.PYOEDU_CONFIG.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8", Accept: "application/json" },
      body: JSON.stringify({ idToken, requestId: crypto.randomUUID(), dbKey: validated.dbKey, sheetName: validated.sheetName, data: validated.rows })
    });
    if (!response.ok) throw new Error(`API ตอบกลับ HTTP ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "Apps Script ปฏิเสธการอัปโหลด");
    const summary = result.result || {};
    elements.uploadTotal.textContent = nf.format(summary.total || 0);
    elements.uploadInserted.textContent = nf.format(summary.inserted || 0);
    elements.uploadUpdated.textContent = nf.format(summary.updated || 0);
    elements.uploadSkipped.textContent = nf.format(summary.skipped || 0);
    await window.PYOEDUDataClient?.clearCache();
    showStatus(`อัปโหลดสำเร็จ เพิ่มใหม่ ${nf.format(summary.inserted || 0)} · อัปเดต ${nf.format(summary.updated || 0)} · ไม่เปลี่ยนแปลง ${nf.format(summary.skipped || 0)}`, "success");
  } catch (error) {
    console.error("Upload failed", error);
    showStatus(error.message || "อัปโหลดไม่สำเร็จ กรุณาลองใหม่", "error");
  } finally {
    elements.submitUpload.disabled = !validated;
  }
});

populateDatasets();
elements.uploadYear.disabled = true;
if (!firebaseConfigured) showStatus("ยังไม่ได้ตั้งค่า Firebase จึงตรวจไฟล์ได้แต่ยังไม่สามารถอัปโหลด", "info");
