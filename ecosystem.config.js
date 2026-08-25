module.exports = {
  apps: [
    {
      name: 'barcode-server',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
