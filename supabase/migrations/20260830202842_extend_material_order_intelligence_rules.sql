insert into public.aura_material_intelligence_rules
  (rule_key, category, aliases, required_fields, safe_defaults, question_templates, source_path, source_kind, priority)
values
  ('dimensional-lumber','framing',array['lumber','wood lumber','2x4x8','2x6x8','wood studs'],array['quantity','dimensions','length'],
   '{"bare_2x4x8_material":"wood","explicit_material_always_wins":true}'::jsonb,
   '{"missing":"What lumber dimensions, length, and quantity do you need?"}'::jsonb,
   '/shop/framing','owner_approved',25),
  ('drywall-fastener','drywall',array['drywall screws','sheetrock screws'],array['quantity','length'],
   '{"one_1000_count_box_means_pieces":1000}'::jsonb,
   '{"missing":"What drywall-screw length and quantity do you need?"}'::jsonb,
   '/shop/sheet-rock','owner_approved',65)
on conflict (rule_key) do update set
  category = excluded.category,
  aliases = excluded.aliases,
  required_fields = excluded.required_fields,
  safe_defaults = excluded.safe_defaults,
  question_templates = excluded.question_templates,
  source_path = excluded.source_path,
  source_kind = excluded.source_kind,
  priority = excluded.priority,
  enabled = true,
  reviewed_at = now(),
  updated_at = now();
