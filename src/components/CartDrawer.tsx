import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/useStore';
import { applyRegionalPricing, calculateShippingFeeBase } from '../utils/pricing';
import { ResilientImage } from './ResilientImage';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    cart,
    cartDrawerOpen,
    setCartDrawerOpen,
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
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);

  if (!cartDrawerOpen) return null;

  const activeItems = cart.filter((c) => !c.savedForLater);
  const savedItems = cart.filter((c) => c.savedForLater);
  const isIndiaDomestic =
    countryCode === 'IN' && (settings.indiaRegionalPricingEnabled ?? true);

  const originSubtotalBase = activeItems.reduce(
    (sum, item) =>
      sum + applyRegionalPricing(item.unitOriginPriceBase, countryCode, settings) * item.quantity,
    0
  );
  const saleSubtotalBase = activeItems.reduce(
    (sum, item) =>
      sum + applyRegionalPricing(item.unitFinalPriceBase, countryCode, settings) * item.quantity,
    0
  );
  const saleSavingsBase = Number(Math.max(0, originSubtotalBase - saleSubtotalBase).toFixed(2));

  let couponDiscountBase = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      couponDiscountBase = Number(((saleSubtotalBase * appliedCoupon.value) / 100).toFixed(2));
    } else if (appliedCoupon.type === 'flat') {
      couponDiscountBase = Math.min(saleSubtotalBase, appliedCoupon.value);
    }
  }

  const defaultShipProfile = shippingProfiles[0];
  const rawShipBase =
    activeItems.length === 0
      ? 0
      : calculateShippingFeeBase(
          defaultShipProfile,
          false,
          countryCode,
          saleSubtotalBase - couponDiscountBase,
          activeItems.reduce((a, b) => a + b.quantity, 0)
        );
  const shippingBase = appliedCoupon?.type === 'free_shipping' ? 0 : rawShipBase;
  const totalBase = Math.max(0, saleSubtotalBase - couponDiscountBase + shippingBase);

  const defaultProc =
    processingProfiles.find((p) => p.isDefault) || processingProfiles[0];

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyCouponCode(couponInput);
    setCouponFeedback(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="w-full max-w-md bg-[#FAF8F5] dark:bg-[#1C1B19] h-full flex flex-col shadow-2xl border-l border-[#E6E1D8] dark:border-[#2E2C28]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="text-base font-bold">
              Your Cart ({activeItems.reduce((a, b) => a + b.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeItems.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-[#5F5B55] dark:text-[#A6A198]">
                Your cart is empty. Every Kazumi rug is tufted by hand to order!
              </p>
              <Link
                to="/shop"
                onClick={() => setCartDrawerOpen(false)}
                className="mt-4 inline-block rounded-full bg-[#111111] text-white px-6 py-2.5 text-xs font-semibold"
              >
                Browse Tattoo &amp; Anime Rugs
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-[#F5EBC8] dark:bg-[#2B2416] p-3 text-xs text-[#1A1918] dark:text-[#F4F1EA]">
                <strong>Made to order:</strong> Ready in {defaultProc?.minDays ?? 10}–{defaultProc?.maxDays ?? 15} days after order confirmation, then tracked shipping.
              </div>

              {activeItems.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex gap-3.5 pb-4 border-b border-[#E6E1D8] dark:border-[#2E2C28]"
                >
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={() => setCartDrawerOpen(false)}
                    className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[#E6E1D8] dark:border-[#2E2C28]"
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
                      onClick={() => setCartDrawerOpen(false)}
                      className="text-sm font-semibold line-clamp-1 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-0.5">
                      {item.variationName} · {item.sizeLabel}
                    </p>
                    {item.personalisationText && (
                      <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-0.5 truncate">
                        Note: {item.personalisationText}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-baseline gap-1.5 tabular-nums">
                      <span
                        className={`text-sm font-bold ${
                          item.salePercent > 0
                            ? 'text-[#2F6B2F] dark:text-[#5ECF5E]'
                            : ''
                        }`}
                      >
                        {item.isCustomSize && item.unitFinalPriceBase === 0
                          ? 'Quote via WhatsApp'
                          : formatPrice(
                              applyRegionalPricing(item.unitFinalPriceBase, countryCode, settings) *
                                item.quantity
                            )}
                      </span>
                      {item.salePercent > 0 && item.unitOriginPriceBase > item.unitFinalPriceBase && (
                        <span className="text-xs line-through text-[#5F5B55]">
                          {formatPrice(
                            applyRegionalPricing(item.unitOriginPriceBase, countryCode, settings) *
                              item.quantity
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#121211]">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.cartItemId, item.quantity - 1)}
                          className="p-1.5 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.cartItemId, item.quantity + 1)}
                          className="p-1.5 cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleSaveForLater(item.cartItemId)}
                          className="text-[#5F5B55] hover:underline cursor-pointer"
                        >
                          Save for later
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.cartItemId)}
                          className="text-[#D62828] hover:opacity-80 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Coupon Box */}
              <form onSubmit={handleApplyCoupon} className="pt-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Apply shop coupon (e.g. KAZUMI15)"
                    className="flex-1 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#121211] px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[#2F6B2F] dark:text-[#5ECF5E]">
                    <span>Applied: {appliedCoupon.code}</span>
                    <button
                      type="button"
                      onClick={clearCoupon}
                      className="underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {couponFeedback && !appliedCoupon && (
                  <p className="mt-1 text-xs text-[#5F5B55]">{couponFeedback}</p>
                )}
              </form>
            </>
          )}

          {savedItems.length > 0 && (
            <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
              <h3 className="text-xs font-bold mb-2">Saved for later ({savedItems.length})</h3>
              <div className="space-y-2">
                {savedItems.map((s) => (
                  <div key={s.cartItemId} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[200px]">{s.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleSaveForLater(s.cartItemId)}
                      className="font-semibold underline cursor-pointer"
                    >
                      Move to cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeItems.length > 0 && (
          <div className="p-5 border-t border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#121211] space-y-2">
            {isIndiaDomestic && (
              <div className="text-[11px] font-semibold text-[#2F6B2F] dark:text-[#5ECF5E]">
                ✓ Includes {settings.indiaRegionalDiscountPercent ?? 30}% India domestic studio pricing
              </div>
            )}
            {saleSavingsBase > 0 && (
              <div className="flex justify-between text-xs text-[#2F6B2F] dark:text-[#5ECF5E] tabular-nums">
                <span>Shop discount savings</span>
                <span>-{formatPrice(saleSavingsBase)}</span>
              </div>
            )}
            {couponDiscountBase > 0 && (
              <div className="flex justify-between text-xs text-[#2F6B2F] dark:text-[#5ECF5E] tabular-nums">
                <span>Coupon ({appliedCoupon?.code})</span>
                <span>-{formatPrice(couponDiscountBase)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-[#5F5B55] dark:text-[#A6A198] tabular-nums">
              <span>Est. Delivery ({countryCode})</span>
              <span>{shippingBase === 0 ? 'FREE' : formatPrice(shippingBase)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1 tabular-nums">
              <span>Total</span>
              <span>{formatPrice(totalBase)}</span>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <Link
                to="/cart"
                onClick={() => setCartDrawerOpen(false)}
                className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] py-2.5 text-center text-xs font-semibold"
              >
                View Full Cart
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/checkout');
                }}
                className="rounded-full bg-[#111111] dark:bg-[#F4F1EA] text-white dark:text-[#111111] py-2.5 text-xs font-semibold hover:opacity-90 cursor-pointer"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
