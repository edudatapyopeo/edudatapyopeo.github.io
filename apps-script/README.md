# Google Apps Script deployment

ไฟล์ `Code.gs` ในโฟลเดอร์นี้เป็นไฟล์สำหรับติดตั้งด้วยตนเองและถูก `.gitignore` ป้องกันไม่ให้ Commit

## Script Properties ที่ต้องตั้งค่า

- `PYOEDU_DB1_ID`
- `PYOEDU_DB2_ID`
- `PYOEDU_DB3_ID`
- `PYOEDU_DB4_ID`
- `FIREBASE_WEB_API_KEY`
- `ALLOWED_STAFF_EMAILS` รายการอีเมลคั่นด้วยจุลภาค
- `ALLOWED_ADMIN_EMAILS` รายการอีเมลคั่นด้วยจุลภาค

ห้ามใส่ค่าจริงเหล่านี้ใน Git หรือในไฟล์คู่มือ

## ขั้นตอนติดตั้ง

1. สร้าง Apps Script project ด้วยบัญชีที่เข้าถึง Google Sheets ทั้งสี่ไฟล์ได้
2. คัดลอกเนื้อหา `Code.gs` ไปยัง Apps Script editor
3. ตั้งค่า Script Properties ตามรายการข้างต้น
4. Deploy เป็น Web app โดยกำหนด Execute as เป็นเจ้าของ Script และ Who has access เป็น `Anyone` เพื่อให้ Public Dashboard อ่านข้อมูลได้
5. ทดสอบ public `metadata`, `summary` และ `rows`
6. ทดสอบ write endpoint ด้วย Firebase ID Token ของ staff และทดสอบบัญชีที่ไม่ได้รับอนุญาต
7. นำ Web app URL ไปใส่ใน `assets/js/config.js` เฉพาะเครื่องพัฒนา

ก่อน Deploy ต้องตรวจหัวคอลัมน์จริงครบทั้ง 15 ชีต โดยเฉพาะ `Dropout_Student`
