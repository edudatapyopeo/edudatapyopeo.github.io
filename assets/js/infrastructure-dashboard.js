(() => {
  "use strict";

  const api = window.PYOEDUDataClient;
  const nf = new Intl.NumberFormat("th-TH");
  const charts = {};
  const ids = [
    "infrastructureLastUpdated", "infrastructureError", "infrastructureErrorMessage", "infrastructureRetry",
    "infrastructureFilterForm", "infrastructureYear", "infrastructureDepartment", "infrastructureArea", "infrastructureReset",
    "infrastructureSchools", "infrastructureTypes", "infrastructureAvailable", "infrastructureRate", "infrastructureRateNote",
    "infrastructureTypeChart", "infrastructureStatusChart", "infrastructureTableSummary", "infrastructureBody",
    "infrastructureLoading", "infrastructureLoadingTitle", "infrastructureLoadingStep", "infrastructureLoadingBar"
  ];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

  function fillSelect(select, values, allLabel, selected = "") {
    const options = [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
    select.replaceChildren(new Option(allLabel, ""), ...options.map(value => new Option(value, value)));
    select.value = options.includes(String(selected)) ? String(selected) : "";
  }

  function fillYears(values, selected = "") {
    const years = [...new Set(values.map(String).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
    el.infrastructureYear.replaceChildren(...years.map(value => new Option(value, value)));
    el.infrastructureYear.value = years.includes(String(selected)) ? String(selected) : (years[0] || "");
  }

  function setLoading(show, title = "กำลังโหลดข้อมูล", step = "กำลังเชื่อมต่อ API", progress = 8) {
    el.infrastructureLoading.hidden = !show;
    el.infrastructureLoadingTitle.textContent = title;
    el.infrastructureLoadingStep.textContent = step;
    el.infrastructureLoadingBar.style.width = `${Math.min(100, Math.max(8, progress))}%`;
  }

  function dimensionFilters() {
    const filters = {};
    if (el.infrastructureDepartment.value) filters.DEPARTMENT_NAME = el.infrastructureDepartment.value;
    if (el.infrastructureArea.value) filters.EDU_AREA_NAME = el.infrastructureArea.value;
    return filters;
  }

  async function allowedCodes() {
    const filters = dimensionFilters();
    if (!Object.keys(filters).length) return null;
    const rows = await api.allRows("DB1", "School_Info", { filters });
    return new Set(rows.map(row => String(row.SCHOOL_CODE || "")).filter(Boolean));
  }

  function normalizeStatus(value) {
    const status = String(value ?? "").trim().toLowerCase();
    if (["มี", "y", "yes", "ใช่", "1", "true"].includes(status)) return "มี";
    if (["ไม่มี", "n", "no", "ไม่", "0", "false"].includes(status)) return "ไม่มี";
    return "ไม่มีข้อมูล";
  }

  function safeLabel(value) {
    return String(value ?? "").trim() || "ไม่มีข้อมูล";
  }

  async function loadMetadata() {
    setLoading(true, "กำลังเตรียมตัวกรอง", "อ่านปี สังกัด และพื้นที่", 15);
    const [years, schools] = await Promise.all([
      api.metadata("DB4", "Infrastructure_School", ["YEAR"]),
      api.metadata("DB1", "School_Info", ["DEPARTMENT_NAME", "EDU_AREA_NAME"])
    ]);
    fillYears(years.data.YEAR || [], el.infrastructureYear.value);
    fillSelect(el.infrastructureDepartment, schools.data.DEPARTMENT_NAME || [], "ทุกสังกัด", el.infrastructureDepartment.value);
    fillSelect(el.infrastructureArea, schools.data.EDU_AREA_NAME || [], "ทุกพื้นที่", el.infrastructureArea.value);
  }

  async function loadDashboard() {
    el.infrastructureError.hidden = true;
    setLoading(true, "กำลังโหลด Dashboard โครงสร้างพื้นฐาน", "อ่านสถานะรายสถานศึกษา", 20);
    try {
      const filters = el.infrastructureYear.value ? { YEAR: el.infrastructureYear.value } : {};
      const [result, codes] = await Promise.all([
        api.summary("DB4", "Infrastructure_School", {
          groupBy: ["SCHOOL_CODE", "SCHOOL_NAME", "INFRASTRUCTURE", "STATUS_Y_N"],
          metrics: [],
          filters
        }),
        allowedCodes()
      ]);
      const rows = (result.data || []).filter(row => codes === null || codes.has(String(row.SCHOOL_CODE || "")));
      render(rows);
      el.infrastructureLastUpdated.textContent = `อัปเดตหน้าจอ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;
    } catch (error) {
      el.infrastructureErrorMessage.textContent = `${error.message || "ไม่ทราบสาเหตุ"} กรุณาลองใหม่`;
      el.infrastructureError.hidden = false;
    } finally {
      setLoading(false);
    }
  }

  function summarize(rows) {
    const groups = new Map();
    rows.forEach(row => {
      const type = safeLabel(row.INFRASTRUCTURE);
      if (!groups.has(type)) groups.set(type, { type, yes: 0, no: 0, unknown: 0 });
      const item = groups.get(type);
      const status = normalizeStatus(row.STATUS_Y_N);
      if (status === "มี") item.yes += 1;
      else if (status === "ไม่มี") item.no += 1;
      else item.unknown += 1;
    });
    return [...groups.values()].sort((a, b) => (b.yes + b.no + b.unknown) - (a.yes + a.no + a.unknown) || a.type.localeCompare(b.type, "th"));
  }

  function render(rows) {
    const summary = summarize(rows);
    const yes = summary.reduce((total, item) => total + item.yes, 0);
    const no = summary.reduce((total, item) => total + item.no, 0);
    const unknown = summary.reduce((total, item) => total + item.unknown, 0);
    const known = yes + no;
    const schools = new Set(rows.map(row => String(row.SCHOOL_CODE || "")).filter(Boolean)).size;

    el.infrastructureSchools.textContent = nf.format(schools);
    el.infrastructureTypes.textContent = nf.format(summary.length);
    el.infrastructureAvailable.textContent = nf.format(yes);
    el.infrastructureRate.textContent = known ? `${(yes * 100 / known).toFixed(1)}%` : "ไม่มีข้อมูล";
    el.infrastructureRateNote.textContent = `คำนวณจาก ${nf.format(known)} รายการที่ระบุ “มี/ไม่มี” · ไม่มีข้อมูล ${nf.format(unknown)} รายการ`;
    el.infrastructureTableSummary.textContent = `พบ ${nf.format(rows.length)} ชุดสถานะ จาก ${nf.format(schools)} สถานศึกษา`;

    el.infrastructureBody.replaceChildren(...summary.map(item => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-slate-100";
      const knownForType = item.yes + item.no;
      const values = [item.type, item.yes, item.no, item.unknown, knownForType ? `${(item.yes * 100 / knownForType).toFixed(1)}%` : "ไม่มีข้อมูล"];
      values.forEach((value, index) => {
        const td = document.createElement("td");
        td.className = `px-5 py-3 ${index ? "text-right" : "font-medium"}`;
        td.textContent = index > 0 && index < 4 ? nf.format(value) : value;
        tr.append(td);
      });
      return tr;
    }));

    replaceChart("type", el.infrastructureTypeChart, {
      type: "bar",
      data: {
        labels: summary.map(item => item.type),
        datasets: [
          { label: "มี", data: summary.map(item => item.yes), backgroundColor: "#059669", borderRadius: 5 },
          { label: "ไม่มี", data: summary.map(item => item.no), backgroundColor: "#e11d48", borderRadius: 5 },
          { label: "ไม่มีข้อมูล", data: summary.map(item => item.unknown), backgroundColor: "#94a3b8", borderRadius: 5 }
        ]
      },
      options: { maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { position: "bottom" } }, scales: { x: { beginAtZero: true, stacked: true }, y: { stacked: true } } }
    });

    replaceChart("status", el.infrastructureStatusChart, {
      type: "doughnut",
      data: { labels: ["มี", "ไม่มี", "ไม่มีข้อมูล"], datasets: [{ data: [yes, no, unknown], backgroundColor: ["#059669", "#e11d48", "#94a3b8"], borderColor: "#fff", borderWidth: 3 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: context => `${context.label}: ${nf.format(context.raw)} รายการ` } } } }
    });
  }

  function replaceChart(key, canvas, config) {
    charts[key]?.destroy();
    charts[key] = new window.Chart(canvas, config);
  }

  el.infrastructureFilterForm.addEventListener("submit", event => { event.preventDefault(); loadDashboard(); });
  el.infrastructureReset.addEventListener("click", () => {
    el.infrastructureYear.value = el.infrastructureYear.options[0]?.value || "";
    el.infrastructureDepartment.value = "";
    el.infrastructureArea.value = "";
    loadDashboard();
  });
  el.infrastructureRetry.addEventListener("click", loadDashboard);
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadMetadata();
      await loadDashboard();
    } catch (error) {
      el.infrastructureErrorMessage.textContent = error.message;
      el.infrastructureError.hidden = false;
      setLoading(false);
    }
  });
})();
