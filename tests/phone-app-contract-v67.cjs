// DUDU V67.0 baseline audit for all Cyber Phone apps.
// Run: node tests/phone-app-contract-v67.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=fs.readFileSync(path.join(root,'js/phone-app-contract-v67.js'),'utf8');
const ids=['profile','inventory','author-mail','lab-v445','museum','quests',
  'stories','codex','chat','shop','fun','settings'];
const requested=[];
const elements=new Map(ids.map(id=>['phone-app-'+id,{id:'phone-app-'+id,style:{display:'none'}}]));
elements.set('cyber-phone',{style:{display:'none'}});
const document={getElementById(id){requested.push(id);return elements.get(id)||null;}};
const win={document};
const environment={window:win,IS_SANDBOX_MODE:false};
vm.runInNewContext(code,environment,{filename:'phone-app-contract-v67.js',timeout:1500});
const api=win.DuduPhoneAppsV67;
assert.ok(api);
assert.equal(api.version,1);
assert.equal(api.specs.length,12);
assert.equal(new Set(Array.from(api.specs,s=>s.id)).size,12);
assert.equal(api.get('nonexistent'),null);
for(const app of api.specs){
 assert.ok(ids.includes(app.id),app.id+' has unsupported ID');
 assert.ok(html.includes('id="'+app.elementId+'"'),'Missing existing app mount '+app.elementId);
 assert.ok(app.entrypoint,'Missing legacy app entrypoint '+app.id);
 assert.equal(api.get(app.id).mounted,true);
 assert.equal(api.get(app.id).rendered,false);
 assert.equal(api.get(app.id).entrypointDetected,false);
}
assert.equal(api.get('chat').decision,'modernize');
assert.equal(api.get('quests').decision,'bridge');
assert.equal(api.get('inventory').decision,'retain');
assert.equal(api.get('lab-v445').state,'sandbox_only');
environment.IS_SANDBOX_MODE=true;
assert.equal(api.get('lab-v445').state,'missing_entrypoint');
win.renderChatDropdown=()=>{};
assert.equal(api.get('chat').state,'code_present');
assert.ok(api.issues().some(row=>row.id==='quests'),'Absent renderer must be detectable');
assert.ok(code.indexOf('localStorage.')<0 && code.indexOf('fetch(')<0);
assert.ok(html.includes('src="js/phone-app-contract-v67.js?'),'Shared app inventory must load on the site');
console.log('DUDU V67 phone app manifest: 12 mounts, status probes and safe sandbox distinction OK');
