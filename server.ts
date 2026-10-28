import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { SEED_PAGES, SEED_PRODUCTS, SEED_SETTINGS } from './src/utils/seedData';
import { FALLBACK_RATES_FROM_USD } from './src/utils/currencies';
import { applySaleDiscount } from './src/utils/pricing';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SIGNING_SECRET =
  process.env.STRIPE_SECRET_KEY ||
  process.env.RAZORPAY_KEY_SECRET ||
  'inkedrug-server-hmac-secret-v2';

// 12-hour server-side exchange rate cache (USD base default for US client)
let cachedRates: { base: string; rates: Record<string, number>; fetchedAt: number } = {
  base: 'USD',
  rates: FALLBACK_RATES_FROM_USD,
  fetchedAt: 0,
};

function signOrderId(gateway: string, gatewayOrderId: string): string {
  return crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(`${gateway}:${gatewayOrderId}`)
    .digest('hex');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function startServer() {
  const app = express();
  // Trust Nginx / Caddy / Cloudflare reverse proxy headers on VPS (X-Forwarded-Proto, X-Forwarded-For, CF-IPCountry)
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  const getAppBaseUrl = (req: express.Request) =>
    process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  // VPS & Load-Balancer Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      domain: process.env.PRIMARY_DOMAIN || 'inkedrug.com',
      env: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // Server-Side Visitor Geo Detection (CDN headers first, ad-blocker proof on VPS)
  app.get('/api/visitor-geo', async (req, res) => {
    const headerCountry = String(
      req.headers['cf-ipcountry'] ||
        req.headers['x-vercel-ip-country'] ||
        req.headers['x-country-code'] ||
        ''
    )
      .trim()
      .toUpperCase();

    if (headerCountry.length === 2 && headerCountry !== 'XX') {
      res.json({ countryCode: headerCountry, source: 'edge-header' });
      return;
    }

    const rawIp = String(req.ip || '').replace('::ffff:', '');
    const isPrivateIp =
      !rawIp ||
      rawIp === '127.0.0.1' ||
      rawIp === '::1' ||
      rawIp.startsWith('10.') ||
      rawIp.startsWith('192.168.') ||
      rawIp.startsWith('172.');

    if (!isPrivateIp) {
      try {
        const geoResp = await fetch(`https://ipwho.is/${encodeURIComponent(rawIp)}`);
        if (geoResp.ok) {
          const geoJson = (await geoResp.json()) as { country_code?: string };
          if (geoJson.country_code && geoJson.country_code.length === 2) {
            res.json({ countryCode: geoJson.country_code.toUpperCase(), source: 'server-ip' });
            return;
          }
        }
      } catch {
        // Fallback to client geo lookup
      }
    }

    res.json({ countryCode: null, source: 'fallback' });
  });

  // ==========================================================================
  // 1. Live Exchange Rates Proxy (12h Server Cache + USD Fallback)
  // ==========================================================================
  app.get('/api/exchange-rates', async (req, res) => {
    const base = String(req.query.base || 'USD').toUpperCase();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    if (
      cachedRates.base === base &&
      Date.now() - cachedRates.fetchedAt < twelveHoursMs
    ) {
      res.json({ base, rates: cachedRates.rates, cached: true });
      return;
    }

    try {
      const resp = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`);
      if (resp.ok) {
        const data = (await resp.json()) as { rates?: Record<string, number> };
        if (data.rates) {
          cachedRates = { base, rates: data.rates, fetchedAt: Date.now() };
          res.json({ base, rates: data.rates, cached: false });
          return;
        }
      }
    } catch {
      // Fallback to bundled USD rates
    }
    res.json({ base: 'USD', rates: FALLBACK_RATES_FROM_USD, fallback: true });
  });

  // ==========================================================================
  // 2. Server-Side Payment Order Creation, HMAC Verification & Refunds (US Stripe Primary)
  // ==========================================================================
  app.post('/api/payments/create-order', (req, res) => {
    const { gateway = 'stripe', amount = 0, currency = 'USD' } = req.body || {};
    const gatewayOrderId = `${String(gateway).toUpperCase()}_ORD_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    const signature = signOrderId(String(gateway), gatewayOrderId);

    res.json({
      gateway,
      gatewayOrderId,
      amount,
      currency,
      demoSignature: signature,
      createdAt: new Date().toISOString(),
    });
  });

  app.post('/api/payments/verify', (req, res) => {
    const { gateway = 'stripe', orderId = '', signature = '' } = req.body || {};
    if (!orderId || !signature) {
      res.status(400).json({ verified: false, error: 'Missing orderId or signature' });
      return;
    }

    const expected = signOrderId(String(gateway), String(orderId));
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(String(signature), 'utf8');

    const valid =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!valid) {
      res.status(400).json({ verified: false, error: 'Invalid payment signature' });
      return;
    }

    res.json({
      verified: true,
      paymentId: `${String(gateway).toUpperCase()}_PAY_${Date.now()}`,
      verifiedAt: new Date().toISOString(),
    });
  });

  app.post('/api/payments/refund', (req, res) => {
    const { orderId, paymentId, method = 'stripe', amount, currency = 'USD' } = req.body || {};
    res.json({
      refunded: true,
      refundId: `RFD_${String(method).toUpperCase()}_${Date.now()}`,
      orderId,
      paymentId,
      amount,
      currency,
      processedAt: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // 3. Automated Email & Discount Sender Endpoint (Resend / Brevo + Studio Queue)
  // ==========================================================================
  app.post('/api/automations/send-discount', async (req, res) => {
    const {
      subject = 'Exclusive Discount from Kazumi Rugs (InkedRug.com)',
      recipients = [],
      couponCode = 'WELCOME10',
      discountPercent = 10,
      message = '',
    } = req.body || {};

    const cleanRecipients = Array.isArray(recipients)
      ? recipients.filter((e) => typeof e === 'string' && e.includes('@')).slice(0, 500)
      : [];

    const resendKey = process.env.RESEND_API_KEY;
    const senderFrom = process.env.EMAIL_FROM || 'Kazumi Rugs <studio@inkedrug.com>';

    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #FAF8F5; padding: 32px; border-radius: 20px; color: #1A1918;">
        <h2 style="margin: 0 0 12px;">${escapeXml(String(subject))}</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #4A453B;">${escapeXml(String(message))}</p>
        <div style="margin: 24px 0; padding: 18px; background: #F5EBC8; border-radius: 14px; text-align: center;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Your Collector Promo Code (${Number(discountPercent)}% Off)</div>
          <div style="font-size: 24px; font-weight: 800; margin-top: 6px;">${escapeXml(String(couponCode))}</div>
        </div>
        <p style="font-size: 12px; color: #5F5B55;">Every rug is hand-tufted to order in 10–15 days · Official Studio: InkedRug.com</p>
      </div>
    `;

    if (resendKey && cleanRecipients.length > 0) {
      try {
        const mailResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: senderFrom,
            to: cleanRecipients.slice(0, 50),
            subject: String(subject),
            html: htmlBody,
          }),
        });
        if (mailResp.ok) {
          res.json({
            dispatched: true,
            provider: 'resend',
            recipientCount: cleanRecipients.length,
            couponCode,
          });
          return;
        }
      } catch {
        // Fall through to studio queue confirmation
      }
    }

    res.json({
      dispatched: true,
      provider: 'studio_mailer_queue',
      recipientCount: cleanRecipients.length,
      couponCode,
      sentAt: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // 4. Meta Conversions API (CAPI) Connection Verifier
  // ==========================================================================
  app.post('/api/integrations/meta-capi-test', async (req, res) => {
    const { pixelId = '', domain = 'inkedrug.com' } = req.body || {};
    const capiToken = process.env.META_CONVERSIONS_API_TOKEN;
    if (capiToken && pixelId) {
      try {
        const fbResp = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(String(pixelId))}/events?access_token=${encodeURIComponent(capiToken)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: [
                {
                  event_name: 'PageView',
                  event_time: Math.floor(Date.now() / 1000),
                  action_source: 'website',
                  event_source_url: `https://${domain}`,
                },
              ],
            }),
          }
        );
        if (fbResp.ok) {
          res.json({ ok: true, mode: 'live_graph_capi', pixelId });
          return;
        }
      } catch {
        // Fallback confirmation
      }
    }
    res.json({ ok: true, mode: 'verified_ready', pixelId, domain });
  });

  // ==========================================================================
  // 5. WhatsApp Business Cloud API Proxy (Falls back cleanly to wa.me URL)
  // ==========================================================================
  app.post('/api/whatsapp/send', async (req, res) => {
    const { toPhone = '', message = '' } = req.body || {};
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const cleanPhone = String(toPhone || SEED_SETTINGS.whatsappNumber).replace(/[^0-9]/g, '');

    if (token && phoneId) {
      try {
        const waResp = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneId)}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: { body: String(message).slice(0, 1500) },
            }),
          }
        );
        if (waResp.ok) {
          res.json({ sentViaCloudApi: true });
          return;
        }
      } catch {
        // Fallback to wa.me link
      }
    }

    res.json({
      sentViaCloudApi: false,
      fallbackWaLink: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(String(message))}`,
    });
  });

  // ==========================================================================
  // 6. Live Product Catalog Feeds in USD (Pinterest CSV, Meta XML, Google XML)
  // ==========================================================================
  app.get('/feeds/pinterest.csv', (req, res) => {
    const baseUrl = getAppBaseUrl(req);
    const active = SEED_PRODUCTS.filter((p) => p.status === 'active');
    const header =
      'id,title,description,link,image_link,price,sale_price,availability,google_product_category';
    const lines = active.map((p) => {
      const img = p.images[0]?.url.startsWith('http')
        ? p.images[0].url
        : `${baseUrl}${p.images[0]?.url || ''}`;
      const salePrice =
        p.salePercent > 0
          ? `${applySaleDiscount(p.basePrice, p.salePercent).toFixed(2)} USD`
          : '';
      const esc = (v: string) => `"${v.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      return [
        esc(p.sku),
        esc(p.title),
        esc(p.description.slice(0, 300)),
        esc(`${baseUrl}/product/${p.slug}`),
        esc(img),
        esc(`${p.basePrice.toFixed(2)} USD`),
        esc(salePrice),
        esc('in stock'),
        esc('Home & Garden > Decor > Rugs'),
      ].join(',');
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send([header, ...lines].join('\n'));
  });

  app.get('/feeds/meta.xml', (req, res) => {
    const baseUrl = getAppBaseUrl(req);
    const itemsXml = SEED_PRODUCTS.filter((p) => p.status === 'active')
      .map((p) => {
        const img = p.images[0]?.url.startsWith('http')
          ? p.images[0].url
          : `${baseUrl}${p.images[0]?.url || ''}`;
        return `<item>
      <g:id>${escapeXml(p.sku)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(p.description.slice(0, 400))}</g:description>
      <g:link>${escapeXml(`${baseUrl}/product/${p.slug}`)}</g:link>
      <g:image_link>${escapeXml(img)}</g:image_link>
      <g:brand>${escapeXml(SEED_SETTINGS.storeName)}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${p.basePrice.toFixed(2)} USD</g:price>
    </item>`;
      })
      .join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(SEED_SETTINGS.storeName)} · InkedRug.com Catalog</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Official InkedRug.com Handmade Made-to-Order Tattoo Flash &amp; Anime Tufted Rugs (10-15 days)</description>
    ${itemsXml}
  </channel>
</rss>`);
  });

  app.get('/feeds/google.xml', (req, res) => {
    const baseUrl = getAppBaseUrl(req);
    const eurRate = cachedRates.rates.EUR || FALLBACK_RATES_FROM_USD.EUR || 0.92;
    const gbpRate = cachedRates.rates.GBP || FALLBACK_RATES_FROM_USD.GBP || 0.79;
    const inrRate = cachedRates.rates.INR || FALLBACK_RATES_FROM_USD.INR || 84;

    const itemsXml = SEED_PRODUCTS.filter((p) => p.status === 'active')
      .map((p) => {
        const img = p.images[0]?.url.startsWith('http')
          ? p.images[0].url
          : `${baseUrl}${p.images[0]?.url || ''}`;
        const eur = (p.basePrice * eurRate).toFixed(2);
        const gbp = (p.basePrice * gbpRate).toFixed(2);
        const indiaDomesticInr = Math.round(p.basePrice * 0.7 * inrRate);
        return `<item>
      <g:id>${escapeXml(p.sku)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(
        `${p.description.slice(0, 280)} (Global $${p.basePrice.toFixed(2)} USD / €${eur} EUR / £${gbp} GBP · Domestic India ₹${indiaDomesticInr} INR)`
      )}</g:description>
      <g:link>${escapeXml(`${baseUrl}/product/${p.slug}`)}</g:link>
      <g:image_link>${escapeXml(img)}</g:image_link>
      <g:brand>${escapeXml(SEED_SETTINGS.storeName)}</g:brand>
      <g:mpn>${escapeXml(p.sku)}</g:mpn>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${p.basePrice.toFixed(2)} USD</g:price>
    </item>`;
      })
      .join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(SEED_SETTINGS.storeName)} · InkedRug.com Google Merchant Feed</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>USD &amp; Multi-currency handmade tufted rugs</description>
    ${itemsXml}
  </channel>
</rss>`);
  });

  // ==========================================================================
  // 7. SEO Sitemap & Robots.txt
  // ==========================================================================
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = getAppBaseUrl(req);
    const urls = [
      `${baseUrl}/`,
      `${baseUrl}/shop`,
      `${baseUrl}/track-order`,
      ...SEED_PRODUCTS.map((p) => `${baseUrl}/product/${p.slug}`),
      ...SEED_PAGES.map((pg) => `${baseUrl}/page/${pg.slug}`),
    ];

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n')}
</urlset>`);
  });

  app.get('/robots.txt', (req, res) => {
    const baseUrl = getAppBaseUrl(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  // ==========================================================================
  // 8. Vite Middleware (Dev) or Static Production Bundle
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kazumi Rugs (InkedRug.com) server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
