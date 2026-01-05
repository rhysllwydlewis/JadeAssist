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
  
  // Greeting tooltip text (default: '👋 Hi! Need help planning your event?')
  greetingTooltipText: '👋 Hi! Need help planning your event?',
  
  // Avatar image URL (default: cartoon woman avatar via CDN)
  avatarUrl: 'https://example.com/avatar.png',
  
  // Primary brand color (default: '#0B8073' - teal)
  primaryColor: '#0B8073',
  
  // Accent color (default: '#13B6A2' - lighter teal)
  accentColor: '#13B6A2',
  
  // Font family (default: system fonts)
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  
  // Desktop positioning
  offsetBottom: '80px',        // Distance from bottom (default: '80px')
  offsetRight: '24px',         // Distance from right (default: '24px')
  offsetLeft: '',              // Distance from left (default: '', use offsetRight)
  
  // Mobile positioning (optional - defaults to desktop values with adjustments)
  offsetBottomMobile: '80px',  // Mobile bottom offset (default: uses offsetBottom)
  offsetRightMobile: '16px',   // Mobile right offset (default: '16px' if offsetRight='24px')
  offsetLeftMobile: '16px',    // Mobile left offset (default: '16px' if offsetLeft='24px')
  
  // Scale the entire widget (default: 1)
  // Example: 0.85 makes widget 15% smaller, 1.2 makes it 20% larger
  scale: 0.85,
  
  // Show delay in milliseconds (default: 1000)
  showDelayMs: 1000,
  
  // Debug mode - enables detailed logging (default: false)
  debug: false,
});
```

### Positioning with CSS Custom Properties

The widget now exposes CSS custom properties that can be overridden for advanced positioning control:

```javascript
// Set via configuration (recommended)
window.JadeWidget.init({
  offsetLeft: '24px',
  offsetBottom: '80px',
});

// Or override via CSS (advanced)
document.querySelector('.jade-widget-root').style.setProperty('--jade-offset-left', '24px');
document.querySelector('.jade-widget-root').style.setProperty('--jade-offset-bottom', '80px');
```

Available CSS custom properties:
- `--jade-offset-bottom` - Bottom position
- `--jade-offset-right` - Right position  
- `--jade-offset-left` - Left position
- `--jade-scale` - Widget scale
- `--jade-primary-color` - Primary brand color
- `--jade-accent-color` - Accent color

### Configuration Examples

**Basic (Demo Mode):**
```javascript
window.JadeWidget.init();
```

**With Debug Mode:**
```javascript
window.JadeWidget.init({
  debug: true,  // Enable detailed logging for troubleshooting
});
```

**Align with Back-to-Top Button (Left Side, Same Baseline):**
```javascript
window.JadeWidget.init({
  offsetLeft: '24px',              // Left side (back-to-top on right)
  offsetBottom: '80px',            // Match back-to-top baseline
  offsetLeftMobile: '16px',        // Smaller margin on mobile
  offsetBottomMobile: '80px',      // Keep same baseline on mobile
  scale: 0.85,                     // Slightly smaller to avoid overlap
});
```

**Left-aligned with scaling (e.g., for EventFlow):**
```javascript
window.JadeWidget.init({
  apiBaseUrl: 'https://api.event-flow.co.uk',
  assistantName: 'Jade',
  primaryColor: '#8B5CF6',
  offsetLeft: '24px',              // Position on left side instead of right
  offsetBottom: '80px',
  scale: 0.85,                     // Make widget 15% smaller
  avatarUrl: 'https://example.com/custom-icon.png',
  debug: false,                    // Disable debug logs in production
});
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

### Option 1: jsDelivr CDN (Recommended)

The widget is automatically built and committed to the repository, making it available via jsDelivr CDN.

#### For Development/Testing (Latest Version)

Uses `@main` branch - automatically gets updates but subject to CDN caching:

```html
<!-- Add widget script from jsDelivr -->
<script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js"></script>

<!-- Initialize -->
<script>
  window.JadeWidget.init({
    apiBaseUrl: 'https://api.jadeassist.com',
    primaryColor: '#8B5CF6',
  });
</script>
```

#### For Production (Version Pinning) ⭐ RECOMMENDED

Use a specific commit SHA for stability and predictability:

```html
<!-- Pin to specific commit SHA for production -->
<script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@50eeb32/packages/widget/dist/jade-widget.js"></script>

<script>
  window.JadeWidget.init({
    apiBaseUrl: 'https://api.event-flow.co.uk',
    assistantName: 'Jade',
    primaryColor: '#8B5CF6',
    offsetLeft: '24px',
    offsetBottom: '80px',
    scale: 0.85,
  });
</script>
```

**Benefits of commit SHA pinning:**
- ✅ No unexpected updates
- ✅ No cache-busting needed
- ✅ Full version control
- ✅ Rollback capability
- ✅ Immediate CDN availability (no purge delay)

**How to update:**
1. Get latest commit SHA from GitHub: `git rev-parse HEAD` or GitHub UI
2. Update the script `src` URL with new SHA
3. Test on staging before production
4. Deploy consumer site update

#### Cache-Busting Strategies

When you update the widget, jsDelivr caches files for 7 days by default. Choose a strategy:

**Strategy 1: Commit SHA Pinning** (Recommended for production)
```html
<!-- Update SHA when you want to update widget -->
<script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@abc1234/packages/widget/dist/jade-widget.js"></script>
```
- No cache issues
- Explicit version control
- Consumer controls when to update

**Strategy 2: Purge CDN Cache** (Good for development)
```bash
# Purge jsDelivr cache immediately
curl -X POST https://purge.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js
```
- Takes ~1 minute to propagate
- No consumer code changes needed
- Works with `@main` URLs

**Strategy 3: Query Parameter** (Simple but requires coordination)
```html
<!-- Update version parameter when widget updates -->
<script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js?v=1.0.1"></script>
```
- Consumer must update parameter
- Simple to understand
- No purge needed

**Strategy 4: Check Cache Status**
```
https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js?debug=true
```
- View cache headers and status
- Useful for debugging

**Note:** The GitHub Actions workflow automatically builds and commits the widget when changes are pushed to the `main` branch.

### Option 2: Self-Hosted

1. **Build the widget:**
   ```bash
   npm run build
   ```

2. **Upload to CDN or static hosting:**
   ```bash
   # Example: Upload dist/jade-widget.js to your CDN
   # The file is ~22KB minified (~6KB gzipped)
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

- **jsDelivr** (Recommended): Free, global CDN, serves directly from GitHub
- **CDN**: CloudFlare, AWS CloudFront, Fastly
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
4. Enable debug mode to see detailed logs: `window.JadeWidget.init({ debug: true })`

### Changes not appearing in production (CDN caching)

**Problem:** You've updated the widget but consumer sites still show the old version.

**Cause:** CDN caching (jsDelivr caches for 7 days by default)

**Solutions:**

1. **Use commit SHA pinning (Recommended for production):**
   ```html
   <!-- Instead of @main, use specific commit SHA -->
   <script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@50eeb32/packages/widget/dist/jade-widget.js"></script>
   ```
   - Get latest commit SHA from GitHub
   - Update consumers to point to new SHA after deployments
   - No cache issues, full version control

2. **Purge jsDelivr cache (Immediate update):**
   ```bash
   # Purge specific file from CDN
   curl -X POST https://purge.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js
   ```
   - Takes ~1 minute to propagate globally
   - Requires no consumer code changes

3. **Add query parameter versioning:**
   ```html
   <!-- Add version or timestamp to bust cache -->
   <script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js?v=1.0.1"></script>
   ```
   - Consumers must update the version parameter
   - Simple but requires consumer action

4. **Self-host for full control:**
   - Build and deploy to your own CDN/server
   - No third-party cache dependencies
   - More control but more infrastructure

**Best Practice:**
- **Development:** Use `@main` with cache purge
- **Production:** Use commit SHA pinning (`@<sha>`) for stability

### Avatar image not loading

1. **Enable debug mode** to see detailed error messages:
   ```javascript
   window.JadeWidget.init({ debug: true });
   ```

2. **Check the browser console** for avatar load errors like:
   ```
   [JadeWidget] Failed to load avatar image: https://...
   ```

3. **Verify the avatar URL** is accessible:
   - Open the URL directly in browser
   - Check for CORS errors
   - Ensure HTTPS if page is HTTPS

4. **Test with a different avatar** to isolate the issue:
   ```javascript
   window.JadeWidget.init({
     avatarUrl: 'https://via.placeholder.com/150',
     debug: true
   });
   ```

5. **Default fallback:** Widget shows emoji (💬) if avatar fails to load

### Widget positioning issues

1. **Check for conflicting CSS:**
   - Inspect `.jade-widget-root` element
   - Look for overriding `position` or `z-index` styles

2. **Use CSS custom properties for dynamic control:**
   ```javascript
   // After widget initialization
   const widget = document.querySelector('.jade-widget-root');
   widget.style.setProperty('--jade-offset-bottom', '100px');
   widget.style.setProperty('--jade-offset-left', '30px');
   ```

3. **Test responsive behavior:**
   - Check mobile positioning separately
   - Use `offsetBottomMobile` and `offsetLeftMobile` config options
   - Test with browser dev tools device emulation

4. **Verify no conflicting elements:**
   - Check z-index of other fixed/sticky elements
   - Widget uses `z-index: 999999`
   - Ensure nothing blocks or overlaps the widget

5. **Enable debug mode** to log positioning values:
   ```javascript
   window.JadeWidget.init({
     offsetLeft: '24px',
     offsetBottom: '80px',
     debug: true  // Logs initialization config
   });
   ```

### Styles conflict with site

The widget uses Shadow DOM specifically to prevent this. If conflicts occur:
1. Ensure widget script is loaded correctly
2. Check browser support for Shadow DOM
3. Verify no global CSS overrides with `!important`
4. Check that widget mounts to `<body>` (default) not inside other styled containers

### API connection fails

1. Check `apiBaseUrl` is correct
2. Verify CORS is configured on backend
3. Check network tab for failed requests
4. Widget falls back to demo mode on error
5. Enable debug mode: `window.JadeWidget.init({ apiBaseUrl: '...', debug: true })`

### localStorage not persisting

1. Check browser allows localStorage (not in private mode)
2. Verify localStorage quota not exceeded
3. Check console for storage errors
4. Test: `localStorage.setItem('test', 'value')`

### Widget starts in wrong state (open instead of closed)

1. Clear localStorage: `localStorage.clear()` or widget API: `window.JadeWidget.instance?.reset()`
2. Check if previous session left it open
3. Widget should start closed by default unless previously opened by user

## Manual Verification Checklist

After deployment or configuration changes, verify:

- [ ] Widget appears on page after ~1 second
- [ ] Avatar image loads correctly (check debug logs if `debug: true`)
- [ ] Widget is positioned correctly on desktop
- [ ] Widget is positioned correctly on mobile (test with dev tools)
- [ ] Clicking avatar opens chat popup
- [ ] Chat popup has correct branding colors
- [ ] Messages persist across page reloads
- [ ] ESC key closes the widget
- [ ] Greeting tooltip appears for new users (first visit)
- [ ] Quick reply buttons work
- [ ] Text input and send button work
- [ ] Widget responds with demo or API messages
- [ ] Console has no errors (check with debug mode enabled)
- [ ] Avatar fallback works if image fails to load

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
