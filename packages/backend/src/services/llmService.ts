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
  error?: {
    code?: unknown;
    type?: unknown;
    message?: unknown;
  };
};

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
  const status = providerError(error).status;
  return typeof status === 'number' ? status : undefined;
}

function latestUserMessage(messages: LLMMessage[]): string {
  return [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
}

function knownContextValue(message: string, label: string): string | undefined {
  const context = /\[Known context: ([\s\S]*?)\]$/i.exec(message)?.[1];
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

export function buildLocalPlanningGuide(messages: LLMMessage[]): string {
  const latest = latestUserMessage(messages);
  const eventType = knownContextValue(latest, 'Event Type') ?? 'event';
  const budget = knownContextValue(latest, 'Budget');
  const guests = knownContextValue(latest, 'Guest Count');
  const location = knownContextValue(latest, 'Location');
  const brief = [
    eventType !== 'event' ? eventType.toLowerCase() : 'event',
    location ? `in ${location}` : undefined,
    guests ? `for ${guests} guests` : undefined,
    budget ? `with a ${budget} budget` : undefined,
  ].filter(Boolean).join(' ');

  const prefix = "I'm using JadeAssist's built-in planning guide at the moment.";

  if (hasAny(latest, ['budget', 'cost', 'price', 'spend', 'afford'])) {
    return `${prefix}\n\nFor your ${brief}, use this practical starting split:\n\n- Venue: 25–35%\n- Food and drink: 30–40%\n- Main guest experience: 10–20%\n- Styling and extras: 10–15%\n- Contingency: keep 10% back\n\nBest next step: confirm guest count and venue quotes first, because those two items control most of the budget.`;
  }

  if (hasAny(latest, ['venue', 'room', 'space', 'location'])) {
    return `${prefix}\n\nFor your ${brief}, shortlist venues by checking:\n\n- Capacity and guest flow\n- What is included in the full quote\n- Supplier flexibility\n- Access, taxis, parking and accommodation\n- Music finish time, setup time and clear-down rules\n\nBest next step: request full written quotes from three venues so they can be compared like-for-like.`;
  }

  if (hasAny(latest, ['timeline', 'schedule', 'when', 'checklist', 'plan'])) {
    return `${prefix}\n\nA strong planning order for your ${brief} is:\n\n- Now: confirm budget, guest count and preferred area\n- Next 1–2 weeks: shortlist venues and request full quotes\n- After the date is held: book key suppliers\n- Mid-planning: finalise guest communication, layout and timings\n- Final 4 weeks: confirm final numbers, balances and the day schedule\n\nBest next step: secure the venue/date first because most supplier decisions depend on that.`;
  }

  return `${prefix}\n\nThe best first step is to build the event brief around five details: event type, date or timeframe, guest count, budget and location. Once those are known, focus on venue, food and drink, guest experience, supplier scope and a 10% contingency.\n\nWhat detail would you like to work through first: budget, venue or timeline?`;
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
  if (isOpenAIInsufficientQuotaError(error)) {
    return false;
  }

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

  /**
   * Send a chat completion request.
   */
  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!env.llm.apiKey) {
      throw new Error('LLM_NOT_CONFIGURED: OPENAI_API_KEY is not configured');
    }

    try {
      const systemPrompt = options?.systemPrompt || LLM_SETTINGS.SYSTEM_PROMPT;
      const temperature = options?.temperature ?? LLM_SETTINGS.TEMPERATURE;
      const maxTokens = options?.maxTokens ?? LLM_SETTINGS.MAX_TOKENS;

      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      logger.debug({ messageCount: messages.length }, 'Sending LLM request');

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      logger.info({ tokensUsed, model: this.model }, 'LLM response received');

      return {
        content,
        tokensUsed,
        model: this.model,
      };
    } catch (error) {
      logger.error({ error }, 'LLM request failed');

      if (isOpenAIInsufficientQuotaError(error)) {
        const content = buildLocalPlanningGuide(messages);
        logger.warn({ model: 'jadeassist-local-planning-guide' }, 'Using local planning guide fallback');
        return {
          content,
          tokensUsed: 0,
          model: 'jadeassist-local-planning-guide',
        };
      }

      if (isOpenAIRateLimitError(error)) {
        throw new Error('RATE_LIMIT: Too many requests — please wait a moment and try again.');
      }

      if (error instanceof Error && error.message.startsWith('LLM_NOT_CONFIGURED:')) {
        throw error;
      }

      throw new Error('LLM_ERROR: Failed to get response from LLM');
    }
  }

  /**
   * Generate a single response without conversation history.
   */
  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  /**
   * Returns false when OPENAI_API_KEY is not configured rather than throwing,
   * so health checks remain non-fatal in auto/minimal mode.
   */
  async healthCheck(): Promise<boolean> {
    if (!env.llm.apiKey) {
      return false;
    }
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error({ error }, 'LLM health check failed');
      return false;
    }
  }
}

// Export singleton instance
export const llmService = new LLMService();
