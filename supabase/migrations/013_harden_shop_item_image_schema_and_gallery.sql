alter table public.shop_items
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists image_source text,
  add column if not exists image_license text,
  add column if not exists image_credit text,
  add column if not exists image_category text,
  add column if not exists image_gallery jsonb not null default '[]'::jsonb;

comment on column public.shop_items.image_gallery is 'Ordered gallery of material/shop item images. First image is treated as the primary image when present.';

update public.shop_items
set
  image_category = coalesce(image_category, category, 'Materials'),
  image_source = coalesce(image_source, 'BuildFlow local placeholder'),
  image_license = coalesce(image_license, 'BuildFlow placeholder asset'),
  image_credit = coalesce(image_credit, 'BuildFlow'),
  image_alt = coalesce(image_alt, name || ' material image'),
  image_gallery = case
    when jsonb_typeof(image_gallery) = 'array' and jsonb_array_length(image_gallery) > 0 then image_gallery
    else jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'imageUrl', coalesce(image_url, ''),
          'imageAlt', coalesce(image_alt, name || ' material image'),
          'imageSource', coalesce(image_source, 'BuildFlow local placeholder'),
          'imageLicense', coalesce(image_license, 'BuildFlow placeholder asset'),
          'imageCredit', coalesce(image_credit, 'BuildFlow'),
          'imageCategory', coalesce(image_category, category, 'Materials')
        )
      )
    )
  end
where image_url is null
   or image_alt is null
   or image_source is null
   or image_license is null
   or image_credit is null
   or image_category is null
   or image_gallery is null
   or jsonb_typeof(image_gallery) <> 'array'
   or jsonb_array_length(image_gallery) = 0;
