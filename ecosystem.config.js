//แก้ครั้งที่ 1
module.exports = {

  apps: [

    // Backend API
    {
      name: 'UserAlfresco-api',
      script: 'server.js',
      cwd: './backend',
      env_file: './env',
      watch: true,
      env: {
        NODE_ENV: 'development'
      }
    },
  ]
};