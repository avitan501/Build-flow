create index if not exists aura_sms_reply_drafts_contact_idx
  on public.aura_sms_reply_drafts(contact_id)
  where contact_id is not null;

create index if not exists aura_sms_request_drafts_contact_idx
  on public.aura_sms_request_drafts(contact_id)
  where contact_id is not null;

create index if not exists aura_sms_request_drafts_created_request_idx
  on public.aura_sms_request_drafts(created_request_id)
  where created_request_id is not null;
