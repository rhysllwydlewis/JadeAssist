/**
 * Planning Engine Service - Core event planning logic
 */
import { llmService, LLMMessage } from './llmService';
import { ConversationModel } from '../models/Conversation';
import {
  EventType,
  TimelineItem,
  ChecklistItem,
  EVENT_TYPE_METADATA,
} from '@jadeassist/shared';
import { logger } from '../utils/logger';

export interface PlanningContext {
  conversationId: string;
  userId: string;
  eventType?: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
}

export interface PlanningResponse {
  message: string;
  suggestions?: string[];
  timeline?: TimelineItem[];
  checklist?: ChecklistItem[];
  requiresMoreInfo: boolean;
}

class PlanningEngineService {
  /**
   * Process a planning request and generate response
   */
  async processRequest(
    context: PlanningContext,
    userMessage: string
  ): Promise<PlanningResponse> {
    try {
      // Get conversation history
      const messages = await ConversationModel.getMessages(context.conversationId);

      // Build context for LLM
      const llmMessages: LLMMessage[] = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Add current user message
      llmMessages.push({
        role: 'user',
        content: userMessage,
      });

      // Enhance prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(context, userMessage);
      llmMessages[llmMessages.length - 1].content = enhancedPrompt;

      // Get LLM response
      const response = await llmService.chat(llmMessages);

      // Store the assistant's response
      await ConversationModel.addMessage(
        context.conversationId,
        'assistant',
        response.content,
        response.tokensUsed
      );

      // Parse response and extract structured data
      const planningResponse = this.parseResponse(response.content, context);

      return planningResponse;
    } catch (error) {
      logger.error({ error, context }, 'Planning request failed');
      throw error;
    }
  }

  /**
   * Generate a timeline for an event
   */
  async generateTimeline(context: PlanningContext): Promise<TimelineItem[]> {
    const metadata = context.eventType ? EVENT_TYPE_METADATA[context.eventType] : null;

    if (!metadata) {
      return [];
    }

    const prompt = `Generate a detailed timeline for a ${metadata.displayName} with ${
      context.guestCount || 'unknown'
    } guests and a budget of £${context.budget || 'unknown'}. 
    
    Create a list of key milestones from now until the event date, including:
    - When to book venues
    - When to send invitations
    - When to confirm suppliers
    - When to finalize details
    
    Return the timeline as a JSON array with items containing: title, description, dueDate (as ISO string), category.`;

    const response = await llmService.generate(prompt);

    // Parse timeline from response
    // This is a simplified version - in production, you'd use more robust parsing
    try {
      const timelineData = JSON.parse(response.content) as TimelineItem[];
      return timelineData.map((item, index) => ({
        ...item,
        id: `timeline-${index}`,
        completed: false,
      }));
    } catch {
      logger.warn('Failed to parse timeline JSON');
      return [];
    }
  }

  /**
   * Generate a checklist for an event
   */
  async generateChecklist(context: PlanningContext): Promise<ChecklistItem[]> {
    const metadata = context.eventType ? EVENT_TYPE_METADATA[context.eventType] : null;

    if (!metadata) {
      return [];
    }

    const prompt = `Generate a comprehensive checklist for planning a ${
      metadata.displayName
    }. Include:
    - Venue selection and booking
    - Catering arrangements
    - Entertainment and activities
    - Decorations and setup
    - Guest management
    - Day-of coordination
    
    Return as JSON array with items containing: title, description, priority (low/medium/high), category.`;

    const response = await llmService.generate(prompt);

    try {
      const checklistData = JSON.parse(response.content) as ChecklistItem[];
      return checklistData.map((item, index) => ({
        ...item,
        id: `checklist-${index}`,
        completed: false,
      }));
    } catch {
      logger.warn('Failed to parse checklist JSON');
      return [];
    }
  }

  /**
   * Build an enhanced prompt with context
   */
  private buildEnhancedPrompt(context: PlanningContext, userMessage: string): string {
    const contextParts: string[] = [];

    if (context.eventType) {
      const metadata = EVENT_TYPE_METADATA[context.eventType];
      contextParts.push(`Event Type: ${metadata.displayName}`);
    }

    if (context.budget) {
      contextParts.push(`Budget: £${context.budget}`);
    }

    if (context.guestCount) {
      contextParts.push(`Guest Count: ${context.guestCount}`);
    }

    if (context.eventDate) {
      contextParts.push(`Event Date: ${context.eventDate.toDateString()}`);
    }

    if (context.location) {
      contextParts.push(`Location: ${context.location}`);
    }

    const contextString = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}` : '';

    return `${userMessage}${contextString}`;
  }

  /**
   * Parse LLM response and extract structured data
   */
  private parseResponse(content: string, context: PlanningContext): PlanningResponse {
    // Check if more information is needed
    const needsMoreInfo = this.detectInformationGaps(content, context);

    // Extract suggestions if present
    const suggestions = this.extractSuggestions(content);

    return {
      message: content,
      suggestions,
      requiresMoreInfo: needsMoreInfo,
    };
  }

  /**
   * Detect if more information is needed
   */
  private detectInformationGaps(content: string, context: PlanningContext): boolean {
    const lowerContent = content.toLowerCase();

    // Check for questions or requests for information
    const questionIndicators = [
      'what is',
      'when is',
      'where is',
      'how many',
      'could you tell me',
      'can you provide',
      'need to know',
    ];

    const hasQuestions = questionIndicators.some((indicator) => lowerContent.includes(indicator));

    // Check if essential information is missing
    const missingEssentials = !context.eventType || !context.budget || !context.guestCount;

    return hasQuestions || missingEssentials;
  }

  /**
   * Extract suggestions from response
   */
  private extractSuggestions(content: string): string[] | undefined {
    // Look for bulleted lists or numbered items
    const lines = content.split('\n');
    const suggestions: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Match bullet points or numbers
      if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const suggestion = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
        if (suggestion.length > 0) {
          suggestions.push(suggestion);
        }
      }
    });

    return suggestions.length > 0 ? suggestions.slice(0, 5) : undefined;
  }
}

// Export singleton instance
export const planningEngine = new PlanningEngineService();
