import { test, expect, type Page } from '@playwright/test';

test.beforeEach(()=>test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only'));
async function openMaterials(page:Page){await page.goto('/questionnaire');await page.locator('#projects-choice-0').click()}
async function contactAndReview(page:Page){await page.locator('#next').click();await page.locator('#next_step-choice-0').check();await page.locator('#name').fill('Local Preview Tester');await page.locator('#email').fill('preview@example.com');await page.locator('#next').click()}
async function mockSubmission(page:Page){
 const submissions:Record<string,unknown>[]=[];await page.route('**/api/client-questionnaire',async route=>{const body=route.request().postDataJSON();submissions.push(body);await route.fulfill({json:{ok:true,receipt:body.id,followupToken:'local-test-capability'}})});return submissions;
}

test('specific services remain open until Done, feed the recap and replace repeated general choices',async({page},info)=>{
 const submissions=await mockSubmission(page);await openMaterials(page);
 await page.locator('#departments-choice-0').check();await page.locator('#departments-material-0-list-1').check();
 await expect(page.locator('#departments-material-0-list-1')).toBeHidden();await expect(page.locator('.answer-edit:focus')).toHaveCount(1);
 await page.locator('#departments-material-0-contact-0').check();await expect(page.locator('#departments-material-0-contact-1')).toBeVisible();await page.locator('#departments-material-0-contact-1').check();
 await page.locator('#departments-material-0-contact-0').locator('xpath=ancestor::fieldset[1]').getByRole('button',{name:/^Done:/}).click();
 await expect(page.locator('#departments-material-0-contact-0')).toBeHidden();await expect(page.locator('#priorities-field')).toBeHidden();
 await page.reload();await page.getByRole('button',{name:'Edit Lumber / framing details',exact:true}).click();
 await expect(page.locator('#departments-material-0-subchoices')).toContainText('Follow up on orders / arrange reorders');
 await page.screenshot({path:info.outputPath('materials.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await contactAndReview(page);await expect(page.locator('#plan-recap')).toContainText('Follow up on orders / arrange reorders');await expect(page.locator('#plan-recap')).toContainText('Confirm orders with my framer');
 await expect(page.locator('#summary')).toBeHidden();await page.locator('#consent').check();await page.locator('#next').click();await expect(page.locator('#success-title')).toBeVisible();await expect(page.locator('#success-title')).toHaveText('Your request is received.');expect(submissions).toHaveLength(1);
 const state=submissions[0].state as {answers:Record<string,string>};expect(state.answers.priorities).toContain('Lumber / framing:');expect(state.answers.friction).toBeUndefined();
});

test('fallback, exclusive choices and contact validation prevent contradictory or missing responses',async({page})=>{
 await openMaterials(page);await expect(page.locator('#priorities-field')).toBeVisible();await page.locator('#next').click();await expect(page.getByText('Choose the help you want, or “Help me decide where to start”.')).toBeVisible();
 await page.locator('#friction-choice-0').check();await page.locator('#friction-choice-5').check();await expect(page.locator('#friction-choice-0')).not.toBeChecked();await page.locator('#friction-choice-1').check();await expect(page.locator('#friction-choice-5')).not.toBeChecked();
 await page.locator('#priorities-choice-5').check();await page.locator('#next').click();await page.locator('#next_step-choice-0').check();await page.locator('#next_step-choice-1').check();await expect(page.locator('#next_step-choice-0')).not.toBeChecked();
 await page.locator('#next').click();await expect(page.getByText('Please enter your name.',{exact:true})).toBeVisible();await page.locator('#name').fill('Test');await page.locator('#next').click();await expect(page.getByText('Please enter an email or a phone number.',{exact:true})).toBeVisible();await page.locator('#phone').fill('5550100199');await page.locator('#next').click();await expect(page.locator('#review')).toBeVisible();
});

test('all categories remain editable without losing Other text or hidden selections',async({page})=>{
 await openMaterials(page);const sourceIds=['list','ready','ready','source','source','source'];const serviceIds=['contact','services','help','services','services','services'];
 for(let i=0;i<6;i++){await page.locator('#departments-choice-'+i).check();await page.locator(`#departments-material-${i}-${sourceIds[i]}-0`).check();await page.locator(`#departments-material-${i}-${serviceIds[i]}-0`).check();}
 await expect(page.locator('.subchoices:visible')).toHaveCount(1);await page.locator('#departments-choice-0').uncheck();expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.priorities)).not.toContain('Lumber / framing:');
 await page.locator('#departments-choice-0').check();if(!(await page.locator('#departments-material-0-contact-5').isVisible()))await page.locator('#departments-material-0-subchoices').getByRole('button',{name:/^Change: What would/}).click();await page.locator('#departments-material-0-contact-5').check();await page.locator('#departments-material-0-contact-other').fill('Please coordinate with my site manager');
 await page.locator('#departments-material-0-contact-other').locator('xpath=ancestor::fieldset[1]').getByRole('button',{name:/^Done:/}).click();await page.reload();await page.getByRole('button',{name:'Edit Lumber / framing details',exact:true}).click();await expect(page.locator('#departments-material-0-subchoices')).toContainText('Please coordinate with my site manager');
 await contactAndReview(page);await expect(page.locator('#plan-recap')).toContainText('Please coordinate with my site manager');expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('after-submit details preserve receipt on failure, save once retried and survive refresh',async({page})=>{
 await mockSubmission(page);let fail=true,details:Record<string,unknown>|null=null;await page.route('**/api/client-questionnaire/followup',async route=>{details=route.request().postDataJSON();await route.fulfill(fail?{status:503,json:{error:'Extra details not saved. Your original request is received.'}}:{json:{ok:true}})});
 await openMaterials(page);await expect(page.locator('#followup-location')).toBeHidden();await page.locator('#priorities-choice-1').check();await contactAndReview(page);await page.locator('#consent').check();await page.locator('#next').click();await expect(page.locator('#followup-location')).toBeVisible();
 await page.locator('#followup-location').fill('Test town');await page.locator('#followup-timing').selectOption('Specific date');await page.locator('#followup-date').fill('2027-02-10');await page.locator('#followup-save').click();await expect(page.locator('#followup-error')).toBeVisible();await expect(page.locator('#success-title')).toBeVisible();
 fail=false;await page.locator('#followup-save').click();await expect(page.locator('#followup-status')).toHaveText('Extra details saved with your request.');expect(details).toMatchObject({location:'Test town',neededDate:'2027-02-10'});await page.reload();await expect(page.locator('#success-title')).toBeVisible();await expect(page.locator('#followup-form')).toBeHidden();
});

test('optional after-submit step can be skipped and does not create another response',async({page})=>{
 const submissions=await mockSubmission(page);await openMaterials(page);await page.locator('#priorities-choice-0').check();await contactAndReview(page);await page.locator('#consent').check();await page.locator('#next').click();await page.locator('#followup-skip').click();await page.reload();await expect(page.locator('#success-title')).toBeVisible();await expect(page.locator('#followup-form')).toBeHidden();expect(submissions).toHaveLength(1);
});
