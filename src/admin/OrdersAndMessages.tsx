import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import {
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  EyeOff,
  MessageCircle,
  MessageSquare,
  Printer,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import { CustomOrderRequest, Order, OrderStatus } from '../types';
import { formatAlreadyConverted, formatMoney, getCountryConfig } from '../utils/currencies';
import { getProductionDeadlineBadge } from '../utils/pricing';

// ============================================================================
// 12.G ORDERS & SHIPPING MANAGER
// ============================================================================
export const OrdersManager: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    orders,
    settings,
    exchangeRates,
    updateOrderStatus,
    pushToast,
  } = useStore();

  const initialTab = searchParams.get('tab') || 'All';
  const initialQuery = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [queryText, setQueryText] = useState<string>(initialQuery);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printSlipOrder, setPrintSlipOrder] = useState<Order | null>(null);

  // Order detail form controls
  const [trackingInput, setTrackingInput] = useState('');
  const [courierInput, setCourierInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [customQuoteBase, setCustomQuoteBase] = useState<number>(0);

  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  const openDetail = (ord: Order) => {
    setSelectedOrder(ord);
    setTrackingInput(ord.trackingNumber || '');
    setCourierInput(ord.courier || 'DHL Express / Delhivery');
    setNotesInput(ord.internalNotes || '');
    setCustomQuoteBase(ord.totalBase);
  };

  const tabs = [
    'All',
    'New',
    'Confirmed',
    'In production',
    'Ready to ship',
    'Shipped',
    'Delivered',
    'Awaiting price confirmation',
    'Overdue',
    'Refunded',
  ];

  const filteredOrders = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return orders.filter((o) => {
      if (activeTab === 'Overdue') {
        if (!getProductionDeadlineBadge(o).isOverdue) return false;
      } else if (activeTab !== 'All' && o.status !== activeTab) {
        return false;
      }

      if (q) {
        const hit =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [orders, activeTab, queryText]);

  const exportOrdersCsv = () => {
    const csv = Papa.unparse(
      filteredOrders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        country: o.shippingAddress.country,
        totalBase: o.totalBase,
        chargedCurrency: o.chargedCurrency,
        totalCharged: o.totalCharged,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        trackingNumber: o.trackingNumber,
        createdAt: o.createdAt,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kazumi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleServerRefund = async (ord: Order) => {
    try {
      await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: ord.id,
          paymentId: ord.paymentId,
          method: ord.paymentMethod,
          amount: ord.totalCharged,
          currency: ord.chargedCurrency,
        }),
      });
    } catch {
      // Server route optional fallback
    }
    await updateOrderStatus(ord.id, 'Refunded', {
      internalNotes: `${notesInput}\nRefund processed on ${new Date().toLocaleDateString()}`.trim(),
    });
    setSelectedOrder(null);
    pushToast(`Order #${ord.orderNumber} marked Refunded`, { tone: 'success' });
  };

  // Sync selectedOrder with live updates
  const liveSelected = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Orders &amp; Shipping ({orders.length})
          </h1>
          <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
            Real-time commissions · 10–15 day tufting deadline badges · Studio progress photos &amp; WhatsApp alerts
          </p>
        </div>

        <button
          type="button"
          onClick={exportOrdersCsv}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-4 py-2 text-xs font-bold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export Orders CSV
        </button>
      </div>

      {/* Status Tabs with Counts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {tabs.map((tab) => {
          const count =
            tab === 'All'
              ? orders.length
              : tab === 'Overdue'
              ? orders.filter((o) => getProductionDeadlineBadge(o).isOverdue).length
              : orders.filter((o) => o.status === tab).length;
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSearchParams(tab === 'All' ? {} : { tab });
              }}
              className={`px-3.5 py-2 rounded-full font-bold whitespace-nowrap cursor-pointer transition-colors ${
                active
                  ? tab === 'Overdue'
                    ? 'bg-[#D62828] text-white'
                    : 'bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111]'
                  : 'bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28]'
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 text-[#5F5B55] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Search order #, buyer name, email, or phone..."
          className="w-full rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] pl-9 pr-4 py-2 text-xs"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-12 text-center text-xs text-[#5F5B55]">
            No orders in "{activeTab}".
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const badge = getProductionDeadlineBadge(ord);
            const cfg = getCountryConfig(ord.shippingAddress.country);
            return (
              <div
                key={ord.id}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 sm:p-5 space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono-num font-bold text-sm">#{ord.orderNumber}</span>
                    <span>
                      {cfg.flag} <strong>{ord.customerName}</strong> ({ord.customerEmail})
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                        badge.tone === 'red'
                          ? 'bg-[#D62828]/15 text-[#D62828]'
                          : badge.tone === 'amber'
                          ? 'bg-[#E9A820]/25 text-[#8A5A00] dark:text-[#F3C65F]'
                          : badge.tone === 'done'
                          ? 'bg-[#2F6B2F]/15 text-[#2F6B2F] dark:text-[#5ECF5E]'
                          : 'bg-[#EFECE6] dark:bg-[#2E2C28]'
                      }`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-bold text-sm">
                      {formatAlreadyConverted(ord.totalCharged, ord.chargedCurrency)}
                    </span>
                    {ord.chargedCurrency !== settings.baseCurrency && (
                      <span className="text-[#5F5B55] font-mono-num">
                        (≈ {formatBase(ord.totalBase)})
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-[#121211] border border-[#E6E1D8] dark:border-[#2E2C28] font-semibold">
                      {ord.paymentMethod.toUpperCase()} · {ord.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  {ord.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#E6E1D8]">
                          <ResilientImage
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{item.title}</p>
                          <p className="text-[#5F5B55]">
                            Color: <strong>{item.variationName}</strong> · Size:{' '}
                            <strong>{item.customDims || item.sizeLabel}</strong> × {item.quantity}
                          </p>
                          {item.personalisation && (
                            <p className="text-[#2F6B2F] font-semibold">
                              Personalisation: "{item.personalisation}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={ord.status}
                          onChange={(e) =>
                            updateOrderStatus(ord.id, e.target.value as OrderStatus)
                          }
                          className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-1.5 font-semibold cursor-pointer"
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
                            'Cancelled',
                          ].map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setPrintSlipOrder(ord)}
                          title="Print Invoice & Packing Slip"
                          className="p-2 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] hover:border-[#111111] cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDetail(ord)}
                          className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-4 py-1.5 font-bold cursor-pointer"
                        >
                          Manage Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order Detail Slide-Over Drawer */}
      {liveSelected && (
        <div className="fixed inset-0 z-50 bg-black/55 flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-[#1C1B19] h-full overflow-y-auto p-6 space-y-5 text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
              <div>
                <h2 className="text-base font-bold font-mono-num">
                  Order #{liveSelected.orderNumber}
                </h2>
                <p className="text-[#5F5B55]">
                  Placed {new Date(liveSelected.createdAt).toLocaleString()} · Rate used:{' '}
                  {liveSelected.exchangeRateUsed}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ship-to & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#121211] p-4">
              <div>
                <p className="font-bold mb-1">Ship-To Address</p>
                <p>{liveSelected.shippingAddress.fullName}</p>
                <p>{liveSelected.shippingAddress.line1}</p>
                <p>
                  {liveSelected.shippingAddress.city}, {liveSelected.shippingAddress.state}{' '}
                  {liveSelected.shippingAddress.postalCode}
                </p>
                <p className="font-bold">{liveSelected.shippingAddress.country}</p>
              </div>
              <div className="space-y-1.5">
                <p className="font-bold">Buyer Contact</p>
                <p>{liveSelected.customerEmail}</p>
                <p>{liveSelected.customerPhone}</p>
                <a
                  href={`https://wa.me/${liveSelected.customerPhone.replace(
                    /[^0-9]/g,
                    ''
                  )}?text=${encodeURIComponent(
                    `Hi ${liveSelected.customerName}! Update from ${settings.storeName} regarding your rug order #${liveSelected.orderNumber} (${liveSelected.status}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] text-[#111111] px-3 py-1 font-bold mt-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Message Buyer on WhatsApp
                </a>
              </div>
            </div>

            {/* Custom-Size Quote & Payment Link Sender */}
            <div className="rounded-2xl border border-[#E9A820]/60 bg-[#F5EBC8]/60 dark:bg-[#2B2416] p-4 space-y-2.5">
              <p className="font-bold">
                Custom Order Price &amp; WhatsApp Payment Link
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  value={customQuoteBase}
                  onChange={(e) => setCustomQuoteBase(Number(e.target.value))}
                  className="w-36 rounded-xl border border-[#E6E1D8] bg-white dark:bg-[#1C1B19] px-3 py-1.5 font-mono-num font-bold"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateOrderStatus(liveSelected.id, 'Confirmed', {
                      customPriceBase: customQuoteBase,
                    })
                  }
                  className="rounded-full bg-[#111111] text-white px-4 py-1.5 font-bold cursor-pointer"
                >
                  Update Price ({formatBase(customQuoteBase)})
                </button>
                <a
                  href={`https://wa.me/${liveSelected.customerPhone.replace(
                    /[^0-9]/g,
                    ''
                  )}?text=${encodeURIComponent(
                    `Hi ${liveSelected.customerName}! Your custom ${settings.storeName} rug quote for Order #${liveSelected.orderNumber} is ${formatBase(
                      customQuoteBase
                    )} (10-15 days hand-tufting). Confirm & pay securely here: ${
                      window.location.origin
                    }/track-order?order=${liveSelected.orderNumber}&email=${encodeURIComponent(
                      liveSelected.customerEmail
                    )}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#25D366] text-[#111111] px-4 py-1.5 font-bold"
                >
                  Send Payment Link on WhatsApp ↗
                </a>
              </div>
            </div>

            {/* Tracking & Mark as Shipped */}
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] p-4 space-y-3">
              <p className="font-bold flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> Dispatch &amp; Courier Tracking
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={courierInput}
                  onChange={(e) => setCourierInput(e.target.value)}
                  placeholder="Courier (DHL / Delhivery / Shiprocket)"
                  className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Tracking number..."
                  className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  updateOrderStatus(liveSelected.id, 'Shipped', {
                    courier: courierInput,
                    trackingNumber: trackingInput,
                    internalNotes: notesInput,
                  })
                }
                className="rounded-full bg-[#2F6B2F] text-white px-5 py-2 font-bold cursor-pointer"
              >
                Mark as Shipped &amp; Update Customer Timeline
              </button>
            </div>

            {/* Production Progress Photos (Shown to Customer on Track Order) */}
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] p-4 space-y-3">
              <p className="font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Studio Tufting Progress Photos (Visible on Track Order)
              </p>
              <div className="flex flex-wrap gap-2">
                {liveSelected.productionPhotos.map((ph, i) => (
                  <img
                    key={i}
                    src={ph}
                    alt="Progress"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-[#E6E1D8]"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="Paste studio photo URL or click Add Studio Frame Shot..."
                  className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url =
                      photoUrlInput.trim() ||
                      '/assets/aistudio/6269061323719119382_e3aca78f.jpg';
                    updateOrderStatus(liveSelected.id, liveSelected.status, {
                      productionPhoto: url,
                    });
                    setPhotoUrlInput('');
                  }}
                  className="rounded-full bg-[#111111] text-white px-4 py-2 font-bold cursor-pointer shrink-0"
                >
                  + Add Photo
                </button>
              </div>
            </div>

            {/* Internal Notes & Refund */}
            <div className="space-y-2">
              <label className="block font-bold">Internal Studio Notes</label>
              <textarea
                rows={2}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleServerRefund(liveSelected)}
                  className="inline-flex items-center gap-1 text-[#D62828] font-bold hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Issue Full Refund
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateOrderStatus(liveSelected.id, liveSelected.status, {
                      internalNotes: notesInput,
                    })
                  }
                  className="rounded-full border border-[#111111] px-4 py-1.5 font-bold cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </div>

            {/* Status Timeline History */}
            <div className="border-t border-[#E6E1D8] dark:border-[#2E2C28] pt-3 space-y-1.5">
              <p className="font-bold">Audit Timeline</p>
              {liveSelected.statusHistory.map((h, idx) => (
                <div key={idx} className="flex justify-between text-[11px] text-[#5F5B55] font-mono-num">
                  <span>
                    <strong>{h.status}</strong> · {h.by}
                  </span>
                  <span>{new Date(h.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice & Packing Slip Modal */}
      {printSlipOrder && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white text-[#111111] p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold">{settings.storeName} · Packing Slip &amp; Tax Invoice</h2>
                <p>GSTIN: {settings.gstin} · Ships from {settings.shipsFromCountry}</p>
              </div>
              <button
                type="button"
                onClick={() => setPrintSlipOrder(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-bold">Order #{printSlipOrder.orderNumber}</p>
                <p>Date: {new Date(printSlipOrder.createdAt).toLocaleDateString()}</p>
                <p>Window: 10–{printSlipOrder.productionDaysMax} days handmade</p>
              </div>
              <div>
                <p className="font-bold">Ship To:</p>
                <p>{printSlipOrder.shippingAddress.fullName}</p>
                <p>{printSlipOrder.shippingAddress.line1}</p>
                <p>
                  {printSlipOrder.shippingAddress.city}, {printSlipOrder.shippingAddress.country}
                </p>
              </div>
            </div>
            <div className="border-y py-3 space-y-1.5">
              {printSlipOrder.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>
                    {it.title} ({it.variationName}, {it.sizeLabel}) × {it.quantity}
                  </span>
                  <span className="font-mono-num font-bold">
                    {formatBase(it.unitPriceBase * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span>Total Paid ({printSlipOrder.chargedCurrency})</span>
              <span>
                {formatAlreadyConverted(printSlipOrder.totalCharged, printSlipOrder.chargedCurrency)}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full bg-[#111111] text-white px-5 py-2 font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Slip / Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 12.H BUYER MESSAGES INBOX
// ============================================================================
export const MessagesInbox: React.FC = () => {
  const { conversations, messages, replyConversation, settings } = useStore();
  const [filter, setFilter] = useState<'all' | 'unread' | 'custom_request'>('all');
  const [activeConvId, setActiveConvId] = useState<string>(conversations[0]?.id || '');
  const [replyText, setReplyText] = useState('');

  const filteredConvs = conversations.filter((c) => {
    if (filter === 'unread') return c.unreadByAdmin;
    if (filter === 'custom_request') return c.category === 'custom_request';
    return !c.archived;
  });

  const activeConv =
    filteredConvs.find((c) => c.id === activeConvId) || filteredConvs[0] || null;
  const threadMsgs = messages.filter((m) => m.conversationId === activeConv?.id);

  const cannedReplies = [
    'Every Kazumi Rugs piece is tufted to order in 10–15 days after confirmation, then shipped via tracked express!',
    'Yes! We can tuft any custom width × height up to 240×240 cm. Share your preferred dimensions and we will send a payment link.',
    'Your rug is currently on the carving frame — we just uploaded a fresh studio progress photo to your Track Order page!',
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Messages Inbox</h1>
        <p className="text-xs text-[#5F5B55]">
          Product page inquiries sync here in real time. Answer on-site or jump directly to WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
        {/* Left Thread List */}
        <div className="lg:col-span-4 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-3 space-y-3 text-xs">
          <div className="flex gap-1.5">
            {(
              [
                ['all', 'All'],
                ['unread', 'Unread'],
                ['custom_request', 'Custom'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`px-3 py-1 rounded-full font-bold cursor-pointer ${
                  filter === k ? 'bg-[#111111] text-white' : 'bg-[#FAF8F5] dark:bg-[#121211]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {filteredConvs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveConvId(c.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                  activeConv?.id === c.id
                    ? 'border-[#111111] bg-[#FAF8F5] dark:bg-[#252320]'
                    : 'border-transparent hover:bg-[#FAF8F5] dark:hover:bg-[#252320]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{c.customerName}</span>
                  {c.unreadByAdmin && (
                    <span className="w-2 h-2 rounded-full bg-[#D62828]" />
                  )}
                </div>
                {c.productTitle && (
                  <p className="text-[11px] text-[#2F6B2F] truncate">Re: {c.productTitle}</p>
                )}
                <p className="text-[#5F5B55] truncate mt-0.5">{c.lastMessagePreview}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Conversation View */}
        <div className="lg:col-span-8 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 flex flex-col justify-between text-xs">
          {activeConv ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
                <div>
                  <h2 className="text-sm font-bold">{activeConv.customerName}</h2>
                  <p className="text-[#5F5B55]">
                    {activeConv.customerEmail}
                    {activeConv.productTitle ? ` · ${activeConv.productTitle}` : ''}
                  </p>
                </div>
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(
                    /[^0-9]/g,
                    ''
                  )}?text=${encodeURIComponent(
                    `Hi ${activeConv.customerName}! Replying from ${settings.storeName} regarding "${activeConv.productTitle || 'your inquiry'}": `
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] text-[#111111] px-3.5 py-1.5 font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Reply on WhatsApp ↗
                </a>
              </div>

              <div className="flex-1 py-4 space-y-3 max-h-80 overflow-y-auto">
                {threadMsgs.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl max-w-lg ${
                      m.senderRole === 'admin'
                        ? 'ml-auto bg-[#111111] text-white'
                        : 'bg-[#FAF8F5] dark:bg-[#252320]'
                    }`}
                  >
                    <p className="font-bold mb-1">
                      {m.senderRole === 'admin' ? `${settings.storeName} Studio` : activeConv.customerName}
                    </p>
                    <p className="leading-relaxed">{m.text}</p>
                    <p className="text-[10px] opacity-60 mt-1">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
                <div className="flex flex-wrap gap-1.5">
                  {cannedReplies.map((cr, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReplyText(cr)}
                      className="px-2.5 py-1 rounded-full bg-[#EFECE6] dark:bg-[#2E2C28] text-[11px] font-semibold cursor-pointer"
                    >
                      + Canned reply #{i + 1}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!replyText.trim()) return;
                    await replyConversation(activeConv.id, replyText);
                    setReplyText('');
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write studio reply..."
                    className="flex-1 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-4 py-2"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] text-white px-5 py-2 font-bold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Reply
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-[#5F5B55]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12.I CUSTOM ORDER REQUESTS & QUOTE BUILDER
// ============================================================================
export const CustomRequestsManager: React.FC = () => {
  const { customRequests, updateCustomRequestQuote, settings, exchangeRates } = useStore();
  const [selectedReq, setSelectedReq] = useState<CustomOrderRequest | null>(
    customRequests[0] || null
  );
  const [quoteAmount, setQuoteAmount] = useState<number>(
    customRequests[0]?.quotedPriceBase || 149
  );
  const [adminNotes, setAdminNotes] = useState<string>('');

  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  const suggestAreaQuote = (w: number, h: number) =>
    Math.max(65, Math.round(w * h * 0.012));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Custom Rug Requests &amp; Quote Builder ({customRequests.length})
        </h1>
        <p className="text-xs text-[#5F5B55]">
          Convert custom size or tattoo/anime artwork inquiries into one-click payment links sent on WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
        <div className="lg:col-span-5 space-y-2.5">
          {customRequests.map((req) => (
            <button
              key={req.id}
              type="button"
              onClick={() => {
                setSelectedReq(req);
                setQuoteAmount(
                  req.quotedPriceBase > 0
                    ? req.quotedPriceBase
                    : suggestAreaQuote(req.widthCm, req.heightCm)
                );
                setAdminNotes(req.adminNotes);
              }}
              className={`w-full text-left rounded-2xl border p-4 space-y-1.5 cursor-pointer ${
                selectedReq?.id === req.id
                  ? 'border-[#111111] bg-white dark:bg-[#1C1B19]'
                  : 'border-[#E6E1D8] dark:border-[#2E2C28] bg-white/70 dark:bg-[#1C1B19]/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{req.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F5EBC8] text-[#111111] font-bold">
                  {req.status}
                </span>
              </div>
              <p className="font-mono-num font-semibold text-[#2F6B2F]">
                Custom Size: {req.widthCm} × {req.heightCm} cm · {req.country}
              </p>
              <p className="text-[#5F5B55] line-clamp-2">{req.styleNotes}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-7">
          {selectedReq ? (
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6E1D8] dark:border-[#2E2C28] pb-3">
                <div>
                  <h2 className="text-base font-bold">{selectedReq.name}</h2>
                  <p className="text-[#5F5B55]">
                    {selectedReq.email} · {selectedReq.phone}
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-[#E9A820]" />
              </div>

              <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#121211] p-4 space-y-1">
                <p className="font-bold">
                  Requested Dimensions: {selectedReq.widthCm} cm × {selectedReq.heightCm} cm
                </p>
                <p className="text-[#3F3C37] dark:text-[#D5D0C6]">{selectedReq.styleNotes}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Quoted Price ({settings.baseCurrency})
                  </label>
                  <input
                    type="number"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Studio Notes</label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Yarn colors, backing, rush timeline..."
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                  />
                </div>
              </div>

              {(() => {
                const paymentLink = `${window.location.origin}/checkout?customQuote=${selectedReq.id}&amount=${quoteAmount}`;
                const waHref = `https://wa.me/${(
                  selectedReq.phone || settings.whatsappNumber
                ).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hi ${selectedReq.name}! Your custom ${selectedReq.widthCm}×${selectedReq.heightCm}cm ${settings.storeName} rug quote is ready: ${formatBase(
                    quoteAmount
                  )} (made to order in 10–15 days after confirmation). Complete your order via this link: ${paymentLink}`
                )}`;

                return (
                  <div className="space-y-3 pt-2">
                    <div className="rounded-xl bg-[#F5EBC8] dark:bg-[#2B2416] p-3 font-mono-num text-[11px] break-all">
                      Generated Payment Link: {paymentLink}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateCustomRequestQuote(
                            selectedReq.id,
                            'Quoted',
                            quoteAmount,
                            paymentLink,
                            adminNotes
                          )
                        }
                        className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-5 py-2.5 font-bold cursor-pointer"
                      >
                        Save Quote ({formatBase(quoteAmount)})
                      </button>
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] text-[#111111] px-5 py-2.5 font-bold"
                      >
                        <MessageCircle className="w-4 h-4" /> Send Quote &amp; Link on WhatsApp ↗
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          updateCustomRequestQuote(
                            selectedReq.id,
                            'Accepted',
                            quoteAmount,
                            paymentLink,
                            adminNotes
                          )
                        }
                        className="rounded-full border border-[#2F6B2F] text-[#2F6B2F] px-4 py-2 font-bold cursor-pointer"
                      >
                        Mark Accepted
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 12.J REVIEWS MODERATION
// ============================================================================
export const ReviewsManager: React.FC = () => {
  const { reviews, products, moderateReview } = useStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const list = reviews.filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Verified Buyer Reviews ({reviews.length})
          </h1>
          <p className="text-xs text-[#5F5B55]">
            Approve verified buyer reviews so they appear immediately on the Product Detail Page.
          </p>
        </div>

        <div className="flex gap-1.5 text-xs">
          {(['all', 'pending', 'approved', 'hidden'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full font-bold capitalize cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#111111] text-white'
                  : 'bg-white dark:bg-[#1C1B19] border border-[#E6E1D8]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 text-xs">
        {list.map((rev) => {
          const prod = products.find((p) => p.id === rev.productId);
          return (
            <div
              key={rev.id}
              className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{rev.customerName}</span>
                  <span className="inline-flex items-center gap-0.5 text-[#E9A820] font-bold">
                    {rev.rating}.0 <Star className="w-3.5 h-3.5 fill-[#E9A820]" />
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#EFECE6] dark:bg-[#2E2C28] text-[11px] font-semibold">
                    {rev.status}
                  </span>
                </div>
                <span className="text-[#5F5B55]">{prod?.title || rev.productId}</span>
              </div>

              <p className="text-sm">{rev.comment}</p>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
                <input
                  type="text"
                  value={replyDrafts[rev.id] ?? rev.sellerReply}
                  onChange={(e) =>
                    setReplyDrafts({ ...replyDrafts, [rev.id]: e.target.value })
                  }
                  placeholder="Write public seller reply..."
                  className="flex-1 min-w-[200px] rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-4 py-1.5"
                />
                <button
                  type="button"
                  onClick={() =>
                    moderateReview(rev.id, 'approved', replyDrafts[rev.id] ?? rev.sellerReply)
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-[#2F6B2F] text-white px-4 py-1.5 font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Publish
                </button>
                <button
                  type="button"
                  onClick={() => moderateReview(rev.id, 'hidden', rev.sellerReply)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E6E1D8] px-3.5 py-1.5 font-semibold cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" /> Hide
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 12.O CUSTOMERS DIRECTORY
// ============================================================================
export const CustomersManager: React.FC = () => {
  const { customers, settings, exchangeRates } = useStore();
  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  const exportCsv = () => {
    const csv = Papa.unparse(customers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kazumi-customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Customers ({customers.length})
          </h1>
          <p className="text-xs text-[#5F5B55]">
            Repeat rug collectors, country preferences, and lifetime value.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] bg-white dark:bg-[#1C1B19] px-4 py-2 text-xs font-bold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F5F2EC] dark:bg-[#171614] border-b border-[#E6E1D8] dark:border-[#2E2C28]">
            <tr>
              <th className="py-3 px-4">Collector</th>
              <th className="py-3 px-4">Region / Currency</th>
              <th className="py-3 px-4 text-right">Orders</th>
              <th className="py-3 px-4 text-right">Total Spent</th>
              <th className="py-3 px-4 text-right">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28]">
            {customers.map((c) => {
              const cfg = getCountryConfig(c.country);
              return (
                <tr key={c.id}>
                  <td className="py-3 px-4">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-[#5F5B55]">{c.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    {cfg.flag} {cfg.countryName} ({c.currency})
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num font-bold">{c.ordersCount}</td>
                  <td className="py-3 px-4 text-right font-mono-num font-bold">
                    {formatBase(c.totalSpentBase)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {c.phone && (
                      <a
                        href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#25D366] font-bold"
                      >
                        Chat <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
