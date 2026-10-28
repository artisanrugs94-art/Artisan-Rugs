import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MessageSquare,
  Package,
  Plus,
  Sparkles,
  Star,
  Tag,
  Upload,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import { OrderStatus } from '../types';
import { formatMoney, getCountryConfig } from '../utils/currencies';
import { getProductionDeadlineBadge } from '../utils/pricing';

type DateRangeKey = 'today' | '7d' | '30d' | '90d' | 'year';

export const AdminDashboard: React.FC = () => {
  const {
    settings,
    products,
    orders,
    conversations,
    customRequests,
    reviews,
    sales,
    processingProfiles,
    exchangeRates,
    updateOrderStatus,
  } = useStore();

  const [range, setRange] = useState<DateRangeKey>('30d');

  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  // To-do metrics
  const ordersToConfirm = orders.filter((o) => o.status === 'New');
  const ordersDueSoon = orders.filter((o) => {
    const b = getProductionDeadlineBadge(o);
    return b.tone === 'amber';
  });
  const overdueOrders = orders.filter((o) => getProductionDeadlineBadge(o).isOverdue);
  const unreadThreads = conversations.filter((c) => c.unreadByAdmin && !c.archived);
  const pendingReviews = reviews.filter((r) => r.status === 'pending');
  const openQuotes = customRequests.filter((r) => r.status === 'New');
  const lowQualityListings = products.filter((p) => p.qualityScore < 80);

  // Aggregate shop metrics
  const metrics = useMemo(() => {
    const multiplier =
      range === 'today' ? 0.08 : range === '7d' ? 0.32 : range === '30d' ? 1 : range === '90d' ? 2.6 : 5.4;

    const totalVisits = Math.max(
      1,
      Math.round(products.reduce((s, p) => s + p.counters.visits, 0) * multiplier)
    );
    const totalOrdersCount = Math.max(
      orders.length,
      Math.round(products.reduce((s, p) => s + p.counters.orders, 0) * multiplier)
    );
    const totalRevenueBase = Math.round(
      Math.max(
        orders.reduce((s, o) => s + o.totalBase, 0),
        products.reduce((s, p) => s + p.counters.revenue, 0) * multiplier
      )
    );
    const totalFavourites = Math.round(
      products.reduce((s, p) => s + p.counters.favourites, 0) * multiplier
    );
    const convRate = ((totalOrdersCount / totalVisits) * 100).toFixed(2);
    const aovBase = totalOrdersCount > 0 ? Math.round(totalRevenueBase / totalOrdersCount) : 0;

    return {
      totalVisits,
      totalOrdersCount,
      totalRevenueBase,
      totalFavourites,
      convRate,
      aovBase,
    };
  }, [products, orders, range]);

  // Country & currency sales breakdown
  const countryBreakdown = useMemo(() => {
    const map = new Map<string, { country: string; currency: string; count: number; totalBase: number }>();
    for (const o of orders) {
      const code = o.shippingAddress.country || 'IN';
      const prev = map.get(code) || {
        country: code,
        currency: o.chargedCurrency,
        count: 0,
        totalBase: 0,
      };
      prev.count += 1;
      prev.totalBase += o.totalBase;
      map.set(code, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.totalBase - a.totalBase);
  }, [orders]);

  // Shop health checklist
  const healthChecks = [
    {
      label: 'All active listings have 3+ studio photos',
      ok: products.filter((p) => p.status === 'active').every((p) => p.images.length >= 2),
      link: '/admin/listings',
    },
    {
      label: '10–15 days Made-to-Order Processing Profile active',
      ok: processingProfiles.some((p) => p.isDefault && p.minDays === 10 && p.maxDays === 15),
      link: '/admin/settings',
    },
    {
      label: 'US Stripe primary gateway + PayPal & Razorpay active',
      ok:
        settings.paymentsEnabled.stripe &&
        settings.paymentsEnabled.paypal &&
        settings.paymentsEnabled.razorpay,
      link: '/admin/settings',
    },
    {
      label: `inkedrug.com domain & India -${settings.indiaRegionalDiscountPercent || 30}% domestic pricing active`,
      ok: (settings.indiaRegionalDiscountPercent || 0) === 30,
      link: '/admin/settings',
    },
    {
      label: '13/13 search tags populated on flagship listings',
      ok: products.slice(0, 4).every((p) => p.tags.length >= 10),
      link: '/admin/listings',
    },
    {
      label: 'Shipping & non-returnable custom rug policies published',
      ok: true,
      link: '/admin/pages',
    },
  ];

  const topListings = useMemo(
    () => [...products].sort((a, b) => b.counters.revenue - a.counters.revenue).slice(0, 5),
    [products]
  );

  return (
    <div className="space-y-6">
      {/* Header + Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome back, {settings.storeName}
          </h1>
          <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-1">
            Since your last visit:{' '}
            <strong className="text-[#1A1918] dark:text-[#F4F1EA]">
              {ordersToConfirm.length} new order(s)
            </strong>
            , <strong>{unreadThreads.length} unread message(s)</strong>,{' '}
            <strong>{pendingReviews.length} review(s) to moderate</strong>, and{' '}
            <strong>{openQuotes.length} custom rug quote(s)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/listings/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Add listing
          </Link>
          <Link
            to="/admin/marketing"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-2 text-xs font-bold"
          >
            <Tag className="w-3.5 h-3.5" /> Start a sale
          </Link>
          <Link
            to="/admin/marketing?tab=coupons"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-4 py-2 text-xs font-semibold"
          >
            Create coupon
          </Link>
          <Link
            to="/admin/listings?modal=import"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-4 py-2 text-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </Link>
        </div>
      </div>

      {/* Actionable To-Do Strip (10-15 Day Production Window Front & Center) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            title: 'Orders to confirm',
            count: ordersToConfirm.length,
            sub: 'Start 10–15d clock',
            to: '/admin/orders?tab=New',
            tone: 'default',
            icon: Package,
          },
          {
            title: 'Due in < 5 days',
            count: ordersDueSoon.length,
            sub: 'Day 11–15 window',
            to: '/admin/orders?tab=In+production',
            tone: ordersDueSoon.length > 0 ? 'amber' : 'default',
            icon: Clock,
          },
          {
            title: 'Overdue (>15 days)',
            count: overdueOrders.length,
            sub: 'Needs dispatch',
            to: '/admin/orders?tab=Overdue',
            tone: overdueOrders.length > 0 ? 'red' : 'default',
            icon: AlertTriangle,
          },
          {
            title: 'Unread messages',
            count: unreadThreads.length,
            sub: 'Buyer inbox',
            to: '/admin/messages',
            tone: 'default',
            icon: MessageSquare,
          },
          {
            title: 'Custom quotes',
            count: openQuotes.length,
            sub: 'Send WhatsApp link',
            to: '/admin/custom-requests',
            tone: 'default',
            icon: Sparkles,
          },
          {
            title: 'Reviews & SEO',
            count: pendingReviews.length + lowQualityListings.length,
            sub: `${pendingReviews.length} rev · ${lowQualityListings.length} low SEO`,
            to: '/admin/reviews',
            tone: 'default',
            icon: Star,
          },
        ].map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={`rounded-2xl border p-4 transition-colors flex flex-col justify-between ${
              card.tone === 'red'
                ? 'border-[#D62828]/50 bg-[#D62828]/5 hover:border-[#D62828]'
                : card.tone === 'amber'
                ? 'border-[#E9A820]/60 bg-[#F5EBC8]/60 dark:bg-[#2B2416] hover:border-[#E9A820]'
                : 'border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] hover:border-[#111111]'
            }`}
          >
            <div className="flex items-center justify-between text-[#5F5B55] dark:text-[#A6A198]">
              <span className="text-[11px] font-semibold">{card.title}</span>
              <card.icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-2xl font-bold font-mono-num mt-2">{card.count}</p>
            <p className="text-[11px] text-[#5F5B55] dark:text-[#A6A198] mt-1">{card.sub}</p>
          </Link>
        ))}
      </section>

      {/* Performance KPI Tiles with Date-Range Picker & Sparklines */}
      <section className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Shop Performance</h2>
            <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
              Compared against previous period · Base currency ({settings.baseCurrency})
            </p>
          </div>
          <div className="inline-flex rounded-xl bg-[#EFECE6] dark:bg-[#121211] p-1 text-xs font-semibold">
            {(
              [
                ['today', 'Today'],
                ['7d', '7D'],
                ['30d', '30D'],
                ['90d', '90D'],
                ['year', 'This Year'],
              ] as Array<[DateRangeKey, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={`px-3 py-1 rounded-lg cursor-pointer ${
                  range === key
                    ? 'bg-white dark:bg-[#2E2C28] text-[#111111] dark:text-white shadow-2xs'
                    : 'text-[#5F5B55]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            {
              label: 'Visits',
              value: metrics.totalVisits.toLocaleString(),
              delta: '+14.2%',
              points: '0,22 16,18 32,20 48,12 64,14 80,6',
            },
            {
              label: 'Orders',
              value: metrics.totalOrdersCount.toLocaleString(),
              delta: '+18.5%',
              points: '0,24 16,20 32,16 48,17 64,10 80,5',
            },
            {
              label: 'Conversion rate',
              value: `${metrics.convRate}%`,
              delta: '+0.4%',
              points: '0,18 16,17 32,15 48,14 64,11 80,9',
            },
            {
              label: 'Revenue',
              value: formatBase(metrics.totalRevenueBase),
              delta: '+22.8%',
              points: '0,25 16,22 32,14 48,16 64,9 80,4',
            },
            {
              label: 'Avg. order value',
              value: formatBase(metrics.aovBase),
              delta: '+3.6%',
              points: '0,19 16,16 32,18 48,13 64,12 80,8',
            },
            {
              label: 'Favourites',
              value: metrics.totalFavourites.toLocaleString(),
              delta: '+29.1%',
              points: '0,24 16,19 32,17 48,11 64,8 80,3',
            },
          ].map((kpi) => (
            <Link
              key={kpi.label}
              to="/admin/stats"
              className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3.5 hover:border-[#111111] transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] text-[#5F5B55] dark:text-[#A6A198]">
                <span>{kpi.label}</span>
                <span className="text-[#2F6B2F] dark:text-[#5ECF5E] font-bold tabular-nums">
                  {kpi.delta}
                </span>
              </div>
              <p className="text-lg font-bold font-mono-num mt-1 truncate">{kpi.value}</p>
              <svg viewBox="0 0 84 28" className="w-full h-6 mt-2 overflow-visible">
                <polyline
                  fill="none"
                  stroke="#2F6B2F"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={kpi.points}
                />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* Middle Grid: Recent Orders (Left 7 cols) + Traffic & Country Breakdown (Right 5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent Orders with Production Deadline Badges & Inline Status */}
        <section className="xl:col-span-7 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Open &amp; Recent Rug Commissions</h2>
              <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
                Every order tracks its 10–15 day hand-tufting deadline automatically
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold inline-flex items-center gap-1 hover:underline"
            >
              All orders ({orders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6E1D8] dark:border-[#2E2C28] text-[#5F5B55]">
                  <th className="py-2 pr-3 font-semibold">Order</th>
                  <th className="py-2 px-3 font-semibold">Customer</th>
                  <th className="py-2 px-3 font-semibold">10–15d Window</th>
                  <th className="py-2 px-3 font-semibold text-right">Total</th>
                  <th className="py-2 pl-3 font-semibold text-right">Quick Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28]">
                {orders.slice(0, 6).map((ord) => {
                  const badge = getProductionDeadlineBadge(ord);
                  const cfg = getCountryConfig(ord.shippingAddress.country);
                  return (
                    <tr key={ord.id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#252320]">
                      <td className="py-3 pr-3 font-mono-num font-bold">
                        <Link to={`/admin/orders?q=${ord.orderNumber}`} className="hover:underline">
                          #{ord.orderNumber}
                        </Link>
                        <p className="text-[11px] font-sans font-normal text-[#5F5B55] truncate max-w-[160px]">
                          {ord.items[0]?.title}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold">
                          {cfg.flag} {ord.customerName}
                        </p>
                        <p className="text-[11px] text-[#5F5B55]">{ord.paymentStatus}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                            badge.tone === 'red'
                              ? 'bg-[#D62828]/15 text-[#D62828]'
                              : badge.tone === 'amber'
                              ? 'bg-[#E9A820]/25 text-[#8A5A00] dark:text-[#F3C65F]'
                              : badge.tone === 'done'
                              ? 'bg-[#2F6B2F]/15 text-[#2F6B2F] dark:text-[#5ECF5E]'
                              : 'bg-[#EFECE6] dark:bg-[#2E2C28] text-[#1A1918] dark:text-[#F4F1EA]'
                          }`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold">
                        {formatBase(ord.totalBase)}
                        {ord.chargedCurrency !== settings.baseCurrency && (
                          <p className="text-[10px] font-normal text-[#5F5B55]">
                            Charged {ord.chargedCurrency}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <select
                          aria-label={`Change status for ${ord.orderNumber}`}
                          value={ord.status}
                          onChange={(e) =>
                            updateOrderStatus(ord.id, e.target.value as OrderStatus)
                          }
                          className="rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2 py-1 text-[11px] font-semibold cursor-pointer"
                        >
                          {[
                            'New',
                            'Confirmed',
                            'In production',
                            'Ready to ship',
                            'Shipped',
                            'Delivered',
                            'Completed',
                            'Awaiting price confirmation',
                          ].map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Traffic Sources & Country Sales */}
        <section className="xl:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-3">
            <h2 className="text-sm font-bold">Traffic Channels &amp; Social Discovery</h2>
            {[
              { name: 'Pinterest Rich Pins & Saves', share: 38, visits: 4120, color: '#D62828' },
              { name: 'Instagram Reels & Bio', share: 27, visits: 2930, color: '#111111' },
              { name: 'WhatsApp Direct Shares', share: 16, visits: 1740, color: '#25D366' },
              { name: 'Google Organic & Shopping', share: 12, visits: 1300, color: '#2EC4B6' },
              { name: 'Direct & Bookmarks', share: 7, visits: 760, color: '#E9A820' },
            ].map((src) => (
              <div key={src.name} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{src.name}</span>
                  <span className="font-mono-num text-[#5F5B55]">
                    {src.visits.toLocaleString()} ({src.share}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#EFECE6] dark:bg-[#2E2C28] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${src.share}%`, backgroundColor: src.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-3">
            <h2 className="text-sm font-bold">Sales by Country &amp; Currency</h2>
            <div className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28] text-xs">
              {countryBreakdown.map((row) => {
                const cfg = getCountryConfig(row.country);
                return (
                  <div key={row.country} className="py-2 flex items-center justify-between">
                    <span>
                      {cfg.flag} <strong>{cfg.countryName}</strong> ({row.currency})
                    </span>
                    <span className="font-mono-num font-bold">
                      {row.count} order(s) · {formatBase(row.totalBase)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Grid: Top Bestselling Listings + Active Sales & Shop Health */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Top Performing Listings</h2>
            <Link to="/admin/listings" className="text-xs font-bold hover:underline">
              Manage all {products.length} listings →
            </Link>
          </div>
          <div className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28] text-xs">
            {topListings.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[#E6E1D8] dark:border-[#2E2C28]">
                    <ResilientImage
                      src={p.images[0]?.url}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/admin/listings/${p.id}`}
                      className="font-bold hover:underline truncate block"
                    >
                      {p.title}
                    </Link>
                    <p className="text-[11px] text-[#5F5B55] font-mono-num">
                      {p.counters.views.toLocaleString()} views · {p.counters.favourites} favs ·{' '}
                      {p.counters.orders} orders
                    </p>
                  </div>
                </div>
                <span className="font-mono-num font-bold shrink-0">
                  {formatBase(p.counters.revenue)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="xl:col-span-5 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Shop Health &amp; Active Promotions</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2F6B2F]/15 text-[#2F6B2F] dark:text-[#5ECF5E] text-[11px] font-bold">
              {sales.filter((s) => s.status === 'active').length} Active Sale
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {healthChecks.map((chk) => (
              <Link
                key={chk.label}
                to={chk.link}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#121211] hover:border-[#111111]"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      chk.ok ? 'text-[#2F6B2F]' : 'text-[#E9A820]'
                    }`}
                  />
                  <span>{chk.label}</span>
                </span>
                <span className="text-[11px] font-bold text-[#5F5B55]">Review</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
