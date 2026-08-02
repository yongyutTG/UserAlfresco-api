# UserAlfresco API Endpoint Guide

คู่มือนี้อธิบาย API ของโปรเจกต์ `UserAlfresco-api` ว่าแต่ละเส้นใช้ method อะไร ต้องส่ง parameter ชื่ออะไร ส่งไว้ตรงไหน และต้องแนบ token หรือไม่

Base URL:

```http
http://localhost:3001
```

## สรุปการส่งค่าในโปรเจกต์นี้

| ประเภท | ใช้ตรงไหน | ตัวอย่าง |
|---|---|---|
| Header | ส่ง token | `Authorization: Bearer ACCESS_TOKEN` |
| JSON Body | ส่ง username/password ตอน login | `{ "username": "...", "password": "..." }` |
| Query String | ส่ง path, keyword, pagination | `?folderPath=...&q=NPR&maxItems=100` |
| Path Parameter | ส่ง id เอกสารใน URL | `/documents/{id}/content` |

---

# 1. ตรวจสอบหน้าเอกสาร API

## Endpoint

```http
GET /
```

## ใช้ทำอะไร

เปิดหน้าเอกสาร API ของโปรเจกต์

## ต้องแนบ token ไหม

ไม่ต้อง

## Parameters

ไม่มี

## ตัวอย่าง

```http
GET http://localhost:3001/
```

---

# 2. ตรวจสอบสถานะระบบ / Alfresco Server

## Endpoint

```http
GET /health
```

## ใช้ทำอะไร

ตรวจว่า `UserAlfresco-api` ติดต่อ Alfresco ได้หรือไม่

## ต้องแนบ token ไหม

ไม่ต้อง

## Parameters

ไม่มี

## ตัวอย่าง

```http
GET http://localhost:3001/health
```

## ข้างใน backend ไปเรียกอะไร

เส้นนี้ไม่ได้เรียก CMIS แต่ใช้ Alfresco Web Script เพื่อตรวจ server:

```http
GET {ALFRESCO_HOST}/alfresco/service/api/server
```

## ตัวอย่าง Response

```json
{
  "status": "ok",
  "alfresco": {
    "edition": "Community",
    "version": "4.2.0"
  }
}
```

หมายเหตุ: response จริงอาจมี field มากกว่านี้ ขึ้นกับ Alfresco ที่ตอบกลับมา

---

# 3. Login เพื่อขอ accessToken

## Endpoint

```http
POST /auth/login
```

## ใช้ทำอะไร

ส่ง username/password ไปให้ backend ตรวจสอบกับ Alfresco แล้วสร้าง `accessToken` สำหรับเรียก API กลุ่ม `/user-api/alfresco/*`

## ต้องแนบ token ไหม

ไม่ต้อง เพราะเส้นนี้ใช้สำหรับขอ token

## ส่งค่าแบบไหน

`Body -> raw -> JSON`

Header:

```http
Content-Type: application/json
```

## Body Parameters

| ชื่อ | อยู่ที่ | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `username` | JSON body | ใช่ | `Administrator` | username ของ Alfresco |
| `password` | JSON body | ใช่ | `password` | password ของ Alfresco |

## ตัวอย่าง Request

```http
POST http://localhost:3001/auth/login
Content-Type: application/json
```

```json
{
  "username": "Administrator",
  "password": "password"
}
```

## ตัวอย่าง Response

```json
{
  "tokenType": "Bearer",
  "accessToken": "ACCESS_TOKEN",
  "expiresInMs": 28800000,
  "username": "Administrator",
  "user": {
    "username": "Administrator"
  }
}
```

## เอา token ไปใช้อย่างไร

นำค่า `accessToken` ไปแนบใน Header ของ API กลุ่ม `/user-api/alfresco/*`

```http
Authorization: Bearer ACCESS_TOKEN
```

## ข้างใน backend ไปเรียกอะไร

ตอน login backend จะตรวจ username/password กับ Alfresco ด้วย CMIS:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=object
Authorization: Basic base64(username:password)
```

ถ้า Alfresco ตอบสำเร็จ backend จะสร้าง `accessToken` ของโปรเจกต์เราเอง แล้วเก็บ Basic Auth header ของ user ไว้ใน session ฝั่ง backend

---

# 4. ดูข้อมูล session ของ user ปัจจุบัน

## Endpoint

```http
GET /auth/me
```

## ใช้ทำอะไร

ตรวจว่า token ที่แนบมาเป็นของ user ไหน และ session ยังใช้ได้หรือไม่

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Parameters

ไม่มี

## ตัวอย่าง Request

```http
GET http://localhost:3001/auth/me
Authorization: Bearer ACCESS_TOKEN
```

## ตัวอย่าง Response

```json
{
  "username": "Administrator",
  "createdAt": 1720000000000,
  "lastUsedAt": 1720000000000,
  "expiresAt": 1720028800000
}
```

---

# 5. Logout

## Endpoint

```http
POST /auth/logout
```

## ใช้ทำอะไร

ลบ session/token ฝั่ง backend

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Parameters

ไม่มี

## ตัวอย่าง Request

```http
POST http://localhost:3001/auth/logout
Authorization: Bearer ACCESS_TOKEN
```

## ตัวอย่าง Response

```json
{
  "ok": true
}
```

---

# 6. ดูรายการ Folder

## Endpoint

```http
GET /user-api/alfresco/folders
```

## ใช้ทำอะไร

ดู folder ภายใต้ path ที่ระบุ โดยใช้สิทธิ์ของ user จาก token ที่แนบมา

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Parameters

| ชื่อ | อยู่ที่ | จำเป็น | Default | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|---|
| `path` | Query string | ไม่จำเป็น | `/` | `/Sites/tg-saving/documentLibrary` | path ของ folder ที่ต้องการดู folder ลูก |

## ตัวอย่าง Request

```http
GET http://localhost:3001/user-api/alfresco/folders?path=/Sites/tg-saving/documentLibrary
Authorization: Bearer ACCESS_TOKEN
```

## ข้างใน backend ไปเรียก CMIS อะไร

backend จะเอา `path` ไปแปลงเป็น CMIS Browser URL แล้วเรียก:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root/Sites/tg-saving/documentLibrary?cmisselector=children
Authorization: Basic base64(username:password)
```

ถ้าส่ง:

```text
path=/
```

จะเรียก:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=children
```

จากนั้น backend จะกรองเฉพาะ object ที่เป็น:

```text
cmis:baseTypeId = cmis:folder
```

## ตัวอย่าง Response

```json
{
  "path": "/Sites/tg-saving/documentLibrary",
  "count": 2,
  "folders": [
    {
      "id": "folder-id",
      "name": "การเงิน",
      "path": "/Sites/tg-saving/documentLibrary/การเงิน",
      "type": "cmis:folder"
    }
  ]
}
```

---

# 7. List เอกสาร / ค้นหาเอกสาร

## Endpoint

```http
GET /user-api/alfresco/documents
```

## ใช้ทำอะไร

ดึงรายการเอกสาร หรือค้นหาเอกสารใต้ folder ที่ระบุ โดยค้นรวมใน folder ย่อยด้วย `IN_TREE`

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Parameters

| ชื่อ | อยู่ที่ | จำเป็น | Default | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|---|
| `folderPath` | Query string | ไม่จำเป็น | `/Sites/tg-saving/documentLibrary` | `/Sites/tg-saving/documentLibrary` | path ของ folder ที่ต้องการค้น |
| `path` | Query string | ไม่จำเป็น | ใช้แทน `folderPath` ได้ | `/Sites/tg-saving/documentLibrary/การเงิน` | alias ของ `folderPath` |
| `q` | Query string | ไม่จำเป็น | ว่าง | `NPR` | keyword สำหรับค้นจากชื่อไฟล์ |
| `keyword` | Query string | ไม่จำเป็น | ว่าง | `NPR` | alias ของ `q` |
| `name` | Query string | ไม่จำเป็น | ว่าง | `026277` | alias ของ `q` |
| `maxItems` | Query string | ไม่จำเป็น | `1000` ตอน list, `100` ตอน search | `100` | จำนวนรายการต่อหน้า |
| `skipCount` | Query string | ไม่จำเป็น | `0` | `0`, `100`, `200` | จำนวนรายการที่ข้าม ใช้ทำ pagination |

## ตัวอย่าง List เอกสารทั้งหมดใน documentLibrary

```http
GET http://localhost:3001/user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary&maxItems=100&skipCount=0
Authorization: Bearer ACCESS_TOKEN
```

## ตัวอย่างค้นหา NPR

```http
GET http://localhost:3001/user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary&q=NPR&maxItems=100&skipCount=0
Authorization: Bearer ACCESS_TOKEN
```

## ตัวอย่างค้นหาเฉพาะโฟลเดอร์การเงิน

```http
GET http://localhost:3001/user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&q=026277&maxItems=100&skipCount=0
Authorization: Bearer ACCESS_TOKEN
```

## ข้างใน backend ไปเรียก CMIS อะไร

เส้นนี้ทำงาน 2 จังหวะ

### จังหวะที่ 1: หา folder object จาก path

backend จะเรียก CMIS เพื่อหา `cmis:objectId` ของ folder ก่อน:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root/Sites/tg-saving/documentLibrary/การเงิน?cmisselector=object
Authorization: Basic base64(username:password)
```

ค่าที่ได้สำคัญคือ:

```text
cmis:objectId
```

### จังหวะที่ 2A: ถ้าไม่ได้ส่ง q จะ list เอกสารทั้งหมดใน folder tree

backend จะใช้ CMIS Query:

```sql
SELECT * FROM cmis:document
WHERE IN_TREE('folderObjectId')
```

แล้วเรียก:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser
  ?cmisselector=query
  &q=SELECT * FROM cmis:document WHERE IN_TREE('folderObjectId')
  &maxItems=100
  &skipCount=0
Authorization: Basic base64(username:password)
```

### จังหวะที่ 2B: ถ้าส่ง q / keyword / name จะค้นจากชื่อไฟล์

backend จะใช้ CMIS Query:

```sql
SELECT * FROM cmis:document
WHERE IN_TREE('folderObjectId')
AND cmis:name LIKE '%keyword%'
```

ตัวอย่างเมื่อค้น `026277`:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser
  ?cmisselector=query
  &q=SELECT * FROM cmis:document WHERE IN_TREE('folderObjectId') AND cmis:name LIKE '%026277%'
  &searchAllVersions=false
  &maxItems=100
  &skipCount=0
Authorization: Basic base64(username:password)
```

## ตัวอย่าง Response

```json
{
  "path": "/Sites/tg-saving/documentLibrary",
  "folderId": "folder-id",
  "q": "NPR",
  "count": 100,
  "total": 195,
  "hasMoreItems": true,
  "maxItems": 100,
  "skipCount": 0,
  "nextSkipCount": 100,
  "files": [
    {
      "id": "7b815e16-a594-4864-9665-cfda64e8d880;1.0",
      "name": "023260_017682_NPR_2018_00099.pdf",
      "path": "/Sites/tg-saving/documentLibrary/เงินกู้/023260_017682_NPR_2018_00099.pdf",
      "type": "cmis:document",
      "objectTypeId": "cmis:document",
      "isFolder": false,
      "isDocument": true,
      "mimeType": "application/pdf",
      "size": 123456,
      "createdBy": "Administrator",
      "lastModifiedBy": "Administrator"
    }
  ]
}
```

---

# 8. เปิด / ดาวน์โหลดไฟล์เอกสาร

## Endpoint

```http
GET /user-api/alfresco/documents/{id}/content
```

## ใช้ทำอะไร

เปิดหรือดาวน์โหลด content ของเอกสาร เช่น PDF

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Path Parameters

| ชื่อ | อยู่ที่ | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `id` | Path parameter | ใช่ | `7b815e16-a594-4864-9665-cfda64e8d880%3B1.0` | id ของเอกสาร |

## Query Parameters

| ชื่อ | อยู่ที่ | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `name` | Query string | ไม่จำเป็น | `file.pdf` | ชื่อไฟล์ที่ใช้ตอนเปิด/ดาวน์โหลด |

## สำคัญเรื่อง id

ถ้า `id` มีเครื่องหมาย `;` เช่น:

```text
7b815e16-a594-4864-9665-cfda64e8d880;1.0
```

ควร encode เป็น:

```text
7b815e16-a594-4864-9665-cfda64e8d880%3B1.0
```

## ตัวอย่าง Request

```http
GET http://localhost:3001/user-api/alfresco/documents/7b815e16-a594-4864-9665-cfda64e8d880%3B1.0/content?name=file.pdf
Authorization: Bearer ACCESS_TOKEN
```

## Response

ถ้าสำเร็จ จะได้ binary content ของไฟล์ เช่น:

```http
Content-Type: application/pdf
```

## ข้างใน backend ไปเรียก CMIS อะไร

backend จะเอา `id` จาก path parameter ไปส่งเป็น `objectId` ให้ CMIS:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root
  ?cmisselector=content
  &objectId={id}
Authorization: Basic base64(username:password)
```

จากนั้น backend จะ stream binary content กลับไปที่ browser/client โดยตั้ง header ประมาณนี้:

```http
Content-Type: application/pdf
Content-Disposition: inline; filename="file.pdf"
```

---

# 9. ตัวอย่าง Flow ใน Postman

## Step 1: Login

```http
POST http://localhost:3001/auth/login
Content-Type: application/json
```

Body:

```json
{
  "username": "Administrator",
  "password": "password"
}
```

## Step 2: เก็บ token อัตโนมัติใน Postman

ใน tab `Tests` ของ request `/auth/login` ใส่:

```javascript
const json = pm.response.json();

if (json.accessToken) {
  pm.environment.set("alfresco_access_token", json.accessToken);
}
```

## Step 3: เรียก API อื่นโดยใช้ token

ใน request อื่น ตั้ง Authorization:

```text
Type: Bearer Token
Token: {{alfresco_access_token}}
```

หรือใส่ Header เอง:

```http
Authorization: Bearer {{alfresco_access_token}}
```

## Step 4: ค้นหาเอกสาร

```http
GET http://localhost:3001/user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary&q=NPR&maxItems=100&skipCount=0
Authorization: Bearer {{alfresco_access_token}}
```

## Step 5: เปิดไฟล์

นำ `id` จาก response ไปใช้:

```http
GET http://localhost:3001/user-api/alfresco/documents/{id}/content?name=file.pdf
Authorization: Bearer {{alfresco_access_token}}
```

---

# 10. สรุป Endpoint ทั้งหมด

| Method | Endpoint | ต้องแนบ token | ส่งค่าแบบไหน | ใช้ทำอะไร |
|---|---|---|---|---|
| `GET` | `/` | ไม่ต้อง | ไม่มี | หน้าเอกสาร API |
| `GET` | `/health` | ไม่ต้อง | ไม่มี | ตรวจ server |
| `POST` | `/auth/login` | ไม่ต้อง | JSON body | login ขอ accessToken |
| `GET` | `/auth/me` | ต้อง | Header Bearer | ดู session ปัจจุบัน |
| `POST` | `/auth/logout` | ต้อง | Header Bearer | logout token |
| `GET` | `/user-api/alfresco/folders` | ต้อง | Query string | ดู folder |
| `GET` | `/user-api/alfresco/documents` | ต้อง | Query string | list/search เอกสาร |
| `GET` | `/user-api/alfresco/documents/{id}/content` | ต้อง | Path param + query string | เปิด/ดาวน์โหลดไฟล์ |

---

# 10.1 สรุป Backend ไปเรียก Alfresco เส้นไหน

| Endpoint ของโปรเจกต์ | ข้างในไปเรียก Alfresco | ประเภท |
|---|---|---|
| `GET /health` | `GET /alfresco/service/api/server` | Web Script |
| `POST /auth/login` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=object` | CMIS |
| `GET /user-api/alfresco/folders?path=...` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root/{path}?cmisselector=children` | CMIS |
| `GET /user-api/alfresco/documents?folderPath=...` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root/{folderPath}?cmisselector=object` แล้ว `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser?cmisselector=query&q=...` | CMIS |
| `GET /user-api/alfresco/documents/{id}/content` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=content&objectId={id}` | CMIS |

หมายเหตุ: `{path}` และ `{folderPath}` จะถูก encode ทีละ segment ในโค้ด `src/utils/cmis.js`

---

# 11. Error ที่พบบ่อย

## ไม่ได้แนบ token

```json
{
  "message": "Unauthorized: missing Bearer token"
}
```

วิธีแก้:

```http
Authorization: Bearer ACCESS_TOKEN
```

## token หมดอายุหรือไม่ถูกต้อง

```json
{
  "message": "Unauthorized: invalid or expired session"
}
```

วิธีแก้:

```text
เรียก POST /auth/login ใหม่ แล้วเอา accessToken ใหม่ไปใช้
```

## ส่ง login ผิด format

ถ้า `/auth/login` ไม่ได้ส่ง `raw JSON` จะเจอ:

```json
{
  "message": "Missing username or password"
}
```

วิธีแก้:

```text
Postman -> Body -> raw -> JSON
Content-Type: application/json
```

---

# 12. หมายเหตุเรื่องความปลอดภัย

ไม่ควรส่ง `username/password` ไปกับ API เอกสารทุกครั้ง

แนวที่แนะนำ:

```text
1. Login ครั้งเดียวที่ /auth/login
2. ได้ accessToken
3. ใช้ Bearer token เรียก /user-api/alfresco/*
```

เพราะปลอดภัยและจัดการง่ายกว่าการส่ง password ทุก request
