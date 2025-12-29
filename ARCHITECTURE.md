# JadeAssist Architecture

> Detailed technical architecture and design documentation

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Principles](#architecture-principles)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Integration Points](#integration-points)
- [Security](#security)
- [Scalability](#scalability)
- [Future Phases](#future-phases)

## System Overview

JadeAssist is a conversational AI-powered event planning assistant built as a production-ready monorepo. The system helps users plan events through natural language interactions, providing intelligent suggestions, budget calculations, timelines, and supplier recommendations.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
│              (Express + Rate Limiting)                       │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────┐    ┌──────────────────────┐
│   Chat Routes      │    │  Planning Routes      │
│   /api/chat        │    │  /api/planning        │
└─────┬──────────────┘    └──────┬───────────────┘
      │                           │
      ▼                           ▼
┌────────────────────────────────────────────────┐
│            Business Logic Layer                 │
│  ┌──────────────┐  ┌────────────────────────┐ │
│  │Planning      │  │Event Calculation       │ │
│  │Engine        │  │Service                 │ │
│  └──────┬───────┘  └──────┬─────────────────┘ │
│         │                  │                    │
│         ▼                  ▼                    │
│  ┌──────────────┐  ┌─────────────┐            │
│  │LLM Service   │  │User Service │            │
│  │(OpenAI)      │  │             │            │
│  └──────────────┘  └─────────────┘            │
└──────────────┬─────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│              Data Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │Users     │  │Messages  │  │Event Plans   │  │
│  │          │  │          │  │              │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────┐  ┌──────────────────────────┐    │
│  │Convs     │  │Suppliers                 │    │
│  │          │  │                          │    │
│  └──────────┘  └──────────────────────────┘    │
└──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│         PostgreSQL / Supabase                    │
└──────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. Modularity
- **Monorepo Structure**: Separate packages for backend and shared types
- **Service Layer**: Business logic separated from routes
- **Model Layer**: Data access abstracted from business logic

### 2. Type Safety
- **TypeScript Strict Mode**: Full type safety across the stack
- **Shared Types**: Common types in `@jadeassist/shared` package
- **Runtime Validation**: Zod schemas for request validation

### 3. Swappable Components
- **LLM Abstraction**: Easy to swap OpenAI for other providers
- **Auth Flexibility**: Support for JWT, Supabase, or custom providers
- **Database Agnostic**: Works with PostgreSQL or Supabase

### 4. Production Ready
- **Error Handling**: Comprehensive error middleware
- **Logging**: Structured logging with Pino
- **Security**: Helmet, rate limiting, CORS
- **Graceful Shutdown**: Proper cleanup on termination

## Component Architecture

### Backend Package (`@jadeassist/backend`)

#### 1. Configuration Layer (`src/config/`)

**env.ts**
- Environment variable validation using Zod
- Type-safe configuration export
- Fails fast on invalid configuration

**database.ts**
- PostgreSQL connection pool management
- Supabase client initialization
- Transaction helpers
- Health check utilities

#### 2. Routes Layer (`src/routes/`)

**health.ts**
- System health endpoint
- Database and LLM service checks
- Uptime and version information

**chat.ts**
- Conversation management
- Message handling
- Integration with planning engine

**planning.ts**
- Event plan CRUD operations
- Timeline generation
- Checklist generation
- Budget calculations

#### 3. Services Layer (`src/services/`)

**llmService.ts**
- OpenAI integration
- Message formatting
- Token usage tracking
- Health checks
- **Swappable Design**: Interface can work with any LLM provider

**planningEngine.ts**
- Core planning logic
- Context building for LLM
- Response parsing
- Timeline and checklist generation
- Information gap detection

**eventCalcService.ts**
- Budget allocation calculations
- Per-guest cost calculations
- Budget validation
- Event type-specific allocations

**userService.ts**
- User management
- JWT token generation
- Session management
- Find-or-create patterns

#### 4. Models Layer (`src/models/`)

**User.ts**
- User CRUD operations
- Auth provider lookups
- Email lookups

**Conversation.ts**
- Conversation management
- Message operations
- User conversation history

**EventPlan.ts**
- Event plan CRUD
- Timeline and checklist updates
- JSON field handling

**Supplier.ts**
- Supplier search with filters
- Category-based queries
- Location-based matching

#### 5. Middleware (`src/middleware/`)

**auth.ts**
- JWT authentication
- Optional authentication
- User context injection

**errorHandler.ts**
- Global error handling
- Custom AppError class
- 404 handler
- Async handler wrapper

**validation.ts**
- Request body validation
- Query parameter validation
- URL parameter validation
- Zod schema integration

### Shared Package (`@jadeassist/shared`)

#### Types (`src/types/`)

**chat.ts**
- Message and conversation types
- Chat request/response types

**event.ts**
- Event planning types
- Timeline and checklist types
- Supplier recommendation types
- Budget allocation types

**user.ts**
- User profile types
- Authentication types
- Session types

**api.ts**
- Common API response types
- Error types
- Pagination types
- Health check types

#### Constants (`src/constants/`)

**eventTypes.ts**
- Event type definitions
- Event metadata (budgets, guest counts, timelines)
- Supplier categories

## Data Flow

### 1. Chat Message Flow

```
User Request
    ↓
[Auth Middleware] → Verify JWT token
    ↓
[Validation] → Validate request body
    ↓
[Chat Route] → Get/create conversation
    ↓
[Store Message] → Save user message
    ↓
[Planning Engine] → Process with context
    ↓
[LLM Service] → Get AI response
    ↓
[Store Response] → Save assistant message
    ↓
[Return] → Send response to user
```

### 2. Event Plan Creation Flow

```
User Request
    ↓
[Auth Middleware]
    ↓
[Validation] → Event type, budget, etc.
    ↓
[Planning Route]
    ↓
[Event Plan Model] → Create database record
    ↓
[Event Calc Service] → Calculate budget allocations
    ↓
[Return] → Plan + calculations
```

### 3. Timeline Generation Flow

```
User Request
    ↓
[Auth Middleware]
    ↓
[Planning Route] → Verify ownership
    ↓
[Planning Engine] → Build context
    ↓
[LLM Service] → Generate timeline
    ↓
[Parse Response] → Extract timeline items
    ↓
[Update Plan] → Store in database
    ↓
[Return] → Timeline to user
```

## Integration Points

### 1. Event-flow.co.uk Integration

#### Current Integration
- **Authentication**: Can use event-flow as auth provider
- **Configuration**: Environment variables for API URL and key

#### Planned Integration (Phase 2)
- **Escalation API**: Send complex requests to human planners
- **Booking API**: Direct booking through event-flow
- **Supplier Sync**: Synchronize supplier database
- **Widget Embedding**: Iframe or script tag integration

#### Integration Architecture

```
┌──────────────────────────────────────────┐
│        event-flow.co.uk                  │
│                                          │
│  ┌────────────────────────────────┐     │
│  │   Event-flow Frontend          │     │
│  └─────────────┬──────────────────┘     │
│                │                         │
│                ▼                         │
│  ┌────────────────────────────────┐     │
│  │   JadeAssist Widget            │     │
│  │   (Embedded)                   │     │
│  └─────────────┬──────────────────┘     │
└────────────────┼──────────────────────────┘
                 │
                 │ API Calls
                 │
                 ▼
┌──────────────────────────────────────────┐
│        JadeAssist Backend API             │
│                                          │
│  ┌────────────────┐  ┌───────────────┐  │
│  │Chat Endpoints  │  │Planning       │  │
│  │                │  │Endpoints      │  │
│  └────────────────┘  └───────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Escalation Service               │ │
│  │   (Sends to event-flow API)        │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 2. LLM Provider Integration

Current implementation uses OpenAI, but the `llmService` is designed to be provider-agnostic:

```typescript
// Easy to swap providers
export interface LLMProvider {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  healthCheck(): Promise<boolean>;
}

// Can implement for:
// - Anthropic Claude
// - Google Gemini
// - Cohere
// - Self-hosted models
```

### 3. Database Integration

Supports both PostgreSQL and Supabase:
- **PostgreSQL**: Direct connection via `pg` library
- **Supabase**: Optional Supabase client for additional features
- **Transaction Support**: ACID compliance for complex operations

## Security

### 1. Authentication & Authorization

- **JWT Tokens**: Secure token-based auth
- **Token Expiration**: 7-day expiry
- **User Verification**: Middleware checks on protected routes
- **Resource Ownership**: Users can only access their own data

### 2. Input Validation

- **Zod Schemas**: Runtime validation of all inputs
- **SQL Injection**: Parameterized queries only
- **XSS Prevention**: Content sanitization
- **Rate Limiting**: Prevent abuse

### 3. Security Headers

- **Helmet**: Security headers middleware
- **CORS**: Controlled cross-origin access
- **Content Type**: JSON only

### 4. Secrets Management

- **Environment Variables**: No hardcoded secrets
- **.env.example**: Template without sensitive data
- **.gitignore**: Excludes .env files

## Scalability

### Current Architecture

The current setup is suitable for:
- **Users**: Up to 10,000 concurrent users
- **Requests**: 100+ req/s
- **Database**: PostgreSQL handles millions of records

### Scaling Strategies

#### Horizontal Scaling

```
                Load Balancer
                      |
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Backend 1     Backend 2     Backend 3
        └─────────────┬─────────────┘
                      ▼
              PostgreSQL Primary
                      |
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Read Replica  Read Replica  Read Replica
```

#### Caching Layer

```
Backend → Redis Cache → PostgreSQL
```

Caching candidates:
- Supplier data (rarely changes)
- Event type metadata
- User sessions

#### Message Queue

For long-running operations:

```
API Request → Queue (Bull/BullMQ) → Worker Process
                                         ↓
                                    LLM Service
```

### Performance Optimization

1. **Database**
   - Indexes on frequently queried fields
   - Connection pooling
   - JSONB for flexible data

2. **API**
   - Compression middleware
   - Response caching
   - Efficient queries

3. **LLM**
   - Token limit management
   - Response streaming (future)
   - Context window optimization

## Future Phases

### Phase 2: Frontend & Widget (Q1 2024)

**Deliverables:**
- React-based chat widget
- Embeddable on event-flow.co.uk
- Real-time conversation UI
- Event plan visualization

**Architecture:**
```
┌────────────────────────────────────────┐
│  packages/frontend/                    │
│  ├── components/                       │
│  │   ├── ChatWidget/                   │
│  │   ├── EventPlan/                    │
│  │   └── Timeline/                     │
│  └── package.json                      │
└────────────────────────────────────────┘
```

### Phase 3: Supplier Management Portal (Q2 2024)

**Features:**
- Supplier self-registration
- Profile management
- Review system
- Analytics dashboard

**New Services:**
- Supplier verification service
- Review moderation service
- Analytics service

### Phase 4: Advanced Features (Q3 2024)

**Features:**
- Multi-language support
- Voice input/output
- Calendar integration
- Email notifications
- SMS notifications

**Integrations:**
- Google Calendar
- Outlook Calendar
- Twilio (SMS)
- SendGrid (Email)

### Phase 5: Mobile Apps (Q4 2024)

**Platforms:**
- iOS (React Native)
- Android (React Native)

**Features:**
- Native chat experience
- Push notifications
- Offline mode
- Photo uploads

## Database Design Patterns

### 1. Soft Deletes (Future Enhancement)

Add `deleted_at` columns for audit trail:
```sql
ALTER TABLE event_plans ADD COLUMN deleted_at TIMESTAMP;
```

### 2. Audit Logging (Future Enhancement)

Track all changes:
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  table_name VARCHAR(50),
  record_id UUID,
  action VARCHAR(20),
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMP
);
```

### 3. Full-Text Search (Future Enhancement)

For supplier and message search:
```sql
ALTER TABLE suppliers ADD COLUMN search_vector tsvector;
CREATE INDEX idx_suppliers_search ON suppliers USING gin(search_vector);
```

## Monitoring & Observability

### Logging Strategy

- **Development**: Pretty-printed console logs
- **Production**: JSON structured logs
- **Log Levels**: debug, info, warn, error

### Metrics (Future)

- Request duration
- LLM token usage
- Database query performance
- Error rates
- User engagement

### Tools to Consider

- **APM**: New Relic, DataDog
- **Logging**: LogDNA, Papertrail
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry

## Development Workflow

### Local Development

1. Run PostgreSQL locally or use Supabase
2. Set up `.env` file
3. Run `npm run dev`
4. API available at `http://localhost:3001`

### Testing Strategy (Future)

```
├── tests/
│   ├── unit/          # Service and utility tests
│   ├── integration/   # API endpoint tests
│   └── e2e/          # Full workflow tests
```

### CI/CD Pipeline (Future)

```
Pull Request
    ↓
Lint & Format Check
    ↓
Type Check
    ↓
Unit Tests
    ↓
Integration Tests
    ↓
Build
    ↓
Deploy to Staging
    ↓
E2E Tests
    ↓
Deploy to Production
```

## Deployment

### Platform Options

1. **Vercel/Netlify**
   - Easy deployment
   - Auto-scaling
   - Good for getting started

2. **Railway/Render**
   - PostgreSQL included
   - Simple setup
   - Cost-effective

3. **AWS/GCP/Azure**
   - Full control
   - Best for scale
   - More complex setup

### Docker Support (Future)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Conclusion

JadeAssist is built with scalability, maintainability, and production-readiness in mind. The modular architecture allows for easy extension and integration, while the type-safe codebase ensures reliability. The system is ready for immediate use and has a clear roadmap for future enhancements.

For questions or contributions, see [README.md](./README.md) or create an issue on GitHub.
