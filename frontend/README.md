# Frontend

โฟลเดอร์นี้เป็นหน้าบ้านของ `UserAlfresco-api` แยกออกจาก backend ชัดเจน

## URLs

- Login: `/login/`
- Documents: `/frontend/`
- API Docs: `/`

## Structure

```text
frontend/
├── login/
│   ├── index.html
│   ├── login.css
│   └── login.js
│
├── documents/
│   ├── index.html
│   ├── documents.css
│   └── documents.js
│
└── shared/
    ├── css/
    │   └── base.css
    └── js/
        ├── api.js
        ├── auth.js
        └── storage.js
```

## Flow

1. User เปิด `/login/`
2. Login ผ่าน `POST /auth/login`
3. เก็บ `accessToken` ไว้ใน `sessionStorage` ชื่อ `alfrescoUserApiToken`
4. ไปหน้า `/frontend/`
5. Frontend เรียก `/user-api/alfresco/folders`
6. เลือก folder แล้วกดค้นหา
7. Frontend เรียก `/user-api/alfresco/documents`
8. กดเปิดไฟล์ผ่าน `/user-api/alfresco/documents/:id/content`
