create table if not exists public.aura_intakes (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'whatsapp' check (source in ('whatsapp', 'manual', 'email')),
  external_message_id text,
  sender_phone text not null,
  message_type text not null default 'text',
  message_text text,
  raw_payload jsonb not null default '{}'::jsonb,
  proposal jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'needs_follow_up', 'confirmed', 'cancelled', 'failed')),
  confirmation_code text not null,
  ai_model text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null
);

create unique index if not exists aura_intakes_external_message_id_uidx
  on public.aura_intakes(external_message_id)
  where external_message_id is not null;
create unique index if not exists aura_intakes_confirmation_code_uidx
  on public.aura_intakes(confirmation_code);
create index if not exists aura_intakes_status_created_at_idx
  on public.aura_intakes(status, created_at desc);
create index if not exists aura_intakes_sender_phone_idx
  on public.aura_intakes(sender_phone, created_at desc);

create table if not exists public.aura_contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  normalized_phone text,
  email text,
  company text,
  notes text,
  source_intake_id uuid references public.aura_intakes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists aura_contacts_normalized_phone_uidx
  on public.aura_contacts(normalized_phone)
  where normalized_phone is not null;
create unique index if not exists aura_contacts_email_uidx
  on public.aura_contacts(lower(email))
  where email is not null;

create table if not exists public.aura_leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.aura_contacts(id) on delete set null,
  title text not null,
  description text,
  location text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  source_intake_id uuid references public.aura_intakes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists aura_leads_source_intake_id_uidx
  on public.aura_leads(source_intake_id)
  where source_intake_id is not null;
create index if not exists aura_leads_status_created_at_idx
  on public.aura_leads(status, created_at desc);

create table if not exists public.aura_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.aura_contacts(id) on delete set null,
  lead_id uuid references public.aura_leads(id) on delete set null,
  title text not null,
  notes text,
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  source_intake_id uuid references public.aura_intakes(id) on delete set null,
  source_item_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists aura_tasks_source_item_key_uidx
  on public.aura_tasks(source_item_key)
  where source_item_key is not null;
create index if not exists aura_tasks_status_due_at_idx
  on public.aura_tasks(status, due_at nulls last);

create table if not exists public.aura_audit_log (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid references public.aura_intakes(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aura_audit_log_intake_created_at_idx
  on public.aura_audit_log(intake_id, created_at desc);

create or replace function public.set_aura_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_aura_intakes_updated_at on public.aura_intakes;
create trigger set_aura_intakes_updated_at
before update on public.aura_intakes
for each row execute function public.set_aura_updated_at();

drop trigger if exists set_aura_contacts_updated_at on public.aura_contacts;
create trigger set_aura_contacts_updated_at
before update on public.aura_contacts
for each row execute function public.set_aura_updated_at();

drop trigger if exists set_aura_leads_updated_at on public.aura_leads;
create trigger set_aura_leads_updated_at
before update on public.aura_leads
for each row execute function public.set_aura_updated_at();

drop trigger if exists set_aura_tasks_updated_at on public.aura_tasks;
create trigger set_aura_tasks_updated_at
before update on public.aura_tasks
for each row execute function public.set_aura_updated_at();

alter table public.aura_intakes enable row level security;
alter table public.aura_contacts enable row level security;
alter table public.aura_leads enable row level security;
alter table public.aura_tasks enable row level security;
alter table public.aura_audit_log enable row level security;

revoke all on table public.aura_intakes from anon, authenticated;
revoke all on table public.aura_contacts from anon, authenticated;
revoke all on table public.aura_leads from anon, authenticated;
revoke all on table public.aura_tasks from anon, authenticated;
revoke all on table public.aura_audit_log from anon, authenticated;

grant select on table public.aura_intakes to authenticated;
grant select on table public.aura_contacts to authenticated;
grant select on table public.aura_leads to authenticated;
grant select on table public.aura_tasks to authenticated;
grant select on table public.aura_audit_log to authenticated;

grant all on table public.aura_intakes to service_role;
grant all on table public.aura_contacts to service_role;
grant all on table public.aura_leads to service_role;
grant all on table public.aura_tasks to service_role;
grant all on table public.aura_audit_log to service_role;

drop policy if exists "aura_intakes_owner_read" on public.aura_intakes;
create policy "aura_intakes_owner_read"
on public.aura_intakes for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and (
        lower(email) in ('avitanneto@gmail.com', 'info@fivetownsbuilders.com')
        or regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = '13475675077'
      )
  )
);

drop policy if exists "aura_contacts_owner_read" on public.aura_contacts;
create policy "aura_contacts_owner_read"
on public.aura_contacts for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and (
        lower(email) in ('avitanneto@gmail.com', 'info@fivetownsbuilders.com')
        or regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = '13475675077'
      )
  )
);

drop policy if exists "aura_leads_owner_read" on public.aura_leads;
create policy "aura_leads_owner_read"
on public.aura_leads for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and (
        lower(email) in ('avitanneto@gmail.com', 'info@fivetownsbuilders.com')
        or regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = '13475675077'
      )
  )
);

drop policy if exists "aura_tasks_owner_read" on public.aura_tasks;
create policy "aura_tasks_owner_read"
on public.aura_tasks for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and (
        lower(email) in ('avitanneto@gmail.com', 'info@fivetownsbuilders.com')
        or regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = '13475675077'
      )
  )
);

drop policy if exists "aura_audit_owner_read" on public.aura_audit_log;
create policy "aura_audit_owner_read"
on public.aura_audit_log for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and (
        lower(email) in ('avitanneto@gmail.com', 'info@fivetownsbuilders.com')
        or regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = '13475675077'
      )
  )
);

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
  v_contact jsonb;
  v_lead jsonb;
  v_task jsonb;
  v_contact_id uuid;
  v_lead_id uuid;
  v_task_id uuid;
  v_task_count integer := 0;
  v_phone text;
  v_email text;
  v_due_at timestamptz;
  v_ordinality bigint;
begin
  select * into v_intake
  from public.aura_intakes
  where id = p_intake_id
  for update;

  if not found then
    raise exception 'Aura intake not found.' using errcode = 'P0002';
  end if;

  if v_intake.status = 'confirmed' then
    return jsonb_build_object('ok', true, 'alreadyConfirmed', true, 'intakeId', v_intake.id);
  end if;

  if v_intake.status not in ('pending', 'needs_follow_up') then
    raise exception 'Aura intake cannot be confirmed from status %.', v_intake.status using errcode = 'P0001';
  end if;

  v_contact := v_intake.proposal -> 'contact';
  if v_contact is not null and jsonb_typeof(v_contact) = 'object' then
    v_phone := nullif(regexp_replace(coalesce(v_contact ->> 'phone', ''), '[^0-9+]', '', 'g'), '');
    v_email := nullif(lower(trim(coalesce(v_contact ->> 'email', ''))), '');

    if v_phone is not null then
      select id into v_contact_id from public.aura_contacts where normalized_phone = v_phone limit 1;
    end if;
    if v_contact_id is null and v_email is not null then
      select id into v_contact_id from public.aura_contacts where lower(email) = v_email limit 1;
    end if;

    if v_contact_id is null then
      insert into public.aura_contacts (full_name, normalized_phone, email, company, notes, source_intake_id)
      values (
        nullif(trim(coalesce(v_contact ->> 'fullName', '')), ''),
        v_phone,
        v_email,
        nullif(trim(coalesce(v_contact ->> 'company', '')), ''),
        nullif(trim(coalesce(v_contact ->> 'notes', '')), ''),
        v_intake.id
      )
      returning id into v_contact_id;
    else
      update public.aura_contacts
      set
        full_name = coalesce(nullif(trim(coalesce(v_contact ->> 'fullName', '')), ''), full_name),
        email = coalesce(v_email, email),
        company = coalesce(nullif(trim(coalesce(v_contact ->> 'company', '')), ''), company),
        notes = coalesce(nullif(trim(coalesce(v_contact ->> 'notes', '')), ''), notes)
      where id = v_contact_id;
    end if;
  end if;

  v_lead := v_intake.proposal -> 'lead';
  if v_lead is not null and jsonb_typeof(v_lead) = 'object' then
    insert into public.aura_leads (contact_id, title, description, location, source_intake_id)
    values (
      v_contact_id,
      coalesce(nullif(trim(coalesce(v_lead ->> 'title', '')), ''), 'New lead'),
      nullif(trim(coalesce(v_lead ->> 'description', '')), ''),
      nullif(trim(coalesce(v_lead ->> 'location', '')), ''),
      v_intake.id
    )
    on conflict (source_intake_id) where source_intake_id is not null
    do update set
      contact_id = excluded.contact_id,
      title = excluded.title,
      description = excluded.description,
      location = excluded.location
    returning id into v_lead_id;
  end if;

  for v_task, v_ordinality in
    select value, ordinality
    from jsonb_array_elements(coalesce(v_intake.proposal -> 'tasks', '[]'::jsonb)) with ordinality
  loop
    begin
      v_due_at := nullif(trim(coalesce(v_task ->> 'dueAt', '')), '')::timestamptz;
    exception when others then
      v_due_at := null;
    end;

    insert into public.aura_tasks (
      contact_id,
      lead_id,
      title,
      notes,
      due_at,
      priority,
      source_intake_id,
      source_item_key
    )
    values (
      v_contact_id,
      v_lead_id,
      coalesce(nullif(trim(coalesce(v_task ->> 'title', '')), ''), 'Follow up'),
      nullif(trim(coalesce(v_task ->> 'notes', '')), ''),
      v_due_at,
      case when coalesce(v_task ->> 'priority', 'normal') in ('low', 'normal', 'high', 'urgent')
        then coalesce(v_task ->> 'priority', 'normal') else 'normal' end,
      v_intake.id,
      v_intake.id::text || ':task:' || v_ordinality::text
    )
    on conflict (source_item_key) where source_item_key is not null
    do update set
      contact_id = excluded.contact_id,
      lead_id = excluded.lead_id,
      title = excluded.title,
      notes = excluded.notes,
      due_at = excluded.due_at,
      priority = excluded.priority
    returning id into v_task_id;
    v_task_count := v_task_count + 1;
  end loop;

  update public.aura_intakes
  set status = 'confirmed', confirmed_at = now(), confirmed_by = p_actor_user_id, error_message = null
  where id = v_intake.id;

  insert into public.aura_audit_log (intake_id, actor_user_id, action, details)
  values (
    v_intake.id,
    p_actor_user_id,
    'intake_confirmed',
    jsonb_build_object('contactId', v_contact_id, 'leadId', v_lead_id, 'taskCount', v_task_count)
  );

  return jsonb_build_object(
    'ok', true,
    'alreadyConfirmed', false,
    'intakeId', v_intake.id,
    'contactId', v_contact_id,
    'leadId', v_lead_id,
    'taskCount', v_task_count
  );
end;
$$;

revoke all on function public.set_aura_updated_at() from public, anon, authenticated;
revoke all on function public.confirm_aura_intake(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_aura_intake(uuid, uuid) to service_role;
