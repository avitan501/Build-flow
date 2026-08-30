alter table public.aura_sms_request_pending_confirmations
  add column if not exists needed_by_text text;

update public.aura_sms_request_pending_confirmations
set needed_by_text = coalesce(
  nullif((regexp_match(summary_text, '(?im)^Needed by:\s*(.+)$'))[1], ''),
  nullif((regexp_match(summary_text, '(?im)^נדרש עד:\s*(.+)$'))[1], ''),
  nullif((regexp_match(summary_text, '(?im)^Necesario para:\s*(.+)$'))[1], '')
)
where needed_by_text is null
  and summary_text ~* '(?m)^(Needed by|נדרש עד|Necesario para):';

comment on column public.aura_sms_request_pending_confirmations.needed_by_text is
  'Customer-provided delivery timing preserved verbatim until the SMS request is confirmed.';
