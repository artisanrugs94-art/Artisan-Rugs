/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import './i18n';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminLayout } from './admin/AdminLayout';
import { ListingEditor } from './admin/ListingEditor';
import { ListingsManager } from './admin/ListingsManager';
import {
  FinancesManager,
  MarketingManager,
  PagesAndHomepageEditor,
  ShopSettingsManager,
  StatsManager,
} from './admin/MarketingStatsSettings';
import {
  CustomersManager,
  CustomRequestsManager,
  MessagesInbox,
  OrdersManager,
  ReviewsManager,
} from './admin/OrdersAndMessages';
import { StorefrontLayout } from './components/StorefrontLayout';
import { useStore } from './context/useStore';
import {
  CartPage,
  CheckoutPage,
  OrderConfirmationPage,
} from './pages/CartAndCheckoutPages';
import {
  AccountPage,
  FavouritesPage,
  StaticContentPage,
  TrackOrderPage,
} from './pages/CustomerAndUtilityPages';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const raw = error instanceof Error ? error.message : String(error);
    return { hasError: true, message: raw };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-[#E6E1D8] bg-white p-8 space-y-4 text-center">
            <h1 className="font-display text-xl">Something interrupted the studio</h1>
            <p className="text-xs text-[#5F5B55] break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="rounded-full bg-[#111111] text-white px-6 py-2.5 text-xs font-bold cursor-pointer"
            >
              Reload Kazumi Rugs
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
};

const NotFoundPage: React.FC = () => (
  <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
    <p className="text-xs font-bold uppercase tracking-widest text-[#D62828]">404 · Page Not Found</p>
    <h1 className="font-display text-3xl">This rug moved off the frame</h1>
    <p className="text-sm text-[#5F5B55] dark:text-[#A6A198]">
      Explore our handmade tattoo-flash and anime tufted rugs, or check your 10–15 day commission status.
    </p>
    <div className="flex items-center justify-center gap-3 pt-2">
      <Link
        to="/shop"
        className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-6 py-2.5 text-xs font-bold"
      >
        Browse Shop
      </Link>
      <Link
        to="/track-order"
        className="rounded-full border border-[#111111] dark:border-[#FAF8F5] px-6 py-2.5 text-xs font-bold"
      >
        Track Order
      </Link>
    </div>
  </div>
);

export default function App() {
  const initApp = useStore((s) => s.initApp);

  useEffect(() => {
    initApp();
  }, [initApp]);

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Customer Storefront Routes */}
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route
              path="/order-confirmation/:orderNumber"
              element={<OrderConfirmationPage />}
            />
            <Route path="/favourites" element={<FavouritesPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/pages/:slug" element={<StaticContentPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Etsy Shop Manager Admin Clone (/admin) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="listings" element={<ListingsManager />} />
            <Route path="listings/new" element={<ListingEditor />} />
            <Route path="listings/:id" element={<ListingEditor />} />
            <Route path="orders" element={<OrdersManager />} />
            <Route path="messages" element={<MessagesInbox />} />
            <Route path="custom-requests" element={<CustomRequestsManager />} />
            <Route path="reviews" element={<ReviewsManager />} />
            <Route path="stats" element={<StatsManager />} />
            <Route path="marketing" element={<MarketingManager />} />
            <Route path="finances" element={<FinancesManager />} />
            <Route path="customers" element={<CustomersManager />} />
            <Route path="pages" element={<PagesAndHomepageEditor />} />
            <Route path="settings" element={<ShopSettingsManager />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
