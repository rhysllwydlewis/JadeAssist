/**
 * Structured planner-state contracts shared by JadeAssist, widget consumers and EventFlow.
 *
 * These types are intentionally additive so existing chat responses can keep returning
 * plain text while newer integrations can persist structured assistant updates.
 */

export interface BudgetRange {
  currency: 'GBP';
  min?: number;
  max?: number;
  raw?: string;
  label?: string;
}

export interface PlannerState {
  eventType?: string;
  location?: string;
  dateOrTimeframe?: string;
  guestCount?: number;
  budget?: BudgetRange;
  notes?: string[];
  unresolvedQuestions: string[];
  summary?: string;
}

export type UiAction =
  | { type: 'update_plan_summary' }
  | { type: 'open_budget_view' }
  | { type: 'open_timeline_view' }
  | { type: 'show_supplier_filters'; payload?: Record<string, unknown> }
  | { type: 'show_degraded_mode_banner'; payload?: { reason?: string } };

export interface AssistantResponse {
  assistantMessage: string;
  statePatch: Partial<PlannerState>;
  nextQuestion?: string;
  uiActions: UiAction[];
  confidence: number;
  mode: 'live' | 'degraded';
}
