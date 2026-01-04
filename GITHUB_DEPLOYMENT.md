# GitHub Deployment Guide - For Non-Coders 🚀

This guide will help you deploy the JadeAssist widget using GitHub - no coding experience needed! The widget will be hosted on GitHub Pages for free.

## What is GitHub Pages?

GitHub Pages is a free service that lets you host websites directly from your GitHub repository. Perfect for hosting your widget file!

---

## Step-by-Step Guide

### Part 1: Prepare Your Widget Files (One-time Setup)

#### Step 1: Build the Widget

**On your computer:**

1. Open a terminal/command prompt:
   - **Windows**: Press `Win + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type `terminal`, press Enter
   
2. Navigate to the widget folder:
   ```
   cd path/to/JadeAssist/packages/widget
   ```
   
3. Run these commands one by one:
   ```
   npm install
   npm run build
   ```

**What this does:** Creates a file called `jade-widget.js` in the `dist` folder. This is your widget!

---

### Part 2: Set Up GitHub Pages (One-time Setup)

#### Step 2: Enable GitHub Pages

1. **Go to your GitHub repository:**
   - Open your browser
   - Go to: `https://github.com/rhysllwydlewis/JadeAssist`

2. **Click on "Settings"** (top menu bar)

3. **Click on "Pages"** (left sidebar)

4. **Under "Source":**
   - Select `main` or `copilot/add-embeddable-chat-widget` from the dropdown
   - Select `/` (root) as the folder
   - Click **Save**

5. **Wait a few minutes** - GitHub will build your site

6. **Your widget will be available at:**
   ```
   https://rhysllwydlewis.github.io/JadeAssist/packages/widget/dist/jade-widget.js
   ```

**Important:** Write down this URL! You'll need it for your website.

---

### Part 3: Add Widget to event-flow.co.uk

#### Step 3: Add the Widget Code to Your Website

**Option A: If you have WordPress or similar CMS:**

1. Log into your event-flow.co.uk admin panel
2. Go to **Appearance → Theme Editor** (or similar)
3. Find the **footer.php** file (or footer section)
4. Add this code **just before** `</body>`:

```html
<!-- JadeAssist Chat Widget -->
<script src="https://rhysllwydlewis.github.io/JadeAssist/packages/widget/dist/jade-widget.js"></script>
<script>
  window.JadeWidget.init({
    // Match event-flow.co.uk colors (update these!)
    primaryColor: '#8B5CF6',
    accentColor: '#6d28d9',
    assistantName: 'Jade',
    greetingText: 'Hi! 👋 I\'m Jade. Ready to plan your event?',
  });
</script>
```

5. Click **Save** or **Update File**

**Option B: If you have direct file access:**

1. Find your website's HTML files
2. Open the main template or footer file
3. Add the code above **just before** `</body>`
4. Save and upload the file

---

### Part 4: Customize Colors (Match event-flow.co.uk)

#### Step 4: Find Your Brand Colors

**Easy way to find your website colors:**

1. **Open event-flow.co.uk in Chrome or Firefox**

2. **Right-click on any colored element** (button, header, etc.)

3. **Click "Inspect" or "Inspect Element"**

4. **Look for colors in the styles panel:**
   - Find lines like: `background-color: #8B5CF6;`
   - The `#8B5CF6` part is your color code!

5. **Copy the color code** (including the #)

6. **Update your widget code:**
   ```javascript
   window.JadeWidget.init({
     primaryColor: '#YOUR_COLOR_HERE',  // Paste your main color
     accentColor: '#DARKER_VERSION',     // Use a slightly darker shade
   });
   ```

**Quick tip:** To get a darker shade, use this free tool:
- Go to: https://www.colorhexa.com/
- Enter your color code
- Look for "Shades" section
- Pick a color 1-2 shades darker

---

### Part 5: Test Your Widget

#### Step 5: Verify Everything Works

1. **Visit your website:** `https://event-flow.co.uk`

2. **Look for the chat button** in the bottom-right corner
   - It should be a purple circular button
   - It should float gently

3. **Click the button** - chat should open

4. **Try chatting** - you should get responses (demo mode)

5. **Refresh the page** - conversation should persist

**If you don't see the widget:**
- Wait 5 minutes (GitHub Pages can be slow)
- Clear your browser cache (Ctrl+Shift+Delete)
- Check browser console for errors (F12)

---

## Updating the Widget (When You Make Changes)

### How to Update Your Widget

**Every time you change the widget code:**

1. **Build the widget again:**
   ```
   cd packages/widget
   npm run build
   ```

2. **Commit and push to GitHub:**
   ```
   git add .
   git commit -m "Update widget"
   git push
   ```

3. **Wait 2-5 minutes** for GitHub Pages to update

4. **Clear your browser cache** to see changes

---

## Common Issues and Solutions

### Problem: "Widget doesn't appear"

**Solutions:**
1. Wait 5-10 minutes after enabling GitHub Pages
2. Make sure GitHub Pages is enabled in Settings → Pages
3. Check the widget URL in your browser - does it load?
4. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)

### Problem: "Wrong colors"

**Solution:**
1. Use browser inspector to find exact colors from event-flow.co.uk
2. Update `primaryColor` and `accentColor` in your widget code
3. Rebuild and push to GitHub

### Problem: "Changes don't show up"

**Solutions:**
1. Make sure you ran `npm run build`
2. Check you committed and pushed: `git push`
3. Wait 5 minutes for GitHub Pages to rebuild
4. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Problem: "Demo Mode messages"

**Solution:**
- This is normal! Widget works in demo mode until you connect a backend
- To connect backend, add `apiBaseUrl` to your widget code:
  ```javascript
  window.JadeWidget.init({
    apiBaseUrl: 'https://api.yourdomain.com',
    primaryColor: '#8B5CF6',
  });
  ```

---

## Alternative: Using a CDN (Even Easier!)

Instead of GitHub Pages, you can use a free CDN service:

### Option 1: jsDelivr (Recommended)

Your widget URL becomes:
```
https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js
```

**Advantages:**
- ✅ Faster loading
- ✅ Automatic caching
- ✅ Global distribution

### Option 2: raw.githubuse rcontent.com (Simple)

Your widget URL becomes:
```
https://raw.githubusercontent.com/rhysllwydlewis/JadeAssist/main/packages/widget/dist/jade-widget.js
```

**Note:** Replace `main` with your branch name if different.

---

## Quick Reference

### Your Widget URL
```
https://rhysllwydlewis.github.io/JadeAssist/packages/widget/dist/jade-widget.js
```

### Basic Widget Code
```html
<script src="YOUR_WIDGET_URL"></script>
<script>
  window.JadeWidget.init({
    primaryColor: '#8B5CF6',
    accentColor: '#6d28d9',
  });
</script>
```

### Update Process
1. Make changes
2. `npm run build`
3. `git push`
4. Wait 5 minutes
5. Clear cache

---

## Need Help?

**Check the full guides:**
- [QUICK_START.md](./QUICK_START.md) - 5-minute setup
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed technical guide

**Still stuck?**
- Open an issue on GitHub
- Include: What you tried, what happened, error messages
- Screenshots help!

---

## Video Tutorial (Coming Soon)

We're working on a video walkthrough showing each step visually. Stay tuned!

---

**You've got this!** 🎉 

The widget is designed to be simple. Just follow these steps one at a time, and you'll have it running in no time!
