import type { DrywallPlanTakeoffResult } from "@/lib/drywall-plan-takeoff-extraction";
import type { DrywallMaterialCalculation } from "@/lib/drywall-takeoff-materials";
import type { ProjectRecord } from "@/lib/projects";
import { formatSiteDate } from "@/lib/site-date-time";

export type DrywallTakeoffPdfInput = {
  project: Pick<ProjectRecord, "id" | "name" | "address">;
  sourceFileName: string;
  takeoff: DrywallPlanTakeoffResult;
  calculation: DrywallMaterialCalculation;
  createdAt: Date;
};

function cleanPdfText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxLength: number) {
  const words = cleanPdfText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function textLine(x: number, y: number, size: number, text: string) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function rect(x: number, y: number, width: number, height: number) {
  return `${x} ${y} ${width} ${height} re S`;
}

function numberLabel(value: number, unit: string) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function summarizeOpeningSources(input: DrywallTakeoffPdfInput) {
  const sources = Array.from(
    new Set(
      input.takeoff.openings
        .map((opening) => cleanPdfText(opening.source || opening.kind))
        .filter(Boolean),
    ),
  );

  if (sources.length === 0) return "Openings entered manually or not extracted";
  return sources.slice(0, 3).join(", ");
}

function buildPageContent(input: DrywallTakeoffPdfInput) {
  const lines: string[] = [];
  const createdLabel = formatSiteDate(input.createdAt, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  lines.push("0.2 w");
  lines.push(textLine(48, 760, 20, "AVANTIA BUILD"));
  lines.push(textLine(48, 738, 10, "Drywall plan takeoff"));
  lines.push(textLine(382, 760, 12, "SHEETROCK TAKEOFF"));
  lines.push(textLine(382, 742, 9, `Created ${createdLabel}`));
  lines.push(textLine(48, 716, 9, `Source: ${input.sourceFileName}`));
  lines.push("48 704 500 0 l S");

  lines.push(textLine(48, 680, 12, "Project"));
  lines.push(textLine(48, 662, 10, input.project.name));
  lines.push(textLine(48, 647, 9, input.project.address || "No project address"));

  lines.push(textLine(318, 680, 12, "Plan Notes"));
  for (const [index, note] of wrapText(input.takeoff.notes, 48).slice(0, 3).entries()) {
    lines.push(textLine(318, 662 - index * 13, 8, note));
  }

  lines.push(rect(48, 524, 500, 94));
  lines.push(textLine(58, 598, 9, "Proposed linear feet"));
  lines.push(textLine(218, 598, 9, numberLabel(input.calculation.proposedLinearFeet, "LF")));
  lines.push(textLine(58, 578, 9, "Section wall height"));
  lines.push(textLine(218, 578, 9, numberLabel(input.calculation.wallHeightFeet, "FT")));
  lines.push(textLine(58, 558, 9, "Openings deducted"));
  lines.push(textLine(218, 558, 9, numberLabel(input.calculation.openingAreaSqft, "SQ FT")));
  lines.push(textLine(318, 598, 9, "Net drywall area"));
  lines.push(textLine(450, 598, 9, numberLabel(input.calculation.netAreaSqft, "SQ FT")));
  lines.push(textLine(318, 578, 9, "Order area"));
  lines.push(textLine(450, 578, 9, numberLabel(input.calculation.orderAreaSqft, "SQ FT")));
  lines.push(textLine(318, 558, 9, "Sheet count"));
  lines.push(textLine(450, 558, 9, `${input.calculation.sheetCount} sheets`));
  lines.push(textLine(58, 538, 8, "Assumptions"));
  const assumptionText = [
    `4x${input.calculation.sheetLengthFeet} board (${numberLabel(input.calculation.sheetAreaSqft, "SQ FT")} each)`,
    `${input.calculation.wastePercent}% waste`,
    input.calculation.wallSideMultiplier === 2 ? "both wall faces counted" : "one wall face counted",
    input.calculation.ceilingAreaSqft > 0 ? "ceiling included" : "ceiling excluded",
    `openings: ${summarizeOpeningSources(input)}`,
  ].join("; ");
  for (const [index, line] of wrapText(assumptionText, 88).slice(0, 2).entries()) {
    lines.push(textLine(128, 538 - index * 11, 8, line));
  }

  lines.push(rect(48, 472, 500, 28));
  lines.push(textLine(58, 490, 9, "Material"));
  lines.push(textLine(315, 490, 9, "Quantity"));
  lines.push(textLine(405, 490, 9, "Basis"));

  let y = 454;
  for (const row of input.calculation.rows) {
    lines.push(textLine(58, y, 9, row.label));
    lines.push(textLine(315, y, 9, row.quantity));
    for (const [index, detail] of wrapText(row.detail, 34).slice(0, 2).entries()) {
      lines.push(textLine(405, y - index * 11, 8, detail));
    }
    lines.push("48 " + (y - 16) + " 500 0 l S");
    y -= 30;
  }

  y -= 8;
  lines.push(textLine(48, y, 11, "Door and Window Openings"));
  y -= 20;
  const openings = input.takeoff.openings.slice(0, 12);
  if (openings.length === 0) {
    lines.push(textLine(58, y, 9, "No opening rows were extracted. Review manually before ordering."));
  } else {
    for (const opening of openings) {
      const size = opening.areaSqft
        ? `${opening.areaSqft} sq ft`
        : opening.widthFeet && opening.heightFeet
          ? `${opening.widthFeet} ft x ${opening.heightFeet} ft`
          : `${opening.widthLabel || "-"} x ${opening.heightLabel || "-"}`;
      lines.push(textLine(58, y, 8, `${opening.kind.toUpperCase()} ${opening.mark || ""}`));
      lines.push(textLine(160, y, 8, `Qty ${opening.quantity}`));
      lines.push(textLine(220, y, 8, size));
      lines.push(textLine(350, y, 8, opening.location || opening.source || ""));
      y -= 14;
    }
  }

  if (input.takeoff.scaleNote || input.takeoff.sectionNote) {
    lines.push(textLine(48, 76, 9, "Source notes"));
    lines.push(textLine(48, 62, 8, input.takeoff.scaleNote || ""));
    lines.push(textLine(48, 49, 8, input.takeoff.sectionNote || ""));
  }

  lines.push(textLine(48, 30, 8, "Generated by Avantia Build. Verify field dimensions, board rating, and local code before ordering."));
  return lines.join("\n");
}

export function generateDrywallTakeoffPdf(input: DrywallTakeoffPdfInput) {
  const content = buildPageContent(input);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf8");
}
