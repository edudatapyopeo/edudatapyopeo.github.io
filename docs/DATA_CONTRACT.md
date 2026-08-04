# Data Contract

เอกสารนี้ยึด Schema จากไฟล์ Excel ทั้ง 4 ชุด และคำยืนยันของเจ้าของระบบวันที่ 3 สิงหาคม 2569

## กติกากลาง

- `SCHOOL_CODE` เป็น identifier และต้องเก็บ/ส่งเป็นข้อความ เพื่อรักษาเลขศูนย์นำหน้า
- ช่องว่างในคอลัมน์ Metric มีค่าเท่ากับ `0` เพื่อใช้ในการคำนวณ
- ช่องว่างในคอลัมน์อื่นคงเป็น `null` และเมื่อแสดงผลต้องใช้ข้อความ “ไม่มีข้อมูล”
- ช่องจำนวนที่มีค่าต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป
- `COORDI` ใช้รูปแบบ `latitude,longitude`
- ข้อความที่เริ่มด้วย `=`, `+`, `-` หรือ `@` ต้องถูกปฏิเสธหรือทำให้เป็นข้อความก่อนเขียนลง Sheet

## หลักการคำนวณและตัวกรอง Dashboard

- การคำนวณจำนวนนักเรียน ครูและบุคลากร และห้องเรียนต้องเลือก `YEAR` เพียงหนึ่งปี ห้ามรวมหลายปีเพราะจะนับข้อมูลบุคคลหรือรายการเดิมซ้ำข้ามปี
- จำนวนนักเรียนรวมเท่ากับผลรวม `STUDENT_MALE_COUNT + STUDENT_FEMALE_COUNT` หลังใช้ตัวกรอง
- จำนวนครูและบุคลากรรวมเท่ากับผลรวม `TEACHER_MALE_COUNT + TEACHER_FEMALE_COUNT` หลังใช้ตัวกรอง โดยรวมทุก `STAFF_TYPE`
- จำนวนสถานศึกษานับ `SCHOOL_CODE` ที่ไม่ซ้ำจาก `Student_Count` ของปีและตัวกรองที่เลือก
- ค่า “ทุกสังกัด” และ “ทุกพื้นที่” หมายถึงไม่ใช้เงื่อนไขกรองในมิตินั้น
- รายการสังกัดและพื้นที่ใช้ `School_Info` เป็นข้อมูลอ้างอิง และเชื่อมผลสรุปจากแต่ละชีตด้วย `SCHOOL_CODE` เพื่อหลีกเลี่ยงปัญหาชื่อมิติไม่ตรงกันระหว่างชีต
- API สรุป Metric แยกตาม `SCHOOL_CODE` ก่อน แล้วหน้า Dashboard จึงกรองรหัสสถานศึกษาและรวมยอดสุดท้าย
- `PRINCIPAL_NAME` ได้รับอนุญาตให้เปิดเผยต่อสาธารณะ
- API ต้องใช้ชื่อหัวคอลัมน์ตรงตามเอกสารทั้งชื่อ ลำดับ และจำนวน

## Composite Key

| Database / Sheet | Composite Key |
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

`School_Info` และ `Graduated_Student` เป็นข้อยกเว้นเนื่องจากไม่มีคอลัมน์ `YEAR` ตามลำดับ

ไม่ใช้ `CURRICULUM_YEAR`, `SUBJECT_TYPE` และ `OCCUPA_GROUP` เป็น key ในระยะแรก เพราะข้อมูลปัจจุบันว่างทั้งหมด หากในอนาคตหนึ่งสถานศึกษามีหลักสูตรชื่อและระดับเดียวกันมากกว่าหนึ่งรายการ ต้องทบทวน key ก่อนนำเข้าข้อมูลชุดนั้น

## นิยามสัดส่วนสายสามัญต่อสายอาชีพ

- สายสามัญ: `EDU_LEVEL` เท่ากับมัธยมศึกษาปีที่ 4, 5 หรือ 6
- สายอาชีพ: `EDU_LEVEL` เท่ากับประกาศนียบัตรวิชาชีพปีที่ 1, 2 หรือ 3
- ตัวตั้งและตัวหารใช้ผลรวม `STUDENT_MALE_COUNT + STUDENT_FEMALE_COUNT`
- ค่าว่างใน Metric ต้องถือเป็น `0` และนำไปคำนวณผลรวม
- หน้าจอต้องแสดงทั้งจำนวนคนและอัตราส่วน โดยแสดง “ไม่มีข้อมูล” เมื่อไม่พบแถวข้อมูลตามตัวกรอง

## Schema ที่แก้ไขล่าสุด

`Dropout_Student` ใช้หัวคอลัมน์ต่อไปนี้:

1. `YEAR`
2. `DEPARTMENT_NAME`
3. `EDU_AREA_NAME`
4. `SCHOOL_CODE`
5. `SCHOOL_NAME`
6. `DROPOUT_CAUSE`
7. `DROPOUT_STUDENT_MALE_COUNT`
8. `DROPOUT_STUDENT_FEMALE_COUNT`

Google Sheets ไม่เปิด public access ขณะตรวจ จึงต้องตรวจ Schema นี้ซ้ำผ่านบัญชีเจ้าของก่อน Deploy Apps Script
