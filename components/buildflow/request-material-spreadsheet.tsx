"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveReviewedRequestItemAction } from "@/app/owner/materials/requests/item-edit-actions"
import { addSpreadsheetMaterialRow } from "@/app/owner/materials/requests/spreadsheet-row-actions"
import { recognizeRequestProductLine } from "@/app/owner/materials/requests/row-recognition-actions"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import { materialCleanLine } from "@/lib/material-clean-line"
import { editMaterialMeasurement, materialSpreadsheetDraft, recognizedMaterialDraft, type MaterialSpreadsheetDraft } from "@/lib/material-spreadsheet-draft"

type Version={item:ReviewableMaterialItem;source:ReviewableMaterialItem|null;revision:string}
type Undo={draft:MaterialSpreadsheetDraft;text:string;questions:string[];dirty:boolean}
const control="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-950"
const measurements=[['width','Width'],['depth','Depth / thickness'],['length','Length'],['model','Model / SKU']] as const

function SpreadsheetRow({requestId,version,newRow=false,onDirty,onSaved,onRemove}:{requestId:string;version:Version;newRow?:boolean;onDirty:(id:string,dirty:boolean)=>void;onSaved:(version:Version,previousRevision:string)=>void;onRemove?:()=>void}) {
  const [baseline,setBaseline]=useState(version)
  const [draft,setDraft]=useState(()=>materialSpreadsheetDraft(version.item))
  const [text,setText]=useState(String(version.item.metadata?.recognition_text||version.item.metadata?.source_text||""))
  const [editing,setEditing]=useState(newRow)
  const [questions,setQuestions]=useState<string[]>(()=>Array.isArray(version.item.metadata?.recognition_questions)?version.item.metadata.recognition_questions.filter((q):q is string=>typeof q==="string"):[])
  const [dirty,setDirty]=useState(newRow)
  const [feedback,setFeedback]=useState("")
  const [undo,setUndo]=useState<Undo|null>(null)
  const [pending,startTransition]=useTransition()
  const busy=useRef(false),router=useRouter()
  const [incomingRevision]=useState(version.revision)
  const stale=version.revision!==incomingRevision&&version.revision!==baseline.revision
  const item=baseline.item
  const received=String(item.metadata?.source_text||"")
  function changed(){setDirty(true);onDirty(item.id,true)}
  function snapshot(){setUndo({draft,text,questions,dirty})}
  function editField(id:string,label:string,value:string){snapshot();changed();setDraft(editMaterialMeasurement(draft,id,label,value))}
  function undoChange(){if(pending||!undo)return;setDraft(undo.draft);setText(undo.text);setQuestions(undo.questions);setDirty(undo.dirty);onDirty(item.id,undo.dirty);setUndo(null);setFeedback("Change undone.")}
  function recognize(){
    if(busy.current||stale||!text.trim())return
    busy.current=true
    startTransition(async()=>{
      try{
        const result=await recognizeRequestProductLine({requestId,itemId:item.id,revision:baseline.revision,text,newRow})
        if(!result.ok){setFeedback(result.error);return}
        snapshot();setDraft(recognizedMaterialDraft(draft,result.row));setQuestions(result.row.questions);changed();setEditing(false)
        setFeedback("Recognized into your draft. Review and save, or undo.")
      }catch{setFeedback("Recognition unavailable. Your draft is still here.")}
      finally{busy.current=false}
    })
  }
  function save(){
    if(busy.current||stale)return
    busy.current=true
    startTransition(async()=>{
      try{
        const edit={...draft,quantity:Number(draft.quantity),recognitionQuestions:questions,recognitionText:text}
        const result=newRow?await addSpreadsheetMaterialRow({requestId,itemId:item.id,...edit}):await saveReviewedRequestItemAction({requestId,itemId:item.id,revision:baseline.revision,edit})
        if(!result.ok){setFeedback(result.error);return}
        const saved={item:result.item,source:result.source,revision:result.revision}
        setBaseline(saved);setDraft(materialSpreadsheetDraft(result.item));setText(String(result.item.metadata?.recognition_text||result.item.metadata?.source_text||""));setDirty(false);setUndo(null);onDirty(item.id,false);onSaved(saved,baseline.revision);setFeedback("Saved.");router.refresh()
      }catch{setFeedback("Not saved. Your draft is still here.")}
      finally{busy.current=false}
    })
  }
  const valid=Boolean(text.trim()&&draft.name.trim()&&draft.unit.trim()&&Number.isFinite(Number(draft.quantity))&&Number(draft.quantity)>0)
  const disabled=pending||stale
  return <tr className="border-t border-slate-200 align-top" data-testid="material-spreadsheet-row">
    <td className="p-3">
      {stale?<p role="alert" className="mb-2 text-xs text-amber-800">A newer version is available. Your draft is retained. Reload after copying the changes you want to keep.</p>:null}
      {editing?<label className="block text-xs">Source line<textarea autoFocus={newRow} disabled={disabled} aria-label={`Source line ${item.id}`} maxLength={3000} className={`${control} mt-1 min-h-24`} value={text} onChange={e=>{snapshot();setText(e.target.value);changed()}}/></label>:<p className="whitespace-pre-wrap text-sm">{text||"Enter your source line."}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={()=>setEditing(!editing)} disabled={disabled} className="min-h-10 px-2 text-xs text-sky-800">{editing?'Close edit':'Edit line'}</button>
        <button type="button" onClick={recognize} disabled={disabled||!text.trim()} className="min-h-10 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40">{pending?'Working…':'Recognize line'}</button>
        {newRow&&onRemove?<button type="button" onClick={onRemove} disabled={pending} className="min-h-10 px-2 text-xs">Remove draft</button>:null}
      </div>
      {received&&received!==text?<details className="mt-2 text-xs text-slate-500"><summary className="min-h-10 cursor-pointer">Received original</summary><p className="whitespace-pre-wrap">{received}</p></details>:null}
    </td>
    <td className="p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-xs">Product<input disabled={disabled} className={control} aria-label={`Product ${item.id}`} value={draft.name} onChange={e=>{snapshot();changed();setDraft({...draft,name:e.target.value})}}/></label>
        <label className="text-xs">Quantity<input disabled={disabled} type="number" min="0.001" step="any" className={control} value={draft.quantity} onChange={e=>{snapshot();changed();setDraft({...draft,quantity:e.target.value})}}/></label>
        <label className="text-xs">Unit<input disabled={disabled} list="material-unit-options" className={control} value={draft.unit} onChange={e=>{snapshot();changed();setDraft({...draft,unit:e.target.value})}}/></label>
        {measurements.map(([id,label])=><label key={id} className="text-xs">{label}<input disabled={disabled} list={id==='model'?undefined:`material-${id}-options`} className={control} value={draft.fields.find(f=>f.id===id)?.value||''} placeholder="Not specified" onChange={e=>editField(id,label,e.target.value)}/></label>)}
      </div>
      <details className="mt-2"><summary className="min-h-10 cursor-pointer text-xs">All details and fields</summary>
        {draft.fields.filter(f=>!measurements.some(([id])=>id===f.id)).map(f=><label key={f.id} className="mt-2 block text-xs">{f.label}<input disabled={disabled} className={control} value={f.value} onChange={e=>editField(f.id,f.label,e.target.value)}/></label>)}
        <label className="text-xs">Additional details<textarea disabled={disabled} className={control} value={draft.details} onChange={e=>{snapshot();changed();setDraft({...draft,details:e.target.value})}}/></label>
      </details>
    </td>
    <td className="p-3">
      <p className="mb-2 text-xs text-slate-500">{dirty?'Draft material line':'Saved material line'}</p>
      <p data-testid="clean-material-line" className="text-sm">{draft.name?materialCleanLine(draft):'Recognize your source line or fill in the fields.'}</p>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={save} disabled={disabled||!dirty||!valid} className="min-h-10 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white disabled:opacity-40">{pending?'Working…':'Save row'}</button>{undo?<button type="button" onClick={undoChange} disabled={pending} className="min-h-10 rounded-lg border px-3 text-xs">Undo change</button>:null}</div>
      <p role="status" className="mt-2 text-xs text-slate-600">{feedback||(dirty?'Unsaved changes':'Saved product')}</p>
      {questions.length?<details className="mt-2 text-xs"><summary className="min-h-10 cursor-pointer text-amber-800">{questions.length} questions to check</summary><ul className="list-disc space-y-2 pl-4">{questions.map((q,i)=><li key={i}>{q}</li>)}</ul></details>:null}
    </td>
  </tr>
}

export function RequestMaterialSpreadsheet({requestId,products}:{requestId:string;products:Version[]}) {
  const [copy,setCopy]=useState("")
  const [added,setAdded]=useState<Array<{version:Version;newRow:boolean}>>([])
  const [dirty,setDirty]=useState<Record<string,boolean>>({})
  const [saved,setSaved]=useState<Record<string,{version:Version;olderRevisions:string[]}>>({})
  const editable=products.filter(p=>p.item.metadata?.ai_organized===true)
  const visible=[...editable.map(version=>({version,newRow:false})),...added.filter(row=>!editable.some(p=>p.item.id===row.version.item.id))]
  const unsaved=Object.values(dirty).some(Boolean)
  useEffect(()=>{
    if(!unsaved)return
    function warn(event:BeforeUnloadEvent){event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[unsaved])
  function rowDirty(id:string,value:boolean){setDirty(previous=>({...previous,[id]:value}))}
  function rowSaved(version:Version,previousRevision:string){setSaved(previous=>({...previous,[version.item.id]:{version,olderRevisions:[...new Set([previousRevision,...(previous[version.item.id]?.olderRevisions||[])])]}}));setAdded(previous=>previous.map(row=>row.version.item.id===version.item.id?{version,newRow:false}:row))}
  function add(){
    const id=crypto.randomUUID()
    const item:ReviewableMaterialItem={id,name:'',quantity:0,unit:'pieces',department:'Others',metadata:{ai_organized:true,source_text:''},qualification_status:'not_required'}
    setAdded(previous=>[...previous,{version:{item,source:null,revision:'new'},newRow:true}]);rowDirty(id,true);setCopy('')
  }
  async function copySaved(){
    if(unsaved){setCopy('Save or remove your changed rows before copying.');return}
    const rows=visible.filter(row=>!row.newRow).map(({version})=>{const override=saved[version.item.id];return override&&override.olderRevisions.includes(version.revision)?override.version:version})
    try{await navigator.clipboard.writeText(rows.map(({item})=>materialCleanLine(materialSpreadsheetDraft(item))).join('\n'));setCopy('Copied saved rows only')}catch{setCopy('Clipboard unavailable. Select the list text to copy.')}
  }
  return <section aria-label="Material spreadsheet" className="min-w-0 p-3">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-600">Edit a line or recognize it. Review the fields, then save.</p><div className="flex gap-2"><button type="button" onClick={add} className="min-h-10 rounded-lg border px-3 text-xs font-semibold">+ Add line</button><button type="button" onClick={copySaved} disabled={unsaved} className="min-h-10 rounded-lg border px-3 text-xs disabled:opacity-40">Copy saved list</button></div></div>
    <p role="status" className="mb-2 text-xs">{copy||(unsaved?'You have unsaved rows. Save them before copying.':'')}</p>
    <datalist id="material-unit-options">{['pieces','sheets','boxes','each','rolls'].map(x=><option key={x} value={x}/>)}</datalist>
    <datalist id="material-depth-options">{['9.5 in','10 in','11.25 in','11.875 in','0.75 in'].map(x=><option key={x} value={x}/>)}</datalist>
    <datalist id="material-length-options">{[10,16,18,20,24,26,28].map(x=><option key={x} value={`${x} ft`}/>)}</datalist>
    <datalist id="material-width-options">{['1.75 in','2 in','2.5 in'].map(x=><option key={x} value={x}/>)}</datalist>
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[880px] table-fixed text-left"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="w-[28%] p-3">Source line</th><th className="w-[44%] p-3">Product fields</th><th className="p-3">Clean material line</th></tr></thead><tbody>{visible.map(({version,newRow})=><SpreadsheetRow key={version.item.id} requestId={requestId} version={version} newRow={newRow} onDirty={rowDirty} onSaved={rowSaved} onRemove={()=>{setAdded(previous=>previous.filter(row=>row.version.item.id!==version.item.id));rowDirty(version.item.id,false)}}/>)}</tbody></table></div>
  </section>
}
