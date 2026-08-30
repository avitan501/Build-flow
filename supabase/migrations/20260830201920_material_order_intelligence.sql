create table if not exists public.aura_material_intelligence_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique check (char_length(rule_key) between 2 and 80),
  category text not null check (char_length(category) between 2 and 80),
  aliases text[] not null default '{}',
  required_fields text[] not null default '{}',
  safe_defaults jsonb not null default '{}'::jsonb,
  question_templates jsonb not null default '{}'::jsonb,
  source_path text not null check (char_length(source_path) between 1 and 500),
  source_kind text not null default 'owner_approved' check (source_kind in ('avantia_catalog','owner_approved','manufacturer','industry_reference')),
  priority integer not null default 100 check (priority between 1 and 1000),
  enabled boolean not null default true,
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aura_material_intelligence_rules_aliases_limit check (cardinality(aliases) between 1 and 30),
  constraint aura_material_intelligence_rules_fields_limit check (cardinality(required_fields) between 1 and 20),
  constraint aura_material_intelligence_rules_defaults_object check (jsonb_typeof(safe_defaults) = 'object'),
  constraint aura_material_intelligence_rules_questions_object check (jsonb_typeof(question_templates) = 'object')
);

create table if not exists public.aura_material_intelligence_evaluations (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null unique references public.aura_communications(id) on delete cascade,
  matched_rule_keys text[] not null default '{}',
  missing_questions text[] not null default '{}',
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  ready_for_confirmation boolean not null default false,
  source_priority text[] not null default array['avantia_catalog','owner_approved_rule','manufacturer_document','general_construction_knowledge']::text[],
  ai_model text,
  evaluated_at timestamptz not null default now(),
  constraint aura_material_intelligence_evaluations_rules_limit check (cardinality(matched_rule_keys) <= 30),
  constraint aura_material_intelligence_evaluations_questions_limit check (cardinality(missing_questions) <= 10)
);

create table if not exists public.aura_material_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique check (char_length(source_key) between 2 and 100),
  publisher text not null check (char_length(publisher) between 2 and 160),
  category text not null check (char_length(category) between 2 and 80),
  source_url text not null unique check (char_length(source_url) between 10 and 1000),
  authority_level text not null default 'manufacturer' check (authority_level in ('manufacturer','standards_body','industry_reference','avantia_owner')),
  refresh_status text not null default 'verified' check (refresh_status in ('verified','needs_review','disabled')),
  last_verified_at timestamptz not null default now(),
  next_review_at timestamptz not null default (now() + interval '90 days'),
  notes text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aura_material_order_patterns (
  id uuid primary key default gen_random_uuid(),
  normalized_item_name text not null check (char_length(normalized_item_name) between 1 and 300),
  unit text not null check (char_length(unit) between 1 and 40),
  confirmation_count integer not null default 1 check (confirmation_count > 0),
  last_confirmed_request_id uuid references public.quote_requests(id) on delete set null,
  sample_item jsonb not null default '{}'::jsonb,
  first_confirmed_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  unique (normalized_item_name, unit),
  constraint aura_material_order_patterns_sample_object check (jsonb_typeof(sample_item) = 'object')
);

create table if not exists public.aura_material_learning_candidates (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null unique references public.aura_communications(id) on delete cascade,
  candidate_kind text not null check (candidate_kind in ('customer_correction','manager_correction','confirmed_pattern')),
  matched_rule_keys text[] not null default '{}',
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','applied')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aura_material_learning_candidates_rules_limit check (cardinality(matched_rule_keys) <= 30)
);

alter table public.aura_sms_request_drafts
  add column if not exists intelligence_assessment jsonb not null default '{}'::jsonb,
  add column if not exists intelligence_ready boolean not null default false;

alter table public.aura_sms_request_pending_confirmations
  add column if not exists intelligence_assessment jsonb not null default '{}'::jsonb,
  add column if not exists intelligence_ready boolean not null default false;

alter table public.aura_sms_request_drafts
  drop constraint if exists aura_sms_request_drafts_intelligence_object_check;
alter table public.aura_sms_request_drafts
  add constraint aura_sms_request_drafts_intelligence_object_check
  check (jsonb_typeof(intelligence_assessment) = 'object');

alter table public.aura_sms_request_pending_confirmations
  drop constraint if exists aura_sms_pending_intelligence_object_check;
alter table public.aura_sms_request_pending_confirmations
  add constraint aura_sms_pending_intelligence_object_check
  check (jsonb_typeof(intelligence_assessment) = 'object');

insert into public.aura_material_intelligence_rules
  (rule_key, category, aliases, required_fields, safe_defaults, question_templates, source_path, source_kind, priority)
values
  ('drywall-sheet','drywall',array['sheetrock','sheet rock','drywall sheet'],array['quantity','thickness','type'],
   '{"recommended_thickness":"5/8 in","recommended_type":"regular","never_override_explicit_thickness":true}'::jsonb,
   '{"missing":"Can we do 5/8-in. regular Sheetrock, or do you need Type X/fire-rated or moisture-resistant?"}'::jsonb,
   '/shop/sheet-rock','owner_approved',10),
  ('metal-stud','framing',array['metal stud','metal studs','metal framing'],array['quantity','width','length','gauge'],
   '{}'::jsonb,'{"missing":"What metal-stud width, length, gauge, and quantity do you need?"}'::jsonb,
   '/shop/framing','owner_approved',20),
  ('thinset','tile',array['thinset','thin set','tile mortar','tile adhesive'],array['quantity','tile_type_and_size','substrate','location'],
   '{}'::jsonb,'{"missing":"What tile type and size, substrate, location, and quantity is the thinset for?"}'::jsonb,
   '/shop/tile-work','owner_approved',30),
  ('roofing-shingle','roofing',array['roofing shingles','shingles','asphalt shingles'],array['type','color','coverage'],
   '{}'::jsonb,'{"missing":"What shingle type, color, and roof area do you need?"}'::jsonb,
   '/shop/roofing','owner_approved',40),
  ('paint','paint',array['paint','interior paint','exterior paint'],array['quantity','brand_or_product','color','finish'],
   '{}'::jsonb,'{"missing":"What paint product, color, finish, and quantity do you need?"}'::jsonb,
   '/shop/paint','owner_approved',50),
  ('corner-bead','drywall',array['corner bead','corner bit'],array['quantity','material','length'],
   '{"normalize_corner_bit_to_corner_bead_after_confirmation":true}'::jsonb,
   '{"missing":"Which corner-bead material, length, and quantity do you need?"}'::jsonb,
   '/shop/sheet-rock','owner_approved',60),
  ('insulation','insulation',array['insulation','fiberglass batt','rockwool','mineral wool'],array['quantity','type','r_value','width_or_coverage'],
   '{}'::jsonb,'{"missing":"What insulation type, R-value, width or coverage, and quantity do you need?"}'::jsonb,
   '/shop/insulation','owner_approved',70),
  ('structural-panel','framing',array['plywood','osb','oriented strand board'],array['quantity','thickness','sheet_size'],
   '{}'::jsonb,'{"missing":"What panel thickness, sheet size, and quantity do you need?"}'::jsonb,
   '/shop/framing','owner_approved',80),
  ('door','doors',array['door','doors','prehung door','door slab'],array['quantity','size','type','handing_if_applicable'],
   '{}'::jsonb,'{"missing":"What door size, type, handing, and quantity do you need?"}'::jsonb,
   '/shop/doors','owner_approved',90),
  ('window','windows',array['window','windows'],array['quantity','size','operating_type'],
   '{}'::jsonb,'{"missing":"What window size, operating type, and quantity do you need?"}'::jsonb,
   '/shop/windows','owner_approved',100),
  ('dumpster','site-services',array['dumpster','roll off','roll-off','container'],array['size_yards','debris_type','rental_duration','delivery_address'],
   '{}'::jsonb,'{"missing":"Which dumpster size, debris type, rental duration, and delivery address do you need?"}'::jsonb,
   '/delivery','owner_approved',110)
on conflict (rule_key) do update set
  category = excluded.category,
  aliases = excluded.aliases,
  required_fields = excluded.required_fields,
  safe_defaults = excluded.safe_defaults,
  question_templates = excluded.question_templates,
  source_path = excluded.source_path,
  source_kind = excluded.source_kind,
  priority = excluded.priority,
  enabled = true,
  reviewed_at = now(),
  updated_at = now();

insert into public.aura_material_knowledge_sources
  (source_key, publisher, category, source_url, authority_level, notes)
values
  ('usg-sheetrock-firecode-x','USG','drywall','https://www.usg.com/en-US/p/product/sheetrock-brand-firecode-x-panels-142220','manufacturer','Official product page and linked submittal documents for 5/8-inch Type X Sheetrock panels.'),
  ('schluter-thinset-mortar','Schluter Systems','tile','https://www.schluter.com/schluter-us/en_US/thin-set-mortar','manufacturer','Official thin-set product family and application guidance.'),
  ('owens-corning-insulation-products','Owens Corning','insulation','https://www.owenscorning.com/en-us/insulation/products','manufacturer','Official insulation product catalog; exact R-value and dimensions remain product-specific.'),
  ('gaf-residential-shingles','GAF','roofing','https://www.gaf.com/en-us/roofing-materials/residential-roofing-materials/shingles','manufacturer','Official shingle families, types, colors, and product-document links.')
on conflict (source_key) do update set
  publisher = excluded.publisher,
  category = excluded.category,
  source_url = excluded.source_url,
  authority_level = excluded.authority_level,
  refresh_status = 'verified',
  last_verified_at = now(),
  next_review_at = now() + interval '90 days',
  notes = excluded.notes,
  enabled = true,
  updated_at = now();

insert into public.aura_ai_reply_knowledge (fact, category, source_path, enabled, reviewed_at)
values
  ('USG identifies Sheetrock Brand Firecode X panels as 5/8-inch Type X panels for interior wall and ceiling applications. Do not infer that a customer needs Type X; confirm regular versus Type X/fire-rated versus moisture-resistant from the project requirement.', 'drywall', 'https://www.usg.com/en-US/p/product/sheetrock-brand-firecode-x-panels-142220', true, now()),
  ('Schluter thin-set products vary by tile and stone type, substrate or membrane system, and installation location. Collect the tile type and size, substrate, location, and quantity before matching a product, then follow the current manufacturer data sheet.', 'tile', 'https://www.schluter.com/schluter-us/en_US/thin-set-mortar', true, now()),
  ('Owens Corning insulation offerings vary by application, product type, R-value, thickness, width, and coverage. Collect type, R-value, width or coverage, and quantity before product matching.', 'insulation', 'https://www.owenscorning.com/en-us/insulation/products', true, now()),
  ('GAF groups residential shingles by product family, type, and color, and defines one roofing square as 100 square feet. Collect shingle type, color, and roof area; exact bundles per square remain product-specific.', 'roofing', 'https://www.gaf.com/en-us/roofing-materials/residential-roofing-materials/shingles', true, now())
on conflict (fact, source_path) do update set enabled = true, reviewed_at = now(), updated_at = now();

create index if not exists aura_material_intelligence_rules_enabled_priority_idx
  on public.aura_material_intelligence_rules(enabled, priority, reviewed_at desc);
create index if not exists aura_material_intelligence_evaluations_ready_idx
  on public.aura_material_intelligence_evaluations(ready_for_confirmation, evaluated_at desc);
create index if not exists aura_material_order_patterns_frequency_idx
  on public.aura_material_order_patterns(confirmation_count desc, last_confirmed_at desc);
create index if not exists aura_material_learning_candidates_status_idx
  on public.aura_material_learning_candidates(status, created_at desc);
create index if not exists aura_material_knowledge_sources_review_idx
  on public.aura_material_knowledge_sources(enabled, next_review_at, category);

alter table public.aura_material_intelligence_rules enable row level security;
alter table public.aura_material_intelligence_evaluations enable row level security;
alter table public.aura_material_knowledge_sources enable row level security;
alter table public.aura_material_order_patterns enable row level security;
alter table public.aura_material_learning_candidates enable row level security;

revoke all on table public.aura_material_intelligence_rules from public, anon, authenticated;
revoke all on table public.aura_material_intelligence_evaluations from public, anon, authenticated;
revoke all on table public.aura_material_knowledge_sources from public, anon, authenticated;
revoke all on table public.aura_material_order_patterns from public, anon, authenticated;
revoke all on table public.aura_material_learning_candidates from public, anon, authenticated;
grant all on table public.aura_material_intelligence_rules to service_role;
grant all on table public.aura_material_intelligence_evaluations to service_role;
grant all on table public.aura_material_knowledge_sources to service_role;
grant all on table public.aura_material_order_patterns to service_role;
grant all on table public.aura_material_learning_candidates to service_role;
grant select, insert, update, delete on table public.aura_material_intelligence_rules to authenticated;
grant select on table public.aura_material_intelligence_evaluations to authenticated;
grant select, insert, update, delete on table public.aura_material_knowledge_sources to authenticated;
grant select on table public.aura_material_order_patterns to authenticated;
grant select, update on table public.aura_material_learning_candidates to authenticated;

drop policy if exists "material_intelligence_rules_staff_read" on public.aura_material_intelligence_rules;
create policy "material_intelligence_rules_staff_read"
  on public.aura_material_intelligence_rules for select to authenticated
  using ((select private.is_admin_or_staff()));
drop policy if exists "material_intelligence_rules_owner_insert" on public.aura_material_intelligence_rules;
create policy "material_intelligence_rules_owner_insert"
  on public.aura_material_intelligence_rules for insert to authenticated
  with check ((select private.is_admin()));
drop policy if exists "material_intelligence_rules_owner_update" on public.aura_material_intelligence_rules;
create policy "material_intelligence_rules_owner_update"
  on public.aura_material_intelligence_rules for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "material_intelligence_rules_owner_delete" on public.aura_material_intelligence_rules;
create policy "material_intelligence_rules_owner_delete"
  on public.aura_material_intelligence_rules for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists "material_intelligence_evaluations_staff_read" on public.aura_material_intelligence_evaluations;
create policy "material_intelligence_evaluations_staff_read"
  on public.aura_material_intelligence_evaluations for select to authenticated
  using ((select private.is_admin_or_staff()));

drop policy if exists "material_knowledge_sources_staff_read" on public.aura_material_knowledge_sources;
create policy "material_knowledge_sources_staff_read"
  on public.aura_material_knowledge_sources for select to authenticated
  using ((select private.is_admin_or_staff()));
drop policy if exists "material_knowledge_sources_owner_insert" on public.aura_material_knowledge_sources;
create policy "material_knowledge_sources_owner_insert"
  on public.aura_material_knowledge_sources for insert to authenticated
  with check ((select private.is_admin()));
drop policy if exists "material_knowledge_sources_owner_update" on public.aura_material_knowledge_sources;
create policy "material_knowledge_sources_owner_update"
  on public.aura_material_knowledge_sources for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "material_knowledge_sources_owner_delete" on public.aura_material_knowledge_sources;
create policy "material_knowledge_sources_owner_delete"
  on public.aura_material_knowledge_sources for delete to authenticated
  using ((select private.is_admin()));

drop policy if exists "material_order_patterns_staff_read" on public.aura_material_order_patterns;
create policy "material_order_patterns_staff_read"
  on public.aura_material_order_patterns for select to authenticated
  using ((select private.is_admin_or_staff()));

drop policy if exists "material_learning_candidates_staff_read" on public.aura_material_learning_candidates;
create policy "material_learning_candidates_staff_read"
  on public.aura_material_learning_candidates for select to authenticated
  using ((select private.is_admin_or_staff()));
drop policy if exists "material_learning_candidates_owner_update" on public.aura_material_learning_candidates;
create policy "material_learning_candidates_owner_update"
  on public.aura_material_learning_candidates for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

comment on table public.aura_material_intelligence_rules is
  'Owner-reviewed order-completeness rules. Catalog evidence remains first priority; these rules define critical fields and safe defaults.';
comment on table public.aura_material_intelligence_evaluations is
  'Per-message, privacy-minimized order-readiness evidence. The original message remains in aura_communications and is not duplicated here.';
comment on table public.aura_material_knowledge_sources is
  'Authoritative source registry for manufacturer and standards documents. Sources are re-reviewed on a schedule and never prove current stock or price.';
comment on table public.aura_material_order_patterns is
  'Frequency memory built only from customer-confirmed material requests. It may inform common choices but never overrides an explicit customer value.';
comment on table public.aura_material_learning_candidates is
  'Review queue for corrections and recurring patterns. No candidate changes production rules without owner approval.';
comment on column public.aura_sms_request_pending_confirmations.intelligence_ready is
  'Hard gate: a customer confirmation can create a request only when all critical material details passed intelligence review.';
