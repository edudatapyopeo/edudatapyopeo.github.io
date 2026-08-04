export const MAX_UPLOAD_ROWS = 5000;
const FORMULA_PREFIX = /^[=+\-@]/;

function isNumericField(field) {
  return field !== "SCHOOL_CODE" && (field === "YEAR" || /_(?:YEAR|COUNT)$/.test(field));
}

function cellValue(cell) {
  if (cell.formula || (cell.value && typeof cell.value === "object" && "formula" in cell.value)) throw new Error(`พบสูตร Excel ที่เซลล์ ${cell.address} ซึ่งไม่อนุญาตให้อัปโหลด`);
  if (cell.value === null || cell.value === undefined) return "";
  if (typeof cell.value === "object") {
    if (Array.isArray(cell.value.richText)) return cell.value.richText.map(part => part.text || "").join("");
    if (cell.value.text !== undefined) return String(cell.value.text);
    if (cell.value instanceof Date) return cell.value.toISOString();
  }
  return cell.value;
}

function normalizeValue(value, field, rowNumber) {
  if (value === null || value === undefined || value === "") return "";
  if (field === "SCHOOL_CODE") {
    const code = String(value).trim();
    if (FORMULA_PREFIX.test(code)) throw new Error(`แถว ${rowNumber}: SCHOOL_CODE มีข้อความที่ไม่ปลอดภัย`);
    return code;
  }
  if (isNumericField(field)) {
    const number = Number(String(value).replace(/,/g, ""));
    if (!Number.isInteger(number) || number < 0) throw new Error(`แถว ${rowNumber}: ${field} ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`);
    return number;
  }
  const text = String(value).trim();
  if (field === "COORDI" && text) {
    const match = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match || Number(match[1]) < -90 || Number(match[1]) > 90 || Number(match[2]) < -180 || Number(match[2]) > 180) throw new Error(`แถว ${rowNumber}: COORDI ต้องเป็น latitude,longitude`);
    return `${Number(match[1])},${Number(match[2])}`;
  }
  if (text.length > 1000 || FORMULA_PREFIX.test(text)) throw new Error(`แถว ${rowNumber}: ${field} มีข้อความที่ไม่ปลอดภัยหรือยาวเกินไป`);
  return text;
}

export function validateWorksheet(worksheet, definition, { maxRows = MAX_UPLOAD_ROWS } = {}) {
  if (!worksheet) throw new Error("ไฟล์ไม่มี Worksheet");
  const expected = definition.columns;
  const uploaded = [];
  for (let column = 1; column <= Math.max(worksheet.columnCount, expected.length); column += 1) uploaded.push(String(cellValue(worksheet.getCell(1, column)) || "").trim());
  while (uploaded.at(-1) === "") uploaded.pop();
  if (uploaded.length !== expected.length || uploaded.some((name, index) => name !== expected[index])) throw new Error("หัวคอลัมน์ไม่ตรงกับ Template กรุณาตรวจชื่อและลำดับคอลัมน์");

  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = expected.map((field, index) => normalizeValue(cellValue(worksheet.getCell(rowNumber, index + 1)), field, rowNumber));
    const extra = [];
    for (let column = expected.length + 1; column <= worksheet.columnCount; column += 1) extra.push(cellValue(worksheet.getCell(rowNumber, column)));
    if (extra.some(value => String(value ?? "").trim() !== "")) throw new Error(`แถว ${rowNumber}: พบข้อมูลเกินจำนวนคอลัมน์ที่กำหนด`);
    if (row.every(value => value === "")) continue;
    rows.push(row);
  }
  if (!rows.length) throw new Error("ไม่พบข้อมูลใต้หัวตาราง");
  if (rows.length > maxRows) throw new Error(`ไฟล์มี ${rows.length} แถว เกินขีดจำกัด ${maxRows} แถว`);

  const keyIndexes = definition.key.map(field => expected.indexOf(field));
  const keys = new Set();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (keyIndexes.some(column => row[column] === "")) throw new Error(`แถว ${rowNumber}: Composite Key ต้องมีค่า ${definition.key.join(", ")}`);
    const key = keyIndexes.map(column => String(row[column]).trim().toLowerCase()).join("||");
    if (keys.has(key)) throw new Error(`แถว ${rowNumber}: Composite Key ซ้ำภายในไฟล์`);
    keys.add(key);
  });
  return rows;
}

export function validateRowsYear(rows, definition, expectedYear) {
  const yearField = definition.columns.includes("YEAR") ? "YEAR" : definition.columns.includes("GRADUATED_YEAR") ? "GRADUATED_YEAR" : null;
  if (!yearField) return null;
  const year = Number(expectedYear);
  if (!Number.isInteger(year) || year < 2500 || year > 2700) throw new Error("กรุณาระบุปีข้อมูลที่ต้องการอัปโหลดให้ถูกต้อง");
  const yearIndex = definition.columns.indexOf(yearField);
  const mismatched = rows.findIndex(row => Number(row[yearIndex]) !== year);
  if (mismatched !== -1) throw new Error(`แถว ${mismatched + 2}: ${yearField} ไม่ตรงกับปี ${year} ที่ระบุ`);
  return yearField;
}
