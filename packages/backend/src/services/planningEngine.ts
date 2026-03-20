/**
 * Planning Engine Service - Core event planning logic
 */
import { llmService, LLMMessage } from './llmService';
import { ConversationModel } from '../models/Conversation';
import { EventType, TimelineItem, ChecklistItem, EVENT_TYPE_METADATA } from '@jadeassist/shared';
import { logger } from '../utils/logger';
import {
  buildDynamicSystemPrompt,
  buildEnrichedUserMessage,
  detectInformationGaps,
  extractContextualSuggestions,
  getMissingDetails,
} from '../utils/planningPrompts';

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
  async processRequest(context: PlanningContext, userMessage: string): Promise<PlanningResponse> {
    try {
      // Get conversation history
      const messages = await ConversationModel.getMessages(context.conversationId);

      // Build context for LLM
      const llmMessages: LLMMessage[] = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Add current user message with enriched context appended
      const enrichedMessage = buildEnrichedUserMessage(context, userMessage);
      llmMessages.push({
        role: 'user',
        content: enrichedMessage,
      });

      // Build dynamic system prompt that reflects known context
      const dynamicSystemPrompt = buildDynamicSystemPrompt(context);

      // Get LLM response
      const response = await llmService.chat(llmMessages, {
        systemPrompt: dynamicSystemPrompt,
      });

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
   * Parse LLM response and extract structured data
   */
  private parseResponse(content: string, context: PlanningContext): PlanningResponse {
    const needsMoreInfo = detectInformationGaps(content, context);
    const suggestions = extractContextualSuggestions(content, context);

    return {
      message: content,
      suggestions,
      requiresMoreInfo: needsMoreInfo,
    };
  }

  /**
   * Expose gap detection for external testing / diagnostics
   */
  public getMissingContextDetails(context: PlanningContext): string[] {
    return getMissingDetails(context);
  }
}

// Export singleton instance
export const planningEngine = new PlanningEngineService();
