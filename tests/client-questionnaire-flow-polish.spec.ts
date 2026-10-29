import { test, expect } from '@playwright/test';
test.beforeEach(()=>test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'),'Local preview only'));
test('time-spent choices have a distinct panel and preserve multiple selections',async({page},info)=>{
 await page.goto('/questionnaire');
 const friction=page.locator('#friction-field');await expect(friction).toBeHidden();await page.locator('#friction-disclosure summary').click();await expect(friction).toBeVisible();
 const colors=await page.evaluate(()=>({friction:getComputedStyle(document.getElementById('friction-disclosure')!).backgroundColor,materials:getComputedStyle(document.getElementById('departments-field')!).backgroundColor}));expect(colors.friction).not.toBe(colors.materials);
 await page.locator('#friction-choice-0').check();await page.locator('#friction-choice-1').check();await expect(page.locator('#friction-choice-0')).toBeChecked();await expect(page.locator('#friction-choice-1')).toBeChecked();
 await friction.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('time-spent.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.reload();await page.locator('#friction-disclosure summary').click();await expect(page.locator('#friction-choice-0')).toBeChecked();await expect(page.locator('#friction-choice-1')).toBeChecked();
});

test('starts with materials and has three steps including review',async({page})=>{
 await page.goto('/questionnaire');await expect(page.locator('#departments-field')).toBeVisible();await expect(page.locator('#projects-field')).toHaveCount(0);await expect(page.locator('#step-count')).toHaveText('Step 1 of 3');await expect(page.locator('#steps button')).toHaveCount(3);await expect(page.locator('#previous')).toBeHidden();
 await page.locator('#priorities-choice-0').check();await page.locator('#next').click();await expect(page.locator('#step-count')).toHaveText('Step 2 of 3');await page.locator('#next_step-choice-0').check();await page.locator('#name').fill('Preview tester');await page.locator('#email').fill('test@example.com');await page.locator('#next').click();await expect(page.locator('#step-count')).toHaveText('Step 3 of 3');await page.getByRole('button',{name:'Edit materials and help'}).click();await expect(page.locator('#departments-field')).toBeVisible();
});
test('old draft keeps answers and maps its delivery step correctly across reloads',async({page})=>{
 await page.goto('/questionnaire');await page.evaluate(()=>sessionStorage.setItem('avantia:client-questionnaire:v1',JSON.stringify({id:'a76528fe-6c59-473e-a93e-33d5fc20e847',step:2,state:{type:'avantia-client-questionnaire-v1',profile:{name:'Saved Builder',company:'',email:'saved@example.com',phone:''},answers:{projects:'New construction',priorities:'Track my delivery'},consent:false},choices:{priorities:['Track my delivery']},other:{},followups:{},followupOther:{}})));
 await page.reload();await expect(page.locator('#name')).toHaveValue('Saved Builder');await expect(page.locator('#step-count')).toHaveText('Step 2 of 3');await page.locator('#next_step-choice-0').check();await page.reload();await expect(page.locator('#step-count')).toHaveText('Step 2 of 3');await page.locator('#next').click();await expect(page.locator('#review')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!).state.answers.projects)).toBe('New construction');
});
