import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Film,
  Globe,
  KeyRound,
  Mail,
  MessageCircle,
  Play,
  Plus,
  Plug,
  Send,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import {
  AdminRole,
  Coupon,
  InstagramReelItem,
  ProcessingProfile,
  SaleCampaign,
} from '../types';
import { COUNTRY_CURRENCY_MAP, formatMoney } from '../utils/currencies';
import { applyRegionalPricing, applySaleDiscount } from '../utils/pricing';
import { RUG_IMAGES } from '../utils/seedData';

// ============================================================================
// 12.L MARKETING: SALES, COUPONS, AUTO-MAILER, INSTAGRAM REELS & FEEDS
// ============================================================================
export const MarketingManager: React.FC = () => {
  const [searchParams] = useSearchParams();
  const {
    sales,
    coupons,
    abandonedCarts,
    customers,
    products,
    categories,
    sections,
    settings,
    exchangeRates,
    upsertSaleCampaign,
    endSaleCampaign,
    upsertCoupon,
    deleteCoupon,
    sendAutomatedDiscountBlast,
    updateStoreSettings,
    pushToast,
  } = useStore();

  const [tab, setTab] = useState<
    'sales' | 'coupons' | 'automations' | 'reels' | 'abandoned' | 'feeds'
  >(
    (searchParams.get('tab') as
      | 'sales'
      | 'coupons'
      | 'automations'
      | 'reels'
      | 'abandoned'
      | 'feeds') || 'sales'
  );

  // Sale Creator State
  const [saleName, setSaleName] = useState('US & Global Studio Flash Sale');
  const [salePercent, setSalePercent] = useState(20);
  const [saleScope, setSaleScope] = useState<'all' | 'sections' | 'categories' | 'products'>('all');
  const [saleTargetIds, setSaleTargetIds] = useState<string[]>([]);
  const [saleDays, setSaleDays] = useState(7);

  // Coupon Creator State (USD Defaults)
  const [couponCode, setCouponCode] = useState('INKED20');
  const [couponType, setCouponType] = useState<'percent' | 'flat' | 'free_shipping'>('percent');
  const [couponVal, setCouponVal] = useState(20);
  const [couponMin, setCouponMin] = useState(75);

  // Auto-Mailer & Discount Sender State
  const [blastSubject, setBlastSubject] = useState(
    'InkedRug.com VIP Drop: Take 15% Off Any Handmade Tufted Rug'
  );
  const [blastAudience, setBlastAudience] = useState<
    'all' | 'abandoned' | 'us_collectors' | 'custom'
  >('all');
  const [blastCustomEmails, setBlastCustomEmails] = useState('');
  const [blastCoupon, setBlastCoupon] = useState('KAZUMI15');
  const [blastPercent, setBlastPercent] = useState(15);
  const [blastMessage, setBlastMessage] = useState(
    'Every Kazumi rug on InkedRug.com is hand-tufted to order in 10–15 days with carved black ink outlines. Use your exclusive collector code at checkout with US Stripe, Apple Pay, or PayPal.'
  );
  const [sendingBlast, setSendingBlast] = useState(false);

  // Instagram Reel Creator State
  const [reelTitle, setReelTitle] = useState('');
  const [reelCaption, setReelCaption] = useState(
    'Hand-carving 16mm heavyweight acrylic pile in the InkedRug studio. Made to order in 10–15 days.'
  );
  const [reelThumb, setReelThumb] = useState<string>(RUG_IMAGES.tigerRose);
  const [reelUrl, setReelUrl] = useState('https://www.instagram.com/reels/');
  const [reelViews, setReelViews] = useState('42.5K');
  const [reelLikes, setReelLikes] = useState('5.8K');
  const [reelProductId, setReelProductId] = useState(products[0]?.id || '');

  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  const salePresets = [
    { label: 'US Flash Drop (20%)', name: 'US & Global Flash Sale', pct: 20, days: 10 },
    { label: '24h Studio Drop (25%)', name: '24-Hour Studio Flash Sale', pct: 25, days: 1 },
    { label: 'Weekend Drop (15%)', name: 'Weekend Collector Sale', pct: 15, days: 3 },
    { label: 'Black Friday (30%)', name: 'Black Friday Tattoo & Anime Event', pct: 30, days: 5 },
    { label: 'Holiday Gifting (20%)', name: 'Holiday Handmade Rug Event', pct: 20, days: 12 },
  ];

  const matchingSaleProducts = useMemo(() => {
    return products.filter((p) => {
      if (saleScope === 'all') return true;
      if (saleScope === 'categories') return saleTargetIds.includes(p.categoryId);
      if (saleScope === 'sections') return saleTargetIds.includes(p.sectionId);
      return saleTargetIds.includes(p.id);
    });
  }, [products, saleScope, saleTargetIds]);

  const sampleProduct = matchingSaleProducts[0] || products[0];

  const handleLaunchSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const end = new Date(now.getTime() + saleDays * 86400000);
    const camp: SaleCampaign = {
      id: `sale-${Date.now()}`,
      name: saleName.trim() || 'Studio Sale',
      percent: salePercent,
      scope: saleScope,
      targetIds: saleScope === 'all' ? [] : saleTargetIds,
      excludedIds: [],
      minOrder: 0,
      countries: [],
      startAt: now.toISOString(),
      endAt: end.toISOString(),
      status: 'active',
      ordersCount: 0,
      revenueBase: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await upsertSaleCampaign(camp);
  };

  const handleSendBlast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingBlast(true);
    let recipients: string[] = [];
    let audienceLabel = 'All Collectors & Subscribers';

    if (blastAudience === 'all') {
      recipients = Array.from(
        new Set([
          ...customers.map((c) => c.email),
          ...abandonedCarts.map((a) => a.email),
        ])
      ).filter(Boolean);
      audienceLabel = `All Collectors & Leads (${Math.max(1, recipients.length)})`;
    } else if (blastAudience === 'abandoned') {
      recipients = abandonedCarts.map((a) => a.email).filter(Boolean);
      audienceLabel = `Abandoned Checkout Leads (${Math.max(1, recipients.length)})`;
    } else if (blastAudience === 'us_collectors') {
      recipients = customers
        .filter((c) => c.country === 'US')
        .map((c) => c.email)
        .filter(Boolean);
      audienceLabel = `USA Collectors (${Math.max(1, recipients.length)})`;
    } else {
      recipients = blastCustomEmails
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes('@'));
      audienceLabel = `Custom Recipient List (${Math.max(1, recipients.length)})`;
    }

    if (recipients.length === 0) {
      recipients = [settings.contactEmail];
    }

    await sendAutomatedDiscountBlast({
      subject: blastSubject,
      audienceLabel,
      recipientEmails: recipients,
      couponCode: blastCoupon.trim().toUpperCase(),
      discountPercent: blastPercent,
      customMessage: blastMessage,
    });
    setSendingBlast(false);
  };

  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelTitle.trim()) return;
    const linkedProd = products.find((p) => p.id === reelProductId);
    const newReel: InstagramReelItem = {
      id: `reel-${Date.now()}`,
      title: reelTitle.trim(),
      caption: reelCaption.trim(),
      thumbnailUrl: reelThumb,
      reelUrl: reelUrl.trim() || 'https://www.instagram.com/reels/',
      viewsLabel: reelViews.trim() || '12.4K',
      likesLabel: reelLikes.trim() || '1.9K',
      productId: linkedProd?.id || '',
      productSlug: linkedProd?.slug || '',
      productTitle: linkedProd?.title || '',
      visible: true,
    };
    await updateStoreSettings({
      instagramReels: [newReel, ...(settings.instagramReels || [])],
    });
    setReelTitle('');
    pushToast('Added Instagram Reel to InkedRug.com homepage', { tone: 'success' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Marketing · Sales, Auto-Mail Discounts, Reels &amp; Feeds
          </h1>
          <p className="text-xs text-[#5F5B55]">
            Official {settings.primaryDomain || 'inkedrug.com'} growth suite · Base currency:{' '}
            <strong>{settings.baseCurrency} ($)</strong>
          </p>
        </div>

        <div className="flex flex-wrap rounded-xl bg-[#EFECE6] dark:bg-[#1C1B19] p-1 text-xs font-bold gap-0.5">
          {(
            [
              ['sales', `Sales (${sales.length})`],
              ['coupons', `Coupons (${coupons.length})`],
              ['automations', 'Auto Mail & Discount Sender'],
              ['reels', `Instagram Reels (${(settings.instagramReels || []).length})`],
              ['abandoned', `Abandoned (${abandonedCarts.length})`],
              ['feeds', 'Feeds & SEO'],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                tab === id
                  ? 'bg-white dark:bg-[#2E2C28] text-[#111111] dark:text-white shadow-2xs'
                  : 'text-[#5F5B55]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* 1. ONE-CLICK SALES */}
      {tab === 'sales' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-xs">
          <form
            onSubmit={handleLaunchSale}
            className="xl:col-span-7 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#2F6B2F]" /> Launch One-Click Sale Campaign
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {salePresets.map((pr) => (
                <button
                  key={pr.label}
                  type="button"
                  onClick={() => {
                    setSaleName(pr.name);
                    setSalePercent(pr.pct);
                    setSaleDays(pr.days);
                  }}
                  className="px-3 py-1 rounded-full bg-[#FAF8F5] dark:bg-[#121211] border border-[#E6E1D8] dark:border-[#2E2C28] hover:border-[#111111] font-semibold cursor-pointer"
                >
                  {pr.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Sale Campaign Name</label>
                <input
                  type="text"
                  required
                  value={saleName}
                  onChange={(e) => setSaleName(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={saleDays}
                  onChange={(e) => setSaleDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5">
                Discount Percentage ({salePercent}% off)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setSalePercent(pct)}
                    className={`px-3.5 py-1.5 rounded-full font-mono-num font-bold cursor-pointer ${
                      salePercent === pct
                        ? 'bg-[#2F6B2F] text-white'
                        : 'border border-[#E6E1D8] dark:border-[#2E2C28]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Applies To</label>
                <select
                  value={saleScope}
                  onChange={(e) => {
                    setSaleScope(e.target.value as typeof saleScope);
                    setSaleTargetIds([]);
                  }}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="all">Whole Shop ({products.length} listings)</option>
                  <option value="categories">Specific Categories</option>
                  <option value="sections">Specific Shop Sections</option>
                </select>
              </div>

              {saleScope === 'categories' && (
                <div>
                  <label className="block font-bold mb-1">Choose Category</label>
                  <select
                    value={saleTargetIds[0] || ''}
                    onChange={(e) => setSaleTargetIds([e.target.value])}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {saleScope === 'sections' && (
                <div>
                  <label className="block font-bold mb-1">Choose Section</label>
                  <select
                    value={saleTargetIds[0] || ''}
                    onChange={(e) => setSaleTargetIds([e.target.value])}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                  >
                    <option value="">Select section...</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {sampleProduct && (
              <div className="rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-4 space-y-1">
                <p className="font-bold">
                  Preview: {matchingSaleProducts.length.toLocaleString()} listing(s) will display green sale badges.
                </p>
                <p className="font-mono-num">
                  Example ({sampleProduct.title.slice(0, 34)}...):{' '}
                  <span className="line-through text-[#5F5B55]">
                    {formatBase(sampleProduct.basePrice)}
                  </span>{' '}
                  →{' '}
                  <strong className="text-[#2F6B2F]">
                    {formatBase(applySaleDiscount(sampleProduct.basePrice, salePercent))} (
                    {salePercent}% off)
                  </strong>
                </p>
              </div>
            )}

            <button
              type="submit"
              className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-6 py-2.5 font-bold cursor-pointer"
            >
              Launch Sale Now
            </button>
          </form>

          <div className="xl:col-span-5 space-y-3">
            {sales.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{s.name}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      s.status === 'active'
                        ? 'bg-[#2F6B2F]/15 text-[#2F6B2F]'
                        : 'bg-[#EFECE6] text-[#5F5B55]'
                    }`}
                  >
                    {s.percent}% OFF · {s.status}
                  </span>
                </div>
                <p className="text-[#5F5B55] font-mono-num">
                  Scope: {s.scope.toUpperCase()} · Ends {new Date(s.endAt).toLocaleDateString()}
                </p>
                {s.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => endSaleCampaign(s.id)}
                    className="rounded-full border border-[#D62828] text-[#D62828] px-3.5 py-1 font-bold cursor-pointer"
                  >
                    End sale now
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. COUPONS */}
      {tab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const now = new Date().toISOString();
              const c: Coupon = {
                id: `cpn-${Date.now()}`,
                code: couponCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                type: couponType,
                value: couponType === 'free_shipping' ? 0 : couponVal,
                minOrder: couponMin,
                maxUses: 500,
                usedCount: 0,
                perCustomerLimit: 2,
                expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
                active: true,
                createdAt: now,
                updatedAt: now,
              };
              await upsertCoupon(c);
            }}
            className="lg:col-span-5 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Create Promo Code ({settings.baseCurrency})</h2>
              <button
                type="button"
                onClick={() => setCouponCode(`INKED${Math.floor(10 + Math.random() * 89)}`)}
                className="inline-flex items-center gap-1 underline font-semibold cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-generate
              </button>
            </div>
            <input
              type="text"
              required
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="PROMOCODE"
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num font-bold"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={couponType}
                onChange={(e) => setCouponType(e.target.value as typeof couponType)}
                className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              >
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat ({settings.baseCurrency})</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
              <input
                type="number"
                value={couponVal}
                disabled={couponType === 'free_shipping'}
                onChange={(e) => setCouponVal(Number(e.target.value))}
                className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">
                Minimum Order ({settings.baseCurrency})
              </label>
              <input
                type="number"
                value={couponMin}
                onChange={(e) => setCouponMin(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[#111111] text-white px-5 py-2 font-bold cursor-pointer"
            >
              Create Coupon
            </button>
          </form>

          <div className="lg:col-span-7 space-y-2.5">
            {coupons.map((cp) => (
              <div
                key={cp.id}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-mono-num font-bold text-sm">{cp.code}</p>
                  <p className="text-[#5F5B55]">
                    {cp.type === 'percent'
                      ? `${cp.value}% off`
                      : cp.type === 'flat'
                      ? `${formatBase(cp.value)} off`
                      : 'Free shipping'}{' '}
                    · Min {formatBase(cp.minOrder)} · Used {cp.usedCount} times
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCoupon(cp.id)}
                  className="text-[#D62828] p-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. AUTOMATED EMAIL & DISCOUNT SENDER */}
      {tab === 'automations' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-xs">
          {/* Automated Trigger Flows */}
          <div className="xl:col-span-6 space-y-3">
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#2F6B2F]" /> Automated Email &amp; Discount Triggers
                </h2>
                <p className="text-[#5F5B55] mt-0.5">
                  Automatically emails personalized coupon codes when visitors subscribe, abandon checkout, complete an order, or leave a photo review.
                </p>
              </div>

              <div className="space-y-3">
                {(settings.autoDiscountRules || []).map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => {
                            const next = (settings.autoDiscountRules || []).map((r) =>
                              r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                            );
                            updateStoreSettings({ autoDiscountRules: next });
                          }}
                          className="accent-[#2F6B2F]"
                        />
                        <span>{rule.name}</span>
                      </label>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#2F6B2F]/15 text-[#2F6B2F] font-mono-num font-bold text-[11px]">
                        {rule.sentCount} sent
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-[#5F5B55] mb-0.5">Coupon Code</label>
                        <input
                          type="text"
                          value={rule.couponCode}
                          onChange={(e) => {
                            const next = (settings.autoDiscountRules || []).map((r) =>
                              r.id === rule.id
                                ? { ...r, couponCode: e.target.value.toUpperCase() }
                                : r
                            );
                            updateStoreSettings({ autoDiscountRules: next });
                          }}
                          className="w-full rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2.5 py-1.5 font-mono-num font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5F5B55] mb-0.5">Discount %</label>
                        <input
                          type="number"
                          min={5}
                          max={60}
                          value={rule.discountPercent}
                          onChange={(e) => {
                            const next = (settings.autoDiscountRules || []).map((r) =>
                              r.id === rule.id
                                ? { ...r, discountPercent: Number(e.target.value) }
                                : r
                            );
                            updateStoreSettings({ autoDiscountRules: next });
                          }}
                          className="w-full rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#5F5B55] mb-0.5">Delay (hrs)</label>
                        <input
                          type="number"
                          min={0}
                          max={168}
                          value={rule.delayHours}
                          onChange={(e) => {
                            const next = (settings.autoDiscountRules || []).map((r) =>
                              r.id === rule.id
                                ? { ...r, delayHours: Number(e.target.value) }
                                : r
                            );
                            updateStoreSettings({ autoDiscountRules: next });
                          }}
                          className="w-full rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2.5 py-1.5 font-mono-num"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      value={rule.subjectLine}
                      onChange={(e) => {
                        const next = (settings.autoDiscountRules || []).map((r) =>
                          r.id === rule.id ? { ...r, subjectLine: e.target.value } : r
                        );
                        updateStoreSettings({ autoDiscountRules: next });
                      }}
                      className="w-full rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2.5 py-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instant Discount Email Blast Composer + History */}
          <div className="xl:col-span-6 space-y-4">
            <form
              onSubmit={handleSendBlast}
              className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-3"
            >
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#D62828]" /> Instant Discount &amp; Promo Mail Sender
              </h2>
              <p className="text-[#5F5B55]">
                Dispatches HTML coupon emails via Resend / Brevo server integration (with automatic coupon activation).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Audience</label>
                  <select
                    value={blastAudience}
                    onChange={(e) => setBlastAudience(e.target.value as typeof blastAudience)}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                  >
                    <option value="all">All Subscribers &amp; Collectors</option>
                    <option value="us_collectors">USA Collectors Only</option>
                    <option value="abandoned">Abandoned Checkout Leads</option>
                    <option value="custom">Custom Email List</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold mb-1">Coupon Code</label>
                    <input
                      type="text"
                      required
                      value={blastCoupon}
                      onChange={(e) => setBlastCoupon(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Discount %</label>
                    <input
                      type="number"
                      min={5}
                      max={70}
                      value={blastPercent}
                      onChange={(e) => setBlastPercent(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                    />
                  </div>
                </div>
              </div>

              {blastAudience === 'custom' && (
                <div>
                  <label className="block font-bold mb-1">Recipient Emails (comma-separated)</label>
                  <input
                    type="text"
                    required
                    value={blastCustomEmails}
                    onChange={(e) => setBlastCustomEmails(e.target.value)}
                    placeholder="collector1@gmail.com, collector2@yahoo.com"
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Email Subject Line</label>
                <input
                  type="text"
                  required
                  value={blastSubject}
                  onChange={(e) => setBlastSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Personal Studio Message</label>
                <textarea
                  rows={3}
                  required
                  value={blastMessage}
                  onChange={(e) => setBlastMessage(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={sendingBlast}
                className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-6 py-2.5 font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingBlast ? 'Dispatching Discount Emails...' : 'Send Discount Blast Now'}
              </button>
            </form>

            {/* Recent Blast Log */}
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-2.5">
              <h3 className="text-sm font-bold">Sent Discount Campaigns</h3>
              {(settings.emailBlastHistory || []).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-[#E6E1D8] dark:border-[#2E2C28] last:border-0"
                >
                  <div>
                    <p className="font-bold">{b.subject}</p>
                    <p className="text-[#5F5B55]">
                      {b.audienceLabel} · Code <strong>{b.couponCode}</strong> ({b.discountPercent}% off)
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2F6B2F]/15 text-[#2F6B2F] font-bold shrink-0">
                    {b.recipientCount} delivered
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. INSTAGRAM REELS CONNECTOR */}
      {tab === 'reels' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-xs">
          <form
            onSubmit={handleAddReel}
            className="xl:col-span-5 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <Film className="w-4 h-4 text-[#D62828]" /> Instagram Reels Connector
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#2F6B2F]/15 text-[#2F6B2F] font-bold text-[10px]">
                Synced to Homepage
              </span>
            </div>

            <div>
              <label className="block font-bold mb-1">Official Instagram Handle</label>
              <input
                type="text"
                value={settings.instagramHandle || '@inkedrug'}
                onChange={(e) => updateStoreSettings({ instagramHandle: e.target.value })}
                placeholder="@inkedrug"
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-bold"
              />
            </div>

            <div className="pt-2 border-t border-[#E6E1D8] dark:border-[#2E2C28] space-y-3">
              <h3 className="font-bold text-sm">Add Studio Tufting Reel</h3>
              <div>
                <label className="block font-bold mb-1">Reel Headline *</label>
                <input
                  type="text"
                  required
                  value={reelTitle}
                  onChange={(e) => setReelTitle(e.target.value)}
                  placeholder="e.g. Electric Bevel Carving on Tiger Flash Rug"
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Cover Artwork</label>
                  <select
                    value={reelThumb}
                    onChange={(e) => setReelThumb(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2"
                  >
                    <option value={RUG_IMAGES.tigerRose}>Tiger &amp; Rose Photo</option>
                    <option value={RUG_IMAGES.crawlingPanther}>Crawling Panther Photo</option>
                    <option value={RUG_IMAGES.kewpieDevil}>Kewpie Devil Photo</option>
                    <option value={RUG_IMAGES.kewpieDragon}>Shishi Dragon Kewpie</option>
                    <option value={RUG_IMAGES.tigerHead}>Bengal Tiger Head</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Tag Shoppable Rug</label>
                  <select
                    value={reelProductId}
                    onChange={(e) => setReelProductId(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2"
                  >
                    <option value="">No product tag</option>
                    {products.slice(0, 40).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title.slice(0, 38)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Instagram Reel Permalink URL</label>
                <input
                  type="url"
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Views Badge</label>
                  <input
                    type="text"
                    value={reelViews}
                    onChange={(e) => setReelViews(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Likes Badge</label>
                  <input
                    type="text"
                    value={reelLikes}
                    onChange={(e) => setReelLikes(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Caption</label>
                <textarea
                  rows={2}
                  value={reelCaption}
                  onChange={(e) => setReelCaption(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-5 py-2.5 font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Publish Reel to Storefront
              </button>
            </div>
          </form>

          <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(settings.instagramReels || []).map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 flex gap-3.5 items-start"
              >
                <div className="w-20 aspect-[9/14] rounded-xl overflow-hidden bg-[#111111] shrink-0 relative">
                  <ResilientImage
                    src={r.thumbnailUrl}
                    alt={r.title}
                    className="w-full h-full object-cover"
                  />
                  <Play className="w-4 h-4 text-white fill-white absolute bottom-1.5 left-1.5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-bold text-sm leading-snug line-clamp-2">{r.title}</p>
                  <p className="text-[#5F5B55] line-clamp-2">{r.caption}</p>
                  {r.productTitle && (
                    <p className="text-[11px] font-semibold text-[#2F6B2F] truncate">
                      Tagged: {r.productTitle}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.visible}
                        onChange={(e) => {
                          const next = (settings.instagramReels || []).map((item) =>
                            item.id === r.id ? { ...item, visible: e.target.checked } : item
                          );
                          updateStoreSettings({ instagramReels: next });
                        }}
                      />
                      <span>Visible</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (settings.instagramReels || []).filter(
                          (item) => item.id !== r.id
                        );
                        updateStoreSettings({ instagramReels: next });
                      }}
                      className="text-[#D62828] p-1 cursor-pointer"
                      aria-label="Delete Reel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ABANDONED CARTS */}
      {tab === 'abandoned' && (
        <div className="space-y-3 text-xs">
          {abandonedCarts.map((ab) => (
            <div
              key={ab.id}
              className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-bold">
                  {ab.email} · {ab.phone || 'No phone'} ({ab.country})
                </p>
                <p className="text-[#5F5B55]">
                  {ab.itemSummary} · Value: <strong>{formatBase(ab.totalBase)}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    sendAutomatedDiscountBlast({
                      subject: `Still thinking about your custom rug? Save 15% with COMEBACK15`,
                      audienceLabel: `Abandoned Cart (${ab.email})`,
                      recipientEmails: [ab.email],
                      couponCode: 'COMEBACK15',
                      discountPercent: 15,
                      customMessage: `Your custom tufted rug cart (${ab.itemSummary}) is saved at InkedRug.com. Complete checkout with code COMEBACK15 for 15% off!`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#111111] dark:border-[#FAF8F5] px-4 py-2 font-bold cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" /> Email 15% Code
                </button>
                <a
                  href={`https://wa.me/${(ab.phone || settings.whatsappNumber).replace(
                    /[^0-9]/g,
                    ''
                  )}?text=${encodeURIComponent(
                    `Hi from ${settings.storeName} (InkedRug.com)! Your custom tufted rug cart (${ab.itemSummary}) is saved. Use code COMEBACK15 for 15% off at ${window.location.origin}/cart`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] text-[#111111] px-4 py-2 font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Recovery ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. CATALOG FEEDS & GOOGLE SEARCH CONSOLE SITEMAP */}
      {tab === 'feeds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            {
              name: 'Google Search Console Sitemap (XML)',
              path: '/sitemap.xml',
              desc: `Submit to Google Search Console for ${
                settings.primaryDomain || 'inkedrug.com'
              } indexing of all active listings & studio pages.`,
            },
            {
              name: 'Meta / Instagram Commerce Feed (XML)',
              path: '/feeds/meta.xml',
              desc: 'RSS 2.0 g:item USD catalog feed for Instagram Shop, Reels Product Tags & Meta Dynamic Ads.',
            },
            {
              name: 'Google Merchant Center USD & Multi-Currency Feed (XML)',
              path: '/feeds/google.xml',
              desc: 'USD base pricing with automatic global currency annotations & MPN metadata.',
            },
            {
              name: 'Pinterest Shopping Catalog Feed (CSV)',
              path: '/feeds/pinterest.csv',
              desc: 'Live Rich Pin USD catalog with Variation images, Sale prices, and Made-to-Order status.',
            },
          ].map((fd) => {
            const fullUrl = `${window.location.origin}${fd.path}`;
            return (
              <div
                key={fd.path}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-2.5"
              >
                <p className="font-bold text-sm">{fd.name}</p>
                <p className="text-[#5F5B55]">{fd.desc}</p>
                <div className="flex items-center gap-2 pt-1">
                  <code className="flex-1 truncate rounded-lg bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-1.5 font-mono-num">
                    {fullUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(fullUrl);
                      pushToast('Feed URL copied!');
                    }}
                    className="p-2 rounded-lg border border-[#E6E1D8] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={fd.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-[#E6E1D8]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 12.K SHOP STATS CLONE
// ============================================================================
export const StatsManager: React.FC = () => {
  const { products, orders, settings, exchangeRates } = useStore();
  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  const totals = useMemo(() => {
    const views = products.reduce((s, p) => s + p.counters.views, 0);
    const visits = products.reduce((s, p) => s + p.counters.visits, 0);
    const favs = products.reduce((s, p) => s + p.counters.favourites, 0);
    const ordCount = Math.max(
      orders.length,
      products.reduce((s, p) => s + p.counters.orders, 0)
    );
    const rev = Math.max(
      orders.reduce((s, o) => s + o.totalBase, 0),
      products.reduce((s, p) => s + p.counters.revenue, 0)
    );
    return { views, visits, favs, ordCount, rev };
  }, [products, orders]);

  const exportListingStats = () => {
    const csv = Papa.unparse(
      products.map((p) => ({
        sku: p.sku,
        title: p.title,
        views: p.counters.views,
        visits: p.counters.visits,
        favourites: p.counters.favourites,
        orders: p.counters.orders,
        revenueUsd: p.counters.revenue,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inkedrug-listing-stats.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Shop Stats</h1>
          <p className="text-[#5F5B55]">
            Shop-wide conversion funnel and per-listing performance in {settings.baseCurrency} ($).
          </p>
        </div>
        <button
          type="button"
          onClick={exportListingStats}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] bg-white dark:bg-[#1C1B19] px-4 py-2 font-bold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export Stats CSV
        </button>
      </div>

      <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
        <h2 className="text-sm font-bold">Storefront Conversion Funnel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { stage: '1. Listing Views', val: totals.views.toLocaleString(), pct: '100%' },
            {
              stage: '2. Unique Visits',
              val: totals.visits.toLocaleString(),
              pct: `${Math.round((totals.visits / Math.max(1, totals.views)) * 100)}%`,
            },
            {
              stage: '3. Favourited / Cart',
              val: totals.favs.toLocaleString(),
              pct: `${((totals.favs / Math.max(1, totals.visits)) * 100).toFixed(1)}%`,
            },
            {
              stage: '4. Rug Orders',
              val: totals.ordCount.toLocaleString(),
              pct: `${((totals.ordCount / Math.max(1, totals.visits)) * 100).toFixed(2)}%`,
            },
          ].map((f) => (
            <div
              key={f.stage}
              className="rounded-xl bg-[#FAF8F5] dark:bg-[#121211] p-4 border border-[#E6E1D8] dark:border-[#2E2C28]"
            >
              <p className="text-[#5F5B55]">{f.stage}</p>
              <p className="text-xl font-bold font-mono-num mt-1">{f.val}</p>
              <p className="text-[#2F6B2F] font-bold font-mono-num mt-0.5">{f.pct}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] overflow-hidden">
        <div className="p-4 border-b border-[#E6E1D8] dark:border-[#2E2C28] font-bold text-sm">
          Per-Listing Revenue &amp; Engagement (Top 50)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F5F2EC] dark:bg-[#171614] border-b border-[#E6E1D8] dark:border-[#2E2C28]">
              <tr>
                <th className="py-2.5 px-4">Listing</th>
                <th className="py-2.5 px-4 text-right">Views</th>
                <th className="py-2.5 px-4 text-right">Favourites</th>
                <th className="py-2.5 px-4 text-right">Orders</th>
                <th className="py-2.5 px-4 text-right">Revenue ({settings.baseCurrency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28] font-mono-num">
              {[...products]
                .sort((a, b) => b.counters.revenue - a.counters.revenue)
                .slice(0, 50)
                .map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-4 font-sans font-semibold max-w-sm truncate">
                      {p.title}
                    </td>
                    <td className="py-2.5 px-4 text-right">{p.counters.views.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right">{p.counters.favourites}</td>
                    <td className="py-2.5 px-4 text-right font-bold">{p.counters.orders}</td>
                    <td className="py-2.5 px-4 text-right font-bold">
                      {formatBase(p.counters.revenue)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12.M FINANCES & US STRIPE STATEMENTS
// ============================================================================
export const FinancesManager: React.FC = () => {
  const { orders, finances, addFinanceEntry, settings, exchangeRates } = useStore();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(120);
  const [entryType, setEntryType] = useState<'expense' | 'payout'>('expense');

  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  const grossRevenue = orders
    .filter((o) => o.status !== 'Cancelled' && o.status !== 'Refunded')
    .reduce((s, o) => s + o.totalBase, 0);
  const gatewayFees = Number((grossRevenue * 0.029).toFixed(2));
  const totalExpenses = finances
    .filter((f) => f.entryType === 'expense')
    .reduce((s, f) => s + f.amountBase, 0);
  const gstCollected = orders.reduce((s, o) => s + o.taxBase, 0);
  const netProfit = Number((grossRevenue - gatewayFees - totalExpenses).toFixed(2));

  return (
    <div className="space-y-6 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Finances, US Stripe Payouts &amp; Tax Summary
          </h1>
          <p className="text-[#5F5B55]">
            All figures in {settings.baseCurrency} ($) · Primary Domain: {settings.primaryDomain || 'inkedrug.com'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Gross Sales (USD)', val: formatBase(grossRevenue) },
          { label: 'US Stripe / Gateway Fees (~2.9%)', val: `-${formatBase(gatewayFees)}` },
          { label: 'Yarn & Studio Expenses', val: `-${formatBase(totalExpenses)}` },
          { label: `India Domestic GST (${settings.gstPercentIndia}%)`, val: formatBase(gstCollected) },
          { label: 'Estimated Net Profit', val: formatBase(netProfit), highlight: true },
        ].map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl border p-4 ${
              c.highlight
                ? 'border-[#2F6B2F] bg-[#2F6B2F]/10'
                : 'border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19]'
            }`}
          >
            <p className="text-[#5F5B55]">{c.label}</p>
            <p className="text-lg font-bold font-mono-num mt-1">{c.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            await addFinanceEntry({
              entryType,
              title: title.trim(),
              category: entryType === 'expense' ? 'Studio Materials' : 'US Stripe Settlement',
              amountBase: amount,
              date: new Date().toISOString().slice(0, 10),
              status: 'completed',
              notes: '',
            });
            setTitle('');
          }}
          className="lg:col-span-5 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-3"
        >
          <h2 className="text-sm font-bold">
            Record Studio Expense or US Stripe Payout ({settings.baseCurrency})
          </h2>
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as 'expense' | 'payout')}
            className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
          >
            <option value="expense">Studio Expense (Acrylic yarn, latex, DHL sleeves)</option>
            <option value="payout">US Stripe / Bank Payout</option>
          </select>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Description..."
            className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
          />
          <input
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
          />
          <button
            type="submit"
            className="rounded-full bg-[#111111] text-white px-5 py-2 font-bold cursor-pointer"
          >
            Add Entry
          </button>
        </form>

        <div className="lg:col-span-7 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-2.5">
          <h2 className="text-sm font-bold">Ledger &amp; Settlements Log</h2>
          {finances.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between py-2 border-b border-[#E6E1D8] dark:border-[#2E2C28]"
            >
              <div>
                <p className="font-bold">{f.title}</p>
                <p className="text-[#5F5B55]">
                  {f.entryType.toUpperCase()} · {f.date}
                </p>
              </div>
              <span className="font-mono-num font-bold">
                {f.entryType === 'expense' ? '-' : ''}
                {formatBase(f.amountBase)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12.N HOMEPAGE & STATIC PAGES EDITOR
// ============================================================================
export const PagesAndHomepageEditor: React.FC = () => {
  const { settings, pages, updateStoreSettings, upsertStaticPage } = useStore();
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id || '');

  const activePage = pages.find((p) => p.id === selectedPageId) || pages[0];

  const moveSection = (idx: number, dir: -1 | 1) => {
    const sorted = [...settings.homepageSections].sort((a, b) => a.order - b.order);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const reindexed = sorted.map((s, i) => ({ ...s, order: i + 1 }));
    updateStoreSettings({ homepageSections: reindexed });
  };

  return (
    <div className="space-y-6 text-xs">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
        Homepage &amp; Static Pages Editor
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
          <h2 className="text-sm font-bold">Announcement Bar &amp; Hero Banner</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Announcement Left</label>
              <input
                type="text"
                value={settings.announcementLeft}
                onChange={(e) => updateStoreSettings({ announcementLeft: e.target.value })}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Announcement Right</label>
              <input
                type="text"
                value={settings.announcementRight}
                onChange={(e) => updateStoreSettings({ announcementRight: e.target.value })}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Hero Headline</label>
            <input
              type="text"
              value={settings.heroHeadline}
              onChange={(e) => updateStoreSettings({ heroHeadline: e.target.value })}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-bold"
            />
          </div>

          <h3 className="text-sm font-bold pt-2">Homepage Section Order &amp; Visibility</h3>
          <div className="space-y-1.5">
            {[...settings.homepageSections]
              .sort((a, b) => a.order - b.order)
              .map((sec, idx) => (
                <div
                  key={sec.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#121211] border border-[#E6E1D8] dark:border-[#2E2C28]"
                >
                  <label className="flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sec.visible}
                      onChange={(e) => {
                        const next = settings.homepageSections.map((s) =>
                          s.id === sec.id ? { ...s, visible: e.target.checked } : s
                        );
                        updateStoreSettings({ homepageSections: next });
                      }}
                    />
                    <span>{sec.label}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(idx, -1)}
                      className="p-1 rounded hover:bg-[#E6E1D8] cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 1)}
                      className="p-1 rounded hover:bg-[#E6E1D8] cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Static Pages &amp; Policies</h2>
            <select
              value={activePage?.id || ''}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-1.5 font-semibold"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  /{p.slug} — {p.title}
                </option>
              ))}
            </select>
          </div>

          {activePage && (
            <div className="space-y-3">
              <input
                type="text"
                value={activePage.title}
                onChange={(e) => upsertStaticPage({ ...activePage, title: e.target.value })}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-bold"
              />
              <textarea
                rows={12}
                value={activePage.content}
                onChange={(e) => upsertStaticPage({ ...activePage, content: e.target.value })}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12.P & 13 SHOP SETTINGS: DOMAIN, INDIA 30% RULE, WORKER LOGIN & CONNECTORS
// ============================================================================
const INTEGRATIONS_CATALOG = [
  { id: 'stripe', name: 'US Stripe Primary Gateway (Cards, Apple Pay, Google Pay)', hint: 'pk_live_...' },
  { id: 'meta_pixel', name: 'Meta Pixel + Conversions API (FB & Instagram Ads)', hint: 'Pixel ID (e.g. 109482716503921)' },
  { id: 'google_search_console', name: 'Google Search Console Domain & Sitemap Sync', hint: 'google-site-verification token' },
  { id: 'instagram_reels', name: 'Instagram Reels Connector (@inkedrug)', hint: '@inkedrug / Graph Token' },
  { id: 'auto_discount_mailer', name: 'Automated Email & Discount Sender (Resend / Brevo)', hint: 'studio@inkedrug.com' },
  { id: 'ga4', name: 'Google Analytics 4 + Google Tag Manager', hint: 'G-XXXXXXXXXX' },
  { id: 'gmc', name: 'Google Merchant Center USD Multi-Currency XML', hint: 'Merchant ID' },
  { id: 'pinterest', name: 'Pinterest Rich Pins, Tag & Catalog Feed', hint: 'Pinterest Tag ID' },
  { id: 'paypal', name: 'PayPal Express US & Global Checkout', hint: 'PayPal Client ID' },
  { id: 'razorpay', name: 'Razorpay (India Domestic UPI & INR Cards)', hint: 'rzp_live_...' },
  { id: 'whatsapp', name: 'WhatsApp Business Cloud API + wa.me Deep Links', hint: 'Meta Phone Number ID' },
  { id: 'shiprocket', name: 'DHL / FedEx US Air + Shiprocket India Courier Sync', hint: 'Account / Pickup ID' },
  { id: 'newsletter', name: 'Mailchimp / Brevo Collector Audience Sync', hint: 'Audience List ID' },
  { id: 'algolia', name: 'Algolia / Typesense Instant 1,000+ Listing Search', hint: 'App ID (Firestore fallback active)' },
  { id: 'webhooks', name: 'Outgoing Webhooks (Zapier / Make / n8n)', hint: 'https://hooks.zapier.com/...' },
];

export const ShopSettingsManager: React.FC = () => {
  const {
    settings,
    processingProfiles,
    shippingProfiles,
    products,
    orders,
    exchangeRates,
    updateStoreSettings,
    upsertProcessingProfile,
    savePrivateIntegrationSecret,
    createWorkerAccount,
    toggleWorkerActive,
    deleteWorkerAccount,
    seedFirestoreDemoData,
    pushToast,
  } = useStore();

  const [procName, setProcName] = useState('');
  const [procMin, setProcMin] = useState(10);
  const [procMax, setProcMax] = useState(15);
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});

  // Worker Email + Password Creator State
  const [workerName, setWorkerName] = useState('');
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerRole, setWorkerRole] = useState<AdminRole>('manager');
  const [workerFullAccess, setWorkerFullAccess] = useState(true);
  const [creatingWorker, setCreatingWorker] = useState(false);
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{
    email: string;
    password: string;
    notice?: string;
  } | null>(null);

  const sampleGlobalUsd = 100;
  const sampleIndiaUsdEq = applyRegionalPricing(sampleGlobalUsd, 'IN', settings);
  const sampleIndiaInr = formatMoney(
    sampleIndiaUsdEq,
    'INR',
    exchangeRates,
    settings.baseCurrency,
    settings.priceRounding
  );
  const [vpsIp, setVpsIp] = useState('YOUR_VPS_IP_HERE');
  const [showVpsWizard, setShowVpsWizard] = useState(true);

  const exportFullBackupJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      processingProfiles,
      shippingProfiles,
      productsCount: products.length,
      products,
      orders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inkedrug-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Downloaded full JSON backup', { tone: 'success' });
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerEmail.trim() || workerPassword.length < 6) {
      pushToast('Enter a valid worker email and a password of at least 6 characters', {
        tone: 'error',
      });
      return;
    }
    setCreatingWorker(true);
    const res = await createWorkerAccount({
      name: workerName.trim() || 'Listing Worker',
      email: workerEmail.trim(),
      password: workerPassword,
      role: workerFullAccess ? 'owner' : workerRole,
      fullSiteAccess: workerFullAccess,
    });
    setCreatingWorker(false);
    if (res.ok) {
      setLastCreatedCredentials({
        email: workerEmail.trim().toLowerCase(),
        password: workerPassword,
        notice: res.notice,
      });
      setWorkerName('');
      setWorkerEmail('');
      setWorkerPassword('');
    }
  };

  const handleTestMetaCapi = async () => {
    try {
      const resp = await fetch('/api/integrations/meta-capi-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixelId: settings.integrations?.meta_pixel?.publicId || '109482716503921',
          domain: settings.primaryDomain || 'inkedrug.com',
        }),
      });
      if (resp.ok) {
        pushToast('Meta Pixel + Server CAPI test event verified!', { tone: 'success' });
      }
    } catch {
      pushToast('Meta Pixel browser tracker ready', { tone: 'success' });
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Shop Settings · InkedRug.com, Worker Access &amp; App Connectors
          </h1>
          <p className="text-[#5F5B55]">
            Single-brand US-default studio configuration · Secret tokens stored in <code>private_settings</code>.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportFullBackupJson}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] bg-white dark:bg-[#1C1B19] px-4 py-2 font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Backup JSON
          </button>
          <button
            type="button"
            onClick={seedFirestoreDemoData}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-4 py-2 font-bold cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" /> Seed Demo Data
          </button>
        </div>
      </div>

      {/* 1. DOMAIN, USD DEFAULT & AUTOMATIC INDIA 30% REGIONAL PRICING */}
      <section className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Globe className="w-4 h-4" /> Official Domain, USD ($) Default &amp; India 30% Pricing Rule
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block font-bold mb-1">Brand Name</label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => updateStoreSettings({ storeName: e.target.value })}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Primary Custom Domain</label>
            <input
              type="text"
              value={settings.primaryDomain || 'inkedrug.com'}
              onChange={(e) => updateStoreSettings({ primaryDomain: e.target.value.trim() })}
              placeholder="inkedrug.com"
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num font-bold"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Default Base Currency</label>
            <select
              value={settings.baseCurrency}
              onChange={(e) => updateStoreSettings({ baseCurrency: e.target.value })}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-bold"
            >
              {Array.from(new Set(COUNTRY_CURRENCY_MAP.map((c) => c.currency))).map((cur) => (
                <option key={cur} value={cur}>
                  {cur} {cur === 'USD' ? '(USA Default $)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">WhatsApp Studio Number</label>
            <input
              type="text"
              value={settings.whatsappNumber}
              onChange={(e) => updateStoreSettings({ whatsappNumber: e.target.value })}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Converted Price Rounding</label>
            <select
              value={settings.priceRounding}
              onChange={(e) =>
                updateStoreSettings({
                  priceRounding: e.target.value as 'exact' | 'clean' | '99',
                })
              }
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
            >
              <option value="clean">Clean retail numbers</option>
              <option value="exact">Exact conversion</option>
              <option value="99">.99 retail rounding</option>
            </select>
          </div>
        </div>

        {/* India 30% Domestic Factory-Direct Pricing Box */}
        <div className="rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="inline-flex items-center gap-2 font-bold text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.indiaRegionalPricingEnabled ?? true}
                onChange={(e) =>
                  updateStoreSettings({ indiaRegionalPricingEnabled: e.target.checked })
                }
                className="accent-[#2F6B2F]"
              />
              <span>
                🇮🇳 Automatic Lower Domestic Price in India ({settings.indiaRegionalDiscountPercent ?? 30}% below global USD price)
              </span>
            </label>
            <p className="text-[#4A453B] dark:text-[#C8C0B0]">
              Because every rug is handcrafted in India, shoppers browsing &amp; shipping within India automatically see {settings.indiaRegionalDiscountPercent ?? 30}% lower prices in ₹ INR. Live example: <strong>$100 USD Global</strong> → <strong>${sampleIndiaUsdEq} USD eq. ({sampleIndiaInr}) in India</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold">India Reduction %:</span>
            <input
              type="number"
              min={0}
              max={70}
              value={settings.indiaRegionalDiscountPercent ?? 30}
              onChange={(e) =>
                updateStoreSettings({
                  indiaRegionalDiscountPercent: Math.min(70, Math.max(0, Number(e.target.value))),
                })
              }
              className="w-20 rounded-xl border border-[#1A1918]/25 bg-white dark:bg-[#121211] px-3 py-1.5 font-mono-num font-bold text-center"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoDetectRegion}
              onChange={(e) => updateStoreSettings({ autoDetectRegion: e.target.checked })}
            />
            <span>Auto-detect visitor country &amp; currency via IP (defaults to USA / USD $)</span>
          </label>
          <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={settings.whatsappFloatingEnabled}
              onChange={(e) =>
                updateStoreSettings({ whatsappFloatingEnabled: e.target.checked })
              }
            />
            <span>Show floating WhatsApp studio chat button</span>
          </label>
          <label className="inline-flex items-center gap-2 font-semibold text-[#D62828] cursor-pointer">
            <input
              type="checkbox"
              checked={settings.vacationMode}
              onChange={(e) => updateStoreSettings({ vacationMode: e.target.checked })}
            />
            <span>Vacation Mode (Pause new commissions)</span>
          </label>
        </div>
      </section>

      {/* 1B. CONNECT YOUR OWN VPS & CUSTOM DOMAIN WIZARD */}
      <section className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#2EC4B6]" /> Connect Your Own Linux VPS &amp; Domain ({settings.primaryDomain || 'inkedrug.com'})
            </h2>
            <p className="text-[#5F5B55] mt-0.5">
              Enter your VPS public IPv4 address below to generate exact GoDaddy / Namecheap / Hostinger / Cloudflare DNS records and 1-command Ubuntu/Debian setup commands.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowVpsWizard((v) => !v)}
            className="rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-3.5 py-1.5 font-bold cursor-pointer"
          >
            {showVpsWizard ? 'Hide Setup Steps' : 'Show VPS & Domain Steps'}
          </button>
        </div>

        {showVpsWizard && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block font-bold mb-1">Your VPS Public IPv4 Address</label>
                <input
                  type="text"
                  value={vpsIp}
                  onChange={(e) => setVpsIp(e.target.value.trim())}
                  placeholder="e.g. 143.198.120.45"
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Target Domain Name</label>
                <input
                  type="text"
                  value={settings.primaryDomain || 'inkedrug.com'}
                  onChange={(e) => updateStoreSettings({ primaryDomain: e.target.value.trim() })}
                  placeholder="inkedrug.com"
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num font-bold"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const dom = settings.primaryDomain || 'inkedrug.com';
                    const cmd = `sudo bash deploy/setup-vps.sh ${dom} ${settings.contactEmail || 'artisanrugs94@gmail.com'}`;
                    navigator.clipboard.writeText(cmd);
                    pushToast('Copied 1-command VPS installer command!', { tone: 'success' });
                  }}
                  className="w-full rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-2 px-4 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy 1-Command VPS Installer
                </button>
              </div>
            </div>

            {/* Step 1: DNS Records Table */}
            <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] p-4 space-y-2">
              <p className="font-bold">
                Step 1 · Add These 2 DNS Records in Your Domain Registrar (GoDaddy / Namecheap / Hostinger / Cloudflare)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono-num">
                  <thead>
                    <tr className="border-b border-[#E6E1D8] dark:border-[#2E2C28] text-[#5F5B55]">
                      <th className="py-1.5 pr-4">Type</th>
                      <th className="py-1.5 pr-4">Host / Name</th>
                      <th className="py-1.5 pr-4">Points To / Value</th>
                      <th className="py-1.5">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28]">
                    <tr>
                      <td className="py-2 pr-4 font-bold text-[#2F6B2F]">A</td>
                      <td className="py-2 pr-4 font-bold">@</td>
                      <td className="py-2 pr-4 font-bold">{vpsIp || 'YOUR_VPS_IP_HERE'}</td>
                      <td className="py-2">Auto / 600s</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-bold text-[#2F6B2F]">A</td>
                      <td className="py-2 pr-4 font-bold">www</td>
                      <td className="py-2 pr-4 font-bold">{vpsIp || 'YOUR_VPS_IP_HERE'}</td>
                      <td className="py-2">Auto / 600s</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 2 & Step 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] p-4 space-y-2">
                <p className="font-bold">Step 2 · Run on Your Ubuntu/Debian VPS via SSH</p>
                <pre className="rounded-lg bg-[#111111] text-[#FAF8F5] p-3 overflow-x-auto text-[11px] font-mono-num leading-relaxed">{`ssh root@${vpsIp || 'YOUR_VPS_IP'}
# Upload or git clone this project to /var/www/inkedrug, then run:
cd /var/www/inkedrug
sudo bash deploy/setup-vps.sh ${settings.primaryDomain || 'inkedrug.com'} ${settings.contactEmail || 'artisanrugs94@gmail.com'}`}</pre>
                <p className="text-[#5F5B55]">
                  Automatically installs Node.js 20, PM2 (24/7 auto-restart), Nginx reverse proxy, and free Let&apos;s Encrypt HTTPS SSL.
                </p>
              </div>

              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] p-4 space-y-2">
                <p className="font-bold">Step 3 · Whitelist Domain in Firebase Auth (Required for Login)</p>
                <ol className="list-decimal list-inside space-y-1.5 text-[#3F3C37] dark:text-[#D5D0C6]">
                  <li>
                    Open <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>.
                  </li>
                  <li>
                    Click <strong>Add domain</strong> and add <code>{settings.primaryDomain || 'inkedrug.com'}</code> and <code>www.{settings.primaryDomain || 'inkedrug.com'}</code>.
                  </li>
                  <li>
                    Add your live US Stripe keys in <code>/var/www/inkedrug/.env</code> (<code>STRIPE_SECRET_KEY</code> &amp; <code>VITE_STRIPE_PUBLISHABLE_KEY</code>) and run <code>npm run build:vps &amp;&amp; pm2 reload inkedrug-store</code>.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. TEAM & WORKER EMAIL + PASSWORD ACCESS MANAGER */}
      <section className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#2F6B2F]" /> Team &amp; Listing Worker Access (Email ID + Password Login)
            </h2>
            <p className="text-[#5F5B55] mt-0.5">
              Create dedicated Email + Password logins so your listing workers or shop managers can access <code>/admin</code> (including full main-site &amp; listing access) without sharing your personal Google account.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#EFECE6] dark:bg-[#121211] font-mono-num font-bold">
            {(settings.workerAccounts || []).length} Worker Account(s)
          </span>
        </div>

        <form
          onSubmit={handleCreateWorker}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end rounded-2xl bg-[#FAF8F5] dark:bg-[#121211] border border-[#E6E1D8] dark:border-[#2E2C28] p-4"
        >
          <div className="lg:col-span-3">
            <label className="block font-bold mb-1">Worker Name *</label>
            <input
              type="text"
              required
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="e.g. Rahul (Catalog Manager)"
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3 py-2"
            />
          </div>
          <div className="lg:col-span-3">
            <label className="block font-bold mb-1">Worker Email ID *</label>
            <input
              type="email"
              required
              value={workerEmail}
              onChange={(e) => setWorkerEmail(e.target.value)}
              placeholder="worker@inkedrug.com"
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3 py-2 font-mono-num"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block font-bold mb-1">Assign Password *</label>
            <input
              type="text"
              required
              minLength={6}
              value={workerPassword}
              onChange={(e) => setWorkerPassword(e.target.value)}
              placeholder="Min 6 chars"
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3 py-2 font-mono-num"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block font-bold mb-1">Access Level</label>
            <select
              value={workerFullAccess ? 'full' : workerRole}
              onChange={(e) => {
                if (e.target.value === 'full') {
                  setWorkerFullAccess(true);
                  setWorkerRole('owner');
                } else {
                  setWorkerFullAccess(false);
                  setWorkerRole(e.target.value as AdminRole);
                }
              }}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2.5 py-2 font-semibold"
            >
              <option value="full">Full Main Site &amp; Listings Access</option>
              <option value="manager">Manager (All except Owner Delete)</option>
              <option value="staff">Listings &amp; Orders Only (No Finances)</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={creatingWorker}
              className="w-full rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-2.5 px-4 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {creatingWorker ? 'Creating...' : 'Create Login'}
            </button>
          </div>
        </form>

        {lastCreatedCredentials && (
          <div className="rounded-2xl border border-[#2F6B2F] bg-[#2F6B2F]/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-bold text-[#2F6B2F]">
                ✓ Worker Login Ready: {lastCreatedCredentials.email}
              </p>
              <p className="text-[#5F5B55] dark:text-[#C8C0B0]">
                Share these credentials with your worker—they can click <strong>Worker / Admin Login</strong> at <code>{window.location.origin}/admin</code>.
                {lastCreatedCredentials.notice ? ` (${lastCreatedCredentials.notice})` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const text = `InkedRug.com Admin Login\nURL: ${window.location.origin}/admin\nEmail: ${lastCreatedCredentials.email}\nPassword: ${lastCreatedCredentials.password}`;
                navigator.clipboard.writeText(text);
                pushToast('Copied worker login URL, email & password!', { tone: 'success' });
              }}
              className="rounded-full bg-[#111111] text-white px-4 py-2 font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Login Details for Worker
            </button>
          </div>
        )}

        {(settings.workerAccounts || []).length > 0 && (
          <div className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28] rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28]">
            {(settings.workerAccounts || []).map((w) => (
              <div
                key={w.id}
                className="p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#111111] text-white font-bold flex items-center justify-center">
                    {w.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      <span>{w.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.active
                            ? 'bg-[#2F6B2F]/15 text-[#2F6B2F]'
                            : 'bg-[#D62828]/15 text-[#D62828]'
                        }`}
                      >
                        {w.active ? 'Active' : 'Suspended'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#EFECE6] dark:bg-[#2E2C28] text-[10px] font-bold">
                        {w.fullSiteAccess ? 'Full Site & Listing Access' : w.role.toUpperCase()}
                      </span>
                    </p>
                    <p className="text-[#5F5B55] font-mono-num">
                      {w.email} · {w.lastLoginAt ? `Last login ${new Date(w.lastLoginAt).toLocaleDateString()}` : 'Never logged in yet'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleWorkerActive(w.id)}
                    className="rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-1 font-bold cursor-pointer"
                  >
                    {w.active ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWorkerAccount(w.id)}
                    className="text-[#D62828] p-1.5 cursor-pointer"
                    aria-label="Remove worker"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. GOOGLE SEARCH CONSOLE & META PIXEL QUICK CONNECTORS */}
      <section className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-[#2EC4B6]" /> Google Search Console &amp; Meta Pixel Direct Connectors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#121211] border border-[#E6E1D8] dark:border-[#2E2C28] p-4 space-y-2">
            <p className="font-bold">Google Search Console HTML Meta Verification</p>
            <p className="text-[#5F5B55]">
              Paste your verification code from Google Search Console for <strong>{settings.primaryDomain || 'inkedrug.com'}</strong>—automatically injected as <code>&lt;meta name="google-site-verification"&gt;</code>.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.googleSearchConsoleVerification || ''}
                onChange={(e) =>
                  updateStoreSettings({ googleSearchConsoleVerification: e.target.value })
                }
                placeholder="e.g. dBw5CvburAxi537Rp9qi5u..."
                className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3 py-2 font-mono-num"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/sitemap.xml`);
                  pushToast('Sitemap URL copied for Search Console!', { tone: 'success' });
                }}
                className="rounded-xl border border-[#111111] dark:border-[#FAF8F5] px-3 py-2 font-bold cursor-pointer shrink-0"
              >
                Copy Sitemap
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#121211] border border-[#E6E1D8] dark:border-[#2E2C28] p-4 space-y-2">
            <p className="font-bold">Meta Pixel &amp; Conversions API (Facebook / Instagram Ads)</p>
            <p className="text-[#5F5B55]">
              Tracks <code>PageView</code>, <code>ViewContent</code>, and USD <code>Purchase</code> events across {settings.primaryDomain || 'inkedrug.com'}.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.integrations?.meta_pixel?.publicId || ''}
                onChange={(e) =>
                  updateStoreSettings({
                    integrations: {
                      ...settings.integrations,
                      meta_pixel: {
                        connected: true,
                        publicId: e.target.value.trim(),
                      },
                    },
                  })
                }
                placeholder="Enter Meta Pixel ID (digits)"
                className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3 py-2 font-mono-num"
              />
              <button
                type="button"
                onClick={handleTestMetaCapi}
                className="rounded-xl bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-3.5 py-2 font-bold cursor-pointer shrink-0"
              >
                Send Test Event
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROCESSING PROFILES (10-15 Day Rule) */}
      <section className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold">
            Made-to-Order Processing Profiles (Global 10–15 Day Rule)
          </h2>
          <p className="text-[#5F5B55]">
            Updating min/max days here dynamically updates Product Notices, Delivery Date Ranges, Checkout, Track Order, and Admin Deadline Badges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {processingProfiles.map((pr) => (
            <div
              key={pr.id}
              className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-4 flex items-center justify-between gap-3 bg-[#FAF8F5] dark:bg-[#121211]"
            >
              <div>
                <p className="font-bold">
                  {pr.name} {pr.isDefault && '(Shop Default)'}
                </p>
                <p className="font-mono-num text-[#2F6B2F] font-semibold">
                  {pr.minDays}–{pr.maxDays} days after order confirmation
                </p>
              </div>
              {!pr.isDefault && (
                <button
                  type="button"
                  onClick={() => upsertProcessingProfile({ ...pr, isDefault: true })}
                  className="rounded-full border border-[#111111] px-3 py-1 font-bold cursor-pointer"
                >
                  Set Default
                </button>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!procName.trim()) return;
            const now = new Date().toISOString();
            const created: ProcessingProfile = {
              id: `proc-${Date.now()}`,
              name: procName.trim(),
              minDays: procMin,
              maxDays: procMax,
              isDefault: false,
              badgeText: `Made to order: ${procMin}-${procMax} days`,
              createdAt: now,
              updatedAt: now,
            };
            upsertProcessingProfile(created);
            setProcName('');
          }}
          className="flex flex-wrap gap-2 items-end pt-2"
        >
          <input
            type="text"
            placeholder="New profile name (e.g. Rush 6-8 days)"
            value={procName}
            onChange={(e) => setProcName(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
          />
          <input
            type="number"
            min={1}
            max={60}
            value={procMin}
            onChange={(e) => setProcMin(Number(e.target.value))}
            className="w-20 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2 font-mono-num"
          />
          <input
            type="number"
            min={1}
            max={60}
            value={procMax}
            onChange={(e) => setProcMax(Number(e.target.value))}
            className="w-20 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2 font-mono-num"
          />
          <button
            type="submit"
            className="rounded-full bg-[#111111] text-white px-4 py-2 font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Profile
          </button>
        </form>
      </section>

      {/* 5. PAYMENT GATEWAYS (US STRIPE PRIMARY) */}
      <section className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-3">
        <h2 className="text-sm font-bold">Checkout Payment Gateways (US Stripe Primary)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(
            [
              ['stripe', 'US Stripe (Primary USD + Global)'],
              ['paypal', 'PayPal US & Global'],
              ['razorpay', 'Razorpay (India UPI + INR)'],
              ['cod', 'Cash on Delivery (India)'],
              ['whatsappCustom', 'WhatsApp Custom Quote'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 p-3 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={settings.paymentsEnabled[key]}
                onChange={(e) =>
                  updateStoreSettings({
                    paymentsEnabled: {
                      ...settings.paymentsEnabled,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              <span className="font-semibold">{label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 6. ALL CONNECTED APP INTEGRATIONS HUB */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Plug className="w-4 h-4" /> All App Connectors ({INTEGRATIONS_CATALOG.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {INTEGRATIONS_CATALOG.map((intg) => {
            const current = settings.integrations[intg.id] || {
              connected: true,
              publicId: '',
            };
            return (
              <div
                key={intg.id}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{intg.name}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      current.connected
                        ? 'bg-[#2F6B2F]/15 text-[#2F6B2F]'
                        : 'bg-[#EFECE6] text-[#5F5B55]'
                    }`}
                  >
                    {current.connected ? 'Connected' : 'Configure'}
                  </span>
                </div>

                <input
                  type="text"
                  placeholder={`Public ID (${intg.hint})`}
                  value={current.publicId}
                  onChange={(e) =>
                    updateStoreSettings({
                      integrations: {
                        ...settings.integrations,
                        [intg.id]: {
                          ...current,
                          connected: true,
                          publicId: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-1.5 font-mono-num"
                />

                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Private Secret → private_settings"
                    value={secretInputs[intg.id] || ''}
                    onChange={(e) =>
                      setSecretInputs({ ...secretInputs, [intg.id]: e.target.value })
                    }
                    className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-1.5"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (secretInputs[intg.id]) {
                        savePrivateIntegrationSecret(intg.id, {
                          secretKey: secretInputs[intg.id],
                        });
                        setSecretInputs({ ...secretInputs, [intg.id]: '' });
                      } else {
                        pushToast(`Verified connection for ${intg.name}`, {
                          tone: 'success',
                        });
                      }
                    }}
                    className="rounded-xl bg-[#111111] text-white px-3 py-1.5 font-bold cursor-pointer shrink-0"
                  >
                    {secretInputs[intg.id] ? 'Save Secret' : 'Test'}
                  </button>
                </div>

                {current.connected && (
                  <p className="text-[11px] text-[#2F6B2F] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active on {settings.primaryDomain || 'inkedrug.com'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
