(() => {
  "use strict";

  const api = window.PYOEDUDataClient;
  const fallbackIndicators = [
    ["4.1.1", "4.1", "สัดส่วนของเด็ก/เยาวชนในระดับ ป.2 หรือ ป.3 ป.6 และ ม.3 ที่มีความสามารถตามเกณฑ์ขั้นต่ำด้านการอ่านและคณิตศาสตร์ จำแนกตามเพศ"],
    ["4.1.2", "4.1", "อัตราการสำเร็จการศึกษาระดับประถมศึกษา มัธยมศึกษาตอนต้น และมัธยมศึกษาตอนปลาย"],
    ["4.2.1", "4.2", "สัดส่วนเด็กอายุ 24–59 เดือนที่มีพัฒนาการตามเกณฑ์ จำแนกตามเพศ"],
    ["4.2.2", "4.2", "อัตราการเข้าเรียนปฐมวัยอย่างน้อยหนึ่งปีก่อนถึงเกณฑ์เข้าเรียนประถมศึกษา จำแนกตามเพศ"],
    ["4.3.1", "4.3", "อัตราการเข้าเรียนและเข้าร่วมการฝึกอบรมของเยาวชนและผู้ใหญ่ในช่วง 12 เดือนที่ผ่านมา จำแนกตามเพศ"],
    ["4.4.1", "4.4", "สัดส่วนเยาวชน/ผู้ใหญ่ที่มีทักษะด้านเทคโนโลยีสารสนเทศและการสื่อสาร"],
    ["4.5.1", "4.5", "ดัชนีความเท่าเทียมกันสำหรับตัวชี้วัดด้านการศึกษาที่สามารถจำแนกข้อมูลได้"],
    ["4.6.1", "4.6", "สัดส่วนประชากรที่มีความสามารถด้านการอ่านออกเขียนได้และทักษะการคำนวณ จำแนกตามเพศ"],
    ["4.7.1", "4.7", "ระดับการดำเนินการด้านการศึกษาเพื่อความเป็นพลเมืองโลกและการพัฒนาที่ยั่งยืน"],
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

  const state = { indicators: fallbackIndicators, targets: fallbackTargets, projects: [], demo: false };
  const byId = id => document.getElementById(id);
  const text = value => String(value ?? "").trim();
  const html = value => text(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
  const safeUrl = value => { try { const url = new URL(text(value)); return url.protocol === "https:" ? url.href : ""; } catch (_) { return ""; } };
  const money = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Number(value)) : "–";

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
      label.className = "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 has-[:checked]:bg-emerald-50";
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

  function renderIndicators() {
    if (!byId("indicatorTableBody")) return;
    const target = byId("indicatorTargetFilter").value;
    const query = text(byId("indicatorSearch").value).toLocaleLowerCase("th");
    const rows = state.indicators.filter(row => (!target || text(row.SDG4_TARGET_ID) === target) && (!query || `${row.INDICATOR_ID} ${row.INDICATOR_NAME_TH}`.toLocaleLowerCase("th").includes(query)));
    byId("indicatorSummary").textContent = `แสดง ${rows.length} จาก ${state.indicators.length} ตัวชี้วัด`;
    byId("indicatorTableBody").replaceChildren(...rows.map(row => {
      const tr = document.createElement("tr");
      tr.className = "align-top hover:bg-slate-50";
      const targetName = state.targets[text(row.SDG4_TARGET_ID)] || `เป้าหมาย ${text(row.SDG4_TARGET_ID)}`;
      tr.innerHTML = `<td class="px-4 py-4 font-bold text-pyo-700">${html(row.INDICATOR_ID)}</td><td class="px-4 py-4"><span class="block font-semibold text-slate-800">${html(row.SDG4_TARGET_ID)}</span><span class="mt-1 block max-w-xs text-xs leading-5 text-slate-500">${html(targetName)}</span></td><td class="px-4 py-4 leading-6 text-slate-700">${html(row.INDICATOR_NAME_TH)}</td><td class="px-4 py-4 text-center text-slate-400">–</td><td class="px-4 py-4 text-right text-xl font-bold text-slate-400">–</td><td class="px-4 py-4"><span class="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">อยู่ระหว่างการคำนวณ</span></td>`;
      return tr;
    }));
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
        <dl class="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div><dt class="text-xs text-slate-500">ประเภทโครงการ</dt><dd class="mt-1 font-semibold">${html(row.PROJECT_TYPE) || "–"}</dd></div><div><dt class="text-xs text-slate-500">งบประมาณ</dt><dd class="mt-1 font-semibold">${html(money(row.BUDGET_AMOUNT))}</dd></div></dl>
        <div class="mt-5 flex flex-wrap gap-2">${album ? `<a href="${html(album)}" target="_blank" rel="noopener noreferrer" class="focus-ring rounded-lg bg-pyo-700 px-3 py-2 text-sm font-bold text-white hover:bg-pyo-800">ภาพเพิ่มเติม</a>` : ""}${reference ? `<a href="${html(reference)}" target="_blank" rel="noopener noreferrer" class="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">แหล่งอ้างอิง</a>` : ""}${!album && !reference ? '<span class="text-xs text-slate-400">ยังไม่มีลิงก์เพิ่มเติม</span>' : ""}</div>
      </div>`;
    return article;
  }

  function demoProject() {
    return { YEAR: "2569", PROJECT_TITLE: "โครงการส่งเสริมการเรียนรู้เพื่อการพัฒนาที่ยั่งยืน", PROJECT_DETAIL: "ตัวอย่างการนำเสนอชื่อโครงการ หน่วยงาน เป้าหมาย SDG4 รายละเอียดโดยย่อ ประเภทโครงการ และงบประมาณในรูปแบบ Post Card", DEPARTMENT_NAME_AGENCY: "หน่วยงานตัวอย่าง", BUDGET_AMOUNT: 150000, SDG4_TARGET_ID: "4.7", PROJECT_TYPE: "ด้านวิทยาศาสตร์สิ่งแวดล้อมและธรณีวิทยา" };
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

  async function initialize() {
    const notice = byId("sdg4Notice");
    const needsIndicators = Boolean(byId("indicatorTableBody"));
    const needsProjects = Boolean(byId("projectCardGrid"));
    const [targetResult, indicatorResult, projectResult] = await Promise.allSettled([
      api.allRows("DB6_SDG4_MONITORING", "SDG4_Target_Master"),
      needsIndicators ? api.allRows("DB6_SDG4_MONITORING", "SDG4_Indicator_Master") : Promise.resolve([]),
      needsProjects ? api.allRows("DB7_SDG4_PROJECT", "SDG4_Project") : Promise.resolve([])
    ]);
    if (targetResult.status === "fulfilled" && targetResult.value.length) state.targets = Object.fromEntries(targetResult.value.map(row => [text(row.TARGET_ID), text(row.TARGET_NAME_TH)]));
    if (indicatorResult.status === "fulfilled" && indicatorResult.value.length) state.indicators = indicatorResult.value;
    if (projectResult.status === "fulfilled") state.projects = projectResult.value;
    const requiredResults = [targetResult, ...(needsIndicators ? [indicatorResult] : []), ...(needsProjects ? [projectResult] : [])];
    const unavailable = requiredResults.filter(result => result.status === "rejected").length;
    if (unavailable && notice) {
      notice.hidden = false;
      notice.textContent = "หน้าแสดงผลพร้อมใช้งานในโหมดตัวอย่าง แต่ API ของฐาน SDG4 ยังอ่านไม่ครบ กรุณาเพิ่มฐาน DB6/DB7 ใน Apps Script ตั้งค่า Script Properties และ Deploy เวอร์ชันใหม่";
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
