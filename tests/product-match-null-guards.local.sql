\set ON_ERROR_STOP on
-- Run after product-match-confirmation.local.sql in an isolated empty database.
do $$declare v_case integer; v_result jsonb; begin
 for v_case in 1..9 loop
  update public.quote_comparison_prices set unit_price=12,is_available=true,notes='MFR V400 four inch valve';
  update public.quote_comparison_items set quantity=2,unit='each' where id='00000000-0000-4000-8000-000000000011';
  case v_case
   when 1 then update public.quote_comparison_prices set notes=null;
   when 2 then update public.quote_comparison_prices set is_available=null;
   when 3 then update public.quote_comparison_prices set unit_price='NaN';
   when 4 then update public.quote_comparison_prices set unit_price='Infinity';
   when 5 then update public.quote_comparison_prices set unit_price='-Infinity';
   when 6 then update public.quote_comparison_items set quantity=null where id='00000000-0000-4000-8000-000000000011';
   when 7 then update public.quote_comparison_items set quantity='NaN' where id='00000000-0000-4000-8000-000000000011';
   when 8 then update public.quote_comparison_items set quantity='Infinity' where id='00000000-0000-4000-8000-000000000011';
   when 9 then update public.quote_comparison_items set unit=null where id='00000000-0000-4000-8000-000000000011';
  end case;
  v_result:=public.staff_confirm_product_match('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001',public.test_match_snapshot(),repeat('b',64),'each');
  assert (v_result->>'ok')::boolean is false,format('invalid confirmation case %s accepted',v_case);
  assert not public.quote_product_match_is_eligible('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012'),format('invalid eligibility case %s accepted',v_case);
 end loop;
end $$;
select 'Nine invalid source/price/quantity cases rejected';
