import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/api/consultation/availability?*',route=>route.fulfill({json:{hours:[12,14,16]}}));});
test('one calendar, native details, confirmed preparation and compact layout',async({page})=>{
 await page.route('**/api/consultation/book',route=>route.fulfill({json:{ok:true,meetingUrl:'https://meet.google.com/abc-defg-hij'}}));
 await page.goto('/consultation');await expect(page.getByRole('button',{name:'12:00 PM',exact:true})).toBeEnabled();
 expect(await page.locator('iframe').count()).toBe(0);await expect(page.getByText('Share your material needs',{exact:true})).toHaveCount(0);
 await page.screenshot({path:`docs/consultation-polish-preview-20261029/native-${test.info().project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'12:00 PM',exact:true}).click();await expect(page.getByLabel('Your name',{exact:true})).toBeVisible();
 await page.getByLabel('Your name',{exact:true}).fill('Preview Test');await page.getByLabel('Email',{exact:true}).fill('preview@example.com');
 await page.getByRole('button',{name:'Confirm free meeting'}).click();await expect(page.getByRole('heading',{name:'You’re booked.'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Share your material needs'})).toBeVisible();expect(await page.locator('iframe').count()).toBe(0);
});
test('uncertain booking retains ID and details for retry',async({page})=>{
 const payloads:unknown[]=[];await page.route('**/api/consultation/book',async route=>{payloads.push(route.request().postDataJSON());await route.fulfill(payloads.length===1?{status:503,json:{error:'Please retry.'}}:{json:{ok:true,meetingUrl:null}})});
 await page.goto('/consultation');await page.getByRole('button',{name:'12:00 PM',exact:true}).click();await page.getByLabel('Your name',{exact:true}).fill('Preview Test');await page.getByLabel('Email',{exact:true}).fill('preview@example.com');await page.getByRole('button',{name:'Confirm free meeting'}).click();await expect(page.getByRole('alert').filter({hasText:'Please retry.'})).toBeVisible();await expect(page.getByLabel('Your name',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Check my booking'}).click();await expect(page.getByRole('heading',{name:'You’re booked.'})).toBeVisible();expect(payloads[0]).toEqual(payloads[1]);
});
test('availability outage does not offer bookable times',async({page})=>{await page.route('**/api/consultation/availability?*',route=>route.fulfill({status:503,json:{error:'Unavailable'}}));await page.goto('/consultation');await expect(page.getByRole('alert').filter({hasText:'couldn’t check'})).toBeVisible();await expect(page.getByRole('button',{name:'12:00 PM, unavailable',exact:true})).toBeDisabled();});
