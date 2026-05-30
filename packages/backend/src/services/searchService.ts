/**
 * Unified JadeAssist search service.
 *
 * Gives the agent a safe, dependency-light way to search local suppliers and
 * useful EventFlow website areas. The catalog integration remains optional;
 * local Mongo supplier search is used as the reliable baseline.
 */
import { Supplier, SupplierModel } from '../models/Supplier';
import { catalogService, CatalogSupplier, CatalogVenue } from './catalogService';
import { logger } from '../utils/logger';
import { SUPPLIER_CATEGORIES, SupplierCategory } from '@jadeassist/shared';

export interface SearchResult {
  id: string;
  type: 'supplier' | 'venue' | 'website';
  title: string;
  description: string;
  location?: string;
  category?: string;
  url?: string;
  rating?: number;
  source: 'local-db' | 'eventflow-catalog' | 'website-index';
}

export interface SearchRequest {
  query: string;
  category?: string;
  location?: string;
  limit?: number;
}

const WEBSITE_INDEX: SearchResult[] = [
  {
    id: 'website-guides',
    type: 'website',
    title: 'EventFlow Guides',
    description: 'Planning guides, checklists and event advice.',
    url: '/guides',
    source: 'website-index',
  },
  {
    id: 'website-suppliers',
    type: 'website',
    title: 'Find Suppliers',
    description: 'Browse venues, caterers, photographers, entertainers and event suppliers.',
    url: '/suppliers',
    source: 'website-index',
  },
  {
    id: 'website-dashboard',
    type: 'website',
    title: 'Customer Dashboard',
    description: 'Manage saved events, shortlists and planning activity.',
    url: '/dashboard',
    source: 'website-index',
  },
  {
    id: 'website-pricing',
    type: 'website',
    title: 'Supplier Pricing',
    description: 'Information for suppliers joining EventFlow.',
    url: '/pricing',
    source: 'website-index',
  },
];

const CATEGORY_ALIASES: Record<string, SupplierCategory> = {
  venue: 'venue',
  venues: 'venue',
  caterer: 'catering',
  catering: 'catering',
  food: 'catering',
  photographer: 'photographer',
  photographers: 'photographer',
  photography: 'photographer',
  photo: 'photographer',
  video: 'videographer',
  videographer: 'videographer',
  videographers: 'videographer',
  florist: 'florist',
  florists: 'florist',
  flowers: 'florist',
  entertainment: 'entertainment',
  music: 'entertainment',
  dj: 'entertainment',
  decor: 'decorator',
  decorator: 'decorator',
  decorators: 'decorator',
  transport: 'transport',
  accommodation: 'accommodation',
  stationery: 'stationery',
  beauty: 'beauty',
  equipment: 'equipment',
};

const VALID_CATEGORIES = new Set<string>(SUPPLIER_CATEGORIES);
const LOCATION_NAMES = [
  'London',
  'Cardiff',
  'Wales',
  'South Wales',
  'Manchester',
  'Birmingham',
  'Bristol',
  'Edinburgh',
  'Glasgow',
  'Leeds',
  'Yorkshire',
  'South West',
  'North West',
  'Midlands',
  'Scotland',
];

function normalise(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function asSupplierCategory(value: string | undefined): SupplierCategory | undefined {
  const normalised = normalise(value);
  if (!normalised) return undefined;
  const alias = CATEGORY_ALIASES[normalised] ?? normalised;
  return VALID_CATEGORIES.has(alias) ? (alias as SupplierCategory) : undefined;
}

function inferCategory(query: string, explicit?: string): SupplierCategory | undefined {
  const direct = asSupplierCategory(explicit);
  if (direct) return direct;

  const q = normalise(query);
  for (const [needle, category] of Object.entries(CATEGORY_ALIASES)) {
    if (q.includes(needle)) return category;
  }
  return undefined;
}

function inferLocation(query: string, explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim();

  const q = normalise(query);
  return LOCATION_NAMES.find((location) => q.includes(location.toLowerCase()));
}

function shouldIncludeWebsiteResults(query: string, category?: SupplierCategory): boolean {
  const q = normalise(query);
  return !category || ['guide', 'guides', 'help', 'website', 'dashboard', 'pricing', 'supplier', 'suppliers'].some((term) => q.includes(term));
}

function supplierToResult(supplier: Supplier): SearchResult {
  return {
    id: supplier.id,
    type: supplier.category === 'venue' ? 'venue' : 'supplier',
    title: supplier.name,
    description: supplier.description,
    location: supplier.location || supplier.region,
    category: supplier.category,
    rating: supplier.rating,
    source: 'local-db',
  };
}

function catalogSupplierToResult(item: CatalogSupplier): SearchResult {
  return {
    id: item.id,
    type: 'supplier',
    title: item.name,
    description: item.description ?? '',
    location: item.location,
    category: item.category,
    source: 'eventflow-catalog',
  };
}

function catalogVenueToResult(item: CatalogVenue): SearchResult {
  return {
    id: item.id,
    type: 'venue',
    title: item.name,
    description: item.description ?? '',
    location: item.location,
    category: 'venue',
    source: 'eventflow-catalog',
  };
}

function websiteMatches(result: SearchResult, query: string): boolean {
  const q = normalise(query);
  if (!q) return true;
  return `${result.title} ${result.description} ${result.url ?? ''}`.toLowerCase().includes(q);
}

function dedupe(results: SearchResult[]): SearchResult[] {
  const unique = new Map<string, SearchResult>();
  for (const result of results) {
    const key = `${result.source}:${result.type}:${result.id}`;
    if (!unique.has(key)) unique.set(key, result);
  }
  return [...unique.values()];
}

class SearchService {
  async search(request: SearchRequest): Promise<SearchResult[]> {
    const limit = Math.min(Math.max(request.limit ?? 8, 1), 20);
    const query = request.query.trim();
    const category = inferCategory(query, request.category);
    const location = inferLocation(query, request.location);
    const results: SearchResult[] = [];

    const localPrimary = await SupplierModel.search({
      category,
      region: location,
      query: !category && !location ? query : undefined,
      limit,
    }).catch((error) => {
      logger.warn({ error, query, category, location }, 'Local supplier search failed');
      return [] as Supplier[];
    });

    results.push(...localPrimary.map(supplierToResult));

    // If a strict category+location search has no local hits, broaden safely so
    // Jade can still offer useful nearby/category suggestions rather than none.
    if (results.length === 0 && category && location) {
      const [sameCategory, sameLocation] = await Promise.all([
        SupplierModel.search({ category, limit: Math.ceil(limit / 2) }).catch(() => [] as Supplier[]),
        SupplierModel.search({ region: location, limit: Math.ceil(limit / 2) }).catch(() => [] as Supplier[]),
      ]);
      results.push(...sameCategory.map(supplierToResult), ...sameLocation.map(supplierToResult));
    }

    if (catalogService.isConfigured && results.length < limit) {
      try {
        if (category === 'venue') {
          const venues = await catalogService.listVenues({ location, pageSize: limit });
          results.push(...(venues.items ?? []).map(catalogVenueToResult));
        } else {
          const suppliers = await catalogService.listSuppliers({ category, location, pageSize: limit });
          results.push(...(suppliers.items ?? []).map(catalogSupplierToResult));
        }
      } catch (error) {
        logger.warn({ error, query, category, location }, 'Catalog search failed; using local results only');
      }
    }

    if (shouldIncludeWebsiteResults(query, category)) {
      const websiteHits = WEBSITE_INDEX.filter((item) => websiteMatches(item, query));
      results.push(...(websiteHits.length > 0 ? websiteHits : WEBSITE_INDEX.filter((item) => item.id === 'website-suppliers')));
    }

    return dedupe(results).slice(0, limit);
  }

  formatForPrompt(results: SearchResult[]): string {
    if (results.length === 0) return 'No matching EventFlow results were found.';

    return results
      .map((item, index) => `${index + 1}. ${item.title}${item.location ? ` (${item.location})` : ''}${item.category ? ` — ${item.category}` : ''}: ${item.description}${item.url ? ` [${item.url}]` : ''}`)
      .join('\n');
  }
}

export const searchService = new SearchService();
