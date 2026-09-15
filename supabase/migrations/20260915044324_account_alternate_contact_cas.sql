create schema account_contact_private;
revoke all on schema account_contact_private from public, anon, authenticated, service_role;
grant usage on schema account_contact_private to authenticated;

create table public.account_contact_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alternate_email text,
  alternate_phone text,
  revision bigint not null default 0 check (revision >= 0)
);
alter table public.account_contact_settings enable row level security;
revoke all on public.account_contact_settings from public, anon, authenticated, service_role;
grant select on public.account_contact_settings to authenticated;
grant select on public.account_contact_settings to service_role;
create policy account_contacts_read_self on public.account_contact_settings
  for select to authenticated using (user_id = (select auth.uid()));

-- Copy only non-security contact values. Never update auth.users or profile data.
insert into public.account_contact_settings(user_id,alternate_email,alternate_phone)
select id,
  case when jsonb_typeof(raw_user_meta_data->'alternate_email')='string' then raw_user_meta_data->>'alternate_email' end,
  case when jsonb_typeof(raw_user_meta_data->'alternate_phone')='string' then raw_user_meta_data->>'alternate_phone' end
from auth.users;

-- The private definer is the sole write boundary, necessary because direct DML
-- would bypass the expected revision. No user ID can be supplied by the caller.
create function account_contact_private.save_settings(p_email text,p_phone text,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_row public.account_contact_settings%rowtype;
  v_email text := nullif(lower(btrim(p_email)),''); v_phone text := nullif(btrim(p_phone),'');
begin
  if v_actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision > 9007199254740991
    or (v_email is not null and (length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    or (v_phone is not null and v_phone !~ '^\+[0-9]{7,15}$') then
    raise exception 'Invalid contact values' using errcode='22023';
  end if;
  if p_expected_revision <> 0 and not exists(select 1 from public.account_contact_settings where user_id=v_actor) then
    return jsonb_build_object('ok',false,'conflict',jsonb_build_object('email',null,'phone',null,'revision',0));
  end if;
  insert into public.account_contact_settings(user_id) values(v_actor) on conflict(user_id) do nothing;
  select * into strict v_row from public.account_contact_settings where user_id=v_actor for update;
  if v_row.revision <> p_expected_revision then
    if v_row.alternate_email is not distinct from v_email and v_row.alternate_phone is not distinct from v_phone then
      return jsonb_build_object('ok',true,'email',v_row.alternate_email,'phone',v_row.alternate_phone,'revision',v_row.revision);
    end if;
    return jsonb_build_object('ok',false,'conflict',jsonb_build_object('email',v_row.alternate_email,'phone',v_row.alternate_phone,'revision',v_row.revision));
  end if;
  if v_row.alternate_email is distinct from v_email or v_row.alternate_phone is distinct from v_phone then
    update public.account_contact_settings set alternate_email=v_email,alternate_phone=v_phone,revision=revision+1
      where user_id=v_actor returning * into v_row;
  end if;
  return jsonb_build_object('ok',true,'email',v_row.alternate_email,'phone',v_row.alternate_phone,'revision',v_row.revision);
end;
$$;
revoke all on function account_contact_private.save_settings(text,text,bigint) from public,anon,authenticated,service_role;
grant execute on function account_contact_private.save_settings(text,text,bigint) to authenticated;

create function public.save_account_contacts(p_email text,p_phone text,p_expected_revision bigint)
returns jsonb language sql security invoker set search_path='' as $$
  select account_contact_private.save_settings(p_email,p_phone,p_expected_revision);
$$;
revoke all on function public.save_account_contacts(text,text,bigint) from public,anon,authenticated,service_role;
grant execute on function public.save_account_contacts(text,text,bigint) to authenticated;
