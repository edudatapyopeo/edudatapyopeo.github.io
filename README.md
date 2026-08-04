# ระบบข้อมูลสารสนเทศทางการศึกษาของจังหวัดพะเยา

Static website สำหรับ GitHub Pages ใช้แสดงข้อมูลทางการศึกษาของจังหวัดพะเยา โดยโหลดข้อมูลจาก Google Sheets ผ่าน Google Apps Script API

## เทคโนโลยี

- HTML, CSS และ JavaScript
- Tailwind CSS 3
- Chart.js
- Leaflet และ OpenStreetMap
- Google Apps Script และ Google Sheets
- Firebase Authentication สำหรับหน้าจัดการข้อมูล

## เริ่มต้นพัฒนา

```powershell
pnpm install
pnpm run build
```

เปิด `index.html` ผ่าน local HTTP server ห้ามเปิดด้วย `file://` เมื่อทดสอบ API หรือ Firebase

## การตั้งค่า

1. Deploy Google Apps Script ตามคู่มือใน `apps-script/README.md`
2. กรอก Apps Script Web App URL ใน `assets/js/config.js`
3. กรอก Firebase Web configuration เมื่อเริ่มพัฒนาหน้าเจ้าหน้าที่
4. ห้าม Commit `.env`, Excel หรือ `apps-script/*.gs`

รายละเอียด Schema และกติกาข้อมูลอยู่ที่ `docs/DATA_CONTRACT.md`, รูปแบบ API อยู่ที่ `docs/API_CONTRACT.md` และวิธีติดตั้ง Apps Script อยู่ที่ `apps-script/README.md`

Dashboard ข้อมูลพื้นฐาน นักเรียน ครูและบุคลากร หลักสูตร และโครงสร้างพื้นฐานพร้อมเชื่อม API แล้ว รองรับตัวกรองหลายค่า การค้นหาสถานศึกษา กราฟและตารางรายละเอียดรายหัวข้อ แผนที่สถานศึกษา แนวโน้มหลักสูตร และรายละเอียดโครงสร้างพื้นฐานรายโรงเรียน

หน้าเข้าสู่ระบบและส่วนจัดการข้อมูลรองรับ Firebase Authentication แล้ว ผู้ใช้สมัครสมาชิก ส่งอีเมลยืนยันซ้ำ และขอเปลี่ยนรหัสผ่านได้ โดยต้องยืนยันอีเมลก่อนเข้าสู่ระบบ และบัญชีที่จะเขียนข้อมูลต้องอยู่ใน Apps Script allowlist ด้วย ระบบต้องมี Firebase Web configuration ใน `assets/js/config.js` และเปิดใช้งาน Email/Password ใน Firebase Console ก่อนใช้งานจริง

ส่วนจัดการข้อมูลรองรับดาวน์โหลด Excel Template แยกตาม 15 ชีต ตรวจหัวคอลัมน์ ปีข้อมูล Composite Key ชนิดตัวเลข พิกัด และสูตรที่ไม่ปลอดภัยก่อนส่งข้อมูลสูงสุด 5,000 แถวไปยัง Apps Script พร้อม Firebase ID Token รวมถึงแก้ไขข้อมูลปัจจุบันรายสถานศึกษาและติดตามชุดข้อมูลที่ยังไม่พบตามปี
