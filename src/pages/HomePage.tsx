import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Heart,
  MessageCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { InstagramReelItem } from '../types';

export const HomePage: React.FC = () => {
  const {
    settings,
    products,
    categories,
    sales,
    processingProfiles,
    countryCode,
    submitCustomRequest,
  } = useStore();

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeReel, setActiveReel] = useState<InstagramReelItem | null>(null);
  const [customForm, setCustomForm] = useState({
    name: '',
    email: '',
    phone: '',
    widthCm: 120,
    heightCm: 90,
    styleNotes: '',
    referenceImageUrl: '',
  });

  useDocumentMeta({
    title: `${settings.storeName} – Handmade Tattoo & Anime Tufted Rugs`,
    description:
      'Shop handmade made-to-order tattoo flash and anime tufted rugs by Kazumi Rugs. Custom sizes, bold carved black outlines, and worldwide shipping.',
    image: settings.heroImage,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: settings.storeName,
      description: settings.tagline,
      url: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });

  const activeProducts = products.filter((p) => p.status === 'active');
  const featuredProducts = activeProducts.slice(0, 8);
  const activeSale = sales.find((s) => s.status === 'active');
  const defaultProc =
    processingProfiles.find((p) => p.isDefault) || processingProfiles[0];

  const orderedSections = [...settings.homepageSections]
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const handleCustomPhotoRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomForm((prev) => ({ ...prev, referenceImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCustomRequest({
      customerId: 'guest',
      name: customForm.name,
      email: customForm.email,
      phone: customForm.phone,
      country: countryCode,
      widthCm: Number(customForm.widthCm),
      heightCm: Number(customForm.heightCm),
      styleNotes: customForm.styleNotes,
      referenceImageUrl: customForm.referenceImageUrl.startsWith('data:')
        ? '/assets/aistudio/6269061323719119382_e3aca78f.jpg'
        : customForm.referenceImageUrl,
    });
    setCustomForm({
      name: '',
      email: '',
      phone: '',
      widthCm: 120,
      heightCm: 90,
      styleNotes: '',
      referenceImageUrl: '',
    });
  };

  const customWhatsappUrl = `https://wa.me/${settings.whatsappNumber.replace(
    /[^0-9]/g,
    ''
  )}?text=${encodeURIComponent(
    `Hi ${settings.storeName}! I want to commission a custom rug (${customForm.widthCm}x${customForm.heightCm}cm). Idea: ${
      customForm.styleNotes || 'Tattoo flash / anime custom design'
    }`
  )}`;

  return (
    <div className="space-y-16 sm:space-y-20">
      {orderedSections.map((section) => {
        if (section.id === 'hero') {
          return (
            <section key="hero" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl bg-[#F2EDE2] dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-7 sm:p-11">
                  <div>
                    <p className="text-xs font-semibold text-[#D62828] tracking-wide">
                      Hand-Tufted Studio · Ships Worldwide from {settings.shipsFromCountry}
                    </p>
                    <h1
                      className="mt-3 font-display text-3xl sm:text-5xl leading-[1.08] text-[#111111] dark:text-[#FAF8F5]"
                      style={{ textWrap: 'balance' } as React.CSSProperties}
                    >
                      {settings.heroHeadline}
                    </h1>
                    <p className="mt-4 text-sm sm:text-base text-[#5F5B55] dark:text-[#A6A198] leading-relaxed max-w-xl">
                      {settings.heroSubheadline}
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-7 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                      >
                        {settings.heroCtaText}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <a
                        href="#custom-commission"
                        className="inline-flex items-center gap-2 rounded-full border-2 border-[#111111] dark:border-[#FAF8F5] px-6 py-3 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
                      >
                        Request Custom Rug
                      </a>
                    </div>
                  </div>

                  {/* Studio Craft Guarantees */}
                  <div className="mt-8 pt-6 border-t border-[#E6E1D8] dark:border-[#2E2C28] grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-[#1A1918] dark:text-[#F4F1EA] tabular-nums">
                        {defaultProc?.minDays ?? 10}–{defaultProc?.maxDays ?? 15} Days
                      </p>
                      <p className="text-[#5F5B55] dark:text-[#A6A198] mt-0.5">
                        Made-to-order crafting
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[#1A1918] dark:text-[#F4F1EA] tabular-nums">
                        16–22mm Pile
                      </p>
                      <p className="text-[#5F5B55] dark:text-[#A6A198] mt-0.5">
                        Hand-carved ink lines
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[#1A1918] dark:text-[#F4F1EA] tabular-nums">
                        4.9 ★ (252)
                      </p>
                      <p className="text-[#5F5B55] dark:text-[#A6A198] mt-0.5">
                        Verified collectors
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 relative rounded-3xl overflow-hidden border border-[#E6E1D8] dark:border-[#2E2C28] min-h-[340px] sm:min-h-[460px]">
                  <ResilientImage
                    src={settings.heroImage}
                    alt="Kazumi Rugs handmade traditional tattoo tiger and crimson rose tufted rug"
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-6 text-white flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#F5EBC8]">Featured Studio Piece</p>
                      <p className="text-base font-bold">
                        Traditional Tiger &amp; Crimson Rose Flash Rug
                      </p>
                    </div>
                    <Link
                      to="/product/traditional-tattoo-tiger-crimson-rose-rug"
                      className="rounded-full bg-white text-[#111111] px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0"
                    >
                      View Piece
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (section.id === 'categories') {
          return (
            <section key="categories" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl">Shop by Style</h2>
                  <p className="text-sm text-[#5F5B55] dark:text-[#A6A198] mt-1">
                    Bold black outlines and flat saturated yarn palettes across 5 studio collections
                  </p>
                </div>
                <Link to="/shop" className="text-xs font-bold hover:underline whitespace-nowrap">
                  View all ({activeProducts.length}) →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/shop?category=${encodeURIComponent(cat.id)}`}
                    className="group rounded-2xl overflow-hidden border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] flex flex-col"
                  >
                    <div className="aspect-square overflow-hidden bg-[#EFECE6]">
                      <ResilientImage
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3.5">
                      <h3 className="text-sm font-bold group-hover:underline">{cat.name}</h3>
                      <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] line-clamp-1 mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        }

        if (section.id === 'featured') {
          return (
            <section key="featured" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl">
                    Studio Collection &amp; Active Flash Drops
                  </h2>
                  <p className="text-sm text-[#5F5B55] dark:text-[#A6A198] mt-1">
                    {activeSale
                      ? `${activeSale.name}: Up to ${activeSale.percent}% off selected pieces · Every rug made to order in ${defaultProc?.minDays ?? 10}–${defaultProc?.maxDays ?? 15} days`
                      : `Every rug hand-tufted to order in ${defaultProc?.minDays ?? 10}–${defaultProc?.maxDays ?? 15} days`}
                  </p>
                </div>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1.5 text-xs font-bold hover:underline whitespace-nowrap shrink-0"
                >
                  Explore full shop <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        }

        if (section.id === 'reels') {
          const visibleReels = (settings.instagramReels || []).filter((r) => r.visible);
          if (visibleReels.length === 0) return null;
          const igHandle = settings.instagramHandle || '@inkedrug';
          const igProfileUrl = `https://www.instagram.com/${igHandle.replace(/^@/, '')}`;

          return (
            <section key="reels" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#D62828]">
                    Instagram Reels Connector · {igHandle}
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl mt-1">
                    Watch Studio Tufting &amp; Bevel Carving Reels
                  </h2>
                  <p className="text-sm text-[#5F5B55] dark:text-[#A6A198] mt-1">
                    See our handmade 16–22mm pile carving up close and shop the featured rug directly from any Reel.
                  </p>
                </div>
                <a
                  href={igProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#1A1918] dark:border-[#FAF8F5] px-4 py-2 text-xs font-bold hover:bg-[#111111] hover:text-white dark:hover:bg-[#FAF8F5] dark:hover:text-[#111111] transition-colors shrink-0"
                >
                  Follow {igHandle} on Instagram <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {visibleReels.map((reel) => (
                  <div
                    key={reel.id}
                    className="group relative aspect-[9/16] rounded-3xl overflow-hidden border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#111111] shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveReel(reel)}
                      className="w-full h-full block text-left cursor-pointer"
                    >
                      <ResilientImage
                        src={reel.thumbnailUrl}
                        alt={reel.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/25" />

                      {/* Top Play + Views */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between text-[11px] font-bold text-white">
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2.5 py-1">
                          <Play className="w-3 h-3 fill-white" /> {reel.viewsLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-1">
                          <Heart className="w-3 h-3 fill-[#D62828] text-[#D62828]" /> {reel.likesLabel}
                        </span>
                      </div>

                      {/* Center Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/90 text-[#111111] flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                          <Play className="w-5 h-5 fill-[#111111] ml-0.5" />
                        </div>
                      </div>

                      {/* Bottom Caption + Tagged Product */}
                      <div className="absolute inset-x-3 bottom-3 text-white space-y-2">
                        <p className="text-xs font-bold leading-snug line-clamp-2">{reel.title}</p>
                        {reel.productSlug && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F5EBC8] underline">
                            Shop tagged rug →
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (section.id === 'how_it_works') {
          return (
            <section key="how_it_works" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="rounded-3xl bg-[#F5EBC8] dark:bg-[#221D13] border border-[#E6DEC0] dark:border-[#3A3120] p-7 sm:p-10">
                <div className="max-w-2xl">
                  <h2 className="font-display text-2xl sm:text-3xl text-[#111111] dark:text-[#FAF8F5]">
                    How Made-to-Order Tufting Works
                  </h2>
                  <p className="text-sm text-[#4A453B] dark:text-[#C8C0B0] mt-1.5">
                    Zero mass-produced stock. Every piece is tufted specifically for your floor or wall after order confirmation.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      num: '01.',
                      title: 'Choose Flash or Custom Art',
                      desc: 'Pick from our tattoo & anime catalog or upload your own flash reference.',
                      icon: Sparkles,
                    },
                    {
                      num: '02.',
                      title: 'Select Size & Yarn Palette',
                      desc: 'Standard sizes from 60cm to 150cm, custom room dimensions, and free color swaps.',
                      icon: ShieldCheck,
                    },
                    {
                      num: '03.',
                      title: `Hand-Tufted in ${defaultProc?.minDays ?? 10}–${defaultProc?.maxDays ?? 15} Days`,
                      desc: 'Tufted, latex-cured, backed with non-slip canvas, and bevel-carved by hand.',
                      icon: Sparkles,
                    },
                    {
                      num: '04.',
                      title: 'Rolled & Delivered Worldwide',
                      desc: 'Shipped in weatherproof sleeves with live tracking and studio progress photos.',
                      icon: Truck,
                    },
                  ].map((step) => (
                    <div key={step.num} className="space-y-2">
                      <span className="font-mono-num text-xs font-bold text-[#D62828]">
                        {step.num}
                      </span>
                      <h3 className="text-base font-bold text-[#111111] dark:text-[#FAF8F5]">
                        {step.title}
                      </h3>
                      <p className="text-xs text-[#4A453B] dark:text-[#C8C0B0] leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.id === 'custom_promo') {
          return (
            <section
              key="custom_promo"
              id="custom-commission"
              className="max-w-7xl mx-auto px-4 sm:px-6"
            >
              <div className="rounded-3xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <p className="text-xs font-bold text-[#2EC4B6]">Custom Rug Studio</p>
                  <h2 className="font-display text-2xl sm:text-3xl leading-tight">
                    Commission Your Own Tattoo Flash or Anime Character Rug
                  </h2>
                  <p className="text-sm text-[#5F5B55] dark:text-[#A6A198] leading-relaxed">
                    Have a tattoo sketch, studio logo, sneaker motif, or anime panel? Send us your dimensions and idea—we reply with a mockup, yarn swatch check, and one-click quote link on WhatsApp.
                  </p>
                  <a
                    href={customWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-[#111111] px-6 py-3 text-xs font-bold hover:opacity-95 transition-opacity"
                  >
                    <MessageCircle className="w-4 h-4 fill-[#111111]" />
                    Send Artwork Directly on WhatsApp
                  </a>
                </div>

                <form onSubmit={handleCustomSubmit} className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={customForm.name}
                      onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                      placeholder="Alex Rivera"
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={customForm.email}
                      onChange={(e) => setCustomForm({ ...customForm, email: e.target.value })}
                      placeholder="alex@example.com"
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">WhatsApp / Phone</label>
                    <input
                      type="tel"
                      value={customForm.phone}
                      onChange={(e) => setCustomForm({ ...customForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Width (cm)</label>
                      <input
                        type="number"
                        min={30}
                        max={400}
                        value={customForm.widthCm}
                        onChange={(e) =>
                          setCustomForm({ ...customForm, widthCm: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2.5 text-sm font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Height (cm)</label>
                      <input
                        type="number"
                        min={30}
                        max={400}
                        value={customForm.heightCm}
                        onChange={(e) =>
                          setCustomForm({ ...customForm, heightCm: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2.5 text-sm font-mono-num"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1">
                      Design Idea, Colors &amp; Reference Upload *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={customForm.styleNotes}
                      onChange={(e) => setCustomForm({ ...customForm, styleNotes: e.target.value })}
                      placeholder="Describe your tattoo flash or anime character, outline thickness, and background shape..."
                      className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomPhotoRead}
                      className="text-xs text-[#5F5B55]"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-6 py-2.5 text-xs font-bold cursor-pointer"
                    >
                      Request Studio Quote
                    </button>
                  </div>
                </form>
              </div>
            </section>
          );
        }

        if (section.id === 'reviews_faq') {
          return (
            <section key="reviews_faq" className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-6 space-y-5">
                <h2 className="font-display text-2xl">Collector Stories</h2>
                <div className="space-y-4">
                  {settings.testimonials.map((item, idx) => (
                    <blockquote
                      key={idx}
                      className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-5"
                    >
                      <p className="text-sm leading-relaxed">“{item.quote}”</p>
                      <footer className="mt-3 text-xs text-[#5F5B55] dark:text-[#A6A198]">
                        <strong className="text-[#1A1918] dark:text-[#F4F1EA]">{item.name}</strong> ·{' '}
                        {item.location} · Purchased {item.item}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-5">
                <h2 className="font-display text-2xl">Frequently Asked Questions</h2>
                <div className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28] rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-5">
                  {settings.faqs.map((faq, idx) => {
                    const expanded = openFaq === idx;
                    return (
                      <div key={idx} className="py-4">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(expanded ? null : idx)}
                          className="w-full flex items-center justify-between text-left text-sm font-bold gap-4 cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              expanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {expanded && (
                          <p className="mt-2.5 text-xs text-[#5F5B55] dark:text-[#A6A198] leading-relaxed">
                            {faq.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* Interactive Instagram Reel Viewer Modal */}
      {activeReel && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeReel.title}
        >
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden bg-[#FAF8F5] dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] grid grid-cols-1 sm:grid-cols-12 shadow-2xl">
            <div className="sm:col-span-6 relative aspect-[9/14] sm:aspect-auto sm:min-h-[420px] bg-[#111111]">
              <ResilientImage
                src={activeReel.thumbnailUrl}
                alt={activeReel.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-full bg-black/65 text-white px-3 py-1 text-[11px] font-bold">
                {settings.instagramHandle || '@inkedrug'} · {activeReel.viewsLabel} views
              </div>
            </div>

            <div className="sm:col-span-6 p-6 flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#D62828]">
                    Studio Tufting Reel
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveReel(null)}
                    aria-label="Close Reel viewer"
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-display text-xl leading-snug">{activeReel.title}</h3>
                <p className="text-xs text-[#5F5B55] dark:text-[#A6A198] leading-relaxed">
                  {activeReel.caption}
                </p>

                {activeReel.productTitle && (
                  <div className="rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-3.5 text-xs space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#5F5B55] dark:text-[#C8C0B0]">
                      Tagged Studio Piece
                    </p>
                    <p className="font-bold text-sm">{activeReel.productTitle}</p>
                    <p className="text-[11px] text-[#5F5B55] dark:text-[#C8C0B0]">
                      Made to order in 10–15 days · Standard &amp; custom sizes
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {activeReel.productSlug && (
                  <Link
                    to={`/product/${activeReel.productSlug}`}
                    onClick={() => setActiveReel(null)}
                    className="w-full rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] py-3 px-5 text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    Shop Featured Rug <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <a
                  href={activeReel.reelUrl || 'https://www.instagram.com/reels/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-full border border-[#1A1918] dark:border-[#FAF8F5] py-2.5 px-5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  Open on Instagram <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
