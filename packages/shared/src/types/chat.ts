/**
 * Chat-related types for conversations and messages
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokensUsed?: number;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  eventType?: string;
  startedAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  userId: string;
}

export interface ChatResponse {
  conversationId: string;
  message: Message;
  suggestions?: string[];
}
