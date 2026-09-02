import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

import type { ClientQuoteSummary, QuoteComparisonRecord } from "@/lib/quote-comparison";
import { CREDIT_CARD_PROCESSING_TERM } from "@/lib/proposal-terms";

export type ClientQuotePdfInput = {
  comparison: QuoteComparisonRecord;
  clientName: string;
  createdAt: Date;
  summary: ClientQuoteSummary;
};

const navy = rgb(0.027, 0.067, 0.149);
const blue = rgb(0, 0.4, 0.8);
const slate = rgb(0.28, 0.35, 0.45);
const border = rgb(0.86, 0.89, 0.93);
const soft = rgb(0.97, 0.98, 0.99);

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function dateLabel(value: Date | string | null) {
  if (!value) return "Not specified";
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function clean(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
}

function wrap(font: PDFFont, value: string, size: number, width: number) {
  const words = clean(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(next, size) > width) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function rightText(page: PDFPage, font: PDFFont, text: string, right: number, y: number, size = 9, color = navy) {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, size, font, color });
}

export async function generateClientQuotePdf(input: ClientQuotePdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await readFile(path.join(process.cwd(), "public/images/avantia/avantia-build-lockup-share.png"));
  const logo = await pdf.embedPng(logoBytes);
  const pages: PDFPage[] = [];

  function addPage() {
    const page = pdf.addPage([612, 792]);
    pages.push(page);
    const logoScale = Math.min(190 / logo.width, 58 / logo.height);
    page.drawImage(logo, { x: 42, y: 710, width: logo.width * logoScale, height: logo.height * logoScale });
    rightText(page, bold, "MATERIAL QUOTE", 570, 750, 13, navy);
    rightText(page, regular, input.comparison.quote_number, 570, 732, 10, slate);
    page.drawLine({ start: { x: 42, y: 700 }, end: { x: 570, y: 700 }, thickness: 1, color: border });
    page.drawText("Avantia Build  |  build.avantiap.com  |  office@build.avantiap.com  |  (516) 908-8319", {
      x: 42,
      y: 30,
      size: 7.5,
      font: regular,
      color: slate,
    });
    return page;
  }

  let page = addPage();
  page.drawText("Prepared for", { x: 42, y: 668, size: 8, font: bold, color: blue });
  page.drawText(clean(input.clientName), { x: 42, y: 646, size: 16, font: bold, color: navy });
  page.drawText("Job location", { x: 320, y: 668, size: 8, font: bold, color: blue });
  const addressLines = wrap(regular, input.comparison.job_address || "No delivery address", 9, 250).slice(0, 2);
  addressLines.forEach((line, index) => page.drawText(line, { x: 320, y: 648 - index * 13, size: 9, font: regular, color: navy }));

  page.drawRectangle({ x: 42, y: 590, width: 528, height: 40, color: soft, borderColor: border, borderWidth: 1 });
  page.drawText(`Issued: ${dateLabel(input.createdAt)}`, { x: 54, y: 606, size: 9, font: regular, color: slate });
  page.drawText(`Department: ${clean(input.comparison.department || "General materials")}`, { x: 320, y: 606, size: 9, font: regular, color: slate });

  let y = 556;

  function tableHeader(target: PDFPage, position: number) {
    target.drawRectangle({ x: 42, y: position - 5, width: 528, height: 25, color: navy });
    target.drawText("Material", { x: 52, y: position + 3, size: 8, font: bold, color: rgb(1, 1, 1) });
    target.drawText("Qty", { x: 337, y: position + 3, size: 8, font: bold, color: rgb(1, 1, 1) });
    target.drawText("Unit price", { x: 403, y: position + 3, size: 8, font: bold, color: rgb(1, 1, 1) });
    target.drawText("Total", { x: 523, y: position + 3, size: 8, font: bold, color: rgb(1, 1, 1) });
  }

  tableHeader(page, y);
  y -= 30;

  for (const [index, line] of input.summary.lines.entries()) {
    if (y < 120) {
      page = addPage();
      y = 670;
      tableHeader(page, y);
      y -= 30;
    }
    const name = line.specification ? `${line.description} - ${line.specification}` : line.description;
    const nameLines = wrap(regular, name, 8.5, 270).slice(0, 2);
    const rowHeight = nameLines.length > 1 ? 38 : 28;
    if (index % 2 === 1) page.drawRectangle({ x: 42, y: y - rowHeight + 8, width: 528, height: rowHeight, color: soft });
    nameLines.forEach((text, textIndex) => page.drawText(text, { x: 52, y: y - textIndex * 11, size: 8.5, font: regular, color: navy }));
    page.drawText(`${line.quantity.toLocaleString()} ${clean(line.unit)}`, { x: 337, y, size: 8.5, font: regular, color: navy });
    rightText(page, regular, money(line.clientUnitPrice ?? 0), 477, y, 8.5, navy);
    rightText(page, bold, money(line.clientLineTotal), 560, y, 8.5, navy);
    page.drawLine({ start: { x: 42, y: y - rowHeight + 8 }, end: { x: 570, y: y - rowHeight + 8 }, thickness: 0.5, color: border });
    y -= rowHeight;
  }

  if (y < 290) {
    page = addPage();
    y = 650;
  }
  const totalsX = 390;
  page.drawText("Materials", { x: totalsX, y, size: 9, font: regular, color: slate });
  rightText(page, regular, money(input.summary.clientMaterialSubtotal), 560, y, 9, navy);
  y -= 18;
  if (input.summary.clientDeliveryCharge > 0) {
    page.drawText("Delivery", { x: totalsX, y, size: 9, font: regular, color: slate });
    rightText(page, regular, money(input.summary.clientDeliveryCharge), 560, y, 9, navy);
    y -= 18;
  }
  page.drawText(`Sales tax (${input.summary.clientTaxPercent.toFixed(3)}%)`, { x: totalsX, y, size: 9, font: regular, color: slate });
  rightText(page, regular, money(input.summary.clientTaxAmount), 560, y, 9, navy);
  y -= 18;
  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: 570, y: y + 8 }, thickness: 1, color: border });
  page.drawText("Quote total", { x: totalsX, y: y - 10, size: 12, font: bold, color: navy });
  rightText(page, bold, money(input.summary.clientTotal), 560, y - 10, 12, navy);

  const termsY = y - 55;
  page.drawText("Terms & conditions", { x: 42, y: termsY, size: 9, font: bold, color: blue });
  const termLines = wrap(regular, CREDIT_CARD_PROCESSING_TERM, 8.5, 510).slice(0, 4);
  termLines.forEach((line, index) => {
    page.drawText(line, { x: 42, y: termsY - 15 - index * 12, size: 8.5, font: regular, color: slate });
  });

  if (input.comparison.client_message.trim()) {
    const noteY = termsY - 28 - termLines.length * 12;
    page.drawText("Notes", { x: 42, y: noteY, size: 9, font: bold, color: blue });
    wrap(regular, input.comparison.client_message, 8.5, 510).slice(0, 4).forEach((line, index) => {
      page.drawText(line, { x: 42, y: noteY - 15 - index * 12, size: 8.5, font: regular, color: slate });
    });
  }

  pdf.setTitle(`Avantia Build Quote ${input.comparison.quote_number}`);
  pdf.setAuthor("Avantia Build");
  pdf.setSubject(`Material quote for ${input.clientName}`);
  return Buffer.from(await pdf.save());
}
