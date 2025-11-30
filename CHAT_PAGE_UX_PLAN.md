# Chat Page UX Refresh Plan

## Objectives
- Make the chat page feel like a standalone experience (no breadcrumbs / nested boxes).
- Center focus on the conversation surface with generous, breathable space.
- Keep context and guidance visible without crowding the chat.

## Key issues observed
- Breadcrumb-like Home button + badge create busy header; page doesn’t feel self-contained.
- Hero card contains another card (ChatPanel), creating a “box in box” visual that feels heavy.
- Perk chips + perk cards repeat content and compete for attention.
- Chat history area is still constrained relative to the overall canvas.

## UX improvements
1. **Header as lightweight top bar**
   - Replace the breadcrumb/Home button with a compact top-right utility cluster (feedback, optional sign-out/avatar); use a subtle back-to-home link below the fold if needed.
   - Keep the page title and descriptor centered at the top, no badge stack.
2. **Single hero shell, no inner shells**
   - Remove the outer hero card and drop the ChatPanel card onto the page background with a soft spotlight/gradient, or keep one shell only (either the hero or the panel, not both).
   - Increase max width to ~960–1040px and center align; allow edge breathing room on mobile.
3. **Chat panel prominence**
   - Give the ChatPanel a taller default height and less surrounding chrome; use a faint border and shadow instead of nested glass.
   - Keep prompts and status indicators inline but reduce secondary chips to 1–2 concise helpers.
4. **Context row instead of perk grid**
   - Replace the three perk cards with a slim horizontal strip under the panel: icon + short label, minimal surface. This keeps benefits visible without pulling focus.
5. **Guidance + trust microcopy**
   - Add a single-line reassurance above the panel (privacy/data handling) and a short “what to try” line below the textarea.
   - Surface a feedback link near the footer instead of in the primary header.
6. **Background & atmosphere**
   - Use one layered gradient or spotlight behind the panel to anchor it; remove redundant overlays and reduce noise.
   - Slightly increase vertical padding so the page breathes, especially on desktop.
7. **Responsive tuning**
   - On mobile: stack everything in one column, widen chat history to ~70vh, and ensure buttons wrap neatly.
   - On large screens: cap width and center; avoid left/right splits so the chat stays the hero.

## Validation
- Quick visual QA at mobile/tablet/desktop to ensure the page reads as a standalone chat surface.
- Send/receive test: verify scroll behavior, textarea expand/collapse, and prompt buttons after layout changes.
