/**
 * EventFlow Catalog Service
 *
 * Fetches data from the protected EventFlow catalog endpoints.
 * All requests include the X-Catalog-Api-Key header for authentication.
 */
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface CatalogVenue {
  id: string;
  name: string;
  location?: string;
  capacity?: number;
  priceRange?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CatalogSupplier {
  id: string;
  name: string;
  category?: string;
  location?: string;
  priceRange?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CatalogListResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

class CatalogService {
  private get baseUrl(): string {
    if (!env.eventflow.catalog.baseUrl) {
      throw new Error('EVENTFLOW_CATALOG_BASE_URL is not configured');
    }
    return env.eventflow.catalog.baseUrl.replace(/\/$/, '');
  }

  private get apiKey(): string {
    if (!env.eventflow.catalog.apiKey) {
      throw new Error('EVENTFLOW_CATALOG_API_KEY is not configured');
    }
    return env.eventflow.catalog.apiKey;
  }

  /** Returns true when both catalog env vars are present. */
  get isConfigured(): boolean {
    return !!(env.eventflow.catalog.baseUrl && env.eventflow.catalog.apiKey);
  }

  /**
   * Build the standard headers for all catalog API requests.
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Catalog-Api-Key': this.apiKey,
    };
  }

  /**
   * Generic GET request to a catalog endpoint.
   */
  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    logger.debug({ url: url.toString() }, 'catalog GET request');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error(
        { status: response.status, url: url.toString(), body },
        'catalog API request failed',
      );
      throw new Error(`Catalog API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List venues from the EventFlow catalog.
   */
  async listVenues(params?: {
    location?: string;
    capacity?: number;
    page?: number;
    pageSize?: number;
  }): Promise<CatalogListResponse<CatalogVenue>> {
    const queryParams: Record<string, string> = {};
    if (params?.location) queryParams['location'] = params.location;
    if (params?.capacity !== undefined) queryParams['capacity'] = String(params.capacity);
    if (params?.page !== undefined) queryParams['page'] = String(params.page);
    if (params?.pageSize !== undefined) queryParams['pageSize'] = String(params.pageSize);

    return this.get<CatalogListResponse<CatalogVenue>>('/api/catalog/venues', queryParams);
  }

  /**
   * Get a single venue by ID.
   */
  async getVenue(id: string): Promise<CatalogVenue> {
    return this.get<CatalogVenue>(`/api/catalog/venues/${encodeURIComponent(id)}`);
  }

  /**
   * List suppliers from the EventFlow catalog.
   */
  async listSuppliers(params?: {
    category?: string;
    location?: string;
    page?: number;
    pageSize?: number;
  }): Promise<CatalogListResponse<CatalogSupplier>> {
    const queryParams: Record<string, string> = {};
    if (params?.category) queryParams['category'] = params.category;
    if (params?.location) queryParams['location'] = params.location;
    if (params?.page !== undefined) queryParams['page'] = String(params.page);
    if (params?.pageSize !== undefined) queryParams['pageSize'] = String(params.pageSize);

    return this.get<CatalogListResponse<CatalogSupplier>>('/api/catalog/suppliers', queryParams);
  }

  /**
   * Get a single supplier by ID.
   */
  async getSupplier(id: string): Promise<CatalogSupplier> {
    return this.get<CatalogSupplier>(`/api/catalog/suppliers/${encodeURIComponent(id)}`);
  }

  /**
   * Health check — verifies the catalog API is reachable and the key is valid.
   * Returns false (not healthy) rather than throwing so callers can degrade gracefully.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }
    try {
      await this.get('/api/catalog/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const catalogService = new CatalogService();
