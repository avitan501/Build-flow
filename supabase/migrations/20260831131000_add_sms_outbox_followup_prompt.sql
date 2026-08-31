alter table public.aura_sms_reply_drafts
  add column if not exists follow_up_prompt text
  check (follow_up_prompt is null or char_length(follow_up_prompt) between 2 and 320);
