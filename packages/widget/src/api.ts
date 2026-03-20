/**
 * API client for chat communication
 */

import { WidgetMessage } from './types';

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
  };
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Lightweight conversation state tracked in the demo client
interface DemoConversationState {
  eventType?: string;
  budget?: string;
  location?: string;
  guestCount?: string;
  eventDate?: string;
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
  }

  async sendMessage(
    message: string,
    conversationId?: string
  ): Promise<{ conversationId: string; message: WidgetMessage }> {
    if (this.demoMode) {
      return this.mockResponse(message);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        conversationId,
        userId: 'anonymous',
      }),
    });

    if (response.status === 429) {
      throw new Error('429: Rate limit exceeded. Please wait and try again.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(`${response.status}: Authentication failed.`);
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ChatApiResponse = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return {
      conversationId: data.data.conversationId,
      message: {
        id: data.data.message.id,
        role: 'assistant',
        content: data.data.message.content,
        timestamp: Date.now(),
        quickReplies: data.data.suggestions,
      },
    };
  }

  private async mockResponse(
    userMessage: string
  ): Promise<{ conversationId: string; message: WidgetMessage }> {
    // Simulate realistic API delay
    await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 400));

    const conversationId = 'demo-' + Date.now();
    const lower = userMessage.toLowerCase();

    // Update in-memory demo state from user message
    this.updateDemoState(lower);

    const { content, quickReplies } = this.buildDemoResponse(lower);

    return {
      conversationId,
      message: {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        quickReplies,
      },
    };
  }

  /** Extract simple facts from the user message to track demo conversation state */
  private updateDemoState(lower: string): void {
    // Event type detection
    if (lower.includes('wedding')) this.demoState.eventType = 'wedding';
    else if (lower.includes('birthday')) this.demoState.eventType = 'birthday';
    else if (lower.includes('corporate') || lower.includes('work event'))
      this.demoState.eventType = 'corporate';
    else if (lower.includes('party')) this.demoState.eventType = 'party';
    else if (lower.includes('anniversary')) this.demoState.eventType = 'anniversary';
    else if (lower.includes('conference')) this.demoState.eventType = 'conference';

    // Budget detection — check more specific ranges before less specific ones
    if (/under\s*[£$]?5/.test(lower) || /under\s*5k/i.test(lower)) {
      this.demoState.budget = 'under £5,000';
    } else if (/[£$]?50k|\b50,000/.test(lower)) {
      this.demoState.budget = '£50,000+';
    } else if (/[£$]?20k|\b20,000/.test(lower)) {
      this.demoState.budget = '£20,000–£50,000';
    } else if (/[£$]?10k|\b10,000/.test(lower)) {
      this.demoState.budget = '£10,000–£20,000';
    } else if (/[£$]?5k|\b5,000/.test(lower)) {
      this.demoState.budget = '£5,000–£10,000';
    }

    // Location detection
    if (lower.includes('london')) this.demoState.location = 'London';
    else if (lower.includes('scotland')) this.demoState.location = 'Scotland';
    else if (lower.includes('wales')) this.demoState.location = 'Wales';
    else if (lower.includes('north west') || lower.includes('manchester'))
      this.demoState.location = 'North West';
    else if (lower.includes('south east')) this.demoState.location = 'South East';
  }

  /** Build a context-aware demo response based on the current conversation state */
  private buildDemoResponse(lower: string): { content: string; quickReplies?: string[] } {
    const state = this.demoState;

    // --- Greetings / opening ---
    if (
      (lower.includes('yes') && lower.includes('please')) ||
      lower.includes('help') ||
      lower.includes('start') ||
      lower.includes('plan')
    ) {
      if (!state.eventType) {
        return {
          content: "I'd love to help you plan your event! What type of event are you organising? 🎉",
          quickReplies: ['Wedding', 'Birthday Party', 'Corporate Event', 'Anniversary', 'Other'],
        };
      }
    }

    if (lower.includes('no') && lower.includes('thanks')) {
      return {
        content:
          "No problem at all! I'm here whenever you're ready to start planning. Feel free to come back any time. 😊",
      };
    }

    // --- Event type responses ---
    if (lower.includes('wedding') || state.eventType === 'wedding') {
      if (!state.eventDate) {
        return {
          content:
            "Congratulations! A wedding is such a special occasion. 💍\n\nTo help you plan effectively, do you have a date or timeframe in mind?",
          quickReplies: ['This year', 'Next year', 'In 2+ years', "Haven't decided yet"],
        };
      }
      if (!state.guestCount) {
        return {
          content:
            "Wonderful! How many guests are you expecting? This affects venue size, catering costs, and most supplier quotes.",
          quickReplies: ['Under 30', '30–80', '80–150', '150+'],
        };
      }
      if (!state.budget) {
        return {
          content:
            "Good to know! What's your approximate total budget for the wedding? This helps me prioritise where to spend and where to save.",
          quickReplies: ['Under £10k', '£10k–£20k', '£20k–£50k', '£50k+'],
        };
      }
      return {
        content:
          `Here's a suggested starting plan for your wedding:\n\n**Immediate next steps:**\n- Book your ceremony venue (venues book up 12–18 months in advance)\n- Shortlist 3–5 reception venues in ${state.location || 'your area'}\n- Set your guest list to confirm headcount\n\n**Budget guide (${state.budget || 'your budget'}):**\n- Venue: ~30%\n- Catering & drinks: ~25%\n- Photography & video: ~10%\n- Flowers & décor: ~12%\n- Music & entertainment: ~8%\n- Everything else: ~15%\n\nWould you like a detailed checklist or supplier recommendations?`,
        quickReplies: ['See full checklist', 'Find venues', 'Budget breakdown', 'Set a timeline'],
      };
    }

    if (lower.includes('birthday') || state.eventType === 'birthday') {
      if (!state.guestCount) {
        return {
          content:
            "A birthday party — fantastic! 🎂 How many guests are you expecting? That'll shape the venue and catering options.",
          quickReplies: ['Intimate (under 20)', 'Small (20–50)', 'Medium (50–100)', 'Large (100+)'],
        };
      }
      return {
        content:
          `Great! Here are the key things to sort for a birthday party:\n\n- **Venue**: For ${state.guestCount || 'your guest count'} people, consider a private dining room, a hire venue, or a garden marquee\n- **Catering**: Buffet or sit-down? This changes the cost significantly\n- **Entertainment**: DJ, live band, or activities?\n- **Date**: Book venue and catering at least 6–8 weeks ahead\n\nWhat would you like to tackle first?`,
        quickReplies: ['Find a venue', 'Catering options', 'Entertainment ideas', 'Set a budget'],
      };
    }

    if (lower.includes('corporate') || state.eventType === 'corporate') {
      return {
        content:
          "Corporate events need to balance professionalism with engagement. A few questions to get you started:\n\n- Is this a conference, team away-day, product launch, or something else?\n- How many attendees?\n- Do you have a preferred date or is it flexible?\n\nOnce I know those details I can suggest venues, AV suppliers, and catering options.",
        quickReplies: ['Conference', 'Away day', 'Product launch', 'Client dinner'],
      };
    }

    if (lower.includes('anniversary') || state.eventType === 'anniversary') {
      return {
        content:
          "How lovely — an anniversary celebration! 🥂\n\nTo point you in the right direction:\n- Is this an intimate dinner for two, or a party with family and friends?\n- Do you have a location preference?",
        quickReplies: ['Intimate dinner', 'Small gathering', 'Large party', 'Surprise event'],
      };
    }

    // --- Budget responses ---
    if (lower.includes('budget') || lower.includes('cost') || lower.includes('price')) {
      const eventLabel = state.eventType || 'your event';
      return {
        content:
          `Budget planning is one of the most important early steps for ${eventLabel}. 💷\n\nA few things to establish:\n- What is your **total available budget**?\n- Are there non-negotiables (e.g. specific venue, photographer)?\n- Do you need to include honeymoon / travel costs?\n\nOnce I know your budget I can give you a realistic category breakdown.`,
        quickReplies: ['Under £5k', '£5k–£10k', '£10k–£20k', '£20k–£50k', '£50k+'],
      };
    }

    // --- Venue responses ---
    if (lower.includes('venue')) {
      return {
        content:
          `Venue is usually the first thing to lock in — it sets the date and shapes everything else. 📍\n\nTo find the right venue I need to know:\n- **Region or city** — where are your guests travelling from?\n- **Guest count** — how many people?\n- **Style** — rustic barn, city hotel, country house, modern event space?`,
        quickReplies: ['London', 'South East', 'North West', 'Scotland', 'Other UK'],
      };
    }

    // --- Timeline / checklist ---
    if (lower.includes('timeline') || lower.includes('checklist') || lower.includes('schedule')) {
      const eventLabel = state.eventType || 'your event';
      return {
        content:
          `Here's a general planning timeline for ${eventLabel}:\n\n**12+ months before**\n- Set budget and guest list\n- Book venue\n- Hire photographer/videographer\n\n**6–12 months before**\n- Send save-the-dates\n- Book catering, entertainment, florist\n- Arrange accommodation for guests if needed\n\n**2–6 months before**\n- Send formal invitations\n- Confirm all suppliers\n- Plan decor and layout\n\n**1 month before**\n- Final headcount to caterers\n- Confirm day-of schedule with all suppliers\n- Prepare payments\n\nWould you like a personalised checklist based on your specific event?`,
        quickReplies: [
          'Get personalised checklist',
          'Find suppliers',
          'Budget breakdown',
          'Talk to an expert',
        ],
      };
    }

    // --- Supplier responses ---
    if (
      lower.includes('supplier') ||
      lower.includes('caterer') ||
      lower.includes('photographer') ||
      lower.includes('florist') ||
      lower.includes('dj') ||
      lower.includes('band')
    ) {
      return {
        content:
          "I can help you find the right suppliers! To give you relevant recommendations I need to know:\n\n- Your **location** (county or city)\n- Your **event type** and **date**\n- Your **budget** for this category\n\nWhat details can you share?",
        quickReplies: ['Share location', 'Share event type', 'Share budget', 'Browse categories'],
      };
    }

    // --- Location responses ---
    if (
      lower.includes('london') ||
      lower.includes('scotland') ||
      lower.includes('wales') ||
      lower.includes('manchester') ||
      lower.includes('birmingham') ||
      lower.includes('yorkshire')
    ) {
      const loc = state.location || 'that area';
      return {
        content: `${loc} is a great choice with plenty of venues and suppliers to choose from. 📍\n\nWhat type of event are you planning, and roughly how many guests?`,
        quickReplies: state.eventType
          ? ['Share guest count', 'Share budget', 'Find venues', 'Find suppliers']
          : ['Wedding', 'Birthday', 'Corporate', 'Party'],
      };
    }

    // --- Fallback: ask the first missing core detail ---
    if (!state.eventType) {
      return {
        content:
          "I'm here to help with all aspects of event planning — venues, budgets, suppliers, timelines, and more. To get started, what type of event are you planning?",
        quickReplies: ['Wedding', 'Birthday Party', 'Corporate Event', 'Anniversary', 'Other'],
      };
    }

    if (!state.budget) {
      return {
        content: `To give you the most useful advice for your ${state.eventType}, it helps to know your approximate budget. What range are you working with?`,
        quickReplies: ['Under £5k', '£5k–£10k', '£10k–£20k', '£20k–£50k', '£50k+'],
      };
    }

    if (!state.location) {
      return {
        content: `Almost there! Where will your ${state.eventType} be held? Knowing the region helps me point you to relevant venues and suppliers.`,
        quickReplies: ['London', 'South East', 'North West', 'Scotland', 'Other UK'],
      };
    }

    // Generic helpful fallback
    return {
      content: `I can help with many aspects of planning your ${state.eventType || 'event'}. What would you like to focus on?`,
      quickReplies: ['Venues', 'Budget breakdown', 'Supplier search', 'Planning timeline'],
    };
  }
}
