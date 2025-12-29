/**
 * Supplier model and database operations
 */
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { SupplierCategory } from '@jadeassist/shared';

export interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  location: string;
  postcode: string;
  description: string;
  rating: number;
  region: string;
  createdAt: Date;
}

export interface CreateSupplierParams {
  name: string;
  category: SupplierCategory;
  location: string;
  postcode: string;
  description: string;
  rating?: number;
  region: string;
}

export interface SearchSuppliersParams {
  category?: SupplierCategory;
  postcode?: string;
  region?: string;
  minRating?: number;
  limit?: number;
}

export class SupplierModel {
  /**
   * Create a new supplier
   */
  static async create(params: CreateSupplierParams): Promise<Supplier> {
    const result = await query<Supplier>(
      `INSERT INTO suppliers (
        id, name, category, location, postcode, description, rating, region, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        params.name,
        params.category,
        params.location,
        params.postcode,
        params.description,
        params.rating ?? 0,
        params.region,
      ]
    );

    logger.info({ supplierId: result.rows[0].id }, 'Supplier created');
    return result.rows[0];
  }

  /**
   * Find supplier by ID
   */
  static async findById(id: string): Promise<Supplier | null> {
    const result = await query<Supplier>('SELECT * FROM suppliers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Search suppliers with filters
   */
  static async search(params: SearchSuppliersParams): Promise<Supplier[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (params.category) {
      conditions.push(`category = $${paramCount++}`);
      values.push(params.category);
    }

    if (params.postcode) {
      // Match first part of postcode (e.g., "SW1" from "SW1A 1AA")
      conditions.push(`postcode ILIKE $${paramCount++}`);
      values.push(`${params.postcode}%`);
    }

    if (params.region) {
      conditions.push(`region = $${paramCount++}`);
      values.push(params.region);
    }

    if (params.minRating !== undefined) {
      conditions.push(`rating >= $${paramCount++}`);
      values.push(params.minRating);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = params.limit ?? 50;

    const result = await query<Supplier>(
      `SELECT * FROM suppliers 
       ${whereClause}
       ORDER BY rating DESC, name ASC
       LIMIT $${paramCount}`,
      [...values, limit]
    );

    return result.rows;
  }

  /**
   * Get all suppliers by category
   */
  static async findByCategory(category: SupplierCategory): Promise<Supplier[]> {
    const result = await query<Supplier>(
      'SELECT * FROM suppliers WHERE category = $1 ORDER BY rating DESC, name ASC',
      [category]
    );
    return result.rows;
  }

  /**
   * Update supplier
   */
  static async update(id: string, params: Partial<CreateSupplierParams>): Promise<Supplier | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return await SupplierModel.findById(id);
    }

    values.push(id);

    const result = await query<Supplier>(
      `UPDATE suppliers SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    logger.info({ supplierId: id }, 'Supplier updated');
    return result.rows[0] || null;
  }

  /**
   * Delete supplier
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM suppliers WHERE id = $1', [id]);
    logger.info({ supplierId: id }, 'Supplier deleted');
    return (result.rowCount ?? 0) > 0;
  }
}
