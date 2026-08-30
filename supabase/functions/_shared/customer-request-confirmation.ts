const affirmativeConfirmation = /^(?:yes(?:[,!. ]+confirm(?:ed)?)?|כן|מאשר(?:ת)?|sí|si|confirmo)[.! ]*$/iu
const negativeConfirmation = /\b(?:no|not|don't|do not|cancel|stop|לא|אל|ביטול|בטל|לא נכון|no confirmo|cancelar)\b/iu

export function isExplicitCustomerRequestConfirmation(value: string | null | undefined) {
  const message = String(value || "").trim().replace(/\s+/g, " ")
  if (!message || message.length > 120 || negativeConfirmation.test(message)) return false
  return affirmativeConfirmation.test(message)
}
