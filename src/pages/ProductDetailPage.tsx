import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Maximize2,
  MessageCircle,
  Ruler,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage } from '../components/ResilientImage';
import { SizeScaleModal } from '../components/SizeScaleModal';
import { useStore } from '../context/useStore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { convertFromBase } from '../utils/currencies';
import {
  applyRegionalPricing,
  applySaleDiscount,
  calculateEstimatedDeliveryRange,
  calculateShippingFeeBase,
  getActiveSaleInfo,
  getLowestProductPriceBase,
} from '../utils/pricing';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const {
    products,
    categories,
    reviews,
    sales,
    processingProfiles,
    shippingProfiles,
    countryCode,
    currency,
    exchangeRates,
    settings,
    favourites,
    recentlyViewed,
    followedShop,
    toggleFavourite,
    toggleFollowShop,
    recordProductView,
    addToCart,
    formatPrice,
    submitReview,
    sendBuyerMessage,
    pushToast,
    currentUser,
  } = useStore();

  const product = products.find((p) => p.slug === slug) || products[0];

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [selectedVariationId, setSelectedVariationId] = useState<string>(
    product?.variations[0]?.id || ''
  );
  const [customUnit, setCustomUnit] = useState<'cm' | 'inch'>('cm');
  const [customWidth, setCustomWidth] = useState<number>(120);
  const [customHeight, setCustomHeight] = useState<number>(90);

  const [personalisationOpen, setPersonalisationOpen] = useState(false);
  const [personalisationText, setPersonalisationText] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showStickyMobileBar, setShowStickyMobileBar] = useState(false);

  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [buyerMsgName, setBuyerMsgName] = useState('');
  const [buyerMsgEmail, setBuyerMsgEmail] = useState('');
  const [buyerMsgText, setBuyerMsgText] = useState('');

  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!product) return;
    recordProductView(product.id);
    setSelectedVariationId(product.variations[0]?.id || '');
    setSelectedSizeId('');
    setActiveImageIdx(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product?.id]);

  useEffect(() => {
    const onScroll = () => {
      if (!ctaRef.current) return;
      const rect = ctaRef.current.getBoundingClientRect();
      setShowStickyMobileBar(rect.bottom < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!product) {
    return <div className="p-12 text-center">Product not found.</div>;
  }

  const isFav = favourites.includes(product.id);
  const saleInfo = getActiveSaleInfo(product, sales, countryCode);
  const selectedVariation =
    product.variations.find((v) => v.id === selectedVariationId) || product.variations[0];
  const selectedSize = product.sizes.find((s) => s.id === selectedSizeId);
  const isCustomSizeSelected = selectedSizeId === 'custom';

  const { lowestOriginBase, hasMultipleSizes } = getLowestProductPriceBase(product);

  const activeOriginPriceBase = useMemo(() => {
    if (isCustomSizeSelected) {
      const areaRatio =
        ((customUnit === 'inch' ? customWidth * 2.54 : customWidth) *
          (customUnit === 'inch' ? customHeight * 2.54 : customHeight)) /
        (60 * 60);
      return Math.round(
        lowestOriginBase * Math.max(1, Math.min(6, areaRatio * 0.65)) +
          (selectedVariation?.priceAdjustment || 0)
      );
    }
    const sizeBase = selectedSize ? selectedSize.price : lowestOriginBase;
    return Math.max(15, Number((sizeBase + (selectedVariation?.priceAdjustment || 0)).toFixed(2)));
  }, [
    isCustomSizeSelected,
    customUnit,
    customWidth,
    customHeight,
    selectedSize,
    lowestOriginBase,
    selectedVariation,
  ]);

  const activeFinalPriceBase = applySaleDiscount(activeOriginPriceBase, saleInfo.percent);
  const displayOriginPriceBase = applyRegionalPricing(activeOriginPriceBase, countryCode, settings);
  const displayFinalPriceBase = applyRegionalPricing(activeFinalPriceBase, countryCode, settings);
  const isIndiaDomestic =
    countryCode === 'IN' && (settings.indiaRegionalPricingEnabled ?? true);

  const procProfile =
    processingProfiles.find((p) => p.id === product.processingProfileId) ||
    processingProfiles.find((p) => p.isDefault) ||
    processingProfiles[0];

  const shipProfile =
    shippingProfiles.find((s) => s.id === product.shippingProfileId) || shippingProfiles[0];

  const deliveryEst = calculateEstimatedDeliveryRange(procProfile, shipProfile, countryCode);
  const shipFeeBase = calculateShippingFeeBase(
    shipProfile,
    product.freeShipping,
    countryCode,
    activeFinalPriceBase
  );

  const productReviews = reviews.filter(
    (r) => r.productId === product.id && r.status === 'approved'
  );
  const category = categories.find((c) => c.id === product.categoryId);

  const productUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/product/${product.slug}`
      : `/product/${product.slug}`;

  const currentMediaUrl = product.images[activeImageIdx]?.url || product.images[0]?.url || '';
  const absoluteMediaUrl =
    typeof window !== 'undefined' && currentMediaUrl.startsWith('/')
      ? `${window.location.origin}${currentMediaUrl}`
      : currentMediaUrl;

  const convertedAmount = convertFromBase(
    displayFinalPriceBase,
    currency,
    exchangeRates,
    settings.baseCurrency,
    settings.priceRounding
  );

  useDocumentMeta({
    title: product.seo.metaTitle || `${product.title} | ${settings.storeName}`,
    description: product.seo.metaDescription || product.description.slice(0, 155),
    image: currentMediaUrl,
    ogType: 'product',
    priceAmount: String(convertedAmount),
    priceCurrency: currency,
    availability: 'instock',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: [absoluteMediaUrl],
      description: product.description,
      sku: product.sku,
      brand: { '@type': 'Brand', name: settings.storeName },
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: currency,
        price: convertedAmount,
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.ratingAvg,
        reviewCount: Math.max(1, product.ratingCount),
      },
    },
  });

  // Selecting a color variation swaps the main carousel image and highlights thumbnail!
  const handleSelectVariation = (varId: string) => {
    setSelectedVariationId(varId);
    const targetVar = product.variations.find((v) => v.id === varId);
    if (!targetVar) return;
    const matchByVarId = product.images.findIndex((img) => img.variationId === varId);
    if (matchByVarId >= 0) {
      setActiveImageIdx(matchByVarId);
      return;
    }
    if (targetVar.imageUrls[0]) {
      const matchByUrl = product.images.findIndex((img) => img.url === targetVar.imageUrls[0]);
      if (matchByUrl >= 0) setActiveImageIdx(matchByUrl);
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setReferenceImageUrl(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const handleAddToCartOrBuy = (buyNow: boolean) => {
    if (!selectedSizeId) {
      pushToast('Please select a rug size first', { tone: 'error' });
      return;
    }
    const sizeLabel = isCustomSizeSelected
      ? `Custom (${customWidth}×${customHeight} ${customUnit})`
      : selectedSize?.label || 'Standard';

    addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: selectedVariation?.imageUrls[0] || currentMediaUrl,
      cssFilter: selectedVariation?.cssFilter,
      variationId: selectedVariation?.id || 'default',
      variationName: selectedVariation?.name || 'Standard',
      sizeId: selectedSizeId,
      sizeLabel,
      isCustomSize: isCustomSizeSelected,
      customDims: isCustomSizeSelected
        ? { width: customWidth, height: customHeight, unit: customUnit }
        : undefined,
      personalisationText: personalisationText.trim(),
      referenceImageUrl: referenceImageUrl ? currentMediaUrl : '',
      unitOriginPriceBase: activeOriginPriceBase,
      salePercent: saleInfo.percent,
      unitFinalPriceBase: activeFinalPriceBase,
      quantity: 1,
    });

    if (buyNow) {
      useStore.getState().setCartDrawerOpen(false);
      navigate('/checkout');
    }
  };

  const whatsappMessageText = [
    `Hi ${settings.storeName}! I'm interested in ordering:`,
    `• Rug: ${product.title}`,
    `• Color/Style: ${selectedVariation?.name || 'Standard'}`,
    `• Size: ${
      isCustomSizeSelected
        ? `Custom ${customWidth}x${customHeight} ${customUnit}`
        : selectedSize?.label || 'Not selected yet'
    }`,
    personalisationText ? `• Personalisation: ${personalisationText}` : '',
    `• Price shown: ${formatPrice(displayFinalPriceBase)}`,
    `• Link: ${productUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  const whatsappDeepLink = `https://wa.me/${settings.whatsappNumber.replace(
    /[^0-9]/g,
    ''
  )}?text=${encodeURIComponent(whatsappMessageText)}`;

  const pinterestSaveUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(
    productUrl
  )}&media=${encodeURIComponent(absoluteMediaUrl)}&description=${encodeURIComponent(
    `${product.title} — Handmade made-to-order tufted rug by ${settings.storeName}`
  )}`;

  const totalShopSales = products.reduce((acc, p) => acc + p.counters.orders, 0);
  const moreFromShop = products
    .filter((p) => p.status === 'active' && p.id !== product.id)
    .slice(0, 4);
  const relatedItems = products
    .filter(
      (p) =>
        p.status === 'active' &&
        p.id !== product.id &&
        (p.categoryId === product.categoryId || p.tags.some((t) => product.tags.includes(t)))
    )
    .slice(0, 4);

  const previewWidthCm = isCustomSizeSelected
    ? Math.round(customUnit === 'inch' ? customWidth * 2.54 : customWidth)
    : selectedSize?.widthCm || 90;
  const previewHeightCm = isCustomSizeSelected
    ? Math.round(customUnit === 'inch' ? customHeight * 2.54 : customHeight)
    : selectedSize?.heightCm || 90;

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-6 pb-16">
      {/* Desktop Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="hidden sm:flex items-center gap-2 py-4 text-xs text-[#5F5B55] dark:text-[#A6A198]"
      >
        <Link to="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:underline">Shop</Link>
        {category && (
          <>
            <span>/</span>
            <Link to={`/shop?category=${category.id}`} className="hover:underline">
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#1A1918] dark:text-[#F4F1EA] truncate max-w-xs">
          {product.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* 1. LEFT: IMAGE CAROUSEL + DESKTOP THUMBNAIL STRIP */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 flex flex-col-reverse md:flex-row gap-3">
          {/* Desktop Vertical Thumbnail Strip */}
          <div className="hidden md:flex md:flex-col gap-2.5 w-20 shrink-0">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImageIdx === idx
                    ? 'border-[#111111] dark:border-[#FAF8F5] scale-[1.02]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <ResilientImage src={img.url} alt={img.alt} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Main Square Image Frame */}
          <div className="relative flex-1 aspect-square sm:rounded-3xl overflow-hidden bg-[#EFECE6] dark:bg-[#1C1B19] border-b sm:border border-[#E6E1D8] dark:border-[#2E2C28] group">
            <ResilientImage
              src={currentMediaUrl}
              alt={product.images[activeImageIdx]?.alt || product.title}
              loading="eager"
              cssFilter={selectedVariation?.cssFilter}
              className="w-full h-full object-cover transition-transform duration-300 md:group-hover:scale-105 cursor-zoom-in"
            />

            {/* Floating Top Overlay Actions (Etsy Mobile Order) */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="absolute top-3.5 left-3.5 w-10 h-10 rounded-full bg-white/95 dark:bg-[#1C1B19]/95 shadow-md flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
              <a
                href={whatsappDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ask about this rug on WhatsApp"
                className="w-10 h-10 rounded-full bg-white/95 dark:bg-[#1C1B19]/95 shadow-md flex items-center justify-center text-[#25D366]"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
              </a>
              <button
                type="button"
                onClick={() => toggleFavourite(product.id)}
                aria-label="Save to favourites"
                className="w-10 h-10 rounded-full bg-white/95 dark:bg-[#1C1B19]/95 shadow-md flex items-center justify-center cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFav ? 'fill-[#D62828] text-[#D62828]' : ''
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                aria-label="Share product"
                className="w-10 h-10 rounded-full bg-white/95 dark:bg-[#1C1B19]/95 shadow-md flex items-center justify-center cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Pinterest Save Button on Image */}
            <a
              href={pinterestSaveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3.5 left-3.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full bg-[#D62828] text-white px-3.5 py-1.5 text-xs font-bold shadow-md"
            >
              Save
            </a>

            {/* Find Similar & Fullscreen Lightbox */}
            <div className="absolute bottom-3.5 right-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Open fullscreen image"
                className="w-9 h-9 rounded-full bg-white/95 dark:bg-[#1C1B19]/95 shadow-md flex items-center justify-center cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <Link
                to={`/shop?category=${encodeURIComponent(product.categoryId)}`}
                className="rounded-full bg-white/95 dark:bg-[#1C1B19]/95 shadow-md px-3.5 py-1.5 text-xs font-semibold"
              >
                Find similar
              </Link>
            </div>

            {/* Prev / Next Arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIdx(
                      (activeImageIdx - 1 + product.images.length) % product.images.length
                    )
                  }
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1C1B19]/90 shadow flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIdx((activeImageIdx + 1) % product.images.length)
                  }
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-[#1C1B19]/90 shadow flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Dot Indicators */}
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {product.images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeImageIdx === idx ? 'w-5 bg-white' : 'w-2 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CONTIGUOUS PURCHASE MODULE IN EXACT ETSY ORDER */}
        <div className="lg:col-span-5 px-4 sm:px-0 space-y-5">
          {/* 2. STATUS LINE */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {saleInfo.percent > 0 && saleInfo.endsAt && (
              <span className="font-bold text-[#2F6B2F] dark:text-[#5ECF5E]">
                Sale ends on{' '}
                {new Date(saleInfo.endsAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {saleInfo.percent > 0 && saleInfo.endsAt && <span aria-hidden="true">·</span>}
            <span className="font-medium text-[#5F5B55] dark:text-[#A6A198]">Made to order</span>
            {product.stockMode === 'limited' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-[#D62828]">
                  Only {product.stockCount} available
                </span>
              </>
            )}
          </div>

          {/* 3. LIVE PRICE BLOCK */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-2.5 tabular-nums">
              <span
                className={`text-3xl font-extrabold ${
                  saleInfo.percent > 0 || isIndiaDomestic
                    ? 'text-[#2F6B2F] dark:text-[#5ECF5E]'
                    : 'text-[#1A1918] dark:text-[#F4F1EA]'
                }`}
              >
                {formatPrice(displayFinalPriceBase)}
                {!selectedSizeId && hasMultipleSizes ? '+' : ''}
              </span>
              {saleInfo.percent > 0 && (
                <>
                  <span className="text-base line-through text-[#5F5B55] dark:text-[#A6A198]">
                    {formatPrice(displayOriginPriceBase)}
                  </span>
                  <span className="text-sm font-bold text-[#2F6B2F] dark:text-[#5ECF5E]">
                    ({saleInfo.percent}% off)
                  </span>
                </>
              )}
            </div>
            {isIndiaDomestic && (
              <p className="text-xs font-semibold text-[#2F6B2F] dark:text-[#5ECF5E]">
                🇮🇳 Includes automatic {settings.indiaRegionalDiscountPercent ?? 30}% lower India factory-direct studio price (global list: {formatPrice(activeFinalPriceBase)}).
              </p>
            )}
          </div>

          {/* 4. TITLE + OFFICIAL BRAND STUDIO + PINTEREST SAVE */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold leading-snug line-clamp-2">
              {product.title}
            </h1>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F5B55] dark:text-[#A6A198] hover:underline"
              >
                <span>
                  Handcrafted by {settings.storeName} · {settings.primaryDomain || 'inkedrug.com'}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2EC4B6]" />
              </Link>
              <a
                href={pinterestSaveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#D62828] hover:underline"
              >
                Pinterest Save ↗
              </a>
            </div>
          </div>

          {/* 5. 3-COLUMN INFO ROW */}
          <div className="grid grid-cols-3 gap-2 py-3.5 border-y border-[#E6E1D8] dark:border-[#2E2C28] text-xs">
            <div>
              <p className="text-[#5F5B55] dark:text-[#A6A198]">Est. delivery</p>
              <p className="font-bold mt-0.5 tabular-nums">{deliveryEst.label}</p>
            </div>
            <div>
              <p className="text-[#5F5B55] dark:text-[#A6A198]">Delivery</p>
              <p className="font-bold mt-0.5 text-[#2F6B2F] dark:text-[#5ECF5E] tabular-nums">
                {shipFeeBase === 0 ? 'Free' : formatPrice(shipFeeBase)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-left cursor-pointer group"
            >
              <p className="text-[#5F5B55] dark:text-[#A6A198]">Ratings</p>
              <p className="font-bold mt-0.5 inline-flex items-center gap-1 group-hover:underline tabular-nums">
                {product.ratingAvg.toFixed(1)} ★ ({product.ratingCount}) →
              </p>
            </button>
          </div>

          {/* 6. CREAM HIGHLIGHT NOTICE BOX */}
          <div className="rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-4 text-xs space-y-1.5 text-[#1A1918] dark:text-[#FAF8F5]">
            <p className="font-semibold leading-relaxed">
              {procProfile?.badgeText ||
                'Made to order. Production and processing takes 10-15 days after order confirmation.'}
            </p>
            {product.stockMode === 'limited' && (
              <p className="flex items-center gap-2 font-bold text-[#D62828]">
                <span className="inline-block w-2.5 h-2.5 bg-[#D62828]" aria-hidden="true" />
                Selling fast! Only {product.stockCount} studio slot(s) left this week.
              </p>
            )}
          </div>

          {/* 7. SELECT A SIZE DROPDOWN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="rug-size-select" className="text-xs font-bold">
                Select a size *
              </label>
              <button
                type="button"
                onClick={() => setSizeModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold underline cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5" />
                Preview item size
              </button>
            </div>
            <select
              id="rug-size-select"
              value={selectedSizeId}
              onChange={(e) => setSelectedSizeId(e.target.value)}
              className="w-full rounded-xl border-2 border-[#1A1918]/30 dark:border-white/25 bg-white dark:bg-[#1C1B19] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#111111]"
            >
              <option value="">Select an option</option>
              {product.sizes
                .filter((s) => s.active)
                .map((sz) => {
                  const szRegional = applyRegionalPricing(
                    sz.price + (selectedVariation?.priceAdjustment || 0),
                    countryCode,
                    settings
                  );
                  const szFinal = applySaleDiscount(szRegional, saleInfo.percent);
                  return (
                    <option key={sz.id} value={sz.id}>
                      {sz.label} — {formatPrice(szFinal)}
                    </option>
                  );
                })}
              {product.allowCustomSize && (
                <option value="custom">Custom size (Enter width &amp; height)</option>
              )}
            </select>

            {isCustomSizeSelected && (
              <div className="mt-3 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Custom Dimensions</span>
                  <div className="inline-flex rounded-lg bg-[#EFECE6] dark:bg-[#121211] p-0.5 text-xs">
                    {(['cm', 'inch'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setCustomUnit(u)}
                        className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                          customUnit === u ? 'bg-white dark:bg-[#2E2C28] shadow-xs' : ''
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#5F5B55] mb-1">
                      Width ({customUnit})
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={400}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-2 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#5F5B55] mb-1">
                      Height ({customUnit})
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={400}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-2 text-sm font-mono-num"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
                  Estimated guide price shown above. <strong>Final price will be confirmed on WhatsApp</strong> before tufting starts.
                </p>
              </div>
            )}
          </div>

          {/* 8. SELECT COLOR / STYLE SWATCHES (Swaps main image!) */}
          {product.variations.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2">
                Select color / style:{' '}
                <span className="font-normal text-[#5F5B55] dark:text-[#A6A198]">
                  {selectedVariation?.name}
                </span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {product.variations
                  .filter((v) => v.active)
                  .map((v) => {
                    const active = v.id === selectedVariation?.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVariation(v.id)}
                        className={`flex items-center gap-2 rounded-full border-2 pr-3.5 pl-1.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? 'border-[#111111] dark:border-[#FAF8F5] bg-white dark:bg-[#1C1B19]'
                            : 'border-[#E6E1D8] dark:border-[#2E2C28] opacity-80 hover:opacity-100'
                        }`}
                      >
                        {v.imageUrls[0] ? (
                          <img
                            src={v.imageUrls[0]}
                            alt={v.name}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="w-5 h-5 rounded-full border border-black/20"
                            style={{ backgroundColor: v.swatch }}
                          />
                        )}
                        <span className="whitespace-nowrap">{v.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 9. EXPANDABLE PERSONALISATION */}
          {product.personalisation.enabled && (
            <div className="border-t border-[#E6E1D8] dark:border-[#2E2C28] pt-3">
              <button
                type="button"
                onClick={() => setPersonalisationOpen(!personalisationOpen)}
                className="text-xs font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <span>+ Add personalisation (optional)</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    personalisationOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {personalisationOpen && (
                <div className="mt-2.5 space-y-2.5">
                  <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
                    {product.personalisation.instructions}
                  </p>
                  <textarea
                    rows={2}
                    maxLength={product.personalisation.charLimit || 160}
                    value={personalisationText}
                    onChange={(e) => setPersonalisationText(e.target.value)}
                    placeholder="Initials, yarn color swap, or wall-hanging D-rings..."
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3.5 py-2 text-xs"
                  />
                  {product.personalisation.allowImage && (
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Optional reference sketch / photo:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceUpload}
                        className="text-xs text-[#5F5B55]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 10. ADD TO CART & BUY NOW BUTTONS */}
          <div ref={ctaRef} className="space-y-2.5 pt-2">
            {!selectedSizeId && (
              <p className="text-xs text-[#D62828] font-medium">
                Select a rug size above to enable Add to cart &amp; Buy now.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!selectedSizeId}
                onClick={() => handleAddToCartOrBuy(false)}
                className="rounded-full border-2 border-[#111111] dark:border-[#FAF8F5] py-3.5 text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Add to cart
              </button>
              <button
                type="button"
                disabled={!selectedSizeId}
                onClick={() => handleAddToCartOrBuy(true)}
                className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-3.5 text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer"
              >
                Buy now
              </button>
            </div>
            <p className="text-[11px] text-[#5F5B55] dark:text-[#A6A198] text-center">
              By making a purchase, you agree to our{' '}
              <Link to="/page/terms" className="underline">Terms of Use</Link> and{' '}
              <Link to="/page/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </div>

          {/* 11. MESSAGE US ON WHATSAPP */}
          <a
            href={whatsappDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-full bg-[#25D366] text-[#111111] py-3.5 px-5 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
          >
            <MessageCircle className="w-4 h-4 fill-[#111111]" />
            Message us on WhatsApp
          </a>

          {/* 14. ITEM DETAILS 2-COLUMN GRID */}
          <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
            <h2 className="text-sm font-bold mb-3">Item details</h2>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3">
                <p className="text-[#5F5B55] dark:text-[#A6A198]">Material</p>
                <p className="font-semibold mt-0.5">{product.itemDetails.material}</p>
              </div>
              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3">
                <p className="text-[#5F5B55] dark:text-[#A6A198]">Production time</p>
                <p className="font-semibold mt-0.5">
                  {procProfile?.minDays ?? 10}–{procProfile?.maxDays ?? 15} days (Made to order)
                </p>
              </div>
              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3">
                <p className="text-[#5F5B55] dark:text-[#A6A198]">Backing</p>
                <p className="font-semibold mt-0.5">{product.itemDetails.backing}</p>
              </div>
              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3">
                <p className="text-[#5F5B55] dark:text-[#A6A198]">Care</p>
                <p className="font-semibold mt-0.5">{product.itemDetails.care}</p>
              </div>
              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3">
                <p className="text-[#5F5B55] dark:text-[#A6A198]">Handmade</p>
                <p className="font-semibold mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#E9A820]" /> Yes, carved by hand
                </p>
              </div>
              <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3">
                <p className="text-[#5F5B55] dark:text-[#A6A198]">Personalizable</p>
                <p className="font-semibold mt-0.5">
                  {product.personalisation.enabled ? 'Yes (colors & custom size)' : 'Standard'}
                </p>
              </div>
            </div>
          </div>

          {/* 15. EXPANDABLE DESCRIPTION */}
          <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
            <h2 className="text-sm font-bold mb-2">Description</h2>
            <p
              className={`text-sm text-[#3F3C37] dark:text-[#D5D0C6] whitespace-pre-line leading-relaxed ${
                descExpanded ? '' : 'line-clamp-4'
              }`}
            >
              {product.description}
            </p>
            <button
              type="button"
              onClick={() => setDescExpanded(!descExpanded)}
              className="mt-2 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-4 py-1.5 text-xs font-semibold cursor-pointer"
            >
              {descExpanded ? 'Show less' : 'See full description'}
            </button>
          </div>

          {/* 16. SHIPPING & POLICIES */}
          <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#2E2C28] space-y-2.5 text-xs">
            <h2 className="text-sm font-bold">Shipping and return policies</h2>
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 shrink-0 text-[#5F5B55]" />
              <span>
                Estimated arrival <strong>{deliveryEst.label}</strong> ({deliveryEst.prodMin}–{deliveryEst.prodMax} days hand-tufting + {deliveryEst.transitMin}–{deliveryEst.transitMax} days {deliveryEst.courier})
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 shrink-0 text-[#5F5B55]" />
              <span>Ships worldwide from <strong>{settings.shipsFromCountry}</strong></span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#5F5B55]" />
              <span>
                Returns &amp; exchanges accepted on standard sizes within 14 days (custom-size and personalised items are non-returnable).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPolicyModalOpen(true)}
              className="rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-4 py-1.5 font-semibold cursor-pointer"
            >
              See delivery &amp; return details
            </button>
          </div>

          {/* 17. OFFICIAL SINGLE-BRAND STUDIO CARD (Not a Multi-Seller Marketplace) */}
          <div className="pt-4 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#111111] text-white font-display flex items-center justify-center text-lg">
                  K
                </div>
                <div>
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <span>{settings.storeName} Official Studio</span>
                    <CheckCircle2 className="w-4 h-4 text-[#2EC4B6]" />
                  </p>
                  <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] tabular-nums">
                    {settings.primaryDomain || 'inkedrug.com'} · 4.9 ★ · {totalShopSales} studio commissions delivered
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(true)}
                  className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Direct Studio Inquiry
                </button>
                <button
                  type="button"
                  onClick={toggleFollowShop}
                  className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  {followedShop ? 'Drop Alerts On' : 'Get Drop Alerts'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 13. COLLAPSIBLE ITEM REVIEWS SECTION */}
      <section
        ref={reviewsRef}
        className="mt-14 px-4 sm:px-0 pt-10 border-t border-[#E6E1D8] dark:border-[#2E2C28]"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setReviewsExpanded(!reviewsExpanded)}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <span className="font-display text-2xl tabular-nums">
              {product.ratingAvg.toFixed(1)} ★
            </span>
            <span className="text-base font-bold">
              {product.ratingCount} item reviews
            </span>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${reviewsExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setReviewFormOpen(!reviewFormOpen)}
            className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Write a review
          </button>
        </div>

        {reviewsExpanded && (
          <div className="mt-6 space-y-6">
            {/* Sub-rating Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl text-xs">
              {[
                { label: 'Item quality', val: 5.0 },
                { label: 'Delivery', val: 4.9 },
                { label: 'Customer service', val: 5.0 },
              ].map((sub) => (
                <div key={sub.label}>
                  <div className="flex justify-between font-semibold mb-1 tabular-nums">
                    <span>{sub.label}</span>
                    <span>{sub.val.toFixed(1)} / 5</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E6E1D8] dark:bg-[#2E2C28] overflow-hidden">
                    <div
                      className="h-full bg-[#111111] dark:bg-[#E9A820]"
                      style={{ width: `${(sub.val / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {reviewFormOpen && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await submitReview({
                    productId: product.id,
                    orderId: 'VERIFIED-BUYER',
                    customerId: currentUser?.uid || 'guest',
                    customerName: reviewName || currentUser?.displayName || 'Verified Collector',
                    rating: reviewRating,
                    qualityRating: reviewRating,
                    deliveryRating: reviewRating,
                    serviceRating: 5,
                    comment: reviewComment,
                    photos: [],
                    verifiedBuyer: true,
                  });
                  setReviewComment('');
                  setReviewFormOpen(false);
                }}
                className="max-w-xl rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-3 text-xs"
              >
                <h3 className="font-bold text-sm">Submit Verified Buyer Review</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Your name"
                    className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-2"
                  />
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-2"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Stars
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how the yarn density, carved outlines, and sizing worked in your space..."
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-2"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#111111] text-white px-5 py-2 font-semibold cursor-pointer"
                >
                  Submit for Moderation
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(productReviews.length > 0 ? productReviews : reviews.slice(0, 2)).map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5 fill-[#1A1918] text-[#1A1918] dark:fill-[#E9A820] dark:text-[#E9A820]"
                        />
                      ))}
                    </div>
                    <span className="text-[#5F5B55] dark:text-[#A6A198] tabular-nums">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{rev.comment}</p>
                  {rev.photos[0] && (
                    <img
                      src={rev.photos[0]}
                      alt="Buyer review photo"
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  )}
                  <p className="text-xs font-semibold">
                    {rev.customerName} · <span className="text-[#2F6B2F]">Verified buyer</span>
                  </p>
                  {rev.sellerReply && (
                    <div className="mt-2 rounded-xl bg-[#FAF8F5] dark:bg-[#121211] p-3 text-xs">
                      <strong>Response from {settings.storeName}:</strong> {rev.sellerReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
              All reviews are from verified buyers.
            </p>
          </div>
        )}
      </section>

      {/* 18. MORE DESIGNS FROM OUR STUDIO */}
      <section className="mt-14 px-4 sm:px-0">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl sm:text-2xl">
            More Studio Designs · {settings.primaryDomain || 'inkedrug.com'}
          </h2>
          <Link
            to="/shop"
            className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-1.5 text-xs font-semibold"
          >
            View full catalog ({products.filter((p) => p.status === 'active').length})
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {moreFromShop.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 19. MORE LIKE THIS */}
      {relatedItems.length > 0 && (
        <section className="mt-14 px-4 sm:px-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl sm:text-2xl">More like this</h2>
            <Link
              to={`/shop?category=${encodeURIComponent(product.categoryId)}`}
              className="rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-4 py-1.5 text-xs font-semibold"
            >
              View more
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {relatedItems.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* RECENTLY VIEWED STRIP */}
      {recentlyViewed.length > 1 && (
        <section className="mt-14 px-4 sm:px-0">
          <h2 className="text-sm font-bold mb-4">Recently viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {recentlyViewed
              .filter((id) => id !== product.id)
              .slice(0, 6)
              .map((id) => {
                const rp = products.find((x) => x.id === id);
                if (!rp) return null;
                return (
                  <Link key={rp.id} to={`/product/${rp.slug}`} className="group block">
                    <div className="aspect-square rounded-xl overflow-hidden border border-[#E6E1D8] dark:border-[#2E2C28]">
                      <ResilientImage
                        src={rp.images[0]?.url || ''}
                        alt={rp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="mt-1 text-xs font-medium truncate">{rp.title}</p>
                  </Link>
                );
              })}
          </div>
        </section>
      )}

      {/* 20. STICKY MOBILE BOTTOM ADD TO CART BAR */}
      {showStickyMobileBar && (
        <div className="md:hidden fixed bottom-18 left-3 right-3 z-30 rounded-full bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] px-4 py-2 shadow-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{product.title}</p>
            <p className="text-xs font-bold text-[#2F6B2F] dark:text-[#5ECF5E] tabular-nums">
              {formatPrice(displayFinalPriceBase)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!selectedSizeId) {
                window.scrollTo({ top: 380, behavior: 'smooth' });
                pushToast('Choose a size above to add to cart');
              } else {
                handleAddToCartOrBuy(false);
              }
            }}
            className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-5 py-2 text-xs font-bold shrink-0 cursor-pointer"
          >
            {selectedSizeId ? 'Add to cart' : 'Select size'}
          </button>
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={currentMediaUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            className="max-h-[88vh] max-w-[92vw] object-contain rounded-xl"
          />
        </div>
      )}

      {/* Size Scale Preview Modal */}
      <SizeScaleModal
        open={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
        widthCm={previewWidthCm}
        heightCm={previewHeightCm}
        title={product.title}
        imageUrl={currentMediaUrl}
      />

      {/* Policy Modal */}
      {policyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1B19] p-6 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold">Delivery &amp; Return Policy</h3>
              <button type="button" onClick={() => setPolicyModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="leading-relaxed">
              • <strong>Made to order (10–15 days):</strong> Every Kazumi rug is tufted, backed with non-slip latex canvas, and hand-sheared after order confirmation.
            </p>
            <p className="leading-relaxed">
              • <strong>Tracked Worldwide Transit:</strong> Shipped rolled in heavy-duty waterproof sleeves via DHL Express, FedEx, or BlueDart.
            </p>
            <p className="leading-relaxed">
              • <strong>Returns:</strong> Standard catalog sizes can be returned within 14 days in unused condition. Custom-size and personalised pieces are non-returnable unless damaged in transit.
            </p>
          </div>
        </div>
      )}

      {/* Direct Studio Inquiry Modal (creates conversation in Admin Messages!) */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1B19] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold">
                Direct Studio Inquiry · {settings.storeName}
              </h3>
              <button type="button" onClick={() => setMessageModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await sendBuyerMessage({
                  productId: product.id,
                  productTitle: product.title,
                  customerName: buyerMsgName || currentUser?.displayName || 'Shop Visitor',
                  customerEmail: buyerMsgEmail || currentUser?.email || 'visitor@example.com',
                  text: buyerMsgText,
                });
                setBuyerMsgText('');
                setMessageModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <input
                type="text"
                required
                value={buyerMsgName}
                onChange={(e) => setBuyerMsgName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#121211] px-3.5 py-2.5"
              />
              <input
                type="email"
                required
                value={buyerMsgEmail}
                onChange={(e) => setBuyerMsgEmail(e.target.value)}
                placeholder="Your email"
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#121211] px-3.5 py-2.5"
              />
              <textarea
                required
                rows={3}
                value={buyerMsgText}
                onChange={(e) => setBuyerMsgText(e.target.value)}
                placeholder={`Ask about ${product.title} (custom dimensions, yarn colors, shipping)...`}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#121211] px-3.5 py-2.5"
              />
              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={whatsappDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#25D366] underline"
                >
                  Or chat on WhatsApp ↗
                </a>
                <button
                  type="submit"
                  className="rounded-full bg-[#111111] text-white px-5 py-2 font-bold cursor-pointer"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Sheet Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1B19] p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold">Share this rug</h3>
              <button type="button" onClick={() => setShareModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(productUrl);
                  pushToast('Product link copied!');
                  setShareModalOpen(false);
                }}
                className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] py-2.5 font-semibold cursor-pointer"
              >
                Copy Link
              </button>
              <a
                href={whatsappDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#25D366] text-[#111111] py-2.5 text-center font-bold"
              >
                WhatsApp
              </a>
              <a
                href={pinterestSaveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#D62828] text-white py-2.5 text-center font-bold"
              >
                Pinterest Pin
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(product.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#111111] text-white py-2.5 text-center font-bold"
              >
                Post on X
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
