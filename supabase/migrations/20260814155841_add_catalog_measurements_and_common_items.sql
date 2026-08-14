alter table public.material_catalog_items
  add column if not exists measurement text not null default '',
  add column if not exists thickness text not null default '';

insert into public.material_catalog_items (
  category,
  item_code,
  name,
  description,
  measurement,
  thickness,
  default_quantity,
  unit,
  status,
  source,
  sort_order
)
values
  ('Framing', 'FRA-013', '2 x 4 x 8 ft. studs', 'Common wall framing lumber.', '8 ft. length', '2 x 4 nominal', 1, 'pcs', 'active', 'Common residential catalog', 130),
  ('Framing', 'FRA-014', '2 x 4 x 12 ft. lumber', 'Common wall framing lumber.', '12 ft. length', '2 x 4 nominal', 1, 'pcs', 'active', 'Common residential catalog', 140),
  ('Framing', 'FRA-015', '2 x 6 x 8 ft. studs', 'Common exterior-wall framing lumber.', '8 ft. length', '2 x 6 nominal', 1, 'pcs', 'active', 'Common residential catalog', 150),
  ('Framing', 'FRA-016', '2 x 6 x 12 ft. lumber', 'Common exterior-wall framing lumber.', '12 ft. length', '2 x 6 nominal', 1, 'pcs', 'active', 'Common residential catalog', 160),
  ('Framing', 'FRA-017', '2 x 8 x 16 ft. framing lumber', 'Common joist, header, and rafter lumber.', '16 ft. length', '2 x 8 nominal', 1, 'pcs', 'active', 'Common residential catalog', 170),
  ('Framing', 'FRA-018', '2 x 12 x 16 ft. framing lumber', 'Common joist, header, and rafter lumber.', '16 ft. length', '2 x 12 nominal', 1, 'pcs', 'active', 'Common residential catalog', 180),
  ('Framing', 'FRA-019', '4 x 4 x 8 ft. pressure-treated posts', 'Common exterior and structural pressure-treated posts.', '8 ft. length', '4 x 4 nominal', 1, 'pcs', 'active', 'Common residential catalog', 190),
  ('Framing', 'FRA-020', '1/2 in. plywood, 4 x 8 ft.', 'Common plywood sheathing panel.', '4 x 8 ft. sheet', '1/2 in.', 1, 'sheets', 'active', 'Common residential catalog', 200),
  ('Electrical', 'ELE-016', '6/3 NM-B electrical wire, 125 ft.', 'Common residential range or large-appliance cable.', '125 ft. roll', '6/3 NM-B', 1, 'rolls', 'active', 'Common residential catalog', 160),
  ('Electrical', 'ELE-017', '100-amp breaker subpanels', 'Common residential subpanel with main lugs.', '100 amp', '', 1, 'pcs', 'active', 'Common residential catalog', 170),
  ('Electrical', 'ELE-018', '30-amp double-pole breakers', 'Common two-pole branch-circuit breaker.', '30 amp', 'Double pole', 1, 'pcs', 'active', 'Common residential catalog', 180),
  ('Electrical', 'ELE-019', 'Three-way light switches', 'Common residential three-way wall switch.', '15 amp', 'Three-way', 1, 'pcs', 'active', 'Common residential catalog', 190),
  ('Electrical', 'ELE-020', 'Combination smoke and carbon-monoxide alarms', 'Common residential interconnected life-safety alarm.', '120 V hardwired', 'Battery backup', 1, 'pcs', 'active', 'Common residential catalog', 200)
on conflict do nothing;

update public.material_catalog_items item
set measurement = specifications.measurement,
    thickness = specifications.thickness,
    updated_at = now()
from (values
  ('FRA-001', '10 ft. length', '2 x 4 nominal'),
  ('FRA-002', '10 ft. length', '2 x 6 nominal'),
  ('FRA-003', '16 ft. length', '2 x 4 nominal'),
  ('FRA-004', '16 ft. length', '2 x 6 nominal'),
  ('FRA-005', '4 x 8 ft. sheet', '3/4 in.'),
  ('FRA-006', '4 x 8 ft. sheet', '7/16 in.'),
  ('FRA-007', '4 x 8 ft. sheet', '5/8 in.'),
  ('FRA-008', '16 ft. length', '2 x 10 nominal'),
  ('FRA-009', '16 ft. length', '2 x 6 nominal'),
  ('FRA-010', '3-1/4 in. nail length', ''),
  ('FRA-011', '2-3/8 in. nail length', ''),
  ('FRA-012', 'Standard tube', ''),
  ('FRA-013', '8 ft. length', '2 x 4 nominal'),
  ('FRA-014', '12 ft. length', '2 x 4 nominal'),
  ('FRA-015', '8 ft. length', '2 x 6 nominal'),
  ('FRA-016', '12 ft. length', '2 x 6 nominal'),
  ('FRA-017', '16 ft. length', '2 x 8 nominal'),
  ('FRA-018', '16 ft. length', '2 x 12 nominal'),
  ('FRA-019', '8 ft. length', '4 x 4 nominal'),
  ('FRA-020', '4 x 8 ft. sheet', '1/2 in.'),
  ('ELE-001', '250 ft. roll', '14/2 NM-B'),
  ('ELE-002', '250 ft. roll', '12/2 NM-B'),
  ('ELE-003', '250 ft. roll', '14/3 NM-B'),
  ('ELE-004', '250 ft. roll', '12/3 NM-B'),
  ('ELE-005', '250 ft. roll', '10/3 NM-B'),
  ('ELE-006', '125 ft. roll', '8/3 NM-B'),
  ('ELE-007', '200 amp main panel', ''),
  ('ELE-008', '15 amp', 'Single pole'),
  ('ELE-009', '20 amp', 'Single pole'),
  ('ELE-010', 'Single gang', ''),
  ('ELE-011', 'Two gang', ''),
  ('ELE-012', '6 in. fixture', 'LED'),
  ('ELE-013', '15 amp', 'Duplex'),
  ('ELE-014', '20 amp', 'GFCI'),
  ('ELE-015', '15 amp', 'Single pole'),
  ('ELE-016', '125 ft. roll', '6/3 NM-B'),
  ('ELE-017', '100 amp', ''),
  ('ELE-018', '30 amp', 'Double pole'),
  ('ELE-019', '15 amp', 'Three-way'),
  ('ELE-020', '120 V hardwired', 'Battery backup'),
  ('SHR-001', '4 x 12 ft. sheet', '1/2 in.'),
  ('SHR-002', '4 x 12 ft. sheet', '1/2 in.'),
  ('SHR-003', '4 x 8 ft. sheet', '5/8 in.'),
  ('SHR-004', '4.5 gal. pail', ''),
  ('SHR-005', '500 ft. roll', ''),
  ('SHR-006', '10 ft. length', ''),
  ('SHR-007', '25 lb. box', '1-1/4 in. screw'),
  ('SHR-008', '25 lb. box', '1-5/8 in. screw')
) as specifications(item_code, measurement, thickness)
where item.item_code = specifications.item_code;

-- Preserve the manually added duplicate for history while hiding it from the active catalog.
update public.material_catalog_items
set status = 'inactive',
    updated_at = now()
where item_code = 'SHE-NEW'
  and name = 'Sheet rock regular 4/8 5/8';
