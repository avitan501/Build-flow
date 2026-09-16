import { requestItemFieldsFromMetadata, type RequestItemField } from "./request-item-fields"

export type MaterialClarification = { id: string; label: string; question: string; scope: string; options: string[]; reference?: string }
const unknown = "Not sure — ask supplier; do not assume"
/** Questions are suggestions, never defaults or permission to substitute products. */
export function materialListClarifications(source: string): MaterialClarification[] {
  const questions: MaterialClarification[] = []
  if (source.split(/\n/).some(line=>/\btji\b/i.test(line)&&/\b10\s*(?:in(?:ch(?:es)?)?\b|["″])/i.test(line))) questions.push({ id: "tji-depth", label: "TJI depth convention", question: 'When this list says 10-inch TJI, does it mean 9½-inch?', scope: "TJI only; preserve series, length and quantity. Never apply to LVL.", options: ["TJI 10-inch means 9½-inch; preserve the specified series", "Keep the written TJI depth; request confirmation", unknown], reference: "https://www.weyerhaeuser.com/woodproducts/engineered-lumber/tji-joists/" })
  if (source.split(/\n/).some(line=>/\blvl\b/i.test(line)&&/(?:\b10\s*(?:in(?:ch(?:es)?)?\b|["″])|[x×]\s*10\b)/i.test(line))) questions.push({ id: "lvl-depth", label: "LVL depth convention", question: 'For LVL written as 10-inch, which depth is required?', scope: "Only LVL lines written as 10-inch; preserve all other dimensions.", options: ["LVL 10-inch means 9½-inch; retain thickness and length", "Keep the written LVL depth; request confirmation", unknown] })
  if (/\b2\s*[x×]\s*(?:4|6|8|10|12)\b|dimensional lumber/i.test(source)) questions.push({ id: "lumber-spec", label: "Dimensional lumber specification", question: "What species and grade should unspecified dimensional lumber use?", scope: "Unspecified dimensional lumber only; explicit species/grade and engineered wood stay unchanged.", options: ["SPF #2 or better, where not otherwise specified", "Douglas Fir #2 or better, where not otherwise specified", "Ask supplier to state species and grade; no substitution approval", unknown] })
  if (/hanger|mount/i.test(source)) questions.push({ id: "hanger-comparison", label: "Hanger comparison scope", question: "How should hanger offers be grouped for price review?", scope: "Mount grouping is not engineering approval; load, dimensions and fasteners still need compatibility confirmation.", options: ["Group by requested face/top mount; compatibility remains unverified", "Require exact hanger model before price comparison", unknown], reference: "https://seblog.strongtie.com/2016/08/pick-connector-series-selecting-joist-hanger/" })
  if (/plywood|\bcdx\b/i.test(source)) questions.push({ id: "panel-material", label: "Panel substitutions", question: "Can OSB be offered as an alternative to requested plywood?", scope: "Keep thickness, grade, sheet dimensions and edge profile explicit.", options: ["Keep plywood and OSB separate; no material substitution", "Show OSB as a separate alternative, not an exact match", unknown] })
  if (/\bbox(?:es)?\b|carton|pack|bundle/i.test(source)) questions.push({ id: "pack-quantity", label: "Package quantities", question: "Are counts written as boxes actually boxes or loose pieces?", scope: "Ask for contents of each package; do not assume the same box size across suppliers.", options: ["Box means a full box; supplier must state pieces per box", "Confirm each package line separately before comparing prices", unknown] })
  return questions
}

export function clarificationFields(source: string, answers: Record<string, string>): RequestItemField[] {
  const questions = materialListClarifications(source)
  if (Object.keys(answers).some(key => !questions.some(q => q.id === key))) throw new Error("The original list changed. Review its questions again.")
  return questions.flatMap(q => {
    const value = answers[q.id]
    if (!value) return []
    if (!q.options.includes(value)) throw new Error("Choose one of the available answers.")
    return [{ id: `clarify-${q.id}`, label: q.label, value: `${value}. Scope: ${q.scope}` }]
  })
}

export function clarificationMetadata(source: string, metadata: Record<string, unknown> | null, answers: Record<string, string>) {
  const fields = clarificationFields(source, answers)
  const original = requestItemFieldsFromMetadata(metadata).filter(f => !f.id.startsWith("clarify-"))
  if (original.length + fields.length > 16) throw new Error("Too many existing fields. Review details before adding more; nothing was removed.")
  return { ...metadata, request_item_fields: [...original, ...fields], material_clarifications: { version: 1, source, answers }, ai_organization_status: "draft_changed", ai_organization_summary: "Shared answers changed. Recognize again and review changes before pricing." }
}
