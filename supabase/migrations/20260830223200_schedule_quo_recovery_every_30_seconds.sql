-- Quo sometimes delivers signed webhooks late. Run the bounded, leased
-- recovery worker twice per minute so a missed webhook waits at most one
-- shorter recovery interval. The scheduled command contains no credential.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'dispatch-quo-fast-poll'
  limit 1;

  if existing_job is null then
    perform cron.schedule(
      'dispatch-quo-fast-poll',
      '30 seconds',
      'select public.dispatch_quo_fast_poll();'
    );
  else
    perform cron.alter_job(
      job_id := existing_job,
      schedule := '30 seconds',
      active := true
    );
  end if;
end;
$$;
