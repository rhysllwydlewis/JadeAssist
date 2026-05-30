/**
 * Planning Engine Service - Core event planning logic
 * Includes resilient handling for public widget chat.
 */
import mongoose from 'mongoose';
import { z } from 'zod';
import { llmService, LLMMessage } from './llmService';
import { ConversationModel } from '../models/Conversation';
import {
  AssistantResponse,
  EventType,
  TimelineItem,
  ChecklistItem,
  EVENT_TYPE_METADATA,
} from '@jadeassist/shared';
import { logger } from '../utils/logger';
import { searchService, SearchResult } from './searchService';
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
  searchResults?: SearchResult[];
  assistantResponse: AssistantResponse;
}

const assistantResponseSchema = z.object({
  assistantMessage: z.string().trim().min(1),
  statePatch: z.record(z.unknown()).default({}),
  nextQuestion: z.string().trim().optional(),
  uiActions: z
    .array(
      z.object({
        type: z.string().trim().min(1),
        payload: z.record(z.unknown()).optional(),
      })
    )
    .default([]),
  confidence: z.number().min(0).max(1).default(0.75),
  mode: z.enum(['live', 'degraded']).default('live'),
});

function shouldSearch(message: string): boolean {
  const lower = message.toLowerCase();
  return [
    'supplier',
    'suppliers',
    'venue',
    'venues',
    'caterer',
    'catering',
    'photographer',
    'videographer',
    'florist',
    'hotel',
    'accommodation',
    'musician',
    'musicians',
    'band',
    'singer',
    'dj',
    'music',
    'transport',
    'guide',
    'website',
    'find',
    'search',
    'recommend',
    'recommendation',
  ].some((term) => lower.includes(term));
}

function buildSearchQuery(context: PlanningContext, message: string): string {
  const parts = [message];
  if (context.eventType) parts.push(context.eventType);
  if (context.location) parts.push(context.location);
  if (context.guestCount) parts.push(`${context.guestCount} guests`);
  return parts.join(' ');
}

function dateToPlannerLabel(date: Date | undefined): string | undefined {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

function buildStatePatch(context: PlanningContext): AssistantResponse['statePatch'] {
  return {
    eventType: context.eventType,
    location: context.location,
    dateOrTimeframe: dateToPlannerLabel(context.eventDate),
    guestCount: context.guestCount,
    budget: context.budget
      ? {
          currency: 'GBP',
          min: context.budget,
          max: context.budget,
          label: `£${context.budget.toLocaleString('en-GB')}`,
        }
      : undefined,
    unresolvedQuestions: getMissingDetails(context),
    summary: [
      context.eventType ? `event type: ${context.eventType}` : undefined,
      context.location ? `location: ${context.location}` : undefined,
      context.guestCount ? `guest count: ${context.guestCount}` : undefined,
      context.budget ? `budget: £${context.budget.toLocaleString('en-GB')}` : undefined,
      context.eventDate ? `date/timeframe: ${dateToPlannerLabel(context.eventDate)}` : undefined,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function stripCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function maybeParseAssistantResponse(content: string): AssistantResponse | undefined {
  const trimmed = stripCodeFence(content);
  if (!trimmed.startsWith('{')) return undefined;

  try {
    const parsed = assistantResponseSchema.parse(JSON.parse(trimmed));
    return {
      assistantMessage: parsed.assistantMessage,
      statePatch: parsed.statePatch as AssistantResponse['statePatch'],
      nextQuestion: parsed.nextQuestion,
      uiActions: parsed.uiActions as AssistantResponse['uiActions'],
      confidence: parsed.confidence,
      mode: parsed.mode,
    };
  } catch (error) {
    logger.warn({ error }, 'Assistant response JSON failed validation; using text fallback');
    return undefined;
  }
}

function buildSyntheticAssistantResponse(
  content: string,
  context: PlanningContext,
  missingDetails: string[],
  model: string
): AssistantResponse {
  const degraded = model.includes('degraded') || content.toLowerCase().includes('degraded planning mode');
  return {
    assistantMessage: content,
    statePatch: buildStatePatch(context),
    nextQuestion: missingDetails[0],
    uiActions: [
      { type: 'update_plan_summary' },
      ...(degraded ? [{ type: 'show_degraded_mode_banner' as const }] : []),
    ],
    confidence: degraded ? 0.45 : 0.82,
    mode: degraded ? 'degraded' : 'live',
  };
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
          const conversation = await ConversationModel.ensureConversation(
            context.conversationId,
            context.userId
          );
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

      const searchResults = shouldSearch(trimmedMessage)
        ? await searchService.search({
            query: buildSearchQuery(enrichedContext, trimmedMessage),
            location: enrichedContext.location,
            limit: 6,
          })
        : [];

      const llmMessages: LLMMessage[] = messages.slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content.slice(0, 2500),
      }));

      const enrichedUserMessage = buildEnrichedUserMessage(enrichedContext, trimmedMessage);
      llmMessages.push({
        role: 'user',
        content:
          searchResults.length > 0
            ? `${enrichedUserMessage}\n\n[Relevant EventFlow search results]\n${searchService.formatForPrompt(searchResults)}`
            : enrichedUserMessage,
      });

      const response = await llmService.chat(llmMessages, {
        systemPrompt: `${buildDynamicSystemPrompt(enrichedContext)}\n\nReturn either concise Markdown or a valid JSON object matching this contract when you are updating planner state: assistantMessage, statePatch, nextQuestion, uiActions, confidence, mode. When EventFlow search results are provided, answer the user's find/recommendation request first with a concise shortlist, even if some event-brief details are still missing. Be clear when a result is from the local supplier database, EventFlow catalog, online search fallback, or EventFlow website index. Do not invent supplier names, URLs, prices, availability or ratings beyond the supplied results; ask one focused follow-up only after the shortlist.`,
        temperature: missingDetails.length > 0 ? 0.55 : 0.7,
        maxTokens: searchResults.length > 0 ? 1000 : missingDetails.length > 0 ? 550 : 900,
      });

      if (!response.content.trim()) {
        throw new Error('EMPTY_LLM_RESPONSE');
      }

      const planningResponse = this.parseResponse(
        response.content,
        enrichedContext,
        searchResults,
        response.model
      );

      if (persistenceReady) {
        await this.persistTurn(
          context,
          trimmedMessage,
          planningResponse.assistantResponse.assistantMessage,
          response.tokensUsed
        );
      } else {
        logger.warn(
          { conversationId: context.conversationId },
          'Skipping conversation persistence because MongoDB is not connected'
        );
      }

      return planningResponse;
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

  /** Generate a timeline for an event */
  async generateTimeline(context: PlanningContext): Promise<TimelineItem[]> {
    const metadata = context.eventType ? EVENT_TYPE_METADATA[context.eventType] : null;

    if (!metadata) return [];

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
      return timelineData.map((item, index) => ({ ...item, id: `timeline-${index}`, completed: false }));
    } catch {
      logger.warn('Failed to parse timeline JSON');
      return [];
    }
  }

  /** Generate a checklist for an event */
  async generateChecklist(context: PlanningContext): Promise<ChecklistItem[]> {
    const metadata = context.eventType ? EVENT_TYPE_METADATA[context.eventType] : null;

    if (!metadata) return [];

    const prompt = `Generate a comprehensive checklist for planning a ${metadata.displayName}. Include:
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
      return checklistData.map((item, index) => ({ ...item, id: `checklist-${index}`, completed: false }));
    } catch {
      logger.warn('Failed to parse checklist JSON');
      return [];
    }
  }

  /** Parse LLM response and extract structured data */
  private parseResponse(
    content: string,
    context: PlanningContext,
    searchResults: SearchResult[] = [],
    model: string
  ): PlanningResponse {
    const missingDetails = getMissingDetails(context);
    const assistantResponse =
      maybeParseAssistantResponse(content) ??
      buildSyntheticAssistantResponse(content, context, missingDetails, model);
    const message = assistantResponse.assistantMessage;
    const needsMoreInfo = detectInformationGaps(message, context);
    const suggestions = extractContextualSuggestions(message, context);

    return {
      message,
      suggestions,
      requiresMoreInfo: needsMoreInfo,
      context,
      missingDetails,
      searchResults,
      assistantResponse,
    };
  }

  /** Expose gap detection for external testing / diagnostics */
  public getMissingContextDetails(context: PlanningContext): string[] {
    return getMissingDetails(context);
  }
}

export const planningEngine = new PlanningEngineService();