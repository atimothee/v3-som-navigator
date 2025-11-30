# Chat Page Focus Plan

## Goal
Center the ChatPanel as the primary call to action and increase visible chat history so the conversation feels roomier without constant scrolling.

## Current layout observations
- `app/chat/page.tsx` uses a split hero grid (copy + perks alongside ChatPanel), which dilutes focus and pushes the panel off-center.
- `.chat-scroll` in `app/globals.css` caps history at `max-height: 340px`, making conversations feel cramped.
- Supporting perks grid below the hero further competes for attention.

## Plan
1. **Simplify the hero stack**
   - Convert the hero grid into a single-column flow that stacks intro copy above the ChatPanel within `app/chat/page.tsx`.
   - Adjust container width (e.g., `Container size="4"` with centered max-width) and align content to center to keep the panel visually dominant.
2. **Center and size the ChatPanel**
   - Wrap `ChatPanel` in a flex/box that centers it and constrains width (e.g., `maxWidth: 880-960px`, full width on mobile).
   - Reduce surrounding decorative content (badges, perk icons) near the panel so it remains the focal element.
3. **Expose more chat history**
   - Let the shell be a column flex box so the scroll area can grow; increase `.chat-scroll` height to a viewport-aware value (e.g., `min(60vh, 560px)`) and add a larger cap on desktop while keeping mobile comfortable.
   - Consider making the ChatPanel card taller by default (padding, min-height) so history and textarea both fit without crowding.
4. **Relegate supporting perks**
   - Move the three perk cards beneath the main panel or condense them into a slim strip with subdued styling so they reinforce, not compete.
   - Keep spacing tight to maintain focus on the chat surface.
5. **Polish and responsiveness**
   - Ensure centered layout remains stable across breakpoints (no overflowing widths on small screens).
   - Recheck glass/gradient styling so the panel has subtle emphasis without heavy distractions.

## Validation
- Visual QA at mobile, tablet, and desktop widths to confirm the panel stays centered and history shows more messages before scrolling.
- Quick chat flow check (submit prompt, view model reply) to ensure scrolling, textarea expansion, and button states still behave correctly.
