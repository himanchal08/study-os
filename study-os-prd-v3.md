# Study OS — Exhaustive PRD v3.0 (Enhanced)

**Type:** Dashboard-first personal operating system for full-time Banking + SSC exam preparation
**Base:** Built on top of the v2.0 specification (23 phases) — nothing from v2.0 is removed; this document adds schema-level detail, closes identified gaps, and proposes additional features.
**Stack:** Next.js + TypeScript (Vercel) · Supabase PostgreSQL/Auth/RLS/Storage · Chrome/Brave MV3 extension · Kotlin/Jetpack Android companion

**ABSOLUTE RULE (unchanged):** The dashboard is replaceable. Supabase is not.
**ABSOLUTE UX RULE (unchanged):** Tracking must never become another study task.

---

## Part A — What's New in v3 (gap analysis on v2.0)

v2.0 is unusually thorough for a personal project spec — most of the systemic thinking (raw-facts-first, RLS everywhere, idempotency, disaster recovery) is already correct. The gaps below are the kind that only surface once you're actually building and living with the system for months, not from reading the feature list.

| # | Area | Gap in v2.0 | Fix in v3 |
|---|---|---|---|
| 1 | Day boundary | Never defines when a "day" ends. Late-night study (e.g., past midnight) will silently misattribute to the wrong day in every heatmap/report. | User-configurable day-boundary offset (e.g., "day ends at 3:00 AM," default midnight) stored in `profiles`; all daily aggregation uses this boundary, not calendar midnight. See §B. |
| 2 | Multi-client write conflicts | Browser extension, Android companion, and dashboard can all write focus/session events concurrently. Idempotency is specified but conflict *resolution* (whose event wins, what if two devices claim the same focus session) is not. | Explicit conflict-resolution rule per table in §C. |
| 3 | Timer already running | No rule for what happens if the user tries to start a new session while one is already active (multi-tab, or forgot to stop yesterday's timer). | Explicit single-active-session invariant + recovery flow in Phase 1 additions. |
| 4 | Taxonomy edits | Subjects/topics can presumably be renamed/merged/split over months of use, but nothing addresses what happens to historical `study_sessions`/`revisions`/`mock_topic_results` referencing the old topic. | Add topic versioning/merge strategy in §D — never mutate historical foreign keys silently. |
| 5 | Revision cadence rigidity | Fixed daily/weekly/monthly cycles are simple but not evidence-based — a topic revised 6 times with 95% recall doesn't need daily revision forever, and a topic that keeps failing recall needs *more* frequent revision, not less. | Proposed as an **opt-in adaptive layer** on top of the fixed cadence (not a replacement) — see New Feature #1. |
| 6 | Multi-exam prioritization | Banking + SSC overlap via shared taxonomy is handled, but nothing decides *allocation* when both exams have upcoming dates. | New Feature #2 — exam-proximity-weighted allocation suggestion. |
| 7 | Validation completeness | "Prevent correct > attempted" is stated but the full validation set for mock/question entry isn't enumerated. | Full validation ruleset in §E. |
| 8 | Data annotation / exclusion | No way to mark a day as atypical (sick, travel, family emergency) without deleting real data or letting it distort streaks/trends as if it were a normal low-effort day. | New Feature #3 — day annotations that exclude from trend statistics without deleting raw rows. |
| 9 | Account/data lifecycle | No mention of account deletion, data retention, or what "export everything" actually guarantees before deletion. | Added to §F (Security & Lifecycle). |
| 10 | Extension permission denial | Browser focus tracking assumes permissions are granted; no fallback UX if the user declines tab-access permission. | Explicit degraded-mode behavior in Phase 16 additions. |
| 11 | Onboarding | Nothing about first-run experience — how does a brand-new user get from empty database to "Start Study" in under a minute. | Added as its own short phase-0.5 note in §G. |
| 12 | Notification delivery mechanism | "Notifications are required" but delivery channel (push? email? in-app only?) is unspecified. | Clarified in §H alongside a recommendation. |
| 13 | Schema versioning per export | JSON export says "include schema version" but no table has a `schema_version`/`created_at`/`updated_at` convention defined. | Standardized column convention in §D. |
| 14 | Rate limiting / abuse | Single-user product, but API routes are still public-network-reachable; no mention of basic rate limiting on auth/mock-entry endpoints. | Added to §F. |
| 15 | Accessibility | Not mentioned anywhere in a dashboard-heavy product used for hours daily. | Added as a Phase 1 non-functional requirement. |

---

## Part B — Day Boundary & Timezone Rules (new section)

- `profiles.day_boundary_offset_minutes` (default `0`, meaning midnight; e.g., `180` = day ends at 3:00 AM local time).
- All daily aggregation queries (heatmap, daily report, revision due-dates) bucket by `(timestamp - day_boundary_offset) :: date`, never by raw calendar date.
- `profiles.timezone` (IANA string, e.g. `Asia/Kolkata`) is stored explicitly rather than inferred from the client on every request — a session started while traveling must not retroactively shift which "day" it belongs to.
- Daylight-saving edge cases are irrelevant for India-based exam prep but the timezone field should not assume a hardcoded zone, since Android/browser clients may report device time inconsistently.

---

## Part C — Multi-Client Conflict Resolution (new section)

| Table | Conflict scenario | Resolution rule |
|---|---|---|
| `study_sessions` | Timer started on dashboard, browser extension also thinks a session is active | **Single-active-session invariant**: only one `study_sessions` row per user may have `end_timestamp IS NULL` at a time. A second start attempt (from any client) must either resume the existing session or explicitly stop-and-start, never create a second concurrent open session. |
| `focus_sessions` / `browser_events` / `phone_events` | Extension and Android both send events during the same study session | Both are allowed to write — they're different telemetry sources (browser vs phone) and are not mutually exclusive. Each event row is tagged with `source_client` (`web`, `extension`, `android`) and aggregation sums per-client, never overwrites. |
| `revisions` | Revision generation logic runs from both a scheduled Edge Function and a client-triggered check | Deduplicate on `(user_id, topic_id, cycle_type, due_date)` unique constraint — the second generation attempt is a no-op, not a duplicate row. |
| `mocks` | User enters the same mock twice (e.g., app crash mid-entry, retried) | Idempotency key required on mock creation, generated client-side (UUID) and persisted; retried writes with the same key upsert rather than insert. |

---

## Part D — Standardized Schema Conventions (new section)

Every user-owned table adds, beyond what v2.0 already specifies:

- `id` — UUID primary key
- `user_id` — UUID, FK to `profiles`, RLS predicate on every policy
- `created_at`, `updated_at` — timestamptz, defaulted/triggered
- `client_generated_id` — UUID, nullable, used as the idempotency key for retryable writes
- `source_client` — enum (`web`, `extension`, `android`, `import`) where multiple clients can write
- `deleted_at` — nullable timestamptz for **soft delete** on anything the user might delete (tasks, saved_questions, mocks) — v2.0 says "do not silently discard" for sync failures; this extends the same principle to user-initiated deletes, since there's no server backup layer to recover from in the early phases

**Topic/subject versioning (fixes gap #4):** `topics` gets an `archived_at` column. Renaming a topic edits the row in place (fine — it's the same entity). *Merging* two topics never deletes the losing topic; instead it's archived and a `topic_id` remap happens only on new writes going forward, while historical `study_sessions`/`question_batches` keep referencing whichever topic id they were originally logged against. A `topic_aliases` table records "topic X was merged into topic Y on date Z" so analytics can optionally roll old data into the new topic without destroying the original record.

---

## Part E — Full Validation Ruleset (expands v2.0 §10, fixes gap #7)

- `question_batches`: `correct + wrong + skipped ≤ attempted`; all counts ≥ 0; `attempted > 0` before accuracy is computed (else show "no data," never divide by zero).
- `mocks`: `correct + wrong + unattempted = attempted` (or `attempted` derived from the three, whichever the UI collects); `attempted ≤ maximum_marks`-implied question count where known; `actual_duration_minutes > 0`; `score ≤ maximum_marks`.
- `revisions`: `due_date ≥ source study event date`; a revision cannot be marked complete before its `due_date - grace_window` (prevents accidentally completing tomorrow's revision today, which would silently break adherence stats) — grace window itself is configurable, default 0.
- `targets`: `target_value > 0`; overlapping targets for the same metric/period are rejected, not silently averaged.
- `cutoffs`: `cutoff ≤ maximum_marks`.
- All numeric inputs from manual entry get client-side + server-side validation (never trust the extension/Android payload alone — RLS protects ownership, not data sanity).

---

## Part F — Security, Rate Limiting & Data Lifecycle (fixes gaps #9, #14)

- **Rate limiting**: basic per-IP/per-user rate limiting on auth endpoints and any public-facing API route (even single-user products get credential-stuffed against if the login page is public) — Vercel Edge Middleware or Supabase's built-in Auth rate limits are sufficient; no need for a dedicated WAF.
- **Account deletion**: a documented, testable path — export everything (CSV+JSON, already required) → confirm → soft-delete all rows → hard-delete after a defined retention window (e.g., 30 days) → verify via the same disaster-recovery test methodology already required in Phase 23.
- **Service role key**: confirmed server-only (already stated in v2.0) — explicitly never present in any client bundle, browser extension, or Android APK. Extension/Android authenticate as the actual user via Supabase Auth (short-lived JWT), never via a shared service credential.
- **Extension/Android token handling**: tokens stored in extension's secure storage / Android EncryptedSharedPreferences, refreshed via standard OAuth/session-refresh flow, revocable from the dashboard's Settings → Sessions if a device is lost.

---

## Part G — Onboarding (new, fixes gap #11)

First-run flow, kept inside the existing "minimum manual input" philosophy:
1. Sign up / log in.
2. Pick exam(s): Banking, SSC, or both (pre-seeds shared taxonomy — already specified in Phase 1).
3. Set default daily target (e.g., 10 hours) and day-boundary offset if non-default.
4. Land directly on Home with **Start Study** as the single most prominent action — no forced tour, no empty-state walls of text. Empty heatmap/analytics states show a one-line explanation ("Data will appear here after your first session") rather than blank confusion.

---

## Part H — Notifications: Delivery Mechanism (fixes gap #12)

v2.0 lists *which* notifications are required (revision due, Sunday review, monthly review) but not *how* they reach the user. Recommendation:
- **In-app + browser push** (via the extension, since it's already installed and permission-bound) as the primary channel for a single-user, desktop-heavy workflow.
- **Android local notifications** via the companion app for revision-due and overdue alerts when away from the desktop.
- **Email** as a fallback only for the weekly/monthly review (less time-sensitive, worth a durable copy), not for daily nudges.
- No SMS, no third-party push service (OneSignal, etc.) needed at this scale — adds an external dependency for no real benefit in a single-user product.

---

## Part I — Suggested Additional Features (new — beyond v2.0's scope)

These are optional; each is scoped so it can slot into an existing phase or become its own phase without disrupting the build order in v2.0 §53.

1. **Adaptive revision scheduling (spaced repetition overlay).** Keep the fixed daily/weekly/monthly cadence as the default (v2.0 Phase 4), but let a topic's revision interval stretch or compress based on demonstrated recall — a lightweight SM-2-style algorithm using the existing "recall test" optional field as its input signal. Fully opt-in per user in Settings; the deterministic fixed-cadence system remains the fallback, honoring v2.0's "AI/adaptive logic is optional, deterministic analytics are mandatory" principle. *(Fits naturally into Phase 4 or Phase 22.)*
2. **Exam-proximity-weighted allocation.** When both Banking and SSC have known upcoming exam dates (`exams.exam_date`, a new column), the diagnosis/adaptive-planning engine (Phase 21–22) should factor "days remaining" into its suggested subject allocation, not just historical accuracy/time-share — the same weak-subject-neglect logic should weigh more heavily as an exam date approaches.
3. **Day annotations.** A lightweight `day_annotations` table (`user_id`, `date`, `tag` — e.g. `sick`, `travel`, `family`, `exam_day`, `custom`, `note`). Annotated days are visually distinguished on the heatmap (not blank, not a broken streak — a distinct color/pattern) and are **excludable from trend statistics** (e.g., "average daily study hours excluding annotated days") without ever deleting the underlying raw records. Directly serves the existing guardrail "do not punish missed aspirational targets as personal failure."
4. **"Past-you" comparison instead of external benchmarks.** Since v2.0 explicitly rejects becoming a social network, the natural motivational substitute is comparing the current week/month against the user's *own* best week/month (already partially covered by Phase 15 Personal Records) — surfaced more prominently on Home as "You vs. 4 weeks ago" rather than only living in a Records page.
5. **PYQ-frequency-weighted topic priority.** Beyond user-activity-derived weak/strong status (Phase 11/13), let the user (or a manually maintained reference table) tag each topic with a historical PYQ-frequency weight per exam, so the diagnosis engine can distinguish "weak but rarely tested" from "weak and heavily tested" — the latter is a much higher-priority fix. Manual entry only, consistent with the "no scraping" principle.
6. **Session annotations for context, not calculation.** A single optional free-text tag on a study block (e.g., "low energy," "distracted environment," "great focus") purely for the user's own qualitative pattern-spotting over time — explicitly not used in any accuracy/time calculation, just displayed alongside history on drill-down, to avoid violating the "no unnecessary note fields" anti-friction rule while still allowing optional context.
7. **Time-of-day performance view.** Since `study_sessions` already has full timestamps, a low-cost addition to Phase 13 analytics: accuracy/questions-per-hour broken down by time-of-day bucket (early morning / late morning / afternoon / evening / late night), to answer "am I actually sharper in the morning or do I just assume that."
8. **PDF export of weekly/monthly reports**, in addition to the required CSV/JSON, purely for offline reading (e.g., on a day with no laptop access) — low effort since the report content is already generated as structured data; render to PDF server-side using the same data.
9. **Break/fatigue nudge.** If a single `study_sessions` block exceeds a configurable threshold (e.g., 3 hours) without a pause, a soft, dismissible reminder — not a hard stop — consistent with "assist, not surveil."
10. **Command-palette-style quick entry** (desktop, e.g., `Cmd+K`) for question-batch and mock entry, since those are the two highest-frequency manual-entry actions in the whole system and the anti-friction spec already prioritizes speed here.

---

## Part J — Phase-by-Phase (all 23 phases retained, with rectification notes appended)

> Note: full original requirement lists from v2.0 are preserved below in condensed form; **"v3 additions"** under each phase are the only new content, so nothing from the original spec is lost.

### Phase 1 — Data Foundation & Tracking Stronghold
*(Supabase project, schema/migrations, Auth, RLS, Storage, dashboard shell, login, timer, timestamp storage, subject/topic/activity storage, 8h/10h targets, CSV/JSON export, save/sync state, retry/idempotency, seed Banking+SSC taxonomy)*
**v3 additions:** single-active-session invariant (§C); `profiles.day_boundary_offset_minutes` + `timezone` (§B); soft-delete columns (§D); basic accessibility pass (keyboard navigation + contrast) as a non-functional requirement, not deferred to a later phase; onboarding flow (§G).

### Phase 2 — Daily Planner & To-Do Accountability
*(Previous-night planning, task fields, status states, completion ratio, failure reason, quick duplicate/recurring, start-session-from-task, postponement analysis, plan-vs-execution diagnosis)*
**v3 additions:** validation — `due_date ≥ planned_date`; recurring tasks generate concrete rows (not a virtual recurrence resolved at read time), so a single instance can be corrected/skipped without affecting the series.

### Phase 3 — Study Time Analytics
*(Daily/weekly/monthly/yearly totals, target vs actual, block count, average block duration, subject/topic/activity allocation, questions/hour, active-practice ratio, historical capacity, trend vs previous period)*
**v3 additions:** time-of-day breakdown (New Feature #7); all aggregation queries use the day-boundary rule from §B, not calendar midnight.

### Phase 4 — Revision Engine
*(Daily/weekly/monthly cycles, link to source study event, due-date generation, deduplication, due/upcoming/overdue states, dashboard queue, calendar markers, one-click completion, next-cycle scheduling, adherence tracking, optional recall test)*
**v3 additions:** dedup enforced via the DB-level unique constraint in §C, not just application logic; optional adaptive-interval overlay (New Feature #1); grace-window validation (§E).

### Phase 5 — Calendar & Google Calendar
*(Dashboard month/week/day view, study/task/revision/mock markers, drill-down, one-way sync to Google Calendar, stable external event IDs, timezone correctness, update/delete policy, Supabase remains source of truth)*
**v3 additions:** timezone correctness explicitly ties to `profiles.timezone` (§B), not device-inferred timezone at sync time, to avoid drift if the user travels.

### Phase 6 — Question Practice Tracking
*(Batch logging, source, subject/topic/chapter, attempted/correct/wrong/skipped, accuracy, questions/hour, daily/weekly/monthly totals, aggregation, link to session, active-vs-passive comparison)*
**v3 additions:** full validation ruleset (§E); command-palette quick entry (New Feature #10).

### Phase 7 — Saved Question & Error Vault
*(Screenshot/photo capture via Supabase Storage, source/exam/subject/topic, error category, explanation, review count, next review date, search, filter, link to revision)*
**v3 additions:** Storage RLS policy explicitly scoped per user folder path (`{user_id}/...`), audited alongside the Phase 23 storage-policy audit.

### Phase 8 — Mock Test Data System
*(Sources: Testbook/Oliveboard/textbooks/PDFs/coaching/PYQs/other; required fields: source/exam/stage/name/date/max marks/score/attempted/correct/wrong/unattempted/actual duration; optional: percentile/rank/sections/topics/notes; manual entry baseline; provider adapter pattern for future official integrations)*
**v3 additions:** idempotency key on creation (§C) to survive retry-on-crash without duplicate mocks; full validation ruleset (§E).

### Phase 9 — Mock Speed + Accuracy Analytics
*(Accuracy = correct/attempted × 100; time gap = actual − recommended; classify accurate-but-slow / fast-but-inaccurate / balanced; do not treat lower time as automatically better)*
**v3 additions:** none structurally — this phase's logic in v2.0 is already sound; the four-case decision matrix from v2.0 §37 is retained verbatim in Part K below for traceability.

### Phase 10 — Cutoff & Safety Target System
*(Store historical cutoffs by exam/stage/year/category/max marks/cutoff/reference; historical cutoff gap; user-defined safety target; safety gap; explicit "benchmark not guarantee" labeling)*
**v3 additions:** validation `cutoff ≤ maximum_marks` (§E).

### Phase 11 — Syllabus & Coverage Intelligence
*(Subject → Topic → Chapter structure shared across Banking/SSC; status states not-started/learning/learned/revising/strong/weak; tracked signals: study time, question volume, accuracy, revision count, mock exposure, last studied/revised, coverage)*
**v3 additions:** topic merge/versioning strategy (§D); optional PYQ-frequency weighting (New Feature #5).

### Phase 12 — GitHub-Style Heatmaps
*(Core visualization; primary metric study hours; switchable to tasks/questions/revisions/mocks; yearly grid, exact value on hover/tap, click-to-drill-down, monthly context, streak, distinguish zero from missing telemetry, aggregate from persisted records)*
**v3 additions:** annotated days render as a visually distinct cell state (New Feature #3), not indistinguishable from a genuine zero-effort day; aggregation respects day-boundary offset (§B).

### Phase 13 — Subject & Topic Performance Dashboard
*(Per-subject: time, share of total, questions, accuracy, mock score/speed, revision adherence, trend; per-topic: sample size, accuracy, study time, revision state, mock evidence, last studied/revised; over-investment/neglect diagnostic examples)*
**v3 additions:** time-of-day performance view (New Feature #7); "past-you" comparison surfaced here and on Home (New Feature #4).

### Phase 14 — Task & Planning Analytics
*(Completion rate, overdue rate, postponement, failure reasons, estimated vs actual time, completion by subject/weekday, repeated failures, planning capacity; distinguish execution failure from unrealistic planning)*
**v3 additions:** none structural — v2.0's framing here is already precise; retained as-is.

### Phase 15 — Personal Records & Milestones
*(Highest mock score, best accuracy, fastest acceptable-accuracy mock, best sectional score, highest question-volume day/week/month, best study streak, best task completion, best revision adherence, first cutoff/safety-target crossing)*
**v3 additions:** streaks computed with the day-boundary rule (§B) so a late-night session doesn't spuriously break or extend a streak.

### Phase 16 — Browser Focus Tracking
*(MV3 extension; detect active tab/domain during a session; associate with focus session; optional URL/title capture; detect tab/domain changes; user-defined study/distraction domains; interruption + distraction-duration recording; soft return-to-study intervention; YouTube-type domains must be configurable, not hardcoded distraction; no full HTML scraping by default)*
**v3 additions:** explicit degraded-mode behavior if the user denies the tabs/host permission at install — the study timer must continue to function normally with browser telemetry simply absent (shown as "not available" on the dashboard, never as zero distraction, consistent with v2.0's own guardrail about missing telemetry).

### Phase 17 — Android Companion & Social-Wellbeing Signals
*(Kotlin + Jetpack; permission-gated configured-app-usage detection during focus sessions; user-chosen distracting apps/categories; interruption events; aggregate distraction duration; optional overlay/alert; sync study mode with Study OS; explicitly focus telemetry not surveillance; platform restrictions may prevent perfect telemetry)*
**v3 additions:** token handling via EncryptedSharedPreferences (§F); explicit statement that missing Android telemetry (common given OEM background restrictions) must never be interpreted as "focused" in any diagnostic copy, extending the same guardrail already stated for browser telemetry.

### Phase 18 — Daily Report
*(Compact: target vs actual, blocks, tasks planned/completed, questions/accuracy, revisions due/completed/missed, mock result, cutoff/safety gap, focus interruptions where available, notable issues, carry-forward items)*
**v3 additions:** delivery channel clarified in §H.

### Phase 19 — Weekly Report & Sunday Review
*(Full tactical review: hours vs target, week-over-week comparison, task completion, planning behavior, question volume, accuracy trend, revision adherence/backlog, mock score/accuracy/time trends, subject allocation, topic weaknesses, cutoff/safety gaps, error categories, browser/phone distraction, over-studied/neglected subjects, three next-week priorities)*
**v3 additions:** annotated days (New Feature #3) excluded from trend deltas by default, with a toggle to include them if the user wants the raw picture.

### Phase 20 — Monthly Strategic Report
*(Effort-vs-performance translation across study hours, capacity, question volume, accuracy, revision adherence, mock marks/speed/accuracy, syllabus coverage, weak-topic improvement, time-allocation balance, cutoff/safety trend, planning realism, focus interruption trend; best/worst weeks; what worked/failed; three next-month priorities)*
**v3 additions:** exam-proximity weighting (New Feature #2) folded into the "should strategy change" narrative once an exam date is within a configurable horizon (e.g., 60 days).

### Phase 21 — Intelligence & Diagnosis Engine
*(Pattern detection: hours-up-but-performance-flat, questions-up-but-accuracy-down, growing revision backlog, weak topic with adequate sample size, allocation imbalance, slow-but-accurate/fast-but-inaccurate mocks, repeated task failure, widening cutoff/safety gap, rising distraction; every recommendation must show evidence)*
**v3 additions:** none structural — the evidence-first requirement in v2.0 is already the correct design; retained verbatim.

### Phase 22 — Adaptive Planning & Exam Readiness
*(Recommends realistic daily capacity, subject allocation, weak/high-value topics, revision workload, question volume, timed practice, mock frequency; optional transparent readiness index built from visible weighted components; index is decision support only, never a silent plan change; proposed plans always editable)*
**v3 additions:** exam-proximity weighting (New Feature #2) and adaptive revision intervals (New Feature #1) both plug in here as optional, visible, editable inputs — never silently overriding the deterministic Phase 4 baseline.

### Phase 23 — Reliability, Backup, Security & Disaster Recovery
*(Supabase backups, Git migrations, automated CSV/JSON export, restore testing, RLS/auth/storage-policy audits, duplicate-write tests, network-failure tests, direct-recovery documentation, fresh-frontend reconstruction test)*
**v3 additions:** account-deletion lifecycle test (§F); rate-limiting verification on auth/public endpoints (§F); explicit test that a topic-merge (§D) does not corrupt historical analytics.

---

## Part K — Retained Reference Material (unchanged from v2.0, kept here for completeness)

**Mock decision matrix (v2.0 §37):**

| Case | Marks | Accuracy | Time | Diagnosis | Action |
|---|---|---|---|---|---|
| A | High | High | Slow | Speed bottleneck | Timed practice |
| B | High | Low | Fast | Rushing/guessing risk | Accuracy/selection discipline |
| C | Low | Low | Slow | Knowledge + speed issue | Concept/revision/practice foundation |
| D | Low | High | Slow | Insufficient attempt volume under time | Speed/attempt strategy |

**Metric dictionary (v2.0 §44)** — retained in full: study duration = end − start − pauses; accuracy = correct ÷ attempted × 100; attempt rate = attempted ÷ available × 100; questions/hour = attempted ÷ active practice hours; task completion = completed ÷ planned × 100; revision adherence = completed due ÷ due × 100; time gap = actual − recommended; cutoff gap = score − historical cutoff; safety gap = score − safety target; allocation = subject/topic time ÷ total tracked time; active-practice ratio = (practice + revision) ÷ total study time.

**Analytical guardrails (v2.0 §45)** — retained in full and treated as load-bearing product principles, not soft suggestions: hours ≠ mastery; questions ≠ learning if accuracy falls; speed ≠ improvement if accuracy collapses; historical cutoffs are benchmarks; small samples must not trigger strong conclusions; one bad/good mock must not flip a topic's status; missing focus telemetry ≠ zero distraction; readiness index is decision support, not a selection prediction; recommendations must show evidence; sample size must be visible wherever topic-level accuracy is shown.

**Final product principles (v2.0 §56)** — retained in full, unchanged.

**Ultimate test (v2.0)** — unchanged: if the user studies more effectively because Study OS tells them what to do next, spends almost no time maintaining it, and the entire history survives the dashboard disappearing, the product is doing its job.

---

## Part L — End-to-End Walkthrough: How Every Feature Connects

The original v2.0 "Canonical Full-Day Scenario" is retained and extended below into a multi-week narrative that actually exercises every phase and every v3 addition/new feature — not just the happy path. Read this as the connective tissue between phases, not a new feature list.

### L.1 — System data-flow map (what feeds what)

```
study_sessions (Phase 1) ──┬──> question_batches (Phase 6) ──> accuracy/questions-hour (Phase 3, 13)
                            ├──> focus_sessions/browser_events/phone_events (Phase 16-17) ──> distraction stats (Phase 19)
                            └──> revisions (Phase 4) ──> due/overdue queue (Home) ──> revision adherence (Phase 13, 19, 20)

tasks (Phase 2) ──> task_events ──> planning analytics (Phase 14) ──> Sunday review (Phase 19)

mocks + mock_sections + mock_topic_results (Phase 8) ──> speed/accuracy classification (Phase 9)
   ──> cutoff_gap / safety_gap (Phase 10) ──> readiness index inputs (Phase 22)

syllabus/topics (Phase 11) ──> weak/strong status ──> subject/topic dashboard (Phase 13)
   ──> diagnosis engine evidence (Phase 21) ──> adaptive planning suggestions (Phase 22)

ALL of the above ──> daily aggregates ──> heatmap (Phase 12) ──> reports (Phase 18-20) ──> exports (Part D/§48)
day_annotations (New Feature #3) ──> excluded from trend deltas in reports, shown distinctly on heatmap
exams.exam_date (New Feature #2) ──> proximity weight ──> diagnosis engine + adaptive planning
```

Nothing in Phase 12+ computes anything new — every chart, heatmap, and report is a *view* over the same raw rows from Phases 1–11. This is the practical meaning of "raw facts before derived opinions": if you can trace a number in a report back to a specific row in `study_sessions`/`question_batches`/`mocks`, the system is working correctly.

### L.2 — Week 1, Monday: an ordinary day (baseline flow)

- **Night before:** sets a 10-hour target, creates 8 tasks across Quant/English/Reasoning/GS, day-boundary is default (midnight).
- **Morning (Home):** sees 0/10 hours, 0/8 tasks, today's daily revision (Percentage), this week's weekly revision (Number System), heatmap, no warnings.
- **9:00 AM:** clicks Start Study from the "Quant – Percentage – DPP" task → `study_sessions` row opens, subject/topic/activity inherited from the task, extension detects the study context and starts tab monitoring, Android companion syncs focus mode.
- **10:00 AM:** stops timer → logs a question batch (50 attempted / 42 correct / 8 wrong) → system computes 84% accuracy, updates questions/hour for Quant, updates today's KPI strip.
- **Mid-morning:** opens a distracting site briefly; the extension records an interruption + duration against the active `focus_session`, shows a soft return-to-study prompt (not a hard block). Android stays quiet — phone was face-down.
- **Afternoon:** 2-hour Ratio lecture, no question logging (activity type = lecture, correctly excluded from active-practice ratio).
- **Revision panel:** completes the daily Percentage revision (one click) → `revisions` row marked complete → next daily cycle scheduled → adherence stat updates.
- **Evening mock:** enters a Testbook mock (72/100, 82% accuracy, 54 min actual vs 45 min recommended) → time gap +9 min, cutoff gap +4 (cutoff 68), safety gap −3 (safety target 75) → classified Case A (accurate but slow) from the decision matrix → surfaced as "timed practice" suggestion, with the evidence (this mock's numbers) attached, not a generic tip.
- **7 of 8 tasks completed** → 87.5% completion, one task auto-flagged for postponement analysis (this is its 3rd postponement — Phase 14 pattern).
- **Daily report** (delivered in-app + browser push per §H): compact summary of all of the above, no manual calculation required.
- **All writes** carried a `client_generated_id`; the question-batch entry was retried once automatically after a flaky connection and did not duplicate, because of the idempotency constraint from §C.

### L.3 — Week 1, Wednesday: a session that crosses the day boundary (exercises §B)

- User studies from 11:40 PM to 1:10 AM. With the default day-boundary (midnight), this would previously have split one session's stats across two calendar days on the heatmap. With `day_boundary_offset_minutes` left at default (0) the user actually *wants* this split behavior — but suppose they'd set the offset to 180 (day ends 3 AM): the entire session, and any question batch logged during it, is now correctly bucketed into Wednesday's heatmap cell and Wednesday's daily report, not smeared across two days. The Sunday weekly report's "study hours by day" chart reflects the single correct bucket either way, because it reads from the same day-boundary-aware aggregate the daily report used — one calculation, reused everywhere (per the LLM rules' calculation-correctness principle).

### L.4 — Week 1, Friday: a sick day (exercises Feature #3, day annotations)

- User is unwell, studies 45 minutes instead of a planned 10 hours, completes 1 of 8 tasks.
- Instead of leaving this to distort the week, the user annotates the day: `tag = sick`.
- **Heatmap:** Friday's cell renders in a distinct "annotated" pattern, not the same visual as a genuine zero-effort day — someone scanning the yearly grid can tell the difference between "skipped" and "was sick" at a glance.
- **Sunday review:** the week's average-hours and task-completion trend lines are computed twice under the hood — "including all days" and "excluding annotated days" — and the report leads with the excluding-annotated-days number by default (with a toggle to see the raw version), so one bad day doesn't read as a collapse in the week-over-week trend. The raw session/task rows for Friday are untouched in the database; only the trend *aggregation* treats the day differently.

### L.5 — Week 2, Tuesday: three clients racing (exercises §C conflict resolution)

- User starts a session from the dashboard at 9:00 AM.
- At 9:02 AM, still logged in on their laptop's browser extension from yesterday, they absentmindedly click "Start" again from a leftover extension popup.
- **Resolution:** the extension's start request hits the same single-active-session invariant (partial unique index on `user_id where end_timestamp is null`) — the write is rejected/short-circuited, and the extension instead resumes reporting focus telemetry against the *existing* open session rather than creating a second one. The user never sees a duplicate session or a confusing "which one is real" state.
- Meanwhile the Android companion, on the same study block, independently logs phone-distraction events tagged `source_client = android` against that one open session — this is fine and expected, since browser and phone telemetry are additive, not conflicting, per §C.

### L.6 — Week 3: a topic gets merged (exercises §D)

- Reviewing the syllabus page, the user realizes "Ratio" and "Ratio & Proportion" were created as two separate topics early on and should be one.
- They merge "Ratio" into "Ratio & Proportion." The losing topic (`Ratio`) is archived (`archived_at` set), not deleted; a `topic_aliases` row records the merge. All of the last three weeks' `study_sessions`, `question_batches`, and `revisions` that reference the old `Ratio` topic id keep pointing at it — nothing is silently rewritten.
- The subject/topic dashboard (Phase 13) and diagnosis engine (Phase 21) are updated to *optionally* roll old-topic data into the new topic's view via the alias table, so the user sees one unified "Ratio & Proportion" history going forward without their pre-merge analytics quietly changing shape underneath them.

### L.7 — Week 4: adaptive revision diverges from the fixed cadence (exercises New Feature #1)

- "Percentage" has been revised daily for 3 weeks with consistently high self-reported recall (optional recall-test field).
- With the adaptive overlay enabled in Settings, the *next* due date for Percentage stretches from "tomorrow" to "in 4 days" instead — visibly labeled as an adaptive interval, not silently hidden. The fixed-cadence system is still what generated the original schedule; the adaptive layer only adjusts the interval, and the user can turn it off at any time and fall back to the deterministic daily/weekly/monthly cadence with zero data loss, since both systems read/write the same `revisions` table.
- Meanwhile "Number System," which the user keeps failing to recall, gets its interval compressed instead of stretched — same mechanism, opposite direction, still fully visible and overridable.

### L.8 — Week 6: SSC Tier 1 is now 25 days away (exercises New Feature #2)

- The user set `exams.exam_date` for SSC Tier 1 back in onboarding. As the 60-day proximity threshold is crossed, the adaptive-planning engine's suggested allocation starts weighting SSC-specific weak topics more heavily than it would purely from historical time-share/accuracy data alone — this shows up in the monthly report's "should strategy change" section (Phase 20) with the exam-countdown explicitly cited as part of the evidence, and in Phase 22's readiness-index breakdown as one of its visible, weighted components. It never silently rewrites the user's existing task list — it's a suggestion the user reviews and edits, per the "proposed plans are always editable" rule.

### L.9 — End of month: monthly report, export, and disaster-recovery check

- Monthly report (Phase 20) synthesizes everything above: did the sick day and the topic merge distort anything (no — both were handled without corrupting raw data), did the adaptive revision changes correlate with better recall on mocks (shown, with evidence), did the SSC proximity weighting shift allocation as intended (shown).
- User runs a CSV + JSON export (Phase 1/48) and, separately, a PDF export of the monthly report (New Feature #8) to read offline that evening.
- As part of the routine Phase 23 discipline, a fresh-frontend reconstruction test is run against the same Supabase project: every session, task, revision (including the merged-topic history), mock, and annotation from the last month reconstructs correctly from raw tables alone — confirming the dashboard really is replaceable and the database really is the permanent record.

### L.10 — Feature interaction reference table

| Feature/fix | Depends on | Feeds into |
|---|---|---|
| Day-boundary offset (§B) | `profiles` settings | Heatmap, daily/weekly reports, streaks, revision due-dates |
| Single-active-session invariant (§C) | `study_sessions` schema | Timer UX across all 3 clients, focus telemetry attribution |
| Topic merge/versioning (§D) | `topics`, `topic_aliases` | Syllabus dashboard, diagnosis engine, historical report integrity |
| Day annotations (Feature #3) | `day_annotations` table | Heatmap rendering, weekly/monthly trend deltas |
| Adaptive revision (Feature #1) | Recall-test field, `revisions` table | Revision queue, adherence stats, monthly "did strategy work" analysis |
| Exam-proximity weighting (Feature #2) | `exams.exam_date` | Diagnosis engine, adaptive planning, monthly report narrative |
| Idempotency keys (§C/§F) | Every writable table | All multi-client sync, disaster-recovery duplicate-write tests |
| PDF export (Feature #8) | Weekly/monthly report generation | Offline reading only — no new data dependency |

