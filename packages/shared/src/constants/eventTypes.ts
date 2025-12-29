/**
 * Event type constants and metadata
 */

export const EVENT_TYPES = [
  'wedding',
  'birthday',
  'corporate',
  'conference',
  'party',
  'anniversary',
  'other',
] as const;

export interface EventTypeMetadata {
  type: string;
  displayName: string;
  description: string;
  averageBudget: { min: number; max: number };
  averageGuestCount: { min: number; max: number };
  typicalDuration: number; // in hours
  planningTimeframe: number; // in weeks
}

export const EVENT_TYPE_METADATA: Record<string, EventTypeMetadata> = {
  wedding: {
    type: 'wedding',
    displayName: 'Wedding',
    description: 'Traditional wedding ceremony and reception',
    averageBudget: { min: 10000, max: 50000 },
    averageGuestCount: { min: 50, max: 200 },
    typicalDuration: 8,
    planningTimeframe: 52,
  },
  birthday: {
    type: 'birthday',
    displayName: 'Birthday Party',
    description: 'Birthday celebration for all ages',
    averageBudget: { min: 500, max: 5000 },
    averageGuestCount: { min: 10, max: 100 },
    typicalDuration: 4,
    planningTimeframe: 4,
  },
  corporate: {
    type: 'corporate',
    displayName: 'Corporate Event',
    description: 'Business events, team building, and corporate gatherings',
    averageBudget: { min: 2000, max: 20000 },
    averageGuestCount: { min: 20, max: 500 },
    typicalDuration: 6,
    planningTimeframe: 12,
  },
  conference: {
    type: 'conference',
    displayName: 'Conference',
    description: 'Multi-day conferences and professional gatherings',
    averageBudget: { min: 5000, max: 100000 },
    averageGuestCount: { min: 50, max: 1000 },
    typicalDuration: 16,
    planningTimeframe: 26,
  },
  party: {
    type: 'party',
    displayName: 'Party',
    description: 'General celebration or social gathering',
    averageBudget: { min: 300, max: 3000 },
    averageGuestCount: { min: 10, max: 100 },
    typicalDuration: 4,
    planningTimeframe: 2,
  },
  anniversary: {
    type: 'anniversary',
    displayName: 'Anniversary',
    description: 'Wedding or relationship anniversary celebration',
    averageBudget: { min: 1000, max: 10000 },
    averageGuestCount: { min: 20, max: 150 },
    typicalDuration: 6,
    planningTimeframe: 8,
  },
  other: {
    type: 'other',
    displayName: 'Other Event',
    description: 'Custom event type',
    averageBudget: { min: 500, max: 10000 },
    averageGuestCount: { min: 10, max: 200 },
    typicalDuration: 4,
    planningTimeframe: 8,
  },
};

export const SUPPLIER_CATEGORIES = [
  'venue',
  'catering',
  'photographer',
  'videographer',
  'florist',
  'entertainment',
  'decorator',
  'transport',
  'accommodation',
  'stationery',
  'beauty',
  'equipment',
  'other',
] as const;

export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];
