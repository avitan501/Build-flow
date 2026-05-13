alter table public.shop_items
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists image_source text,
  add column if not exists image_license text,
  add column if not exists image_credit text,
  add column if not exists image_category text;

update public.shop_items
set
  image_category = coalesce(image_category, category, 'Materials'),
  image_source = coalesce(image_source, 'BuildFlow local static asset'),
  image_license = coalesce(image_license, 'BuildFlow internal placeholder'),
  image_credit = coalesce(image_credit, 'BuildFlow'),
  image_alt = coalesce(image_alt, name || ' material image')
where image_url is null
   or image_alt is null
   or image_source is null
   or image_license is null
   or image_credit is null
   or image_category is null;
