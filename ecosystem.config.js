//แก้ครั้งที่ 1
module.exports = {

  apps: [

    // Backend API
    {
      name: 'UserAlfresco-api',
      script: 'server.js',
      cwd: './backend',
      env_file: './env',
      // ปิด watch ใน production เพราะ session เก็บใน memory
      // ถ้า PM2 restart จากการเขียน audit.log/session log จะทำให้ token ที่เพิ่ง login ใช้งานไม่ได้ทันที
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'log', '*.log', 'server.out.log', 'server.err.log'],
      env: {
        NODE_ENV: 'development'
      }
    },
  ]
};
