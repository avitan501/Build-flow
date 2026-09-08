alter table public.quote_request_attachments
  add column if not exists source_party text not null default 'client';

alter table public.quote_request_attachments
  drop constraint if exists quote_request_attachments_source_party_check;

alter table public.quote_request_attachments
  add constraint quote_request_attachments_source_party_check
  check (source_party in ('client', 'supplier', 'internal'));

create index if not exists quote_request_attachments_request_source_created_idx
  on public.quote_request_attachments (request_id, source_party, created_at desc);

comment on column public.quote_request_attachments.source_party is
  'Origin of the request attachment. Client files belong to Step 1; supplier files belong to Step 2.';

drop policy if exists "quote_request_attachments_owner_read" on public.quote_request_attachments;
create policy "quote_request_attachments_owner_read"
on public.quote_request_attachments for select to authenticated
using (
  ((select auth.uid()) = owner_id and source_party in ('client', 'internal'))
  or (select private.is_admin_or_staff())
);

drop policy if exists "quote_request_attachments_customer_staff_update" on public.quote_request_attachments;
create policy "quote_request_attachments_customer_staff_update"
on public.quote_request_attachments for update to authenticated
using (
  ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and exists (
    select 1 from public.quote_requests request
    where request.id = quote_request_attachments.request_id
      and request.project_id = quote_request_attachments.project_id
      and request.owner_id = quote_request_attachments.owner_id
  )
)
with check (
  ((select private.is_admin()) or (select private.has_staff_capability('customers')))
  and exists (
    select 1 from public.quote_requests request
    where request.id = quote_request_attachments.request_id
      and request.project_id = quote_request_attachments.project_id
      and request.owner_id = quote_request_attachments.owner_id
  )
);
