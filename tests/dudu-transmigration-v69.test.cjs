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

test('V69 separate phone apps deny reader Core, show status popup, preserve DUDU companion',()=>{
 class El {
  constructor(tag='div',id=''){
   this.tagName=tag.toUpperCase();this.id=id;this.children=[];
   this.style={display:'none'};this.hidden=false;this.dataset={};
   this.events={};this.value='';this.textContent='';
   this.maxLength=0;this.disabled=false;
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  remove(){this.removed=true;}
  addEventListener(type,listener){(this.events[type]??=[]).push(listener);}
  setAttribute(k,v){this[k]=v;}
  focus(){}
 }
 const mounts=new Map(['phone-app-system','phone-app-core-console',
  'dudu-v69-system-view','dudu-v69-core-view','dudu-v69-passport-quest',
  'dudu-v69-core-launch'].map(id=>[id,new El('div',id)]));
 const events=[],saved=new Map();
 const document={
  readyState:'complete',
  createElement:t=>new El(t),
  getElementById:id=>mounts.get(id)||null,
  addEventListener:(k,fn)=>events.push({k,fn}),
  removeEventListener(){}
 };
 let editor=false,authUid='reader',username='reader',calls=0;
 const win={
  document,DuduTraversalV69:rules,
  DuduAuth:{uid:()=>authUid,isReady:()=>true,isAdmin:()=>editor},
  localStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)||null},
  openPhoneApp:()=>{calls++;},phoneHome:()=>{calls++;}
 };
 const ctx={window:win,document,IS_SANDBOX_MODE:false,
  currentUsername:username,canEditStories:()=>editor,
  userProfile:{level:18,exp:20},localStorage:win.localStorage};
 vm.runInNewContext(ui,ctx,{filename:'dudu-system-app-v69.js',timeout:2000});
 const api=win.DuduSystemAppsV69;
 assert.equal(api.isAuthor(),false);
 assert.equal(mounts.get('dudu-v69-core-launch').hidden,true);
 assert.equal(api.renderCore(),false);
 assert.equal(saved.size,0);
 assert.equal(api.renderSystem(),true);
 assert.ok(mounts.get('dudu-v69-system-view').children.length>=5);
 assert.equal(api.passportQuest(),true);
 assert.equal(mounts.get('dudu-v69-passport-quest').children.length,1);
 api.statusPopup();
 const popup=mounts.get('phone-app-system').children.at(-1);
 assert.equal(popup.id,'dudu-v69-status-popup');
 assert.equal(popup['aria-modal'],'true');
 assert.equal(win.DuduSystemAppsV69.canSignPact(),false);
 editor=true;authUid='author';ctx.currentUsername='author';
 assert.equal(api.syncAccess(),true);
 assert.equal(mounts.get('dudu-v69-core-launch').hidden,false);
 assert.equal(api.renderCore(),true);
 assert.ok(mounts.get('dudu-v69-core-view').children.length>=5);
 editor=false;
 assert.equal(api.syncAccess(),false);
 assert.equal(api.renderCore(),false);
 assert.equal(saved.size,0);
 assert.equal(calls,0);
 assert.equal(html.includes('id="phone-app-system"'),true);
 assert.equal(html.includes('id="phone-app-core-console"'),true);
 assert.equal(html.includes("openPhoneApp('system')"),true);
 assert.equal(html.includes("openPhoneApp('core-console')"),true);
 assert.equal(html.includes('dudu-v69-passport-quest'),true);
 assert.equal(html.includes('js/dudu-agent-v68.js'),false,'Old role switch must not load in Messenger');
 assert.equal(/dudu-v68-agent-select|DuduAgentV68/.test(companion),false);
 assert.match(html,/appName==='core-console'.*DuduSystemAppsV69/s);
 assert.doesNotMatch(ui,/db\.collection\(|\.firestore\(|fetch\(|DuduCollectiblesClient\.grant/);
});
