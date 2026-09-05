# Code Flow Steps

เอกสารนี้อธิบายว่า request แต่ละเส้นวิ่งผ่านไฟล์ไหนและ function ไหน ตามโครงสร้างใหม่แบบ backend modules

## Flow 1: Server Start

Step 1: รันคำสั่ง

```bash
npm run dev
```

Step 2: `server.js` ถูกเรียก

```js
const app = require("./src/app");
const config = require("./src/config/env");
```

Step 3: `src/config/env.js` โหลด `.env`

```js
loadLocalEnv();
```

Step 4: `server.js` start Express

```js
app.listen(config.port, ...);
```

Step 5: `src/app.js` mount middleware กลาง

```text
app.use(allowConfiguredCors)
app.use(express.json({ limit: "1mb" }))
app.use("/auth", authRoutes)
app.use("/user-api/alfresco", apiRateLimiter, requireUserSession, alfrescoRoutes)
```

## Flow 2: เปิดหน้าเอกสารและหน้าบ้าน

### หน้าเอกสาร

```text
GET /
  -> src/app.js
  -> res.sendFile(public/index.html)
```

### หน้าบ้าน

```text
GET /frontend/
  -> express.static(frontend/documents)
  -> frontend/documents/index.html
```

## Flow 3: Login

ผู้ใช้กรอก Alfresco username/password ที่หน้า `/login/`

### Frontend

Step 1: submit form

```js
frontend/login/index.html
  -> els.loginForm.addEventListener("submit", ...)
```

Step 2: เรียก function

```js
login(username, password)
```

Step 3: ยิง API

```js
fetch("/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password })
})
```

### Backend

Step 4: route รับ request

```text
src/modules/auth/auth.route.js
  -> router.post("/login", loginRateLimiter, authController.login)
```

Step 5: ผ่าน rate limit เฉพาะ login

```text
src/middlewares/rateLimit.js
  -> จำกัดตาม LOGIN_RATE_LIMIT_WINDOW_MS / LOGIN_RATE_LIMIT_MAX
```

ถ้าเกิน limit จะตอบ:

```json
{
  "message": "Too many login attempts. Please try again later.",
  "status": 429
}
```

Step 6: controller อ่าน username/password

```text
src/modules/auth/auth.controller.js
  -> login(req, res)
```

Step 7: controller เรียก service

```js
const result = await authService.login(username, password);
```

Step 8: service ตรวจ login กับ Alfresco

```text
src/modules/auth/auth.service.js
  -> authRepo.validateAlfrescoLogin(username, password)
```

Step 9: repo เรียก Alfresco CMIS

```text
src/modules/auth/auth.repo.js
  -> validateAlfrescoLogin()
  -> GET {ALFRESCO_CMIS}/root?cmisselector=object
```

Step 10: ถ้า login ผ่าน service สร้าง session

```text
src/modules/auth/auth.service.js
  -> authSession.createUserSession(username, password)
```

Step 11: session เก็บข้อมูลใน memory

```text
src/modules/auth/auth.session.js
  -> userSessions.set(token, { username, headers, expiresAt })
```

Step 12: controller set cookie และตอบ JSON

```js
setUserSessionCookie(res, result.accessToken, config.userSessionTtlMs);
res.json(result);
```

Step 13: frontend เก็บ token

```js
setLoggedIn(data.accessToken, data.username);
```

## Flow 4: CORS, API Rate Limit และ Auth Middleware

ทุก request จะผ่าน CORS middleware ก่อน และทุก route ใต้ `/user-api/alfresco/*` ต้องผ่าน API rate limit กับ auth middleware ก่อนเข้า route จริง

Step 1: CORS middleware ถูก mount เป็นตัวแรก

```text
src/app.js
  -> app.use(allowConfiguredCors)
```

```text
src/middlewares/cors.js
  -> ถ้า Origin อยู่ใน CORS_ALLOWED_ORIGINS จะ set Access-Control-Allow-*
  -> ถ้า CORS_ALLOWED_ORIGINS=* จะอนุญาตทุก origin โดย echo origin กลับ
  -> ถ้าเป็น OPTIONS จะตอบ 204
```

Step 2: mount API middleware

```text
src/app.js
  -> app.use("/user-api/alfresco", apiRateLimiter, requireUserSession, alfrescoRoutes)
```

Step 3: ผ่าน rate limit เฉพาะ API

```text
src/middlewares/rateLimit.js
  -> จำกัดตาม API_RATE_LIMIT_WINDOW_MS / API_RATE_LIMIT_MAX
```

ถ้าเกิน limit จะตอบ:

```json
{
  "message": "Too many API requests. Please try again later.",
  "status": 429
}
```

Step 4: middleware ตรวจ token

```text
src/middlewares/auth.js
  -> requireUserSession(req, res, next)
```

Step 5: อ่าน token ได้ 2 ทาง

```js
getBearerToken(req) || getCookie(req, "alfresco_user_session")
```

Step 6: หา session

```js
const session = authSession.touchUserSession(token);
```

Step 7: ถ้าเจอ session จะใส่ค่าใน req

```js
req.alfrescoUsername = session.username;
req.alfrescoAuthHeaders = session.headers;
```

Step 8: route ถัดไปใช้ `req.alfrescoAuthHeaders` ไปเรียก Alfresco ตามสิทธิ์ user

## Flow 5: List Folders

### Frontend

Step 1: หลัง login สำเร็จเรียก

```js
loadFolders();
```

Step 2: ยิง API

```js
fetchJson(`/user-api/alfresco/folders?path=/Sites/tg-saving/documentLibrary`)
```

Step 3: `fetchJson()` แนบ Bearer token

```js
headers: { ...authHeaders() }
```

### Backend

Step 4: ผ่าน `apiRateLimiter` แล้วผ่าน `requireUserSession`

Step 5: route รับ request

```text
src/modules/alfresco/alfresco.route.js
  -> router.get("/folders", alfrescoController.listFolders)
```

Step 6: controller เรียก service

```text
src/modules/alfresco/alfresco.controller.js
  -> listFolders(req, res)
  -> alfrescoService.listFolders(folderPath, req.alfrescoAuthHeaders)
```

Step 7: service เรียก repo

```text
src/modules/alfresco/alfresco.service.js
  -> listFolders()
  -> alfrescoRepo.getChildrenByPath()
```

Step 8: repo เรียก Alfresco

```text
src/modules/alfresco/alfresco.repo.js
  -> getChildrenByPath()
  -> GET cmisUrlForPath(folderPath)?cmisselector=children
```

Step 9: service filter เฉพาะ folder

```js
items.filter((item) => item.isFolder)
```

## Flow 6: List/Search Documents

### Frontend

Step 1: user เลือก folder หรือกดค้นหา

```js
syncSearchState();
loadFiles(true);
```

Step 2: สร้าง URL

```js
buildDocumentsUrl();
```

ตัวอย่าง:

```text
/user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&q=026277&maxItems=100&skipCount=0
```

Step 3: ยิง API

```js
const data = await fetchJson(buildDocumentsUrl());
```

### Backend

Step 4: ผ่าน `apiRateLimiter` แล้วผ่าน `requireUserSession`

Step 5: route รับ request

```text
src/modules/alfresco/alfresco.route.js
  -> router.get("/documents", alfrescoController.listDocuments)
```

Step 6: controller อ่าน query params

```js
const folderPath = req.query.folderPath || req.query.path || "/Sites/tg-saving/documentLibrary";
const q = req.query.q || req.query.keyword || req.query.name;
```

Step 7: controller เรียก service

```js
alfrescoService.listOrSearchDocuments(folderPath, q, req.alfrescoAuthHeaders, options)
```

Step 8: service เลือก function

```text
ถ้ามี q -> searchDocumentsInTree()
ถ้าไม่มี q -> queryDocumentsInTree()
```

Step 9A: กรณี list ทั้งหมด

```text
queryDocumentsInTree()
  -> alfrescoRepo.getObjectByPath() เพื่อหา folderId
  -> สร้าง CMIS query: SELECT * FROM cmis:document WHERE IN_TREE('folderId')
  -> alfrescoRepo.queryDocuments()
```

Step 9B: กรณี search

```text
searchDocumentsInTree()
  -> alfrescoRepo.getObjectByPath() เพื่อหา folderId
  -> สร้าง CMIS query: ... AND cmis:name LIKE '%keyword%'
  -> alfrescoRepo.queryDocuments()
```

Step 10: repo เรียก Alfresco

```text
src/modules/alfresco/alfresco.repo.js
  -> queryDocuments()
  -> GET {ALFRESCO_CMIS}?cmisselector=query&q=...
```

Step 11: service map result กลับ frontend

```js
files: (data.results || []).map((item) => mapCmisObject(item))
```

Step 12: frontend render ตาราง

```js
renderRows(data.files || []);
```

## Flow 7: Open File

### Frontend

Step 1: ปุ่มเปิดไฟล์มี `data-download-url`

```html
<button data-download-url="/user-api/alfresco/documents/:id/content?name=file.pdf">เปิด</button>
```

Step 2: click แล้วเรียก

```js
openDocument(button.dataset.downloadUrl);
```

Step 3: เปิด URL ตรง

```js
window.open(url, "_blank", "noopener");
```

หมายเหตุ: `window.open()` แนบ Authorization header ไม่ได้ จึงใช้ cookie `alfresco_user_session` ที่ backend set หลัง login

### Backend

Step 4: request ผ่าน `apiRateLimiter` แล้วผ่าน `requireUserSession`

Step 5: route รับ request

```text
src/modules/alfresco/alfresco.route.js
  -> router.get("/documents/:id/content", alfrescoController.streamDocumentContent)
```

Step 6: controller เรียก service

```js
alfrescoService.streamDocumentContent(res, req.params.id, req.query.name, req.alfrescoAuthHeaders)
```

Step 7: service เรียก repo

```text
src/modules/alfresco/alfresco.service.js
  -> streamDocumentContent()
  -> alfrescoRepo.getDocumentContentStream()
```

Step 8: repo เรียก Alfresco content

```text
GET {ALFRESCO_CMIS}/root?cmisselector=content&objectId=:id
responseType: stream
```

Step 9: service stream กลับ browser

```js
result.data.pipe(res);
```

## Flow 8: Logout

### Frontend

Step 1: กด Logout

```js
els.logoutBtn.addEventListener("click", async () => { ... })
```

Step 2: ยิง API

```js
fetch("/auth/logout", { method: "POST", headers: authHeaders() })
```

Step 3: ล้าง browser state

```js
clearSession();
```

### Backend

Step 4: route รับ request

```text
src/modules/auth/auth.route.js
  -> router.post("/logout", requireUserSession, authController.logout)
```

Step 5: controller เรียก service

```js
authService.logout(req.userSessionToken);
```

Step 6: service ลบ session

```text
src/modules/auth/auth.service.js
  -> authSession.deleteUserSession(token)
```

Step 7: controller ลบ cookie

```js
clearUserSessionCookie(res);
```

## Function Summary

| Function | File | หน้าที่ |
|---|---|---|
| `createApp` / `app` setup | `src/app.js` | mount static, auth routes, alfresco routes |
| `allowConfiguredCors()` | `middlewares/cors.js` | อนุญาต CORS ตาม `CORS_ALLOWED_ORIGINS` และตอบ preflight |
| `createRateLimiter()` | `middlewares/rateLimit.js` | สร้าง rate limiter สำหรับ login/API |
| `login()` | `auth.controller.js` | รับ login request และตอบ token/cookie |
| `authService.login()` | `auth.service.js` | ตรวจ login และสร้าง session |
| `validateAlfrescoLogin()` | `auth.repo.js` | เรียก Alfresco เพื่อเช็ก username/password |
| `createUserSession()` | `auth.session.js` | สร้าง session token ใน memory |
| `requireUserSession()` | `middlewares/auth.js` | ตรวจ Bearer token หรือ cookie |
| `listFolders()` | `alfresco.controller.js` | endpoint list folders |
| `alfrescoService.listFolders()` | `alfresco.service.js` | business logic list folder |
| `getChildrenByPath()` | `alfresco.repo.js` | เรียก Alfresco children API |
| `listDocuments()` | `alfresco.controller.js` | endpoint list/search documents |
| `listOrSearchDocuments()` | `alfresco.service.js` | เลือก list หรือ search |
| `queryDocumentsInTree()` | `alfresco.service.js` | list documents ด้วย CMIS IN_TREE |
| `searchDocumentsInTree()` | `alfresco.service.js` | search documents ด้วย CMIS LIKE |
| `findDocumentByExactNameInTree()` | `alfresco.service.js` | search documents ด้วย CMIS exact name |
| `getDocumentLocation()` | `alfresco.service.js` | หา path โฟลเดอร์ของไฟล์จาก node path หรือ CMIS parents |
| `getNodePathByObjectId()` | `alfresco.repo.js` | เรียก Alfresco REST v1 เพื่อหา parent path |
| `getObjectParents()` | `alfresco.repo.js` | เรียก CMIS parents เป็น fallback ของ location |
| `queryDocuments()` | `alfresco.repo.js` | เรียก Alfresco CMIS query |
| `streamDocumentContent()` | `alfresco.service.js` | stream file กลับ browser/client |
| `getDocumentContentStream()` | `alfresco.repo.js` | เรียก Alfresco content stream |

