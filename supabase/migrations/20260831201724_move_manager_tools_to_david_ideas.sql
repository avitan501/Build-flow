insert into public.website_work_items (
  task_key, title, category, status, assigned_agent, progress_percent,
  summary, next_step, source_chat_title, priority, sort_order,
  item_kind, published_to_carlos
)
values
  ('david-idea-jobsite-delivery', 'Jobsite Delivery', 'website_ux', 'open', 'David', 0, 'David idea.', '/admin/ai-tools/jobsite-delivery', 'David Dashboard', 2, 210, 'idea', false),
  ('david-idea-amazon-construction', 'Amazon Construction Tools', 'website_ux', 'open', 'David', 0, 'David idea.', '/admin/ai-tools/construction-amazon-deals', 'David Dashboard', 2, 220, 'idea', false),
  ('david-idea-estimate-converter', 'Beat Estimate Converter', 'website_ux', 'open', 'David', 0, 'David idea.', '/admin/ai-tools/estimate-converter', 'David Dashboard', 2, 230, 'idea', false),
  ('david-idea-locate-cheap-item', 'Locate Cheap Item', 'website_ux', 'open', 'David', 0, 'David idea.', '/admin/ai-tools/locate-cheap-item', 'David Dashboard', 2, 240, 'idea', false)
on conflict (task_key) do update set
  item_kind = excluded.item_kind,
  published_to_carlos = false,
  next_step = excluded.next_step,
  source_chat_title = excluded.source_chat_title;
