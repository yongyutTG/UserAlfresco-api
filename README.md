# UserAlfresco API

เอกสาร flow แบบ Step 1, 2, 3: [FLOW_STEPS.md](FLOW_STEPS.md)
โครงสร้างโปรเจคแบบ backend modules: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

โปรเจคนี้เป็น API Gateway แยกจาก `alfresco-api` เดิม สำหรับกรณีที่ต้องการให้ user แต่ละคนเห็น folder/file ตามสิทธิ์ใน Alfresco จริง

## Flow

```text
User login ด้วย Alfresco username/password
        |
        v
Node.js สร้าง user session token
        |
        v
Frontend/Postman เรียก /user-api/alfresco/* พร้อม Bearer token
        |
        v
Node.js เรียก Alfresco CMIS ด้วยสิทธิ์ของ user คนนั้น
```

## Setup

```bash
cd C:\xampp\htdocs\UserAlfresco-api
cd backend
npm install
npm run dev
```

สร้างหรือแก้ไฟล์ `.env` ที่ root โปรเจกต์:

```env
ALFRESCO_HOST=http://{ IP Server }
PORT=3001
USER_SESSION_TTL_MS=28800000
LOGIN_RATE_LIMIT_WINDOW_MS=60000
LOGIN_RATE_LIMIT_MAX=10
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=120
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

ถ้าต้องการอนุญาต CORS ทุก origin ให้ใช้:

```env
CORS_ALLOWED_ORIGINS=*
```

Rate limit แยกเป็น 2 ชุด:

- `LOGIN_RATE_LIMIT_*` ใช้เฉพาะ `POST /auth/login`
- `API_RATE_LIMIT_*` ใช้กับทุกเส้นใต้ `/user-api/alfresco/*`

## Project Structure

```text
UserAlfresco-api/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── middlewares/
│   │   ├── config/
│   │   ├── utils/
│   │   └── app.js
│   ├── public/
│   │   └── index.html
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── login/
│   │   ├── index.html
│   │   ├── login.css
│   │   └── login.js
│   ├── documents/
│   │   ├── index.html
│   │   ├── documents.css
│   │   └── documents.js
│   └── shared/
│       ├── css/
│       │   └── base.css
│       └── js/
│           ├── api.js
│           ├── auth.js
│           └── storage.js
│
├── docs/
│   └── API.md
├── .env
├── .gitignore
└── README.md
```

## API

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "alfresco_user",
  "password": "alfresco_password"
}
```

Response:

```json
{
  "tokenType": "Bearer",
  "accessToken": "...",
  "expiresInMs": 28800000,
  "username": "alfresco_user"
}
```

### Current user

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

### List folders

```http
GET /user-api/alfresco/folders?path=/Sites/tg-saving/documentLibrary
Authorization: Bearer <accessToken>
```

### List documents

```http
GET /user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&maxItems=20&skipCount=0
Authorization: Bearer <accessToken>
```

### Search documents

```http
GET /user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&q=026277&maxItems=20&skipCount=0
Authorization: Bearer <accessToken>
```

### Open file

```http
GET /user-api/alfresco/documents/:id/content?name=file.pdf
Authorization: Bearer <accessToken>
```

## Security Notes

- โปรเจคนี้ไม่เก็บ password ลงไฟล์หรือ database
- session อยู่ใน memory ของ Node.js เท่านั้น restart แล้ว session หาย
- ถ้าใช้งานจริงควรเปิดผ่าน HTTPS
- ถ้ามีหลาย server ควรเปลี่ยนจาก memory session เป็น Redis/session store
- permission ที่ได้จะขึ้นกับ Alfresco user ที่ login



