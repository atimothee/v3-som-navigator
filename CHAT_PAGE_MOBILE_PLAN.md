# Objective
Make the chat panel full-width on mobile (edge-to-edge), removing the floating card feel while preserving the current desktop styling.

# Context
- Page: app/chat/page.tsx
- Styles: app/globals.css (`.chat-page`, `.chat-spotlight`, `.chat-panel-wrap`, container padding)

# Plan
1) Adjust container padding for mobile (e.g., smaller `px` on `Container` or mobile-only padding reset on `.chat-page`) to allow true edge-to-edge layout.
2) Remove mobile card framing: drop `.chat-spotlight` background/border-radius/padding on small screens so the panel sits flush.
3) Let the panel span full width on mobile: relax `.chat-panel-wrap` max-width on small screens; keep desktop max-width.
4) Validate responsive behavior: ensure desktop unchanged; verify mobile shows full-width panel with adequate breathing room top/bottom.

# Risks / Considerations
- Maintain touch-friendly padding without reintroducing the “card” affordance.
- Check that background gradients from `.chat-page` still look intentional with the wider panel.
- Ensure Radix `Container` width tokens don’t reintroduce unintended margins on mobile.
