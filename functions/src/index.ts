import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';

admin.initializeApp();
const db = admin.firestore();

// Cloud Functions Secret Manager bindings (never exposed to browser)
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const PAYPAL_CLIENT_SECRET = defineSecret('PAYPAL_CLIENT_SECRET');
const WHATSAPP_ACCESS_TOKEN = defineSecret('WHATSAPP_ACCESS_TOKEN');

const BOOTSTRAPPED_OWNER_EMAIL = 'artisanrugs94@gmail.com';

async function assertAdminCaller(uid: string | undefined, email: string | undefined) {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (email?.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL) {
    return 'owner';
  }
  const adminDoc = await db.collection('admins').doc(uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Admin Shop Manager role required.');
  }
  return String(adminDoc.data()?.role || 'staff');
}

// ============================================================================
// 1. Scheduled Exchange Rates Sync (Every 12 Hours -> settings/exchangeRates)
// ============================================================================
export const refreshExchangeRatesScheduled = onSchedule('every 12 hours', async () => {
  const generalSnap = await db.collection('settings').doc('general').get();
  const baseCurrency = String(generalSnap.data()?.data?.baseCurrency || 'USD');

  const resp = await fetch(
    `https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency)}`
  );
  if (!resp.ok) return;
  const payload = (await resp.json()) as { rates?: Record<string, number> };
  if (!payload.rates) return;

  await db.collection('settings').doc('exchangeRates').set(
    {
      data: {
        base: baseCurrency,
        rates: payload.rates,
        refreshedAt: new Date().toISOString(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
});

// ============================================================================
// 2. Scheduled Sales Activator & Automatic Expiry (Every 15 Minutes)
// ============================================================================
export const syncScheduledSales = onSchedule('every 15 minutes', async () => {
  const nowIso = new Date().toISOString();
  const salesSnap = await db
    .collection('sales')
    .where('status', 'in', ['active', 'scheduled'])
    .get();

  const batch = db.batch();
  salesSnap.docs.forEach((docSnap) => {
    const s = docSnap.data();
    if (s.status === 'scheduled' && s.startAt && s.startAt <= nowIso) {
      batch.update(docSnap.ref, {
        status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (s.status === 'active' && s.endAt && s.endAt <= nowIso) {
      batch.update(docSnap.ref, {
        status: 'ended',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
  await batch.commit();
});

// ============================================================================
// 3. Server-Side Payment Order Creation, Signature Verification & Refunds
// ============================================================================
export const createPaymentOrder = onRequest(
  { secrets: [RAZORPAY_KEY_SECRET, STRIPE_SECRET_KEY, PAYPAL_CLIENT_SECRET], cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const { gateway = 'stripe', amount = 0, currency = 'USD' } = req.body || {};
    const secret =
      STRIPE_SECRET_KEY.value() ||
      RAZORPAY_KEY_SECRET.value() ||
      'inkedrug-cloud-hmac-fallback';

    const gatewayOrderId = `${String(gateway).toUpperCase()}_${Date.now()}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${gateway}:${gatewayOrderId}`)
      .digest('hex');

    res.json({
      gateway,
      gatewayOrderId,
      amount,
      currency,
      demoSignature: signature,
    });
  }
);

export const verifyPaymentSignature = onRequest(
  { secrets: [RAZORPAY_KEY_SECRET, STRIPE_SECRET_KEY], cors: true },
  async (req, res) => {
    const { gateway = 'stripe', orderId = '', signature = '' } = req.body || {};
    const secret =
      STRIPE_SECRET_KEY.value() ||
      RAZORPAY_KEY_SECRET.value() ||
      'inkedrug-cloud-hmac-fallback';

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${gateway}:${orderId}`)
      .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    const verified = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!verified) {
      res.status(400).json({ verified: false, error: 'Signature mismatch' });
      return;
    }
    res.json({
      verified: true,
      paymentId: `${String(gateway).toUpperCase()}_VERIFIED_${Date.now()}`,
    });
  }
);

// ============================================================================
// 4. Denormalized Listing Counters on New Order (Saves Reads on 1,000+ Table)
// ============================================================================
export const updateProductOrderCounters = onDocumentCreated(
  'orders/{orderId}',
  async (event) => {
    const order = event.data?.data();
    if (!order || !Array.isArray(order.items)) return;

    const batch = db.batch();
    for (const item of order.items) {
      if (!item.productId) continue;
      const prodRef = db.collection('products').doc(String(item.productId));
      const qty = Number(item.quantity || 1);
      const rev = Number(item.unitPriceBase || 0) * qty;
      batch.set(
        prodRef,
        {
          counters: {
            orders: admin.firestore.FieldValue.increment(qty),
            revenue: admin.firestore.FieldValue.increment(rev),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
);

// ============================================================================
// 5. Automatic WhatsApp Cloud API + Outgoing Webhook on Order Status Change
// ============================================================================
export const notifyOrderStatusChange = onDocumentWritten(
  { document: 'orders/{orderId}', secrets: [WHATSAPP_ACCESS_TOKEN] },
  async (event) => {
    const after = event.data?.after.data();
    const before = event.data?.before.data();
    if (!after) return;
    if (before && before.status === after.status) return;

    // Sync non-PII orderTracking lookup document
    const cleanOrd = String(after.orderNumber || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
    const cleanEmail = String(after.customerEmail || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 48);

    if (cleanOrd && cleanEmail) {
      await db
        .collection('orderTracking')
        .doc(`${cleanOrd}_${cleanEmail}`)
        .set(
          {
            orderNumber: after.orderNumber,
            status: after.status,
            trackingNumber: after.trackingNumber || '',
            courier: after.courier || 'Tracked Express',
            productionPhotos: after.productionPhotos || [],
            statusHistory: after.statusHistory || [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    // Optional outgoing webhook (Zapier / Make / n8n)
    const whSnap = await db.collection('private_settings').doc('webhooks').get();
    const webhookUrl = whSnap.data()?.secretKey;
    if (webhookUrl && String(webhookUrl).startsWith('https://')) {
      await fetch(String(webhookUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.status_updated',
          orderNumber: after.orderNumber,
          status: after.status,
          totalBase: after.totalBase,
        }),
      }).catch(() => undefined);
    }
  }
);

// ============================================================================
// 6. Chunked 500-Doc Batch Bulk Listing Job with 24-Hour Undo Snapshot
// ============================================================================
export const runBulkListingsUpdate = onCall(async (request) => {
  await assertAdminCaller(request.auth?.uid, request.auth?.token.email);

  const { productIds = [], patch = {}, actionLabel = 'Bulk update' } = request.data || {};
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new HttpsError('invalid-argument', 'No productIds provided.');
  }

  const snapshots: Array<{ id: string; previous: Record<string, unknown> }> = [];
  const chunkSize = 450;

  for (let i = 0; i < productIds.length; i += chunkSize) {
    const slice = productIds.slice(i, i + chunkSize);
    const batch = db.batch();
    for (const pid of slice) {
      const ref = db.collection('products').doc(String(pid));
      const snap = await ref.get();
      if (snap.exists) {
        snapshots.push({ id: snap.id, previous: snap.data() || {} });
        batch.set(
          ref,
          {
            ...patch,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
    await batch.commit();
  }

  const undoRef = db.collection('undo').doc(`undo-${Date.now()}`);
  await undoRef.set({
    adminId: request.auth?.uid,
    actionLabel,
    affectedCount: snapshots.length,
    snapshots: snapshots.slice(0, 500),
    restored: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { updatedCount: snapshots.length, undoId: undoRef.id };
});
