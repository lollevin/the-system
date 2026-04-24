// PM2 process manager config for the JP&Co stack.
// Deploy:   pm2 start ecosystem.config.js
// Reload:   pm2 reload ecosystem.config.js
// Save:     pm2 save && pm2 startup
//
// Key stability features:
//   - Auto-restart on crash, exponential backoff
//   - Hard memory limit (prevents VPS OOM)
//   - Daily graceful restart at 4am (kills memory leaks in Next.js / Chromium)
//   - Separate log files with rotation (install pm2-logrotate)

module.exports = {
  apps: [
    {
      name: "the-system",
      cwd: "/var/www/the-system",
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_restarts: 20,
      min_uptime: "30s",
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      max_memory_restart: "1200M",
      // Daily restart at 4am Malaysia time to flush memory
      cron_restart: "0 4 * * *",
      kill_timeout: 8000,
      wait_ready: false,
      listen_timeout: 30000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NODE_OPTIONS: "--max-old-space-size=1024",
      },
      error_file: "/var/log/pm2/the-system-error.log",
      out_file: "/var/log/pm2/the-system-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "whatsapp-service",
      cwd: "/var/www/the-system/whatsapp-service",
      script: "src/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_restarts: 30,
      min_uptime: "60s",
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      // WhatsApp-web.js + Chromium leaks memory, so cap tighter and
      // auto-restart at 3am Malaysia time (internal watchdog also rotates at 20h).
      max_memory_restart: "1500M",
      cron_restart: "0 3 * * *",
      kill_timeout: 15000,
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        HEADLESS: "true",
      },
      error_file: "/var/log/pm2/whatsapp-error.log",
      out_file: "/var/log/pm2/whatsapp-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
