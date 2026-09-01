alter table public.website_work_items
  drop constraint if exists website_work_items_category_check;

alter table public.website_work_items
  add constraint website_work_items_category_check
  check (category in (
    'ai_communications',
    'documents_catalog',
    'requests_quotes',
    'suppliers_pricing',
    'carlos_focus',
    'website_ux',
    'integrations',
    'infrastructure',
    'phone_intake'
  ));

comment on constraint website_work_items_category_check on public.website_work_items is
  'Canonical dashboard categories, including trusted owner phone-intake tasks.';
