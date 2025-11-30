# Chat Page Loading & Autoscroll Plan

## Objectives
- Make loading status visible even when the top progress bar is off-screen.
- Keep new replies discoverable without jarring jumps.
- Minimize layout changes and scope to the chat page component.

## Plan
1. Inline loading indicator: Add a compact “Generating…” chip or spinner beside the send button so the state is visible near the input at all scroll positions.
2. Floating loading pill: Show a small bottom-right pill/toast (“Assistant responding…” + spinner) only while loading; auto-dismiss on completion.
3. Smart autoscroll: When a reply starts, scroll to bottom only if the user is near the end (e.g., within ~150px). If they’re far up, avoid jumping and show a “New reply” pill that scrolls to the latest message when tapped.
4. Mobile/keyboard safety: Keep the floating pill and inline indicator above the keyboard safe area; avoid full-width overlays and layout shifts.
5. Scope and state: Keep changes inside the chat page component—track `isLoading` and `isNearBottom`, render the floating pill, and wire the conditional scroll logic.

## Validation
- Send/receive flow: verify loading indicators show/hide correctly and the “New reply” pill appears only when not auto-scrolling.
- Scroll behavior: confirm near-bottom autoscroll works and there are no unexpected jumps when scrolled far up.
