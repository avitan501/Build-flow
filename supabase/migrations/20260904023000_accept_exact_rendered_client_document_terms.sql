create or replace function public.accept_request_client_document_public(
  p_public_token uuid,
  p_document_version integer,
  p_signer_name text,
  p_signer_email text default null
)
returns table (
  acceptance_id uuid,
  accepted_document_version integer,
  accepted_terms_version text,
  accepted_terms_hash text,
  accepted_signer_name text,
  accepted_signer_email text,
  accepted_timestamp timestamptz,
  accepted_timezone text,
  was_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_terms text;
  saved_terms_hash text;
  credit_card_term constant text := 'A 3% processing fee applies to credit card payments.';
  restocking_term constant text := 'Approved returns may be subject to a restocking fee of up to 25% of the returned merchandise price, plus disclosed pickup, return-freight, or supplier charges. Returns require prior written authorization and remain subject to the applicable supplier return policy.';
  payment_dispute_term constant text := 'Before requesting a stop-payment, reversal, or chargeback, the customer agrees to contact Avantia promptly and allow a reasonable opportunity to investigate and resolve the issue. This does not waive any billing-error, dispute, or other right that cannot legally be waived.';
begin
  select btrim(pg_catalog.regexp_replace(coalesce(document.document_data ->> 'terms', ''), E'\r\n?', E'\n', 'g'))
  into saved_terms
  from public.request_client_documents as document
  where document.public_token = p_public_token;

  if not found then
    raise exception 'client_document_not_found';
  end if;

  -- Match the deterministic terms shown by clientDocumentTerms() on the live page.
  -- This also makes older saved documents acknowledge the exact complete text shown.
  if saved_terms !~* '3% processing fee applies to credit card payments' then
    saved_terms := pg_catalog.concat_ws(' ', nullif(saved_terms, ''), credit_card_term);
  end if;
  if saved_terms !~* 'restocking fee of up to 25%' then
    saved_terms := pg_catalog.concat_ws(' ', nullif(saved_terms, ''), restocking_term);
  end if;
  if saved_terms !~* 'before requesting a stop-payment, reversal, or chargeback' then
    saved_terms := pg_catalog.concat_ws(' ', nullif(saved_terms, ''), payment_dispute_term);
  end if;

  saved_terms := btrim(pg_catalog.regexp_replace(saved_terms, E'\r\n?', E'\n', 'g'));
  saved_terms_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(saved_terms, 'UTF8'), 'sha256'),
    'hex'
  );

  return query
  select result.*
  from public.accept_request_client_document(
    p_public_token,
    p_document_version,
    'avantia-client-document-terms-v2',
    saved_terms_hash,
    saved_terms,
    p_signer_name,
    p_signer_email
  ) as result;
end;
$$;

revoke all on function public.accept_request_client_document_public(uuid, integer, text, text) from public;
grant execute on function public.accept_request_client_document_public(uuid, integer, text, text) to anon, authenticated;

comment on function public.accept_request_client_document_public(uuid, integer, text, text) is
'Records acknowledgement of the exact current document version and the complete deterministic terms rendered to the signer.';
