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
          content: `Food is what guests remember most — it's worth getting right.\n\n**Typical per-head costs (UK):**\n- Buffet / food stations: £45–£75/head\n- 2-course sit-down: £55–£85/head\n- 3-course sit-down: £65–£110/head\n- Canapes + 3-course: £80–£130/head\n- Premium silver service: £100–£150+/head\n\n**Drinks:** Budget an extra £25–£50/head for a full open bar.\n\n**Popular formats:**\n- **Traditional sit-down** — formal, great for larger weddings\n- **Sharing platters** — relaxed, sociable, 15–20% cheaper\n- **Food stations** — very on-trend and theatrical\n\n**Dietary requirements to address:**\n- Vegan/vegetarian (should be a full dish, not an afterthought)\n- Halal/Kosher (specialist caterer required)\n- Coeliac (dedicated prep area, not just gluten-removed)\n- Nut allergies (full allergen awareness)\n\nIs your venue dry hire, or does it have in-house catering?`,
          quickReplies: ['Dry hire venue', 'In-house catering', 'Dietary requirements', 'Drinks packages'],
        };
      }

      if (lower.includes('checklist') || lower.includes('timeline') || lower.includes('when')) {
        return {
          content: `Here's a milestone-based wedding planning timeline:\n\n**First 4 weeks:**\n- Set total budget and draft guest list\n- Book venue (most popular venues book 12–18 months ahead)\n- Book registrar/officiant\n\n**3–6 months out:**\n- Book photographer & videographer\n- Book band or DJ\n- Order wedding dress/suit (4–6 months for alterations)\n- Send save-the-dates\n- Book caterer and florist\n\n**2–3 months out:**\n- Send formal invitations\n- Arrange wedding insurance\n- Book hair & make-up\n- Plan order of service\n\n**4–6 weeks out:**\n- Chase RSVPs, finalise headcount\n- Give final numbers to caterer\n- Create table plan\n- Confirm all suppliers\n\n**Week of the wedding:**\n- Confirm day-of schedule with all suppliers\n- Prepare supplier payment envelopes\n- Delegate key tasks to wedding party 💍`,
          quickReplies: ['Supplier checklist', 'Budget breakdown', 'Guest management', 'Day-of schedule'],
        };
      }

      if (lower.includes('legal') || lower.includes('registrar') || lower.includes('notice') || lower.includes('licence') || lower.includes('banns')) {
        return {
          content: `Here are the legal requirements for getting married in the UK:\n\n**England & Wales:**\n- Give notice of marriage at your local register office (minimum 28 days before)\n- Both parties attend in person; must have lived in the district for 7+ days\n- Cost: ~£35 per person\n- For a licensed venue: the registrar attends your venue (fee: £400–£600)\n- Church of England: banns read in church for 3 consecutive Sundays beforehand\n\n**Scotland (different rules):**\n- Submit notice to the registrar at least 29 days before\n- More flexibility on outdoor/unlicensed locations\n\n**After the wedding:**\n- Collect your marriage certificate from the registrar\n- Update passport, driving licence, bank accounts, employer records as needed\n\nAre you getting married in England, Wales, Scotland, or Northern Ireland?`,
          quickReplies: ['England/Wales', 'Scotland', 'Northern Ireland', 'Destination wedding'],
        };
      }

      if (lower.includes('florist') || lower.includes('flowers')) {
        return {
          content: `Flowers can transform a space — and costs vary enormously.\n\n**Typical wedding floristry budgets:**\n- Budget: £1,000–£2,500 (simple, seasonal flowers)\n- Mid-range: £2,500–£5,000\n- Premium: £5,000–£15,000+\n\n**Key floral elements:**\n- Bridal bouquet: £150–£400\n- Bridesmaid bouquets: £60–£120 each\n- Buttonholes: £15–£35 each\n- Ceremony arch/focal flowers: £500–£3,000\n- Table centres: £60–£200 each\n\n**Cost-saving tips:**\n- Choose in-season, British-grown flowers\n- Use greenery-heavy designs (very stylish and cheaper)\n- Repurpose ceremony flowers at the reception\n- Opt for potted plants guests can take home\n\nWhat's your approximate floristry budget?`,
          quickReplies: ['Under £1,000', '£1,000–£3,000', '£3,000–£6,000', '£6,000+'],
        };
      }

      // Progressive detail gathering
      if (!state.eventDate) {
        return {
          content: "Congratulations! A wedding is such a special occasion — I'd love to help you plan it beautifully. 💍\n\nTo start narrowing things down, do you have a date or timeframe in mind?",
          quickReplies: ['This year', 'Next year', 'In 2+ years', "Haven't decided yet"],
        };
      }
      if (!state.guestCount) {
        return {
          content: "Your guest list is the single most important number in wedding planning — it drives your venue choice, catering costs, and almost every supplier quote.\n\nRoughly how many guests are you thinking?\n\n(Average UK wedding: around £30,000 — but great weddings happen at every budget!)",
          quickReplies: ['Under 30 (intimate)', '30–80 (medium)', '80–150 (large)', '150+ (very large)'],
        };
      }
      if (!state.budget) {
        return {
          content: "What's your approximate total budget? Don't worry about being exact — a rough range is all I need to start prioritising.",
          quickReplies: ['Under £10k', '£10k–£20k', '£20k–£50k', '£50k+'],
        };
      }

      return {
        content: `What aspect of your wedding would you like to explore?`,
        quickReplies: ['Venue advice', 'Catering & food', 'Photography', 'Legal requirements', 'Planning timeline'],
      };
    }

    // ── Birthday parties ────────────────────────────────────────────────
    if (lower.includes('birthday') || state.eventType === 'birthday') {
      if (lower.includes('18') || lower.includes('eighteenth')) {
        return {
          content: `An 18th birthday is a milestone! Here's what to plan:\n\n**Typical costs (50–100 guests):**\n- Venue hire: £300–£2,000\n- Catering (buffet/street food): £15–£35/head\n- DJ: £300–£800\n- Decorations: £150–£500\n\n**Popular formats:**\n- **Venue party** (bar, nightclub, function room) — budget £1,500–£5,000 for 50–100 guests\n- **Marquee at home** — personal, £2,000–£8,000\n- **Restaurant buyout** — intimate, great food, £50–£100/head\n- **Activity party** (escape rooms, bowling, go-kart) then dinner\n\nHow many guests are you expecting?`,
          quickReplies: ['Under 30', '30–60', '60–100', '100+'],
        };
      }

      if (lower.includes('50') || lower.includes('fiftieth') || lower.includes('milestone')) {
        return {
          content: `A 50th deserves a proper celebration! These tend to be more sophisticated.\n\n**Popular formats:**\n- **Dinner party** (restaurant or private dining room) — intimate, elegant, £60–£120/head\n- **Drinks reception + dinner** — £4,000–£12,000 for 60–80 guests\n- **Surprise party** — requires a trusted co-conspirator!\n- **Destination celebration** — long weekend abroad with close friends\n\n**What makes milestone birthdays memorable:**\n- A personalised element (photo montage, custom menu)\n- Good music — live jazz, acoustic, or a brilliant playlist\n- Quality food over quantity\n- A clear "moment" — speeches, a toast, something to mark the occasion\n\nHow many people are you inviting?`,
          quickReplies: ['Under 20', '20–40', '40–80', '80+'],
        };
      }

      if (!state.guestCount) {
        return {
          content: "A birthday celebration — wonderful! 🎂\n\nThe guest list size shapes everything — venue size, catering format, entertainment. Are you thinking intimate or a bigger party?",
          quickReplies: ['Intimate (under 20)', 'Small (20–50)', 'Medium (50–100)', 'Large (100+)'],
        };
      }

      return {
        content: `For a birthday party with ${state.guestCount || 'your group'}:\n\n**Key things to lock in first:**\n1. **Venue** — private dining room, function room, or hired space\n2. **Date** — at least 4–6 weeks ahead for a good venue\n3. **Catering style** — sit-down, buffet, or street food?\n\n**Typical all-in costs:**\n- Budget: £500–£2,000 (DIY elements, small space)\n- Mid-range: £2,000–£6,000 (venue + caterer + DJ)\n- Premium: £6,000+ (full-service planning)\n\nWhat's your approximate budget?`,
        quickReplies: ['Under £2k', '£2k–£5k', '£5k–£10k', '£10k+'],
      };
    }

    // ── Corporate events ────────────────────────────────────────────────
    if (lower.includes('corporate') || lower.includes('away day') || lower.includes('away-day') || lower.includes('work event') || state.eventType === 'corporate') {
      if (lower.includes('away day') || lower.includes('away-day') || lower.includes('team building') || lower.includes('team day')) {
        return {
          content: `Team away-days done well are genuinely motivating. Here's how to get it right:\n\n**Formats that work:**\n- **Activity + debrief** (escape rooms, cooking class, sports) — great for up to 40 people\n- **Off-site strategy day** — focuses minds, being away from the office is key\n- **Combination day** — morning workshop + afternoon activity + group dinner\n\n**Typical costs:**\n- Venue hire (half/full day): £500–£3,000\n- Activity (per person): £30–£120\n- Catering (working lunch): £20–£45/head\n- Evening dinner: £45–£85/head\n\n**What makes them work:**\n- Clear objectives shared in advance\n- Mix of structured and unstructured time\n- Activities that don't exclude anyone (physical ability, dietary needs)\n- Quality food — it really matters\n\nHow many people in the team?`,
          quickReplies: ['Under 20', '20–50', '50–100', '100+'],
        };
      }

      if (lower.includes('conference') || lower.includes('seminar')) {
        return {
          content: `Conferences require detailed logistics. Here's what to focus on:\n\n**Venue requirements:**\n- Main plenary room (theatre or cabaret seating?)\n- Breakout rooms for parallel sessions\n- Registration area with queuing space\n- Separate catering areas (noise!)\n- A/V booth and tech area\n- Green room for speakers\n\n**Technology checklist:**\n- PA system + lapel/handheld/podium microphones\n- Large-format display or projection\n- Reliable WiFi (separate delegate network recommended)\n- Live streaming capability if needed\n\n**Typical costs per delegate:**\n- Venue + AV: £50–£150/head\n- Catering (refreshments + lunch): £35–£75/head\n\n**Key lead times:**\n- Venue: 6–18 months depending on size\n- Keynote speakers: 3–12 months\n- Save-the-date: 3 months before; formal invite 6–8 weeks\n\nHow many delegates, and when is the event?`,
          quickReplies: ['Under 50', '50–150', '150–300', '300+'],
        };
      }

      if (lower.includes('product launch') || lower.includes('launch')) {
        return {
          content: `Product launches need to create a moment — something worth talking about.\n\n**Core elements:**\n1. **Brand-appropriate venue** — the space should reflect the product\n2. **A clear story arc** — arrival → reveal → celebration\n3. **Media management** — press list, embargo, photography, social plan\n4. **Product demo area** — hands-on experience\n\n**Venue considerations:**\n- A/V support (blackout, large screens, surround sound)\n- Photogenic for press photography\n- Central location for press and key guests\n\n**Timeline:**\n- T–8 weeks: Confirm venue and A/V\n- T–6 weeks: Press list and embargo communications\n- T–2 weeks: Full tech rehearsal\n- T–1 day: Set up and test everything\n\nHow many guests are you inviting?`,
          quickReplies: ['Under 50', '50–150', '150+', 'Press-only event'],
        };
      }

      return {
        content: `Corporate events cover a huge range. What type are you planning?`,
        quickReplies: ['Conference / seminar', 'Team away-day', 'Product launch', 'Client dinner', 'Awards evening'],
      };
    }

    // ── Anniversary ─────────────────────────────────────────────────────
    if (lower.includes('anniversary') || state.eventType === 'anniversary') {
      return {
        content: `A beautiful occasion to celebrate! 🥂\n\n**Popular formats:**\n- **Intimate dinner** (private dining, £60–£120/head) — elegant and memorable\n- **Vow renewal** + reception — popular for 10th, 25th, 50th anniversaries\n- **Garden party** — seasonal, relaxed, great for larger groups\n- **Surprise party** — requires trusted accomplices!\n\n**Traditional milestones:**\n- 10th: Tin · 15th: Crystal · 20th: China · 25th: Silver · 30th: Pearl · 40th: Ruby · 50th: Gold · 60th: Diamond\n\n**What makes it special:**\n- Return to the original venue if available\n- Recreate the original menu\n- Commission a personalised piece of art or jewellery\n\nIs this a milestone anniversary? And are you thinking intimate or a larger gathering?`,
        quickReplies: ['Intimate dinner', 'Small gathering (20–40)', 'Larger celebration', 'Vow renewal'],
      };
    }

    // ── Cost / budget questions ─────────────────────────────────────────
    if (lower.includes('budget') || lower.includes('cost') || lower.includes('price') || lower.includes('how much') || lower.includes('expensive') || lower.includes('afford')) {
      const eventLabel = state.eventType || 'an event';
      return {
        content: `Here are realistic UK cost ranges:\n\n**Weddings:**\n- Budget: £10,000–£15,000\n- Mid-range: £20,000–£35,000\n- Premium: £50,000–£100,000+\n\n**Birthday parties (50 guests):**\n- Budget: £1,500–£3,000\n- Mid-range: £3,000–£8,000\n- Premium: £8,000+\n\n**Corporate events (100 delegates):**\n- Half-day: £5,000–£15,000\n- Full day + dinner: £15,000–£40,000\n\n**The 3 biggest cost levers:**\n1. **Guest count** — adding 20 wedding guests can add £2,000–£4,000\n2. **Day of week** — Friday/Sunday vs. Saturday saves 20–30% on the venue\n3. **Catering style** — buffet vs. silver service differs by £30–£50/head\n\nWhat's your approximate budget for ${eventLabel}?`,
        quickReplies: ['Under £5k', '£5k–£10k', '£10k–£20k', '£20k–£50k', '£50k+'],
      };
    }

    // ── Venue questions ─────────────────────────────────────────────────
    if (lower.includes('venue') || (lower.includes('where') && (lower.includes('hold') || lower.includes('host')))) {
      const loc = state.location || 'the UK';
      const eventLabel = state.eventType || 'your event';
      return {
        content: `Finding the right venue is the most critical early decision.\n\n**Key questions to ask every venue:**\n- Maximum capacity (seated vs. standing)?\n- Exclusive hire, or will other events run simultaneously?\n- In-house catering (mandatory or optional)?\n- What's included in the hire fee?\n- Alcohol licence? Noise curfew?\n- Parking / nearby transport?\n- Fully accessible?\n\n**Venue styles in ${loc}:**\n- **Hotels** — convenient, often all-inclusive\n- **Country houses / estates** — beautiful settings\n- **Barns & agricultural spaces** — character, usually dry hire\n- **Civic / heritage buildings** — unique, often great value\n- **Restaurants with private rooms** — great for smaller events\n\n**For ${eventLabel}:** Visit at least 3 venues before committing. Always get a full written quote including extras. Check the cancellation policy carefully.\n\nHow many guests are you planning for?`,
        quickReplies: ['Under 50', '50–100', '100–150', '150+'],
      };
    }

    // ── Catering / food ─────────────────────────────────────────────────
    if (lower.includes('catering') || lower.includes('caterer') || lower.includes('food') || lower.includes('menu') || lower.includes('buffet')) {
      return {
        content: `Food is what guests remember — it's worth getting right.\n\n**Catering styles and typical UK costs:**\n- Canapes only (drinks reception): £20–£40/head\n- Buffet / sharing platters: £35–£65/head\n- BBQ / street food: £30–£55/head\n- 2-course sit-down: £55–£85/head\n- 3-course sit-down: £65–£110/head\n- Premium silver service: £100–£150+/head\n\n**Drinks (budget separately):**\n- Wine and beer package: £20–£35/head\n- Full open bar (5 hours): £40–£70/head\n\n**Dietary requirements — always ask guests:**\n- Vegan/vegetarian (proper dish, not an afterthought)\n- Halal (dedicated certified caterer or certified supplier)\n- Kosher (specialist caterer required)\n- Gluten-free/coeliac (separate prep area)\n- Nut allergies (full allergen awareness, labelled dishes)\n\n**Pro tip:** Ask the caterer for a tasting before committing — reputable caterers offer this for weddings and larger events.\n\nWhat type of event is this for?`,
        quickReplies: ['Wedding catering', 'Corporate catering', 'Birthday party food', 'Dietary requirements'],
      };
    }

    // ── Photographer / photography ──────────────────────────────────────
    if (lower.includes('photographer') || lower.includes('photography')) {
      return {
        content: `Finding the right photographer is crucial — these are memories you'll have forever.\n\n**Typical UK rates:**\n- Budget: £800–£1,500\n- Mid-range: £1,500–£2,500\n- Premium: £2,500–£4,500+\n\n**What to look for:**\n- Portfolio showing consistent quality across varied lighting\n- Experience with your type of event and venue\n- Public liability insurance\n- Backup camera (equipment fails)\n- Clear contract with delivery timelines\n\n**Questions to ask:**\n- Can I see a full gallery from a recent similar event?\n- What's your shooting style (documentary, posed, or both)?\n- What happens if you're ill on the day?\n- Do you offer pre-event shoots?\n\n**Where to find vetted photographers:**\n- Hitched.co.uk, Rock My Wedding (weddings)\n- Bridebook.com\n- SWPP (Society of Wedding & Portrait Photographers)\n\nWhat region are you in?`,
        quickReplies: ['London/South East', 'North of England', 'Midlands', 'Scotland/Wales'],
      };
    }

    // ── Florist / flowers ───────────────────────────────────────────────
    if (lower.includes('florist') || lower.includes('flowers') || lower.includes('floral')) {
      return {
        content: `Flowers can transform a space — and costs vary enormously.\n\n**Typical wedding floristry budgets:**\n- Budget: £1,000–£2,500 (simple, seasonal flowers)\n- Mid-range: £2,500–£5,000\n- Premium: £5,000–£15,000+\n\n**Key floral elements:**\n- Bridal bouquet: £150–£400\n- Bridesmaid bouquets: £60–£120 each\n- Buttonholes: £15–£35 each\n- Ceremony arch: £500–£3,000\n- Table centres: £60–£200 each\n\n**Cost-saving tips:**\n- Choose in-season, British-grown flowers\n- Use greenery-heavy designs (stylish and cheaper)\n- Repurpose ceremony flowers at the reception\n\n**What to ask your florist:**\n- Can they work within your budget?\n- What's in season for your date?\n- Do they handle set-up and breakdown?\n\nWhat's your approximate floristry budget?`,
        quickReplies: ['Under £1,000', '£1,000–£3,000', '£3,000–£6,000', '£6,000+'],
      };
    }

    // ── Entertainment / music ───────────────────────────────────────────
    if (lower.includes('dj') || lower.includes('band') || lower.includes('music') || lower.includes('entertainment')) {
      return {
        content: `Entertainment sets the energy of your event — worth investing in.\n\n**Music options and typical UK costs:**\n\n**DJ:**\n- Budget: £300–£600\n- Mid-range: £600–£1,200\n- Premium: £1,200–£3,000+\n- Usually includes: PA system, lighting rig, wireless microphone\n\n**Live band:**\n- 3-piece function band: £1,200–£2,500\n- 4–5 piece band: £2,000–£4,000\n- 6-piece+ (with brass): £3,500–£8,000+\n- Most include 2–3 sets + DJ service between sets\n\n**Other popular options:**\n- String quartet / jazz trio (ceremony): £600–£1,500\n- Solo acoustic act: £300–£700\n- Photo booth: £600–£1,200\n- Silent disco: £600–£1,500 (great for noise-restricted venues)\n\n**Pro tips:**\n- Always see a band live or ask for a recent live video\n- Confirm PA and lighting is included\n- Check your venue's noise restrictions\n- For weddings, confirm they'll learn your first dance song\n\nWhat type of entertainment are you looking for?`,
        quickReplies: ['DJ only', 'Live band', 'Both DJ + band', 'Ceremony music only'],
      };
    }

    // ── Timeline / checklist ────────────────────────────────────────────
    if (lower.includes('timeline') || lower.includes('checklist') || lower.includes('when should') || lower.includes('how far in advance') || lower.includes('lead time')) {
      const eventLabel = state.eventType || 'your event';
      return {
        content: `Here's a planning timeline for ${eventLabel}:\n\n**18+ months before:**\n- Set budget and guest list\n- Secure your venue\n\n**12–18 months before:**\n- Book registrar/officiant (if applicable)\n- Book photographer and videographer\n- Book band or DJ\n\n**6–12 months before:**\n- Send save-the-dates\n- Book caterer and florist\n- Order attire (4–6 months for alterations)\n- Book accommodation block for guests\n\n**3–6 months before:**\n- Send formal invitations\n- Arrange event insurance\n- Finalise menu and table layout\n\n**4–8 weeks before:**\n- Chase RSVPs, finalise headcount\n- Give final numbers to caterer\n- Confirm all suppliers\n\n**Week before:**\n- Final briefing to all suppliers\n- Prepare payments\n- Delegate day-of tasks\n\nWould you like a more specific checklist for your event type?`,
        quickReplies: ['Wedding checklist', 'Corporate event', 'Birthday party', 'Supplier checklist'],
      };
    }

    // ── Insurance / legal ───────────────────────────────────────────────
    if (lower.includes('insurance') || lower.includes('cancel') || lower.includes('cancellation') || lower.includes('contract') || lower.includes('legal')) {
      return {
        content: `Event insurance is often overlooked but genuinely important.\n\n**What good event insurance covers:**\n- **Cancellation & rescheduling** (illness, bereavement, adverse weather, venue failure)\n- **Supplier failure** (photographer doesn't turn up, caterer goes bust)\n- **Public liability** (essential for public or venue-hire events)\n- **Personal accident** (injury to guests)\n\n**Typical UK costs:**\n- Wedding insurance: £60–£200 (up to £30,000 cancellation cover)\n- Corporate event: £100–£500 depending on size\n\n**When to get it:** As soon as you start paying deposits.\n\n**Recommended providers:**\n- Dreamsaver, Wedinsure (wedding specialists)\n- John Lewis Finance (event insurance)\n- Hiscox (corporate events)\n\n**Contract tips:**\n- Every supplier needs a written contract\n- Check what happens if THEY cancel\n- Confirm deposit terms and final payment dates\n- Understand force majeure clauses\n\nDo you have a specific insurance or contract question?`,
        quickReplies: ['Wedding insurance', 'Supplier contracts', 'Public liability', 'Cancellation terms'],
      };
    }

    // ── Dietary requirements ────────────────────────────────────────────
    if (lower.includes('dietary') || lower.includes('vegan') || lower.includes('halal') || lower.includes('kosher') || lower.includes('coeliac') || lower.includes('gluten') || lower.includes('allerg')) {
      return {
        content: `Managing dietary requirements well is a mark of a thoughtful host.\n\n**How to collect requirements:**\n- Ask on your RSVP form (list common options + a free text field)\n- Collect 4–6 weeks before the event\n- Share a master spreadsheet with your caterer\n\n**What your caterer needs to handle:**\n- **Vegetarian/vegan**: A proper dish, not just removal of meat\n- **Halal**: Certified halal meat, no cross-contamination\n- **Kosher**: Specialist kosher caterer with separate equipment\n- **Coeliac**: Dedicated prep area (cross-contamination is a real risk)\n- **Nut allergies**: Full allergen awareness, clearly labelled dishes\n- **Dairy-free**: Ensure caterer distinguishes from lactose intolerance\n\n**Questions to ask your caterer:**\n- Are staff trained in allergen awareness?\n- Do you have a dedicated allergen-free prep area?\n- Can you provide allergen information for every dish?\n\n**Accessibility too:**\n- Step-free access for wheelchair users\n- Induction loops for hearing-impaired guests\n- Reserved tables near the front for elderly guests\n\nWould you like advice on wording your RSVP form?`,
        quickReplies: ['RSVP form wording', 'Finding halal caterers', 'Coeliac-safe menus', 'Accessibility checklist'],
      };
    }

    // ── Invitations / stationery ────────────────────────────────────────
    if (lower.includes('invit') || lower.includes('stationery') || lower.includes('save the date') || lower.includes('save-the-date') || lower.includes('rsvp')) {
      return {
        content: `Invitations set the tone for your event before guests even arrive.\n\n**For weddings — typical suite:**\n- Save-the-dates (send 9–12 months before)\n- Formal invitations + RSVP cards (send 8–10 weeks before)\n- Order of service booklets\n- Table plan and place cards\n\n**Typical UK costs:**\n- DIY/digital: £0–£300\n- Mid-range printed suite (50 invites): £300–£800\n- Premium letterpress/foil (50 invites): £600–£2,000\n\n**Digital vs. printed:**\n- Online RSVPs save money and are eco-friendly\n- Printed invitations feel more premium for weddings\n- Many couples do printed invitations + digital save-the-dates\n\n**What to include:**\n- Full names, date, time, and location\n- Dress code\n- RSVP method and deadline\n- Dietary requirement section\n- Accommodation information\n- Gift list (tactfully)\n\n**When to send:**\n- Save-the-dates: 9–12 months ahead\n- Formal invitations: 8–10 weeks before\n- RSVP deadline: 4–6 weeks before\n\nAre you looking for wording advice or supplier recommendations?`,
        quickReplies: ['Invitation wording', 'Digital invites', 'Printed stationery', 'RSVP management'],
      };
    }

    // ── Speeches ────────────────────────────────────────────────────────
    if (lower.includes('speech') || lower.includes('speeches') || lower.includes('toast') || lower.includes('best man') || lower.includes('maid of honour')) {
      return {
        content: `Speeches are one of the most memorable parts of a celebration.\n\n**Traditional wedding speech order (UK):**\n1. Father of the bride (welcomes groom's family, talks about the bride)\n2. Groom or couple (thanks guests, praises partner, thanks families)\n3. Best man (humorous anecdotes, toasts the couple)\n\n**Modern variations:**\n- Bride and/or both partners speak (increasingly common)\n- Maid of honour speaks\n- Video messages from guests who can't attend\n\n**Length guidance:**\n- Each speech: 3–5 minutes (5 is plenty, 8 is too long)\n- Total speeches: under 25 minutes\n\n**Tips for speechmakers:**\n- Write it fully, then speak from bullet points\n- Practise out loud at least 3 times and time it\n- Have water nearby\n- Make eye contact with the couple, not just the room\n- End with a clear, memorable toast\n\n**Structure:**\n1. Attention-grabbing opening\n2. 1–2 personal stories/anecdotes\n3. Acknowledge families and key guests\n4. Heartfelt toast\n\nWould you like help with specific speech content?`,
        quickReplies: ['Father of bride speech', 'Best man speech', 'Couple speech', 'Maid of honour speech'],
      };
    }

    // ── Dress code ──────────────────────────────────────────────────────
    if (lower.includes('dress code') || lower.includes('what to wear') || lower.includes('black tie') || lower.includes('smart casual') || lower.includes('lounge suit')) {
      return {
        content: `Dress codes can be confusing — here's a clear guide:\n\n**Black tie**\n- Men: black dinner jacket (tuxedo), black bow tie, white dress shirt\n- Women: floor-length gown or very formal cocktail dress\n- When: evening galas, awards dinners, formal weddings\n\n**Black tie optional / cocktail**\n- Men: dark lounge suit is perfectly fine\n- Women: cocktail dress (knee to midi), smart jumpsuit\n\n**Lounge suit** (most UK weddings)\n- Men: suit and tie (jacket + smart trousers also fine)\n- Women: dress, skirt/top, smart trousers or suit\n\n**Smart casual**\n- Men: chinos + open-collar shirt or blazer (no jeans unless stated)\n- Women: casual dress, smart jeans + nice top, or relaxed midi dress\n\n**Practical tips:**\n- Always specify dress code on the invitation\n- For outdoor events, suggest appropriate footwear (heels + lawn = disaster!)\n- For winter weddings, suggest guests bring a wrap/jacket\n\nDo you need help wording the dress code on your invitations?`,
        quickReplies: ['Wording for invitations', 'Black tie event tips', 'Summer garden party', 'Smart casual guidance'],
      };
    }

    // ── Honeymoon ───────────────────────────────────────────────────────
    if (lower.includes('honeymoon') || (lower.includes('holiday') && state.eventType === 'wedding') || (lower.includes('travel') && state.eventType === 'wedding')) {
      return {
        content: `Honeymoon planning is one of the most enjoyable parts of wedding prep!\n\n**When to book:** 6–12 months ahead for popular destinations.\n\n**Popular UK honeymoon styles:**\n- **Long-haul** (Maldives, Bali, Thailand, Mauritius): £4,000–£12,000+\n- **European** (Amalfi, Santorini, Tuscany, French Riviera): £2,000–£6,000\n- **City break** (Paris, Venice, Prague, Lisbon): £1,500–£4,000\n- **UK & Ireland** (Scottish Highlands, Cotswolds, Lake District): £500–£2,500\n\n**Tips:**\n- Always tell the hotel it's your honeymoon — often leads to upgrades\n- Consider a "minimoon" shortly after the wedding + main trip later\n- Use a specialist honeymoon travel agent for better rates\n- Check your passport expiry before booking\n\n**Before you travel:**\n- Travel insurance (essential)\n- Visa requirements if you've changed your name\n- Currency and cards\n- Any required vaccinations\n\nWhere are you thinking of going?`,
        quickReplies: ['Maldives / Bali / Thailand', 'Italy / Greece', 'City break', 'UK staycation'],
      };
    }

    // ── Fallback: missing core detail ───────────────────────────────────
    if (!state.eventType) {
      return {
        content: "I'm here to help with every aspect of event planning — venues, budgets, suppliers, timelines, legal requirements, and more. To get started with the most relevant advice, what type of event are you planning?",
        quickReplies: ['Wedding', 'Birthday Party', 'Corporate Event', 'Anniversary', 'Other'],
      };
    }

    if (!state.budget) {
      return {
        content: `To give you the most specific advice for your ${state.eventType}, it really helps to know your budget range. What's your approximate total budget?`,
        quickReplies: ['Under £5k', '£5k–£10k', '£10k–£20k', '£20k–£50k', '£50k+'],
      };
    }

    if (!state.location) {
      return {
        content: `Almost there! Where will your ${state.eventType} be held? Knowing the region lets me give you location-specific venue suggestions and help you find local suppliers.`,
        quickReplies: ['London', 'South East', 'North West', 'Yorkshire', 'Midlands', 'Scotland'],
      };
    }

    return {
      content: `I can help with many aspects of planning your ${state.eventType || 'event'}${state.location ? ` in ${state.location}` : ''}. What would you like to focus on?`,
      quickReplies: ['Venue advice', 'Budget breakdown', 'Supplier search', 'Planning timeline', 'Legal requirements'],
    };
  }
}
