import React, { useState } from 'react';
import { Globe, X } from 'lucide-react';
import { useStore } from '../context/useStore';
import { COUNTRY_CURRENCY_MAP, getCountryConfig } from '../utils/currencies';

export const RegionCurrencyModal: React.FC = () => {
  const {
    regionModalOpen,
    setRegionModalOpen,
    countryCode,
    currency,
    language,
    setRegionAndCurrency,
    pushToast,
  } = useStore();

  const [selectedCountry, setSelectedCountry] = useState(countryCode);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [selectedLang, setSelectedLang] = useState(language);

  if (!regionModalOpen) return null;

  const uniqueCurrencies = Array.from(
    new Set(COUNTRY_CURRENCY_MAP.map((c) => c.currency))
  );

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    const cfg = getCountryConfig(newCountry);
    setSelectedCurrency(cfg.currency);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRegionAndCurrency(selectedCountry, selectedCurrency, selectedLang);
    setRegionModalOpen(false);
    const cfg = getCountryConfig(selectedCountry);
    pushToast(`Updated to ${cfg.flag} ${cfg.countryName} · ${selectedCurrency}`, {
      tone: 'success',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="region-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#1A1918] dark:text-[#F4F1EA]" />
            <h2 id="region-modal-title" className="text-lg font-bold">
              Update your settings
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setRegionModalOpen(false)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Close region settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
            Set where you live, what language you speak, and the currency you use. Prices and shipping estimates update instantly across the store.
          </p>

          <div>
            <label htmlFor="region-select" className="block text-xs font-semibold mb-1.5">
              Region / Delivery Country
            </label>
            <select
              id="region-select"
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full rounded-xl border border-[#1A1918]/25 dark:border-[#F4F1EA]/25 bg-white dark:bg-[#121211] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]"
            >
              {COUNTRY_CURRENCY_MAP.map((c) => (
                <option key={c.countryCode} value={c.countryCode}>
                  {c.flag} {c.countryName} ({c.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language-select" className="block text-xs font-semibold mb-1.5">
              Language
            </label>
            <select
              id="language-select"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="w-full rounded-xl border border-[#1A1918]/25 dark:border-[#F4F1EA]/25 bg-white dark:bg-[#121211] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]"
            >
              <option value="en">English (Global)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          <div>
            <label htmlFor="currency-select" className="block text-xs font-semibold mb-1.5">
              Currency ({uniqueCurrencies.length} supported)
            </label>
            <select
              id="currency-select"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full rounded-xl border border-[#1A1918]/25 dark:border-[#F4F1EA]/25 bg-white dark:bg-[#121211] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]"
            >
              {uniqueCurrencies.map((curr) => {
                const sample = COUNTRY_CURRENCY_MAP.find((c) => c.currency === curr);
                return (
                  <option key={curr} value={curr}>
                    {curr} — {sample?.countryName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setRegionModalOpen(false)}
              className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-5 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#111111] dark:bg-[#F4F1EA] text-white dark:text-[#111111] px-6 py-2 text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
