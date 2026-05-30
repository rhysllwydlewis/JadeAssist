/*
 * API client for chat communication
 */

import { WidgetAssistantMeta, WidgetMessage, WidgetSearchResult } from './types';

export interface ConversationBriefMetadata {
  eventType?: string;
  eventDate?: string;
  guestCount?: number;
  budget?: number;
  location?: string;
  planningStage?: string;
  contextCompleteness?: number;
  missingDetails?: string[];
}

interface AssistantApiResponse {
  assistantMessage: string;
  statePatch?: Record<string, unknown>;
  nextQuestion?: string;
  uiActions?: Array<{ type: string; payload?: Record<string, unknown> }>;
  confidence?: number;
  mode?: 'live' | 'degraded';
}

export interface ChatApiResponse {
  success: boolean;
  data?: {
    conversationId: string;
    message: {
      id: string;
      content: string;
      role: string;
      createdAt: string;
    };
    suggestions?: string[];
    conversation?: ConversationBriefMetadata;
    searchResults?: WidgetSearchResult[];
    assistantResponse?: AssistantApiResponse;
  };
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Lightweight conversation state tracked in the explicit demo/degraded client.
interface DemoConversationState {
  eventType?: string;
  budget?: string;
  location?: string;
  guestCount?: string;
  eventDate?: string;
}

function isLikelyProductionHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return !['localhost', '127.0.0.1', '0.0.0.0'].includes(host) && !host.endsWith('.local');
}

function buildAssistantMeta(mode: 'live' | 'degraded', confidence = 0.75): WidgetAssistantMeta {
  return {
    mode,
    confidence,
    uiActions: mode === 'degraded' ? [{ type: 'show_degraded_mode_banner' }] : [],
  };
}

export class ApiClient {
  private baseUrl: string;
  private authToken: string;
  private demoMode: boolean;
  private demoState: DemoConversationState = {};

  constructor(baseUrl?: string, authToken?: string) {
    this.baseUrl = baseUrl || '';
    this.authToken = authToken || '';
    this.demoMode = !baseUrl;

    if (this.demoMode && isLikelyProductionHost()) {
      console.warn(
        '[JadeAssist] apiBaseUrl is not configured on a production-like host. The widget will show explicit degraded guidance rather than silent demo-mode intelligence.'
      );
    }
  }

  async sendMessage(
    message: string,
    conversationId?: string
  ): Promise<{
    conversationId: string;
    message: WidgetMessage;
    conversation?: ConversationBriefMetadata;
    searchResults?: WidgetSearchResult[];
  }> {
    if (this.demoMode) {
      return this.mockResponse(message);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}/api/widget/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        conversationId,
        userId: 'anonymous',
      }),
    });

    const data = await this.parseJsonResponse(response);

    if (response.status === 421 && data?.error?.code === 'WRONG_SERVICE') {
      throw new Error(
        'The JadeAssist widget is pointed at the widget/static Railway service instead of the backend API service. Update apiBaseUrl to the backend service domain.'
      );
    }

    if (response.status === 429) {
      throw new Error(
        data?.error?.message || '429: Rate limit exceeded. Please wait and try again.'
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(data?.error?.message || `${response.status}: Authentication failed.`);
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || `API error: ${response.status}`);
    }

    if (!data?.success || !data.data) {
      throw new Error(data?.error?.message || 'API request failed');
    }

    const assistantMeta = data.data.assistantResponse
      ? {
          mode: data.data.assistantResponse.mode,
          confidence: data.data.assistantResponse.confidence,
          nextQuestion: data.data.assistantResponse.nextQuestion,
          uiActions: data.data.assistantResponse.uiActions,
          statePatch: data.data.assistantResponse.statePatch,
        }
      : undefined;

    return {
      conversationId: data.data.conversationId,
      conversation: data.data.conversation,
      searchResults: data.data.searchResults,
      message: {
        id: data.data.message.id,
        role: 'assistant',
        content: data.data.message.content,
        timestamp: Date.now(),
        quickReplies: data.data.suggestions,
        assistantMeta,
      },
    };
  }

  private async parseJsonResponse(response: Response): Promise<ChatApiResponse | null> {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    try {
      return (await response.json()) as ChatApiResponse;
    } catch (error) {
      console.warn('Failed to parse JadeAssist API response:', error);
      return null;
    }
  }

  private async mockResponse(userMessage: string): Promise<{
    conversationId: string;
    message: WidgetMessage;
    conversation?: ConversationBriefMetadata;
    searchResults?: WidgetSearchResult[];
  }> {
    await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 400));

    const conversationId = 'demo-' + Date.now();
    const lower = userMessage.toLowerCase();

    this.updateDemoState(lower);
    const { content, quickReplies } = this.buildDemoResponse(lower);
    const productionWarning = isLikelyProductionHost()
      ? 'Jade is not connected to the live planning service on this page. '
      : '';

    return {
      conversationId,
      conversation: {
        eventType: this.demoState.eventType,
        guestCount: this.demoState.guestCount ? Number(this.demoState.guestCount) : undefined,
        budget: this.demoState.budget
          ? Number(this.demoState.budget.replace(/[^0-9]/g, '')) || undefined
          : undefined,
        location: this.demoState.location,
        planningStage: this.demoState.eventType ? 'brief-building' : 'discovery',
        contextCompleteness: Object.values(this.demoState).filter(Boolean).length * 20,
      },
      message: {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: `${productionWarning}${content}`,
        timestamp: Date.now(),
        quickReplies,
        assistantMeta: buildAssistantMeta('degraded', 0.45),
      },
    };
  }

  private updateDemoState(lower: string): void {
    if (lower.includes('wedding') || lower.includes('civil partnership')) {
      this.demoState.eventType = 'wedding';
    } else if (lower.includes('birthday')) {
      this.demoState.eventType = 'birthday';
    } else if (
      lower.includes('corporate') ||
      lower.includes('away day') ||
      lower.includes('away-day') ||
      lower.includes('work event')
    ) {
      this.demoState.eventType = 'corporate';
    } else if (lower.includes('conference') || lower.includes('seminar')) {
      this.demoState.eventType = 'conference';
    } else if (lower.includes('anniversary')) {
      this.demoState.eventType = 'anniversary';
    } else if (lower.includes('party') || lower.includes('celebration')) {
      this.demoState.eventType = 'party';
    }

    if (/under\s*[£$]?5k\b/i.test(lower) || /under\s*£?5,000\b/.test(lower)) {
      this.demoState.budget = 'under £5,000';
    } else if (/\b[£$]?50k\b|\b50,000\b/.test(lower)) {
      this.demoState.budget = '£50,000+';
    } else if (/\b[£$]?20k\b|\b20,000\b/.test(lower)) {
      this.demoState.budget = '£20,000–£50,000';
    } else if (/\b[£$]?10k\b|\b10,000\b/.test(lower)) {
      this.demoState.budget = '£10,000–£20,000';
    } else if (/\b[£$]?5k\b|\b5,000\b/.test(lower)) {
      this.demoState.budget = '£5,000–£10,000';
    }

    const guestMatch = /\b(\d{1,3}(?:,\d{3})*|\d+)\s*(guests?|people|attendees?|pax)\b/.exec(lower);
    if (guestMatch) {
      this.demoState.guestCount = guestMatch[1].replace(/,/g, '');
    } else if (lower.includes('under 30') || lower.includes('intimate')) {
      this.demoState.guestCount = '20–30';
    } else if (lower.includes('150+') || lower.includes('large')) {
      this.demoState.guestCount = '150+';
    }

    if (lower.includes('london')) {
      this.demoState.location = 'London';
    } else if (
      lower.includes('scotland') ||
      lower.includes('edinburgh') ||
      lower.includes('glasgow')
    ) {
      this.demoState.location = 'Scotland';
    } else if (lower.includes('south wales')) {
      this.demoState.location = 'South Wales';
    } else if (lower.includes('north wales')) {
      this.demoState.location = 'North Wales';
    } else if (lower.includes('wales') || lower.includes('cardiff')) {
      this.demoState.location = 'Wales';
    } else if (
      lower.includes('north west') ||
      lower.includes('manchester') ||
      lower.includes('liverpool')
    ) {
      this.demoState.location = 'North West';
    } else if (
      lower.includes('yorkshire') ||
      lower.includes('leeds') ||
      lower.includes('sheffield')
    ) {
      this.demoState.location = 'Yorkshire';
    } else if (
      lower.includes('south east') ||
      lower.includes('surrey') ||
      lower.includes('kent') ||
      lower.includes('sussex')
    ) {
      this.demoState.location = 'South East';
    } else if (lower.includes('midlands') || lower.includes('birmingham')) {
      this.demoState.location = 'Midlands';
    } else if (
      lower.includes('south west') ||
      lower.includes('bristol') ||
      lower.includes('cornwall') ||
      lower.includes('devon')
    ) {
      this.demoState.location = 'South West';
    }

    if (lower.includes('this year')) {
      this.demoState.eventDate = 'this year';
    } else if (lower.includes('next year')) {
      this.demoState.eventDate = 'next year';
    }
  }

  private buildDemoResponse(lower: string): { content: string; quickReplies?: string[] } {
    const state = this.demoState;

    if (
      (lower.includes('yes') && lower.includes('please')) ||
      lower === 'help' ||
      lower === 'start' ||
      lower === 'hi' ||
      lower === 'hello' ||
      lower === 'hey'
    ) {
      if (!state.eventType) {
        return {
          content:
            "I'm in degraded demo mode, but I can still help you capture the brief manually. What type of event are you organising? 🎉",
          quickReplies: ['Wedding', 'Birthday Party', 'Corporate Event', 'Anniversary', 'Other'],
        };
      }
    }

    if (lower.includes('no') && lower.includes('thanks')) {
      return {
        content: "No problem — I'm here whenever you're ready. Feel free to come back any time! 😊",
      };
    }

    return this.buildDetailedDemoResponse(lower, state);
  }

  private buildDetailedDemoResponse(
    lower: string,
    state: DemoConversationState
  ): { content: string; quickReplies?: string[] } {
    const event = state.eventType || 'event';
    const loc = state.location || 'your area';

    if (
      lower.includes('venue') ||
      lower.includes('supplier') ||
      lower.includes('search') ||
      lower.includes('recommend')
    ) {
      return {
        content: `I'm in degraded demo mode. In live mode I can search EventFlow suppliers and website sections. For now, here is the supplier approach I would use for a ${event} in ${loc}:\n\n- Shortlist 3 options so you can compare like-for-like.\n- Ask for full written quotes, not headline prices.\n- Check insurance, cancellation terms, setup times and what is included.\n- For venues, confirm capacity, access, curfew and wet-weather options.\n\nIn live mode, I would return actual supplier or website results from EventFlow where available.`,
        quickReplies: [
          'Budget breakdown',
          'Venue checklist',
          'Planning timeline',
          'Supplier questions',
        ],
      };
    }

    if (lower.includes('budget') || lower.includes('cost') || lower.includes('price')) {
      return {
        content: `I'm in degraded demo mode. For a ${event} in ${loc}, start with this practical budget split:\n\n- Venue: 25–35%\n- Food and drink: 30–40%\n- Photography, entertainment or main experience: 10–20%\n- Styling, stationery and extras: 10–15%\n- Contingency: keep 10% back\n\nIf you give me your guest count and rough budget, I can make the numbers more specific.`,
        quickReplies: ['Venue checklist', 'Planning timeline', 'Supplier questions'],
      };
    }

    if (
      lower.includes('timeline') ||
      lower.includes('schedule') ||
      lower.includes('when') ||
      lower.includes('plan')
    ) {
      return {
        content: `I'm in degraded demo mode. A sensible ${event} planning order is:\n\n- Confirm budget, guest count and location.\n- Shortlist and secure the venue/date.\n- Book key suppliers that affect availability.\n- Confirm guest communication, timings and layout.\n- In the final month, lock final numbers, balances and the day schedule.`,
        quickReplies: ['Find suppliers', 'Budget breakdown', 'Venue checklist'],
      };
    }

    return {
      content:
        "I'm in degraded demo mode. To give you useful advice, what type of event are you planning?",
      quickReplies: ['Wedding', 'Birthday Party', 'Corporate Event', 'Anniversary', 'Other'],
    };
  }
}