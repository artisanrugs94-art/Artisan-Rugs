# Kazumi Rugs (`inkedrug.com`) — Official Single-Brand Handmade Tufted Rug Storefront + Shop Manager

Production-grade official single-brand e-commerce website and Shop Manager (`/admin`) built for **Kazumi Rugs (`inkedrug.com`)** using **React 19 + Vite + TypeScript + Tailwind CSS + Zustand + Firebase (Firestore, Auth, Storage, Cloud Functions v2, Hosting) + Express**.

- **Official Single-Brand Studio (`inkedrug.com`)**: Dedicated brand storefront (not a multi-seller marketplace), selling globally in 30+ currencies.
- **USA Default & USD (`$`) Base Currency + US Stripe Primary**: All listings, sizes, variations, shipping profiles, coupons, and feeds (`Google Shopping`, `Meta`, `Pinterest`) use **USD (`$`)** as the canonical base currency, with **US Stripe** prioritized first on Checkout alongside PayPal, Razorpay, India COD, and WhatsApp Custom Quotes.
- **Automatic 30% Lower Domestic Pricing in India (`countryCode === 'IN'`)**: Because rugs are handcrafted directly in our India tufting studio with zero international air-freight overhead, visitors browsing or shipping within **India** automatically see prices **30% lower than the global USD price**, converted live to `₹ INR` (configurable in `/admin/settings`).
- **Made-to-Order 10–15 Days**: Driven dynamically via Admin **Processing Profiles** across product notices, delivery estimators, cart, checkout, tracking, and admin `Day X of 15` / `Overdue` badges.

---

## 1. Worker Email + Password Login & Full Site Access (`/admin`)

The store owner can create **Email ID + Password** logins for listing workers or studio managers without sharing the owner's Google account:

1. Sign into `/admin` with the owner Google account (`artisanrugs94@gmail.com`) or open **`/admin/settings`** → **Team & Worker Access (Email + Password Login)**.
2. Enter the worker's **Name**, **Email ID** (e.g. `listings@inkedrug.com`), and **Password**, and toggle **"Full Main Site & Listings Access"** (or assign `Manager` / `Staff`).
3. Click **Create Worker Login** and use the **1-click Copy Credentials** button to share the login details with your worker.
4. Workers open `/admin`, click **Worker / Admin Login**, enter their **Email ID + Password**, and gain immediate access.
5. **Firebase Console Note (Cloud Sync for Email/Password)**:
   - Open [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Sign-in method** → Click **Email/Password** → Toggle **Enable** → **Save**.
   - Once enabled, creating a worker in `/admin/settings` provisions both their Firebase Auth Email/Password user (via a secondary non-disruptive Auth instance) and their `/admins/{uid}` document in Firestore.

---

## 2. Growth Connectors, Automations & Reels

- **Instagram Reels Connector (`@inkedrug`)**:
  - Manage vertical `9:16` studio tufting & bevel-carving video Reels in **`/admin/marketing?tab=reels`**, tag shoppable rug products, and reorder or toggle Reels shown on the Homepage.
- **Automated Email & Discount Sender**:
  - Configure automated triggers in **`/admin/marketing?tab=automations`** (`Welcome 10%`, `Abandoned Cart 15%`, `Post-Purchase VIP 20%`, `Winback 15%`), send instant discount blasts (`POST /api/automations/send-discount` via Resend or Brevo), or send 1-click recovery discount emails from the **Abandoned Carts** tab.
- **Meta Pixel + Conversions API & Google Search Console**:
  - Enter your **Meta Pixel ID**, **Google Search Console Verification Meta Code**, and **GA4 Measurement ID** in **`/admin/settings`**.
  - `useDocumentMeta` dynamically injects `<meta name="google-site-verification" />`, `https://inkedrug.com` canonical URLs, and consent-aware Meta Pixel (`PageView`, `ViewContent`, `Purchase`) + GA4 scripts, with a server-side **Meta CAPI Test Event** button (`POST /api/integrations/meta-capi-test`).

---

## 3. Connecting Your Own VPS + Custom Domain (`inkedrug.com`)

This project includes a complete turn-key VPS deployment kit inside `/deploy/` (`setup-vps.sh`, `nginx-inkedrug.conf`, `ecosystem.config.cjs`, `Dockerfile`, and `docker-compose.yml`), plus an interactive wizard inside **`/admin/settings`**.

### Step 1: Point Your Domain (`inkedrug.com`) DNS to Your VPS IP
Log in to your domain registrar (GoDaddy, Namecheap, Hostinger, Porkbun, or Cloudflare) → **DNS Management** and add two `A` records pointing to your VPS public IPv4 address:
- **Type `A`** | **Host**: `@` | **Value**: `YOUR_VPS_IPV4` | **TTL**: `Auto / 600`
- **Type `A`** | **Host**: `www` | **Value**: `YOUR_VPS_IPV4` | **TTL**: `Auto / 600`

*(If using Cloudflare DNS, keep SSL/TLS mode set to **Full (strict)** once Certbot runs; the server automatically reads `CF-IPCountry` for instant India 30% domestic pricing and USA `$` detection.)*

### Step 2: Export Code & Deploy on Your Ubuntu / Debian VPS (1 Command)
1. Download/Export this project from AI Studio (or push to a private GitHub repo) and place it on your VPS at `/var/www/inkedrug`:
   ```bash
   ssh root@YOUR_VPS_IPV4
   mkdir -p /var/www/inkedrug
   # git clone <your-private-repo-url> /var/www/inkedrug
   cd /var/www/inkedrug
   ```
2. Run the automated 1-command installer:
   ```bash
   sudo bash deploy/setup-vps.sh inkedrug.com artisanrugs94@gmail.com
   ```
   This script automatically installs **Node.js 20 LTS**, **PM2** (auto-restarts on crash/reboot), **Nginx** reverse proxy (`80/443` → `127.0.0.1:3000`), builds the production frontend + `server.js` bundle (`npm run build:vps`), and provisions a free auto-renewing **Let's Encrypt HTTPS SSL certificate** for `inkedrug.com` and `www.inkedrug.com`.

*(Prefer Docker / Coolify / Dokploy? Run `docker compose up -d --build` using the included `Dockerfile` and `docker-compose.yml`.)*

### Step 3: Authorize `inkedrug.com` in Firebase Console & Add Live US Stripe Keys
1. Open [Firebase Console](https://console.firebase.google.com/project/ai-studio-applet-webapp-cf6e7/authentication/settings) → **Authentication → Settings → Authorized domains** → Click **Add domain** and add:
   - `inkedrug.com`
   - `www.inkedrug.com`
   *(Also ensure **Email/Password** is enabled under **Authentication → Sign-in method** for worker logins.)*
2. On your VPS, edit `/var/www/inkedrug/.env` with your live keys (`VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY` / `BREVO_API_KEY`), then rebuild & reload zero-downtime:
   ```bash
   cd /var/www/inkedrug
   npm run build:vps
   pm2 reload inkedrug-store --update-env
   ```

---

## 4. Firestore Cost & Scale Architecture (1,000+ Listings)

- **Denormalized Listing Counters** on `products/{productId}` (`views`, `visits`, `favourites`, `orders`, `revenue`) prevent N+1 sub-queries.
- **Server/Cursor Pagination (`25 / 50 / 100` per page)** + Kazumi/Etsy CSV & ZIP photo importer + 24-hour Bulk Edit **Undo** snapshots.
- **Zero-`get()` List Rules**: `firestore.rules` validates all `list` queries without extra document lookups.
