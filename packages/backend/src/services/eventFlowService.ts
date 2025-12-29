/**
 * EventFlow Integration Service
 * Handles communication with event-flow.co.uk platform
 */
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface EventFlowSupplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  price: string;
  distance: number;
  description: string;
  contact: string;
  messagingUrl?: string;
  eventFlowId?: string;
}

export interface EventFlowMessagingParams {
  supplierId: string;
  userId: string;
  eventType: string;
  message?: string;
}

class EventFlowService {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor() {
    this.baseUrl = env.eventflow.apiUrl || 'https://event-flow.co.uk/api';
    this.apiKey = env.eventflow.apiKey;
  }

  /**
   * Get suppliers from EventFlow database
   */
  async getSuppliers(params: {
    category: string;
    postcode?: string;
    minRating?: number;
    limit?: number;
  }): Promise<EventFlowSupplier[]> {
    try {
      // If EventFlow API is not configured, return empty array
      if (!this.apiKey) {
        logger.debug('EventFlow API key not configured, skipping external supplier fetch');
        return [];
      }

      const queryParams = new URLSearchParams({
        category: params.category,
        ...(params.postcode && { postcode: params.postcode }),
        ...(params.minRating && { minRating: params.minRating.toString() }),
        ...(params.limit && { limit: params.limit.toString() }),
      });

      const response = await fetch(`${this.baseUrl}/suppliers?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status, category: params.category },
          'Failed to fetch EventFlow suppliers'
        );
        return [];
      }

      const data = (await response.json()) as { suppliers: EventFlowSupplier[] };
      return data.suppliers || [];
    } catch (error) {
      logger.error({ error, params }, 'Error fetching EventFlow suppliers');
      return [];
    }
  }

  /**
   * Generate messaging URL for supplier
   */
  generateMessagingUrl(params: EventFlowMessagingParams): string {
    const { supplierId, userId, eventType, message } = params;

    // Build query parameters
    const queryParams = new URLSearchParams({
      supplier: supplierId,
      user: userId,
      eventType,
      ...(message && { initialMessage: message }),
    });

    return `${this.baseUrl}/messages/new?${queryParams.toString()}`;
  }

  /**
   * Initiate supplier messaging
   * Returns URL to EventFlow messaging system
   */
  initiateSupplierMessaging(params: EventFlowMessagingParams): {
    messagingUrl: string;
    supplierId: string;
  } {
    const messagingUrl = this.generateMessagingUrl(params);

    logger.info(
      { supplierId: params.supplierId, userId: params.userId },
      'Initiated supplier messaging'
    );

    return {
      messagingUrl,
      supplierId: params.supplierId,
    };
  }

  /**
   * Track event for analytics
   */
  async trackEvent(eventName: string, properties: Record<string, unknown>): Promise<void> {
    try {
      if (!this.apiKey) {
        logger.debug('EventFlow API key not configured, skipping event tracking');
        return;
      }

      await fetch(`${this.baseUrl}/analytics/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: eventName,
          properties,
          timestamp: new Date().toISOString(),
        }),
      });

      logger.debug({ eventName }, 'Event tracked');
    } catch (error) {
      logger.error({ error, eventName }, 'Failed to track event');
      // Don't throw - analytics failures shouldn't break user experience
    }
  }

  /**
   * Check if EventFlow integration is enabled
   */
  isEnabled(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const eventFlowService = new EventFlowService();
