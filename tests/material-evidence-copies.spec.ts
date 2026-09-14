import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { claimMaterialEvidence } from '../supabase/functions/client-material-list-ai/chunk-plan'
import { mergeSemanticallyEquivalentMaterialItems } from '../supabase/functions/client-material-list-ai/semantic-merge'

test('byte-identical attachments are evidence copies, but repeated row occurrences remain distinct', () => {
  const seen = new Set<string>()
  const hash = createHash('sha256').update('synthetic 62-row RFQ bytes').digest('hex')
  const uploads = ['original.pdf', 'renamed-copy.pdf']
  const accepted = uploads.filter(() => claimMaterialEvidence(seen, 'application/pdf', hash))
  expect(accepted).toEqual(['original.pdf'])
  // Synthetic extraction, not a claim about provider accuracy on the real PDF.
  const rows = Array.from({ length: 62 }, (_, index) => ({
    name: 'Drywall', department: 'Drywall', quantity: 10, unit: 'sheets',
    dimensions: '4 x 8 ft', thickness: '5/8 in', details: '', needsReview: true,
    reviewStatus: 'check' as const, reviewReasons: ['HOLD'],
    sourceText: '10 sheets drywall 5/8 4x8 HOLD',
    sourceChunk: index < 52 ? 'pages 1-3' : 'pages 4-6',
    sourceOccurrence: index < 52 ? `0:${index}` : `1:${index - 52}`,
  }))
  const output = mergeSemanticallyEquivalentMaterialItems(accepted.flatMap(() => rows), { preserveSourceRows: true })
  expect(output).toHaveLength(62)
  expect(output.every(row => row.needsReview && row.reviewReasons.includes('HOLD'))).toBe(true)
  expect(mergeSemanticallyEquivalentMaterialItems([...output, output[0]], { preserveSourceRows: true })).toHaveLength(62)
})

test('changed bytes or different media are not suppressed as identical evidence', () => {
  const seen = new Set<string>()
  expect(claimMaterialEvidence(seen, 'application/pdf', 'hash-a')).toBe(true)
  expect(claimMaterialEvidence(seen, 'application/pdf', 'hash-b')).toBe(true)
  expect(claimMaterialEvidence(seen, 'image/png', 'hash-a')).toBe(true)
})

test('all copies remain fingerprinted and count against limits before extraction deduplication', async () => {
  const source = await readFile('supabase/functions/client-material-list-ai/index.ts', 'utf8')
  const claim = source.indexOf('if (!claimMaterialEvidence(')
  expect(source.indexOf('evidenceHashes.push(')).toBeLessThan(claim)
  expect(source.indexOf('includedAttachmentBytes += bytes.byteLength')).toBeLessThan(claim)
  expect(source.indexOf('canAddMaterialListAttachment(includedAttachmentCount')).toBeLessThan(claim)
  expect(source).toContain('model:AI_MODEL,version:2')
})
