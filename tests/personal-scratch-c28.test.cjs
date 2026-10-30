'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const lucky=require('../js/personal-scratch-c28.js');
const funRules=require('../js/dudu-fun-rules-v43.js');
const liveFun=require('../js/personal-fun-c25.js');
const copy=x=>structuredClone(x);
const AT=Date.UTC(2026,9,30,10,0);
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function env(initial=100000){
 const accounts=new Map([['alice',{currency:initial,storyStates:{},inventory:[]}],
  ['bob',{currency:250,storyStates:{},inventory:[]}]]);
 const auth={currentUser:{uid:'alice'}};let writes=0;
 const db={collection(collection){
  assert.equal(collection,'profiles_v2');
  return {doc(uid){return{uid,async get(){return{
   exists:accounts.has(uid),data:()=>copy(accounts.get(uid))
  };}};}};
 },
  async runTransaction(fn){
   const patches=[];const tx={async get(ref){return{exists:accounts.has(ref.uid),
    data:()=>copy(accounts.get(ref.uid))};},update(ref,patch){patches.push([ref.uid,copy(patch)]);}};
   const result=await fn(tx);
   for(const [uid,patch] of patches){Object.assign(accounts.get(uid),patch);writes++;}
   return result;
  }};
 const run=(kind,n,opts={})=>lucky.run({db,auth,uid:'alice',kind,id:id(n),now:()=>AT,...opts});
 return{accounts,auth,db,run,get writes(){return writes;}};
}
async function finish(run,n){
 await run('reveal',n);
 return run('claim',n);
}

test('C2.8 scratch card pool has 13 tiers, 10-Xu cost, exact fair odds and 10,000-Xu top',()=>{
 assert.equal(lucky.PRICE,10);
 assert.equal(lucky.PRIZES.length,13);
 assert.equal(lucky.PRIZES.reduce((sum,row)=>sum+row.weight,0),1000000);
 assert.equal(lucky.PRIZES.reduce((sum,row)=>sum+row.weight*row.amount,0)/1000000,8.43);
 assert.equal(lucky.PRIZES.at(-1).amount,10000);
 assert.equal(lucky.PRIZES.at(-1).weight,1);
 assert.equal(lucky.draw(0).amount,0);
 assert.equal(lucky.draw(29389).amount,2);
 assert.equal(lucky.draw(999999).amount,10000);
 assert.equal(lucky.draw(-1),null);assert.equal(lucky.draw(1000000),null);
});

test('Ticket purchase, reveal and jackpot claim update real virtual account wallet exactly once',async()=>{
 const e=env(150);
 const purchased=await e.run('buy',1,{theme:'dragon',roll:999999,seed:12});
 assert.equal(purchased.status,'applied');
 assert.equal(e.accounts.get('alice').currency,140);
 assert.equal(purchased.state.active.amount,10000);
 assert.equal(purchased.state.total,1);
 assert.equal(purchased.state.album.dragon,1);
 assert.equal(purchased.state.active.layout,'numbers');
 const layout=lucky.cardNumbers(12,10000);
 assert.equal(layout.tiles.length,10);
 assert.equal(layout.tiles.filter(x=>x.match).length,1);
 assert.equal(layout.tiles.find(x=>x.match).prize,10000);
 await assert.rejects(e.run('scratch',1,{cell:0}),x=>x.reason==='invalid-layout');
 const ready=await e.run('reveal',1);assert.equal(ready.state.active.status,'ready');
 assert.equal(ready.state.active.cells.length,10);
 const before=e.writes;
 assert.equal((await e.run('reveal',1)).status,'already-applied');
 assert.equal(e.writes,before);
 const won=await e.run('claim',1);
 assert.equal(won.reward.amount,10000);assert.equal(won.currency,10140);
 assert.equal(won.state.prizes.includes(10000),true);
 assert.equal(won.state.history.length,1);
 const committed=e.writes;
 assert.equal((await e.run('claim',1)).status,'already-applied');
 assert.equal(e.writes,committed);
 assert.equal(e.accounts.get('alice').currency,10140);
 assert.equal(e.accounts.get('bob').currency,250);
 assert.equal('realMoney' in won,false);
});

test('Unlimited sequential tickets preserve a bounded receipt ledger (legacy design counts remain inert)',async()=>{
 const e=env(50000);
 for(let n=1;n<=110;n++){
  const theme=lucky.THEMES[(n-1)%lucky.THEMES.length].id;
  const purchased=await e.run('buy',n,{theme,roll:29389,seed:n});
  assert.equal(purchased.status,'applied');
  const claimed=await finish(e.run,n);
  assert.equal(claimed.reward.amount,2);
 }
 const state=lucky.norm(e.accounts.get('alice').storyStates[lucky.META]);
 assert.equal(state.total,110);
 assert.equal(state.spent,1100);
 assert.equal(state.won,220);
 assert.equal(e.accounts.get('alice').currency,49120);
 assert.equal(state.history.length,48);
 assert.equal(state.buyIds.length,96);
 assert.equal(Object.values(state.album).reduce((a,b)=>a+b,0),110);
 assert.equal(Object.keys(state.album).length,8);
 const dup=await e.run('buy',110,{theme:'gold',roll:999999,seed:99});
 assert.equal(dup.status,'already-applied');
 assert.equal(e.accounts.get('alice').currency,49120);
});

test('Purchase refuses insufficient Xu, a second active ticket, invalid roll and wrong account',async()=>{
 const e=env(15);
 await assert.rejects(e.run('buy',1,{theme:'dragon',roll:1000000,seed:0}),x=>x.reason==='invalid-draw');
 await e.run('buy',1,{theme:'dragon',roll:0,seed:0});
 assert.equal(e.accounts.get('alice').currency,5);
 await assert.rejects(e.run('buy',2,{theme:'dragon',roll:1,seed:1}),x=>x.reason==='unfinished-ticket');
 await finish(e.run,1);
 await assert.rejects(e.run('buy',2,{theme:'dragon',roll:1,seed:1}),x=>x.reason==='not-enough-xu');
 e.auth.currentUser={uid:'bob'};
 await assert.rejects(e.run('buy',3,{theme:'dragon',roll:1,seed:1}),x=>x.reason==='invalid-account');
 assert.equal(e.accounts.get('bob').currency,250);
});

test('At full wallet, unpaid jackpot stays redeemable; no award or loss on a failed claim',async()=>{
 const e=env(1000000000);
 await e.run('buy',1,{theme:'gold',roll:999999,seed:25});
 await e.run('reveal',1);
 const before=e.writes;
 await assert.rejects(e.run('claim',1),x=>x.reason==='wallet-cap');
 assert.equal(e.writes,before);
 assert.equal(e.accounts.get('alice').storyStates[lucky.META].active.status,'ready');
 e.accounts.get('alice').currency=1000000000-20000;
 const reward=await e.run('claim',1);
 assert.equal(reward.currency,1000000000-10000);
});

test('C2.9 UI/main integration uses dedicated UID transaction bridge and numbered scratch surface',()=>{
 const html=readFileSync(join(__dirname,'../index.html'),'utf8');
 const ui=readFileSync(join(__dirname,'../js/dudu-fun-ui-v43.js'),'utf8');
 const css=readFileSync(join(__dirname,'../css/dudu-fun-v43.css'),'utf8');
 assert.match(html,/personal-scratch-c28\.js\?v=c29-numbers-1/);
 assert.match(html,/DuduScratchLiveBridgeC28=Object\.freeze/);
 assert.match(html,/DuduPersonalScratchC28\.run/);
 assert.match(html,/Promise\.allSettled\(\[\.\.\.pendingLiveProfileWrites\]\)/);
 assert.match(ui,/if\(!sandbox\(\)\)\{numberLottery\(rootNode\);return;\}/);
 assert.match(ui,/luckyAction\('buy'\)/);
 assert.match(ui,/luckyAction\('reveal'\)/);
 assert.match(ui,/luckyAction\('claim'\)/);
 assert.match(css,/lucky-number-grid/);
 assert.match(css,/lucky-number-cell\.matched/);
 assert.doesNotMatch(ui,/Không bán vé hoặc đổi tiền thật\./);
});

test('Main UI offers priced numbered scratch tickets without a collection shelf',async()=>{
 class Node{
  constructor(tag){this.tag=tag;this.className='';this.textContent='';this.style={};this.dataset={};
   this.children=[];this.listeners={};this.hidden=false;this.disabled=false;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  addEventListener(name,fn){this.listeners[name]=fn;}
  setAttribute(name,value){this[name]=value;}
 }
 const host=new Node('div'),launch=new Node('button');
 const doc={getElementById:id=>id==='dudu-fun-content-v43'?host:
  id==='dudu-fun-launch-v43'?launch:null,createElement:tag=>new Node(tag)};
 const window={DuduFunRulesV43:funRules,DuduPersonalFunC25:liveFun,
  DuduPersonalScratchC28:lucky,
  DuduAuth:{uid:()=> 'alice',isReady:()=>true},
  DuduFunLiveBridgeC25:{uid:()=> 'alice',ready:()=>true,
   load:async()=>({state:funRules.norm(null,'2026-10-30')})},
  DuduScratchLiveBridgeC28:{uid:()=> 'alice',ready:()=>true,
   load:async()=>({state:lucky.norm(null),currency:100})}};
 const source=readFileSync(join(__dirname,'../js/dudu-fun-ui-v43.js'),'utf8');
 vm.runInNewContext(source,{window,document:doc,userProfile:{currency:100},currentUsername:'alice',console});
 const flatten=root=>[root,...root.children.flatMap(flatten)];
 window.DuduFunUIV43.render();
 await new Promise(done=>setImmediate(done));
 const tab=flatten(host).find(n=>n.className.includes('dudu-fun-tab')&&n.textContent.includes('Vé Số'));
 assert.ok(tab);tab.listeners.click();
 await new Promise(done=>setImmediate(done));
 const nodes=flatten(host);
 const shelf=nodes.find(n=>n.className==='lucky-theme-grid');
 assert.equal(shelf,undefined);
 assert.ok(nodes.some(n=>n.className.includes('lucky-buy')&&n.disabled===false));
 assert.ok(nodes.some(n=>n.className==='lucky-odds'));
 assert.ok(nodes.some(n=>n.textContent.includes('10.000 Xu')));
});

test('Number cards cannot present a false matching number after an unlucky roll',()=>{
 for(const amount of [0,2,5,20,10000])for(const seed of [0,1,7,100,999999]){
  const card=lucky.cardNumbers(seed,amount);
  assert.equal(card.tiles.length,10);
  assert.equal(card.gifts.length,5);
  assert.equal(card.tiles.filter(x=>x.match).length+
   card.gifts.filter(x=>x>0).length,amount?1:0);
  assert.equal(new Set(card.tiles.map(x=>x.number)).size,10);
  if(amount)assert.equal((card.tiles.find(x=>x.match)?.prize||0)+
   card.gifts.reduce((sum,n)=>sum+n,0),amount);
 }
});
