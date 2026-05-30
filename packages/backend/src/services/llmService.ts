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
   * Send a chat completion request
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
        throw new Error('OPENAI_INSUFFICIENT_QUOTA: Provider quota is unavailable for this project.');
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
   * Generate a single response without conversation history
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
