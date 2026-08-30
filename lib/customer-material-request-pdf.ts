import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import type { CustomerPortalRequest } from "@/lib/customer-request-portal";

function clean(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").trim();
}

export async function generateCustomerMaterialRequestPdf(request: CustomerPortalRequest) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 728;
  const navy = rgb(0.02, 0.08, 0.18);
  const blue = rgb(0.02, 0.4, 0.82);
  const slate = rgb(0.32, 0.37, 0.45);

  const addPage = () => {
    page = pdf.addPage([612, 792]);
    y = 740;
  };

  page.drawText("AVANTIA BUILD", { x: 44, y, size: 11, font: bold, color: blue });
  y -= 34;
  page.drawText("MATERIAL REQUEST", { x: 44, y, size: 24, font: bold, color: navy });
  y -= 26;
  page.drawText(`Request #${request.publicNumber}  |  ${clean(request.statusLabel)}`, { x: 44, y, size: 10, font: regular, color: slate });
  y -= 32;
  page.drawText(clean(request.title).slice(0, 88), { x: 44, y, size: 15, font: bold, color: navy });
  if (request.deliveryAddress) {
    y -= 22;
    page.drawText(`Delivery: ${clean(request.deliveryAddress).slice(0, 95)}`, { x: 44, y, size: 9, font: regular, color: slate });
  }
  y -= 30;
  page.drawRectangle({ x: 44, y: y - 4, width: 524, height: 24, color: navy });
  page.drawText("ITEM", { x: 54, y: y + 4, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText("QUANTITY", { x: 450, y: y + 4, size: 8, font: bold, color: rgb(1, 1, 1) });
  y -= 26;

  for (const item of request.items) {
    if (y < 70) addPage();
    page.drawText(clean(item.name).slice(0, 70), { x: 54, y, size: 9, font: regular, color: navy });
    page.drawText(`${item.quantity} ${clean(item.unit).slice(0, 18)}`, { x: 450, y, size: 9, font: bold, color: navy });
    page.drawLine({ start: { x: 44, y: y - 8 }, end: { x: 568, y: y - 8 }, thickness: 0.5, color: rgb(0.82, 0.84, 0.88) });
    y -= 24;
  }

  page.drawText("This document confirms the requested materials only. Price, availability, and delivery require Avantia confirmation.", { x: 44, y: 34, size: 7.5, font: regular, color: slate });
  pdf.setTitle(`Avantia Material Request ${request.publicNumber}`);
  pdf.setAuthor("Avantia Build");
  return new Uint8Array(await pdf.save());
}
