import { z } from 'zod';

// ============================================================================
// Validation Constants Synced Verbatim with firebase-blueprint.json
// ============================================================================
export const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
export const SLUG_REGEX = /^[a-z0-9\-]+$/;
export const COUPON_REGEX = /^[A-Z0-9_\-]+$/;

export const MAX_TITLE_LENGTH = 140;
export const MAX_SLUG_LENGTH = 160;
export const MAX_DESCRIPTION_LENGTH = 10000;
export const MAX_TAGS_COUNT = 13;
export const MAX_IMAGES_COUNT = 20;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_COMMENT_LENGTH = 2000;

export const ProductValidationSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  slug: z.string().min(1).max(MAX_SLUG_LENGTH).regex(SLUG_REGEX),
  description: z.string().max(MAX_DESCRIPTION_LENGTH),
  categoryId: z.string().min(1).max(128),
  sectionId: z.string().max(128),
  tags: z.array(z.string().max(64)).max(MAX_TAGS_COUNT),
  basePrice: z.number().min(0),
});

export const OrderCheckoutValidationSchema = z.object({
  customerEmail: z.string().email().max(MAX_EMAIL_LENGTH),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(5).max(32),
  addressLine1: z.string().min(2).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(2).max(24),
  country: z.string().min(2).max(8),
});

// ============================================================================
// Core Domain Interfaces
// ============================================================================
export type AdminRole = 'owner' | 'manager' | 'staff';

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  variationId?: string;
  cssFilter?: string;
}

export interface ProductSize {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
  price: number; // In store base currency
  active: boolean;
}

export interface ProductVariation {
  id: string;
  name: string;
  swatch: string;
  imageUrls: string[];
  cssFilter?: string;
  priceAdjustment: number;
  stock: number;
  sku: string;
  active: boolean;
}

export interface ProductCombination {
  sizeId: string;
  variationId: string;
  price: number;
  quantity: number;
  sku: string;
  visible: boolean;
}

export interface ProductPersonalisation {
  enabled: boolean;
  instructions: string;
  required: boolean;
  charLimit: number;
  allowImage: boolean;
}

export interface ProductItemDetails {
  material: string;
  personalizable: boolean;
  handmade: boolean;
  backing: string;
  care: string;
  pileHeightMm: number;
}

export interface ProductCounters {
  views: number;
  visits: number;
  favourites: number;
  orders: number;
  revenue: number;
}

export type ListingStatus = 'active' | 'draft' | 'expired' | 'sold_out' | 'inactive' | 'scheduled';

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  sectionId: string;
  tags: string[];
  materials: string[];
  images: ProductImage[];
  videoUrl: string;
  basePrice: number;
  comparePrice: number;
  sku: string;
  sizes: ProductSize[];
  variations: ProductVariation[];
  combinations: ProductCombination[];
  allowCustomSize: boolean;
  customSizePriceOnRequest: boolean;
  personalisation: ProductPersonalisation;
  stockMode: 'made_to_order' | 'limited';
  stockCount: number;
  salePercent: number;
  saleEndAt: string;
  processingProfileId: string;
  shippingProfileId: string;
  freeShipping: boolean;
  itemDetails: ProductItemDetails;
  attributes: {
    primaryColor: string;
    secondaryColor: string;
    style: string;
    room: string;
    occasion: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
  pinterest: {
    pinTitle: string;
    pinDescription: string;
    board: string;
  };
  featured: boolean;
  isBestseller: boolean;
  ratingAvg: number;
  ratingCount: number;
  status: ListingStatus;
  scheduledAt: string;
  qualityScore: number;
  counters: ProductCounters;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopSection {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingProfile {
  id: string;
  name: string;
  minDays: number;
  maxDays: number;
  isDefault: boolean;
  badgeText: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[]; // ISO-2 codes, '*' for rest of world
  rateType: 'flat' | 'per_item' | 'free_over' | 'free';
  rateBase: number;
  freeOverBase: number;
  transitDaysMin: number;
  transitDaysMax: number;
  courier: string;
}

export interface ShippingProfile {
  id: string;
  name: string;
  originCountry: string;
  freeShippingWorldwide: boolean;
  zones: ShippingZone[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleCampaign {
  id: string;
  name: string;
  percent: number;
  scope: 'all' | 'sections' | 'categories' | 'products';
  targetIds: string[];
  excludedIds: string[];
  minOrder: number;
  countries: string[];
  startAt: string;
  endAt: string;
  status: 'active' | 'scheduled' | 'ended';
  ordersCount: number;
  revenueBase: number;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat' | 'free_shipping';
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  perCustomerLimit: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  rating: number;
  qualityRating: number;
  deliveryRating: number;
  serviceRating: number;
  comment: string;
  photos: string[];
  verifiedBuyer: boolean;
  status: 'approved' | 'pending' | 'hidden';
  sellerReply: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  slug: string;
  title: string;
  image: string;
  cssFilter?: string;
  variationId: string;
  variationName: string;
  sizeId: string;
  sizeLabel: string;
  isCustomSize: boolean;
  customDims?: { width: number; height: number; unit: 'cm' | 'inch' };
  personalisationText: string;
  referenceImageUrl: string;
  unitOriginPriceBase: number;
  salePercent: number;
  unitFinalPriceBase: number;
  quantity: number;
  savedForLater?: boolean;
}

export type OrderStatus =
  | 'New'
  | 'Confirmed'
  | 'In production'
  | 'Ready to ship'
  | 'Shipped'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded'
  | 'Awaiting price confirmation';

export type PaymentMethodId = 'razorpay' | 'stripe' | 'paypal' | 'cod' | 'whatsapp_custom';

export interface AddressInfo {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  productId: string;
  slug: string;
  title: string;
  image: string;
  variationName: string;
  sizeLabel: string;
  isCustomSize: boolean;
  customDims?: string;
  personalisation: string;
  referenceImageUrl: string;
  unitPriceBase: number;
  salePercent: number;
  quantity: number;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  at: string;
  by: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: AddressInfo;
  billingAddress: AddressInfo;
  orderNotes: string;
  items: OrderItem[];
  subtotalBase: number;
  discountBase: number;
  couponCode: string;
  shippingBase: number;
  taxBase: number;
  totalBase: number;
  totalCharged: number;
  displayCurrency: string;
  chargedCurrency: string;
  exchangeRateUsed: number;
  paymentMethod: PaymentMethodId;
  paymentStatus: 'Pending' | 'Paid' | 'COD' | 'Awaiting Quote' | 'Refunded';
  paymentId: string;
  status: OrderStatus;
  statusHistory: OrderStatusEntry[];
  productionDaysMax: number;
  productionDeadline: string;
  trackingNumber: string;
  courier: string;
  productionPhotos: string[];
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  productId: string;
  productTitle: string;
  category: 'general' | 'custom_request' | 'order';
  starred: boolean;
  archived: boolean;
  unreadByAdmin: boolean;
  unreadByCustomer: boolean;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  customerId: string;
  senderId: string;
  senderRole: 'customer' | 'admin';
  text: string;
  attachmentUrl: string;
  createdAt: string;
}

export interface CustomOrderRequest {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  widthCm: number;
  heightCm: number;
  styleNotes: string;
  referenceImageUrl: string;
  status: 'New' | 'Quoted' | 'Accepted' | 'Rejected';
  quotedPriceBase: number;
  paymentLinkUrl: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  language: string;
  favourites: string[];
  followedShop: boolean;
  savedAddresses: AddressInfo[];
  ordersCount: number;
  totalSpentBase: number;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AbandonedCartLead {
  id: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  totalBase: number;
  itemSummary: string;
  recovered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UndoSnapshot {
  id: string;
  adminId: string;
  actionLabel: string;
  affectedCount: number;
  snapshots: Array<{ id: string; previous: Partial<Product> }>;
  restored: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnippetItem {
  id: string;
  title: string;
  kind: 'snippet' | 'template';
  body: string;
  templateData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceEntry {
  id: string;
  entryType: 'expense' | 'payout';
  title: string;
  category: string;
  amountBase: number;
  date: string;
  status: 'completed' | 'pending';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageSectionConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface WorkerStaffAccount {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: AdminRole;
  fullSiteAccess: boolean;
  permissions: {
    listings: boolean;
    orders: boolean;
    marketing: boolean;
    pages: boolean;
    finances: boolean;
    settings: boolean;
  };
  passwordHash: string;
  firebaseProvisioned: boolean;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface InstagramReelItem {
  id: string;
  title: string;
  caption: string;
  thumbnailUrl: string;
  reelUrl: string;
  viewsLabel: string;
  likesLabel: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  visible: boolean;
}

export interface AutoDiscountRule {
  id: string;
  trigger: 'welcome_subscriber' | 'abandoned_cart' | 'post_purchase_vip' | 'review_reward';
  name: string;
  enabled: boolean;
  couponCode: string;
  discountPercent: number;
  delayHours: number;
  subjectLine: string;
  sentCount: number;
}

export interface EmailBlastRecord {
  id: string;
  subject: string;
  audienceLabel: string;
  recipientCount: number;
  couponCode: string;
  discountPercent: number;
  sentAt: string;
  status: 'sent' | 'queued';
}

export interface StoreSettings {
  storeName: string;
  primaryDomain: string;
  tagline: string;
  announcementLeft: string;
  announcementRight: string;
  announcementVisible: boolean;
  heroHeadline: string;
  heroSubheadline: string;
  heroCtaText: string;
  heroImage: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappFloatingEnabled: boolean;
  shipsFromCountry: string;
  baseCurrency: string;
  defaultCountry: string;
  indiaRegionalPricingEnabled: boolean;
  indiaRegionalDiscountPercent: number;
  priceRounding: 'exact' | 'clean' | '99';
  autoDetectRegion: boolean;
  vacationMode: boolean;
  vacationMessage: string;
  gstPercentIndia: number;
  gstInclusive: boolean;
  gstin: string;
  googleSearchConsoleVerification: string;
  instagramHandle: string;
  instagramReels: InstagramReelItem[];
  autoDiscountRules: AutoDiscountRule[];
  emailBlastHistory: EmailBlastRecord[];
  workerAccounts: WorkerStaffAccount[];
  paymentsEnabled: {
    razorpay: boolean;
    stripe: boolean;
    paypal: boolean;
    cod: boolean;
    whatsappCustom: boolean;
  };
  codMaxOrderBase: number;
  homepageSections: HomepageSectionConfig[];
  faqs: Array<{ q: string; a: string }>;
  testimonials: Array<{ name: string; location: string; item: string; quote: string }>;
  integrations: Record<string, { connected: boolean; publicId: string; lastTested?: string }>;
}
