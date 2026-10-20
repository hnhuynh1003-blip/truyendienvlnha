const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const rules=require('../js/dudu-transmigration-v69.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'js/dudu-system-app-v69.js'),'utf8');
const companion=fs.readFileSync(path.join(root,'js/companion-ui-v43.js'),'utf8');

test('V69 eight independent player stats are not manufactured from account EXP',()=>{
 assert.equal(rules.version,1);
 assert.deepEqual(rules.attributes.map(x=>x.id),[
  'fortune','luck','agility','strength','appearance','intelligence','stamina','spirit']);
 assert.equal(new Set(rules.attributes.map(x=>x.id)).size,8);
 const state=rules.projection();
 for(const s of rules.attributes)assert.equal(state.stats[s.id],null);
 assert.equal(state.player.level,null);
 assert.equal(state.system.rank,null);
 assert.equal(state.progress.worldsCrossed,null);
 assert.equal(state.rewards.verifiedItems,null);
 assert.equal(rules.canSignPact(),false);
 assert.equal(rules.canEnterWorld(),false);
 assert.equal(rules.canClaimReward(),false);
 assert.equal(rules.canPromoteSystem(),false);
 assert.equal(rules.canIssuePenalty(),false);
 assert.deepEqual(rules.systemRanks,['F','E','D','C','B','A','S']);
});

test('V69 stat gates allow meaningful scenario preview but never authorize client rewards',()=>{
 const q=[{attribute:'luck',min:35},{attribute:'intelligence',min:40}];
 const values={luck:65,intelligence:70};
 const missing=rules.previewConditions(values,q);
 assert.equal(missing.state,'unverified');
 assert.equal(missing.eligible,false);
 const met=rules.previewConditions(values,q,{verified:true});
 assert.equal(met.state,'preview_met');
 assert.equal(met.eligible,false);
 assert.equal(rules.previewConditions({...values,luck:10},q,{verified:true}).state,'preview_unmet');
 assert.equal(rules.previewConditions(values,[{attribute:'systemEXP',min:1}],{verified:true}).state,'invalid');
 assert.equal(rules.previewConditions(values,[{attribute:'luck',min:-5}],{verified:true}).state,'invalid');
 assert.deepEqual(rules.discoveryExamples.map(x=>x.kind),['mission','item','choice','choice']);
 assert.ok(rules.discoveryExamples.every(x=>x.conditions.every(y=>rules.attributes.some(s=>s.id===y.attribute))));
});

test('V69 AU draft is validated but is not an executable punishment or data read',()=>{
 const d=rules.validateAuthorDraft({policyId:'sanctions',disposition:'review',note:'Đợi biên bản'});
 assert.equal(d.status,'local_draft');
 assert.equal(d.enforced,false);
 assert.equal(rules.validateAuthorDraft({policyId:'sanctions',disposition:'ban',note:'Tắt tài khoản'}),null);
 assert.equal(rules.validateAuthorDraft({policyId:'unlisted',disposition:'hold',note:''}),null);
 assert.equal(rules.validateAuthorDraft({policyId:'sanctions',disposition:'hold',note:'z'.repeat(230)}),null);
 assert.equal(rules.authorPolicyFields.length,6);
});

test('V70 shows ONLY card gate until an eligible Sandbox test code is entered',()=>{
 const gate=require('../js/dudu-system-gate-v70.js');
 class El{
  constructor(tag='div',id=''){
   this.tagName=tag.toUpperCase();this.id=id;this.className='';
   this.children=[];this.style={display:'none'};this.hidden=false;
   this.events={};this.value='';this.textContent='';this.disabled=false;
  }
  append(...kids){this.children.push(...kids);}
  replaceChildren(...kids){this.children=[...kids];}
  remove(){this.removed=true;}
  addEventListener(type,cb){(this.events[type]??=[]).push(cb);}
  setAttribute(k,v){this[k]=v;}
  focus(){}
 }
 const ids=['phone-app-system','phone-app-core-console',
  'dudu-v69-system-view','dudu-v69-core-view','dudu-v69-passport-quest',
  'dudu-v69-core-launch'];
 const mounts=new Map(ids.map(id=>[id,new El('div',id)]));
 const saved=new Map(),domEvents=[];
 const session={setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)||null,
  removeItem:k=>saved.delete(k)};
 const doc={readyState:'complete',createElement:t=>new El(t),
  getElementById:id=>mounts.get(id)||null,
  addEventListener:(k,fn)=>domEvents.push([k,fn]),removeEventListener(){}};
 let author=false,uid='reader';let calls=0;
 const win={
  document:doc,DuduTraversalV69:rules,DuduSystemGateV70:gate,
  DuduAuth:{uid:()=>uid,isReady:()=>true,isAdmin:()=>author},
  sessionStorage:session,openPhoneApp:()=>{calls++;},phoneHome:()=>{calls++;}
 };
 const ctx={window:win,IS_SANDBOX_MODE:true,currentUsername:uid,
  canEditStories:()=>author,userProfile:{username:'reader',name:'Mây',level:18,exp:50}};
 vm.runInNewContext(ui,ctx,{filename:'dudu-system-app-v69.js',timeout:2500});
 const app=win.DuduSystemAppsV69;
 const host=mounts.get('dudu-v69-system-view');
 assert.equal(app.isAuthor(),false);
 assert.equal(app.gateState(),'locked');
 assert.equal(app.renderSystem(),true);
 assert.equal(host.children.length,1,'Before a pass, ONLY the gate may mount');
 assert.equal(host.children[0].className,'dudu-v70-gate');
 assert.equal(app.statusPopup(),false,'No stat popup before entering card');
 assert.equal(mounts.get('dudu-v69-core-launch').hidden,true);
 assert.equal(app.renderCore(),false);
 assert.equal(mounts.get('dudu-v69-core-view').children.length,0);
 assert.equal(app.passportQuest(),true);
 assert.equal(mounts.get('dudu-v69-passport-quest').children.length,1);
 assert.equal(gate.admit('DUDU-THU-2026',{sandbox:true,accountId:'sandbox:reader',session}).ok,true);
 assert.equal(app.gateState(),'demo');
 app.renderSystem();
 assert.ok(host.children.length>=4);
 assert.equal(host.children[0].className,'dudu-v70-hero');
 assert.equal(app.statusPopup(),true);
 const popup=mounts.get('phone-app-system').children.at(-1);
 assert.equal(popup.id,'dudu-v69-status-popup');
 assert.equal(popup['aria-modal'],'true');
 assert.equal(app.canSignPact(),false);
 author=true;uid='au';ctx.currentUsername='au';
 assert.equal(app.syncAccess(),true);
 assert.equal(mounts.get('dudu-v69-core-launch').hidden,false);
 assert.equal(app.renderCore(),true);
 assert.equal(mounts.get('dudu-v69-core-view').children.length,3);
 author=false;
 assert.equal(app.syncAccess(),false);
 assert.equal(app.renderCore(),false);
 assert.equal(mounts.get('dudu-v69-core-view').children.length,0);
 assert.equal(app.gateState(),'locked','Another account cannot reuse reader demo pass');
 assert.equal(calls,0,'Read-only rendering never navigates or changes rights');
 assert.ok(html.includes('id="phone-app-system"'));
 assert.ok(html.includes('id="phone-app-core-console"'));
 assert.ok(html.includes("openPhoneApp('system')"));
 assert.ok(html.includes("openPhoneApp('core-console')"));
 assert.ok(html.includes('js/dudu-system-gate-v70.js?v=70-1'));
 assert.ok(html.includes('js/dudu-core-ai-v70.js?v=70-1'));
 assert.doesNotMatch(companion,/dudu-v68-agent-select|DuduAgentV68/);
 assert.doesNotMatch(ui,/db\.collection\(|\.firestore\(|fetch\(|DuduCollectiblesClient\.grant/);
});

test('V70 demo code cannot mint entitlements for a production reader or a different UID',()=>{
 const gate=require('../js/dudu-system-gate-v70.js');
 assert.equal(gate.DEMO_CODE,'DUDU-THU-2026');
 const saved=new Map(),session={setItem:(k,v)=>saved.set(k,v),
  getItem:k=>saved.get(k)||null,removeItem:k=>saved.delete(k)};
 for(const [id,sandbox] of [
  ['firebase:reader',false],['firebase:reader',true],
  ['sandbox:',true],['sandbox:reader',false]
 ]){
  assert.equal(gate.admit(gate.DEMO_CODE,{sandbox,accountId:id,session}).ok,false);
 }
 assert.equal(gate.admit('DUDU-THU-2027',{sandbox:true,accountId:'sandbox:reader',session}).ok,false);
 assert.equal(gate.admit(' dudu-thu-2026 ',{sandbox:true,accountId:'sandbox:reader',session}).ok,true);
 assert.equal(gate.state({sandbox:true,accountId:'sandbox:reader',session}),'demo');
 assert.equal(gate.state({sandbox:false,accountId:'sandbox:reader',session}),'locked');
 assert.equal(gate.state({sandbox:true,accountId:'sandbox:other',session}),'locked');
 assert.equal(gate.revoke({accountId:'sandbox:reader',session}),true);
 assert.equal(gate.state({sandbox:true,accountId:'sandbox:reader',session}),'locked');
 const demo=gate.demoProjection({accountId:'sandbox:reader',name:'Mây'});
 assert.equal(demo.host.name,'Mây');
 assert.match(demo.host.id,/^KC-[0-9A-F]{8}$/);
 assert.match(demo.system.displayId,/^SYS-/);
 assert.notEqual(demo.host.id,demo.system.displayId);
 assert.equal(demo.system.isRegular,null,'Only backend can prove regular vs rogue');
 assert.equal(demo.system.isCounterfeit,null);
 assert.equal(demo.verified,false);
 assert.equal(demo.capabilities.enterWorld,false);
 assert.equal(demo.capabilities.signPact,false);
 assert.equal(demo.capabilities.grantLoot,false);
 assert.equal(demo.stats.length,8);
});
