/**
 * Analytics Service - Track metrics and conversions
 */
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { eventFlowService } from './eventFlowService';

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  userId?: string;
  properties: Record<string, unknown>;
  timestamp: Date;
}

export interface AnalyticsMetrics {
  conversationsStarted: number;
  plansCreated: number;
  upgradeRequests: number;
  conversionRate: number;
  popularEventTypes: Array<{ eventType: string; count: number }>;
  avgResponseTime: number;
}

class AnalyticsService {
  /**
   * Track an analytics event
   */
  async trackEvent(
    eventName: string,
    userId: string | undefined,
    properties: Record<string, unknown>
  ): Promise<void> {
    try {
      // Store in database
      await query(
        `INSERT INTO analytics_events (id, event_name, user_id, properties, timestamp)
         VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
        [eventName, userId || null, JSON.stringify(properties)]
      );

      // Also send to EventFlow if enabled
      if (eventFlowService.isEnabled()) {
        await eventFlowService.trackEvent(eventName, {
          ...properties,
          userId,
        });
      }

      logger.debug({ eventName, userId }, 'Analytics event tracked');
    } catch (error) {
      // Don't throw - analytics failures shouldn't break user experience
      logger.error({ error, eventName }, 'Failed to track analytics event');
    }
  }

  /**
   * Get metrics for a date range
   */
  async getMetrics(startDate: Date, endDate: Date): Promise<AnalyticsMetrics> {
    try {
      // Get conversation metrics
      const conversationsResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM conversations 
         WHERE started_at BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      // Get plan metrics
      const plansResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM event_plans 
         WHERE created_at BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      // Get upgrade requests (escalation events)
      const upgradesResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM analytics_events 
         WHERE event_name = 'escalation_accepted' 
         AND timestamp BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      // Get popular event types
      const eventTypesResult = await query<{ event_type: string; count: string }>(
        `SELECT event_type, COUNT(*) as count FROM event_plans 
         WHERE created_at BETWEEN $1 AND $2 
         GROUP BY event_type 
         ORDER BY count DESC 
         LIMIT 10`,
        [startDate, endDate]
      );

      const conversationsStarted = parseInt(conversationsResult.rows[0]?.count || '0', 10);
      const plansCreated = parseInt(plansResult.rows[0]?.count || '0', 10);
      const upgradeRequests = parseInt(upgradesResult.rows[0]?.count || '0', 10);

      // Calculate conversion rate (plans -> upgrades)
      const conversionRate =
        plansCreated > 0 ? (upgradeRequests / plansCreated) * 100 : 0;

      const popularEventTypes = eventTypesResult.rows.map((row) => ({
        eventType: row.event_type,
        count: parseInt(row.count, 10),
      }));

      logger.info({ startDate, endDate }, 'Analytics metrics retrieved');

      return {
        conversationsStarted,
        plansCreated,
        upgradeRequests,
        conversionRate: Math.round(conversionRate * 100) / 100,
        popularEventTypes,
        avgResponseTime: 0, // TODO: Calculate from message timestamps
      };
    } catch (error) {
      logger.error({ error, startDate, endDate }, 'Failed to get analytics metrics');
      // Return empty metrics on error
      return {
        conversationsStarted: 0,
        plansCreated: 0,
        upgradeRequests: 0,
        conversionRate: 0,
        popularEventTypes: [],
        avgResponseTime: 0,
      };
    }
  }

  /**
   * Track conversation started
   */
  async trackConversationStarted(userId: string, eventType?: string): Promise<void> {
    await this.trackEvent('conversation_started', userId, {
      eventType,
    });
  }

  /**
   * Track plan created
   */
  async trackPlanCreated(
    userId: string,
    planId: string,
    eventType: string,
    budget?: number,
    guestCount?: number
  ): Promise<void> {
    await this.trackEvent('plan_created', userId, {
      planId,
      eventType,
      budget,
      guestCount,
    });
  }

  /**
   * Track escalation offered
   */
  async trackEscalationOffered(
    userId: string,
    reason: string,
    confidence: number
  ): Promise<void> {
    await this.trackEvent('escalation_offered', userId, {
      reason,
      confidence,
    });
  }

  /**
   * Track escalation accepted
   */
  async trackEscalationAccepted(userId: string, planId?: string): Promise<void> {
    await this.trackEvent('escalation_accepted', userId, {
      planId,
    });
  }

  /**
   * Track supplier viewed
   */
  async trackSupplierViewed(
    userId: string,
    supplierId: string,
    category: string
  ): Promise<void> {
    await this.trackEvent('supplier_viewed', userId, {
      supplierId,
      category,
    });
  }

  /**
   * Track supplier contacted
   */
  async trackSupplierContacted(
    userId: string,
    supplierId: string,
    category: string
  ): Promise<void> {
    await this.trackEvent('supplier_contacted', userId, {
      supplierId,
      category,
    });
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
