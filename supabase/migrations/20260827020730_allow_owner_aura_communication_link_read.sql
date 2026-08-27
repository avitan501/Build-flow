grant select on table public.aura_communication_links to authenticated;

drop policy if exists "aura_communication_links_manager_read" on public.aura_communication_links;
create policy "aura_communication_links_manager_read"
on public.aura_communication_links
for select
to authenticated
using (
  (select private.is_admin())
  or (select private.has_staff_capability('customers'))
);
