import {test,expect} from '@playwright/test';
test('five tap-first questions, optional company and Other text, preview/reload/submit',async({page},info)=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only');
 let submitted:Record<string,unknown>|null=null;
 await page.route('**/api/client-questionnaire',async route=>{submitted=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,receipt:'preview-confirmation'})})});
 await page.goto('/questionnaire');await expect(page.getByText('About 3 minutes · Mostly tapping · No account needed')).toBeVisible();
 await page.locator('#name').fill('Preview Tester');await page.locator('#email').fill('preview@example.com');await page.locator('#projects-choice-0').check();await page.locator('#next').click();
 await expect(page.locator('.choice-field')).toHaveCount(3);await expect(page.locator('#departments-material-0-subchoices')).toBeHidden();await page.locator('#departments-choice-0').check();
 await expect(page.locator('#departments-material-0-subchoices')).toBeVisible();await page.locator('#departments-material-0-list-0').check();await page.locator('#departments-material-0-preparer-5').check();await page.locator('#departments-material-0-preparer-other').fill('My project manager');expect(await page.locator('#departments-material-0-subchoices').evaluate(n=>n.previousElementSibling?.querySelector('input')?.id)).toBe('departments-choice-0');
 await page.locator('#departments-choice-0').uncheck();await expect(page.locator('#departments-material-0-subchoices')).toBeHidden();expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.departments)).toBe('');await page.locator('#departments-choice-0').check();await page.locator('#friction-choice-3').check();await page.locator('#priorities-choice-1').check();
 const custom=page.locator('.choice-field').filter({has:page.locator('#priorities')});await custom.getByRole('checkbox',{name:'Other / tell us more'}).check();await page.locator('#priorities').fill('Keep my site supervisor updated');await page.reload();await expect(page.locator('#departments-material-0-list-0')).toBeChecked();await expect(page.locator('#departments-material-0-preparer-5')).toBeChecked();await expect(page.locator('#departments-material-0-preparer-other')).toHaveValue('My project manager');await expect(page.locator('#priorities-choice-1')).toBeChecked();await expect(page.locator('#priorities')).toHaveValue('Keep my site supervisor updated');
 await page.screenshot({path:info.outputPath('quick-choices.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.locator('#next').click();await page.locator('.choice-field').getByRole('checkbox',{name:'Other / tell us more'}).check();await page.locator('#next').click();await expect(page.locator('#summary')).toContainText('Other — discuss with me');await page.locator('#consent').check();await page.locator('#next').click();await expect(page.locator('#success')).toBeVisible();
 expect(submitted).not.toBeNull();const state=(submitted as unknown as {state:{profile:{company:string};answers:Record<string,string>}}).state;expect(state.answers.departments).toBe('Lumber / framing\n  Do you already have a lumber list? Yes, a complete list\n  Who prepares your lumber list? My project manager');expect(state.profile.company).toBe('');expect(Object.keys(state.answers)).toHaveLength(5);expect(state.answers.priorities).toContain('Keep my site supervisor updated');
});

test('every material has independent inline questions and preserves answers',async({page})=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only');
 await page.goto('/questionnaire');await page.locator('#next').click();
 const ids=[['list','preparer'],['ready','confirm'],['ready','owner'],['ready','owner'],['ready','owner'],['ready','owner']];
 for(let i=0;i<ids.length;i++){
  const panel=page.locator(`#departments-material-${i}-subchoices`);await expect(panel).toBeHidden();await page.locator(`#departments-choice-${i}`).check();await expect(panel).toBeVisible();
  expect(await panel.evaluate(n=>n.previousElementSibling?.querySelector('input')?.id)).toBe(`departments-choice-${i}`);
  for(const id of ids[i])await page.locator(`#departments-material-${i}-${id}-0`).check();
 }
 await page.reload();
 for(let i=0;i<ids.length;i++)for(const id of ids[i])await expect(page.locator(`#departments-material-${i}-${id}-0`)).toBeChecked();
 const material=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.departments);
 expect(material).toContain('Who confirms the sizes before ordering? My installer / contractor');expect(material).toContain('Who keeps track of the selections and orders? I do');
 await page.locator('#departments-choice-1').uncheck();
 const remaining=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.departments);expect(remaining).not.toContain('Who confirms the sizes');expect(remaining).toContain('Who keeps track');
 const duplicates=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,all)=>all.indexOf(id)!==i));expect(duplicates).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.getByRole('button',{name:'4. Review',exact:true}).click();await expect(page.locator('#summary')).toContainText('Who keeps track of the selections and orders? I do');
});
