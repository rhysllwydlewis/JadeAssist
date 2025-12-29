# EventFlow Integration Guide

This guide explains how JADE integrates with the event-flow.co.uk platform.

## Overview

JADE is designed to work seamlessly with EventFlow, providing:
- **Supplier Integration** - Access to EventFlow's supplier database
- **Messaging System** - Direct messaging with suppliers via EventFlow
- **Analytics Tracking** - Usage metrics and conversion tracking
- **Escalation Flow** - Upgrade path to human planners

## Features

### 1. Supplier Integration

JADE can fetch real suppliers from EventFlow's database and combine them with its own local supplier data.

**Configuration:**
```env
EVENTFLOW_API_URL=https://event-flow.co.uk/api
EVENTFLOW_API_KEY=your-api-key
```

**How it works:**
1. User requests suppliers via `/api/planning/suggest-suppliers`
2. JADE queries local database + EventFlow API
3. Results are combined and sorted by rating
4. Suppliers from EventFlow include a `messagingUrl` field

### 2. Supplier Messaging

When users want to contact a supplier, JADE redirects them to EventFlow's messaging system.

**Endpoint:**
```
POST /api/suppliers/:id/message
```

**Response:**
```json
{
  "messagingUrl": "https://event-flow.co.uk/api/messages/new?supplier=...&user=...&eventType=wedding"
}
```

The URL includes:
- `supplier` - Supplier ID
- `user` - User ID
- `eventType` - Type of event being planned
- `initialMessage` - Optional pre-filled message

### 3. Analytics Integration

JADE tracks events and sends them to EventFlow for centralized analytics.

**Tracked Events:**
- `conversation_started` - New chat initiated
- `plan_created` - Event plan created
- `escalation_offered` - User shown upgrade option
- `escalation_accepted` - User accepted upgrade
- `supplier_viewed` - Supplier profile viewed
- `supplier_contacted` - Supplier messaging initiated

**Data Flow:**
```
User Action → JADE Analytics Service → Local DB + EventFlow API
```

### 4. Escalation to Human Planners

JADE detects when users need human assistance and offers escalation to EventFlow's planning team.

**Detection Triggers:**
- User explicitly requests human help
- User shows signs of overwhelm
- High complexity event (200+ guests, £50k+ budget)
- Long conversations (20+ messages)

**Flow:**
1. JADE detects escalation signal
2. Shows soft offer: "Would you like professional planner help?"
3. Tracks `escalation_offered` event
4. If accepted, tracks `escalation_accepted`
5. User is connected to EventFlow booking system

## API Integration Points

### EventFlow → JADE

#### Get Suppliers
```
GET /api/suppliers?category=catering&postcode=SW1&minRating=4
```

**Response:**
```json
{
  "suppliers": [
    {
      "id": "supplier-id",
      "eventFlowId": "eventflow-internal-id",
      "name": "Premium Catering",
      "category": "catering",
      "rating": 4.8,
      "price": "£££",
      "distance": 5.2,
      "description": "Professional catering services",
      "contact": "info@example.com"
    }
  ]
}
```

### JADE → EventFlow

#### Track Analytics Event
```
POST /api/analytics/events
Authorization: Bearer <API_KEY>

{
  "event": "plan_created",
  "properties": {
    "userId": "user-uuid",
    "planId": "plan-uuid",
    "eventType": "wedding",
    "budget": 15000,
    "guestCount": 100
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Setup Instructions

### 1. Enable Integration

Set environment variables:
```bash
EVENTFLOW_API_URL=https://event-flow.co.uk/api
EVENTFLOW_API_KEY=your-api-key
```

### 2. Test Connection

```bash
curl http://localhost:3001/api/suppliers/suggest \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "wedding",
    "category": "venue",
    "postcode": "SW1A",
    "budget": 10000,
    "guestCount": 100
  }'
```

If EventFlow integration is working, you'll see suppliers with `eventFlowId` fields.

### 3. Configure CORS

Ensure EventFlow domain is allowed:
```typescript
app.use(cors({
  origin: ['https://event-flow.co.uk', 'https://www.event-flow.co.uk'],
  credentials: true
}));
```

### 4. Set Up Webhooks (Optional)

For real-time updates, EventFlow can send webhooks to JADE:

```
POST /api/webhooks/eventflow
Authorization: Bearer <WEBHOOK_SECRET>

{
  "event": "supplier_updated",
  "data": {
    "supplierId": "supplier-uuid",
    "changes": {...}
  }
}
```

## Testing Without EventFlow

If EventFlow API is not configured, JADE falls back to:
- Local supplier database only
- Mock data for missing suppliers
- Local analytics storage only

No errors will occur - the integration gracefully degrades.

## Monitoring

### Check Integration Status

```bash
curl http://localhost:3001/health
```

Response includes EventFlow status if configured.

### View Analytics

```bash
curl http://localhost:3001/api/analytics/metrics \
  -H "Authorization: Bearer <jwt>"
```

Shows:
- Conversations started
- Plans created
- Upgrade requests (escalations)
- Conversion rate
- Popular event types

## Security

### API Key Management

- Never commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Use different keys for dev/staging/production

### Authentication

JADE supports EventFlow's JWT tokens:
```env
AUTH_PROVIDER=eventflow
```

This allows shared authentication between platforms.

### Data Privacy

- User data is never shared without consent
- Analytics are aggregated and anonymized
- Supplier contact only happens through EventFlow's messaging system

## Troubleshooting

### Suppliers Not Loading

**Symptom:** No EventFlow suppliers in results

**Check:**
1. Is `EVENTFLOW_API_KEY` set?
2. Is API key valid?
3. Check logs for API errors
4. Test EventFlow API directly

### Analytics Not Tracking

**Symptom:** Events not appearing in EventFlow

**Check:**
1. Is `EVENTFLOW_API_URL` correct?
2. Is API key valid?
3. Check network connectivity
4. Review JADE logs for errors

### Messaging URLs Not Working

**Symptom:** Users can't contact suppliers

**Check:**
1. Is supplier ID correct?
2. Does supplier have `eventFlowId`?
3. Is EventFlow messaging system accessible?
4. Check CORS configuration

## Future Enhancements

### Phase 5: Stripe Billing

Integration for paid upgrades:
- User requests human planner
- JADE shows pricing
- Payment via Stripe
- EventFlow notified of purchase
- Planner assigned to booking

### Phase 6: Real-time Sync

- WebSocket connection to EventFlow
- Live supplier availability
- Real-time messaging notifications
- Instant plan updates

### Phase 7: Advanced Analytics

- A/B testing for prompts
- Conversion funnel analysis
- User journey mapping
- ROI tracking per supplier

## Support

For integration questions:
- Technical: GitHub Issues
- Business: Event-flow.co.uk
- Security: security@event-flow.co.uk

## License

This integration follows the same license as JADE (MIT).
