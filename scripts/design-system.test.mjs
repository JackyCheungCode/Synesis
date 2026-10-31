import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('application entry and dependencies are independent of legacy UI frameworks and fonts',()=>{
 const pkg=JSON.parse(read('../package.json'));
 const deps=Object.keys(pkg.dependencies);
 assert.equal(deps.some(x=>x.startsWith('@carbon/')),false);
 const main=read('../src/main.tsx');
 const styles=read('../src/styles.scss')+read('../src/styles/synesis-design.scss');
 const app=read('../src/App.tsx');
 assert.doesNotMatch(main+styles+app,/carbon|cds--|IBM Plex|@ibm/i);
});
test('native navigation and primitives do not depend on a vendor component framework',()=>{
 const files=['../src/components/ui.tsx','../src/components/icons.tsx','../src/components/WorkspaceNavigation.tsx'];
 for(const file of files) assert.doesNotMatch(read(file),/carbon|cds--|IBM Plex|@ibm/i);
});

test('entire product repository contains no former framework or typeface residue',()=>{
 const roots=['../src','../docs','../worker','../supabase','../scripts','../.github'];
 const scan=(dir)=>readdirSync(new URL(dir,import.meta.url),{withFileTypes:true}).flatMap(entry=>{
  if(entry.name==='node_modules'||entry.name==='.git'||entry.name==='dist'||entry.name==='design-system.test.mjs') return [];
  const child=join(dir,entry.name);
  return entry.isDirectory()?scan(child):[child];
 });
 const files=[...roots.flatMap(scan),'../README.md','../package.json','../index.html','../vite.config.ts','../wrangler.jsonc'];
 for(const file of files) if(existsSync(new URL(file,import.meta.url))){
  const body=read(file);
  assert.doesNotMatch(body,/@carbon|cds--|IBM Plex|IBM Carbon|carbon-foundation|carbon-grid|g100|IBM_TELEMETRY_DISABLED/i,file);
 }
});
