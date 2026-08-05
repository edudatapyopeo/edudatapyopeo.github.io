import { analyzeMetricCoverage, coverageMetricFields, filterCoverageRows, summarizeIncompleteSchools } from "./coverage-analysis.js?v=20260805-5";

const api = window.PYOEDUDataClient;
const schema = window.PYOEDU_SCHEMA || {};
const nf = new Intl.NumberFormat("th-TH");
const authApi = await import("./auth-client.js?v=20260804-1");
const labels = {
  School_Info: "ข้อมูลสถานศึกษา", Student_Count: "จำนวนนักเรียน", Teacher_Count: "ครูและบุคลากร", Classroom_Count: "ห้องเรียน",
  Curriculum_HigherEdu: "หลักสูตรอุดมศึกษา", Curriculum_VocationalEdu: "หลักสูตรอาชีวศึกษา", RepeatGrade_Student: "นักเรียนซ้ำชั้น",
  Disabled_Student: "นักเรียนพิการ", NonThai_Student: "นักเรียนไม่มีสัญชาติไทย", Disadvantaged_Student: "นักเรียนด้อยโอกาส",
  Dropout_Student: "นักเรียนออกกลางคัน", Graduated_Student: "ผู้สำเร็จการศึกษา", TeachingLevel_Teacher: "ระดับชั้นที่สอน",
  GraduatedLevel_Teacher: "ระดับการศึกษาครู", Infrastructure_School: "โครงสร้างพื้นฐาน"
};
const editor = {
  dataset: document.getElementById("editorDataset"), year: document.getElementById("editorYear"), search: document.getElementById("editorSchoolSearch"),
  find: document.getElementById("editorFindSchool"), results: document.getElementById("editorSchoolResults"), current: document.getElementById("editorCurrentRows"),
  form: document.getElementById("editorForm"), fields: document.getElementById("editorFields"), status: document.getElementById("editorStatus"), save: document.getElementById("editorSave")
};
let selectedSchool = null;
let selectedRecord = null;

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function dataset() { const [dbKey, sheetName] = editor.dataset.value.split("|"); const definition = schema[dbKey]?.[sheetName]; return definition ? { dbKey, sheetName, definition } : null; }
function yearField(definition) { return definition.columns.includes("YEAR") ? "YEAR" : definition.columns.includes("GRADUATED_YEAR") ? "GRADUATED_YEAR" : null; }
function isNumeric(field) { return field !== "SCHOOL_CODE" && (field === "YEAR" || /_(?:YEAR|COUNT)$/.test(field)); }
function populateDatasets() { Object.entries(schema).forEach(([dbKey, sheets]) => { const group = document.createElement("optgroup"); group.label = dbKey; Object.keys(sheets).forEach(sheetName => group.append(new Option(`${labels[sheetName] || sheetName} (${sheetName})`, `${dbKey}|${sheetName}`))); editor.dataset.append(group); }); }
async function populateSchoolSuggestions() { try { const rows = await api.allRows("DB1", "School_Info"); const list = document.getElementById("editorSchoolSuggestions"); list.replaceChildren(...rows.map(row => new Option(`${row.SCHOOL_NAME || "ไม่มีข้อมูล"} (${row.SCHOOL_CODE || "ไม่มีรหัส"})`, row.SCHOOL_NAME || row.SCHOOL_CODE || "")).filter(option => option.value)); } catch (_) {} }
function setStatus(text, error = false) { editor.status.textContent = text; editor.status.className = `text-sm ${error ? "text-rose-700" : "text-emerald-700"}`; }

editor.dataset.addEventListener("change", () => { const selected = dataset(); const hasYear = Boolean(selected && yearField(selected.definition)); editor.year.disabled = !hasYear; if (!hasYear) editor.year.value = ""; selectedRecord = null; editor.form.hidden = true; editor.current.replaceChildren(); });
editor.find.addEventListener("click", async () => {
  const query = editor.search.value.trim();
  if (!query) { setStatus("กรุณากรอกชื่อหรือรหัสสถานศึกษา", true); return; }
  editor.find.disabled = true; setStatus("กำลังค้นหาสถานศึกษา…");
  try {
    const result = await api.rows("DB1", "School_Info", { pageSize: 30, search: query, searchFields: ["SCHOOL_NAME", "SCHOOL_CODE"], bypassCache: true });
    editor.results.innerHTML = (result.data || []).map(row => `<button type="button" data-code="${escapeHtml(row.SCHOOL_CODE)}" data-name="${escapeHtml(row.SCHOOL_NAME)}" class="focus-ring rounded-xl border border-slate-200 p-3 text-left hover:border-blue-400"><strong class="block">${escapeHtml(row.SCHOOL_NAME || "ไม่มีข้อมูล")}</strong><span class="text-xs text-slate-500">${escapeHtml(row.SCHOOL_CODE || "ไม่มีรหัส")}</span></button>`).join("") || `<p class="text-sm text-slate-500">ไม่พบสถานศึกษา</p>`;
    setStatus(result.data?.length ? `พบ ${nf.format(result.data.length)} สถานศึกษา` : "ไม่พบสถานศึกษา", !result.data?.length);
  } catch (error) { setStatus(error.message || "ค้นหาไม่สำเร็จ", true); }
  finally { editor.find.disabled = false; }
});
editor.results.addEventListener("click", event => { const button = event.target.closest("[data-code]"); if (!button) return; selectedSchool = { code: button.dataset.code, name: button.dataset.name }; loadCurrentRows(); });

async function loadCurrentRows() {
  const selected = dataset();
  if (!selected) { setStatus("กรุณาเลือกชุดข้อมูล", true); return; }
  const field = yearField(selected.definition), filters = { SCHOOL_CODE: selectedSchool.code };
  if (field) { const value = Number(editor.year.value); if (!Number.isInteger(value)) { setStatus("กรุณาระบุปีข้อมูล", true); return; } filters[field] = value; }
  setStatus("กำลังอ่านข้อมูลปัจจุบัน…"); editor.current.innerHTML = ""; editor.form.hidden = true;
  try {
    const result = await api.rows(selected.dbKey, selected.sheetName, { pageSize: 500, filters, bypassCache: true });
    const rows = result.data || [];
    editor.current.innerHTML = `<div class="rounded-xl border"><div class="border-b bg-slate-50 px-4 py-3"><strong>${escapeHtml(selectedSchool.name)}</strong><p class="text-xs text-slate-500">พบ ${nf.format(rows.length)} รายการ · เลือกรายการที่ต้องการแก้ไข</p></div><div class="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">${rows.map((row, index) => `<button type="button" data-record="${index}" class="focus-ring rounded-lg border p-3 text-left text-sm hover:border-blue-400">${selected.definition.key.map(key => `<span class="block"><b>${key}:</b> ${escapeHtml(row[key] ?? "ไม่มีข้อมูล")}</span>`).join("")}</button>`).join("") || `<p class="p-3 text-sm text-slate-500">ยังไม่พบข้อมูลสำหรับสถานศึกษาและปีที่เลือก</p>`}</div></div>`;
    editor.current.onclick = event => { const button = event.target.closest("[data-record]"); if (button) openRecord(rows[Number(button.dataset.record)], selected); };
    setStatus(rows.length ? "เลือกข้อมูลที่ต้องการแก้ไข" : "ไม่พบข้อมูลปัจจุบัน", !rows.length);
  } catch (error) { setStatus(error.message || "อ่านข้อมูลไม่สำเร็จ", true); }
}

function openRecord(row, selected) {
  selectedRecord = { row, selected };
  editor.fields.innerHTML = selected.definition.columns.map(field => `<label class="text-sm font-semibold">${field}${selected.definition.key.includes(field) ? ` <span class="text-amber-700">(Composite Key · อ่านอย่างเดียว)</span>` : ""}<input name="${field}" value="${escapeHtml(row[field] ?? "")}" ${isNumeric(field) ? 'type="number" min="0" step="1"' : 'type="text"'} ${selected.definition.key.includes(field) ? "required readonly" : ""} class="focus-ring mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal ${selected.definition.key.includes(field) ? "bg-slate-100 text-slate-600" : ""}"></label>`).join("");
  editor.form.hidden = false; setStatus("ตรวจสอบข้อมูลแล้วกดบันทึก"); editor.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

editor.form.addEventListener("submit", async event => {
  event.preventDefault(); if (!selectedRecord) return;
  const { selected } = selectedRecord;
  const row = selected.definition.columns.map(field => { const value = editor.form.elements[field].value.trim(); return value === "" ? "" : isNumeric(field) ? Number(value) : value; });
  if (selected.definition.key.some(field => String(row[selected.definition.columns.indexOf(field)] ?? "").trim() === "")) { setStatus("Composite Key ต้องมีค่าครบ", true); return; }
  editor.save.disabled = true; setStatus("กำลังตรวจสิทธิ์และบันทึก…");
  try {
    const idToken = await authApi.getIdToken(true);
    const response = await fetch(window.PYOEDU_CONFIG.apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", Accept: "application/json" }, body: JSON.stringify({ idToken, requestId: crypto.randomUUID(), dbKey: selected.dbKey, sheetName: selected.sheetName, data: [row] }) });
    const result = await response.json(); if (!result.success) throw new Error(result.message || "บันทึกไม่สำเร็จ"); await api.clearCache(); setStatus("บันทึกการแก้ไขสำเร็จ"); await loadCurrentRows();
  } catch (error) { setStatus(error.message || "บันทึกไม่สำเร็จ", true); }
  finally { editor.save.disabled = false; }
});

const coverageYear = document.getElementById("coverageYear");
const coverageRefresh = document.getElementById("coverageRefresh");
const coverageDepartmentFilter = document.getElementById("coverageDepartmentFilter");
const coverageAreaFilter = document.getElementById("coverageAreaFilter");
const coverageStatus = document.getElementById("coverageStatus");
const coverageBody = document.getElementById("coverageBody");
const coverageSummary = document.getElementById("coverageSummary");
const coverageIncompleteTotal = document.getElementById("coverageIncompleteTotal");
const coverageSchoolTotal = document.getElementById("coverageSchoolTotal");
const coverageDepartmentGroup = document.getElementById("coverageDepartmentGroup");
const coverageDepartmentCards = document.getElementById("coverageDepartmentCards");
const coverageAreaGroup = document.getElementById("coverageAreaGroup");
const coverageAreaCards = document.getElementById("coverageAreaCards");
const coverageDatasets = Object.entries(schema)
  .flatMap(([dbKey, sheets]) => Object.entries(sheets).map(([sheetName, definition]) => ({
    dbKey, sheetName, definition, metrics: coverageMetricFields(definition)
  })))
  .filter(item => yearField(item.definition) && item.metrics.length);
let coverageRows = [];
let coverageLoadedYear = null;
const departmentOf = item => String(item.school.DEPARTMENT_NAME || "").trim() || "ไม่ระบุสังกัด";
const areaOf = item => String(item.school.EDU_AREA_NAME || "").trim() || "ไม่ระบุเขตพื้นที่การศึกษา";
const renderCoverageCards = items => items.map(item => `<article class="rounded-lg border border-slate-200 bg-white p-3"><p class="text-xs font-semibold text-slate-700">${escapeHtml(item.label)}</p><p class="mt-1 text-sm text-slate-600"><strong class="text-2xl text-amber-700">${nf.format(item.count)}</strong> จาก ${nf.format(item.total)} แห่ง</p></article>`).join("");

function setCoverageOptions(select, values, allLabel) {
  const current = select.value;
  select.replaceChildren(new Option(allLabel, ""), ...values.map(value => new Option(value, value)));
  if (values.includes(current)) select.value = current;
}

function updateCoverageAreaOptions() {
  const department = coverageDepartmentFilter.value;
  const source = department ? coverageRows.filter(item => departmentOf(item) === department) : coverageRows;
  const areas = [...new Set(source.map(areaOf))].sort((a, b) => a.localeCompare(b, "th"));
  setCoverageOptions(coverageAreaFilter, areas, "ทุกเขตพื้นที่การศึกษา");
}

function renderCoverage() {
  const department = coverageDepartmentFilter.value;
  const area = coverageAreaFilter.value;
  const rows = filterCoverageRows(coverageRows, department, area);
  const assessed = rows.reduce((total, item) => total + item.assessed, 0);
  const summary = summarizeIncompleteSchools(rows);
  coverageIncompleteTotal.textContent = nf.format(summary.total);
  coverageSchoolTotal.textContent = nf.format(summary.schoolTotal);
  coverageDepartmentCards.innerHTML = renderCoverageCards(summary.departments);
  coverageDepartmentGroup.hidden = summary.departments.length === 0;
  coverageAreaCards.innerHTML = renderCoverageCards(summary.areas);
  coverageAreaGroup.hidden = summary.areas.length === 0;
  coverageSummary.hidden = false;
  coverageBody.innerHTML = rows.map(item => {
    const detail = item.issues.length
      ? item.issues.map(issue => `<span class="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">${escapeHtml(labels[issue.dataset.sheetName] || issue.dataset.sheetName)} · ${nf.format(issue.incompleteRows)} รายการ</span>`).join("")
      : item.assessed
        ? `<span class="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Metric ครบใน ${nf.format(item.assessed)} ชุดข้อมูลที่พบ</span>`
        : `<span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">ไม่พบรายการที่ใช้ประเมินในปีนี้ · ไม่ถือว่าขาด</span>`;
    return `<tr class="border-t"><td class="px-4 py-3 font-medium">${escapeHtml(item.school.SCHOOL_NAME || "ไม่มีข้อมูล")}<span class="block text-xs font-normal text-slate-400">${escapeHtml(item.school.SCHOOL_CODE || "")}</span></td><td class="px-4 py-3">${escapeHtml(item.school.DEPARTMENT_NAME || "ไม่มีข้อมูล")}</td><td class="px-4 py-3"><div class="flex max-w-2xl flex-wrap gap-1">${detail}</div></td><td class="px-4 py-3 text-right font-semibold">${nf.format(item.issues.length)}</td></tr>`;
  }).join("") || `<tr class="border-t"><td colspan="4" class="px-4 py-8 text-center text-slate-500">ไม่พบสถานศึกษาตามตัวกรองที่เลือก</td></tr>`;
  coverageStatus.textContent = `แสดง ${nf.format(rows.length)} จาก ${nf.format(coverageRows.length)} สถานศึกษา · ประเมิน ${nf.format(assessed)} ชุดข้อมูลที่มีรายการ · ปี ${coverageLoadedYear}`;
}

function syncCoverageRefresh() { coverageRefresh.disabled = !coverageYear.value || !coverageYear.checkValidity(); }
coverageYear.addEventListener("input", syncCoverageRefresh);
coverageDepartmentFilter.addEventListener("change", () => { updateCoverageAreaOptions(); renderCoverage(); });
coverageAreaFilter.addEventListener("change", renderCoverage);
coverageRefresh.addEventListener("click", async () => {
  const year = Number(coverageYear.value); if (!coverageYear.checkValidity() || !Number.isInteger(year)) { coverageStatus.textContent = "กรุณาระบุปีข้อมูลระหว่าง 2500-2700"; coverageYear.reportValidity(); return; }
  coverageRefresh.disabled = true; coverageYear.disabled = true; coverageDepartmentFilter.disabled = true; coverageAreaFilter.disabled = true; coverageStatus.textContent = `กำลังตรวจ ${nf.format(coverageDatasets.length)} ชุดข้อมูล…`; coverageBody.replaceChildren(); coverageSummary.hidden = true;
  try {
    const schools = await api.allRows("DB1", "School_Info");
    const results = await Promise.all(coverageDatasets.map(item => api.allRows(item.dbKey, item.sheetName, { filters: { [yearField(item.definition)]: year }, bypassCache: true })));
    coverageRows = analyzeMetricCoverage(schools, coverageDatasets, results);
    coverageLoadedYear = year;
    setCoverageOptions(coverageDepartmentFilter, [...new Set(coverageRows.map(departmentOf))].sort((a, b) => a.localeCompare(b, "th")), "ทุกสังกัด");
    updateCoverageAreaOptions();
    coverageDepartmentFilter.disabled = false;
    coverageAreaFilter.disabled = false;
    renderCoverage();
  } catch (error) { coverageStatus.textContent = error.message || "ตรวจสอบไม่สำเร็จ"; }
  finally { coverageYear.disabled = false; syncCoverageRefresh(); }
});

populateDatasets();
populateSchoolSuggestions();
syncCoverageRefresh();
