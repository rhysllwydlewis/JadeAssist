/**
 * Widget styles
 */

export function getWidgetStyles(primaryColor: string): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :host {
      all: initial;
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
    }

    .jade-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
    }

    /* Avatar Button */
    .jade-avatar-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${primaryColor} 0%, #6d28d9 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all 0.3s ease;
      animation: float 3s ease-in-out infinite;
    }

    .jade-avatar-button:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.5);
    }

    .jade-avatar-button:active {
      transform: translateY(0) scale(0.98);
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    .jade-avatar-icon {
      width: 32px;
      height: 32px;
      color: white;
      font-size: 32px;
    }

    .jade-avatar-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid white;
    }

    /* Greeting Tooltip */
    .jade-greeting-tooltip {
      position: absolute;
      bottom: 70px;
      right: 0;
      background: white;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      max-width: 280px;
      opacity: 0;
      transform: translateY(10px);
      animation: slideUp 0.4s ease forwards;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .jade-greeting-tooltip:hover {
      transform: translateY(-2px);
    }

    @keyframes slideUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .jade-greeting-tooltip::after {
      content: '';
      position: absolute;
      bottom: -8px;
      right: 20px;
      width: 16px;
      height: 16px;
      background: white;
      transform: rotate(45deg);
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.05);
    }

    .jade-greeting-text {
      position: relative;
      z-index: 1;
      font-size: 14px;
      color: #4b5563;
      line-height: 1.5;
    }

    .jade-greeting-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: #9ca3af;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0;
      z-index: 2;
    }

    .jade-greeting-close:hover {
      color: #4b5563;
    }

    /* Chat Popup */
    .jade-chat-popup {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 380px;
      height: 580px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      animation: popupOpen 0.3s ease forwards;
    }

    @keyframes popupOpen {
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Header */
    .jade-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(135deg, ${primaryColor} 0%, #6d28d9 100%);
      border-radius: 16px 16px 0 0;
      color: white;
    }

    .jade-chat-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .jade-chat-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .jade-chat-title {
      font-size: 16px;
      font-weight: 600;
    }

    .jade-chat-status {
      font-size: 12px;
      opacity: 0.9;
    }

    .jade-chat-close {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      transition: background 0.2s ease;
    }

    .jade-chat-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Messages */
    .jade-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #f9fafb;
    }

    .jade-chat-messages::-webkit-scrollbar {
      width: 6px;
    }

    .jade-chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .jade-chat-messages::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    .jade-message {
      display: flex;
      gap: 8px;
      animation: messageSlide 0.3s ease;
    }

    @keyframes messageSlide {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .jade-message-user {
      flex-direction: row-reverse;
    }

    .jade-message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .jade-message-avatar.assistant {
      background: linear-gradient(135deg, ${primaryColor} 0%, #6d28d9 100%);
      color: white;
    }

    .jade-message-avatar.user {
      background: #e5e7eb;
      color: #6b7280;
    }

    .jade-message-content {
      max-width: 70%;
    }

    .jade-message-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      word-wrap: break-word;
    }

    .jade-message-assistant .jade-message-bubble {
      background: white;
      color: #1f2937;
      border-bottom-left-radius: 4px;
    }

    .jade-message-user .jade-message-bubble {
      background: ${primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .jade-message-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
      padding: 0 4px;
    }

    /* Quick Replies */
    .jade-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .jade-quick-reply-btn {
      padding: 8px 16px;
      border: 1px solid ${primaryColor};
      background: white;
      color: ${primaryColor};
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .jade-quick-reply-btn:hover {
      background: ${primaryColor};
      color: white;
    }

    /* Input Area */
    .jade-chat-input-area {
      padding: 16px 20px;
      background: white;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 16px 16px;
    }

    .jade-chat-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .jade-chat-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      resize: none;
      max-height: 100px;
      min-height: 40px;
    }

    .jade-chat-input:focus {
      border-color: ${primaryColor};
    }

    .jade-chat-send-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: ${primaryColor};
      color: white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .jade-chat-send-btn:hover:not(:disabled) {
      background: #6d28d9;
      transform: scale(1.05);
    }

    .jade-chat-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading indicator */
    .jade-typing-indicator {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
    }

    .jade-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      animation: typing 1.4s infinite;
    }

    .jade-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .jade-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
      }
      30% {
        transform: translateY(-10px);
        opacity: 1;
      }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .jade-widget-container {
        bottom: 16px;
        right: 16px;
      }

      .jade-chat-popup {
        width: calc(100vw - 32px);
        height: calc(100vh - 120px);
        max-height: 600px;
      }

      .jade-greeting-tooltip {
        max-width: calc(100vw - 120px);
      }
    }

    /* Hidden utility */
    .jade-hidden {
      display: none !important;
    }
  `;
}
