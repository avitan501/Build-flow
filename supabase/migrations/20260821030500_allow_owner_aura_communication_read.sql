grant select on table public.aura_communications to authenticated;

drop policy if exists "aura_communications_owner_read" on public.aura_communications;
create policy "aura_communications_owner_read"
on public.aura_communications for select to authenticated
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
