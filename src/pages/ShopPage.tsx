import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/useStore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  applyRegionalPricing,
  applySaleDiscount,
  calculateShippingFeeBase,
  getActiveSaleInfo,
  getLowestProductPriceBase,
} from '../utils/pricing';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(16);

  const {
    products,
    categories,
    sections,
    sales,
    countryCode,
    shippingProfiles,
    formatPrice,
    settings,
  } = useStore();

  const q = searchParams.get('q') || '';
  const selectedCat = searchParams.get('category') || 'all';
  const selectedSection = searchParams.get('section') || 'all';
  const onlySale = searchParams.get('sale') === 'true';
  const onlyFreeShip = searchParams.get('freeShipping') === 'true';
  const onlyCustom = searchParams.get('custom') === 'true';
  const sortBy = searchParams.get('sort') || 'relevant';
  const maxPriceBase = Number(searchParams.get('maxPrice') || '500');

  useDocumentMeta({
    title: `Shop Handmade Tufted Rugs | ${settings.storeName}`,
    description:
      'Browse handmade made-to-order tattoo flash, tiger, crawling panther, kewpie devil, and anime tufted rugs.',
  });

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'all' || val === 'false') {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next);
  };

  const filteredProducts = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    return active
      .filter((p) => {
        if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;
        if (selectedSection !== 'all' && p.sectionId !== selectedSection) return false;

        const saleInfo = getActiveSaleInfo(p, sales, countryCode);
        if (onlySale && saleInfo.percent <= 0) return false;

        const { lowestOriginBase } = getLowestProductPriceBase(p);
        const lowestFinal = applySaleDiscount(lowestOriginBase, saleInfo.percent);
        if (lowestFinal > maxPriceBase) return false;

        if (onlyCustom && !p.allowCustomSize) return false;

        if (onlyFreeShip) {
          const sp = shippingProfiles.find((s) => s.id === p.shippingProfileId);
          const fee = calculateShippingFeeBase(sp, p.freeShipping, countryCode, lowestFinal);
          if (fee > 0) return false;
        }

        if (q.trim()) {
          const needle = q.trim().toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(needle);
          const matchTag = p.tags.some((t) => t.toLowerCase().includes(needle));
          const matchDesc = p.description.toLowerCase().includes(needle);
          if (!matchTitle && !matchTag && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = applySaleDiscount(
          getLowestProductPriceBase(a).lowestOriginBase,
          getActiveSaleInfo(a, sales, countryCode).percent
        );
        const priceB = applySaleDiscount(
          getLowestProductPriceBase(b).lowestOriginBase,
          getActiveSaleInfo(b, sales, countryCode).percent
        );
        if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
        if (sortBy === 'price_asc') return priceA - priceB;
        if (sortBy === 'price_desc') return priceB - priceA;
        if (sortBy === 'top_rated') return b.ratingAvg - a.ratingAvg;
        if (sortBy === 'bestselling') return b.counters.orders - a.counters.orders;
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.counters.orders - a.counters.orders;
      });
  }, [
    products,
    selectedCat,
    selectedSection,
    onlySale,
    onlyFreeShip,
    onlyCustom,
    maxPriceBase,
    q,
    sortBy,
    sales,
    countryCode,
    shippingProfiles,
  ]);

  const FilterControls = (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="font-bold text-sm mb-2.5">Category</h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParam('category', 'all')}
            className={`block w-full text-left py-1 cursor-pointer ${
              selectedCat === 'all' ? 'font-bold underline' : 'text-[#5F5B55] dark:text-[#A6A198]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParam('category', cat.id)}
              className={`block w-full text-left py-1 cursor-pointer ${
                selectedCat === cat.id ? 'font-bold underline' : 'text-[#5F5B55] dark:text-[#A6A198]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2.5">Shop Sections</h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => updateParam('section', 'all')}
            className={`block w-full text-left py-1 cursor-pointer ${
              selectedSection === 'all' ? 'font-bold underline' : 'text-[#5F5B55] dark:text-[#A6A198]'
            }`}
          >
            All Sections
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => updateParam('section', sec.id)}
              className={`block w-full text-left py-1 cursor-pointer ${
                selectedSection === sec.id ? 'font-bold underline' : 'text-[#5F5B55] dark:text-[#A6A198]'
              }`}
            >
              {sec.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm">Max Starting Price</h3>
          <span className="font-mono-num font-semibold">
            {formatPrice(applyRegionalPricing(maxPriceBase, countryCode, settings))}
          </span>
        </div>
        <input
          type="range"
          min={30}
          max={500}
          step={5}
          value={maxPriceBase}
          onChange={(e) => updateParam('maxPrice', e.target.value)}
          className="w-full accent-[#111111]"
        />
      </div>

      <div className="space-y-2.5 pt-2 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={onlySale}
            onChange={(e) => updateParam('sale', String(e.target.checked))}
            className="rounded accent-[#111111]"
          />
          <span>On sale</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyFreeShip}
            onChange={(e) => updateParam('freeShipping', String(e.target.checked))}
            className="rounded accent-[#111111]"
          />
          <span>Free shipping to {countryCode}</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyCustom}
            onChange={(e) => updateParam('custom', String(e.target.checked))}
            className="rounded accent-[#111111]"
          />
          <span>Custom size available</span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => setSearchParams(new URLSearchParams())}
        className="w-full rounded-full border border-[#1A1918] dark:border-[#F4F1EA] py-2 font-semibold cursor-pointer"
      >
        Reset All Filters
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">
            {q ? `Results for “${q}”` : 'Handmade Tufted Rugs'}
          </h1>
          <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-1 tabular-nums">
            {filteredProducts.length} made-to-order listings · Crafted in 10–15 days
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>

          <label className="flex items-center gap-2 text-xs">
            <span className="text-[#5F5B55] hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="rounded-full border border-[#1A1918]/30 dark:border-white/25 bg-white dark:bg-[#1C1B19] px-3.5 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="relevant">Most relevant</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="top_rated">Top rated</option>
              <option value="bestselling">Best selling</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">{FilterControls}</aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-12 text-center">
              <h2 className="text-base font-bold">No rugs match those exact filters</h2>
              <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] mt-1">
                Try clearing a filter or request a custom tattoo/anime design in any size.
              </p>
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
                className="mt-5 rounded-full bg-[#111111] text-white px-6 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Show All Rugs
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
                {filteredProducts.slice(0, visibleCount).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {visibleCount < filteredProducts.length && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 12)}
                    className="rounded-full border-2 border-[#111111] dark:border-[#FAF8F5] px-8 py-2.5 text-xs font-bold cursor-pointer"
                  >
                    Load more rugs ({filteredProducts.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/55 lg:hidden">
          <div className="w-80 max-w-full bg-[#FAF8F5] dark:bg-[#1C1B19] h-full p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
              <h2 className="font-bold text-base">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {FilterControls}
          </div>
        </div>
      )}
    </div>
  );
};
