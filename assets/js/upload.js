import { MAX_UPLOAD_ROWS, validateRowsYear, validateWorksheet } from "./upload-validator.js";
import { buildScopedTemplateRows, filterTemplateSchools } from "./template-generator.js?v=20260805-1";

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
  "uploadYear", "uploadYearHint", "uploadDepartment", "uploadArea", "templateScopeHint"
].map(id => [id, document.getElementById(id)]));
let validated = null;
let templateSchools = [];
let templateDownloading = false;

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

function selectedYearField(selected = selectedSchema()) {
  if (!selected) return null;
  return selected.definition.columns.includes("YEAR") ? "YEAR" : selected.definition.columns.includes("GRADUATED_YEAR") ? "GRADUATED_YEAR" : null;
}

function setScopeOptions(select, values, firstLabel) {
  const current = select.value;
  select.replaceChildren(new Option(firstLabel, ""), ...values.map(value => new Option(value, value)));
  if (values.includes(current)) select.value = current;
}

function scopedSchools() {
  return filterTemplateSchools(templateSchools, elements.uploadDepartment.value, elements.uploadArea.value);
}

function syncTemplateDownload() {
  const selected = selectedSchema();
  const yearField = selectedYearField(selected);
  const validYear = !yearField || (elements.uploadYear.value && elements.uploadYear.checkValidity());
  const count = elements.uploadDepartment.value ? scopedSchools().length : 0;
  elements.downloadTemplate.disabled = templateDownloading || !selected || !elements.uploadDepartment.value || !validYear || count === 0;
  if (!templateSchools.length) elements.templateScopeHint.textContent = "กำลังโหลดรายชื่อสถานศึกษา…";
  else if (!elements.uploadDepartment.value) elements.templateScopeHint.textContent = "เลือกสังกัดเพื่อกำหนดรายชื่อสถานศึกษาใน Template";
  else elements.templateScopeHint.textContent = `Template จะมี ${nf.format(count)} แถวสถานศึกษา${elements.uploadArea.value ? ` ใน ${elements.uploadArea.value}` : " จากทุกเขตพื้นที่ในสังกัด"}`;
}

function updateTemplateAreas() {
  const department = elements.uploadDepartment.value;
  const areas = [...new Set(templateSchools
    .filter(school => !department || String(school.DEPARTMENT_NAME || "").trim() === department)
    .map(school => String(school.EDU_AREA_NAME || "").trim() || "ไม่ระบุเขตพื้นที่การศึกษา"))]
    .sort((a, b) => a.localeCompare(b, "th"));
  setScopeOptions(elements.uploadArea, areas, "ทุกเขตพื้นที่การศึกษา");
  elements.uploadArea.disabled = !department;
  syncTemplateDownload();
}

async function loadTemplateSchools() {
  try {
    templateSchools = await window.PYOEDUDataClient.allRows("DB1", "School_Info");
    const departments = [...new Set(templateSchools.map(school => String(school.DEPARTMENT_NAME || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
    setScopeOptions(elements.uploadDepartment, departments, "เลือกสังกัด");
    elements.uploadDepartment.disabled = false;
    updateTemplateAreas();
  } catch (error) {
    elements.templateScopeHint.textContent = "โหลดรายชื่อสถานศึกษาไม่สำเร็จ กรุณารีเฟรชหน้า";
  }
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
  syncTemplateDownload();
  elements.validateUpload.disabled = !(selectedSchema() && elements.uploadFile.files[0]);
});

elements.uploadFile.addEventListener("change", () => {
  resetValidation();
  const file = elements.uploadFile.files[0];
  elements.uploadFileName.textContent = file ? `${file.name} · ${nf.format(file.size)} bytes` : "รองรับ .xlsx เท่านั้น";
  elements.validateUpload.disabled = !(selectedSchema() && file);
});

elements.uploadYear.addEventListener("input", () => { resetValidation(); syncTemplateDownload(); });
elements.uploadDepartment.addEventListener("change", updateTemplateAreas);
elements.uploadArea.addEventListener("change", syncTemplateDownload);

elements.downloadTemplate.addEventListener("click", async () => {
  const selected = selectedSchema();
  const schools = scopedSchools();
  if (!selected || !schools.length || !window.ExcelJS) return;
  templateDownloading = true; syncTemplateDownload();
  try {
    const yearField = selectedYearField(selected);
    if (yearField && (!elements.uploadYear.value || !elements.uploadYear.checkValidity())) throw new Error("กรุณาระบุปีข้อมูลให้ถูกต้องก่อนสร้าง Template");
    const filters = yearField ? { [yearField]: elements.uploadYear.value } : {};
    const existingRows = selected.sheetName === "School_Info" ? [] : await window.PYOEDUDataClient.allRows(selected.dbKey, selected.sheetName, { filters, bypassCache: true });
    const templateRows = buildScopedTemplateRows(selected.definition, schools, elements.uploadYear.value, selected.sheetName, existingRows);
    if (templateRows.length > MAX_UPLOAD_ROWS) throw new Error(`Template มี ${nf.format(templateRows.length)} แถว เกินขีดจำกัด ${nf.format(MAX_UPLOAD_ROWS)} แถว กรุณาเลือกขอบเขตให้แคบลง`);
    const workbook = new window.ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(selected.sheetName.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    worksheet.addRow(selected.definition.columns);
    worksheet.addRows(templateRows);
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: selected.definition.columns.length } };
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    selected.definition.columns.forEach((field, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.min(Math.max(field.length + 4, field.includes("NAME") ? 28 : 16), 42);
      if (field === "SCHOOL_CODE") column.numFmt = "@";
      if (selected.sheetName !== "School_Info" && ![yearField, "DEPARTMENT_NAME", "EDU_AREA_NAME", "SCHOOL_CODE", "SCHOOL_NAME"].includes(field)) {
        for (let row = 2; row <= worksheet.rowCount; row += 1) worksheet.getCell(row, index + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7D6" } };
      }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.dbKey}_${selected.sheetName}_${elements.uploadYear.value || "current"}_scoped_template.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showStatus(`สร้าง Template สำเร็จ ${nf.format(templateRows.length)} แถว จาก ${nf.format(schools.length)} สถานศึกษา โดยเว้นช่องสีเหลืองไว้ให้กรอก`, "success");
  } catch (error) {
    showStatus(error.message || "สร้าง Template ไม่สำเร็จ", "error");
  } finally {
    templateDownloading = false; syncTemplateDownload();
  }
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
loadTemplateSchools();
if (!firebaseConfigured) showStatus("ยังไม่ได้ตั้งค่า Firebase จึงตรวจไฟล์ได้แต่ยังไม่สามารถอัปโหลด", "info");
