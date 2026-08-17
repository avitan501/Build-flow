drop policy if exists "manager_outreach_leads_manager_read" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_read"
on public.manager_outreach_leads for select to authenticated
using (
  lower(trim(coalesce((select auth.jwt() ->> 'email'), ''))) = 'avitanneto@gmail.com'
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_outreach_leads_manager_insert" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_insert"
on public.manager_outreach_leads for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (
    lower(trim(coalesce((select auth.jwt() ->> 'email'), ''))) = 'avitanneto@gmail.com'
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role in ('admin', 'staff')
        and approval_status = 'approved'
        and is_active = true
    )
  )
);

drop policy if exists "manager_outreach_leads_manager_update" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_update"
on public.manager_outreach_leads for update to authenticated
using (
  lower(trim(coalesce((select auth.jwt() ->> 'email'), ''))) = 'avitanneto@gmail.com'
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
)
with check (
  lower(trim(coalesce((select auth.jwt() ->> 'email'), ''))) = 'avitanneto@gmail.com'
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);

drop policy if exists "manager_outreach_leads_manager_delete" on public.manager_outreach_leads;
create policy "manager_outreach_leads_manager_delete"
on public.manager_outreach_leads for delete to authenticated
using (
  lower(trim(coalesce((select auth.jwt() ->> 'email'), ''))) = 'avitanneto@gmail.com'
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'staff')
      and approval_status = 'approved'
      and is_active = true
  )
);
