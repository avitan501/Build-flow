create table if not exists public.material_catalog_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  item_code text not null,
  name text not null,
  description text not null default '',
  default_quantity numeric not null default 1 check (default_quantity > 0),
  unit text not null default 'each',
  image_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  source text not null default 'manual',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, name),
  unique (item_code)
);

create table if not exists public.material_catalog_supplier_prices (
  item_id uuid not null references public.material_catalog_items(id) on delete cascade,
  supplier_id text not null,
  supplier_name_snapshot text not null,
  supplier_sku text not null default '',
  unit_price numeric check (unit_price is null or unit_price >= 0),
  availability text not null default 'unknown' check (availability in ('available', 'not_available', 'unknown')),
  notes text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (item_id, supplier_id)
);

create index if not exists material_catalog_items_category_status_idx
  on public.material_catalog_items (category, status, sort_order, name);
create index if not exists material_catalog_supplier_prices_supplier_idx
  on public.material_catalog_supplier_prices (supplier_id, item_id);

alter table public.material_catalog_items enable row level security;
alter table public.material_catalog_supplier_prices enable row level security;

revoke all on public.material_catalog_items from anon;
revoke all on public.material_catalog_supplier_prices from anon;
grant select, insert, update, delete on public.material_catalog_items to authenticated;
grant select, insert, update, delete on public.material_catalog_supplier_prices to authenticated;

drop policy if exists material_catalog_items_manager_all on public.material_catalog_items;
create policy material_catalog_items_manager_all
on public.material_catalog_items
for all
to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

drop policy if exists material_catalog_supplier_prices_manager_all on public.material_catalog_supplier_prices;
create policy material_catalog_supplier_prices_manager_all
on public.material_catalog_supplier_prices
for all
to authenticated
using ((select private.is_admin_or_staff()))
with check ((select private.is_admin_or_staff()));

create or replace function public.staff_load_catalog_suppliers()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  suppliers jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.';
  end if;
  if not (select private.is_admin_or_staff()) then
    raise exception 'Manager permission is required.';
  end if;

  select coalesce(state #> '{qualificationSettings,suppliers}', '[]'::jsonb)
    into suppliers
    from public.workflow_manager_settings
   where id = 'singleton';

  return coalesce(suppliers, '[]'::jsonb);
end;
$$;

revoke all on function public.staff_load_catalog_suppliers() from public;
grant execute on function public.staff_load_catalog_suppliers() to authenticated;

insert into public.material_catalog_items (
  category, item_code, name, default_quantity, unit, source, sort_order
)
values
  ('Framing', 'FRA-001', '2 x 4 x 10 ft. studs', 900, 'pcs', 'Simple Material Comparison PDF', 10),
  ('Framing', 'FRA-002', '2 x 6 x 10 ft. studs', 440, 'pcs', 'Simple Material Comparison PDF', 20),
  ('Framing', 'FRA-003', '2 x 4 x 16 ft. lumber', 220, 'pcs', 'Simple Material Comparison PDF', 30),
  ('Framing', 'FRA-004', '2 x 6 x 16 ft. lumber', 100, 'pcs', 'Simple Material Comparison PDF', 40),
  ('Framing', 'FRA-005', '3/4 in. subfloor panels, 4 x 8 ft.', 172, 'sheets', 'Simple Material Comparison PDF', 50),
  ('Framing', 'FRA-006', '7/16 in. OSB wall sheathing, 4 x 8 ft.', 125, 'sheets', 'Simple Material Comparison PDF', 60),
  ('Framing', 'FRA-007', '5/8 in. OSB roof sheathing, 4 x 8 ft.', 110, 'sheets', 'Simple Material Comparison PDF', 70),
  ('Framing', 'FRA-008', '2 x 10 x 16 ft. framing lumber', 80, 'pcs', 'Simple Material Comparison PDF', 80),
  ('Framing', 'FRA-009', '2 x 6 x 16 ft. pressure-treated lumber', 40, 'pcs', 'Simple Material Comparison PDF', 90),
  ('Framing', 'FRA-010', '3-1/4 in. framing nails', 20, 'boxes', 'Simple Material Comparison PDF', 100),
  ('Framing', 'FRA-011', '2-3/8 in. sheathing nails', 12, 'boxes', 'Simple Material Comparison PDF', 110),
  ('Framing', 'FRA-012', 'Construction adhesive', 240, 'tubes', 'Simple Material Comparison PDF', 120),
  ('Electrical', 'ELE-001', '14/2 electrical wire, 250 ft.', 20, 'rolls', 'Simple Material Comparison PDF', 10),
  ('Electrical', 'ELE-002', '12/2 electrical wire, 250 ft.', 12, 'rolls', 'Simple Material Comparison PDF', 20),
  ('Electrical', 'ELE-003', '14/3 electrical wire, 250 ft.', 4, 'rolls', 'Simple Material Comparison PDF', 30),
  ('Electrical', 'ELE-004', '12/3 electrical wire, 250 ft.', 6, 'rolls', 'Simple Material Comparison PDF', 40),
  ('Electrical', 'ELE-005', '10/3 electrical wire, 250 ft.', 2, 'rolls', 'Simple Material Comparison PDF', 50),
  ('Electrical', 'ELE-006', '8/3 electrical wire, 125 ft.', 2, 'rolls', 'Simple Material Comparison PDF', 60),
  ('Electrical', 'ELE-007', '200-amp breaker panels', 2, 'pcs', 'Simple Material Comparison PDF', 70),
  ('Electrical', 'ELE-008', '15-amp breakers', 24, 'pcs', 'Simple Material Comparison PDF', 80),
  ('Electrical', 'ELE-009', '20-amp breakers', 28, 'pcs', 'Simple Material Comparison PDF', 90),
  ('Electrical', 'ELE-010', 'Single electrical boxes', 180, 'pcs', 'Simple Material Comparison PDF', 100),
  ('Electrical', 'ELE-011', 'Double electrical boxes', 80, 'pcs', 'Simple Material Comparison PDF', 110),
  ('Electrical', 'ELE-012', 'LED recessed lights', 70, 'pcs', 'Simple Material Comparison PDF', 120),
  ('Electrical', 'ELE-013', 'Standard electrical outlets', 180, 'pcs', 'Simple Material Comparison PDF', 130),
  ('Electrical', 'ELE-014', 'GFCI outlets', 36, 'pcs', 'Simple Material Comparison PDF', 140),
  ('Electrical', 'ELE-015', 'Light switches', 90, 'pcs', 'Simple Material Comparison PDF', 150),
  ('Tile', 'TIL-001', 'Porcelain floor tile - any standard color', 1000, 'sq. ft.', 'Simple Material Comparison PDF', 10),
  ('Tile', 'TIL-002', 'Ceramic or porcelain wall tile - any standard color', 1750, 'sq. ft.', 'Simple Material Comparison PDF', 20),
  ('Tile', 'TIL-003', 'Kitchen backsplash tile - any standard color', 275, 'sq. ft.', 'Simple Material Comparison PDF', 30),
  ('Tile', 'TIL-004', '1/2-in. cement backer board, 3 x 5 ft.', 120, 'sheets', 'Simple Material Comparison PDF', 40),
  ('Tile', 'TIL-005', 'Thinset mortar, 50 lb.', 60, 'bags', 'Simple Material Comparison PDF', 50),
  ('Tile', 'TIL-006', 'Grout, 25 lb. - any standard color', 30, 'bags', 'Simple Material Comparison PDF', 60),
  ('Tile', 'TIL-007', 'Floor leveler, 50 lb.', 25, 'bags', 'Simple Material Comparison PDF', 70),
  ('Tile', 'TIL-008', 'Tile waterproofing, 3.5 gal.', 20, 'pails', 'Simple Material Comparison PDF', 80),
  ('Tile', 'TIL-009', 'Metal tile edge trim', 500, 'lin. ft.', 'Simple Material Comparison PDF', 90),
  ('Tile', 'TIL-010', 'Tile leveling clips, 500-count', 20, 'bags', 'Simple Material Comparison PDF', 100),
  ('Tile', 'TIL-011', 'Reusable tile leveling wedges, 250-count', 10, 'bags', 'Simple Material Comparison PDF', 110),
  ('Tile', 'TIL-012', 'Tile spacers', 30, 'bags', 'Simple Material Comparison PDF', 120),
  ('Tile', 'TIL-013', 'Silicone sealant', 150, 'tubes', 'Simple Material Comparison PDF', 130),
  ('Tile', 'TIL-014', 'Cement-board screws', 12, 'boxes', 'Simple Material Comparison PDF', 140),
  ('Sheet Rock', 'SHR-001', '1/2-in. regular drywall, 4 x 12 ft.', 420, 'sheets', 'Simple Material Comparison PDF', 10),
  ('Sheet Rock', 'SHR-002', '1/2-in. moisture-resistant drywall, 4 x 12 ft.', 70, 'sheets', 'Simple Material Comparison PDF', 20),
  ('Sheet Rock', 'SHR-003', '5/8-in. fire-rated drywall, 4 x 12 ft.', 60, 'sheets', 'Simple Material Comparison PDF', 30),
  ('Sheet Rock', 'SHR-004', 'All-purpose joint compound, 4.5 gal.', 55, 'pails', 'Simple Material Comparison PDF', 40),
  ('Sheet Rock', 'SHR-005', 'Paper drywall tape, 500 ft.', 30, 'rolls', 'Simple Material Comparison PDF', 50),
  ('Sheet Rock', 'SHR-006', 'Corner bead, 10 ft.', 200, 'pcs', 'Simple Material Comparison PDF', 60),
  ('Sheet Rock', 'SHR-007', '1-1/4 in. drywall screws, 25 lb.', 10, 'boxes', 'Simple Material Comparison PDF', 70),
  ('Sheet Rock', 'SHR-008', '1-5/8 in. drywall screws, 25 lb.', 6, 'boxes', 'Simple Material Comparison PDF', 80),
  ('Sheet Rock', 'SHR-009', 'Exterior-wall insulation', 2800, 'sq. ft.', 'Simple Material Comparison PDF', 90),
  ('Sheet Rock', 'SHR-010', 'Attic insulation', 2800, 'sq. ft.', 'Simple Material Comparison PDF', 100),
  ('Door & Molding', 'DOM-001', '30 x 80 in. interior doors', 24, 'pcs', 'Simple Material Comparison PDF', 10),
  ('Door & Molding', 'DOM-002', '28 x 80 in. interior doors', 10, 'pcs', 'Simple Material Comparison PDF', 20),
  ('Door & Molding', 'DOM-003', '24 x 80 in. interior doors', 6, 'pcs', 'Simple Material Comparison PDF', 30),
  ('Door & Molding', 'DOM-004', '36 x 80 in. exterior doors', 4, 'pcs', 'Simple Material Comparison PDF', 40),
  ('Door & Molding', 'DOM-005', '60 x 80 in. bifold closet doors', 4, 'sets', 'Simple Material Comparison PDF', 50),
  ('Door & Molding', 'DOM-006', '72 x 80 in. double closet doors', 4, 'sets', 'Simple Material Comparison PDF', 60),
  ('Door & Molding', 'DOM-007', 'Privacy lever sets - any standard finish', 16, 'sets', 'Simple Material Comparison PDF', 70),
  ('Door & Molding', 'DOM-008', 'Passage lever sets - any standard finish', 28, 'sets', 'Simple Material Comparison PDF', 80),
  ('Door & Molding', 'DOM-009', 'Exterior locksets and deadbolts', 4, 'sets', 'Simple Material Comparison PDF', 90),
  ('Door & Molding', 'DOM-010', '5-1/4 in. primed baseboard molding', 3200, 'lin. ft.', 'Simple Material Comparison PDF', 100),
  ('Door & Molding', 'DOM-011', '3-1/2 in. primed door and window casing', 1600, 'lin. ft.', 'Simple Material Comparison PDF', 110),
  ('Door & Molding', 'DOM-012', 'Primed crown molding', 1200, 'lin. ft.', 'Simple Material Comparison PDF', 120),
  ('Door & Molding', 'DOM-013', 'Primed shoe molding or quarter round', 3000, 'lin. ft.', 'Simple Material Comparison PDF', 130),
  ('Door & Molding', 'DOM-014', '2-1/2 in. collated finish nails', 12, 'boxes', 'Simple Material Comparison PDF', 140),
  ('Door & Molding', 'DOM-015', '2 in. collated brad nails', 12, 'boxes', 'Simple Material Comparison PDF', 150),
  ('Flooring', 'FLO-001', 'Wood flooring - any standard color', 4200, 'sq. ft.', 'Simple Material Comparison PDF', 10),
  ('Flooring', 'FLO-002', 'Flooring underlayment', 4200, 'sq. ft.', 'Simple Material Comparison PDF', 20),
  ('Flooring', 'FLO-003', 'Wood-flooring adhesive, 4 gal.', 22, 'pails', 'Simple Material Comparison PDF', 30),
  ('Flooring', 'FLO-004', 'Flooring vapor barrier, about 400 sq. ft. each', 12, 'rolls', 'Simple Material Comparison PDF', 40),
  ('Flooring', 'FLO-005', 'Matching T-molding transitions', 220, 'lin. ft.', 'Simple Material Comparison PDF', 50),
  ('Flooring', 'FLO-006', 'Matching reducer transitions', 160, 'lin. ft.', 'Simple Material Comparison PDF', 60),
  ('Flooring', 'FLO-007', 'Matching stair nosing', 120, 'lin. ft.', 'Simple Material Comparison PDF', 70),
  ('Flooring', 'FLO-008', 'Flooring cleats or staples', 8, 'boxes', 'Simple Material Comparison PDF', 80),
  ('Siding', 'SID-001', 'Vinyl siding - any standard color', 40, 'squares', 'Simple Material Comparison PDF', 10),
  ('Siding', 'SID-002', 'House wrap, 9 x 100 ft.', 5, 'rolls', 'Simple Material Comparison PDF', 20),
  ('Siding', 'SID-003', '4-in. flashing tape, 75 ft.', 14, 'rolls', 'Simple Material Comparison PDF', 30),
  ('Siding', 'SID-004', 'Vinyl siding starter strip', 240, 'lin. ft.', 'Simple Material Comparison PDF', 40),
  ('Siding', 'SID-005', 'Vinyl J-channel', 1000, 'lin. ft.', 'Simple Material Comparison PDF', 50),
  ('Siding', 'SID-006', 'Vinyl outside-corner posts', 360, 'lin. ft.', 'Simple Material Comparison PDF', 60),
  ('Siding', 'SID-007', 'Vinyl inside-corner posts', 120, 'lin. ft.', 'Simple Material Comparison PDF', 70),
  ('Siding', 'SID-008', 'Vinyl window and door trim', 900, 'lin. ft.', 'Simple Material Comparison PDF', 80),
  ('Siding', 'SID-009', 'Aluminum trim coil, 24 in. x 50 ft.', 10, 'rolls', 'Simple Material Comparison PDF', 90),
  ('Siding', 'SID-010', 'Vented vinyl soffit', 500, 'lin. ft.', 'Simple Material Comparison PDF', 100),
  ('Siding', 'SID-011', 'Aluminum fascia cover', 500, 'lin. ft.', 'Simple Material Comparison PDF', 110),
  ('Siding', 'SID-012', 'Siding nails, 30 lb.', 8, 'boxes', 'Simple Material Comparison PDF', 120),
  ('Siding', 'SID-013', 'Exterior sealant', 48, 'tubes', 'Simple Material Comparison PDF', 130),
  ('Roofing', 'ROO-001', 'Architectural roof shingles - any standard color', 108, 'bundles', 'Simple Material Comparison PDF', 10),
  ('Roofing', 'ROO-002', 'Matching ridge-cap shingles', 12, 'bundles', 'Simple Material Comparison PDF', 20),
  ('Roofing', 'ROO-003', 'Roof underlayment, 10 squares per roll', 4, 'rolls', 'Simple Material Comparison PDF', 30),
  ('Roofing', 'ROO-004', 'Ice and water membrane, 3 x 66.7 ft.', 10, 'rolls', 'Simple Material Comparison PDF', 40),
  ('Roofing', 'ROO-005', 'Aluminum drip edge', 450, 'lin. ft.', 'Simple Material Comparison PDF', 50),
  ('Roofing', 'ROO-006', 'Valley flashing', 120, 'lin. ft.', 'Simple Material Comparison PDF', 60),
  ('Roofing', 'ROO-007', 'Ridge vent', 60, 'lin. ft.', 'Simple Material Comparison PDF', 70),
  ('Roofing', 'ROO-008', 'Step flashing', 80, 'lin. ft.', 'Simple Material Comparison PDF', 80),
  ('Roofing', 'ROO-009', 'Plumbing vent pipe boots', 6, 'pcs', 'Simple Material Comparison PDF', 90),
  ('Roofing', 'ROO-010', '1-1/4 in. coil roofing nails', 3, 'boxes', 'Simple Material Comparison PDF', 100),
  ('Roofing', 'ROO-011', 'Plastic-cap roofing nails', 6, 'boxes', 'Simple Material Comparison PDF', 110),
  ('Roofing', 'ROO-012', 'Roofing sealant', 24, 'tubes', 'Simple Material Comparison PDF', 120),
  ('Windows', 'WIN-001', '3 ft. x 5 ft. double-hung windows', 12, 'pcs', 'Simple Material Comparison PDF', 10),
  ('Windows', 'WIN-002', '2 ft. 8 in. x 5 ft. double-hung windows', 10, 'pcs', 'Simple Material Comparison PDF', 20),
  ('Windows', 'WIN-003', '2 ft. 4 in. x 4 ft. 8 in. double-hung windows', 8, 'pcs', 'Simple Material Comparison PDF', 30),
  ('Windows', 'WIN-004', '4 ft. x 4 ft. picture windows', 8, 'pcs', 'Simple Material Comparison PDF', 40)
on conflict (category, name) do nothing;
