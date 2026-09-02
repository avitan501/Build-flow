-- Use the durable push queue as the single manager notification feed and keep
-- read state private to each authenticated manager.

create table if not exists public.manager_notification_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_id bigint not null references public.manager_push_queue(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index if not exists manager_notification_reads_notification_idx
  on public.manager_notification_reads(notification_id);

-- Existing history predates server-side read tracking. Start approved managers
-- with that history marked read so only notifications created after this
-- migration produce a new badge.
insert into public.manager_notification_reads (user_id, notification_id, read_at)
select profile.id, notification.id, now()
from public.profiles as profile
cross join public.manager_push_queue as notification
where profile.role in ('admin', 'staff')
  and profile.approval_status = 'approved'
  and profile.is_active = true
on conflict (user_id, notification_id) do nothing;

alter table public.manager_notification_reads enable row level security;

revoke all on table public.manager_push_queue from anon, authenticated;
grant select on table public.manager_push_queue to authenticated;

drop policy if exists "manager_push_queue_manager_read" on public.manager_push_queue;
create policy "manager_push_queue_manager_read"
on public.manager_push_queue for select to authenticated
using (
  (select private.is_admin())
  or (select private.has_staff_capability('communications'))
);

revoke all on table public.manager_notification_reads from anon, authenticated;
grant select, insert, update on table public.manager_notification_reads to authenticated;

drop policy if exists "manager_notification_reads_own_select" on public.manager_notification_reads;
create policy "manager_notification_reads_own_select"
on public.manager_notification_reads for select to authenticated
using (
  user_id = (select auth.uid())
  and ((select private.is_admin()) or (select private.has_staff_capability('communications')))
);

drop policy if exists "manager_notification_reads_own_insert" on public.manager_notification_reads;
create policy "manager_notification_reads_own_insert"
on public.manager_notification_reads for insert to authenticated
with check (
  user_id = (select auth.uid())
  and ((select private.is_admin()) or (select private.has_staff_capability('communications')))
);

drop policy if exists "manager_notification_reads_own_update" on public.manager_notification_reads;
create policy "manager_notification_reads_own_update"
on public.manager_notification_reads for update to authenticated
using (
  user_id = (select auth.uid())
  and ((select private.is_admin()) or (select private.has_staff_capability('communications')))
)
with check (
  user_id = (select auth.uid())
  and ((select private.is_admin()) or (select private.has_staff_capability('communications')))
);

create or replace function public.queue_inbound_communication_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  channel_label text;
begin
  if lower(coalesce(new.direction, '')) not in ('incoming', 'inbound') then return new; end if;
  channel_label := case
    when new.channel = 'call' then 'call'
    when new.channel = 'whatsapp' then 'WhatsApp message'
    when new.channel = 'sms' then 'text message'
    when new.channel = 'email' then 'email'
    else 'message'
  end;
  perform public.queue_manager_push_event(
    'call_message',
    'New ' || channel_label,
    coalesce(nullif(new.summary, ''), nullif(new.body, ''), nullif(new.subject, ''), 'Open Messages & Calls to respond.'),
    '/admin/communications?communication=' || new.id::text || '&channel=' || coalesce(nullif(new.channel, ''), 'all'),
    'call_message:' || new.id::text,
    'avantia-communication-' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists aura_communications_manager_push on public.aura_communications;
create trigger aura_communications_manager_push
after insert on public.aura_communications
for each row execute function public.queue_inbound_communication_push();

revoke all on function public.queue_inbound_communication_push() from public, anon, authenticated;
