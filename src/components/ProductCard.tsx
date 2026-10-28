import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { useStore } from '../context/useStore';
import { Product } from '../types';
import {
  applyRegionalPricing,
  applySaleDiscount,
  calculateShippingFeeBase,
  getActiveSaleInfo,
  getLowestProductPriceBase,
} from '../utils/pricing';
import { ResilientImage } from './ResilientImage';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    favourites,
    recentlyViewed,
    toggleFavourite,
    formatPrice,
    sales,
    countryCode,
    shippingProfiles,
    settings,
  } = useStore();

  const isFav = favourites.includes(product.id);
  const isViewed = recentlyViewed.includes(product.id);

  const saleInfo = getActiveSaleInfo(product, sales, countryCode);
  const { lowestOriginBase: rawOriginUsd, hasMultipleSizes } = getLowestProductPriceBase(product);
  const lowestOriginBase = applyRegionalPricing(rawOriginUsd, countryCode, settings);
  const lowestFinalBase = applySaleDiscount(lowestOriginBase, saleInfo.percent);
  const isIndiaDomestic =
    countryCode === 'IN' && (settings.indiaRegionalPricingEnabled ?? true);

  const shipProfile = shippingProfiles.find((s) => s.id === product.shippingProfileId);
  const shipFee = calculateShippingFeeBase(
    shipProfile,
    product.freeShipping,
    countryCode,
    lowestFinalBase
  );

  const primaryImg = product.images[0]?.url || '';
  const secondaryImg = product.images[1]?.url || primaryImg;

  return (
    <article className="group flex flex-col">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#EFECE6] dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28]">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <ResilientImage
            src={primaryImg}
            alt={product.images[0]?.alt || product.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
          {secondaryImg !== primaryImg && (
            <ResilientImage
              src={secondaryImg}
              alt={product.images[1]?.alt || product.title}
              className="hidden md:block absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          )}
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavourite(product.id);
          }}
          aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
          className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 dark:bg-[#1C1B19]/95 shadow-sm flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 ${
              isFav ? 'fill-[#D62828] text-[#D62828]' : 'text-[#1A1918] dark:text-[#F4F1EA]'
            }`}
          />
        </button>
      </div>

      {/* Unboxed quiet metadata line per Zero-Pill Discipline */}
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#5F5B55] dark:text-[#A6A198] truncate">
        {saleInfo.percent > 0 ? (
          <span className="font-semibold text-[#2F6B2F] dark:text-[#5ECF5E]">On sale</span>
        ) : product.isBestseller ? (
          <span className="font-semibold text-[#1A1918] dark:text-[#F4F1EA]">Bestseller</span>
        ) : (
          <span>Made to order</span>
        )}
        {isIndiaDomestic && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#2F6B2F] dark:text-[#5ECF5E]">
              India -{settings.indiaRegionalDiscountPercent ?? 30}%
            </span>
          </>
        )}
        {isViewed && (
          <>
            <span aria-hidden="true">·</span>
            <span>Viewed</span>
          </>
        )}
      </div>

      <Link
        to={`/product/${product.slug}`}
        className="mt-0.5 text-sm font-semibold text-[#1A1918] dark:text-[#F4F1EA] truncate hover:underline"
      >
        {product.title}
      </Link>

      {/* Rating Row */}
      <div className="mt-1 flex items-center gap-1 text-xs text-[#5F5B55] dark:text-[#A6A198] tabular-nums">
        <span className="font-semibold text-[#1A1918] dark:text-[#F4F1EA]">
          {product.ratingAvg.toFixed(1)}
        </span>
        <Star className="w-3.5 h-3.5 fill-[#1A1918] text-[#1A1918] dark:fill-[#F4F1EA] dark:text-[#F4F1EA]" />
        <span>({product.ratingCount})</span>
      </div>

      {/* Etsy-style Price Block */}
      <div className="mt-1 flex flex-wrap items-baseline gap-1.5 tabular-nums">
        <span
          className={`text-base font-bold ${
            saleInfo.percent > 0
              ? 'text-[#2F6B2F] dark:text-[#5ECF5E]'
              : 'text-[#1A1918] dark:text-[#F4F1EA]'
          }`}
        >
          {formatPrice(lowestFinalBase)}
          {hasMultipleSizes ? '+' : ''}
        </span>
        {saleInfo.percent > 0 && (
          <>
            <span className="text-xs line-through text-[#5F5B55] dark:text-[#A6A198]">
              {formatPrice(lowestOriginBase)}
            </span>
            <span className="text-xs font-medium text-[#2F6B2F] dark:text-[#5ECF5E]">
              ({saleInfo.percent}% off)
            </span>
          </>
        )}
      </div>

      {shipFee === 0 && (
        <div className="mt-0.5 text-xs font-medium text-[#2F6B2F] dark:text-[#5ECF5E]">
          Free shipping
        </div>
      )}
    </article>
  );
};
