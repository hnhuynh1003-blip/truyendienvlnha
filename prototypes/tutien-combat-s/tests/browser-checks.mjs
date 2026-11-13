import { MockRepository, DB_NAME } from '../mock-repository.mjs';
import { runWorldBrowserChecks } from './world-browser-checks.mjs';
import {runJadeBrowserChecks} from './jade-browser-checks.mjs';
import {runModuleBrowserChecks} from './module-browser-checks.mjs';
import {runWavesBrowserChecks} from './waves-browser-checks.mjs';
import {runExplorationBrowserChecks} from './exploration-browser-checks.mjs';
const results=[],resources=new Set(),assert=(v,msg='Assertion failed')=>{if(!v)throw Error(msg);};
function postReport(report){return fetch('/__browser-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)}).catch(()=>{});}
window.addEventListener('error',e=>{postReport({pass:0,fail:1,fatal:e.message});});
window.addEventListener('unhandledrejection',e=>{postReport({pass:0,fail:1,fatal:String(e.reason)});});
let serial=0;
function cmd(s,type,extra={}){return{id:`browser-${++serial}`,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,...extra};}
async function until(check,timeout=12000){const start=performance.now();while(!check()){if(performance.now()-start>timeout)throw Error('Timeout waiting for browser state');await new Promise(r=>setTimeout(r,30));}}
async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}const li=document.createElement('li');li.textContent=`${results.at(-1).pass?'PASS':'FAIL'} · ${name}${results.at(-1).error?' · '+results.at(-1).error:''}`;document.getElementById('checks').append(li);}
const dbName=DB_NAME+'-browser-verification-'+crypto.randomUUID();
let repo=await MockRepository.open({name:dbName,ownerId:'test-owner'}),s=await repo.read(),last;
async function send(type,extra={}){last=cmd(s,type,extra);const r=await repo.dispatch(last);s=r.state;return r;}
async function act(action){return send('ACTION',{encounterId:s.battle.id,action});}

await check('Real IndexedDB: create and commit exact attack reference',async()=>{
 await send('START');for(const a of ['cleave','basic','basic','basic'])await act(a);
 assert(s.hp===74&&s.ll===38&&s.battle.state==='WON');assert(s.inventory.jadeBlank===1);
});
await check('Reconnect/reload repository preserves terminal result and retry',async()=>{
 repo.close();repo=await MockRepository.open({name:dbName,ownerId:'test-owner'});const before=await repo.read();
 const retry=await repo.dispatch(last);assert(retry.duplicate);assert(JSON.stringify(retry.state)===JSON.stringify(before));s=before;
});
await check('Same command ID with changed payload aborts transaction',async()=>{
 let rejected=false;try{await repo.dispatch({...last,action:'guard'});}catch(e){rejected=e.code==='COMMAND_ID_REUSED';}
 assert(rejected);assert((await repo.read()).revision===s.revision);
});
await check('Repeat win has one entitlement, one jade, no EXP',async()=>{
 await send('REST');await send('START');for(const a of ['cleave','basic','basic','basic'])await act(a);
 assert(s.inventory.jadeBlank===1&&s.rewards.length===1);assert(!('exp'in s)&&!('tuVi'in s));
});
await check('Real transaction abort: full-HP potion leaves inventory and revision',async()=>{
 await send('REST');await send('START');const before=JSON.stringify(s);let rejected=false;
 try{await act('potion');}catch(e){rejected=e.code==='INVALID_ACTION';}assert(rejected);assert(JSON.stringify(await repo.read())===before);
});
await check('Two IDB connections race potion: one commit, one stale, one debit',async()=>{
 await act('basic');await act('basic');const other=await MockRepository.open({name:dbName,ownerId:'test-owner'});
 const extra={encounterId:s.battle.id,action:'potion'};const outcomes=await Promise.allSettled([repo.dispatch(cmd(s,'ACTION',extra)),other.dispatch(cmd(s,'ACTION',extra))]);
 assert(outcomes.filter(r=>r.status==='fulfilled').length===1);assert(outcomes.find(r=>r.status==='rejected').reason.code==='STALE_REVISION');
 s=await repo.read();assert(s.inventory.healingPowder===0&&s.consumptions.length===1&&s.hp===109);other.close();
});
await check('Owner/run isolation and terminal rejection',async()=>{
 await act('retreat');const revision=s.revision;let rejected=false;try{await act('basic');}catch{rejected=true;}assert(rejected);assert((await repo.read()).revision===revision);
 let wrong=false;try{await repo.dispatch({...cmd(s,'REST'),runId:'old-run'});}catch(e){wrong=e.code==='WRONG_SCOPE';}assert(wrong);
 const other=await MockRepository.open({name:dbName,ownerId:'other-owner'});assert((await other.read()).inventory.healingPowder===1);other.close();
});
await check('Storage closed: explicit failure, no fake success',async()=>{
 const closed=await MockRepository.open({name:dbName,ownerId:'closed'});await closed.read();closed.close();let rejected=false;
 try{await closed.read();}catch{rejected=true;}assert(rejected);
});
await check('Actual write failure aborts state and command receipt atomically',async()=>{
 const base=await MockRepository.open({name:dbName,ownerId:'fail-write'});const before=await base.read();
 const failingDb={transaction(...args){const tx=base.db.transaction(...args);return new Proxy(tx,{get(target,key){
  if(key==='objectStore')return (...a)=>{const store=target.objectStore(...a);return new Proxy(store,{get(st,k){if(k==='put')return()=>{throw new DOMException('Simulated storage quota failure','QuotaExceededError');};const v=Reflect.get(st,k,st);return typeof v==='function'?v.bind(st):v;}});};
  const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;
 },set(target,key,value){target[key]=value;return true;}});}};
 const failing=new MockRepository(failingDb,'fail-write');let rejected=false;
 try{await failing.dispatch(cmd(before,'START'));}catch(e){rejected=e.name==='QuotaExceededError';}assert(rejected);
 assert(JSON.stringify(await base.read())===JSON.stringify(before));base.close();
});

// Two independent documents, with separate module globals / database connections.
const peers=[];
async function peerFrame(){const frame=document.createElement('iframe');frame.title='Independent database context';frame.width='320';frame.height='70';
 const ready=new Promise(resolve=>{const f=e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data.ready){window.removeEventListener('message',f);resolve();}};window.addEventListener('message',f);});
 frame.src='worker.html';document.getElementById('frames').append(frame);await ready;peers.push(frame);return frame.contentWindow;}
function rpc(peer,data){const id=crypto.randomUUID();return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{window.removeEventListener('message',handler);reject(Error('RPC timeout'));},10000);function handler(e){if(e.origin!==location.origin||e.source!==peer||e.data.id!==id)return;clearTimeout(timeout);window.removeEventListener('message',handler);resolve(e.data);}window.addEventListener('message',handler);peer.postMessage({id,...data},location.origin);});}
await check('Two independent window contexts: concurrent same-revision START serializes',async()=>{
 const [a,b]=await Promise.all([peerFrame(),peerFrame()]);const name=dbName+'-contexts';const ar=await rpc(a,{kind:'open',name,ownerId:'contexts'});await rpc(b,{kind:'open',name,ownerId:'contexts'});
 const sa=ar.value;const out=await Promise.all([rpc(a,{kind:'dispatch',command:cmd(sa,'START')}),rpc(b,{kind:'dispatch',command:cmd(sa,'START')})]);
 assert(out.filter(r=>r.ok).length===1);assert(out.find(r=>!r.ok).code==='STALE_REVISION');const read=await rpc(b,{kind:'read'});assert(read.value.encounterSequence===1);
});
await check('Two actual browser tabs: one potion consumption under concurrent commands',async()=>{
 async function openTab(){let tab;const ready=new Promise(resolve=>{const handler=e=>{if(e.origin===location.origin&&e.source===tab&&e.data.ready){window.removeEventListener('message',handler);resolve();}};window.addEventListener('message',handler);});tab=window.open('worker.html','_blank');assert(tab,'Browser blocked test tab');await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Tab ready timeout')),10000))]);return tab;}
 const a=await openTab(),b=await openTab();
 try{
  const name=dbName+'-actual-tabs';let opened=await rpc(a,{kind:'open',name,ownerId:'two-tabs'});await rpc(b,{kind:'open',name,ownerId:'two-tabs'});let st=opened.value;
  for(const action of ['START','basic','basic']){const c=action==='START'?cmd(st,'START'):cmd(st,'ACTION',{encounterId:st.battle.id,action});const result=await rpc(a,{kind:'dispatch',command:c});assert(result.ok);st=result.value.state;}
  const extra={encounterId:st.battle.id,action:'potion'};const results=await Promise.all([rpc(a,{kind:'dispatch',command:cmd(st,'ACTION',extra)}),rpc(b,{kind:'dispatch',command:cmd(st,'ACTION',extra)})]);
  assert(results.filter(r=>r.ok).length===1);assert(results.find(r=>!r.ok).code==='STALE_REVISION');
  const read=await rpc(b,{kind:'read'});assert(read.value.inventory.healingPowder===0&&read.value.consumptions.length===1&&read.value.hp===109);
 }finally{a.close();b.close();}
});

let ui,doc;
async function uiReady(){await until(()=>ui.contentDocument?.getElementById('save-status')?.textContent.includes('Đã commit'));doc=ui.contentDocument;}
async function clickAction(action){const before=doc.getElementById('save-status').textContent;const button=doc.querySelector(`button[data-action="${action}"]`);assert(!button.disabled,`Button ${action} disabled`);button.click();await until(()=>doc.getElementById('save-status').textContent!==before&&doc.getElementById('save-status').textContent.includes('Đã commit'));}
await check('UI small viewport: no overflow, clear disabled reason, touch-sized buttons',async()=>{
 ui=document.createElement('iframe');ui.title='320px UI verification';ui.width='320';ui.height='850';ui.src='../';document.getElementById('frames').append(ui);await uiReady();
 assert(doc.documentElement.scrollWidth<=320,`Overflow ${doc.documentElement.scrollWidth}`);assert(!doc.getElementById('start').disabled);
 assert(doc.querySelector('button[data-action="potion"]').disabled);doc.getElementById('reduce-motion').click();
 doc.getElementById('start').click();await until(()=>doc.getElementById('turn-label').textContent.includes('Lượt 1'));
 await until(()=>!doc.querySelector('button[data-action="basic"]').disabled);assert(doc.getElementById('reason-potion').textContent.includes('đầy'));
 for(const b of doc.querySelectorAll('#actions button'))assert(b.getBoundingClientRect().height>=44);
});
await check('UI double-click: one action; cooldown, reload and item debit persist',async()=>{
 const button=doc.querySelector('button[data-action="basic"]');button.click();button.click();await until(()=>doc.getElementById('turn-label').textContent.includes('Lượt 2'));
 assert(doc.getElementById('enemy-hp').textContent.startsWith('84 /'));
 await clickAction('basic');await clickAction('potion');assert(doc.getElementById('inventory').textContent.includes('Tán: 0'));
 const oldDocument=doc;ui.contentWindow.location.reload();await until(()=>ui.contentDocument!==oldDocument);await uiReady();assert(doc.getElementById('player-hp').textContent.startsWith('109 /'));
 assert(doc.getElementById('turn-label').textContent.includes('Lượt 4'));assert(doc.getElementById('inventory').textContent.includes('Tán: 0'));
 await clickAction('retreat');assert(doc.getElementById('result-title').textContent.includes('rút'));
});
await check('UI desktop layout and resume: state stable without input',async()=>{
 ui.width='1000';await new Promise(r=>setTimeout(r,60));assert(doc.documentElement.scrollWidth<=1000);
 assert(doc.getElementById('result-title').textContent.includes('rút'));assert(!doc.getElementById('rest').disabled);
});
await check('UI animation skip does not generate a second action',async()=>{
 doc.getElementById('rest').click();await until(()=>doc.getElementById('player-hp').textContent.startsWith('148 /')&&!doc.getElementById('start').disabled);
 doc.getElementById('start').click();await until(()=>!doc.querySelector('button[data-action="cleave"]').disabled);
 doc.getElementById('reduce-motion').checked=false;doc.getElementById('reduce-motion').dispatchEvent(new Event('change'));
 doc.querySelector('button[data-action="cleave"]').click();await until(()=>doc.getElementById('turn-label').textContent.includes('Lượt 2'));
 if(!doc.getElementById('skip').disabled)doc.getElementById('skip').click();
 await until(()=>!doc.querySelector('button[data-action="basic"]').disabled);assert(doc.getElementById('turn-label').textContent.includes('Lượt 2'));assert(doc.getElementById('enemy-hp').textContent.startsWith('66 /'));
});
const layouts=[];
for(const [width,height] of [[320,568],[360,640],[390,664],[430,740],[1000,800]]){
 await check(`Portrait/desktop HUD ${width}x${height}: circles, no overflow/overlap, controls in reach`,async()=>{
  ui.width=String(width);ui.height=String(height);await new Promise(r=>setTimeout(r,90));ui.contentWindow.scrollTo(0,0);
  const root=doc.documentElement;assert(root.scrollWidth<=root.clientWidth,`Horizontal overflow ${root.scrollWidth}/${root.clientWidth}`);
  const actions=[...doc.querySelectorAll('#actions [data-action]')];assert(actions.length===5);
  for(const button of actions){const r=button.getBoundingClientRect(),style=ui.contentWindow.getComputedStyle(button);assert(r.width>=44&&r.height>=44,`Small target ${r.width}x${r.height}`);assert(Math.abs(r.width-r.height)<1,'Not a circle');assert(parseFloat(style.borderRadius)>=r.width/2);assert(button.getAttribute('aria-label'));assert(button.querySelector('svg'));assert(r.left>=0&&r.right<=root.clientWidth,'Offscreen circle');}
  for(const id of ['potion-slot','retreat-slot']){const r=doc.querySelector(`#${id} button`).getBoundingClientRect();assert(r.height>=44&&r.width>=44);assert(r.width>0);}
  const enemy=doc.getElementById('enemy-hud').getBoundingClientRect(),figures=doc.querySelector('.fighters').getBoundingClientRect(),player=doc.querySelector('.player-hud').getBoundingClientRect(),panel=doc.getElementById('command-panel').getBoundingClientRect();
  assert(enemy.bottom<=figures.top+1,'Enemy HUD covers figures');assert(figures.bottom<=player.top+1,'Figures cover player HUD');assert(player.bottom<=panel.top+1,'Controls cover player HUD');
  if(width<=430)assert(panel.bottom<=height,`Controls too low: ${panel.bottom} > ${height}`);
  layouts.push({width,height,documentWidth:root.clientWidth,controlsBottom:Math.round(panel.bottom),circle:Math.round(actions[0].getBoundingClientRect().width)});
 });
}
await check('Touch/keyboard skill inspector shows disabled skill without issuing a command',async()=>{
 const before=doc.getElementById('save-status').textContent;doc.getElementById('skill-info-toggle').click();assert(!doc.getElementById('skill-info').hidden,'Inspector did not open');
 const select=doc.getElementById('skill-select');select.value='cleave';select.dispatchEvent(new Event('change'));
 assert(doc.getElementById('skill-name').textContent==='Liệt Phong Trảm','Wrong inspected name');assert(doc.getElementById('skill-description').textContent.includes('6 Linh Lực'),'Missing cost description');assert(doc.getElementById('skill-state').textContent.includes('lượt 4'),`Wrong inspector state: ${doc.getElementById('skill-state').textContent}`);
 assert(doc.querySelector('button[data-action="cleave"] .cooldown-tag').textContent==='2','Wrong cooldown badge');assert(doc.querySelector('button[data-action="cleave"]').disabled,'Cooldown action is enabled');
 select.value='potion';select.dispatchEvent(new Event('change'));assert(doc.getElementById('skill-name').textContent==='Hồi Sinh Tán','Potion inspector mismatch');
 doc.getElementById('skill-info').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(doc.getElementById('skill-info').hidden,'Escape did not close inspector');assert(doc.activeElement===doc.getElementById('skill-info-toggle'),`Focus returned to ${doc.activeElement?.id||doc.activeElement?.tagName}`);
 assert(doc.getElementById('save-status').textContent===before,'Inspecting skill changed combat state');
});
await check('All five main actions still dispatch; cooldown and status match the reference',async()=>{
 await clickAction('guard');await clickAction('basic');assert(doc.querySelector('button[data-action="cleave"] .cooldown-tag').hidden);
 await clickAction('retreat');doc.getElementById('rest').click();await until(()=>!doc.getElementById('start').disabled&&doc.getElementById('player-hp').textContent.startsWith('148 /'));
 doc.getElementById('start').click();await until(()=>!doc.querySelector('button[data-action="suppress"]').disabled);
 doc.getElementById('reduce-motion').checked=true;doc.getElementById('reduce-motion').dispatchEvent(new Event('change'));
 await clickAction('suppress');assert(doc.getElementById('enemy-status').textContent.includes('Suy yếu'));
 await clickAction('ward');assert(doc.getElementById('player-hp').textContent.startsWith('136 /'));assert(doc.getElementById('player-ll').textContent.startsWith('26 /'));
 await clickAction('basic');await clickAction('suppress');await clickAction('cleave');
 assert(doc.getElementById('result-title').textContent.includes('Chiến thắng'));assert(doc.getElementById('player-hp').textContent.startsWith('114 /'));
 assert(doc.getElementById('enemy-hud').hidden&&doc.getElementById('command-panel').hidden);assert(doc.getElementById('enemy-hp').textContent==='—');
});
await check('Defeat safe presentation preserves HP0; rest changes resources, not prior result',async()=>{
 const inventoryBefore=doc.getElementById('inventory').textContent;doc.getElementById('rest').click();await until(()=>!doc.getElementById('start').disabled&&doc.getElementById('player-hp').textContent.startsWith('148 /'));
 doc.getElementById('start').click();await until(()=>!doc.querySelector('button[data-action="guard"]').disabled);
 for(let i=0;i<12;i++)await clickAction('guard');
 assert(doc.getElementById('player-hp').textContent.startsWith('0 /'));assert(doc.getElementById('safe-context').textContent.includes('Nghỉ mock'));assert(doc.getElementById('result-title').textContent.includes('Chiến bại'));
 assert(doc.getElementById('enemy-hud').hidden);assert(doc.getElementById('command-panel').hidden);assert(doc.getElementById('start').disabled);
 doc.getElementById('rest').click();await until(()=>!doc.getElementById('start').disabled);assert(doc.getElementById('player-hp').textContent.startsWith('148 /'));assert(doc.getElementById('result-title').textContent.includes('Chiến bại'));assert(doc.getElementById('inventory').textContent===inventoryBefore);
});
await runWorldBrowserChecks({check,assert,until,dbName,rpc});
await runJadeBrowserChecks({check,assert,until,dbName,rpc});
await runModuleBrowserChecks({check,assert,until,dbName,rpc});
await runWavesBrowserChecks({check,assert,until,dbName,rpc});
await runExplorationBrowserChecks({check,assert,until,dbName,rpc});
await check('Resource isolation: loaded page resources are loopback only',async()=>{
 for(const win of [window,...[...document.querySelectorAll('iframe')].map(f=>f.contentWindow),...peers.map(p=>p.contentWindow)].filter(Boolean))for(const entry of win.performance.getEntriesByType('resource'))resources.add(entry.name);
 for(const resource of resources)assert(new URL(resource).origin===location.origin,resource);
 assert([...resources].every(r=>!r.includes('firebase')&&!r.includes('cloudflare')));
});
repo.close();
const pass=results.filter(r=>r.pass).length,fail=results.length-pass;
document.getElementById('summary').textContent=`BROWSER_RESULT ${JSON.stringify({pass,fail,results,layouts,resources:[...resources]})}`;
document.title=`Slice S checks: ${pass} PASS / ${fail} FAIL`;
await postReport({pass,fail,results,layouts,resources:[...resources]});
