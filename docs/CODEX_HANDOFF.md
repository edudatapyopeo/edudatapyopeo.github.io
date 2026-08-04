# บันทึกส่งต่องานระบบฐานข้อมูลการศึกษาจังหวัดพะเยา

อัปเดตล่าสุด: 4 สิงหาคม 2569 (2026-08-04)

เอกสารนี้ใช้สำหรับส่งต่องานให้ Codex บนคอมพิวเตอร์เครื่องใหม่ โปรดส่งไฟล์นี้ให้ Codex อ่านทั้งหมดก่อนเริ่มแก้ไขโปรเจกต์

## 1. ข้อมูลโปรเจกต์

- ชื่อระบบปัจจุบัน: ระบบข้อมูลสารสนเทศทางการศึกษาของจังหวัดพะเยา
- โฟลเดอร์เดิม: `G:\pyoedu-dashboard`
- GitHub repository: `https://github.com/edudatapyopeo/edudatapyopeo.github.io`
- Branch: `main`
- รูปแบบเว็บไซต์: Static HTML/CSS/JavaScript สำหรับ GitHub Pages
- แหล่งข้อมูล: Google Sheets 4 ฐาน ผ่าน Google Apps Script Web App API
- Authentication: Firebase Email/Password สำหรับส่วนเจ้าหน้าที่
- Dashboard สาธารณะต้องเปิดอ่านได้โดยไม่ต้องเข้าสู่ระบบ
- การอัปโหลดหรือแก้ไขข้อมูลต้องเข้าสู่ระบบและผ่าน allowlist ที่ Apps Script เท่านั้น

ไฟล์ Excel ต้นฉบับที่เคยใช้ตรวจ Schema:

- `PYOEDU_DB1_BASICDATA.xlsx`
- `PYOEDU_DB2_CURRICULUM.xlsx`
- `PYOEDU_DB3_INDEX.xlsx`
- `PYOEDU_DB4_OTHER.xlsx`

โลโก้กระทรวงศึกษาธิการถูกนำมาเก็บที่ `assets/images/moe-icon.png` แล้ว

## 2. ข้อตกลงและความหมายของข้อมูลที่ผู้ใช้ยืนยันแล้ว

1. `COORDI` ใช้ลำดับ `latitude,longitude`
2. ชีต `Dropout_Student` ใช้คอลัมน์:
   - `DROPOUT_STUDENT_MALE_COUNT`
   - `DROPOUT_STUDENT_FEMALE_COUNT`
3. ช่องว่างในคอลัมน์ Metric ให้ตีความเป็น `0` เพื่อใช้คำนวณ
4. ช่องว่างในคอลัมน์มิติหรือข้อความ เมื่อจำเป็นต้องแสดงผล ให้แสดงคำว่า `ไม่มีข้อมูล`
5. อนุญาตให้เผยแพร่ `PRINCIPAL_NAME` ต่อสาธารณะ
6. สายสามัญหมายถึง `EDU_LEVEL` มัธยมศึกษาปีที่ 4-6
7. สายอาชีพหมายถึงประกาศนียบัตรวิชาชีพปีที่ 1-3
8. ห้ามเดาสูตรตัวชี้วัดใหม่ หากข้อมูลหรือหลักเกณฑ์ยังไม่ได้รับการยืนยันจากผู้ใช้

Composite Key ของแต่ละชีต:

| ฐาน / ชีต | Composite Key |
|---|---|
| DB1 / School_Info | `SCHOOL_CODE` |
| DB1 / Student_Count | `YEAR`, `SCHOOL_CODE`, `EDU_LEVEL` |
| DB1 / Teacher_Count | `YEAR`, `SCHOOL_CODE`, `STAFF_TYPE` |
| DB1 / Classroom_Count | `YEAR`, `SCHOOL_CODE`, `EDU_LEVEL` |
| DB2 / Curriculum_HigherEdu | `YEAR`, `SCHOOL_CODE`, `EDU_LEVEL`, `MAJOR_NAME` |
| DB2 / Curriculum_VocationalEdu | `YEAR`, `SCHOOL_CODE`, `EDU_LEVEL`, `MAJOR_NAME` |
| DB3 / RepeatGrade_Student | `YEAR`, `SCHOOL_CODE`, `EDU_LEVEL` |
| DB3 / Disabled_Student | `YEAR`, `SCHOOL_CODE`, `DISABLED_TYPE` |
| DB3 / NonThai_Student | `YEAR`, `SCHOOL_CODE`, `STATE_NAME` |
| DB3 / Disadvantaged_Student | `YEAR`, `SCHOOL_CODE`, `DISADVANTAGED_TYPE` |
| DB3 / Dropout_Student | `YEAR`, `SCHOOL_CODE`, `DROPOUT_CAUSE` |
| DB3 / Graduated_Student | `GRADUATED_YEAR`, `SCHOOL_CODE`, `GRADUATED_EDU_LEVEL` |
| DB4 / TeachingLevel_Teacher | `YEAR`, `SCHOOL_CODE`, `TEACHING_LEVEL` |
| DB4 / GraduatedLevel_Teacher | `YEAR`, `SCHOOL_CODE`, `GRADUATED_TEACHER_LEVEL` |
| DB4 / Infrastructure_School | `YEAR`, `SCHOOL_CODE`, `INFRASTRUCTURE` |

รายละเอียด Schema เต็มอยู่ใน `docs/DATA_CONTRACT.md` และ `assets/js/schema.js`

## 3. หลักการคำนวณและตัวกรองที่ใช้อยู่

- ตัวกรอง `ทุกสังกัด` และ `ทุกพื้นที่` หมายถึงไม่ส่ง filter ของมิตินั้น ห้ามกรองด้วยค่าว่าง
- ปีต้องอ่านจาก metadata จริง ห้ามกำหนดปี 2570 เป็นค่าคงที่
- API ปัจจุบันตรวจพบปีข้อมูล `2567`, `2568`, `2569`
- จำนวนสถานศึกษานับ `SCHOOL_CODE` ที่ไม่ซ้ำจาก `Student_Count` ของปีและตัวกรองที่เลือก
- ยอดนักเรียนรวมจาก `STUDENT_MALE_COUNT + STUDENT_FEMALE_COUNT`
- ยอดครูรวมจาก `TEACHER_MALE_COUNT + TEACHER_FEMALE_COUNT`
- ก่อนรวม Metric ให้ API สรุปแยกตาม `SCHOOL_CODE` และมิติจำแนกของชีต เพื่อไม่ให้ข้อมูลจากหลายมิติถูกนับผิด
- ตัวกรองสังกัดและพื้นที่อ้างอิง `School_Info` เพื่อสร้างชุด `SCHOOL_CODE` ที่อนุญาต แล้วจึงกรองผลจากชีตอื่น
- ค่า Metric ว่างถูกแปลงเป็น `0`; ค่ามิติที่ว่างถูกเก็บเป็น `null` และหน้า Dashboard แสดง `ไม่มีข้อมูล` เมื่อจำเป็น

ปัญหาที่แก้แล้ว:

- Dashboard Basic เคยเรียก API แล้วได้ HTTP 404
- Dashboard เคยอ่านได้เฉพาะ `YEAR = 2570`
- การเลือกปีอื่นและตัวกรอง `ทุกสังกัด` เคยทำให้ไม่พบข้อมูล
- การ์ดจำนวนนักเรียนและครูเคยรวมยอด/กรองผิด

## 4. สิ่งที่พัฒนาแล้ว

### เว็บไซต์และ Dashboard

- หน้าแรกของระบบ
- Dashboard ข้อมูลพื้นฐาน
- Dashboard นักเรียน
- Dashboard ครูและบุคลากร
- Dashboard หลักสูตร
- Dashboard โครงสร้างพื้นฐาน
- ทุก Dashboard ใช้ Sidebar รูปแบบเดียวกัน
- รองรับ responsive layout, loading state, error state และปุ่มลองใหม่
- ใช้ Chart.js, Leaflet/OpenStreetMap และ Tailwind CSS

ไฟล์หน้าหลักอยู่ใน `dashboards/` และ JavaScript อยู่ใน `assets/js/`

### API และ Apps Script

- Public `doGet` รองรับ `rows`, `metadata`, `summary`, filter และ pagination
- ช่อง Metric ว่างอ่านเป็น `0`
- `doPost` ต้องมี Firebase ID Token
- ฝั่ง server ตรวจ `emailVerified` และตรวจอีเมลกับ Script Properties allowlist
- จำกัดไฟล์อัปโหลดไม่เกิน 5,000 แถวต่อคำขอ
- ตรวจลำดับหัวคอลัมน์, Composite Key, ตัวเลขจำนวนเต็มไม่ติดลบ, `COORDI` และข้อความที่เสี่ยงเป็นสูตร
- ใช้ `ScriptLock` ป้องกันการเขียนชนกัน
- รองรับ idempotent request ด้วย `requestId`

ไฟล์ต้นฉบับ Apps Script ในเครื่องเดิมคือ `apps-script/Code.gs` และคู่มืออยู่ที่ `apps-script/README.md`

### Firebase และหน้าจัดการข้อมูล

- หน้าเข้าสู่ระบบ: `admin/login.html`
- หน้าเข้าสู่ระบบรองรับสมัครสมาชิก ส่งอีเมลยืนยันอัตโนมัติ ส่งอีเมลยืนยันซ้ำ และลืมรหัสผ่าน
- ผู้สมัครใหม่ต้องยืนยันอีเมลก่อนเข้าสู่ระบบ และยังต้องอยู่ใน Apps Script allowlist จึงจะเขียนข้อมูลได้
- หน้าจัดการและอัปโหลด: `admin/index.html`
- Firebase project: `educationdata-70d2b`
- Firebase Web configuration ถูกใส่ใน `assets/js/config.js` แล้ว
- Email/Password provider ถูกเปิดแล้วตามคำยืนยันของผู้ใช้
- Authorized domains มี:
  - `localhost`
  - `educationdata-70d2b.firebaseapp.com`
  - `educationdata-70d2b.web.app`
  - `edudatapyopeo.github.io`
- อีเมลผู้ดูแลที่อนุญาต: `saksapyo@gmail.com`
- ผู้ใช้แจ้งว่าได้ตั้งค่า Firebase และ Apps Script ตามคำแนะนำแล้ว แต่ยังไม่ได้ยืนยันในบทสนทนาว่าเข้าสู่ระบบจริงสำเร็จ

Script Properties ที่ Apps Script ต้องมี:

- `PYOEDU_DB1_ID`
- `PYOEDU_DB2_ID`
- `PYOEDU_DB3_ID`
- `PYOEDU_DB4_ID`
- `FIREBASE_WEB_API_KEY`
- `ALLOWED_STAFF_EMAILS`
- `ALLOWED_ADMIN_EMAILS`

ห้ามบันทึกค่าลับหรือรหัสผ่านลง Git ผู้ใช้ไม่ต้องส่งรหัสผ่านให้ Codex

### ระบบอัปโหลด Excel

- มีตัวเลือกครบ 15 ชีต
- มี Template `.xlsx` แยกแต่ละชีตใน `assets/templates/`
- ตรวจไฟล์ด้วย ExcelJS ก่อนส่งข้อมูล
- ตรวจหัวคอลัมน์ตามลำดับจริง
- ตรวจคีย์ซ้ำในไฟล์
- ตรวจตัวเลข พิกัด และ formula injection
- ตรวจปีที่ผู้ใช้ระบุกับ `YEAR` หรือ `GRADUATED_YEAR` ทุกแถว
- แสดง preview และผลจำนวนเพิ่มใหม่/อัปเดต/ไม่เปลี่ยนแปลง
- ส่ง Firebase ID Token ไปยัง Apps Script write endpoint
- รองรับค้นหาและแก้ไขข้อมูลปัจจุบันรายสถานศึกษาด้วย single-row upsert
- มีตารางติดตามการมีข้อมูลของแต่ละสถานศึกษาจำแนกตามฐานข้อมูลและปี

## 5. ผลการตรวจสอบล่าสุด

ตรวจเมื่อ 4 สิงหาคม 2569:

- Firebase Identity Toolkit ตอบ HTTP 200
- Firebase project number ตรงกับ `messagingSenderId`
- `edudatapyopeo.github.io` อยู่ใน Authorized domains แล้ว
- Apps Script Public API ตอบ `success: true`
- metadata ของ `Student_Count` คืนปี `2567`, `2568`, `2569`
- write endpoint ปฏิเสธ token ปลอมด้วย `success: false` และข้อความ `ไม่มีสิทธิ์แก้ไขข้อมูล`
- JavaScript ทุกไฟล์ผ่าน `node --check`
- หน้าเข้าสู่ระบบเปิดได้และไม่พบ JavaScript error ในการทดสอบเบื้องต้น
- ทดสอบเข้าสู่ระบบด้วยบัญชียืนยันอีเมลสำเร็จแล้ว
- ทดสอบอัปโหลดไฟล์จริงสำเร็จ และบัญชีนอก allowlist ถูกปฏิเสธก่อนเขียนข้อมูล
- ยังไม่ได้ commit หรือ push

## 6. สถานะ Git ที่สำคัญมาก

สถานะล่าสุด:

- Branch `main`
- Remote `origin`: `https://github.com/edudatapyopeo/edudatapyopeo.github.io.git`
- Repository ยังไม่มี commit (`No commits yet`)
- ไฟล์โปรเจกต์ทั้งหมดแสดงเป็น untracked
- ยังไม่เคย push งานชุดนี้

ห้าม commit หรือ push จนกว่าผู้ใช้จะสั่งอย่างชัดเจน ก่อนทำต้องตรวจ `git status`, branch และ remote อีกครั้ง

### คำเตือนสำหรับการย้ายคอม

`.gitignore` ปัจจุบันไม่รวมไฟล์ต่อไปนี้ใน Git:

- `apps-script/*.gs` รวมถึง `apps-script/Code.gs`
- ไฟล์ `*.xlsx` และ `*.xls` รวมถึง Template ใน `assets/templates/`
- ไฟล์ `.env*`

ดังนั้น หากย้ายเครื่องก่อนปรับนโยบาย Git ต้องสำรอง `apps-script/Code.gs` และ Template Excel ทั้ง 15 ไฟล์แยกต่างหาก หรือคัดลอก Code จาก Apps Script editor และสร้าง Template ใหม่จาก Schema ห้ามคิดว่าไฟล์เหล่านี้จะติดมากับการ clone repository

## 7. ขั้นตอนถัดไปตามลำดับ

1. ให้ผู้ใช้เข้าสู่ระบบจริงด้วย `saksapyo@gmail.com`
2. ยืนยันว่าหลังเข้าสู่ระบบเปิด `admin/index.html` ได้ และเห็นเครื่องมืออัปโหลด
3. ทดสอบอัปโหลดด้วยไฟล์ขนาดเล็กที่สามารถย้อนคืนได้
4. ตรวจใน Google Sheet ว่า insert/update ใช้ Composite Key ถูกต้อง และ Metric ว่างกลายเป็น `0` เมื่อนำไปคำนวณ
5. ทดสอบบัญชีที่ไม่อยู่ใน allowlist ว่าถูกปฏิเสธ
6. ตรวจ Dashboard ทุกหน้าอีกครั้งหลังมีการเขียนข้อมูล
7. ตัดสินใจกับผู้ใช้ว่าจะนำ `Code.gs` และ Template Excel เข้า Git หรือสำรองด้วยวิธีอื่น
8. เมื่อผู้ใช้อนุญาตแล้วจึง commit และ push ไป `main`
9. ตรวจ GitHub Pages หลัง deploy และทดสอบ login/API บนโดเมนจริง

อย่าอัปโหลดข้อมูลทดสอบ, commit หรือ push โดยไม่ได้รับคำสั่งชัดเจนจากผู้ใช้

## 8. วิธีเริ่มงานบนคอมเครื่องใหม่

หลังมีการ push repository แล้ว:

```powershell
git clone https://github.com/edudatapyopeo/edudatapyopeo.github.io.git
cd edudatapyopeo.github.io
pnpm install
pnpm run build
```

เปิดเว็บผ่าน local HTTP server ห้ามเปิดด้วย `file://` เมื่อต้องทดสอบ Firebase หรือ API

ตรวจไฟล์สำคัญก่อนทำงาน:

- `README.md`
- `docs/CODEX_HANDOFF.md`
- `docs/DATA_CONTRACT.md`
- `docs/API_CONTRACT.md`
- `assets/js/config.js`
- `assets/js/schema.js`
- `apps-script/README.md`

## 9. ข้อความพร้อมคัดลอกไปให้ Codex เครื่องใหม่

```text
ฉันกำลังพัฒนาระบบข้อมูลสารสนเทศทางการศึกษาของจังหวัดพะเยา
Repository: https://github.com/edudatapyopeo/edudatapyopeo.github.io

กรุณาอ่านไฟล์ต่อไปนี้ทั้งหมดก่อนดำเนินการ:
1. docs/CODEX_HANDOFF.md
2. docs/DATA_CONTRACT.md
3. docs/API_CONTRACT.md
4. README.md

ให้ตรวจโครงสร้างโปรเจกต์และ git status ก่อน แล้วสรุปสิ่งที่ตรวจพบให้ฉันดูก่อนแก้ไขไฟล์
ห้ามคัดลอก Firebase configuration, Spreadsheet ID, allowlist หรือ secret จากโปรเจกต์อื่น
ห้ามอัปโหลดข้อมูลจริง, commit หรือ push จนกว่าฉันจะอนุญาตอย่างชัดเจน

สถานะที่คาดไว้: Dashboard 5 หน้า, Firebase login และระบบตรวจ/อัปโหลด Excel พัฒนาแล้ว เหลือทดสอบ login จริง ทดสอบอัปโหลดไฟล์ขนาดเล็ก ตัดสินใจการสำรอง Code.gs/Template และจึง commit/push/deploy
```

## 10. เอกสารอ้างอิงในโปรเจกต์

- สัญญาข้อมูลและสูตร: `docs/DATA_CONTRACT.md`
- รูปแบบ API: `docs/API_CONTRACT.md`
- คู่มือ Apps Script: `apps-script/README.md`
- Schema ฝั่งเว็บ: `assets/js/schema.js`
- Schema และ security ฝั่ง server: `apps-script/Code.gs`
- Firebase/API runtime config: `assets/js/config.js`
