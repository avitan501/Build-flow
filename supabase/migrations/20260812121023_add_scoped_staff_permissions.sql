create table if not exists public.staff_access_grants (
  email text primary key check (email = lower(trim(email))),
  can_manage_customers boolean not null default false,
  can_manage_suppliers boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_access_grants enable row level security;

create policy "staff_access_grants_owner_all"
on public.staff_access_grants
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on public.staff_access_grants from anon, authenticated;
grant select, insert, update, delete on public.staff_access_grants to authenticated;

insert into public.staff_access_grants (email, can_manage_customers, can_manage_suppliers)
values ('carbugatti03@gmail.com', true, true)
on conflict (email) do update set
  can_manage_customers = excluded.can_manage_customers,
  can_manage_suppliers = excluded.can_manage_suppliers,
  active = true,
  updated_at = now();

create or replace function private.has_staff_capability(capability text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.staff_access_grants access
      on access.email = lower(trim(profile.email))
    where profile.id = (select auth.uid())
      and profile.role = 'staff'
      and profile.approval_status = 'approved'
      and profile.is_active = true
      and access.active = true
      and case capability
        when 'customers' then access.can_manage_customers
        when 'suppliers' then access.can_manage_suppliers
        else false
      end
  );
$$;

revoke all on function private.has_staff_capability(text) from public, anon;
grant execute on function private.has_staff_capability(text) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_grant public.staff_access_grants%rowtype;
begin
  select * into staff_grant
  from public.staff_access_grants
  where email = lower(trim(coalesce(new.email, '')))
    and active = true;

  insert into public.profiles (
    id, email, full_name, phone, company_name, role, approval_status, is_active, approved_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    case when staff_grant.email is not null then 'staff' else 'client' end,
    case when staff_grant.email is not null then 'approved' else 'pending' end,
    true,
    case when staff_grant.email is not null then now() else null end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    company_name = coalesce(excluded.company_name, public.profiles.company_name),
    role = case when staff_grant.email is not null then 'staff' else public.profiles.role end,
    approval_status = case when staff_grant.email is not null then 'approved' else public.profiles.approval_status end,
    is_active = case when staff_grant.email is not null then true else public.profiles.is_active end,
    approved_at = case when staff_grant.email is not null then coalesce(public.profiles.approved_at, now()) else public.profiles.approved_at end,
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function public.staff_update_customer_contact(
  customer_id uuid,
  customer_full_name text,
  customer_company_name text,
  customer_phone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.has_staff_capability('customers')) and not (select private.is_admin()) then
    raise exception 'Customer management permission is required.';
  end if;

  update public.profiles
  set full_name = nullif(trim(customer_full_name), ''),
      company_name = nullif(trim(customer_company_name), ''),
      phone = nullif(trim(customer_phone), ''),
      updated_at = now()
  where id = customer_id and role = 'client';
end;
$$;

revoke all on function public.staff_update_customer_contact(uuid, text, text, text) from public, anon;
grant execute on function public.staff_update_customer_contact(uuid, text, text, text) to authenticated;

create or replace function public.staff_save_supplier_directory(suppliers jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.has_staff_capability('suppliers')) and not (select private.is_admin()) then
    raise exception 'Supplier management permission is required.';
  end if;

  if jsonb_typeof(suppliers) <> 'array' then
    raise exception 'Supplier directory must be an array.';
  end if;

  update public.workflow_manager_settings
  set state = jsonb_set(
        state,
        '{qualificationSettings,suppliers}',
        suppliers,
        true
      ),
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = 'singleton';
end;
$$;

revoke all on function public.staff_save_supplier_directory(jsonb) from public, anon;
grant execute on function public.staff_save_supplier_directory(jsonb) to authenticated;
