insert into public.staff_access_grants (
  email,
  can_manage_customers,
  can_manage_suppliers,
  active
)
values ('info@fivetownsbuilders.com', true, true, true)
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
where lower(trim(email)) = 'info@fivetownsbuilders.com';
