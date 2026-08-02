# Frontend Structure

หน้านี้เป็น frontend สำหรับเรียก UserAlfresco API หลังจาก login แล้ว

## Files

- `index.html` โครงสร้างหน้าเว็บ เช่น navbar, sidebar, ตารางไฟล์
- `css/app.css` style ทั้งหมดของหน้า frontend
- `js/app.js` logic เรียก API, จัดการ token, โหลด folder, ค้นหาไฟล์, เปิดเอกสาร

## Flow

1. เปิด `/frontend/`
2. ถ้ายังไม่มี `alfrescoUserApiToken` ใน `sessionStorage` จะ redirect ไป `/login/`
3. ถ้ามี token แล้ว จะเรียก `GET /user-api/alfresco/folders`
4. แสดง folder ที่ user เห็นตามสิทธิ์ใน sidebar ซ้าย
5. เลือก folder แล้วกด `ค้นหา`
6. เรียก `GET /user-api/alfresco/documents`
7. กด `เปิด` เพื่อเปิดไฟล์ผ่าน `GET /user-api/alfresco/documents/:id/content`
