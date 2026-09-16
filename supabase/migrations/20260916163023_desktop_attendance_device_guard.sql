-- Device classification only, not device attestation. No time/pay data changes.
create function private.attendance_computer_request(h jsonb) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(
  coalesce(h->>'x-avantia-attendance-mobile',h->>'sec-ch-ua-mobile','?0') <> '?1'
  and left(coalesce(h->>'x-avantia-attendance-user-agent',h->>'user-agent',''),1024)
    !~* '(android|iphone|ipad|ipod|mobile|tablet|silk|kindle|playbook|blackberry|bb10|iemobile|opera mini)'
  and left(coalesce(h->>'x-avantia-attendance-user-agent',h->>'user-agent',''),1024)
    ~* '(windows nt|macintosh|x11|cros|linux (x86_64|i[3-6]86|aarch64))'
  and not (coalesce(h->>'x-avantia-attendance-user-agent',h->>'user-agent','') ~* 'macintosh'
    and coalesce(h->>'x-avantia-attendance-touch','0') !~ '^(0|1)(\.0+)?$'), false)
$$;
revoke all on function private.attendance_computer_request(jsonb) from public,anon,authenticated;

-- Preserve the existing authoritative attendance state machine verbatim.
-- Fail closed if another workstream has changed it since review.
do $migration$
declare definition text; anchor text := 'perform pg_advisory_xact_lock(7140914);';
begin
 definition := pg_get_functiondef('public.record_carlos_attendance(date,text,text,text,text)'::regprocedure);
 if md5(definition) <> 'f2cdb20180a3c5734bcf81ab9754c752' then
  raise exception 'attendance_function_changed_review_required';
 end if;
 execute replace(definition,anchor,$guard$
 if p_action in ('check_in','check_out') and not private.attendance_computer_request(
   coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb
 ) then raise exception 'attendance_computer_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(7140914);
 $guard$);
end $migration$;
