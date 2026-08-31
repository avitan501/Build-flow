alter table public.website_work_items
  drop constraint if exists website_work_items_item_kind_check;

alter table public.website_work_items
  add constraint website_work_items_item_kind_check
  check (item_kind in ('task', 'pain', 'idea'));

update public.website_work_items
set published_to_carlos = false
where item_kind <> 'task'
  and published_to_carlos = true;

alter table public.website_work_items
  drop constraint if exists website_work_items_publish_task_only_check;

alter table public.website_work_items
  add constraint website_work_items_publish_task_only_check
  check (item_kind = 'task' or published_to_carlos = false);

comment on column public.website_work_items.item_kind is
  'David Dashboard list: task, pain, or idea. Only tasks may be published to Carlos.';
