# Widget Assets

## Avatar Image

**File:** `avatar-woman.png`

### Description
Cartoon-style avatar of a blonde woman in her 20s with short hair, smiling. This serves as the launcher icon for the JadeAssist chat widget.

### Specifications
- Format: PNG with transparency
- Size: 1024x1024px
- Aspect ratio: 1:1 (square)
- Display size: 72px circular button
- File size: ~1.5MB

### License & Attribution
This avatar was created for the JadeAssist project using AI image generation tools.

**License:** MIT License (same as the JadeAssist project)
**Usage:** Free to use, modify, and distribute as part of the JadeAssist project
**Attribution:** Generated for rhysllwydlewis/JadeAssist

### CDN Access

The avatar is automatically served via jsDelivr CDN:
```
https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/assets/avatar-woman.png
```

For version-pinned URLs, use a specific commit SHA:
```
https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@<commit-sha>/packages/widget/assets/avatar-woman.png
```

### Replacing the Avatar

To use a custom avatar:

1. **Prepare your image:**
   - Square aspect ratio (recommended: 512x512px or larger)
   - PNG format with transparency preferred
   - Clear, professional illustration or photo
   - File size should be reasonable for web (<500KB recommended)

2. **Replace the file:**
   ```bash
   # Replace avatar-woman.png with your custom image
   cp your-avatar.png packages/widget/assets/avatar-woman.png
   ```

3. **Or use a custom URL in configuration:**
   ```javascript
   window.JadeWidget.init({
     avatarUrl: 'https://your-cdn.com/your-custom-avatar.png',
   });
   ```

4. **Commit and deploy:**
   ```bash
   git add packages/widget/assets/avatar-woman.png
   git commit -m "Update widget avatar"
   git push
   ```

### Image Requirements

When creating or selecting a custom avatar:
- ✅ Use images you have rights to use
- ✅ Ensure proper licensing for commercial use if applicable
- ✅ Consider cultural sensitivity and inclusivity
- ✅ Optimize file size for web delivery
- ✅ Use professional, brand-appropriate imagery
- ✅ Test visibility at small sizes (72px)

