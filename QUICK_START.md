# Quick Start Guide - event-flow.co.uk

Get the JadeAssist widget running on event-flow.co.uk in 5 minutes!

## 🚀 Quick Setup

### 1. Build the Widget (One-time)

```bash
cd packages/widget
npm install
npm run build
```

This creates `dist/jade-widget.js`

### 2. Upload Widget File

Upload `dist/jade-widget.js` to your hosting:

**Example locations:**
- CDN: `https://cdn.event-flow.co.uk/jade-widget.js`
- Self-hosted: `https://event-flow.co.uk/assets/jade-widget.js`

### 3. Add to Your Website

Add this code before `</body>` on your website:

```html
<!-- JadeAssist Widget -->
<script src="https://your-domain.com/jade-widget.js"></script>
<script>
  window.JadeWidget.init({
    // Option 1: With Backend (Live AI)
    apiBaseUrl: 'https://api.event-flow.co.uk',
    
    // Option 2: Demo Mode (No backend needed for testing)
    // Just remove apiBaseUrl line above
    
    // Customize to match your brand:
    primaryColor: '#8B5CF6',    // Your main color
    accentColor: '#6d28d9',     // Slightly darker
    assistantName: 'Jade',
  });
</script>
```

### 4. Test It!

1. Open your website
2. Look for the chat button bottom-right
3. Click to start chatting
4. Refresh page - conversation persists!

## 🎨 Match Your Brand Colors

### Find Your Colors

1. Open event-flow.co.uk
2. Right-click on a button/header
3. Click "Inspect Element"
4. Look for `background-color` or `color`
5. Copy the hex code (e.g., `#8B5CF6`)

### Update Widget Colors

```javascript
window.JadeWidget.init({
  primaryColor: '#YOUR_COLOR',    // Replace this
  accentColor: '#DARKER_SHADE',   // And this
});
```

### Common Event Planning Themes

```javascript
// Purple (Elegant/Wedding)
{ primaryColor: '#8B5CF6', accentColor: '#6d28d9' }

// Rose/Pink (Romantic)
{ primaryColor: '#EC4899', accentColor: '#BE185D' }

// Blue (Professional)
{ primaryColor: '#3B82F6', accentColor: '#1E40AF' }

// Teal (Modern)
{ primaryColor: '#14B8A6', accentColor: '#0D9488' }
```

## 🔧 Backend Setup (Optional)

### Without Backend (Demo Mode)

Widget works immediately with smart demo responses:

```javascript
window.JadeWidget.init({
  primaryColor: '#8B5CF6',
  // No apiBaseUrl = Demo mode
});
```

### With Backend (Live AI)

1. Deploy backend API (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md))
2. Add `apiBaseUrl` to widget:

```javascript
window.JadeWidget.init({
  apiBaseUrl: 'https://api.event-flow.co.uk',
  primaryColor: '#8B5CF6',
});
```

## 📱 Responsive & Accessible

The widget automatically:
- ✅ Adapts to mobile/tablet/desktop
- ✅ Uses Shadow DOM (no style conflicts)
- ✅ Includes ARIA labels
- ✅ Supports ESC key to close
- ✅ Persists conversations in localStorage

## 🎯 What's Next?

**See the full deployment guide for:**
- Backend API deployment
- Custom avatar setup
- Analytics integration
- Advanced customization
- Troubleshooting

📖 **Read:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 💡 Tips

### Auto-open widget on specific pages

```javascript
window.JadeWidget.init({ primaryColor: '#8B5CF6' });

// Auto-open on pricing page
if (window.location.pathname === '/pricing') {
  setTimeout(() => {
    window.JadeWidget.instance.open();
  }, 2000);
}
```

### Trigger widget from your button

```html
<button onclick="window.JadeWidget.instance.open()">
  Chat with Jade
</button>
```

### Reset conversation

```javascript
window.JadeWidget.instance.reset();
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget doesn't appear | Check browser console for errors |
| Demo mode when backend set | Verify apiBaseUrl and backend is running |
| Colors don't match | Use browser inspector to find exact hex codes |
| Conversation not persisting | Check localStorage is enabled |

## 📞 Need Help?

- 📖 Full guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- 📚 Widget docs: [packages/widget/README.md](./packages/widget/README.md)
- 🐛 Issues: [GitHub Issues](https://github.com/rhysllwydlewis/JadeAssist/issues)

---

**You're all set! The widget should now be live on event-flow.co.uk** 🎉
