export type ShareAdMessage = {
  id: string
  label: string
  text: string
}

export type ShareAd = {
  id: string
  title: string
  eyebrow: string
  imagePath: string
  fileName: string
  alt: string
  messages: ShareAdMessage[]
}

const website = "https://www.avantiabuild.com"
const materialRequestLink = "https://wa.me/15169901990?text=Hi%20Avantia%20Build%2C%20I%20have%20a%20material%20request"

export const shareAds: ShareAd[] = [
  {
    id: "send-the-list",
    title: "Send the List",
    eyebrow: "General",
    imagePath: "/marketing/share-ads/01-send-the-list.jpg",
    fileName: "Avantia-Build-Send-the-List.jpg",
    alt: "Avantia Build advertisement inviting contractors to send a material list",
    messages: [
      {
        id: "general",
        label: "Best first message",
        text: `Running the job shouldn't mean chasing every material order.

Send Avantia Build a plan, material list, crew message, or existing quote. We check quantities, compare price and availability, and coordinate the order and delivery with your crew.

📲 Try us on one material request:
${materialRequestLink}

🌐 See how it works:
${website}

Price check is free.`,
      },
      {
        id: "short",
        label: "Short group message",
        text: `Send the list. Skip the supplier calls.

Avantia Build checks quantities, compares suppliers, and coordinates the order and delivery with your crew.

📲 ${materialRequestLink}
🌐 ${website}

Price check is free.`,
      },
    ],
  },
  {
    id: "crew-direct",
    title: "Crew Direct",
    eyebrow: "English + Spanish",
    imagePath: "/marketing/share-ads/02-crew-direct.jpg",
    fileName: "Avantia-Build-Crew-Direct.jpg",
    alt: "Avantia Build advertisement explaining that a jobsite crew can send material requests directly",
    messages: [
      {
        id: "crew-english",
        label: "English",
        text: `Your crew needs material? Let them send the request directly to Avantia Build—in English or Spanish.

We clarify what they need, check price and availability, and coordinate delivery with the crew. You confirm the order.

📲 Try it on one crew request:
https://wa.me/15169901990?text=Hi%20Avantia%20Build%2C%20my%20crew%20has%20a%20material%20request

🌐 ${website}

Price check is free.`,
      },
      {
        id: "crew-spanish",
        label: "Español",
        text: `¿Tu equipo necesita materiales?

Envía a Avantia Build los planos, la lista de materiales, una foto o una cotización existente. Verificamos las cantidades, comparamos precio y disponibilidad, y coordinamos el pedido y la entrega con tu equipo.

📲 Envíanos una solicitud:
https://wa.me/15169901990?text=Hola%20Avantia%20Build%2C%20tengo%20una%20solicitud%20de%20materiales

🌐 ${website}

La verificación de precio es gratis.`,
      },
    ],
  },
  {
    id: "check-your-quote",
    title: "Check Your Quote",
    eyebrow: "Price check",
    imagePath: "/marketing/share-ads/03-check-your-quote.jpg",
    fileName: "Avantia-Build-Check-Your-Quote.jpg",
    alt: "Avantia Build advertisement inviting customers to submit an existing supplier quote",
    messages: [
      {
        id: "existing-quote",
        label: "Existing quote",
        text: `Already have a supplier quote? Send it before you order.

Avantia Build checks the materials, total price and availability, then helps coordinate the order and delivery. No promise—just another option to consider.

📲 Get a free price check:
https://wa.me/15169901990?text=Hi%20Avantia%20Build%2C%20I%20have%20an%20existing%20supplier%20quote

🌐 ${website}`,
      },
      {
        id: "homeowner",
        label: "Homeowner",
        text: `Renovating and not sure where to start with the materials?

Send Avantia Build your plans, contractor's list, or an existing quote. We help check the details, compare price and availability, and coordinate the order and delivery.

📲 Send what you have:
https://wa.me/15169901990?text=Hi%20Avantia%20Build%2C%20I%20have%20a%20renovation%20material%20request

🌐 ${website}

Price check is free.`,
      },
    ],
  },
  {
    id: "start-with-plans",
    title: "Start With Plans",
    eyebrow: "New project",
    imagePath: "/marketing/share-ads/04-start-with-plans.jpg",
    fileName: "Avantia-Build-Start-With-Plans.jpg",
    alt: "Avantia Build advertisement inviting builders to start a material review with project plans",
    messages: [
      {
        id: "plan-first",
        label: "Plan-first message",
        text: `Starting a new house or renovation?

Send Avantia Build the plans before the material calls begin. We help organize quantities, compare suppliers, and coordinate requests as your crews need them.

📲 Start with one plan:
https://wa.me/15169901990?text=Hi%20Avantia%20Build%2C%20I%20want%20to%20send%20plans%20for%20a%20material%20review

🌐 ${website}

Price check is free.`,
      },
      {
        id: "status",
        label: "Very short",
        text: `Try Avantia Build on one material request.

📲 ${materialRequestLink}
🌐 ${website}`,
      },
    ],
  },
]

export function normalizeUsSharePhone(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1)
  if (digits.length !== 10 || !/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  return `+1${digits}`
}

export function buildWhatsAppShareUrl(message: string, recipient = "") {
  const normalized = recipient.trim() ? normalizeUsSharePhone(recipient) : null
  if (recipient.trim() && !normalized) return null
  const target = normalized ? normalized.slice(1) : ""
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`
}

export function canShareImageFile(navigatorLike: Pick<Navigator, "share" | "canShare"> | undefined, file: File) {
  if (!navigatorLike?.share || !navigatorLike.canShare) return false
  try {
    return navigatorLike.canShare({ files: [file] })
  } catch {
    return false
  }
}
