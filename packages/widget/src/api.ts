/**
 * API client for chat communication
 */

import { WidgetMessage } from './types';

export interface ChatApiResponse {
  success: boolean;
  data?: {
    conversationId: string;
    message: {
      id: string;
      content: string;
      role: string;
      createdAt: string;
    };
    suggestions?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export class ApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || '';
    this.demoMode = !baseUrl;
  }

  async sendMessage(
    message: string,
    conversationId?: string
  ): Promise<{ conversationId: string; message: WidgetMessage }> {
    if (this.demoMode) {
      return this.mockResponse(message);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId,
          userId: 'anonymous', // In production, this would come from auth
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ChatApiResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || 'API request failed');
      }

      return {
        conversationId: data.data.conversationId,
        message: {
          id: data.data.message.id,
          role: 'assistant',
          content: data.data.message.content,
          timestamp: Date.now(),
          quickReplies: data.data.suggestions,
        },
      };
    } catch (error) {
      console.error('API request failed, falling back to demo mode:', error);
      // Fallback to demo mode on error
      const response = await this.mockResponse(message);
      // Add a note to the message indicating it's a demo response
      response.message.content = `⚠️ (Demo Mode) ${response.message.content}`;
      return response;
    }
  }

  private async mockResponse(
    userMessage: string
  ): Promise<{ conversationId: string; message: WidgetMessage }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const conversationId = 'demo-' + Date.now();
    const lowerMessage = userMessage.toLowerCase();

    let content = '';
    let quickReplies: string[] | undefined;

    // Demo responses based on user input
    if (lowerMessage.includes('yes') && lowerMessage.includes('please')) {
      content =
        "Wonderful! I'd love to help you plan your event. What type of event are you planning? 🎉";
      quickReplies = ['Wedding', 'Birthday Party', 'Corporate Event', 'Other'];
    } else if (lowerMessage.includes('wedding')) {
      content =
        "Exciting! A wedding is such a special occasion. Do you have a date in mind? 💍";
      quickReplies = ['Yes, I do', 'Not yet', 'Need help choosing'];
    } else if (lowerMessage.includes('no') && lowerMessage.includes('thanks')) {
      content =
        "No problem! If you change your mind or need any event planning help, I'm always here. Have a great day! 😊";
    } else if (lowerMessage.includes('budget')) {
      content =
        "I can help you create a realistic budget! What's your approximate total budget for the event? 💷";
      quickReplies = ['Under £5k', '£5k-£10k', '£10k-£20k', '£20k+'];
    } else if (lowerMessage.includes('venue')) {
      content =
        'Great question! I can help you find the perfect venue. What region are you looking in? 📍';
      quickReplies = ['London', 'Scotland', 'Wales', 'Other UK'];
    } else {
      content =
        "I'm here to help with all aspects of event planning! I can assist with budget planning, venue selection, supplier recommendations, timelines, and more. What would you like to know? 😊";
      quickReplies = ['Budget Planning', 'Find Venues', 'Get Timeline', 'Talk to Expert'];
    }

    return {
      conversationId,
      message: {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        quickReplies,
      },
    };
  }
}
