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
  private isMenuOpen: boolean = false;
  private showClearConfirm: boolean = false;
  private showExportToast: boolean = false;
  private soundEnabled: boolean;
  private soundVolume: number;
  private audioCtx?: AudioContext;
  private exportToastTimeout?: number;

  constructor(config: WidgetConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.apiClient = new ApiClient(this.config.apiBaseUrl, this.config.authToken);
    
    // Debug logging
    if (this.config.debug) {
      console.log('[JadeWidget] Initializing with config:', this.config);
      console.log('[JadeWidget] Avatar URL:', this.config.avatarUrl);
    }
    
    // Bind escape key handler for proper cleanup
    this.escapeKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (this.showClearConfirm) {
          this.showClearConfirm = false;
          this.render();
        } else if (this.isMenuOpen) {
          this.isMenuOpen = false;
          this.render();
        } else if (this.state.isOpen) {
          this.closeChat();
        }
      }
    };

    // Load persisted sound settings
    this.soundEnabled = StorageManager.loadSoundEnabled();
    this.soundVolume = StorageManager.loadSoundVolume();

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
    // Don't render an empty tooltip — host page may supply its own teaser bubble
    if (!this.config.greetingTooltipText) {
      return '';
    }
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
        <div class="jade-chat-content">
          ${this.renderHeader()}
          ${this.renderMessages()}
          ${this.renderInputArea()}
          ${this.showClearConfirm ? this.renderClearConfirmModal() : ''}
          ${this.showExportToast ? this.renderExportToast() : ''}
        </div>
        ${this.isMenuOpen ? this.renderMenu() : ''}
      </div>
    `;
  }

  private renderHeader(): string {
    const menuBtnClass = `jade-menu-btn${this.isMenuOpen ? ' jade-menu-btn--open' : ''}`;
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
          <button class="${menuBtnClass}" aria-label="${this.isMenuOpen ? 'Close menu' : 'Open menu'}" aria-haspopup="true" aria-expanded="${this.isMenuOpen}" data-action="toggle-menu" title="Menu">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
            </svg>
          </button>
          <button class="jade-chat-minimize" aria-label="Minimize chat" data-action="minimize-chat" title="Minimize">−</button>
          <button class="jade-chat-close" aria-label="Close chat" data-action="close-chat" title="Close">×</button>
        </div>
      </div>
    `;
  }

  private renderMenu(): string {
    const volumePct = Math.round(this.soundVolume * 100);
    return `
      <div class="jade-menu-panel" role="menu" aria-label="Chat options">
        <button class="jade-menu-item" data-action="export-chat" role="menuitem">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 12h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Export chat
        </button>
        <div class="jade-menu-divider" role="separator"></div>
        <div class="jade-menu-item jade-menu-sound-row">
          <span class="jade-menu-sound-label">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 5.5H1.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H3l3 3V2.5L3 5.5z" fill="currentColor"/>
              <path d="M9.5 5.5c.83.83.83 2.17 0 3M11.5 3.5c1.66 1.66 1.66 4.34 0 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            Sounds
          </span>
          <button
            class="jade-sound-toggle ${this.soundEnabled ? 'jade-sound-toggle--on' : ''}"
            data-action="toggle-sound"
            aria-label="${this.soundEnabled ? 'Disable sounds' : 'Enable sounds'}"
            aria-pressed="${this.soundEnabled}"
            title="${this.soundEnabled ? 'Sounds on' : 'Sounds off'}"
          >
            <span class="jade-sound-toggle-knob"></span>
          </button>
        </div>
        <div class="jade-menu-item jade-menu-volume-row ${!this.soundEnabled ? 'jade-menu-item--disabled' : ''}">
          <label class="jade-volume-label" for="jade-volume-slider">Volume</label>
          <input
            type="range"
            id="jade-volume-slider"
            class="jade-volume-slider"
            min="0"
            max="100"
            value="${volumePct}"
            aria-label="Notification volume"
            data-action="volume-change"
            ${!this.soundEnabled ? 'disabled' : ''}
          />
          <span class="jade-volume-value">${volumePct}%</span>
        </div>
        <div class="jade-menu-divider" role="separator"></div>
        <button class="jade-menu-item jade-menu-item--danger" data-action="show-clear-confirm" role="menuitem">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 3.5h9M5.5 3.5V2h4v1.5M6 6v5M9 6v5M3.5 3.5l.75 9h7.5l.75-9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Clear chat
        </button>
      </div>
    `;
  }

  private renderClearConfirmModal(): string {
    return `
      <div class="jade-modal-overlay" data-action="cancel-clear-chat" role="presentation">
        <div class="jade-modal" data-action="modal-stop" role="alertdialog" aria-modal="true" aria-labelledby="jade-modal-title" aria-describedby="jade-modal-desc">
          <p class="jade-modal-title" id="jade-modal-title">Clear conversation?</p>
          <p class="jade-modal-desc" id="jade-modal-desc">This will delete all messages and reset the chat. This action cannot be undone.</p>
          <div class="jade-modal-actions">
            <button class="jade-modal-btn jade-modal-btn--cancel" data-action="cancel-clear-chat">Cancel</button>
            <button class="jade-modal-btn jade-modal-btn--confirm" data-action="confirm-clear-chat">Clear chat</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderExportToast(): string {
    return `
      <div class="jade-toast" role="status" aria-live="polite">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M2 7.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Chat exported successfully
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

    const contentHtml = isUser
      ? this.escapeHtml(message.content)
      : this.renderMarkdown(message.content);

    const avatarContent = isUser
      ? '👤'
      : this.config.avatarUrl
        ? `<img src="${this.escapeHtml(this.config.avatarUrl)}" alt="${this.escapeHtml(this.config.assistantName)}" class="jade-msg-avatar-img" />`
        : '💬';

    return `
      <div class="jade-message jade-message-${message.role}" data-message-id="${message.id}">
        <div class="jade-message-avatar ${message.role}">
          ${avatarContent}
        </div>
        <div class="jade-message-content">
          <div class="jade-message-bubble">${contentHtml}</div>
          <div class="jade-message-time">${time}</div>
          ${quickRepliesHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render basic markdown to safe HTML for assistant messages.
   * Supports: **bold**, *italic*, bullet lists (- / * / •), numbered lists, line breaks.
   */
  private renderMarkdown(text: string): string {
    // Escape HTML first to prevent XSS, then re-apply safe formatting
    const escaped = this.escapeHtml(text);

    const html = escaped
      // Bold: **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* — use replace callback to avoid lookbehind (not universally supported)
      .replace(/\*([^*\n]+?)\*/g, (_match, inner: string) => {
        return `<em>${inner}</em>`;
      })
      // Inline code: `code`
      .replace(/`([^`\n]+?)`/g, '<code class="jade-inline-code">$1</code>');

    // Process line by line for lists and paragraphs
    const lines = html.split('\n');
    const outputLines: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bulletMatch = /^[-*•]\s+(.*)/.exec(line);
      const numberedMatch = /^\d+\.\s+(.*)/.exec(line);

      if (bulletMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) outputLines.push(listType === 'ol' ? '</ol>' : '</ul>');
          outputLines.push('<ul class="jade-md-list">');
          inList = true;
          listType = 'ul';
        }
        outputLines.push(`<li>${bulletMatch[1]}</li>`);
      } else if (numberedMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) outputLines.push(listType === 'ul' ? '</ul>' : '</ol>');
          outputLines.push('<ol class="jade-md-list">');
          inList = true;
          listType = 'ol';
        }
        outputLines.push(`<li>${numberedMatch[1]}</li>`);
      } else {
        if (inList) {
          outputLines.push(listType === 'ol' ? '</ol>' : '</ul>');
          inList = false;
          listType = null;
        }
        if (line.trim() === '') {
          outputLines.push('<br>');
        } else {
          outputLines.push(line);
        }
      }
    }

    if (inList) {
      outputLines.push(listType === 'ol' ? '</ol>' : '</ul>');
    }

    return outputLines.join('\n');
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
      // Walk up to find the element with data-action (handles SVG children etc.)
      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      const action = actionEl?.getAttribute('data-action');

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
        const reply = actionEl?.getAttribute('data-reply');
        if (reply) {
          this.handleQuickReply(reply);
        }
      } else if (action === 'toggle-menu') {
        e.stopPropagation();
        this.isMenuOpen = !this.isMenuOpen;
        this.render();
        if (this.isMenuOpen) {
          // Focus first menu item for keyboard accessibility
          setTimeout(() => {
            const firstItem = this.shadowRoot.querySelector<HTMLElement>('.jade-menu-panel [role="menuitem"]');
            firstItem?.focus();
          }, 50);
        }
      } else if (action === 'export-chat') {
        this.isMenuOpen = false;
        this.render();
        this.exportChat();
      } else if (action === 'toggle-sound') {
        e.stopPropagation();
        this.soundEnabled = !this.soundEnabled;
        StorageManager.saveSoundEnabled(this.soundEnabled);
        this.render();
      } else if (action === 'show-clear-confirm') {
        this.isMenuOpen = false;
        this.showClearConfirm = true;
        this.render();
        setTimeout(() => {
          const cancelBtn = this.shadowRoot.querySelector<HTMLElement>('.jade-modal-btn--cancel');
          cancelBtn?.focus();
        }, 50);
      } else if (action === 'cancel-clear-chat') {
        this.showClearConfirm = false;
        this.render();
      } else if (action === 'confirm-clear-chat') {
        this.showClearConfirm = false;
        this.performClearChat();
      } else if (action === 'modal-stop') {
        // Swallow click so it doesn't bubble to the overlay
        e.stopPropagation();
        return;
      }

      // Close menu on outside click
      if (this.isMenuOpen && action !== 'toggle-menu' && !actionEl?.closest('.jade-menu-panel')) {
        this.isMenuOpen = false;
        this.render();
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
      // Keyboard navigation for menu button
      if (target.classList.contains('jade-menu-btn')) {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          e.preventDefault();
          this.isMenuOpen = !this.isMenuOpen;
          this.render();
          if (this.isMenuOpen) {
            setTimeout(() => {
              const firstItem = this.shadowRoot.querySelector<HTMLElement>('.jade-menu-panel [role="menuitem"]');
              firstItem?.focus();
            }, 50);
          }
        }
      }
    });

    // Volume slider – use 'input' event for live updates
    this.shadowRoot.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('data-input')) {
        // Auto-resize textarea
        const textarea = target as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
        
        // Update character count
        const charCount = this.shadowRoot.querySelector('.jade-char-count');
        if (charCount) {
          const length = textarea.value.length;
          if (length > MAX_MESSAGE_LENGTH * 0.8) {
            charCount.textContent = `${length}/${MAX_MESSAGE_LENGTH}`;
            charCount.classList.add('jade-char-count-visible');
          } else {
            charCount.textContent = '';
            charCount.classList.remove('jade-char-count-visible');
          }
        }
      } else if ((target as HTMLInputElement).getAttribute('data-action') === 'volume-change') {
        const slider = target as HTMLInputElement;
        const volume = parseInt(slider.value, 10) / 100;
        this.soundVolume = volume;
        StorageManager.saveSoundVolume(volume);
        // Update displayed percentage without full re-render
        const valueEl = this.shadowRoot.querySelector('.jade-volume-value');
        if (valueEl) valueEl.textContent = `${Math.round(volume * 100)}%`;
      }
    });

    // ESC to close
    document.addEventListener('keydown', this.escapeKeyHandler);

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
    this.isMenuOpen = false;
    this.showClearConfirm = false;
    StorageManager.saveState({ isOpen: false });
    this.render();
  }

  private minimizeChat(): void {
    this.state.isMinimized = true;
    this.state.isOpen = false;
    this.isMenuOpen = false;
    this.showClearConfirm = false;
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

      // Play notification sound for assistant message
      this.playNotificationSound();

      // Remove typing indicator and re-render with response
      this.removeTypingIndicator();
      this.render();
      this.scrollToBottom();
      this.focusInput();
    } catch (error) {
      console.error('Failed to send message:', error);

      // Remove typing indicator
      this.removeTypingIndicator();

      // Show a context-appropriate error message
      const errMsg = error instanceof Error ? error.message : '';
      let errorContent: string;
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit')) {
        errorContent =
          "I'm getting a lot of requests right now — please wait a moment and try again. ⏳";
      } else if (errMsg.includes('401') || errMsg.includes('403')) {
        errorContent =
          "I couldn't authenticate your request. Please refresh the page and try again.";
      } else if (errMsg.includes('503') || errMsg.includes('Failed to fetch')) {
        errorContent =
          "I'm having trouble connecting right now. Please check your connection and try again.";
      } else {
        errorContent = "I'm sorry, something went wrong. Please try again.";
      }

      const errorMessage: WidgetMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: errorContent,
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

  private playNotificationSound(): void {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.soundVolume * 0.3, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      gainNode.connect(ctx.destination);

      // Two-tone chime: a gentle ascending interval
      const tones = [880, 1108]; // A5 → C#6
      tones.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        osc.connect(gainNode);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.35);
      });
    } catch {
      // Web Audio not available – silently skip
    }
  }

  private exportChat(): void {
    const exportData = {
      exportedAt: new Date().toISOString(),
      messages: this.state.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString(),
      })),
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `jade-chat-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 500);

    // Show success toast
    if (this.exportToastTimeout) clearTimeout(this.exportToastTimeout);
    this.showExportToast = true;
    this.render();
    this.exportToastTimeout = window.setTimeout(() => {
      this.showExportToast = false;
      this.render();
    }, 3000);
  }

  private performClearChat(): void {
    StorageManager.clearAll();
    this.isMenuOpen = false;
    this.showClearConfirm = false;
    this.state = {
      isOpen: false,
      isMinimized: false,
      showGreeting: false,
      messages: this.getInitialMessages(),
    };
    this.render();
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
    if (this.exportToastTimeout) {
      clearTimeout(this.exportToastTimeout);
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
