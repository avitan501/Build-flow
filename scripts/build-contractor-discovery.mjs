import fs from 'node:fs';
const source=new URL('../lib/contractor-discovery/editor.html',import.meta.url);
fs.writeFileSync(new URL('../lib/contractor-discovery/editor.generated.json',import.meta.url),JSON.stringify(fs.readFileSync(source,'utf8'))+'\n');
