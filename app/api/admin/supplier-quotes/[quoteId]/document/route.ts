import { requireStaffProfile } from '@/lib/auth'
import { SUPPLIER_QUOTE_BUCKET } from '@/lib/supplier-quotes'

export async function GET(_request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const { supabase } = await requireStaffProfile('suppliers')
  const { data: quote, error } = await supabase.from('supplier_quotes').select('file_path').eq('id', quoteId).maybeSingle<{file_path:string}>()
  if (error || !quote) return Response.json({ error: 'Original quote unavailable.' }, { status: 404 })
  const signed = await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).createSignedUrl(quote.file_path, 300)
  if (!signed.data?.signedUrl) return Response.json({ error: 'Original quote unavailable.' }, { status: 404 })
  return new Response(null, { status: 307, headers: { Location: signed.data.signedUrl, 'Cache-Control': 'private, no-store' } })
}
