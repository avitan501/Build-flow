/** Catalog naming aliases only; never approve engineering/material equivalence. */
export function comparisonDepthInches(category:string|null,value:number,context:string):number {
 // Catalog panel thickness pairs, not permission to substitute OSB or grades.
 // Exact/actual/minimum specifications are literal and never rounded away.
 if(category==='plywood'&&!/\b(?:actual|exact|minimum|min\.)\b/i.test(context)){
  if(value===23/32)return 3/4
  if(value===19/32)return 5/8
 }
 if(value!==10)return value
 if(category==='joist'&&/\btji\b/i.test(context))return 9.5
 // Approved Home Depot-style LVL nominal 10-inch depth naming.
 // Explicit actual dimensions or a 10-inch width/thickness remain literal.
 if(category==='lvl'&&!/\bactual\b/i.test(context)&&!/(?:width|thickness)\s*[:=]?\s*10\s*(?:in|inch|["″])/i.test(context))return 9.5
 return value
}
