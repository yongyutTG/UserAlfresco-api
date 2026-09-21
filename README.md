# UserAlfresco API

เอกสาร flow แบบ Step 1, 2, 3: [FLOW_STEPS.md](FLOW_STEPS.md)
โครงสร้างโปรเจคแบบ backend modules: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
เอกสาร API แบบละเอียด: [docs/API.md](docs/API.md)

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

รันแบบ dev:

```bash
cd C:\xampp\htdocs\UserAlfresco-api
cd backend
npm install
npm run dev
```

รันด้วย PM2:

```bash
pm2 start ecosystem.config.js
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
├── docs/
│   └── API.md
├── .env
├── .gitignore
└── README.md
```

## API

เปิดหน้าเอกสาร API ใน browser:

```http
GET /
```

ตรวจสอบการเชื่อมต่อ Alfresco:

```http
GET /health
```

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

### List folder tree

```http
GET /user-api/alfresco/folders/tree?path=/Sites/tg-saving/documentLibrary&maxDepth=10
Authorization: Bearer <accessToken>
```

ใช้ดึงโฟลเดอร์ย่อยทุกชั้นใต้ path หลักตามสิทธิ์ของ user ที่ login อยู่ โดย response จะมีทั้ง `folders` แบบรายการเรียงรวม และ `tree` แบบโครงสร้าง parent/children

### List documents

```http
GET /user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&maxItems=20&skipCount=0
Authorization: Bearer <accessToken>
```

รายการเอกสารจะมี field `allowRename` จาก CMIS `canUpdateProperties` เพื่อให้ frontend แสดง/ซ่อนไอคอนแก้ไขชื่อไฟล์ตามสิทธิ์ของ user

### Search documents

```http
GET /user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&q=026277&maxItems=20&skipCount=0
Authorization: Bearer <accessToken>
```

ผลค้นหาจะมี field `allowRename` เช่นเดียวกับ list documents

ค้นหาแบบชื่อไฟล์ตรงตัว:

```http
GET /user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary&exactName=23017_116969.pdf&maxItems=20&skipCount=0
Authorization: Bearer <accessToken>
```

### Get document location

```http
GET /user-api/alfresco/documents/location?id=DOCUMENT_ID
Authorization: Bearer <accessToken>
```

route เก่าที่ยังรองรับ:

```http
GET /user-api/alfresco/documents/:id/location
Authorization: Bearer <accessToken>
```

### Update document name

```http
PATCH /user-api/alfresco/documents?id=DOCUMENT_ID
PATCH /user-api/alfresco/documents/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "new-file-name.pdf"
}
```

แนะนำให้ใช้รูปแบบ query string `?id=DOCUMENT_ID` เพื่อรองรับ id เต็มของ Alfresco เช่น `uuid;1.0` และเลี่ยงปัญหา route path กับอักขระพิเศษ

### Open file

```http
GET /user-api/alfresco/documents/:id/content?name=file.pdf
Authorization: Bearer <accessToken>
```

ถ้าเรียกจาก frontend ต้องใช้ `fetch` พร้อม Bearer token แล้วเปิดไฟล์ด้วย Blob URL เพราะ `window.open(url)` แนบ `Authorization` header ไม่ได้

## Security Notes

- โปรเจคนี้ไม่เก็บ password ลงไฟล์หรือ database
- session อยู่ใน memory ของ Node.js เท่านั้น restart แล้ว session หาย
- API ใช้ Bearer token เป็นหลัก ไม่ใช้ cookie session
- Frontend ไม่ควรส่ง `Authorization: Basic base64(username:password)` ไปหา Alfresco โดยตรง เพราะ username/password จะไปอยู่ใน browser และอาจถูกเห็นผ่าน DevTools หรือถูกขโมยเมื่อมี XSS
- Flow ที่ถูกต้องคือ frontend login กับ `UserAlfresco-api` เพื่อรับ `accessToken` แล้วเรียก API ด้วย `Authorization: Bearer <accessToken>` ส่วน backend จะเป็นคนเก็บ Basic Auth ของ user ไว้ใน memory session และนำไปเรียก Alfresco เอง
- ถ้าใช้งานจริงควรเปิดผ่าน HTTPS
- ถ้ามีหลาย server ควรเปลี่ยนจาก memory session เป็น Redis/session store
- permission ที่ได้จะขึ้นกับ Alfresco user ที่ login



