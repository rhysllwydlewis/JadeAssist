/**
 * Main JadeWidget class
 */

import { WidgetConfig, WidgetState, WidgetMessage, DEFAULT_CONFIG, MAX_MESSAGE_LENGTH } from './types';
import { StorageManager } from './storage';
import { ApiClient } from './api';
import { getWidgetStyles } from './styles';

export class JadeWidget {
  private config: Required<WidgetConfig>;
  private state: WidgetState;
  private container: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private apiClient: ApiClient;
  private greetingTimeout?: number;
  private escapeKeyHandler: (e: KeyboardEvent) => void;

  constructor(config: WidgetConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiClient = new ApiClient(this.config.apiBaseUrl);
    
    // Debug logging
    if (this.config.debug) {
      console.log('[JadeWidget] Initializing with config:', this.config);
      console.log('[JadeWidget] Avatar URL:', this.config.avatarUrl);
    }
    
    // Bind escape key handler for proper cleanup
    this.escapeKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.state.isOpen) {
        this.closeChat();
      }
    };

    // Load persisted state
    const savedState = StorageManager.loadState();
    const savedMessages = StorageManager.loadMessages();
    const savedConversationId = StorageManager.loadConversationId();

    this.state = {
      isOpen: savedState.isOpen || false,
      isMinimized: savedState.isMinimized || false,
      showGreeting: false,
      conversationId: savedConversationId || undefined,
      messages: savedMessages.length > 0 ? savedMessages : this.getInitialMessages(),
    };

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'jade-widget-root';

    // Attach shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Initialize
    this.render();
    this.attachEventListeners();
  }

  private getInitialMessages(): WidgetMessage[] {
    return [
      {
        id: 'initial',
        role: 'assistant',
        content: this.config.greetingText,
        timestamp: Date.now(),
        quickReplies: ['Yes, please', 'No, thanks'],
      },
    ];
  }

  private render(): void {
    const styles = getWidgetStyles(
      this.config.primaryColor,
      this.config.accentColor,
      this.config.fontFamily,
      this.config.offsetBottom,
      this.config.offsetRight,
      this.config.offsetLeft,
      this.config.offsetBottomMobile,
      this.config.offsetRightMobile,
      this.config.offsetLeftMobile,
      this.config.scale
    );

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="jade-widget-container">
        ${this.renderAvatar()}
        ${this.state.showGreeting && !this.state.isOpen ? this.renderGreeting() : ''}
        ${this.state.isOpen ? this.renderChatPopup() : ''}
      </div>
    `;
  }

  private renderAvatar(): string {
    const avatarContent = this.config.avatarUrl
      ? `<img src="${this.escapeHtml(this.config.avatarUrl)}" alt="Chat Assistant" class="jade-avatar-icon jade-avatar-img" />
         <span class="jade-avatar-icon jade-avatar-fallback" style="display:none;">💬</span>`
      : '<span class="jade-avatar-icon">💬</span>';

    const badgeHtml = this.state.showGreeting && !this.state.isOpen
      ? '<span class="jade-avatar-badge" aria-label="1 new notification">1</span>'
      : '';

    return `
      <button class="jade-avatar-button" aria-label="Toggle chat" data-action="toggle-chat">
        ${avatarContent}
        ${badgeHtml}
      </button>
    `;
  }

  private renderGreeting(): string {
    return `
      <div class="jade-greeting-tooltip" data-action="open-chat" role="tooltip" aria-live="polite">
        <button class="jade-greeting-close" aria-label="Dismiss greeting" data-action="close-greeting">×</button>
        <div class="jade-greeting-text">${this.escapeHtml(this.config.greetingTooltipText)}</div>
      </div>
    `;
  }

  private renderChatPopup(): string {
    return `
      <div class="jade-chat-popup" role="dialog" aria-label="Chat">
        ${this.renderHeader()}
        ${this.renderMessages()}
        ${this.renderInputArea()}
      </div>
    `;
  }

  private renderHeader(): string {
    return `
      <div class="jade-chat-header">
        <div class="jade-chat-header-left">
          <div class="jade-chat-avatar">
            ${this.config.avatarUrl ? `<img src="${this.escapeHtml(this.config.avatarUrl)}" alt="${this.escapeHtml(this.config.assistantName)}" class="jade-header-avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />` : '💬'}
          </div>
          <div>
            <div class="jade-chat-title">${this.escapeHtml(this.config.assistantName)}</div>
            <div class="jade-chat-status"><span class="jade-status-dot"></span>Online</div>
          </div>
        </div>
        <div class="jade-chat-controls">
          <button class="jade-chat-minimize" aria-label="Minimize chat" data-action="minimize-chat" title="Minimize">−</button>
          <button class="jade-chat-close" aria-label="Close chat" data-action="close-chat" title="Close">×</button>
        </div>
      </div>
    `;
  }

  private renderMessages(): string {
    const messagesHtml = this.state.messages
      .map((msg) => this.renderMessage(msg))
      .join('');

    return `
      <div class="jade-chat-messages" data-messages-container>
        ${messagesHtml}
      </div>
    `;
  }

  private renderMessage(message: WidgetMessage): string {
    const isUser = message.role === 'user';
    const time = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const quickRepliesHtml =
      !isUser && message.quickReplies
        ? `
      <div class="jade-quick-replies">
        ${message.quickReplies
          .map(
            (reply) =>
              `<button class="jade-quick-reply-btn" data-action="quick-reply" data-reply="${this.escapeHtml(reply)}">${this.escapeHtml(reply)}</button>`
          )
          .join('')}
      </div>
    `
        : '';

    return `
      <div class="jade-message jade-message-${message.role}" data-message-id="${message.id}">
        <div class="jade-message-avatar ${message.role}">
          ${isUser ? '👤' : '💬'}
        </div>
        <div class="jade-message-content">
          <div class="jade-message-bubble">${this.escapeHtml(message.content)}</div>
          <div class="jade-message-time">${time}</div>
          ${quickRepliesHtml}
        </div>
      </div>
    `;
  }

  private renderInputArea(): string {
    return `
      <div class="jade-chat-input-area">
        <div class="jade-chat-input-wrapper">
          <textarea 
            class="jade-chat-input" 
            placeholder="Type your message..."
            rows="1"
            aria-label="Message input"
            maxlength="${MAX_MESSAGE_LENGTH}"
            data-input
          ></textarea>
          <button class="jade-chat-send-btn" aria-label="Send message" data-action="send" title="Send">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 1L7 9M15 1L10 15L7 9M15 1L1 6L7 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="jade-char-count" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Use event delegation on shadow root
    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');

      if (action === 'toggle-chat') {
        this.toggleChat();
      } else if (action === 'open-chat') {
        this.openChat();
      } else if (action === 'close-chat') {
        this.closeChat();
      } else if (action === 'minimize-chat') {
        this.minimizeChat();
      } else if (action === 'close-greeting') {
        e.stopPropagation();
        this.closeGreeting();
      } else if (action === 'send') {
        void this.handleSend();
      } else if (action === 'quick-reply') {
        const reply = target.getAttribute('data-reply');
        if (reply) {
          this.handleQuickReply(reply);
        }
      }
    });

    // Input handling
    this.shadowRoot.addEventListener('keydown', (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      const target = e.target as HTMLElement;
      if (target.hasAttribute('data-input')) {
        if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
          e.preventDefault();
          void this.handleSend();
        }
      }
    });

    // ESC to close
    document.addEventListener('keydown', this.escapeKeyHandler);

    // Auto-resize textarea and update character count
    this.shadowRoot.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      if (target.hasAttribute('data-input')) {
        // Auto-resize
        target.style.height = 'auto';
        target.style.height = Math.min(target.scrollHeight, 100) + 'px';
        
        // Update character count
        const charCount = this.shadowRoot.querySelector('.jade-char-count');
        if (charCount) {
          const length = target.value.length;
          if (length > MAX_MESSAGE_LENGTH * 0.8) {
            charCount.textContent = `${length}/${MAX_MESSAGE_LENGTH}`;
            charCount.classList.add('jade-char-count-visible');
          } else {
            charCount.textContent = '';
            charCount.classList.remove('jade-char-count-visible');
          }
        }
      }
    });

    // Handle avatar image errors with fallback
    const avatarImg = this.shadowRoot.querySelector('.jade-avatar-img');
    if (avatarImg) {
      avatarImg.addEventListener('error', () => {
        if (this.config.debug) {
          console.error('[JadeWidget] Failed to load avatar image:', this.config.avatarUrl);
        }
        avatarImg.setAttribute('style', 'display:none;');
        const fallback = this.shadowRoot.querySelector('.jade-avatar-fallback');
        if (fallback) {
          fallback.setAttribute('style', 'display:flex;');
        }
      });
      avatarImg.addEventListener('load', () => {
        if (this.config.debug) {
          console.log('[JadeWidget] Avatar image loaded successfully:', this.config.avatarUrl);
        }
      });
    }

    // Handle header avatar errors with fallback
    const headerAvatar = this.shadowRoot.querySelector('.jade-header-avatar-img');
    if (headerAvatar) {
      headerAvatar.addEventListener('error', () => {
        if (this.config.debug) {
          console.error('[JadeWidget] Failed to load header avatar image:', this.config.avatarUrl);
        }
        const parent = headerAvatar.parentElement;
        if (parent) {
          parent.innerHTML = '💬';
        }
      });
      headerAvatar.addEventListener('load', () => {
        if (this.config.debug) {
          console.log('[JadeWidget] Header avatar image loaded successfully:', this.config.avatarUrl);
        }
      });
    }
  }

  private toggleChat(): void {
    if (this.state.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  private openChat(): void {
    this.state.isOpen = true;
    this.state.showGreeting = false;
    if (this.greetingTimeout) {
      clearTimeout(this.greetingTimeout);
    }
    StorageManager.setGreetingDismissed();
    StorageManager.saveState({ isOpen: true, showGreeting: false });
    this.render();
    this.scrollToBottom();
    this.focusInput();
  }

  private closeChat(): void {
    this.state.isOpen = false;
    StorageManager.saveState({ isOpen: false });
    this.render();
  }

  private minimizeChat(): void {
    this.state.isMinimized = true;
    this.state.isOpen = false;
    StorageManager.saveState({ isOpen: false, isMinimized: true });
    this.render();
  }

  private closeGreeting(): void {
    this.state.showGreeting = false;
    StorageManager.setGreetingDismissed();
    this.render();
  }

  private async handleSend(): Promise<void> {
    const input = this.shadowRoot.querySelector('[data-input]') as HTMLTextAreaElement;
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Add user message
    const userMessage: WidgetMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    this.state.messages.push(userMessage);
    StorageManager.saveMessages(this.state.messages);

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Re-render to show user message
    this.render();
    this.scrollToBottom();

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Send to API
      const response = await this.apiClient.sendMessage(
        message,
        this.state.conversationId
      );

      // Update conversation ID
      if (!this.state.conversationId) {
        this.state.conversationId = response.conversationId;
        StorageManager.saveConversationId(response.conversationId);
      }

      // Add assistant message
      this.state.messages.push(response.message);
      StorageManager.saveMessages(this.state.messages);

      // Remove typing indicator and re-render with response
      this.removeTypingIndicator();
      this.render();
      this.scrollToBottom();
      this.focusInput();
    } catch (error) {
      console.error('Failed to send message:', error);

      // Remove typing indicator
      this.removeTypingIndicator();

      // Show error message
      const errorMessage: WidgetMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting. Please try again.",
        timestamp: Date.now(),
      };
      this.state.messages.push(errorMessage);
      StorageManager.saveMessages(this.state.messages);
      this.render();
      this.scrollToBottom();
    }
  }

  private handleQuickReply(reply: string): void {
    const input = this.shadowRoot.querySelector('[data-input]') as HTMLTextAreaElement;
    if (input) {
      input.value = reply;
      void this.handleSend();
    }
  }

  private showTypingIndicator(): void {
    // Remove any existing typing indicators first
    this.removeTypingIndicator();

    const messagesContainer = this.shadowRoot.querySelector('[data-messages-container]');
    if (messagesContainer) {
      const indicator = document.createElement('div');
      indicator.className = 'jade-message jade-message-assistant';
      indicator.setAttribute('data-typing-indicator', '');
      indicator.innerHTML = `
        <div class="jade-message-avatar assistant">💬</div>
        <div class="jade-message-content">
          <div class="jade-message-bubble">
            <div class="jade-typing-indicator">
              <div class="jade-typing-dot"></div>
              <div class="jade-typing-dot"></div>
              <div class="jade-typing-dot"></div>
            </div>
          </div>
        </div>
      `;
      messagesContainer.appendChild(indicator);
      this.scrollToBottom();
    }
  }

  private removeTypingIndicator(): void {
    const indicator = this.shadowRoot.querySelector('[data-typing-indicator]');
    if (indicator) {
      indicator.remove();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const messagesContainer = this.shadowRoot.querySelector('[data-messages-container]');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  private focusInput(): void {
    setTimeout(() => {
      const input = this.shadowRoot.querySelector('[data-input]') as HTMLTextAreaElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private shouldShowGreeting(): boolean {
    const savedMessages = StorageManager.loadMessages();
    const hasNoOrOnlyInitialMessage = savedMessages.length === 0 || savedMessages.length === 1;
    return !this.state.isOpen && hasNoOrOnlyInitialMessage && !StorageManager.isGreetingDismissed();
  }

  public mount(target?: HTMLElement): void {
    const mountTarget = target || document.body;
    mountTarget.appendChild(this.container);
    
    // Show greeting after delay if conditions are met
    if (this.shouldShowGreeting()) {
      this.greetingTimeout = window.setTimeout(() => {
        this.state.showGreeting = true;
        this.render();
      }, 1000); // 1 second delay after widget is mounted
    }
  }

  public unmount(): void {
    this.container.remove();
    if (this.greetingTimeout) {
      clearTimeout(this.greetingTimeout);
    }
    // Clean up event listener to prevent memory leaks
    document.removeEventListener('keydown', this.escapeKeyHandler);
  }

  public open(): void {
    this.openChat();
  }

  public close(): void {
    this.closeChat();
  }

  public toggle(): void {
    this.toggleChat();
  }

  public reset(): void {
    StorageManager.clearAll();
    this.state = {
      isOpen: false,
      isMinimized: false,
      showGreeting: false,
      messages: this.getInitialMessages(),
    };
    this.render();
  }
}
