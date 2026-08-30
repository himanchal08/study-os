alter table "public"."tasks" add column if not exists "google_task_id" text;
alter table "public"."tasks" add column if not exists "google_event_id" text;
