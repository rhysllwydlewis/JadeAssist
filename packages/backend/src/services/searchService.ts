/**
 * Unified JadeAssist search service.
 *
 * Search preference order:
 * 1. EventFlow supplier profiles in MongoDB (these can link to profile cards).
 * 2. EventFlow catalog API, when configured.
 * 3. UK-wide online discovery links when the owned inventory is too small.
 *
 * The online fallback intentionally returns live search/directory links rather
 * than pretending we have verified availability, prices or ratings.
 */
import mongoose from 'mongoose';
import { Supplier, SupplierModel } from '../models/Supplier';
import { catalogService, CatalogSupplier, CatalogVenue } from './catalogService';
import { logger } from '../utils/logger';
import { env } from '../config/env';
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
  source:
    | 'local-db'
    | 'eventflow-catalog'
    | 'website-index'
    | 'google-places'
    | 'serpapi-maps'
    | 'brave-search'
    | 'online-search';
}

export interface SearchRequest {
  query: string;
  category?: string;
  location?: string;
  limit?: number;
}

type ProviderSearchInput = {
  category?: SupplierCategory;
  location?: string;
  query: string;
  limit: number;
};

type GooglePlacesResponse = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    rating?: number;
    types?: string[];
  }>;
};

type SerpApiMapsResponse = {
  local_results?: Array<{
    place_id?: string;
    data_id?: string;
    data_cid?: string;
    title?: string;
    address?: string;
    type?: string;
    types?: string[];
    rating?: number;
    description?: string;
    website?: string;
    place_id_search?: string;
    links?: { website?: string; directions?: string };
  }>;
};

type BraveSearchResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      profile?: { name?: string };
    }>;
  };
};

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
  room: 'venue',
  rooms: 'venue',
  space: 'venue',
  spaces: 'venue',
  caterer: 'catering',
  caterers: 'catering',
  catering: 'catering',
  food: 'catering',
  photographer: 'photographer',
  photographers: 'photographer',
  photography: 'photographer',
  photo: 'photographer',
  videographer: 'videographer',
  videographers: 'videographer',
  video: 'videographer',
  florist: 'florist',
  florists: 'florist',
  flowers: 'florist',
  musician: 'entertainment',
  musicians: 'entertainment',
  band: 'entertainment',
  bands: 'entertainment',
  singer: 'entertainment',
  singers: 'entertainment',
  entertainer: 'entertainment',
  entertainers: 'entertainment',
  entertainment: 'entertainment',
  music: 'entertainment',
  dj: 'entertainment',
  djs: 'entertainment',
  decor: 'decorator',
  decorator: 'decorator',
  decorators: 'decorator',
  styling: 'decorator',
  transport: 'transport',
  car: 'transport',
  cars: 'transport',
  hotel: 'accommodation',
  hotels: 'accommodation',
  accommodation: 'accommodation',
  stay: 'accommodation',
  stationery: 'stationery',
  invitations: 'stationery',
  beauty: 'beauty',
  hair: 'beauty',
  makeup: 'beauty',
  equipment: 'equipment',
  av: 'equipment',
  marquee: 'equipment',
  marquees: 'equipment',
};

const CATEGORY_DISPLAY_LABELS: Record<SupplierCategory, string> = {
  venue: 'venue',
  catering: 'caterer',
  photographer: 'photographer',
  videographer: 'videographer',
  florist: 'florist',
  entertainment: 'musician / entertainer',
  decorator: 'decorator / stylist',
  transport: 'transport supplier',
  accommodation: 'hotel / accommodation',
  stationery: 'stationery supplier',
  beauty: 'hair / makeup supplier',
  equipment: 'equipment supplier',
  other: 'supplier',
};

const CATEGORY_SEARCH_LABELS: Record<SupplierCategory, string> = {
  venue: 'event venues',
  catering: 'event caterers',
  photographer: 'event photographers',
  videographer: 'event videographers',
  florist: 'event florists',
  entertainment: 'event musicians entertainers DJs bands',
  decorator: 'event decorators stylists',
  transport: 'event transport hire',
  accommodation: 'hotels accommodation for event guests',
  stationery: 'event stationery invitations',
  beauty: 'event hair makeup beauty',
  equipment: 'event equipment AV marquee hire',
  other: 'event suppliers',
};

const VALID_CATEGORIES = new Set<string>(SUPPLIER_CATEGORIES);

// Longer/more specific names first, so "North Wales" does not become "Wales".
const LOCATION_NAMES = [
  'North Wales',
  'South Wales',
  'West Wales',
  'Mid Wales',
  'East Midlands',
  'West Midlands',
  'South East',
  'South West',
  'North East',
  'North West',
  'Greater Manchester',
  'London',
  'Cardiff',
  'Swansea',
  'Newport',
  'Wrexham',
  'Bangor',
  'Bolton',
  'Plymouth',
  'Manchester',
  'Birmingham',
  'Bristol',
  'Liverpool',
  'Leeds',
  'Sheffield',
  'Newcastle',
  'Nottingham',
  'Leicester',
  'Oxford',
  'Cambridge',
  'York',
  'Exeter',
  'Norwich',
  'Brighton',
  'Southampton',
  'Portsmouth',
  'Edinburgh',
  'Glasgow',
  'Aberdeen',
  'Dundee',
  'Belfast',
  'Wales',
  'Scotland',
  'England',
  'Northern Ireland',
  'Yorkshire',
  'Cornwall',
  'Devon',
  'Cotswolds',
  'Lake District',
];

const LOCATION_STOP_WORDS = new Set([
  'for',
  'with',
  'under',
  'over',
  'budget',
  'guests',
  'guest',
  'people',
  'next',
  'this',
  'that',
]);

function normalise(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value.replace(/\s+/g, ' ').trim());
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
    if (new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q)) {
      return category;
    }
  }
  return undefined;
}

function inferLocation(query: string, explicit?: string): string | undefined {
  if (explicit?.trim()) return explicit.trim();

  const q = normalise(query);
  const knownLocation = LOCATION_NAMES.find((location) => q.includes(location.toLowerCase()));
  if (knownLocation) return knownLocation;

  const explicitLocation = /\b(?:in|near|around|at)\s+([a-z][a-z\s'-]{2,60})(?:[,.!?]|$)/i.exec(
    query
  );
  if (!explicitLocation) return undefined;

  const words = explicitLocation[1]
    .trim()
    .split(/\s+/)
    .filter((word) => !LOCATION_STOP_WORDS.has(word.toLowerCase()));

  if (words.length === 0) return undefined;
  return toTitleCase(words.slice(0, 4).join(' '));
}

function shouldIncludeWebsiteResults(query: string, category?: SupplierCategory): boolean {
  const q = normalise(query);
  return (
    !category ||
    ['guide', 'guides', 'help', 'website', 'dashboard', 'pricing', 'supplier', 'suppliers'].some(
      (term) => q.includes(term)
    )
  );
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
    url: `/suppliers/${supplier.id}`,
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
    url: `/suppliers/${item.id}`,
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
    url: `/venues/${item.id}`,
    source: 'eventflow-catalog',
  };
}

function websiteMatches(result: SearchResult, query: string): boolean {
  const q = normalise(query);
  if (!q) return true;
  return `${result.title} ${result.description} ${result.url ?? ''}`.toLowerCase().includes(q);
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function onlineSearchQuery(
  category: SupplierCategory | undefined,
  location: string | undefined
): string {
  const resolvedCategory = category ?? 'other';
  const categoryLabel = CATEGORY_SEARCH_LABELS[resolvedCategory];
  return `${categoryLabel} in ${location || 'the UK'}`;
}

function sourceSlug(value: string): string {
  return normalise(value).replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'uk';
}

function buildOnlineSearchResults(
  category: SupplierCategory | undefined,
  location: string | undefined
): SearchResult[] {
  const resolvedCategory = category ?? 'other';
  const displayCategory = CATEGORY_DISPLAY_LABELS[resolvedCategory];
  const displayLocation = location || 'the UK';
  const query = onlineSearchQuery(category, location);
  const resultType = resolvedCategory === 'venue' ? 'venue' : 'supplier';

  return [
    {
      id: `online-google-maps-${resolvedCategory}-${sourceSlug(displayLocation)}`,
      type: resultType,
      title: `Google Maps: ${displayCategory} in ${displayLocation}`,
      description:
        'Live map results with websites, phone numbers, directions and recent reviews. Use this when EventFlow does not yet have enough matching profiles.',
      location: displayLocation,
      category: resolvedCategory,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeQuery(query)}`,
      source: 'online-search',
    },
    {
      id: `online-google-web-${resolvedCategory}-${sourceSlug(displayLocation)}`,
      type: resultType,
      title: `Google search: best ${displayCategory} in ${displayLocation}`,
      description:
        'Broader web results for supplier websites, portfolios, packages and availability pages.',
      location: displayLocation,
      category: resolvedCategory,
      url: `https://www.google.com/search?q=${encodeQuery(`best ${query} event supplier`)}`,
      source: 'online-search',
    },
    {
      id: `online-add-to-event-${resolvedCategory}-${sourceSlug(displayLocation)}`,
      type: resultType,
      title: `Add to Event: ${displayCategory} in ${displayLocation}`,
      description:
        'UK event supplier marketplace useful for quick quote requests when EventFlow has not onboarded enough local suppliers yet.',
      location: displayLocation,
      category: resolvedCategory,
      url: `https://www.google.com/search?q=${encodeQuery(`site:addtoevent.co.uk ${query}`)}`,
      source: 'online-search',
    },
    {
      id: `online-yell-${resolvedCategory}-${sourceSlug(displayLocation)}`,
      type: resultType,
      title: `Yell: ${displayCategory} in ${displayLocation}`,
      description:
        'UK business directory results that can help cross-check local suppliers, contact details and service areas.',
      location: displayLocation,
      category: resolvedCategory,
      url: `https://www.google.com/search?q=${encodeQuery(`site:yell.com ${query}`)}`,
      source: 'online-search',
    },
  ];
}

async function searchGooglePlacesProvider(input: ProviderSearchInput): Promise<SearchResult[]> {
  const apiKey = env.searchProviders.googlePlacesApiKey;
  if (!apiKey) return [];

  const textQuery = onlineSearchQuery(input.category, input.location);
  const body = JSON.stringify({
    textQuery,
    languageCode: 'en-GB',
    regionCode: 'GB',
    maxResultCount: input.limit,
  });
  const data = await fetchJson<GooglePlacesResponse>(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.rating,places.types',
      },
      body,
    }
  );

  return (data.places ?? []).slice(0, input.limit).map((place, index) => ({
    id: place.id ?? `google-places-${index}-${sourceSlug(textQuery)}`,
    type: input.category === 'venue' ? 'venue' : 'supplier',
    title: place.displayName?.text ?? `Google Places result ${index + 1}`,
    description: place.formattedAddress
      ? `Google Places result at ${place.formattedAddress}`
      : 'Google Places result for the requested supplier search.',
    location: input.location,
    category: input.category,
    rating: place.rating,
    url: place.websiteUri ?? place.googleMapsUri,
    source: 'google-places',
  }));
}

async function searchSerpApiMapsProvider(input: ProviderSearchInput): Promise<SearchResult[]> {
  const apiKey = env.searchProviders.serpApiKey;
  if (!apiKey) return [];

  const query = onlineSearchQuery(input.category, input.location);
  const url = `https://serpapi.com/search.json?engine=google_maps&type=search&hl=en&gl=uk&q=${encodeQuery(query)}&api_key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson<SerpApiMapsResponse>(url);

  return (data.local_results ?? []).slice(0, input.limit).map((item, index) => ({
    id:
      item.place_id ??
      item.data_id ??
      item.data_cid ??
      `serpapi-maps-${index}-${sourceSlug(query)}`,
    type: input.category === 'venue' ? 'venue' : 'supplier',
    title: item.title ?? `Google Maps result ${index + 1}`,
    description:
      item.description ?? item.type ?? item.address ?? 'Google Maps local result from SerpApi.',
    location: input.location ?? item.address,
    category: input.category,
    rating: item.rating,
    url: item.website ?? item.links?.website ?? item.place_id_search,
    source: 'serpapi-maps',
  }));
}

async function searchBraveProvider(input: ProviderSearchInput): Promise<SearchResult[]> {
  const apiKey = env.searchProviders.braveSearchApiKey;
  if (!apiKey) return [];

  const query = `${onlineSearchQuery(input.category, input.location)} supplier website contact`;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeQuery(query)}&country=gb&search_lang=en&count=${Math.min(input.limit, 10)}`;
  const data = await fetchJson<BraveSearchResponse>(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  return (data.web?.results ?? []).slice(0, input.limit).map((item, index) => ({
    id: `brave-search-${index}-${sourceSlug(item.url ?? item.title ?? query)}`,
    type: input.category === 'venue' ? 'venue' : 'supplier',
    title: item.title ?? item.profile?.name ?? `Web result ${index + 1}`,
    description: item.description ?? 'Web search result for the requested supplier search.',
    location: input.location,
    category: input.category,
    url: item.url,
    source: 'brave-search',
  }));
}

async function searchConfiguredOnlineProviders(
  input: ProviderSearchInput
): Promise<SearchResult[]> {
  const providers = [searchGooglePlacesProvider, searchSerpApiMapsProvider, searchBraveProvider];
  const batches = await Promise.all(
    providers.map((provider) =>
      provider(input).catch((error) => {
        logger.warn(
          { error, provider: provider.name, query: input.query },
          'Supplier discovery provider failed'
        );
        return [] as SearchResult[];
      })
    )
  );
  return batches.flat();
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

    if (mongoose.connection.readyState === 1) {
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
          SupplierModel.search({ category, limit: Math.ceil(limit / 2) }).catch(
            () => [] as Supplier[]
          ),
          SupplierModel.search({ region: location, limit: Math.ceil(limit / 2) }).catch(
            () => [] as Supplier[]
          ),
        ]);
        results.push(...sameCategory.map(supplierToResult), ...sameLocation.map(supplierToResult));
      }
    } else {
      logger.debug(
        { query, category, location },
        'Skipping local supplier DB search because MongoDB is not connected'
      );
    }

    if (catalogService.isConfigured && results.length < limit) {
      try {
        if (category === 'venue') {
          const venues = await catalogService.listVenues({ location, pageSize: limit });
          results.push(...(venues.items ?? []).map(catalogVenueToResult));
        } else {
          const suppliers = await catalogService.listSuppliers({
            category,
            location,
            pageSize: limit,
          });
          results.push(...(suppliers.items ?? []).map(catalogSupplierToResult));
        }
      } catch (error) {
        logger.warn(
          { error, query, category, location },
          'Catalog search failed; using local and online fallback results'
        );
      }
    }

    if ((category || location) && results.length < limit) {
      const providerResults = await searchConfiguredOnlineProviders({
        category,
        location,
        query,
        limit: limit - results.length,
      });
      results.push(...providerResults);
    }

    if ((category || location) && results.length < limit) {
      results.push(...buildOnlineSearchResults(category, location));
    }

    if (shouldIncludeWebsiteResults(query, category)) {
      const websiteHits = WEBSITE_INDEX.filter((item) => websiteMatches(item, query));
      results.push(
        ...(websiteHits.length > 0
          ? websiteHits
          : WEBSITE_INDEX.filter((item) => item.id === 'website-suppliers'))
      );
    }

    return dedupe(results).slice(0, limit);
  }

  formatForPrompt(results: SearchResult[]): string {
    if (results.length === 0) return 'No matching EventFlow results were found.';

    return results
      .map(
        (item, index) =>
          `${index + 1}. ${item.title}${item.location ? ` (${item.location})` : ''}${item.category ? ` — ${item.category}` : ''}: ${item.description}${item.url ? ` [${item.url}]` : ''} Source: ${item.source}`
      )
      .join('\n');
  }
}

export const searchService = new SearchService();
