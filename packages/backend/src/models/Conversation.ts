/**
 * Conversation model — MongoDB / Mongoose implementation
 */
import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';
import { Conversation, Message } from '@jadeassist/shared';
import { logger } from '../utils/logger';

// ── Raw document shapes (what Mongoose stores) ────────────────────────────────

interface ConversationDoc {
  _id: string;
  userId: string;
  eventType?: string;
  eventDate?: Date;
  guestCount?: number;
  budget?: number;
  location?: string;
  planningStage?: string;
  contextCompleteness?: number;
  startedAt: Date;
  updatedAt: Date;
}

interface MessageDoc {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed?: number;
  createdAt: Date;
}

export interface ConversationContextUpdate {
  eventType?: string;
  eventDate?: Date;
  guestCount?: number;
  budget?: number;
  location?: string;
  planningStage?: string;
  contextCompleteness?: number;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const ConversationSchema = new Schema<ConversationDoc>(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    eventType: { type: String, index: true },
    eventDate: Date,
    guestCount: Number,
    budget: Number,
    location: String,
    planningStage: String,
    contextCompleteness: { type: Number, min: 0, max: 100, default: 0 },
  },
  {
    // Map Mongoose timestamp fields to the names used in the shared type
    timestamps: { createdAt: 'startedAt', updatedAt: 'updatedAt' },
  }
);

const MessageSchema = new Schema<MessageDoc>(
  {
    _id: { type: String, default: () => randomUUID() },
    conversationId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ['user', 'assistant', 'system'] },
    content: { type: String, required: true },
    tokensUsed: Number,
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

// Compound index: efficient chronological fetch per conversation
MessageSchema.index({ conversationId: 1, createdAt: 1 });
ConversationSchema.index({ userId: 1, updatedAt: -1 });
ConversationSchema.index({ eventType: 1, updatedAt: -1 });

// ── Mongoose models ───────────────────────────────────────────────────────────

const ConversationMongoose =
  mongoose.models['Conversation'] ??
  mongoose.model<ConversationDoc>('Conversation', ConversationSchema);

const MessageMongoose =
  mongoose.models['Message'] ?? mongoose.model<MessageDoc>('Message', MessageSchema);

// ── Mapping helpers ───────────────────────────────────────────────────────────

function toConversation(doc: ConversationDoc): Conversation {
  return {
    id: doc._id,
    userId: doc.userId,
    eventType: doc.eventType,
    eventDate: doc.eventDate,
    guestCount: doc.guestCount,
    budget: doc.budget,
    location: doc.location,
    planningStage: doc.planningStage,
    contextCompleteness: doc.contextCompleteness,
    startedAt: doc.startedAt,
    updatedAt: doc.updatedAt,
  };
}

function toMessage(doc: MessageDoc): Message {
  return {
    id: doc._id,
    conversationId: doc.conversationId,
    role: doc.role,
    content: doc.content,
    tokensUsed: doc.tokensUsed,
    createdAt: doc.createdAt,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export interface CreateConversationParams {
  id?: string;
  userId: string;
  eventType?: string;
  eventDate?: Date;
  guestCount?: number;
  budget?: number;
  location?: string;
  planningStage?: string;
  contextCompleteness?: number;
}

export class ConversationModel {
  /** Create a new conversation */
  static async create(params: CreateConversationParams): Promise<Conversation> {
    const doc = await ConversationMongoose.create({
      _id: params.id,
      userId: params.userId,
      eventType: params.eventType,
      eventDate: params.eventDate,
      guestCount: params.guestCount,
      budget: params.budget,
      location: params.location,
      planningStage: params.planningStage,
      contextCompleteness: params.contextCompleteness,
    });
    const result = toConversation(doc.toObject() as ConversationDoc);
    logger.info({ conversationId: result.id }, 'Conversation created');
    return result;
  }

  /** Find conversation by ID */
  static async findById(id: string): Promise<Conversation | null> {
    const doc = await ConversationMongoose.findById(id).lean<ConversationDoc>();
    return doc ? toConversation(doc) : null;
  }

  /** Find conversations by user ID, newest first */
  static async findByUserId(userId: string): Promise<Conversation[]> {
    const docs = await ConversationMongoose.find({ userId })
      .sort({ updatedAt: -1 })
      .lean<ConversationDoc[]>();
    return docs.map(toConversation);
  }

  /** Update conversation event type. Kept for existing routes. */
  static async update(id: string, eventType?: string): Promise<Conversation | null> {
    const update = eventType !== undefined
      ? { $set: { eventType } }
      : { $unset: { eventType: '' } };

    const doc = await ConversationMongoose.findByIdAndUpdate(id, update, { new: true })
      .lean<ConversationDoc>();
    if (!doc) return null;
    logger.info({ conversationId: id }, 'Conversation updated');
    return toConversation(doc);
  }

  /** Merge structured planning context into a conversation. */
  static async updateContext(
    id: string,
    context: ConversationContextUpdate
  ): Promise<Conversation | null> {
    const $set: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null && value !== '') {
        $set[key] = value;
      }
    }

    if (Object.keys($set).length === 0) {
      return this.findById(id);
    }

    const doc = await ConversationMongoose.findByIdAndUpdate(
      id,
      { $set },
      { new: true, upsert: false }
    ).lean<ConversationDoc>();

    if (!doc) return null;
    logger.info({ conversationId: id, contextKeys: Object.keys($set) }, 'Conversation context updated');
    return toConversation(doc);
  }

  /** Ensure a conversation exists for the given ID. */
  static async ensureConversation(
    id: string,
    userId: string,
    context?: ConversationContextUpdate
  ): Promise<Conversation> {
    const existing = await this.findById(id);
    if (existing) {
      if (context) {
        return (await this.updateContext(id, context)) ?? existing;
      }
      return existing;
    }

    return this.create({
      id,
      userId,
      ...context,
    });
  }

  /** Delete conversation (cascades to messages via application logic) */
  static async delete(id: string): Promise<boolean> {
    const result = await ConversationMongoose.deleteOne({ _id: id });
    await MessageMongoose.deleteMany({ conversationId: id });
    logger.info({ conversationId: id }, 'Conversation deleted');
    return result.deletedCount > 0;
  }

  /** Add a message to a conversation */
  static async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokensUsed?: number
  ): Promise<Message> {
    const doc = await MessageMongoose.create({ conversationId, role, content, tokensUsed });
    // Touch the conversation's updatedAt
    await ConversationMongoose.findByIdAndUpdate(conversationId, { $set: { updatedAt: new Date() } });
    return toMessage(doc.toObject() as MessageDoc);
  }

  /** Get messages for a conversation in chronological order */
  static async getMessages(conversationId: string, limit = 40): Promise<Message[]> {
    const docs = await MessageMongoose.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<MessageDoc[]>();

    return docs.reverse().map(toMessage);
  }
}
