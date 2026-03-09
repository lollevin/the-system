#!/bin/bash
# ==============================================
# JP&Co VPS Security Hardening Script
# Run as root: bash secure-vps.sh
# ==============================================

echo "🔒 Starting VPS Security Hardening..."

# 1. Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# 2. Install security tools
echo "🛡️ Installing security tools..."
apt install -y ufw fail2ban unattended-upgrades

# 3. Configure UFW Firewall
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT: don't lock yourself out!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP & HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# WhatsApp service - only allow localhost (already internal)
# Port 3001 is NOT exposed to internet

# Enable firewall
echo "y" | ufw enable
ufw status verbose

# 4. Configure Fail2Ban
echo "🚫 Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'JAIL'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 3600

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
JAIL

# Create nginx-limit-req filter if not exists
cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'FILTER'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
FILTER

systemctl enable fail2ban
systemctl restart fail2ban
echo "Fail2Ban status:"
fail2ban-client status

# 5. SSH Hardening
echo "🔐 Hardening SSH..."
# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Apply hardening (be careful - don't change port if using Hostinger web terminal)
sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' /etc/ssh/sshd_config
sed -i 's/#LoginGraceTime 2m/LoginGraceTime 30/' /etc/ssh/sshd_config
sed -i 's/X11Forwarding yes/X11Forwarding no/' /etc/ssh/sshd_config
sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/' /etc/ssh/sshd_config
sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 2/' /etc/ssh/sshd_config

# Disable root password login? Only if you have SSH keys set up!
# sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

systemctl restart sshd

# 6. Install & configure Nginx (if not already)
echo "🌐 Configuring Nginx security..."
apt install -y nginx

# Copy secure config
if [ -f /var/www/the-system/deploy/nginx-secure.conf ]; then
    cp /var/www/the-system/deploy/nginx-secure.conf /etc/nginx/sites-available/the-system
    ln -sf /etc/nginx/sites-available/the-system /etc/nginx/sites-enabled/the-system
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo "✅ Nginx configured with security rules"
else
    echo "⚠️ Nginx config not found, skipping..."
fi

# 7. Enable automatic security updates
echo "🔄 Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'AUTOUPDATE'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
AUTOUPDATE

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOCONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOCONF

# 8. Kernel hardening (sysctl)
echo "⚙️ Applying kernel security settings..."
cat >> /etc/sysctl.conf << 'SYSCTL'

# === JP&Co Security Hardening ===
# Prevent SYN flood attacks
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Disable ICMP redirect acceptance
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP broadcasts
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Prevent SMURF attacks
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Connection tracking limits
net.netfilter.nf_conntrack_max = 65535
SYSCTL

sysctl -p

# 9. Secure shared memory
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" >> /etc/fstab

echo ""
echo "=========================================="
echo "✅ VPS Security Hardening Complete!"
echo "=========================================="
echo ""
echo "Active protections:"
echo "  ✅ UFW Firewall (ports 22, 80, 443 only)"
echo "  ✅ Fail2Ban (SSH brute force + Nginx abuse)"
echo "  ✅ SSH hardened (max 3 attempts)"
echo "  ✅ Nginx security (rate limit, bot block)"
echo "  ✅ Kernel hardened (SYN flood, spoofing)"
echo "  ✅ Auto security updates enabled"
echo ""
echo "Monitor commands:"
echo "  ufw status          - Firewall status"
echo "  fail2ban-client status - Ban status"
echo "  fail2ban-client status sshd - SSH bans"
echo "  journalctl -u fail2ban - Fail2Ban logs"
echo "  tail -f /var/log/nginx/access.log - Web traffic"
echo ""
