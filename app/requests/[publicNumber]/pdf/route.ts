import { generateCustomerMaterialRequestPdf } from "@/lib/customer-material-request-pdf";
import { getCustomerPortalRequests } from "@/lib/customer-request-portal";

export async function GET(_request: Request, { params }: { params: Promise<{ publicNumber: string }> }) {
  const { publicNumber } = await params;
  const portal = await getCustomerPortalRequests();
  const number = Number(publicNumber);
  const materialRequest = portal.signedIn && Number.isInteger(number)
    ? portal.requests.find((item) => item.publicNumber === number)
    : null;
  if (!materialRequest) return new Response("Request not found.", { status: 404 });

  const pdf = await generateCustomerMaterialRequestPdf(materialRequest);
  return new Response(pdf, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="Avantia-Request-${materialRequest.publicNumber}.pdf"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
