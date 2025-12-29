# JadeAssist 🎉

> AI-powered event planning assistant that helps users plan and manage events through conversational AI.

## Overview

JadeAssist is a production-ready monorepo containing a Node.js backend API that provides intelligent event planning assistance. It integrates with LLM services to deliver personalized planning advice, budget calculations, supplier recommendations, and comprehensive event management tools.

## Features

- 🤖 **Conversational AI** - Natural language event planning assistance
- 💰 **Budget Management** - Intelligent budget allocation and tracking
- 📋 **Planning Tools** - Automated timelines and checklists
- 🏢 **Supplier Database** - Curated UK supplier recommendations
- 🔐 **Flexible Authentication** - JWT, Supabase, or Event-flow integration
- 📊 **Event Analytics** - Cost calculations and per-guest breakdowns
- 🌍 **Location-based** - UK region and postcode-aware recommendations

## Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL / Supabase
- **LLM**: OpenAI (swappable architecture)
- **Validation**: Zod
- **Logging**: Pino
- **Auth**: JWT / Supabase

### Development

- **Language**: TypeScript (strict mode)
- **Package Manager**: npm workspaces
- **Linting**: ESLint
- **Formatting**: Prettier

## Project Structure

```
JadeAssist/
├── packages/
│   ├── backend/          # Express API server
│   │   ├── src/
│   │   │   ├── config/   # Environment and database config
│   │   │   ├── routes/   # API routes
│   │   │   ├── services/ # Business logic
│   │   │   ├── models/   # Database models
│   │   │   ├── middleware/ # Express middleware
│   │   │   └── utils/    # Utilities
│   │   └── package.json
│   │
│   └── shared/           # Shared TypeScript types
│       ├── src/
│       │   ├── types/    # Type definitions
│       │   └── constants/ # Shared constants
│       └── package.json
│
├── database/             # Database schema and migrations
├── .env.example          # Environment template
└── package.json          # Monorepo root

```

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ or Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/rhysllwydlewis/JadeAssist.git
   cd JadeAssist
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**

   ```bash
   # For PostgreSQL
   createdb jadeassist
   psql jadeassist < database/schema.sql

   # For Supabase - paste schema.sql into SQL Editor
   ```

5. **Build the packages**

   ```bash
   npm run build
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

### Verify Installation

Check the health endpoint:

```bash
curl http://localhost:3001/health
```

## API Endpoints

### Health Check

- `GET /health` - System health status

### Chat

- `POST /api/chat` - Send a message in a conversation
- `GET /api/chat/conversations` - Get user's conversations
- `GET /api/chat/conversations/:id` - Get specific conversation with messages

### Planning

- `POST /api/planning/plans` - Create a new event plan
- `GET /api/planning/plans` - Get user's event plans
- `GET /api/planning/plans/:id` - Get specific event plan
- `PATCH /api/planning/plans/:id` - Update an event plan
- `POST /api/planning/plans/:id/timeline` - Generate timeline
- `POST /api/planning/plans/:id/checklist` - Generate checklist

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start backend in dev mode
npm run build            # Build all packages
npm run typecheck        # Run TypeScript compiler

# Quality
npm run lint             # Lint all packages
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Cleaning
npm run clean            # Clean all build artifacts
```

### Workspace Commands

```bash
# Build specific package
npm run build:shared
npm run build:backend

# Work in specific workspace
npm run dev --workspace=packages/backend
```

## Configuration

### Environment Variables

See `.env.example` for all configuration options. Key variables:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jadeassist

# LLM
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo

# Auth
JWT_SECRET=your-secret-key
```

### Database Setup

The database schema supports PostgreSQL and Supabase. Key features:

- UUID primary keys
- Automatic timestamp triggers
- JSONB for flexible data storage
- Indexed for performance
- Sample supplier data included

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation, including:

- System design and data flow
- Integration with event-flow.co.uk
- LLM abstraction layer
- Scalability considerations

## Integration

### Event-flow.co.uk

JadeAssist is designed to integrate with event-flow.co.uk:

- **Authentication**: Can use event-flow auth provider
- **Escalation**: Complex requests can be escalated to human planners
- **Widget**: Embeddable chat widget (Phase 2)
- **Billing**: Shared billing integration (Phase 2)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write meaningful commit messages
- Add tests for new features

## Roadmap

- [x] Phase 1: Core backend API and types
- [ ] Phase 2: Frontend widget and UI
- [ ] Phase 3: Supplier management portal
- [ ] Phase 4: Advanced analytics and reporting
- [ ] Phase 5: Mobile applications

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- GitHub Issues: [Create an issue](https://github.com/rhysllwydlewis/JadeAssist/issues)
- Event-flow integration: Contact through event-flow.co.uk

## Acknowledgments

- OpenAI for LLM capabilities
- Supabase for database hosting
- Event-flow.co.uk for domain expertise

---

Made with ❤️ for better event planning
