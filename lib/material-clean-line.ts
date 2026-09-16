import type { RequestItemField } from "./request-item-fields"

const logistics = /^(?:shipping|delivery-address|delivery_address|shipping-delivery|price-requirements)$/

/** Presentation only: retain delivery data on the request, outside material specifications. */
export function materialCleanLine(input: { name: string; quantity: string | number; unit: string; fields: RequestItemField[]; details: string }) {
  const omitted = input.fields.filter(f => logistics.test(f.id) || /^delivery address$/i.test(f.label))
  const details = input.details.split(/\s*[·\n]\s*/).filter(part => !omitted.some(f => part === f.value || part === `${f.label}: ${f.value}`)).join(" · ")
  return [...new Set([
    `${input.quantity} ${input.unit}`.trim(), input.name,
    ...input.fields.filter(f => !f.id.startsWith("clarify-") && !omitted.includes(f)).map(f => f.value),
    details,
  ].filter(Boolean))].join(" · ")
}
