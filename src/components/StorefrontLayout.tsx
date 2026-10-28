import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart,
  Home,
  MessageCircle,
  Moon,
  Search,
  ShoppingBag,
  Store,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../context/useStore';
import { getCountryConfig } from '../utils/currencies';
import { CartDrawer } from './CartDrawer';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';
import { RegionCurrencyModal } from './RegionCurrencyModal';

export const StorefrontLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    settings,
    countryCode,
    currency,
    language,
    theme,
    toggleTheme,
    cart,
    favourites,
    products,
    categories,
    setRegionModalOpen,
    setCartDrawerOpen,
    cookieConsent,
    setCookieConsent,
    subscribeNewsletter,
    toasts,
    dismissToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const countryCfg = getCountryConfig(countryCode);
  const activeCartCount = cart
    .filter((c) => !c.savedForLater)
    .reduce((acc, c) => acc + c.quantity, 0);

  const isCheckout = location.pathname.startsWith('/checkout');

  const liveSuggestions =
    searchQuery.trim().length >= 2
      ? products
          .filter(
            (p) =>
              p.status === 'active' &&
              (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.tags.some((tg) => tg.toLowerCase().includes(searchQuery.toLowerCase())))
          )
          .slice(0, 5)
      : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchFocused(false);
    navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const whatsappHref = `https://wa.me/${settings.whatsappNumber.replace(
    /[^0-9]/g,
    ''
  )}?text=${encodeURIComponent(
    `Hi ${settings.storeName}! I have a question about commissioning a handmade tufted rug.`
  )}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] dark:bg-[#121211] text-[#1A1918] dark:text-[#F4F1EA]">
      {/* Vacation Mode Banner */}
      {settings.vacationMode && (
        <div className="bg-[#E9A820] text-[#111111] px-4 py-2 text-center text-xs font-semibold">
          {settings.vacationMessage}
        </div>
      )}

      {/* Slim Dismissible Announcement Bar (<= 36px height) */}
      {settings.announcementVisible && !bannerDismissed && (
        <div className="bg-[#111111] text-[#FAF8F5] px-4 h-9 flex items-center justify-between text-xs">
          <div className="mx-auto flex items-center gap-2 truncate">
            <span className="font-medium truncate">{settings.announcementLeft}</span>
            <span className="hidden sm:inline opacity-50" aria-hidden="true">·</span>
            <span className="hidden sm:inline text-[#F5EBC8] truncate">
              {settings.announcementRight}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-white/70 hover:text-white p-1 cursor-pointer shrink-0"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Storefront Header */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 dark:bg-[#121211]/95 backdrop-blur border-b border-[#E6E1D8] dark:border-[#2E2C28]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark (Official Single-Brand Studio) */}
          <Link
            to="/"
            className="flex flex-col leading-none shrink-0"
          >
            <span className="font-display text-xl sm:text-2xl tracking-tight text-[#111111] dark:text-[#FAF8F5] whitespace-nowrap">
              {settings.storeName}
            </span>
            {settings.primaryDomain && (
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#5F5B55] dark:text-[#A6A198]">
                {settings.primaryDomain}
              </span>
            )}
          </Link>

          {/* Etsy-style Live Search Bar */}
          <div className="relative flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="search"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label="Search Kazumi Rugs"
                className="w-full rounded-full border-2 border-[#1A1918] dark:border-[#F4F1EA]/40 bg-white dark:bg-[#1C1B19] pl-4 pr-11 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D62828]"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute right-1.5 w-8 h-8 rounded-full bg-[#111111] dark:bg-[#F4F1EA] text-white dark:text-[#111111] flex items-center justify-center hover:bg-[#D62828] dark:hover:bg-[#E9A820] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {searchFocused && liveSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 rounded-2xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] shadow-xl overflow-hidden z-50">
                {liveSuggestions.map((item) => (
                  <Link
                    key={item.id}
                    to={`/product/${item.slug}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAF8F5] dark:hover:bg-white/5 text-sm"
                  >
                    <img
                      src={item.images[0]?.url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover shrink-0"
                    />
                    <span className="truncate font-medium">{item.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setRegionModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Region, currency and language"
            >
              <span>{countryCfg.flag}</span>
              <span>{currency}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark or light theme"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/admin"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-1.5 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap shrink-0"
            >
              <Store className="w-3.5 h-3.5" />
              {t('shopManager')}
            </Link>

            <Link
              to="/favourites"
              aria-label="Favourites"
              className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors hidden sm:inline-flex"
            >
              <Heart className="w-5 h-5" />
              {favourites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#D62828] text-white text-[10px] font-bold flex items-center justify-center px-1 tabular-nums">
                  {favourites.length}
                </span>
              )}
            </Link>

            <Link
              to="/account"
              aria-label="Your account"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors hidden sm:inline-flex"
            >
              <User className="w-5 h-5" />
            </Link>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              aria-label="Open shopping cart"
              className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              {activeCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#111111] dark:bg-[#E9A820] text-white dark:text-[#111111] text-[10px] font-bold flex items-center justify-center px-1 tabular-nums">
                  {activeCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop Category Navigation Row */}
        <nav
          aria-label="Shop categories"
          className="hidden md:flex items-center justify-center gap-7 px-6 h-10 border-t border-[#E6E1D8]/70 dark:border-[#2E2C28]/70 text-xs font-medium text-[#5F5B55] dark:text-[#A6A198]"
        >
          <Link
            to="/shop"
            className="hover:text-[#1A1918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            All Rugs
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${encodeURIComponent(cat.id)}`}
              className="hover:text-[#1A1918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {cat.name}
            </Link>
          ))}
          <Link
            to="/shop?sale=true"
            className="text-[#2F6B2F] dark:text-[#5ECF5E] font-semibold hover:underline whitespace-nowrap shrink-0"
          >
            Active Sales
          </Link>
            <Link
            to="/track-order"
            className="hover:text-[#1A1918] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {t('trackOrder')}
          </Link>
        </nav>

        {/* Automatic India 30% Factory-Direct Regional Pricing Strip */}
        {countryCode === 'IN' && (settings.indiaRegionalPricingEnabled ?? true) && (
          <div className="bg-[#2F6B2F] text-white px-4 py-1.5 text-center text-[11px] font-semibold">
            🇮🇳 Handcrafted in India: Automatic {settings.indiaRegionalDiscountPercent ?? 30}% lower domestic studio pricing active in ₹ INR (no international air-freight).
          </div>
        )}
      </header>

      {/* Main Route Viewport */}
      <main className="flex-1 pb-24 md:pb-12">
        <Outlet />
      </main>

      {/* Storefront Footer */}
      <footer className="border-t border-[#E6E1D8] dark:border-[#2E2C28] bg-[#F4F0E8] dark:bg-[#181715] pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <span className="font-display text-xl">{settings.storeName}</span>
            <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] leading-relaxed">
              Handmade tattoo-flash and anime tufted rugs carved to order. Every rug takes 10–15 days of studio production before insured worldwide dispatch.
            </p>
            <div className="pt-1">
              <PWAInstallButton />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold mb-3">Shop &amp; Commissions</h3>
            <ul className="space-y-2 text-xs text-[#5F5B55] dark:text-[#A6A198]">
              <li><Link to="/shop" className="hover:underline">All Handmade Rugs</Link></li>
              <li><Link to="/shop?sale=true" className="hover:underline">Current Studio Sale</Link></li>
              <li><Link to="/page/size-guide" className="hover:underline">Size &amp; Placement Guide</Link></li>
              <li><Link to="/track-order" className="hover:underline">Track Your Order</Link></li>
              <li><Link to="/admin" className="hover:underline font-semibold">Seller Shop Manager (/admin)</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold mb-3">Studio Policies</h3>
            <ul className="space-y-2 text-xs text-[#5F5B55] dark:text-[#A6A198]">
              <li><Link to="/page/about" className="hover:underline">About Kazumi Rugs</Link></li>
              <li><Link to="/page/shipping-policy" className="hover:underline">Shipping &amp; 10–15 Day Production</Link></li>
              <li><Link to="/page/returns" className="hover:underline">Returns &amp; Exchanges</Link></li>
              <li><Link to="/page/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link to="/page/terms" className="hover:underline">Terms of Use</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold mb-3">Flash Drops &amp; Studio Notes</h3>
            <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mb-3">
              Get early access to limited limited-edition tattoo flash drops and studio coupons.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail.includes('@')) {
                  subscribeNewsletter(newsletterEmail);
                  setNewsletterEmail('');
                }
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 min-w-0 rounded-full border border-[#1A1918]/25 dark:border-white/20 bg-white dark:bg-[#121211] px-3.5 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-full bg-[#111111] dark:bg-[#F4F1EA] text-white dark:text-[#111111] px-4 py-2 text-xs font-semibold shrink-0 cursor-pointer"
              >
                Join
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#5F5B55] dark:text-[#A6A198]">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a>
              <span>·</span>
              <a
                href={`https://www.instagram.com/${(settings.instagramHandle || '@inkedrug').replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-semibold text-[#D62828]"
              >
                Instagram {settings.instagramHandle || '@inkedrug'}
              </a>
              <span>·</span>
              <a href="https://www.pinterest.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Pinterest</a>
              <span>·</span>
              <a href="/feeds/pinterest.csv" target="_blank" rel="noopener noreferrer" className="hover:underline">Catalog Feed</a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-[#E6E1D8] dark:border-[#2E2C28] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5F5B55] dark:text-[#A6A198]">
          <button
            type="button"
            onClick={() => setRegionModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#1A1918]/20 dark:border-white/20 px-4 py-1.5 font-semibold text-[#1A1918] dark:text-[#F4F1EA] cursor-pointer"
          >
            <span>{countryCfg.flag}</span>
            <span>{countryCfg.countryName}</span>
            <span>|</span>
            <span>{language === 'hi' ? 'हिन्दी' : 'English'}</span>
            <span>|</span>
            <span>{currency}</span>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>US Stripe · Apple Pay · Google Pay · PayPal · Razorpay</span>
            <span>
              © {new Date().getFullYear()} {settings.storeName} ({settings.primaryDomain || 'inkedrug.com'})
            </span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Chat Button */}
      {settings.whatsappFloatingEnabled && !isCheckout && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with Kazumi Rugs on WhatsApp"
          className="fixed right-4 bottom-20 md:bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] text-[#111111] font-bold px-4 py-2.5 text-xs shadow-lg hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-4 h-4 fill-[#111111]" />
          <span className="hidden sm:inline">WhatsApp Studio</span>
        </a>
      )}

      {/* Mobile Floating Rounded Bottom Navigation */}
      {!isCheckout && (
        <nav
          aria-label="Mobile bottom navigation"
          className="md:hidden fixed bottom-3 left-3 right-3 z-40 h-14 rounded-full bg-[#111111]/95 text-white px-4 flex items-center justify-around shadow-xl"
        >
          <Link to="/" className="flex flex-col items-center gap-0.5 text-[10px]">
            <Home className="w-4 h-4" />
            <span>{t('home')}</span>
          </Link>
          <Link to="/shop" className="flex flex-col items-center gap-0.5 text-[10px]">
            <Store className="w-4 h-4" />
            <span>{t('shop')}</span>
          </Link>
          <Link to="/favourites" className="relative flex flex-col items-center gap-0.5 text-[10px]">
            <Heart className="w-4 h-4" />
            <span>{t('favourites')}</span>
          </Link>
          <Link to="/account" className="flex flex-col items-center gap-0.5 text-[10px]">
            <User className="w-4 h-4" />
            <span>{t('you')}</span>
          </Link>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            className="relative flex flex-col items-center gap-0.5 text-[10px] cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('cart')}</span>
            {activeCartCount > 0 && (
              <span className="absolute -top-1 right-0 min-w-[15px] h-[15px] rounded-full bg-[#E9A820] text-[#111111] text-[9px] font-bold flex items-center justify-center px-1 tabular-nums">
                {activeCartCount}
              </span>
            )}
          </button>
        </nav>
      )}

      {/* Cookie Consent Banner (controls analytics & ad pixels) */}
      {cookieConsent === null && (
        <div className="fixed bottom-20 md:bottom-4 left-4 max-w-sm z-40 rounded-2xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-4 shadow-xl text-xs">
          <p className="text-[#5F5B55] dark:text-[#A6A198] leading-relaxed">
            We use cookies for region/currency memory and optional Meta Pixel, Pinterest &amp; GA4 analytics.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCookieConsent('accepted')}
              className="rounded-full bg-[#111111] dark:bg-[#F4F1EA] text-white dark:text-[#111111] px-4 py-1.5 font-semibold cursor-pointer"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={() => setCookieConsent('essential')}
              className="rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-4 py-1.5 font-medium cursor-pointer"
            >
              Essential Only
            </button>
          </div>
        </div>
      )}

      {/* Global Toast Stack with One-Click Undo */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-full bg-[#111111] text-white px-4 py-2.5 text-xs font-medium shadow-xl"
          >
            <span>{toast.message}</span>
            <div className="flex items-center gap-2 shrink-0">
              {toast.undoLabel && toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo?.();
                    dismissToast(toast.id);
                  }}
                  className="text-[#E9A820] font-bold underline cursor-pointer"
                >
                  {toast.undoLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-white/60 hover:text-white cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <RegionCurrencyModal />
      <CartDrawer />
      <OfflineIndicator />
    </div>
  );
};
