create or replace function public.mark_aura_conversation_read(
  p_phone text default null,
  p_email text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not (
    (select private.is_admin())
    or (select private.has_staff_capability('customers'))
  ) then
    raise exception 'Customer communication access is required.';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is null
     and nullif(trim(coalesce(p_email, '')), '') is null then
    raise exception 'Choose a valid conversation.';
  end if;

  update public.aura_communications
  set read_at = now()
  where direction = 'incoming'
    and read_at is null
    and (
      (
        nullif(trim(coalesce(p_phone, '')), '') is not null
        and counterparty_phone = trim(p_phone)
      )
      or (
        nullif(trim(coalesce(p_email, '')), '') is not null
        and lower(trim(coalesce(counterparty_email, ''))) = lower(trim(p_email))
      )
    );

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke all on function public.mark_aura_conversation_read(text, text)
  from public, anon;
grant execute on function public.mark_aura_conversation_read(text, text)
  to authenticated, service_role;

comment on function public.mark_aura_conversation_read(text, text) is
  'Marks incoming messages in one manager-accessible conversation as read without exposing table update access.';
