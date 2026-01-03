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
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }
}
