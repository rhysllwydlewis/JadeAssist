/**
 * LLM Service - Abstraction layer for Language Model interactions
 * Currently uses OpenAI but designed to be swappable
 */
import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { LLM_SETTINGS } from '../utils/constants';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

type ProviderErrorShape = {
  status?: unknown;
  code?: unknown;
  type?: unknown;
  message?: unknown;
  response?: { status?: unknown };
  error?: { code?: unknown; type?: unknown; message?: unknown };
};

type BudgetRange = { min?: number; max?: number; label?: string; raw?: string };
type LocalPlannerContext = {
  eventType?: string;
  eventDate?: string;
  guestCount?: string;
  budget?: BudgetRange;
  location?: string;
};

const RETRYABLE_PROVIDER_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalise(value: unknown): string {
  return readString(value).trim().toLowerCase();
}

function providerError(error: unknown): ProviderErrorShape {
  return (error ?? {}) as ProviderErrorShape;
}

function providerErrorMessage(error: unknown): string {
  const err = providerError(error);
  return readString(err.error?.message) || readString(err.message);
}

function providerStatus(error: unknown): number | undefined {
  const err = providerError(error);
  const status = err.status ?? err.response?.status;
  return typeof status === 'number' ? status : undefined;
}

function latestUserMessage(messages: LLMMessage[]): string {
  return [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
}

function knownContextValue(message: string, label: string): string | undefined {
  const context = /\[(?:Known context|Context): ([\s\S]*?)\]/i.exec(message)?.[1];
  if (!context) return undefined;

  const pair = context
    .split('|')
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return pair?.split(':').slice(1).join(':').trim();
}

function hasAny(message: string, terms: string[]): boolean {
  const lower = message.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function extractSearchResultLines(message: string): string[] {
  const section = /\[Relevant EventFlow search results\]\n([\s\S]*)$/i.exec(message)?.[1];
  if (!section) return [];

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .slice(0, 5);
}

function sanitizeLatestUserMessage(message: string): string {
  return message.replace(/\n\n\[(?:Known context|Context|Relevant EventFlow search results)[\s\S]*$/i, '').trim();
}

export function sanitisePlannerInput(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function moneyLabel(value?: number): string | undefined {
  return value === undefined ? undefined : `£${Math.round(value).toLocaleString('en-GB')}`;
}

function parseMoneyAmount(rawAmount: string, rawSuffix?: string): number | undefined {
  const value = Number(rawAmount.replace(/,/g, ''));
  if (!Number.isFinite(value)) return undefined;
  const suffix = rawSuffix?.toLowerCase();
  return value * (suffix && ['k', 'thousand', 'grand'].includes(suffix) ? 1000 : 1);
}

export function parseBudgetRange(input: string | undefined): BudgetRange | undefined {
  if (!input) return undefined;
  const text = sanitisePlannerInput(input).toLowerCase();
  const moneyPattern = '£?\\s*(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)\\s*(k|thousand|grand)?';

  const underMatch = new RegExp(
    `\\b(?:under|up to|less than|below|max(?:imum)?|no more than)\\s*${moneyPattern}`,
    'i'
  ).exec(text);
  if (underMatch) {
    const max = parseMoneyAmount(underMatch[1], underMatch[2]);
    return max === undefined ? undefined : { max, label: `under ${moneyLabel(max)}`, raw: input };
  }

  const overMatch = new RegExp(
    `\\b(?:over|above|more than|minimum|min|from)\\s*${moneyPattern}`,
    'i'
  ).exec(text);
  if (overMatch) {
    const min = parseMoneyAmount(overMatch[1], overMatch[2]);
    return min === undefined ? undefined : { min, label: `${moneyLabel(min)}+`, raw: input };
  }

  const rangeMatch = new RegExp(`${moneyPattern}\\s*(?:-|to)\\s*${moneyPattern}`, 'i').exec(text);
  if (rangeMatch) {
    const left = parseMoneyAmount(rangeMatch[1], rangeMatch[2] || rangeMatch[4]);
    const right = parseMoneyAmount(rangeMatch[3], rangeMatch[4] || rangeMatch[2]);
    if (left !== undefined && right !== undefined) {
      const min = Math.min(left, right);
      const max = Math.max(left, right);
      return { min, max, label: `${moneyLabel(min)}–${moneyLabel(max)}`, raw: input };
    }
  }

  const aroundMatch = new RegExp(
    `\\b(?:around|about|approx(?:imately)?|roughly|circa)\\s*${moneyPattern}`,
    'i'
  ).exec(text);
  if (aroundMatch) {
    const value = parseMoneyAmount(aroundMatch[1], aroundMatch[2]);
    if (value !== undefined) {
      const tolerance = Math.max(500, Math.round(value * 0.1));
      const min = Math.max(100, value - tolerance);
      const max = value + tolerance;
      return { min, max, label: `${moneyLabel(min)}–${moneyLabel(max)}`, raw: input };
    }
  }

  const plusMatch = new RegExp(`${moneyPattern}\\s*\\+`, 'i').exec(text);
  if (plusMatch) {
    const min = parseMoneyAmount(plusMatch[1], plusMatch[2]);
    return min === undefined ? undefined : { min, label: `${moneyLabel(min)}+`, raw: input };
  }

  const explicitBudget = /\b(budget|spend|cost|price|afford)\b/.test(text);
  const hasCurrency = /[£$]/.test(text);
  const hasBudgetSuffix = /\b\d+(?:\.\d+)?\s*(k|thousand|grand)\b/i.test(text);
  if (!explicitBudget && !hasCurrency && !hasBudgetSuffix) return undefined;

  const singleMatch = new RegExp(`${moneyPattern}`, 'i').exec(text);
  if (singleMatch) {
    const value = parseMoneyAmount(singleMatch[1], singleMatch[2]);
    return value === undefined ? undefined : { min: value, max: value, label: moneyLabel(value), raw: input };
  }

  return undefined;
}

function detectEventType(message: string): string | undefined {
  const lower = message.toLowerCase();
  if (/\b(wedding|marriage|civil partnership|bride|groom)\b/.test(lower)) return 'wedding';
  if (/\b(birthday|18th|21st|30th|40th|50th|60th)\b/.test(lower)) return 'birthday party';
  if (/\b(corporate|work event|team away|away day|launch|networking)\b/.test(lower)) return 'corporate event';
  if (/\b(conference|seminar|symposium|summit|expo)\b/.test(lower)) return 'conference';
  if (/\b(anniversary|vow renewal)\b/.test(lower)) return 'anniversary';
  if (/\b(party|celebration|private event)\b/.test(lower)) return 'party';
  return undefined;
}

function detectGuestCount(message: string): string | undefined {
  const match = /\b(\d{1,4})\s*(guests?|people|attendees?|pax|adults|children)\b/i.exec(message);
  return match?.[1];
}

function detectLocation(message: string): string | undefined {
  const lower = message.toLowerCase();
  const aliases: Record<string, string> = {
    'south wales': 'South Wales',
    'north wales': 'North Wales',
    london: 'London',
    cardiff: 'Cardiff',
    swansea: 'Swansea',
    newport: 'Newport',
    bolton: 'Bolton',
    bristol: 'Bristol',
    birmingham: 'Birmingham',
    manchester: 'Manchester',
  };

  for (const [needle, label] of Object.entries(aliases)) {
    if (lower.includes(needle)) return label;
  }

  const explicit = /\b(?:in|near|around|at)\s+([a-zA-Z][a-zA-Z\s'-]{2,40})(?:[,.!?]|$)/i.exec(message);
  return explicit?.[1]?.trim();
}

function detectDateOrTimeframe(message: string): string | undefined {
  const timeframe = /\b(next year|this year|next month|next summer|next spring|next autumn|next winter|this summer|this autumn|this winter)\b/i.exec(
    message
  )?.[1];
  if (timeframe) return timeframe;
  const date = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.exec(message)?.[0];
  if (date) return date;
  return /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i.exec(
    message
  )?.[0];
}

function buildContextFromMessage(latest: string): LocalPlannerContext {
  const sanitizedLatest = sanitizeLatestUserMessage(latest);
  const eventDate =
    knownContextValue(latest, 'Event Date/Timeframe') ??
    knownContextValue(latest, 'Event Date') ??
    knownContextValue(latest, 'Date') ??
    detectDateOrTimeframe(sanitizedLatest);

  return {
    eventType: knownContextValue(latest, 'Event Type') ?? detectEventType(sanitizedLatest),
    guestCount: knownContextValue(latest, 'Guest Count') ?? detectGuestCount(sanitizedLatest),
    location: knownContextValue(latest, 'Location') ?? detectLocation(sanitizedLatest),
    eventDate,
    budget: parseBudgetRange(knownContextValue(latest, 'Budget')) ?? parseBudgetRange(sanitizedLatest),
  };
}

function formatBudget(context: LocalPlannerContext): string | undefined {
  return context.budget?.label;
}

function summarizePlannerState(context: LocalPlannerContext): string {
  const parts = [
    context.eventType ? `event type: ${context.eventType}` : undefined,
    context.eventDate ? `date/timeframe: ${context.eventDate}` : undefined,
    context.guestCount ? `guest count: ${context.guestCount}` : undefined,
    context.budget?.label ? `budget: ${context.budget.label}` : undefined,
    context.location ? `location: ${context.location}` : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : 'no firm event details captured yet';
}

function getMissingDetails(context: LocalPlannerContext): string[] {
  const missing: string[] = [];
  if (!context.eventType) missing.push('event type');
  if (!context.eventDate) missing.push('date or timeframe');
  if (!context.guestCount) missing.push('guest count');
  if (!context.budget?.label) missing.push('overall budget');
  if (!context.location) missing.push('location or region');
  return missing;
}

function buildBrief(context: LocalPlannerContext): string {
  const budgetText = formatBudget(context);
  return [
    context.eventType ?? 'event',
    context.location ? `in ${context.location}` : undefined,
    context.guestCount ? `for ${context.guestCount} guests` : undefined,
    budgetText ? `with a ${budgetText} budget` : undefined,
  ]
    .filter(Boolean)
    .join(' ');
}

function buildRecommendationFallback(prefix: string, latest: string, brief: string): string | undefined {
  const resultLines = extractSearchResultLines(latest);
  if (resultLines.length === 0) return undefined;

  const sanitizedLatest = sanitizeLatestUserMessage(latest);
  const asksForVenue = hasAny(sanitizedLatest, ['venue', 'venues', 'room', 'space', 'location']);
  const asksForAccommodation = hasAny(sanitizedLatest, ['hotel', 'hotels', 'accommodation', 'stay']);
  const asksToFind = hasAny(sanitizedLatest, ['find', 'recommend', 'recommendation', 'shortlist', 'near']);

  if (!asksToFind && !asksForVenue && !asksForAccommodation) return undefined;

  const heading = asksForAccommodation
    ? `Here are accommodation starting points I found for your ${brief}:`
    : `Here are supplier/search starting points I found for your ${brief}:`;

  const recommendations = resultLines.map((line) => `- ${line.replace(/^\d+\.\s+/, '')}`).join('\n');

  return `${prefix}\n\n${heading}\n\n${recommendations}\n\nBest next step: open 2–3 links or profiles that fit the style, location and guest logistics, then ask each for capacity, availability, minimum spend/package pricing, what's included, and any music/access restrictions. If a result is an online-search fallback, use it to discover live suppliers; if it is an EventFlow profile link, you can visit that supplier profile directly. Availability and pricing can change, so treat this as a shortlist to verify rather than a confirmed booking.`;
}

function isFragment(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return (
    lower.length < 4 ||
    ['i have', "i've", 'yes', 'yeah', 'yep', 'no', 'not sure', 'maybe', 'other'].includes(lower)
  );
}

function askForMissingDetail(prefix: string, context: LocalPlannerContext): string {
  const nextMissing = getMissingDetails(context)[0];
  const summary = summarizePlannerState(context);

  if (!nextMissing) {
    return `${prefix}\n\nI have the core brief captured: ${summary}. What would you like to work on next — supplier shortlist, budget breakdown, timeline, or guest experience?`;
  }

  const questionMap: Record<string, string> = {
    'event type': 'What type of event are you planning?',
    'date or timeframe': 'What date or general timeframe are you aiming for?',
    'guest count': 'Roughly how many guests are you expecting?',
    'overall budget': 'What overall budget range are you working with?',
    'location or region': 'Which town, city or region should I plan around?',
  };

  return `${prefix}\n\nI have: ${summary}.\n\n${questionMap[nextMissing] ?? `Please tell me your ${nextMissing}.`}`;
}

function buildBudgetGuidance(prefix: string, context: LocalPlannerContext, brief: string): string {
  const budgetText = formatBudget(context);
  if (!budgetText) {
    if (!context.guestCount) {
      return `${prefix}\n\nI can help with budget, but I need one detail first: roughly how many guests are you expecting? Guest count controls catering, venue capacity and most supplier costs.`;
    }

    return `${prefix}\n\nFor a UK wedding, a realistic starting budget is often £15,000–£35,000, but smaller regional weddings can work below £10,000 if the guest list and venue costs are tightly controlled.\n\nWhat overall budget range are you aiming for?`;
  }

  const rangeBase = context.budget?.max ?? context.budget?.min ?? 0;
  const amount = (percent: number) => Math.round((rangeBase * percent) / 100);

  return `${prefix}\n\nFor your ${brief}, use ${budgetText} as the working budget and protect the range rather than flattening it to one number. A practical split is:\n\n- Venue: about £${amount(25).toLocaleString('en-GB')}–£${amount(35).toLocaleString('en-GB')}\n- Food and drink: about £${amount(30).toLocaleString('en-GB')}–£${amount(40).toLocaleString('en-GB')}\n- Main guest experience: about £${amount(10).toLocaleString('en-GB')}–£${amount(20).toLocaleString('en-GB')}\n- Styling and extras: about £${amount(10).toLocaleString('en-GB')}–£${amount(15).toLocaleString('en-GB')}\n- Contingency: keep around £${amount(10).toLocaleString('en-GB')} back\n\nBest next step: confirm guest count and venue quotes first, because those two items control most of the budget.`;
}

export function buildLocalPlanningGuide(messages: LLMMessage[]): string {
  const latest = latestUserMessage(messages);
  const sanitizedLatest = sanitizeLatestUserMessage(latest);
  const context = buildContextFromMessage(latest);
  const brief = buildBrief(context);
  const prefix = 'Jade is in transparent degraded planning mode because the live AI provider is unavailable.';
  const recommendationFallback = buildRecommendationFallback(prefix, latest, brief);
  if (recommendationFallback) return recommendationFallback;

  if (isFragment(sanitizedLatest)) {
    return `${prefix}\n\nI do not want to guess from that fragment. ${askForMissingDetail('', context).trim()}`;
  }

  const latestBudgetProvided = !!parseBudgetRange(sanitizedLatest);
  const askedAboutBudget = hasAny(sanitizedLatest, ['budget', 'cost', 'price', 'spend', 'afford']);
  const askedAboutVenue = hasAny(sanitizedLatest, ['venue', 'venues', 'room', 'space', 'location']);
  const askedAboutTimeline = hasAny(sanitizedLatest, ['timeline', 'schedule', 'when', 'checklist', 'plan']);
  const missing = getMissingDetails(context);

  if (askedAboutBudget) return buildBudgetGuidance(prefix, context, brief);

  if (latestBudgetProvided && missing.length > 0) {
    return `${prefix}\n\nGreat — I’ve captured the budget as ${formatBudget(context)}. ${askForMissingDetail('', context).trim()}`;
  }

  if (askedAboutVenue) {
    return `${prefix}\n\nFor your ${brief}, shortlist venues by checking:\n\n- Capacity and guest flow\n- What is included in the full quote\n- Supplier flexibility\n- Access, taxis, parking and accommodation\n- Music finish time, setup time and clear-down rules\n\nBest next step: request full written quotes from three venues so they can be compared like-for-like.`;
  }

  if (askedAboutTimeline) {
    return `${prefix}\n\nA strong planning order for your ${brief} is:\n\n- Now: confirm the missing brief details and shortlist venues\n- Next 1–2 weeks: request full quotes and hold the preferred date\n- After the date is held: book key suppliers\n- Mid-planning: finalise guest communication, layout and timings\n- Final 4 weeks: confirm final numbers, balances and the day schedule\n\nBest next step: secure the venue/date first because most supplier decisions depend on that.`;
  }

  if (missing.length > 0) return askForMissingDetail(prefix, context);

  return `${prefix}\n\nI have the core brief captured: ${summarizePlannerState(context)}. I can now help with supplier shortlists, a venue comparison, budget allocation, timeline or guest experience. Which would you like to tackle first?`;
}

export function isOpenAIInsufficientQuotaError(error: unknown): boolean {
  const err = providerError(error);
  const code = normalise(err.error?.code || err.code);
  const type = normalise(err.error?.type || err.type);
  const message = providerErrorMessage(error).toLowerCase();

  return (
    code === 'insufficient_quota' ||
    type === 'insufficient_quota' ||
    message.includes('insufficient_quota') ||
    message.includes('current quota')
  );
}

export function isOpenAIRateLimitError(error: unknown): boolean {
  if (isOpenAIInsufficientQuotaError(error)) return false;

  const err = providerError(error);
  const code = normalise(err.error?.code || err.code);
  const type = normalise(err.error?.type || err.type);
  const message = providerErrorMessage(error).toLowerCase();

  return (
    providerStatus(error) === 429 ||
    code.includes('rate_limit') ||
    type.includes('rate_limit') ||
    message.includes('rate limit') ||
    message.includes('rate_limit')
  );
}

export async function callProviderWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 750
): Promise<T> {
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      const status = providerStatus(error);
      const retryable = status !== undefined && RETRYABLE_PROVIDER_STATUSES.has(status);
      if (isOpenAIInsufficientQuotaError(error) || !retryable || attempt >= maxAttempts) throw error;
      const jitterMs = Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delayMs + jitterMs));
      delayMs = Math.min(delayMs * 2, 8000);
    }
  }
}

class LLMService {
  private _client: OpenAI | null = null;
  private model: string;

  constructor() {
    this.model = env.llm.model;
  }

  /** Lazily initialize the OpenAI client so startup never crashes when the
   *  API key is absent. Throws at call-time if not configured. */
  private get client(): OpenAI {
    if (!this._client) {
      if (!env.llm.apiKey) {
        throw new Error('LLM_NOT_CONFIGURED: OPENAI_API_KEY is not configured');
      }
      this._client = new OpenAI({ apiKey: env.llm.apiKey });
    }
    return this._client;
  }

  /** Send a chat completion request. */
  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!env.llm.apiKey) {
      const content = buildLocalPlanningGuide(messages);
      logger.warn(
        { model: 'jadeassist-degraded-planning-guide' },
        'Using degraded planning guide because OPENAI_API_KEY is not configured'
      );
      return { content, tokensUsed: 0, model: 'jadeassist-degraded-planning-guide' };
    }

    try {
      const systemPrompt = options?.systemPrompt || LLM_SETTINGS.SYSTEM_PROMPT;
      const temperature = options?.temperature ?? LLM_SETTINGS.TEMPERATURE;
      const maxTokens = options?.maxTokens ?? LLM_SETTINGS.MAX_TOKENS;

      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
      ];

      logger.debug({ messageCount: messages.length }, 'Sending LLM request');

      const response = await callProviderWithBackoff<OpenAI.Chat.ChatCompletion>(() =>
        this.client.chat.completions.create({
          model: this.model,
          messages: chatMessages,
          temperature,
          max_tokens: maxTokens,
        })
      );

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;
      logger.info({ tokensUsed, model: this.model }, 'LLM response received');
      return { content, tokensUsed, model: this.model };
    } catch (error) {
      logger.error({ error }, 'LLM request failed');

      if (isOpenAIInsufficientQuotaError(error)) {
        const content = buildLocalPlanningGuide(messages);
        logger.warn(
          { model: 'jadeassist-degraded-planning-guide' },
          'Using transparent degraded planning guide fallback'
        );
        return { content, tokensUsed: 0, model: 'jadeassist-degraded-planning-guide' };
      }

      if (isOpenAIRateLimitError(error)) {
        throw new Error('RATE_LIMIT: Too many requests — please wait a moment and try again.');
      }

      if (error instanceof Error && error.message.startsWith('LLM_NOT_CONFIGURED:')) throw error;
      throw new Error('LLM_ERROR: Failed to get response from LLM');
    }
  }

  /** Generate a single response without conversation history. */
  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  /** Health checks remain non-fatal when OPENAI_API_KEY is absent. */
  async healthCheck(): Promise<boolean> {
    if (!env.llm.apiKey) return false;
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error({ error }, 'LLM health check failed');
      return false;
    }
  }
}

export const llmService = new LLMService();