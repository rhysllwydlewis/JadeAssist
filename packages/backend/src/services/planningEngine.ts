/**
 * Planning Engine Service - Core event planning logic
 */
import { llmService, LLMMessage } from './llmService';
import { ConversationModel } from '../models/Conversation';
import { EventType, TimelineItem, ChecklistItem, EVENT_TYPE_METADATA } from '@jadeassist/shared';
import { logger } from '../utils/logger';

export interface PlanningContext {
  conversationId: string;
  userId: string;
  eventType?: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
}

export interface PlanningResponse {
  message: string;
  suggestions?: string[];
  timeline?: TimelineItem[];
  checklist?: ChecklistItem[];
  requiresMoreInfo: boolean;
}

class PlanningEngineService {
  /**
   * Process a planning request and generate response
   */
  async processRequest(context: PlanningContext, userMessage: string): Promise<PlanningResponse> {
    try {
      // Get conversation history
      const messages = await ConversationModel.getMessages(context.conversationId);

      // Build context for LLM
      const llmMessages: LLMMessage[] = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Add current user message
      llmMessages.push({
        role: 'user',
        content: userMessage,
      });

      // Enhance prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(context, userMessage);
      llmMessages[llmMessages.length - 1].content = enhancedPrompt;

      // Get LLM response
      const response = await llmService.chat(llmMessages);

      // Store the assistant's response
      await ConversationModel.addMessage(
        context.conversationId,
        'assistant',
        response.content,
        response.tokensUsed
      );

      // Parse response and extract structured data
      const planningResponse = this.parseResponse(response.content, context);

      return planningResponse;
    } catch (error) {
      logger.error({ error, context }, 'Planning request failed');
      throw error;
    }
  }

  /**
   * Generate a timeline for an event
   */
  async generateTimeline(context: PlanningContext): Promise<TimelineItem[]> {
    const metadata = context.eventType ? EVENT_TYPE_METADATA[context.eventType] : null;

    if (!metadata) {
      return [];
    }

    const prompt = `Generate a detailed timeline for a ${metadata.displayName} with ${
      context.guestCount || 'unknown'
    } guests and a budget of £${context.budget || 'unknown'}. 
    
    Create a list of key milestones from now until the event date, including:
    - When to book venues
    - When to send invitations
    - When to confirm suppliers
    - When to finalize details
    
    Return the timeline as a JSON array with items containing: title, description, dueDate (as ISO string), category.`;

    const response = await llmService.generate(prompt);

    // Parse timeline from response
    // This is a simplified version - in production, you'd use more robust parsing
    try {
      const timelineData = JSON.parse(response.content) as TimelineItem[];
      return timelineData.map((item, index) => ({
        ...item,
        id: `timeline-${index}`,
        completed: false,
      }));
    } catch {
      logger.warn('Failed to parse timeline JSON');
      return [];
    }
  }

  /**
   * Generate a checklist for an event
   */
  async generateChecklist(context: PlanningContext): Promise<ChecklistItem[]> {
    const metadata = context.eventType ? EVENT_TYPE_METADATA[context.eventType] : null;

    if (!metadata) {
      return [];
    }

    const prompt = `Generate a comprehensive checklist for planning a ${
      metadata.displayName
    }. Include:
    - Venue selection and booking
    - Catering arrangements
    - Entertainment and activities
    - Decorations and setup
    - Guest management
    - Day-of coordination
    
    Return as JSON array with items containing: title, description, priority (low/medium/high), category.`;

    const response = await llmService.generate(prompt);

    try {
      const checklistData = JSON.parse(response.content) as ChecklistItem[];
      return checklistData.map((item, index) => ({
        ...item,
        id: `checklist-${index}`,
        completed: false,
      }));
    } catch {
      logger.warn('Failed to parse checklist JSON');
      return [];
    }
  }

  /**
   * Build an enhanced prompt with context
   */
  private buildEnhancedPrompt(context: PlanningContext, userMessage: string): string {
    const contextParts: string[] = [];

    if (context.eventType) {
      const metadata = EVENT_TYPE_METADATA[context.eventType];
      contextParts.push(`Event Type: ${metadata.displayName}`);
    }

    if (context.budget) {
      contextParts.push(`Budget: £${context.budget}`);
    }

    if (context.guestCount) {
      contextParts.push(`Guest Count: ${context.guestCount}`);
    }

    if (context.eventDate) {
      contextParts.push(`Event Date: ${context.eventDate.toDateString()}`);
    }

    if (context.location) {
      contextParts.push(`Location: ${context.location}`);
    }

    const contextString = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}` : '';

    return `${userMessage}${contextString}`;
  }

  /**
   * Parse LLM response and extract structured data
   */
  private parseResponse(content: string, context: PlanningContext): PlanningResponse {
    // Check if more information is needed
    const needsMoreInfo = this.detectInformationGaps(content, context);

    // Extract suggestions if present
    const suggestions = this.extractSuggestions(content);

    return {
      message: content,
      suggestions,
      requiresMoreInfo: needsMoreInfo,
    };
  }

  /**
   * Detect if more information is needed
   */
  private detectInformationGaps(content: string, context: PlanningContext): boolean {
    const lowerContent = content.toLowerCase();

    // Check for questions or requests for information
    const questionIndicators = [
      'what is',
      'when is',
      'where is',
      'how many',
      'could you tell me',
      'can you provide',
      'need to know',
    ];

    const hasQuestions = questionIndicators.some((indicator) => lowerContent.includes(indicator));

    // Check if essential information is missing
    const missingEssentials = !context.eventType || !context.budget || !context.guestCount;

    return hasQuestions || missingEssentials;
  }

  /**
   * Extract suggestions from response
   */
  private extractSuggestions(content: string): string[] | undefined {
    // Look for bulleted lists or numbered items
    const lines = content.split('\n');
    const suggestions: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Match bullet points or numbers
      if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const suggestion = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
        if (suggestion.length > 0) {
          suggestions.push(suggestion);
        }
      }
    });

    return suggestions.length > 0 ? suggestions.slice(0, 5) : undefined;
  }

  /**
   * Suggest suppliers based on criteria
   */
  async suggestSuppliers(params: {
    eventType: EventType;
    category: string;
    postcode: string;
    budget: number;
    guestCount: number;
    preferences?: Record<string, unknown>;
  }): Promise<
    Array<{
      id: string;
      name: string;
      category: string;
      rating: number;
      price: string;
      distance: number;
      description: string;
      contact: string;
    }>
  > {
    // This is a simplified implementation
    // In production, you'd query the suppliers database with postcode proximity
    const { category, postcode, budget, guestCount } = params;

    logger.debug({ category, postcode }, 'Suggesting suppliers');

    // In production, this would be an actual database query
    // For now, return mock data after a Promise to make it properly async
    return await Promise.resolve([
      {
        id: '1',
        name: `Premium ${category} Services`,
        category,
        rating: 4.8,
        price: budget > 10000 ? '££££' : budget > 5000 ? '£££' : '££',
        distance: 5.2,
        description: `Professional ${category} services for events of all sizes`,
        contact: 'contact@example.com',
      },
      {
        id: '2',
        name: `Elite ${category} Co`,
        category,
        rating: 4.6,
        price: budget > 8000 ? '£££' : '££',
        distance: 8.5,
        description: `Award-winning ${category} provider`,
        contact: 'info@example.com',
      },
      {
        id: '3',
        name: `Budget ${category} Solutions`,
        category,
        rating: 4.3,
        price: '£',
        distance: 3.1,
        description: `Affordable ${category} options for smaller events`,
        contact: 'hello@example.com',
      },
    ].filter((supplier) => {
      // Filter by guest count capacity (mock logic)
      if (guestCount > 200 && supplier.price === '£') return false;
      return true;
    }));
  }

  /**
   * Build detailed timeline for event
   */
  async buildTimeline(params: {
    eventType: EventType;
    eventDate: Date;
    guestCount: number;
    complexity: string;
  }): Promise<{
    timeline: Array<{
      week: number;
      daysUntilEvent: number;
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        priority: string;
        estimatedHours: number;
      }>;
    }>;
    totalTasks: number;
    estimatedHours: number;
  }> {
    const { eventType, eventDate, complexity } = params;

    logger.debug({ eventType, complexity }, 'Building timeline');

    const now = new Date();
    const daysUntilEvent = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const weeksUntilEvent = Math.ceil(daysUntilEvent / 7);

    // Base task multiplier based on complexity
    const complexityMultiplier = complexity === 'complex' ? 1.5 : complexity === 'simple' ? 0.7 : 1.0;

    // Generate timeline weeks
    const timeline: Array<{
      week: number;
      daysUntilEvent: number;
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        priority: string;
        estimatedHours: number;
      }>;
    }> = [];
    let totalTasks = 0;
    let totalHours = 0;

    // Week ranges for different planning phases
    const phases = [
      {
        weekRange: [weeksUntilEvent - 4, weeksUntilEvent],
        name: 'Final preparations',
        tasks: [
          {
            title: 'Confirm final guest count',
            description: 'Get RSVPs and confirm numbers with suppliers',
            priority: 'high',
            hours: 2,
          },
          {
            title: 'Final venue walkthrough',
            description: 'Visit venue and confirm setup details',
            priority: 'high',
            hours: 3,
          },
          {
            title: 'Confirm all suppliers',
            description: 'Contact all suppliers to confirm timing and details',
            priority: 'high',
            hours: 2,
          },
        ],
      },
      {
        weekRange: [Math.max(weeksUntilEvent - 12, 0), weeksUntilEvent - 4],
        name: 'Mid-stage planning',
        tasks: [
          {
            title: 'Book entertainment',
            description: 'Secure entertainment and music providers',
            priority: 'medium',
            hours: 4,
          },
          {
            title: 'Order decorations',
            description: 'Place orders for decorations and setup items',
            priority: 'medium',
            hours: 3,
          },
          {
            title: 'Send invitations',
            description: 'Send out formal invitations to all guests',
            priority: 'high',
            hours: 2,
          },
        ],
      },
      {
        weekRange: [0, Math.max(weeksUntilEvent - 12, 1)],
        name: 'Early planning',
        tasks: [
          {
            title: 'Book venue',
            description: 'Secure and book the event venue',
            priority: 'high',
            hours: 5,
          },
          {
            title: 'Book catering',
            description: 'Arrange catering and menu selection',
            priority: 'high',
            hours: 4,
          },
          {
            title: 'Create guest list',
            description: 'Compile comprehensive guest list with contact details',
            priority: 'medium',
            hours: 3,
          },
        ],
      },
    ];

    // Build timeline from phases
    let weekCounter = 1;
    phases.forEach((phase) => {
      const [startWeek, endWeek] = phase.weekRange;
      if (startWeek >= 0 && endWeek > 0) {
        const tasks = phase.tasks.map((task, idx) => {
          const adjustedHours = Math.round(task.hours * complexityMultiplier);
          totalHours += adjustedHours;
          totalTasks++;

          return {
            id: `task-${weekCounter}-${idx}`,
            title: task.title,
            description: task.description,
            priority: task.priority,
            estimatedHours: adjustedHours,
          };
        });

        timeline.push({
          week: weekCounter,
          daysUntilEvent: Math.max(daysUntilEvent - (weekCounter - 1) * 7, 0),
          tasks,
        });

        weekCounter++;
      }
    });

    return await Promise.resolve({
      timeline,
      totalTasks,
      estimatedHours: totalHours,
    });
  }

  /**
   * Create detailed checklist for event
   */
  async createChecklist(params: {
    eventType: EventType;
    guestCount: number;
    venue?: string;
    includeVenue: boolean;
    includeDecor: boolean;
    includeFood: boolean;
    includeMusic: boolean;
  }): Promise<
    Array<{
      category: string;
      items: Array<{
        id: string;
        title: string;
        description: string;
        priority: string;
        completed: boolean;
        dueDate?: string;
      }>;
    }>
  > {
    const { eventType, guestCount, includeVenue, includeDecor, includeFood, includeMusic } = params;

    logger.debug({ eventType, guestCount }, 'Creating checklist');

    const checklist = [];

    // Venue checklist
    if (includeVenue) {
      checklist.push({
        category: 'Venue',
        items: [
          {
            id: 'venue-1',
            title: 'Research and shortlist venues',
            description: 'Find venues that match budget and guest capacity',
            priority: 'high',
            completed: false,
          },
          {
            id: 'venue-2',
            title: 'Visit potential venues',
            description: 'Schedule tours of shortlisted venues',
            priority: 'high',
            completed: false,
          },
          {
            id: 'venue-3',
            title: 'Book venue',
            description: 'Sign contract and pay deposit',
            priority: 'high',
            completed: false,
          },
          {
            id: 'venue-4',
            title: 'Confirm setup arrangements',
            description: 'Arrange furniture layout and technical requirements',
            priority: 'medium',
            completed: false,
          },
        ],
      });
    }

    // Food & Catering checklist
    if (includeFood) {
      checklist.push({
        category: 'Catering',
        items: [
          {
            id: 'catering-1',
            title: 'Research caterers',
            description: 'Find catering services within budget',
            priority: 'high',
            completed: false,
          },
          {
            id: 'catering-2',
            title: 'Menu tasting',
            description: 'Schedule tasting sessions with shortlisted caterers',
            priority: 'medium',
            completed: false,
          },
          {
            id: 'catering-3',
            title: 'Confirm dietary requirements',
            description: 'Collect and communicate guest dietary needs',
            priority: 'high',
            completed: false,
          },
          {
            id: 'catering-4',
            title: 'Finalize menu',
            description: 'Sign catering contract with final menu',
            priority: 'high',
            completed: false,
          },
        ],
      });
    }

    // Decor checklist
    if (includeDecor) {
      checklist.push({
        category: 'Decorations',
        items: [
          {
            id: 'decor-1',
            title: 'Choose color scheme',
            description: 'Select colors and theme for event',
            priority: 'medium',
            completed: false,
          },
          {
            id: 'decor-2',
            title: 'Order flowers',
            description: 'Book florist and select arrangements',
            priority: 'medium',
            completed: false,
          },
          {
            id: 'decor-3',
            title: 'Purchase decorations',
            description: 'Buy or rent decor items',
            priority: 'low',
            completed: false,
          },
          {
            id: 'decor-4',
            title: 'Arrange setup crew',
            description: 'Organize team to set up decorations',
            priority: 'medium',
            completed: false,
          },
        ],
      });
    }

    // Music & Entertainment checklist
    if (includeMusic) {
      checklist.push({
        category: 'Entertainment',
        items: [
          {
            id: 'music-1',
            title: 'Book entertainment',
            description: 'Hire DJ, band, or other entertainment',
            priority: 'high',
            completed: false,
          },
          {
            id: 'music-2',
            title: 'Create playlist',
            description: 'Prepare music selection and special requests',
            priority: 'low',
            completed: false,
          },
          {
            id: 'music-3',
            title: 'Confirm technical requirements',
            description: 'Verify sound system and equipment needs',
            priority: 'medium',
            completed: false,
          },
        ],
      });
    }

    // Guest Management - always included
    checklist.push({
      category: 'Guest Management',
      items: [
        {
          id: 'guest-1',
          title: 'Create guest list',
          description: 'Compile list with contact details',
          priority: 'high',
          completed: false,
        },
        {
          id: 'guest-2',
          title: 'Send invitations',
          description: 'Send formal invitations to all guests',
          priority: 'high',
          completed: false,
        },
        {
          id: 'guest-3',
          title: 'Track RSVPs',
          description: 'Monitor responses and follow up',
          priority: 'high',
          completed: false,
        },
        {
          id: 'guest-4',
          title: 'Create seating plan',
          description: guestCount > 50 ? 'Arrange table assignments' : 'Plan seating arrangement',
          priority: 'medium',
          completed: false,
        },
      ],
    });

    return await Promise.resolve(checklist);
  }
}

// Export singleton instance
export const planningEngine = new PlanningEngineService();
