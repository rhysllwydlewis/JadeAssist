# JadeAssist API Documentation

Version: 1.0.0  
Base URL: `http://localhost:3001` (development) or your deployed URL

## Table of Contents

- [Authentication](#authentication)
- [Health Endpoints](#health-endpoints)
- [Chat Endpoints](#chat-endpoints)
- [Planning Endpoints](#planning-endpoints)
- [Error Handling](#error-handling)

## Authentication

All API endpoints (except health checks) require JWT authentication.

Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Auth Providers

JadeAssist supports multiple authentication providers:
- `jwt` - Standard JWT tokens
- `supabase` - Supabase authentication
- `eventflow` - Event-flow.co.uk integration

## Health Endpoints

### GET /health

Check system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "services": {
      "database": "up",
      "llm": "up"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Unhealthy (one or more services down)

### GET /health/ready

Check if the service is ready to accept requests.

**Response:**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "services": {
      "database": "ready",
      "llm": "ready"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Ready
- `503` - Not ready

## Chat Endpoints

### POST /api/chat

Send a message in a conversation with the AI assistant.

**Request:**
```json
{
  "conversationId": "uuid-here",  // Optional - omit to start new conversation
  "message": "I want to plan a wedding for 100 guests",
  "userId": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid-here",
    "message": {
      "id": "msg-uuid",
      "role": "assistant",
      "content": "I'd be happy to help you plan your wedding...",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "suggestions": [
      "Tell me about your budget",
      "What's your preferred location?",
      "Do you have a date in mind?"
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `403` - Forbidden (user ID mismatch)
- `404` - Conversation not found

### GET /api/chat/conversations

Get all conversations for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conversation-uuid",
      "userId": "user-uuid",
      "eventType": "wedding",
      "startedAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/chat/conversations/:id

Get a specific conversation with all messages.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conversation-uuid",
    "userId": "user-uuid",
    "eventType": "wedding",
    "startedAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "messages": [
      {
        "id": "msg-uuid-1",
        "role": "user",
        "content": "I want to plan a wedding",
        "createdAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "I'd be happy to help...",
        "createdAt": "2024-01-15T10:01:00.000Z"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `403` - Forbidden (not your conversation)
- `404` - Conversation not found

## Planning Endpoints

### POST /api/planning/plans

Create a new event plan.

**Request:**
```json
{
  "userId": "user-uuid",
  "conversationId": "conversation-uuid",
  "eventType": "wedding",
  "budget": 15000,
  "guestCount": 100,
  "eventDate": "2024-06-15T14:00:00.000Z",
  "location": "London",
  "postcode": "SW1A 1AA"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "plan-uuid",
      "userId": "user-uuid",
      "conversationId": "conversation-uuid",
      "eventType": "wedding",
      "budget": 15000,
      "guestCount": 100,
      "eventDate": "2024-06-15",
      "location": "London",
      "postcode": "SW1A 1AA",
      "timeline": [],
      "checklist": [],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "calculations": {
      "totalBudget": 15000,
      "perHeadCost": 150,
      "contingency": 1500,
      "guestCount": 100,
      "allocations": [
        {
          "category": "venue",
          "amount": 3000,
          "percentage": 20,
          "description": "Location rental and facility fees"
        }
      ]
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `201` - Created
- `403` - Forbidden (user ID mismatch)

### GET /api/planning/plans

Get all event plans for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan-uuid",
      "eventType": "wedding",
      "budget": 15000,
      "guestCount": 100,
      "eventDate": "2024-06-15",
      "location": "London"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/planning/plans/:id

Get a specific event plan.

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "plan-uuid",
      "eventType": "wedding",
      "budget": 15000,
      "guestCount": 100,
      "timeline": [...],
      "checklist": [...]
    },
    "calculations": {
      "totalBudget": 15000,
      "allocations": [...]
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `403` - Forbidden (not your plan)
- `404` - Plan not found

### PATCH /api/planning/plans/:id

Update an event plan.

**Request:**
```json
{
  "budget": 18000,
  "guestCount": 120,
  "eventDate": "2024-06-20T14:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "plan-uuid",
    "budget": 18000,
    "guestCount": 120,
    "eventDate": "2024-06-20",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### POST /api/planning/plans/:id/timeline

Generate a timeline for an event plan.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "timeline-1",
      "title": "Book venue",
      "description": "Research and secure the event venue",
      "dueDate": "2024-03-15T00:00:00.000Z",
      "category": "venue",
      "completed": false
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/planning/plans/:id/checklist

Generate a checklist for an event plan.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "checklist-1",
      "title": "Confirm venue booking",
      "description": "Finalize venue contract and pay deposit",
      "priority": "high",
      "completed": false,
      "category": "venue"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/planning/estimate-budget

Get budget estimate based on event parameters.

**Request:**
```json
{
  "eventType": "wedding",
  "guestCount": 100,
  "eventDate": "2024-06-15T14:00:00.000Z",
  "location": "London",
  "includeVenue": true,
  "includeCatering": true,
  "includeEntertainment": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "breakdown": {
      "venue": 3000,
      "catering": 4500,
      "entertainment": 1500,
      "photography": 2000,
      "flowers": 1000,
      "misc": 3000
    },
    "total": 15000,
    "savings": [
      {
        "tip": "Book during off-peak season",
        "savings": 2250
      },
      {
        "tip": "Choose a weekday instead of weekend",
        "savings": 3000
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/planning/suggest-suppliers

Get supplier recommendations based on criteria.

**Request:**
```json
{
  "eventType": "wedding",
  "category": "catering",
  "postcode": "SW1A 1AA",
  "budget": 5000,
  "guestCount": 100,
  "preferences": {
    "cuisine": "italian",
    "dietary": "vegetarian-options"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suppliers": [
      {
        "id": "supplier-uuid-1",
        "name": "Premium Catering Services",
        "category": "catering",
        "rating": 4.8,
        "price": "£££",
        "distance": 5.2,
        "description": "Professional catering services for events of all sizes",
        "contact": "contact@example.com"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/planning/build-timeline

Generate a detailed event timeline.

**Request:**
```json
{
  "eventType": "wedding",
  "eventDate": "2024-06-15T14:00:00.000Z",
  "guestCount": 100,
  "complexity": "moderate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "week": 1,
        "daysUntilEvent": 140,
        "tasks": [
          {
            "id": "task-1-1",
            "title": "Book venue",
            "description": "Secure and book the event venue",
            "priority": "high",
            "estimatedHours": 5
          }
        ]
      }
    ],
    "totalTasks": 12,
    "estimatedHours": 45
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /api/planning/create-checklist

Generate a comprehensive event checklist.

**Request:**
```json
{
  "eventType": "wedding",
  "guestCount": 100,
  "venue": "The Grand Hall",
  "includeVenue": true,
  "includeDecor": true,
  "includeFood": true,
  "includeMusic": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checklist": [
      {
        "category": "Venue",
        "items": [
          {
            "id": "venue-1",
            "title": "Research and shortlist venues",
            "description": "Find venues that match budget and guest capacity",
            "priority": "high",
            "completed": false
          }
        ]
      },
      {
        "category": "Catering",
        "items": [...]
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request data (400)
- `UNAUTHORIZED` - Missing or invalid authentication (401)
- `FORBIDDEN` - Insufficient permissions (403)
- `NOT_FOUND` - Resource not found (404)
- `INTERNAL_ERROR` - Server error (500)
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable (503)

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Guest count must be a positive number"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- Default: 100 requests per 15 minutes per IP
- Authenticated: 300 requests per 15 minutes per user

Rate limit headers are included in all responses:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Time when the limit resets

## CORS

CORS is configured to allow requests from:
- Development: All origins (`*`)
- Production: `event-flow.co.uk` and configured domains

## Versioning

This API is version 1.0.0. Future versions will be indicated in the URL path (e.g., `/v2/api/...`).

## Support

For API support and questions:
- GitHub Issues: https://github.com/rhysllwydlewis/JadeAssist/issues
- Event-flow integration: Contact through event-flow.co.uk
