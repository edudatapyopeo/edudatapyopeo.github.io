# Google Apps Script deployment

ไฟล์ `Code.gs` ในโฟลเดอร์นี้เป็นไฟล์สำหรับติดตั้งด้วยตนเองและถูก `.gitignore` ป้องกันไม่ให้ Commit

## Script Properties ที่ต้องตั้งค่า

- `PYOEDU_DB1_ID`
- `PYOEDU_DB2_ID`
- `PYOEDU_DB3_ID`
- `PYOEDU_DB4_ID`
- `PYOEDU_DB5_TESTSCORE_ID`
- `PYOEDU_DB6_SDG4_MONITORING_ID`
- `PYOEDU_DB7_SDG4_PROJECT_ID`
- `FIREBASE_WEB_API_KEY`
- `ALLOWED_STAFF_EMAILS` รายการอีเมลคั่นด้วยจุลภาค
- `ALLOWED_ADMIN_EMAILS` รายการอีเมลคั่นด้วยจุลภาค
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET` เก็บเฉพาะใน Script Properties ห้ามใส่ในไฟล์เว็บไซต์

ห้ามใส่ค่าจริงเหล่านี้ใน Git หรือในไฟล์คู่มือ

## ขั้นตอนติดตั้ง

1. สร้าง Apps Script project ด้วยบัญชีที่เข้าถึง Google Sheets ทุกไฟล์ที่กำหนดใน `PYOEDU_SCHEMA` ได้
2. คัดลอกเนื้อหา `Code.gs` ไปยัง Apps Script editor
3. ตั้งค่า Script Properties ตามรายการข้างต้น
4. Deploy เป็น Web app โดยกำหนด Execute as เป็นเจ้าของ Script และ Who has access เป็น `Anyone` เพื่อให้ Public Dashboard อ่านข้อมูลได้
5. ทดสอบ public `metadata`, `summary` และ `rows`
6. ทดสอบ write endpoint ด้วย Firebase ID Token ของ staff และทดสอบบัญชีที่ไม่ได้รับอนุญาต
7. นำ Web app URL ไปใส่ใน `assets/js/config.js` เฉพาะเครื่องพัฒนา

ก่อน Deploy ต้องตรวจหัวคอลัมน์จริงครบทั้ง 15 ชีต โดยเฉพาะ `Dropout_Student`

สำหรับ `DB7_SDG4_PROJECT / SDG4_Project` Public API จะส่งออกเฉพาะแถวที่ `PUBLICATION_STATUS` เท่ากับ `PUBLISHED` เท่านั้น แถวที่เว้นว่างหรือเป็นสถานะอื่นจะไม่ปรากฏบนหน้าเว็บไซต์

แบบฟอร์มรายงานโครงการส่ง `POST` โดยกำหนด `operation` เป็น `createSdg4Project` ฝั่ง Server จะตรวจ Firebase ID Token และรายชื่อ staff/admin ก่อนสร้าง `PROJECT_ID`, `DATE_UPLOAD` และกำหนด `PUBLICATION_STATUS` เป็น `PUBLISHED` ให้อัตโนมัติ

ภาพหน้าปกใช้ Signed Direct Upload โดยแบบฟอร์มขอลายเซ็นชั่วคราวผ่าน `operation: "createCloudinarySignature"` แล้วส่งไฟล์จาก Browser ไป Cloudinary โดยตรง ค่า `CLOUDINARY_API_SECRET` จะไม่ถูกส่งกลับไปยัง Browser
