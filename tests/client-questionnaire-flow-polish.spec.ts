import { test, expect } from '@playwright/test';
test.beforeEach(()=>test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only'));
test('project selection advances once and remains editable after Back or refresh',async({page})=>{
 await page.goto('/questionnaire');await page.getByText('New construction',{exact:true}).click();
 await expect(page.locator('#steps [aria-current]')).toHaveText('2. Make it easier');await expect(page.locator('#section-title')).toBeFocused();
 await page.reload();await expect(page.locator('#steps [aria-current]')).toHaveText('2. Make it easier');
 await page.locator('#previous').click();await expect(page.locator('#projects-choice-0')).toBeChecked();await page.getByText('New construction',{exact:true}).click();await expect(page.locator('#departments-field')).toBeVisible();
 await page.locator('#previous').click();await page.getByText('Whole-home renovation',{exact:true}).click();await expect(page.locator('#departments-field')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.projects)).toBe('Whole-home renovation');
});
test('Other stays open for typing; keyboard project activation advances',async({page})=>{
 await page.goto('/questionnaire');await page.locator('#projects-choice-4').check();await expect(page.locator('#steps [aria-current]')).toHaveText('1. Your project');await page.locator('#projects').fill('Garage conversion');await page.locator('#next').click();await expect(page.locator('#departments-field')).toBeVisible();
 await page.locator('#previous').click();await page.locator('#projects-choice-2').focus();await page.keyboard.press('Space');await expect(page.locator('#steps [aria-current]')).toHaveText('2. Make it easier');
});
test('time-spent choices have a distinct panel and preserve multiple selections',async({page},info)=>{
 await page.goto('/questionnaire');await page.locator('#projects-choice-0').click();
 const friction=page.locator('#friction-field');await expect(friction).toBeVisible();
 const colors=await page.evaluate(()=>({friction:getComputedStyle(document.getElementById('friction-field')!).backgroundColor,materials:getComputedStyle(document.getElementById('departments-field')!).backgroundColor}));expect(colors.friction).not.toBe(colors.materials);
 await page.locator('#friction-choice-0').check();await page.locator('#friction-choice-1').check();await expect(page.locator('#friction-choice-0')).toBeChecked();await expect(page.locator('#friction-choice-1')).toBeChecked();
 await friction.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('time-spent.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.reload();await expect(page.locator('#friction-choice-0')).toBeChecked();await expect(page.locator('#friction-choice-1')).toBeChecked();
});
