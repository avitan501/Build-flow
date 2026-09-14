set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$declare r jsonb;d jsonb;begin
 r:=request_carlos_payroll(array['2026-09-12'::date],'00000000-0000-0000-0000-000000000010');
 if (r->>'totalCents')::integer<>500 then raise exception 'breaks not excluded';end if;
 if request_carlos_payroll(array['2026-09-12'::date],'00000000-0000-0000-0000-000000000010')<>r then raise exception 'retry not idempotent';end if;
 d:=carlos_payroll_days()->0;
 if d->>'paidAt' is not null or d->>'requestedAt' is null then raise exception 'request marked paid';end if;
 begin perform request_carlos_payroll(array['2026-09-12'::date],'00000000-0000-0000-0000-000000000011');raise exception 'duplicate request accepted';exception when others then if sqlerrm<>'day_already_requested' then raise;end if;end;
 begin perform set_carlos_day_paid('2026-09-12',true,1);raise exception 'Carlos marked paid';exception when insufficient_privilege then null;end;
 begin perform set_carlos_day_paid('2026-09-12',false,1);raise exception 'Carlos marked unpaid';exception when insufficient_privilege then null;end;
 begin update manager_goals set details=replace(details,'"paidAt":null','"paidAt":"2026-09-14"');raise exception 'direct paid forged';exception when others then if sqlerrm<>'use_attendance_payroll_actions' then raise;end if;end;
 begin update manager_goals set details=replace(details,'1800000','0');raise exception 'direct time forged';exception when others then if sqlerrm<>'use_attendance_payroll_actions' then raise;end if;end;
 update manager_goals set details=replace(details,'"Work"','"Updated work notes"');
 perform record_carlos_attendance((now() at time zone 'America/New_York')::date,'check_in');
 perform record_carlos_attendance((now() at time zone 'America/New_York')::date,'check_in');
 if (select count(*) from manager_goals where title='Daily summary - '||(now() at time zone 'America/New_York')::date::text)<>1 then raise exception 'duplicate clock in';end if;
end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$begin begin perform set_carlos_day_paid('2026-09-12',true,1);raise exception 'other admin allowed';exception when insufficient_privilege then null;end;end $$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select set_carlos_day_paid('2026-09-12',true,1);
do $$begin
 if not exists(select 1 from jsonb_array_elements(carlos_payroll_days()) d where d->>'date'='2026-09-12' and d->>'paidAt' is not null) then raise exception 'owner paid not persisted';end if;
 begin perform set_carlos_day_paid('2026-09-12',false,1);raise exception 'stale owner update accepted';exception when others then if sqlerrm<>'payroll_changed' then raise;end if;end;
end $$;
select set_carlos_day_paid('2026-09-12',false,2);
reset role;
do $$begin
 if (select count(*) from private.carlos_payroll_requests)<>1 then raise exception 'duplicate ledger request';end if;
 if (select count(*) from private.carlos_payroll_events)<>2 then raise exception 'audit missing';end if;
 if exists(select 1 from private.carlos_payroll_days where paid_at is not null or requested_at is not null) then raise exception 'owner unpaid not persisted';end if;
end $$;
select 'payroll role, pause, persistence, retry and stale update checks passed';
