/**
 * EventPlan model — MongoDB / Mongoose implementation
 */
import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';
import { EventPlan, EventType, TimelineItem, ChecklistItem } from '@jadeassist/shared';
import { logger } from '../utils/logger';

// ── Raw document shape ────────────────────────────────────────────────────────

interface EventPlanDoc {
  _id: string;
  userId: string;
  conversationId: string;
  eventType: string;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
  postcode?: string;
  timeline: unknown[];
  checklist: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const EventPlanSchema = new Schema<EventPlanDoc>(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    budget: Number,
    guestCount: Number,
    eventDate: Date,
    location: String,
    postcode: { type: String, index: true },
    timeline: { type: [Schema.Types.Mixed], default: [] },
    checklist: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

// ── Mongoose model ────────────────────────────────────────────────────────────

const EventPlanMongoose =
  mongoose.models['EventPlan'] ??
  mongoose.model<EventPlanDoc>('EventPlan', EventPlanSchema);

// ── Mapping helper ────────────────────────────────────────────────────────────

function toEventPlan(doc: EventPlanDoc): EventPlan {
  return {
    id: doc._id,
    userId: doc.userId,
    conversationId: doc.conversationId,
    eventType: doc.eventType as EventType,
    budget: doc.budget,
    guestCount: doc.guestCount,
    eventDate: doc.eventDate,
    location: doc.location,
    postcode: doc.postcode,
    timeline: doc.timeline as TimelineItem[],
    checklist: doc.checklist as ChecklistItem[],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export interface CreateEventPlanParams {
  userId: string;
  conversationId: string;
  eventType: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
  postcode?: string;
}

export interface UpdateEventPlanParams {
  eventType?: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
  postcode?: string;
  timeline?: TimelineItem[];
  checklist?: ChecklistItem[];
}

export class EventPlanModel {
  /** Create a new event plan */
  static async create(params: CreateEventPlanParams): Promise<EventPlan> {
    const doc = await EventPlanMongoose.create({ ...params });
    const result = toEventPlan(doc.toObject() as EventPlanDoc);
    logger.info({ eventPlanId: result.id }, 'Event plan created');
    return result;
  }

  /** Find event plan by ID */
  static async findById(id: string): Promise<EventPlan | null> {
    const doc = await EventPlanMongoose.findById(id).lean<EventPlanDoc>();
    return doc ? toEventPlan(doc) : null;
  }

  /** Find event plans by user ID, newest first */
  static async findByUserId(userId: string): Promise<EventPlan[]> {
    const docs = await EventPlanMongoose.find({ userId })
      .sort({ updatedAt: -1 })
      .lean<EventPlanDoc[]>();
    return docs.map(toEventPlan);
  }

  /** Find event plan by conversation ID */
  static async findByConversationId(conversationId: string): Promise<EventPlan | null> {
    const doc = await EventPlanMongoose.findOne({ conversationId }).lean<EventPlanDoc>();
    return doc ? toEventPlan(doc) : null;
  }

  /** Update event plan fields */
  static async update(id: string, params: UpdateEventPlanParams): Promise<EventPlan | null> {
    // Build a $set object containing only defined fields
    const set: Record<string, unknown> = {};
    if (params.eventType !== undefined) set['eventType'] = params.eventType;
    if (params.budget !== undefined) set['budget'] = params.budget;
    if (params.guestCount !== undefined) set['guestCount'] = params.guestCount;
    if (params.eventDate !== undefined) set['eventDate'] = params.eventDate;
    if (params.location !== undefined) set['location'] = params.location;
    if (params.postcode !== undefined) set['postcode'] = params.postcode;
    if (params.timeline !== undefined) set['timeline'] = params.timeline;
    if (params.checklist !== undefined) set['checklist'] = params.checklist;

    if (Object.keys(set).length === 0) {
      return EventPlanModel.findById(id);
    }

    const doc = await EventPlanMongoose.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true }
    ).lean<EventPlanDoc>();

    if (!doc) return null;
    logger.info({ eventPlanId: id }, 'Event plan updated');
    return toEventPlan(doc);
  }

  /** Delete event plan */
  static async delete(id: string): Promise<boolean> {
    const result = await EventPlanMongoose.deleteOne({ _id: id });
    logger.info({ eventPlanId: id }, 'Event plan deleted');
    return result.deletedCount > 0;
  }
}
