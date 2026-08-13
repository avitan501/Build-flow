alter function public.staff_save_quote_comparison_bid(uuid, uuid, numeric, numeric, integer, text, jsonb)
  security invoker;

alter function public.staff_award_quote_comparison_bid(uuid, uuid)
  security invoker;

alter function public.staff_reopen_quote_comparison(uuid)
  security invoker;
