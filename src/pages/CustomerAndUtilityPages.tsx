import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  LogIn,
  LogOut,
  MessageCircle,
  Package,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { db } from '../services/firebase';
import { getCountryConfig } from '../utils/currencies';
import { applySaleDiscount, getActiveSaleInfo, makeTrackingLookupKey } from '../utils/pricing';

export const FavouritesPage: React.FC = () => {
  const { favourites, products, sales, countryCode, addToCart, settings } = useStore();
  const favProducts = products.filter((p) => favourites.includes(p.id));

  useDocumentMeta({
    title: `Your Favourites (${favProducts.length}) | ${settings.storeName}`,
    description: 'Saved handmade tattoo flash and anime tufted rugs.',
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between pb-6 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Favourite Items</h1>
          <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-1">
            {favProducts.length} saved handmade rug(s)
          </p>
        </div>
      </div>

      {favProducts.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-12 text-center">
          <Heart className="w-8 h-8 mx-auto text-[#D62828] mb-3" />
          <h2 className="text-base font-bold">Nothing saved yet</h2>
          <p className="text-xs text-[#5F5B55] mt-1">
            Tap the heart icon on any rug to save it here across devices.
          </p>
          <Link
            to="/shop"
            className="mt-5 inline-block rounded-full bg-[#111111] text-white px-6 py-2.5 text-xs font-bold"
          >
            Explore Rugs
          </Link>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favProducts.map((p) => {
            const firstSize = p.sizes[0];
            const firstVar = p.variations[0];
            const sale = getActiveSaleInfo(p, sales, countryCode);
            const origin = (firstSize?.price || p.basePrice) + (firstVar?.priceAdjustment || 0);
            const finalP = applySaleDiscount(origin, sale.percent);

            return (
              <div key={p.id} className="flex flex-col gap-2">
                <ProductCard product={p} />
                <button
                  type="button"
                  onClick={() =>
                    addToCart({
                      productId: p.id,
                      slug: p.slug,
                      title: p.title,
                      image: p.images[0]?.url || '',
                      variationId: firstVar?.id || 'default',
                      variationName: firstVar?.name || 'Standard',
                      sizeId: firstSize?.id || 'sz-60',
                      sizeLabel: firstSize?.label || '60x60cm',
                      isCustomSize: false,
                      personalisationText: '',
                      referenceImageUrl: '',
                      unitOriginPriceBase: origin,
                      salePercent: sale.percent,
                      unitFinalPriceBase: finalP,
                      quantity: 1,
                    })
                  }
                  className="rounded-full border border-[#111111] dark:border-[#FAF8F5] py-2 text-xs font-bold hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
                >
                  Move {firstSize?.label.split(' ')[0] || '60x60cm'} to cart
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TrackOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { orders, settings } = useStore();

  const [orderInput, setOrderInput] = useState(searchParams.get('order') || 'INK-1042');
  const [emailInput, setEmailInput] = useState(
    searchParams.get('email') || 'marcus.vance@example.com'
  );
  const [lookupError, setLookupError] = useState('');
  const [remoteProjection, setRemoteProjection] = useState<Record<string, unknown> | null>(null);

  useDocumentMeta({
    title: `Track Your Made-to-Order Rug | ${settings.storeName}`,
    description: 'Check live 10-15 day tufting progress photos and courier tracking.',
  });

  const matchedLocal = orders.find(
    (o) =>
      o.orderNumber.toUpperCase() === orderInput.trim().toUpperCase() &&
      (o.customerEmail.toLowerCase() === emailInput.trim().toLowerCase() ||
        o.customerPhone.replace(/[^0-9]/g, '').endsWith(emailInput.replace(/[^0-9]/g, '').slice(-6)))
  );

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    if (matchedLocal) return;
    try {
      const key = makeTrackingLookupKey(orderInput, emailInput);
      const snap = await getDoc(doc(db, 'orderTracking', key));
      if (snap.exists()) {
        setRemoteProjection(snap.data());
        return;
      }
    } catch {
      // Fallback
    }
    setLookupError(
      'No order matched that Order Number + Email/Phone combination. Try demo order INK-1042 (marcus.vance@example.com) or INK-1041 (rohan.mehta@example.com).'
    );
  };

  const activeOrder = matchedLocal || (remoteProjection as unknown as typeof matchedLocal);
  const steps = ['New', 'Confirmed', 'In production', 'Shipped', 'Delivered'];
  const currentStepIdx = activeOrder
    ? Math.max(
        0,
        steps.findIndex((s) => s.toLowerCase() === activeOrder.status.toLowerCase())
      )
    : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Track Your Rug Order</h1>
        <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-1">
          Follow your rug from frame tufting and latex backing (Days 1–15) to courier delivery.
        </p>
      </div>

      <form
        onSubmit={handleLookup}
        className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-semibold mb-1">Order Number *</label>
          <input
            type="text"
            required
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            placeholder="KZM-1041"
            className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm font-mono-num"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Email or Phone *</label>
          <input
            type="text"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="rohan.mehta@example.com"
            className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-2.5 px-6 text-xs font-bold cursor-pointer h-[42px]"
        >
          Track Status
        </button>
      </form>

      {lookupError && <p className="text-xs text-[#D62828] font-semibold">{lookupError}</p>}

      {activeOrder && (
        <div className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
            <div>
              <p className="text-xs text-[#5F5B55]">Order #{activeOrder.orderNumber}</p>
              <h2 className="text-lg font-bold mt-0.5">Current Stage: {activeOrder.status}</h2>
            </div>
            <div className="text-right text-xs">
              <p className="text-[#5F5B55]">Courier</p>
              <p className="font-bold">{activeOrder.courier || 'Tracked Express'}</p>
              {activeOrder.trackingNumber && (
                <a
                  href={`https://t.17track.net/en#nums=${encodeURIComponent(
                    activeOrder.trackingNumber
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2EC4B6] font-mono-num underline"
                >
                  #{activeOrder.trackingNumber} ↗
                </a>
              )}
            </div>
          </div>

          {/* 5-Stage Visual Timeline */}
          <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
            {steps.map((st, idx) => {
              const reached = idx <= (currentStepIdx === -1 ? 1 : currentStepIdx);
              return (
                <div key={st} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      reached
                        ? 'bg-[#2F6B2F] text-white'
                        : 'bg-[#EFECE6] dark:bg-[#2E2C28] text-[#5F5B55]'
                    }`}
                  >
                    {reached ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={reached ? 'font-bold' : 'text-[#5F5B55]'}>{st}</span>
                </div>
              );
            })}
          </div>

          {/* Production Progress Photos from Studio */}
          {activeOrder.productionPhotos && activeOrder.productionPhotos.length > 0 && (
            <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
              <h3 className="text-xs font-bold mb-3">
                Studio Tufting &amp; Carving Progress Photos
              </h3>
              <div className="flex flex-wrap gap-3">
                {activeOrder.productionPhotos.map((photo, i) => (
                  <div
                    key={i}
                    className="w-28 h-28 rounded-2xl overflow-hidden border border-[#E6E1D8] dark:border-[#2E2C28]"
                  >
                    <ResilientImage
                      src={photo}
                      alt={`Production photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp History */}
          {activeOrder.statusHistory && activeOrder.statusHistory.length > 0 && (
            <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#2E2C28] space-y-2 text-xs">
              <h3 className="font-bold">Timeline Log</h3>
              {activeOrder.statusHistory.map((h, i) => (
                <div key={i} className="flex justify-between text-[#5F5B55] dark:text-[#A6A198] tabular-nums">
                  <span>
                    <strong className="text-[#1A1918] dark:text-[#F4F1EA]">{h.status}</strong> · {h.by}
                  </span>
                  <span>{new Date(h.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AccountPage: React.FC = () => {
  const {
    currentUser,
    signInWithGoogle,
    signOutUser,
    orders,
    conversations,
    messages,
    followedShop,
    countryCode,
    currency,
    setRegionModalOpen,
    formatPrice,
    sendBuyerMessage,
    settings,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'messages' | 'preferences'>('orders');
  const [replyText, setReplyText] = useState('');

  useDocumentMeta({
    title: `Your Account | ${settings.storeName}`,
    description: 'Manage your Kazumi Rugs orders, studio messages, favourites, and currency settings.',
  });

  const cfg = getCountryConfig(countryCode);
  const myOrders = currentUser
    ? orders.filter(
        (o) =>
          o.customerId === currentUser.uid ||
          o.customerEmail.toLowerCase() === currentUser.email?.toLowerCase()
      )
    : orders.slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#111111] text-white font-display text-xl flex items-center justify-center">
            {(currentUser?.displayName || 'K')[0]}
          </div>
          <div>
            <h1 className="font-display text-xl sm:text-2xl">
              {currentUser ? currentUser.displayName || currentUser.email : 'Collector Account'}
            </h1>
            <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-0.5">
              {currentUser
                ? `${currentUser.email} · ${followedShop ? 'Following Kazumi Rugs' : 'Verified Collector'}`
                : 'Checkout always works as Guest, or sign in with Google to sync favourites & orders across devices.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <button
              type="button"
              onClick={signOutUser}
              className="inline-flex items-center gap-2 rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-5 py-2 text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-5 py-2.5 text-xs font-bold cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> Continue with Google
            </button>
          )}
        </div>
      </div>

      {/* Segmented Navigation */}
      <div className="inline-flex rounded-xl bg-[#EFECE6] dark:bg-[#1C1B19] p-1 text-xs font-semibold">
        {[
          { id: 'orders' as const, label: `Purchases & Tracking (${myOrders.length})`, icon: Package },
          { id: 'messages' as const, label: `Messages (${conversations.length})`, icon: MessageCircle },
          { id: 'preferences' as const, label: 'Region & Preferences', icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#2E2C28] shadow-xs text-[#111111] dark:text-white'
                : 'text-[#5F5B55]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {myOrders.map((ord) => (
            <div
              key={ord.id}
              className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-3 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
                <span className="font-bold font-mono-num">Order #{ord.orderNumber}</span>
                <span className="font-semibold text-[#2F6B2F] dark:text-[#5ECF5E]">
                  Status: {ord.status}
                </span>
              </div>
              {ord.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-bold text-sm">{item.title}</p>
                      <p className="text-[#5F5B55]">
                        {item.variationName} · {item.sizeLabel} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold tabular-nums">
                    {formatPrice(item.unitPriceBase * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="pt-2 flex justify-end gap-3 text-xs">
                <Link
                  to={`/track-order?order=${encodeURIComponent(ord.orderNumber)}&email=${encodeURIComponent(
                    ord.customerEmail
                  )}`}
                  className="rounded-full border border-[#111111] dark:border-[#FAF8F5] px-4 py-1.5 font-semibold"
                >
                  Track Progress
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
          <h2 className="text-sm font-bold">Messages with {settings.storeName}</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3.5 rounded-2xl text-xs max-w-lg ${
                  m.senderRole === 'customer'
                    ? 'ml-auto bg-[#111111] text-white'
                    : 'bg-[#F5EBC8] text-[#111111]'
                }`}
              >
                <p className="font-bold mb-1">
                  {m.senderRole === 'customer' ? 'You' : settings.storeName}
                </p>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!replyText.trim()) return;
              await sendBuyerMessage({
                conversationId: conversations[0]?.id,
                customerName: currentUser?.displayName || 'Collector',
                customerEmail: currentUser?.email || 'collector@example.com',
                text: replyText,
              });
              setReplyText('');
            }}
            className="flex gap-2 pt-2"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a message to Kazumi Rugs studio..."
              className="flex-1 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-4 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-full bg-[#111111] text-white px-5 py-2 text-xs font-bold cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4 text-xs">
          <h2 className="text-sm font-bold">Regional &amp; Currency Settings</h2>
          <p className="text-[#5F5B55]">
            Active region: <strong>{cfg.flag} {cfg.countryName}</strong> · Display currency:{' '}
            <strong>{currency}</strong>
          </p>
          <button
            type="button"
            onClick={() => setRegionModalOpen(true)}
            className="rounded-full bg-[#111111] text-white px-5 py-2 font-bold cursor-pointer"
          >
            Change Region, Currency or Language
          </button>
        </div>
      )}
    </div>
  );
};

export const StaticContentPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { pages, settings, pushToast } = useStore();
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });

  const page = pages.find((p) => p.slug === slug) || {
    slug: slug || 'about',
    title: slug === 'contact' ? 'Contact Kazumi Rugs Studio' : 'Studio Policy',
    content:
      'Every Kazumi Rugs piece is tufted to order in 10–15 days after order confirmation using heavyweight acrylic yarn and non-slip canvas backing.',
  };

  useDocumentMeta({
    title: `${page.title} | ${settings.storeName}`,
    description: page.content.slice(0, 150),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-7 sm:p-10 space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl">{page.title}</h1>
        <div className="text-sm text-[#3F3C37] dark:text-[#D5D0C6] whitespace-pre-line leading-relaxed">
          {page.content}
        </div>
      </div>

      {/* Contact Studio Form */}
      <div className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-7 sm:p-10 space-y-4 text-xs">
        <h2 className="text-base font-bold">Send Us a Direct Note</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            pushToast('Message received! We reply within 12 studio hours.', { tone: 'success' });
            setContactForm({ name: '', email: '', subject: '', message: '' });
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <input
            type="text"
            required
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            placeholder="Your name"
            className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5"
          />
          <input
            type="email"
            required
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            placeholder="Your email"
            className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5"
          />
          <input
            type="text"
            required
            value={contactForm.subject}
            onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
            placeholder="Subject (Custom Rug, Shipping, Wholesale...)"
            className="sm:col-span-2 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5"
          />
          <textarea
            rows={4}
            required
            value={contactForm.message}
            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
            placeholder="How can our tuftmakers help?"
            className="sm:col-span-2 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5"
          />
          <div className="sm:col-span-2 flex items-center justify-between">
            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#25D366] underline"
            >
              Chat directly on WhatsApp ↗
            </a>
            <button
              type="submit"
              className="rounded-full bg-[#111111] text-white px-6 py-2.5 font-bold cursor-pointer"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
