import fs from 'node:fs';
for (const name of ['editor','runtime']) {
  const file = new URL(`../lib/service-planner/${name}.html`, import.meta.url);
  fs.writeFileSync(new URL(`../lib/service-planner/${name}.generated.json`, import.meta.url), JSON.stringify(fs.readFileSync(file, 'utf8'))+'\n');
}
