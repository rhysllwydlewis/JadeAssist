/*
 * API client for chat communication
 */

import { WidgetMessage } from './types';

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
  ): Promise<{ conversationId: string; message: WidgetMessage; conversation?: ConversationBriefMetadata }> {
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
      throw new Error(data?.error?.message || '429: Rate limit exceeded. Please wait and try again.');
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

    return {
      conversationId: data.data.conversationId,
      conversation: data.data.conversation,
      message: {
        id: data.data.message.id,
        role: 'assistant',
        content: data.data.message.content,
        timestamp: Date.now(),
        quickReplies: data.data.suggestions,
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

  private async mockResponse(
    userMessage: string
  ): Promise<{ conversationId: string; message: WidgetMessage; conversation?: ConversationBriefMetadata }> {
    // Simulate realistic API delay
    await new Promise((resolve) => setTimeout(resolve, 700 + Math.random() * 400));

    const conversationId = 'demo-' + Date.now();
    const lower = userMessage.toLowerCase();

    this.updateDemoState(lower);
    const { content, quickReplies } = this.buildDemoResponse(lower);

    return {
      conversationId,
      conversation: {
        eventType: this.demoState.eventType,
        guestCount: this.demoState.guestCount ? Number(this.demoState.guestCount) : undefined,
        budget: this.demoState.budget ? Number(this.demoState.budget.replace(/[^0-9]/g, '')) || undefined : undefined,
        location: this.demoState.location,
        planningStage: this.demoState.eventType ? 'brief-building' : 'discovery',
        contextCompleteness: Object.values(this.demoState).filter(Boolean).length * 20,
      },
      message: {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        quickReplies,
      },
    };
  }

  private updateDemoState(lower: string): void {
    // Event type
    if (lower.includes('wedding') || lower.includes('civil partnership')) {
      this.demoState.eventType = 'wedding';
    } else if (lower.includes('birthday')) {
      this.demoState.eventType = 'birthday';
    } else if (lower.includes('corporate') || lower.includes('away day') || lower.includes('away-day') || lower.includes('work event')) {
      this.demoState.eventType = 'corporate';
    } else if (lower.includes('conference') || lower.includes('seminar')) {
      this.demoState.eventType = 'conference';
    } else if (lower.includes('anniversary')) {
      this.demoState.eventType = 'anniversary';
    } else if (lower.includes('party') || lower.includes('celebration')) {
      this.demoState.eventType = 'party';
    }

    // Budget — most specific first, with word boundaries to prevent partial matches
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

    // Guest count — support comma-formatted numbers (e.g. "1,000 guests")
    const guestMatch = /\b(\d{1,3}(?:,\d{3})*|\d+)\s*(guests?|people|attendees?|pax)\b/.exec(lower);
    if (guestMatch) {
      this.demoState.guestCount = guestMatch[1].replace(/,/g, '');
    } else if (lower.includes('under 30') || lower.includes('intimate')) {
      this.demoState.guestCount = '20–30';
    } else if (lower.includes('150+') || lower.includes('large')) {
      this.demoState.guestCount = '150+';
    }

    // Location
    if (lower.includes('london')) {
      this.demoState.location = 'London';
    } else if (lower.includes('scotland') || lower.includes('edinburgh') || lower.includes('glasgow')) {
      this.demoState.location = 'Scotland';
    } else if (lower.includes('wales') || lower.includes('cardiff')) {
      this.demoState.location = 'Wales';
    } else if (lower.includes('north west') || lower.includes('manchester') || lower.includes('liverpool')) {
      this.demoState.location = 'North West';
    } else if (lower.includes('yorkshire') || lower.includes('leeds') || lower.includes('sheffield')) {
      this.demoState.location = 'Yorkshire';
    } else if (lower.includes('south east') || lower.includes('surrey') || lower.includes('kent') || lower.includes('sussex')) {
      this.demoState.location = 'South East';
    } else if (lower.includes('midlands') || lower.includes('birmingham')) {
      this.demoState.location = 'Midlands';
    } else if (lower.includes('south west') || lower.includes('bristol') || lower.includes('cornwall') || lower.includes('devon')) {
      this.demoState.location = 'South West';
    }

    // Date
    if (lower.includes('this year')) {
      this.demoState.eventDate = 'this year';
    } else if (lower.includes('next year')) {
      this.demoState.eventDate = 'next year';
    }
  }

  private buildDemoResponse(lower: string): { content: string; quickReplies?: string[] } {
    const state = this.demoState;

    // Opening greetings
    if (
      (lower.includes('yes') && lower.includes('please')) ||
      lower === 'help' || lower === 'start' || lower === 'hi' ||
      lower === 'hello' || lower === 'hey'
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
        content: "No problem — I'm here whenever you're ready. Feel free to come back any time! 😊",
      };
    }

    // ── Wedding deep knowledge ──────────────────────────────────────────
    if (lower.includes('wedding') || state.eventType === 'wedding') {

      if (lower.includes('cost') || lower.includes('price') || lower.includes('budget') || lower.includes('expensive') || lower.includes('afford')) {
        const loc = state.location || 'the UK';
        return {
          content: `Here's a realistic cost breakdown for a wedding in ${loc}:\n\n**Average UK wedding: £30,000** (range: £8,000 to £100,000+)\n\n**Typical category breakdown:**\n- **Venue**: £3,000–£15,000 (London/South East at the top end)\n- **Catering & bar**: £65–£150/head\n- **Photography**: £1,500–£4,000\n- **Videography**: £1,200–£3,500\n- **Flowers & décor**: £2,000–£8,000\n- **Band or DJ**: £800–£3,500\n- **Dress**: £500–£5,000\n- **Suit/attire**: £300–£1,500\n- **Stationery**: £200–£800\n- **Wedding cake**: £400–£1,200\n- **Transport**: £300–£800\n\n**Biggest cost-saving opportunities:**\n1. Choose a Friday or Sunday — venues often charge 20–40% less\n2. Book a dry hire venue and bring your own caterer\n3. Go for a buffet or sharing platters rather than silver service\n4. Limit the evening guest list to reduce per-head costs\n\nWhat's your approximate total budget?`,
          quickReplies: ['Under £10k', '£10k–£20k', '£20k–£50k', '£50k+'],
        };
      }

      if (lower.includes('venue')) {
        const loc = state.location || 'your area';
        return {
          content: `Choosing your venue is the most important early decision — it sets your date, capacity, and overall feel.\n\n**Key questions to ask every venue:**\n- Is it licensed for civil ceremonies, or ceremony-only?\n- Is it exclusive hire, or will other events run simultaneously?\n- Do they have in-house catering (mandatory or optional)?\n- What's the alcohol licence / noise curfew?\n- Is there on-site accommodation?\n- What's the wet weather contingency?\n\n**Popular venue styles in ${loc}:**\n- **Country house hotels** — all-in-one convenience, £4,000–£12,000\n- **Barns & rural estates** — rustic charm, dry hire from £2,500\n- **City hotels** — central for guests, £3,000–£15,000\n- **Heritage venues** — museums, galleries, castles\n\n**Pro tip:** Always visit at least 3 venues before committing — and popular dates book 12–18 months ahead.\n\nHow many guests are you expecting?`,
          quickReplies: ['Under 50', '50–100', '100–150', '150+'],
        };
      }

      if (lower.includes('photographer') || lower.includes('photography')) {
        return {
          content: `Wedding photography is one area where it genuinely pays to invest — you'll have these photos forever.\n\n**Typical UK rates:**\n- Budget: £800–£1,500\n- Mid-range: £1,500–£2,500\n- Premium: £2,500–£4,500+\n\n**What to look for:**\n- A portfolio that matches your style (documentary? posed? fine art?)\n- Full-day coverage with high-res digital files\n- Public liability insurance and backup equipment\n- A second shooter for larger weddings\n\n**Red flags:**\n- No contract or vague payment terms\n- Can't show a full recent gallery (only highlights)\n- No backup plan for illness/emergency\n\n**Questions to ask:**\n- Can I see a full gallery from a recent wedding?\n- What happens if you have an emergency on our day?\n- When will we receive our photos?\n\nWhere are you based? I can give region-specific advice.`,
          quickReplies: ['London/South East', 'North of England', 'Midlands', 'Scotland/Wales'],
        };
      }

      if (lower.includes('catering') || lower.includes('food') || lower.includes('menu')) {
        return {
          content: `Food is what guests remember most — it's worth getting right.\n\n**Typical per-head costs (UK):**\n- Buffet / food stations: £45–£75/head\n- 2-course sit-down: £55–£85/head\n- 3-course sit-down: £65–£110/head\n- Canapes + 3-course: £80–£130/head\n- Premium silver service: £100–£150+/head\n\n**Drinks:** Budget an extra £25–£50/head for a full open bar.\n\n**Popular formats:**\n- **Traditional sit-down** — formal, great for larger weddings\n- **Sharing platters** — relaxed, sociable, 15–20% cheaper\n- **Food stations** — very on-trend and theatrical\n\n**Dietary requirements to address:**\n- Vegan/vegetarian (should be a full dish, not an afterthought)\n- Halal/Kosher (specialist caterer required)\n- Nut allergies/coeliac (cross-contamination controls)\n\nHow many guests are you feeding?`,
          quickReplies: ['Under 50', '50–100', '100–150', '150+'],
        };
      }

      if (lower.includes('timeline') || lower.includes('when') || lower.includes('schedule') || lower.includes('plan')) {
        return {
          content: `Here's a strong wedding planning timeline:\n\n**12–18 months out**\n- Set budget and guest list\n- Book venue and registrar/church\n- Book photographer/videographer\n\n**9–12 months**\n- Catering, florist, entertainment\n- Dress/suits\n- Save the dates\n\n**6 months**\n- Invitations\n- Menu tasting\n- Decor plan\n- Transport/accommodation blocks\n\n**3 months**\n- Final fittings\n- Supplier confirmations\n- Seating plan draft\n\n**Final month**\n- Final numbers to venue/caterer\n- Emergency kit\n- Day schedule\n\nWhat date or month are you aiming for?`,
          quickReplies: ['This year', 'Next year', 'Not sure yet'],
        };
      }
    }

    // ── Corporate events ───────────────────────────────────────────────
    if (lower.includes('corporate') || lower.includes('work') || lower.includes('conference') || state.eventType === 'corporate' || state.eventType === 'conference') {
      return {
        content: `Corporate events need clarity on purpose first: is this for team building, client engagement, training, product launch, or networking?\n\n**Core planning areas:**\n- **Venue**: access, parking, AV, breakout rooms, Wi-Fi capacity\n- **Catering**: coffee breaks, lunch, dietary requirements\n- **AV/tech**: screens, microphones, hybrid streaming, tech support\n- **Branding**: signage, staging, registration desk\n- **Risk**: insurance, accessibility, fire routes, first aid\n\nTypical UK corporate day rates range from **£45–£120 per delegate** before major production/AV.\n\nWhat's the main purpose of the event?`,
        quickReplies: ['Team away-day', 'Conference', 'Product launch', 'Client event'],
      };
    }

    // ── Party / birthday / anniversary ─────────────────────────────────
    if (lower.includes('birthday') || lower.includes('party') || lower.includes('anniversary') || state.eventType === 'birthday' || state.eventType === 'party' || state.eventType === 'anniversary') {
      return {
        content: `Lovely — for a private celebration, the biggest decisions are usually venue, food, entertainment, and guest experience.\n\n**Typical UK costs:**\n- Venue hire: £300–£3,000+\n- Buffet/casual catering: £20–£55/head\n- DJ: £300–£900\n- Live music: £800–£3,000\n- Decor/balloons/florals: £250–£2,000\n\n**Best next step:** decide the vibe first — relaxed, premium, themed, family-friendly, or late-night party.\n\nHow many guests are you expecting?`,
        quickReplies: ['Under 30', '30–60', '60–100', '100+'],
      };
    }

    // Generic fallback
    return {
      content: `I can help with that. To give you useful advice, I need one key detail first: what type of event are you planning?`,
      quickReplies: ['Wedding', 'Birthday Party', 'Corporate Event', 'Anniversary', 'Other'],
    };
  }
}
