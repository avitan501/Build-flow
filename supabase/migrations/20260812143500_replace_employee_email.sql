delete from public.staff_access_grants
where email = 'carbugatti03@gmail.com';

update public.profiles
set role = 'client',
    approval_status = 'pending',
    is_active = true,
    approved_at = null,
    updated_at = now()
where lower(trim(email)) = 'carbugatti03@gmail.com'
  and role = 'staff';

insert into public.staff_access_grants (
  email,
  can_manage_customers,
  can_manage_suppliers,
  active
)
values ('buildavantiap@gmail.com', true, true, true)
on conflict (email) do update set
  can_manage_customers = excluded.can_manage_customers,
  can_manage_suppliers = excluded.can_manage_suppliers,
  active = excluded.active,
  updated_at = now();

update public.profiles
set role = 'staff',
    approval_status = 'approved',
    is_active = true,
    approved_at = coalesce(approved_at, now()),
    updated_at = now()
where lower(trim(email)) = 'buildavantiap@gmail.com';
