CREATE OR REPLACE FUNCTION public.next_receipt_no()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare n int;
begin
  lock table public.fee_payments in share row exclusive mode;
  select coalesce(max(nullif(regexp_replace(receipt_no, '\D', '', 'g'), '')::int), 1000) + 1
    into n
  from public.fee_payments
  where receipt_no like 'RC-%';
  return 'RC-' || n::text;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.next_receipt_no() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.next_receipt_no() FROM anon;