import { test, expect } from '@playwright/test'
import { quoteWordingDifferences } from '../lib/quote-wording-differences'

test('only actual comparison checks highlight quoted differences', () => {
  expect(quoteWordingDifferences('4 x 8 3/4 CDX', ['Manual verification required.']).some(part => part.different)).toBe(false)
  expect(quoteWordingDifferences('24 ft lumber', ['Length differs: requested 28 ft; quoted 24 ft.']).filter(part => part.different).map(part => part.text)).toEqual(['24'])
  expect(quoteWordingDifferences('3/4 plywood', ['Measurement differs: requested 0.5 in; quoted 0.75 in. Verify the source dimensions.']).filter(part => part.different).map(part => part.text)).toEqual(['3/4'])
  expect(quoteWordingDifferences('9.5 in LVL', ['Nominal naming verified.']).some(part => part.different)).toBe(false)
  expect(quoteWordingDifferences('9-1/2 in LVL', ['Measurement differs: requested 11.25 in; quoted 9.5 in. Verify the source dimensions.']).filter(part=>part.different).map(part=>part.text)).toEqual(['9-1/2'])
  expect(quoteWordingDifferences('11 1/4 in LVL', ['Measurement differs: requested 9.5 in; quoted 11.25 in. Verify the source dimensions.']).filter(part=>part.different).map(part=>part.text)).toEqual(['11 1/4'])
})
