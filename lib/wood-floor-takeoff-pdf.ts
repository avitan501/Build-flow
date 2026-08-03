import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

import type { WoodFloorRoom, WoodFloorTakeoffResult } from "@/lib/wood-floor-takeoff-extraction";
import type { WoodFloorMaterialCalculation } from "@/lib/wood-floor-takeoff-materials";
import type { ProjectRecord } from "@/lib/projects";

export type WoodFloorTakeoffPdfInput = {
  project: Pick<ProjectRecord, "id" | "name" | "address">;
  sourceFileName: string;
  takeoff: WoodFloorTakeoffResult;
  calculation: WoodFloorMaterialCalculation;
  createdAt: Date;
  productSelection?: {
    supplierName: string;
    productName: string;
    productUrl: string;
    thickness: string;
    species: string;
    grade: string;
    width: string;
    length: string;
    installationType: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    sqftPerBox?: number;
    pricePerSqft?: number;
    deliveryFee?: number;
    invoiceTotal?: number;
  };
};

function cleanText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

function selectedRooms(takeoff: WoodFloorTakeoffResult) {
  return takeoff.rooms.filter((room) => room.includeInTakeoff);
}

function excludedRooms(takeoff: WoodFloorTakeoffResult) {
  return takeoff.rooms.filter((room) => !room.includeInTakeoff);
}

function roomSourceLabel(room: WoodFloorRoom) {
  const reason = room.reason.toLowerCase();
  if (room.bboxPercent) return "Plan marker";
  if (reason.includes("light and ventilation") || reason.includes("schedule")) return "Schedule";
  if (reason.includes("manual")) return "Manual";
  if (reason.includes("nearby") || reason.includes("label")) return "Plan label";
  return "Reviewed";
}

function confidenceLabel(room: WoodFloorRoom) {
  if (room.confidence === null || room.confidence === undefined) return "Review";
  if (room.confidence >= 0.8) return "High";
  if (room.confidence >= 0.55) return "Medium";
  return "Low";
}

function excludedReasonLabel(room: WoodFloorRoom) {
  if (room.roomType === "kitchen") return "Excluded by default: kitchen";
  if (room.roomType === "bathroom") return "Excluded by default: bathroom";
  if (room.roomType === "basement") return "Excluded by default: basement";
  return room.reason;
}

function drawTextLine(page: PDFPage, text: string, x: number, y: number, options: { size: number; font: PDFFont; color?: ReturnType<typeof rgb> }) {
  page.drawText(cleanText(text), { x, y, size: options.size, font: options.font, color: options.color || rgb(0.05, 0.09, 0.16) });
}

export async function generateWoodFloorTakeoffPdf(input: WoodFloorTakeoffPdfInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const selected = selectedRooms(input.takeoff);
  const excluded = excludedRooms(input.takeoff);
  const createdLabel = input.createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  page.drawText("BUILDFLOW", { x: 48, y: 760, size: 20, font: bold, color: rgb(0.05, 0.09, 0.16) });
  page.drawText("Wood floor takeoff", { x: 48, y: 738, size: 10, font, color: rgb(0.28, 0.33, 0.42) });
  page.drawText("WOOD FLOOR TAKEOFF", { x: 372, y: 760, size: 12, font: bold, color: rgb(0.05, 0.09, 0.16) });
  page.drawText(`Created ${createdLabel}`, { x: 372, y: 742, size: 9, font, color: rgb(0.28, 0.33, 0.42) });
  page.drawLine({ start: { x: 48, y: 704 }, end: { x: 548, y: 704 }, thickness: 0.5, color: rgb(0.75, 0.8, 0.88) });

  page.drawText("Project", { x: 48, y: 680, size: 12, font: bold });
  page.drawText(cleanText(input.project.name), { x: 48, y: 662, size: 10, font });
  page.drawText(cleanText(input.project.address || "No project address"), { x: 48, y: 647, size: 9, font, color: rgb(0.34, 0.39, 0.48) });
  page.drawText(`Source: ${cleanText(input.sourceFileName)}`, { x: 48, y: 630, size: 9, font, color: rgb(0.34, 0.39, 0.48) });

  const product = input.productSelection;
  if (product) {
    page.drawText("Client Material Source", { x: 318, y: 680, size: 12, font: bold });
    page.drawText(cleanText(product.supplierName), { x: 318, y: 662, size: 9, font });
    page.drawText(cleanText(product.productName).slice(0, 44), { x: 318, y: 647, size: 8, font });
    page.drawText(`Size: ${cleanText(product.thickness)} x ${cleanText(product.width)} | Grade: ${cleanText(product.grade)}`, { x: 318, y: 633, size: 8, font });
    page.drawText(`${cleanText(product.length)} | ${cleanText(product.installationType)}`, { x: 318, y: 620, size: 8, font });
    if (product.pricePerSqft) {
      page.drawText(`Invoice ${cleanText(product.invoiceNumber)} | $${formatNumber(product.pricePerSqft, 2)}/sq ft`, { x: 318, y: 607, size: 8, font });
    }
  }

  page.drawRectangle({ x: 48, y: 520, width: 500, height: 70, borderColor: rgb(0.75, 0.8, 0.88), borderWidth: 0.5 });
  page.drawText("Selected floor area", { x: 58, y: 570, size: 9, font: bold });
  page.drawText(`${formatNumber(input.calculation.selectedAreaSqft, 2)} sq ft`, { x: 210, y: 570, size: 9, font });
  page.drawText("Waste", { x: 58, y: 550, size: 9, font: bold });
  page.drawText(`${formatNumber(input.calculation.wastePercent)}%`, { x: 210, y: 550, size: 9, font });
  page.drawText("Order area", { x: 318, y: 570, size: 9, font: bold });
  page.drawText(`${formatNumber(input.calculation.orderAreaSqft, 2)} sq ft`, { x: 450, y: 570, size: 9, font });
  page.drawText("Boxes", { x: 318, y: 550, size: 9, font: bold });
  page.drawText(`${input.calculation.boxCount}`, { x: 450, y: 550, size: 9, font });
  page.drawText("Sq ft per box", { x: 318, y: 530, size: 9, font: bold });
  page.drawText(`${formatNumber(input.calculation.sqftPerBox, 2)}`, { x: 450, y: 530, size: 9, font });
  if (input.calculation.pricePerSqft > 0) {
    page.drawText("Estimated cost", { x: 58, y: 530, size: 9, font: bold });
    page.drawText(`$${formatNumber(input.calculation.totalCost, 2)}`, { x: 210, y: 530, size: 9, font });
  }

  let y = 490;
  page.drawText("Included Rooms", { x: 48, y, size: 11, font: bold });
  y -= 18;
  for (const room of selected.slice(0, 18)) {
    page.drawText(`${cleanText(room.name)}${room.level ? ` (${cleanText(room.level)})` : ""}`, { x: 58, y, size: 8, font });
    page.drawText(`${formatNumber(room.areaSqft, 2)} sq ft`, { x: 330, y, size: 8, font });
    page.drawText(cleanText(room.roomType), { x: 430, y, size: 8, font, color: rgb(0.24, 0.45, 0.29) });
    y -= 13;
  }

  y -= 10;
  page.drawText("Excluded Rooms", { x: 48, y, size: 11, font: bold });
  y -= 18;
  for (const room of excluded.slice(0, 10)) {
    page.drawText(`${cleanText(room.name)} - ${formatNumber(room.areaSqft, 2)} sq ft`, { x: 58, y, size: 8, font, color: rgb(0.55, 0.24, 0.24) });
    y -= 13;
  }

  page.drawText("Assumptions: hallways are included when extracted, any room can be excluded, basements are excluded by default.", {
    x: 48,
    y: 42,
    size: 8,
    font,
    color: rgb(0.34, 0.39, 0.48),
  });
  page.drawText(cleanText(input.takeoff.notes).slice(0, 110), { x: 48, y: 28, size: 8, font, color: rgb(0.34, 0.39, 0.48) });

  const detailPage = pdf.addPage([612, 792]);
  detailPage.drawText("BUILDFLOW", { x: 48, y: 760, size: 18, font: bold, color: rgb(0.05, 0.09, 0.16) });
  detailPage.drawText("Review detail and source proof", { x: 48, y: 738, size: 10, font, color: rgb(0.28, 0.33, 0.42) });
  detailPage.drawLine({ start: { x: 48, y: 716 }, end: { x: 548, y: 716 }, thickness: 0.5, color: rgb(0.75, 0.8, 0.88) });

  detailPage.drawRectangle({ x: 48, y: 652, width: 500, height: 42, color: rgb(1, 0.98, 0.78), opacity: 0.95, borderColor: rgb(0.82, 0.72, 0.36), borderWidth: 0.6 });
  drawTextLine(detailPage, "Markup standard", 58, 677, { size: 9, font: bold });
  drawTextLine(
    detailPage,
    "Red/orange plan fills are only used when room coordinates exist. Otherwise quantities are shown as source-proof schedule/text values.",
    58,
    662,
    { size: 8, font, color: rgb(0.28, 0.33, 0.42) },
  );

  let detailY = 620;
  drawTextLine(detailPage, "Included Rooms", 48, detailY, { size: 12, font: bold });
  detailY -= 20;
  drawTextLine(detailPage, "Room", 58, detailY, { size: 8, font: bold, color: rgb(0.34, 0.39, 0.48) });
  drawTextLine(detailPage, "Area", 258, detailY, { size: 8, font: bold, color: rgb(0.34, 0.39, 0.48) });
  drawTextLine(detailPage, "Source", 344, detailY, { size: 8, font: bold, color: rgb(0.34, 0.39, 0.48) });
  drawTextLine(detailPage, "Confidence", 440, detailY, { size: 8, font: bold, color: rgb(0.34, 0.39, 0.48) });
  detailY -= 14;

  for (const room of selected.slice(0, 24)) {
    if (detailY < 108) break;
    detailPage.drawLine({ start: { x: 48, y: detailY + 9 }, end: { x: 548, y: detailY + 9 }, thickness: 0.35, color: rgb(0.88, 0.91, 0.95) });
    drawTextLine(detailPage, `${room.name}${room.level ? ` (${room.level})` : ""}`.slice(0, 34), 58, detailY, { size: 8, font });
    drawTextLine(detailPage, `${formatNumber(room.areaSqft, 2)} SF`, 258, detailY, { size: 8, font: bold, color: rgb(0.02, 0.13, 0.72) });
    drawTextLine(detailPage, roomSourceLabel(room), 344, detailY, { size: 8, font });
    drawTextLine(detailPage, confidenceLabel(room), 440, detailY, { size: 8, font });
    detailY -= 16;
  }

  detailY -= 12;
  drawTextLine(detailPage, "Excluded / Not Ordered", 48, detailY, { size: 12, font: bold });
  detailY -= 18;
  for (const room of excluded.slice(0, 14)) {
    if (detailY < 44) break;
    drawTextLine(detailPage, `${room.name} - ${formatNumber(room.areaSqft, 2)} SF - ${excludedReasonLabel(room)}`.slice(0, 92), 58, detailY, {
      size: 8,
      font,
      color: rgb(0.58, 0.29, 0.08),
    });
    detailY -= 14;
  }

  return Buffer.from(await pdf.save());
}

function markerColor(room: WoodFloorRoom) {
  if (!room.includeInTakeoff) return rgb(0.95, 0.48, 0.12);
  return rgb(0.95, 0.23, 0.18);
}

export async function generateMarkedWoodFloorPlanAttachment(input: {
  sourceBytes: Buffer;
  mimeType: string;
  sourceFileName: string;
  rooms: WoodFloorRoom[];
  calculation?: WoodFloorMaterialCalculation;
}) {
  const pdf =
    input.mimeType === "application/pdf"
      ? await PDFDocument.load(new Uint8Array(input.sourceBytes), { ignoreEncryption: true })
      : await PDFDocument.create();

  if (input.mimeType !== "application/pdf") {
    const page = pdf.addPage([612, 792]);
    const imageBytes = new Uint8Array(input.sourceBytes);
    const image = input.mimeType === "image/png" ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes);
    const scale = Math.min(540 / image.width, 700 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x: (612 - width) / 2, y: (792 - height) / 2, width, height });
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  const markedRooms = input.rooms.filter((room) => room.bboxPercent);
  const included = input.rooms.filter((room) => room.includeInTakeoff);
  const excluded = input.rooms.filter((room) => !room.includeInTakeoff);

  const drawBluebeamStyleLegend = (pageIndex: number) => {
    const page = pages[pageIndex];
    if (!page) return;
    const { width, height } = page.getSize();
    const boxWidth = Math.min(560, width * 0.48);
    const boxHeight = input.calculation ? 142 : 116;
    const x = Math.max(28, width * 0.055);
    const y = height - boxHeight - Math.max(28, height * 0.055);
    const textX = x + 16;
    const qtyX = x + boxWidth - 145;
    const swatchX = x + boxWidth - 42;

    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(1, 0.98, 0.58),
      opacity: 0.82,
      borderColor: rgb(0.72, 0.68, 0.35),
      borderWidth: 0.8,
    });

    page.drawText("BuildFlow Wood Floor Markup", {
      x: textX,
      y: y + boxHeight - 26,
      size: 14,
      font: bold,
      color: rgb(0.04, 0.09, 0.17),
    });

    let rowY = y + boxHeight - 50;
    const drawLegendRow = (label: string, qty: string, color: ReturnType<typeof rgb>, unit = "") => {
      page.drawText(cleanText(label).slice(0, 34), { x: textX, y: rowY, size: 11, font: bold, color: rgb(0.04, 0.09, 0.17) });
      page.drawText(`${qty}${unit ? ` ${unit}` : ""}`.trim(), { x: qtyX, y: rowY, size: 11, font: bold, color: rgb(0.02, 0.13, 0.72) });
      page.drawRectangle({ x: swatchX, y: rowY - 5, width: 18, height: 18, color, opacity: 0.75, borderColor: color, borderWidth: 1 });
      rowY -= 21;
    };

    if (input.calculation) {
      drawLegendRow("Wood floor selected area", formatNumber(input.calculation.selectedAreaSqft, 2), rgb(0.95, 0.23, 0.18), "SQ FT");
      drawLegendRow(`Order area incl. ${formatNumber(input.calculation.wastePercent)}% waste`, formatNumber(input.calculation.orderAreaSqft, 2), rgb(0.08, 0.72, 0.74), "SQ FT");
      drawLegendRow("Material boxes", formatNumber(input.calculation.boxCount), rgb(0.08, 0.34, 0.95), "EA");
    } else {
      const selectedArea = included.reduce((sum, room) => sum + room.areaSqft, 0);
      drawLegendRow("Wood floor selected area", formatNumber(selectedArea, 2), rgb(0.95, 0.23, 0.18), "SQ FT");
    }

    const note = markedRooms.length
      ? `${included.length} included rooms marked. ${excluded.length} rooms excluded from takeoff.`
      : `Source-proof mode: ${included.length} included rooms listed from schedule/text; exact room polygons were not available.`;
    page.drawText(cleanText(note).slice(0, 86), {
      x: textX,
      y: y + 14,
      size: 8,
      font,
      color: rgb(0.2, 0.24, 0.32),
    });
  };

  if (markedRooms.length > 0) {
    const markedPageIndexes = [...new Set(markedRooms.map((room) => Math.min(pages.length - 1, Math.max(0, (room.bboxPercent?.page || 1) - 1))))];
    for (const pageIndex of markedPageIndexes) drawBluebeamStyleLegend(pageIndex);
  }

  for (const room of markedRooms) {
    const box = room.bboxPercent;
    if (!box) continue;
    const page = pages[Math.min(pages.length - 1, Math.max(0, box.page - 1))];
    const { width, height } = page.getSize();
    const x = (box.x / 100) * width;
    const rectWidth = (box.width / 100) * width;
    const rectHeight = (box.height / 100) * height;
    const y = height - (box.y / 100) * height - rectHeight;
    const color = markerColor(room);

    page.drawRectangle({
      x,
      y,
      width: rectWidth,
      height: rectHeight,
      borderColor: color,
      borderWidth: 2,
      color,
      opacity: room.includeInTakeoff ? 0.28 : 0.16,
    });
    page.drawText(`${cleanText(room.name).slice(0, 20)} ${formatNumber(room.areaSqft, 2)} SF`, {
      x: x + 4,
      y: Math.max(10, y + rectHeight - 12),
      size: 8,
      font: bold,
      color,
    });
  }

  const proofPage = pdf.addPage([612, 792]);
  proofPage.drawText("BUILDFLOW SOURCE-PROOF MARKUP", { x: 44, y: 752, size: 14, font: bold, color: rgb(0.05, 0.09, 0.16) });
  proofPage.drawText(cleanText(input.sourceFileName).slice(0, 82), { x: 44, y: 734, size: 8, font, color: rgb(0.34, 0.39, 0.48) });
  proofPage.drawRectangle({ x: 44, y: 662, width: 524, height: 54, color: rgb(1, 0.98, 0.58), opacity: 0.9, borderColor: rgb(0.72, 0.68, 0.35), borderWidth: 0.8 });
  proofPage.drawText("Professional markup note", { x: 56, y: 694, size: 10, font: bold, color: rgb(0.05, 0.09, 0.16) });
  proofPage.drawText("Use proposed/floor/finish plan sources first. Demo, electrical, and duplicate non-flooring sheets are ignored when better sources exist.", {
    x: 56,
    y: 676,
    size: 8,
    font,
    color: rgb(0.28, 0.33, 0.42),
  });
  proofPage.drawText("Exact colored room fills are used only when coordinates exist. Schedule/text quantities are listed here for audit.", {
    x: 56,
    y: 664,
    size: 8,
    font,
    color: rgb(0.28, 0.33, 0.42),
  });

  if (input.calculation) {
    proofPage.drawText(`Selected: ${formatNumber(input.calculation.selectedAreaSqft, 2)} SQ FT`, { x: 56, y: 642, size: 10, font: bold, color: rgb(0.02, 0.13, 0.72) });
    proofPage.drawText(`Order: ${formatNumber(input.calculation.orderAreaSqft, 2)} SQ FT incl. ${formatNumber(input.calculation.wastePercent)}% waste`, { x: 230, y: 642, size: 10, font: bold, color: rgb(0.02, 0.13, 0.72) });
    proofPage.drawText(`Boxes: ${formatNumber(input.calculation.boxCount)} EA`, { x: 456, y: 642, size: 10, font: bold, color: rgb(0.02, 0.13, 0.72) });
  }

  let proofY = 606;
  proofPage.drawText("Included Rooms", { x: 44, y: proofY, size: 12, font: bold, color: rgb(0.05, 0.09, 0.16) });
  proofY -= 20;
  for (const room of included.slice(0, 28)) {
    if (proofY < 206) break;
    proofPage.drawLine({ start: { x: 44, y: proofY + 9 }, end: { x: 568, y: proofY + 9 }, thickness: 0.35, color: rgb(0.88, 0.91, 0.95) });
    proofPage.drawText(cleanText(room.name).slice(0, 32), { x: 56, y: proofY, size: 8, font, color: rgb(0.05, 0.09, 0.16) });
    proofPage.drawText(`${formatNumber(room.areaSqft, 2)} SF`, { x: 264, y: proofY, size: 8, font: bold, color: rgb(0.02, 0.13, 0.72) });
    proofPage.drawText(roomSourceLabel(room), { x: 352, y: proofY, size: 8, font, color: rgb(0.24, 0.39, 0.31) });
    proofPage.drawText(confidenceLabel(room), { x: 454, y: proofY, size: 8, font, color: rgb(0.34, 0.39, 0.48) });
    proofY -= 14;
  }

  proofY -= 18;
  proofPage.drawText("Excluded / Not Ordered", { x: 44, y: proofY, size: 12, font: bold, color: rgb(0.05, 0.09, 0.16) });
  proofY -= 18;
  for (const room of excluded.slice(0, 18)) {
    if (proofY < 40) break;
    proofPage.drawText(`${cleanText(room.name).slice(0, 32)} - ${formatNumber(room.areaSqft, 2)} SF - ${cleanText(excludedReasonLabel(room)).slice(0, 52)}`, {
      x: 56,
      y: proofY,
      size: 8,
      font,
      color: rgb(0.58, 0.29, 0.08),
    });
    proofY -= 13;
  }

  return Buffer.from(await pdf.save());
}
