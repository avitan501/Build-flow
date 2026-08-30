alter table public.aura_sms_unanswered_followups
  add column if not exists follow_up_stage smallint not null default 1;

alter table public.aura_sms_unanswered_followups
  drop constraint if exists aura_sms_unanswered_followups_follow_up_stage_check;

alter table public.aura_sms_unanswered_followups
  add constraint aura_sms_unanswered_followups_follow_up_stage_check
  check (follow_up_stage between 1 and 3);

comment on table public.aura_sms_unanswered_followups is
  'Up to three customer intake reminders after 10 minutes, 2 hours, and 24 hours; cancelled immediately when the customer replies.';
