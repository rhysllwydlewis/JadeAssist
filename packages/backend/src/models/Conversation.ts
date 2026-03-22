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

// ── Schemas ───────────────────────────────────────────────────────────────────

const ConversationSchema = new Schema<ConversationDoc>(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    eventType: String,
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
  userId: string;
  eventType?: string;
}

export class ConversationModel {
  /** Create a new conversation */
  static async create(params: CreateConversationParams): Promise<Conversation> {
    const doc = await ConversationMongoose.create({
      userId: params.userId,
      eventType: params.eventType,
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

  /** Update conversation event type */
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
  static async getMessages(conversationId: string): Promise<Message[]> {
    const docs = await MessageMongoose.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean<MessageDoc[]>();
    return docs.map(toMessage);
  }
}
