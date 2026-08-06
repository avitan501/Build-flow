create table if not exists public.material_questionnaire_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  department_key text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  current_version integer not null default 1 check (current_version > 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.material_questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.material_questionnaire_categories(id) on delete cascade,
  question_key text not null,
  label text not null,
  help_text text not null default '',
  placeholder text not null default '',
  question_type text not null check (question_type in (
    'single_select', 'multi_select', 'yes_no', 'short_text', 'long_text',
    'number', 'quantity', 'square_feet', 'linear_feet', 'gallons', 'dropdown', 'file_upload'
  )),
  unit text,
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  allow_other boolean not null default false,
  conditional_parent_question_id uuid references public.material_questions(id) on delete set null,
  conditional_operator text check (conditional_operator is null or conditional_operator in ('equals', 'not_equals', 'includes_any', 'includes_all', 'is_answered')),
  conditional_value jsonb,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, question_key)
);

create table if not exists public.material_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.material_questions(id) on delete cascade,
  label text not null,
  value text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, value)
);

create table if not exists public.material_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.material_questionnaire_categories(id) on delete set null,
  category_name_snapshot text not null,
  category_slug_snapshot text not null,
  definition_version integer not null,
  definition_snapshot jsonb not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'complete')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, category_id)
);

create table if not exists public.material_request_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.material_questionnaire_responses(id) on delete cascade,
  question_id uuid references public.material_questions(id) on delete set null,
  question_key text not null,
  question_label_snapshot text not null,
  question_type_snapshot text not null,
  answer_value jsonb not null default 'null'::jsonb,
  answer_display_snapshot text not null default '',
  unit_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (response_id, question_key)
);

alter table public.quote_request_attachments
  add column if not exists material_response_id uuid references public.material_questionnaire_responses(id) on delete set null;

create index if not exists material_questions_category_order_idx on public.material_questions(category_id, sort_order);
create index if not exists material_question_options_question_order_idx on public.material_question_options(question_id, sort_order);
create index if not exists material_questionnaire_responses_owner_idx on public.material_questionnaire_responses(owner_id, updated_at desc);
create index if not exists material_questionnaire_responses_request_idx on public.material_questionnaire_responses(request_id, created_at);
create index if not exists material_request_answers_response_idx on public.material_request_answers(response_id, created_at);
create index if not exists quote_request_attachments_material_response_idx on public.quote_request_attachments(material_response_id);

create or replace function private.is_material_questionnaire_owner()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'avitanneto@gmail.com'
    and private.is_admin();
$$;

revoke all on function private.is_material_questionnaire_owner() from public, anon;
grant execute on function private.is_material_questionnaire_owner() to authenticated;

create or replace function public.touch_material_question_category_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_category_id uuid;
begin
  target_category_id := case when tg_op = 'DELETE' then old.category_id else new.category_id end;
  update public.material_questionnaire_categories
  set current_version = current_version + 1, updated_at = now()
  where id = target_category_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.touch_material_option_category_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_question_id uuid;
  target_category_id uuid;
begin
  target_question_id := case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  select category_id into target_category_id from public.material_questions where id = target_question_id;
  update public.material_questionnaire_categories
  set current_version = current_version + 1, updated_at = now()
  where id = target_category_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists touch_material_question_version on public.material_questions;
create trigger touch_material_question_version
after insert or update or delete on public.material_questions
for each row execute function public.touch_material_question_category_version();

drop trigger if exists touch_material_option_version on public.material_question_options;
create trigger touch_material_option_version
after insert or update or delete on public.material_question_options
for each row execute function public.touch_material_option_category_version();

drop trigger if exists set_material_questionnaire_categories_updated_at on public.material_questionnaire_categories;
create trigger set_material_questionnaire_categories_updated_at before update on public.material_questionnaire_categories
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_material_questions_updated_at on public.material_questions;
create trigger set_material_questions_updated_at before update on public.material_questions
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_material_question_options_updated_at on public.material_question_options;
create trigger set_material_question_options_updated_at before update on public.material_question_options
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_material_questionnaire_responses_updated_at on public.material_questionnaire_responses;
create trigger set_material_questionnaire_responses_updated_at before update on public.material_questionnaire_responses
for each row execute function public.set_quote_workflow_updated_at();
drop trigger if exists set_material_request_answers_updated_at on public.material_request_answers;
create trigger set_material_request_answers_updated_at before update on public.material_request_answers
for each row execute function public.set_quote_workflow_updated_at();

alter table public.material_questionnaire_categories enable row level security;
alter table public.material_questions enable row level security;
alter table public.material_question_options enable row level security;
alter table public.material_questionnaire_responses enable row level security;
alter table public.material_request_answers enable row level security;

create policy "material_categories_client_read" on public.material_questionnaire_categories
for select to authenticated using (is_active or (select private.is_material_questionnaire_owner()));
create policy "material_categories_owner_manage" on public.material_questionnaire_categories
for all to authenticated using ((select private.is_material_questionnaire_owner())) with check ((select private.is_material_questionnaire_owner()));

create policy "material_questions_client_read" on public.material_questions
for select to authenticated using (
  (is_active and exists (select 1 from public.material_questionnaire_categories category where category.id = category_id and category.is_active))
  or (select private.is_material_questionnaire_owner())
);
create policy "material_questions_owner_manage" on public.material_questions
for all to authenticated using ((select private.is_material_questionnaire_owner())) with check ((select private.is_material_questionnaire_owner()));

create policy "material_options_client_read" on public.material_question_options
for select to authenticated using (
  (is_active and exists (
    select 1 from public.material_questions question
    join public.material_questionnaire_categories category on category.id = question.category_id
    where question.id = question_id and question.is_active and category.is_active
  )) or (select private.is_material_questionnaire_owner())
);
create policy "material_options_owner_manage" on public.material_question_options
for all to authenticated using ((select private.is_material_questionnaire_owner())) with check ((select private.is_material_questionnaire_owner()));

create policy "material_responses_owner_read" on public.material_questionnaire_responses
for select to authenticated using ((select auth.uid()) = owner_id or (select private.is_material_questionnaire_owner()));
create policy "material_responses_owner_insert" on public.material_questionnaire_responses
for insert to authenticated with check (
  (select auth.uid()) = owner_id and exists (
    select 1 from public.quote_requests request
    where request.id = request_id and request.project_id = project_id and request.owner_id = (select auth.uid()) and request.status = 'draft'
  )
);
create policy "material_responses_owner_update" on public.material_questionnaire_responses
for update to authenticated using (
  ((select auth.uid()) = owner_id and exists (select 1 from public.quote_requests request where request.id = request_id and request.status = 'draft'))
  or (select private.is_material_questionnaire_owner())
) with check ((select auth.uid()) = owner_id or (select private.is_material_questionnaire_owner()));

create policy "material_answers_owner_read" on public.material_request_answers
for select to authenticated using (
  exists (select 1 from public.material_questionnaire_responses response where response.id = response_id and (response.owner_id = (select auth.uid()) or (select private.is_material_questionnaire_owner())))
);
create policy "material_answers_owner_insert" on public.material_request_answers
for insert to authenticated with check (
  exists (
    select 1 from public.material_questionnaire_responses response
    join public.quote_requests request on request.id = response.request_id
    where response.id = response_id and response.owner_id = (select auth.uid()) and request.status = 'draft'
  )
);
create policy "material_answers_owner_update" on public.material_request_answers
for update to authenticated using (
  exists (
    select 1 from public.material_questionnaire_responses response
    join public.quote_requests request on request.id = response.request_id
    where response.id = response_id and ((response.owner_id = (select auth.uid()) and request.status = 'draft') or (select private.is_material_questionnaire_owner()))
  )
) with check (
  exists (select 1 from public.material_questionnaire_responses response where response.id = response_id and (response.owner_id = (select auth.uid()) or (select private.is_material_questionnaire_owner())))
);
create policy "material_answers_owner_delete" on public.material_request_answers
for delete to authenticated using (
  exists (
    select 1 from public.material_questionnaire_responses response
    join public.quote_requests request on request.id = response.request_id
    where response.id = response_id and ((response.owner_id = (select auth.uid()) and request.status = 'draft') or (select private.is_material_questionnaire_owner()))
  )
);

create policy "quote_requests_owner_delete_empty_draft" on public.quote_requests
for delete to authenticated using ((select auth.uid()) = owner_id and status = 'draft');

grant select, insert, update, delete on public.material_questionnaire_categories, public.material_questions, public.material_question_options to authenticated;
grant select, insert, update on public.material_questionnaire_responses to authenticated;
grant select, insert, update, delete on public.material_request_answers to authenticated;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'application/csv'
]
where id = 'project-uploads';

create policy "project_upload_files_material_owner_read" on storage.objects
for select to authenticated using (bucket_id = 'project-uploads' and (select private.is_material_questionnaire_owner()));

insert into public.material_questionnaire_categories (name, slug, department_key, description, sort_order)
values
  ('Hardwood Flooring', 'hardwood-flooring', 'Wood Floor', 'Flooring specifications, installation details, and matching accessories.', 10),
  ('Windows', 'windows', 'Window', 'Window plans, manufacturers, frame materials, and grille requirements.', 20),
  ('Sheetrock / Drywall', 'sheetrock-drywall', 'Sheet rock', 'Sheet dimensions, drywall types, fasteners, compound, and corner bead.', 30)
on conflict (slug) do update set
  name = excluded.name,
  department_key = excluded.department_key,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.material_questions (
  category_id, question_key, label, help_text, placeholder, question_type, unit,
  is_required, sort_order, allow_other, conditional_parent_question_id, conditional_operator, conditional_value, configuration
)
select category.id, seed.question_key, seed.label, seed.help_text, seed.placeholder, seed.question_type, seed.unit,
  seed.is_required, seed.sort_order, seed.allow_other,
  parent.id, seed.conditional_operator, seed.conditional_value, seed.configuration
from public.material_questionnaire_categories category
join (values
  ('hardwood-flooring','wood_type','What type of wood do you need?','','','single_select',null,true,10,true,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','flooring_area','How much flooring do you need?','','Enter square footage','square_feet','sq. ft.',true,20,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','board_width','What board width do you need?','','','single_select',null,false,30,true,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','flooring_type','What type of flooring do you need?','','','single_select',null,false,40,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','wood_grade','What wood grade do you prefer?','','','single_select',null,false,50,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','finish_type','What finish do you need?','','','single_select',null,false,60,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','prefinished_details','What color or finish do you need?','','Enter a brand, color name, finish, or matching details','short_text',null,false,70,false,'finish_type','equals','"prefinished"'::jsonb,'{}'::jsonb),
  ('hardwood-flooring','flooring_thickness','What flooring thickness do you need?','','','single_select',null,false,80,true,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','installation_method','What installation method will be used?','','','single_select',null,false,90,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','needs_bullnose','Do you need matching bullnose or stair nosing?','','','yes_no',null,false,100,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','bullnose_length','How many linear feet of bullnose or stair nosing do you need?','','Enter linear feet','linear_feet','linear ft.',false,110,false,'needs_bullnose','equals','"yes"'::jsonb,'{}'::jsonb),
  ('hardwood-flooring','needs_adhesive','Do you need flooring adhesive?','','','single_select',null,false,120,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','adhesive_gallons','How many gallons of adhesive do you need?','','Enter gallons','gallons','gallons',false,130,false,'needs_adhesive','equals','"yes"'::jsonb,'{}'::jsonb),
  ('hardwood-flooring','needs_underlayment','Do you need underlayment?','','','single_select',null,false,140,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','underlayment_area','How much underlayment do you need?','','Enter square footage','square_feet','sq. ft.',false,150,false,'needs_underlayment','equals','"yes"'::jsonb,'{}'::jsonb),
  ('hardwood-flooring','waste_allowance','Would you like us to include a recommended waste allowance?','Waste is commonly added for cuts, defects, and layout.','','yes_no',null,false,160,false,null,null,null,'{}'::jsonb),
  ('hardwood-flooring','specific_requirements','Do you have any specific requirements?','','Enter any specific brand, color, finish, thickness, matching requirement, installation requirement, or other details.','long_text',null,false,170,false,null,null,null,'{}'::jsonb),
  ('windows','specific_manufacturer','Do you require a specific window manufacturer or company?','','','single_select',null,false,10,false,null,null,null,'{}'::jsonb),
  ('windows','manufacturer_name','Which manufacturer or company?','Examples may include Andersen, Pella, Marvin, or another company.','','short_text',null,false,20,false,'specific_manufacturer','equals','"yes"'::jsonb,'{}'::jsonb),
  ('windows','follow_plans','Should all windows be ordered according to the construction plans?','','','single_select',null,false,30,false,null,null,null,'{}'::jsonb),
  ('windows','plan_exceptions','Which windows should not follow the plans, and what should be changed?','','Describe the windows and required changes','long_text',null,false,40,false,'follow_plans','equals','"some-different"'::jsonb,'{}'::jsonb),
  ('windows','window_plans','Upload window plans or schedules','PDF, image, Word, Excel, or CSV. Maximum 25 MB.','','file_upload',null,false,50,false,null,null,null,'{"maxFiles":5}'::jsonb),
  ('windows','frame_material','What frame material do you need?','','','single_select',null,false,60,true,null,null,null,'{}'::jsonb),
  ('windows','needs_grilles','Do you need window grilles or grids?','','','single_select',null,false,70,false,null,null,null,'{}'::jsonb),
  ('windows','grille_style','What grille or grid style do you need?','','','single_select',null,false,80,true,'needs_grilles','equals','"yes"'::jsonb,'{}'::jsonb),
  ('windows','window_requirements','Are there any specific window requirements?','','Enter information about color, glass type, opening style, dimensions, energy rating, hardware, matching existing windows, or other requirements.','long_text',null,false,90,false,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','sheet_count','How many sheets do you need?','','Enter number of sheets','number','sheets',true,10,false,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','sheet_size','What sheet size do you need?','','','single_select',null,false,20,false,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','custom_width','What custom sheet width do you need?','','Enter width','number','ft.',false,30,false,'sheet_size','equals','"other"'::jsonb,'{}'::jsonb),
  ('sheetrock-drywall','custom_length','What custom sheet length do you need?','','Enter length','number','ft.',false,40,false,'sheet_size','equals','"other"'::jsonb,'{}'::jsonb),
  ('sheetrock-drywall','thickness','What thickness do you need?','','','single_select',null,false,50,true,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','drywall_type','What type of drywall do you need?','','','single_select',null,false,60,true,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','needs_screws','Do you need drywall screws?','','','yes_no',null,false,70,false,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','screw_length','What screw length do you need?','','','single_select',null,false,80,true,'needs_screws','equals','"yes"'::jsonb,'{}'::jsonb),
  ('sheetrock-drywall','screw_quantity','How many screws or boxes do you need?','','Enter quantity','quantity',null,false,90,false,'needs_screws','equals','"yes"'::jsonb,'{"units":["screws","boxes","buckets"],"allowNotes":true}'::jsonb),
  ('sheetrock-drywall','needs_compound','Do you need joint compound / spackle?','','','yes_no',null,false,100,false,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','compound_type','What type of joint compound do you need?','','','single_select',null,false,110,true,'needs_compound','equals','"yes"'::jsonb,'{}'::jsonb),
  ('sheetrock-drywall','compound_quantity','How much joint compound do you need?','','Enter quantity','quantity',null,false,120,false,'needs_compound','equals','"yes"'::jsonb,'{"units":["gallons","buckets","bags","boxes"],"allowNotes":true}'::jsonb),
  ('sheetrock-drywall','needs_corner_bead','Do you need corner bead?','','','yes_no',null,false,130,false,null,null,null,'{}'::jsonb),
  ('sheetrock-drywall','corner_bead_type','What type of corner bead do you need?','','','single_select',null,false,140,true,'needs_corner_bead','equals','"yes"'::jsonb,'{}'::jsonb),
  ('sheetrock-drywall','corner_bead_length','What length of corner bead do you need?','','Enter linear feet','linear_feet','linear ft.',false,150,false,'needs_corner_bead','equals','"yes"'::jsonb,'{}'::jsonb),
  ('sheetrock-drywall','corner_bead_pieces','How many pieces do you need?','','Enter number of pieces','number','pieces',false,160,false,'needs_corner_bead','equals','"yes"'::jsonb,'{}'::jsonb),
  ('sheetrock-drywall','drywall_notes','Do you have any specific requirements or notes?','','Enter any additional requirements','long_text',null,false,170,false,null,null,null,'{}'::jsonb)
) as seed(category_slug, question_key, label, help_text, placeholder, question_type, unit, is_required, sort_order, allow_other, parent_key, conditional_operator, conditional_value, configuration)
  on category.slug = seed.category_slug
left join public.material_questions parent on parent.category_id = category.id and parent.question_key = seed.parent_key
on conflict (category_id, question_key) do nothing;

-- Resolve seeded parent references after all questions exist.
update public.material_questions child
set conditional_parent_question_id = parent.id
from public.material_questions parent, public.material_questionnaire_categories category
where child.category_id = category.id
  and parent.category_id = category.id
  and (
    (category.slug = 'hardwood-flooring' and child.question_key = 'prefinished_details' and parent.question_key = 'finish_type') or
    (category.slug = 'hardwood-flooring' and child.question_key = 'bullnose_length' and parent.question_key = 'needs_bullnose') or
    (category.slug = 'hardwood-flooring' and child.question_key = 'adhesive_gallons' and parent.question_key = 'needs_adhesive') or
    (category.slug = 'hardwood-flooring' and child.question_key = 'underlayment_area' and parent.question_key = 'needs_underlayment') or
    (category.slug = 'windows' and child.question_key = 'manufacturer_name' and parent.question_key = 'specific_manufacturer') or
    (category.slug = 'windows' and child.question_key = 'plan_exceptions' and parent.question_key = 'follow_plans') or
    (category.slug = 'windows' and child.question_key = 'grille_style' and parent.question_key = 'needs_grilles') or
    (category.slug = 'sheetrock-drywall' and child.question_key in ('custom_width','custom_length') and parent.question_key = 'sheet_size') or
    (category.slug = 'sheetrock-drywall' and child.question_key in ('screw_length','screw_quantity') and parent.question_key = 'needs_screws') or
    (category.slug = 'sheetrock-drywall' and child.question_key in ('compound_type','compound_quantity') and parent.question_key = 'needs_compound') or
    (category.slug = 'sheetrock-drywall' and child.question_key in ('corner_bead_type','corner_bead_length','corner_bead_pieces') and parent.question_key = 'needs_corner_bead')
  );

insert into public.material_question_options (question_id, label, value, sort_order)
select question.id, option_seed.label, option_seed.value, option_seed.sort_order
from public.material_questionnaire_categories category
join public.material_questions question on question.category_id = category.id
join (values
  ('hardwood-flooring','wood_type','White Oak','white-oak',10),('hardwood-flooring','wood_type','Red Oak','red-oak',20),('hardwood-flooring','wood_type','Other','other',30),
  ('hardwood-flooring','board_width','2 1/4"','2-1-4',10),('hardwood-flooring','board_width','3 1/4"','3-1-4',20),('hardwood-flooring','board_width','4"','4',30),('hardwood-flooring','board_width','5"','5',40),('hardwood-flooring','board_width','6"','6',50),('hardwood-flooring','board_width','7"','7',60),('hardwood-flooring','board_width','Other','other',70),
  ('hardwood-flooring','flooring_type','Solid Hardwood','solid-hardwood',10),('hardwood-flooring','flooring_type','Engineered Hardwood','engineered-hardwood',20),('hardwood-flooring','flooring_type','Not Sure','not-sure',30),
  ('hardwood-flooring','wood_grade','Select & Better','select-better',10),('hardwood-flooring','wood_grade','#1 Common','1-common',20),('hardwood-flooring','wood_grade','#2 Common','2-common',30),('hardwood-flooring','wood_grade','Best Available','best-available',40),('hardwood-flooring','wood_grade','No Preference','no-preference',50),
  ('hardwood-flooring','finish_type','Unfinished','unfinished',10),('hardwood-flooring','finish_type','Prefinished','prefinished',20),('hardwood-flooring','finish_type','No Preference','no-preference',30),
  ('hardwood-flooring','flooring_thickness','3/4"','3-4',10),('hardwood-flooring','flooring_thickness','5/8"','5-8',20),('hardwood-flooring','flooring_thickness','1/2"','1-2',30),('hardwood-flooring','flooring_thickness','Other','other',40),('hardwood-flooring','flooring_thickness','Not Sure','not-sure',50),
  ('hardwood-flooring','installation_method','Nail Down','nail-down',10),('hardwood-flooring','installation_method','Glue Down','glue-down',20),('hardwood-flooring','installation_method','Floating','floating',30),('hardwood-flooring','installation_method','Not Sure','not-sure',40),
  ('hardwood-flooring','needs_adhesive','Yes','yes',10),('hardwood-flooring','needs_adhesive','No','no',20),('hardwood-flooring','needs_adhesive','Not Sure','not-sure',30),
  ('hardwood-flooring','needs_underlayment','Yes','yes',10),('hardwood-flooring','needs_underlayment','No','no',20),('hardwood-flooring','needs_underlayment','Not Sure','not-sure',30),
  ('windows','specific_manufacturer','Yes','yes',10),('windows','specific_manufacturer','No','no',20),('windows','specific_manufacturer','No Preference','no-preference',30),
  ('windows','follow_plans','Yes, follow the plans for all windows','follow-all',10),('windows','follow_plans','No, some windows are different','some-different',20),('windows','follow_plans','Plans are not available','no-plans',30),('windows','follow_plans','Not Sure','not-sure',40),
  ('windows','frame_material','Wood','wood',10),('windows','frame_material','Vinyl','vinyl',20),('windows','frame_material','Aluminum','aluminum',30),('windows','frame_material','Fiberglass','fiberglass',40),('windows','frame_material','Composite','composite',50),('windows','frame_material','Clad Wood','clad-wood',60),('windows','frame_material','Other','other',70),('windows','frame_material','Not Sure','not-sure',80),
  ('windows','needs_grilles','Yes','yes',10),('windows','needs_grilles','No','no',20),('windows','needs_grilles','Not Sure','not-sure',30),
  ('windows','grille_style','Colonial','colonial',10),('windows','grille_style','Prairie','prairie',20),('windows','grille_style','Farmhouse','farmhouse',30),('windows','grille_style','Custom','custom',40),('windows','grille_style','Match Existing','match-existing',50),('windows','grille_style','Not Sure','not-sure',60),
  ('sheetrock-drywall','sheet_size','4'' x 8''','4x8',10),('sheetrock-drywall','sheet_size','4'' x 9''','4x9',20),('sheetrock-drywall','sheet_size','4'' x 10''','4x10',30),('sheetrock-drywall','sheet_size','4'' x 12''','4x12',40),('sheetrock-drywall','sheet_size','4.5'' x 10''','4-5x10',50),('sheetrock-drywall','sheet_size','4.5'' x 12''','4-5x12',60),('sheetrock-drywall','sheet_size','Other','other',70),
  ('sheetrock-drywall','thickness','1/4"','1-4',10),('sheetrock-drywall','thickness','3/8"','3-8',20),('sheetrock-drywall','thickness','1/2"','1-2',30),('sheetrock-drywall','thickness','5/8"','5-8',40),('sheetrock-drywall','thickness','Other','other',50),('sheetrock-drywall','thickness','Not Sure','not-sure',60),
  ('sheetrock-drywall','drywall_type','Regular','regular',10),('sheetrock-drywall','drywall_type','Moisture Resistant / Green Board','moisture-resistant',20),('sheetrock-drywall','drywall_type','Mold Resistant','mold-resistant',30),('sheetrock-drywall','drywall_type','Fire Rated / Type X','type-x',40),('sheetrock-drywall','drywall_type','Soundproof','soundproof',50),('sheetrock-drywall','drywall_type','Cement Board','cement-board',60),('sheetrock-drywall','drywall_type','Other','other',70),('sheetrock-drywall','drywall_type','Not Sure','not-sure',80),
  ('sheetrock-drywall','screw_length','1"','1',10),('sheetrock-drywall','screw_length','1 1/4"','1-1-4',20),('sheetrock-drywall','screw_length','1 5/8"','1-5-8',30),('sheetrock-drywall','screw_length','2"','2',40),('sheetrock-drywall','screw_length','2 1/2"','2-1-2',50),('sheetrock-drywall','screw_length','3"','3',60),('sheetrock-drywall','screw_length','Other','other',70),('sheetrock-drywall','screw_length','Not Sure','not-sure',80),
  ('sheetrock-drywall','compound_type','All Purpose','all-purpose',10),('sheetrock-drywall','compound_type','Lightweight','lightweight',20),('sheetrock-drywall','compound_type','Topping','topping',30),('sheetrock-drywall','compound_type','Setting-Type / Hot Mud','hot-mud',40),('sheetrock-drywall','compound_type','Premixed','premixed',50),('sheetrock-drywall','compound_type','Other','other',60),('sheetrock-drywall','compound_type','Not Sure','not-sure',70),
  ('sheetrock-drywall','corner_bead_type','Metal','metal',10),('sheetrock-drywall','corner_bead_type','Vinyl','vinyl',20),('sheetrock-drywall','corner_bead_type','Paper-Faced','paper-faced',30),('sheetrock-drywall','corner_bead_type','Bullnose','bullnose',40),('sheetrock-drywall','corner_bead_type','Other','other',50),('sheetrock-drywall','corner_bead_type','Not Sure','not-sure',60)
) as option_seed(category_slug, question_key, label, value, sort_order)
  on category.slug = option_seed.category_slug and question.question_key = option_seed.question_key
on conflict (question_id, value) do nothing;

update public.material_questionnaire_categories
set current_version = 1, updated_at = now()
where slug in ('hardwood-flooring', 'windows', 'sheetrock-drywall');
