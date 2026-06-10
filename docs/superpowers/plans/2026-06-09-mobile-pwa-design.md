# Mobile-First PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA installability and responsive mobile layouts for capture flow (CaptureScreen, FeedScreen, DoneScreen) with touch-friendly UI and safe area handling.

**Architecture:** Incremental enhancement using CSS media queries, PWA manifest, and Next.js viewport meta tags. No component refactoring — only CSS additions and configuration changes.

**Tech Stack:** Next.js 14 (Metadata API), CSS3 media queries, SVG icons, `env(safe-area-inset-*)` for notch handling.

---

## File Structure

| File | Action | Responsibility |
|------|--------|-----------------|
| `public/manifest.json` | Create | PWA manifest for app installation |
| `public/icon-192.png` | Create | App icon 192×192px |
| `public/icon-512.png` | Create | App icon 512×512px |
| `public/icon-192-maskable.png` | Create | Adaptive icon for Android |
| `public/apple-touch-icon.png` | Create | iOS home screen icon |
| `src/app/layout.tsx` | Modify | Add viewport meta, manifest link, apple-web-app meta |
| `src/app/globals.css` | Modify | Add breakpoint media queries + responsive patterns |
| `src/app/(app)/layout.tsx` | Modify | Update BottomNav safe-area-inset |
| `src/components/FAB.tsx` | Modify | Update positioning for nav + safe area |
| `src/app/(app)/capsule/[contextId]/page.tsx` | Modify | Add responsive padding + mobile button layout |
| `src/app/(app)/feed/page.tsx` | Modify | Update masonry grid columns (1 mobile, 2+ desktop) |
| `src/components/dossier/DossierDocument.tsx` | Modify | Update max-width, rules grid responsive |

---

## Task 1: Create PWA Manifest & App Icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `public/icon-192-maskable.png`
- Create: `public/apple-touch-icon.png`

- [ ] **Step 1: Create `public/manifest.json`**

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

- [ ] **Step 2: Create app icons**

You will need to generate 5 PNG images and save them to `public/`:
- `icon-192.png` — 192×192px (use Taste brand icon/logo)
- `icon-512.png` — 512×512px (same as above, larger)
- `icon-192-maskable.png` — 192×192px with safe zone inset for adaptive icons
- `apple-touch-icon.png` — 180×180px for iOS home screen
- `screenshot-540.png` — 540×720px for PWA install prompt (optional, can use existing screenshot)

For now, use a simple placeholder: Create a 192×192px image with "T" letter or your Taste logo.

- [ ] **Step 3: Verify manifest is valid**

Run: `curl http://localhost:3000/manifest.json`

Expected: JSON response with proper structure, no 404 error.

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json public/icon-192.png public/icon-512.png public/icon-192-maskable.png public/apple-touch-icon.png
git commit -m "feat(pwa): add manifest and app icons for home screen installation"
```

---

## Task 2: Update Root Layout with PWA Meta Tags

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add viewport meta to Metadata export**

Open `src/app/layout.tsx` and find the `metadata` export. Update it to:

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
```

- [ ] **Step 2: Add theme-color and apple-touch-icon meta tags in RootLayout component**

In the `RootLayout` function, add before the closing `</head>` tag (inside the html/head):

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmMono.variable}>
      <head>
        <meta name="theme-color" content="#F3ECDD" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style>{`
          :root { --font-display: 'ABCArizonaFlare'; }
        `}</style>
      </head>
      <body style={{ fontFamily: 'var(--mono)', background: 'var(--cream)', color: 'var(--ink)' }}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000` in Chrome DevTools (mobile view). 

Expected: No console errors. Right-click page → "Install Taste" option should appear on Android Chrome.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(pwa): add viewport meta tags and manifest link for iOS/Android installation"
```

---

## Task 3: Add Global Responsive Breakpoints to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add breakpoint media queries to `src/app/globals.css`**

After the `:root` variables section (around line 50), add:

```css
/* ─────────────────────────────────────────────────────────────────── */
/* Mobile-First Responsive Breakpoints */
/* ─────────────────────────────────────────────────────────────────── */

/* Base styles applied to mobile (375px–480px) */
/* Tablet: 481px–767px */
/* Desktop: 768px+ */

@media (max-width: 480px) {
  /* Small phones: iPhone SE, iPhone 12 mini, etc. */
  body {
    --mobile-padding: 12px;
    --mobile-gap: 8px;
  }

  /* Reduce padding on mobile screens */
  .container,
  .screen-container {
    padding: 12px;
  }

  /* Reduce gaps between components */
  .component-grid {
    gap: 8px;
  }
}

@media (min-width: 481px) and (max-width: 767px) {
  /* Tablets: iPad mini, etc. */
  body {
    --mobile-padding: 16px;
    --mobile-gap: 12px;
  }

  .container,
  .screen-container {
    padding: 16px;
  }

  .component-grid {
    gap: 12px;
  }
}

@media (min-width: 768px) {
  /* Large tablets and desktop */
  body {
    --mobile-padding: 20px;
    --mobile-gap: 16px;
  }

  .container,
  .screen-container {
    padding: 20px;
  }

  .component-grid {
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  /* Desktop: monitors, large tablets */
  body {
    --mobile-padding: 24px;
    --mobile-gap: 16px;
  }

  .container,
  .screen-container {
    padding: 24px;
  }

  .component-grid {
    gap: 16px;
  }
}
```

- [ ] **Step 2: Verify CSS loads without errors**

Open DevTools → Console. 

Expected: No errors, CSS is parsed correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(responsive): add mobile-first breakpoints and padding CSS variables"
```

---

## Task 4: Update Button Components for Mobile Touch Targets (48px)

**Files:**
- Modify: All button elements across components

- [ ] **Step 1: Add button sizing CSS to `src/app/globals.css`**

Add after the breakpoints section:

```css
/* ─────────────────────────────────────────────────────────────────── */
/* Touch-Friendly Button Sizing (WCAG AA: 44px minimum) */
/* ─────────────────────────────────────────────────────────────────── */

@media (max-width: 480px) {
  button {
    min-height: 48px;
    padding: 16px 20px;
    font-size: 14px;
  }

  button + button {
    margin-left: 12px; /* Minimum tap spacing */
  }
}

@media (min-width: 481px) {
  button {
    min-height: 40px;
    padding: 12px 24px;
    font-size: 14px;
  }

  button + button {
    margin-left: 8px;
  }
}
```

- [ ] **Step 2: Test button sizing on mobile**

Open DevTools → toggle mobile view (iPhone SE: 375px).

Expected: Buttons are at least 48px tall, have adequate spacing, no horizontal scroll.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(touch): add touch-friendly button sizing (48px on mobile, WCAG AA compliant)"
```

---

## Task 5: Update Chip Components for Mobile (40px)

**Files:**
- Modify: All chip elements across components

- [ ] **Step 1: Add chip sizing CSS to `src/app/globals.css`**

Add to the globals.css file:

```css
/* ─────────────────────────────────────────────────────────────────── */
/* Touch-Friendly Chip/Tag Sizing */
/* ─────────────────────────────────────────────────────────────────── */

@media (max-width: 480px) {
  .chip,
  .tag {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .chip + .chip,
  .tag + .tag {
    margin-right: 12px; /* Minimum tap spacing */
  }
}

@media (min-width: 481px) {
  .chip,
  .tag {
    min-height: 32px;
    padding: 6px 10px;
    font-size: 11px;
  }

  .chip + .chip,
  .tag + .tag {
    margin-right: 8px;
  }
}
```

- [ ] **Step 2: Test chip sizing on mobile**

Open DevTools → mobile view.

Expected: Chips are at least 40px tall, spacing between chips is ≥ 12px.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(touch): add touch-friendly chip sizing (40px on mobile)"
```

---

## Task 6: Update CaptureScreen with Responsive Mobile Layout

**Files:**
- Modify: `src/app/(app)/capsule/[contextId]/page.tsx`

- [ ] **Step 1: Add mobile responsive padding**

In `src/app/(app)/capsule/[contextId]/page.tsx`, find the main container div (the one with `height: '100%'`). 

Update the padding pattern for mobile:

```typescript
<div style={{ height: '100%', overflowY: 'auto', background: 'var(--cream)' }}>
  {/* Header and content */}
</div>
```

No change needed here — the existing padding: `'24px 20px 100px'` will be overridden by globals.css breakpoints.

- [ ] **Step 2: Make buttons full-width on mobile**

Find the "Generate capsule" button and update its style:

```typescript
<button
  onClick={handleGenerate}
  disabled={generating}
  style={{
    width: '100%',
    padding: '15px',
    // ... rest of styles
    marginBottom: 12,
  }}
>
  {generating ? 'Generating…' : capsule ? 'Generate new version' : 'Generate capsule'}
</button>
```

The `width: '100%'` ensures full-width button on all screen sizes. Button height will be controlled by the CSS from Task 4.

- [ ] **Step 3: Update "Open Dossier" button**

Find the "Open Dossier" button and ensure it also has:

```typescript
<button
  onClick={() => router.push(`/dossier/${capsule.id}`)}
  style={{
    width: '100%',
    padding: '13px',
    // ... rest of styles
    marginBottom: 24,
  }}
>
  Open Dossier
</button>
```

- [ ] **Step 4: Test on mobile**

Open DevTools → mobile view. 

Expected: Buttons are full-width, at least 48px tall, no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add src/app/capsule/
git commit -m "feat(responsive): make CapsuleScreen buttons full-width on mobile"
```

---

## Task 7: Update FeedScreen Masonry Grid for Mobile (1 column)

**Files:**
- Modify: `src/app/(app)/feed/page.tsx`

- [ ] **Step 1: Add responsive masonry CSS to `src/app/globals.css`**

Add this new CSS rule:

```css
/* ─────────────────────────────────────────────────────────────────── */
/* Responsive Masonry Grid */
/* ─────────────────────────────────────────────────────────────────── */

@media (max-width: 480px) {
  /* Mobile: single column */
  .feed-grid {
    column-count: 1;
    gap: 8px;
  }
}

@media (min-width: 481px) and (max-width: 767px) {
  /* Tablet: 2 columns */
  .feed-grid {
    column-count: 2;
    gap: 12px;
  }
}

@media (min-width: 768px) {
  /* Desktop: 2 columns */
  .feed-grid {
    column-count: 2;
    gap: 16px;
  }
}
```

- [ ] **Step 2: Add class to FeedScreen grid**

Open `src/app/(app)/feed/page.tsx` and find the masonry grid div. Add the `feed-grid` class:

Look for the container with `style={{ display: 'flex', flexDirection: 'column', gap: 10 }}` or similar masonry pattern. Update it to include:

```typescript
<div
  className="feed-grid"
  style={{
    // existing styles
  }}
>
  {/* Feed items */}
</div>
```

Or if using CSS `columns` property, ensure the element has the `feed-grid` class so the media query applies.

- [ ] **Step 3: Test on mobile and desktop**

Open DevTools:
- Mobile view (375px): Should show 1 column
- Tablet view (600px): Should show 2 columns
- Desktop (1024px): Should show 2 columns

Expected: No horizontal scroll, cards reflow properly.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/feed/
git commit -m "feat(responsive): make FeedScreen masonry grid responsive (1 col mobile, 2 col desktop)"
```

---

## Task 8: Update DossierScreen with Responsive Layout

**Files:**
- Modify: `src/components/dossier/DossierDocument.tsx`

- [ ] **Step 1: Add responsive dossier CSS to `src/app/globals.css`**

Add:

```css
/* ─────────────────────────────────────────────────────────────────── */
/* Responsive Dossier Layout */
/* ─────────────────────────────────────────────────────────────────── */

@media (max-width: 480px) {
  .dossier-container {
    max-width: 100%;
    padding: 12px;
  }

  .dossier-header {
    padding: 24px 12px;
  }

  .rules-grid {
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

  .dossier-header {
    padding: 40px 20px;
  }

  .rules-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }

  .frequency-words {
    font-size: clamp(14px, 2vw, 32px);
  }
}
```

- [ ] **Step 2: Add responsive max-width to DossierDocument**

In `src/components/dossier/DossierDocument.tsx`, find the main container div that has `maxWidth: 1120`. Update it to use the responsive class:

```typescript
<div style={{ background: bg, color: ink, minHeight: '100vh', fontFamily: 'var(--mono)' }}>
  {/* Running head */}

  {/* Document body */}
  <div className="dossier-container" style={{ /* existing styles */ }}>
    {/* Content */}
  </div>
</div>
```

- [ ] **Step 3: Ensure rules grid uses responsive class**

Find the rules grid in DossierDocument (the `display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)'` div). Add the class:

```typescript
<div className="rules-grid" style={{ display: 'grid', gap: 24 }}>
  {/* Rules columns */}
</div>
```

- [ ] **Step 4: Test on mobile and desktop**

Open DevTools:
- Mobile view (375px): 1 column rules, single-column layout
- Desktop (1024px): 4 column rules grid

Expected: No horizontal scroll, content readable at all sizes.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/dossier/DossierDocument.tsx
git commit -m "feat(responsive): make DossierDocument responsive (100% mobile, 1120px desktop)"
```

---

## Task 9: Update BottomNav & FAB for Safe Area Insets

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/FAB.tsx`

- [ ] **Step 1: Update BottomNav in layout.tsx**

In `src/app/(app)/layout.tsx`, find the BottomNav `nav` element. Update its style:

```typescript
<nav style={{
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  borderTop: '1px solid var(--dust)',
  background: 'var(--cream)',
  zIndex: 40,
  paddingBottom: 'env(safe-area-inset-bottom)',
  // ... rest of styles
}}>
```

The `paddingBottom: 'env(safe-area-inset-bottom)'` adds extra padding on iPhone notches/home bars.

- [ ] **Step 2: Update FAB positioning**

In `src/components/FAB.tsx`, find the FAB button. Update its style to account for bottom nav:

```typescript
style={{
  position: 'fixed',
  bottom: 'calc(52px + 20px + env(safe-area-inset-bottom))',
  // 52px nav height + 20px spacing + safe area inset
  right: 20,
  zIndex: 50,
  // ... rest of styles
}}
```

- [ ] **Step 3: Test on iOS simulator or device**

If available, test on iPhone with notch (iPhone 12+):
- BottomNav should have extra padding at bottom
- FAB should be positioned above nav + notch
- No content should be hidden behind safe areas

Expected: All interactive elements are accessible, no content hidden.

- [ ] **Step 4: Commit**

```bash
git add src/app/layouts.tsx src/components/FAB.tsx
git commit -m "feat(safe-area): add viewport-fit safe area insets for notches and home bars"
```

---

## Task 10: Testing & Verification

**Files:**
- Testing in browser/simulator

- [ ] **Step 1: Test PWA installation on Android Chrome**

1. Open `http://localhost:3000` in Chrome (Android emulator or device)
2. Right-click → "Install Taste" (or menu → Install)
3. Add to home screen
4. Tap home screen icon to launch

Expected: App launches in fullscreen mode, no browser chrome.

- [ ] **Step 2: Test PWA installation on iOS Safari**

1. Open `http://localhost:3000` in Safari (iOS simulator or device)
2. Tap Share button → "Add to Home Screen"
3. Tap home screen icon to launch

Expected: App launches, status bar is translucent, no browser chrome.

- [ ] **Step 3: Test responsive layout on mobile (375px)**

Open DevTools → mobile view (iPhone SE: 375px):
- No horizontal scroll
- Buttons are 48px tall
- Chips are 40px tall
- FeedScreen shows 1 column
- DossierScreen is full-width
- BottomNav visible, not covering content

Expected: All pass.

- [ ] **Step 4: Test responsive layout on tablet (768px)**

Open DevTools → tablet view (iPad: 768px):
- FeedScreen shows 2 columns
- DossierScreen shows 4-column rules grid
- Buttons are 40px tall
- No horizontal scroll

Expected: All pass.

- [ ] **Step 5: Test responsive layout on desktop (1024px)**

Open DevTools → full desktop:
- DossierScreen max-width: 1120px centered
- FeedScreen shows 2 columns
- All spacing matches desktop design

Expected: All pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "test(pwa): verify PWA installation and responsive layouts across all breakpoints"
```

---

## Summary

After all 10 tasks, you will have:
1. ✅ PWA manifest + 5 app icons
2. ✅ Viewport meta tags + manifest link in root layout
3. ✅ Mobile-first responsive breakpoints in globals.css
4. ✅ Touch-friendly button sizing (48px on mobile)
5. ✅ Touch-friendly chip sizing (40px on mobile)
6. ✅ CaptureScreen responsive layout
7. ✅ FeedScreen responsive masonry grid
8. ✅ DossierScreen responsive layout
9. ✅ BottomNav + FAB safe area insets
10. ✅ Tested and verified on mobile/tablet/desktop

**Total time estimate:** 1-2 hours (depends on icon creation)