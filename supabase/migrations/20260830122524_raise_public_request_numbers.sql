select setval(
  'public.quote_request_public_number_seq',
  greatest(
    638377,
    coalesce((select max(public_number) from public.quote_requests), 0),
    (select last_value from public.quote_request_public_number_seq)
  ),
  true
);

comment on sequence public.quote_request_public_number_seq is
  'Six-digit customer-facing request numbers; next value is at least 638378.';
