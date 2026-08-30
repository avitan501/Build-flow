alter table public.aura_contacts
  add column if not exists exact_list_only boolean not null default false;

alter table public.aura_sms_request_drafts
  add column if not exists exact_list_only boolean not null default false,
  add column if not exists delivery_address_known boolean not null default false;

-- Examples created before privacy-safe learning metadata are not eligible for retrieval.
update public.aura_ai_reply_examples
set enabled = false
where privacy_redacted is distinct from true
   or approved_by is null;

create index if not exists aura_ai_reply_examples_safe_retrieval_idx
  on public.aura_ai_reply_examples(intent, language, updated_at desc)
  where enabled = true and privacy_redacted = true and approved_by is not null;

comment on column public.aura_contacts.exact_list_only is
  'Persistent customer instruction that optional accessories or additions must never be suggested.';
comment on column public.aura_sms_request_drafts.exact_list_only is
  'Snapshot of the persistent exact-list-only instruction used to provenance-filter draft items.';
