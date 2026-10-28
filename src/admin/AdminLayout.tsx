import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderKanban,
  HelpCircle,
  Home,
  Keyboard,
  KeyRound,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquare,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  Tag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useStore } from '../context/useStore';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../services/firebase';
import { AdminRole } from '../types';
import { getProductionDeadlineBadge } from '../utils/pricing';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    settings,
    products,
    orders,
    conversations,
    customRequests,
    reviews,
    customers,
    adminRole,
    setDemoAdminRole,
    currentUser,
    activeWorkerSession,
    isLiveAdmin,
    signInWithGoogle,
    signInWithWorkerCredentials,
    signOutUser,
    theme,
    toggleTheme,
    toasts,
    dismissToast,
  } = useStore();

  const [collapsed, setCollapsed] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'worker' | 'owner'>('worker');
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerLoginError, setWorkerLoginError] = useState('');
  const [workerLoginBusy, setWorkerLoginBusy] = useState(false);

  const effectiveRole: AdminRole = activeWorkerSession
    ? activeWorkerSession.fullSiteAccess
      ? 'owner'
      : activeWorkerSession.role
    : adminRole || 'owner';
  const canAccessFinancesAndSettings =
    effectiveRole === 'owner' ||
    effectiveRole === 'manager' ||
    Boolean(activeWorkerSession?.fullSiteAccess);

  // Badge counts
  const activeListingsCount = useMemo(
    () => products.filter((p) => p.status === 'active').length,
    [products]
  );
  const openOrdersCount = useMemo(
    () =>
      orders.filter((o) =>
        ['New', 'Confirmed', 'In production', 'Ready to ship', 'Awaiting price confirmation'].includes(
          o.status
        )
      ).length,
    [orders]
  );
  const overdueOrdersCount = useMemo(
    () => orders.filter((o) => getProductionDeadlineBadge(o).isOverdue).length,
    [orders]
  );
  const unreadMessagesCount = useMemo(
    () => conversations.filter((c) => c.unreadByAdmin && !c.archived).length,
    [conversations]
  );
  const newCustomCount = useMemo(
    () => customRequests.filter((r) => r.status === 'New').length,
    [customRequests]
  );
  const pendingReviewsCount = useMemo(
    () => reviews.filter((r) => r.status === 'pending').length,
    [reviews]
  );

  const totalAlerts =
    overdueOrdersCount +
    orders.filter((o) => o.status === 'New').length +
    unreadMessagesCount +
    pendingReviewsCount;

  // Global keyboard shortcuts (Etsy Shop Manager power-seller UX)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setNotifOpen(false);
        setShortcutsOpen(false);
        setMobileMoreOpen(false);
        setLoginModalOpen(false);
        setGlobalQuery('');
        return;
      }

      if (inInput) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/admin/listings/new');
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  // Global search results across listings, orders, and customers
  const globalResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return null;
    const matchedListings = products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 5);
    const matchedOrders = orders
      .filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
      )
      .slice(0, 4);
    const matchedCustomers = customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q)
      )
      .slice(0, 4);
    return { matchedListings, matchedOrders, matchedCustomers };
  }, [globalQuery, products, orders, customers]);

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: Home, end: true },
    {
      to: '/admin/listings',
      label: 'Listings',
      icon: Tag,
      badge: activeListingsCount,
    },
    {
      to: '/admin/orders',
      label: 'Orders & shipping',
      icon: Package,
      badge: openOrdersCount,
      alertBadge: overdueOrdersCount > 0 ? `${overdueOrdersCount} overdue` : undefined,
    },
    {
      to: '/admin/messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount || undefined,
    },
    {
      to: '/admin/custom-requests',
      label: 'Custom requests',
      icon: Sparkles,
      badge: newCustomCount || undefined,
    },
    {
      to: '/admin/reviews',
      label: 'Reviews',
      icon: Star,
      badge: pendingReviewsCount || undefined,
    },
    { to: '/admin/stats', label: 'Stats', icon: BarChart3 },
    { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
    ...(canAccessFinancesAndSettings
      ? [{ to: '/admin/finances', label: 'Finances', icon: Wallet }]
      : []),
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/pages', label: 'Homepage & pages', icon: FileText },
    ...(canAccessFinancesAndSettings
      ? [{ to: '/admin/settings', label: 'Shop settings', icon: Settings }]
      : []),
  ];

  // Breadcrumb label
  const currentBreadcrumb = useMemo(() => {
    const p = location.pathname;
    if (p === '/admin') return 'Dashboard';
    if (p.startsWith('/admin/listings/new')) return 'Listings / Add a listing';
    if (p.startsWith('/admin/listings/')) return 'Listings / Edit listing';
    if (p.startsWith('/admin/listings')) return 'Listings Manager';
    if (p.startsWith('/admin/orders')) return 'Orders & Shipping';
    if (p.startsWith('/admin/messages')) return 'Buyer Messages';
    if (p.startsWith('/admin/custom-requests')) return 'Custom Order Requests';
    if (p.startsWith('/admin/reviews')) return 'Customer Reviews';
    if (p.startsWith('/admin/stats')) return 'Shop Stats';
    if (p.startsWith('/admin/marketing')) return 'Marketing · Sales, Coupons & Feeds';
    if (p.startsWith('/admin/finances')) return 'Finances & Statements';
    if (p.startsWith('/admin/customers')) return 'Customers & Subscribers';
    if (p.startsWith('/admin/pages')) return 'Homepage & Static Pages';
    if (p.startsWith('/admin/settings')) return 'Shop Settings & Integrations';
    return 'Shop Manager';
  }, [location.pathname]);

  const restrictedRouteBlocked =
    !canAccessFinancesAndSettings &&
    (location.pathname.startsWith('/admin/finances') ||
      location.pathname.startsWith('/admin/settings'));

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#121211] text-[#1A1918] dark:text-[#F4F1EA] font-sans flex flex-col md:flex-row">
      {/* Desktop Left Sidebar (Etsy Shop Manager Clone) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-[#E6E1D8] dark:border-[#2E2C28] bg-[#F5F2EC] dark:bg-[#171614] transition-all duration-200 sticky top-0 h-screen ${
          collapsed ? 'w-[68px]' : 'w-[244px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E6E1D8] dark:border-[#2E2C28]">
          {!collapsed ? (
            <Link to="/admin" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] font-bold text-sm flex items-center justify-center shrink-0">
                K
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{settings.storeName}</p>
                <p className="text-[11px] text-[#5F5B55] dark:text-[#A6A198] truncate">
                  {settings.primaryDomain || 'inkedrug.com'}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              to="/admin"
              className="w-8 h-8 mx-auto rounded-lg bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] font-bold text-sm flex items-center justify-center"
              title="Shop Manager"
            >
              K
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg hover:bg-[#E6E1D8]/60 dark:hover:bg-[#2E2C28] text-[#5F5B55] cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#111111] text-white dark:bg-[#FAF8F5] dark:text-[#111111]'
                    : 'text-[#3F3C37] dark:text-[#D5D0C6] hover:bg-[#E6E1D8]/60 dark:hover:bg-[#252320]'
                }`
              }
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
              {!collapsed && (
                <span className="flex items-center gap-1 shrink-0">
                  {item.alertBadge && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#D62828] text-white text-[10px] font-bold tabular-nums">
                      {item.alertBadge}
                    </span>
                  )}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#E6E1D8] dark:bg-[#2E2C28] text-[#1A1918] dark:text-[#F4F1EA] text-[10px] font-bold tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Storefront Link & Role Summary */}
        <div className="p-3 border-t border-[#E6E1D8] dark:border-[#2E2C28] space-y-2">
          {!collapsed && (
            <div className="rounded-xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-2.5 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-[#2F6B2F]" /> Access:
                </span>
                {activeWorkerSession ? (
                  <span className="font-bold uppercase text-[10px] text-[#2F6B2F]">
                    {activeWorkerSession.fullSiteAccess ? 'FULL ACCESS' : activeWorkerSession.role}
                  </span>
                ) : (
                  <select
                    aria-label="Preview Admin Role"
                    value={effectiveRole}
                    onChange={(e) => setDemoAdminRole(e.target.value as AdminRole)}
                    className="bg-transparent font-bold uppercase text-[10px] cursor-pointer focus:outline-none"
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                )}
              </div>
              <p className="text-[10px] text-[#5F5B55] dark:text-[#A6A198] truncate">
                {activeWorkerSession
                  ? `Worker: ${activeWorkerSession.email}`
                  : isLiveAdmin
                  ? `Owner: ${currentUser?.email}`
                  : `Default USD ($) · ${settings.primaryDomain || 'inkedrug.com'}`}
              </p>
              <div className="flex items-center gap-1.5 pt-0.5">
                {currentUser || activeWorkerSession ? (
                  <button
                    type="button"
                    onClick={signOutUser}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] py-1 text-[10px] font-bold hover:border-[#D62828] text-[#D62828] cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" /> Sign out session
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLoginModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-1 text-[10px] font-bold cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" /> Worker / Owner Login
                  </button>
                )}
              </div>
            </div>
          )}

          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 w-full rounded-full border border-[#1A1918] dark:border-[#F4F1EA] py-2 px-3 text-xs font-bold hover:bg-[#111111] hover:text-white dark:hover:bg-[#FAF8F5] dark:hover:text-[#111111] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>View storefront</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-[#FAF8F5]/95 dark:bg-[#121211]/95 backdrop-blur border-b border-[#E6E1D8] dark:border-[#2E2C28] px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/admin" className="md:hidden font-bold text-sm">
              K·Admin
            </Link>
            <span className="hidden sm:inline text-xs font-semibold text-[#5F5B55] dark:text-[#A6A198] truncate">
              Shop Manager / <strong className="text-[#1A1918] dark:text-[#F4F1EA]">{currentBreadcrumb}</strong>
            </span>
          </div>

          {/* Center: Global Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#5F5B55] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Search listings, SKUs, orders, buyers... (Press /)"
              className="w-full rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-[#111111] dark:focus:border-[#FAF8F5]"
            />

            {globalResults && (
              <div className="absolute left-0 right-0 top-10 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] shadow-xl p-3 space-y-3 z-50 max-h-96 overflow-y-auto text-xs">
                {globalResults.matchedListings.length === 0 &&
                  globalResults.matchedOrders.length === 0 &&
                  globalResults.matchedCustomers.length === 0 && (
                    <p className="text-[#5F5B55] py-3 text-center">
                      No matching listings, orders, or customers for "{globalQuery}".
                    </p>
                  )}

                {globalResults.matchedListings.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F5B55] mb-1.5">
                      Listings
                    </p>
                    {globalResults.matchedListings.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setGlobalQuery('');
                          navigate(`/admin/listings/${p.id}`);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#252320] text-left cursor-pointer"
                      >
                        <span className="font-semibold truncate">{p.title}</span>
                        <span className="text-[11px] font-mono-num text-[#5F5B55] shrink-0">
                          {p.sku}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {globalResults.matchedOrders.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F5B55] mb-1.5">
                      Orders
                    </p>
                    {globalResults.matchedOrders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setGlobalQuery('');
                          navigate(`/admin/orders?q=${encodeURIComponent(o.orderNumber)}`);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#252320] text-left cursor-pointer"
                      >
                        <span className="font-semibold">
                          #{o.orderNumber} · {o.customerName}
                        </span>
                        <span className="text-[11px] text-[#2F6B2F] font-semibold">{o.status}</span>
                      </button>
                    ))}
                  </div>
                )}

                {globalResults.matchedCustomers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F5B55] mb-1.5">
                      Customers
                    </p>
                    {globalResults.matchedCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setGlobalQuery('');
                          navigate('/admin/customers');
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#252320] text-left cursor-pointer"
                      >
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-[11px] text-[#5F5B55]">{c.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/admin/listings/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-3.5 py-1.5 text-xs font-bold hover:opacity-90 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add a listing</span>
            </Link>

            {currentUser || activeWorkerSession ? (
              <button
                type="button"
                onClick={signOutUser}
                title="Sign out of Admin / Worker session"
                className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3 py-1.5 text-xs font-semibold hover:border-[#D62828] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#D62828]" />
                <span className="max-w-[120px] truncate">
                  {activeWorkerSession?.name || currentUser?.email}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                title="Sign in with Worker Email/Password or Owner Google Account"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3 py-1.5 text-xs font-semibold hover:border-[#111111] cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Worker / Admin Login</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
              className="p-2 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] hover:border-[#111111] cursor-pointer hidden sm:inline-flex"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] hover:border-[#111111] cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Shop notifications"
                className="relative p-2 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] hover:border-[#111111] cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D62828] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] shadow-xl p-4 space-y-2.5 text-xs z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
                    <span className="font-bold">Shop Activity Alerts</span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[#5F5B55] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {overdueOrdersCount > 0 && (
                    <Link
                      to="/admin/orders?tab=Overdue"
                      onClick={() => setNotifOpen(false)}
                      className="block p-2.5 rounded-xl bg-[#D62828]/10 text-[#D62828] font-semibold"
                    >
                      {overdueOrdersCount} order(s) past the 15-day production window →
                    </Link>
                  )}
                  {unreadMessagesCount > 0 && (
                    <Link
                      to="/admin/messages"
                      onClick={() => setNotifOpen(false)}
                      className="block p-2.5 rounded-xl bg-[#F5EBC8] dark:bg-[#2B2416] font-semibold"
                    >
                      {unreadMessagesCount} unread buyer message(s) waiting →
                    </Link>
                  )}
                  {pendingReviewsCount > 0 && (
                    <Link
                      to="/admin/reviews"
                      onClick={() => setNotifOpen(false)}
                      className="block p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#252320] font-semibold"
                    >
                      {pendingReviewsCount} verified buyer review(s) pending moderation →
                    </Link>
                  )}
                  {totalAlerts === 0 && (
                    <p className="text-[#5F5B55] py-4 text-center">
                      All caught up! Every rug order is within its 10–15 day window.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          {restrictedRouteBlocked ? (
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-10 text-center max-w-lg mx-auto my-12 space-y-3">
              <Shield className="w-8 h-8 text-[#D62828] mx-auto" />
              <h2 className="text-base font-bold">Owner or Manager Permission Required</h2>
              <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
                Staff accounts can manage Listings, Orders, Messages, Custom Requests, and Reviews,
                but cannot view Finances or Shop Settings. Switch role in the sidebar to Owner or
                Manager to inspect this page.
              </p>
              <button
                type="button"
                onClick={() => setDemoAdminRole('owner')}
                className="rounded-full bg-[#111111] text-white px-5 py-2 text-xs font-bold cursor-pointer"
              >
                Switch back to Owner Role
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Dashboard, Orders, Listings, Messages, More) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-white dark:bg-[#1C1B19] border-t border-[#E6E1D8] dark:border-[#2E2C28] grid grid-cols-5 text-[11px] font-semibold">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 ${
              isActive ? 'text-[#111111] dark:text-white font-bold' : 'text-[#5F5B55]'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/admin/orders"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 ${
              isActive ? 'text-[#111111] dark:text-white font-bold' : 'text-[#5F5B55]'
            }`
          }
        >
          <Package className="w-4 h-4" />
          <span>Orders ({openOrdersCount})</span>
        </NavLink>
        <NavLink
          to="/admin/listings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 ${
              isActive ? 'text-[#111111] dark:text-white font-bold' : 'text-[#5F5B55]'
            }`
          }
        >
          <Tag className="w-4 h-4" />
          <span>Listings</span>
        </NavLink>
        <NavLink
          to="/admin/messages"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 ${
              isActive ? 'text-[#111111] dark:text-white font-bold' : 'text-[#5F5B55]'
            }`
          }
        >
          <MessageSquare className="w-4 h-4" />
          <span>Inbox</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[#5F5B55] cursor-pointer"
        >
          <FolderKanban className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Drawer */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full rounded-t-3xl bg-white dark:bg-[#1C1B19] p-5 space-y-3 max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
              <span className="font-bold text-sm">All Shop Manager Tools</span>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] text-xs font-semibold"
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <Link
                to="/"
                onClick={() => setMobileMoreOpen(false)}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-full bg-[#111111] text-white text-xs font-bold"
              >
                <ExternalLink className="w-4 h-4" /> View Storefront
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Shop Manager Keyboard Shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 divide-y divide-[#E6E1D8] dark:divide-[#2E2C28]">
              {[
                { key: 'N', desc: 'Create a new listing' },
                { key: '/', desc: 'Focus global search bar' },
                { key: 'E', desc: 'Open Quick Edit on focused listing row (in Listings)' },
                { key: 'D', desc: 'Duplicate selected listing as Draft (in Listings)' },
                { key: 'Enter', desc: 'Save inline Quick Edit field immediately' },
                { key: 'Esc', desc: 'Close active drawer, modal, or search menu' },
                { key: '?', desc: 'Toggle this shortcuts dialog' },
              ].map((s) => (
                <div key={s.key} className="pt-2 flex items-center justify-between">
                  <span className="text-[#5F5B55] dark:text-[#A6A198]">{s.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#EFECE6] dark:bg-[#2E2C28] font-mono-num font-bold">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Stack with Undo Action */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 md:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl bg-[#111111] text-white px-4 py-3 text-xs font-medium shadow-xl flex items-center justify-between gap-3"
            >
              <span>{t.message}</span>
              <div className="flex items-center gap-2 shrink-0">
                {t.onUndo && (
                  <button
                    type="button"
                    onClick={() => {
                      t.onUndo?.();
                      dismissToast(t.id);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#E9A820] text-[#111111] font-bold cursor-pointer"
                  >
                    {t.undoLabel || 'Undo'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Admin & Worker Email/Password Login Modal */}
      {loginModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Worker and Admin Login"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">
                  {settings.storeName} · Admin &amp; Worker Access
                </h2>
                <p className="text-[11px] text-[#5F5B55] dark:text-[#A6A198]">
                  Log in as a Listing/Site Worker (Email + Password) or Store Owner
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 rounded-xl bg-[#EFECE6] dark:bg-[#121211] p-1 font-bold">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('worker');
                  setWorkerLoginError('');
                }}
                className={`py-2 rounded-lg cursor-pointer ${
                  loginMode === 'worker'
                    ? 'bg-white dark:bg-[#2E2C28] shadow-2xs'
                    : 'text-[#5F5B55]'
                }`}
              >
                Worker Email &amp; Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('owner');
                  setWorkerLoginError('');
                }}
                className={`py-2 rounded-lg cursor-pointer ${
                  loginMode === 'owner'
                    ? 'bg-white dark:bg-[#2E2C28] shadow-2xs'
                    : 'text-[#5F5B55]'
                }`}
              >
                Store Owner (Google)
              </button>
            </div>

            {loginMode === 'worker' ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setWorkerLoginBusy(true);
                  setWorkerLoginError('');
                  const res = await signInWithWorkerCredentials(workerEmail, workerPassword);
                  setWorkerLoginBusy(false);
                  if (res.ok) {
                    setWorkerPassword('');
                    setLoginModalOpen(false);
                  } else {
                    setWorkerLoginError(res.message);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold mb-1">Worker Email ID</label>
                  <input
                    type="email"
                    required
                    value={workerEmail}
                    onChange={(e) => setWorkerEmail(e.target.value)}
                    placeholder="worker@inkedrug.com"
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={workerPassword}
                    onChange={(e) => setWorkerPassword(e.target.value)}
                    placeholder="Enter assigned worker password"
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                  />
                </div>
                {workerLoginError && (
                  <p className="text-[#D62828] font-semibold">{workerLoginError}</p>
                )}
                <button
                  type="submit"
                  disabled={workerLoginBusy}
                  className="w-full rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-3 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {workerLoginBusy ? 'Signing in...' : 'Sign In with Email & Password'}
                </button>
                <p className="text-[11px] text-[#5F5B55] dark:text-[#A6A198]">
                  Need an account? The store owner can create Worker Email + Password logins in{' '}
                  <strong>Shop Settings → Team &amp; Worker Access</strong>.
                </p>
              </form>
            ) : (
              <div className="space-y-3 py-2">
                <p className="text-[#5F5B55] dark:text-[#A6A198] leading-relaxed">
                  Sign in as the store owner (<strong>{BOOTSTRAPPED_ADMIN_EMAIL}</strong>) with Google to sync all settings, worker credentials, and private API keys to Firebase Cloud.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await signInWithGoogle();
                    setLoginModalOpen(false);
                  }}
                  className="w-full rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-3 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" /> Continue with Google (Owner)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
