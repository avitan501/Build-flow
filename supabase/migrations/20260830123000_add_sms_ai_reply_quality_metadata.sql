alter table public.aura_sms_reply_drafts
  add column if not exists intent text not null default 'general',
  add column if not exists safety_level text not null default 'yellow',
  add column if not exists safety_signals jsonb not null default '[]'::jsonb,
  add column if not exists model_auto_safe boolean,
  add column if not exists gate_auto_safe boolean not null default false,
  add column if not exists latency_ms integer,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists estimated_cost_usd numeric(12, 8),
  add column if not exists prompt_version text not null default 'sms-reply-v2';

alter table public.aura_sms_reply_drafts
  drop constraint if exists aura_sms_reply_drafts_safety_level_check;
alter table public.aura_sms_reply_drafts
  add constraint aura_sms_reply_drafts_safety_level_check
  check (safety_level in ('green', 'yellow', 'red'));

alter table public.aura_sms_reply_drafts
  drop constraint if exists aura_sms_reply_drafts_safety_signals_array_check;
alter table public.aura_sms_reply_drafts
  add constraint aura_sms_reply_drafts_safety_signals_array_check
  check (jsonb_typeof(safety_signals) = 'array');

alter table public.aura_ai_reply_feedback
  add column if not exists correction_reasons text[] not null default '{}',
  add column if not exists intent text not null default 'general',
  add column if not exists language text not null default 'en',
  add column if not exists privacy_redacted boolean not null default false,
  add column if not exists learning_metadata jsonb not null default '{}'::jsonb;

alter table public.aura_ai_reply_feedback
  drop constraint if exists aura_ai_reply_feedback_correction_reasons_limit;
alter table public.aura_ai_reply_feedback
  add constraint aura_ai_reply_feedback_correction_reasons_limit
  check (cardinality(correction_reasons) <= 6);

alter table public.aura_ai_reply_examples
  add column if not exists intent text not null default 'general',
  add column if not exists privacy_redacted boolean not null default false;

create index if not exists aura_sms_reply_drafts_quality_metrics_idx
  on public.aura_sms_reply_drafts(created_at desc, safety_level, ai_model);
create index if not exists aura_ai_reply_examples_intent_language_idx
  on public.aura_ai_reply_examples(enabled, intent, language, updated_at desc);

comment on column public.aura_sms_reply_drafts.safety_level is
  'Manager-only deterministic safety result. Green may auto-send; yellow is a draft; red is blocked.';
comment on column public.aura_sms_reply_drafts.estimated_cost_usd is
  'Estimated only when per-million-token rates are configured in the broker environment.';
comment on column public.aura_ai_reply_feedback.learning_metadata is
  'Privacy-safe correction metadata only; never store customer PII in this JSON object.';
