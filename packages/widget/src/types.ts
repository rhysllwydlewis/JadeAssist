/**
 * Widget configuration and types
 */

export interface WidgetConfig {
  apiBaseUrl?: string;
  authToken?: string;
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
  offsetLeft?: string;
  offsetBottomMobile?: string;
  offsetRightMobile?: string;
  offsetLeftMobile?: string;
  scale?: number;
  debug?: boolean;
  /** Enable browser speech recognition controls when supported by the host browser. */
  enableSpeechInput?: boolean;
  /** Enable read-aloud controls using browser speech synthesis when supported. */
  enableSpeechOutput?: boolean;
  /** BCP-47 language tag used for browser speech APIs. */
  speechLanguage?: string;
}

export interface WidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  showGreeting: boolean;
  conversationId?: string;
  messages: WidgetMessage[];
}

export interface WidgetSearchResult {
  id: string;
  type: 'supplier' | 'venue' | 'website';
  title: string;
  description: string;
  location?: string;
  category?: string;
  url?: string;
  rating?: number;
  source:
    | 'local-db'
    | 'eventflow-catalog'
    | 'website-index'
    | 'google-places'
    | 'serpapi-maps'
    | 'brave-search'
    | 'online-search';
}

export interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  quickReplies?: string[];
  searchResults?: WidgetSearchResult[];
}

// Constants
export const MAX_MESSAGE_LENGTH = 1000;

// Default woman avatar URL - uses the provided avatar image
// Place your avatar image as 'avatar-woman.png' in the assets/ folder
const DEFAULT_AVATAR_URL =
  'https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/assets/avatar-woman.png';

export const DEFAULT_CONFIG: Required<WidgetConfig> = {
  apiBaseUrl: '',
  authToken: '',
  assistantName: 'Jade',
  greetingText:
    "Hi! 👋 I'm Jade, your event planning assistant. Can I help you plan your special day?",
  greetingTooltipText: '👋 Hi! Need help planning your event?',
  avatarUrl: DEFAULT_AVATAR_URL,
  primaryColor: '#0B8073',
  accentColor: '#13B6A2',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  showDelayMs: 1000,
  offsetBottom: '80px', // Increased from 24px to avoid back-to-top button overlap
  offsetRight: '24px',
  offsetLeft: '',
  offsetBottomMobile: '', // Empty string means use offsetBottom
  offsetRightMobile: '', // Empty string means use offsetRight
  offsetLeftMobile: '', // Empty string means use offsetLeft
  scale: 1,
  debug: false,
  enableSpeechInput: false,
  enableSpeechOutput: false,
  speechLanguage: 'en-GB',
};

export const STORAGE_KEYS = {
  STATE: 'jade-widget-state',
  MESSAGES: 'jade-widget-messages',
  CONVERSATION_ID: 'jade-widget-conversation-id',
  GREETING_DISMISSED: 'jade-widget-greeting-dismissed',
  SOUND_ENABLED: 'jade-widget-sound-enabled',
  SOUND_VOLUME: 'jade-widget-sound-volume',
} as const;
