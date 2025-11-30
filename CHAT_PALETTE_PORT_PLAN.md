# Plan: Port Chat Page Palette to Home Page

## Palette source (chat)
- Base bg: `--bg` radial gradient over `#0b0b12`; glass panel `--panel`; stroke `--stroke`; glow `--glow` (app/globals.css:1-44).
- Accent teal: `#7cf8c8` (pulse, hover states); supporting teal `rgba(87, 194, 173, …)`.
- Accent purple/indigo: `rgba(111, 90, 237, …)` for gradients/badges; link blue `#8fd7ff`.
- Surfaces: gradients on `.message.user` / `.message.assistant`, spotlight (`.chat-spotlight`), dashed context strip, and subtle glass borders.

## Changes to make on home page
1) Align page shell with chat background  
   - Apply `--bg` background and a home-specific wrapper class mirroring `.chat-page` radial layout.  
   - Ensure `app/layout.tsx` keeps shared bg so both pages inherit consistent atmosphere.

2) Bring glass + stroke surfaces to hero and cards  
   - Use `.glass` styling (panel, stroke, glow) for hero container and stats cards to match chat panel styling.  
   - Add light radial highlight (like `.chat-spotlight`) behind the hero CTA block.

3) Unify accent usage for CTAs and labels  
   - Use the teal/purple gradient for primary CTA (button) and badge: e.g., gradient background or `Badge`/`Button` colors tuned to `#7cf8c8`/`indigo`.  
   - Update secondary text/link colors to match chat link blue `#8fd7ff` instead of default gray when appropriate.

4) Add subtle texture to sections  
   - Introduce a dashed `context-strip`-style wrapper around the “How it works” or stats grid for consistency with chat context strip.  
   - Reuse spacing and radius from chat (`16-24px` radii) for section dividers.

5) Tokenize home-specific helpers  
   - Create a `.home-hero` (or similar) class in `app/globals.css` that wraps: spotlight background, gradient overlay, and shared radius/padding; avoid inline styles in `app/page.tsx`.  
   - Keep palette values sourced from existing CSS variables; avoid duplicating raw color literals.

6) QA & polish checklist  
   - Verify contrast on CTA and body text against the darker bg.  
   - Check mobile: gradients don’t clip, padding keeps cards readable, no overflow.  
   - Smoke test navigation between `/` and `/chat` to ensure shared styles don’t regress chat layout.
