(() => {
  "use strict";
  const api = window.PYOEDUDataClient;
  const nf = new Intl.NumberFormat("th-TH");
  const charts = {};
  const ids = ["errorBanner","errorMessage","retryButton","studentFilterForm","studentYear","studentDepartment","studentArea","studentReset","lastUpdated","studentLoading","studentLoadingTitle","studentLoadingStep","studentLoadingBar","studentKpiTotal","studentKpiMale","studentKpiFemale","studentKpiDisabled","studentKpiNonThai","studentKpiDisadvantaged","studentKpiRepeat","studentKpiDropout","studentKpiGraduated","studentKpiRatio","studentRatioNote","studentIndicatorBody"];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const GENERAL_LEVELS = new Set(["มัธยมศึกษาปีที่ 4","มัธยมศึกษาปีที่ 5","มัธยมศึกษาปีที่ 6"]);
  const VOCATIONAL_LEVELS = new Set(["ประกาศนียบัตรวิชาชีพปีที่ 1","ประกาศนียบัตรวิชาชีพปีที่ 2","ประกาศนียบัตรวิชาชีพปีที่ 3"]);

  function numberValue(value) { const n = Number(String(value ?? 0).replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
  function sum(rows, male, female) { return rows.reduce((total, row) => total + numberValue(row[male]) + numberValue(row[female]), 0); }
  function metricPair(rows, male, female) { return { male: rows.reduce((t,r)=>t+numberValue(r[male]),0), female: rows.reduce((t,r)=>t+numberValue(r[female]),0) }; }
  function setNumber(target, value) { target.textContent = nf.format(numberValue(value)); }
  function setLoading(show, title="กำลังโหลดข้อมูล", step="กำลังเชื่อมต่อ API", progress=8) { el.studentLoading.hidden = !show; el.studentLoadingTitle.textContent = title; el.studentLoadingStep.textContent = step; el.studentLoadingBar.style.width = `${Math.min(100, Math.max(8, progress))}%`; }
  function fillSelect(select, values, allLabel, selected="") { select.replaceChildren(new Option(allLabel,"")); values.map(String).filter(Boolean).forEach(value=>select.add(new Option(value,value))); if ([...select.options].some(o=>o.value===String(selected))) select.value=String(selected); }
  function fillYears(values, selected="") { const years=[...values].map(String).sort((a,b)=>Number(b)-Number(a)); el.studentYear.replaceChildren(...years.map(value=>new Option(value,value))); el.studentYear.value=years.includes(String(selected))?String(selected):(years[0]||""); }
  function dimensionFilters() { const filters={}; if(el.studentDepartment.value) filters.DEPARTMENT_NAME=el.studentDepartment.value; if(el.studentArea.value) filters.EDU_AREA_NAME=el.studentArea.value; return filters; }
  function selectedYearFilter(field="YEAR") { return el.studentYear.value ? {[field]:el.studentYear.value} : {}; }
  function summary(dbKey, sheetName, groupBy, metrics, yearField="YEAR") { return api.summary(dbKey,sheetName,{groupBy,metrics,filters:selectedYearFilter(yearField)}); }
  async function allowedCodes() { const filters=dimensionFilters(); if(!Object.keys(filters).length) return null; const rows=await api.allRows("DB1","School_Info",{filters}); return new Set(rows.map(row=>String(row.SCHOOL_CODE||"")).filter(Boolean)); }
  function filterCodes(result, codes) { const rows=result.data||[]; return codes===null?rows:rows.filter(row=>codes.has(String(row.SCHOOL_CODE||""))); }
  function normalizeLevel(value) { return String(value||"").trim().replace(/\s+/g," ").replace(/\s*-\s*/g,"-"); }

  async function loadMetadata() {
    setLoading(true,"กำลังเตรียมตัวกรอง","อ่านปี สังกัด และพื้นที่",12);
    const [years,schools]=await Promise.all([api.metadata("DB1","Student_Count",["YEAR"]),api.metadata("DB1","School_Info",["DEPARTMENT_NAME","EDU_AREA_NAME"])]);
    fillYears(years.data.YEAR||[],el.studentYear.value);
    fillSelect(el.studentDepartment,schools.data.DEPARTMENT_NAME||[],"ทุกสังกัด",el.studentDepartment.value);
    fillSelect(el.studentArea,schools.data.EDU_AREA_NAME||[],"ทุกพื้นที่",el.studentArea.value);
  }

  async function loadDashboard() {
    el.errorBanner.hidden=true;
    setLoading(true,"กำลังโหลด Dashboard นักเรียน","อ่านข้อมูลจาก 8 ชุดข้อมูล",10);
    const requests=[
      summary("DB1","Student_Count",["SCHOOL_CODE","EDU_LEVEL"],["STUDENT_MALE_COUNT","STUDENT_FEMALE_COUNT"]),
      summary("DB3","RepeatGrade_Student",["SCHOOL_CODE"],["REPEAT_STUDENT_MALE_COUNT","REPEAT_STUDENT_FEMALE_COUNT"]),
      summary("DB3","Disabled_Student",["SCHOOL_CODE"],["DISABLED_STUDENT_MALE_COUNT","DISABLED_STUDENT_FEMALE_COUNT"]),
      summary("DB3","NonThai_Student",["SCHOOL_CODE"],["NONTHAI_STUDENT_MALE_COUNT","NONTHAI_STUDENT_FEMALE_COUNT"]),
      summary("DB3","Disadvantaged_Student",["SCHOOL_CODE"],["DISADV_STUDENT_MALE_COUNT","DISADV_STUDENT_FEMALE_COUNT"]),
      summary("DB3","Dropout_Student",["SCHOOL_CODE"],["DROPOUT_STUDENT_MALE_COUNT","DROPOUT_STUDENT_FEMALE_COUNT"]),
      summary("DB3","Graduated_Student",["SCHOOL_CODE","GRADUATED_EDU_LEVEL"],["GRADUATED_MALE_COUNT","GRADUATED_FEMALE_COUNT"],"GRADUATED_YEAR"),
      allowedCodes()
    ];
    let done=0;
    try {
      const results=await Promise.all(requests.map(request=>request.finally(()=>{done+=1;el.studentLoadingStep.textContent=`โหลดแล้ว ${done} จาก 8 ชุด`;el.studentLoadingBar.style.width=`${10+done*11}%`;})));
      render(results);
      el.lastUpdated.textContent=`อัปเดตหน้าจอ ${new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})} น.`;
    } catch(error) { el.errorMessage.textContent=`${error.message||"ไม่ทราบสาเหตุ"} กรุณาลองใหม่`; el.errorBanner.hidden=false; }
    finally { setLoading(false); }
  }

  function render(results) {
    const codes=results[7];
    const datasets=results.slice(0,7).map(result=>filterCodes(result,codes));
    const [students,repeats,disabled,nonThai,disadvantaged,dropout,graduated]=datasets;
    const studentPair=metricPair(students,"STUDENT_MALE_COUNT","STUDENT_FEMALE_COUNT");
    const rows=[
      ["เรียนซ้ำ",repeats,"REPEAT_STUDENT_MALE_COUNT","REPEAT_STUDENT_FEMALE_COUNT"],
      ["นักเรียนพิการ",disabled,"DISABLED_STUDENT_MALE_COUNT","DISABLED_STUDENT_FEMALE_COUNT"],
      ["ไม่มีสัญชาติไทย",nonThai,"NONTHAI_STUDENT_MALE_COUNT","NONTHAI_STUDENT_FEMALE_COUNT"],
      ["นักเรียนด้อยโอกาส",disadvantaged,"DISADV_STUDENT_MALE_COUNT","DISADV_STUDENT_FEMALE_COUNT"],
      ["ออกกลางคัน",dropout,"DROPOUT_STUDENT_MALE_COUNT","DROPOUT_STUDENT_FEMALE_COUNT"]
    ].map(([label,data,male,female])=>({label,...metricPair(data,male,female)}));
    const gradPair=metricPair(graduated,"GRADUATED_MALE_COUNT","GRADUATED_FEMALE_COUNT");
    setNumber(el.studentKpiMale,studentPair.male); setNumber(el.studentKpiFemale,studentPair.female); setNumber(el.studentKpiTotal,studentPair.male+studentPair.female);
    setNumber(el.studentKpiRepeat,rows[0].male+rows[0].female); setNumber(el.studentKpiDisabled,rows[1].male+rows[1].female); setNumber(el.studentKpiNonThai,rows[2].male+rows[2].female); setNumber(el.studentKpiDisadvantaged,rows[3].male+rows[3].female); setNumber(el.studentKpiDropout,rows[4].male+rows[4].female); setNumber(el.studentKpiGraduated,gradPair.male+gradPair.female);
    const general=students.filter(row=>GENERAL_LEVELS.has(normalizeLevel(row.EDU_LEVEL)));
    const vocational=students.filter(row=>VOCATIONAL_LEVELS.has(normalizeLevel(row.EDU_LEVEL)));
    const generalTotal=sum(general,"STUDENT_MALE_COUNT","STUDENT_FEMALE_COUNT");
    const vocationalTotal=sum(vocational,"STUDENT_MALE_COUNT","STUDENT_FEMALE_COUNT");
    el.studentKpiRatio.textContent=vocationalTotal?`${(generalTotal/vocationalTotal).toFixed(2)} : 1`:"ไม่มีข้อมูล";
    el.studentRatioNote.textContent=`สามัญ ${nf.format(generalTotal)} คน · อาชีพ ${nf.format(vocationalTotal)} คน`;
    renderIndicatorTable(rows);
    replaceChart("gender","studentGenderChart",doughnut(["ชาย","หญิง"],[studentPair.male,studentPair.female],["#2563eb","#e11d48"]));
    replaceChart("track","studentTrackChart",bar(["สายสามัญ ม.4–ม.6","สายอาชีพ ปวช.1–ปวช.3"],[generalTotal,vocationalTotal],["#0f766e","#f59e0b"]));
    const byLevel=new Map(); graduated.forEach(row=>{const label=String(row.GRADUATED_EDU_LEVEL||"ไม่มีข้อมูล");byLevel.set(label,(byLevel.get(label)||0)+numberValue(row.GRADUATED_MALE_COUNT)+numberValue(row.GRADUATED_FEMALE_COUNT));});
    const levels=[...byLevel.entries()].sort((a,b)=>b[1]-a[1]);
    replaceChart("graduated","studentGraduatedChart",bar(levels.map(x=>x[0]),levels.map(x=>x[1]),levels.map((_,i)=>["#059669","#0284c7","#7c3aed","#ea580c"][i%4]),true));
  }

  function renderIndicatorTable(rows) { el.studentIndicatorBody.replaceChildren(...rows.map(item=>{const tr=document.createElement("tr");tr.className="border-t";[item.label,item.male,item.female,item.male+item.female].forEach((value,index)=>{const td=document.createElement("td");td.className=`px-5 py-3 ${index?"text-right":"font-medium"}`;td.textContent=index?nf.format(value):value;tr.append(td);});return tr;})); }
  function replaceChart(key,id,config) { charts[key]?.destroy(); charts[key]=new window.Chart(document.getElementById(id),config); }
  function doughnut(labels,data,colors) { return {type:"doughnut",data:{labels,datasets:[{data,backgroundColor:colors,borderColor:"#fff",borderWidth:3}]},options:{maintainAspectRatio:false,plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:c=>`${c.label}: ${nf.format(c.raw)} คน`}}}}}; }
  function bar(labels,data,colors,horizontal=false) { return {type:"bar",data:{labels,datasets:[{label:"จำนวน",data,backgroundColor:colors,borderRadius:7}]},options:{maintainAspectRatio:false,indexAxis:horizontal?"y":"x",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${nf.format(c.raw)} คน`}}},scales:{y:{beginAtZero:true},x:{beginAtZero:true}}}}; }

  el.studentFilterForm.addEventListener("submit",event=>{event.preventDefault();loadDashboard();});
  el.studentReset.addEventListener("click",()=>{el.studentYear.value=el.studentYear.options[0]?.value||"";el.studentDepartment.value="";el.studentArea.value="";loadDashboard();});
  el.retryButton.addEventListener("click",loadDashboard);
  window.addEventListener("DOMContentLoaded",async()=>{try{await loadMetadata();await loadDashboard();}catch(error){el.errorMessage.textContent=error.message;el.errorBanner.hidden=false;setLoading(false);}});
})();
