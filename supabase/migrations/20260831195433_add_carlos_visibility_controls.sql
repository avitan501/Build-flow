insert into public.website_work_items (
  task_key, title, category, status, assigned_agent, progress_percent,
  summary, next_step, source_chat_title, priority, sort_order,
  item_kind, published_to_carlos
)
values
  ('carlos-fixed-client-target', 'Contact New Clients', 'carlos_focus', 'open', 'Carlos', 0,
   'Call new leads and record the next step.', 'Call new leads and record the next step.',
   'Carlos Dashboard', 1, 10, 'task', true),
  ('carlos-fixed-call-suppliers', 'Find Best Supplier Prices', 'suppliers_pricing', 'open', 'Carlos', 0,
   'Ask for best items, delivery minimum, and lead time.', 'Ask for best items, delivery minimum, and lead time.',
   'Carlos Dashboard', 1, 20, 'task', true),
  ('carlos-fixed-supplier-affiliate-program', 'Apply to Supplier Programs', 'suppliers_pricing', 'open', 'Carlos', 0,
   'Complete priority applications and follow up.', 'Complete priority applications and follow up.',
   'Carlos Dashboard', 1, 30, 'task', true),
  ('carlos-fixed-supplier-partnerships', 'Build Supplier Relationships', 'suppliers_pricing', 'open', 'Carlos', 0,
   'Contact suppliers and record the next follow-up.', 'Contact suppliers and record the next follow-up.',
   'Carlos Dashboard', 1, 40, 'task', true),
  ('carlos-fixed-abc-supply-demo', 'Prepare ABC Demo', 'suppliers_pricing', 'open', 'Carlos', 0,
   'Finish branch, product, price, and demo checks.', 'Finish branch, product, price, and demo checks.',
   'Carlos Dashboard', 1, 50, 'task', true)
on conflict (task_key) do nothing;

comment on column public.website_work_items.published_to_carlos is
  'David-controlled Show Carlos switch. True displays the task on Carlos Dashboard; false keeps it only on David Dashboard.';
