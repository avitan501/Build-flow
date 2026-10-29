begin;
create table public.consultation_booking_reservations (
 id uuid primary key,
 starts_at timestamptz not null unique,
 content_hash text not null,
 bucket text not null,
 status text not null default 'pending' check(status in ('pending','confirmed')),
 created_at timestamptz not null default now()
);
alter table public.consultation_booking_reservations enable row level security;
revoke all on public.consultation_booking_reservations from public,anon,authenticated;
grant select,insert,update,delete on public.consultation_booking_reservations to service_role;
create index consultation_booking_bucket_idx on public.consultation_booking_reservations(bucket,created_at);
create function public.reserve_consultation(p_id uuid,p_starts_at timestamptz,p_content_hash text,p_bucket text) returns text
language plpgsql security invoker set search_path='' as $$
declare prior public.consultation_booking_reservations%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended('consultation:' || p_bucket,0));
 select * into prior from public.consultation_booking_reservations where id=p_id;
 if found then
  if prior.starts_at=p_starts_at and prior.content_hash=p_content_hash then return 'duplicate'; end if;
  return 'conflict';
 end if;
 if (select count(*) from public.consultation_booking_reservations where bucket=p_bucket and created_at>now()-interval '24 hours')>=5 then return 'limited'; end if;
 insert into public.consultation_booking_reservations(id,starts_at,content_hash,bucket) values(p_id,p_starts_at,p_content_hash,p_bucket) on conflict do nothing;
 if not found then return 'conflict'; end if;
 return 'reserved';
end; $$;
revoke all on function public.reserve_consultation(uuid,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.reserve_consultation(uuid,timestamptz,text,text) to service_role;
commit;
