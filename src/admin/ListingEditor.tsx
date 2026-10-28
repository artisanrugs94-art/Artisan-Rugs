import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import {
  ListingStatus,
  MAX_TAGS_COUNT,
  MAX_TITLE_LENGTH,
  Product,
  ProductCombination,
  ProductSize,
  ProductVariation,
} from '../types';
import { formatMoney } from '../utils/currencies';
import { computeListingQualityScore } from '../utils/pricing';

const STUDIO_LIBRARY_PHOTOS = [
  { label: 'Tiger Flash Living Room', url: '/assets/aistudio/6269061323719119382_e3aca78f.jpg' },
  { label: 'Tiger & Rose Tattoo Flash', url: '/assets/aistudio/6269061323719119381_ec21f307.jpg' },
  { label: 'Crawling Black Panther', url: '/assets/aistudio/6269061323719119378_8607c443.jpg' },
  { label: 'Kewpie Devil Horns', url: '/assets/aistudio/6269061323719119379_35fc11e0.jpg' },
  { label: 'Komainu Kewpie Mask', url: '/assets/aistudio/6269061323719119380_f70024df.jpg' },
  { label: 'Grim Reaper & Rose', url: '/rugs/grim-reaper-rose.svg' },
  { label: 'Deaths-Head Skull Moth', url: '/rugs/deaths-head-moth.svg' },
  { label: 'Akatsuki Cloud & Skeleton', url: '/rugs/anime-cloud-skeleton.svg' },
];

function createEmptyListing(): Product {
  const now = new Date().toISOString();
  const id = `prod-${Date.now()}`;
  return {
    id,
    title: '',
    slug: `kazumi-tufted-rug-${Date.now().toString().slice(-5)}`,
    description:
      'Hand-tufted made-to-order statement rug crafted with heavyweight 100% acrylic yarn, hand-carved bevels, and non-slip cotton canvas backing.\n\n• Made to order: 10–15 days studio production after order confirmation\n• Bold black tattoo-flash outlines & vibrant colorfast yarn',
    categoryId: 'cat-tattoo',
    sectionId: 'sec-flash',
    tags: ['tufted rug', 'tattoo rug', 'handmade rug', 'anime rug', 'kazumi rugs'],
    materials: ['100% Heavyweight Acrylic Yarn', 'Primary Tufting Cloth', 'Non-Slip Cotton Canvas'],
    images: [
      {
        url: '/assets/aistudio/6269061323719119381_ec21f307.jpg',
        alt: 'Kazumi Rugs handmade tufted rug',
      },
    ],
    videoUrl: '',
    basePrice: 79,
    comparePrice: 0,
    sku: `KZM-${Date.now().toString().slice(-4)}`,
    sizes: [
      { id: 'sz-60', label: '60×60 cm (2×2 ft)', widthCm: 60, heightCm: 60, price: 79, active: true },
      { id: 'sz-90', label: '90×90 cm (3×3 ft)', widthCm: 90, heightCm: 90, price: 115, active: true },
      { id: 'sz-120', label: '120×120 cm (4×4 ft)', widthCm: 120, heightCm: 120, price: 155, active: true },
      { id: 'sz-150', label: '150×150 cm (5×5 ft)', widthCm: 150, heightCm: 150, price: 199, active: true },
    ],
    variations: [
      {
        id: 'var-classic',
        name: 'Classic Flash Red',
        swatch: '#D62828',
        imageUrls: ['/assets/aistudio/6269061323719119381_ec21f307.jpg'],
        priceAdjustment: 0,
        stock: 99,
        sku: 'VAR-RED',
        active: true,
      },
      {
        id: 'var-gold',
        name: 'Amber Tiger Gold',
        swatch: '#E9A820',
        imageUrls: ['/assets/aistudio/6269061323719119382_e3aca78f.jpg'],
        priceAdjustment: 8,
        stock: 99,
        sku: 'VAR-GLD',
        active: true,
      },
      {
        id: 'var-panther',
        name: 'Obsidian Panther Black',
        swatch: '#111111',
        imageUrls: ['/assets/aistudio/6269061323719119378_8607c443.jpg'],
        priceAdjustment: 12,
        stock: 99,
        sku: 'VAR-BLK',
        active: true,
      },
    ],
    combinations: [],
    allowCustomSize: true,
    customSizePriceOnRequest: true,
    personalisation: {
      enabled: true,
      instructions: 'Add custom palette swaps, initials, or banner lettering.',
      required: false,
      charLimit: 150,
      allowImage: true,
    },
    stockMode: 'made_to_order',
    stockCount: 25,
    salePercent: 0,
    saleEndAt: '',
    processingProfileId: 'proc-standard-10-15',
    shippingProfileId: 'ship-worldwide-free',
    freeShipping: true,
    itemDetails: {
      material: '100% Heavyweight Acrylic Yarn',
      personalizable: true,
      handmade: true,
      backing: 'Non-slip cotton canvas',
      care: 'Vacuum gently; spot clean with mild soap',
      pileHeightMm: 16,
    },
    attributes: {
      primaryColor: 'Black',
      secondaryColor: 'Crimson',
      style: 'Tattoo Flash & Anime',
      room: 'Living Room / Studio',
      occasion: 'Housewarming / Collector Gift',
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
    },
    pinterest: {
      pinTitle: '',
      pinDescription: '',
      board: 'Tattoo Flash & Anime Tufted Rugs',
    },
    featured: false,
    isBestseller: false,
    ratingAvg: 5,
    ratingCount: 0,
    status: 'active',
    scheduledAt: '',
    qualityScore: 85,
    counters: { views: 0, visits: 0, favourites: 0, orders: 0, revenue: 0 },
    createdAt: now,
    updatedAt: now,
  };
}

export const ListingEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    products,
    categories,
    sections,
    processingProfiles,
    shippingProfiles,
    snippets,
    settings,
    exchangeRates,
    upsertProduct,
    pushToast,
  } = useStore();

  const isNew = !id || id === 'new';
  const existing = useMemo(
    () => (isNew ? null : products.find((p) => p.id === id) || null),
    [id, isNew, products]
  );

  const [draft, setDraft] = useState<Product>(() =>
    existing ? structuredClone(existing) : createEmptyListing()
  );
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [copyTagsFromId, setCopyTagsFromId] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [lastAutosaved, setLastAutosaved] = useState<string>('');

  useEffect(() => {
    if (existing) {
      setDraft(structuredClone(existing));
    }
  }, [existing]);

  // Autosave to localStorage draft every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        localStorage.setItem(`kazumi_editor_autosave_${draft.id}`, JSON.stringify(draft));
        setLastAutosaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {
        // Ignore quota
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [draft]);

  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  const qualityAudit = useMemo(() => computeListingQualityScore(draft), [draft]);

  // Auto-generate combinations matrix from Sizes × Color Variations
  const matrixCombinations = useMemo<ProductCombination[]>(() => {
    const out: ProductCombination[] = [];
    for (const sz of draft.sizes.filter((s) => s.active)) {
      for (const vr of draft.variations.filter((v) => v.active)) {
        const existingCombo = draft.combinations.find(
          (c) => c.sizeId === sz.id && c.variationId === vr.id
        );
        out.push(
          existingCombo || {
            sizeId: sz.id,
            variationId: vr.id,
            price: sz.price + vr.priceAdjustment,
            quantity: vr.stock || 99,
            sku: `${draft.sku}-${sz.widthCm}-${vr.sku || vr.name.slice(0, 3).toUpperCase()}`,
            visible: true,
          }
        );
      }
    }
    return out;
  }, [draft.sizes, draft.variations, draft.combinations, draft.sku]);

  const handleFileUploadPhotos = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .slice(0, 20 - draft.images.length)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setDraft((prev) => ({
              ...prev,
              images: [
                ...prev.images,
                { url: reader.result as string, alt: prev.title || file.name },
              ].slice(0, 20),
            }));
          }
        };
        reader.readAsDataURL(file);
      });
  };

  const handleSave = async (targetStatus: ListingStatus) => {
    if (!draft.title.trim()) {
      pushToast('Please enter a listing title before saving.', { tone: 'error' });
      return;
    }
    const cleanSlug =
      draft.slug.trim() ||
      draft.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 120);

    const payload: Product = {
      ...draft,
      slug: cleanSlug,
      status: targetStatus,
      basePrice: draft.sizes[0]?.price ?? draft.basePrice,
      combinations: matrixCombinations,
      seo: {
        metaTitle: draft.seo.metaTitle || `${draft.title} | ${settings.storeName}`,
        metaDescription: draft.seo.metaDescription || draft.description.slice(0, 155),
      },
      pinterest: {
        pinTitle: draft.pinterest.pinTitle || draft.title,
        pinDescription: draft.pinterest.pinDescription || draft.description.slice(0, 200),
        board: draft.pinterest.board || 'Handmade Tufted Rugs',
      },
    };

    await upsertProduct(payload);
    navigate('/admin/listings');
  };

  const stepSections = [
    { id: 'sec-about', label: '1. About this listing' },
    { id: 'sec-photos', label: '2. Photos & color links' },
    { id: 'sec-details', label: '3. Title & description' },
    { id: 'sec-attrs', label: '4. Item attributes' },
    { id: 'sec-tags', label: '5. 13 Tags & materials' },
    { id: 'sec-pricing', label: '6. Price & inventory' },
    { id: 'sec-variations', label: '7. Sizes & colors matrix' },
    { id: 'sec-personal', label: '8. Personalization' },
    { id: 'sec-shipping', label: '9. 10–15d Processing & shipping' },
    { id: 'sec-seo', label: '10. Settings, SEO & Pinterest' },
  ];

  return (
    <div className="pb-24 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/listings"
            className="p-2 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              {isNew ? 'Add a new listing' : `Edit listing · ${draft.sku}`}
            </h1>
            <p className="text-xs text-[#5F5B55]">
              Listing Quality Score: <strong>{qualityAudit.score}/100</strong>
              {lastAutosaved && ` · Autosaved ${lastAutosaved}`}
            </p>
          </div>
        </div>

        {!isNew && (
          <Link
            to={`/product/${draft.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-1.5 text-xs font-bold"
          >
            <Eye className="w-3.5 h-3.5" /> View live product page
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Sticky Left Step Navigator + Quality Checklist */}
        <aside className="xl:col-span-3 space-y-4 xl:sticky xl:top-20">
          <nav className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-3 space-y-1 text-xs">
            {stepSections.map((st) => (
              <a
                key={st.id}
                href={`#${st.id}`}
                className="block px-3 py-2 rounded-xl font-semibold hover:bg-[#FAF8F5] dark:hover:bg-[#252320]"
              >
                {st.label}
              </a>
            ))}
          </nav>

          {/* Listing Quality Checklist */}
          <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold">Publish Checklist</span>
              <span className="px-2 py-0.5 rounded-full bg-[#2F6B2F]/15 text-[#2F6B2F] font-mono-num font-bold">
                {qualityAudit.score}/100
              </span>
            </div>
            {qualityAudit.suggestions.length === 0 ? (
              <p className="text-[#2F6B2F] flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Ready for top search placement!
              </p>
            ) : (
              <ul className="space-y-1.5 text-[11px] text-[#5F5B55]">
                {qualityAudit.suggestions.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Live Card Preview */}
          <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Live Shop Card Preview
              </span>
              <button
                type="button"
                onClick={() =>
                  setPreviewDevice((d) => (d === 'mobile' ? 'desktop' : 'mobile'))
                }
                className="text-[11px] underline cursor-pointer"
              >
                {previewDevice === 'mobile' ? 'Mobile' : 'Desktop'}
              </button>
            </div>
            <div
              className={`mx-auto rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] overflow-hidden ${
                previewDevice === 'mobile' ? 'max-w-[210px]' : 'w-full'
              }`}
            >
              <div className="aspect-square bg-[#EFECE6]">
                <ResilientImage
                  src={draft.images[0]?.url}
                  alt={draft.title || 'Preview'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5 space-y-1">
                <p className="font-semibold truncate">{draft.title || 'Untitled Tufted Rug'}</p>
                <p className="font-mono-num font-bold text-[#2F6B2F]">
                  {formatBase(draft.sizes[0]?.price || draft.basePrice)}+
                </p>
                <p className="text-[10px] text-[#5F5B55]">Made to order · 10–15 days</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Center/Right 12-Step Form */}
        <div className="xl:col-span-9 space-y-6 text-xs">
          {/* 1. About this listing */}
          <section
            id="sec-about"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <h2 className="text-sm font-bold">1. About this listing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#121211] p-3 border border-[#E6E1D8] dark:border-[#2E2C28]">
                <p className="text-[#5F5B55] text-[11px]">Who made it?</p>
                <p className="font-bold mt-0.5">I did ({settings.storeName} Studio)</p>
              </div>
              <div className="rounded-xl bg-[#FAF8F5] dark:bg-[#121211] p-3 border border-[#E6E1D8] dark:border-[#2E2C28]">
                <p className="text-[#5F5B55] text-[11px]">What is it?</p>
                <p className="font-bold mt-0.5">A finished handmade tufted rug</p>
              </div>
              <div className="rounded-xl bg-[#F5EBC8] dark:bg-[#2B2416] p-3 border border-[#E9A820]/40">
                <p className="text-[#5F5B55] text-[11px]">When was it made?</p>
                <p className="font-bold mt-0.5">Made to order (10–15 days)</p>
              </div>
            </div>
          </section>

          {/* 2. Photos & Variation Image Linking */}
          <section
            id="sec-photos"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">
                  2. Photos &amp; Color Variation Image Linking ({draft.images.length}/20)
                </h2>
                <p className="text-[#5F5B55]">
                  First photo is cover. Link any photo to a Color Variation so clicking that color on the storefront swaps the main carousel image!
                </p>
              </div>
              <label className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] text-white px-4 py-2 font-bold cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" /> Upload Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUploadPhotos(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Studio Photo Quick Picker + URL Input */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#5F5B55]">Quick-add studio photo:</span>
              {STUDIO_LIBRARY_PHOTOS.map((sp) => (
                <button
                  key={sp.url}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      images: [...prev.images, { url: sp.url, alt: sp.label }].slice(0, 20),
                    }))
                  }
                  className="px-2.5 py-1 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] hover:border-[#111111] cursor-pointer"
                >
                  + {sp.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="Or paste image URL (/assets/aistudio/... or https://...)"
                className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newPhotoUrl.trim()) return;
                  setDraft((prev) => ({
                    ...prev,
                    images: [
                      ...prev.images,
                      { url: newPhotoUrl.trim(), alt: prev.title || 'Tufted rug' },
                    ].slice(0, 20),
                  }));
                  setNewPhotoUrl('');
                }}
                className="rounded-full border border-[#111111] px-4 py-2 font-bold cursor-pointer"
              >
                Add URL
              </button>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {draft.images.map((img, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-2 space-y-2 bg-[#FAF8F5] dark:bg-[#121211]"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden">
                    <ResilientImage
                      src={img.url}
                      alt={img.alt}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#111111] text-white text-[10px] font-bold">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx),
                        }))
                      }
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-white/90 text-[#D62828] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={img.alt}
                    onChange={(e) => {
                      const next = draft.images.map((im, i) =>
                        i === idx ? { ...im, alt: e.target.value } : im
                      );
                      setDraft({ ...draft, images: next });
                    }}
                    placeholder="Alt text for SEO..."
                    className="w-full rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2 py-1 text-[11px]"
                  />
                  <select
                    value={img.variationId || ''}
                    onChange={(e) => {
                      const varId = e.target.value || undefined;
                      const nextImages = draft.images.map((im, i) =>
                        i === idx ? { ...im, variationId: varId } : im
                      );
                      const nextVars = draft.variations.map((v) =>
                        v.id === varId
                          ? { ...v, imageUrls: Array.from(new Set([img.url, ...v.imageUrls])) }
                          : v
                      );
                      setDraft({ ...draft, images: nextImages, variations: nextVars });
                    }}
                    className="w-full rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2 py-1 text-[11px]"
                  >
                    <option value="">Link to Color Variation...</option>
                    {draft.variations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Title, Category, Section & Description + Saved Snippets */}
          <section
            id="sec-details"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <h2 className="text-sm font-bold">3. Title, Category &amp; Description</h2>
            <div>
              <div className="flex justify-between mb-1">
                <label className="font-bold">Listing Title *</label>
                <span className="font-mono-num text-[#5F5B55]">
                  {draft.title.length}/{MAX_TITLE_LENGTH}
                </span>
              </div>
              <input
                type="text"
                maxLength={MAX_TITLE_LENGTH}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g., Traditional Tiger & Crimson Rose Tufted Rug | Handmade Tattoo Flash Floor Art"
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Category</label>
                <select
                  value={draft.categoryId}
                  onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Shop Section</label>
                <select
                  value={draft.sectionId}
                  onChange={(e) => setDraft({ ...draft, sectionId: e.target.value })}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="font-bold">Description</label>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5F5B55]" />
                  <span className="text-[#5F5B55]">Insert saved snippet:</span>
                  {snippets.map((sn) => (
                    <button
                      key={sn.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          description: `${prev.description}\n\n${sn.body}`,
                        }))
                      }
                      className="px-2.5 py-0.5 rounded-full bg-[#EFECE6] dark:bg-[#2E2C28] font-semibold cursor-pointer"
                    >
                      + {sn.title}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={6}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3.5 py-2.5 leading-relaxed"
              />
            </div>
          </section>

          {/* 4. Item Attributes & Craft Details */}
          <section
            id="sec-attrs"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <h2 className="text-sm font-bold">4. Craft &amp; Room Attributes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Material</label>
                <input
                  type="text"
                  value={draft.itemDetails.material}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      itemDetails: { ...draft.itemDetails, material: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Backing</label>
                <input
                  type="text"
                  value={draft.itemDetails.backing}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      itemDetails: { ...draft.itemDetails, backing: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Care Instructions</label>
                <input
                  type="text"
                  value={draft.itemDetails.care}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      itemDetails: { ...draft.itemDetails, care: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>
            </div>
          </section>

          {/* 5. 13 Search Tags & Copy Tags Tool */}
          <section
            id="sec-tags"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">
                5. Search Tags ({draft.tags.length}/{MAX_TAGS_COUNT})
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={copyTagsFromId}
                  onChange={(e) => {
                    const src = products.find((p) => p.id === e.target.value);
                    setCopyTagsFromId(e.target.value);
                    if (src) {
                      const merged = Array.from(new Set([...draft.tags, ...src.tags])).slice(0, 13);
                      setDraft({ ...draft, tags: merged });
                      pushToast(`Copied tags from "${src.title.slice(0, 26)}..."`);
                    }
                  }}
                  className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-1.5"
                >
                  <option value="">Copy tags from another listing...</option>
                  {products.slice(0, 25).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title.slice(0, 42)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (tagInput.trim() && draft.tags.length < 13) {
                      setDraft({
                        ...draft,
                        tags: Array.from(new Set([...draft.tags, tagInput.trim().toLowerCase()])),
                      });
                      setTagInput('');
                    }
                  }
                }}
                placeholder="Add search tag (press Enter)..."
                className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim() && draft.tags.length < 13) {
                    setDraft({
                      ...draft,
                      tags: Array.from(new Set([...draft.tags, tagInput.trim().toLowerCase()])),
                    });
                    setTagInput('');
                  }
                }}
                className="rounded-full bg-[#111111] text-white px-4 py-2 font-bold cursor-pointer"
              >
                Add Tag
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {draft.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFECE6] dark:bg-[#2E2C28] font-semibold"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })
                    }
                    className="text-[#5F5B55] hover:text-[#D62828] cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </section>

          {/* 6. Price, Sale & Stock Mode */}
          <section
            id="sec-pricing"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <h2 className="text-sm font-bold">6. Price &amp; Inventory Mode</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1">Starting Price ({settings.baseCurrency})</label>
                <input
                  type="number"
                  value={draft.basePrice}
                  onChange={(e) => setDraft({ ...draft, basePrice: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Master SKU</label>
                <input
                  type="text"
                  value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Inventory Mode</label>
                <select
                  value={draft.stockMode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      stockMode: e.target.value as 'made_to_order' | 'limited',
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="made_to_order">Made to order (Unlimited)</option>
                  <option value="limited">Limited slots ("Only X left")</option>
                </select>
              </div>
              {draft.stockMode === 'limited' && (
                <div>
                  <label className="block font-bold mb-1">Slots Left</label>
                  <input
                    type="number"
                    min={1}
                    value={draft.stockCount}
                    onChange={(e) => setDraft({ ...draft, stockCount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 7. Variations: Sizes + Colors (with Image Swapping) + Matrix */}
          <section
            id="sec-variations"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-5"
          >
            <h2 className="text-sm font-bold">7. Sizes &amp; Color/Style Variations</h2>

            {/* Sizes Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold">Standard Rug Sizes ({draft.sizes.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextSz: ProductSize = {
                      id: `sz-${Date.now()}`,
                      label: '180×180 cm (6×6 ft)',
                      widthCm: 180,
                      heightCm: 180,
                      price: 17999,
                      active: true,
                    };
                    setDraft({ ...draft, sizes: [...draft.sizes, nextSz] });
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#111111] px-3 py-1 font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Size
                </button>
              </div>

              {draft.sizes.map((sz, idx) => (
                <div key={sz.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={sz.label}
                    onChange={(e) => {
                      const next = draft.sizes.map((s, i) =>
                        i === idx ? { ...s, label: e.target.value } : s
                      );
                      setDraft({ ...draft, sizes: next });
                    }}
                    className="col-span-5 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-1.5"
                  />
                  <input
                    type="number"
                    placeholder="W cm"
                    value={sz.widthCm}
                    onChange={(e) => {
                      const next = draft.sizes.map((s, i) =>
                        i === idx ? { ...s, widthCm: Number(e.target.value) } : s
                      );
                      setDraft({ ...draft, sizes: next });
                    }}
                    className="col-span-2 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2 py-1.5 font-mono-num"
                  />
                  <input
                    type="number"
                    placeholder="H cm"
                    value={sz.heightCm}
                    onChange={(e) => {
                      const next = draft.sizes.map((s, i) =>
                        i === idx ? { ...s, heightCm: Number(e.target.value) } : s
                      );
                      setDraft({ ...draft, sizes: next });
                    }}
                    className="col-span-2 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2 py-1.5 font-mono-num"
                  />
                  <input
                    type="number"
                    value={sz.price}
                    onChange={(e) => {
                      const next = draft.sizes.map((s, i) =>
                        i === idx ? { ...s, price: Number(e.target.value) } : s
                      );
                      setDraft({
                        ...draft,
                        sizes: next,
                        basePrice: next[0]?.price ?? draft.basePrice,
                      });
                    }}
                    className="col-span-2 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2 py-1.5 font-mono-num"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        sizes: draft.sizes.filter((_, i) => i !== idx),
                      })
                    }
                    className="col-span-1 text-[#D62828] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <label className="inline-flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.allowCustomSize}
                  onChange={(e) => setDraft({ ...draft, allowCustomSize: e.target.checked })}
                />
                <span className="font-semibold">
                  Allow "Custom size" option with cm/inch inputs &amp; WhatsApp quote confirmation
                </span>
              </label>
            </div>

            {/* Color / Style Variations */}
            <div className="space-y-2 pt-3 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  Color / Style Variations (Selecting swaps main product image)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVar: ProductVariation = {
                      id: `var-${Date.now()}`,
                      name: `Colorway #${draft.variations.length + 1}`,
                      swatch: '#2EC4B6',
                      imageUrls: [STUDIO_LIBRARY_PHOTOS[draft.variations.length % STUDIO_LIBRARY_PHOTOS.length].url],
                      priceAdjustment: 0,
                      stock: 99,
                      sku: `VAR-${draft.variations.length + 1}`,
                      active: true,
                    };
                    setDraft({ ...draft, variations: [...draft.variations, nextVar] });
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#111111] px-3 py-1 font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Color
                </button>
              </div>

              {draft.variations.map((vr, idx) => (
                <div
                  key={vr.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#121211]"
                >
                  <input
                    type="color"
                    value={vr.swatch}
                    onChange={(e) => {
                      const next = draft.variations.map((v, i) =>
                        i === idx ? { ...v, swatch: e.target.value } : v
                      );
                      setDraft({ ...draft, variations: next });
                    }}
                    className="sm:col-span-1 w-8 h-8 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={vr.name}
                    onChange={(e) => {
                      const next = draft.variations.map((v, i) =>
                        i === idx ? { ...v, name: e.target.value } : v
                      );
                      setDraft({ ...draft, variations: next });
                    }}
                    placeholder="Color name"
                    className="sm:col-span-3 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2.5 py-1.5 font-semibold"
                  />
                  <select
                    value={vr.imageUrls[0] || ''}
                    onChange={(e) => {
                      const url = e.target.value;
                      const nextVars = draft.variations.map((v, i) =>
                        i === idx ? { ...v, imageUrls: [url] } : v
                      );
                      const hasImg = draft.images.some((im) => im.url === url);
                      const nextImages = hasImg
                        ? draft.images.map((im) =>
                            im.url === url ? { ...im, variationId: vr.id } : im
                          )
                        : [...draft.images, { url, alt: vr.name, variationId: vr.id }];
                      setDraft({ ...draft, variations: nextVars, images: nextImages });
                    }}
                    className="sm:col-span-5 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2.5 py-1.5"
                  >
                    {STUDIO_LIBRARY_PHOTOS.map((sp) => (
                      <option key={sp.url} value={sp.url}>
                        Photo: {sp.label}
                      </option>
                    ))}
                    {draft.images.map((im, i) => (
                      <option key={i} value={im.url}>
                        Uploaded Photo #{i + 1}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={vr.priceAdjustment}
                    onChange={(e) => {
                      const next = draft.variations.map((v, i) =>
                        i === idx ? { ...v, priceAdjustment: Number(e.target.value) } : v
                      );
                      setDraft({ ...draft, variations: next });
                    }}
                    title="Price adjustment (+/-)"
                    className="sm:col-span-2 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-2 py-1.5 font-mono-num"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        variations: draft.variations.filter((_, i) => i !== idx),
                      })
                    }
                    className="sm:col-span-1 text-[#D62828] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Matrix Summary */}
            <div className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-3 max-h-48 overflow-y-auto">
              <p className="font-bold mb-2">
                Auto-Generated Combination Matrix ({matrixCombinations.length} SKUs)
              </p>
              <div className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28] font-mono-num text-[11px]">
                {matrixCombinations.map((c) => {
                  const sz = draft.sizes.find((s) => s.id === c.sizeId);
                  const vr = draft.variations.find((v) => v.id === c.variationId);
                  return (
                    <div key={`${c.sizeId}-${c.variationId}`} className="py-1 flex justify-between">
                      <span>
                        {sz?.label} × {vr?.name}
                      </span>
                      <span className="font-bold">{formatBase(c.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 8. Personalization */}
          <section
            id="sec-personal"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">8. Buyer Personalization</h2>
              <input
                type="checkbox"
                checked={draft.personalisation.enabled}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    personalisation: { ...draft.personalisation, enabled: e.target.checked },
                  })
                }
              />
            </div>
            {draft.personalisation.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={draft.personalisation.instructions}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      personalisation: { ...draft.personalisation, instructions: e.target.value },
                    })
                  }
                  className="sm:col-span-2 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.personalisation.allowImage}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        personalisation: { ...draft.personalisation, allowImage: e.target.checked },
                      })
                    }
                  />
                  <span>Allow reference artwork upload</span>
                </label>
              </div>
            )}
          </section>

          {/* 9. Processing Profile (10-15d) & Shipping Profile */}
          <section
            id="sec-shipping"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <h2 className="text-sm font-bold">9. Made-to-Order Processing &amp; Shipping Profiles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Processing Profile *</label>
                <select
                  value={draft.processingProfileId}
                  onChange={(e) => setDraft({ ...draft, processingProfileId: e.target.value })}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  {processingProfiles.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name} ({pr.minDays}–{pr.maxDays} days)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Shipping Profile *</label>
                <select
                  value={draft.shippingProfileId}
                  onChange={(e) => setDraft({ ...draft, shippingProfileId: e.target.value })}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  {shippingProfiles.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 10. SEO & Pinterest Rich Pin */}
          <section
            id="sec-seo"
            className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">10. URL Slug, SEO &amp; Pinterest Rich Pin</h2>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    seo: {
                      metaTitle: `${draft.title} | ${settings.storeName}`,
                      metaDescription: draft.description.slice(0, 155),
                    },
                    pinterest: {
                      ...draft.pinterest,
                      pinTitle: draft.title,
                      pinDescription: draft.description.slice(0, 180),
                    },
                  })
                }
                className="inline-flex items-center gap-1 rounded-full bg-[#EFECE6] dark:bg-[#2E2C28] px-3 py-1 font-bold cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill SEO from Title
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Clean URL Slug</label>
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Pinterest Target Board</label>
                <input
                  type="text"
                  value={draft.pinterest.board}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      pinterest: { ...draft.pinterest, board: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Bottom Etsy Publish Bar */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1C1B19]/95 backdrop-blur border-t border-[#E6E1D8] dark:border-[#2E2C28] px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
        <Link to="/admin/listings" className="text-xs font-bold text-[#5F5B55] hover:underline">
          Cancel
        </Link>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-5 py-2 text-xs font-bold cursor-pointer"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={() => handleSave('active')}
            className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-6 py-2 text-xs font-bold cursor-pointer"
          >
            Publish listing
          </button>
        </div>
      </div>
    </div>
  );
};
