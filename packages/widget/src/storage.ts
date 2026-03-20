/**
 * Storage manager for widget state persistence
 */

import { STORAGE_KEYS, WidgetState, WidgetMessage } from './types';

export class StorageManager {
  static saveState(state: Partial<WidgetState>): void {
    try {
      const currentState = this.loadState();
      const newState = { ...currentState, ...state };
      localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(newState));
    } catch (error) {
      console.warn('Failed to save widget state:', error);
    }
  }

  static loadState(): Partial<WidgetState> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATE);
      return stored ? (JSON.parse(stored) as Partial<WidgetState>) : {};
    } catch (error) {
      console.warn('Failed to load widget state:', error);
      return {};
    }
  }

  static saveMessages(messages: WidgetMessage[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save messages:', error);
    }
  }

  static loadMessages(): WidgetMessage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return stored ? (JSON.parse(stored) as WidgetMessage[]) : [];
    } catch (error) {
      console.warn('Failed to load messages:', error);
      return [];
    }
  }

  static saveConversationId(conversationId: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId);
    } catch (error) {
      console.warn('Failed to save conversation ID:', error);
    }
  }

  static loadConversationId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
    } catch (error) {
      console.warn('Failed to load conversation ID:', error);
      return null;
    }
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.STATE);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
      localStorage.removeItem(STORAGE_KEYS.GREETING_DISMISSED);
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  static isGreetingDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.GREETING_DISMISSED) === 'true';
    } catch (error) {
      console.warn('Failed to check greeting dismissed state:', error);
      return false;
    }
  }

  static setGreetingDismissed(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GREETING_DISMISSED, 'true');
    } catch (error) {
      console.warn('Failed to save greeting dismissed state:', error);
    }
  }

  static loadSoundEnabled(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      // Default is false (conservative default)
      return stored === null ? false : stored === 'true';
    } catch (error) {
      console.warn('Failed to load sound enabled state:', error);
      return false;
    }
  }

  static saveSoundEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
    } catch (error) {
      console.warn('Failed to save sound enabled state:', error);
    }
  }

  static loadSoundVolume(): number {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SOUND_VOLUME);
      if (stored === null) return 0.5;
      const val = parseFloat(stored);
      return isNaN(val) ? 0.5 : Math.min(1, Math.max(0, val));
    } catch (error) {
      console.warn('Failed to load sound volume:', error);
      return 0.5;
    }
  }

  static saveSoundVolume(volume: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(volume));
    } catch (error) {
      console.warn('Failed to save sound volume:', error);
    }
  }
}
