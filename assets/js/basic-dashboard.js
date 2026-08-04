(function () {
  "use strict";

  const api = window.PYOEDUDataClient;
  const numberFormatter = new Intl.NumberFormat("th-TH");
  const state = {
    schoolPage: 1,
    schoolPageSize: 10,
    schoolRows: [],
    schoolPagination: null,
    search: "",
    chart: null,
    map: null,
    markerLayer: null,
    mapRenderVersion: 0,
    lastFocusedElement: null
  };

  const elements = Object.fromEntries([
    "errorBanner", "errorMessage", "retryButton", "filterForm", "yearFilter", "departmentFilter", "areaFilter",
    "resetFilters", "schoolCount", "studentTotal", "teacherTotal", "classroomTotal", "studentMale", "studentFemale",
    "teacherMale", "teacherFemale", "missingDataNote", "schoolTableSummary", "schoolTableBody", "schoolPageInfo",
    "previousPage", "nextPage", "schoolSearch", "lastUpdated", "loadingOverlay", "loadingTitle", "loadingStep",
    "loadingBar", "mapToggle", "mapPanel", "mapSummary", "schoolModal", "schoolModalTitle", "schoolModalDetails",
    "schoolModalClose"
  ].map(id => [id, document.getElementById(id)]));

  function setLoading(visible, title = "กำลังโหลดข้อมูล", step = "กำลังเชื่อมต่อ API", percent = 5) {
    elements.loadingOverlay.hidden = !visible;
    elements.loadingTitle.textContent = title;
    elements.loadingStep.textContent = step;
    elements.loadingBar.style.width = `${Math.max(5, Math.min(percent, 100))}%`;
  }

  function showError(error) {
    elements.errorMessage.textContent = `${error.message || "ไม่ทราบสาเหตุ"} กรุณาตรวจสอบการเชื่อมต่อแล้วกดลองใหม่`;
    elements.errorBanner.hidden = false;
  }

  function clearError() {
    elements.errorBanner.hidden = true;
    elements.errorMessage.textContent = "";
  }

  function fillSelect(select, values, allLabel, selected = "") {
    select.replaceChildren(new Option(allLabel, ""));
    values.forEach(value => select.add(new Option(String(value), String(value))));
    if ([...select.options].some(option => option.value === String(selected))) select.value = String(selected);
  }

  function sortYears(values) {
    return [...values].sort((left, right) => Number(right) - Number(left));
  }

  function fillYearSelect(values, selected = "") {
    elements.yearFilter.replaceChildren();
    values.forEach(value => elements.yearFilter.add(new Option(String(value), String(value))));
    const requested = String(selected || "");
    elements.yearFilter.value = values.map(String).includes(requested) ? requested : String(values[0] || "");
  }

  function currentFilters() {
    const filters = {};
    if (elements.yearFilter.value) filters.YEAR = elements.yearFilter.value;
    if (elements.departmentFilter.value) filters.DEPARTMENT_NAME = elements.departmentFilter.value;
    if (elements.areaFilter.value) filters.EDU_AREA_NAME = elements.areaFilter.value;
    return filters;
  }

  function schoolFilters() {
    const filters = currentFilters();
    delete filters.YEAR;
    return filters;
  }

  function yearFilters() {
    return elements.yearFilter.value ? { YEAR: elements.yearFilter.value } : {};
  }

  function numberValue(value) {
    const number = Number(String(value ?? 0).replace(/,/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function sumMetric(rows, field) {
    return rows.reduce((total, row) => total + numberValue(row[field]), 0);
  }

  function displayNumber(element, value) {
    const missing = value === null || !Number.isFinite(value);
    element.textContent = missing ? "ไม่มีข้อมูล" : numberFormatter.format(value);
    element.style.fontSize = missing ? "1rem" : "";
  }

  function displayText(value) {
    return value === null || value === undefined || String(value).trim() === "" ? "ไม่มีข้อมูล" : String(value);
  }

  async function loadMetadata() {
    setLoading(true, "กำลังเตรียมตัวกรอง", "อ่านปี สังกัด และพื้นที่การศึกษา", 15);
    const [studentMetadata, schoolMetadata] = await Promise.all([
      api.metadata("DB1", "Student_Count", ["YEAR"]),
      api.metadata("DB1", "School_Info", ["DEPARTMENT_NAME", "EDU_AREA_NAME"])
    ]);
    const years = sortYears(studentMetadata.data.YEAR || []);
    fillYearSelect(years, elements.yearFilter.value || years[0]);
    fillSelect(elements.departmentFilter, schoolMetadata.data.DEPARTMENT_NAME || [], "ทุกสังกัด", elements.departmentFilter.value);
    fillSelect(elements.areaFilter, schoolMetadata.data.EDU_AREA_NAME || [], "ทุกพื้นที่", elements.areaFilter.value);
  }

  function summaryRequest(sheetName, metrics) {
    return api.summary("DB1", sheetName, { groupBy: ["SCHOOL_CODE"], metrics, filters: yearFilters() });
  }

  async function allowedSchoolCodes() {
    const filters = schoolFilters();
    if (!Object.keys(filters).length) return null;
    const schools = await api.allRows("DB1", "School_Info", { filters });
    return new Set(schools.map(school => String(school.SCHOOL_CODE || "")).filter(Boolean));
  }

  function rowsForSchools(result, allowedCodes) {
    const rows = result.data || [];
    if (allowedCodes === null) return rows;
    return rows.filter(row => allowedCodes.has(String(row.SCHOOL_CODE || "")));
  }

  async function loadDashboard() {
    clearError();
    closeMap();
    setLoading(true, "กำลังโหลด Dashboard", "เริ่มอ่านข้อมูลสรุป", 10);
    let completed = 0;
    const tasks = [
      summaryRequest("Student_Count", ["STUDENT_MALE_COUNT", "STUDENT_FEMALE_COUNT"]),
      summaryRequest("Teacher_Count", ["TEACHER_MALE_COUNT", "TEACHER_FEMALE_COUNT"]),
      summaryRequest("Classroom_Count", ["CLASSROOM_COUNT"]),
      loadSchoolPage(),
      allowedSchoolCodes()
    ].map(promise => promise.finally(() => {
      completed += 1;
      elements.loadingStep.textContent = `โหลดข้อมูลแล้ว ${completed} จาก 5 ส่วน`;
      elements.loadingBar.style.width = `${15 + completed * 16}%`;
    }));

    try {
      const [students, teachers, classrooms, , allowedCodes] = await Promise.all(tasks);
      renderSummary(students, teachers, classrooms, allowedCodes);
      elements.lastUpdated.textContent = `อัปเดตหน้าจอ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }

  function renderSummary(students, teachers, classrooms, allowedCodes) {
    const studentRows = rowsForSchools(students, allowedCodes);
    const teacherRows = rowsForSchools(teachers, allowedCodes);
    const classroomRows = rowsForSchools(classrooms, allowedCodes);
    const studentMale = sumMetric(studentRows, "STUDENT_MALE_COUNT");
    const studentFemale = sumMetric(studentRows, "STUDENT_FEMALE_COUNT");
    const teacherMale = sumMetric(teacherRows, "TEACHER_MALE_COUNT");
    const teacherFemale = sumMetric(teacherRows, "TEACHER_FEMALE_COUNT");
    const classroomCount = sumMetric(classroomRows, "CLASSROOM_COUNT");
    displayNumber(elements.studentMale, studentMale);
    displayNumber(elements.studentFemale, studentFemale);
    displayNumber(elements.studentTotal, studentMale + studentFemale);
    displayNumber(elements.teacherMale, teacherMale);
    displayNumber(elements.teacherFemale, teacherFemale);
    displayNumber(elements.teacherTotal, teacherMale + teacherFemale);
    displayNumber(elements.classroomTotal, classroomCount);
    displayNumber(elements.schoolCount, new Set(studentRows.map(row => String(row.SCHOOL_CODE || "")).filter(Boolean)).size);
    renderGenderChart(studentMale, studentFemale);
    elements.missingDataNote.hidden = true;
    elements.missingDataNote.textContent = "";
  }

  function renderGenderChart(male, female) {
    state.chart?.destroy();
    state.chart = null;
    const canvas = document.getElementById("studentGenderChart");
    if (male === null && female === null) {
      canvas.setAttribute("aria-label", "ไม่มีข้อมูลนักเรียนสำหรับสร้างกราฟ");
      return;
    }
    if (window.ChartDataLabels) window.Chart.register(window.ChartDataLabels);
    state.chart = new window.Chart(canvas, {
      type: "doughnut",
      data: { labels: ["ชาย", "หญิง"], datasets: [{ data: [male || 0, female || 0], backgroundColor: ["#2563eb", "#e11d48"], borderColor: "#ffffff", borderWidth: 3 }] },
      options: {
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { usePointStyle: true, padding: 18 } },
          tooltip: { callbacks: { label: context => `${context.label}: ${numberFormatter.format(context.raw)} คน` } },
          datalabels: { color: "#ffffff", font: { weight: "bold" }, formatter: value => value ? numberFormatter.format(value) : "" }
        }
      }
    });
  }

  async function loadSchoolPage() {
    const result = await api.rows("DB1", "School_Info", {
      page: state.schoolPage,
      pageSize: state.schoolPageSize,
      search: state.search,
      searchFields: ["SCHOOL_CODE", "SCHOOL_NAME", "DISTRICT", "SUB_DISTRICT"],
      filters: schoolFilters()
    });
    state.schoolRows = result.data || [];
    state.schoolPagination = result.pagination;
    renderSchoolTable();
    return result;
  }

  function cell(text, className = "px-4 py-3") {
    const element = document.createElement("td");
    element.className = className;
    element.textContent = text;
    return element;
  }

  function renderSchoolTable() {
    elements.schoolTableBody.replaceChildren();
    const pagination = state.schoolPagination;
    if (!state.schoolRows.length) {
      const row = document.createElement("tr");
      const empty = cell("ไม่พบสถานศึกษาตามเงื่อนไข", "px-4 py-10 text-center text-slate-500");
      empty.colSpan = 5;
      row.append(empty);
      elements.schoolTableBody.append(row);
    } else {
      state.schoolRows.forEach((school, index) => {
        const row = document.createElement("tr");
        row.className = "hover:bg-slate-50";
        row.append(cell(numberFormatter.format((pagination.page - 1) * pagination.pageSize + index + 1), "px-4 py-3 text-center text-slate-400"));
        const schoolCell = cell("", "px-4 py-3");
        const name = document.createElement("strong");
        name.className = "block text-slate-800";
        name.textContent = displayText(school.SCHOOL_NAME);
        const code = document.createElement("span");
        code.className = "mt-1 block text-xs text-slate-400";
        code.textContent = `รหัส ${displayText(school.SCHOOL_CODE)}`;
        schoolCell.append(name, code);
        row.append(schoolCell, cell(displayText(school.DEPARTMENT_NAME)), cell(displayText(school.DISTRICT)));
        const actionCell = cell("", "px-4 py-3 text-center");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "focus-ring rounded-lg bg-pyo-50 px-3 py-2 text-sm font-semibold text-pyo-700 hover:bg-pyo-100";
        button.textContent = "ดูข้อมูล";
        button.dataset.schoolIndex = String(index);
        actionCell.append(button);
        row.append(actionCell);
        elements.schoolTableBody.append(row);
      });
    }
    elements.schoolTableSummary.textContent = `พบ ${numberFormatter.format(pagination.totalRows)} แห่ง`;
    elements.schoolPageInfo.textContent = `หน้า ${numberFormatter.format(pagination.page)} จาก ${numberFormatter.format(pagination.totalPages)}`;
    elements.previousPage.disabled = pagination.page <= 1;
    elements.nextPage.disabled = !pagination.hasMore;
  }

  function showSchoolModal(school, trigger) {
    state.lastFocusedElement = trigger;
    elements.schoolModalTitle.textContent = displayText(school.SCHOOL_NAME);
    elements.schoolModalDetails.replaceChildren();
    const fields = [
      ["รหัสสถานศึกษา", school.SCHOOL_CODE], ["สังกัด", school.DEPARTMENT_NAME], ["พื้นที่การศึกษา", school.EDU_AREA_NAME],
      ["อำเภอ", school.DISTRICT], ["ตำบล", school.SUB_DISTRICT], ["ประเภทสถานศึกษา", school.SCHOOL_TYPE],
      ["สถานะ", school.SCHOOL_STATUS], ["โรงเรียนควบรวม", school.JOINT_SCHOOL], ["ระดับที่เปิดสอน", school.OPEN_CLASS_LEVEL],
      ["ผู้อำนวยการ", school.PRINCIPAL_NAME]
    ];
    fields.forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "rounded-xl bg-slate-50 p-4";
      const term = document.createElement("dt");
      term.className = "text-xs font-semibold text-slate-500";
      term.textContent = label;
      const description = document.createElement("dd");
      description.className = "mt-1 font-medium text-slate-800";
      description.textContent = displayText(value);
      wrapper.append(term, description);
      elements.schoolModalDetails.append(wrapper);
    });
    elements.schoolModal.hidden = false;
    document.body.classList.add("overflow-hidden");
    elements.schoolModalClose.focus();
  }

  function closeSchoolModal() {
    if (elements.schoolModal.hidden) return;
    elements.schoolModal.hidden = true;
    document.body.classList.remove("overflow-hidden");
    state.lastFocusedElement?.focus();
  }

  function parseCoordinate(value) {
    const parts = String(value || "").split(",").map(Number);
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
    if (parts[0] < -90 || parts[0] > 90 || parts[1] < -180 || parts[1] > 180) return null;
    return parts;
  }

  async function openMap() {
    elements.mapPanel.hidden = false;
    elements.mapToggle.setAttribute("aria-expanded", "true");
    elements.mapToggle.querySelector("[data-map-label]").textContent = "ปิดแผนที่";
    setLoading(true, "กำลังโหลดแผนที่", "อ่านข้อมูลสถานศึกษา", 10);
    try {
      const schools = await api.allRows("DB1", "School_Info", {
        filters: schoolFilters(),
        searchFields: ["SCHOOL_CODE", "SCHOOL_NAME", "DISTRICT", "SUB_DISTRICT"],
        onProgress: (loaded, total) => {
          elements.loadingStep.textContent = `อ่านแล้ว ${numberFormatter.format(loaded)} จาก ${numberFormatter.format(total)} แห่ง`;
          elements.loadingBar.style.width = `${Math.max(10, Math.min(85, total ? loaded / total * 85 : 10))}%`;
        }
      });
      initMap();
      await renderMapMarkers(schools);
    } catch (error) {
      showError(error);
      closeMap();
    } finally {
      setLoading(false);
    }
  }

  function initMap() {
    if (state.map) return;
    state.map = window.L.map("schoolMap", { preferCanvas: true }).setView([19.19, 99.88], 9);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(state.map);
    state.markerLayer = window.L.layerGroup().addTo(state.map);
  }

  function renderMapMarkers(schools) {
    const version = ++state.mapRenderVersion;
    state.markerLayer.clearLayers();
    const valid = schools.map(school => ({ school, coordinate: parseCoordinate(school.COORDI) })).filter(item => item.coordinate);
    const bounds = [];
    let index = 0;
    return new Promise(resolve => {
      function addChunk() {
        if (version !== state.mapRenderVersion || !state.map) return resolve();
        const end = Math.min(index + 40, valid.length);
        for (; index < end; index += 1) {
          const item = valid[index];
          const popup = document.createElement("div");
          const title = document.createElement("strong");
          title.textContent = displayText(item.school.SCHOOL_NAME);
          const detail = document.createElement("p");
          detail.textContent = displayText(item.school.DISTRICT);
          popup.append(title, detail);
          window.L.marker(item.coordinate).bindPopup(popup).addTo(state.markerLayer);
          bounds.push(item.coordinate);
        }
        elements.mapSummary.textContent = `กำลังสร้างหมุด ${numberFormatter.format(index)} จาก ${numberFormatter.format(valid.length)} แห่ง`;
        if (index < valid.length) return window.requestAnimationFrame(addChunk);
        if (bounds.length) state.map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 });
        elements.mapSummary.textContent = valid.length ? `แสดงพิกัดที่ถูกต้อง ${numberFormatter.format(valid.length)} แห่ง` : "ไม่พบพิกัดที่ถูกต้องตามตัวกรอง";
        resolve();
      }
      window.requestAnimationFrame(addChunk);
    });
  }

  function closeMap() {
    state.mapRenderVersion += 1;
    if (state.markerLayer) state.markerLayer.clearLayers();
    if (state.map) state.map.remove();
    state.map = null;
    state.markerLayer = null;
    elements.mapPanel.hidden = true;
    elements.mapToggle.setAttribute("aria-expanded", "false");
    elements.mapToggle.querySelector("[data-map-label]").textContent = "เปิดแผนที่";
    elements.mapSummary.textContent = "แผนที่จะโหลดเมื่อกดเปิดเท่านั้น";
  }

  function bindEvents() {
    elements.filterForm.addEventListener("submit", event => { event.preventDefault(); state.schoolPage = 1; loadDashboard(); });
    elements.resetFilters.addEventListener("click", () => {
      elements.yearFilter.value = elements.yearFilter.options[0]?.value || "";
      elements.departmentFilter.value = "";
      elements.areaFilter.value = "";
      elements.schoolSearch.value = "";
      state.search = "";
      state.schoolPage = 1;
      loadDashboard();
    });
    elements.retryButton.addEventListener("click", loadDashboard);
    elements.previousPage.addEventListener("click", () => { if (state.schoolPage > 1) { state.schoolPage -= 1; loadSchoolPage().catch(showError); } });
    elements.nextPage.addEventListener("click", () => { if (state.schoolPagination?.hasMore) { state.schoolPage += 1; loadSchoolPage().catch(showError); } });
    let searchTimer;
    elements.schoolSearch.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => { state.search = elements.schoolSearch.value.trim(); state.schoolPage = 1; loadSchoolPage().catch(showError); }, 350);
    });
    elements.schoolTableBody.addEventListener("click", event => {
      const button = event.target.closest("button[data-school-index]");
      if (!button) return;
      showSchoolModal(state.schoolRows[Number(button.dataset.schoolIndex)], button);
    });
    elements.schoolModalClose.addEventListener("click", closeSchoolModal);
    elements.schoolModal.addEventListener("click", event => { if (event.target === elements.schoolModal) closeSchoolModal(); });
    elements.mapToggle.addEventListener("click", () => state.map ? closeMap() : openMap());
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeSchoolModal(); });
  }

  async function init() {
    bindEvents();
    clearError();
    try {
      await loadMetadata();
      await loadDashboard();
    } catch (error) {
      setLoading(false);
      showError(error);
    }
  }

  init();
})();
