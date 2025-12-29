/**
 * Conversation model and database operations
 */
import { query } from '../config/database';
import { Conversation, Message } from '@jadeassist/shared';
import { logger } from '../utils/logger';

export interface CreateConversationParams {
  userId: string;
  eventType?: string;
}

export class ConversationModel {
  /**
   * Create a new conversation
   */
  static async create(params: CreateConversationParams): Promise<Conversation> {
    const result = await query<Conversation>(
      `INSERT INTO conversations (id, user_id, event_type, started_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING *`,
      [params.userId, params.eventType]
    );

    logger.info({ conversationId: result.rows[0].id }, 'Conversation created');
    return result.rows[0];
  }

  /**
   * Find conversation by ID
   */
  static async findById(id: string): Promise<Conversation | null> {
    const result = await query<Conversation>('SELECT * FROM conversations WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find conversations by user ID
   */
  static async findByUserId(userId: string): Promise<Conversation[]> {
    const result = await query<Conversation>(
      'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return result.rows;
  }

  /**
   * Update conversation
   */
  static async update(id: string, eventType?: string): Promise<Conversation | null> {
    const result = await query<Conversation>(
      `UPDATE conversations 
       SET event_type = COALESCE($1, event_type), updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [eventType, id]
    );

    logger.info({ conversationId: id }, 'Conversation updated');
    return result.rows[0] || null;
  }

  /**
   * Delete conversation
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM conversations WHERE id = $1', [id]);
    logger.info({ conversationId: id }, 'Conversation deleted');
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Add message to conversation
   */
  static async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokensUsed?: number
  ): Promise<Message> {
    const result = await query<Message>(
      `INSERT INTO messages (id, conversation_id, role, content, tokens_used, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [conversationId, role, content, tokensUsed]
    );

    // Update conversation timestamp
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

    return result.rows[0];
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(conversationId: string): Promise<Message[]> {
    const result = await query<Message>(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    return result.rows;
  }
}
