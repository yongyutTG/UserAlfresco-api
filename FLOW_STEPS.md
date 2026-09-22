# Code Flow Steps

เอกสารนี้อธิบาย flow ของโปรเจค `UserAlfresco-api` หลังจากแยกหน้าบ้านออกไปอยู่โปรเจค `Alfresco` แล้ว

โปรเจคนี้ทำหน้าที่เป็น backend API เท่านั้น:

```text
Client / Frontend / Postman
  -> UserAlfresco-api
  -> Alfresco CMIS
```

ทุก endpoint ใต้ `/user-api/alfresco/*` ต้องแนบ:

```http
Authorization: Bearer <accessToken>
```

---

## Flow 1: Server Start

Step 1: รันคำสั่ง

```bash
cd backend
npm run dev
```

หรือใช้ PM2:

```bash
pm2 start ecosystem.config.js
```

หลังแก้โค้ด backend ให้ restart PM2 เพื่อโหลดไฟล์ล่าสุด:

```bash
pm2 restart ecosystem.config.js
```

Step 2: `backend/server.js` โหลด Express app

```js
const app = require("./src/app");
const config = require("./src/config/env");
```

Step 3: `backend/src/config/env.js` โหลด `.env`

```js
loadLocalEnv();
```

Step 4: mount middleware และ route ใน `backend/src/app.js`

```text
allowConfiguredCors
express.json
express.static(backend/public)
GET /health
/auth
/user-api/alfresco
```

---

## Flow 2: API Docs

```text
GET /
  -> backend/src/app.js
  -> backend/public/index.html
```

หน้านี้เป็นเอกสาร API แบบ static HTML ไม่ใช่ frontend สำหรับค้นเอกสาร

---

## Flow 3: Login

Step 1: client เรียก

```http
POST /auth/login
Content-Type: application/json

{
  "username": "alfresco_user",
  "password": "alfresco_password"
}
```

Step 2: route

```text
backend/src/modules/auth/auth.route.js
  -> router.post("/login", loginRateLimiter, authController.login)
```

Step 3: controller

```text
backend/src/modules/auth/auth.controller.js
  -> login(req, res)
```

Step 4: service ตรวจ username/password กับ Alfresco

```text
backend/src/modules/auth/auth.service.js
  -> authRepo.validateAlfrescoLogin(username, password)
```

Step 5: repo เรียก Alfresco CMIS ด้วย Basic Auth

```text
backend/src/modules/auth/auth.repo.js
  -> GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=object
```

Step 6: ถ้า Alfresco ตอบสำเร็จ สร้าง session token

```text
backend/src/modules/auth/auth.session.js
  -> createUserSession(username, password)
```

Step 7: response กลับ client

```json
{
  "tokenType": "Bearer",
  "accessToken": "ACCESS_TOKEN",
  "expiresInMs": 28800000,
  "username": "alfresco_user"
}
```

---

## Flow 4: Auth Middleware

ทุก endpoint ใต้ `/user-api/alfresco/*` จะผ่าน flow นี้ก่อน:

```text
backend/src/app.js
  -> apiRateLimiter
  -> requireUserSession
```

`requireUserSession` ทำงานใน:

```text
backend/src/middlewares/auth.js
```

ขั้นตอน:

```text
1. อ่าน Authorization: Bearer <accessToken>
2. เอา token ไปหา session ใน auth.session.js
3. ถ้าไม่เจอ ตอบ 401
4. ถ้าเจอ ตั้งค่า req.alfrescoUsername และ req.alfrescoAuthHeaders
```

---

## Flow 5: List Folders

```http
GET /user-api/alfresco/folders?path=/Sites/tg-saving/documentLibrary
Authorization: Bearer <accessToken>
```

ลำดับไฟล์:

```text
alfresco.route.js
  -> alfrescoController.listFolders()
  -> alfrescoService.listFolders()
  -> alfrescoRepo.getChildrenByPath()
  -> Alfresco CMIS cmisselector=children
```

---

## Flow 6: List Folder Tree

```http
GET /user-api/alfresco/folders/tree?path=/Sites/tg-saving/documentLibrary&maxDepth=2
Authorization: Bearer <accessToken>
```

ลำดับไฟล์:

```text
alfresco.route.js
  -> alfrescoController.listFolderTree()
  -> alfrescoService.listFolderTree()
  -> alfrescoRepo.getObjectByPath()
  -> alfrescoRepo.queryDocuments()
```

ข้างในใช้ CMIS query:

```sql
SELECT * FROM cmis:folder WHERE IN_TREE('folderObjectId')
```

ถ้า Alfresco ตอบ error กับ query นี้ในบาง user/version service จะ fallback ไปเรียก `cmisselector=children` ทีละชั้นตาม `maxDepth` แทน เพื่อให้ยังได้ folder ที่ user มีสิทธิ์เห็น

จากนั้น service คำนวณ `depth` และประกอบ response เป็น:

```text
folders = flat list
tree    = parent/children
```

---

## Flow 7: List Documents

```http
GET /user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&maxItems=20&skipCount=0
Authorization: Bearer <accessToken>
```

ลำดับไฟล์:

```text
alfresco.route.js
  -> alfrescoController.listDocuments()
  -> alfrescoService.listOrSearchDocuments()
  -> alfrescoService.queryDocumentsInTree()
  -> alfrescoRepo.getObjectByPath()
  -> alfrescoRepo.queryDocuments()
```

ข้างในใช้ CMIS query:

```sql
SELECT * FROM cmis:document WHERE IN_TREE('folderObjectId')
```

---

## Flow 8: Search Documents

```http
GET /user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary&q=026277
Authorization: Bearer <accessToken>
```

ถ้าส่ง `q` จะค้นแบบบางส่วน:

```sql
cmis:name LIKE '%026277%'
```

ถ้าส่ง `exactName` จะค้นแบบตรงตัว:

```sql
cmis:name = '23017_116969.pdf'
```

ลำดับไฟล์:

```text
alfresco.route.js
  -> alfrescoController.searchDocuments()
  -> alfrescoService.searchDocuments()
  -> searchDocumentsInTree() หรือ findDocumentByExactNameInTree()
  -> alfrescoRepo.queryDocuments()
```

---

## Flow 9: View File Detail / Get Document Location

```http
GET /user-api/alfresco/documents/location?id=DOCUMENT_ID
Authorization: Bearer <accessToken>
```

ลำดับไฟล์:

```text
alfresco.route.js
  -> alfrescoController.getDocumentLocation()
  -> auditLogger.audit(req, "VIEW_FILE_DETAIL")
  -> alfrescoService.getDocumentLocation()
  -> alfrescoRepo.getNodePathByObjectId()
  -> fallback alfrescoRepo.getObjectParents()
```

---

## Flow 10: Rename File

```http
PATCH /user-api/alfresco/documents?id=DOCUMENT_ID
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "new-file-name.pdf"
}
```

ลำดับไฟล์:

```text
alfresco.route.js
  -> alfrescoController.updateDocument()
  -> alfrescoService.updateDocument()
  -> alfrescoRepo.updateDocumentProperties()
  -> Alfresco CMIS cmisaction=update
```

แนะนำให้ใช้ query string `?id=DOCUMENT_ID` เพราะ Alfresco id อาจมี `;1.0`

---

## Flow 11: Open File

```http
GET /user-api/alfresco/documents/:id/content?name=file.pdf
Authorization: Bearer <accessToken>
```

ดาวน์โหลดไฟล์ใช้ endpoint เดียวกัน แต่เพิ่ม `action=download`:

```http
GET /user-api/alfresco/documents/:id/content?name=file.pdf&action=download
Authorization: Bearer <accessToken>
```

ลำดับไฟล์:

```text
alfresco.route.js
  -> alfrescoController.streamDocumentContent()
  -> auditLogger.audit(req, "OPEN_FILE" หรือ "DOWNLOAD_FILE")
  -> alfrescoService.streamDocumentContent()
  -> alfrescoRepo.getDocumentContentStream()
  -> result.data.pipe(res)
```

ถ้าเรียกจาก browser frontend ต้องใช้ `fetch` พร้อม Bearer token แล้วเปิดด้วย Blob URL เพราะ `window.open(url)` แนบ `Authorization` header ไม่ได้

---

## Flow 12: Logout

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

ลำดับไฟล์:

```text
auth.route.js
  -> requireUserSession
  -> authController.logout()
  -> auditLogger.audit(req, "LOGOUT")
  -> authService.logout()
  -> auth.session.deleteUserSession()
```

หมายเหตุ: backend จะบันทึก `LOGOUT` ลง audit log เฉพาะเมื่อ client เรียก `/auth/logout` จริง ๆ ถ้า frontend ลบ token ใน browser อย่างเดียว backend จะไม่รู้ว่า user logout

---

## Flow 13: Audit Log

ไฟล์หลัก:

```text
backend/src/utils/auditLogger.js
```

ตำแหน่ง log:

```text
backend/logs/audit.log
```

รูปแบบเป็น JSON Lines:

```json
{"time":"2026-09-22T13:07:35.994Z","username":"yongyut","action":"OPEN_FILE","documentId":"abc-123","fileName":"file.pdf","folderPath":null,"searchText":null,"requestPath":"/user-api/alfresco/documents/abc-123/content?name=file.pdf","method":"GET","ip":"127.0.0.1","userAgent":"Mozilla/5.0","status":"SUCCESS","message":"Open file requested"}
```

action ที่บันทึก เช่น:

```text
LOGIN
LOGOUT
LIST_FOLDERS
LIST_FOLDER_TREE
LIST_DOCUMENTS
SEARCH_DOCUMENTS
VIEW_FILE_DETAIL
OPEN_FILE
DOWNLOAD_FILE
RENAME_FILE
```
