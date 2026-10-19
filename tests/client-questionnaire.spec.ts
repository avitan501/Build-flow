import {test,expect,type BrowserContext,type Page} from '@playwright/test';
const fixture='http://127.0.0.1:3129';
async function authenticate(context:BrowserContext,role='owner'){
 const expires=Math.floor(Date.now()/1000)+3600;
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'11111111-1111-4111-8111-111111111111',exp:expires,role:'authenticated',testRole:role})).toString('base64url')}.local-test-only`;
 const session={access_token:jwt,refresh_token:'local-only',token_type:'bearer',expires_at:expires,user:{id:'11111111-1111-4111-8111-111111111111'}};
 await context.addCookies([{name:'sb-127-auth-token',value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,domain:'127.0.0.1',path:'/'}]);
}

async function fill(page:Page){
 await page.goto('/questionnaire');await page.locator('#projects-choice-0').check();await page.locator('#next').click();await page.locator('#departments-choice-0').check();await page.locator('#departments-material-0-list-1').check();await page.locator('#departments-material-0-contact-3').check();await page.locator('#next').click();await page.locator('#next_step-choice-0').check();await page.locator('#name').fill('Example Builder');await page.locator('#company').fill('Example GC <script>window.bad=true</script>');await page.locator('#email').fill('builder@example.com');await page.locator('#next').click();await page.locator('#consent').check();
}
test.beforeEach(async({request,baseURL})=>{test.skip(baseURL!=='http://127.0.0.1:3120','Isolated revision database and production build only');await request.post(fixture+'/__qa/reset')});
test('real database saves response and optional details; owner reads both; retries stay one request',async({page,context,request})=>{
 await fill(page);const payload=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1')!));await page.locator('#next').click();await expect(page.locator('#success-title')).toBeVisible();await expect(page.locator('#success-title')).toHaveText('Your request is received.');
 const receipt=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('avantia:client-questionnaire:v1:receipt')!));
 const forged=await request.post('/api/client-questionnaire/followup',{headers:{origin:'http://127.0.0.1:3120'},data:{id:'11111111-1111-4111-8111-111111111111',token:receipt.token,location:'Bad target',timing:'Soon',neededDate:''}});expect(forged.status()).toBe(403);
 await page.locator('#followup-location').fill('Test town <script>window.bad=true</script>');await page.locator('#followup-timing').selectOption('Soon');await page.locator('#followup-save').click();await expect(page.locator('#followup-status')).toHaveText('Extra details saved with your request.');
 const retry=await request.post('/api/client-questionnaire',{headers:{origin:'http://127.0.0.1:3120'},data:{id:payload.id,state:payload.state,website:''}});expect(retry.status()).toBe(200);expect((await request.get(fixture+'/__qa/count').then(r=>r.json())).count).toBe(1);
 expect((await request.get('/api/owner/service-planner/client-responses')).status()).toBe(403);expect((await request.get('/api/client-questionnaire/followup')).status()).toBe(405);
 await authenticate(context);await page.goto('/owner/service-planner/client-responses');await page.getByRole('button',{name:/Example GC/}).click();await expect(page.locator('#detail')).toContainText('Compare quotes for the same materials, quantities, and delivery');await expect(page.locator('#detail')).toContainText('Test town <script>window.bad=true</script>');await expect(page.locator('#detail')).toContainText('Soon');expect(await page.evaluate(()=>Boolean((window as unknown as {bad?:boolean}).bad))).toBe(false);
});
test('real storage failure preserves original submission and permits follow-up retry',async({page,request})=>{
 await fill(page);await request.post(fixture+'/__qa/fail');await page.locator('#next').click();await expect(page.locator('#error')).toContainText('could not save');await page.reload();await expect(page.locator('#review')).toBeVisible();await page.locator('#next').click();await expect(page.locator('#success-title')).toBeVisible();
 await page.locator('#followup-location').fill('Retry town');await request.post(fixture+'/__qa/fail');await page.locator('#followup-save').click();await expect(page.locator('#followup-error')).toContainText('original request is received');expect((await request.get(fixture+'/__qa/count').then(r=>r.json())).count).toBe(1);await page.locator('#followup-save').click();await expect(page.locator('#followup-status')).toContainText('saved');
});
test('anonymous and staff cannot read private inbox or existing interview API',async({page,context,request})=>{
 expect((await request.get('/api/owner/service-planner/client-responses')).status()).toBe(403);expect((await request.get('/api/owner/service-planner/interviews')).status()).toBe(403);
 await page.goto('/owner/service-planner/client-responses');await expect(page).toHaveURL(/\/login/);await page.goto('about:blank');await authenticate(context,'staff');await page.goto('/questionnaire');const status=await page.evaluate(async()=>{const r=await fetch('/api/owner/service-planner/client-responses');return r.status});expect(status).toBe(403);
});
