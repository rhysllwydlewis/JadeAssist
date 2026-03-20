/**
 * Widget styles
 */

export function getWidgetStyles(
  primaryColor: string,
  accentColor: string,
  fontFamily: string,
  offsetBottom: string,
  offsetRight: string,
  offsetLeft: string,
  offsetBottomMobile: string,
  offsetRightMobile: string,
  offsetLeftMobile: string,
  scale: number
): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :host {
      all: initial;
      display: block;
      font-family: ${fontFamily};
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      
      /* CSS Custom Properties for positioning - can be overridden by consumers */
      --jade-offset-bottom: ${offsetBottom};
      --jade-offset-right: ${offsetRight};
      --jade-offset-left: ${offsetLeft};
      --jade-scale: ${scale};
      --jade-primary-color: ${primaryColor};
      --jade-accent-color: ${accentColor};
    }

    .jade-widget-container {
      position: fixed;
      bottom: var(--jade-offset-bottom, ${offsetBottom});
      ${offsetLeft ? `left: var(--jade-offset-left, ${offsetLeft});` : `right: var(--jade-offset-right, ${offsetRight});`}
      ${offsetLeft ? 'right: auto;' : ''}
      z-index: 999999;
      transform: scale(var(--jade-scale, ${scale}));
      transform-origin: ${offsetLeft ? 'left' : 'right'} bottom;
    }

    /* Avatar Button */
    .jade-avatar-button {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--jade-primary-color, ${primaryColor}) 0%, var(--jade-accent-color, ${accentColor}) 100%);
      border: 3px solid white;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: float 3s ease-in-out infinite;
      /* Larger tap target using pseudo-element */
      overflow: visible;
    }

    /* Larger invisible tap target for better mobile UX */
    .jade-avatar-button::before {
      content: '';
      position: absolute;
      top: -20px;
      left: -20px;
      right: -20px;
      bottom: -20px;
      border-radius: 50%;
      /* Ensures tap events are captured in the expanded area */
    }

    .jade-avatar-button:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 6px 12px rgba(0, 0, 0, 0.15);
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
      width: 100%;
      height: 100%;
      color: white;
      font-size: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .jade-avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
    }

    .jade-avatar-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      background: #ef4444;
      border: 2px solid white;
      color: white;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      animation: badgePulse 2s ease-in-out infinite;
    }

    @keyframes badgePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    /* Greeting Tooltip */
    .jade-greeting-tooltip {
      position: absolute;
      bottom: 84px;
      ${offsetLeft ? 'left: 0;' : 'right: 0;'}
      background: white;
      padding: 18px 22px;
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
      max-width: 300px;
      opacity: 0;
      transform: translateY(10px);
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .jade-greeting-tooltip:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2), 0 6px 16px rgba(0, 0, 0, 0.12);
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
      ${offsetLeft ? 'left: 24px;' : 'right: 24px;'}
      width: 16px;
      height: 16px;
      background: white;
      transform: rotate(45deg);
      box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.08);
      border-right: 1px solid rgba(0, 0, 0, 0.05);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .jade-greeting-text {
      position: relative;
      z-index: 1;
      font-size: 15px;
      color: #374151;
      line-height: 1.6;
      font-weight: 500;
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
      bottom: 84px;
      ${offsetLeft ? 'left: 0;' : 'right: 0;'}
      width: 400px;
      height: 600px;
      background: white;
      border-radius: 22px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18), 0 8px 24px rgba(0, 0, 0, 0.12);
      display: flex;
      flex-direction: column;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      animation: popupOpen 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      border: 1px solid rgba(0, 0, 0, 0.06);
      overflow: hidden;
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
      padding: 20px 24px;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .jade-chat-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .jade-chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .jade-chat-title {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .jade-chat-status {
      font-size: 13px;
      opacity: 0.95;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .jade-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
      animation: statusPulse 2s ease-in-out infinite;
    }

    @keyframes statusPulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .jade-chat-controls {
      display: flex;
      gap: 8px;
    }

    .jade-chat-minimize,
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
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jade-chat-minimize:hover,
    .jade-chat-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Menu button */
    .jade-menu-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .jade-menu-btn:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    .jade-menu-btn--open {
      background: rgba(255, 255, 255, 0.3);
      box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.5);
    }

    .jade-menu-btn:focus-visible {
      outline: 2px solid rgba(255,255,255,0.85);
      outline-offset: 2px;
    }

    /* Settings menu panel */
    .jade-menu-panel {
      position: absolute;
      top: 68px;
      right: 14px;
      background: white;
      border: 1px solid rgba(0,0,0,0.09);
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.14), 0 3px 10px rgba(0,0,0,0.08);
      z-index: 30;
      min-width: 232px;
      padding: 6px 0;
      animation: jade-menu-enter 0.17s cubic-bezier(0.2, 0, 0, 1.2);
    }

    @keyframes jade-menu-enter {
      from { opacity: 0; transform: translateY(-8px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .jade-menu-item {
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      padding: 11px 16px;
      background: none;
      border: none;
      font-size: 13.5px;
      font-family: inherit;
      color: #1f2937;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
      line-height: 1.4;
    }

    .jade-menu-item svg {
      flex-shrink: 0;
      opacity: 0.65;
    }

    .jade-menu-item:hover {
      background: #f3f4f6;
    }

    .jade-menu-item:hover svg {
      opacity: 0.9;
    }

    .jade-menu-item:focus-visible {
      outline: none;
      background: #e5e7eb;
    }

    .jade-menu-item--danger {
      color: #dc2626;
    }

    .jade-menu-item--danger svg {
      opacity: 0.75;
    }

    .jade-menu-item--danger:hover {
      background: #fff1f1;
    }

    .jade-menu-item--disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    .jade-menu-divider {
      height: 1px;
      background: rgba(0,0,0,0.07);
      margin: 5px 0;
    }

    /* Sound toggle row */
    .jade-menu-sound-row {
      justify-content: space-between;
      cursor: default;
      user-select: none;
    }

    .jade-menu-sound-row:hover {
      background: none;
    }

    .jade-menu-sound-label {
      display: flex;
      align-items: center;
      gap: 11px;
      color: #1f2937;
      font-size: 13.5px;
    }

    .jade-menu-sound-label svg {
      opacity: 0.65;
    }

    /* Toggle switch */
    .jade-sound-toggle {
      position: relative;
      width: 40px;
      height: 23px;
      background: #d1d5db;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.22s ease;
      flex-shrink: 0;
      padding: 0;
    }

    .jade-sound-toggle--on {
      background: ${primaryColor};
    }

    .jade-sound-toggle-knob {
      position: absolute;
      top: 3.5px;
      left: 3.5px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      pointer-events: none;
    }

    .jade-sound-toggle--on .jade-sound-toggle-knob {
      transform: translateX(17px);
    }

    .jade-sound-toggle:focus-visible {
      outline: 2px solid ${primaryColor};
      outline-offset: 2px;
    }

    /* Volume row */
    .jade-menu-volume-row {
      gap: 10px;
      flex-wrap: nowrap;
      cursor: default;
      padding-top: 8px;
      padding-bottom: 10px;
    }

    .jade-menu-volume-row:hover {
      background: none;
    }

    .jade-volume-label {
      font-size: 12.5px;
      color: #6b7280;
      white-space: nowrap;
      flex-shrink: 0;
      user-select: none;
    }

    .jade-volume-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 5px;
      background: #e5e7eb;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      min-width: 0;
    }

    .jade-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 15px;
      height: 15px;
      background: ${primaryColor};
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      transition: transform 0.12s ease;
    }

    .jade-volume-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .jade-volume-slider::-moz-range-thumb {
      width: 15px;
      height: 15px;
      background: ${primaryColor};
      border-radius: 50%;
      border: none;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
    }

    .jade-volume-slider:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .jade-volume-value {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
      flex-shrink: 0;
      min-width: 30px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Clear chat confirmation modal */
    .jade-modal-overlay {
      position: absolute;
      inset: 0;
      background: rgba(17, 24, 39, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      border-radius: 20px;
      animation: jade-overlay-enter 0.18s ease;
    }

    @keyframes jade-overlay-enter {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .jade-modal {
      background: white;
      border-radius: 16px;
      padding: 22px 20px 18px;
      margin: 20px;
      box-shadow: 0 20px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.12);
      max-width: 285px;
      width: 100%;
      animation: jade-modal-enter 0.2s cubic-bezier(0.34, 1.3, 0.64, 1);
    }

    @keyframes jade-modal-enter {
      from { opacity: 0; transform: scale(0.92) translateY(8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    .jade-modal-title {
      font-size: 15.5px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .jade-modal-desc {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.55;
      margin-bottom: 20px;
    }

    .jade-modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .jade-modal-btn {
      padding: 8px 18px;
      border-radius: 9px;
      border: none;
      font-size: 13.5px;
      font-family: inherit;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s ease;
    }

    .jade-modal-btn--cancel {
      background: #f3f4f6;
      color: #374151;
    }

    .jade-modal-btn--cancel:hover {
      background: #e5e7eb;
    }

    .jade-modal-btn--confirm {
      background: #dc2626;
      color: white;
      box-shadow: 0 2px 6px rgba(220,38,38,0.35);
    }

    .jade-modal-btn--confirm:hover {
      background: #b91c1c;
      box-shadow: 0 3px 8px rgba(185,28,28,0.4);
    }

    .jade-modal-btn:focus-visible {
      outline: 2px solid ${primaryColor};
      outline-offset: 2px;
    }

    /* Export success toast */
    .jade-toast {
      position: absolute;
      bottom: 76px;
      left: 50%;
      transform: translateX(-50%);
      background: #111827;
      color: white;
      font-size: 13px;
      font-weight: 500;
      padding: 9px 16px;
      border-radius: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      z-index: 40;
      white-space: nowrap;
      animation: jade-toast-enter 0.25s cubic-bezier(0.34, 1.3, 0.64, 1);
      pointer-events: none;
    }

    @keyframes jade-toast-enter {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }


    .jade-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #f8f9fb;
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
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      color: white;
      overflow: hidden;
    }

    .jade-msg-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .jade-message-avatar.user {
      background: #e5e7eb;
      color: #6b7280;
    }

    .jade-message-content {
      max-width: 70%;
    }

    .jade-message-bubble {
      padding: 10px 16px;
      border-radius: 18px;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      line-height: 1.55;
      font-size: 14px;
    }

    .jade-message-assistant .jade-message-bubble {
      background: white;
      color: #1f2937;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
    }

    .jade-message-user .jade-message-bubble {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      color: white;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .jade-message-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 5px;
      padding: 0 4px;
    }

    /* Markdown rendering styles */
    .jade-md-list {
      margin: .35em 0 .35em 1.25em;
      padding: 0;
      line-height: 1.65;
    }

    .jade-md-list li {
      margin-bottom: .2em;
    }

    .jade-inline-code {
      background: rgba(0,0,0,.07);
      padding: 2px 5px;
      border-radius: 4px;
      font-size: .88em;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      letter-spacing: -.01em;
    }

    /* Quick Replies */
    .jade-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .jade-quick-reply-btn {
      padding: 7px 14px;
      border: 1.5px solid ${primaryColor};
      background: white;
      color: ${primaryColor};
      border-radius: 20px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      letter-spacing: 0.01em;
    }

    .jade-quick-reply-btn:hover {
      background: ${primaryColor};
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
    }

    .jade-quick-reply-btn:active {
      transform: translateY(0);
    }

    /* Input Area */
    .jade-chat-input-area {
      padding: 14px 18px 16px;
      background: white;
      border-top: 1px solid rgba(0,0,0,0.06);
      border-radius: 0 0 20px 20px;
    }

    .jade-chat-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .jade-chat-input {
      flex: 1;
      padding: 10px 16px;
      border: 1.5px solid #e5e7eb;
      border-radius: 22px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      resize: none;
      max-height: 100px;
      min-height: 40px;
      background: #f9fafb;
      transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      color: #1f2937;
      line-height: 1.5;
    }

    .jade-chat-input:focus {
      border-color: ${primaryColor};
      background: white;
      box-shadow: 0 0 0 3px rgba(0, 178, 169, 0.12);
    }

    .jade-chat-input::placeholder {
      color: #9ca3af;
    }

    .jade-char-count {
      font-size: 11px;
      color: #9ca3af;
      text-align: right;
      margin-top: 4px;
      height: 16px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .jade-char-count-visible {
      opacity: 1;
    }

    .jade-chat-send-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .jade-chat-send-btn:hover:not(:disabled) {
      transform: scale(1.08);
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }

    .jade-chat-send-btn:active:not(:disabled) {
      transform: scale(0.96);
    }

    .jade-chat-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
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
      :host {
        /* Mobile-specific CSS custom properties */
        --jade-offset-bottom: ${offsetBottomMobile || offsetBottom};
        --jade-offset-right: ${offsetRightMobile || (offsetRight === '24px' ? '16px' : offsetRight)};
        --jade-offset-left: ${offsetLeftMobile || (offsetLeft && offsetLeft === '24px' ? '16px' : offsetLeft)};
      }
      
      .jade-widget-container {
        bottom: var(--jade-offset-bottom);
        ${offsetLeft ? `left: var(--jade-offset-left);` : `right: var(--jade-offset-right);`}
        ${offsetLeft ? 'right: auto;' : ''}
      }

      .jade-chat-popup {
        width: calc(100vw - 32px);
        /* Fallback for browsers without dvh or min() support */
        max-height: 600px;
        /* Fallback for browsers without dvh support */
        height: min(600px, calc(100vh - 120px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)));
        /* Modern browsers with dvh support - prevents cut-off on mobile */
        height: min(600px, calc(100dvh - 120px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)));
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
