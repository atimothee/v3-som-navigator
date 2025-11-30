# Chat Page Loading & Autoscroll Plan

## Objectives
- Make loading status visible even when the top progress bar is off-screen.
- Keep new replies discoverable without jarring jumps.
- Minimize layout changes and scope to the chat page component.

## Plan
1. Inline loading indicator: Add a compact “Generating…” chip or spinner beside the send button so the state is visible near the input at all scroll positions.
2. Smart autoscroll: When a reply starts, scroll to bottom only if the user is near the end (e.g., within ~150px). If they’re far up, avoid jumping and show a “New reply” pill that scrolls to the latest message when tapped.
3. Mobile/keyboard safety: Keep inline indicator and “New reply” pill above keyboard safe areas; avoid full-width overlays and layout shifts.
4. Scope and state: Keep changes inside the chat page component—track `isLoading` and `isNearBottom`, render the “New reply” pill, and wire the conditional scroll logic.

## Validation
- Send/receive flow: verify loading indicators show/hide correctly and the “New reply” pill appears only when not auto-scrolling.
- Scroll behavior: confirm near-bottom autoscroll works and there are no unexpected jumps when scrolled far up.
