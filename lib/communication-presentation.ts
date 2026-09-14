export function isAutomatedSender(email: string) {
  const local = email.trim().toLowerCase().split("@")[0]
  return email.includes("@") && /(?:^|[._-])(?:no[._-]?reply|do[._-]?not[._-]?reply)(?:$|[._-])/.test(local)
}

export function splitQuotedEmail(text: string) {
  const match = /\n(?:On [^\n]{1,240}wrote:|-{2,}\s*Original Message\s*-{2,}|>{1,}\s)/i.exec(text)
  if (!match || match.index < 1) return { current: text, previous: "" }
  return { current: text.slice(0, match.index).trimEnd(), previous: text.slice(match.index).trim() }
}
