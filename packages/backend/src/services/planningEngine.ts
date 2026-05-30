/**
 * Planning Engine Service - Core event planning logic
 */
import mongoose from 'mongoose';
import { llmService, LLMMessage } from './llmService';
import { ConversationModel } from '../models/Conversation';
import { EventType, TimelineItem, ChecklistItem, EVENT_TYPE_METADATA } from '@jadeassist/shared';
import { logger } from '../utils/logger';
import {
  buildDynamicSystemPrompt,
  buildEnrichedUserMessage,
  detectInformationGaps,
  extractContextualSuggestions,
  extractPlanningContextFromMessage,
  getContextCompleteness,
  getMissingDetails,
  getPlanningStage,
  mergePlanningContext,
} from '../utils/planningPrompts';

export interface PlanningContext {
  conversationId: string;
  userId: string;
  eventType?: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
  planningStage?: string;
  contextCompleteness?: number;
}

export interface PlanningResponse {
  message: string;
  suggestions?: string[];
  timeline?: TimelineItem[];
  checklist?: ChecklistItem[];
  requiresMoreInfo: boolean;
  context: PlanningContext;
  missingDetails: string[];
}

class PlanningEngineService {
  /**
   * Process a planning request and generate response.
   *
   * The widget is public and must be resilient. When MongoDB is available we
   * persist the event brief and conversation history; when it is warming up, we
   * still return a stateless LLM answer instead of failing the visitor journey.
   */
  async processRequest(context: PlanningContext, userMessage: string): Promise<PlanningResponse> {
    try {
      const persistenceReady = mongoose.connection.readyState === 1;
      const trimmedMessage = userMessage.trim();
      let persistedContext: PlanningContext = context;
      let messages: Awaited<ReturnType<typeof ConversationModel.getMessages>> = [];

      if (persistenceReady) {
        try {
          const conversation = await ConversationModel.ensureConversation(context.conversationId, context.userId);
          persistedContext = {
            ...context,
            eventType: (conversation.eventType as EventType | undefined) ?? context.eventType,
            eventDate: conversation.eventDate ?? context.eventDate,
            guestCount: conversation.guestCount ?? context.guestCount,
            budget: conversation.budget ?? context.budget,
            location: conversation.location ?? context.location,
            planningStage: conversation.planningStage ?? context.planningStage,
            contextCompleteness: conversation.contextCompleteness ?? context.contextCompleteness,
          };

          messages = await ConversationModel.getMessages(context.conversationId, 20);
        } catch (historyError) {
          logger.warn(
            { historyError, conversationId: context.conversationId },
            'Conversation history unavailable; continuing with stateless chat turn'
          );
        }
      } else {
        logger.warn(
          { conversationId: context.conversationId, readyState: mongoose.connection.readyState },
          'MongoDB is not connected; continuing with stateless chat turn'
        );
      }

      const extractedContext = extractPlanningContextFromMessage(trimmedMessage);
      const mergedContext = mergePlanningContext(persistedContext, extractedContext);
      const enrichedContext: PlanningContext = {
        ...mergedContext,
        planningStage: getPlanningStage(mergedContext),
        contextCompleteness: getContextCompleteness(mergedContext),
      };
      const missingDetails = getMissingDetails(enrichedContext);

      if (persistenceReady) {
        await ConversationModel.updateContext(context.conversationId, {
          eventType: enrichedContext.eventType,
          eventDate: enrichedContext.eventDate,
          guestCount: enrichedContext.guestCount,
          budget: enrichedContext.budget,
          location: enrichedContext.location,
          planningStage: enrichedContext.planningStage,
          contextCompleteness: enrichedContext.contextCompleteness,
        });
      }

      const llmMessages: LLMMessage[] = messages.slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content.slice(0, 2500),
      }));

      llmMessages.push({
        role: 'user',
        content: buildEnrichedUserMessage(enrichedContext, trimmedMessage),
      });

      const response = await llmService.chat(llmMessages, {
        systemPrompt: buildDynamicSystemPrompt(enrichedContext),
        temperature: missingDetails.length > 0 ? 0.55 : 0.7,
        maxTokens: missingDetails.length > 0 ? 550 : 900,
      });

      if (!response.content.trim()) {
        throw new Error('EMPTY_LLM_RESPONSE');
      }

      if (persistenceReady) {
        await this.persistTurn(context, trimmedMessage, response.content, response.tokensUsed);
      } else {
        logger.warn(
          { conversationId: context.conversationId },
          'Skipping conversation persistence because MongoDB is not connected'
        );
      }

      return this.parseResponse(response.content, enrichedContext);
    } catch (error) {
      logger.error({ error, context }, 'Planning request failed');
      throw error;
    }
  }

  private async persistTurn(
    context: PlanningContext,
    userMessage: string,
    assistantMessage: string,
    tokensUsed: number
  ): Promise<void> {
    try {
      await ConversationModel.addMessage(context.conversationId, 'user', userMessage);
      await ConversationModel.addMessage(
        context.conversationId,
        'assistant',
        assistantMessage,
        tokensUsed
      );
    } catch (persistError) {
      logger.warn(
        { persistError, conversationId: context.conversationId },
        'Conversation persistence failed; response was still returned to the widget'
      );
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
    - When to finalise details
    
    Return the timeline as a JSON array with items containing: title, description, dueDate (as ISO string), category.`;

    const response = await llmService.generate(prompt);

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
    const missingDetails = getMissingDetails(context);
    const needsMoreInfo = detectInformationGaps(content, context);
    const suggestions = extractContextualSuggestions(content, context);

    return {
      message: content,
      suggestions,
      requiresMoreInfo: needsMoreInfo,
      context,
      missingDetails,
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
