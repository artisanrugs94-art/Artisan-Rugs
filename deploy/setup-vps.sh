#!/usr/bin/env bash
# ==============================================================================
# One-Command Ubuntu / Debian VPS Setup Script for Kazumi Rugs (inkedrug.com)
# Usage on your VPS (inside the project folder):
#   sudo bash deploy/setup-vps.sh inkedrug.com admin@inkedrug.com
# ==============================================================================
set -euo pipefail

DOMAIN="${1:-inkedrug.com}"
EMAIL="${2:-artisanrugs94@gmail.com}"
APP_DIR="$(pwd)"

echo "============================================================"
echo " Deploying Kazumi Rugs ($DOMAIN) from $APP_DIR"
echo "============================================================"

# 1. Install system packages (Nginx, Certbot, curl, git, build-essential)
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# 2. Install Node.js 20 LTS if not installed
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# 3. Install PM2 globally
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

# 4. Prepare .env if missing
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  sed -i "s|APP_URL=.*|APP_URL=\"https://${DOMAIN}\"|g" "$APP_DIR/.env" || true
  echo "Created .env from .env.example — remember to add your live STRIPE_SECRET_KEY in $APP_DIR/.env"
fi

# 5. Install dependencies & compile production frontend + server bundle
npm install
npm run build:vps

# 6. Start / Reload app via PM2 and enable auto-start on VPS reboot
sed -i "s|inkedrug.com|${DOMAIN}|g" "$APP_DIR/deploy/ecosystem.config.cjs" || true
pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
pm2 save
pm2 startup systemd -u "${SUDO_USER:-root}" --hp "${HOME:-/root}" || true

# 7. Configure Nginx Reverse Proxy
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
cp "$APP_DIR/deploy/nginx-inkedrug.conf" "$NGINX_CONF"
sed -i "s|inkedrug.com|${DOMAIN}|g" "$NGINX_CONF"
ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

# 8. Open Firewall ports (SSH + HTTP + HTTPS)
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true

# 9. Request Free Let's Encrypt SSL Certificate (if DNS already points to this VPS)
echo "Attempting automatic HTTPS SSL setup via Certbot for ${DOMAIN}..."
certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect || {
  echo "--------------------------------------------------------------------"
  echo "NOTE: HTTP site is LIVE! SSL skipped only if DNS A-record for ${DOMAIN}"
  echo "has not finished propagating yet. Once DNS points to this VPS IP, run:"
  echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  echo "--------------------------------------------------------------------"
}

echo ""
echo "✅ Deployment Complete!"
echo "   Storefront: https://${DOMAIN}"
echo "   Admin Shop Manager: https://${DOMAIN}/admin"
echo "   Health Check: https://${DOMAIN}/api/health"
echo ""
echo "IMPORTANT FINAL STEP IN FIREBASE CONSOLE:"
echo "   Go to Firebase Console -> Authentication -> Settings -> Authorized domains"
echo "   and add: ${DOMAIN} (and www.${DOMAIN})"
