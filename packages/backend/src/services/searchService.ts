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

const CATEGORY_ALIASES: Record<string, string> = {
  venue: 'venue',
  venues: 'venue',
  caterer: 'catering',
  catering: 'catering',
  food: 'catering',
  photographer: 'photographer',
  photography: 'photographer',
  photo: 'photographer',
  florist: 'florist',
  flowers: 'florist',
  entertainment: 'entertainment',
  music: 'entertainment',
  dj: 'entertainment',
  decor: 'decorator',
  decorator: 'decorator',
  transport: 'transport',
};

function normalise(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function inferCategory(query: string, explicit?: string): string | undefined {
  const direct = normalise(explicit);
  if (direct) return CATEGORY_ALIASES[direct] ?? direct;

  const q = normalise(query);
  for (const [needle, category] of Object.entries(CATEGORY_ALIASES)) {
    if (q.includes(needle)) return category;
  }
  return undefined;
}

function inferLocation(query: string, explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim();

  const q = normalise(query);
  const locations = ['London', 'Cardiff', 'Wales', 'Manchester', 'Birmingham', 'Bristol', 'Edinburgh', 'Glasgow', 'Leeds', 'South West', 'North West', 'Midlands', 'Scotland'];
  return locations.find((location) => q.includes(location.toLowerCase()));
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

class SearchService {
  async search(request: SearchRequest): Promise<SearchResult[]> {
    const limit = Math.min(Math.max(request.limit ?? 8, 1), 20);
    const query = request.query.trim();
    const category = inferCategory(query, request.category);
    const location = inferLocation(query, request.location);
    const results: SearchResult[] = [];

    const localSuppliers = await SupplierModel.search({
      category: category as never,
      region: location,
      limit,
    }).catch((error) => {
      logger.warn({ error, query, category, location }, 'Local supplier search failed');
      return [] as Supplier[];
    });

    results.push(...localSuppliers.map(supplierToResult));

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

    if (!category || ['guide', 'guides', 'help', 'website'].some((term) => normalise(query).includes(term))) {
      results.push(...WEBSITE_INDEX.filter((item) => websiteMatches(item, query)));
    }

    const unique = new Map<string, SearchResult>();
    for (const result of results) {
      const key = `${result.source}:${result.type}:${result.id}`;
      if (!unique.has(key)) unique.set(key, result);
    }

    return [...unique.values()].slice(0, limit);
  }

  formatForPrompt(results: SearchResult[]): string {
    if (results.length === 0) return 'No matching EventFlow results were found.';

    return results
      .map((item, index) => `${index + 1}. ${item.title}${item.location ? ` (${item.location})` : ''}${item.category ? ` — ${item.category}` : ''}: ${item.description}${item.url ? ` [${item.url}]` : ''}`)
      .join('\n');
  }
}

export const searchService = new SearchService();
