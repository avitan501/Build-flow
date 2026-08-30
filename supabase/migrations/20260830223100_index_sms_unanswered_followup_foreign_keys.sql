create index if not exists aura_sms_unanswered_followups_contact_idx
  on public.aura_sms_unanswered_followups(contact_id)
  where contact_id is not null;

create index if not exists aura_sms_unanswered_followups_sent_communication_idx
  on public.aura_sms_unanswered_followups(sent_communication_id)
  where sent_communication_id is not null;
