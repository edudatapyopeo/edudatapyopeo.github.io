export function coverageMetricFields(definition) {
  return (definition?.columns || []).filter(field => /_COUNT$/.test(field) || field === "STATUS_Y_N");
}

export function isCompleteMetric(value, field) {
  if (value === null || value === undefined || String(value).trim() === "") return false;
  if (/_COUNT$/.test(field)) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0;
  }
  return true;
}

export function analyzeMetricCoverage(schools, datasets, datasetRows) {
  const bySchool = new Map((schools || []).map(school => [String(school.SCHOOL_CODE || ""), {
    school,
    assessed: 0,
    issues: []
  }]));

  datasets.forEach((dataset, datasetIndex) => {
    const grouped = new Map();
    (datasetRows[datasetIndex] || []).forEach(row => {
      const code = String(row.SCHOOL_CODE || "");
      if (!code || !bySchool.has(code)) return;
      if (!grouped.has(code)) grouped.set(code, []);
      grouped.get(code).push(row);
    });

    grouped.forEach((rows, code) => {
      const result = bySchool.get(code);
      result.assessed += 1;
      const incompleteRows = rows.filter(row => dataset.metrics.some(field => !isCompleteMetric(row[field], field)));
      if (incompleteRows.length) result.issues.push({ dataset, incompleteRows: incompleteRows.length });
    });
  });

  return [...bySchool.values()].sort((a, b) =>
    b.issues.length - a.issues.length ||
    String(a.school.SCHOOL_NAME || "").localeCompare(String(b.school.SCHOOL_NAME || ""), "th")
  );
}

function summarizeBy(allItems, incompleteItems, field, fallback) {
  const groups = new Map();
  allItems.forEach(item => {
    const value = String(item.school[field] || "").trim() || fallback;
    if (!groups.has(value)) groups.set(value, { label: value, count: 0, total: 0 });
    groups.get(value).total += 1;
  });
  incompleteItems.forEach(item => {
    const value = String(item.school[field] || "").trim() || fallback;
    if (!groups.has(value)) groups.set(value, { label: value, count: 0, total: 0 });
    groups.get(value).count += 1;
  });
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "th"));
}

export function summarizeIncompleteSchools(coverageRows) {
  const all = coverageRows || [];
  const incomplete = all.filter(item => item.issues.length > 0);
  const basicEducationDepartment = "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน";
  const allBasicEducation = all.filter(item => String(item.school.DEPARTMENT_NAME || "").trim() === basicEducationDepartment);
  const allOtherDepartments = all.filter(item => String(item.school.DEPARTMENT_NAME || "").trim() !== basicEducationDepartment);
  const basicEducation = incomplete.filter(item => String(item.school.DEPARTMENT_NAME || "").trim() === basicEducationDepartment);
  const otherDepartments = incomplete.filter(item => String(item.school.DEPARTMENT_NAME || "").trim() !== basicEducationDepartment);
  return {
    total: incomplete.length,
    schoolTotal: all.length,
    departments: summarizeBy(allOtherDepartments, otherDepartments, "DEPARTMENT_NAME", "ไม่ระบุสังกัด"),
    areas: summarizeBy(allBasicEducation, basicEducation, "EDU_AREA_NAME", "ไม่ระบุเขตพื้นที่การศึกษา")
  };
}

export function filterCoverageRows(coverageRows, department = "", area = "") {
  return (coverageRows || []).filter(item => {
    const itemDepartment = String(item.school.DEPARTMENT_NAME || "").trim() || "ไม่ระบุสังกัด";
    const itemArea = String(item.school.EDU_AREA_NAME || "").trim() || "ไม่ระบุเขตพื้นที่การศึกษา";
    return (!department || itemDepartment === department) && (!area || itemArea === area);
  });
}
