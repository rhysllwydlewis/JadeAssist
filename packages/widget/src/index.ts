/**
 * JadeWidget - Embeddable chat widget
 * Main entry point
 */

import { JadeWidget as Widget } from './widget';
import type { WidgetConfig } from './types';

// Global API
interface JadeWidgetGlobal {
  init: (config?: WidgetConfig) => void;
  instance?: Widget;
}

// Initialize the widget
function init(config?: WidgetConfig): void {
  // Remove existing instance if any
  if ((window as any).JadeWidget?.instance) {
    (window as any).JadeWidget.instance.unmount();
  }

  // Create and mount new instance
  const widget = new Widget(config);
  widget.mount();

  // Store instance
  (window as any).JadeWidget.instance = widget;
}

// Create and expose global API immediately
const api: JadeWidgetGlobal = {
  init,
};

// Attach to window immediately
if (typeof window !== 'undefined') {
  (window as any).JadeWidget = api;
}

// Default export for IIFE
export default api;
