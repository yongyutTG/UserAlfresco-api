# CI/CD UserAlfresco-api

ใช้รูปแบบเดียวกับ Alfresco: GitHub Actions ตรวจ PR และ push เข้า `main`
จากนั้น deploy เฉพาะ push เข้า `main` ที่ผ่าน CI โดยใช้ self-hosted Linux runner
label `UserAlfresco-api` งาน deploy ของ API ใช้ concurrency group แยกจาก frontend

## CI

- Ubuntu 22.04 และ Node.js 22
- `npm ci` จาก `backend/package-lock.json`
- ตรวจ JavaScript และ Bash syntax
- `npm test` ใน backend รัน regression tests ที่มีอยู่ด้วย Node test runner
- ไม่ต้องใช้ production secrets หรือเชื่อมต่อ Alfresco จริงในการทดสอบ

## เตรียม server ครั้งแรก

1. ให้ repository นี้เข้าถึง runner ที่มี labels `self-hosted`, `Linux`, `UserAlfresco-api`
   หาก runner เดิมลงทะเบียนเฉพาะ repository Alfresco จะไม่สามารถรับงานของ API ได้
   ต้องลงทะเบียน runner ของ repository นี้ด้วย service/directory แยกกัน หรือใช้ organization runner
   ที่อนุญาตทั้งสอง repositories
2. ติดตั้ง Git, curl และ PM2 ให้ user ที่รัน runner เรียกได้จาก service PATH
   งาน deploy ใช้ `actions/setup-node` เตรียม Node.js 22 และ npm เช่นเดียวกับ CI
   runner ต้องดาวน์โหลด Node.js ได้และเขียน tool cache ได้
   หากเรียก `build/deploy.sh` เองนอก Actions ต้องเตรียม Node.js 22 ใน PATH ก่อน
   runner ต้องใช้ user เดียวกับ PM2 ที่ดูแล API และเขียน deployment directory ได้
   หากใช้ nvm ต้องตั้ง PATH ใน runner service ให้ถูกต้องด้วย
3. Clone `https://github.com/yongyutTG/UserAlfresco-api.git` ที่
   `/var/www/html/UserAlfresco-api` และให้ server อ่าน origin ได้เอง (เช่น read-only deploy key)
   credentials ของ checkout action ไม่ได้ให้สิทธิ์กับ production checkout นี้
4. สร้าง `.env` ที่ root บน server ตาม README โดยกำหนด `ALFRESCO_HOST`, `PORT`
   และ `CORS_ALLOWED_ORIGINS` ให้ถูกต้อง ไฟล์นี้ไม่ถูกเก็บใน Git
5. ตั้ง repository Actions variables หากไม่ได้ใช้ค่าเริ่มต้น:
   - `USERALFRESCO_DEPLOY_DIR`: absolute path ของ production checkout
   - `USERALFRESCO_PM2_HOME`: PM2 home ของ user ที่รัน API (ค่าเริ่มต้น `$HOME/.pm2`)
6. ตั้ง PM2 startup สำหรับ user นี้ตามคำสั่งที่ `pm2 startup` แสดงบน server
   workflow จะใช้ `pm2 save` หลังตรวจ HTTP ผ่าน เพื่อเก็บ process list สำหรับการ reboot
7. ตั้ง branch protection ให้ `Test Node.js API` ต้องผ่านก่อน merge เข้า `main`

ไม่ต้อง restart Nginx/PHP-FPM เพราะ API ทำงานด้วย PM2; reverse proxy เดิมต้องชี้ไป PORT ของ API
ห้ามใช้ runner ที่ให้สิทธิ์ production กับ PR ที่ไม่เชื่อถือ: workflow นี้รัน PR บน GitHub-hosted runner เท่านั้น

## ย้าย audit log เดิมออกจาก Git ก่อน deploy ครั้งแรก

เวอร์ชันเดิม track `backend/logs/audit.log` ใน Git แต่เวอร์ชันนี้เลิก track แล้ว
ไฟล์ในเครื่องพัฒนายังคงอยู่ และ log ใหม่จะถูก ignore
production checkout เดิมต้องเก็บ log ก่อนอัปเดต เพราะ Git อาจลบไฟล์ tracked ที่ถูกเอาออก
ให้ทำระหว่าง maintenance โดยใช้ PM2 user เดียวกับ runner และ PM2_HOME เดียวกัน:

1. หยุดเฉพาะ API ด้วย `pm2 stop UserAlfresco-api`
2. สำรอง `backend/logs/` ไปยังตำแหน่งนอก checkout และตรวจว่าอ่านสำเนาได้
3. ตรวจ `git status` และเก็บการแก้ไข server อื่น ๆ ก่อน แล้วจึง restore เฉพาะ
   `backend/logs/audit.log` ให้ตรงกับ Git หลังสำรองสำเร็จ
4. อัปเดต checkout ไปยัง commit ที่มี CI/CD นี้ (ต้องผ่าน CI)
5. คัดลอก logs ที่สำรองไว้กลับ `backend/logs/` และตรวจสิทธิ์เขียนของ PM2 user
6. เรียก `bash build/deploy.sh` จาก root checkout ด้วย environment ของ runner
   หรือติดตั้ง workflow หลัง migration พร้อมแล้ว เพื่อให้ push ถัดไป deploy อัตโนมัติ

## การ deploy

`build/deploy.sh` ตรวจ repository, tracked changes, Node.js, PM2, `.env` และ logs directory
จากนั้น fetch `main` และ deploy commit `GITHUB_SHA` ที่ผ่าน CI เท่านั้น
งานเก่าที่ถูกแทนด้วย commit ใหม่บน main จะถูกข้าม
การเรียก script เองโดยไม่มี `GITHUB_SHA` จะใช้ fetched `origin/main`

ติดตั้ง production dependencies ด้วย `npm ci --omit=dev` แล้ว restart เฉพาะ
`UserAlfresco-api` โดยตั้ง `NODE_ENV=production` ผ่าน ecosystem config
และกำหนด interpreter เป็น Node.js ที่ใช้ในงาน deploy โดยตรง
ตรวจ HTTP ที่ `http://127.0.0.1:PORT/` ภายในช่วง retry ก่อนรายงานว่าสำเร็จ
การตรวจนี้ยืนยันเฉพาะ HTTP startup ไม่ยืนยันการ login หรือการเชื่อมต่อ Alfresco

ทุก restart จะทำให้ session ใน memory หมดอายุ ผู้ใช้ต้อง login ใหม่
การ deploy อัปเดต checkout เดิมและไม่มี automatic rollback; หากล้มเหลวตรวจ Actions output
และ `pm2 logs UserAlfresco-api` แล้วแก้สาเหตุหรือ deploy commit ที่ตรวจสอบแล้วอีกครั้ง

ไฟล์ workflow ที่เตรียมไว้ในเครื่องจะเริ่มทำงานหลัง commit/push ไป GitHub และ runner พร้อมเท่านั้น
