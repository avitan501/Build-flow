/** Catalog naming aliases only; never approve engineering/material equivalence. */
export function comparisonDepthInches(category:string|null,value:number,context:string):number {
 if(value!==10)return value
 if(category==='joist'&&/\btji\b/i.test(context))return 9.5
 // Approved Home Depot-style LVL nominal 10-inch depth naming.
 // Explicit actual dimensions or a 10-inch width/thickness remain literal.
 if(category==='lvl'&&!/\bactual\b/i.test(context)&&!/(?:width|thickness)\s*[:=]?\s*10\s*(?:in|inch|["″])/i.test(context))return 9.5
 return value
}
