const affirmativeConfirmation = /^(?:yes(?:[,!. ]+confirm(?:ed)?)?|correct|that(?:'s| is) correct|looks correct|i (?:confirm|approve)|כן|מאשר(?:ת)?|נכון|זה נכון|sí|si|confirmo|correcto|est[aá] correcto|apruebo)[.! ]*$/iu
const negativeConfirmation = /\b(?:no|not|don't|do not|cancel|stop|לא|אל|ביטול|בטל|לא נכון|no confirmo|cancelar)\b/iu

export function isExplicitCustomerRequestConfirmation(value: string | null | undefined) {
  const message = String(value || "").trim().replace(/\s+/g, " ")
  if (!message || message.length > 120 || negativeConfirmation.test(message)) return false
  return affirmativeConfirmation.test(message)
}
