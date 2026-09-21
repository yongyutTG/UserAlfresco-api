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
| Query String | ส่ง path, keyword, pagination | `?folderPath=...&exactName=23017_116969&maxItems=17` |
| Path Parameter | ส่ง id เอกสารใน URL | `/documents/{id}/content` และ route เก่าของ location |

---

# 0. Environment / CORS / Rate Limit

ตั้งค่าหลักในไฟล์ `.env` ที่ root โปรเจกต์:

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

## CORS

ถ้า frontend เรียก API จาก browser คนละ origin ให้เพิ่ม origin ใน `CORS_ALLOWED_ORIGINS` โดยคั่นด้วย comma:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

ถ้าต้องการอนุญาตทุก origin:

```env
CORS_ALLOWED_ORIGINS=*
```

หมายเหตุ: โปรเจกต์นี้ใช้ Bearer token ผ่าน Header `Authorization` เป็นหลัก ไม่ใช้ cookie session สำหรับการเรียก API

## Rate Limit

Rate limit แยกเป็น 2 ชุด:

| Config | ใช้กับ | Default |
|---|---|---|
| `LOGIN_RATE_LIMIT_WINDOW_MS` | ช่วงเวลาของ login limiter | `60000` |
| `LOGIN_RATE_LIMIT_MAX` | จำนวนครั้งสูงสุดของ `POST /auth/login` ต่อ IP ในช่วงเวลา | `10` |
| `API_RATE_LIMIT_WINDOW_MS` | ช่วงเวลาของ API limiter | `60000` |
| `API_RATE_LIMIT_MAX` | จำนวนครั้งสูงสุดของ `/user-api/alfresco/*` ต่อ IP ในช่วงเวลา | `120` |

ถ้าเกิน limit จะได้ HTTP `429` พร้อม header `Retry-After`

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

| ชื่อ        | อยู่ที่      | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `username`| JSON body | ใช่    | `Administrator` | username ของ Alfresco |
| `password`| JSON body | ใช่    | `password` | password ของ Alfresco |

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

# 6.1 ดูรายการ Folder ย่อยทุกชั้น

## Endpoint

```http
GET /user-api/alfresco/folders/tree
```

## ใช้ทำอะไร

ดู folder ย่อยทุกชั้นภายใต้ path ที่ระบุ โดยใช้สิทธิ์ของ user จาก token ที่แนบมา

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Parameters

| ชื่อ | อยู่ที่ | จำเป็น | Default | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|---|
| `path` | Query string | ไม่จำเป็น | `/` | `/Sites/tg-saving/documentLibrary` | path ของ folder หลัก |
| `maxDepth` | Query string | ไม่จำเป็น | `10` | `5` | จำนวนชั้นสูงสุดที่จะไล่ลงไป สูงสุด `30` |

## ตัวอย่าง Request

```http
GET http://localhost:3001/user-api/alfresco/folders/tree?path=/Sites/tg-saving/documentLibrary&maxDepth=10
Authorization: Bearer ACCESS_TOKEN
```

## ข้างใน backend ไปเรียก CMIS อะไร

backend จะเริ่มจากการดึง object ของ folder หลักก่อน:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root/Sites/tg-saving/documentLibrary?cmisselector=object
Authorization: Basic base64(username:password)
```

จากนั้นใช้ `folderId` ไป query folder ย่อยทั้งหมดใต้ tree ครั้งเดียว:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser?cmisselector=query&q=SELECT * FROM cmis:folder WHERE IN_TREE('folderObjectId')
Authorization: Basic base64(username:password)
```

backend จะนำผลลัพธ์มาคำนวณ `depth` จาก path แล้วกรองไม่ให้เกิน `maxDepth` จากนั้นประกอบเป็น `tree`

## ตัวอย่าง Response

```json
{
  "path": "/Sites/tg-saving/documentLibrary",
  "maxDepth": 10,
  "count": 2,
  "username": "Administrator",
  "folders": [
    {
      "id": "folder-id",
      "name": "การเงิน",
      "path": "/Sites/tg-saving/documentLibrary/การเงิน",
      "type": "cmis:folder",
      "depth": 1
    },
    {
      "id": "child-folder-id",
      "name": "2567",
      "path": "/Sites/tg-saving/documentLibrary/การเงิน/2567",
      "type": "cmis:folder",
      "depth": 2
    }
  ],
  "tree": [
    {
      "id": "folder-id",
      "name": "การเงิน",
      "path": "/Sites/tg-saving/documentLibrary/การเงิน",
      "type": "cmis:folder",
      "depth": 1,
      "children": [
        {
          "id": "child-folder-id",
          "name": "2567",
          "path": "/Sites/tg-saving/documentLibrary/การเงิน/2567",
          "type": "cmis:folder",
          "depth": 2,
          "children": []
        }
      ]
    }
  ]
}
```

---

# 7. List เอกสาร

## Endpoint

```http
GET /user-api/alfresco/documents
```

## ใช้ทำอะไร

ดึงรายการเอกสารใต้ folder ที่ระบุ โดยค้นรวมใน folder ย่อยด้วย `IN_TREE`

หมายเหตุ: endpoint นี้ใช้สำหรับ list รายการเอกสาร ถ้าต้องการค้นหาชื่อไฟล์ให้ใช้ endpoint แยก `GET /user-api/alfresco/documents/search`

รายการเอกสารจะมี field `allowRename` ซึ่ง map จาก CMIS allowable action `canUpdateProperties`:

- `allowRename: true` = user มีสิทธิ์แก้ไขชื่อไฟล์
- `allowRename: false` = user ไม่มีสิทธิ์แก้ไขชื่อไฟล์ และ frontend ควรซ่อนไอคอนแก้ไขชื่อ

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
| `maxItems` | Query string | ไม่จำเป็น | `100` | `17` | จำนวนรายการต่อหน้า |
| `skipCount` | Query string | ไม่จำเป็น | `0` | `0`, `100`, `200` | จำนวนรายการที่ข้าม ใช้ทำ pagination |

## ตัวอย่าง List เอกสารทั้งหมดใน documentLibrary

```http
GET http://localhost:3001/user-api/alfresco/documents?folderPath=/Sites/tg-saving/documentLibrary&maxItems=17&skipCount=0
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

### จังหวะที่ 2: list เอกสารทั้งหมดใน folder tree

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
  &includeAllowableActions=true
  &maxItems=17
  &skipCount=0
Authorization: Basic base64(username:password)
```

---

# 8. Search เอกสาร

## Endpoint

```http
GET /user-api/alfresco/documents/search
```

## ใช้ทำอะไร

ค้นหาเอกสารใต้ folder ที่ระบุ โดยค้นรวมใน folder ย่อยด้วย `IN_TREE`

ผลลัพธ์แต่ละไฟล์จะมี field `allowRename` เช่นเดียวกับ list documents เพื่อให้ frontend แสดง/ซ่อนไอคอนแก้ไขชื่อไฟล์ตามสิทธิ์

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
| `q` | Query string | ไม่จำเป็น ถ้ามี `exactName` | ว่าง | `NPR` | keyword สำหรับค้นจากชื่อไฟล์แบบบางส่วน |
| `keyword` | Query string | ไม่จำเป็น | ว่าง | `NPR` | alias ของ `q` |
| `name` | Query string | ไม่จำเป็น | ว่าง | `026277` | alias ของ `q` |
| `exactName` | Query string | ไม่จำเป็น ถ้ามี `q` | ว่าง | `23017_116969` | ค้นชื่อไฟล์แบบแม่น รองรับชื่อไม่ใส่ `.pdf` |
| `fileName` | Query string | ไม่จำเป็น | ว่าง | `23017_116969` | alias ของ `exactName` |
| `maxItems` | Query string | ไม่จำเป็น | `100` | `17` | จำนวนรายการต่อหน้า ใช้ config เดิม |
| `skipCount` | Query string | ไม่จำเป็น | `0` | `0`, `100`, `200` | จำนวนรายการที่ข้าม ใช้ทำ pagination |

หมายเหตุ: endpoint นี้ต้องส่งอย่างน้อย `q` หรือ `exactName` ถ้าไม่ส่งจะได้ HTTP `400`

## ตัวอย่างค้นหา NPR

```http
GET http://localhost:3001/user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary&q=NPR&maxItems=17&skipCount=0
Authorization: Bearer ACCESS_TOKEN
```

## ตัวอย่างค้นหาเฉพาะโฟลเดอร์การเงิน

```http
GET http://localhost:3001/user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary/การเงิน&q=026277&maxItems=17&skipCount=0
Authorization: Bearer ACCESS_TOKEN
```

## ตัวอย่างค้นชื่อไฟล์ตรงตัว

ใช้กรณีต้องการค้นแบบแม่น เช่น dev ส่งเลขที่สัญญาหรือชื่อไฟล์ตรง ๆ จะใส่ `.pdf` หรือไม่ใส่ก็ได้

```http
GET http://localhost:3001/user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary&exactName=23017_116969&maxItems=17&skipCount=0
Authorization: Bearer ACCESS_TOKEN
```

ถ้าส่ง `exactName=23017_116969` backend จะค้นแบบ exact ด้วยชื่อเหล่านี้เท่านั้น:

```text
23017_116969
23017_116969.pdf
```

หมายเหตุ: ถ้าส่ง `exactName` พร้อมกับ `q` ระบบจะให้ `exactName` ทำงานก่อน เพราะเป็นการค้นแบบเจาะจงกว่า

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

### จังหวะที่ 2A: ถ้าส่ง q / keyword / name จะค้นจากชื่อไฟล์

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
  &maxItems=17
  &skipCount=0
Authorization: Basic base64(username:password)
```

### จังหวะที่ 2B: ถ้าส่ง exactName / fileName จะค้นชื่อไฟล์ตรงตัว

backend จะใช้ CMIS Query:

```sql
SELECT * FROM cmis:document
WHERE IN_TREE('folderObjectId')
AND (cmis:name = '23017_116969' OR cmis:name = '23017_116969.pdf')
```

ตัวอย่างเมื่อค้น `23017_116969`:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser
  ?cmisselector=query
  &q=SELECT * FROM cmis:document WHERE IN_TREE('folderObjectId') AND (cmis:name = '23017_116969' OR cmis:name = '23017_116969.pdf')
  &searchAllVersions=false
  &maxItems=17
  &skipCount=0
Authorization: Basic base64(username:password)
```

กรณีนี้เหมาะกับการค้นที่ต้องการความแม่น เพราะ `_` และ `%` จะถูกมองเป็นตัวอักษรจริง ไม่ใช่ wildcard แบบ `LIKE`

## ตัวอย่าง Response

```json
{
  "path": "/Sites/tg-saving/documentLibrary",
  "folderId": "folder-id",
  "q": "NPR",
  "count": 17,
  "total": 195,
  "hasMoreItems": true,
  "maxItems": 17,
  "skipCount": 0,
  "nextSkipCount": 17,
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
      "creationDate": "2019-02-05T10:25:00.000+07:00",
      "lastModifiedBy": "Administrator",
      "lastModificationDate": "2019-02-05T10:25:00.000+07:00"
    }
  ]
}
```

---

# 9. ดูตำแหน่งไฟล์

## Endpoint

```http
GET /user-api/alfresco/documents/location
```

## ใช้ทำอะไร

ดึงตำแหน่ง folder ของเอกสารแบบเฉพาะไฟล์ ใช้เมื่อผู้ใช้หรือระบบต้องการดู location ของไฟล์นั้นเท่านั้น เพื่อไม่ให้ API รายการเอกสารหลักโหลดช้า

เส้นหลักปัจจุบันส่ง `id` ผ่าน query string เพื่อเลี่ยงปัญหา `Route not found` เมื่อ `id` ของ Alfresco มีอักขระพิเศษหรือมีรูปแบบที่ไม่เหมาะกับ path parameter

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Parameters

| ชื่อ | อยู่ที่ | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `id` | Query string | ใช่ | `7b815e16-a594-4864-9665-cfda64e8d880;1.0` | id ของเอกสาร |

## ตัวอย่าง Request

```http
GET http://localhost:3001/user-api/alfresco/documents/location?id=7b815e16-a594-4864-9665-cfda64e8d880%3B1.0
Authorization: Bearer ACCESS_TOKEN
```

## Route เก่าสำหรับรองรับโค้ดเดิม

ยังรองรับ route เดิมนี้อยู่ แต่ไม่แนะนำให้ใช้กับงานใหม่:

```http
GET /user-api/alfresco/documents/{id}/location
```

## ตัวอย่าง Response

```json
{
  "id": "7b815e16-a594-4864-9665-cfda64e8d880;1.0",
  "parentPath": "/Sites/tg-saving/documentLibrary/การเงิน",
  "source": "nodes-api"
}
```

ถ้าหาตำแหน่งไม่ได้ API จะตอบสำเร็จแต่ `parentPath` เป็น `null`:

```json
{
  "id": "7b815e16-a594-4864-9665-cfda64e8d880;1.0",
  "parentPath": null,
  "source": null
}
```

## ข้างใน backend ไปเรียก Alfresco อะไร

ระบบจะลอง REST nodes API ก่อน:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/alfresco/versions/1/nodes/{nodeId}?include=path
```

ถ้าไม่ได้ตำแหน่ง จะ fallback ไป CMIS parents:

```http
GET {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=parents&objectId={id}
```

---

# 10. แก้ไขชื่อไฟล์เอกสาร

## Endpoint

```http
PATCH /user-api/alfresco/documents?id=DOCUMENT_ID
PATCH /user-api/alfresco/documents/{id}
```

## ใช้ทำอะไร

แก้ไขชื่อไฟล์เอกสารใน Alfresco ตามสิทธิ์ของ user ที่ login อยู่

แนะนำให้ใช้ endpoint แบบ query string `PATCH /user-api/alfresco/documents?id=DOCUMENT_ID` เพื่อรองรับ id เต็มของ Alfresco เช่น `uuid;1.0` และเลี่ยงปัญหา route path กับอักขระพิเศษ

สำหรับ UI ให้ดู field `allowRename` จาก list/search documents:

- ถ้า `allowRename: true` ให้แสดงปุ่มแก้ไขชื่อไฟล์
- ถ้า `allowRename: false` ให้ซ่อนปุ่มแก้ไขชื่อไฟล์

ถึง frontend จะซ่อนปุ่มแล้ว backend และ Alfresco ยังเป็นจุดตรวจสิทธิ์จริงตอน PATCH เสมอ

## ต้องแนบ token ไหม

ต้องแนบ

```http
Authorization: Bearer ACCESS_TOKEN
```

## Query Parameters

| ชื่อ | อยู่ที่ | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `id` | Query string | ใช่ | `7b815e16-a594-4864-9665-cfda64e8d880;1.0` | id ของเอกสาร |

## Path Parameters รุ่นรองรับย้อนหลัง

| ชื่อ | อยู่ที่ | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `id` | Path parameter | ไม่แนะนำ | `7b815e16-a594-4864-9665-cfda64e8d880%3B1.0` | id ของเอกสาร ใช้รองรับ client เก่า |

## Body Parameters

ส่งแบบ `Body -> raw -> JSON`

| ชื่อ | อยู่ที่ | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|---|
| `name` | JSON body | ใช่ | `new-file-name.pdf` | ชื่อไฟล์ใหม่ |
| `fileName` | JSON body | ไม่จำเป็น | `new-file-name.pdf` | alias ของ `name` |

หมายเหตุ: ชื่อไฟล์ใหม่ต้องไม่ว่าง และต้องไม่มี `/` หรือ `\`

## ตัวอย่าง Request

```http
PATCH http://localhost:3001/user-api/alfresco/documents?id=7b815e16-a594-4864-9665-cfda64e8d880%3B1.0
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "name": "new-file-name.pdf"
}
```

## ตัวอย่าง Response

```json
{
  "id": "7b815e16-a594-4864-9665-cfda64e8d880;1.0",
  "updated": true,
  "document": {
    "id": "7b815e16-a594-4864-9665-cfda64e8d880;1.0",
    "name": "new-file-name.pdf",
    "type": "cmis:document"
  },
  "username": "Administrator"
}
```

## ข้างใน backend ไปเรียก CMIS อะไร

backend จะใช้ CMIS Browser Binding action `update`:

```http
POST {ALFRESCO_HOST}/alfresco/api/-default-/public/cmis/versions/1.1/browser/root
Authorization: Basic base64(username:password)
Content-Type: application/x-www-form-urlencoded

cmisaction=update
objectId={id}
propertyId[0]=cmis:name
propertyValue[0]=new-file-name.pdf
```

ถ้า user ไม่มีสิทธิ์แก้ไขใน Alfresco จะได้ error จาก Alfresco กลับมา เช่น `403`

---

# 11. เปิด / ดาวน์โหลดไฟล์เอกสาร

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

# 12. ตัวอย่าง Flow ใน Postman

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
GET http://localhost:3001/user-api/alfresco/documents/search?folderPath=/Sites/tg-saving/documentLibrary&exactName=23017_116969&maxItems=17&skipCount=0
Authorization: Bearer {{alfresco_access_token}}
```

## Step 5: ดูตำแหน่งไฟล์

นำ `id` จาก response ไปใช้:

```http
GET http://localhost:3001/user-api/alfresco/documents/location?id={id}
Authorization: Bearer {{alfresco_access_token}}
```

## Step 6: เปิดไฟล์

นำ `id` จาก response ไปใช้:

```http
GET http://localhost:3001/user-api/alfresco/documents/{id}/content?name=file.pdf
Authorization: Bearer {{alfresco_access_token}}
```

## Step 7: แก้ไขชื่อไฟล์

นำ `id` จาก response ไปใช้:

```http
PATCH http://localhost:3001/user-api/alfresco/documents?id={id}
Authorization: Bearer {{alfresco_access_token}}
Content-Type: application/json
```

```json
{
  "name": "new-file-name.pdf"
}
```

---

# 13. สรุป Endpoint ทั้งหมด

| Method | Endpoint | ต้องแนบ token | ส่งค่าแบบไหน | ใช้ทำอะไร |
|---|---|---|---|---|
| `GET` | `/` | ไม่ต้อง | ไม่มี | หน้าเอกสาร API |
| `GET` | `/health` | ไม่ต้อง | ไม่มี | ตรวจ server |
| `POST` | `/auth/login` | ไม่ต้อง | JSON body | login ขอ accessToken |
| `GET` | `/auth/me` | ต้อง | Header Bearer | ดู session ปัจจุบัน |
| `POST` | `/auth/logout` | ต้อง | Header Bearer | logout token |
| `GET` | `/user-api/alfresco/folders` | ต้อง | Query string | ดู folder |
| `GET` | `/user-api/alfresco/documents` | ต้อง | Query string | list เอกสาร |
| `GET` | `/user-api/alfresco/documents/search` | ต้อง | Query string | ค้นหาเอกสาร |
| `GET` | `/user-api/alfresco/documents/location?id=...` | ต้อง | Query string | ดูตำแหน่งไฟล์ |
| `PATCH` | `/user-api/alfresco/documents?id=...` | ต้อง | Query string + JSON body | แก้ไขชื่อไฟล์ |
| `GET` | `/user-api/alfresco/documents/{id}/content` | ต้อง | Path param + query string | เปิด/ดาวน์โหลดไฟล์ |

---

# 13.1 สรุป Backend ไปเรียก Alfresco เส้นไหน

| Endpoint ของโปรเจกต์ | ข้างในไปเรียก Alfresco | ประเภท |
|---|---|---|
| `GET /health` | `GET /alfresco/service/api/server` | Web Script |
| `POST /auth/login` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=object` | CMIS |
| `GET /user-api/alfresco/folders?path=...` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root/{path}?cmisselector=children` | CMIS |
| `GET /user-api/alfresco/folders/tree?path=...` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root/{path}?cmisselector=object` แล้ว `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser?cmisselector=query&q=SELECT * FROM cmis:folder WHERE IN_TREE(...)` | CMIS |
| `GET /user-api/alfresco/documents?folderPath=...` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root/{folderPath}?cmisselector=object` แล้ว `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser?cmisselector=query&q=...&includeAllowableActions=true` | CMIS |
| `GET /user-api/alfresco/documents/search?folderPath=...&q=...` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root/{folderPath}?cmisselector=object` แล้ว `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser?cmisselector=query&q=...LIKE...&includeAllowableActions=true` | CMIS |
| `GET /user-api/alfresco/documents/location?id=...` | ลอง `GET /alfresco/api/-default-/public/alfresco/versions/1/nodes/{nodeId}?include=path` ก่อน ถ้าไม่ได้ใช้ `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=parents&objectId={id}` | REST v1 fallback CMIS |
| `PATCH /user-api/alfresco/documents?id=...` | `POST /alfresco/api/-default-/public/cmis/versions/1.1/browser/root` พร้อม `cmisaction=update` และ `propertyId[0]=cmis:name` | CMIS |
| `GET /user-api/alfresco/documents/{id}/content` | `GET /alfresco/api/-default-/public/cmis/versions/1.1/browser/root?cmisselector=content&objectId={id}` | CMIS |

หมายเหตุ: `{path}` และ `{folderPath}` จะถูก encode ทีละ segment ในโค้ด `backend/src/utils/cmis.js`

---

# 14. Error ที่พบบ่อย

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

## เรียกถี่เกิน Rate Limit

ถ้าเรียก `/auth/login` ถี่เกินค่า `LOGIN_RATE_LIMIT_*` จะเจอ:

```json
{
  "message": "Too many login attempts. Please try again later.",
  "status": 429
}
```

ถ้าเรียก `/user-api/alfresco/*` ถี่เกินค่า `API_RATE_LIMIT_*` จะเจอ:

```json
{
  "message": "Too many API requests. Please try again later.",
  "status": 429
}
```

วิธีแก้:

```text
รอตามจำนวนวินาทีใน header Retry-After หรือลดความถี่การเรียก API
```

---

# 15. หมายเหตุเรื่องความปลอดภัย

ไม่ควรส่ง `username/password` ไปกับ API เอกสารทุกครั้ง

และ frontend ไม่ควรส่ง `Authorization: Basic base64(username:password)` ไปหา Alfresco โดยตรง เพราะจะทำให้ username/password ของ Alfresco ไปอยู่ใน browser เช่นเห็นได้จาก DevTools, network request หรือเสี่ยงถูกขโมยเมื่อหน้าเว็บมีช่องโหว่ XSS

แนวที่แนะนำ:

```text
1. Login ครั้งเดียวที่ /auth/login
2. ได้ accessToken
3. ใช้ Bearer token เรียก /user-api/alfresco/*
4. UserAlfresco-api เป็นคนถือ Basic Auth ของ user ใน memory session
5. UserAlfresco-api เรียก Alfresco CMIS แทน frontend
```

เพราะปลอดภัยและจัดการง่ายกว่าการส่ง password ทุก request หรือให้ browser ยิง Alfresco ตรงด้วย Basic Auth
