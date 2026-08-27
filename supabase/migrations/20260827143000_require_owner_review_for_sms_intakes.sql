do $$
begin
  if to_regprocedure('public.confirm_aura_intake_impl(uuid,uuid)') is null then
    alter function public.confirm_aura_intake(uuid, uuid) rename to confirm_aura_intake_impl;
  end if;
end;
$$;

create or replace function public.confirm_aura_intake(
  p_intake_id uuid,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intake public.aura_intakes%rowtype;
begin
  select * into v_intake
  from public.aura_intakes
  where id = p_intake_id;

  if not found then
    raise exception 'Aura intake not found.' using errcode = 'P0002';
  end if;

  if v_intake.source = 'sms' and p_actor_user_id is null then
    insert into public.aura_audit_log (intake_id, actor_user_id, action, details)
    select v_intake.id, null, 'sms_command_received', jsonb_build_object('reviewRequired', true)
    where not exists (
      select 1
      from public.aura_audit_log
      where intake_id = v_intake.id and action = 'sms_command_received'
    );

    return jsonb_build_object(
      'ok', true,
      'reviewRequired', true,
      'intakeId', v_intake.id,
      'status', v_intake.status
    );
  end if;

  return public.confirm_aura_intake_impl(p_intake_id, p_actor_user_id);
end;
$$;

revoke all on function public.confirm_aura_intake(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_aura_intake(uuid, uuid) to service_role;
