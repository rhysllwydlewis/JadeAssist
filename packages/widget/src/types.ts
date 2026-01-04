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

// Default woman avatar as a data URL (professional illustration)
const DEFAULT_AVATAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='skinGrad' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23FDD8B5'/%3E%3Cstop offset='100%25' style='stop-color:%23F4C4A0'/%3E%3C/linearGradient%3E%3ClinearGradient id='hairGrad' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%236B4423'/%3E%3Cstop offset='100%25' style='stop-color:%23543416'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='60' cy='60' r='60' fill='%23F8F3FF'/%3E%3Cellipse cx='60' cy='95' rx='35' ry='45' fill='%23FFE4B5'/%3E%3Ccircle cx='60' cy='50' r='28' fill='url(%23skinGrad)'/%3E%3Cellipse cx='60' cy='32' rx='32' ry='28' fill='url(%23hairGrad)'/%3E%3Cpath d='M 28 40 Q 25 28 35 22 Q 50 18 65 22 Q 85 28 88 40 Q 88 52 60 50 Q 32 52 28 40' fill='url(%23hairGrad)'/%3E%3Cellipse cx='50' cy='48' rx='3' ry='4' fill='%23422918'/%3E%3Cellipse cx='70' cy='48' rx='3' ry='4' fill='%23422918'/%3E%3Cpath d='M 52 58 Q 60 62 68 58' stroke='%23D4816F' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3Cpath d='M 44 43 Q 47 41 50 43' stroke='%23422918' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M 70 43 Q 73 41 76 43' stroke='%23422918' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E`;

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
  offsetBottom: '80px', // Increased from 24px to avoid back-to-top button overlap
  offsetRight: '24px',
};

export const STORAGE_KEYS = {
  STATE: 'jade-widget-state',
  MESSAGES: 'jade-widget-messages',
  CONVERSATION_ID: 'jade-widget-conversation-id',
  GREETING_DISMISSED: 'jade-widget-greeting-dismissed',
} as const;
