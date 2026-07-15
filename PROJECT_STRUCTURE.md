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

