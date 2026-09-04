export type MaterialIntakeRow = {
  id: string
  quantity: string
  unit: string
  item: string
  notes: string
  needsReview?: boolean
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, won: 1, un: 1, una: 1, uno: 1,
  two: 2, to: 2, too: 2, dos: 2,
  three: 3, tree: 3, tres: 3,
  four: 4, for: 4, cuatro: 4,
  five: 5, fiv: 5, cinco: 5,
  six: 6, sics: 6, seis: 6,
  seven: 7, seben: 7, siete: 7,
  eight: 8, ate: 8, ocho: 8,
  nine: 9, nein: 9, nueve: 9,
  ten: 10, diez: 10,
  eleven: 11, once: 11,
  twelve: 12, doce: 12,
  thirteen: 13, trece: 13,
  fourteen: 14, catorce: 14,
  fifteen: 15, quince: 15,
  sixteen: 16, dieciseis: 16,
  seventeen: 17, diecisiete: 17,
  eighteen: 18, dieciocho: 18,
  nineteen: 19, diecinueve: 19,
  twenty: 20, tuwnty: 20, veinte: 20,
  thirty: 30, tirty: 30, treinta: 30,
  forty: 40, fourty: 40, cuarenta: 40,
  fifty: 50, fivty: 50, cincuenta: 50,
  sixty: 60, sesenta: 60,
  seventy: 70, setenta: 70,
  eighty: 80, ochenta: 80,
  ninety: 90, noventa: 90,
}

const SAFE_TERM_CORRECTIONS: Array<[RegExp, string]> = [
  [/\bsheet\s*rock\b|\bshet\s*rok\b|\bshetrok\b|\bsheetrok\b/gi, "Sheetrock"],
  [/\bdry\s*wall\b|\bdrywal\b/gi, "drywall"],
  [/\breguler\b|\brelugar\b/gi, "regular"],
  [/\bunderlaymint\b|\bunderlaymentt\b/gi, "underlayment"],
  [/\badesiv(?:e)?\b|\badhesiv\b|\badhesivo\b/gi, "adhesive"],
  [/\bflor(?:ing)?\b|\bpiso\b/gi, "flooring"],
  [/\bbukkit(?:s)?\b|\bcubeta(?:s)?\b/gi, "bucket"],
  [/\brole(?:s)?\b(?=\s+(?:underlayment|roofing|membrane))/gi, "roll"],
  [/\bshet(?:s)?\b(?=\s+(?:\d|five|half|Sheetrock|drywall))/gi, "sheet"],
]

function normalizeFractionPhrases(value: string) {
  return value
    .replace(/\bfive[ -]eighths?\b|\bfive[ -]eights?\b/gi, "5/8 in.")
    .replace(/\bone[ -]half(?: inch)?\b/gi, "1/2 in.")
    .replace(/\bthree[ -]quarters?(?: inch)?\b/gi, "3/4 in.")
    .replace(/\bone[ -]quarter(?: inch)?\b/gi, "1/4 in.")
}

function spelledQuantity(value: string): { quantity: string; rest: string } | null {
  const tokens = value.trim().split(/\s+/)
  if (!tokens.length) return null
  const first = NUMBER_WORDS[tokens[0].toLowerCase()]
  if (first === undefined) return null

  let quantity = first
  let consumed = 1
  const second = tokens[1] ? NUMBER_WORDS[tokens[1].toLowerCase()] : undefined
  if (first >= 20 && first % 10 === 0 && second !== undefined && second > 0 && second < 10) {
    quantity += second
    consumed = 2
  }
  return { quantity: String(quantity), rest: tokens.slice(consumed).join(" ") }
}

function correctMaterialTerms(value: string) {
  let corrected = normalizeFractionPhrases(value)
  for (const [pattern, replacement] of SAFE_TERM_CORRECTIONS) corrected = corrected.replace(pattern, replacement)
  return corrected.replace(/\s{2,}/g, " ").trim()
}

const LEADING_UNIT_ALIASES: Array<[RegExp, string]> = [
  [/^(?:ea|each|pcs?|pieces?|peace|pees|piezas?|unidades?)\b\s*/i, "each"],
  [/^(?:sheets?|shets?|hojas?|l[aá]minas?)\b\s*/i, "sheet"],
  [/^(?:boxes?|cajas?)\b\s*/i, "box"],
  [/^(?:bags?|bolsas?|sacos?)\b\s*/i, "bag"],
  [/^(?:buckets?|cubetas?)\b\s*/i, "bucket"],
  [/^(?:rolls?|rollos?)\b\s*/i, "roll"],
  [/^(?:gallons?|galones?)\b\s*/i, "gallon"],
  [/^(?:feet|foot|ft|pies)\b\s*/i, "ft"],
]

function extractLeadingUnit(value: string) {
  for (const [pattern, unit] of LEADING_UNIT_ALIASES) {
    if (pattern.test(value)) return { unit, item: value.replace(pattern, "").trim() }
  }
  return { unit: "", item: value }
}

export function parseMaterialIntakeLine(line: string, id = "row"): MaterialIntakeRow | null {
  const clean = line.replace(/^[-*•]+\s*/, "").trim()
  if (!clean || /^(qty|quantity)\s*[,|\t]/i.test(clean)) return null

  const csv = clean.split(/\t|\s*\|\s*|,(?=\s*[^,]+$)/).map((part) => part.trim()).filter(Boolean)
  let quantity = ""
  let unit = ""
  let rawItem = clean
  let notes = ""

  if (csv.length >= 2 && /^\d+(?:\.\d+)?$/.test(csv[0])) {
    quantity = csv[0]
    rawItem = csv[1]
    notes = csv.slice(2).join("; ")
  } else if (csv.length >= 2 && /^\d+(?:\.\d+)?$/.test(csv[1])) {
    quantity = csv[1]
    rawItem = csv[0]
    notes = csv.slice(2).join("; ")
  } else {
    const numeric = clean.match(/^(\d+(?:\.\d+)?)\s+(?:x\s+)?(.+)$/i)
    const words = spelledQuantity(clean)
    if (numeric) {
      quantity = numeric[1]
      rawItem = numeric[2]
    } else if (words?.rest) {
      quantity = words.quantity
      rawItem = words.rest
    } else {
      const trailing = clean.match(/^(.+?)\s+(?:x|qty\.?|quantity)\s*(\d+(?:\.\d+)?)$/i)
      if (trailing) {
        quantity = trailing[2]
        rawItem = trailing[1]
      }
    }
  }

  const correctedItem = correctMaterialTerms(rawItem)
  const extracted = extractLeadingUnit(correctedItem)
  unit = extracted.unit
  const item = extracted.item
  const changed = item.toLocaleLowerCase() !== rawItem.toLocaleLowerCase() || Boolean(unit) || Boolean(spelledQuantity(clean))
  return {
    id,
    quantity,
    unit,
    item,
    notes: changed ? [notes, `Review interpretation from: ${clean}`].filter(Boolean).join("; ") : notes,
    needsReview: changed,
  }
}

export function parseMaterialIntakeList(value: string, makeId: () => string) {
  return value
    .split(/\r?\n/)
    .map((line) => parseMaterialIntakeLine(line, makeId()))
    .filter((row): row is MaterialIntakeRow => Boolean(row))
    .slice(0, 300)
}
