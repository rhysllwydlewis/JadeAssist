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

class LLMService {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.llm.apiKey,
    });
    this.model = env.llm.model;
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
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
      throw new Error('Failed to get response from LLM');
    }
  }

  /**
   * Generate a single response without conversation history
   */
  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    return this.chat([{ role: 'user', content: prompt }], options);
  }

  /**
   * Check if LLM service is available
   */
  async healthCheck(): Promise<boolean> {
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
