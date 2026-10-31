import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const token=(...codes)=>String.fromCharCode(...codes);
const forbidden=[
 token(64,99,97,114,98,111,110),token(99,100,115,45,45),token(73,66,77,32,80,108,101,120),
 token(73,66,77,32,67,97,114,98,111,110),token(99,97,114,98,111,110,45,102,111,117,110,100,97,116,105,111,110),
 token(99,97,114,98,111,110,45,103,114,105,100),token(103,49,48,48),token(73,66,77,95,84,69,76,69,77,69,84,82,89,95,68,73,83,65,66,76,69,68)
];
const residuePattern=new RegExp(forbidden.join('|'),'i');
test('application entry and dependencies use the independent Synesis interface',()=>{
 const pkg=JSON.parse(read('../package.json'));
 assert.equal(Object.keys(pkg.dependencies).some(x=>x.includes(token(64,99,97,114,98,111,110))),false);
 const files=['../src/main.tsx','../src/styles.scss','../src/styles/synesis-design.scss','../src/App.tsx','../src/components/ui.tsx','../src/components/icons.tsx','../src/components/WorkspaceNavigation.tsx'];
 for(const file of files) assert.doesNotMatch(read(file),residuePattern,file);
});
test('entire product repository contains no previous framework or typeface residue',()=>{
 const roots=['../src','../docs','../worker','../supabase','../scripts','../.github'];
 const scan=(dir)=>readdirSync(new URL(dir,import.meta.url),{withFileTypes:true}).flatMap(entry=>{
  if(entry.name==='node_modules'||entry.name==='.git'||entry.name==='dist') return [];
  const child=join(dir,entry.name);
  return entry.isDirectory()?scan(child):[child];
 });
 const files=[...roots.flatMap(scan),'../README.md','../package.json','../index.html','../vite.config.ts','../wrangler.jsonc'];
 for(const file of files) if(existsSync(new URL(file,import.meta.url))) assert.doesNotMatch(read(file),residuePattern,file);
});
