/* CASINO-SLOT1 — personal Xu transaction engine, PREPARED BUT DISABLED.
 * No public entry point calls this until Du approves wager and payout rules.
 * Browser-supplied spins are personal-play RNG, NOT server-attested randomness.
 * This is not a verified economy ledger or a Firebase Rules deployment.
 */
(function(root,factory){
 'use strict';
 const design=typeof module==='object'&&module.exports?
  require('./dudu-casino-design-v1.js'):root?.DuduCasinoDesignV1;
 const api=factory(design);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduCasinoSlotReceiptV1=api;
})(typeof window!=='undefined'?window:null,function(design){
 'use strict';
 const META='__duduCasinoSlotV1',VERSION=1,MAX_WALLET=1000000000;
 const MAX_IDS=96,MAX_HISTORY=48;
 const validUid=uid=>typeof uid==='string'&&uid.length>0&&uid.length<=128;
 const validId=id=>typeof id==='string'&&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
 const validWallet=v=>Number.isSafeInteger(v)&&v>=0&&v<=MAX_WALLET;
 const fail=reason=>Object.assign(new Error(reason),{reason});
 const fresh=()=>({version:VERSION,ids:[],history:[],active:null});
 function validActive(a){
  if(!a||!validId(a.id)||!design.BETS.includes(a.bet)||
   !['spinning','claimed'].includes(a.status)||!Array.isArray(a.rows))return false;
  const quote=design.slotQuote({bet:a.bet,rows:a.rows});
  return quote.ok&&a.payout===quote.payout;
 }
 function norm(raw){
  if(raw==null)return fresh();
  if(raw?.version!==VERSION||typeof raw!=='object'||Array.isArray(raw))
   throw fail('invalid-slot-ledger');
  const s=fresh();
  s.ids=[...new Set((Array.isArray(raw.ids)?raw.ids:[]).filter(validId))].slice(-MAX_IDS);
  s.history=(Array.isArray(raw.history)?raw.history:[]).filter(h=>h&&validId(h.id)&&
   design.BETS.includes(h.bet)&&Number.isSafeInteger(h.payout)&&h.payout>=0&&
   h.payout<=MAX_WALLET).slice(-MAX_HISTORY).map(h=>({
    id:h.id,bet:h.bet,payout:h.payout}));
  if(raw.active!=null){
   if(!validActive(raw.active))throw fail('invalid-slot-ledger');
   const a=raw.active;
   s.active={id:a.id,bet:a.bet,rows:a.rows.map(row=>[...row]),
    payout:a.payout,status:a.status};
  }
  return s;
 }
 function session(db,auth,uid){
  if(!validUid(uid)||auth?.currentUser?.uid!==uid||!db?.collection||!db?.runTransaction)
   throw fail('invalid-account');
  return auth.currentUser;
 }
 function unchanged(auth,uid,user){
  if(auth?.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
 }
 function profileOf(snap){
  if(!snap.exists)throw fail('profile-missing');
  const data=snap.data(),currency=data?.currency;
  if(!validWallet(currency))throw fail('invalid-wallet');
  const states=data.storyStates&&typeof data.storyStates==='object'&&
   !Array.isArray(data.storyStates)?data.storyStates:{};
  return {currency,states,state:norm(states[META])};
 }
 async function load({db,auth,uid}={}){
  const user=session(db,auth,uid);
  const snap=await db.collection('profiles_v2').doc(uid).get();
  unchanged(auth,uid,user);
  const p=profileOf(snap);
  return {currency:p.currency,state:p.state};
 }
 async function run({db,auth,uid,id,kind,bet,rolls}={}){
  const user=session(db,auth,uid);
  if(!validId(id)||!['start','claim'].includes(kind)||
   (kind==='start'&&(!design.BETS.includes(bet)||!design.grid(rolls))))
   throw fail('invalid-spin');
  const ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   unchanged(auth,uid,user);
   const {currency,states,state}=profileOf(snap);
   if(kind==='start'){
    if(state.ids.includes(id))return {status:'already-applied',kind,
     currency,state};
    if(state.active?.status==='spinning')throw fail('unfinished-spin');
    if(currency<bet)throw fail('not-enough-xu');
    const rows=design.grid(rolls),quote=design.slotQuote({bet,rows});
    if(!quote.ok)throw fail('invalid-spin');
    const next={...state,ids:[...state.ids,id].slice(-MAX_IDS),
     active:{id,bet,rows,payout:quote.payout,status:'spinning'}};
    tx.update(ref,{currency:currency-bet,storyStates:{...states,[META]:next}});
    return {status:'applied',kind,currency:currency-bet,state:next};
   }
   const active=state.active;
   if(!active||active.id!==id){
    if(state.history.some(item=>item.id===id))return {
     status:'already-applied',kind,currency,state};
    throw fail('spin-not-found');
   }
   if(active.status==='claimed')return {status:'already-applied',kind,currency,state};
   if(currency>MAX_WALLET-active.payout)throw fail('wallet-cap');
   const next={...state,active:{...active,status:'claimed'},
    history:[...state.history,{id,bet:active.bet,payout:active.payout}]
     .slice(-MAX_HISTORY)};
   const total=currency+active.payout;
   tx.update(ref,{currency:total,storyStates:{...states,[META]:next}});
   return {status:'applied',kind,currency:total,state:next,
    payout:active.payout};
  });
  unchanged(auth,uid,user);
  return Object.freeze(result);
 }
 return Object.freeze({META,VERSION,MAX_WALLET,norm,load,run});
});
