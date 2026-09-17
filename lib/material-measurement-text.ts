const unicodeFractions:Record<string,number>={'¼':1/4,'½':1/2,'¾':3/4,'⅛':1/8,'⅜':3/8,'⅝':5/8,'⅞':7/8,'⅓':1/3,'⅔':2/3}
/** Parse dimension tokens only, not identifiers or product approvals. */
export function measurementNumber(value:string):number|null {
 const token=value.trim(),unicode=token.match(/^(\d*)\s*([¼½¾⅛⅜⅝⅞⅓⅔])$/)
 if(unicode)return Number(unicode[1]||0)+unicodeFractions[unicode[2]]
 const mixed=token.match(/^(?:(\d+)[ -]+)?(\d+)\s*\/\s*(\d+)$/)
 if(mixed)return Number(mixed[3])>0?Number(mixed[1]||0)+Number(mixed[2])/Number(mixed[3]):null
 return /^\d+(?:\.\d+)?$/.test(token)?Number(token):null
}
/** Normalize notation, never nominal sizes. Original uploaded wording remains untouched. */
export function normalizeMeasurementText(value:string):string {
 // Compact sheet notation: 4 x 8 3/4" means an 8-foot sheet, 3/4-inch thick.
 if(/\b(?:plywood|cdx|osb|sheet|plyscord|deck)\b/i.test(value))value=value.replace(/(\b\d+\s*(?:['′]|ft)?\s*[x×]\s*\d+\s*(?:['′]|ft)?)\s+(\d+\s*\/\s*\d+\s*(?:["″]|in\b|inch\b|inches\b))/gi,'$1 · $2')
 const tokens=/(?:\b\d+[ -]+\d+\s*\/\s*\d+|\b\d+\s*\/\s*\d+|\b\d+\s*[¼½¾⅛⅜⅝⅞⅓⅔]|[¼½¾⅛⅜⅝⅞⅓⅔])(?=\s*(?:["″'′]|inches\b|inch\b|in\b|feet\b|foot\b|ft\b|[x×]\s*\d))/gi
 return value.replace(tokens,token=>{const number=measurementNumber(token);return number===null?token:String(number)})
  .replace(/["″]/g,' in ').replace(/['′]/g,' ft ')
  .replace(/\b(?:inches|inch)\b/gi,'in').replace(/\b(?:feet|foot)\b/gi,'ft')
}
