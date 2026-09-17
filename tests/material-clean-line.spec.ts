import { test, expect } from "@playwright/test"
import { materialCleanLine } from "../lib/material-clean-line"
test('field input order never changes the canonical exported order',()=>{
 const fields=[{id:'section',label:'Section',value:'First floor'},{id:'length',label:'Length',value:'10 ft'},{id:'type',label:'Type',value:'Regular SPF'},{id:'depth',label:'Depth',value:'6 in'},{id:'width',label:'Width',value:'2 in'}]
 const input={name:'Dimensional lumber',quantity:250,unit:'pieces',fields,details:''}
 expect(materialCleanLine(input)).toBe('250 pieces · Dimensional lumber · 2 in · 6 in · 10 ft · Regular SPF · First floor')
 expect(materialCleanLine({...input,fields:[...fields].reverse()})).toBe(materialCleanLine(input))
})

test("material copy excludes delivery data while preserving product specifications and floor", () => {
  const fields = [
    { id: "delivery-address", label: "Delivery address", value: "28 Woodmere S, Woodmere, NY" },
    { id: "shipping", label: "Shipping / delivery", value: "First delivery" },
    { id: "depth", label: "Depth", value: "10 in" },
    { id: "length", label: "Length", value: "26 ft" },
    { id: "section", label: "Section", value: "Second floor" },
    { id: "clarify-tji", label: "TJI question", value: "internal answer" },
  ]
  const original = JSON.stringify(fields)
  const line = materialCleanLine({ name: "TJI 230 I-joist", quantity: 12, unit: "pieces", fields, details: "28 Woodmere S, Woodmere, NY · Top mount required" })
  expect(line).toBe("12 pieces · TJI 230 I-joist · 10 in · 26 ft · Top mount required · Second floor")
  expect(JSON.stringify(fields)).toBe(original)
})

test("cleaning retains material grade, coatings, packaging and unknown detail text", () => {
  expect(materialCleanLine({ name: "Nails", quantity: 2, unit: "boxes", fields: [{ id: "grade", label: "Grade", value: "Hot-dip galvanized" }], details: "50 lb per box · Exact model required" })).toContain("Hot-dip galvanized · 50 lb per box · Exact model required")
})
test('embedded lumber dimensions appear once without losing units, length or grade',()=>{
 const fields=[{id:'width',label:'Width',value:'2 in'},{id:'depth',label:'Depth',value:'12 in'},{id:'length',label:'Length',value:'28 ft'},{id:'type',label:'Type',value:'Regular SPF'}]
 expect(materialCleanLine({name:'2x12',quantity:12,unit:'pc',fields,details:'Regular SPF · Ceiling joists'})).toBe('12 pc · 2x12 in · 28 ft · Regular SPF · Ceiling joists')
 expect(materialCleanLine({name:'2x12 ft',quantity:12,unit:'pc',fields,details:''})).toContain('2 in · 12 in')
})
test('model and length already in the product name are not repeated, distinct models remain',()=>{
 const fields=[{id:'model',label:'Model',value:'TJI 230 Series'},{id:'depth',label:'Depth',value:'10 in'},{id:'length',label:'Length',value:'26 ft'}]
 expect(materialCleanLine({name:'TJI 230 I-joist',quantity:12,unit:'pc',fields,details:''})).toBe('12 pc · TJI 230 I-joist · 10 in · 26 ft')
 expect(materialCleanLine({name:'TJI 230 I-joist',quantity:12,unit:'pc',fields:[{id:'model',label:'Model',value:'TJI 230R'}],details:''})).toContain('TJI 230R')
})
