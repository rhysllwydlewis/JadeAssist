/**
 * Event Calculation Service - Budget and cost calculations
 */
import {
  EventType,
  EventCalculations,
  BudgetAllocation,
  EVENT_TYPE_METADATA,
} from '@jadeassist/shared';
import { DEFAULT_BUDGET_ALLOCATIONS } from '../utils/constants';
import { logger } from '../utils/logger';

export interface CalculationInput {
  eventType: EventType;
  budget: number;
  guestCount: number;
}

class EventCalcService {
  /**
   * Calculate budget allocations and per-head costs
   */
  calculateBudget(input: CalculationInput): EventCalculations {
    try {
      const { eventType, budget, guestCount } = input;

      // Get allocation percentages for this event type
      const allocationPercentages = DEFAULT_BUDGET_ALLOCATIONS[eventType];

      // Calculate allocations
      const allocations: BudgetAllocation[] = Object.entries(allocationPercentages).map(
        ([category, percentage]) => {
          const amount = (budget * percentage) / 100;
          return {
            category,
            amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
            percentage,
            description: this.getCategoryDescription(category),
          };
        }
      );

      // Calculate per-head cost
      const perHeadCost = guestCount > 0 ? budget / guestCount : 0;

      // Calculate contingency (typically 10% of budget)
      const contingency = budget * 0.1;

      logger.info({ eventType, budget, guestCount }, 'Budget calculated');

      return {
        totalBudget: budget,
        allocations,
        guestCount,
        perHeadCost: Math.round(perHeadCost * 100) / 100,
        contingency: Math.round(contingency * 100) / 100,
      };
    } catch (error) {
      logger.error({ error, input }, 'Budget calculation failed');
      throw error;
    }
  }

  /**
   * Estimate budget based on event type and guest count
   */
  estimateBudget(eventType: EventType, guestCount: number): number {
    const metadata = EVENT_TYPE_METADATA[eventType];

    if (!metadata) {
      return 0;
    }

    // Use average of min and max budget
    const avgBudget = (metadata.averageBudget.min + metadata.averageBudget.max) / 2;

    // Adjust based on guest count
    const avgGuestCount = (metadata.averageGuestCount.min + metadata.averageGuestCount.max) / 2;
    const guestRatio = guestCount / avgGuestCount;

    const estimatedBudget = avgBudget * guestRatio;

    logger.debug({ eventType, guestCount, estimatedBudget }, 'Budget estimated');

    return Math.round(estimatedBudget);
  }

  /**
   * Calculate cost per guest
   */
  calculatePerGuestCost(budget: number, guestCount: number): number {
    if (guestCount === 0) {
      return 0;
    }

    return Math.round((budget / guestCount) * 100) / 100;
  }

  /**
   * Validate budget against event type ranges
   */
  validateBudget(
    eventType: EventType,
    budget: number
  ): {
    valid: boolean;
    message?: string;
    suggestion?: number;
  } {
    const metadata = EVENT_TYPE_METADATA[eventType];

    if (!metadata) {
      return { valid: true };
    }

    const { min, max } = metadata.averageBudget;

    if (budget < min) {
      return {
        valid: false,
        message: `Budget is below typical range for ${metadata.displayName}`,
        suggestion: min,
      };
    }

    if (budget > max * 2) {
      return {
        valid: true,
        message: `Budget is significantly above typical range. Luxury options available.`,
      };
    }

    return { valid: true };
  }

  /**
   * Get description for budget category
   */
  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      venue: 'Location rental and facility fees',
      catering: 'Food, beverages, and catering services',
      photographer: 'Photography and photo services',
      videographer: 'Video recording and editing',
      entertainment: 'Entertainment, music, and performers',
      florist: 'Flowers and floral arrangements',
      decorator: 'Decorations and styling',
      stationery: 'Invitations, programs, and printed materials',
      transport: 'Transportation and parking',
      accommodation: 'Guest accommodation',
      equipment: 'Audio-visual and technical equipment',
      beauty: 'Hair, makeup, and beauty services',
      other: 'Miscellaneous expenses and contingency',
    };

    return descriptions[category] || 'Additional expenses';
  }
}

// Export singleton instance
export const eventCalcService = new EventCalcService();
