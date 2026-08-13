create index if not exists quote_comparisons_request_idx
on public.quote_comparisons(request_id)
where request_id is not null;

create index if not exists quote_comparisons_created_by_idx
on public.quote_comparisons(created_by);

create index if not exists quote_comparisons_awarded_bid_idx
on public.quote_comparisons(awarded_bid_id)
where awarded_bid_id is not null;

create index if not exists quote_comparison_client_deliveries_created_by_idx
on public.quote_comparison_client_deliveries(created_by);
