# Chat Page Messaging & UX Copy Plan

## Objective
Make `/chat` instantly understandable for first-time users by replacing internal/technical labels (for example, "Super Search" and "Natural-language people search") with outcome-focused language.

## Current Friction (from existing copy)
- "Search and Talk to the SOM Navigator" is broad and does not state the concrete user outcome.
- "Run natural-language Super Search" sounds technical and tool-centric.
- "Super Search" appears multiple times without user-facing meaning.
- "Try the navigator" in the chat panel feels generic versus action-oriented.
- "Use in chat" on result cards is vague about what will happen.

## Messaging Strategy
Lead with jobs-to-be-done, not system mechanics.
- Job 1: Find the right alum quickly.
- Job 2: Turn matches into outreach faster.
- Job 3: Improve message quality/confidence.

Positioning statement:
- "Find the right SOM alumni and draft outreach in minutes."

## Naming Recommendations
Primary recommendation (strongest clarity):
- Replace "Super Search" with **"People Finder"**
- Replace "Natural-language people search" with **"Describe who you want to meet"**

Why this works:
- "People Finder" is plain language and outcome-led.
- "Describe who you want to meet" tells users exactly how to interact.

Good alternatives:
- "Alumni Finder"
- "Match Finder"
- "Contact Matcher"

Avoid:
- "Super Search" (feature jargon)
- "Natural-language people search" (developer phrasing)
- "Semantic" / "AI retrieval" language in UI

## Proposed Copy Rewrite (by UI area)
### 1. Page hero (`app/chat/page.tsx`)
- Heading: **"Find the right SOM alumni. Draft outreach that gets replies."**
- Subheading: **"Describe who you want to meet, review matches, then personalize your message in chat."**
- Badge: keep "Beta" but add reassurance nearby: **"Built for Yale SOM networking."**

### 2. Mode toggle (`components/search-chat-workspace.tsx`)
- "Search" -> **"Find People"**
- "Chat" -> **"Draft Message"**

### 3. Search pane title/labels (`components/search-chat-workspace.tsx`)
- Section title "Super Search" -> **"People Finder"**
- Sub-label "Powered by web search" -> **"Searches verified public profiles"**
- Field label "Natural-language people search" -> **"Who do you want to meet?"**
- Input placeholder -> **"Example: SOM alumni in climate fintech in NYC open to a 15-minute coffee chat"**
- CTA button "Run super search" -> **"Find matches"**
- Helper text "Search is configured automatically." -> remove or replace with:
  - **"Tip: Include industry, location, and role for better matches."**

### 4. Profile-result actions (`components/search-chat-workspace.tsx`)
- "Use in chat" -> **"Draft outreach"**
- "Copy" action (if visible) -> **"Copy draft"**
- Add short helper text near actions:
  - **"Generate a first outreach draft using this person’s profile."**

### 5. Chat panel header (`components/chat-panel.tsx`)
- "Try the navigator" -> **"Draft your outreach"**
- "Ask for a match, a warm intro script, or availability." ->
  - **"Ask for a personalized intro message, follow-up, or refinement."**
- Empty-state text rewrite:
  - **"Pick a match and we’ll help you write a concise, personalized outreach note."**

### 6. System guidance text (`components/chat-panel.tsx`)
- "Tip: Add details and context. Navigator won't remember your last question." ->
  - **"Tip: Add your goal, shared interests, and preferred ask. Context resets each new question."**

## UX Clarity Improvements (non-visual, copy-led)
- Add a compact "How it works" 3-step line above workspace:
  1. **Describe target alum**
  2. **Review matches**
  3. **Draft and refine outreach**
- Show active-step context by mode:
  - In Find People mode: "Step 1 of 3"
  - In Draft Message mode: "Step 3 of 3"
- Keep one primary CTA per step (avoid competing button language).

## Voice & Style Guardrails
- Use plain, outcome-oriented terms ("find", "match", "draft", "send").
- Prefer second-person language ("you") and explicit verbs.
- Keep microcopy short; one idea per line.
- Do not expose implementation details (for example, provider names) in core UI.

## Experiment Plan
### A/B test candidates
- Variant A (recommended): "People Finder"
- Variant B: "Alumni Finder"
- Variant C: "Match Finder"

### Success metrics
- Search start rate (`Find matches` clicked / chat page sessions)
- Search-to-chat continuation rate (`Draft outreach` clicked after results)
- Time to first drafted message
- Chat submission rate per session
- Qualitative: "This page was easy to understand" (1-question in-product pulse)

### Primary success threshold
- +15% lift in search-to-chat continuation rate with no drop in chat submission quality.

## Implementation Sequence
1. Update static copy in `app/chat/page.tsx`.
2. Update search-mode and result-action copy in `components/search-chat-workspace.tsx`.
3. Update chat panel header, empty state, and tips in `components/chat-panel.tsx`.
4. Add lightweight 3-step instructional line in workspace shell.
5. QA for truncation/wrapping on mobile and desktop.
6. Launch behind a flag if possible and run 1-2 week experiment.

## Suggested Final Copy Set (ready to ship)
- Product area name: **People Finder + Draft Message**
- Hero headline: **Find the right SOM alumni. Draft outreach that gets replies.**
- Hero subhead: **Describe who you want to meet, review matches, then personalize your message in chat.**
- Search field label: **Who do you want to meet?**
- Search CTA: **Find matches**
- Result CTA: **Draft outreach**
- Chat title: **Draft your outreach**

## Risks
- If existing users are used to "Super Search," sudden renaming may reduce short-term familiarity.
- Mitigation: during transition, use temporary bridging label for 2-4 weeks:
  - **"People Finder (formerly Super Search)"**
