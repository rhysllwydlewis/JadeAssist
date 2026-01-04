/**
 * Widget configuration and types
 */

export interface WidgetConfig {
  apiBaseUrl?: string;
  assistantName?: string;
  greetingText?: string;
  greetingTooltipText?: string;
  avatarUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  showDelayMs?: number;
  offsetBottom?: string;
  offsetRight?: string;
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

// Default woman avatar as a data URL (simple illustration)
const DEFAULT_AVATAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3CradialGradient id='bg' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' style='stop-color:%23F3E5F5'/%3E%3Cstop offset='100%25' style='stop-color:%23E1BEE7'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='50' fill='url(%23bg)'/%3E%3Cellipse cx='50' cy='65' rx='20' ry='25' fill='%23FDD835'/%3E%3Ccircle cx='50' cy='40' r='18' fill='%23FFECB3'/%3E%3Ccircle cx='43' cy='38' r='2' fill='%23333'/%3E%3Ccircle cx='57' cy='38' r='2' fill='%23333'/%3E%3Cpath d='M 45 45 Q 50 48 55 45' stroke='%23D84315' stroke-width='1.5' fill='none'/%3E%3Cellipse cx='50' cy='25' rx='22' ry='18' fill='%238D6E63'/%3E%3Cpath d='M 28 30 Q 30 20 40 18 Q 50 16 60 18 Q 70 20 72 30' fill='%236D4C41'/%3E%3C/svg%3E`;

export const DEFAULT_CONFIG: Required<WidgetConfig> = {
  apiBaseUrl: '',
  assistantName: 'Jade',
  greetingText: 'Hi! 👋 I\'m Jade, your event planning assistant. Can I help you plan your special day?',
  greetingTooltipText: '👋 Hi! Need help planning your event?',
  avatarUrl: DEFAULT_AVATAR_SVG,
  primaryColor: '#0B8073',
  accentColor: '#13B6A2',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  showDelayMs: 1000,
  offsetBottom: '24px',
  offsetRight: '24px',
};

export const STORAGE_KEYS = {
  STATE: 'jade-widget-state',
  MESSAGES: 'jade-widget-messages',
  CONVERSATION_ID: 'jade-widget-conversation-id',
  GREETING_DISMISSED: 'jade-widget-greeting-dismissed',
} as const;
