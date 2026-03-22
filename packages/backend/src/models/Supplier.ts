/**
 * Supplier model — MongoDB / Mongoose implementation
 *
 * Also includes seedIfEmpty() which inserts the sample UK suppliers on first
 * startup (equivalent to the INSERT statements in the old schema.sql).
 */
import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { SupplierCategory } from '@jadeassist/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Raw document shape ────────────────────────────────────────────────────────

interface SupplierDoc {
  _id: string;
  name: string;
  category: string;
  location?: string;
  postcode?: string;
  description?: string;
  rating: number;
  region?: string;
  createdAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const SupplierSchema = new Schema<SupplierDoc>(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    location: String,
    postcode: { type: String, index: true },
    description: String,
    rating: { type: Number, default: 0, index: true },
    region: { type: String, index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

// ── Mongoose model ────────────────────────────────────────────────────────────

const SupplierMongoose =
  mongoose.models['Supplier'] ?? mongoose.model<SupplierDoc>('Supplier', SupplierSchema);

// ── Mapping helper ────────────────────────────────────────────────────────────

function toSupplier(doc: SupplierDoc): Supplier {
  return {
    id: doc._id,
    name: doc.name,
    category: doc.category as SupplierCategory,
    location: doc.location ?? '',
    postcode: doc.postcode ?? '',
    description: doc.description ?? '',
    rating: doc.rating,
    region: doc.region ?? '',
    createdAt: doc.createdAt,
  };
}

// ── Seed data (mirrors the INSERT statements in database/schema.sql) ───────────

const SAMPLE_SUPPLIERS: CreateSupplierParams[] = [
  {
    name: 'The Grand Hall',
    category: 'venue',
    location: 'London',
    postcode: 'SW1A',
    description: 'Elegant Victorian venue in central London',
    rating: 4.8,
    region: 'London',
  },
  {
    name: 'Delicious Catering Co',
    category: 'catering',
    location: 'Manchester',
    postcode: 'M1',
    description: 'Award-winning catering service',
    rating: 4.7,
    region: 'North West',
  },
  {
    name: 'Perfect Shots Photography',
    category: 'photographer',
    location: 'Birmingham',
    postcode: 'B1',
    description: 'Professional event photography',
    rating: 4.9,
    region: 'Midlands',
  },
  {
    name: 'Blooms & Petals',
    category: 'florist',
    location: 'Edinburgh',
    postcode: 'EH1',
    description: 'Beautiful floral arrangements',
    rating: 4.6,
    region: 'Scotland',
  },
  {
    name: 'Sound & Vision Events',
    category: 'entertainment',
    location: 'Bristol',
    postcode: 'BS1',
    description: 'DJ and live entertainment services',
    rating: 4.5,
    region: 'South West',
  },
  {
    name: 'Elite Event Styling',
    category: 'decorator',
    location: 'Leeds',
    postcode: 'LS1',
    description: 'Contemporary event decoration and styling',
    rating: 4.7,
    region: 'Yorkshire',
  },
  {
    name: 'Luxury Transport Solutions',
    category: 'transport',
    location: 'Cardiff',
    postcode: 'CF10',
    description: 'Premium event transportation',
    rating: 4.8,
    region: 'Wales',
  },
];

/** Escape special regex characters in a string for safe use in a RegExp. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SupplierModel {
  /**
   * Insert sample suppliers if the collection is empty.
   * Called once at server startup — equivalent to the schema.sql INSERT block.
   */
  static async seedIfEmpty(): Promise<void> {
    const count = await SupplierMongoose.countDocuments();
    if (count > 0) return;
    await SupplierMongoose.insertMany(
      SAMPLE_SUPPLIERS.map((s) => ({ ...s, _id: randomUUID() }))
    );
    logger.info({ count: SAMPLE_SUPPLIERS.length }, 'Suppliers collection seeded');
  }

  /** Create a new supplier */
  static async create(params: CreateSupplierParams): Promise<Supplier> {
    const doc = await SupplierMongoose.create({ ...params });
    const result = toSupplier(doc.toObject() as SupplierDoc);
    logger.info({ supplierId: result.id }, 'Supplier created');
    return result;
  }

  /** Find supplier by ID */
  static async findById(id: string): Promise<Supplier | null> {
    const doc = await SupplierMongoose.findById(id).lean<SupplierDoc>();
    return doc ? toSupplier(doc) : null;
  }

  /** Search suppliers with optional filters */
  static async search(params: SearchSuppliersParams): Promise<Supplier[]> {
    const filter: Record<string, unknown> = {};

    if (params.category) filter['category'] = params.category;
    if (params.postcode) filter['postcode'] = { $regex: `^${escapeRegex(params.postcode)}`, $options: 'i' };
    if (params.region) filter['region'] = params.region;
    if (params.minRating !== undefined) filter['rating'] = { $gte: params.minRating };

    const limit = params.limit ?? 50;

    const docs = await SupplierMongoose.find(filter)
      .sort({ rating: -1, name: 1 })
      .limit(limit)
      .lean<SupplierDoc[]>();

    return docs.map(toSupplier);
  }

  /** Get all suppliers by category */
  static async findByCategory(category: SupplierCategory): Promise<Supplier[]> {
    const docs = await SupplierMongoose.find({ category })
      .sort({ rating: -1, name: 1 })
      .lean<SupplierDoc[]>();
    return docs.map(toSupplier);
  }

  /** Update supplier fields */
  static async update(id: string, params: Partial<CreateSupplierParams>): Promise<Supplier | null> {
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) set[key] = value;
    }

    if (Object.keys(set).length === 0) {
      return SupplierModel.findById(id);
    }

    const doc = await SupplierMongoose.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true }
    ).lean<SupplierDoc>();

    if (!doc) return null;
    logger.info({ supplierId: id }, 'Supplier updated');
    return toSupplier(doc);
  }

  /** Delete supplier */
  static async delete(id: string): Promise<boolean> {
    const result = await SupplierMongoose.deleteOne({ _id: id });
    logger.info({ supplierId: id }, 'Supplier deleted');
    return result.deletedCount > 0;
  }
}
