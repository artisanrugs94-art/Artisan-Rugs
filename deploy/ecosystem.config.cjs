module.exports = {
  apps: [
    {
      name: 'inkedrug-store',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PRIMARY_DOMAIN: 'inkedrug.com',
        APP_URL: 'https://inkedrug.com',
      },
    },
  ],
};
