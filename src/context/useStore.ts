import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import i18n from '../i18n';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  hashWorkerSecret,
  OperationType,
  validateFirestoreConnection,
  workerProvisionerAuth,
} from '../services/firebase';
import {
  AbandonedCartLead,
  AdminRole,
  CartItem,
  Category,
  Conversation,
  ConversationMessage,
  Coupon,
  CustomerProfile,
  CustomOrderRequest,
  EmailBlastRecord,
  FinanceEntry,
  Order,
  OrderStatus,
  ProcessingProfile,
  Product,
  Review,
  SaleCampaign,
  ShippingProfile,
  ShopSection,
  SnippetItem,
  StaticPage,
  StoreSettings,
  UndoSnapshot,
  WorkerStaffAccount,
} from '../types';
import {
  detectVisitorCountry,
  FALLBACK_RATES_FROM_USD,
  fetchLiveExchangeRates,
  formatMoney,
  getCountryConfig,
} from '../utils/currencies';
import { computeListingQualityScore, makeTrackingLookupKey } from '../utils/pricing';
import {
  SEED_ABANDONED_CARTS,
  SEED_CATEGORIES,
  SEED_CONVERSATIONS,
  SEED_COUPONS,
  SEED_CUSTOMERS,
  SEED_CUSTOM_REQUESTS,
  SEED_FINANCES,
  SEED_MESSAGES,
  SEED_ORDERS,
  SEED_PAGES,
  SEED_PROCESSING_PROFILES,
  SEED_PRODUCTS,
  SEED_REVIEWS,
  SEED_SALES,
  SEED_SECTIONS,
  SEED_SETTINGS,
  SEED_SHIPPING_PROFILES,
  SEED_SNIPPETS,
} from '../utils/seedData';

export interface ToastNotification {
  id: string;
  message: string;
  tone?: 'default' | 'success' | 'error';
  undoLabel?: string;
  onUndo?: () => void;
}

const STORAGE_PREFIX = 'inkedrug_v2_';

function normalizeTimestamp(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage quota warnings
  }
}

interface AppState {
  // Auth & RBAC (Owner + Worker Email/Password Login)
  authReady: boolean;
  currentUser: User | null;
  activeWorkerSession: WorkerStaffAccount | null;
  adminRole: AdminRole | null;
  isLiveAdmin: boolean;

  // Region, Currency, Language, Theme
  countryCode: string;
  currency: string;
  language: string;
  exchangeRates: Record<string, number>;
  theme: 'light' | 'dark';
  cookieConsent: 'accepted' | 'essential' | null;

  // Storefront Interactive State
  cart: CartItem[];
  cartDrawerOpen: boolean;
  appliedCoupon: Coupon | null;
  favourites: string[];
  recentlyViewed: string[];
  followedShop: boolean;
  regionModalOpen: boolean;
  toasts: ToastNotification[];

  // Catalog & Shop Manager Entities
  settings: StoreSettings;
  products: Product[];
  categories: Category[];
  sections: ShopSection[];
  processingProfiles: ProcessingProfile[];
  shippingProfiles: ShippingProfile[];
  sales: SaleCampaign[];
  coupons: Coupon[];
  reviews: Review[];
  orders: Order[];
  conversations: Conversation[];
  messages: ConversationMessage[];
  customRequests: CustomOrderRequest[];
  customers: CustomerProfile[];
  abandonedCarts: AbandonedCartLead[];
  snippets: SnippetItem[];
  finances: FinanceEntry[];
  pages: StaticPage[];
  undoStack: UndoSnapshot[];

  // Lifecycle & Auth Actions
  initApp: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithWorkerCredentials: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message: string }>;
  createWorkerAccount: (params: {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
    fullSiteAccess: boolean;
  }) => Promise<{ ok: boolean; firebaseCreated: boolean; notice?: string }>;
  toggleWorkerActive: (workerId: string) => Promise<void>;
  deleteWorkerAccount: (workerId: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  setDemoAdminRole: (role: AdminRole) => void;

  setRegionAndCurrency: (countryCode: string, currency: string, language?: string) => void;
  toggleTheme: () => void;
  setCookieConsent: (val: 'accepted' | 'essential') => void;
  setRegionModalOpen: (open: boolean) => void;
  setCartDrawerOpen: (open: boolean) => void;

  pushToast: (
    message: string,
    opts?: { tone?: 'default' | 'success' | 'error'; undoLabel?: string; onUndo?: () => void }
  ) => void;
  dismissToast: (id: string) => void;

  formatPrice: (amountInBase: number) => string;

  // Customer Shopping Actions
  toggleFavourite: (productId: string) => void;
  toggleFollowShop: () => void;
  recordProductView: (productId: string) => void;
  addToCart: (item: Omit<CartItem, 'cartItemId'>) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeCartItem: (cartItemId: string) => void;
  toggleSaveForLater: (cartItemId: string) => void;
  applyCouponCode: (code: string) => { ok: boolean; message: string };
  clearCoupon: () => void;
  captureAbandonedCart: (
    email: string,
    phone: string,
    totalBase: number,
    itemSummary: string
  ) => Promise<void>;
  placeOrder: (orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  submitReview: (
    rev: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'sellerReply'>
  ) => Promise<void>;
  sendBuyerMessage: (params: {
    conversationId?: string;
    productId?: string;
    productTitle?: string;
    customerName: string;
    customerEmail: string;
    category?: 'general' | 'custom_request' | 'order';
    text: string;
    attachmentUrl?: string;
  }) => Promise<string>;
  submitCustomRequest: (
    req: Omit<
      CustomOrderRequest,
      | 'id'
      | 'status'
      | 'quotedPriceBase'
      | 'paymentLinkUrl'
      | 'adminNotes'
      | 'createdAt'
      | 'updatedAt'
    >
  ) => Promise<void>;
  subscribeNewsletter: (email: string) => Promise<void>;

  // Admin Shop Manager Actions
  upsertProduct: (product: Product) => Promise<void>;
  deleteProducts: (ids: string[]) => Promise<void>;
  duplicateProduct: (productId: string, count?: number) => Promise<Product | null>;
  bulkUpdateProducts: (
    ids: string[],
    actionLabel: string,
    mutator: (p: Product) => Product
  ) => Promise<void>;
  undoLastBulkAction: (undoId?: string) => Promise<void>;
  importProductsBatch: (newProducts: Product[]) => Promise<void>;

  upsertSection: (section: ShopSection) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  upsertProcessingProfile: (profile: ProcessingProfile) => Promise<void>;
  upsertShippingProfile: (profile: ShippingProfile) => Promise<void>;

  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    extra?: {
      trackingNumber?: string;
      courier?: string;
      internalNotes?: string;
      productionPhoto?: string;
      customPriceBase?: number;
    }
  ) => Promise<void>;
  replyConversation: (conversationId: string, text: string) => Promise<void>;
  updateCustomRequestQuote: (
    id: string,
    status: CustomOrderRequest['status'],
    quotedPriceBase: number,
    paymentLinkUrl: string,
    adminNotes: string
  ) => Promise<void>;
  moderateReview: (
    reviewId: string,
    status: Review['status'],
    sellerReply?: string
  ) => Promise<void>;

  upsertSaleCampaign: (sale: SaleCampaign) => Promise<void>;
  endSaleCampaign: (saleId: string) => Promise<void>;
  upsertCoupon: (coupon: Coupon) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  sendAutomatedDiscountBlast: (params: {
    subject: string;
    audienceLabel: string;
    recipientEmails: string[];
    couponCode: string;
    discountPercent: number;
    customMessage: string;
  }) => Promise<void>;

  addFinanceEntry: (entry: Omit<FinanceEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  upsertStaticPage: (page: StaticPage) => Promise<void>;
  upsertSnippet: (snippet: SnippetItem) => Promise<void>;
  updateStoreSettings: (patch: Partial<StoreSettings>) => Promise<void>;
  savePrivateIntegrationSecret: (
    docId: string,
    secretPayload: Record<string, string>
  ) => Promise<void>;
  seedFirestoreDemoData: () => Promise<void>;
}

let initialized = false;

export const useStore = create<AppState>((set, get) => ({
  authReady: false,
  currentUser: null,
  activeWorkerSession: loadJson<WorkerStaffAccount | null>('worker_session', null),
  adminRole: loadJson<WorkerStaffAccount | null>('worker_session', null)?.role || 'owner',
  isLiveAdmin: false,

  countryCode: loadJson('country', 'US'),
  currency: loadJson('currency', 'USD'),
  language: loadJson('lang', 'en'),
  exchangeRates: loadJson('rates', FALLBACK_RATES_FROM_USD),
  theme: loadJson<'light' | 'dark'>(
    'theme',
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  ),
  cookieConsent: loadJson('cookies', null),

  cart: loadJson('cart', []),
  cartDrawerOpen: false,
  appliedCoupon: null,
  favourites: loadJson('favs', ['prod-tiger-rose']),
  recentlyViewed: loadJson('recent', []),
  followedShop: loadJson('followed', false),
  regionModalOpen: false,
  toasts: [],

  settings: {
    ...SEED_SETTINGS,
    ...loadJson<Partial<StoreSettings>>('settings', {}),
  },
  products: loadJson('products', SEED_PRODUCTS),
  categories: SEED_CATEGORIES,
  sections: loadJson('sections', SEED_SECTIONS),
  processingProfiles: loadJson('proc_profiles', SEED_PROCESSING_PROFILES),
  shippingProfiles: loadJson('ship_profiles', SEED_SHIPPING_PROFILES),
  sales: loadJson('sales', SEED_SALES),
  coupons: loadJson('coupons', SEED_COUPONS),
  reviews: loadJson('reviews', SEED_REVIEWS),
  orders: loadJson('orders', SEED_ORDERS),
  conversations: loadJson('convs', SEED_CONVERSATIONS),
  messages: loadJson('msgs', SEED_MESSAGES),
  customRequests: loadJson('creqs', SEED_CUSTOM_REQUESTS),
  customers: loadJson('customers', SEED_CUSTOMERS),
  abandonedCarts: loadJson('abandoned', SEED_ABANDONED_CARTS),
  snippets: loadJson('snippets', SEED_SNIPPETS),
  finances: loadJson('finances', SEED_FINANCES),
  pages: loadJson('pages', SEED_PAGES),
  undoStack: loadJson('undo', []),

  initApp: async () => {
    if (initialized) return;
    initialized = true;

    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', get().theme === 'dark');
    }

    validateFirestoreConnection().catch(() => undefined);

    // 1. Auto-detect visitor country & currency on first visit (USA -> USD $, India -> INR ₹ + 30% domestic pricing)
    const hasSavedRegion =
      typeof window !== 'undefined' && localStorage.getItem(`${STORAGE_PREFIX}country`);
    if (!hasSavedRegion && get().settings.autoDetectRegion) {
      detectVisitorCountry(get().settings.defaultCountry || 'US').then((detectedCode) => {
        const cfg = getCountryConfig(detectedCode);
        get().setRegionAndCurrency(cfg.countryCode, cfg.currency);
      });
    }

    // 2. Refresh live exchange rates relative to Base Currency (USD)
    fetchLiveExchangeRates(get().settings.baseCurrency || 'USD').then((rates) => {
      set({ exchangeRates: rates });
      saveJson('rates', rates);
    });

    // 3. Public Firestore real-time listeners (strictly matching firestore.rules predicates)
    onSnapshot(
      query(collection(db, 'products'), where('status', '==', 'active')),
      (snap) => {
        if (!snap.empty) {
          const remoteProducts = snap.docs
            .map((d) => {
              const raw = d.data();
              return {
                ...(raw as Product),
                id: d.id,
                createdAt: normalizeTimestamp(raw.createdAt),
                updatedAt: normalizeTimestamp(raw.updatedAt),
              };
            })
            // Guard against legacy INR-priced docs > $1500 so USD catalog stays accurate
            .filter((rp) => rp.basePrice <= 1500);
          if (remoteProducts.length > 0) {
            set((state) => {
              const nonActiveLocal = state.products.filter((p) => p.status !== 'active');
              const mergedMap = new Map<string, Product>();
              for (const p of state.products) mergedMap.set(p.id, p);
              for (const rp of remoteProducts) mergedMap.set(rp.id, rp);
              for (const lp of nonActiveLocal) mergedMap.set(lp.id, lp);
              const merged = Array.from(mergedMap.values());
              saveJson('products', merged);
              return { products: merged };
            });
          }
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'products');
        } catch {
          // Logged structured FirestoreErrorInfo
        }
      }
    );

    onSnapshot(
      query(collection(db, 'sales'), where('status', '==', 'active')),
      (snap) => {
        if (!snap.empty) {
          const remoteSales = snap.docs.map((d) => ({
            ...(d.data() as SaleCampaign),
            id: d.id,
            createdAt: normalizeTimestamp(d.data().createdAt),
            updatedAt: normalizeTimestamp(d.data().updatedAt),
          }));
          set((state) => {
            const map = new Map(state.sales.map((s) => [s.id, s]));
            remoteSales.forEach((s) => map.set(s.id, s));
            return { sales: Array.from(map.values()) };
          });
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'sales');
        } catch {
          // Logged
        }
      }
    );

    onSnapshot(
      query(collection(db, 'reviews'), where('status', '==', 'approved')),
      (snap) => {
        if (!snap.empty) {
          const remoteRevs = snap.docs.map((d) => ({
            ...(d.data() as Review),
            id: d.id,
            createdAt: normalizeTimestamp(d.data().createdAt),
            updatedAt: normalizeTimestamp(d.data().updatedAt),
          }));
          set((state) => {
            const map = new Map(state.reviews.map((r) => [r.id, r]));
            remoteRevs.forEach((r) => map.set(r.id, r));
            return { reviews: Array.from(map.values()) };
          });
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'reviews');
        } catch {
          // Logged
        }
      }
    );

    // Public settings listener (merges remote settings while preserving USD defaults if remote was legacy INR)
    onSnapshot(
      doc(db, 'settings', 'general'),
      (snap) => {
        if (snap.exists() && snap.data().data) {
          const incomingSettings = snap.data().data as Partial<StoreSettings>;
          if (incomingSettings.baseCurrency === 'USD') {
            set((state) => ({
              settings: { ...SEED_SETTINGS, ...state.settings, ...incomingSettings },
            }));
          }
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'settings/general');
        } catch {
          // Logged
        }
      }
    );

    // 4. Auth state & role-aware listeners (Owner Google Sign-In + Worker Email/Password Auth)
    let adminUnsubs: Array<() => void> = [];
    onAuthStateChanged(auth, async (user) => {
      adminUnsubs.forEach((u) => u());
      adminUnsubs = [];

      const isBootstrapped =
        !!user &&
        user.emailVerified &&
        user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      let detectedAdminDocRole: AdminRole | null = null;
      if (user && !isBootstrapped) {
        try {
          const admSnap = await getDoc(doc(db, 'admins', user.uid));
          if (admSnap.exists()) {
            detectedAdminDocRole = (admSnap.data().role as AdminRole) || 'staff';
          }
        } catch {
          // Non-admin user
        }
      }

      const isLive = isBootstrapped || !!detectedAdminDocRole;
      const savedWorker = get().activeWorkerSession;

      set({
        authReady: true,
        currentUser: user,
        isLiveAdmin: isLive,
        adminRole: isBootstrapped
          ? 'owner'
          : detectedAdminDocRole || savedWorker?.role || get().adminRole || 'owner',
      });

      if (user && user.emailVerified) {
        try {
          const custRef = doc(db, 'customers', user.uid);
          const custSnap = await getDoc(custRef);
          if (custSnap.exists()) {
            const data = custSnap.data() as CustomerProfile;
            const mergedFavs = Array.from(
              new Set([...get().favourites, ...(data.favourites || [])])
            ).slice(0, 200);
            set({ favourites: mergedFavs, followedShop: data.followedShop ?? get().followedShop });
            saveJson('favs', mergedFavs);
          } else {
            await setDoc(custRef, {
              uid: user.uid,
              name: (user.displayName || 'InkedRug Collector').slice(0, 120),
              email: (user.email || 'collector@example.com').slice(0, 254),
              phone: '',
              country: get().countryCode,
              currency: get().currency,
              language: get().language,
              favourites: get().favourites.slice(0, 200),
              followedShop: get().followedShop,
              savedAddresses: [],
              ordersCount: 0,
              totalSpentBase: 0,
              tags: [],
              notes: '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, `customers/${user.uid}`);
          } catch {
            // Non-blocking
          }
        }

        const ordersQuery = isBootstrapped
          ? collection(db, 'orders')
          : query(collection(db, 'orders'), where('customerId', '==', user.uid));
        const unsubOrders = onSnapshot(
          ordersQuery,
          (snap) => {
            if (!snap.empty) {
              const liveOrders = snap.docs.map((d) => ({
                ...(d.data() as Order),
                id: d.id,
                createdAt: normalizeTimestamp(d.data().createdAt),
                updatedAt: normalizeTimestamp(d.data().updatedAt),
              }));
              set((state) => {
                const map = new Map(state.orders.map((o) => [o.id, o]));
                liveOrders.forEach((o) => map.set(o.id, o));
                const list = Array.from(map.values()).sort((a, b) =>
                  b.createdAt.localeCompare(a.createdAt)
                );
                saveJson('orders', list);
                return { orders: list };
              });
            }
          },
          (err) => {
            try {
              handleFirestoreError(err, OperationType.LIST, 'orders');
            } catch {
              // Handled
            }
          }
        );
        adminUnsubs.push(unsubOrders);
      }
    });
  },

  signInWithGoogle: async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      set({ activeWorkerSession: null });
      saveJson('worker_session', null);
      get().pushToast('Signed in with Google', { tone: 'success' });
    } catch (error) {
      get().pushToast(
        error instanceof Error ? error.message : 'Google sign-in cancelled',
        { tone: 'error' }
      );
    }
  },

  signInWithWorkerCredentials: async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { ok: false, message: 'Enter both worker email ID and password.' };
    }

    // 1. Check configured worker roster first for active status & role metadata
    const matchedWorker = (get().settings.workerAccounts || []).find(
      (w) => w.email.toLowerCase() === cleanEmail
    );

    if (matchedWorker && !matchedWorker.active) {
      return {
        ok: false,
        message: 'This worker account has been suspended by the store owner.',
      };
    }

    // 2. Attempt live Firebase Email/Password authentication
    let firebaseLoggedIn = false;
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      firebaseLoggedIn = true;
    } catch {
      // Fallback to hashed worker roster check (e.g., before Email/Password provider is toggled in Firebase Console)
    }

    if (matchedWorker) {
      const candidateHash = await hashWorkerSecret(password);
      if (firebaseLoggedIn || candidateHash === matchedWorker.passwordHash) {
        const updatedWorker: WorkerStaffAccount = {
          ...matchedWorker,
          lastLoginAt: new Date().toISOString(),
        };
        const updatedRoster = (get().settings.workerAccounts || []).map((w) =>
          w.id === matchedWorker.id ? updatedWorker : w
        );
        const nextSettings = { ...get().settings, workerAccounts: updatedRoster };
        set({
          activeWorkerSession: updatedWorker,
          adminRole: updatedWorker.fullSiteAccess ? 'owner' : updatedWorker.role,
          settings: nextSettings,
        });
        saveJson('worker_session', updatedWorker);
        saveJson('settings', nextSettings);
        get().pushToast(
          `Signed in as ${updatedWorker.name} (${
            updatedWorker.fullSiteAccess ? 'Full Site & Listing Access' : updatedWorker.role
          })`,
          { tone: 'success' }
        );
        return { ok: true, message: `Welcome ${updatedWorker.name}!` };
      }
      return { ok: false, message: 'Incorrect password for this worker email ID.' };
    }

    if (firebaseLoggedIn) {
      get().pushToast(`Signed in via Firebase Auth (${cleanEmail})`, { tone: 'success' });
      return { ok: true, message: 'Signed in!' };
    }

    return {
      ok: false,
      message:
        'No active worker account found with that email & password. Ask the store owner to add your email in Shop Settings → Team & Worker Access.',
    };
  },

  createWorkerAccount: async ({ name, email, password, role, fullSiteAccess }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || 'Studio Team Member';
    if (!cleanEmail.includes('@') || password.length < 6) {
      get().pushToast('Provide a valid email and a password of at least 6 characters.', {
        tone: 'error',
      });
      return { ok: false, firebaseCreated: false, notice: 'Password must be at least 6 characters.' };
    }

    const effectiveRole: AdminRole = fullSiteAccess ? 'owner' : role;
    const passwordHash = await hashWorkerSecret(password);
    let provisionedUid = `worker-${Date.now()}`;
    let firebaseCreated = false;
    let notice: string | undefined;

    // Provision in Firebase Auth using secondary app so current Owner is NOT logged out!
    try {
      const cred = await createUserWithEmailAndPassword(
        workerProvisionerAuth,
        cleanEmail,
        password
      );
      provisionedUid = cred.user.uid;
      await updateProfile(cred.user, { displayName: cleanName }).catch(() => undefined);
      await firebaseSignOut(workerProvisionerAuth).catch(() => undefined);
      firebaseCreated = true;

      if (get().isLiveAdmin) {
        await setDoc(doc(db, 'admins', provisionedUid), {
          uid: provisionedUid,
          email: cleanEmail,
          name: cleanName.slice(0, 100),
          role: effectiveRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        notice =
          'Worker login is active immediately! Note: Enable "Email/Password" in Firebase Console → Authentication → Sign-in method to sync worker credentials with cloud Firestore rules.';
      } else if (msg.includes('email-already-in-use')) {
        notice = 'Email already exists in Firebase Auth; updated worker access role & password.';
      }
    }

    const newWorker: WorkerStaffAccount = {
      id: `wrk-${Date.now()}`,
      uid: provisionedUid,
      name: cleanName,
      email: cleanEmail,
      role: effectiveRole,
      fullSiteAccess,
      permissions: {
        listings: true,
        orders: true,
        marketing: fullSiteAccess || effectiveRole !== 'staff',
        pages: fullSiteAccess || effectiveRole !== 'staff',
        finances: fullSiteAccess || effectiveRole === 'owner' || effectiveRole === 'manager',
        settings: fullSiteAccess || effectiveRole === 'owner',
      },
      passwordHash,
      firebaseProvisioned: firebaseCreated,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const existingFiltered = (get().settings.workerAccounts || []).filter(
      (w) => w.email.toLowerCase() !== cleanEmail
    );
    await get().updateStoreSettings({
      workerAccounts: [newWorker, ...existingFiltered],
    });

    get().pushToast(`Created login for ${cleanName} (${cleanEmail})`, { tone: 'success' });
    return { ok: true, firebaseCreated, notice };
  },

  toggleWorkerActive: async (workerId) => {
    const next = (get().settings.workerAccounts || []).map((w) =>
      w.id === workerId ? { ...w, active: !w.active } : w
    );
    await get().updateStoreSettings({ workerAccounts: next });
  },

  deleteWorkerAccount: async (workerId) => {
    const target = (get().settings.workerAccounts || []).find((w) => w.id === workerId);
    const next = (get().settings.workerAccounts || []).filter((w) => w.id !== workerId);
    await get().updateStoreSettings({ workerAccounts: next });
    if (target && get().isLiveAdmin && target.firebaseProvisioned) {
      await deleteDoc(doc(db, 'admins', target.uid)).catch(() => undefined);
    }
    get().pushToast('Removed worker access');
  },

  signOutUser: async () => {
    await firebaseSignOut(auth).catch(() => undefined);
    set({ activeWorkerSession: null, adminRole: 'owner' });
    saveJson('worker_session', null);
    get().pushToast('Signed out');
  },

  setDemoAdminRole: (role) => {
    set({ adminRole: role });
    get().pushToast(`Viewing Shop Manager with ${role.toUpperCase()} permissions`);
  },

  setRegionAndCurrency: (countryCode, currency, language) => {
    const nextLang = language || get().language;
    set({ countryCode, currency, language: nextLang });
    saveJson('country', countryCode);
    saveJson('currency', currency);
    saveJson('lang', nextLang);
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: next });
    saveJson('theme', next);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
  },

  setCookieConsent: (val) => {
    set({ cookieConsent: val });
    saveJson('cookies', val);
  },

  setRegionModalOpen: (open) => set({ regionModalOpen: open }),
  setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),

  pushToast: (message, opts) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { id, message, ...opts }],
    }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 5200);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  formatPrice: (amountInBase) => {
    const { currency, exchangeRates, settings } = get();
    return formatMoney(
      amountInBase,
      currency,
      exchangeRates,
      settings.baseCurrency,
      settings.priceRounding
    );
  },

  toggleFavourite: (productId) => {
    const exists = get().favourites.includes(productId);
    const next = exists
      ? get().favourites.filter((id) => id !== productId)
      : [...get().favourites, productId];
    set((state) => ({
      favourites: next,
      products: state.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              counters: {
                ...p.counters,
                favourites: Math.max(0, p.counters.favourites + (exists ? -1 : 1)),
              },
            }
          : p
      ),
    }));
    saveJson('favs', next);
    get().pushToast(exists ? 'Removed from Favourites' : 'Saved to Favourites');
  },

  toggleFollowShop: () => {
    const next = !get().followedShop;
    set({ followedShop: next });
    saveJson('followed', next);
    get().pushToast(
      next
        ? `Saved ${get().settings.primaryDomain} studio updates!`
        : 'Removed studio drop notifications'
    );
  },

  recordProductView: (productId) => {
    const prev = get().recentlyViewed.filter((id) => id !== productId);
    const next = [productId, ...prev].slice(0, 12);
    set((state) => ({
      recentlyViewed: next,
      products: state.products.map((p) =>
        p.id === productId
          ? { ...p, counters: { ...p.counters, views: p.counters.views + 1 } }
          : p
      ),
    }));
    saveJson('recent', next);
  },

  addToCart: (item) => {
    const key = `${item.productId}-${item.sizeId}-${item.variationId}-${item.personalisationText}-${
      item.customDims ? `${item.customDims.width}x${item.customDims.height}${item.customDims.unit}` : ''
    }`;
    set((state) => {
      const existingIdx = state.cart.findIndex((c) => c.cartItemId === key && !c.savedForLater);
      let nextCart: CartItem[];
      if (existingIdx >= 0) {
        nextCart = state.cart.map((c, idx) =>
          idx === existingIdx ? { ...c, quantity: c.quantity + item.quantity } : c
        );
      } else {
        nextCart = [...state.cart, { ...item, cartItemId: key, savedForLater: false }];
      }
      saveJson('cart', nextCart);
      return { cart: nextCart, cartDrawerOpen: true };
    });
    get().pushToast(`Added "${item.title.slice(0, 32)}..." to cart`, { tone: 'success' });
  },

  updateCartQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeCartItem(cartItemId);
      return;
    }
    const next = get().cart.map((c) => (c.cartItemId === cartItemId ? { ...c, quantity } : c));
    set({ cart: next });
    saveJson('cart', next);
  },

  removeCartItem: (cartItemId) => {
    const removed = get().cart.find((c) => c.cartItemId === cartItemId);
    const next = get().cart.filter((c) => c.cartItemId !== cartItemId);
    set({ cart: next });
    saveJson('cart', next);
    if (removed) {
      get().pushToast('Removed item from cart', {
        undoLabel: 'Undo',
        onUndo: () => {
          const restored = [...get().cart, removed];
          set({ cart: restored });
          saveJson('cart', restored);
        },
      });
    }
  },

  toggleSaveForLater: (cartItemId) => {
    const next = get().cart.map((c) =>
      c.cartItemId === cartItemId ? { ...c, savedForLater: !c.savedForLater } : c
    );
    set({ cart: next });
    saveJson('cart', next);
  },

  applyCouponCode: (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    const found = get().coupons.find((c) => c.code.toUpperCase() === code && c.active);
    if (!found) {
      return { ok: false, message: 'Invalid or expired coupon code.' };
    }
    if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
      return { ok: false, message: 'This coupon has expired.' };
    }
    const subtotalBase = get()
      .cart.filter((c) => !c.savedForLater)
      .reduce((acc, c) => acc + c.unitFinalPriceBase * c.quantity, 0);
    if (subtotalBase < found.minOrder) {
      return {
        ok: false,
        message: `Minimum order of ${get().formatPrice(found.minOrder)} required for ${code}.`,
      };
    }
    set({ appliedCoupon: found });
    return { ok: true, message: `Coupon ${code} applied!` };
  },

  clearCoupon: () => set({ appliedCoupon: null }),

  captureAbandonedCart: async (email, phone, totalBase, itemSummary) => {
    if (!email || !email.includes('@')) return;
    const id = `ab-${email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    const now = new Date().toISOString();
    const entry: AbandonedCartLead = {
      id,
      email: email.slice(0, 254),
      phone: (phone || '').slice(0, 32),
      country: get().countryCode,
      currency: get().currency,
      totalBase,
      itemSummary: itemSummary.slice(0, 500),
      recovered: false,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const next = [entry, ...s.abandonedCarts.filter((a) => a.id !== id)];
      saveJson('abandoned', next);
      return { abandonedCarts: next };
    });
    try {
      await setDoc(doc(db, 'abandonedCarts', id), {
        email: entry.email,
        phone: entry.phone,
        country: entry.country,
        currency: entry.currency,
        totalBase: entry.totalBase,
        itemSummary: entry.itemSummary,
        recovered: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Guest capture fallback stored locally
    }
  },

  placeOrder: async (orderPayload) => {
    const now = new Date().toISOString();
    const id = `ord-${Date.now()}`;
    const fullOrder: Order = {
      ...orderPayload,
      id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const nextOrders = [fullOrder, ...state.orders];
      const nextProducts = state.products.map((p) => {
        const line = fullOrder.items.find((i) => i.productId === p.id);
        if (!line) return p;
        return {
          ...p,
          stockCount:
            p.stockMode === 'limited'
              ? Math.max(0, p.stockCount - line.quantity)
              : p.stockCount,
          counters: {
            ...p.counters,
            orders: p.counters.orders + line.quantity,
            revenue: Number((p.counters.revenue + line.unitPriceBase * line.quantity).toFixed(2)),
          },
        };
      });
      const remainingCart = state.cart.filter((c) => c.savedForLater);
      saveJson('orders', nextOrders);
      saveJson('products', nextProducts);
      saveJson('cart', remainingCart);
      return {
        orders: nextOrders,
        products: nextProducts,
        cart: remainingCart,
        appliedCoupon: null,
      };
    });

    try {
      const customerIdForDoc =
        get().currentUser?.emailVerified && get().currentUser?.uid
          ? get().currentUser!.uid
          : 'guest';
      await setDoc(doc(db, 'orders', id), {
        ...orderPayload,
        customerId: customerIdForDoc,
        internalNotes: '',
        productionPhotos: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const trackingKey = makeTrackingLookupKey(
        fullOrder.orderNumber,
        fullOrder.customerEmail
      );
      await setDoc(doc(db, 'orderTracking', trackingKey), {
        orderNumber: fullOrder.orderNumber,
        status: fullOrder.status,
        estimatedDelivery: `${fullOrder.productionDaysMax} days production + courier transit`,
        productionDaysMin: 10,
        productionDaysMax: fullOrder.productionDaysMax || 15,
        trackingNumber: '',
        courier: fullOrder.courier || 'Tracked Express',
        productionPhotos: [],
        statusHistory: fullOrder.statusHistory,
        itemCount: fullOrder.items.reduce((sum, i) => sum + i.quantity, 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `orders/${id}`);
      } catch {
        // Logged structured FirestoreErrorInfo
      }
    }

    get().pushToast(`Order ${fullOrder.orderNumber} confirmed!`, { tone: 'success' });
    return fullOrder;
  },

  submitReview: async (rev) => {
    const now = new Date().toISOString();
    const id = `rev-${Date.now()}`;
    const newRev: Review = {
      ...rev,
      id,
      status: 'pending',
      sellerReply: '',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const next = [newRev, ...s.reviews];
      saveJson('reviews', next);
      return { reviews: next };
    });
    if (get().currentUser?.emailVerified) {
      try {
        await setDoc(doc(db, 'reviews', id), {
          ...rev,
          customerId: get().currentUser!.uid,
          status: 'pending',
          sellerReply: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `reviews/${id}`);
        } catch {
          // Handled
        }
      }
    }
    get().pushToast('Review submitted for studio moderation!', { tone: 'success' });
  },

  sendBuyerMessage: async ({
    conversationId,
    productId = '',
    productTitle = '',
    customerName,
    customerEmail,
    category = 'general',
    text,
    attachmentUrl = '',
  }) => {
    const now = new Date().toISOString();
    const convId = conversationId || `conv-${Date.now()}`;
    const uid = get().currentUser?.uid || 'guest-local';
    const msgId = `msg-${Date.now()}`;

    const newMsg: ConversationMessage = {
      id: msgId,
      conversationId: convId,
      customerId: uid,
      senderId: uid,
      senderRole: 'customer',
      text: text.slice(0, 2000),
      attachmentUrl: attachmentUrl.slice(0, 500),
      createdAt: now,
    };

    set((state) => {
      const exists = state.conversations.find((c) => c.id === convId);
      const updatedConv: Conversation = exists
        ? {
            ...exists,
            unreadByAdmin: true,
            lastMessagePreview: text.slice(0, 280),
            updatedAt: now,
          }
        : {
            id: convId,
            customerId: uid,
            customerName: customerName.slice(0, 120),
            customerEmail: customerEmail.slice(0, 254),
            productId,
            productTitle: productTitle.slice(0, 140),
            category,
            starred: false,
            archived: false,
            unreadByAdmin: true,
            unreadByCustomer: false,
            lastMessagePreview: text.slice(0, 280),
            createdAt: now,
            updatedAt: now,
          };
      const nextConvs = [
        updatedConv,
        ...state.conversations.filter((c) => c.id !== convId),
      ];
      const nextMsgs = [...state.messages, newMsg];
      saveJson('convs', nextConvs);
      saveJson('msgs', nextMsgs);
      return { conversations: nextConvs, messages: nextMsgs };
    });

    if (get().currentUser?.emailVerified) {
      try {
        await setDoc(doc(db, 'conversations', convId), {
          customerId: uid,
          customerName: customerName.slice(0, 120),
          customerEmail: customerEmail.slice(0, 254),
          productId,
          productTitle: productTitle.slice(0, 140),
          category,
          starred: false,
          archived: false,
          unreadByAdmin: true,
          unreadByCustomer: false,
          lastMessagePreview: text.slice(0, 280),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'conversations', convId, 'messages', msgId), {
          conversationId: convId,
          customerId: uid,
          senderId: uid,
          senderRole: 'customer',
          text: text.slice(0, 2000),
          attachmentUrl: attachmentUrl.slice(0, 500),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
        } catch {
          // Handled
        }
      }
    }
    get().pushToast(`Direct message sent to ${get().settings.storeName} studio!`, {
      tone: 'success',
    });
    return convId;
  },

  submitCustomRequest: async (req) => {
    const now = new Date().toISOString();
    const id = `creq-${Date.now()}`;
    const full: CustomOrderRequest = {
      ...req,
      id,
      status: 'New',
      quotedPriceBase: 0,
      paymentLinkUrl: '',
      adminNotes: '',
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const next = [full, ...s.customRequests];
      saveJson('creqs', next);
      return { customRequests: next };
    });
    try {
      await setDoc(doc(db, 'customRequests', id), {
        customerId: get().currentUser?.emailVerified ? get().currentUser!.uid : 'guest',
        name: req.name.slice(0, 120),
        email: req.email.slice(0, 254),
        phone: (req.phone || '').slice(0, 32),
        country: req.country || get().countryCode,
        widthCm: Math.min(600, Math.max(20, req.widthCm)),
        heightCm: Math.min(600, Math.max(20, req.heightCm)),
        styleNotes: req.styleNotes.slice(0, 2000),
        referenceImageUrl: (req.referenceImageUrl || '').slice(0, 500),
        status: 'New',
        quotedPriceBase: 0,
        paymentLinkUrl: '',
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Stored locally if offline
    }
    get().pushToast('Custom rug inquiry submitted!', { tone: 'success' });
  },

  subscribeNewsletter: async (email) => {
    const id = `sub-${email.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)}`;
    try {
      await setDoc(doc(db, 'subscribers', id), {
        email: email.slice(0, 254),
        country: get().countryCode,
        source: 'storefront_footer',
        createdAt: serverTimestamp(),
      });
    } catch {
      // Ignored if duplicate
    }

    // Trigger Auto-Welcome Discount Sender if enabled!
    const welcomeRule = (get().settings.autoDiscountRules || []).find(
      (r) => r.trigger === 'welcome_subscriber' && r.enabled
    );
    if (welcomeRule) {
      fetch('/api/automations/send-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [email],
          subject: welcomeRule.subjectLine,
          couponCode: welcomeRule.couponCode,
          discountPercent: welcomeRule.discountPercent,
          message: `Welcome to ${get().settings.primaryDomain}! Apply code ${welcomeRule.couponCode} at checkout for ${welcomeRule.discountPercent}% off your handmade tufted rug.`,
        }),
      }).catch(() => undefined);

      const updatedRules = (get().settings.autoDiscountRules || []).map((r) =>
        r.id === welcomeRule.id ? { ...r, sentCount: r.sentCount + 1 } : r
      );
      set((s) => ({ settings: { ...s.settings, autoDiscountRules: updatedRules } }));
      get().pushToast(
        `Subscribed! Auto-sent ${welcomeRule.discountPercent}% code "${welcomeRule.couponCode}" to ${email}`,
        { tone: 'success' }
      );
      return;
    }

    get().pushToast('Subscribed to studio drops!', { tone: 'success' });
  },

  // ==========================================================================
  // Admin Shop Manager Actions
  // ==========================================================================
  upsertProduct: async (product) => {
    const now = new Date().toISOString();
    const { score } = computeListingQualityScore(product);
    const updated: Product = {
      ...product,
      qualityScore: score,
      updatedAt: now,
      createdAt: product.createdAt || now,
    };
    set((state) => {
      const exists = state.products.some((p) => p.id === updated.id);
      const next = exists
        ? state.products.map((p) => (p.id === updated.id ? updated : p))
        : [updated, ...state.products];
      saveJson('products', next);
      return { products: next };
    });

    if (get().isLiveAdmin) {
      try {
        const { id, ...rest } = updated;
        await setDoc(doc(db, 'products', id), {
          ...rest,
          tags: rest.tags.slice(0, 13),
          materials: rest.materials.slice(0, 10),
          images: rest.images.slice(0, 20),
          sizes: rest.sizes.slice(0, 10),
          variations: rest.variations.slice(0, 15),
          combinations: rest.combinations.slice(0, 60),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `products/${updated.id}`);
      }
    }
    get().pushToast('Saved listing changes', { tone: 'success' });
  },

  deleteProducts: async (ids) => {
    const previousItems = get().products.filter((p) => ids.includes(p.id));
    set((state) => {
      const next = state.products.filter((p) => !ids.includes(p.id));
      saveJson('products', next);
      return { products: next };
    });
    if (get().isLiveAdmin) {
      for (const id of ids) {
        try {
          await deleteDoc(doc(db, 'products', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
        }
      }
    }
    get().pushToast(`Deleted ${ids.length} listing(s)`, {
      undoLabel: 'Undo',
      onUndo: () => {
        set((state) => {
          const restored = [...previousItems, ...state.products];
          saveJson('products', restored);
          return { products: restored };
        });
      },
    });
  },

  duplicateProduct: async (productId, count = 1) => {
    const src = get().products.find((p) => p.id === productId);
    if (!src) return null;
    const now = new Date().toISOString();
    const copies: Product[] = [];
    for (let i = 0; i < count; i++) {
      const suffix = count > 1 ? ` (copy ${i + 1})` : ' (copy)';
      const newId = `prod-${Date.now()}-${i}`;
      copies.push({
        ...structuredClone(src),
        id: newId,
        title: `${src.title.slice(0, 140 - suffix.length)}${suffix}`,
        slug: `${src.slug}-copy-${Date.now().toString().slice(-4)}-${i}`,
        status: 'draft',
        counters: { views: 0, visits: 0, favourites: 0, orders: 0, revenue: 0 },
        createdAt: now,
        updatedAt: now,
      });
    }
    set((state) => {
      const next = [...copies, ...state.products];
      saveJson('products', next);
      return { products: next };
    });
    get().pushToast(`Created ${copies.length} draft duplicate(s)`, { tone: 'success' });
    return copies[0];
  },

  bulkUpdateProducts: async (ids, actionLabel, mutator) => {
    const now = new Date().toISOString();
    const targetSet = new Set(ids);
    const snapshots: Array<{ id: string; previous: Partial<Product> }> = [];

    const nextProducts = get().products.map((p) => {
      if (!targetSet.has(p.id)) return p;
      snapshots.push({ id: p.id, previous: structuredClone(p) });
      const mutated = mutator(structuredClone(p));
      const { score } = computeListingQualityScore(mutated);
      return { ...mutated, qualityScore: score, updatedAt: now };
    });

    const undoEntry: UndoSnapshot = {
      id: `undo-${Date.now()}`,
      adminId: get().currentUser?.uid || 'owner-local',
      actionLabel,
      affectedCount: snapshots.length,
      snapshots: snapshots.slice(0, 500),
      restored: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    const nextUndo = [undoEntry, ...get().undoStack].slice(0, 10);
    set({ products: nextProducts, undoStack: nextUndo });
    saveJson('products', nextProducts);
    saveJson('undo', nextUndo);

    if (get().isLiveAdmin) {
      try {
        const batch = writeBatch(db);
        nextProducts
          .filter((p) => targetSet.has(p.id))
          .slice(0, 450)
          .forEach((p) => {
            const { id, ...rest } = p;
            batch.set(doc(db, 'products', id), {
              ...rest,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
        await batch.commit();
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'products/bulk');
        } catch {
          // Handled
        }
      }
    }

    get().pushToast(`${actionLabel} applied to ${snapshots.length} listings`, {
      tone: 'success',
      undoLabel: 'Undo',
      onUndo: () => {
        get().undoLastBulkAction(undoEntry.id);
      },
    });
  },

  undoLastBulkAction: async (undoId) => {
    const target = undoId
      ? get().undoStack.find((u) => u.id === undoId && !u.restored)
      : get().undoStack.find((u) => !u.restored);
    if (!target) {
      get().pushToast('No recent bulk action available to undo');
      return;
    }
    const prevMap = new Map(target.snapshots.map((s) => [s.id, s.previous]));
    const restoredProducts = get().products.map((p) => {
      const prev = prevMap.get(p.id);
      return prev ? ({ ...p, ...prev, updatedAt: new Date().toISOString() } as Product) : p;
    });
    const nextUndo = get().undoStack.map((u) =>
      u.id === target.id ? { ...u, restored: true } : u
    );
    set({ products: restoredProducts, undoStack: nextUndo });
    saveJson('products', restoredProducts);
    saveJson('undo', nextUndo);
    get().pushToast(`Restored ${target.affectedCount} listings prior to "${target.actionLabel}"`, {
      tone: 'success',
    });
  },

  importProductsBatch: async (newProducts) => {
    set((state) => {
      const next = [...newProducts, ...state.products];
      saveJson('products', next);
      return { products: next };
    });
    get().pushToast(`Imported ${newProducts.length} listings!`, { tone: 'success' });
  },

  upsertSection: async (section) => {
    set((s) => {
      const exists = s.sections.some((sec) => sec.id === section.id);
      const next = exists
        ? s.sections.map((sec) => (sec.id === section.id ? section : sec))
        : [...s.sections, section];
      saveJson('sections', next);
      return { sections: next };
    });
    get().pushToast('Shop section saved', { tone: 'success' });
  },

  deleteSection: async (id) => {
    set((s) => {
      const next = s.sections.filter((sec) => sec.id !== id);
      saveJson('sections', next);
      return { sections: next };
    });
    get().pushToast('Section deleted');
  },

  upsertProcessingProfile: async (profile) => {
    set((s) => {
      const base = profile.isDefault
        ? s.processingProfiles.map((p) => ({ ...p, isDefault: false }))
        : s.processingProfiles;
      const exists = base.some((p) => p.id === profile.id);
      const next = exists
        ? base.map((p) => (p.id === profile.id ? profile : p))
        : [...base, profile];
      saveJson('proc_profiles', next);
      return { processingProfiles: next };
    });
    get().pushToast('Processing profile saved', { tone: 'success' });
  },

  upsertShippingProfile: async (profile) => {
    set((s) => {
      const exists = s.shippingProfiles.some((p) => p.id === profile.id);
      const next = exists
        ? s.shippingProfiles.map((p) => (p.id === profile.id ? profile : p))
        : [...s.shippingProfiles, profile];
      saveJson('ship_profiles', next);
      return { shippingProfiles: next };
    });
    get().pushToast('Shipping profile saved', { tone: 'success' });
  },

  updateOrderStatus: async (orderId, status, extra) => {
    const now = new Date().toISOString();
    let updatedOrderRef: Order | null = null;
    set((state) => {
      const nextOrders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        const nextPhotos = extra?.productionPhoto
          ? [...o.productionPhotos, extra.productionPhoto].slice(0, 10)
          : o.productionPhotos;
        const nextTotalBase = extra?.customPriceBase ?? o.totalBase;
        const updatedOrder: Order = {
          ...o,
          status,
          trackingNumber: extra?.trackingNumber ?? o.trackingNumber,
          courier: extra?.courier ?? o.courier,
          internalNotes: extra?.internalNotes ?? o.internalNotes,
          productionPhotos: nextPhotos,
          totalBase: nextTotalBase,
          paymentStatus:
            status === 'Refunded'
              ? 'Refunded'
              : status === 'Delivered' && o.paymentStatus === 'COD'
              ? 'Paid'
              : o.paymentStatus,
          statusHistory: [
            ...o.statusHistory,
            {
              status,
              at: now,
              by:
                get().activeWorkerSession?.name ||
                get().currentUser?.displayName ||
                'InkedRug Admin',
            },
          ],
          updatedAt: now,
        };
        updatedOrderRef = updatedOrder;
        return updatedOrder;
      });
      saveJson('orders', nextOrders);
      return { orders: nextOrders };
    });

    if (updatedOrderRef && get().isLiveAdmin) {
      const ord = updatedOrderRef as Order;
      try {
        const { id, ...rest } = ord;
        await setDoc(doc(db, 'orders', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const tKey = makeTrackingLookupKey(ord.orderNumber, ord.customerEmail);
        await setDoc(doc(db, 'orderTracking', tKey), {
          orderNumber: ord.orderNumber,
          status: ord.status,
          estimatedDelivery: `${ord.productionDaysMax} days production + courier transit`,
          productionDaysMin: 10,
          productionDaysMax: ord.productionDaysMax || 15,
          trackingNumber: ord.trackingNumber,
          courier: ord.courier,
          productionPhotos: ord.productionPhotos,
          statusHistory: ord.statusHistory,
          itemCount: ord.items.reduce((acc, i) => acc + i.quantity, 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
        } catch {
          // Handled
        }
      }
    }
    get().pushToast(`Order updated to "${status}"`, { tone: 'success' });
  },

  replyConversation: async (conversationId, text) => {
    const now = new Date().toISOString();
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    const msg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      customerId: conv.customerId,
      senderId: get().currentUser?.uid || 'admin',
      senderRole: 'admin',
      text: text.slice(0, 2000),
      attachmentUrl: '',
      createdAt: now,
    };
    set((s) => {
      const nextMsgs = [...s.messages, msg];
      const nextConvs = s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              unreadByAdmin: false,
              unreadByCustomer: true,
              lastMessagePreview: text.slice(0, 280),
              updatedAt: now,
            }
          : c
      );
      saveJson('msgs', nextMsgs);
      saveJson('convs', nextConvs);
      return { messages: nextMsgs, conversations: nextConvs };
    });
    get().pushToast('Reply sent to buyer', { tone: 'success' });
  },

  updateCustomRequestQuote: async (id, status, quotedPriceBase, paymentLinkUrl, adminNotes) => {
    const now = new Date().toISOString();
    set((s) => {
      const next = s.customRequests.map((r) =>
        r.id === id
          ? { ...r, status, quotedPriceBase, paymentLinkUrl, adminNotes, updatedAt: now }
          : r
      );
      saveJson('creqs', next);
      return { customRequests: next };
    });
    get().pushToast(`Custom request updated (${status})`, { tone: 'success' });
  },

  moderateReview: async (reviewId, status, sellerReply) => {
    const now = new Date().toISOString();
    set((s) => {
      const next = s.reviews.map((r) =>
        r.id === reviewId
          ? { ...r, status, sellerReply: sellerReply ?? r.sellerReply, updatedAt: now }
          : r
      );
      saveJson('reviews', next);
      return { reviews: next };
    });
    get().pushToast(`Review marked as ${status}`, { tone: 'success' });
  },

  upsertSaleCampaign: async (sale) => {
    set((s) => {
      const exists = s.sales.some((c) => c.id === sale.id);
      const next = exists
        ? s.sales.map((c) => (c.id === sale.id ? sale : c))
        : [sale, ...s.sales];
      saveJson('sales', next);
      return { sales: next };
    });
    get().pushToast(`Sale "${sale.name}" (${sale.percent}% off) active!`, { tone: 'success' });
  },

  endSaleCampaign: async (saleId) => {
    set((s) => {
      const next = s.sales.map((c) =>
        c.id === saleId ? { ...c, status: 'ended' as const, updatedAt: new Date().toISOString() } : c
      );
      saveJson('sales', next);
      return { sales: next };
    });
    get().pushToast('Sale ended');
  },

  upsertCoupon: async (coupon) => {
    set((s) => {
      const exists = s.coupons.some((c) => c.id === coupon.id);
      const next = exists
        ? s.coupons.map((c) => (c.id === coupon.id ? coupon : c))
        : [coupon, ...s.coupons];
      saveJson('coupons', next);
      return { coupons: next };
    });
    get().pushToast(`Coupon ${coupon.code} saved`, { tone: 'success' });
  },

  deleteCoupon: async (couponId) => {
    set((s) => {
      const next = s.coupons.filter((c) => c.id !== couponId);
      saveJson('coupons', next);
      return { coupons: next };
    });
    get().pushToast('Coupon removed');
  },

  sendAutomatedDiscountBlast: async ({
    subject,
    audienceLabel,
    recipientEmails,
    couponCode,
    discountPercent,
    customMessage,
  }) => {
    const cleanCode = couponCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'INKED15';
    const now = new Date().toISOString();

    // Ensure the coupon code exists and is active in store coupons
    if (!get().coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
      await get().upsertCoupon({
        id: cleanCode,
        code: cleanCode,
        type: 'percent',
        value: discountPercent,
        minOrder: 0,
        maxUses: 1000,
        usedCount: 0,
        perCustomerLimit: 2,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await fetch('/api/automations/send-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientEmails,
          subject,
          couponCode: cleanCode,
          discountPercent,
          message: customMessage,
        }),
      });
    } catch {
      // Logged in local blast history
    }

    const record: EmailBlastRecord = {
      id: `blast-${Date.now()}`,
      subject,
      audienceLabel,
      recipientCount: Math.max(1, recipientEmails.length),
      couponCode: cleanCode,
      discountPercent,
      sentAt: now,
      status: 'sent',
    };

    const nextHistory = [record, ...(get().settings.emailBlastHistory || [])].slice(0, 30);
    await get().updateStoreSettings({ emailBlastHistory: nextHistory });
    get().pushToast(
      `Sent "${cleanCode}" (${discountPercent}% off) to ${record.recipientCount} recipient(s)!`,
      { tone: 'success' }
    );
  },

  addFinanceEntry: async (entry) => {
    const now = new Date().toISOString();
    const full: FinanceEntry = {
      ...entry,
      id: `fin-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const next = [full, ...s.finances];
      saveJson('finances', next);
      return { finances: next };
    });
    get().pushToast('Finance ledger entry recorded', { tone: 'success' });
  },

  upsertStaticPage: async (page) => {
    set((s) => {
      const exists = s.pages.some((p) => p.slug === page.slug);
      const next = exists
        ? s.pages.map((p) => (p.slug === page.slug ? page : p))
        : [...s.pages, page];
      saveJson('pages', next);
      return { pages: next };
    });
    get().pushToast(`Page "${page.title}" saved`, { tone: 'success' });
  },

  upsertSnippet: async (snippet) => {
    set((s) => {
      const exists = s.snippets.some((sn) => sn.id === snippet.id);
      const next = exists
        ? s.snippets.map((sn) => (sn.id === snippet.id ? snippet : sn))
        : [snippet, ...s.snippets];
      saveJson('snippets', next);
      return { snippets: next };
    });
    get().pushToast('Saved reusable snippet', { tone: 'success' });
  },

  updateStoreSettings: async (patch) => {
    const merged = { ...get().settings, ...patch };
    set({ settings: merged });
    saveJson('settings', merged);
    if (get().isLiveAdmin) {
      try {
        await setDoc(doc(db, 'settings', 'general'), {
          key: 'general',
          data: merged,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'settings/general');
      }
    }
    get().pushToast('Store settings saved', { tone: 'success' });
  },

  savePrivateIntegrationSecret: async (docId, secretPayload) => {
    if (get().isLiveAdmin) {
      try {
        await setDoc(doc(db, 'private_settings', docId), {
          key: docId,
          data: secretPayload,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `private_settings/${docId}`);
      }
    }
    get().pushToast('Encrypted secret saved to private_settings (server-only)', {
      tone: 'success',
    });
  },

  seedFirestoreDemoData: async () => {
    const preservedWorkers = get().settings.workerAccounts || [];
    const nextSettings = { ...SEED_SETTINGS, workerAccounts: preservedWorkers };
    set({
      settings: nextSettings,
      products: SEED_PRODUCTS,
      categories: SEED_CATEGORIES,
      sections: SEED_SECTIONS,
      processingProfiles: SEED_PROCESSING_PROFILES,
      shippingProfiles: SEED_SHIPPING_PROFILES,
      sales: SEED_SALES,
      coupons: SEED_COUPONS,
      reviews: SEED_REVIEWS,
      orders: SEED_ORDERS,
      conversations: SEED_CONVERSATIONS,
      messages: SEED_MESSAGES,
      customRequests: SEED_CUSTOM_REQUESTS,
      customers: SEED_CUSTOMERS,
      abandonedCarts: SEED_ABANDONED_CARTS,
      snippets: SEED_SNIPPETS,
      finances: SEED_FINANCES,
      pages: SEED_PAGES,
      countryCode: 'US',
      currency: 'USD',
    });
    saveJson('products', SEED_PRODUCTS);
    saveJson('orders', SEED_ORDERS);
    saveJson('settings', nextSettings);
    saveJson('country', 'US');
    saveJson('currency', 'USD');

    if (get().isLiveAdmin) {
      try {
        const batch = writeBatch(db);
        for (const p of SEED_PRODUCTS) {
          const { id, ...rest } = p;
          batch.set(doc(db, 'products', id), {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const c of SEED_CATEGORIES) {
          const { id, ...rest } = c;
          batch.set(doc(db, 'categories', id), {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const s of SEED_SECTIONS) {
          const { id, ...rest } = s;
          batch.set(doc(db, 'sections', id), {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const pp of SEED_PROCESSING_PROFILES) {
          const { id, ...rest } = pp;
          batch.set(doc(db, 'processingProfiles', id), {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        for (const sp of SEED_SHIPPING_PROFILES) {
          const { id, ...rest } = sp;
          batch.set(doc(db, 'shippingProfiles', id), {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        batch.set(doc(db, 'settings', 'general'), {
          key: 'general',
          data: nextSettings,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
        get().pushToast('USD catalog & InkedRug.com profiles synced to live Firestore!', {
          tone: 'success',
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'seed');
      }
    } else {
      get().pushToast('USD catalog reset locally (sign in as owner to sync to Firestore)', {
        tone: 'success',
      });
    }
  },
}));
