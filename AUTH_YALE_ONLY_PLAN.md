# Yale-Only Email Authentication Plan

## Goal
Restrict app access to users authenticated with `@yale.edu` email addresses and support email-based auth only (no Google OAuth).

## Scope
- Runtime enforcement for protected pages and API routes.
- Clerk UI updates so the global shell does not advertise extra auth entry points.
- Clerk Dashboard configuration to disable Google login provider.

## Implementation Steps
1. Add a shared auth guard helper in `lib/require-yale-user.ts`.
2. Enforce guard on app pages in `app/page.tsx` and `app/chat/page.tsx`.
3. Enforce guard for backend access in `app/api/chat/route.ts`.
4. Remove `SignUpButton` from `app/layout.tsx` so the header only exposes sign-in.
5. Disable Google OAuth in Clerk Dashboard:
   - Open Clerk Dashboard -> User & Authentication -> Social Connections.
   - Disable Google provider.
6. Restrict authentication strategies to email in Clerk Dashboard:
   - Open Clerk Dashboard -> User & Authentication -> Email, Phone, Username.
   - Enable email-based sign-in/sign-up strategies only.
7. Validate behavior end-to-end:
   - Unauthenticated users are redirected to `/sign-in`.
   - Non-`@yale.edu` authenticated users are redirected to `/unauthorized`.
   - `@yale.edu` users can access home, chat, and `POST /api/chat`.

## Notes
- Google OAuth cannot be fully disabled from app code alone; this must be disabled in Clerk Dashboard settings for the active Clerk instance.
- Runtime domain checks remain in code as defense-in-depth even after dashboard restrictions.
