# LLM Development Rules — Study OS

Rules for any LLM/coding agent (Claude Code, etc.) working on this codebase: Next.js + TypeScript dashboard on Vercel, Supabase Postgres/Auth/RLS/Storage, Chrome/Brave MV3 extension, Kotlin/Jetpack Android companion. Read before generating code. Where these rules conflict with a generic "best practice" instinct, these rules win — this is a single-user, data-sovereignty-first product, and generic SaaS patterns (multi-tenant scaling concerns, growth-hacking UX, third-party telemetry by default) are usually wrong here.

---

## 1. Non-negotiable product constraints

1. **Supabase Postgres is the only authoritative datastore.** Never introduce a second source of truth (a client-side cache that can diverge, a separate local DB on the extension/Android side that isn't just a sync queue) without being explicitly asked.
2. **Every user-owned table gets an RLS policy before it gets a single row of real data.** Generating a migration that creates a new user-owned table without a corresponding RLS policy in the same change is a bug, not a follow-up task.
3. **The service-role key never appears in any client-shipped code** — not the Next.js client bundle, not the browser extension, not the Android APK. It is used only in server-only contexts (API routes/server actions running server-side, Edge Functions). If a task seems to require the service role key in a client context, stop and flag it — there's almost always an RLS-respecting way to do it with the user's own session.
4. **Raw facts are never destroyed by a dashboard/analytics change.** If a task involves changing how a chart or metric is computed, the underlying raw rows it's computed from must remain untouched and reconstructable from scratch by a fresh frontend, per the project's disaster-recovery principle.
5. **CSV/JSON export must stay in sync with the schema.** Any migration that adds a materially important column to a user-owned table should be flagged as needing a corresponding export-format update — don't let exports silently go stale relative to the real schema.
6. **AI/adaptive logic is opt-in and layered on top of deterministic analytics, never a replacement for them.** If asked to add an "AI-powered" feature (readiness index, adaptive revision, recommendation), the deterministic calculation it's based on must be visible and independently correct — the AI/adaptive layer explains or adjusts, it doesn't replace the ground truth number.
7. **No feature increases manual data entry burden without being explicitly requested.** Before adding a required field to a form (task entry, question batch, mock entry), check whether it can be inferred/defaulted/made optional instead — the product's central UX rule is that tracking must never become another study task.

---

## 2. Tech stack — use current, not legacy, APIs

- **Next.js App Router + Server Actions** for authenticated writes where appropriate, over legacy Pages Router/API-route-only patterns, unless the existing codebase has already standardized on API routes — check existing conventions before introducing a second pattern.
- **Supabase JS client v2** conventions (typed client generated from the DB schema) — regenerate types after every migration rather than hand-maintaining TypeScript interfaces that can drift from the real schema.
- **TypeScript strict mode, no `any`.** Especially important here since a silently-mistyped numeric field (e.g., a mock score treated as a string) breaks a metric calculation invisibly.
- **Chrome Extension Manifest V3**, not V2 patterns (no persistent background pages — use a service worker; no remotely hosted code).
- **Kotlin + Jetpack** current APIs for the Android companion — background work via `WorkManager`, not deprecated `Service`/`AlarmManager`-only patterns, given Android's increasingly aggressive background-execution limits (directly relevant to the "telemetry may be imperfect" caveat already in the PRD).
- **SQL migrations committed to Git**, applied via Supabase CLI — never a manual schema edit through the Supabase dashboard UI for anything meant to persist across environments.

---

## 3. Row Level Security — specific rules

1. Every policy filters on `auth.uid() = user_id` (or the equivalent ownership column) — no table should ever rely on the application layer alone to enforce ownership.
2. Write a policy for **each** operation (`select`, `insert`, `update`, `delete`) explicitly rather than one broad policy assumed to cover all four — Supabase RLS policies are operation-specific, and a missing `delete` policy silently blocks deletes rather than failing loudly, which is easy to miss in testing.
3. Any join/view that spans multiple user-owned tables (e.g., a report view joining `mocks` + `mock_sections` + `mock_topic_results`) must still resolve correctly under RLS for the authenticated user — verify with an actual authenticated query in testing, not just as the postgres superuser, which bypasses RLS entirely and will hide bugs.
4. Storage buckets (screenshots/attachments) get path-scoped policies (`{user_id}/...` prefix enforced), not bucket-wide access gated only by authentication.

---

## 4. Idempotency & sync — specific rules

1. Every client-initiated write that could plausibly be retried (mock entry, question batch, session stop) accepts a client-generated idempotency key (UUID) and the corresponding table has a unique constraint on it — implement this as upsert-on-conflict, not insert-then-catch-duplicate-error as an afterthought.
2. The extension and Android companion are **sync clients**, not independent sources of truth — they queue events locally when offline and flush to Supabase when connectivity returns, tagging each event with `source_client`. Don't build a local database on these clients that's meant to be queried independently long-term.
3. Never silently drop a write that fails to sync. Surface saved/pending/failed state in the UI per the PRD; a coding agent implementing a new writable feature must include this state handling, not just the happy path.
4. Enforce the single-active-session invariant (one open `study_sessions` row per user) at the database level (a partial unique index on `user_id where end_timestamp is null`), not only in application logic, since multiple clients can race to start a session.

---

## 5. Calculation correctness rules

This product's entire value proposition is trustworthy numbers. Be conservative.

1. **Every metric in the metric dictionary (accuracy, time gap, cutoff gap, safety gap, task completion, revision adherence, allocation, active-practice ratio, questions/hour) is implemented once, in a shared calculation module, and reused everywhere it appears** (dashboard KPI strip, drill-down, reports, exports) — never reimplemented inline in a component, which is how dashboards and reports quietly disagree with each other.
2. **Guard every division against a zero denominator** (0 attempted questions, 0 planned tasks, 0 due revisions) and render an explicit "no data" state rather than `NaN`, `Infinity`, or a misleading `0%`.
3. **Day-boundary-aware aggregation.** Any query grouping by "day" must use the user's `day_boundary_offset_minutes` and `timezone`, not `DATE(created_at)` in server or database default timezone — a naive implementation here will misattribute late-night sessions and silently corrupt heatmaps/streaks.
4. **Never let a UI/chart-library change touch how a number is computed.** If asked to swap or restyle a chart, the underlying data-fetching/calculation code should not need to change — if it does, that's a sign the calculation was previously coupled to the presentation layer and should be refactored to a shared module first.
5. **Small-sample guardrails are code, not just documentation.** If a task involves showing "topic X is weak," the implementation must check sample size (e.g., don't badge a topic as weak/strong below a minimum attempted-question threshold) — this guardrail is stated as a product principle in the PRD and should be enforced in the query/computation layer, not left as a UI-only warning that's easy to skip.

---

## 6. Code style & architecture

- Feature-based folder structure (`features/study-timer`, `features/revisions`, `features/mocks`, `features/reports`) over a purely technical split — this keeps the calculation-correctness rules above easy to locate and reuse per domain.
- Shared calculation logic lives in a framework-agnostic module (plain TypeScript, no React/Next imports) so it can be unit-tested in isolation and reused by both the dashboard and any server-side report-generation job.
- No default exports for components/modules — named exports for easier refactors and search across a codebase that will grow to 23 phases' worth of features.
- Every table/column touching money-equivalent-sensitivity data here (marks, cutoffs, targets) should have its unit and scale documented in a comment where first defined (e.g., "marks out of 100, not normalized") — cross-exam comparisons (Banking vs SSC) are a real source of unit-confusion bugs if max-marks scales differ.

---

## 7. Testing rules

- Every function in the shared calculation module ships with a unit test using a known-answer fixture (the PRD's own worked examples — e.g., 50 attempted/42 correct → 84% accuracy, score 72/cutoff 68/safety 75 → +4/−3 — make good literal test cases).
- RLS policies are tested with an actual authenticated Supabase client per user, not just as the service role — a test suite that only ever queries as postgres superuser will never catch a missing or incorrect policy.
- The "fresh frontend reconstruction" disaster-recovery test (already required by the PRD) should be automatable in CI on a schedule, not treated as a one-time manual check before launch.
- Idempotency is tested by literally sending the same write twice and asserting exactly one row results, not just by code review of the upsert logic.

---

## 8. When acting as a coding agent on this repo

Before writing code for a new task:
1. Identify which of the 23 phases the task belongs to and confirm its stated dependencies are actually in place (e.g., don't build Phase 9 speed/accuracy analytics before Phase 8's mock schema is finalized and validated).
2. If the task touches a metric already defined in the metric dictionary, reuse the existing shared calculation — don't reimplement it locally "for this one screen."
3. If the task adds a new user-owned table, the RLS policy, idempotency key handling (if writable from multiple clients), and CSV/JSON export update all ship in the same change, not as follow-ups.
4. If the task seems to require loosening RLS, adding a client-side service-role usage, or skipping the day-boundary aggregation rule "just for now," stop and flag it rather than implementing the shortcut.
5. Prefer the smallest correct change — this is a long multi-phase build; avoid opportunistic refactors of unrelated phases while implementing one feature.
