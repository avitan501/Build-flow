import {test,expect,type BrowserContext,type Page} from '@playwright/test';
const fixture='http://127.0.0.1:3119';
const contact={name:'Example Builder',company:'Example GC <script>window.bad=true</script>',email:'builder@example.com'};
async function authenticate(context:BrowserContext,role='owner'){
 const expires=Math.floor(Date.now()/1000)+3600;
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'11111111-1111-4111-8111-111111111111',exp:expires,role:'authenticated',testRole:role})).toString('base64url')}.local-test-only`;
 const session={access_token:jwt,refresh_token:'local-only',token_type:'bearer',expires_at:expires,user:{id:'11111111-1111-4111-8111-111111111111'}};
 await context.addCookies([{name:'sb-127-auth-token',value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,domain:'127.0.0.1',path:'/'}]);
}
async function fill(page:Page){await page.goto('/questionnaire');await page.getByRole('button',{name:'1. Your business',exact:true}).click();await page.locator('#name').fill(contact.name);await page.locator('#company').fill(contact.company);await page.locator('#email').fill(contact.email);await page.locator('#next').click();await page.locator('#recent_order').fill('Lumber for framing.');await page.locator('#friction').fill('Delivery was late.');await page.getByRole('button',{name:'5. Your priorities',exact:true}).click();await page.locator('#priorities').fill('Tracking deliveries.');await page.getByRole('button',{name:'6. Review & next step',exact:true}).click();await page.locator('#next_step').fill('Roof materials next week.');await page.locator('#next').click();await page.locator('#consent').check()}
test.beforeEach(async({request,baseURL})=>{test.skip(baseURL!=='http://127.0.0.1:3110','Disposable questionnaire fixture only');await request.post(fixture+'/__qa/reset')});
test('client fills, reviews, submits, and owner reads separate response; retries do not duplicate',async({page,context,request})=>{
 test.setTimeout(90000);await fill(page);await expect(page.locator('#summary')).toContainText(contact.company);await page.reload();await expect(page.locator('#review')).toBeVisible();await expect(page.locator('#consent')).toBeChecked();
 const payload=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!));
 await page.locator('#next').click();await expect(page.locator('#success')).toBeVisible();expect((await request.get(fixture+'/__qa/count').then(r=>r.json())).count).toBe(1);
 expect(await page.evaluate(()=>sessionStorage.getItem('avantia:client-questionnaire:v1'))).toBeNull();
 const retry=await request.post('/api/client-questionnaire',{headers:{origin:'http://127.0.0.1:3110'},data:{id:payload.id,state:payload.state,website:''}});expect(retry.status()).toBe(200);expect((await request.get(fixture+'/__qa/count').then(r=>r.json())).count).toBe(1);
 expect((await request.get('/api/owner/service-planner/client-responses')).status()).toBe(403);
 expect((await request.get('/api/client-questionnaire')).status()).toBe(405);
 await authenticate(context);await page.goto('/owner/service-planner/client-responses');await page.getByRole('button',{name:/Example GC/}).click();await expect(page.locator('#detail')).toContainText('Roof materials next week.');expect(await page.evaluate(()=>Boolean((window as unknown as {bad?:boolean}).bad))).toBe(false);
 await page.reload();await expect(page.locator('#records')).toContainText('Example Builder');
});
test('required fields, network failure, retry, and local drafts preserve answers',async({page,request})=>{
 await page.goto('/questionnaire');await page.getByRole('button',{name:'7. Review',exact:true}).click();await page.locator('#next').click();await expect(page.locator('#error')).toContainText('your name');await expect(page.locator('#name')).toBeFocused();
 await fill(page);await request.post(fixture+'/__qa/fail');await page.locator('#next').click();await expect(page.locator('#error')).toContainText('could not save');await expect(page.locator('#success')).toBeHidden();await page.reload();await expect(page.locator('#summary')).toContainText('Tracking deliveries.');await page.locator('#next').click();await expect(page.locator('#success')).toBeVisible();
});
test('anonymous and staff cannot read owner inbox or existing interview API',async({page,context,request})=>{
 expect((await request.get('/api/owner/service-planner/client-responses')).status()).toBe(403);expect((await request.get('/api/owner/service-planner/interviews')).status()).toBe(403);
 await page.goto('/owner/service-planner/client-responses');await expect(page).toHaveURL(/\/login/);
 await page.goto('about:blank');await authenticate(context,'staff');await page.goto('/questionnaire');const status=await page.evaluate(async()=>{const r=await fetch('/api/owner/service-planner/client-responses');return r.status});expect(status).toBe(403);
});
test('public form fits desktop and phones with readable inputs and keyboard navigation',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1153,390,320]){await page.setViewportSize({width,height:800});await page.goto('/questionnaire');await expect(page.locator('#name')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.screenshot({path:testInfo.outputPath(`client-${width}.png`),fullPage:true});await page.locator('#name').focus();await page.keyboard.press('Tab');await expect(page.locator('#company')).toBeFocused()}
 expect(errors).toEqual([]);
});
