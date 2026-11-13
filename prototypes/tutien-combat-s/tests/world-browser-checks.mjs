import {MockRepository,createRun} from '../mock-repository.mjs';
import {CLUES} from '../world-core.mjs';
import {OWNER_ID} from '../fixture.mjs';

export async function runWorldBrowserChecks({check,assert,until,dbName,rpc}){
 let serial=0;
 const cmd=(s,type,extra={})=>({id:`m-browser-${++serial}`,ownerId:s.ownerId,runId:s.runId,expectedRevision:s.revision,type,...extra});
 const open=ownerId=>MockRepository.open({name:dbName+'-world',ownerId});
 const send=async(r,type,extra={})=>{const s=await r.read();return(await r.dispatch(cmd(s,type,extra))).state;};
 const move=(r,to)=>send(r,'MOVE',{to});
 const act=async(r,action)=>send(r,'ACTION',{encounterId:(await r.read()).battle.id,action});
 async function observe(r){for(const clue of Object.keys(CLUES))await send(r,'OBSERVE',{clue});}
 async function survey(r){await send(r,'QUEST_ACCEPT');await move(r,'fork');await move(r,'survey');await observe(r);return send(r,'SOLVE_SURVEY',{choice:'LEFT'});}
 async function win(r){for(const a of ['cleave','basic','basic','basic'])await act(r,a);return r.read();}
 async function finish(r,method='OBSERVE'){await move(r,'fog');await send(r,'CROSS_FOG',{method,choice:'LEFT'});return send(r,'MARK_ROUTE');}

 await check('M IndexedDB: combat branch, survey after win, one source, completion without crafting',async()=>{
  const r=await open('m-combat');try{
   await send(r,'QUEST_ACCEPT');await move(r,'fork');await send(r,'START',{purpose:'SOURCE'});await win(r);
   let s=await r.read();assert(s.world.quest==='MATERIAL_SECURED'&&s.inventory.jadeBlank===1);
   await move(r,'fork');await move(r,'survey');await observe(r);await send(r,'SOLVE_SURVEY',{choice:'LEFT'});s=await finish(r);
   assert(s.world.routeMarked&&s.world.craft==='NOT_CRAFTED'&&s.inventory.jadeBlank===1&&s.rewards.length===1);
  }finally{r.close();}
 });
 for(const variant of ['WARD','GUIDE'])await check(`M IndexedDB ${variant}: atomic craft, retry, equip and complete`,async()=>{
  const r=await open(`m-${variant}`);try{
   await survey(r);await move(r,'workshop');const before=await r.read(),c=cmd(before,'CRAFT',{variant});const crafted=await r.dispatch(c);
   assert(crafted.state.inventory.jadeBlank===0&&crafted.state.world.jade.variant===variant);assert((await r.dispatch(c)).duplicate);
   let rejected=false;try{await send(r,'CRAFT',{variant:variant==='WARD'?'GUIDE':'WARD'});}catch(e){rejected=e.code==='ALREADY_CRAFTED';}assert(rejected);
   await send(r,'EQUIP_JADE',{enabled:true});await send(r,'START');let s=await r.read();assert(s.battle.character.defense===(variant==='WARD'?10:8));
   const snap=JSON.stringify(s.battle.character);let blocked=false;try{await send(r,'EQUIP_JADE',{enabled:false});}catch(e){blocked=e.code==='BATTLE_ACTIVE';}assert(blocked);assert(JSON.stringify((await r.read()).battle.character)===snap);
   await act(r,'retreat');s=await finish(r,variant);assert(s.world.quest==='COMPLETE');const jade=JSON.stringify(s.world.jade),items=JSON.stringify(s.inventory);
   await move(r,'fog');await send(r,'CROSS_FOG',{method:variant});await send(r,'MARK_ROUTE');s=await r.read();assert(JSON.stringify(s.world.jade)===jade&&JSON.stringify(s.inventory)===items);assert(s.world.completion.id===`complete-${s.runId}`);
  }finally{r.close();}
 });
 await check('M IndexedDB: reopen each major quest state, wrong choices remain recoverable',async()=>{
  let r=await open('m-stages');async function reopen(stage){r.close();r=await open('m-stages');assert((await r.read()).world.quest===stage);}
  try{
   await reopen('NOT_STARTED');await send(r,'QUEST_ACCEPT');await reopen('SOURCE_OPEN');await move(r,'fork');await move(r,'survey');await observe(r);
   await send(r,'SOLVE_SURVEY',{choice:'RIGHT'});assert((await r.read()).inventory.jadeBlank===0);await send(r,'SOLVE_SURVEY',{choice:'LEFT'});await reopen('MATERIAL_SECURED');
   await move(r,'fog');await reopen('FINAL_ROUTE_OPEN');await send(r,'CROSS_FOG',{method:'OBSERVE',choice:'CENTER'});assert((await r.read()).world.location==='fog');
   await send(r,'CROSS_FOG',{method:'OBSERVE',choice:'LEFT'});const s=await r.read(),c=cmd(s,'MARK_ROUTE');await r.dispatch(c);await reopen('COMPLETE');assert((await r.dispatch(c)).duplicate);
  }finally{r.close();}
 });
 await check('M upgrade from actual IndexedDB v1 preserves original run, battle, commands and jade',async()=>{
  const name=dbName+'-legacy-v1';let old=createRun('old-run','legacy-owner');delete old.world;old.inventory.jadeBlank=1;old.inventory.healingPowder=0;old.revision=7;
  old.commands.old={fingerprint:'old-fingerprint',reply:{revision:7}};old.rewards.push({id:'old-jade-receipt',itemId:'jade-blank',quantity:1,environment:'MOCK_ONLY'});
  const raw=await new Promise((resolve,reject)=>{const req=indexedDB.open(name,1);req.onupgradeneeded=()=>req.result.createObjectStore('mockRuns',{keyPath:'ownerId'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  await new Promise((resolve,reject)=>{const t=raw.transaction('mockRuns','readwrite');t.objectStore('mockRuns').put(old);t.oncomplete=resolve;t.onabort=()=>reject(t.error);});raw.close();
  const r=await MockRepository.open({name,ownerId:'legacy-owner'});try{
   const upgraded=await r.read(),{world,...original}=upgraded;assert(JSON.stringify(original)===JSON.stringify(old),'Legacy fields changed');assert(world.sourceClaimed);
   await survey(r);assert((await r.read()).inventory.jadeBlank===1);assert((await r.read()).rewards.length===1);
  }finally{r.close();}
 });
 await check('M separate trial runs preserve default run byte-for-byte and isolate inventories',async()=>{
  const original=await open('m-trials');let a,b;
  try{
   const before=JSON.stringify(await original.read());const arun=await original.createTrial(),brun=await original.createTrial();
   a=await MockRepository.open({name:dbName+'-world',ownerId:'m-trials',trialRunId:arun});b=await MockRepository.open({name:dbName+'-world',ownerId:'m-trials',trialRunId:brun});
   await survey(a);await move(a,'workshop');await send(a,'CRAFT',{variant:'WARD'});await survey(b);await move(b,'workshop');await send(b,'CRAFT',{variant:'GUIDE'});
   assert((await a.read()).world.jade.variant==='WARD'&&(await b.read()).world.jade.variant==='GUIDE');assert(JSON.stringify(await original.read())===before);assert((await original.listRuns()).length===3);
   a.close();a=await MockRepository.open({name:dbName+'-world',ownerId:'m-trials',trialRunId:arun});assert((await a.read()).world.jade.variant==='WARD');
  }finally{original.close();a?.close();b?.close();}
 });
 await check('M craft write failure rolls back material, jade and command together',async()=>{
  const r=await open('m-quota');try{
   await survey(r);await move(r,'workshop');const before=await r.read();
   const badDb={transaction(...args){const tx=r.db.transaction(...args);return new Proxy(tx,{get(t,k){if(k==='objectStore')return(...a)=>{const st=t.objectStore(...a);return new Proxy(st,{get(o,key){if(key==='put')return()=>{throw new DOMException('Injected quota','QuotaExceededError');};const v=Reflect.get(o,key,o);return typeof v==='function'?v.bind(o):v;}});};const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;},set(t,k,v){t[k]=v;return true;}});}};
   const failing=new MockRepository(badDb,'m-quota');let rejected=false;try{await failing.dispatch(cmd(before,'CRAFT',{variant:'WARD'}));}catch(e){rejected=e.name==='QuotaExceededError';}assert(rejected);assert(JSON.stringify(await r.read())===JSON.stringify(before));
  }finally{r.close();}
 });
 await check('M two actual tabs: one material grant, one craft under competing choices',async()=>{
  const ownerId='m-tab-race',name=dbName+'-world',r=await open(ownerId);const tabs=[];
  async function tab(){let child;const ready=new Promise(resolve=>{const h=e=>{if(e.origin===location.origin&&e.source===child&&e.data.ready){window.removeEventListener('message',h);resolve();}};window.addEventListener('message',h);});child=window.open('worker.html','_blank');assert(child,'Test popup blocked');tabs.push(child);await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Tab timeout')),10000))]);await rpc(child,{kind:'open',name,ownerId});return child;}
  try{
   await send(r,'QUEST_ACCEPT');await move(r,'fork');await move(r,'survey');await observe(r);const [a,b]=[await tab(),await tab()];let s=await r.read();
   let outputs=await Promise.all([rpc(a,{kind:'dispatch',command:cmd(s,'SOLVE_SURVEY',{choice:'LEFT'})}),rpc(b,{kind:'dispatch',command:cmd(s,'SOLVE_SURVEY',{choice:'LEFT'})})]);assert(outputs.filter(x=>x.ok).length===1);assert(outputs.find(x=>!x.ok).code==='STALE_REVISION');
   await move(r,'workshop');s=await r.read();outputs=await Promise.all([rpc(a,{kind:'dispatch',command:cmd(s,'CRAFT',{variant:'WARD'})}),rpc(b,{kind:'dispatch',command:cmd(s,'CRAFT',{variant:'GUIDE'})})]);assert(outputs.filter(x=>x.ok).length===1);assert(outputs.find(x=>!x.ok).code==='STALE_REVISION');
   s=await r.read();assert(s.inventory.jadeBlank===0&&s.rewards.length===1&&s.consumptions.filter(x=>x.itemId==='jade-blank').length===1);assert(!!s.world.jade);
  }finally{r.close();for(const t of tabs)t.close();}
 });

 // UI flows use a fresh trial slot. The pre-existing default run is not reset.
 const ui=document.createElement('iframe');ui.width='320';ui.height='568';ui.title='Slice M mobile mechanics verification';ui.src='../';document.getElementById('frames').append(ui);let doc;
 async function ready(){await until(()=>ui.contentDocument?.getElementById('save-status')?.textContent.includes('Đã commit'));doc=ui.contentDocument;}
 await ready();
 async function click(selector){const button=doc.querySelector(selector);assert(button&&!button.disabled,`Unavailable ${selector}`);const before=doc.getElementById('save-status').textContent;button.click();await until(()=>doc.getElementById('save-status').textContent!==before&&doc.getElementById('save-status').textContent.includes('Đã commit'));assert(doc.getElementById('error').hidden,doc.getElementById('error').textContent);}
 const world=key=>click(`[data-world="${key}"]`),battle=key=>click(`button[data-action="${key}"]`);
 async function trial(){const hash=ui.contentWindow.location.hash;doc.getElementById('run-create').click();await until(()=>ui.contentWindow.location.hash!==hash&&!doc.getElementById('run-create').disabled);doc.getElementById('reduce-motion').checked=true;doc.getElementById('reduce-motion').dispatchEvent(new Event('change'));}
 async function uiSurvey(){await world('accept');await world('move-fork');await world('move-survey');for(const c of Object.keys(CLUES))await world(`observe-${c}`);await world('survey-LEFT');}
 async function reload(){const old=doc;ui.contentWindow.location.reload();await until(()=>ui.contentDocument!==old);await ready();}
 const defaultRepo=await MockRepository.open({ownerId:OWNER_ID});const original=JSON.stringify(await defaultRepo.read());
 await check('M UI combat -> WARD -> equipped wind route -> completion; original run preserved',async()=>{
  await trial();await world('accept');await world('move-fork');await world('fight');for(const a of ['cleave','basic','basic','basic'])await battle(a);
  assert(doc.getElementById('world-stage').dataset.state==='MATERIAL_SECURED');await world('move-workshop');await world('craft-ward');await world('equip');
  await world('move-fog');await world('observe-wind');await world('cross-ward');await world('mark');assert(doc.getElementById('world-stage').dataset.state==='COMPLETE');
  await reload();assert(doc.getElementById('world-stage').dataset.state==='COMPLETE');assert(doc.getElementById('world-gear').textContent.includes('Ngọc Hộ Thân'));
  assert(JSON.stringify(await defaultRepo.read())===original,'Original run changed');
 });
 await check('M UI survey -> GUIDE -> hidden route; double-click craft one jade',async()=>{
  await trial();await uiSurvey();await world('move-workshop');const button=doc.querySelector('[data-world="craft-guide"]'),before=doc.getElementById('save-status').textContent;button.click();button.click();
  await until(()=>doc.getElementById('save-status').textContent!==before&&doc.getElementById('save-status').textContent.includes('Đã commit'));assert(doc.getElementById('world-gear').textContent.includes('Ngọc Dẫn Đường'));
  await world('equip');await world('move-fog');await world('cross-guide');await world('mark');const gear=doc.getElementById('world-gear').textContent;
  await world('move-fog');await world('cross-guide');await world('mark').catch(()=>{});assert(doc.getElementById('world-gear').textContent===gear);
 });
 await check('M UI no-craft completion, wrong choice feedback, small screen no overflow',async()=>{
  await trial();await uiSurvey();await world('move-fog');await world('cross-RIGHT');assert(doc.getElementById('world-feedback').textContent.includes('Chưa')||doc.getElementById('world-feedback').textContent.includes('Chưa'.toLowerCase())||doc.getElementById('world-feedback').textContent.includes('chưa'));
  await world('cross-LEFT');await world('mark');assert(doc.getElementById('world-gear').textContent.includes('Chưa chế ngọc'));assert(doc.getElementById('world-stage').dataset.state==='COMPLETE');
  for(const width of [320,360,390,430,1000]){ui.width=String(width);await new Promise(r=>setTimeout(r,45));assert(doc.documentElement.scrollWidth<=doc.documentElement.clientWidth,`M overflow ${width}`);}
  assert(JSON.stringify(await defaultRepo.read())===original);
 });
 await check('M run switch restores prior WARD/GUIDE trial and default without merging assets',async()=>{
  const options=[...doc.getElementById('run-select').options];const ward=options.find(x=>x.value&&x.value!==new URLSearchParams(ui.contentWindow.location.hash.slice(1)).get('run'));assert(ward);
  doc.getElementById('run-select').value=ward.value;doc.getElementById('run-open').click();await until(()=>new URLSearchParams(ui.contentWindow.location.hash.slice(1)).get('run')===ward.value&&!doc.getElementById('run-open').disabled);
  assert(doc.getElementById('world-gear').textContent.includes('Ngọc'));
  doc.getElementById('run-select').value='';doc.getElementById('run-open').click();await until(()=>!ui.contentWindow.location.hash&&!doc.getElementById('run-open').disabled);assert(JSON.stringify(await defaultRepo.read())===original);
 });
 defaultRepo.close();
}
