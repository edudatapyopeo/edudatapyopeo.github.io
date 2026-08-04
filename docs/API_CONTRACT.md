# Public API Contract

Public read API ใช้ HTTP GET และไม่ต้องล็อกอิน ส่วน write API ใช้ HTTP POST พร้อม Firebase ID Token และตรวจสิทธิ์ซ้ำใน Apps Script

Apps Script Web App ต้อง Deploy แบบ Execute as เจ้าของ Script และอนุญาต `Anyone` มิฉะนั้น Public Dashboard จะถูก Redirect ไปหน้า Google Sign-in

## Parameters กลาง

| Parameter | รายละเอียด |
|---|---|
| `dbKey` | `DB1`, `DB2`, `DB3` หรือ `DB4` |
| `sheetName` | ชื่อชีตตาม `DATA_CONTRACT.md` |
| `action` | `rows`, `metadata` หรือ `summary` |
| `filter_FIELD_NAME` | กรองค่าแบบตรงกัน หลายค่าใช้ `|` คั่น |

## Rows

ใช้สำหรับตารางและรายละเอียด โดยแบ่งหน้าที่ Server

```text
?action=rows&dbKey=DB1&sheetName=School_Info&page=1&pageSize=10
```

Parameters เพิ่มเติม:

- `page` เริ่มจาก 1
- `pageSize` สูงสุด 500
- `search` ข้อความค้นหา สูงสุด 100 ตัวอักษร
- `searchFields` รายชื่อคอลัมน์ที่ค้นหา ใช้ `|` คั่น

Response มี `data` และ `pagination` ซึ่งประกอบด้วย `page`, `pageSize`, `totalRows`, `totalPages` และ `hasMore`

## Metadata

ใช้สร้างตัวเลือกตัวกรองโดยไม่ต้องส่งข้อมูลทุกแถว

```text
?action=metadata&dbKey=DB1&sheetName=Student_Count&fields=YEAR|DEPARTMENT_NAME|EDU_AREA_NAME
```

## Summary

ใช้รวมเฉพาะคอลัมน์ตัวเลขที่ Schema อนุญาต

```text
?action=summary&dbKey=DB1&sheetName=Student_Count&metrics=STUDENT_MALE_COUNT|STUDENT_FEMALE_COUNT&filter_YEAR=2568
```

ช่องว่างใน Metric มีค่าเท่ากับ `0` และนำไปคำนวณผลรวม ส่วนช่องอื่นที่ว่างคงเป็น `null` เพื่อให้หน้าจอแสดงเป็น “ไม่มีข้อมูล” หากไม่พบแถวข้อมูลตามตัวกรอง `data` จะเป็นอาร์เรย์ว่าง

## Cache

- Apps Script ใช้ `CacheService` 10 นาที
- Browser ใช้ IndexedDB cache แบบ fresh 15 นาทีและ stale fallback 6 ชั่วโมง
- หลัง write สำเร็จ Apps Script จะเพิ่ม cache version ทำให้คำขอใหม่ไม่ใช้ผลลัพธ์เดิม

## Error handling

Public response ไม่ส่ง stack trace หรือรายละเอียดภายใน ผู้ใช้จะได้รับข้อความทั่วไปพร้อมคำแนะนำให้ลองใหม่ ส่วนรายละเอียดให้ตรวจจาก Apps Script execution log
