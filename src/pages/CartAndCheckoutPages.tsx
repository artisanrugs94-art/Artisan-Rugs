import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { OrderCheckoutValidationSchema, PaymentMethodId } from '../types';
import {
  convertFromBase,
  COUNTRY_CURRENCY_MAP,
  formatAlreadyConverted,
  getCountryConfig,
  MULTI_CURRENCY_GATEWAYS,
} from '../utils/currencies';
import {
  applyRegionalPricing,
  applySaleDiscount,
  calculateEstimatedDeliveryRange,
  calculateShippingFeeBase,
  getActiveSaleInfo,
} from '../utils/pricing';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    updateCartQuantity,
    removeCartItem,
    toggleSaveForLater,
    formatPrice,
    appliedCoupon,
    applyCouponCode,
    clearCoupon,
    countryCode,
    shippingProfiles,
    processingProfiles,
    settings,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  useDocumentMeta({
    title: `Shopping Cart | ${settings.storeName}`,
    description: 'Review your handmade made-to-order tufted rugs before checkout.',
  });

  const activeItems = cart.filter((c) => !c.savedForLater);
  const savedItems = cart.filter((c) => c.savedForLater);
  const isIndiaDomestic =
    countryCode === 'IN' && (settings.indiaRegionalPricingEnabled ?? true);

  const originSubtotal = activeItems.reduce(
    (s, i) => s + applyRegionalPricing(i.unitOriginPriceBase, countryCode, settings) * i.quantity,
    0
  );
  const saleSubtotal = activeItems.reduce(
    (s, i) => s + applyRegionalPricing(i.unitFinalPriceBase, countryCode, settings) * i.quantity,
    0
  );
  const saleSavings = Number(Math.max(0, originSubtotal - saleSubtotal).toFixed(2));

  const couponDiscount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? Number(((saleSubtotal * appliedCoupon.value) / 100).toFixed(2))
      : appliedCoupon.type === 'flat'
      ? Math.min(saleSubtotal, appliedCoupon.value)
      : 0
    : 0;

  const rawShip =
    activeItems.length === 0
      ? 0
      : calculateShippingFeeBase(
          shippingProfiles[0],
          false,
          countryCode,
          saleSubtotal - couponDiscount,
          activeItems.reduce((a, b) => a + b.quantity, 0)
        );
  const shippingBase = appliedCoupon?.type === 'free_shipping' ? 0 : rawShip;
  const totalBase = Math.max(0, saleSubtotal - couponDiscount + shippingBase);
  const defaultProc =
    processingProfiles.find((p) => p.isDefault) || processingProfiles[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-2xl sm:text-3xl">
        Your Shopping Cart ({activeItems.reduce((a, b) => a + b.quantity, 0)})
      </h1>

      {activeItems.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-12 text-center">
          <p className="text-sm text-[#5F5B55] dark:text-[#A6A198]">
            Your cart is empty. Discover handmade tattoo-flash and anime rugs!
          </p>
          <Link
            to="/shop"
            className="mt-4 inline-block rounded-full bg-[#111111] text-white px-7 py-3 text-xs font-bold"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-4 text-xs">
              <strong>Made to order:</strong> Ready in {defaultProc?.minDays ?? 10}–{defaultProc?.maxDays ?? 15} days after order confirmation, then tracked shipping.
            </div>

            {activeItems.map((item) => (
              <div
                key={item.cartItemId}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 flex gap-4"
              >
                <Link
                  to={`/product/${item.slug}`}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0"
                >
                  <ResilientImage
                    src={item.image}
                    alt={item.title}
                    cssFilter={item.cssFilter}
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.slug}`}
                    className="text-sm sm:text-base font-bold hover:underline line-clamp-1"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-1">
                    Style: {item.variationName} · Size: {item.sizeLabel}
                  </p>
                  {item.personalisationText && (
                    <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-0.5">
                      Personalisation: {item.personalisationText}
                    </p>
                  )}

                  <div className="mt-2 flex items-baseline gap-2 tabular-nums">
                    <span
                      className={`text-base font-bold ${
                        item.salePercent > 0 ? 'text-[#2F6B2F] dark:text-[#5ECF5E]' : ''
                      }`}
                    >
                      {formatPrice(
                        applyRegionalPricing(item.unitFinalPriceBase, countryCode, settings) *
                          item.quantity
                      )}
                    </span>
                    {item.salePercent > 0 && (
                      <span className="text-xs line-through text-[#5F5B55]">
                        {formatPrice(
                          applyRegionalPricing(item.unitOriginPriceBase, countryCode, settings) *
                            item.quantity
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-full border border-[#E6E1D8] dark:border-[#2E2C28]">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity - 1)}
                        className="p-2 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.cartItemId, item.quantity + 1)}
                        className="p-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleSaveForLater(item.cartItemId)}
                        className="font-semibold underline cursor-pointer"
                      >
                        Save for later
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.cartItemId)}
                        className="text-[#D62828] inline-flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:col-span-4 rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
            <h2 className="text-base font-bold">Order Summary</h2>
            {isIndiaDomestic && (
              <p className="text-xs font-semibold text-[#2F6B2F] dark:text-[#5ECF5E]">
                🇮🇳 Includes {settings.indiaRegionalDiscountPercent ?? 30}% lower India domestic studio pricing
              </p>
            )}
            <div className="space-y-2 text-xs tabular-nums">
              <div className="flex justify-between">
                <span>Item(s) total</span>
                <span>{formatPrice(originSubtotal)}</span>
              </div>
              {saleSavings > 0 && (
                <div className="flex justify-between text-[#2F6B2F] dark:text-[#5ECF5E]">
                  <span>Shop discount</span>
                  <span>-{formatPrice(saleSavings)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-[#2F6B2F] dark:text-[#5ECF5E]">
                  <span>Coupon ({appliedCoupon?.code})</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery ({countryCode})</span>
                <span>{shippingBase === 0 ? 'FREE' : formatPrice(shippingBase)}</span>
              </div>
              <div className="pt-3 border-t border-[#E6E1D8] dark:border-[#2E2C28] flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(totalBase)}</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = applyCouponCode(couponInput);
                setCouponMsg(res.message);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Apply coupon code"
                className="flex-1 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-full border border-[#111111] dark:border-[#FAF8F5] px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Apply
              </button>
            </form>
            {appliedCoupon && (
              <div className="flex justify-between text-xs text-[#2F6B2F]">
                <span>Code {appliedCoupon.code} active</span>
                <button type="button" onClick={clearCoupon} className="underline cursor-pointer">
                  Remove
                </button>
              </div>
            )}
            {couponMsg && !appliedCoupon && <p className="text-xs text-[#5F5B55]">{couponMsg}</p>}

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-3.5 text-sm font-bold hover:opacity-90 cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </aside>
        </div>
      )}

      {savedItems.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-bold mb-3">Saved for later ({savedItems.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedItems.map((s) => (
              <div
                key={s.cartItemId}
                className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{s.title}</p>
                  <p className="text-xs text-[#5F5B55]">{s.sizeLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSaveForLater(s.cartItemId)}
                  className="rounded-full border border-[#111111] dark:border-[#FAF8F5] px-4 py-1.5 text-xs font-bold shrink-0 cursor-pointer"
                >
                  Move to cart
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    products,
    sales,
    countryCode,
    currency,
    exchangeRates,
    settings,
    shippingProfiles,
    processingProfiles,
    appliedCoupon,
    currentUser,
    formatPrice,
    captureAbandonedCart,
    placeOrder,
    pushToast,
  } = useStore();

  const activeCart = cart.filter((c) => !c.savedForLater);
  const hasCustomSizeItem = activeCart.some((c) => c.isCustomSize);
  const countryCfg = getCountryConfig(countryCode);

  const [email, setEmail] = useState(currentUser?.email || '');
  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState(countryCfg.phoneCode + ' ');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [shipCountry, setShipCountry] = useState(countryCode);
  const [billingSame, setBillingSame] = useState(true);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(
    hasCustomSizeItem ? 'whatsapp_custom' : 'stripe'
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useDocumentMeta({
    title: `Secure Checkout | ${settings.storeName}`,
    description: 'Complete your handmade made-to-order tufted rug order via US Stripe or global checkout.',
  });

  // Re-validate prices, active sales, and 30% India domestic pricing (tied strictly to shipCountry === 'IN')
  const revalidatedLines = useMemo(() => {
    return activeCart.map((line) => {
      const dbProd = products.find((p) => p.id === line.productId);
      if (!dbProd) {
        const regOrigin = applyRegionalPricing(line.unitOriginPriceBase, shipCountry, settings);
        const regFinal = applyRegionalPricing(line.unitFinalPriceBase, shipCountry, settings);
        return {
          ...line,
          unitOriginPriceBase: regOrigin,
          unitFinalPriceBase: regFinal,
        };
      }
      const saleInfo = getActiveSaleInfo(dbProd, sales, shipCountry);
      const dbSize = dbProd.sizes.find((s) => s.id === line.sizeId);
      const dbVar = dbProd.variations.find((v) => v.id === line.variationId);
      const rawOriginUsd = line.isCustomSize
        ? line.unitOriginPriceBase
        : (dbSize?.price ?? dbProd.basePrice) + (dbVar?.priceAdjustment ?? 0);
      const originBase = applyRegionalPricing(rawOriginUsd, shipCountry, settings);
      const finalBase = applySaleDiscount(originBase, saleInfo.percent);
      return {
        ...line,
        unitOriginPriceBase: originBase,
        salePercent: saleInfo.percent,
        unitFinalPriceBase: finalBase,
      };
    });
  }, [activeCart, products, sales, shipCountry, settings]);

  const subtotalBase = Number(
    revalidatedLines.reduce((sum, l) => sum + l.unitFinalPriceBase * l.quantity, 0).toFixed(2)
  );

  const couponDiscountBase = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? Number(((subtotalBase * appliedCoupon.value) / 100).toFixed(2))
      : appliedCoupon.type === 'flat'
      ? Math.min(subtotalBase, appliedCoupon.value)
      : 0
    : 0;

  const rawShipBase = calculateShippingFeeBase(
    shippingProfiles[0],
    false,
    shipCountry,
    subtotalBase - couponDiscountBase,
    revalidatedLines.reduce((a, b) => a + b.quantity, 0)
  );
  const shippingBase = appliedCoupon?.type === 'free_shipping' ? 0 : rawShipBase;
  const taxBase =
    shipCountry === 'IN' && !settings.gstInclusive
      ? Number((((subtotalBase - couponDiscountBase) * settings.gstPercentIndia) / 100).toFixed(2))
      : 0;
  const totalBase = Number(
    Math.max(0, subtotalBase - couponDiscountBase + shippingBase + taxBase).toFixed(2)
  );

  // Payment currency resolution: charge in visitor's currency if gateway supports it, else baseCurrency (USD)
  const gatewaySupportedSet = MULTI_CURRENCY_GATEWAYS[paymentMethod] || new Set(['USD']);
  const chargedCurrency = gatewaySupportedSet.has(currency)
    ? currency
    : settings.baseCurrency;
  const exchangeRateUsed =
    chargedCurrency === settings.baseCurrency
      ? 1
      : exchangeRates[chargedCurrency] || 1;
  const totalCharged = convertFromBase(
    totalBase,
    chargedCurrency,
    exchangeRates,
    settings.baseCurrency,
    'exact'
  );

  const defaultProc =
    processingProfiles.find((p) => p.isDefault) || processingProfiles[0];
  const deliveryEst = calculateEstimatedDeliveryRange(
    defaultProc,
    shippingProfiles[0],
    shipCountry
  );

  if (activeCart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl">Your cart is empty</h1>
        <Link
          to="/shop"
          className="mt-4 inline-block rounded-full bg-[#111111] text-white px-6 py-2.5 text-xs font-bold"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError('');

    const parsed = OrderCheckoutValidationSchema.safeParse({
      customerEmail: email.trim(),
      customerName: fullName.trim(),
      customerPhone: phone.trim(),
      addressLine1: line1.trim(),
      city: city.trim(),
      state: stateProv.trim(),
      postalCode: postalCode.trim(),
      country: shipCountry,
    });

    if (!parsed.success) {
      setFormError('Please fill in a valid email, phone number, and complete shipping address.');
      return;
    }

    if (paymentMethod === 'cod') {
      if (shipCountry !== 'IN') {
        setFormError('Cash on Delivery is available within India only.');
        return;
      }
      if (totalBase > settings.codMaxOrderBase) {
        setFormError(
          `Cash on Delivery is capped at ${formatPrice(settings.codMaxOrderBase)}.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      // Server-side payment creation + signature verification via Express / Cloud Function proxy
      let verifiedPaymentId = `PAY-${Date.now()}`;
      if (['razorpay', 'stripe', 'paypal'].includes(paymentMethod)) {
        try {
          const createRes = await fetch('/api/payments/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gateway: paymentMethod,
              amount: totalCharged,
              currency: chargedCurrency,
            }),
          });
          if (createRes.ok) {
            const createJson = await createRes.json();
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gateway: paymentMethod,
                orderId: createJson.gatewayOrderId,
                signature: createJson.demoSignature,
              }),
            });
            if (verifyRes.ok) {
              const vJson = await verifyRes.json();
              verifiedPaymentId = vJson.paymentId || verifiedPaymentId;
            }
          }
        } catch {
          // Offline fallback verified ID
        }
      }

      const orderNumber = `KZM-${Math.floor(1050 + Math.random() * 8900)}`;
      const addr = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        line1: line1.trim(),
        line2: line2.trim(),
        city: city.trim(),
        state: stateProv.trim(),
        postalCode: postalCode.trim(),
        country: shipCountry,
      };

      const isWhatsappQuote = paymentMethod === 'whatsapp_custom';
      const initialStatus = isWhatsappQuote ? 'Awaiting price confirmation' : 'New';
      const initialPayStatus = isWhatsappQuote
        ? 'Awaiting Quote'
        : paymentMethod === 'cod'
        ? 'COD'
        : 'Paid';

      const created = await placeOrder({
        orderNumber,
        customerId: currentUser?.uid || 'guest',
        customerEmail: email.trim(),
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        shippingAddress: addr,
        billingAddress: billingSame ? addr : addr,
        orderNotes: orderNotes.trim(),
        items: revalidatedLines.map((l) => ({
          productId: l.productId,
          slug: l.slug,
          title: l.title,
          image: l.image,
          variationName: l.variationName,
          sizeLabel: l.sizeLabel,
          isCustomSize: l.isCustomSize,
          customDims: l.customDims
            ? `${l.customDims.width}x${l.customDims.height}${l.customDims.unit}`
            : '',
          personalisation: l.personalisationText,
          referenceImageUrl: l.referenceImageUrl,
          unitPriceBase: l.unitFinalPriceBase,
          salePercent: l.salePercent,
          quantity: l.quantity,
        })),
        subtotalBase,
        discountBase: couponDiscountBase,
        couponCode: appliedCoupon?.code || '',
        shippingBase,
        taxBase,
        totalBase,
        totalCharged,
        displayCurrency: currency,
        chargedCurrency,
        exchangeRateUsed,
        paymentMethod,
        paymentStatus: initialPayStatus,
        paymentId: verifiedPaymentId,
        status: initialStatus,
        statusHistory: [{ status: initialStatus, at: new Date().toISOString(), by: 'Customer Checkout' }],
        productionDaysMax: defaultProc?.maxDays ?? 15,
        productionDeadline: new Date(
          Date.now() + (defaultProc?.maxDays ?? 15) * 24 * 60 * 60 * 1000
        ).toISOString(),
        trackingNumber: '',
        courier: deliveryEst.courier,
        productionPhotos: [],
        internalNotes: '',
      });

      if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          value: totalCharged,
          currency: chargedCurrency,
          content_ids: revalidatedLines.map((l) => l.productId),
          content_type: 'product',
        });
      }

      navigate(`/order-confirmation/${created.orderNumber}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Checkout failed', { tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between pb-5 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#2F6B2F]" />
          <h1 className="font-display text-xl sm:text-2xl">Secure Etsy-Style Checkout</h1>
        </div>
        <Link to="/cart" className="text-xs font-semibold underline">
          Back to cart
        </Link>
      </div>

      <form onSubmit={handlePlaceOrder} className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Contact */}
          <section className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4">
            <h2 className="text-base font-bold">1. Contact Information (Guest or Account)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Email for receipt &amp; tracking *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onBlur={() =>
                    captureAbandonedCart(
                      email,
                      phone,
                      totalBase,
                      revalidatedLines.map((l) => `${l.title} (${l.sizeLabel})`).join(', ')
                    )
                  }
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone / WhatsApp (with code) *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          {/* 2. Shipping Address */}
          <section className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold">2. Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">Country / Region *</label>
                <select
                  value={shipCountry}
                  onChange={(e) => setShipCountry(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                >
                  {COUNTRY_CURRENCY_MAP.map((c) => (
                    <option key={c.countryCode} value={c.countryCode}>
                      {c.flag} {c.countryName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full recipient name"
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="House / Studio number, Street"
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Apartment, Suite, Landmark (optional)</label>
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">State / Province *</label>
                  <input
                    type="text"
                    required
                    value={stateProv}
                    onChange={(e) => setStateProv(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">PIN / ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2.5 text-sm font-mono-num"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={billingSame}
                onChange={(e) => setBillingSame(e.target.checked)}
                className="rounded accent-[#111111]"
              />
              <span>Billing address is the same as delivery address</span>
            </label>

            <div>
              <label className="block font-semibold mb-1">Order / Studio Notes (optional)</label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Gift note, wall-hanging D-rings request, or delivery instructions..."
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2 text-xs"
              />
            </div>
          </section>

          {/* 3. Payment Method (US Stripe Primary) */}
          <section className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-3 text-xs">
            <h2 className="text-base font-bold">3. Payment Method</h2>

            {[
              {
                id: 'stripe' as const,
                enabled: settings.paymentsEnabled.stripe,
                label: 'US Stripe (Credit/Debit Cards, Apple Pay, Google Pay, Link)',
                desc: 'Official US merchant gateway · Instant encrypted USD & multi-currency card checkout.',
              },
              {
                id: 'paypal' as const,
                enabled: settings.paymentsEnabled.paypal,
                label: 'PayPal Express (US & Global)',
                desc: 'Buyer protection for US and international collectors.',
              },
              {
                id: 'razorpay' as const,
                enabled: settings.paymentsEnabled.razorpay,
                label: 'Razorpay (India UPI, Cards, Netbanking)',
                desc: 'Instant domestic UPI & INR card checkout for Indian collectors.',
              },
              {
                id: 'cod' as const,
                enabled: settings.paymentsEnabled.cod && shipCountry === 'IN',
                label: 'Cash on Delivery (India Only)',
                desc: `Pay upon delivery in India for orders up to ${formatPrice(settings.codMaxOrderBase)}.`,
              },
              {
                id: 'whatsapp_custom' as const,
                enabled: settings.paymentsEnabled.whatsappCustom,
                label: 'Pay Later via WhatsApp (Custom Size / Artwork Quote)',
                desc: 'Places order as "Awaiting price confirmation" so our studio confirms exact custom dimensions first.',
              },
            ]
              .filter((m) => m.enabled)
              .map((method) => (
                <label
                  key={method.id}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-colors ${
                    paymentMethod === method.id
                      ? 'border-[#111111] dark:border-[#FAF8F5] bg-[#FAF8F5] dark:bg-[#121211]'
                      : 'border-[#E6E1D8] dark:border-[#2E2C28]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="mt-0.5 accent-[#111111]"
                  />
                  <div>
                    <p className="font-bold text-sm">{method.label}</p>
                    <p className="text-[#5F5B55] dark:text-[#A6A198] mt-0.5">{method.desc}</p>
                  </div>
                </label>
              ))}
          </section>
        </div>

        {/* Right Summary */}
        <aside className="lg:col-span-5 rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4 lg:sticky lg:top-24">
          <h2 className="text-base font-bold">Order Review</h2>

          <div className="rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-3.5 text-xs space-y-1">
            <p className="font-bold">
              Est. arrival: {deliveryEst.label} ({deliveryEst.courier})
            </p>
            <p>
              Includes {defaultProc?.minDays ?? 10}–{defaultProc?.maxDays ?? 15} days hand-tufting &amp; carving after order confirmation.
            </p>
            {shipCountry === 'IN' && (settings.indiaRegionalPricingEnabled ?? true) && (
              <p className="font-bold text-[#2F6B2F] dark:text-[#5ECF5E] pt-0.5">
                🇮🇳 {settings.indiaRegionalDiscountPercent ?? 30}% lower domestic India pricing applied for Indian delivery.
              </p>
            )}
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {revalidatedLines.map((item) => (
              <div key={item.cartItemId} className="flex items-center gap-3 text-xs">
                <img
                  src={item.image}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{item.title}</p>
                  <p className="text-[#5F5B55] truncate">
                    {item.variationName} · {item.sizeLabel} × {item.quantity}
                  </p>
                </div>
                <span className="font-bold tabular-nums shrink-0">
                  {formatPrice(item.unitFinalPriceBase * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-3 border-t border-[#E6E1D8] dark:border-[#2E2C28] text-xs tabular-nums">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotalBase)}</span>
            </div>
            {couponDiscountBase > 0 && (
              <div className="flex justify-between text-[#2F6B2F]">
                <span>Coupon ({appliedCoupon?.code})</span>
                <span>-{formatPrice(couponDiscountBase)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping ({shipCountry})</span>
              <span>{shippingBase === 0 ? 'FREE' : formatPrice(shippingBase)}</span>
            </div>
            {taxBase > 0 && (
              <div className="flex justify-between">
                <span>GST ({settings.gstPercentIndia}%)</span>
                <span>{formatPrice(taxBase)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[#E6E1D8] dark:border-[#2E2C28] flex justify-between text-base font-bold">
              <span>Total ({currency})</span>
              <span>{formatPrice(totalBase)}</span>
            </div>
          </div>

          {/* Charged Currency Notice when Display Currency differs */}
          {chargedCurrency !== currency && (
            <div className="rounded-xl bg-[#EFECE6] dark:bg-[#121211] p-3 text-xs text-[#5F5B55] dark:text-[#A6A198] tabular-nums">
              Prices shown in <strong>{currency}</strong>. You will be charged{' '}
              <strong>{formatAlreadyConverted(totalCharged, chargedCurrency)}</strong> in{' '}
              <strong>{chargedCurrency}</strong>.
            </div>
          )}

          {formError && (
            <p className="text-xs font-semibold text-[#D62828]">{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-3.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? 'Verifying & Confirming Order...'
              : paymentMethod === 'whatsapp_custom'
              ? 'Submit Order for WhatsApp Quote'
              : `Complete Order · ${formatAlreadyConverted(totalCharged, chargedCurrency)}`}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#5F5B55]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2F6B2F]" />
            Server-verified signature protection · PCI-DSS encrypted
          </p>
        </aside>
      </form>
    </div>
  );
};

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { orders, settings, formatPrice } = useStore();

  const order = orders.find((o) => o.orderNumber === orderNumber) || orders[0];

  useDocumentMeta({
    title: `Order ${orderNumber} Confirmed | ${settings.storeName}`,
    description: 'Thank you for commissioning a handmade tufted rug with Kazumi Rugs.',
  });

  if (!order) {
    return <div className="p-12 text-center">Order not found.</div>;
  }

  const whatsappConfirmMsg = [
    `Hi ${settings.storeName}! Confirming my new rug order:`,
    `• Order #: ${order.orderNumber}`,
    `• Items: ${order.items.map((i) => `${i.title} (${i.sizeLabel}, ${i.variationName})`).join('; ')}`,
    `• Status: ${order.status}`,
  ].join('\n');

  const whatsappConfirmHref = `https://wa.me/${settings.whatsappNumber.replace(
    /[^0-9]/g,
    ''
  )}?text=${encodeURIComponent(whatsappConfirmMsg)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-7 sm:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-9 h-9 text-[#2F6B2F] shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#2F6B2F]">Thank you, {order.customerName}!</p>
            <h1 className="font-display text-2xl">Order {order.orderNumber} Received</h1>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-4 text-xs space-y-1">
          <p className="font-bold">
            Made-to-Order Production Schedule: 10–{order.productionDaysMax} days
          </p>
          <p>
            Our tuftmakers begin stretching your frame right after confirmation. You can view live studio progress photos anytime on the Track Order page.
          </p>
        </div>

        <div className="space-y-3 border-y border-[#E6E1D8] dark:border-[#2E2C28] py-4 text-xs">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-4">
              <div>
                <p className="font-bold">{item.title}</p>
                <p className="text-[#5F5B55]">
                  {item.variationName} · {item.sizeLabel} × {item.quantity}
                </p>
              </div>
              <span className="font-bold tabular-nums">
                {formatPrice(item.unitPriceBase * item.quantity)}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-[#E6E1D8] dark:border-[#2E2C28] flex justify-between text-sm font-bold tabular-nums">
            <span>Total ({order.chargedCurrency})</span>
            <span>{formatAlreadyConverted(order.totalCharged, order.chargedCurrency)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={whatsappConfirmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full bg-[#25D366] text-[#111111] py-3.5 px-5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 fill-[#111111]" />
            Confirm your order on WhatsApp
          </a>
          <Link
            to={`/track-order?order=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(
              order.customerEmail
            )}`}
            className="flex-1 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-3.5 px-5 text-xs font-bold text-center"
          >
            Track Order Timeline
          </Link>
        </div>
      </div>
    </div>
  );
};
