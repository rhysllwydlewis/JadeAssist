/**
 * User model — MongoDB / Mongoose implementation
 */
import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';
import { User, AuthProvider } from '@jadeassist/shared';
import { logger } from '../utils/logger';

// ── Raw document shape ────────────────────────────────────────────────────────

interface UserDoc {
  _id: string;
  email?: string;
  name?: string;
  authProvider: AuthProvider;
  authId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const UserSchema = new Schema<UserDoc>(
  {
    _id: { type: String, default: () => randomUUID() },
    email: { type: String, sparse: true },
    name: String,
    authProvider: { type: String, required: true },
    authId: { type: String, required: true },
  },
  { timestamps: true }
);

// Unique email (sparse allows multiple documents with no email)
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
// Unique auth provider + authId combination
UserSchema.index({ authProvider: 1, authId: 1 }, { unique: true });

// ── Mongoose model ────────────────────────────────────────────────────────────

const UserMongoose =
  mongoose.models['User'] ?? mongoose.model<UserDoc>('User', UserSchema);

// ── Mapping helper ────────────────────────────────────────────────────────────

function toUser(doc: UserDoc): User {
  return {
    id: doc._id,
    email: doc.email,
    name: doc.name,
    authProvider: doc.authProvider,
    authId: doc.authId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export interface CreateUserParams {
  email?: string;
  name?: string;
  authProvider: AuthProvider;
  authId: string;
}

export interface UpdateUserParams {
  email?: string;
  name?: string;
}

export class UserModel {
  /** Create a new user */
  static async create(params: CreateUserParams): Promise<User> {
    const doc = await UserMongoose.create({ ...params });
    const result = toUser(doc.toObject() as UserDoc);
    logger.info({ userId: result.id }, 'User created');
    return result;
  }

  /** Find user by ID */
  static async findById(id: string): Promise<User | null> {
    const doc = await UserMongoose.findById(id).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  }

  /** Find user by email */
  static async findByEmail(email: string): Promise<User | null> {
    const doc = await UserMongoose.findOne({ email }).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  }

  /** Find user by auth provider and ID */
  static async findByAuthId(authProvider: AuthProvider, authId: string): Promise<User | null> {
    const doc = await UserMongoose.findOne({ authProvider, authId }).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  }

  /** Update user fields */
  static async update(id: string, params: UpdateUserParams): Promise<User | null> {
    const set: Record<string, unknown> = {};
    if (params.email !== undefined) set['email'] = params.email;
    if (params.name !== undefined) set['name'] = params.name;

    if (Object.keys(set).length === 0) {
      return UserModel.findById(id);
    }

    const doc = await UserMongoose.findByIdAndUpdate(id, { $set: set }, { new: true }).lean<UserDoc>();
    if (!doc) return null;
    logger.info({ userId: id }, 'User updated');
    return toUser(doc);
  }

  /** Delete user */
  static async delete(id: string): Promise<boolean> {
    const result = await UserMongoose.deleteOne({ _id: id });
    logger.info({ userId: id }, 'User deleted');
    return result.deletedCount > 0;
  }
}
