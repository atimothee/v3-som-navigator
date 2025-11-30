# UI Improvements Implementation Plan

## Goal
Remove the ChatPanel ("Try the Navigator" section) from the home page and widen the hero text area for better readability.

## Steps
1. **Review home page layout**
   - Open `app/page.tsx` to confirm the current hero structure, ChatPanel placement, and any layout constraints (container size, flex settings, width props).
2. **Remove ChatPanel section**
   - Delete the ChatPanel import and its JSX block (including the surrounding Box if only used for that section).
   - Ensure layout spacing remains balanced after removal; adjust flex/gap props if needed.
3. **Widen hero text**
   - Increase the hero text container width (e.g., adjust max-width, flex basis, or container size) so headline/body copy spans more horizontal space while keeping readable line length across breakpoints.
   - Update any related styles/classes if they constrain the width.
4. **Cleanup**
   - Remove any now-unused props or styles tied to the ChatPanel section.
   - Ensure TypeScript/ESLint are satisfied (no unused imports/vars).
5. **Verify**
   - Run `npm run lint` (or project lint command) and, if possible, a local visual check to confirm layout looks correct without the ChatPanel and with widened hero text.

## Notes
- Avoid altering other sections (stats grid, “How it works”) unless spacing changes are required after removal.
- Keep hero text line length reasonable (~60–80 chars) when widening.
