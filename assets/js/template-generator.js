const SCHOOL_FIELDS = new Set(["DEPARTMENT_NAME", "EDU_AREA_NAME", "SCHOOL_CODE", "SCHOOL_NAME"]);

export function filterTemplateSchools(schools, department, area = "") {
  const seen = new Set();
  return (schools || []).filter(school => {
    const code = String(school.SCHOOL_CODE || "").trim();
    if (!code || seen.has(code)) return false;
    if (department && String(school.DEPARTMENT_NAME || "").trim() !== department) return false;
    const schoolArea = String(school.EDU_AREA_NAME || "").trim() || "ไม่ระบุเขตพื้นที่การศึกษา";
    if (area && schoolArea !== area) return false;
    seen.add(code);
    return true;
  }).sort((a, b) => String(a.SCHOOL_NAME || "").localeCompare(String(b.SCHOOL_NAME || ""), "th"));
}

export function buildScopedTemplateRows(definition, schools, year, sheetName, existingRows = []) {
  const yearField = definition.columns.includes("YEAR") ? "YEAR" : definition.columns.includes("GRADUATED_YEAR") ? "GRADUATED_YEAR" : null;
  const schoolByCode = new Map(schools.map(school => [String(school.SCHOOL_CODE || "").trim(), school]));
  const metricFields = new Set(definition.columns.filter(field => /_COUNT$/.test(field) || field === "STATUS_Y_N"));
  const usedCodes = new Set();
  const rows = existingRows.filter(row => schoolByCode.has(String(row.SCHOOL_CODE || "").trim())).map(row => {
    const code = String(row.SCHOOL_CODE || "").trim();
    const school = schoolByCode.get(code);
    usedCodes.add(code);
    return definition.columns.map(field => {
      if (metricFields.has(field)) return "";
      if (yearField && field === yearField) return Number(year);
      if (SCHOOL_FIELDS.has(field)) return school[field] ?? row[field] ?? "";
      return row[field] ?? "";
    });
  });
  schools.filter(school => !usedCodes.has(String(school.SCHOOL_CODE || "").trim())).forEach(school => rows.push(definition.columns.map(field => {
    if (yearField && field === yearField) return Number(year);
    if (sheetName === "School_Info") return school[field] ?? "";
    if (SCHOOL_FIELDS.has(field)) return school[field] ?? "";
    return "";
  })));
  return rows;
}
