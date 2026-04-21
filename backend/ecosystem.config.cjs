module.exports = {
  apps: [
    {
      name: 'ribeiro-backend',
      cwd: '/var/www/ribeirorestaurante/backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
