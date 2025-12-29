/**
 * Escalation Service - Detects when users need human assistance
 */
import { logger } from '../utils/logger';

export interface EscalationDetectionResult {
  shouldEscalate: boolean;
  confidence: number;
  reason?: string;
  suggestedMessage?: string;
}

class EscalationService {
  // Keywords that indicate user overwhelm or need for human help
  private readonly overwhelmKeywords = [
    'too much',
    'overwhelmed',
    'confused',
    'complicated',
    'difficult',
    'help me',
    'need help',
    "can't handle",
    'stressed',
    'too hard',
  ];

  private readonly directRequestKeywords = [
    'call me',
    'phone me',
    'speak to someone',
    'human help',
    'real person',
    'talk to someone',
    'contact me',
    'can you call',
    'negotiate',
    'negotiate for me',
    'handle this for me',
    'do this for me',
  ];

  private readonly budgetConcernKeywords = [
    'too expensive',
    'over budget',
    'cannot afford',
    "can't afford",
    'cheaper option',
    'save money',
    'reduce cost',
  ];

  /**
   * Detect if message indicates user needs escalation
   */
  detectEscalation(message: string, conversationHistory?: string[]): EscalationDetectionResult {
    const lowerMessage = message.toLowerCase();
    
    // Check for direct requests for human help
    const hasDirectRequest = this.directRequestKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    );

    if (hasDirectRequest) {
      logger.info({ message }, 'Direct escalation request detected');
      return {
        shouldEscalate: true,
        confidence: 0.95,
        reason: 'User directly requested human assistance',
        suggestedMessage:
          "I understand you'd like to speak with someone personally. Our human event planners can help with complex negotiations, venue calls, and hands-on coordination. Would you like me to connect you with our team?",
      };
    }

    // Check for overwhelm indicators
    const hasOverwhelm = this.overwhelmKeywords.some((keyword) => lowerMessage.includes(keyword));

    if (hasOverwhelm) {
      logger.info({ message }, 'Overwhelm detected');
      return {
        shouldEscalate: true,
        confidence: 0.75,
        reason: 'User appears overwhelmed',
        suggestedMessage:
          "I can see this is feeling like a lot! If you'd prefer, I can connect you with one of our experienced event planners who can take over some of the heavy lifting. They can make calls, negotiate with suppliers, and handle the details for you. Interested?",
      };
    }

    // Check for budget concerns
    const hasBudgetConcern = this.budgetConcernKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    );

    if (hasBudgetConcern) {
      logger.info({ message }, 'Budget concern detected');
      return {
        shouldEscalate: true,
        confidence: 0.6,
        reason: 'User has budget concerns',
        suggestedMessage:
          "I understand budget is a concern. Our human planners have relationships with suppliers and can often negotiate better rates on your behalf. They might be able to help you get more value for your budget. Would you like to explore that option?",
      };
    }

    // Check conversation length - long conversations might indicate complexity
    if (conversationHistory && conversationHistory.length > 20) {
      logger.debug({ messageCount: conversationHistory.length }, 'Long conversation detected');
      return {
        shouldEscalate: true,
        confidence: 0.5,
        reason: 'Extended conversation indicates complexity',
        suggestedMessage:
          "We've covered quite a lot! If you'd like more hands-on support, our human event planners can step in to help coordinate everything. They're great at pulling all the pieces together. Would that be helpful?",
      };
    }

    return {
      shouldEscalate: false,
      confidence: 0,
    };
  }

  /**
   * Check if escalation should be offered based on event complexity
   */
  shouldOfferEscalationForEvent(params: {
    guestCount?: number;
    budget?: number;
    eventType?: string;
  }): EscalationDetectionResult {
    const { guestCount, budget, eventType } = params;

    // Large events
    if (guestCount && guestCount > 200) {
      return {
        shouldEscalate: true,
        confidence: 0.8,
        reason: 'Large guest count',
        suggestedMessage:
          "Planning an event for over 200 guests is a significant undertaking! Our professional planners specialize in large events and can handle supplier coordination, logistics, and day-of management. Would you like their support?",
      };
    }

    // High budget events
    if (budget && budget > 50000) {
      return {
        shouldEscalate: true,
        confidence: 0.75,
        reason: 'High budget event',
        suggestedMessage:
          "With a substantial budget like this, you'll want to ensure every detail is perfect. Our expert planners can leverage their industry connections to maximize your investment and handle all the high-level coordination. Interested in learning more?",
      };
    }

    // Complex event types
    if (eventType && ['wedding', 'corporate', 'conference'].includes(eventType)) {
      return {
        shouldEscalate: true,
        confidence: 0.6,
        reason: 'Complex event type',
        suggestedMessage:
          "These types of events can get quite detailed! If you'd like professional support with vendor management, timeline coordination, or on-the-day execution, our human planners are available to help. Would that interest you?",
      };
    }

    return {
      shouldEscalate: false,
      confidence: 0,
    };
  }

  /**
   * Generate escalation message
   */
  generateEscalationMessage(reason: string): string {
    const messages: Record<string, string> = {
      direct_request:
        "I'd be happy to connect you with our team! Our human event planners can handle phone calls, negotiate with suppliers, and provide hands-on coordination. They work closely with event-flow.co.uk and can take care of the details you'd rather not handle yourself.",
      overwhelm:
        "It's completely normal to feel overwhelmed by event planning! Our professional planners are here to help. They can take over the coordination, make those calls, and handle negotiations so you can focus on enjoying your event.",
      budget:
        "Our planners are experts at maximizing budgets! They have established relationships with suppliers and often secure better rates than booking independently. They can also suggest cost-saving strategies while maintaining quality.",
      complexity:
        "This is shaping up to be a wonderful event! Given the complexity, you might benefit from having a professional planner coordinate everything. They'll ensure nothing falls through the cracks and handle all the supplier communications.",
      default:
        "If you'd like additional support, our human event planners are available to help. They can handle supplier negotiations, coordinate logistics, and provide expert guidance throughout your planning journey.",
    };

    return messages[reason] || messages.default;
  }
}

// Export singleton instance
export const escalationService = new EscalationService();
