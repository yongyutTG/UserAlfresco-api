# Project Structure

โครงสร้างนี้แยกตามแนว backend ที่นิยมใช้: route -> controller -> service -> repo

```text
UserAlfresco-api/
├── log/
├── public/
│   ├── index.html              # หน้าเอกสาร API
│   └── frontend/index.html     # หน้าบ้าน login/list/search/open file
├── src/
│   ├── app.js                  # ประกอบ Express app และ mount routes
│   ├── config/
│   │   └── env.js              # โหลด .env และรวม config เช่น port, alfrescoHost
│   ├── middlewares/
│   │   ├── auth.js             # requireUserSession ตรวจ Bearer token/cookie
│   │   └── errorHandler.js     # handleError/notFound
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.repo.js
│   │   │   ├── auth.route.js
│   │   │   └── auth.session.js
│   │   └── alfresco/
│   │       ├── alfresco.controller.js
│   │       ├── alfresco.service.js
│   │       ├── alfresco.repo.js
│   │       └── alfresco.route.js
│   └── utils/
│       ├── authHeader.js       # สร้าง Basic Auth ไป Alfresco
│       ├── cmis.js             # helper สำหรับ CMIS path/query/object mapping
│       └── httpSession.js      # อ่าน Bearer/cookie และ set/clear cookie
├── server.js                   # start server เท่านั้น
├── nodemon.json
├── package.json
└── .env
```

## การไหลของโค้ด

### Login

```text
POST /auth/login
  -> src/modules/auth/auth.route.js
  -> auth.controller.login()
  -> auth.service.login()
  -> auth.repo.validateAlfrescoLogin()
  -> auth.session.createUserSession()
  -> setUserSessionCookie()
```

### ตรวจ session ก่อนเข้า API

```text
GET /user-api/alfresco/*
  -> src/app.js mount requireUserSession
  -> src/middlewares/auth.js
  -> getBearerToken() หรือ getCookie()
  -> auth.session.touchUserSession()
  -> set req.alfrescoAuthHeaders
```

### List folders

```text
GET /user-api/alfresco/folders
  -> src/modules/alfresco/alfresco.route.js
  -> alfresco.controller.listFolders()
  -> alfresco.service.listFolders()
  -> alfresco.repo.getChildrenByPath()
  -> Alfresco CMIS cmisselector=children
```

### List/Search documents

```text
GET /user-api/alfresco/documents
  -> alfresco.controller.listDocuments()
  -> alfresco.service.listOrSearchDocuments()
     -> ถ้าไม่มี q: queryDocumentsInTree()
     -> ถ้ามี q: searchDocumentsInTree()
  -> alfresco.repo.getObjectByPath()
  -> alfresco.repo.queryDocuments()
  -> Alfresco CMIS cmisselector=query
```

### Open file

```text
GET /user-api/alfresco/documents/:id/content
  -> requireUserSession
  -> alfresco.controller.streamDocumentContent()
  -> alfresco.service.streamDocumentContent()
  -> alfresco.repo.getDocumentContentStream()
  -> Alfresco CMIS cmisselector=content
  -> result.data.pipe(res)
```

## หน้าที่แต่ละ layer

| Layer | หน้าที่ |
|---|---|
| route | ประกาศ URL และผูก controller |
| controller | อ่าน req/res, validate เบื้องต้น, ส่ง response |
| service | business logic เช่นเลือก list/search, สร้าง session |
| repo | ติดต่อ external system เช่น Alfresco CMIS |
| middleware | งานคั่นกลาง เช่น auth, error |
| utils | function กลางที่ไม่ผูกกับ module ใด module หนึ่ง |

## Note: Alfresco API หลัก ๆ สำหรับ Alfresco 4.2

Alfresco ของระบบนี้เป็น Community 4.2 ดังนั้น API ที่เหมาะกับการดึงเอกสารคือ CMIS และ Web Script เป็นหลัก ส่วน REST API v1 รุ่นใหม่ เช่น `/nodes` ไม่เหมาะกับ version นี้

### 1. CMIS API

ใช้สำหรับงาน folder/file/document เช่น list folder, search file, เปิดไฟล์ หรือ download file

Base URL:

```text
http://172.17.1.21/alfresco/api/-default-/public/cmis/versions/1.1/browser
```

ตัวอย่าง endpoint:

```text
GET /root?cmisselector=children
```

ดู root folder ที่ user มีสิทธิ์เห็น

```text
GET /root/Sites/tg-saving/documentLibrary?cmisselector=children
```

ดู folder/file ภายใต้ path ที่กำหนด

```text
GET /root?cmisselector=query&q=SELECT * FROM cmis:document
```

ค้นหาเอกสารด้วย CMIS query

```text
GET /root?cmisselector=content&objectId=DOCUMENT_ID
```

เปิดหรือ download ไฟล์ตาม `objectId`

### 2. Web Script API

ใช้สำหรับดูข้อมูลระบบ user site และ service อื่น ๆ ของ Alfresco

Base URL:

```text
http://172.17.1.21/alfresco/service
```

ตัวอย่าง endpoint:

```text
GET /api/server
```

ดู version/server info ของ Alfresco

```text
GET /api/people
GET /api/people/{username}
```

ดูข้อมูล user

```text
GET /api/sites
GET /api/sites/{shortName}
```

ดูข้อมูล site

```text
GET /slingshot/search?term=ข้อความค้นหา
```

ค้นหาด้วย Web Script

### 3. Public REST API v1

เป็น API รุ่นใหม่ของ Alfresco เช่น `/nodes`, `/sites`, `/people`

Base URL:

```text
http://172.17.1.21/alfresco/api/-default-/public/alfresco/versions/1
```

หมายเหตุ: Alfresco 4.2 ของระบบนี้ยังไม่รองรับ REST v1 แบบใหม่เต็มรูปแบบ เช่น endpoint นี้เคยทดสอบแล้วใช้ไม่ได้

```text
GET /nodes/-my-/children
```

สรุปการใช้งานในโปรเจคนี้:

```text
ดึง folder/file/document    -> ใช้ CMIS API
ค้นหาเอกสารใน Alfresco     -> ใช้ CMIS Query
เปิดไฟล์ PDF               -> ใช้ CMIS Content
ดู user/site/server         -> ใช้ Web Script API
REST v1 /nodes/...          -> ไม่เหมาะกับ Alfresco 4.2
```

