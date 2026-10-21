const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(base,p),'utf8');
const rules=require('../js/dudu-transmigration-v69.js');
const html=file('index.html'),ui=file('js/dudu-system-app-v69.js');
test('V71 game has eight server-derived stats and no browser-generated passport',()=>{
 assert.equal(rules.attributes.length,8);
 assert.deepEqual(rules.attributes.map(x=>x.id),
  ['fortune','luck','agility','strength','appearance','intelligence','stamina','spirit']);
 assert.equal(rules.canClaimReward(),false);
 assert.equal(rules.canIssuePenalty(),false);
 assert.equal(rules.canSignPact(),false);
 assert.ok(html.includes('js/dudu-system-client-v71.js?v=71-2'));
 assert.ok(!html.includes('js/dudu-system-gate-v70.js'));
 assert.ok(html.includes('id="phone-app-system"'));
 assert.ok(html.includes('✧ Thiên Mệnh'));
 assert.ok(html.includes('aria-label="Mở Thiên Mệnh"'));
 assert.ok(html.includes('class="app-label">Thiên Mệnh</div>'));
 assert.ok(!html.includes('Hệ Thống Xuyên Truyện'));
 assert.ok(html.includes('id="phone-app-core-console"'));
 assert.ok(html.includes('id="dudu-v71-rename-character"'));
 assert.ok(!/DuduAgentV68/.test(file('js/companion-ui-v43.js')));
 assert.ok(!/thiên hướng|chính quy|lậu|private_temperament|originType/i.test(
  ui.slice(ui.indexOf('function dashboard('),ui.indexOf('function renderState('))));
});
test('V71 live client uses Firebase JWT for every System request',async()=>{
 const source=file('js/dudu-system-client-v71.js');
 let calls=[],signed=true;
 const account={uid:'uid-one',getIdToken:async()=> 'AUTH-TOKEN'};
 const root={
  DuduAuth:{isReady:()=>signed,uid:()=>signed?'uid-one':null},
  firebase:{auth:()=>({currentUser:account})},
  DuduAI:{workerBase:'https://dudu-ai-staging.example.workers.dev'}
 };
 const ctx={window:root,AbortSignal,fetch:async(url,opts)=>{
  calls.push({url,opts});return {ok:true,json:async()=>({stage:'locked',authoritative:true})};
 }};
 vm.runInNewContext(source,ctx,{filename:'dudu-system-client-v71.js'});
 const client=root.DuduSystemClientV71;
 const a=await client.me();
 assert.equal(a.ok,true);assert.equal(calls.length,1);
 assert.equal(calls[0].opts.headers.Authorization,'Bearer AUTH-TOKEN');
 assert.ok(calls[0].url.endsWith('/v1/system/me'));
 await client.redeem('DT-FAKE');
 assert.equal(JSON.parse(calls[1].opts.body).code,'DT-FAKE');
 signed=false;
 const b=await client.me();
 assert.equal(b.ok,false);
 assert.equal(calls.length,2,'unsigned user cannot call System');
 assert.ok(!/localStorage|sessionStorage|DuduSystemGateV70/.test(source));
});
test('V71 read-only player page stays on pass gate until authenticated server says assigned',async()=>{
 class E{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;
   this.children=[];this.events={};this.style={display:'none'};
   this.textContent='';this.className='';this.hidden=false;}
  append(...v){this.children.push(...v);}
  replaceChildren(...v){this.children=[...v];}
  remove(){this.removed=true;}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
  setAttribute(k,v){this[k]=v;}
  focus(){}
 }
 const mounts=new Map(['phone-app-system','phone-app-core-console',
 'dudu-v69-system-view','dudu-v69-core-view','dudu-v69-passport-quest',
 'dudu-v69-core-launch'].map(id=>[id,new E('div',id)]));
 const document={readyState:'complete',createElement:tag=>new E(tag),
  getElementById:id=>mounts.get(id)||null,addEventListener(){},removeEventListener(){}};
 let payload={stage:'locked',authoritative:true},owner='reader',admin=false,online=true;
 const window={
  document,DuduTraversalV69:rules,
  DuduAuth:{uid:()=>owner,isReady:()=>true,isAdmin:()=>admin},
  DuduSystemClientV71:{
   me:async()=>online?{ok:true,data:payload}:{ok:false,error:'Registry unavailable'},
   redeem:async()=>({ok:false,error:'No valid card'}),
   registerName:async()=>({ok:false}),acceptPact:async()=>({ok:false}),
   issueOwnerTestPass:async()=>({ok:false})
  }
 };
 const env={window,document,canEditStories:()=>admin};
 vm.runInNewContext(ui,env,{filename:'dudu-system-app-v69.js',timeout:1200});
 const api=window.DuduSystemAppsV69;
 assert.equal(api.isAuthor(),false);
 assert.equal(api.renderCore(),false);
 await api.renderSystem();
 const view=mounts.get('dudu-v69-system-view');
 assert.equal(view.children.length,1);
 assert.equal(view.children[0].className,'dudu-v71-lock');
 assert.equal(api.statusPopup(),false);
 online=false;
 await api.renderSystem();
 assert.ok(view.children[0].className.includes('dudu-v71-lock')&&
  view.children[0].className.includes('dudu-v71-unavailable'),
  'unavailable gate must preserve its System layout and block redemption');
 assert.ok(!view.children[0].children.some(x=>x.tagName==='FORM'),
  'offline screen must never ask for a code that cannot be verified');
 online=true;
 payload={stage:'awaiting-name-or-pact',authoritative:true,
  host:{id:'KC-ABAB',name:null,level:1,exp:0,stats:{}},
  system:{id:'DUDU-02',name:'DUDU 02',rank:'F',level:1,exp:0},
  pact:{status:'pending'},progress:{worlds:0,missions:0,achievements:0,items:0,rewards:0}};
 await api.renderSystem();
 assert.equal(view.children.length,1);
 assert.equal(view.children[0].className,'dudu-v71-name-step');
 assert.equal(api.statusPopup(),false);
 payload.host.name='Ký chủ Trúc';
 await api.renderSystem();
 assert.equal(view.children[0].className,'dudu-v71-hero');
 assert.equal(api.statusPopup(),true);
 assert.equal(api.canGrantReward(),false);
 admin=true;assert.equal(api.isAuthor(),true);
 assert.equal(api.renderCore(),true);
 assert.ok(!ui.includes('TẠO THẺ THỬ MÁY CHỦ'),
  'CORE does not issue pilot passports without explicit confirmation');
 owner=null;admin=false;api.syncAccess();
 await api.renderSystem();
 assert.ok(view.children[0].className.includes('dudu-v71-unavailable'));
 assert.ok(!view.children[0].children.some(x=>x.tagName==='FORM'),
  'unauthenticated users cannot redeem a real pass');
 owner='other';api.syncAccess();
 assert.equal(api.isAuthor(),false);
 assert.equal(api.renderCore(),false);
 assert.ok(!/\.firestore\(|db\.collection|DuduCollectiblesClient\.grant/.test(ui));
});
