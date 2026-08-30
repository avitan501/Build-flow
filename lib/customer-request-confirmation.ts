const affirmativeConfirmation = /^(?:yes|yes[,!. ]+(?:confirm|confirmed|approved|correct|looks good|go ahead)|confirm(?:ed)?|approved|correct|looks good|go ahead|כן|מאשר(?:ת)?|מאושר|נכון|אפשר להתקדם|sí|si|confirmo|aprobado)[.! ]*$/iu
const negativeConfirmation = /\b(?:no|not|don't|do not|cancel|stop|לא|אל|ביטול|בטל|לא נכון|no confirmo|cancelar)\b/iu

export function isExplicitCustomerRequestConfirmation(value: string | null | undefined) {
  const message = String(value || "").trim().replace(/\s+/g, " ")
  if (!message || message.length > 120 || negativeConfirmation.test(message)) return false
  return affirmativeConfirmation.test(message)
}
