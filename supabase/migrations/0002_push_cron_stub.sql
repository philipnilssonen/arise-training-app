-- ARISE — pg_cron stub for the push pipeline (Brief A)
--
-- This is deliberately a stub: it proves the end-to-end chain (cron -> Edge
-- Function -> web push -> phone) works. Real trigger conditions (T1-T4, K1-K2,
-- L1-L3, B1-B4) are built in Brief B and will replace/extend this job.
--
-- Run once, after enabling the pg_cron and pg_net extensions
-- (Database -> Extensions in the Supabase dashboard, or via SQL below).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Replace <PHILIP_PROFILE_ID> with the real profiles.id, e.g.:
--   select id, display_name from profiles;
select cron.schedule(
  'arise-push-hourly-stub',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://tdzdeljxuhghrfobtbti.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkemRlbGp4dWhnaHJmb2J0YnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5OTY1NzQsImV4cCI6MjEwMTU3MjU3NH0.WMH6cV3gskppDU0FIVXMCzkOAOUUcWduxn8FpxHievI'
    ),
    body := jsonb_build_object(
      'profile_id', '<PHILIP_PROFILE_ID>',
      'title', 'ARISE — Cron alive',
      'body', 'Hourly pipeline stub reached your phone.',
      'tag', 'cron-stub'
    )
  );
  $$
);

-- To inspect scheduled jobs:      select * from cron.job;
-- To inspect run history:         select * from cron.job_run_details order by start_time desc limit 20;
-- To remove this stub later:      select cron.unschedule('arise-push-hourly-stub');
