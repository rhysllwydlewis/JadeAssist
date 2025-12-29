/**
 * EventPlan model and database operations
 */
import { query } from '../config/database';
import { EventPlan, EventType, TimelineItem, ChecklistItem } from '@jadeassist/shared';
import { logger } from '../utils/logger';

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
  /**
   * Create a new event plan
   */
  static async create(params: CreateEventPlanParams): Promise<EventPlan> {
    const result = await query<EventPlan>(
      `INSERT INTO event_plans (
        id, user_id, conversation_id, event_type, budget, guest_count, 
        event_date, location, postcode, timeline, checklist, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, '[]'::json, '[]'::json, NOW(), NOW()
      )
      RETURNING *`,
      [
        params.userId,
        params.conversationId,
        params.eventType,
        params.budget,
        params.guestCount,
        params.eventDate,
        params.location,
        params.postcode,
      ]
    );

    logger.info({ eventPlanId: result.rows[0].id }, 'Event plan created');
    return result.rows[0];
  }

  /**
   * Find event plan by ID
   */
  static async findById(id: string): Promise<EventPlan | null> {
    const result = await query<EventPlan>('SELECT * FROM event_plans WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find event plans by user ID
   */
  static async findByUserId(userId: string): Promise<EventPlan[]> {
    const result = await query<EventPlan>(
      'SELECT * FROM event_plans WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  }

  /**
   * Find event plan by conversation ID
   */
  static async findByConversationId(conversationId: string): Promise<EventPlan | null> {
    const result = await query<EventPlan>(
      'SELECT * FROM event_plans WHERE conversation_id = $1',
      [conversationId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update event plan
   */
  static async update(id: string, params: UpdateEventPlanParams): Promise<EventPlan | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (params.eventType !== undefined) {
      updates.push(`event_type = $${paramCount++}`);
      values.push(params.eventType);
    }

    if (params.budget !== undefined) {
      updates.push(`budget = $${paramCount++}`);
      values.push(params.budget);
    }

    if (params.guestCount !== undefined) {
      updates.push(`guest_count = $${paramCount++}`);
      values.push(params.guestCount);
    }

    if (params.eventDate !== undefined) {
      updates.push(`event_date = $${paramCount++}`);
      values.push(params.eventDate);
    }

    if (params.location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(params.location);
    }

    if (params.postcode !== undefined) {
      updates.push(`postcode = $${paramCount++}`);
      values.push(params.postcode);
    }

    if (params.timeline !== undefined) {
      updates.push(`timeline = $${paramCount++}`);
      values.push(JSON.stringify(params.timeline));
    }

    if (params.checklist !== undefined) {
      updates.push(`checklist = $${paramCount++}`);
      values.push(JSON.stringify(params.checklist));
    }

    if (updates.length === 0) {
      return await EventPlanModel.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query<EventPlan>(
      `UPDATE event_plans SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    logger.info({ eventPlanId: id }, 'Event plan updated');
    return result.rows[0] || null;
  }

  /**
   * Delete event plan
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM event_plans WHERE id = $1', [id]);
    logger.info({ eventPlanId: id }, 'Event plan deleted');
    return (result.rowCount ?? 0) > 0;
  }
}
