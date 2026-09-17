/** Highlight only values identified by an actual comparison check, never a generic word diff. */
export function quoteWordingDifferences(wording: string, notes: string[]) {
  const pattern = /\d+(?:[ -]\d+\s*\/\s*\d+|\.\d+|\s*\/\s*\d+)?/g
  const number = (value: string) => { const mixed=value.match(/^(\d+)[ -]+(\d+)\s*\/\s*(\d+)$/);if(mixed)return Number(mixed[1])+Number(mixed[2])/Number(mixed[3]);const pieces = value.split('/').map(Number); return pieces.length === 2 ? pieces[0] / pieces[1] : pieces[0] }
  const numbers = (value: string) => [...value.matchAll(pattern)].map(match => match[0])
  const values = notes.filter(note => /^(Quantity:|Measurement differs:|Length differs:|Sheet dimensions differ:)/.test(note))
    .flatMap(note => {
      const requested = numbers(note.match(/requested (.+?); quoted/)?.[1] || '')
      const quoted = numbers(note.match(/quoted (.+?)(?:\. (?:Verify|Confirm)|$)/)?.[1] || '')
      return quoted.filter(value => !requested.some(original => Math.abs(number(value) - number(original)) < 0.00001))
    })
  const parts = wording.split(/(\d+(?:[ -]\d+\s*\/\s*\d+|\.\d+|\s*\/\s*\d+)?)/g)
  return parts.filter(Boolean).map(text => ({ text, different: /^\d/.test(text) && values.some(value => Math.abs(number(value) - number(text)) < 0.00001) }))
}
