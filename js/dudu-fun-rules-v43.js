/* V43.5.4 — DUDU FUN Sandbox-only game rules.
 * Chance-based daily mini-games cost 0 Xu; no cash or purchasable tickets.
 * Begin persists a precommitted prize BEFORE any reveal; retry never rerolls.
 * Pure plans must be saved atomically with awarded Xu/items by the caller.
 * This client-only ledger NEVER proves a real collectible or wallet balance.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
  require('./economy-core-v43.js'):root?.DuduEconomyCoreV43,
  typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduFunRulesV43=api;
})(typeof window!=='undefined'?window:null,function(economy,catalog){
 'use strict';
 const VERSION=1,TYPE_BOX='box',TYPE_TICKET='ticket';
 const BOX_THEMES=Object.freeze(['star','moon','flower']);
 const SYMBOLS=Object.freeze(['⭐','🌙','🌸','💎']);
 const BOX_POOL=Object.freeze([
  Object.freeze({chance:0.50,kind:'COIN',amount:5,label:'5 Xu'}),
  Object.freeze({chance:0.25,kind:'COIN',amount:9,label:'9 Xu'}),
  Object.freeze({chance:0.15,kind:'ITEM',itemId:'common-biscuit',label:'Bánh Quy'}),
  Object.freeze({chance:0.10,kind:'ITEM',itemId:'e2',label:'Đồ Uống'})
 ]);
 const TICKET_POOL=Object.freeze([
  Object.freeze({chance:0.50,kind:'COIN',amount:3,label:'Giải thường · 3 Xu'}),
  Object.freeze({chance:0.30,kind:'COIN',amount:6,label:'Giải may mắn · 6 Xu'}),
  Object.freeze({chance:0.15,kind:'COIN',amount:10,label:'Giải khá · 10 Xu'}),
  Object.freeze({chance:0.04,kind:'COIN',amount:20,label:'Giải lớn · 20 Xu'}),
  Object.freeze({chance:0.01,kind:'COIN',amount:40,label:'Giải đặc biệt · 40 Xu'})
 ]);
 const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const validDay=(d)=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
   Number.isFinite(Date.parse(d+'T00:00:00Z'))&&
   new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 const validType=t=>t===TYPE_BOX||t===TYPE_TICKET;
 function normalizedReward(value,type){
   if(!value||typeof value!=='object')return null;
   const pool=type===TYPE_BOX?BOX_POOL:TICKET_POOL;
   const matching=pool.find(p=>p.kind===value.kind&&
     (p.kind==='COIN'?p.amount===value.amount:p.itemId===value.itemId));
   return matching?Object.freeze({...matching}):null;
 }
 function normalizeRound(value,type,day){
   if(!value||typeof value!=='object'||value.type!==type||value.day!==day||
      !['playing','ready','claimed'].includes(value.status)||
      !Number.isSafeInteger(value.seed)||value.seed<0||value.seed>1000000||
      !normalizedReward(value.reward,type))return null;
   const count=type===TYPE_BOX?3:9;
   const cells=Array.isArray(value.cells)?
    [...new Set(value.cells.filter(x=>Number.isSafeInteger(x)&&x>=0&&x<count))].slice(0,3):[];
   const phase=type===TYPE_BOX?
     Math.max(0,Math.min(3,Number.isInteger(value.step)?value.step:0)):
     cells.length;
   // V44.9: a saved READY or CLAIMED state must contain proof that the
   // minigame's required three inputs were actually completed.
   if(value.status!=='playing'&&phase!==3)return null;
   if(value.status==='playing'&&phase===3)return null;
   return {type,day,status:value.status,seed:value.seed,
     theme:BOX_THEMES.includes(value.theme)?value.theme:'star',
     step:type===TYPE_BOX?phase:0,cells:type===TYPE_TICKET?cells:[],
     reward:normalizedReward(value.reward,type)};
 }
 function norm(raw,day=economy.localDay()){
   const state={version:VERSION,day,rounds:{box:null,ticket:null},history:[]};
   if(!validDay(day)||!raw||typeof raw!=='object'||raw.version!==VERSION)return state;
   if(Array.isArray(raw.history)){
     const seen=new Set();
     state.history=raw.history.filter(x=>{
       if(!x||!validType(x.type)||!validDay(x.day)||x.day>day||
          !normalizedReward(x.reward,x.type))return false;
       const key=x.day+':'+x.type;
       if(seen.has(key))return false;
       seen.add(key);return true;
     }).slice(-30).map(x=>({day:x.day,type:x.type,
       reward:normalizedReward(x.reward,x.type)}));
   }
   if(raw.day===day&&raw.rounds&&typeof raw.rounds==='object'){
     for(const type of [TYPE_BOX,TYPE_TICKET])
       state.rounds[type]=normalizeRound(raw.rounds[type],type,day);
   }
   return state;
 }
 function pick(pool,roll){
   if(!Number.isFinite(roll)||roll<0||roll>=1)return null;
   let cumulative=0;
   for(const choice of pool){
     cumulative+=choice.chance;
     if(roll<cumulative+Number.EPSILON)return {...choice};
   }
   return {...pool[pool.length-1]};
 }
 function begin(raw,{type,theme='star',day=economy.localDay(),
   roll,seed}={}){
   const state=norm(raw,day);
   if(!validDay(day)||!validType(type)||
      !BOX_THEMES.includes(theme)||!Number.isSafeInteger(seed)||
      seed<0||seed>1000000||!Number.isFinite(roll)||roll<0||roll>=1)
     return {ok:false,reason:'invalid-input',state};
   if(raw?.version===VERSION&&validDay(raw.day)&&raw.day>day)
     return {ok:false,reason:'clock-backwards',state};
   if(state.rounds[type])return {ok:false,reason:'already-started',state};
   // V44.8: claim history is a second replay barrier if a saved round
   // disappears while a prior same-day prize receipt remains.
   if(state.history.some(x=>x.day===day&&x.type===type))
     return {ok:false,reason:'already-claimed',state};
   const reward=pick(type===TYPE_BOX?BOX_POOL:TICKET_POOL,roll);
   if(!reward)return {ok:false,reason:'invalid-roll',state};
   const round={type,day,status:'playing',seed,theme,
     step:0,cells:[],reward};
   return {ok:true,round,state:{...state,rounds:{...state.rounds,[type]:round}}};
 }
 function sequence(seed){
   if(!Number.isSafeInteger(seed)||seed<0)return [];
   return [seed%4,Math.floor(seed/4)%4,Math.floor(seed/16)%4];
 }
 function advance(raw,{type,choice,day=economy.localDay()}={}){
   const state=norm(raw,day),round=state.rounds[type];
   if(!validType(type)||!round||round.status!=='playing')
     return {ok:false,reason:'not-playing',state};
   let update;
   if(type===TYPE_BOX){
     if(!Number.isInteger(choice)||choice<0||choice>=SYMBOLS.length)
       return {ok:false,reason:'invalid-choice',state};
     const correct=sequence(round.seed)[round.step]===choice;
     const step=correct?round.step+1:0;
     update={...round,step,status:step===3?'ready':'playing'};
   }else{
     if(!Number.isInteger(choice)||choice<0||choice>=9||round.cells.includes(choice))
       return {ok:false,reason:'invalid-choice',state};
     const cells=[...round.cells,choice];
     update={...round,cells,status:cells.length>=3?'ready':'playing'};
   }
   return {ok:true,correct:type===TYPE_BOX?update.step>0:true,
     round:update,state:{...state,rounds:{...state.rounds,[type]:update}}};
 }
 function claim(raw,{type,day=economy.localDay(),coins=0,inventory=[]}={}){
   const state=norm(raw,day),round=state.rounds[type];
   if(!validType(type)||!round||round.status!=='ready')
     return {ok:false,reason:'not-ready-or-claimed',state};
   if(raw?.version===VERSION&&validDay(raw.day)&&raw.day>day)
     return {ok:false,reason:'clock-backwards',state};
   if(state.history.some(x=>x.day===day&&x.type===type))
     return {ok:false,reason:'already-claimed',state};
   if(!Number.isSafeInteger(coins)||coins<0||coins>1e9||
      !Array.isArray(inventory))return {ok:false,reason:'invalid-balance',state};
   const prize=round.reward;
   let newCoins=coins,newInventory=inventory;
   if(prize.kind==='COIN'){
     if(coins+prize.amount>1e9)return {ok:false,reason:'wallet-cap',state};
     newCoins+=prize.amount;
   }else{
     if(inventory.length>=500)return {ok:false,reason:'inventory-full',state};
     const approved=catalog.byId(prize.itemId);
     if(!approved||approved.scope!=='COMMON'||approved.giftable!==true||
       approved.unique===true)return {ok:false,reason:'invalid-item',state};
     const instanceId='fun-'+type+'-'+day;
     if(inventory.some(item=>item?.instanceId===instanceId))
       return {ok:false,reason:'duplicate-instance',state};
     newInventory=[{...approved,instanceId,
       obtainedFrom:{kind:'EVENT',source:'DUDU_FUN',eventId:type+'-'+day}},
       ...inventory];
   }
   const update={...round,status:'claimed'};
   const history=[...state.history,{day,type,reward:prize}].slice(-30);
   return {ok:true,reward:prize,coins:newCoins,inventory:newInventory,
     state:{...state,rounds:{...state.rounds,[type]:update},history}};
 }
 function progress(raw,day=economy.localDay()){
   const s=norm(raw,day);
   const done=[TYPE_BOX,TYPE_TICKET].filter(t=>s.rounds[t]?.status==='claimed').length;
   return {done,total:2,box:s.rounds.box?.status||'available',
     ticket:s.rounds.ticket?.status||'available'};
 }
 return Object.freeze({VERSION,TYPE_BOX,TYPE_TICKET,BOX_THEMES,SYMBOLS,
  BOX_POOL,TICKET_POOL,norm,pick,begin,sequence,advance,claim,progress});
});
