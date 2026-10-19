import {test,expect,type Locator} from '@playwright/test';
async function check(locator:Locator){const slide=locator.locator('xpath=ancestor::*[contains(@class,"question-slide")]');if(await slide.count()&&!(await locator.isVisible()))await slide.locator('.answered-row button').click();await locator.check()}
test('five tap-first questions, optional company and Other text, preview/reload/submit',async({page},info)=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only');
 let submitted:Record<string,unknown>|null=null;
 await page.route('**/api/client-questionnaire',async route=>{submitted=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,receipt:'preview-confirmation'})})});
 await page.goto('/questionnaire');await expect(page.getByText('About 3 minutes · Mostly tapping · No account needed')).toBeVisible();
 await page.locator('#name').fill('Preview Tester');await page.locator('#email').fill('preview@example.com');await check(page.locator('#projects-choice-0'));await page.locator('#next').click();
 await expect(page.locator('.choice-field')).toHaveCount(3);await expect(page.locator('#departments-material-0-subchoices')).toBeHidden();await check(page.locator('#departments-choice-0'));
 await expect(page.locator('#departments-material-0-subchoices')).toBeVisible();await expect(page.locator('#departments-material-0-list-0')).toBeVisible();await expect(page.locator('#departments-material-0-contact-0')).toBeVisible();await check(page.locator('#departments-material-0-list-0'));await check(page.locator('#departments-material-0-contact-0'));await check(page.locator('#departments-material-0-contact-1'));await check(page.locator('#departments-material-0-contact-5'));await page.locator('#departments-material-0-contact-other').fill('My project manager');expect(await page.locator('#departments-material-0-subchoices').evaluate(n=>n.previousElementSibling?.querySelector('input')?.id)).toBe('departments-choice-0');
 await page.locator('#departments-choice-0').uncheck();await expect(page.locator('#departments-material-0-subchoices')).toBeHidden();expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.departments)).toBe('');await check(page.locator('#departments-choice-0'));await check(page.locator('#friction-choice-3'));await check(page.locator('#priorities-choice-1'));
 const custom=page.locator('.choice-field').filter({has:page.locator('#priorities')});await custom.getByRole('checkbox',{name:'Other / tell us more'}).check();await page.locator('#priorities').fill('Keep my site supervisor updated');await page.reload();await expect(page.locator('#departments-material-0-list-0')).toBeChecked();await expect(page.locator('#departments-material-0-contact-0')).toBeChecked();await expect(page.locator('#departments-material-0-contact-1')).toBeChecked();await expect(page.locator('#departments-material-0-contact-5')).toBeChecked();await expect(page.locator('#departments-material-0-contact-other')).toHaveValue('My project manager');await expect(page.locator('#priorities-choice-1')).toBeChecked();await expect(page.locator('#priorities')).toHaveValue('Keep my site supervisor updated');
 await page.screenshot({path:info.outputPath('quick-choices.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.locator('#next').click();await page.locator('.choice-field').getByRole('checkbox',{name:'Other / tell us more'}).check();await page.locator('#next').click();await expect(page.locator('#summary')).toContainText('Other — discuss with me');await expect(page.locator('#plan-recap')).toContainText('Your materials: Lumber / framing');await expect(page.locator('#plan-recap')).toContainText('Keep my site supervisor updated');await expect(page.locator('#next')).toHaveText('Send my priorities');await check(page.locator('#consent'));await page.locator('#next').click();await expect(page.locator('#success')).toBeVisible();
 expect(submitted).not.toBeNull();const state=(submitted as unknown as {state:{profile:{company:string};answers:Record<string,string>}}).state;expect(state.answers.departments).toBe('Lumber / framing\n  Do you already have a lumber list? Yes\n  What would you like us to handle for your lumber order? Follow up on orders / arrange reorders; Confirm orders with my framer; My project manager');expect(state.profile.company).toBe('');expect(Object.keys(state.answers)).toHaveLength(5);expect(state.answers.priorities).toContain('Keep my site supervisor updated');
});

test('every material has independent inline questions and preserves answers',async({page})=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only');
 await page.goto('/questionnaire');await page.locator('#next').click();
 const ids=[['list','contact'],['ready','services'],['ready','contact','help'],['source','services'],['source','services'],['source','services']];
 for(let i=0;i<ids.length;i++){
  const panel=page.locator(`#departments-material-${i}-subchoices`);await expect(panel).toBeHidden();await check(page.locator(`#departments-choice-${i}`));await expect(panel).toBeVisible();
  expect(await panel.evaluate(n=>n.previousElementSibling?.querySelector('input')?.id)).toBe(`departments-choice-${i}`);
  for(const id of ids[i])await check(page.locator(`#departments-material-${i}-${id}-0`));
 }
 await page.reload();
 for(let i=0;i<ids.length;i++)for(const id of ids[i])await expect(page.locator(`#departments-material-${i}-${id}-0`)).toBeChecked();
 const material=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.departments);
 expect(material).toContain('What would you like us to handle for your windows and doors? Get quotes from plans / window schedule');expect(material).toContain('Compare prices for selected products');
 await page.locator('#departments-choice-1').uncheck();
 const remaining=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.departments);expect(remaining).not.toContain('Get quotes from plans / window schedule');expect(remaining).toContain('Compare prices for selected products');
 const duplicates=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,all)=>all.indexOf(id)!==i));expect(duplicates).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.getByRole('button',{name:'4. Review',exact:true}).click();await expect(page.locator('#summary')).toContainText('Compare prices for selected products');
});

test('answers compact automatically, remain editable, and Other waits for Done',async({page})=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only');
 await page.goto('/questionnaire');await page.locator('#next').click();await page.locator('#departments-choice-0').check();
 const list=page.locator('#departments-material-0-list-0');await list.check();await expect(list).toBeHidden();
 const panel=page.locator('#departments-material-0-subchoices');await expect(panel.locator('.answered-row').first()).toContainText('Yes');
 await panel.getByRole('button',{name:'Change',exact:true}).click();await page.locator('#departments-material-0-list-3').check();
 const other=page.locator('#departments-material-0-list-other');await expect(other).toBeVisible();await other.fill('My list is being reviewed');
 await other.locator('xpath=ancestor::fieldset[1]').getByRole('button',{name:'Done',exact:true}).click();await expect(other).toBeHidden();await expect(panel.locator('.answered-row').first()).toContainText('My list is being reviewed');
 await check(page.locator('#departments-material-0-contact-0'));await expect(page.locator('#departments-material-0-contact-0')).toBeHidden();await check(page.locator('#departments-material-0-contact-1'));await expect(panel.locator('.answered-row').nth(1)).toContainText('Follow up on orders / arrange reorders · Confirm orders with my framer');
});
