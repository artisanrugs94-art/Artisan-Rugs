import {
  Order,
  ProcessingProfile,
  Product,
  SaleCampaign,
  ShippingProfile,
} from '../types';

/**
 * Computes the effective active sale percentage for a product.
 * Highest discount wins when product-level sale and campaign-level sale overlap.
 */
export function getActiveSaleInfo(
  product: Product,
  campaigns: SaleCampaign[],
  visitorCountry?: string
): { percent: number; endsAt: string | null; saleName?: string } {
  const now = Date.now();
  let bestPercent = 0;
  let bestEndsAt: string | null = null;
  let saleName: string | undefined;

  if (product.salePercent > 0) {
    const validEnd = !product.saleEndAt || new Date(product.saleEndAt).getTime() > now;
    if (validEnd) {
      bestPercent = product.salePercent;
      bestEndsAt = product.saleEndAt || null;
    }
  }

  for (const camp of campaigns) {
    if (camp.status !== 'active') continue;
    const startOk = !camp.startAt || new Date(camp.startAt).getTime() <= now;
    const endOk = !camp.endAt || new Date(camp.endAt).getTime() > now;
    if (!startOk || !endOk) continue;
    if (camp.excludedIds.includes(product.id)) continue;
    if (
      visitorCountry &&
      camp.countries.length > 0 &&
      !camp.countries.includes(visitorCountry)
    ) {
      continue;
    }

    let matches = false;
    if (camp.scope === 'all') matches = true;
    else if (camp.scope === 'categories' && camp.targetIds.includes(product.categoryId)) matches = true;
    else if (camp.scope === 'sections' && camp.targetIds.includes(product.sectionId)) matches = true;
    else if (camp.scope === 'products' && camp.targetIds.includes(product.id)) matches = true;

    if (matches && camp.percent > bestPercent) {
      bestPercent = camp.percent;
      bestEndsAt = camp.endAt || null;
      saleName = camp.name;
    }
  }

  return { percent: bestPercent, endsAt: bestEndsAt, saleName };
}

export function getLowestProductPriceBase(product: Product): {
  lowestOriginBase: number;
  hasMultipleSizes: boolean;
} {
  const activeSizes = product.sizes.filter((s) => s.active);
  if (activeSizes.length === 0) {
    return { lowestOriginBase: product.basePrice, hasMultipleSizes: false };
  }
  const prices = activeSizes.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { lowestOriginBase: min, hasMultipleSizes: max > min || product.allowCustomSize };
}

export function getRegionalPriceMultiplier(
  countryCode: string,
  settings?: {
    indiaRegionalPricingEnabled?: boolean;
    indiaRegionalDiscountPercent?: number;
  }
): number {
  if (
    countryCode?.toUpperCase() === 'IN' &&
    (settings?.indiaRegionalPricingEnabled ?? true)
  ) {
    const pct = Math.min(80, Math.max(0, settings?.indiaRegionalDiscountPercent ?? 30));
    return (100 - pct) / 100;
  }
  return 1;
}

/**
 * Applies regional factory-direct adjustment:
 * Because all rugs are handcrafted in India, shoppers located in India ('IN')
 * automatically see prices 30% lower than the global USD price (no international air-freight).
 */
export function applyRegionalPricing(
  amountInBase: number,
  countryCode: string,
  settings?: {
    indiaRegionalPricingEnabled?: boolean;
    indiaRegionalDiscountPercent?: number;
  }
): number {
  const mult = getRegionalPriceMultiplier(countryCode, settings);
  if (mult === 1) return amountInBase;
  return Number((amountInBase * mult).toFixed(2));
}

export function applySaleDiscount(priceBase: number, salePercent: number): number {
  if (salePercent <= 0) return priceBase;
  return Number((priceBase * (1 - salePercent / 100)).toFixed(2));
}

export function calculateEstimatedDeliveryRange(
  processingProfile: ProcessingProfile | undefined,
  shippingProfile: ShippingProfile | undefined,
  countryCode: string
): {
  label: string;
  minDaysTotal: number;
  maxDaysTotal: number;
  prodMin: number;
  prodMax: number;
  transitMin: number;
  transitMax: number;
  courier: string;
} {
  const prodMin = processingProfile?.minDays ?? 10;
  const prodMax = processingProfile?.maxDays ?? 15;

  let transitMin = 4;
  let transitMax = 7;
  let courier = 'Tracked Express';

  if (shippingProfile) {
    const zone =
      shippingProfile.zones.find((z) => z.countries.includes(countryCode)) ||
      shippingProfile.zones.find((z) => z.countries.includes('*'));
    if (zone) {
      transitMin = zone.transitDaysMin;
      transitMax = zone.transitDaysMax;
      courier = zone.courier;
    }
  }

  const minDaysTotal = prodMin + transitMin;
  const maxDaysTotal = prodMax + transitMax;

  const dMin = new Date(Date.now() + minDaysTotal * 24 * 60 * 60 * 1000);
  const dMax = new Date(Date.now() + maxDaysTotal * 24 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    label: `${fmt(dMin)} – ${fmt(dMax)}`,
    minDaysTotal,
    maxDaysTotal,
    prodMin,
    prodMax,
    transitMin,
    transitMax,
    courier,
  };
}

export function calculateShippingFeeBase(
  shippingProfile: ShippingProfile | undefined,
  productFreeShipping: boolean,
  countryCode: string,
  subtotalBase: number,
  itemCount = 1
): number {
  if (productFreeShipping && countryCode === 'IN') return 0;
  if (!shippingProfile || shippingProfile.freeShippingWorldwide) return 0;

  const zone =
    shippingProfile.zones.find((z) => z.countries.includes(countryCode)) ||
    shippingProfile.zones.find((z) => z.countries.includes('*'));

  if (!zone) return 0;
  if (zone.rateType === 'free') return 0;
  if (zone.rateType === 'free_over') {
    return subtotalBase >= zone.freeOverBase ? 0 : zone.rateBase;
  }
  if (zone.rateType === 'per_item') {
    return zone.rateBase * Math.max(1, itemCount);
  }
  return zone.rateBase;
}

export function computeListingQualityScore(p: Partial<Product>): {
  score: number;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  const imgCount = p.images?.length ?? 0;
  if (imgCount >= 3) score += 20;
  else if (imgCount >= 1) {
    score += 12;
    suggestions.push('Add at least 3 studio photos from multiple angles (+8 pts)');
  } else {
    suggestions.push('Upload cover photo (+20 pts)');
  }

  const allHaveAlt = (p.images ?? []).every((i) => i.alt && i.alt.trim().length >= 5);
  if (imgCount > 0 && allHaveAlt) score += 10;
  else suggestions.push('Add descriptive alt text to all photos for SEO (+10 pts)');

  const titleLen = p.title?.trim().length ?? 0;
  if (titleLen >= 40 && titleLen <= 140) score += 15;
  else suggestions.push('Use a descriptive 40–140 char title with style keywords (+15 pts)');

  const tagCount = p.tags?.length ?? 0;
  if (tagCount >= 13) score += 20;
  else {
    score += Math.round((tagCount / 13) * 20);
    suggestions.push(`Use all 13 search tags (${13 - tagCount} remaining)`);
  }

  const descLen = p.description?.trim().length ?? 0;
  if (descLen >= 180) score += 15;
  else suggestions.push('Expand description with yarn pile, backing & care details (+15 pts)');

  if ((p.variations?.length ?? 0) >= 2 && (p.sizes?.length ?? 0) >= 2) score += 10;
  else suggestions.push('Add multiple Size and Color variations (+10 pts)');

  if (p.processingProfileId) score += 10;
  else suggestions.push('Assign a 10–15 day Processing Profile (+10 pts)');

  return { score: Math.min(100, score), suggestions };
}

export function getProductionDeadlineBadge(order: Order): {
  dayElapsed: number;
  maxDays: number;
  isOverdue: boolean;
  tone: 'neutral' | 'amber' | 'red' | 'done';
  label: string;
} {
  const maxDays = order.productionDaysMax || 15;
  if (['Shipped', 'Delivered', 'Completed', 'Cancelled', 'Refunded'].includes(order.status)) {
    return {
      dayElapsed: 0,
      maxDays,
      isOverdue: false,
      tone: 'done',
      label: order.status,
    };
  }
  const createdMs = new Date(order.createdAt).getTime();
  const elapsed = Math.max(1, Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000)) + 1);
  if (elapsed > maxDays) {
    return {
      dayElapsed: elapsed,
      maxDays,
      isOverdue: true,
      tone: 'red',
      label: `Overdue · Day ${elapsed} of ${maxDays}`,
    };
  }
  if (elapsed > 10) {
    return {
      dayElapsed: elapsed,
      maxDays,
      isOverdue: false,
      tone: 'amber',
      label: `Day ${elapsed} of ${maxDays}`,
    };
  }
  return {
    dayElapsed: elapsed,
    maxDays,
    isOverdue: false,
    tone: 'neutral',
    label: `Day ${elapsed} of ${maxDays}`,
  };
}

export function makeTrackingLookupKey(orderNumber: string, emailOrPhone: string): string {
  const cleanOrd = orderNumber.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
  const cleanIdent = emailOrPhone.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
  return `${cleanOrd}_${cleanIdent || 'lookup'}`;
}
