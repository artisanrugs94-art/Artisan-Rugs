import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import JSZip from 'jszip';
import Papa from 'papaparse';
import {
  CheckSquare,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FolderPlus,
  Grid,
  Layers,
  List,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useStore } from '../context/useStore';
import { ListingStatus, Product } from '../types';
import { formatMoney } from '../utils/currencies';
import {
  applySaleDiscount,
  computeListingQualityScore,
  getActiveSaleInfo,
} from '../utils/pricing';

type SortKey =
  | 'recent'
  | 'oldest'
  | 'title_asc'
  | 'price_asc'
  | 'price_desc'
  | 'views'
  | 'favourites'
  | 'orders'
  | 'revenue'
  | 'updated';

export const ListingsManager: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    products,
    categories,
    sections,
    sales,
    processingProfiles,
    shippingProfiles,
    settings,
    exchangeRates,
    undoStack,
    upsertProduct,
    deleteProducts,
    duplicateProduct,
    bulkUpdateProducts,
    undoLastBulkAction,
    importProductsBatch,
    upsertSection,
    deleteSection,
    pushToast,
  } = useStore();

  // Filter & Toolbar State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [saleFilter, setSaleFilter] = useState<'all' | 'on_sale' | 'regular'>('all');
  const [lowQualityOnly, setLowQualityOnly] = useState(false);
  const [savedView, setSavedView] = useState<'all' | 'bestsellers' | 'needs_seo' | 'on_sale'>('all');

  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [dense, setDense] = useState(false);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [page, setPage] = useState(1);

  // Selection State (supports selecting across 1,000+ filtered items)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline Quick Edit State
  const [inlineEdit, setInlineEdit] = useState<{
    id: string;
    field: 'title' | 'basePrice' | 'salePercent';
    value: string;
  } | null>(null);

  // Modals & Drawers
  const [quickEditItem, setQuickEditItem] = useState<Product | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [sectionsModalOpen, setSectionsModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(searchParams.get('modal') === 'import');
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  // Bulk Edit Configuration State
  const [bulkPriceMode, setBulkPriceMode] = useState<
    'none' | 'inc_pct' | 'dec_pct' | 'inc_amt' | 'set_amt'
  >('inc_pct');
  const [bulkPriceVal, setBulkPriceVal] = useState<number>(10);
  const [bulkRound99, setBulkRound99] = useState(false);
  const [bulkSaleMode, setBulkSaleMode] = useState<'none' | 'apply' | 'end'>('apply');
  const [bulkSalePct, setBulkSalePct] = useState<number>(15);
  const [bulkStatus, setBulkStatus] = useState<string>('unchanged');
  const [bulkSectionId, setBulkSectionId] = useState<string>('unchanged');
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('unchanged');
  const [bulkProcProfileId, setBulkProcProfileId] = useState<string>('unchanged');
  const [bulkShipProfileId, setBulkShipProfileId] = useState<string>('unchanged');
  const [bulkAddTag, setBulkAddTag] = useState('');
  const [bulkTitlePrefix, setBulkTitlePrefix] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);

  // Section Manager State
  const [newSectionName, setNewSectionName] = useState('');

  // Import CSV + ZIP State
  const [importPreviewRows, setImportPreviewRows] = useState<Product[]>([]);
  const [importReport, setImportReport] = useState<string>('');
  const [importingBusy, setImportingBusy] = useState(false);

  const formatBase = (amt: number) =>
    formatMoney(amt, settings.baseCurrency, exchangeRates, settings.baseCurrency, 'exact');

  useEffect(() => {
    if (searchParams.get('modal') === 'import') {
      setImportModalOpen(true);
    }
  }, [searchParams]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    statusFilter,
    sectionFilter,
    categoryFilter,
    saleFilter,
    lowQualityOnly,
    savedView,
    sortBy,
    pageSize,
  ]);

  // Filtered + Sorted Listings (Instant in-memory index over 1,000+ items)
  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = products.filter((p) => {
      if (savedView === 'bestsellers' && !p.isBestseller && p.counters.orders < 10) return false;
      if (savedView === 'needs_seo' && p.qualityScore >= 85) return false;
      if (savedView === 'on_sale') {
        const s = getActiveSaleInfo(p, sales);
        if (s.percent <= 0) return false;
      }

      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (sectionFilter !== 'all' && p.sectionId !== sectionFilter) return false;
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
      if (lowQualityOnly && p.qualityScore >= 80) return false;

      if (saleFilter !== 'all') {
        const s = getActiveSaleInfo(p, sales);
        if (saleFilter === 'on_sale' && s.percent <= 0) return false;
        if (saleFilter === 'regular' && s.percent > 0) return false;
      }

      if (q) {
        const inTitle = p.title.toLowerCase().includes(q);
        const inSku = p.sku.toLowerCase().includes(q);
        const inTags = p.tags.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inSku && !inTags) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt.localeCompare(b.createdAt);
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'price_asc':
          return a.basePrice - b.basePrice;
        case 'price_desc':
          return b.basePrice - a.basePrice;
        case 'views':
          return b.counters.views - a.counters.views;
        case 'favourites':
          return b.counters.favourites - a.counters.favourites;
        case 'orders':
          return b.counters.orders - a.counters.orders;
        case 'revenue':
          return b.counters.revenue - a.counters.revenue;
        case 'updated':
          return b.updatedAt.localeCompare(a.updatedAt);
        case 'recent':
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return list;
  }, [
    products,
    sales,
    searchQuery,
    statusFilter,
    sectionFilter,
    categoryFilter,
    saleFilter,
    lowQualityOnly,
    savedView,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageListings = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, safePage, pageSize]);

  const allOnPageSelected =
    pageListings.length > 0 && pageListings.every((p) => selectedIds.has(p.id));

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageListings.forEach((p) => next.delete(p.id));
      } else {
        pageListings.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const selectAllMatchingFilters = () => {
    setSelectedIds(new Set(filteredListings.map((p) => p.id)));
    pushToast(`Selected all ${filteredListings.length.toLocaleString()} matching listings`);
  };

  // Inline Quick Edit commit
  const commitInlineEdit = async () => {
    if (!inlineEdit) return;
    const item = products.find((p) => p.id === inlineEdit.id);
    setInlineEdit(null);
    if (!item) return;

    if (inlineEdit.field === 'title') {
      const trimmed = inlineEdit.value.trim().slice(0, 140);
      if (trimmed && trimmed !== item.title) {
        await upsertProduct({ ...item, title: trimmed });
      }
    } else if (inlineEdit.field === 'basePrice') {
      const num = Math.max(0, Number(inlineEdit.value));
      if (!Number.isNaN(num) && num !== item.basePrice) {
        const ratio = item.basePrice > 0 ? num / item.basePrice : 1;
        const updatedSizes = item.sizes.map((s, idx) =>
          idx === 0 ? { ...s, price: num } : { ...s, price: Math.round(s.price * ratio) }
        );
        await upsertProduct({ ...item, basePrice: num, sizes: updatedSizes });
      }
    } else if (inlineEdit.field === 'salePercent') {
      const pct = Math.min(90, Math.max(0, Math.round(Number(inlineEdit.value))));
      if (!Number.isNaN(pct)) {
        await upsertProduct({
          ...item,
          salePercent: pct,
          saleEndAt:
            pct > 0
              ? item.saleEndAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              : '',
        });
      }
    }
  };

  // Pure Bulk Mutator used for both Preview (first 10) and Commit
  const buildBulkMutator = () => {
    return (p: Product): Product => {
      const next = structuredClone(p);

      // Price adjustment
      if (bulkPriceMode !== 'none') {
        const adjust = (val: number) => {
          let out = val;
          if (bulkPriceMode === 'inc_pct') out = val * (1 + bulkPriceVal / 100);
          else if (bulkPriceMode === 'dec_pct') out = val * Math.max(0.05, 1 - bulkPriceVal / 100);
          else if (bulkPriceMode === 'inc_amt') out = val + bulkPriceVal;
          else if (bulkPriceMode === 'set_amt') out = bulkPriceVal;
          out = Math.max(1, Math.round(out));
          if (bulkRound99) out = Math.floor(out / 100) * 100 + 99;
          return out;
        };
        next.basePrice = adjust(next.basePrice);
        next.sizes = next.sizes.map((s) => ({ ...s, price: adjust(s.price) }));
      }

      // Sale adjustment
      if (bulkSaleMode === 'apply') {
        next.salePercent = Math.min(90, Math.max(1, bulkSalePct));
        next.saleEndAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      } else if (bulkSaleMode === 'end') {
        next.salePercent = 0;
        next.saleEndAt = '';
      }

      if (bulkStatus !== 'unchanged') next.status = bulkStatus as ListingStatus;
      if (bulkSectionId !== 'unchanged') next.sectionId = bulkSectionId;
      if (bulkCategoryId !== 'unchanged') next.categoryId = bulkCategoryId;
      if (bulkProcProfileId !== 'unchanged') next.processingProfileId = bulkProcProfileId;
      if (bulkShipProfileId !== 'unchanged') next.shippingProfileId = bulkShipProfileId;

      if (bulkAddTag.trim()) {
        const cleanTag = bulkAddTag.trim().toLowerCase().slice(0, 40);
        if (!next.tags.includes(cleanTag) && next.tags.length < 13) {
          next.tags = [...next.tags, cleanTag];
        }
      }

      if (bulkTitlePrefix.trim()) {
        next.title = `${bulkTitlePrefix.trim()} ${next.title}`.slice(0, 140);
      }

      return next;
    };
  };

  const selectedArray = useMemo(
    () => products.filter((p) => selectedIds.has(p.id)),
    [products, selectedIds]
  );

  const bulkPreviewItems = useMemo(() => {
    if (!bulkModalOpen) return [];
    const mutator = buildBulkMutator();
    return selectedArray.slice(0, 10).map((orig) => ({
      before: orig,
      after: mutator(orig),
    }));
  }, [
    bulkModalOpen,
    selectedArray,
    bulkPriceMode,
    bulkPriceVal,
    bulkRound99,
    bulkSaleMode,
    bulkSalePct,
    bulkStatus,
    bulkSectionId,
    bulkCategoryId,
    bulkProcProfileId,
    bulkShipProfileId,
    bulkAddTag,
    bulkTitlePrefix,
  ]);

  const executeBulkEdit = async () => {
    if (selectedIds.size === 0) return;
    setBulkRunning(true);
    const parts: string[] = [];
    if (bulkPriceMode === 'inc_pct') parts.push(`+${bulkPriceVal}% price`);
    else if (bulkPriceMode === 'dec_pct') parts.push(`-${bulkPriceVal}% price`);
    else if (bulkPriceMode !== 'none') parts.push('Price update');
    if (bulkSaleMode === 'apply') parts.push(`${bulkSalePct}% sale`);
    else if (bulkSaleMode === 'end') parts.push('Ended sale');
    if (bulkStatus !== 'unchanged') parts.push(`Status → ${bulkStatus}`);

    const label = parts.join(' & ') || 'Bulk edit';
    await bulkUpdateProducts(Array.from(selectedIds), label, buildBulkMutator());
    setBulkRunning(false);
    setBulkModalOpen(false);
  };

  // CSV Export
  const handleExportCsv = (onlySelected = false) => {
    const source = onlySelected && selectedArray.length > 0 ? selectedArray : filteredListings;
    const rows = source.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      status: p.status,
      categoryId: p.categoryId,
      sectionId: p.sectionId,
      basePrice: p.basePrice,
      salePercent: p.salePercent,
      sizes: p.sizes.map((s) => `${s.label}:${s.price}`).join('|'),
      colors: p.variations.map((v) => v.name).join('|'),
      tags: p.tags.join(','),
      images: p.images.map((i) => i.url).join('|'),
      processingProfileId: p.processingProfileId,
      shippingProfileId: p.shippingProfileId,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kazumi-rugs-listings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast(`Exported ${rows.length} listings to CSV`, { tone: 'success' });
  };

  const downloadCsvTemplate = () => {
    const sample = [
      {
        TITLE: 'Traditional Crying Heart Dagger Tufted Rug | Tattoo Flash Decor',
        DESCRIPTION:
          'Handmade made-to-order tufted rug crafted in 10-15 days with bold black outlines.',
        PRICE: 75,
        SKU: 'KZM-DAG-01',
        CATEGORY: 'cat-tattoo',
        SECTION: 'sec-flash',
        TAGS: 'tattoo rug,dagger rug,tufted rug,handmade rug,traditional tattoo',
        SIZES: '60x60cm:75|90x90cm:115|120x120cm:160',
        COLORS: 'Crimson Flash|Midnight Teal',
        IMAGE1: '/assets/aistudio/6269061323719119381_ec21f307.jpg',
        STATUS: 'active',
      },
    ];
    const csv = Papa.unparse(sample);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kazumi-etsy-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV + Etsy CSV + optional Image ZIP Parser
  const handleCsvAndZipFiles = async (csvFile: File | null, zipFile: File | null) => {
    if (!csvFile) return;
    setImportingBusy(true);
    const zipImageMap = new Map<string, string>();

    if (zipFile) {
      try {
        const zip = await JSZip.loadAsync(zipFile);
        const entries = Object.values(zip.files).filter((f) => !f.dir);
        for (const entry of entries.slice(0, 200)) {
          const blob = await entry.async('blob');
          const baseName = entry.name.split('/').pop() || entry.name;
          zipImageMap.set(baseName.toLowerCase(), URL.createObjectURL(blob));
        }
      } catch {
        pushToast('Could not read ZIP file; falling back to CSV image URLs', { tone: 'error' });
      }
    }

    Papa.parse<Record<string, string>>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const now = new Date().toISOString();
        const parsed: Product[] = res.data.map((row, idx) => {
          // Supports both Kazumi CSV and Etsy Export CSV headers automatically
          const rawTitle = (row.TITLE || row.title || `Tufted Rug #${idx + 1}`).trim().slice(0, 140);
          const slug = `${rawTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80)}-${Date.now().toString().slice(-4)}-${idx}`;
          const basePrice = Math.max(15, Number(row.PRICE || row.basePrice || row.price || 75));
          const rawTags = (row.TAGS || row.tags || 'tufted rug,tattoo rug,handmade')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 13);

          const rawImg =
            row.IMAGE1 ||
            row.images?.split('|')[0] ||
            '/assets/aistudio/6269061323719119382_e3aca78f.jpg';
          const matchedZipUrl = zipImageMap.get(rawImg.split('/').pop()?.toLowerCase() || '');
          const coverUrl = matchedZipUrl || rawImg;

          const colorNames = (
            row.COLORS ||
            row['VARIATION 2 VALUES'] ||
            row.colors ||
            'Classic Flash,Midnight Black'
          )
            .split(/[|,]/)
            .map((c) => c.trim())
            .filter(Boolean)
            .slice(0, 6);

          const prod: Product = {
            id: `imp-${Date.now()}-${idx}`,
            title: rawTitle,
            slug,
            description:
              row.DESCRIPTION ||
              row.description ||
              'Hand-tufted made-to-order statement rug. Crafted in 10–15 days after order confirmation.',
            categoryId: row.CATEGORY || row.categoryId || 'cat-tattoo',
            sectionId: row.SECTION || row.sectionId || 'sec-flash',
            tags: rawTags,
            materials: ['Heavyweight Acrylic Yarn', 'Non-Slip Canvas Backing'],
            images: [{ url: coverUrl, alt: rawTitle }],
            videoUrl: '',
            basePrice,
            comparePrice: 0,
            sku: row.SKU || row.sku || `KZM-IMP-${1000 + idx}`,
            sizes: [
              { id: 'sz-60', label: '60×60 cm (2×2 ft)', widthCm: 60, heightCm: 60, price: basePrice, active: true },
              {
                id: 'sz-90',
                label: '90×90 cm (3×3 ft)',
                widthCm: 90,
                heightCm: 90,
                price: Math.round(basePrice * 1.55),
                active: true,
              },
              {
                id: 'sz-120',
                label: '120×120 cm (4×4 ft)',
                widthCm: 120,
                heightCm: 120,
                price: Math.round(basePrice * 2.15),
                active: true,
              },
            ],
            variations: colorNames.map((name, vIdx) => ({
              id: `var-${vIdx}`,
              name,
              swatch: vIdx === 0 ? '#D62828' : '#111111',
              imageUrls: [coverUrl],
              priceAdjustment: 0,
              stock: 99,
              sku: `KZM-IMP-${idx}-${vIdx}`,
              active: true,
            })),
            combinations: [],
            allowCustomSize: true,
            customSizePriceOnRequest: true,
            personalisation: {
              enabled: true,
              instructions: 'Optional custom color swap or banner text',
              required: false,
              charLimit: 120,
              allowImage: true,
            },
            stockMode: 'made_to_order',
            stockCount: 99,
            salePercent: Number(row.salePercent || 0),
            saleEndAt: '',
            processingProfileId: 'proc-standard-10-15',
            shippingProfileId: 'ship-worldwide-free',
            freeShipping: true,
            itemDetails: {
              material: '100% Heavyweight Acrylic Yarn',
              personalizable: true,
              handmade: true,
              backing: 'Non-slip cotton canvas',
              care: 'Vacuum gently; spot clean',
              pileHeightMm: 16,
            },
            attributes: {
              primaryColor: 'Black',
              secondaryColor: 'Crimson',
              style: 'Tattoo Flash & Anime',
              room: 'Studio / Living Room',
              occasion: 'Housewarming',
            },
            seo: { metaTitle: rawTitle, metaDescription: rawTitle },
            pinterest: { pinTitle: rawTitle, pinDescription: rawTitle, board: 'Tufted Rugs' },
            featured: false,
            isBestseller: false,
            ratingAvg: 5,
            ratingCount: 0,
            status: ((row.STATUS || row.status || 'active').toLowerCase() as ListingStatus) || 'active',
            scheduledAt: '',
            qualityScore: 80,
            counters: { views: 0, visits: 0, favourites: 0, orders: 0, revenue: 0 },
            createdAt: now,
            updatedAt: now,
          };
          prod.qualityScore = computeListingQualityScore(prod).score;
          return prod;
        });

        setImportPreviewRows(parsed);
        setImportReport(
          `Validated ${parsed.length} row(s) from "${csvFile.name}" (${zipImageMap.size} ZIP image(s) matched). Ready to import.`
        );
        setImportingBusy(false);
      },
    });
  };

  // 1-Click 1,000-Listing Stress-Test Generator (Acceptance Test #9 & #11)
  const handleGenerate1000Listings = async () => {
    setImportingBusy(true);
    const studioImages = [
      '/assets/aistudio/6269061323719119382_e3aca78f.jpg',
      '/assets/aistudio/6269061323719119381_ec21f307.jpg',
      '/assets/aistudio/6269061323719119378_8607c443.jpg',
      '/assets/aistudio/6269061323719119379_35fc11e0.jpg',
      '/assets/aistudio/6269061323719119380_f70024df.jpg',
      '/rugs/grim-reaper-rose.svg',
      '/rugs/deaths-head-moth.svg',
      '/rugs/anime-cloud-skeleton.svg',
    ];
    const motifs = [
      'Traditional Roaring Tiger',
      'Crawling Black Panther',
      'Kewpie Devil Horns',
      'Komainu Temple Guardian',
      'Grim Reaper Crimson Rose',
      'Deaths-Head Skull Moth',
      'Akatsuki Anime Cloud',
      '3D Carved Ribcage Skeleton',
      'Coiled Cobra Dagger',
      'Crying Sacred Heart',
    ];
    const catIds = categories.map((c) => c.id);
    const secIds = sections.map((s) => s.id);
    const now = Date.now();

    const generated: Product[] = Array.from({ length: 1000 }, (_, i) => {
      const motif = motifs[i % motifs.length];
      const img = studioImages[i % studioImages.length];
      const basePrice = 59 + (i % 12) * 8;
      const iso = new Date(now - i * 60000).toISOString();
      return {
        id: `scale-${now}-${i}`,
        title: `${motif} Handmade Tufted Rug — Edition #${i + 1}`,
        slug: `kazumi-${motif.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-ed-${i + 1}`,
        description:
          'Hand-tufted made-to-order statement rug with bold black outlines and carved heavyweight acrylic pile. Crafted in 10–15 days after order confirmation.',
        categoryId: catIds[i % catIds.length] || 'cat-tattoo',
        sectionId: secIds[i % secIds.length] || 'sec-flash',
        tags: [
          'tattoo rug',
          'tufted rug',
          'anime rug',
          'handmade rug',
          'kazumi rugs',
          motif.toLowerCase().split(' ')[0],
        ],
        materials: ['Heavyweight Acrylic Yarn', 'Cotton Non-Slip Backing'],
        images: [{ url: img, alt: `${motif} tufted rug` }],
        videoUrl: '',
        basePrice,
        comparePrice: 0,
        sku: `KZM-1K-${String(i + 1).padStart(4, '0')}`,
        sizes: [
          { id: 'sz-60', label: '60×60 cm (2×2 ft)', widthCm: 60, heightCm: 60, price: basePrice, active: true },
          { id: 'sz-90', label: '90×90 cm (3×3 ft)', widthCm: 90, heightCm: 90, price: basePrice + 38, active: true },
          { id: 'sz-120', label: '120×120 cm (4×4 ft)', widthCm: 120, heightCm: 120, price: basePrice + 82, active: true },
        ],
        variations: [
          {
            id: 'v-1',
            name: 'Studio Original',
            swatch: '#D62828',
            imageUrls: [img],
            priceAdjustment: 0,
            stock: 99,
            sku: `KZM-1K-${i}-A`,
            active: true,
          },
          {
            id: 'v-2',
            name: 'Midnight Teal',
            swatch: '#2EC4B6',
            imageUrls: [studioImages[(i + 1) % studioImages.length]],
            priceAdjustment: 10,
            stock: 99,
            sku: `KZM-1K-${i}-B`,
            active: true,
          },
        ],
        combinations: [],
        allowCustomSize: true,
        customSizePriceOnRequest: true,
        personalisation: {
          enabled: true,
          instructions: 'Add custom palette or dimensions note',
          required: false,
          charLimit: 120,
          allowImage: true,
        },
        stockMode: 'made_to_order',
        stockCount: 99,
        salePercent: i % 5 === 0 ? 15 : 0,
        saleEndAt: i % 5 === 0 ? new Date(now + 10 * 86400000).toISOString() : '',
        processingProfileId: 'proc-standard-10-15',
        shippingProfileId: 'ship-worldwide-free',
        freeShipping: true,
        itemDetails: {
          material: '100% Heavyweight Acrylic Yarn',
          personalizable: true,
          handmade: true,
          backing: 'Non-slip cotton canvas',
          care: 'Spot clean',
          pileHeightMm: 16,
        },
        attributes: {
          primaryColor: 'Black',
          secondaryColor: 'Red',
          style: 'Tattoo Flash',
          room: 'Studio',
          occasion: 'Gift',
        },
        seo: { metaTitle: motif, metaDescription: motif },
        pinterest: { pinTitle: motif, pinDescription: motif, board: 'Kazumi Rugs' },
        featured: false,
        isBestseller: i % 9 === 0,
        ratingAvg: 4.9,
        ratingCount: (i % 24) + 3,
        status: i % 14 === 0 ? 'draft' : 'active',
        scheduledAt: '',
        qualityScore: 86,
        counters: {
          views: 120 + (i % 400),
          visits: 80 + (i % 250),
          favourites: 12 + (i % 65),
          orders: i % 18,
          revenue: (i % 18) * basePrice,
        },
        createdAt: iso,
        updatedAt: iso,
      };
    });

    await importProductsBatch(generated);
    setImportingBusy(false);
    setImportModalOpen(false);
  };

  const latestUndo = undoStack.find((u) => !u.restored);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Listings ({products.length.toLocaleString()})
          </h1>
          <p className="text-xs text-[#5F5B55] dark:text-[#A6A198]">
            Inline Quick Edit, Copy Listing, Bulk Edit with 24h Undo, and CSV/Etsy 1,000+ Import
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSectionsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3.5 py-2 text-xs font-semibold hover:border-[#111111] cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Sections ({sections.length})
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3.5 py-2 text-xs font-semibold hover:border-[#111111] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV / Etsy
          </button>
          <button
            type="button"
            onClick={() => handleExportCsv(false)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] px-3.5 py-2 text-xs font-semibold hover:border-[#111111] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <Link
            to="/admin/listings/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Add a listing
          </Link>
        </div>
      </div>

      {/* 24-Hour Bulk Action UNDO Banner */}
      {latestUndo && (
        <div className="rounded-2xl border border-[#E9A820] bg-[#F5EBC8] dark:bg-[#2B2416] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <strong>Last bulk edit:</strong> "{latestUndo.actionLabel}" modified{' '}
            <strong>{latestUndo.affectedCount}</strong> listing(s). Snapshot stored for 24 hours.
          </div>
          <button
            type="button"
            onClick={() => undoLastBulkAction(latestUndo.id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] text-white px-4 py-1.5 font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo Last Bulk Action
          </button>
        </div>
      )}

      {/* Main Split: Left Filters + Right Listings Table/Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Filter Panel */}
        <aside className="lg:col-span-3 rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Listing Filters
            </span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSectionFilter('all');
                setCategoryFilter('all');
                setSaleFilter('all');
                setLowQualityOnly(false);
                setSavedView('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-semibold text-[#5F5B55] hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Saved Views */}
          <div>
            <p className="font-bold text-[11px] uppercase tracking-wider text-[#5F5B55] mb-1.5">
              Saved Views
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['all', 'All listings'],
                  ['bestsellers', 'My bestsellers'],
                  ['on_sale', 'On sale now'],
                  ['needs_seo', 'Needs SEO'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSavedView(id)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold text-left cursor-pointer ${
                    savedView === id
                      ? 'bg-[#111111] text-white dark:bg-[#FAF8F5] dark:text-[#111111]'
                      : 'bg-[#FAF8F5] dark:bg-[#121211] text-[#5F5B55]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Radio */}
          <div>
            <p className="font-bold text-[11px] uppercase tracking-wider text-[#5F5B55] mb-1.5">
              Listing Status
            </p>
            <div className="space-y-1">
              {[
                ['all', 'All statuses', products.length],
                ['active', 'Active', products.filter((p) => p.status === 'active').length],
                ['draft', 'Draft', products.filter((p) => p.status === 'draft').length],
                ['inactive', 'Inactive', products.filter((p) => p.status === 'inactive').length],
                ['sold_out', 'Sold out', products.filter((p) => p.status === 'sold_out').length],
                ['scheduled', 'Scheduled', products.filter((p) => p.status === 'scheduled').length],
              ].map(([st, label, cnt]) => (
                <button
                  key={String(st)}
                  type="button"
                  onClick={() => setStatusFilter(String(st))}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#EFECE6] dark:bg-[#2E2C28] font-bold'
                      : 'hover:bg-[#FAF8F5] dark:hover:bg-[#252320]'
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-mono-num text-[#5F5B55]">{Number(cnt).toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shop Sections */}
          <div>
            <p className="font-bold text-[11px] uppercase tracking-wider text-[#5F5B55] mb-1.5">
              Shop Sections
            </p>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
            >
              <option value="all">All sections</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name} ({products.filter((p) => p.sectionId === sec.id).length})
                </option>
              ))}
            </select>
          </div>

          {/* Categories */}
          <div>
            <p className="font-bold text-[11px] uppercase tracking-wider text-[#5F5B55] mb-1.5">
              Category
            </p>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sale Status */}
          <div>
            <p className="font-bold text-[11px] uppercase tracking-wider text-[#5F5B55] mb-1.5">
              Sale Status
            </p>
            <select
              value={saleFilter}
              onChange={(e) => setSaleFilter(e.target.value as 'all' | 'on_sale' | 'regular')}
              className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
            >
              <option value="all">All pricing</option>
              <option value="on_sale">On sale</option>
              <option value="regular">Regular price only</option>
            </select>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={lowQualityOnly}
              onChange={(e) => setLowQualityOnly(e.target.checked)}
              className="rounded"
            />
            <span>Low quality score (&lt; 80/100)</span>
          </label>
        </aside>

        {/* Right Listings Workspace */}
        <div className="lg:col-span-9 space-y-3">
          {/* Toolbar */}
          <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Search */}
              <div className="relative flex-1 min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-[#5F5B55] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, 13 tags, or SKU..."
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] pl-8 pr-3 py-2 text-xs"
                />
              </div>

              {/* Sort */}
              <select
                aria-label="Sort listings"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 text-xs font-semibold"
              >
                <option value="recent">Sort: Most recent</option>
                <option value="oldest">Oldest</option>
                <option value="title_asc">Title A–Z</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="views">Most views</option>
                <option value="favourites">Most favourites</option>
                <option value="orders">Most orders</option>
                <option value="revenue">Highest revenue</option>
                <option value="updated">Last modified</option>
              </select>

              {/* Page Size */}
              <select
                aria-label="Items per page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
                className="rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2 text-xs font-semibold tabular-nums"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              {/* Density & View Mode */}
              <div className="inline-flex rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="Table view"
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    viewMode === 'list' ? 'bg-[#111111] text-white' : 'text-[#5F5B55]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[#111111] text-white' : 'text-[#5F5B55]'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDense((d) => !d)}
                  title="Toggle compact row density"
                  className={`px-2 text-[11px] font-bold rounded-lg cursor-pointer ${
                    dense ? 'bg-[#EFECE6] dark:bg-[#2E2C28]' : 'text-[#5F5B55]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Selection & Bulk Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6E1D8] dark:border-[#2E2C28] text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectPage}
                  />
                  <span>Select page ({pageListings.length})</span>
                </label>

                {filteredListings.length > pageListings.length && (
                  <button
                    type="button"
                    onClick={selectAllMatchingFilters}
                    className="text-[#2F6B2F] dark:text-[#5ECF5E] font-bold hover:underline cursor-pointer"
                  >
                    Select all {filteredListings.length.toLocaleString()} matching filters
                  </button>
                )}

                {selectedIds.size >= 200 && filteredListings.length > 200 ? null : filteredListings.length >=
                  200 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set(filteredListings.slice(0, 200).map((p) => p.id)));
                      pushToast('Selected first 200 listings');
                    }}
                    className="text-[#5F5B55] hover:underline cursor-pointer"
                  >
                    Select 200
                  </button>
                ) : null}

                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[#5F5B55] hover:underline cursor-pointer"
                  >
                    Clear ({selectedIds.size})
                  </button>
                )}
              </div>

              {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-3.5 py-1.5 font-bold cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Bulk Edit ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      bulkUpdateProducts(
                        Array.from(selectedIds),
                        'Apply 15% sale',
                        (p) => ({
                          ...p,
                          salePercent: 15,
                          saleEndAt: new Date(Date.now() + 10 * 86400000).toISOString(),
                        })
                      )
                    }
                    className="rounded-full bg-[#2F6B2F] text-white px-3 py-1.5 font-bold cursor-pointer"
                  >
                    Apply 15% Sale
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      bulkUpdateProducts(Array.from(selectedIds), 'End sale', (p) => ({
                        ...p,
                        salePercent: 0,
                        saleEndAt: '',
                      }))
                    }
                    className="rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] px-3 py-1.5 font-semibold cursor-pointer"
                  >
                    End Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteIds(Array.from(selectedIds))}
                    className="rounded-full border border-[#D62828]/50 text-[#D62828] px-3 py-1.5 font-semibold cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {pageListings.length === 0 ? (
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] p-12 text-center space-y-3">
              <p className="text-sm font-bold">No listings match these filters</p>
              <p className="text-xs text-[#5F5B55]">
                Adjust your search or create a new made-to-order tufted rug listing.
              </p>
              <Link
                to="/admin/listings/new"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] text-white px-5 py-2 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Add a listing
              </Link>
            </div>
          ) : viewMode === 'list' ? (
            /* Etsy Dense Table View with Inline Quick Edit */
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F5F2EC] dark:bg-[#171614] border-b border-[#E6E1D8] dark:border-[#2E2C28] text-[11px] text-[#5F5B55] sticky top-0">
                    <tr>
                      <th className="py-2.5 pl-3 pr-2 w-8">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectPage}
                        />
                      </th>
                      <th className="py-2.5 px-2">Listing (click title/price/sale to Quick Edit)</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-right">Base Price</th>
                      <th className="py-2.5 px-2">Sale %</th>
                      <th className="py-2.5 px-2">Stock / Window</th>
                      <th className="py-2.5 px-2">Section</th>
                      <th className="py-2.5 px-2 text-right">Stats</th>
                      <th className="py-2.5 px-2 text-center">SEO</th>
                      <th className="py-2.5 pr-3 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E1D8] dark:divide-[#2E2C28]">
                    {pageListings.map((p) => {
                      const saleInfo = getActiveSaleInfo(p, sales);
                      const effectivePrice = applySaleDiscount(p.basePrice, saleInfo.percent);
                      const proc = processingProfiles.find((pr) => pr.id === p.processingProfileId);
                      const rowPad = dense ? 'py-1.5' : 'py-3';

                      return (
                        <tr
                          key={p.id}
                          className={`group hover:bg-[#FAF8F5] dark:hover:bg-[#252320] ${
                            selectedIds.has(p.id) ? 'bg-[#F5EBC8]/35 dark:bg-[#2B2416]/40' : ''
                          }`}
                        >
                          <td className={`${rowPad} pl-3 pr-2`}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(p.id)}
                              onChange={() => toggleSelectRow(p.id)}
                            />
                          </td>

                          {/* Thumbnail + Inline Editable Title */}
                          <td className={`${rowPad} px-2 max-w-[290px]`}>
                            <div className="flex items-center gap-2.5">
                              <Link
                                to={`/admin/listings/${p.id}`}
                                className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-[#E6E1D8] dark:border-[#2E2C28]"
                              >
                                <ResilientImage
                                  src={p.images[0]?.url}
                                  alt={p.title}
                                  className="w-full h-full object-cover"
                                />
                              </Link>
                              <div className="min-w-0 flex-1">
                                {inlineEdit?.id === p.id && inlineEdit.field === 'title' ? (
                                  <input
                                    type="text"
                                    autoFocus
                                    value={inlineEdit.value}
                                    onChange={(e) =>
                                      setInlineEdit({ ...inlineEdit, value: e.target.value })
                                    }
                                    onBlur={commitInlineEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') commitInlineEdit();
                                      if (e.key === 'Escape') setInlineEdit(null);
                                    }}
                                    className="w-full rounded-md border border-[#111111] bg-white dark:bg-[#121211] px-2 py-0.5 text-xs font-bold"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlineEdit({ id: p.id, field: 'title', value: p.title })
                                    }
                                    title="Click to Quick Edit title inline"
                                    className="font-bold text-left truncate block w-full hover:underline cursor-pointer"
                                  >
                                    {p.title}
                                  </button>
                                )}
                                <p className="text-[11px] text-[#5F5B55] font-mono-num truncate">
                                  {p.sku} · {p.sizes.length} sizes · {p.variations.length} colors
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Inline Status Selector */}
                          <td className={`${rowPad} px-2`}>
                            <select
                              aria-label="Listing status"
                              value={p.status}
                              onChange={(e) =>
                                upsertProduct({ ...p, status: e.target.value as ListingStatus })
                              }
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold cursor-pointer border ${
                                p.status === 'active'
                                  ? 'border-[#2F6B2F]/40 bg-[#2F6B2F]/10 text-[#2F6B2F] dark:text-[#5ECF5E]'
                                  : 'border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] text-[#5F5B55]'
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="draft">Draft</option>
                              <option value="inactive">Inactive</option>
                              <option value="sold_out">Sold out</option>
                              <option value="scheduled">Scheduled</option>
                            </select>
                          </td>

                          {/* Inline Base Price */}
                          <td className={`${rowPad} px-2 text-right font-mono-num`}>
                            {inlineEdit?.id === p.id && inlineEdit.field === 'basePrice' ? (
                              <input
                                type="number"
                                autoFocus
                                value={inlineEdit.value}
                                onChange={(e) =>
                                  setInlineEdit({ ...inlineEdit, value: e.target.value })
                                }
                                onBlur={commitInlineEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitInlineEdit();
                                  if (e.key === 'Escape') setInlineEdit(null);
                                }}
                                className="w-24 rounded-md border border-[#111111] bg-white dark:bg-[#121211] px-2 py-0.5 text-right text-xs font-bold"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setInlineEdit({
                                    id: p.id,
                                    field: 'basePrice',
                                    value: String(p.basePrice),
                                  })
                                }
                                title="Click to Quick Edit price inline"
                                className="cursor-pointer text-right hover:underline"
                              >
                                {saleInfo.percent > 0 ? (
                                  <div>
                                    <span className="font-bold text-[#2F6B2F] dark:text-[#5ECF5E]">
                                      {formatBase(effectivePrice)}
                                    </span>
                                    <span className="block text-[10px] line-through text-[#5F5B55]">
                                      {formatBase(p.basePrice)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-bold">{formatBase(p.basePrice)}</span>
                                )}
                              </button>
                            )}
                          </td>

                          {/* Quick Sale Toggle / Inline % */}
                          <td className={`${rowPad} px-2 font-mono-num`}>
                            {saleInfo.percent > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded-full bg-[#2F6B2F]/15 text-[#2F6B2F] dark:text-[#5ECF5E] text-[11px] font-bold">
                                  {saleInfo.percent}% off
                                </span>
                                {p.salePercent > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      upsertProduct({ ...p, salePercent: 0, saleEndAt: '' })
                                    }
                                    title="End product sale"
                                    className="text-[10px] text-[#5F5B55] hover:text-[#D62828] cursor-pointer"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  upsertProduct({
                                    ...p,
                                    salePercent: 15,
                                    saleEndAt: new Date(Date.now() + 10 * 86400000).toISOString(),
                                  })
                                }
                                className="text-[11px] font-semibold text-[#2F6B2F] hover:underline cursor-pointer"
                              >
                                + Apply 15% sale
                              </button>
                            )}
                          </td>

                          {/* Stock & 10-15d Window */}
                          <td className={`${rowPad} px-2`}>
                            <p className="font-semibold">
                              {p.stockMode === 'made_to_order'
                                ? 'Made to order'
                                : `${p.stockCount} left`}
                            </p>
                            <p className="text-[10px] text-[#5F5B55]">
                              {proc ? `${proc.minDays}–${proc.maxDays} days` : '10–15 days'}
                            </p>
                          </td>

                          {/* Inline Section Selector */}
                          <td className={`${rowPad} px-2`}>
                            <select
                              aria-label="Shop section"
                              value={p.sectionId}
                              onChange={(e) => upsertProduct({ ...p, sectionId: e.target.value })}
                              className="rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-transparent px-2 py-1 text-[11px] max-w-[130px] truncate cursor-pointer"
                            >
                              {sections.map((sec) => (
                                <option key={sec.id} value={sec.id}>
                                  {sec.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Denormalized Counters */}
                          <td className={`${rowPad} px-2 text-right font-mono-num text-[11px]`}>
                            <p>{p.counters.views.toLocaleString()} views</p>
                            <p className="text-[#5F5B55]">
                              {p.counters.favourites} ♥ · {p.counters.orders} ord
                            </p>
                          </td>

                          {/* Quality Score */}
                          <td className={`${rowPad} px-2 text-center font-mono-num`}>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                p.qualityScore >= 85
                                  ? 'bg-[#2F6B2F]/15 text-[#2F6B2F] dark:text-[#5ECF5E]'
                                  : 'bg-[#E9A820]/25 text-[#8A5A00]'
                              }`}
                            >
                              {p.qualityScore}
                            </span>
                          </td>

                          {/* Row Actions */}
                          <td className={`${rowPad} pr-3 pl-2 text-right relative`}>
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setQuickEditItem(structuredClone(p))}
                                title="Quick Edit Drawer"
                                className="p-1.5 rounded-lg hover:bg-[#EFECE6] dark:hover:bg-[#2E2C28] cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const copy = await duplicateProduct(p.id, 1);
                                  if (copy) navigate(`/admin/listings/${copy.id}`);
                                }}
                                title="Copy listing & open draft"
                                className="p-1.5 rounded-lg hover:bg-[#EFECE6] dark:hover:bg-[#2E2C28] cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId(openMenuId === p.id ? null : p.id)
                                }
                                aria-label="More listing actions"
                                className="p-1.5 rounded-lg hover:bg-[#EFECE6] dark:hover:bg-[#2E2C28] cursor-pointer"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {openMenuId === p.id && (
                              <div className="absolute right-3 top-10 w-48 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] shadow-xl p-1.5 text-left z-30 space-y-0.5 text-xs">
                                <Link
                                  to={`/admin/listings/${p.id}`}
                                  className="block px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#252320] font-semibold"
                                >
                                  Full Listing Editor
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    duplicateProduct(p.id, 5);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#252320] cursor-pointer"
                                >
                                  Copy 5 times (Drafts)
                                </button>
                                <Link
                                  to={`/product/${p.slug}`}
                                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#252320]"
                                >
                                  <span>View on storefront</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                                <a
                                  href={`https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(
                                    `${window.location.origin}/product/${p.slug}`
                                  )}&media=${encodeURIComponent(
                                    p.images[0]?.url || ''
                                  )}&description=${encodeURIComponent(p.title)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-[#252320]"
                                >
                                  Pin to Pinterest ↗
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setConfirmDeleteIds([p.id]);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#D62828] hover:bg-[#D62828]/10 font-semibold cursor-pointer"
                                >
                                  Delete listing
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {pageListings.map((p) => {
                const saleInfo = getActiveSaleInfo(p, sales);
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-white dark:bg-[#1C1B19] overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-square">
                      <ResilientImage
                        src={p.images[0]?.url}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelectRow(p.id)}
                        className="absolute top-2.5 left-2.5 w-4 h-4"
                      />
                      {saleInfo.percent > 0 && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#2F6B2F] text-white text-[10px] font-bold">
                          {saleInfo.percent}% off
                        </span>
                      )}
                    </div>
                    <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <Link
                          to={`/admin/listings/${p.id}`}
                          className="font-bold line-clamp-1 hover:underline"
                        >
                          {p.title}
                        </Link>
                        <p className="text-[11px] text-[#5F5B55] font-mono-num">
                          {formatBase(p.basePrice)} · {p.status}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
                        <button
                          type="button"
                          onClick={() => setQuickEditItem(structuredClone(p))}
                          className="font-semibold hover:underline cursor-pointer"
                        >
                          Quick Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateProduct(p.id, 1)}
                          className="text-[#5F5B55] hover:underline cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <span className="text-[#5F5B55] font-mono-num">
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredListings.length)} of{' '}
              {filteredListings.length.toLocaleString()} listings
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] disabled:opacity-40 font-semibold cursor-pointer"
              >
                Previous
              </button>
              <span className="px-3 font-mono-num font-bold">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-full border border-[#E6E1D8] dark:border-[#2E2C28] disabled:opacity-40 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Slide-Over Quick Edit Drawer                                         */}
      {/* ==================================================================== */}
      {quickEditItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1B19] h-full overflow-y-auto p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
              <h2 className="text-sm font-bold">Quick Edit Listing</h2>
              <button
                type="button"
                onClick={() => setQuickEditItem(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold mb-1">Title ({quickEditItem.title.length}/140)</label>
              <input
                type="text"
                maxLength={140}
                value={quickEditItem.title}
                onChange={(e) => setQuickEditItem({ ...quickEditItem, title: e.target.value })}
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Base Price ({settings.baseCurrency})</label>
                <input
                  type="number"
                  value={quickEditItem.basePrice}
                  onChange={(e) =>
                    setQuickEditItem({ ...quickEditItem, basePrice: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Sale % Off</label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={quickEditItem.salePercent}
                  onChange={(e) =>
                    setQuickEditItem({
                      ...quickEditItem,
                      salePercent: Number(e.target.value),
                      saleEndAt:
                        Number(e.target.value) > 0
                          ? quickEditItem.saleEndAt ||
                            new Date(Date.now() + 10 * 86400000).toISOString()
                          : '',
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Status</label>
                <select
                  value={quickEditItem.status}
                  onChange={(e) =>
                    setQuickEditItem({
                      ...quickEditItem,
                      status: e.target.value as ListingStatus,
                    })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                  <option value="sold_out">Sold out</option>
                </select>
              </div>
            </div>

            {/* Per-Size Prices */}
            <div>
              <label className="block font-bold mb-1.5">Per-Size Prices ({settings.baseCurrency})</label>
              <div className="space-y-1.5">
                {quickEditItem.sizes.map((sz, i) => (
                  <div key={sz.id} className="flex items-center justify-between gap-2">
                    <span>{sz.label}</span>
                    <input
                      type="number"
                      value={sz.price}
                      onChange={(e) => {
                        const nextSizes = quickEditItem.sizes.map((s, idx) =>
                          idx === i ? { ...s, price: Number(e.target.value) } : s
                        );
                        setQuickEditItem({
                          ...quickEditItem,
                          sizes: nextSizes,
                          basePrice: nextSizes[0]?.price ?? quickEditItem.basePrice,
                        });
                      }}
                      className="w-28 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-1 text-right font-mono-num"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block font-bold mb-1">
                Search Tags (comma separated, max 13)
              </label>
              <input
                type="text"
                value={quickEditItem.tags.join(', ')}
                onChange={(e) =>
                  setQuickEditItem({
                    ...quickEditItem,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .slice(0, 13),
                  })
                }
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Processing Profile</label>
                <select
                  value={quickEditItem.processingProfileId}
                  onChange={(e) =>
                    setQuickEditItem({ ...quickEditItem, processingProfileId: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2"
                >
                  {processingProfiles.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Shipping Profile</label>
                <select
                  value={quickEditItem.shippingProfileId}
                  onChange={(e) =>
                    setQuickEditItem({ ...quickEditItem, shippingProfileId: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2"
                >
                  {shippingProfiles.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Description</label>
              <textarea
                rows={4}
                value={quickEditItem.description}
                onChange={(e) =>
                  setQuickEditItem({ ...quickEditItem, description: e.target.value })
                }
                className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E6E1D8] dark:border-[#2E2C28]">
              <Link
                to={`/admin/listings/${quickEditItem.id}`}
                className="rounded-full border border-[#1A1918] dark:border-[#F4F1EA] px-4 py-2 font-bold"
              >
                Open Full Editor
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await upsertProduct(quickEditItem);
                  setQuickEditItem(null);
                }}
                className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-6 py-2 font-bold cursor-pointer"
              >
                Save Quick Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Bulk Edit Modal with Before/After Preview of First 10 Items          */}
      {/* ==================================================================== */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
              <div>
                <h2 className="text-base font-bold">
                  Bulk Edit {selectedIds.size.toLocaleString()} Selected Listing(s)
                </h2>
                <p className="text-[#5F5B55]">
                  Preview changes on the first 10 items below. Previous values are saved for 24h one-click Undo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Price Adjustment</label>
                <select
                  value={bulkPriceMode}
                  onChange={(e) => setBulkPriceMode(e.target.value as typeof bulkPriceMode)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="none">Keep current prices</option>
                  <option value="inc_pct">Increase price by %</option>
                  <option value="dec_pct">Decrease price by %</option>
                  <option value="inc_amt">Increase by {settings.baseCurrency} amount</option>
                  <option value="set_amt">Set fixed base price</option>
                </select>
              </div>

              {bulkPriceMode !== 'none' && (
                <div>
                  <label className="block font-bold mb-1">Value</label>
                  <input
                    type="number"
                    value={bulkPriceVal}
                    onChange={(e) => setBulkPriceVal(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2 font-mono-num"
                  />
                  <label className="inline-flex items-center gap-1.5 mt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkRound99}
                      onChange={(e) => setBulkRound99(e.target.checked)}
                    />
                    <span>Round to X99</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Sale Action</label>
                <div className="flex gap-2">
                  <select
                    value={bulkSaleMode}
                    onChange={(e) => setBulkSaleMode(e.target.value as typeof bulkSaleMode)}
                    className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                  >
                    <option value="none">No sale change</option>
                    <option value="apply">Apply % sale</option>
                    <option value="end">End sale</option>
                  </select>
                  {bulkSaleMode === 'apply' && (
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={bulkSalePct}
                      onChange={(e) => setBulkSalePct(Number(e.target.value))}
                      className="w-20 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2 font-mono-num"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Listing Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="unchanged">Leave unchanged</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Shop Section</label>
                <select
                  value={bulkSectionId}
                  onChange={(e) => setBulkSectionId(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="unchanged">Leave unchanged</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Processing Profile</label>
                <select
                  value={bulkProcProfileId}
                  onChange={(e) => setBulkProcProfileId(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="unchanged">Leave unchanged</option>
                  {processingProfiles.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Category</label>
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="unchanged">Leave unchanged</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Shipping Profile</label>
                <select
                  value={bulkShipProfileId}
                  onChange={(e) => setBulkShipProfileId(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
                >
                  <option value="unchanged">Leave unchanged</option>
                  {shippingProfiles.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Add Search Tag / Title Prefix</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={bulkAddTag}
                    onChange={(e) => setBulkAddTag(e.target.value)}
                    className="w-1/2 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Title prefix..."
                    value={bulkTitlePrefix}
                    onChange={(e) => setBulkTitlePrefix(e.target.value)}
                    className="w-1/2 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-2.5 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Before / After Preview Table (First 10 Items) */}
            <div className="rounded-2xl border border-[#E6E1D8] dark:border-[#2E2C28] overflow-hidden">
              <div className="bg-[#F5F2EC] dark:bg-[#171614] px-4 py-2 font-bold flex justify-between">
                <span>Before / After Preview (First {bulkPreviewItems.length} of {selectedIds.size})</span>
                <span className="text-[#2F6B2F]">Effective Storefront Price Shown</span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-[#E6E1D8] dark:divide-[#2E2C28]">
                {bulkPreviewItems.map(({ before, after }) => {
                  const beforeFinal = applySaleDiscount(before.basePrice, before.salePercent);
                  const afterFinal = applySaleDiscount(after.basePrice, after.salePercent);
                  return (
                    <div
                      key={before.id}
                      className="px-4 py-2 flex items-center justify-between gap-3"
                    >
                      <span className="truncate font-medium max-w-xs">{after.title}</span>
                      <div className="font-mono-num shrink-0 flex items-center gap-2">
                        <span className="text-[#5F5B55] line-through">
                          {formatBase(beforeFinal)} ({before.salePercent}% sale)
                        </span>
                        <span>→</span>
                        <strong className="text-[#2F6B2F] dark:text-[#5ECF5E]">
                          {formatBase(afterFinal)} ({after.salePercent}% sale)
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="rounded-full border border-[#E6E1D8] px-5 py-2 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkRunning}
                onClick={executeBulkEdit}
                className="rounded-full bg-[#111111] dark:bg-[#FAF8F5] text-white dark:text-[#111111] px-6 py-2 font-bold cursor-pointer"
              >
                {bulkRunning
                  ? 'Applying Batch Updates...'
                  : `Confirm & Update ${selectedIds.size.toLocaleString()} Listings`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Import CSV / Etsy CSV + Image ZIP + 1,000-Item Stress Generator      */}
      {/* ==================================================================== */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D8] dark:border-[#2E2C28]">
              <div>
                <h2 className="text-base font-bold">
                  Import Listings (Kazumi CSV, Etsy Export CSV + Image ZIP)
                </h2>
                <p className="text-[#5F5B55]">
                  Auto-maps Etsy columns (TITLE, DESCRIPTION, PRICE, TAGS, IMAGE1, VARIATION VALUES) and matches ZIP photos by filename.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  searchParams.delete('modal');
                  setSearchParams(searchParams);
                }}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F5EBC8] dark:bg-[#2B2416] p-4">
              <div>
                <p className="font-bold">1,000-Listing Scale Benchmark</p>
                <p className="text-[#5F5B55] dark:text-[#D5D0C6]">
                  Instantly generate 1,000 realistic tufted rug listings to test cursor pagination, instant search, and 200-item Bulk Edit + Undo.
                </p>
              </div>
              <button
                type="button"
                disabled={importingBusy}
                onClick={handleGenerate1000Listings}
                className="rounded-full bg-[#111111] text-white px-4 py-2 font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {importingBusy ? 'Generating...' : 'Generate 1,000 Demo Listings'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-dashed border-[#1A1918]/30 dark:border-[#F4F1EA]/30 p-4 space-y-2">
                <p className="font-bold">1. Select Kazumi or Etsy CSV *</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleCsvAndZipFiles(e.target.files?.[0] || null, null)}
                  className="w-full text-xs"
                />
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="text-[#2F6B2F] font-bold underline cursor-pointer"
                >
                  Download sample CSV template
                </button>
              </div>

              <div className="rounded-2xl border border-dashed border-[#1A1918]/30 dark:border-[#F4F1EA]/30 p-4 space-y-2">
                <p className="font-bold">2. Optional Photos ZIP Archive</p>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const z = e.target.files?.[0];
                    if (z) pushToast(`ZIP "${z.name}" attached for filename matching`);
                  }}
                  className="w-full text-xs"
                />
                <p className="text-[11px] text-[#5F5B55]">
                  Matches filenames in IMAGE1..IMAGE10 automatically.
                </p>
              </div>
            </div>

            {importReport && (
              <div className="rounded-xl bg-[#2F6B2F]/10 text-[#2F6B2F] dark:text-[#5ECF5E] p-3 font-semibold">
                {importReport}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-full border border-[#E6E1D8] px-4 py-2 font-bold cursor-pointer"
              >
                Close
              </button>
              {importPreviewRows.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await importProductsBatch(importPreviewRows);
                    setImportPreviewRows([]);
                    setImportReport('');
                    setImportModalOpen(false);
                  }}
                  className="rounded-full bg-[#111111] text-white px-5 py-2 font-bold cursor-pointer"
                >
                  Import {importPreviewRows.length} Validated Listings
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Shop Sections Manager Modal                                          */}
      {/* ==================================================================== */}
      {sectionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Manage Shop Sections
              </h2>
              <button
                type="button"
                onClick={() => setSectionsModalOpen(false)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 divide-y divide-[#E6E1D8] dark:divide-[#2E2C28]">
              {sections.map((sec) => (
                <div key={sec.id} className="pt-2 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={sec.name}
                    onChange={(e) => upsertSection({ ...sec, name: e.target.value })}
                    className="flex-1 rounded-lg border border-[#E6E1D8] dark:border-[#2E2C28] px-2.5 py-1.5 font-semibold"
                  />
                  <span className="font-mono-num text-[#5F5B55]">
                    {products.filter((p) => p.sectionId === sec.id).length} items
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSection(sec.id)}
                    className="text-[#D62828] p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSectionName.trim()) return;
                const now = new Date().toISOString();
                upsertSection({
                  id: `sec-${Date.now()}`,
                  name: newSectionName.trim(),
                  slug: newSectionName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  sortOrder: sections.length + 1,
                  active: true,
                  createdAt: now,
                  updatedAt: now,
                });
                setNewSectionName('');
              }}
              className="flex gap-2 pt-2"
            >
              <input
                type="text"
                placeholder="New section name..."
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="flex-1 rounded-xl border border-[#E6E1D8] dark:border-[#2E2C28] bg-[#FAF8F5] dark:bg-[#121211] px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-full bg-[#111111] text-white px-4 py-2 font-bold cursor-pointer"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Delete Confirmation Modal (No window.alert)                          */}
      {/* ==================================================================== */}
      {confirmDeleteIds && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1C1B19] border border-[#E6E1D8] dark:border-[#2E2C28] p-6 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-[#D62828]">
              Delete {confirmDeleteIds.length} Listing(s)?
            </h2>
            <p className="text-[#5F5B55]">
              You can restore deleted listings immediately from the Undo toast notification.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(null)}
                className="rounded-full border border-[#E6E1D8] px-4 py-2 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ids = confirmDeleteIds;
                  setConfirmDeleteIds(null);
                  setSelectedIds(new Set());
                  await deleteProducts(ids);
                }}
                className="rounded-full bg-[#D62828] text-white px-5 py-2 font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
