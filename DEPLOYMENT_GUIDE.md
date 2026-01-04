# JadeAssist Widget - Deployment Guide for event-flow.co.uk

This guide will walk you through deploying the JadeAssist chat widget on event-flow.co.uk.

## 📋 Prerequisites

Before you begin, ensure you have:
- ✅ Access to event-flow.co.uk website code
- ✅ Backend API deployed and accessible
- ✅ CDN or static hosting for the widget file
- ✅ Understanding of event-flow.co.uk's color scheme and branding

## 🎨 Step 1: Match event-flow.co.uk Branding

### 1.1 Identify Your Brand Colors

First, identify the primary colors used on event-flow.co.uk:

```javascript
// Example color configurations for different themes

// Purple/Lavender Theme (Wedding-focused)
const purpleTheme = {
  primaryColor: '#8B5CF6',    // Main purple
  accentColor: '#6d28d9',     // Darker purple
};

// Blue Theme (Professional/Corporate)
const blueTheme = {
  primaryColor: '#3B82F6',    // Professional blue
  accentColor: '#1E40AF',     // Darker blue
};

// Pink/Rose Theme (Romantic)
const pinkTheme = {
  primaryColor: '#EC4899',    // Pink
  accentColor: '#BE185D',     // Deeper pink
};

// Custom Theme (Match your exact brand)
const customTheme = {
  primaryColor: '#YOUR_PRIMARY_COLOR',
  accentColor: '#YOUR_ACCENT_COLOR',
};
```

**How to find your colors:**
1. Open event-flow.co.uk in a browser
2. Right-click on a branded element (button, header, etc.)
3. Click "Inspect"
4. Look for `background-color` or `color` in the styles panel
5. Copy the hex color code (e.g., `#8B5CF6`)

### 1.2 Choose Your Font

Match the font family used on your website:

```javascript
// Common font stacks
const fonts = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  geometric: '"Avenir", "Montserrat", "Century Gothic", sans-serif',
  elegant: '"Playfair Display", Georgia, serif',
  modern: '"Inter", "Poppins", "Manrope", sans-serif',
};
```

## 🏗️ Step 2: Build the Widget

### 2.1 Navigate to Widget Directory

```bash
cd /path/to/JadeAssist/packages/widget
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Build the Widget

```bash
npm run build
```

This creates `dist/jade-widget.js` (~21KB, 5.9KB gzipped).

### 2.4 Verify the Build

```bash
ls -lh dist/
# Should show:
# jade-widget.js
# jade-widget.js.map
```

## 🚀 Step 3: Deploy the Widget File

### Option A: Upload to Your CDN

**For CloudFlare:**
```bash
# Upload the file
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/jade-widget.js" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/javascript" \
  --data-binary "@dist/jade-widget.js"
```

**For AWS S3:**
```bash
aws s3 cp dist/jade-widget.js s3://your-bucket/widgets/ --acl public-read
```

**For Netlify:**
```bash
# Add to your Netlify site's public folder
cp dist/jade-widget.js /path/to/netlify/public/
netlify deploy
```

### Option B: Self-Host on event-flow.co.uk

```bash
# Copy to your website's assets directory
cp dist/jade-widget.js /var/www/event-flow.co.uk/public/assets/
```

Make sure the file is served with proper MIME type:
```nginx
# Nginx configuration
location /assets/ {
    add_header Content-Type application/javascript;
    add_header Cache-Control "public, max-age=31536000";
}
```

## 🔧 Step 4: Deploy the Backend API

### 4.1 Set Up Environment Variables

On your backend server, configure:

```bash
# .env file
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/jadeassist
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secure-random-string-here
CORS_ORIGIN=https://event-flow.co.uk,https://www.event-flow.co.uk
```

### 4.2 Deploy Backend

```bash
cd packages/backend
npm install
npm run build
npm start

# Or with PM2 for production
pm2 start dist/index.js --name jadeassist-api
pm2 save
```

### 4.3 Configure CORS

Ensure your backend allows requests from event-flow.co.uk:

```javascript
// In backend/src/index.ts or similar
app.use(cors({
  origin: [
    'https://event-flow.co.uk',
    'https://www.event-flow.co.uk',
    // Add staging/dev domains if needed
  ],
  credentials: true,
}));
```

### 4.4 Verify Backend is Running

```bash
curl https://api.yourdomain.com/health
# Should return: {"status":"healthy",...}
```

## 🌐 Step 5: Integrate on event-flow.co.uk

### 5.1 Add Widget Script to Website

Add this code just before the closing `</body>` tag on all pages where you want the widget:

```html
<!-- JadeAssist Chat Widget -->
<script src="https://your-cdn-or-domain.com/jade-widget.js"></script>
<script>
  window.JadeWidget.init({
    // REQUIRED: Your backend API URL
    apiBaseUrl: 'https://api.yourdomain.com',
    
    // CUSTOMIZE THESE TO MATCH YOUR BRAND:
    primaryColor: '#8B5CF6',    // Your main brand color
    accentColor: '#6d28d9',     // Slightly darker shade
    
    // Optional customizations:
    assistantName: 'Jade',
    greetingText: 'Hi! 👋 I\'m Jade, your event planning assistant. Can I help you plan your special day?',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    
    // If you have a custom avatar image:
    // avatarUrl: 'https://event-flow.co.uk/assets/jade-avatar.png',
  });
</script>
```

### 5.2 For WordPress Sites

If event-flow.co.uk uses WordPress:

1. Go to **Appearance → Theme Editor**
2. Select `footer.php` or use a plugin like "Insert Headers and Footers"
3. Paste the widget code in the footer section

### 5.3 For Static HTML Sites

Add the code to your HTML template or layout file that's included on all pages.

### 5.4 For React/Next.js Sites

```javascript
// Add to _app.js or layout component
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://your-cdn.com/jade-widget.js';
  script.async = true;
  document.body.appendChild(script);

  script.onload = () => {
    window.JadeWidget.init({
      apiBaseUrl: 'https://api.yourdomain.com',
      primaryColor: '#8B5CF6',
      accentColor: '#6d28d9',
    });
  };

  return () => {
    document.body.removeChild(script);
  };
}, []);
```

## 🧪 Step 6: Test the Integration

### 6.1 Test Demo Mode (No Backend)

First, test without connecting to the backend:

```html
<script src="https://your-cdn.com/jade-widget.js"></script>
<script>
  // Test with demo mode (no apiBaseUrl)
  window.JadeWidget.init({
    primaryColor: '#8B5CF6',
    accentColor: '#6d28d9',
  });
</script>
```

**Verify:**
- ✅ Widget avatar button appears bottom-right
- ✅ Greeting tooltip shows after 1 second
- ✅ Chat opens when clicked
- ✅ Quick reply buttons work
- ✅ Demo responses appear
- ✅ Conversation persists on page refresh

### 6.2 Test with Backend

Add the `apiBaseUrl` to connect to your API:

```javascript
window.JadeWidget.init({
  apiBaseUrl: 'https://api.yourdomain.com',
  primaryColor: '#8B5CF6',
  accentColor: '#6d28d9',
});
```

**Verify:**
- ✅ Widget connects to backend
- ✅ Real AI responses (not demo messages)
- ✅ No "⚠️ Demo Mode" prefix on messages
- ✅ Check browser console for errors

### 6.3 Test Across Browsers

Test on:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

### 6.4 Test Responsiveness

- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

## 🎯 Step 7: Customize for event-flow.co.uk

### 7.1 Recommended Configuration

Based on typical wedding/event planning websites:

```javascript
window.JadeWidget.init({
  // Backend
  apiBaseUrl: 'https://api.event-flow.co.uk',
  
  // Branding - UPDATE THESE!
  primaryColor: '#8B5CF6',    // Replace with event-flow.co.uk primary color
  accentColor: '#6d28d9',     // Replace with darker shade
  fontFamily: '"Your Font", -apple-system, sans-serif',
  
  // Content
  assistantName: 'Jade',
  greetingText: '✨ Hi there! I\'m Jade, your personal event planning assistant at event-flow. Ready to start planning your dream event?',
  
  // Optional: Custom avatar
  // avatarUrl: 'https://event-flow.co.uk/assets/jade-avatar.png',
});
```

### 7.2 Advanced Customization

For more control, you can programmatically manage the widget:

```javascript
// Initialize
window.JadeWidget.init({
  apiBaseUrl: 'https://api.event-flow.co.uk',
  primaryColor: '#8B5CF6',
});

// Get widget instance
const widget = window.JadeWidget.instance;

// Programmatic control
document.getElementById('help-button')?.addEventListener('click', () => {
  widget.open();
});

// Auto-open on specific pages
if (window.location.pathname === '/pricing') {
  setTimeout(() => widget.open(), 3000);
}

// Close widget
document.getElementById('close-chat')?.addEventListener('click', () => {
  widget.close();
});
```

## 📊 Step 8: Monitor and Optimize

### 8.1 Add Analytics

Track widget usage:

```javascript
window.JadeWidget.init({
  apiBaseUrl: 'https://api.event-flow.co.uk',
  primaryColor: '#8B5CF6',
});

// Track opens
const widget = window.JadeWidget.instance;
const originalOpen = widget.open.bind(widget);
widget.open = function() {
  // Track with your analytics
  if (window.gtag) {
    gtag('event', 'widget_open', {
      event_category: 'engagement',
      event_label: 'jade_assistant'
    });
  }
  return originalOpen();
};
```

### 8.2 Monitor Backend

Set up monitoring for:
- API response times
- Error rates
- Conversation metrics
- User engagement

## 🔒 Step 9: Security Checklist

- ✅ Backend API uses HTTPS
- ✅ CORS configured correctly
- ✅ Rate limiting enabled on backend
- ✅ No sensitive data in widget configuration
- ✅ CSP headers allow widget script
- ✅ API authentication implemented (if required)

## 🐛 Troubleshooting

### Widget doesn't appear

1. Check browser console for errors
2. Verify script URL is correct and file loads
3. Check for JavaScript errors on page
4. Ensure no CSP blocking the script

### "Demo Mode" messages appear

1. Verify `apiBaseUrl` is set correctly
2. Check backend is running: `curl https://api.yourdomain.com/health`
3. Check CORS is configured properly
4. Look for network errors in browser DevTools

### Styles conflict with site

The widget uses Shadow DOM for isolation, but if issues occur:
1. Verify Shadow DOM is supported in browser
2. Check for global CSS with `!important` that might leak
3. Adjust z-index if widget is behind other elements

### Messages don't persist

1. Check localStorage is enabled in browser
2. Verify not in private/incognito mode
3. Check browser console for storage errors

## 📞 Support

If you encounter issues:

1. Check the [widget README](../packages/widget/README.md)
2. Review backend logs for API errors
3. Test in demo mode to isolate backend issues
4. Open an issue on GitHub

## 🎉 Success!

Your JadeAssist widget should now be live on event-flow.co.uk!

**Next Steps:**
- Monitor user engagement
- Collect feedback
- Fine-tune AI responses based on common queries
- Consider A/B testing different greeting messages
- Add custom quick reply options for your specific use case

---

**Quick Reference URLs:**
- Widget file: `https://your-cdn.com/jade-widget.js`
- Backend API: `https://api.yourdomain.com`
- Health check: `https://api.yourdomain.com/health`
- Chat endpoint: `POST https://api.yourdomain.com/api/chat`
