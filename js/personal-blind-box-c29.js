/* C2.9 · Vạn Bảo: a real inventory-backed collectible blind box.
 * 1 free opening per UTC day; extra openings cost 20 virtual account Xu.
 * No cash, transfer, combat buffs or public/server-attested RNG.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./item-catalog-v2.js'):root?.DuduItemCatalog,
  node?require('./personal-collection-c24.js'):root?.DuduPersonalCollectionC24,
  node?require('./personal-quest-events-c45.js'):root?.DuduPersonalQuestEventsC45);
 if(node)module.exports=api;
 if(root)root.DuduPersonalBlindBoxC29=api;
})(typeof window!=='undefined'?window:null,function(catalog,collection,questEvents){
 'use strict';
 const META='__duduBlindBoxC29',PRICE=20,MAX_WALLET=1000000000,MAX_ITEMS=500,
  MAX_HISTORY=60,MAX_IDS=96,DUPLICATE_RETURN=4;
 const ranked=catalog.funCollectibles;
 const weights={E:120000,D:50000,C:20000,B:9000,A:1700,S:260,SS:36,SSS:4};
 const POOL=Object.freeze(ranked.map(item=>Object.freeze({itemId:item.id,rank:item.rank,
  weight:weights[item.rank]})));
 const TOTAL=POOL.reduce((sum,x)=>sum+x.weight,0);
 if(TOTAL!==1000000||POOL.length!==19)throw Error('C2.9 pool must remain exactly weighted');
 const validUid=s=>typeof s==='string'&&s.length>0&&s.length<=128;
 const validId=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
 const validDay=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s);
 const validItem=s=>POOL.some(x=>x.itemId===s);
 const finite=(x,min,max,fallback=0)=>Number.isSafeInteger(x)&&x>=min&&x<=max?x:fallback;
 const fail=reason=>Object.assign(new Error(reason),{reason});
 const dayOf=at=>new Date(at).toISOString().slice(0,10);
 function draw(roll){
  if(!Number.isSafeInteger(roll)||roll<0||roll>=TOTAL)return null;
  let sum=0;
  for(const entry of POOL){sum+=entry.weight;if(roll<sum)return entry;}
  return null;
 }
 const fresh=()=>({version:1,lastFreeDay:'',total:0,spent:0,duplicate:0,
  album:[],history:[],ids:[],active:null});
 function norm(raw){
  const s=fresh();
  if(!raw||raw.version!==1||typeof raw!=='object')return s;
  s.lastFreeDay=validDay(raw.lastFreeDay)?raw.lastFreeDay:'';
  s.total=finite(raw.total,0,100000000);
  s.spent=finite(raw.spent,0,MAX_WALLET);
  s.duplicate=finite(raw.duplicate,0,100000000);
  s.album=[...new Set((Array.isArray(raw.album)?raw.album:[]).filter(validItem))];
  s.ids=[...new Set((Array.isArray(raw.ids)?raw.ids:[]).filter(validId))].slice(-MAX_IDS);
  s.history=(Array.isArray(raw.history)?raw.history:[]).filter(row=>
   row&&validId(row.id)&&validItem(row.itemId)&&validDay(row.day)&&
   ['free','paid'].includes(row.mode)&&typeof row.duplicate==='boolean'
  ).slice(-MAX_HISTORY).map(row=>({id:row.id,itemId:row.itemId,
   day:row.day,mode:row.mode,duplicate:row.duplicate}));
  const a=raw.active;
  if(a&&validId(a.id)&&validItem(a.itemId)&&validDay(a.day)&&
   ['free','paid'].includes(a.mode)&&['sealed','claimed'].includes(a.status)){
   s.active={id:a.id,itemId:a.itemId,day:a.day,mode:a.mode,status:a.status,
    duplicate:a.duplicate===true};
  }
  return s;
 }
 async function load({db,auth,uid}={}){
  if(!validUid(uid)||auth?.currentUser?.uid!==uid||!db?.collection)throw fail('invalid-account');
  const user=auth.currentUser,snap=await db.collection('profiles_v2').doc(uid).get();
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  if(!snap.exists)throw fail('profile-missing');
  return {state:norm(snap.data()?.storyStates?.[META]),currency:snap.data().currency};
 }
 async function run({db,auth,uid,kind,id,mode='paid',roll,now=()=>Date.now()}={}){
  if(!validUid(uid)||auth?.currentUser?.uid!==uid||!db?.collection||
   !db?.runTransaction||!validId(id)||!['start','claim'].includes(kind))
   throw fail('invalid-account');
  const at=now();
  if(!Number.isSafeInteger(at)||at<1||at>8640000000000000)throw fail('invalid-time');
  const day=dayOf(at),user=auth.currentUser,ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),states=data.storyStates&&typeof data.storyStates==='object'&&
    !Array.isArray(data.storyStates)?data.storyStates:{},s=norm(states[META]);
   if(!Number.isSafeInteger(data.currency)||data.currency<0||data.currency>MAX_WALLET)
    throw fail('invalid-wallet');
   if(!Array.isArray(data.inventory)||data.inventory.length>MAX_ITEMS)
    throw fail('invalid-inventory');
   let currency=data.currency,inventory=data.inventory,status='applied',reward=null;
   let nextStates=states,questFields={};
   if(kind==='start'){
    if(s.ids.includes(id))status='already-applied';
    else if(s.active?.status==='sealed')throw fail('unfinished-box');
    else if(!['paid','free'].includes(mode)||!draw(roll))throw fail('invalid-draw');
    else if(s.lastFreeDay>day)throw fail('clock-backwards');
    else if(mode==='free'&&s.lastFreeDay===day)throw fail('free-used');
    else if(mode==='paid'&&currency<PRICE)throw fail('not-enough-xu');
    else if(inventory.length>=MAX_ITEMS)throw fail('inventory-full');
    else{
     const prize=draw(roll);
     if(mode==='paid'){
      currency-=PRICE;s.spent=Math.min(MAX_WALLET,s.spent+PRICE);
     }else s.lastFreeDay=day;
     s.total=Math.min(100000000,s.total+1);
     s.ids=[...s.ids,id].slice(-MAX_IDS);
     s.active={id,itemId:prize.itemId,day,mode,status:'sealed',duplicate:false};
     nextStates={...states,[META]:s};
     tx.update(ref,{currency,storyStates:nextStates});
    }
   }else{
    if(!s.active||s.active.id!==id)throw fail('box-not-found');
    if(s.active.status==='claimed')status='already-applied';
    else{
     const approved=catalog.byId(s.active.itemId);
     if(!approved||approved.collectionSet!=='VAN_BAO'||!approved.unique)
      throw fail('invalid-prize');
     const owned=inventory.some(item=>item?.id===approved.id),
      seen=s.album.includes(approved.id);
     if(owned||seen){
      if(currency>MAX_WALLET-DUPLICATE_RETURN)throw fail('wallet-cap');
      currency+=DUPLICATE_RETURN;s.duplicate=Math.min(100000000,s.duplicate+1);
      reward={item:approved,duplicate:true,returned:DUPLICATE_RETURN};
     }else{
      if(inventory.length>=MAX_ITEMS)throw fail('inventory-full');
      const instanceId='fun-box-'+id;
      if(inventory.some(item=>item?.instanceId===instanceId))throw fail('duplicate-instance');
      const item={...approved,instanceId,
       obtainedFrom:{kind:'EVENT',source:'DUDU_FUN_BOX',eventId:id}};
      inventory=[item,...inventory];
      const journal=collection.append(states[collection.META],{
       eventId:instanceId,kind:'FUN',item,at,instanceId,inventory:data.inventory});
      if(!journal.ok)throw fail('journal-failed');
      nextStates={...states,[collection.META]:journal.state};
      s.album.push(approved.id);
      reward={item:approved,duplicate:false,returned:0};
     }
     s.history=[...s.history,{id,itemId:approved.id,day:s.active.day,
      mode:s.active.mode,duplicate:reward.duplicate}].slice(-MAX_HISTORY);
     s.active={...s.active,status:'claimed',duplicate:reward.duplicate};
     nextStates={...nextStates,[META]:s};
     const quest=questEvents.record({...data,storyStates:nextStates},
      {type:'FUN_CLAIM',eventId:id,day,source:'box'});
     const {storyStates:questStates,...fields}=quest.patch;
     questFields=fields;
     nextStates=questStates||nextStates;
     tx.update(ref,{currency,inventory,storyStates:nextStates,...questFields});
    }
   }
   return {kind,status,state:s,currency,inventory,storyStates:nextStates,reward,...questFields};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return result;
 }
 return Object.freeze({META,PRICE,DUPLICATE_RETURN,POOL,TOTAL,draw,norm,load,run});
});
