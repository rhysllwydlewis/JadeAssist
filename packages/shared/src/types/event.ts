/**
 * Event planning types
 */

export type EventType =
  | 'wedding'
  | 'birthday'
  | 'corporate'
  | 'conference'
  | 'party'
  | 'anniversary'
  | 'other';

export interface EventPlan {
  id: string;
  userId: string;
  conversationId: string;
  eventType: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
  postcode?: string;
  timeline?: TimelineItem[];
  checklist?: ChecklistItem[];
  suppliers?: SupplierRecommendation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  completed: boolean;
  category: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface SupplierRecommendation {
  supplierId: string;
  name: string;
  category: string;
  location: string;
  postcode: string;
  description: string;
  rating: number;
  estimatedCost?: number;
  reason?: string;
}

export interface EventCalculations {
  totalBudget: number;
  allocations: BudgetAllocation[];
  guestCount: number;
  perHeadCost: number;
  contingency: number;
}

export interface BudgetAllocation {
  category: string;
  amount: number;
  percentage: number;
  description: string;
}
