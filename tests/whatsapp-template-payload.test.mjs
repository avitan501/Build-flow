import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const broker=readFileSync(new URL('../supabase/functions/aura-messaging-broker/index.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../components/buildflow/unified-communication-inbox.tsx',import.meta.url),'utf8');
const compile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
// Approved WABA 1609047970612779 API snapshot, inspected 2026-09-16.
const definitions={
 quote_request_received:['Hi {{1}}, we received your material request {{2}}. Our team is reviewing it and will send updates here.','Ask a question',['David','MR-1042']],
 service_request_received:['Hi {{1}}, we received your request for {{2}}. Our team will review it and contact you here with the next update.','Add details',['David','a WhatsApp connection test']],
 quote_ready:['Hi {{1}}, your Avantia Build quote {{2}} is ready. Review the details here: {{3}}. Reply here if you have any questions.','Ask about quote',['David','Q-1042','https://avantiabuild.com/client-document/example']],
 order_received:['Hi {{1}}, we received order {{2}}. We will send another message when it is ready for the next step. Reply here if you have a question about this order.','Ask about order',['David','O-1042']],
};
for(const [name,[approvedBody,buttonLabel,parameters]] of Object.entries(definitions))test(`${name}: selected name, exact Meta language, ordered body values and approved preview`,async()=>{
 let payload,stored;
 const context=vm.createContext({URL,normalizePhone:v=>v,
  metaWhatsAppConfig:async()=>({graphVersion:'v25.0',businessAccountId:'1609047970612779',phoneNumberId:'1266268263238386',from:'+15169901990',accessToken:'local-test-only'}),
  fetch:async(url,options)=>{
   if(options?.method==='POST'){
    assert.equal(url,'https://graph.facebook.com/v25.0/1266268263238386/messages');payload=JSON.parse(options.body);
    return {ok:true,json:async()=>({messages:[{id:'test-only'}]})};
   }
   assert.equal(url.searchParams.get('name'),name);
   return {ok:true,json:async()=>({data:[{name:'wrong-template',status:'APPROVED',category:'UTILITY',language:'en_US'},{name,status:'APPROVED',category:'UTILITY',language:'en'}]})};
  },storeCommunication:async value=>{stored=value},
 });
 vm.runInContext(compile(broker.slice(broker.indexOf('const META_UTILITY_TEMPLATES ='),broker.indexOf('const META_MARKETING_TEMPLATES ='))),context);
 await context.sendWhatsAppUtilityTemplate('+15550005077',name,parameters);
 assert.equal(payload.template.name,name);assert.equal(payload.template.language.code,'en');
 assert.deepEqual(payload.template.components,[{type:'body',parameters:parameters.map(text=>({type:'text',text}))}]);
 assert.equal(stored.status,'accepted');
 const expected=approvedBody.replace(/\{\{(\d+)\}\}/g,(_,number)=>parameters[Number(number)-1]);
 assert.equal(stored.body,expected);
 const source=ts.createSourceFile('inbox.tsx',ui,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const statement=source.statements.find(s=>ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>d.name.getText(source)==='WHATSAPP_UTILITY_TEMPLATES'));
 const preview=vm.createContext({});vm.runInContext(compile(statement.getText(source))+'\nglobalThis.templates=WHATSAPP_UTILITY_TEMPLATES',preview);
 assert.equal(preview.templates[name].render(parameters),expected);assert.equal(preview.templates[name].buttonLabel,buttonLabel);
});
