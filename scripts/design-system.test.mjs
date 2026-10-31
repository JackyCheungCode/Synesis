import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
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
