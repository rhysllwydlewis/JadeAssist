# JadeAssist Database

This directory contains the database schema and migration files for JadeAssist.

## Schema Overview

### Tables

1. **users** - User accounts with flexible authentication
   - Supports multiple auth providers (JWT, Supabase, Event-flow)
   - Stores basic user profile information

2. **conversations** - Chat conversations
   - Links users to their conversation history
   - Tracks event type being discussed

3. **messages** - Individual chat messages
   - Stores user and assistant messages
   - Tracks token usage for LLM calls

4. **event_plans** - Event planning details
   - Comprehensive event information
   - Stores timeline and checklist as JSON
   - Links to conversations for context

5. **suppliers** - Curated supplier database
   - UK-focused supplier information
   - Searchable by category, location, and rating

## Setup

### PostgreSQL

```bash
# Create database
createdb jadeassist

# Run schema
psql jadeassist < schema.sql
```

### Supabase

1. Create a new Supabase project
2. Go to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Run the query

## Environment Variables

Update your `.env` file with database connection details:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/jadeassist
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Migrations

Future database changes should be added as numbered migration files:

- `001_initial_schema.sql` (current schema.sql)
- `002_add_feature.sql`
- etc.
