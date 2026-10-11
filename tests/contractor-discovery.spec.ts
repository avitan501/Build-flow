import {test,expect,type Page} from '@playwright/test';
import editor from '../lib/contractor-discovery/editor.generated.json';
import questions from '../lib/contractor-discovery/questions.json';
import seed from '../lib/service-planner/seed.json';
import {interviewSaveSchema, type InterviewRecord} from '../lib/contractor-discovery/schema';
async function harness(page:Page){
 const records=new Map<string, InterviewRecord>();
 const control={failure:0,hold:false,release:()=>{},puts:0};
 await page.route('https://discovery.test/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.startsWith('/api/')){
   if(req.method()==='PUT'){
    control.puts++;if(control.hold)await new Promise<void>(resolve=>{control.release=resolve});
    if(control.failure)return route.fulfill({status:control.failure,json:{error:control.failure===409?'A newer version exists. Download notes and reopen.':'Could not save. Keep notes and retry.'}});
    const parsed=interviewSaveSchema.safeParse(req.postDataJSON());if(!parsed.success)return route.fulfill({status:400,json:{error:JSON.stringify(parsed.error)}});
    const data=parsed.data,old=records.get(data.id);if((old?.revision??0)!==data.revision)return route.fulfill({status:409,json:{error:'Conflict'}});
    const saved={id:data.id,revision:data.revision+1,state:data.state,updated_at:new Date().toISOString()};records.set(saved.id,saved);return route.fulfill({json:saved});
   }
   const id=url.searchParams.get('id');if(id)return route.fulfill({status:records.has(id)?200:404,json:records.get(id)||{error:'Not found'}});
   return route.fulfill({json:{interviews:[...records.values()].map(r=>({id:r.id,revision:r.revision,updated_at:r.updated_at,...r.state.profile,status:r.state.status})),nextOffset:null}});
  }
  const cfg={questions,departments:seed.rows.map(r=>({id:r.id,name:r.department,items:r.items})),offers:null};
  return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>window.discoveryConfig=${JSON.stringify(cfg)}</script>${editor}</body></html>`});
 });
 await page.goto('https://discovery.test/owner/service-planner/interviews');return {records,control};
}
async function start(page:Page,name='Example GC'){await page.getByRole('button',{name:'New contractor interview'}).click();await page.getByRole('textbox',{name:'Company / contractor name',exact:true}).fill(name);await expect(page.locator('#save-status')).toContainText('Saved to Avantia');}
test('30-minute interview saves separately, maps priorities to services and prints only reviewed plan fields',async({page},testInfo)=>{
 const {records}=await harness(page);await start(page);await page.screenshot({path:'docs/contractor-discovery/'+testInfo.project.name+'-interview.png',fullPage:true});
 await page.getByRole('textbox',{name:/What projects are you running/}).fill('Two homes; framing starts next week.');
 await page.getByRole('button',{name:/^3\. Where it repeats/}).click();await page.getByRole('checkbox',{name:/^Framing /}).check();
 await page.getByRole('button',{name:/^5\. Choose useful help/}).click();await page.getByRole('button',{name:'Add priority'}).click();await page.getByLabel('Priority 1 problem').selectOption('missing');await page.getByRole('textbox',{name:'What happened / contractor’s words',exact:true}).fill('Framer called three times about missing hardware.');await expect(page.locator('#extras')).toContainText('Suggested to discuss: Shortages & reorders');await page.getByRole('checkbox',{name:/^Shortages & reorders/}).check();
 await page.getByRole('button',{name:/^6\. Recap/}).click();await page.getByRole('button',{name:'Draft summary from priorities'}).click();await expect(page.locator('#plan-summary')).toHaveValue(/missing hardware/);await expect(page.locator('#plan-summary')).toHaveValue(/Focus: Framing/);
 await page.getByRole('textbox',{name:/Internal notes/}).fill('PRIVATE effort estimate');await page.getByRole('textbox',{name:/What the GC \/ trade/}).fill('GC approves lists; crew checks delivery.');await expect(page.locator('#save-status')).toContainText('Saved to Avantia');
 await page.locator('#preview').click();await expect(page.locator('#preview-body')).toContainText('missing hardware');await expect(page.locator('#preview-body')).not.toContainText('PRIVATE');await page.screenshot({path:'docs/contractor-discovery/'+testInfo.project.name+'-plan.png',fullPage:true});await page.emulateMedia({media:'print'});await expect(page.locator('#print-area')).toBeVisible();await expect(page.locator('#print-area')).not.toContainText('PRIVATE');await expect(page.locator('.wrap')).toBeHidden();await page.emulateMedia({media:'screen'});
 await page.getByRole('button',{name:'← Back to interview'}).click();await page.getByRole('button',{name:'← All interviews'}).click();await start(page,'Second GC');await expect.poll(()=>records.size).toBe(2);await page.reload();await page.getByRole('button',{name:/Example GC/}).click();await expect(page.getByRole('textbox',{name:/What projects are you running/})).toHaveValue('Two homes; framing starts next week.');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('edits during an in-flight save survive and are saved in a second serial request',async({page})=>{
 const {records,control}=await harness(page);await start(page);control.hold=true;
 const box=page.getByRole('textbox',{name:/What projects are you running/});await box.fill('First note');await page.getByRole('button',{name:'Save now'}).click();await expect(page.locator('#save-status')).toHaveText('Saving…');await box.fill('Latest note while saving');control.hold=false;control.release();await expect(page.locator('#save-status')).toContainText('Saved to Avantia');expect([...records.values()][0].state.answers.projects).toBe('Latest note while saving');
});
test('failed and conflicting saves preserve notes without claiming success or overwriting a newer record',async({page})=>{
 const {records,control}=await harness(page);await start(page);control.failure=503;await page.getByRole('textbox',{name:/What projects are you running/}).fill('Important unsaved notes');await expect(page.locator('#save-status')).toContainText('Could not save');expect([...records.values()][0].state.answers.projects).toBeUndefined();control.failure=409;await page.getByRole('button',{name:'Save now'}).click();await expect(page.locator('#save-status')).toContainText('newer version');const puts=control.puts;await page.getByRole('textbox',{name:/What projects are you running/}).fill('Still retained');await page.waitForTimeout(1300);expect(control.puts).toBe(puts);await expect(page.getByRole('textbox',{name:/What projects are you running/})).toHaveValue('Still retained');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download notes'}).click();expect((await download).suggestedFilename()).toMatch(/avantia-interview/);
});
test('unsupported pain is not forced into a service and customer text is rendered literally',async({page})=>{
 await harness(page);await start(page,'<img src=x onerror=alert(1)>');await expect(page.locator('#interview-title img')).toHaveCount(0);await page.getByRole('button',{name:/^5\. Choose useful help/}).click();await page.getByRole('button',{name:'Add priority'}).click();await page.getByLabel('Priority 1 problem').selectOption('approvals');await expect(page.locator('#extras')).toContainText('Some problems may need a different solution');await expect(page.locator('#extras input:checked')).toHaveCount(0);
});

test('optional question bank persists asked markers and notes per contractor without changing legacy answers or sharing private notes',async({page},testInfo)=>{
 const {records}=await harness(page);await start(page,'Bank GC');
 const record=[...records.values()][0];delete record.state.bankAnswers;delete record.state.askedQuestions;record.state.answers.projects='Existing interview answer';
 await page.reload();await page.getByRole('button',{name:/Bank GC/}).click();
 await expect(page.getByRole('textbox',{name:/What projects are you running/})).toHaveValue('Existing interview answer');
 await expect(page.locator('#bank-panel')).not.toHaveAttribute('open','');
 await page.locator('#bank-panel > summary').click();
 const question=questions.sections[0].bank[0];const item=page.locator('[data-question-id="'+question.id+'"]');
 await item.locator('summary').click();await expect(item).toContainText(question.followups[0]);
 await item.getByRole('checkbox',{name:'Asked: '+question.text,exact:true}).check();
 await item.getByRole('textbox',{name:'Notes: '+question.text,exact:false}).fill('PRIVATE BANK: Framing next week; approved list from the framer.');
 await expect(page.locator('#save-status')).toContainText('Saved to Avantia');
 await page.screenshot({path:'docs/contractor-question-bank/'+testInfo.project.name+'.png',fullPage:true});
 await page.getByRole('button',{name:/^2\. One real order/}).click();
 await expect(page.locator('#bank-panel .bank-question')).toHaveCount(10);
 await page.reload();await page.getByRole('button',{name:/Bank GC/}).click();await page.locator('#bank-panel > summary').click();await item.locator('summary').click();
 await expect(item.getByRole('checkbox',{name:'Asked: '+question.text,exact:true})).toBeChecked();
 await expect(item.getByRole('textbox',{name:'Notes: '+question.text,exact:false})).toHaveValue(/PRIVATE BANK/);
 await item.getByRole('checkbox',{name:'Asked: '+question.text,exact:true}).uncheck();await expect(page.locator('#save-status')).toContainText('Saved to Avantia');
 expect([...records.values()][0].state.bankAnswers?.[question.id]).toContain('PRIVATE BANK');
 await page.locator('#preview').click();await expect(page.locator('#preview-body')).not.toContainText('PRIVATE BANK');
 await page.getByRole('button',{name:'← Back to interview'}).click();await page.getByRole('button',{name:'← All interviews'}).click();await start(page,'Different GC');
 await page.locator('#bank-panel > summary').click();await item.locator('summary').click();
 await expect(item.getByRole('textbox',{name:'Notes: '+question.text,exact:false})).toHaveValue('');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
