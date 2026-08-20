"use client"

type ProgressCallback = (message: string) => void

async function recognizeImage(image: File | HTMLCanvasElement, onProgress: ProgressCallback) {
  const { createWorker } = await import("tesseract.js")
  const worker = await createWorker("eng", 1, { logger: (message) => {
    if (message.status === "recognizing text" && typeof message.progress === "number") onProgress(`Reading invoice · ${Math.round(message.progress * 100)}%`)
  } })
  try {
    return (await worker.recognize(image)).data.text.trim()
  } finally {
    await worker.terminate()
  }
}

async function readPdf(file: File, onProgress: ProgressCallback) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress(`Reading PDF · page ${pageNumber} of ${document.numPages}`)
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items.map((item) => {
      if (!("str" in item)) return ""
      return `${item.str}${"hasEOL" in item && item.hasEOL ? "\n" : " "}`
    }).join("").trim()
    pages.push(text)
  }
  return pages.join("\n")
}

export async function extractDocumentTextInBrowser(file: File, onProgress: ProgressCallback) {
  if (file.type.startsWith("image/")) return recognizeImage(file, onProgress)
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return readPdf(file, onProgress)
  return ""
}
