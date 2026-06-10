# Mobile-First PWA Design

**Goal:** Enable Taste app to be installable on iPhone/Android home screens, with responsive layouts and touch-friendly UI for capture flow screens (CaptureScreen, DoneScreen, TypeSheet, FeedScreen).

**Architecture:** Incremental enhancement using CSS media queries and PWA manifest. Keep existing component structures; add mobile-specific CSS and PWA configuration without breaking desktop experience.

**Tech Stack:** Next.js 14 (viewport meta, manifest), CSS media queries, SVG icons, service worker registration (built-in Next.js support).

---

## 1. PWA Setup

### Files to Create

**`public/manifest.json`**
```json
{
  "name": "Taste — Art Director Capture Tool",
  "short_name": "Taste",
  "description": "Capture and synthesize your design taste",
  "start_url": "/",
  "display": "fullscreen",
  "scope": "/",
  "orientation": "portrait-primary",
  "theme_color": "#F3ECDD",
  "background_color": "#F3ECDD",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["productivity"],
  "screenshots": [
    {
      "src": "/screenshot-540.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

**Icon files to create in `public/`:**
- `icon-192.png` — 192×192px, Taste app icon
- `icon-512.png` — 512×512px, Taste app icon
- `icon-192-maskable.png` — 192×192px with safe zone inset for adaptive icons (Android)
- `apple-touch-icon.png` — 180×180px for iOS home screen

### Files to Update

**`src/app/layout.tsx`** — Update `<head>` metadata:
```typescript
export const metadata: Metadata = {
  title: 'Taste',
  description: 'Art Director capture and taste synthesis',
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    maximumScale: 5,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
}

// In RootLayout, add before closing </head>:
// <meta name="theme-color" content="#F3ECDD" />
// <link rel="manifest" href="/manifest.json" />
// <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

## 2. Responsive Breakpoints & CSS Strategy

### Breakpoint Definitions

Add to `src/app/globals.css` (after :root variables):

```css
/* Mobile-first responsive design */
/* Base styles (mobile): 375px–480px (iPhone SE to iPhone 14) */
@media (max-width: 374px) {
  /* Extra small phones (iPhone SE 1st gen) */
  :root {
    --padding-mobile: 8px;
  }
}

@media (max-width: 480px) {
  /* Small phones (iPhone SE, iPhone 12 mini) */
  :root {
    --padding-mobile: 12px;
  }
}

@media (min-width: 481px) and (max-width: 767px) {
  /* Larger phones (iPhone 13, 14) */
  :root {
    --padding-mobile: 16px;
  }
}

@media (min-width: 768px) {
  /* Tablets (iPad mini, iPad) */
  :root {
    --padding-mobile: 20px;
  }
}

@media (min-width: 1024px) {
  /* Desktop (iPad Pro, monitors) */
  :root {
    --padding-mobile: 24px;
  }
}
```

### Mobile-Friendly Padding & Gaps

Update components and screens to use responsive padding:

**Pattern for containers:**
```css
/* Mobile: 12px, Tablet: 20px, Desktop: 24px */
@media (max-width: 480px) {
  .container { padding: 12px; }
}
@media (min-width: 481px) and (max-width: 767px) {
  .container { padding: 16px; }
}
@media (min-width: 768px) {
  .container { padding: 20px; }
}
@media (min-width: 1024px) {
  .container { padding: 24px; }
}
```

**Pattern for gaps (component spacing):**
```css
/* Mobile: 8px, Desktop: 16px */
@media (max-width: 480px) {
  .component-grid { gap: 8px; }
}
@media (min-width: 481px) {
  .component-grid { gap: 16px; }
}
```

---

## 3. Touch-Friendly Component Updates

### Minimum Touch Target Sizes

| Component | Desktop | Mobile | WCAG Level |
|-----------|---------|--------|-----------|
| Button | 40px height, 12px/24px padding | **48px height, 16px/20px padding** | AA (44px min) |
| Chip/Tag | 32px height | **40px height** | AA |
| FAB | 56px diameter | 56px diameter | AA (already compliant) |
| Tap target min | 36px | **44px** | AA (WCAG standard) |
| Tap padding (around) | 8px | **12px** | Safe spacing |

### Implementation Pattern

**For buttons (existing components):**
```css
@media (max-width: 480px) {
  button {
    padding: 16px 20px;
    min-height: 48px;
    font-size: 14px;
  }
}

@media (min-width: 481px) {
  button {
    padding: 12px 24px;
    min-height: 40px;
  }
}
```

**For chips/tags:**
```css
@media (max-width: 480px) {
  .chip {
    padding: 8px 12px;
    min-height: 40px;
    font-size: 12px;
  }
}

@media (min-width: 481px) {
  .chip {
    padding: 6px 10px;
    min-height: 32px;
    font-size: 11px;
  }
}
```

**For tap spacing (between clickable elements):**
```css
@media (max-width: 480px) {
  /* Ensure 12px minimum spacing between tap targets */
  .button + .button { margin-left: 12px; }
  .chip + .chip { margin-right: 12px; }
}
```

---

## 4. Responsive Layout Patterns

### CaptureScreen (TypeSheet)

**Mobile strategy:** Full-width, stacked buttons

```css
@media (max-width: 480px) {
  .capture-section {
    width: 100%;
    padding: 12px;
  }
  
  .button-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .button {
    width: 100%;
  }
}

@media (min-width: 481px) {
  .capture-section {
    width: 100%;
    padding: 20px;
  }
  
  .button-row {
    display: flex;
    flex-direction: row;
    gap: 12px;
  }
  
  .button {
    flex: 1;
  }
}
```

### FeedScreen (Masonry Grid)

**Mobile strategy:** Single column, desktop: 2-column masonry

```css
/* Mobile: 1 column */
@media (max-width: 480px) {
  .feed-grid {
    column-count: 1;
    gap: 8px;
  }
}

/* Tablet/Desktop: 2 columns */
@media (min-width: 481px) {
  .feed-grid {
    column-count: 2;
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .feed-grid {
    column-count: 2;
    gap: 16px;
  }
}
```

### DossierScreen (Editorial Layout)

**Mobile strategy:** Full-width with reduced max-width, stacked rules

```css
@media (max-width: 480px) {
  .dossier-container {
    max-width: 100%;
    padding: 12px;
  }
  
  .dossier-header {
    padding: 24px 12px;
  }
  
  .rules-grid {
    display: grid;
    grid-template-columns: 1fr; /* Stack on mobile */
    gap: 12px;
  }
  
  .frequency-words {
    line-height: 1.6;
    font-size: clamp(12px, 4vw, 18px);
  }
}

@media (min-width: 481px) {
  .dossier-container {
    max-width: 1120px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .rules-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
  
  .frequency-words {
    font-size: clamp(14px, 2vw, 32px);
  }
}
```

---

## 5. Safe Area & Notch Handling

### Fixed Bottom Navigation

Update `src/app/(app)/layout.tsx` BottomNav:

```css
nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom); /* Adds extra padding for notches/home bar */
  height: auto;
  min-height: 52px;
}
```

Update layout container to account for bottom nav:
```css
@media (max-width: 480px) {
  .app-container {
    padding-bottom: calc(52px + env(safe-area-inset-bottom));
  }
}
```

### Sticky Headers with Notches

For sticky headers (e.g., CapsuleScreen header):
```css
header {
  position: sticky;
  top: 0;
  padding-top: env(safe-area-inset-top);
  /* Fixes header behind iPhone notch */
  z-index: 10;
}
```

### FAB Positioning

Update FAB to respect bottom nav + safe area:
```css
.fab {
  position: fixed;
  bottom: calc(52px + 20px + env(safe-area-inset-bottom));
  /* 52px nav + 20px spacing + safe area inset */
  right: 20px;
  z-index: 50;
}
```

### Rounded Corners for Notch Compatibility

For custom bottom sheet bars or modals:
```css
.sheet {
  border-radius: max(16px, env(safe-area-inset-bottom));
  /* Adapts to devices with custom bottom insets */
}
```

---

## 6. Implementation Scope

### Priority 1 (Required for PWA)
- [ ] Create `public/manifest.json`
- [ ] Create app icons (4 files in `public/`)
- [ ] Update `src/app/layout.tsx` with viewport meta + manifest link
- [ ] Add PWA manifest metadata to Metadata export

### Priority 2 (Mobile layouts)
- [ ] Add breakpoint CSS to `src/app/globals.css`
- [ ] Update CaptureScreen/TypeSheet with mobile padding/full-width buttons
- [ ] Update FeedScreen grid to 1 column on mobile
- [ ] Update DossierScreen max-width to 100% on mobile + rules grid to 1 column

### Priority 3 (Touch-friendly)
- [ ] Update button components to 48px height on mobile
- [ ] Update chip/tag components to 40px on mobile
- [ ] Update button/chip spacing (12px minimum between targets)

### Priority 4 (Safe area)
- [ ] Update BottomNav with safe-area-inset-bottom padding
- [ ] Update FAB positioning to account for nav + safe area
- [ ] Update sticky headers with safe-area-inset-top

---

## 7. Testing & Verification

### Browser Testing
- Chrome DevTools mobile emulation: iPhone SE (375px), iPhone 14 Pro (430px), iPad (768px)
- Safari iOS on actual device (iPhone)
- Android Chrome on actual device

### PWA Installation
- iOS: Open in Safari → Share → "Add to Home Screen" → verify app launches in fullscreen
- Android: Open in Chrome → tap menu → "Install app" → verify home screen icon, splash screen

### Responsive Verification Checklist
- [ ] No horizontal scroll on iPhone SE (375px)
- [ ] Buttons are >= 44px × 44px tap targets
- [ ] Bottom nav doesn't hide content (padding-bottom applied)
- [ ] FAB positioned above nav + notch
- [ ] Sticky headers don't hide behind notches
- [ ] Single-column layout on mobile, multi-column on tablet/desktop

---

## 8. Files Affected

| File | Change | Priority |
|------|--------|----------|
| `src/app/layout.tsx` | Add viewport meta, manifest link, apple-web-app meta | 1 |
| `src/app/globals.css` | Add breakpoint CSS + responsive patterns | 1,2,3 |
| `src/app/(app)/layout.tsx` | Update BottomNav with safe-area-inset | 4 |
| `src/components/FAB.tsx` | Update positioning for bottom nav + safe area | 4 |
| `src/app/(app)/capsule/[contextId]/page.tsx` | Add responsive padding, mobile button layout | 2 |
| `src/app/(app)/feed/page.tsx` | Update masonry grid columns (1 mobile, 2+ desktop) | 2 |
| `src/components/dossier/DossierDocument.tsx` | Update max-width, rules grid to responsive | 2 |
| `public/manifest.json` | Create PWA manifest | 1 |
| `public/icon-*.png` | Create app icons (4 files) | 1 |

---

## 9. Out of Scope (Deferred)

- Contexts/Library screens responsive design (not priority)
- Service worker offline functionality (online-first approach)
- Loading skeleton improvements
- Advanced haptic feedback on iOS
- Custom fonts optimization for mobile
- Image lazy-loading (handled by Next.js Image already)
