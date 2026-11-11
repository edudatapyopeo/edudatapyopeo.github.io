(() => {
  "use strict";

  const api = window.PYOEDUDataClient;
  const fallbackIndicators = [
    ["4.1.1", "4.1", "สัดส่วนของเด็ก/เยาวชนในระดับ ป.2 หรือ ป.3 ป.6 และ ม.3 ที่มีความสามารถตามเกณฑ์ขั้นต่ำด้านการอ่านและคณิตศาสตร์ จำแนกตามเพศ"],
    ["4.1.2", "4.1", "อัตราการสำเร็จการศึกษาระดับประถมศึกษา มัธยมศึกษาตอนต้น และมัธยมศึกษาตอนปลาย"],
    ["4.2.1", "4.2", "สัดส่วนเด็กอายุ 24–59 เดือนที่มีพัฒนาการตามเกณฑ์ จำแนกตามเพศ"],
    ["4.2.2", "4.2", "อัตราการเข้าเรียนปฐมวัยอย่างน้อยหนึ่งปีก่อนถึงเกณฑ์เข้าเรียนประถมศึกษา จำแนกตามเพศ"],
    ["4.3.1", "4.3", "อัตราการเข้าเรียนและเข้าร่วมการฝึกอบรมของเยาวชนและผู้ใหญ่ในช่วง 12 เดือนที่ผ่านมา จำแนกตามเพศ"],
    ["4.4.1", "4.4", "จำนวนประชาชนอายุ 6 ปีขึ้นไป จำแนกตามการใช้อินเทอร์เน็ต/โทรศัพท์มือถือ และการมีโทรศัพท์มือถือ"],
    ["4.5.1", "4.5", "ดัชนีความเท่าเทียมทางเพศ (ชาย/หญิง) ของอัตราการเข้าเรียนสุทธิ"],
    ["4.6.1", "4.6", "อัตราการไม่รู้หนังสือของผู้ที่มีอายุ 7 ปีขึ้นไป และ 15 ปีขึ้นไป"],
    ["4.7.1", "4.7", "จำนวนโครงการและจำนวนกลุ่มเป้าหมายด้านการศึกษาเพื่อการพัฒนาที่ยั่งยืน"],
    ["4.a.1", "4.a", "สัดส่วนโรงเรียนที่เข้าถึงบริการขั้นพื้นฐาน จำแนกตามประเภทบริการ"],
    ["4.b.1", "4.b", "จำนวนทุนที่ผู้เรียนในจังหวัดได้รับ จำแนกตามสาขาและประเภทการศึกษา"],
    ["4.c.1", "4.c", "สัดส่วนครูที่มีคุณวุฒิเหมาะสมในการจัดการศึกษาพื้นฐาน จำแนกตามระดับการศึกษา"]
  ].map(([INDICATOR_ID, SDG4_TARGET_ID, INDICATOR_NAME_TH]) => ({ INDICATOR_ID, SDG4_TARGET_ID, INDICATOR_NAME_TH }));

  const fallbackTargets = Object.fromEntries([
    ["4.1", "การศึกษาขั้นพื้นฐานที่มีคุณภาพ"], ["4.2", "การพัฒนาและการศึกษาปฐมวัย"],
    ["4.3", "การศึกษา อาชีวศึกษา และอุดมศึกษา"], ["4.4", "ทักษะสำหรับการทำงาน"],
    ["4.5", "ความเท่าเทียมทางการศึกษา"], ["4.6", "การอ่านออกเขียนได้และการคำนวณ"],
    ["4.7", "การศึกษาเพื่อการพัฒนาที่ยั่งยืน"], ["4.a", "บริการพื้นฐานและสภาพแวดล้อมการเรียนรู้"],
    ["4.b", "ทุนการศึกษา"], ["4.c", "ครูที่มีคุณวุฒิเหมาะสม"]
  ]);

  const state = {
    indicators: fallbackIndicators,
    targets: fallbackTargets,
    projects: [],
    demo: false,
    indicatorData: { nt: [], onet: [], graduates: [], students: [], earlyChild: [], population: [], internetMobile: [], illiteracy: [], projects: [], infrastructure: [], errors: new Set() }
  };
  const indicatorNameOverrides = Object.freeze({
    "4.4.1": "จำนวนประชาชนอายุ 6 ปีขึ้นไป จำแนกตามการใช้อินเทอร์เน็ต/โทรศัพท์มือถือ และการมีโทรศัพท์มือถือ",
    "4.5.1": "ดัชนีความเท่าเทียมทางเพศ (ชาย/หญิง) ของอัตราการเข้าเรียนสุทธิ",
    "4.6.1": "อัตราการไม่รู้หนังสือของผู้ที่มีอายุ 7 ปีขึ้นไป และ 15 ปีขึ้นไป",
    "4.7.1": "จำนวนโครงการและจำนวนกลุ่มเป้าหมายด้านการศึกษาเพื่อการพัฒนาที่ยั่งยืน"
  });
  const byId = id => document.getElementById(id);
  const text = value => String(value ?? "").trim();
  const html = value => text(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
  const safeUrl = value => { try { const url = new URL(text(value)); return url.protocol === "https:" ? url.href : ""; } catch (_) { return ""; } };
  const money = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value)) : "–";
  const number = value => { const output = Number(value); return Number.isFinite(output) ? output : 0; };
  const countFormat = new Intl.NumberFormat("th-TH");
  const percentFormat = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const decimalFormat = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const indicatorName = row => indicatorNameOverrides[text(row.INDICATOR_ID)] || text(row.INDICATOR_NAME_TH);

  function setOptions(select, values, label) {
    if (!select) return;
    const current = select.value;
    select.replaceChildren(new Option(label, ""), ...[...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "th", { numeric: true })).map(value => new Option(value, value)));
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  function selectedMulti(id) {
    const root = byId(id);
    return root ? [...root.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value) : [];
  }

  function updateMultiSummary(root, allLabel) {
    const checked = [...root.querySelectorAll('input[type="checkbox"]:checked')];
    const summary = root.querySelector("[data-summary]");
    if (!summary) return;
    summary.textContent = checked.length === 0 ? allLabel : checked.length === 1 ? checked[0].dataset.label : `เลือกแล้ว ${checked.length} รายการ`;
  }

  function setMultiOptions(root, items, allLabel) {
    if (!root) return;
    const selected = new Set(selectedMulti(root.id));
    const optionBox = root.querySelector("[data-options]");
    const normalized = items.filter(item => item.value).sort((left, right) => left.label.localeCompare(right.label, "th", { numeric: true }));
    optionBox.replaceChildren(...normalized.map(item => {
      const label = document.createElement("label");
      label.className = "sdg4-filter-choice flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 has-[:checked]:bg-emerald-50";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = item.value;
      input.checked = selected.has(item.value);
      input.dataset.label = item.label;
      input.setAttribute("aria-label", item.description ? `${item.label} ${item.description}` : item.label);
      input.className = "mt-1 shrink-0 accent-emerald-700";
      const content = document.createElement("span");
      const title = document.createElement("strong");
      title.className = "block text-slate-800";
      title.textContent = item.label;
      content.append(title);
      if (item.description) {
        const description = document.createElement("span");
        description.className = "mt-0.5 block text-xs font-normal leading-5 text-slate-500";
        description.textContent = item.description;
        content.append(description);
      }
      input.addEventListener("change", () => { updateMultiSummary(root, allLabel); renderProjects(); });
      label.append(input, content);
      return label;
    }));
    const clear = root.querySelector("[data-clear]");
    clear.onclick = () => {
      root.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
      updateMultiSummary(root, allLabel);
      renderProjects();
    };
    updateMultiSummary(root, allLabel);
  }

  function latestYear(rows, field = "YEAR") {
    const years = rows.map(row => Number(row[field])).filter(Number.isFinite);
    return years.length ? Math.max(...years) : null;
  }

  function sumFields(rows, maleField, femaleField) {
    return rows.reduce((output, row) => output + number(row[maleField]) + number(row[femaleField]), 0);
  }

  function rate(numerator, denominator) {
    return denominator > 0 ? `${percentFormat.format(numerator / denominator * 100)}%` : "–";
  }

  function resultCard({ title, year, metrics, unavailable = false, equalMetrics = false }) {
    const metricHtml = metrics.map((metric, index) => { const featured = !equalMetrics && index === 0; return `<div class="${featured ? "sm:col-span-2" : ""}"><dt class="text-xs font-semibold text-slate-500">${html(metric.label)}</dt><dd class="mt-1 ${featured ? "text-3xl text-pyo-700" : "text-xl text-slate-900"} font-bold">${html(metric.value)}</dd>${metric.detail ? `<p class="mt-1 text-xs text-slate-500">${html(metric.detail)}</p>` : ""}</div>`; }).join("");
    return `<article class="rounded-2xl border ${unavailable ? "border-dashed border-slate-300" : "border-slate-200"} bg-white p-5 shadow-soft"><div class="flex items-start justify-between gap-3"><h4 class="font-bold leading-6 text-slate-900">${html(title)}</h4><span class="shrink-0 rounded-full ${unavailable ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700"} px-2.5 py-1 text-xs font-bold">${year ? `ปี ${html(year)}` : "รอข้อมูล"}</span></div><dl class="mt-5 grid grid-cols-2 gap-4">${metricHtml}</dl></article>`;
  }

  function scoreCard(title, rows, level = "") {
    const year = latestYear(rows);
    const selectedRows = rows.filter(row => Number(row.YEAR) === year && (!level || text(row.EDU_LEVEL) === level));
    const thai = selectedRows.find(row => /ภาษาไทย|การอ่าน/i.test(text(row.TEST_SUBJECT)));
    const math = selectedRows.find(row => /คณิต/i.test(text(row.TEST_SUBJECT)));
    const unavailable = !year || (!thai && !math);
    const scoreDescription = level ? "นักเรียนที่มีคะแนนมากกว่า 50 คะแนน" : "นักเรียนที่มีคะแนนระดับดีขึ้นไป";
    return resultCard({
      title,
      year,
      source: level ? "PYOEDU_DB5_TESTSCORE / ONET_Score / MOREHALF_SCORE" : "PYOEDU_DB5_TESTSCORE / NT_Score / MOREHALF_SCORE",
      unavailable,
      equalMetrics: true,
      metrics: [
        { label: "ภาษาไทย / การอ่าน", value: thai ? `${percentFormat.format(number(thai.MOREHALF_SCORE))}%` : "–", detail: scoreDescription },
        { label: "คณิตศาสตร์ / การคิดคำนวณ", value: math ? `${percentFormat.format(number(math.MOREHALF_SCORE))}%` : "–", detail: scoreDescription }
      ]
    });
  }

  function completionCard(title, graduatedLevel, studentLevel) {
    const rows = state.indicatorData.graduates;
    const latest = latestYear(rows, "GRADUATED_YEAR");
    const baseYear = latest ? latest - 1 : null;
    const graduateRows = rows.filter(row => Number(row.GRADUATED_YEAR) === latest && text(row.GRADUATED_EDU_LEVEL) === graduatedLevel);
    const hasGraduateValue = graduateRows.some(row =>
      (row.GRADUATED_MALE_COUNT !== null && row.GRADUATED_MALE_COUNT !== "")
      || (row.GRADUATED_FEMALE_COUNT !== null && row.GRADUATED_FEMALE_COUNT !== "")
    );
    const graduates = sumFields(graduateRows, "GRADUATED_MALE_COUNT", "GRADUATED_FEMALE_COUNT");
    const students = sumFields(state.indicatorData.students.filter(row => Number(row.YEAR) === baseYear && text(row.EDU_LEVEL) === studentLevel), "STUDENT_MALE_COUNT", "STUDENT_FEMALE_COUNT");
    const unavailable = !latest || !students || !hasGraduateValue;
    return resultCard({
      title,
      year: latest,
      source: `Graduated_Student ปี ${latest || "–"} เทียบ Student_Count ระดับ ${studentLevel} ปี ${baseYear || "–"}`,
      unavailable,
      metrics: [
        { label: "อัตราการสำเร็จการศึกษา", value: unavailable ? "–" : rate(graduates, students), detail: "ผู้สำเร็จการศึกษา ÷ นักเรียนปีฐาน" },
        { label: "ผู้สำเร็จการศึกษา", value: hasGraduateValue ? `${countFormat.format(graduates)} คน` : "–" },
        { label: "นักเรียนปีฐาน", value: students ? `${countFormat.format(students)} คน` : "–" }
      ]
    });
  }

  function populationTotals(rows) {
    return rows.reduce((output, row) => ({ male: output.male + number(row.POPULATION_MALE_COUNT), female: output.female + number(row.POPULATION_FEMALE_COUNT) }), { male: 0, female: 0 });
  }

  function studentTotals(rows) {
    return rows.reduce((output, row) => ({ male: output.male + number(row.STUDENT_MALE_COUNT), female: output.female + number(row.STUDENT_FEMALE_COUNT) }), { male: 0, female: 0 });
  }

  function genderRateCard(title, year, numerator, denominator, source, unavailable = false) {
    const totalNumerator = numerator.male + numerator.female;
    const totalDenominator = denominator.male + denominator.female;
    const hasData = !unavailable && totalDenominator > 0;
    return resultCard({
      title,
      year,
      source,
      unavailable: !hasData,
      metrics: [
        { label: "รวม", value: hasData ? rate(totalNumerator, totalDenominator) : "–", detail: hasData ? `${countFormat.format(totalNumerator)} จาก ${countFormat.format(totalDenominator)} คน` : "รอข้อมูลประชากรสำหรับคำนวณ" },
        { label: "ชาย", value: hasData ? rate(numerator.male, denominator.male) : "–", detail: hasData ? `${countFormat.format(numerator.male)} จาก ${countFormat.format(denominator.male)} คน` : "–" },
        { label: "หญิง", value: hasData ? rate(numerator.female, denominator.female) : "–", detail: hasData ? `${countFormat.format(numerator.female)} จาก ${countFormat.format(denominator.female)} คน` : "–" }
      ]
    });
  }

  function internetMobileCards(rows) {
    const year = latestYear(rows);
    const cards = rows.filter(row => Number(row.YEAR) === year).map(row => {
      const category = text(row.INTERNET_MOBILE_DATA);
      const has = number(row.HAVE_COUNT);
      const doesNotHave = number(row.DONTHAVE_COUNT);
      const total = has + doesNotHave;
      const ownership = /การมี|ownership/i.test(category);
      return resultCard({
        title: category.replace(/\s+(?:Internet|Mobile).*$/i, ""),
        year,
        source: "PYOEDU_DB6_SDG4_MONITORING / SDG4.4.1 (ข้อมูลต้นทางหน่วยพันคน ระบบคูณ 1,000 เพื่อแสดงเป็นคน)",
        unavailable: !total,
        equalMetrics: true,
        metrics: [
          { label: ownership ? "มีโทรศัพท์มือถือ" : "ใช้งาน", value: total ? `${countFormat.format(Math.round(has * 1000))} คน` : "–", detail: total ? `${percentFormat.format(has / total * 100)}% ของกลุ่มสำรวจ` : "–" },
          { label: ownership ? "ไม่มีโทรศัพท์มือถือ" : "ไม่ได้ใช้งาน", value: total ? `${countFormat.format(Math.round(doesNotHave * 1000))} คน` : "–", detail: total ? `${percentFormat.format(doesNotHave / total * 100)}% ของกลุ่มสำรวจ` : "–" }
        ]
      });
    });
    return cards.length ? cards : [resultCard({ title: "การใช้อินเทอร์เน็ตและโทรศัพท์มือถือ", source: "PYOEDU_DB6_SDG4_MONITORING / SDG4.4.1", unavailable: true, metrics: [{ label: "จำนวนประชาชน", value: "–", detail: "รอเชื่อมต่อข้อมูล" }] })];
  }

  function parityCard(title, levelPattern) {
    const year = latestYear(state.indicatorData.students);
    const selectedRows = state.indicatorData.students.filter(row => Number(row.YEAR) === year && levelPattern.test(text(row.EDU_LEVEL)));
    const totals = studentTotals(selectedRows);
    const hasMaleValue = selectedRows.some(row => row.STUDENT_MALE_COUNT !== null && row.STUDENT_MALE_COUNT !== "");
    const hasFemaleValue = selectedRows.some(row => row.STUDENT_FEMALE_COUNT !== null && row.STUDENT_FEMALE_COUNT !== "");
    const parity = hasMaleValue && hasFemaleValue && totals.male > 0 ? totals.female / totals.male : null;
    return resultCard({
      title,
      year,
      source: "PYOEDU_DB1_BASICDATA / Student_Count; ดัชนี = นักเรียนหญิง ÷ นักเรียนชาย",
      unavailable: parity === null,
      metrics: [
        { label: "ดัชนีความเท่าเทียมทางเพศ", value: parity === null ? "–" : decimalFormat.format(parity), detail: "ค่า 1.00 หมายถึงจำนวนหญิงและชายเท่ากัน" },
        { label: "นักเรียนชาย", value: hasMaleValue ? `${countFormat.format(totals.male)} คน` : "–" },
        { label: "นักเรียนหญิง", value: hasFemaleValue ? `${countFormat.format(totals.female)} คน` : "–" }
      ]
    });
  }

  function illiteracyCards(rows) {
    const year = latestYear(rows);
    const cards = rows.filter(row => Number(row.YEAR) === year).map(row => {
      const surveyed = number(row.SURVEY_COUNT);
      const illiterate = number(row.ILLITERACY_COUNT);
      return resultCard({
        title: text(row.AGE_GROUP),
        year,
        source: "PYOEDU_DB6_SDG4_MONITORING / SDG4.6.1",
        unavailable: !surveyed,
        metrics: [
          { label: "อัตราการไม่รู้หนังสือ", value: rate(illiterate, surveyed), detail: "ผู้ไม่รู้หนังสือ ÷ ผู้ที่สำรวจ × 100" },
          { label: "ผู้ไม่รู้หนังสือ", value: surveyed ? `${countFormat.format(illiterate)} คน` : "–" },
          { label: "จำนวนผู้ที่สำรวจ", value: surveyed ? `${countFormat.format(surveyed)} คน` : "–" }
        ]
      });
    });
    return cards.length ? cards : [resultCard({ title: "อัตราการไม่รู้หนังสือ", source: "PYOEDU_DB6_SDG4_MONITORING / SDG4.6.1", unavailable: true, metrics: [{ label: "ผลล่าสุด", value: "–", detail: "รอเชื่อมต่อข้อมูล" }] })];
  }

  function projectIndicatorCard(rows, projectType) {
    const projects = rows.filter(row => text(row.PROJECT_TYPE) === projectType);
    const rowsWithTargetCount = projects.filter(row => row.TARGET_GROUP_COUNT !== null && row.TARGET_GROUP_COUNT !== "" && Number.isFinite(Number(row.TARGET_GROUP_COUNT)));
    const targetGroupCount = rowsWithTargetCount.reduce((sum, row) => sum + number(row.TARGET_GROUP_COUNT), 0);
    const years = projects.map(row => Number(row.YEAR)).filter(Number.isFinite);
    const yearLabel = years.length ? (Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)}–${Math.max(...years)}`) : "";
    return resultCard({
      title: projectType,
      year: yearLabel,
      source: `PYOEDU_DB7_SDG4_PROJECT / SDG4_Project (PROJECT_TYPE = ${projectType})`,
      unavailable: !projects.length,
      metrics: [
        { label: "จำนวนโครงการ", value: projects.length ? `${countFormat.format(projects.length)} โครงการ` : "–" },
        { label: "จำนวนกลุ่มเป้าหมายรวม", value: rowsWithTargetCount.length ? `${countFormat.format(targetGroupCount)} คน` : "–", detail: `มีข้อมูล ${countFormat.format(rowsWithTargetCount.length)} จาก ${countFormat.format(projects.length)} โครงการ` }
      ]
    });
  }

  function infrastructureCards(rows) {
    const year = latestYear(rows);
    const services = new Map();
    rows.filter(row => Number(row.YEAR) === year).forEach(row => {
      const service = text(row.INFRASTRUCTURE);
      const schoolCode = text(row.SCHOOL_CODE);
      if (!service || !schoolCode) return;
      if (!services.has(service)) services.set(service, new Map());
      services.get(service).set(schoolCode, text(row.STATUS_Y_N));
    });
    const cards = [...services.entries()].sort(([left], [right]) => left.localeCompare(right, "th")).map(([service, schools]) => {
      const statuses = [...schools.values()].filter(status => status === "มี" || status === "ไม่มี");
      const available = statuses.filter(status => status === "มี").length;
      return resultCard({
        title: service,
        year,
        unavailable: !statuses.length,
        metrics: [
          { label: "สัดส่วนสถานศึกษาที่เข้าถึงบริการ", value: rate(available, statuses.length), detail: "สถานศึกษาที่มีบริการ ÷ สถานศึกษาที่รายงาน" },
          { label: "มีบริการ", value: statuses.length ? `${countFormat.format(available)} แห่ง` : "–" },
          { label: "สถานศึกษาที่รายงาน", value: statuses.length ? `${countFormat.format(statuses.length)} แห่ง` : "–" }
        ]
      });
    });
    return cards.length ? cards : [resultCard({ title: "บริการขั้นพื้นฐานของสถานศึกษา", unavailable: true, metrics: [{ label: "ผลล่าสุด", value: "–", detail: "รอเชื่อมต่อข้อมูล" }] })];
  }

  function indicatorPresentation(indicatorId) {
    const data = state.indicatorData;
    if (indicatorId === "4.1.1") return {
      cards: [scoreCard("ระดับชั้น ป.3 (NT)", data.nt), scoreCard("ระดับชั้น ป.6 (O-NET)", data.onet, "ประถมศึกษาปีที่ 6"), scoreCard("ระดับชั้น ม.3 (O-NET)", data.onet, "มัธยมศึกษาปีที่ 3")],
      note: "ข้อจำกัด: ข้อมูลคะแนนปัจจุบันยังไม่จำแนกตามเพศ จึงแสดงผลรวมของนักเรียนทั้งหมดก่อน"
    };
    if (indicatorId === "4.1.2") return {
      cards: [completionCard("อัตราการสำเร็จการศึกษาระดับประถมศึกษา", "ประถมศึกษา", "ประถมศึกษาปีที่ 6"), completionCard("อัตราการสำเร็จการศึกษาระดับมัธยมศึกษาตอนต้น", "มัธยมศึกษาตอนต้น", "มัธยมศึกษาปีที่ 3"), completionCard("อัตราการสำเร็จการศึกษาระดับมัธยมศึกษาตอนปลาย", "มัธยมศึกษาตอนปลาย", "มัธยมศึกษาปีที่ 6")],
      note: "สูตร: จำนวนผู้สำเร็จการศึกษาในปีล่าสุด ÷ จำนวนนักเรียนชั้นปลายของระดับนั้นในปีก่อนหน้า × 100"
    };
    if (indicatorId === "4.2.1") {
      const year = latestYear(data.earlyChild);
      const row = data.earlyChild.find(item => Number(item.YEAR) === year);
      return {
        cards: [resultCard({ title: "เด็กปฐมวัยที่มีพัฒนาการสมวัย", year, source: "PYOEDU_DB6_SDG4_MONITORING / SDG4.2.1", unavailable: !row, metrics: [{ label: "ร้อยละเด็กที่มีพัฒนาการสมวัย", value: row ? `${percentFormat.format(number(row["AGE-AD_CHILD_PERCENT"]))}%` : "–", detail: "เทียบกับประชากรเด็กอายุ 0–5 ปี" }, { label: "เด็กที่มีพัฒนาการสมวัย", value: row ? `${countFormat.format(number(row["AGE-AD_CHILD_COUNT"]))} คน` : "–" }, { label: "ประชากรเด็กอายุ 0–5 ปี", value: row ? `${countFormat.format(number(row["POPULATION0-5YO_COUNT"]))} คน` : "–" }] })],
        note: "ข้อจำกัด: ข้อมูลปัจจุบันครอบคลุมเด็กอายุ 0–5 ปี ไม่ตรงกับช่วงอายุ 24–59 เดือนทั้งหมด และยังไม่จำแนกตามเพศ"
      };
    }
    if (indicatorId === "4.2.2") {
      const year = latestYear(data.population);
      const populationRows = data.population.filter(row => Number(row.YEAR) === year && number(row.AGE) >= 3 && number(row.AGE) <= 5);
      const studentRows = data.students.filter(row => Number(row.YEAR) === year && /^อนุบาล\s/i.test(text(row.EDU_LEVEL)));
      return { cards: [genderRateCard("อัตราการเข้าเรียนปฐมวัย อายุ 3–5 ปี", year, studentTotals(studentRows), populationTotals(populationRows), "ประชากรอายุ 3–5 ปีจาก SDG4.2.2 เทียบกับนักเรียนระดับอนุบาลจาก Student_Count")], note: "ระดับนักเรียนที่ใช้: อนุบาล 1, อนุบาล 2 และอนุบาล 3 โดยไม่รวมเตรียมอนุบาลและเตรียมความพร้อม" };
    }
    if (indicatorId === "4.3.1") {
      const year = latestYear(data.population);
      const populationRows = data.population.filter(row => Number(row.YEAR) === year && number(row.AGE) >= 15 && number(row.AGE) <= 19);
      const studentRows = data.students.filter(row => Number(row.YEAR) === year && /^ประกาศนียบัตรวิชาชีพ/i.test(text(row.EDU_LEVEL)));
      return { cards: [genderRateCard("อัตราการเข้าเรียนระดับ ปวช. และ ปวส. เทียบประชากรอายุ 15–19 ปี", year, studentTotals(studentRows), populationTotals(populationRows), "ประชากรอายุ 15–19 ปีจาก SDG4.2.2 เทียบกับนักเรียน ปวช. และ ปวส. จาก Student_Count")], note: "ข้อจำกัด: ผลนี้เป็นค่าประมาณจากผู้เรียน ปวช./ปวส. เท่านั้น ยังไม่รวมการศึกษานอกระบบและการฝึกอบรมในช่วง 12 เดือน" };
    }
    if (indicatorId === "4.4.1") return { cards: internetMobileCards(data.internetMobile), note: "ปรับการติดตามเป็นจำนวนประชาชนอายุ 6 ปีขึ้นไปตามข้อมูลที่มีในระดับจังหวัด โดยแสดงทั้งกลุ่มที่ใช้/มี และไม่ใช้/ไม่มี" };
    if (indicatorId === "4.5.1") return {
      cards: [parityCard("ระดับประถมศึกษา", /^ประถมศึกษาปีที่\s*[1-6]$/), parityCard("ระดับมัธยมศึกษาตอนต้น", /^มัธยมศึกษาปีที่\s*[1-3]$/), parityCard("ระดับมัธยมศึกษาตอนปลาย", /^มัธยมศึกษาปีที่\s*[4-6]$/)],
      note: "ดัชนีคำนวณจากจำนวนนักเรียนหญิง ÷ จำนวนนักเรียนชาย ค่า 1.00 หมายถึงสมดุลทางเพศ ปัจจุบันยังเป็นดัชนีจากจำนวนผู้เรียน เพราะยังไม่มีประชากรตามอายุสำหรับคำนวณอัตราการเข้าเรียนสุทธิเต็มรูปแบบ"
    };
    if (indicatorId === "4.6.1") return { cards: illiteracyCards(data.illiteracy), note: "คำนวณอัตราแยกตามกลุ่มอายุจากจำนวนผู้ไม่รู้หนังสือเทียบกับจำนวนผู้ที่สำรวจ" };
    if (indicatorId === "4.7.1") return {
      cards: [projectIndicatorCard(data.projects, "ด้านวิทยาศาสตร์สิ่งแวดล้อมและธรณีวิทยา"), projectIndicatorCard(data.projects, "ด้านความเป็นพลเมือง")],
      note: "จำแนกโครงการจาก PROJECT_TYPE ตามสองด้านของตัวชี้วัด จำนวนกลุ่มเป้าหมายรวมจะไม่นับช่องว่างของโครงการเดิมเป็นศูนย์ และแสดงความครบถ้วนของข้อมูลกำกับไว้"
    };
    if (indicatorId === "4.a.1") return {
      cards: infrastructureCards(data.infrastructure),
      note: "สูตร: จำนวนสถานศึกษาที่มีบริการ ÷ จำนวนสถานศึกษาที่รายงานบริการประเภทนั้น × 100 โดยนับสถานศึกษาไม่ซ้ำตามรหัสสถานศึกษา"
    };
    if (["4.b.1", "4.c.1"].includes(indicatorId)) return {
      cards: [resultCard({ title: "รอข้อมูล", unavailable: true, metrics: [{ label: "ผลล่าสุด", value: "–", detail: "ยังไม่มีการเก็บข้อมูลสำหรับคำนวณตัวชี้วัด" }] })],
      note: "สถานะ: รอข้อมูล และจะเชื่อมโยงการคำนวณเมื่อมีฐานข้อมูลรองรับ"
    };
    return { cards: [resultCard({ title: "ผลการดำเนินงาน", source: "อยู่ระหว่างกำหนดสูตรและเชื่อมโยงข้อมูล", unavailable: true, metrics: [{ label: "ผลล่าสุด", value: "–", detail: "ยังไม่มีข้อมูลเพียงพอสำหรับการคำนวณ" }] })], note: "ตัวชี้วัดนี้จะพัฒนาในลำดับถัดไป" };
  }

  function renderIndicators() {
    const container = byId("indicatorGroups");
    if (!container) return;
    const target = byId("indicatorTargetFilter")?.value || "";
    const query = text(byId("indicatorSearch")?.value).toLocaleLowerCase("th");
    const searchTerms = { "4.1.1": "nt onet คะแนน ป.3 ป.6 ม.3", "4.1.2": "สำเร็จการศึกษา จบการศึกษา", "4.2.1": "พัฒนาการเด็กปฐมวัย", "4.2.2": "เข้าเรียนปฐมวัย อนุบาล", "4.3.1": "ปวช ปวส ประชากร 15 19" };
    const rows = state.indicators
      .filter(row => !target || text(row.SDG4_TARGET_ID) === target)
      .filter(row => !query || `${row.INDICATOR_ID} ${indicatorName(row)} ${searchTerms[text(row.INDICATOR_ID)] || ""}`.toLocaleLowerCase("th").includes(query))
      .sort((left, right) => text(left.INDICATOR_ID).localeCompare(text(right.INDICATOR_ID), "th", { numeric: true }));
    byId("indicatorSummary").textContent = `แสดง ${countFormat.format(rows.length)} จาก ${countFormat.format(state.indicators.length)} ตัวชี้วัด`;
    const grouped = new Map();
    rows.forEach(row => { const id = text(row.SDG4_TARGET_ID); if (!grouped.has(id)) grouped.set(id, []); grouped.get(id).push(row); });
    if (!rows.length) {
      container.innerHTML = `<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">ไม่พบตัวชี้วัดตามตัวกรองที่เลือก</div>`;
      return;
    }
    container.innerHTML = [...grouped.entries()].map(([targetId, indicators]) => `<section aria-labelledby="target-${html(targetId).replace(/\./g, "-")}"><header class="mb-5 flex items-start gap-4 border-b border-slate-200 pb-4"><span class="rounded-xl bg-pyo-700 px-3 py-2 text-sm font-bold text-white">SDG ${html(targetId)}</span><div><h3 id="target-${html(targetId).replace(/\./g, "-")}" class="text-xl font-bold text-slate-900">${html(state.targets[targetId] || `เป้าหมาย ${targetId}`)}</h3><p class="mt-1 text-sm text-slate-500">${countFormat.format(indicators.length)} ตัวชี้วัด</p></div></header><div class="space-y-6">${indicators.map(indicator => { const id = text(indicator.INDICATOR_ID); const presentation = indicatorPresentation(id); const cardLayout = presentation.cards.length >= 3 ? "xl:grid-cols-3" : presentation.cards.length === 2 ? "lg:grid-cols-2" : "max-w-3xl"; return `<article class="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-soft sm:p-6"><header class="flex flex-col gap-3 sm:flex-row sm:items-start"><span class="w-fit rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-pyo-700 ring-1 ring-slate-200">${html(id)}</span><h4 class="text-lg font-bold leading-8 text-slate-900">${html(indicatorName(indicator))}</h4></header><div class="mt-5 grid gap-4 ${cardLayout}">${presentation.cards.join("")}</div>${presentation.note ? `<p class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">${html(presentation.note)}</p>` : ""}</article>`; }).join("")}</div></section>`).join("");
  }

  function targetBadges(raw) {
    return text(raw).split(/[|,;/]+/).map(value => value.trim()).filter(Boolean).map(value => `<span class="rounded-full bg-pyo-50 px-2.5 py-1 text-xs font-bold text-pyo-700">SDG ${html(value)}</span>`).join("");
  }

  function card(row, demo = false) {
    const article = document.createElement("article");
    article.className = "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:border-pyo-300";
    const cover = safeUrl(row.COVER_IMAGE_URL);
    const album = safeUrl(row.ADDITIONAL_IMAGES_URL);
    const reference = safeUrl(row.REFERENCE_URL);
    const detail = text(row.PROJECT_DETAIL) || "ยังไม่มีรายละเอียดโครงการ";
    article.innerHTML = `
      <div class="project-cover relative overflow-hidden bg-gradient-to-br from-pyo-800 via-pyo-600 to-amber-300" style="aspect-ratio:16/9">
        ${cover ? `<img src="${html(cover)}" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl"><img src="${html(cover)}" alt="${html(row.PROJECT_TITLE)}" loading="lazy" class="relative h-full w-full object-contain" onload="window.PYOEDUFitProjectCover(this)" onerror="this.hidden=true;this.previousElementSibling.hidden=true">` : `<div class="grid h-full place-items-center text-center text-white"><div><span class="text-5xl" aria-hidden="true">🌏</span><p class="mt-2 text-sm font-bold">SDG4 IN ACTION</p></div></div>`}
        ${demo ? '<span class="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white">ตัวอย่างข้อมูลจำลอง</span>' : ""}
        ${text(row.YEAR) ? `<span class="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-800">ปี ${html(row.YEAR)}</span>` : ""}
      </div>
      <div class="p-5">
        <div class="flex flex-wrap gap-2">${targetBadges(row.SDG4_TARGET_ID)}</div>
        <h3 class="mt-4 text-lg font-bold leading-7 text-slate-900 group-hover:text-pyo-700">${html(row.PROJECT_TITLE) || "โครงการที่ยังไม่ได้ระบุชื่อ"}</h3>
        <p class="mt-2 text-sm font-semibold text-slate-500">${html(row.DEPARTMENT_NAME_AGENCY) || "ยังไม่ได้ระบุหน่วยงาน"}</p>
        <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">${html(detail)}</p>
        <dl class="mt-4 grid grid-cols-2 gap-x-3 rounded-xl bg-slate-50 p-3 text-sm"><div class="col-span-2 border-b border-slate-200 pb-3"><dt class="text-xs text-slate-500">ประเภทโครงการ</dt><dd class="mt-1 break-words font-semibold leading-6">${html(row.PROJECT_TYPE) || "–"}</dd></div><div class="pt-3"><dt class="text-xs text-slate-500">จำนวนผู้เข้าร่วม</dt><dd class="mt-1 font-semibold">${row.TARGET_GROUP_COUNT !== null && row.TARGET_GROUP_COUNT !== "" ? `${html(countFormat.format(number(row.TARGET_GROUP_COUNT)))} คน` : "–"}</dd></div><div class="pt-3"><dt class="text-xs text-slate-500">งบประมาณ</dt><dd class="mt-1 font-semibold">${html(money(row.BUDGET_AMOUNT))}</dd></div></dl>
        <div class="mt-5 flex flex-wrap gap-2">${album ? `<a href="${html(album)}" target="_blank" rel="noopener noreferrer" class="focus-ring rounded-lg bg-pyo-700 px-3 py-2 text-sm font-bold text-white hover:bg-pyo-800">ภาพเพิ่มเติม</a>` : ""}${reference ? `<a href="${html(reference)}" target="_blank" rel="noopener noreferrer" class="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">แหล่งอ้างอิง</a>` : ""}${!album && !reference ? '<span class="text-xs text-slate-400">ยังไม่มีลิงก์เพิ่มเติม</span>' : ""}</div>
      </div>`;
    return article;
  }

  function demoProject() {
    return { YEAR: "2569", PROJECT_TITLE: "โครงการส่งเสริมการเรียนรู้เพื่อการพัฒนาที่ยั่งยืน", PROJECT_DETAIL: "ตัวอย่างการนำเสนอชื่อโครงการ หน่วยงาน เป้าหมาย SDG4 รายละเอียดโดยย่อ ประเภทโครงการ และงบประมาณในรูปแบบ Post Card", DEPARTMENT_NAME_AGENCY: "หน่วยงานตัวอย่าง", TARGET_GROUP_COUNT: 120, BUDGET_AMOUNT: 150000, SDG4_TARGET_ID: "4.7", PROJECT_TYPE: "ด้านวิทยาศาสตร์สิ่งแวดล้อมและธรณีวิทยา" };
  }

  function renderProjects() {
    if (!byId("projectCardGrid")) return;
    const year = byId("projectYearFilter").value;
    const targets = selectedMulti("projectTargetFilter");
    const agencies = selectedMulti("projectAgencyFilter");
    const rows = state.projects.filter(row => {
      const rowTargets = text(row.SDG4_TARGET_ID).split(/[|,;/]+/).map(value => value.trim()).filter(Boolean);
      return (!year || text(row.YEAR) === year)
        && (!targets.length || targets.some(target => rowTargets.includes(target)))
        && (!agencies.length || agencies.includes(text(row.DEPARTMENT_NAME_AGENCY)));
    });
    const totalBudget = rows.reduce((sum, row) => {
      const value = Number(row.BUDGET_AMOUNT);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    byId("projectCountValue").textContent = `${rows.length.toLocaleString("th-TH")} โครงการ`;
    byId("projectBudgetValue").textContent = money(totalBudget);
    const grid = byId("projectCardGrid");
    if (!state.projects.length) {
      byId("projectSummary").textContent = "ยังไม่มีข้อมูลโครงการ ระบบจึงแสดงการ์ดตัวอย่างเพื่อดูรูปแบบเบื้องต้น";
      grid.replaceChildren(card(demoProject(), true));
      return;
    }
    byId("projectSummary").textContent = `พบ ${rows.length} โครงการ`;
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3";
      empty.textContent = "ไม่พบโครงการตามตัวกรองที่เลือก";
      grid.replaceChildren(empty);
      return;
    }
    grid.replaceChildren(...rows.sort((a, b) => Number(b.YEAR || 0) - Number(a.YEAR || 0)).map(row => card(row)));
  }

  async function loadIndicatorData() {
    const sources = [
      ["nt", () => api.allRows("DB5_TESTSCORE", "NT_Score")],
      ["onet", () => api.allRows("DB5_TESTSCORE", "ONET_Score")],
      ["graduates", () => api.summary("DB3", "Graduated_Student", {
        groupBy: ["GRADUATED_YEAR", "GRADUATED_EDU_LEVEL"],
        metrics: ["GRADUATED_MALE_COUNT", "GRADUATED_FEMALE_COUNT"]
      }).then(result => result.data || [])],
      ["students", () => api.summary("DB1", "Student_Count", {
        groupBy: ["YEAR", "EDU_LEVEL"],
        metrics: ["STUDENT_MALE_COUNT", "STUDENT_FEMALE_COUNT"]
      }).then(result => result.data || [])],
      ["earlyChild", () => api.allRows("DB6_SDG4_MONITORING", "SDG4.2.1")],
      ["population", () => api.allRows("DB6_SDG4_MONITORING", "SDG4.2.2")],
      ["internetMobile", () => api.allRows("DB6_SDG4_MONITORING", "SDG4.4.1")],
      ["illiteracy", () => api.allRows("DB6_SDG4_MONITORING", "SDG4.6.1")],
      ["projects", () => api.allRows("DB7_SDG4_PROJECT", "SDG4_Project")],
      ["infrastructure", async () => {
        const metadata = await api.metadata("DB4", "Infrastructure_School", ["YEAR"]);
        const years = (metadata.data?.YEAR || []).map(Number).filter(Number.isFinite);
        const year = years.length ? Math.max(...years) : null;
        return year ? api.allRows("DB4", "Infrastructure_School", { filters: { YEAR: year } }) : [];
      }]
    ];
    const results = await Promise.allSettled(sources.map(([, loader]) => loader()));
    results.forEach((result, index) => {
      const key = sources[index][0];
      if (result.status === "fulfilled") state.indicatorData[key] = Array.isArray(result.value) ? result.value : [];
      else state.indicatorData.errors.add(key);
    });
    return state.indicatorData.errors.size;
  }

  async function initialize() {
    const notice = byId("sdg4Notice");
    const needsIndicators = Boolean(byId("indicatorGroups"));
    const needsProjects = Boolean(byId("projectCardGrid"));
    const [targetResult, indicatorResult, projectResult, dataResult] = await Promise.allSettled([
      api.allRows("DB6_SDG4_MONITORING", "SDG4_Target_Master"),
      needsIndicators ? api.allRows("DB6_SDG4_MONITORING", "SDG4_Indicator_Master") : Promise.resolve([]),
      needsProjects ? api.allRows("DB7_SDG4_PROJECT", "SDG4_Project") : Promise.resolve([]),
      needsIndicators ? loadIndicatorData() : Promise.resolve(0)
    ]);
    if (targetResult.status === "fulfilled" && targetResult.value.length) state.targets = Object.fromEntries(targetResult.value.map(row => [text(row.TARGET_ID), text(row.TARGET_NAME_TH)]));
    if (indicatorResult.status === "fulfilled" && indicatorResult.value.length) state.indicators = indicatorResult.value;
    if (projectResult.status === "fulfilled") state.projects = projectResult.value;
    const requiredResults = [targetResult, ...(needsIndicators ? [indicatorResult, dataResult] : []), ...(needsProjects ? [projectResult] : [])];
    const unavailable = requiredResults.filter(result => result.status === "rejected").length;
    const unavailableSources = needsIndicators ? state.indicatorData.errors.size : 0;
    if ((unavailable || unavailableSources) && notice) {
      notice.hidden = false;
      notice.textContent = unavailableSources
        ? `แสดงข้อมูลที่เชื่อมต่อได้แล้ว ส่วนที่ยังอ่านไม่ได้ ${unavailableSources} แหล่งจะแสดง “–” กรุณานำ Code.gs เวอร์ชันล่าสุดไป Deploy เพื่อเปิดใช้ฐานข้อมูล SDG4 ให้ครบ`
        : "หน้าแสดงผลพร้อมใช้งานในโหมดตัวอย่าง แต่ API ของฐาน SDG4 ยังอ่านไม่ครบ กรุณาตรวจ Script Properties และ Deploy Apps Script เวอร์ชันใหม่";
    }
    setOptions(byId("indicatorTargetFilter"), Object.keys(state.targets), "ทุกเป้าหมาย");
    setMultiOptions(byId("projectTargetFilter"), Object.entries(state.targets).map(([value, description]) => ({ value, label: `SDG ${value}`, description })), "ทุกเป้าหมาย");
    setOptions(byId("projectYearFilter"), state.projects.map(row => text(row.YEAR)), "ทุกปี");
    setMultiOptions(byId("projectAgencyFilter"), [...new Set(state.projects.map(row => text(row.DEPARTMENT_NAME_AGENCY)).filter(Boolean))].map(value => ({ value, label: value })), "ทุกหน่วยงาน");
    renderIndicators();
    renderProjects();
  }

  byId("indicatorTargetFilter")?.addEventListener("change", renderIndicators);
  byId("indicatorSearch")?.addEventListener("input", renderIndicators);
  byId("projectYearFilter")?.addEventListener("change", renderProjects);
  initialize().catch(error => {
    const notice = byId("sdg4Notice");
    if (notice) {
      notice.hidden = false;
      notice.textContent = `ไม่สามารถเตรียมข้อมูล SDG4 ได้: ${error.message}`;
    }
    renderIndicators();
    renderProjects();
  });

  window.PYOEDUFitProjectCover = image => {
    const ratio = image.naturalWidth / image.naturalHeight;
    if (!Number.isFinite(ratio) || !image.parentElement) return;
    image.parentElement.style.aspectRatio = String(Math.min(1.9, Math.max(0.8, ratio)));
  };
})();
