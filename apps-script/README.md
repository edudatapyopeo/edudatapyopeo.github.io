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

หน้าติดตามตัวชี้วัด SDG4 ใช้ `MOREHALF_SCORE` จาก `DB5_TESTSCORE / NT_Score` และ `ONET_Score` รวมถึงชีต `SDG4.2.1` และ `SDG4.2.2` ใน `DB6_SDG4_MONITORING` หลังแก้ `Code.gs` ต้องบันทึก สร้าง Deployment เวอร์ชันใหม่ และทดสอบ metadata ของทั้งสี่ชีตก่อนเปิดหน้าเว็บไซต์ มิฉะนั้นผลของแหล่งข้อมูลที่ยังอ่านไม่ได้จะแสดงเป็น `–`

สำหรับตัวชี้วัดชุดถัดไป ต้องมีชีต `SDG4.4.1` และ `SDG4.6.1` ตาม schema ใน `Code.gs` และต้องแทรกคอลัมน์ `TARGET_GROUP_COUNT` ใน `DB7_SDG4_PROJECT / SDG4_Project` ไว้หน้าคอลัมน์ `BUDGET_AMOUNT` ตามลำดับ `DEPARTMENT_NAME_AGENCY, TARGET_GROUP_COUNT, BUDGET_AMOUNT` ข้อมูลโครงการเดิมสามารถเว้นว่างไว้ก่อนได้ แต่เมื่อแก้ไขโครงการ ระบบจะบังคับให้กรอกจำนวนกลุ่มเป้าหมาย

ฟังก์ชัน `summaryResponse_` จะตีความเครื่องหมาย `-` เป็นตัวเลข `0` โดยตรง เพื่อป้องกันผลรวมทั้งกลุ่มกลายเป็น `null` ส่วนข้อความผิดรูปแบบชนิดอื่นจะไม่ถูกนำมารวม และค่าตัวเลข `0` ยังคงถูกนับตามปกติ

สำหรับ `DB7_SDG4_PROJECT / SDG4_Project` ต้องมีคอลัมน์ `UPLOADER_EMAIL` ต่อท้าย `PUBLICATION_STATUS` เพื่อเก็บเจ้าของโครงการ และมี `COVER_IMAGE_PUBLIC_ID` ต่อท้าย `UPLOADER_EMAIL` เพื่อใช้ลบภาพออกจาก Cloudinary ระบบ Public API จะไม่ส่งสองคอลัมน์นี้ออกสู่หน้าเว็บไซต์ และจะส่งออกเฉพาะแถวที่ `PUBLICATION_STATUS` เท่ากับ `PUBLISHED` เท่านั้น แถวที่เว้นว่างหรือเป็นสถานะอื่นจะไม่ปรากฏบนหน้าเว็บไซต์

แบบฟอร์มรายงานโครงการส่ง `POST` โดยกำหนด `operation` เป็น `createSdg4Project` ฝั่ง Server จะตรวจ Firebase ID Token และรายชื่อ staff/admin ก่อนสร้าง `PROJECT_ID`, `DATE_UPLOAD`, บันทึก `UPLOADER_EMAIL` และกำหนด `PUBLICATION_STATUS` เป็น `PUBLISHED` ให้อัตโนมัติ หน้าจัดการโครงการเรียกรายการด้วย `listManageableSdg4Projects` ส่วนการแก้ไขและลบใช้ `updateSdg4Project` และ `deleteSdg4Project` โดย staff จัดการได้เฉพาะแถวที่ `UPLOADER_EMAIL` ตรงกับบัญชีตนเอง ส่วน admin จัดการได้ทุกแถว โครงการเดิมที่ยังไม่มี `UPLOADER_EMAIL` จะจัดการได้เฉพาะ admin

ภาพหน้าปกใช้ Signed Direct Upload โดยแบบฟอร์มจะตรวจความละเอียด ลดด้านยาวไม่เกิน 1,600 พิกเซล บีบอัดเป็น WebP ไม่เกินประมาณ 1.2 MB แล้วจึงขอลายเซ็นชั่วคราวผ่าน `operation: "createCloudinarySignature"` และส่งเฉพาะไฟล์ที่เตรียมแล้วจาก Browser ไป Cloudinary โดยตรง ค่า `CLOUDINARY_API_SECRET` จะไม่ถูกส่งกลับไปยัง Browser

เมื่อผู้ใช้ลบโครงการ ระบบจะลบภาพหน้าปกจาก Cloudinary ก่อนลบแถวข้อมูล หาก Cloudinary ล้มเหลว ระบบจะคงโครงการไว้และแจ้งให้ลองใหม่ สำหรับข้อมูลเดิมที่ยังไม่มี `COVER_IMAGE_PUBLIC_ID` ระบบจะพยายามอ่านค่า public ID จาก `COVER_IMAGE_URL` ที่อยู่ในโฟลเดอร์ `pyoedu/sdg4-projects` ให้อัตโนมัติ และเมื่อเปลี่ยนภาพหน้าปก ระบบจะพยายามลบภาพเดิมแบบเบื้องหลังเพื่อลดไฟล์ที่ไม่ได้ใช้งาน
