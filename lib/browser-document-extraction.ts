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

export async function extractImageTextInBrowser(file: File, onProgress: ProgressCallback) {
  return recognizeImage(file, onProgress)
}
