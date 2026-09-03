create or replace function public.enqueue_client_material_list_job_for_requester(
  p_request_id uuid,
  p_force boolean default false
)
returns table (job_id bigint, generation bigint, job_status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.quote_requests request
    where request.id = p_request_id
      and (
        request.owner_id = (select auth.uid())
        or private.is_admin_or_staff()
      )
  ) then
    raise exception 'request_not_available';
  end if;

  return query
  select queued.job_id, queued.generation, queued.job_status
  from public.enqueue_client_material_list_job(p_request_id, p_force) queued;
end;
$$;

revoke all on function public.enqueue_client_material_list_job_for_requester(uuid, boolean) from public, anon;
grant execute on function public.enqueue_client_material_list_job_for_requester(uuid, boolean) to authenticated;

drop policy if exists quote_request_items_owner_insert on public.quote_request_items;
create policy quote_request_items_owner_insert
on public.quote_request_items
for insert
to authenticated
with check (
  (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.quote_requests request
      where request.id = quote_request_items.request_id
        and request.owner_id = (select auth.uid())
        and request.status = 'draft'
    )
  )
  or private.is_admin_or_staff()
);
