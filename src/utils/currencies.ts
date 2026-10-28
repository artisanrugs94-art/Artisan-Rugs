export interface CountryCurrencyConfig {
  countryCode: string;
  countryName: string;
  flag: string;
  currency: string;
  locale: string;
  phoneCode: string;
  zeroDecimal?: boolean;
}

export const COUNTRY_CURRENCY_MAP: CountryCurrencyConfig[] = [
  { countryCode: 'US', countryName: 'United States', flag: '🇺🇸', currency: 'USD', locale: 'en-US', phoneCode: '+1' },
  { countryCode: 'IN', countryName: 'India', flag: '🇮🇳', currency: 'INR', locale: 'en-IN', phoneCode: '+91' },
  { countryCode: 'GB', countryName: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', locale: 'en-GB', phoneCode: '+44' },
  { countryCode: 'CA', countryName: 'Canada', flag: '🇨🇦', currency: 'CAD', locale: 'en-CA', phoneCode: '+1' },
  { countryCode: 'AU', countryName: 'Australia', flag: '🇦🇺', currency: 'AUD', locale: 'en-AU', phoneCode: '+61' },
  { countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪', currency: 'EUR', locale: 'de-DE', phoneCode: '+49' },
  { countryCode: 'FR', countryName: 'France', flag: '🇫🇷', currency: 'EUR', locale: 'fr-FR', phoneCode: '+33' },
  { countryCode: 'IT', countryName: 'Italy', flag: '🇮🇹', currency: 'EUR', locale: 'it-IT', phoneCode: '+39' },
  { countryCode: 'ES', countryName: 'Spain', flag: '🇪🇸', currency: 'EUR', locale: 'es-ES', phoneCode: '+34' },
  { countryCode: 'NL', countryName: 'Netherlands', flag: '🇳🇱', currency: 'EUR', locale: 'nl-NL', phoneCode: '+31' },
  { countryCode: 'AE', countryName: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', locale: 'en-AE', phoneCode: '+971' },
  { countryCode: 'SG', countryName: 'Singapore', flag: '🇸🇬', currency: 'SGD', locale: 'en-SG', phoneCode: '+65' },
  { countryCode: 'JP', countryName: 'Japan', flag: '🇯🇵', currency: 'JPY', locale: 'ja-JP', phoneCode: '+81', zeroDecimal: true },
  { countryCode: 'KR', countryName: 'South Korea', flag: '🇰🇷', currency: 'KRW', locale: 'ko-KR', phoneCode: '+82', zeroDecimal: true },
  { countryCode: 'CH', countryName: 'Switzerland', flag: '🇨🇭', currency: 'CHF', locale: 'de-CH', phoneCode: '+41' },
  { countryCode: 'SE', countryName: 'Sweden', flag: '🇸🇪', currency: 'SEK', locale: 'sv-SE', phoneCode: '+46' },
  { countryCode: 'NO', countryName: 'Norway', flag: '🇳🇴', currency: 'NOK', locale: 'nb-NO', phoneCode: '+47' },
  { countryCode: 'DK', countryName: 'Denmark', flag: '🇩🇰', currency: 'DKK', locale: 'da-DK', phoneCode: '+45' },
  { countryCode: 'NZ', countryName: 'New Zealand', flag: '🇳🇿', currency: 'NZD', locale: 'en-NZ', phoneCode: '+64' },
  { countryCode: 'HK', countryName: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', locale: 'zh-HK', phoneCode: '+852' },
  { countryCode: 'MY', countryName: 'Malaysia', flag: '🇲🇾', currency: 'MYR', locale: 'ms-MY', phoneCode: '+60' },
  { countryCode: 'TH', countryName: 'Thailand', flag: '🇹🇭', currency: 'THB', locale: 'th-TH', phoneCode: '+66' },
  { countryCode: 'PH', countryName: 'Philippines', flag: '🇵🇭', currency: 'PHP', locale: 'en-PH', phoneCode: '+63' },
  { countryCode: 'ID', countryName: 'Indonesia', flag: '🇮🇩', currency: 'IDR', locale: 'id-ID', phoneCode: '+62', zeroDecimal: true },
  { countryCode: 'VN', countryName: 'Vietnam', flag: '🇻🇳', currency: 'VND', locale: 'vi-VN', phoneCode: '+84', zeroDecimal: true },
  { countryCode: 'MX', countryName: 'Mexico', flag: '🇲🇽', currency: 'MXN', locale: 'es-MX', phoneCode: '+52' },
  { countryCode: 'BR', countryName: 'Brazil', flag: '🇧🇷', currency: 'BRL', locale: 'pt-BR', phoneCode: '+55' },
  { countryCode: 'ZA', countryName: 'South Africa', flag: '🇿🇦', currency: 'ZAR', locale: 'en-ZA', phoneCode: '+27' },
  { countryCode: 'SA', countryName: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', locale: 'ar-SA', phoneCode: '+966' },
  { countryCode: 'QA', countryName: 'Qatar', flag: '🇶🇦', currency: 'QAR', locale: 'ar-QA', phoneCode: '+974' },
  { countryCode: 'KW', countryName: 'Kuwait', flag: '🇰🇼', currency: 'KWD', locale: 'ar-KW', phoneCode: '+965' },
  { countryCode: 'PL', countryName: 'Poland', flag: '🇵🇱', currency: 'PLN', locale: 'pl-PL', phoneCode: '+48' },
  { countryCode: 'TR', countryName: 'Turkey', flag: '🇹🇷', currency: 'TRY', locale: 'tr-TR', phoneCode: '+90' },
  { countryCode: 'IL', countryName: 'Israel', flag: '🇮🇱', currency: 'ILS', locale: 'he-IL', phoneCode: '+972' },
  { countryCode: 'TW', countryName: 'Taiwan', flag: '🇹🇼', currency: 'TWD', locale: 'zh-TW', phoneCode: '+886', zeroDecimal: true },
];

// Fallback exchange rates relative to Base Currency USD (1 USD = X Target)
export const FALLBACK_RATES_FROM_USD: Record<string, number> = {
  USD: 1,
  INR: 84.0,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.38,
  AUD: 1.52,
  AED: 3.67,
  SGD: 1.34,
  JPY: 152.0,
  KRW: 1380.0,
  CHF: 0.87,
  SEK: 10.5,
  NOK: 11.0,
  DKK: 6.86,
  NZD: 1.66,
  HKD: 7.78,
  MYR: 4.38,
  THB: 33.8,
  PHP: 58.2,
  IDR: 15680.0,
  VND: 25300.0,
  MXN: 20.0,
  BRL: 5.72,
  ZAR: 17.8,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.307,
  PLN: 3.98,
  TRY: 34.3,
  ILS: 3.72,
  TWD: 32.1,
};

// Kept for backward-compatibility imports
export const FALLBACK_RATES_FROM_INR = FALLBACK_RATES_FROM_USD;

export const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'IDR', 'VND', 'TWD']);

export const MULTI_CURRENCY_GATEWAYS: Record<string, Set<string>> = {
  stripe: new Set(Object.keys(FALLBACK_RATES_FROM_USD)),
  paypal: new Set([
    'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'JPY', 'CHF', 'SEK',
    'NOK', 'DKK', 'NZD', 'HKD', 'MYR', 'THB', 'PHP', 'MXN', 'BRL', 'PLN', 'ILS', 'TWD',
  ]),
  razorpay: new Set(['INR', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'AED', 'SGD']),
  cod: new Set(['INR']),
  whatsapp_custom: new Set(Object.keys(FALLBACK_RATES_FROM_USD)),
};

export function getCountryConfig(countryCode: string): CountryCurrencyConfig {
  return (
    COUNTRY_CURRENCY_MAP.find((c) => c.countryCode === countryCode.toUpperCase()) ||
    COUNTRY_CURRENCY_MAP[0]
  );
}

export function getLocaleForCurrency(currency: string): string {
  const match = COUNTRY_CURRENCY_MAP.find((c) => c.currency === currency.toUpperCase());
  return match ? match.locale : 'en-US';
}

function applyDisplayRounding(
  raw: number,
  targetCurrency: string,
  rounding: 'exact' | 'clean' | '99'
): number {
  if (ZERO_DECIMAL_CURRENCIES.has(targetCurrency)) {
    return Math.round(raw);
  }
  if (rounding === '99' && raw >= 5) {
    return Math.floor(raw) + 0.99;
  }
  if (rounding === 'clean' && raw >= 20) {
    return Math.round(raw);
  }
  return Number(raw.toFixed(2));
}

export function convertFromBase(
  amountInBase: number,
  targetCurrency: string,
  rates: Record<string, number>,
  baseCurrency = 'USD',
  rounding: 'exact' | 'clean' | '99' = 'clean'
): number {
  if (amountInBase <= 0) return 0;
  if (targetCurrency === baseCurrency) {
    return applyDisplayRounding(amountInBase, targetCurrency, rounding);
  }

  // Normalize seamlessly regardless of whether `rates` is keyed to USD or baseCurrency
  const baseRate = rates[baseCurrency] ?? FALLBACK_RATES_FROM_USD[baseCurrency] ?? 1;
  const targetRate = rates[targetCurrency] ?? FALLBACK_RATES_FROM_USD[targetCurrency] ?? 1;
  const raw = (amountInBase / (baseRate || 1)) * targetRate;

  return applyDisplayRounding(raw, targetCurrency, rounding);
}

export function formatMoney(
  amountInBase: number,
  targetCurrency: string,
  rates: Record<string, number>,
  baseCurrency = 'USD',
  rounding: 'exact' | 'clean' | '99' = 'clean'
): string {
  const converted = convertFromBase(amountInBase, targetCurrency, rates, baseCurrency, rounding);
  return formatAlreadyConverted(converted, targetCurrency);
}

export function formatAlreadyConverted(amount: number, currency: string): string {
  const isZeroDec = ZERO_DECIMAL_CURRENCIES.has(currency);
  const locale = getLocaleForCurrency(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: isZeroDec ? 0 : amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: isZeroDec ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(isZeroDec ? 0 : 2)}`;
  }
}

export async function detectVisitorCountry(defaultCountry = 'US'): Promise<string> {
  // 1. Check server-side / CDN header endpoint first (works behind Cloudflare/Nginx on VPS even with ad-blockers)
  try {
    const edgeRes = await fetch('/api/visitor-geo');
    if (edgeRes.ok) {
      const edgeJson = await edgeRes.json();
      if (edgeJson && typeof edgeJson.countryCode === 'string' && edgeJson.countryCode.length === 2) {
        const edgeCode = edgeJson.countryCode.toUpperCase();
        if (COUNTRY_CURRENCY_MAP.some((c) => c.countryCode === edgeCode)) {
          return edgeCode;
        }
      }
    }
  } catch {
    // Proceed to direct IP fallback
  }

  // 2. Direct client IP lookup fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2800);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json.country_code === 'string' && json.country_code.length === 2) {
        const code = json.country_code.toUpperCase();
        if (COUNTRY_CURRENCY_MAP.some((c) => c.countryCode === code)) {
          return code;
        }
      }
    }
  } catch {
    // Fallback to defaultCountry / navigator.language
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    const parts = navigator.language.split('-');
    if (parts.length > 1) {
      const region = parts[1].toUpperCase();
      if (COUNTRY_CURRENCY_MAP.some((c) => c.countryCode === region)) {
        return region;
      }
    }
  }
  return defaultCountry;
}

export async function fetchLiveExchangeRates(baseCurrency = 'USD'): Promise<Record<string, number>> {
  try {
    const res = await fetch(`/api/exchange-rates?base=${encodeURIComponent(baseCurrency)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) return data.rates as Record<string, number>;
    }
  } catch {
    // Try direct public endpoint fallback
  }
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) return data.rates as Record<string, number>;
    }
  } catch {
    // Use static USD fallback
  }
  return FALLBACK_RATES_FROM_USD;
}
