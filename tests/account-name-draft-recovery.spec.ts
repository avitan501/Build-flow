import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import ts from 'typescript'

const key = (actor = 'actor-a') => `avantia:account-name-draft:v1:${actor}`
const savedDraft = (page: Page, actor = 'actor-a') => page.evaluate(key => {
  const raw = sessionStorage.getItem(key); return raw === null ? null : JSON.parse(raw)
}, key(actor))
const calls = (page: Page) => page.evaluate(() => (window as unknown as { calls: { actorId: string; name: string; expectedName: string | null }[] }).calls)
const finish = (page: Page, result: unknown, index = 0) => page.evaluate(({ result, index }) => (window as unknown as { replies: ((value: unknown) => void)[] }).replies[index](result), { result, index })

async function setup(page: Page) {
  const modules: string[] = [], seen = new Map<string, number>()
  const action = modules.push('exports.saveAccountName=input=>new Promise(resolve=>{window.calls.push(input);window.replies.push(resolve)})') - 1
  function bundle(file: string): number {
    if (seen.has(file)) return seen.get(file)!
    const id = modules.length; seen.set(file, id); modules.push('')
    let source = readFileSync(file, 'utf8')
    if (/\.tsx?$/.test(file)) source = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const resolver = createRequire(file)
    modules[id] = source.replace(/require\(["']([^"']+)["']\)/g, (_, name) => `require(${name === '@/app/account/name-action' ? action : bundle(resolver.resolve(name))})`)
    return id
  }
  const react = bundle(require.resolve('react')), dom = bundle(require.resolve('react-dom/client')), component = bundle(resolve('components/buildflow/account-name-autosave.tsx'))
  await page.route('http://name-recovery.test/**', route => {
    const url = new URL(route.request().url()), initialName = url.searchParams.get('name') || 'Carlos'
    const script = `(()=>{window.calls=[];window.replies=[];const process={env:{NODE_ENV:'production'}},modules=[${modules.map(code => `function(module,exports,require){${code}}`).join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports}const R=require(${react}),C=require(${component}),root=require(${dom}).createRoot(document.getElementById('root'));window.showActor=(actor='actor-a')=>root.render(R.createElement(C.AccountNameAutosave,{actorId:actor,initialName:actor==='actor-a'?${JSON.stringify(initialName)}:'David',inputClass:''}));window.showActor()})()`
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<meta charset="utf-8"><meta name="viewport" content="width=device-width"><div id="root"></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script>` })
  })
  await page.goto('http://name-recovery.test/')
  await expect(page.getByLabel('Name', { exact: true })).toBeEnabled()
}

test('failed raw name survives real reload and waits for explicit Retry even after more typing', async ({ page }) => {
  await setup(page); const input = page.getByLabel('Name', { exact: true })
  await input.fill('  Carlos Changed  '); await input.blur()
  await expect.poll(async () => (await calls(page)).length).toBe(1)
  await finish(page, { ok: false, error: 'Offline' })
  expect(await savedDraft(page)).toEqual({ draft: '  Carlos Changed  ', expectedName: 'Carlos' })
  await page.reload(); await expect(input).toHaveValue('  Carlos Changed  ')
  await expect(page.getByRole('status')).toContainText('Unsaved name restored')
  await input.fill('Carlos Reviewed'); await input.blur(); await page.waitForTimeout(750)
  expect(await calls(page)).toEqual([])
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect.poll(async () => (await calls(page)).length).toBe(1)
  expect((await calls(page))[0]).toEqual({ actorId: 'actor-a', name: 'Carlos Reviewed', expectedName: 'Carlos' })
  await finish(page, { ok: true, name: 'Carlos Reviewed' })
  await expect(page.getByRole('status')).toHaveText('Saved'); expect(await savedDraft(page)).toBeNull()
  await page.goto('http://name-recovery.test/?name=Carlos%20Reviewed'); await expect(input).toHaveValue('Carlos Reviewed')
  await expect(page.getByRole('status')).toHaveText('Saves automatically')
})

test('reload during in-flight save recovers old baseline and verifies lost acknowledgment rather than auto-rebasing', async ({ page }) => {
  await setup(page); const input = page.getByLabel('Name', { exact: true })
  await input.fill('Already Stored'); await input.blur(); await expect.poll(async () => (await calls(page)).length).toBe(1)
  await page.goto('http://name-recovery.test/?name=Already%20Stored'); await expect(input).toHaveValue('Already Stored')
  expect(await calls(page)).toEqual([])
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect.poll(async () => (await calls(page)).length).toBe(1)
  expect((await calls(page))[0].expectedName).toBe('Carlos')
  await finish(page, { ok: true, name: 'Already Stored' }); await expect(page.getByRole('status')).toHaveText('Saved')
  expect(await savedDraft(page)).toBeNull()
})

test('restored draft never overwrites concurrent remote change without explicit review', async ({ page }) => {
  await setup(page); const input = page.getByLabel('Name', { exact: true })
  await input.fill('My Draft'); await page.goto('http://name-recovery.test/?name=Remote%20Name')
  await expect(input).toHaveValue('My Draft'); await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect.poll(async () => (await calls(page)).length).toBe(1)
  await finish(page, { ok: false, error: 'Changed elsewhere', conflict: { name: 'Remote Name' } })
  await input.fill('Still My Draft'); await input.blur(); await page.waitForTimeout(750)
  expect((await calls(page)).length).toBe(1)
  expect(await savedDraft(page)).toEqual({ draft: 'Still My Draft', expectedName: 'Carlos' })
  await page.getByRole('button', { name: 'Use saved name', exact: true }).click()
  await expect(input).toHaveValue('Remote Name'); expect(await savedDraft(page)).toBeNull()
  await input.fill('Reviewed Name'); await input.blur(); await expect.poll(async () => (await calls(page)).length).toBe(2)
  expect((await calls(page))[1].expectedName).toBe('Remote Name')
})

test('unkeyed parent account switch isolates drafts and ignores previous actor late acknowledgment', async ({ page }) => {
  await setup(page); const input = page.getByLabel('Name', { exact: true })
  await input.fill('Actor A Draft'); await input.blur(); await expect.poll(async () => (await calls(page)).length).toBe(1)
  await page.evaluate(() => (window as unknown as { showActor: (id: string) => void }).showActor('actor-b'))
  await expect(input).toHaveValue('David'); expect(await savedDraft(page, 'actor-b')).toBeNull()
  await finish(page, { ok: true, name: 'Actor A Draft' })
  await expect(input).toHaveValue('David'); expect(await savedDraft(page)).toEqual({ draft: 'Actor A Draft', expectedName: 'Carlos' })
  await input.fill('Actor B Draft'); await input.blur(); await expect.poll(async () => (await calls(page)).length).toBe(2)
  expect((await calls(page))[1].actorId).toBe('actor-b')
  await finish(page, { ok: true, name: 'Actor B Draft' }, 1); await expect(page.getByRole('status')).toHaveText('Saved')
  await page.evaluate(() => (window as unknown as { showActor: (id: string) => void }).showActor('actor-a'))
  await expect(input).toHaveValue('Actor A Draft'); await expect(page.getByRole('status')).toContainText('Unsaved name restored')
  expect((await calls(page)).length).toBe(2)
})

test('late acknowledgement persists newer typing with acknowledged baseline for subsequent reload', async ({ page }) => {
  await setup(page); const input = page.getByLabel('Name', { exact: true })
  await input.fill('First Name'); await input.blur(); await expect.poll(async () => (await calls(page)).length).toBe(1)
  await input.fill('Second Name'); await finish(page, { ok: true, name: 'First Name' })
  await expect.poll(async () => (await calls(page)).length).toBe(2)
  expect(await savedDraft(page)).toEqual({ draft: 'Second Name', expectedName: 'First Name' })
  await page.goto('http://name-recovery.test/?name=First%20Name'); await expect(input).toHaveValue('Second Name')
  await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect.poll(async () => (await calls(page)).length).toBe(1)
  expect((await calls(page))[0].expectedName).toBe('First Name')
})

test('invalid raw draft recovers without submitting and unavailable storage is disclosed', async ({ page }) => {
  await setup(page); const input = page.getByLabel('Name', { exact: true })
  await input.fill(''); await input.blur(); await expect(page.getByRole('status')).toContainText('2–200')
  await page.reload(); await expect(input).toHaveValue(''); await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retry', exact: true }).click(); expect(await calls(page)).toEqual([])
  await page.evaluate(() => { sessionStorage.clear(); Object.defineProperty(Storage.prototype, 'setItem', { value() { throw Error('Denied') } }) })
  await input.fill('Retained Name'); await expect(page.getByRole('alert')).toContainText('Draft recovery is unavailable')
  await expect(input).toHaveValue('Retained Name')
})
