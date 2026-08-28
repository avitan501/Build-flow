-- RLS protects row access, while explicit table grants prevent operations such
-- as TRUNCATE that do not invoke row-level policies.
revoke all on public.material_catalog_item_departments from anon;
revoke all on public.material_catalog_item_departments from authenticated;
grant select, insert, update, delete on public.material_catalog_item_departments to authenticated;
