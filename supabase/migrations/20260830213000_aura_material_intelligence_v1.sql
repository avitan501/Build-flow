-- Aura Material Intelligence v1 is additive and shadow-only. It extends the
-- existing reviewed rules instead of creating a second universal catalog.
alter table public.public_start_text_requests
  add column if not exists example_provider_message_id text,
  add column if not exists example_sent_at timestamptz;

alter table public.public_start_text_requests
  drop constraint if exists public_start_text_requests_status_check;
alter table public.public_start_text_requests
  add constraint public_start_text_requests_status_check
  check (status in ('processing','sent','partial','suppressed','failed'));

comment on column public.public_start_text_requests.example_provider_message_id is
  'Provider acknowledgement for the second fixed-copy example SMS. Kept separate so retries never duplicate the welcome SMS.';

alter table public.customer_request_portal_invite_outbox
  add column if not exists template_version text not null default 'request-portal-review-v1',
  add column if not exists locked_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now();

create index if not exists customer_request_portal_invite_retry_idx
  on public.customer_request_portal_invite_outbox (next_attempt_at, created_at)
  where status in ('pending','failed','sending');

update public.customer_request_portal_invite_outbox
set locked_at = coalesce(locked_at, updated_at, created_at),
    next_attempt_at = coalesce(next_attempt_at, now())
where status = 'sending';

comment on column public.customer_request_portal_invite_outbox.message is
  'Non-secret template/audit copy only. One-time portal tokens are generated at send time and are never persisted here.';

alter table public.aura_material_intelligence_rules
  add column if not exists construction_stage text not null default 'Procurement',
  add column if not exists trade text not null default 'General',
  add column if not exists generic_product text,
  add column if not exists common_specification jsonb not null default '{}'::jsonb,
  add column if not exists optional_attributes text[] not null default '{}',
  add column if not exists compatibility_blockers jsonb not null default '[]'::jsonb,
  add column if not exists search_synonyms text[] not null default '{}',
  add column if not exists common_unit text,
  add column if not exists common_use text,
  add column if not exists regional_relevance text not null default 'United States',
  add column if not exists first_blocker_attribute text,
  add column if not exists first_question text,
  add column if not exists confidence_label text not null default 'Needs Confirmation',
  add column if not exists evidence_confidence numeric(4,3) not null default 0,
  add column if not exists last_checked_at timestamptz,
  add column if not exists manager_approved boolean not null default false,
  add column if not exists common_map_status text not null default 'legacy',
  add column if not exists common_map_source_kind text not null default 'legacy',
  add column if not exists common_category text,
  add column if not exists common_required_attributes text[] not null default '{}',
  add column if not exists common_map_updated_at timestamptz;

alter table public.aura_material_intelligence_rules
  drop constraint if exists aura_material_intelligence_rules_source_kind_check;
alter table public.aura_material_intelligence_rules
  add constraint aura_material_intelligence_rules_source_kind_check
  check (source_kind in ('avantia_catalog','owner_approved','manufacturer','industry_reference','draft_seed'));

alter table public.aura_material_intelligence_rules
  drop constraint if exists aura_material_intelligence_rules_common_map_status_check,
  drop constraint if exists aura_material_intelligence_rules_evidence_confidence_check,
  drop constraint if exists aura_material_intelligence_rules_common_specification_check,
  drop constraint if exists aura_material_intelligence_rules_compatibility_blockers_check;
alter table public.aura_material_intelligence_rules
  add constraint aura_material_intelligence_rules_common_map_status_check check (common_map_status in ('legacy','draft','reviewed','disabled')),
  add constraint aura_material_intelligence_rules_evidence_confidence_check check (evidence_confidence between 0 and 1),
  add constraint aura_material_intelligence_rules_common_specification_check check (jsonb_typeof(common_specification) = 'object'),
  add constraint aura_material_intelligence_rules_compatibility_blockers_check check (jsonb_typeof(compatibility_blockers) = 'array');

alter table public.aura_material_intelligence_rules
  drop constraint if exists aura_material_intelligence_rules_confidence_label_check;
alter table public.aura_material_intelligence_rules
  add constraint aura_material_intelligence_rules_confidence_label_check check (confidence_label in
    ('Common Industry Default','Common Local Choice','Common for Avantia','Likely Match','Exact Match','Needs Confirmation'));

create table if not exists public.aura_common_material_alternatives (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.aura_material_intelligence_rules(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  name text not null check (char_length(name) between 2 and 200),
  generic_specification jsonb not null default '{}'::jsonb check (jsonb_typeof(generic_specification) = 'object'),
  differentiating_attributes text[] not null default '{}',
  use_when text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_id, rank)
);

create table if not exists public.aura_common_material_evidence (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.aura_material_intelligence_rules(id) on delete cascade,
  alternative_id uuid references public.aura_common_material_alternatives(id) on delete cascade,
  source_kind text not null check (source_kind in ('supplier','manufacturer','availability','avantia_request','contractor_estimate','classification','manager_approval')),
  publisher text not null,
  source_url text,
  safe_internal_reference text,
  location text,
  supports_claim text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  observed_at timestamptz,
  verified_at timestamptz,
  manager_approved boolean not null default false,
  created_at timestamptz not null default now(),
  check (source_url is not null or safe_internal_reference is not null)
);

create table if not exists public.aura_common_material_classifications (
  rule_id uuid not null references public.aura_material_intelligence_rules(id) on delete cascade,
  scheme text not null check (scheme in ('ETIM','CSI_MASTERFORMAT','UNSPSC')),
  scheme_version text not null,
  code text not null,
  label text not null,
  mapping_scope text not null check (mapping_scope in ('category','generic_product','exact_product')),
  source_url text not null,
  verified_at timestamptz not null,
  verified_by uuid references auth.users(id) on delete set null,
  primary key (rule_id, scheme, scheme_version, code)
);

create table if not exists public.aura_external_product_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  product_data jsonb not null check (jsonb_typeof(product_data) = 'object'),
  source_url text not null,
  location jsonb not null default '{}'::jsonb,
  searched_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz not null,
  confidence_label text not null default 'Needs Confirmation' check (confidence_label in
    ('Common Industry Default','Common Local Choice','Common for Avantia','Likely Match','Exact Match','Needs Confirmation')),
  unique (provider, external_id, location)
);

create table if not exists public.aura_external_price_observations (
  id uuid primary key default gen_random_uuid(),
  cached_product_id uuid references public.aura_external_product_cache(id) on delete set null,
  provider text not null,
  external_id text not null,
  vendor text not null,
  price numeric(14,4) not null check (price >= 0),
  currency text not null default 'USD',
  unit text not null,
  package_quantity numeric(14,4) not null default 1 check (package_quantity > 0),
  store_branch_zip jsonb not null default '{}'::jsonb,
  price_visibility text not null check (price_visibility in ('public','private')),
  safe_account_reference text,
  availability text not null default 'unknown' check (availability in ('available','unavailable','unknown')),
  checked_at timestamptz not null,
  expires_at timestamptz not null,
  source_url text not null,
  manager_approval_status text not null default 'pending' check (manager_approval_status in ('pending','approved_internal','approved_customer','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.aura_material_shadow_assessments (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null unique references public.aura_communications(id) on delete cascade,
  contact_id uuid references public.aura_contacts(id) on delete set null,
  normalized_phone text not null,
  channel text not null check (channel in ('sms','whatsapp')),
  recognized_rule_id uuid references public.aura_material_intelligence_rules(id) on delete set null,
  known_specifications jsonb not null default '{}'::jsonb,
  missing_blocker text,
  suggested_question text,
  confidence_label text not null default 'Needs Confirmation',
  sources jsonb not null default '[]'::jsonb,
  draft_only boolean not null default true check (draft_only),
  created_at timestamptz not null default now(),
  check (suggested_question is null or length(suggested_question) - length(replace(suggested_question, '?', '')) <= 1)
);

alter table public.manager_document_items
  add column if not exists matched_common_material_rule_id uuid references public.aura_material_intelligence_rules(id) on delete set null,
  add column if not exists matched_catalog_item_id uuid references public.material_catalog_items(id) on delete set null,
  add column if not exists match_method text,
  add column if not exists match_confidence numeric(4,3) check (match_confidence between 0 and 1),
  add column if not exists catalog_import_status text not null default 'not_requested' check (catalog_import_status in ('not_requested','pending_review','imported','failed'));

create index if not exists aura_material_intelligence_rules_map_idx on public.aura_material_intelligence_rules(enabled, trade, category, priority);
create index if not exists aura_common_material_evidence_rule_idx on public.aura_common_material_evidence(rule_id, verified_at desc);
create index if not exists aura_external_product_cache_expiry_idx on public.aura_external_product_cache(provider, expires_at);
create index if not exists aura_external_price_observations_lookup_idx on public.aura_external_price_observations(cached_product_id, vendor, checked_at desc);
create index if not exists aura_material_shadow_phone_idx on public.aura_material_shadow_assessments(normalized_phone, created_at desc);

alter table public.aura_common_material_alternatives enable row level security;
alter table public.aura_common_material_evidence enable row level security;
alter table public.aura_common_material_classifications enable row level security;
alter table public.aura_external_product_cache enable row level security;
alter table public.aura_external_price_observations enable row level security;
alter table public.aura_material_shadow_assessments enable row level security;

revoke all on table public.aura_common_material_alternatives, public.aura_common_material_evidence,
  public.aura_common_material_classifications, public.aura_external_product_cache,
  public.aura_external_price_observations, public.aura_material_shadow_assessments from public, anon, authenticated;
grant all on table public.aura_common_material_alternatives, public.aura_common_material_evidence,
  public.aura_common_material_classifications, public.aura_external_product_cache,
  public.aura_external_price_observations, public.aura_material_shadow_assessments to service_role;
grant select on table public.aura_common_material_alternatives, public.aura_common_material_evidence,
  public.aura_common_material_classifications, public.aura_external_product_cache,
  public.aura_external_price_observations, public.aura_material_shadow_assessments to authenticated;

create policy "aura_common_alternatives_staff_read" on public.aura_common_material_alternatives for select to authenticated using ((select private.is_admin_or_staff()));
create policy "aura_common_evidence_staff_read" on public.aura_common_material_evidence for select to authenticated using ((select private.is_admin_or_staff()));
create policy "aura_common_classifications_staff_read" on public.aura_common_material_classifications for select to authenticated using ((select private.is_admin_or_staff()));
create policy "aura_external_products_staff_read" on public.aura_external_product_cache for select to authenticated using ((select private.is_admin_or_staff()));
create policy "aura_external_prices_staff_read" on public.aura_external_price_observations for select to authenticated using ((select private.is_admin_or_staff()));
create policy "aura_shadow_assessments_staff_read" on public.aura_material_shadow_assessments for select to authenticated using ((select private.is_admin_or_staff()));

-- Seed one small generic starting point per requested trade. Every seed remains
-- Needs Confirmation until evidence and manager approval justify a stronger label.
insert into public.aura_material_intelligence_rules
  (rule_key, category, aliases, required_fields, safe_defaults, question_templates, source_path, source_kind, priority,
   construction_stage, trade, generic_product, common_specification, optional_attributes, compatibility_blockers,
   search_synonyms, common_unit, common_use, first_blocker_attribute, first_question, confidence_label, evidence_confidence, manager_approved)
values
 ('general-jobsite-consumables','jobsite consumables',array['jobsite supplies','consumables'],array['product','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',200,'General conditions','General conditions','Jobsite consumable','{}',array['brand'], '["hazardous-material requirements"]','{jobsite supplies,consumables}','each','Daily jobsite support','product','Which jobsite supply do you need?','Needs Confirmation',0,false),
 ('site-geotextile','geotextile',array['geotextile','landscape fabric'],array['application','dimensions','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',201,'Site work','Site work','Geotextile fabric','{}',array['weight'], '["engineered specification"]','{geotextile,filter fabric,landscape fabric}','roll','Separation, filtration, or stabilization','application','Is it for separation, drainage, or stabilization?','Needs Confirmation',0,false),
 ('survey-layout-stakes','layout stakes',array['stakes','layout stakes'],array['dimensions','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',202,'Layout','Surveying','Wood layout stake','{}',array['grade'], '[]','{layout stakes,survey stakes,wood stakes}','bundle','Construction layout','dimensions','What stake size and length do you need?','Needs Confirmation',0,false),
 ('excavation-aggregate','bulk aggregate',array['gravel','stone','aggregate'],array['material','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',203,'Excavation','Excavation','Bulk aggregate','{}',array['gradation'], '["engineered compaction requirement"]','{gravel,stone,aggregate,fill}','yard','Base, drainage, or fill','material','Which material—clean stone, gravel, or fill?','Needs Confirmation',0,false),
 ('foundation-rebar','reinforcing steel',array['rebar','reinforcing bar'],array['size','length','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',204,'Foundation','Foundation','Reinforcing bar','{}',array['grade','coating'], '["structural design"]','{rebar,reinforcing bar}','piece','Concrete reinforcement','size','What rebar size is specified?','Needs Confirmation',0,false),
 ('concrete-mix','concrete mix',array['concrete','ready mix'],array['application','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',205,'Foundation','Concrete','Concrete or concrete mix','{}',array['strength','slump'], '["structural strength and exposure"]','{concrete,ready mix,bagged concrete}','yard','Concrete placement','application','What is the concrete being used for?','Needs Confirmation',0,false),
 ('masonry-cmu','concrete masonry unit',array['cmu','concrete block','cinder block'],array['size','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',206,'Structure','Masonry','Concrete masonry unit','{}',array['weight_class','color'], '["structural and fire requirements"]','{cmu,concrete block,cinder block}','each','Masonry walls','size','What block size do you need?','Needs Confirmation',0,false),
 ('dimensional-lumber','dimensional framing stud',array['stud','studs','lumber','2x4'],array['material','dimensions','length','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',207,'Structure','Framing','Dimensional framing stud','{}',array['grade','species'], '["structural grade and treatment"]','{stud,studs,lumber,2x4,2x6}','piece','Wall framing','material','Wood or metal studs?','Needs Confirmation',0,false),
 ('structural-steel-member','structural steel member',array['steel beam','steel column','structural steel'],array['model','length','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',208,'Structure','Structural steel','Structural steel member','{}',array['finish'], '["engineered design and connection details"]','{steel beam,steel column,structural steel}','piece','Structural framing','model','What exact member designation is on the plans?','Needs Confirmation',0,false),
 ('roofing-shingle','roof shingles',array['shingle','shingles','roofing shingles'],array['type','color_model','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',209,'Exterior enclosure','Roofing','Asphalt roofing shingle','{}',array['brand','warranty'], '["roof system compatibility and code"]','{shingle,shingles,roofing shingles}','bundle','Residential roofing','type','Architectural or 3-tab shingles?','Needs Confirmation',0,false),
 ('siding-cladding','siding',array['siding','cladding'],array['material','color_model','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',210,'Exterior enclosure','Siding','Exterior siding','{}',array['profile','brand'], '["assembly and wind requirements"]','{siding,cladding}','square','Exterior wall finish','material','Vinyl, fiber cement, wood, or another siding?','Needs Confirmation',0,false),
 ('waterproofing-membrane','waterproofing membrane',array['waterproofing','foundation membrane'],array['application','dimensions','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',211,'Exterior enclosure','Waterproofing','Waterproofing membrane','{}',array['thickness'], '["substrate and system compatibility"]','{waterproofing,foundation membrane,waterproof membrane}','roll','Below-grade or wet-area protection','application','Where will the membrane be installed?','Needs Confirmation',0,false),
 ('insulation-batt','batt insulation',array['insulation','batt insulation'],array['type','r_value','dimensions','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',212,'Exterior enclosure','Insulation','Batt insulation','{}',array['facing'], '["energy code and cavity dimensions"]','{insulation,batt insulation,fiberglass,rockwool}','package','Thermal and acoustic cavities','r_value','What R-value is required?','Needs Confirmation',0,false),
 ('drywall-sheet','gypsum board',array['sheetrock','sheet rock','drywall','gypsum board'],array['thickness','sheet_size','type','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',213,'Interior construction','Drywall','Gypsum board','{}',array['edge'], '["fire, moisture, and assembly rating"]','{sheetrock,sheet rock,drywall,gypsum board}','sheet','Interior walls and ceilings','thickness','What thickness do you need?','Needs Confirmation',0,false),
 ('electrical-breaker','residential circuit breaker',array['breaker','breakers','circuit breaker'],array['panel_manufacturer','amperage','poles','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',214,'MEP rough-in','Electrical','Residential circuit breaker','{}',array['voltage','interrupt_rating','model'], '["panel compatibility and listing"]','{breaker,breakers,circuit breaker}','each','Residential branch circuit protection','panel_manufacturer','What panel brand do you have—Square D, Siemens, Eaton, or another?','Needs Confirmation',0,false),
 ('plumbing-pipe','trade pipe',array['pipe','piping','pvc pipe','pex'],array['material','diameter','length','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',215,'MEP rough-in','Plumbing','Trade-specific pipe','{}',array['schedule','connection_type'], '["application, pressure, temperature, and code"]','{pipe,piping,pvc pipe,pex,copper pipe}','length','Water, waste, vent, gas, or other service','material','What pipe material do you need?','Needs Confirmation',0,false),
 ('hvac-duct','ductwork',array['duct','ductwork','hvac duct'],array['type','dimensions','length','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',216,'MEP rough-in','HVAC','HVAC ductwork','{}',array['gauge','insulation'], '["airflow design and code"]','{duct,ductwork,hvac duct}','length','Air distribution','type','Rigid, flex, or another duct type?','Needs Confirmation',0,false),
 ('fire-sprinkler-pipe','sprinkler pipe',array['sprinkler pipe','fire pipe'],array['material','diameter','length','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',217,'Life safety','Fire protection','Fire sprinkler pipe','{}',array['schedule','connection_type'], '["listed system design and fire code"]','{sprinkler pipe,fire pipe,fire protection pipe}','length','Fire sprinkler system','material','What listed pipe material is specified?','Needs Confirmation',0,false),
 ('window-residential','residential window',array['window','windows'],array['size','type','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',218,'Exterior enclosure','Windows','Residential window','{}',array['color','glazing','performance'], '["rough opening and performance requirements"]','{window,windows}','each','Exterior opening','size','What window size or rough opening do you need?','Needs Confirmation',0,false),
 ('exterior-door-prehung','prehung exterior door',array['exterior door','entry door'],array['size','handing','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',219,'Exterior enclosure','Exterior doors','Prehung exterior door','{}',array['material','finish'], '["egress, fire, impact, and handing requirements"]','{exterior door,entry door}','each','Exterior entry','size','What door size do you need?','Needs Confirmation',0,false),
 ('interior-door-prehung','prehung interior door',array['interior door','prehung door'],array['size','handing','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',220,'Interior construction','Interior doors','Prehung hollow-core interior door','{}',array['style','finish'], '["fire rating where applicable"]','{interior door,prehung door,hollow core door}','each','Interior passage opening','size','What door size do you need?','Needs Confirmation',0,false),
 ('cabinet-module','cabinet',array['cabinet','cabinets','base cabinet','wall cabinet'],array['type','dimensions','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',221,'Interior finishes','Cabinets','Base or wall cabinet','{}',array['style','color','handing'], '["layout and appliance clearances"]','{cabinet,cabinets,base cabinet,wall cabinet}','each','Kitchen or bath storage','type','Base, wall, tall, or vanity cabinet?','Needs Confirmation',0,false),
 ('countertop-slab','countertop',array['countertop','counter top','slab'],array['material','dimensions','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',222,'Interior finishes','Countertops','Countertop material','{}',array['color_model','edge'], '["template, cutout, and support requirements"]','{countertop,counter top,slab}','sq ft','Work surface','material','Quartz, granite, laminate, or another material?','Needs Confirmation',0,false),
 ('tile-finish','floor or wall tile',array['tile','tiles','porcelain tile','ceramic tile'],array['material','dimensions','color_model','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',223,'Interior finishes','Tile','Floor or wall tile','{}',array['finish'], '["wet-area, slip, substrate, and installation requirements"]','{tile,tiles,porcelain tile,ceramic tile}','sq ft','Floor or wall finish','material','Porcelain, ceramic, stone, or another tile?','Needs Confirmation',0,false),
 ('flooring-finish','flooring',array['flooring','lvp','hardwood floor'],array['material','dimensions','color_model','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',224,'Interior finishes','Flooring','Finish flooring','{}',array['wear_layer','finish'], '["substrate, moisture, and installation requirements"]','{flooring,lvp,hardwood floor,vinyl plank}','sq ft','Finish floor','material','LVP, hardwood, tile, or another flooring?','Needs Confirmation',0,false),
 ('paint-interior','interior wall paint',array['paint','wall paint','interior paint'],array['color_model','finish','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',225,'Interior finishes','Painting','Interior wall paint','{}',array['brand','product_line'], '["substrate and coating-system compatibility"]','{paint,wall paint,interior paint}','gallon','Interior wall coating','finish','What finish do you need—flat, eggshell, satin, or semi-gloss?','Needs Confirmation',0,false),
 ('finish-carpentry-trim','interior trim',array['baseboard','casing','molding','trim'],array['type','dimensions','length'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',226,'Interior finishes','Finish carpentry','Interior trim','{}',array['material','profile'], '[]','{baseboard,casing,molding,trim}','linear ft','Interior finish trim','type','Baseboard, casing, crown, or another trim?','Needs Confirmation',0,false),
 ('hardware-lockset','door lockset',array['lockset','door hardware','door knob','door lever'],array['type','finish','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',227,'Interior finishes','Hardware','Door lockset','{}',array['keying','backset'], '["door function and fire-rating compatibility"]','{lockset,door hardware,door knob,door lever}','each','Door operation and security','type','Passage, privacy, entry, or dummy function?','Needs Confirmation',0,false),
 ('appliance-major','major appliance',array['appliance','refrigerator','range','dishwasher'],array['product','dimensions','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',228,'Equipment','Appliances','Major appliance','{}',array['brand','model','finish'], '["utility and opening compatibility"]','{appliance,refrigerator,range,dishwasher}','each','Residential equipment','product','Which appliance do you need?','Needs Confirmation',0,false),
 ('lighting-led-fixture','LED light fixture',array['light fixture','lighting','led fixture'],array['type','size','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',229,'Electrical trim','Lighting','LED light fixture','{}',array['color_temperature','lumens','finish'], '["location, wet rating, voltage, and dimmer compatibility"]','{light fixture,lighting,led fixture}','each','Interior or exterior illumination','type','Recessed, surface, pendant, or another fixture?','Needs Confirmation',0,false),
 ('landscape-topsoil','landscape bulk material',array['topsoil','mulch','landscape soil'],array['material','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',230,'Site finishes','Landscaping','Landscape bulk material','{}',array['color','blend'], '[]','{topsoil,mulch,landscape soil}','yard','Planting and site finish','material','Topsoil, mulch, or another landscape material?','Needs Confirmation',0,false),
 ('closeout-bags','contractor cleanup bags',array['contractor bags','trash bags','cleanup bags'],array['size','quantity'],'{}','{}','/admin/ai-tools/material-intelligence','owner_approved',231,'Closeout','Cleaning and closeout','Contractor cleanup bags','{}',array['thickness'], '["hazardous waste requirements"]','{contractor bags,trash bags,cleanup bags}','box','Jobsite cleanup','size','What bag size do you need?','Needs Confirmation',0,false)
on conflict (rule_key) do update set
  construction_stage=excluded.construction_stage, trade=excluded.trade,
  generic_product=excluded.generic_product,
  common_category=excluded.category, common_required_attributes=excluded.required_fields,
  optional_attributes=excluded.optional_attributes, compatibility_blockers=excluded.compatibility_blockers,
  search_synonyms=excluded.search_synonyms, common_unit=excluded.common_unit, common_use=excluded.common_use,
  first_blocker_attribute=excluded.first_blocker_attribute, first_question=excluded.first_question,
  common_map_status='draft', common_map_source_kind='draft_seed', common_map_updated_at=now();

update public.aura_material_intelligence_rules
set enabled = false,
    source_kind = 'draft_seed',
    common_map_status = 'draft',
    common_map_source_kind = 'draft_seed',
    common_category = category,
    common_required_attributes = required_fields,
    common_map_updated_at = now()
where source_path = '/admin/ai-tools/material-intelligence' and priority between 200 and 299;

comment on table public.aura_material_intelligence_rules is 'Owner-reviewed operational completeness rules with separately gated draft/reviewed Common Materials Map metadata. Draft map rows are shadow-only.';
comment on table public.aura_material_shadow_assessments is 'Cross-channel SMS/WhatsApp material assessments. V1 is constrained to draft_only=true and has no send trigger.';
comment on table public.aura_external_price_observations is 'Location-aware external observations. Private rows and unapproved prices are never customer-facing.';
