/**
 * Widget configuration and types
 */

export interface WidgetConfig {
  apiBaseUrl?: string;
  assistantName?: string;
  greetingText?: string;
  avatarUrl?: string;
  primaryColor?: string;
}

export interface WidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  showGreeting: boolean;
  conversationId?: string;
  messages: WidgetMessage[];
}

export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  quickReplies?: string[];
}

export const DEFAULT_CONFIG: Required<WidgetConfig> = {
  apiBaseUrl: '',
  assistantName: 'Jade',
  greetingText: 'Hi! 👋 I\'m Jade, your event planning assistant. Can I help you plan your special day?',
  avatarUrl: '',
  primaryColor: '#8B5CF6',
};

export const STORAGE_KEYS = {
  STATE: 'jade-widget-state',
  MESSAGES: 'jade-widget-messages',
  CONVERSATION_ID: 'jade-widget-conversation-id',
} as const;
