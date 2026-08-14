import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib"

export type RequestClientQuoteLine = {
  description: string
  quantity: number
  unit: string
  unitPrice: number
}

export type RequestClientQuotePdfInput = {
  quoteNumber: string
  issueDate: string
  expiresOn: string
  clientName: string
  clientAddress: string
  shipTo: string
  requestTitle: string
  lines: RequestClientQuoteLine[]
  deliveryCharge: number
  salesTaxRate: number
  terms: string
  ach?: {
    bankName: string
    accountOwner: string
    routingNumber: string
    accountNumber: string
  }
}

const navy = rgb(0.02, 0.06, 0.14)
const blue = rgb(0, 0.4, 0.8)
const slate = rgb(0.3, 0.35, 0.43)
const border = rgb(0.78, 0.81, 0.86)
const soft = rgb(0.965, 0.972, 0.982)

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function clean(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E\n]/g, "").trim()
}

function wrap(font: PDFFont, value: string, size: number, width: number) {
  const result: string[] = []
  for (const paragraph of clean(value).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let current = ""
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (current && font.widthOfTextAtSize(next, size) > width) {
        result.push(current)
        current = word
      } else current = next
    }
    result.push(current)
  }
  return result.length ? result : [""]
}

function rightText(page: PDFPage, font: PDFFont, value: string, right: number, y: number, size: number, color = navy) {
  page.drawText(value, { x: right - font.widthOfTextAtSize(value, size), y, size, font, color })
}

export async function generateRequestClientQuotePdf(input: RequestClientQuotePdfInput) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logoBytes = await readFile(path.join(process.cwd(), "public/images/avantia/avantia-build-lockup-share.png"))
  const logo = await pdf.embedPng(logoBytes)
  const subtotal = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const salesTax = (subtotal + input.deliveryCharge) * input.salesTaxRate / 100
  const total = subtotal + input.deliveryCharge + salesTax

  function addPage() {
    const page = pdf.addPage([612, 792])
    const logoScale = Math.min(175 / logo.width, 56 / logo.height)
    page.drawImage(logo, { x: 40, y: 714, width: logo.width * logoScale, height: logo.height * logoScale })
    rightText(page, bold, "ESTIMATE", 572, 752, 18)
    rightText(page, regular, `Code: ${clean(input.quoteNumber)}`, 572, 730, 9, slate)
    page.drawLine({ start: { x: 40, y: 700 }, end: { x: 572, y: 700 }, thickness: 1, color: border })
    page.drawText("Avantia Build  |  build.avantiap.com  |  office@build.avantiap.com  |  Call or text (516) 908-8319", { x: 40, y: 24, size: 7.2, font: regular, color: slate })
    return page
  }

  function drawInfoBox(page: PDFPage, x: number, title: string, body: string) {
    page.drawRectangle({ x, y: 605, width: 252, height: 76, borderColor: border, borderWidth: 1 })
    page.drawRectangle({ x, y: 661, width: 252, height: 20, color: soft, borderColor: border, borderWidth: 1 })
    page.drawText(title, { x: x + 9, y: 668, size: 8, font: bold, color: slate })
    wrap(regular, body || "Not provided", 8.5, 232).slice(0, 4).forEach((line, index) => page.drawText(line, { x: x + 9, y: 646 - index * 11, size: 8.5, font: regular, color: navy }))
  }

  function drawTableHeader(page: PDFPage, y: number) {
    page.drawRectangle({ x: 40, y: y - 5, width: 532, height: 24, color: navy })
    page.drawText("Item", { x: 48, y: y + 3, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    page.drawText("Description", { x: 82, y: y + 3, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    page.drawText("Quantity", { x: 370, y: y + 3, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    page.drawText("Unit price", { x: 432, y: y + 3, size: 7.5, font: bold, color: rgb(1, 1, 1) })
    page.drawText("Total", { x: 532, y: y + 3, size: 7.5, font: bold, color: rgb(1, 1, 1) })
  }

  let page = addPage()
  drawInfoBox(page, 40, "Customer / Address", `${input.clientName}\n${input.clientAddress}`)
  drawInfoBox(page, 320, "Ship To", input.shipTo)
  page.drawRectangle({ x: 40, y: 565, width: 532, height: 28, color: soft, borderColor: border, borderWidth: 1 })
  page.drawText(`Date: ${clean(input.issueDate)}`, { x: 50, y: 576, size: 8.5, font: regular, color: slate })
  page.drawText(`Valid through: ${clean(input.expiresOn)}`, { x: 190, y: 576, size: 8.5, font: regular, color: slate })
  page.drawText(`Request: ${clean(input.requestTitle).slice(0, 42)}`, { x: 360, y: 576, size: 8.5, font: regular, color: slate })

  let y = 530
  drawTableHeader(page, y)
  y -= 29
  for (const [index, line] of input.lines.entries()) {
    const descriptionLines = wrap(regular, line.description, 8, 270).slice(0, 2)
    const rowHeight = descriptionLines.length > 1 ? 34 : 25
    if (y - rowHeight < 190) {
      page = addPage()
      y = 670
      drawTableHeader(page, y)
      y -= 29
    }
    if (index % 2 === 1) page.drawRectangle({ x: 40, y: y - rowHeight + 7, width: 532, height: rowHeight, color: soft })
    page.drawText(String(index + 1), { x: 50, y, size: 8, font: regular, color: navy })
    descriptionLines.forEach((lineText, lineIndex) => page.drawText(lineText, { x: 82, y: y - lineIndex * 10, size: 8, font: regular, color: navy }))
    page.drawText(`${line.quantity.toLocaleString()} ${clean(line.unit)}`, { x: 370, y, size: 8, font: regular, color: navy })
    rightText(page, regular, money(line.unitPrice), 500, y, 8)
    rightText(page, bold, money(line.quantity * line.unitPrice), 564, y, 8)
    page.drawLine({ start: { x: 40, y: y - rowHeight + 7 }, end: { x: 572, y: y - rowHeight + 7 }, thickness: 0.5, color: border })
    y -= rowHeight
  }

  if (y < 245) {
    page = addPage()
    y = 650
  }
  const totalsX = 392
  page.drawText("Subtotal", { x: totalsX, y, size: 9, font: regular, color: slate }); rightText(page, regular, money(subtotal), 564, y, 9)
  y -= 18
  page.drawText("Delivery", { x: totalsX, y, size: 9, font: regular, color: slate }); rightText(page, regular, money(input.deliveryCharge), 564, y, 9)
  y -= 18
  page.drawText(`Sales tax (${input.salesTaxRate.toFixed(3)}%)`, { x: totalsX, y, size: 9, font: regular, color: slate }); rightText(page, regular, money(salesTax), 564, y, 9)
  y -= 22
  page.drawLine({ start: { x: totalsX, y: y + 10 }, end: { x: 572, y: y + 10 }, thickness: 1.2, color: navy })
  page.drawText("Total", { x: totalsX, y: y - 2, size: 13, font: bold, color: navy }); rightText(page, bold, money(total), 564, y - 2, 13)

  const termsY = Math.min(y - 48, 160)
  page.drawText("Terms & conditions", { x: 40, y: termsY, size: 9, font: bold, color: blue })
  wrap(regular, input.terms, 7.6, 330).slice(0, 7).forEach((line, index) => page.drawText(line, { x: 40, y: termsY - 13 - index * 10, size: 7.6, font: regular, color: slate }))
  if (input.ach && (input.ach.bankName || input.ach.accountOwner || input.ach.routingNumber || input.ach.accountNumber)) {
    page.drawText("ACH payment information", { x: 392, y: termsY, size: 9, font: bold, color: blue })
    const achLines = [
      `Bank: ${input.ach.bankName || "Not provided"}`,
      `Account owner: ${input.ach.accountOwner || "Not provided"}`,
      `Routing: ${input.ach.routingNumber || "Not provided"}`,
      `Account: ${input.ach.accountNumber || "Not provided"}`,
    ]
    achLines.forEach((line, index) => page.drawText(clean(line), { x: 392, y: termsY - 14 - index * 12, size: 7.8, font: regular, color: slate }))
  }

  pdf.setTitle(`Avantia Build Estimate ${input.quoteNumber}`)
  pdf.setAuthor("Avantia Build")
  pdf.setSubject(`Estimate for ${input.clientName}`)
  return Buffer.from(await pdf.save())
}
