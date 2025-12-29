# JadeAssist Deployment Guide

This guide covers deploying the JadeAssist backend API to various platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Render Deployment](#render-deployment-recommended)
- [Railway Deployment](#railway-deployment)
- [Fly.io Deployment](#flyio-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ database (local or hosted)
- OpenAI API key
- Git installed

## Local Development

### 1. Clone and Install

```bash
git clone https://github.com/rhysllwydlewis/JadeAssist.git
cd JadeAssist
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - Your OpenAI API key
- `JWT_SECRET` - Secret key for JWT tokens

### 3. Set Up Database

```bash
# Create database
createdb jadeassist

# Run migrations
psql jadeassist < database/schema.sql
```

### 4. Build and Run

```bash
# Build packages
npm run build

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

### 5. Verify Installation

```bash
curl http://localhost:3001/health
```

## Docker Deployment

### Using Docker Compose (Recommended for Local/Testing)

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

This starts:
- PostgreSQL database on port 5432
- JadeAssist API on port 3001

### Using Dockerfile Only

```bash
# Build image
docker build -t jadeassist-api .

# Run container
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e OPENAI_API_KEY=sk-... \
  -e JWT_SECRET=your-secret \
  --name jadeassist-api \
  jadeassist-api
```

## Render Deployment (Recommended)

Render provides automatic deployments and managed PostgreSQL.

### 1. Create Render Account

Sign up at [render.com](https://render.com)

### 2. Create PostgreSQL Database

1. Go to Dashboard → New → PostgreSQL
2. Name: `jadeassist-db`
3. Database: `jadeassist`
4. User: `jadeassist`
5. Region: Choose closest to your users
6. Plan: Free (for testing) or Starter ($7/mo)
7. Create Database

Save the **Internal Database URL** from the database page.

### 3. Initialize Database

1. Connect to your database using the provided connection string
2. Run the schema:

```bash
psql <your-internal-database-url> < database/schema.sql
```

Or use Render's Web Shell to paste the schema.sql contents.

### 4. Create Web Service

1. Go to Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `jadeassist-api`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (for testing) or Starter ($7/mo)

### 5. Add Environment Variables

In the web service settings, add:

```
PORT=3001
NODE_ENV=production
API_URL=https://jadeassist-api.onrender.com

DATABASE_URL=<your-internal-database-url>

OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo
LLM_TOKEN_LIMIT=4000

JWT_SECRET=<generate-random-secret>
AUTH_PROVIDER=jwt

LOG_LEVEL=info
```

### 6. Deploy

Click "Create Web Service". Render will:
1. Build your application
2. Deploy to their infrastructure
3. Provide a URL like `https://jadeassist-api.onrender.com`

### 7. Verify Deployment

```bash
curl https://jadeassist-api.onrender.com/health
```

### Auto-Deploy

Render automatically deploys when you push to main branch.

## Railway Deployment

Railway offers one-click PostgreSQL and simple deployments.

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 2. Create New Project

```bash
railway init
railway link
```

### 3. Add PostgreSQL

```bash
railway add postgresql
```

This automatically sets `DATABASE_URL` environment variable.

### 4. Set Environment Variables

```bash
railway variables set OPENAI_API_KEY=sk-...
railway variables set JWT_SECRET=your-random-secret
railway variables set NODE_ENV=production
railway variables set LLM_MODEL=gpt-4-turbo
```

### 5. Deploy

```bash
railway up
```

### 6. Get URL

```bash
railway domain
```

Railway will provide a URL like `https://jadeassist-production.up.railway.app`

## Fly.io Deployment

Fly.io runs Docker containers globally.

### 1. Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
```

### 2. Launch Application

```bash
flyctl launch --name jadeassist-api
```

This creates a `fly.toml` configuration file.

### 3. Create PostgreSQL

```bash
flyctl postgres create --name jadeassist-db
flyctl postgres attach jadeassist-db
```

### 4. Set Secrets

```bash
flyctl secrets set OPENAI_API_KEY=sk-...
flyctl secrets set JWT_SECRET=your-random-secret
flyctl secrets set NODE_ENV=production
```

### 5. Deploy

```bash
flyctl deploy
```

### 6. Initialize Database

```bash
flyctl postgres connect -a jadeassist-db
# Then paste contents of database/schema.sql
```

## Vercel Deployment

Vercel is great for serverless deployments.

### 1. Install Vercel CLI

```bash
npm i -g vercel
vercel login
```

### 2. Create vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "packages/backend/dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "packages/backend/dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Deploy

```bash
npm run build
vercel --prod
```

### 4. Set Environment Variables

In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Add all required variables
3. Redeploy

## Environment Variables

### Required Variables

```env
# Server
PORT=3001
NODE_ENV=production
API_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# LLM
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo
LLM_TOKEN_LIMIT=4000

# Auth
JWT_SECRET=your-secret-key
AUTH_PROVIDER=jwt
```

### Optional Variables

```env
# Supabase (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Event-flow integration
EVENTFLOW_API_URL=https://event-flow.co.uk/api
EVENTFLOW_API_KEY=optional-key

# Logging
LOG_LEVEL=info
```

### Generating JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Setup

### PostgreSQL (Self-hosted)

```bash
# Create database
createdb jadeassist

# Create user
createuser jadeassist -P

# Grant permissions
psql -c "GRANT ALL PRIVILEGES ON DATABASE jadeassist TO jadeassist;"

# Run schema
psql jadeassist < database/schema.sql
```

### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Paste contents of `database/schema.sql`
4. Execute
5. Use provided connection string

### Connection String Format

```
postgresql://username:password@host:port/database?sslmode=require
```

## Post-Deployment

### 1. Health Check

```bash
curl https://your-api-url.com/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "database": "up",
      "llm": "up"
    }
  }
}
```

### 2. Test API Endpoints

```bash
# Get JWT token (implement your auth flow)
TOKEN=your-jwt-token

# Test chat endpoint
curl -X POST https://your-api-url.com/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "userId": "user-uuid"
  }'
```

### 3. Monitor Logs

**Render:**
```bash
# View logs in dashboard or via curl
curl https://api.render.com/v1/services/srv-xxx/logs
```

**Railway:**
```bash
railway logs
```

**Fly.io:**
```bash
flyctl logs
```

### 4. Set Up CORS

Update `src/index.ts` to allow your frontend domain:

```typescript
app.use(
  cors({
    origin: ['https://event-flow.co.uk', 'https://your-frontend.com'],
    credentials: true,
  })
);
```

### 5. Configure Custom Domain (Optional)

**Render:** Settings → Custom Domains  
**Railway:** Settings → Domains  
**Fly.io:** `flyctl certs add your-domain.com`  
**Vercel:** Settings → Domains

### 6. Enable HTTPS

All platforms provide HTTPS automatically. Ensure your frontend uses `https://` in API calls.

## Integration with event-flow.co.uk

After deployment, provide the following to Event-flow:

### API Base URL
```
https://jadeassist-api.onrender.com
```

### CORS Configuration
Add `event-flow.co.uk` to allowed origins in production.

### Authentication
Configure Event-flow's JWT secret in your environment variables to validate tokens.

### Webhook Endpoints (Future)
For escalation notifications and billing integration.

## Monitoring and Maintenance

### Health Checks

Set up monitoring to ping `/health` every 5 minutes:
- UptimeRobot (free)
- Pingdom
- StatusCake

### Log Aggregation

Consider using:
- Papertrail (Render/Railway integration)
- LogDNA
- Datadog

### Error Tracking

Optional Sentry integration for error monitoring:

```bash
npm install @sentry/node
```

### Database Backups

**Render:** Automatic daily backups on paid plans  
**Railway:** Automatic backups  
**Supabase:** Automatic backups on all plans

## Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build
```

### Database Connection Issues

- Verify connection string format
- Check SSL mode (`?sslmode=require`)
- Ensure database allows external connections
- Check firewall rules

### LLM Errors

- Verify OpenAI API key is valid
- Check API quota/billing
- Monitor rate limits

### Memory Issues

If you experience out-of-memory errors:
- Increase container memory (Render: upgrade plan)
- Optimize queries
- Implement connection pooling

## Scaling

### Horizontal Scaling

**Render:** Increase instance count in settings  
**Railway:** Add more instances  
**Fly.io:** `flyctl scale count 3`

### Database Scaling

- Enable connection pooling (pgBouncer)
- Add read replicas
- Upgrade database plan

### Caching

Consider adding Redis for:
- LLM response caching
- Session storage
- Rate limiting

## Security Checklist

- [ ] Environment variables secured
- [ ] JWT secret is strong and random
- [ ] Database has strong password
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured (Helmet)
- [ ] Regular dependency updates
- [ ] Database backups enabled

## Support

For deployment issues:
- GitHub Issues: https://github.com/rhysllwydlewis/JadeAssist/issues
- Platform documentation:
  - [Render Docs](https://render.com/docs)
  - [Railway Docs](https://docs.railway.app)
  - [Fly.io Docs](https://fly.io/docs)
  - [Vercel Docs](https://vercel.com/docs)
