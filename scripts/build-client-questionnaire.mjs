import fs from 'node:fs';
const folder = new URL('../lib/client-questionnaire/', import.meta.url);
for (const name of ['form.html', 'inbox.html', 'styles.css']) {
  fs.writeFileSync(new URL(name+'.json', folder), JSON.stringify(fs.readFileSync(new URL(name, folder),'utf8'))+'\n');
}
