# JadeAssist Widget 💬

An embeddable, standalone chat widget for the JadeAssist event planning assistant. Easily integrate AI-powered event planning into any website with a single script tag.

## Features

- 🎨 **Beautiful UI** - Matches Hitched-style floating chat with smooth animations
- 💾 **Persistent State** - Conversations saved to localStorage across page navigation
- 🔌 **Easy Integration** - Single script tag, no dependencies
- 🎯 **Configurable** - Customize colors, text, avatar, and API endpoint
- 🔒 **Isolated Styles** - Uses Shadow DOM to prevent CSS conflicts
- ♿ **Accessible** - ARIA labels, keyboard navigation (ESC to close)
- 🚀 **Demo Mode** - Works out-of-the-box with mocked responses
- 📱 **Responsive** - Mobile-friendly design

## Quick Start

### 1. Build the Widget

```bash
cd packages/widget
npm install
npm run build
```

This creates `dist/jade-widget.js` - a single file containing everything needed.

### 2. Add to Your Website

```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
</head>
<body>
  <!-- Your content here -->

  <!-- Add widget script (before closing body tag) -->
  <script src="path/to/jade-widget.js"></script>
  
  <!-- Initialize -->
  <script>
    window.JadeWidget.init({
      assistantName: 'Jade',
      primaryColor: '#8B5CF6',
    });
  </script>
</body>
</html>
```

### 3. View the Demo

Open `example.html` in your browser to see the widget in action with demo mode.

## Configuration

The widget accepts the following configuration options:

```javascript
window.JadeWidget.init({
  // Backend API URL (optional - omit for demo mode with mocked responses)
  apiBaseUrl: 'https://api.yourdomain.com',
  
  // Assistant name shown in header (default: 'Jade')
  assistantName: 'Jade',
  
  // Initial greeting message (default: provided in types.ts)
  greetingText: 'Hi! 👋 Can I help you plan your event?',
  
  // Avatar image URL (default: emoji icon)
  avatarUrl: 'https://example.com/avatar.png',
  
  // Primary brand color (default: '#8B5CF6' - purple)
  primaryColor: '#8B5CF6',
});
```

### Configuration Examples

**Basic (Demo Mode):**
```javascript
window.JadeWidget.init();
```

**event-flow.co.uk Brand Match:**
```javascript
window.JadeWidget.init({
  apiBaseUrl: 'https://api.event-flow.co.uk',
  assistantName: 'Jade',
  primaryColor: '#8B5CF6',      // Match your brand color
  accentColor: '#6d28d9',       // Slightly darker shade
  fontFamily: '"Your Font", -apple-system, sans-serif',
  greetingText: '✨ Hi! I\'m Jade, your event planning assistant. Ready to plan something amazing?',
});
```

**Wedding Theme (Romantic):**
```javascript
window.JadeWidget.init({
  primaryColor: '#EC4899',      // Pink
  accentColor: '#BE185D',       // Deep pink
  greetingText: '💕 Hi there! I\'m Jade. Let\'s plan your dream wedding together!',
});
```

**Corporate Events Theme (Professional):**
```javascript
window.JadeWidget.init({
  primaryColor: '#3B82F6',      // Blue
  accentColor: '#1E40AF',       // Navy
  greetingText: 'Hello! I\'m Jade, your corporate event specialist. How can I assist you today?',
});
```

**Connected to Backend API:**
```javascript
window.JadeWidget.init({
  apiBaseUrl: 'https://api.jadeassist.com',
  assistantName: 'Jade',
  primaryColor: '#8B5CF6',
  accentColor: '#6d28d9',
});
```

## How It Works

### Demo Mode vs. API Mode

- **Demo Mode** (no `apiBaseUrl`): Widget uses intelligent mocked responses for demonstration
- **API Mode** (with `apiBaseUrl`): Widget connects to real backend at `POST /api/chat`

### State Persistence

The widget automatically saves to localStorage:
- **Conversation history** - All messages persist across page loads
- **Open/closed state** - Widget remembers if it was open
- **Conversation ID** - Maintains context with backend API

Users can continue their conversation seamlessly while browsing your site.

### UI/UX Flow

1. **Avatar Button** - Floating bottom-right with gentle float animation
2. **Greeting Tooltip** - Auto-appears after 1 second (dismissible)
3. **Chat Popup** - Opens on click, anchored bottom-right
4. **Quick Replies** - Chip buttons for common responses
5. **Message Input** - Text area with send button

### Accessibility

- Full keyboard navigation
- ESC key closes the popup
- ARIA labels on all interactive elements
- Focus management when opening/closing
- Semantic HTML structure

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

### Project Structure

```
packages/widget/
├── src/
│   ├── index.ts       # Entry point and global API
│   ├── widget.ts      # Main widget class
│   ├── types.ts       # TypeScript interfaces
│   ├── storage.ts     # localStorage manager
│   ├── api.ts         # API client with demo mode
│   └── styles.ts      # Widget CSS
├── dist/              # Build output
│   └── jade-widget.js # Production bundle
├── example.html       # Usage example
├── package.json
├── tsconfig.json
└── vite.config.ts     # Build configuration
```

### Building

The widget uses Vite to bundle into a single IIFE (Immediately Invoked Function Expression) file that:
- Exposes `window.JadeWidget` global API
- Includes all styles inline
- Has no external dependencies
- Works in all modern browsers

## Deployment

### For event-flow.co.uk

1. **Build the widget:**
   ```bash
   npm run build
   ```

2. **Upload to CDN or static hosting:**
   ```bash
   # Example: Upload dist/jade-widget.js to your CDN
   # The file is ~50KB minified + gzipped
   ```

3. **Add to website:**
   ```html
   <script src="https://cdn.yourdomain.com/jade-widget.js"></script>
   <script>
     window.JadeWidget.init({
       apiBaseUrl: 'https://api.jadeassist.com',
       primaryColor: '#8B5CF6',
     });
   </script>
   ```

### Hosting Options

- **CDN** (Recommended): CloudFlare, AWS CloudFront, Fastly
- **Static hosting**: Netlify, Vercel, GitHub Pages
- **Your server**: Any static file server (nginx, Apache)

Just ensure:
- File is publicly accessible
- Correct CORS headers if on different domain
- HTTPS for production

## Backend Setup

To connect the widget to the JadeAssist backend:

### 1. Deploy Backend API

See `packages/backend/README.md` for full backend setup. Quick overview:

```bash
# In packages/backend
npm install
npm run build

# Set environment variables
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="sk-..."
export JWT_SECRET="your-secret"

# Start server
npm start
```

### 2. Configure CORS

The backend must allow requests from your website domain:

```javascript
// In backend server configuration
app.use(cors({
  origin: ['https://event-flow.co.uk', 'https://www.event-flow.co.uk'],
  credentials: true,
}));
```

### 3. API Requirements

The widget expects the backend to provide:

**Endpoint:** `POST /api/chat`

**Request:**
```json
{
  "message": "User message text",
  "conversationId": "uuid-optional",
  "userId": "anonymous-or-real-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "message": {
      "id": "uuid",
      "content": "Assistant response",
      "role": "assistant",
      "createdAt": "2024-01-01T12:00:00Z"
    },
    "suggestions": ["Quick reply 1", "Quick reply 2"]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 4. Authentication (Future)

Currently uses anonymous user ID. For production:
- Implement proper authentication
- Pass JWT tokens in request headers
- Update widget to handle auth state

## Customization

### Styling

The widget uses Shadow DOM for style isolation. To customize:

1. Edit `src/styles.ts` - modify CSS variables and styles
2. Use configuration options for colors and branding
3. Rebuild the widget

### Behavior

Edit `src/widget.ts` to customize:
- Message rendering
- Timing (greeting delay, animations)
- State management
- Event handling

### API Integration

Edit `src/api.ts` to:
- Modify request/response format
- Add authentication headers
- Change demo mode responses
- Handle errors differently

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Opera 74+

Requirements:
- ES2020 features
- Shadow DOM support
- localStorage
- Fetch API

## Troubleshooting

### Widget doesn't appear

1. Check browser console for errors
2. Verify script is loaded: `console.log(window.JadeWidget)`
3. Ensure `init()` is called after script loads

### Styles conflict with site

The widget uses Shadow DOM specifically to prevent this. If conflicts occur:
1. Ensure widget script is loaded correctly
2. Check browser support for Shadow DOM
3. Verify no global CSS overrides with `!important`

### API connection fails

1. Check `apiBaseUrl` is correct
2. Verify CORS is configured on backend
3. Check network tab for failed requests
4. Widget falls back to demo mode on error

### localStorage not persisting

1. Check browser allows localStorage (not in private mode)
2. Verify localStorage quota not exceeded
3. Check console for storage errors

## Future Enhancements

Potential improvements for future versions:

- [ ] WebSocket support for real-time updates
- [ ] File upload capability
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Theme customization UI
- [ ] Analytics integration
- [ ] A/B testing support
- [ ] Custom event triggers

## License

MIT License - see root LICENSE file

## Support

- Issues: [GitHub Issues](https://github.com/rhysllwydlewis/JadeAssist/issues)
- Docs: See main repo README.md
- Integration help: Contact through event-flow.co.uk

---

Made with ❤️ for better event planning
