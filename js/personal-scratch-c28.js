/* DUDU C2.8 — private virtual-Xu scratch cards.
 * Tickets cost virtual account Xu only. No cash, real-money payout or exchange.
 * Firestore transactions provide owner isolation and replay protection, but
 * client-supplied random draws are NOT server-attested or tamper-proof.
 */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./personal-quest-events-c45.js'):
  root?.DuduPersonalQuestEventsC45);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalScratchC28=api;
})(typeof window!=='undefined'?window:null,function(questEvents){
 'use strict';
 const META='__duduScratchC28',PRICE=10,MAX_WALLET=1000000000;
 const THEMES=Object.freeze([
  {id:'dragon',name:'Kim Long',symbol:'龍',emoji:'🐉'},
  {id:'phoenix',name:'Phượng Vũ',symbol:'鳳',emoji:'🪶'},
  {id:'lantern',name:'Hoa Đăng',symbol:'福',emoji:'🏮'},
  {id:'jade',name:'Ngọc Thỏ',symbol:'玉',emoji:'🐇'},
  {id:'lotus',name:'Liên Hoa',symbol:'蓮',emoji:'🪷'},
  {id:'lion',name:'Kỳ Lân',symbol:'吉',emoji:'🦁'},
  {id:'cloud',name:'Vân Cẩm',symbol:'雲',emoji:'☁️'},
  {id:'gold',name:'Kim Nguyên',symbol:'財',emoji:'🪙'}
 ]);
 // Exactly 1,000,000 weighted outcomes, oldest to rarest in prize list.
 // E[payout] = 8.43 Xu per 10-Xu card. Jackpot odds 1 / 1,000,000.
 const PRIZES=Object.freeze([
  {amount:0,weight:29389,tier:'Trượt giải'},
  {amount:2,weight:300000,tier:'Xu an ủi'},
  {amount:5,weight:250000,tier:'Lộc nhỏ'},
  {amount:10,weight:200000,tier:'Hoàn vốn'},
  {amount:15,weight:120000,tier:'Hỷ lộc'},
  {amount:20,weight:70000,tier:'Tiểu cát'},
  {amount:30,weight:20000,tier:'Trung cát'},
  {amount:50,weight:8000,tier:'Đại cát'},
  {amount:100,weight:2000,tier:'Phúc tinh'},
  {amount:200,weight:500,tier:'Kim quang'},
  {amount:500,weight:100,tier:'Ngọc thưởng'},
  {amount:2000,weight:10,tier:'Thiên lộc'},
  {amount:10000,weight:1,tier:'Vạn phúc'}
 ].map(Object.freeze));
 const MAX_HISTORY=48,MAX_RECEIPTS=96;
 const validUid=s=>typeof s==='string'&&s.length>0&&s.length<=128;
 const validId=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
 const finite=(x,min,max,otherwise=0)=>Number.isSafeInteger(x)&&x>=min&&x<=max?x:otherwise;
 const themeSet=new Set(THEMES.map(t=>t.id));
 const fail=reason=>Object.assign(new Error(reason),{reason});
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x);
 const validPrize=x=>Number.isSafeInteger(x)&&PRIZES.some(t=>t.amount===x);
 const draw=value=>{
  if(!Number.isSafeInteger(value)||value<0||value>=1000000)return null;
  let offset=0;
  for(const prize of PRIZES){offset+=prize.weight;if(value<offset)return prize;}
  return null;
 };
 const defaultState=()=>({version:1,total:0,spent:0,won:0,album:{},prizes:[],
  history:[],buyIds:[],active:null});
 function norm(raw){
  const state=defaultState();
  if(!raw||raw.version!==1||typeof raw!=='object')return state;
  state.total=finite(raw.total,0,100000000,0);
  state.spent=finite(raw.spent,0,MAX_WALLET,0);
  state.won=finite(raw.won,0,MAX_WALLET,0);
  for(const theme of THEMES){
   const count=finite(raw.album?.[theme.id],0,100000000,0);
   if(count)state.album[theme.id]=count;
  }
  if(Array.isArray(raw.prizes))state.prizes=[...new Set(raw.prizes.filter(validPrize))];
  if(Array.isArray(raw.buyIds))state.buyIds=[...new Set(raw.buyIds.filter(validId))].slice(-MAX_RECEIPTS);
  if(Array.isArray(raw.history))state.history=raw.history.filter(h=>
   h&&validId(h.id)&&themeSet.has(h.theme)&&validPrize(h.amount)&&validDate(h.day)
  ).slice(-MAX_HISTORY).map(h=>({id:h.id,theme:h.theme,amount:h.amount,day:h.day}));
  const a=raw.active;
  if(a&&validId(a.id)&&themeSet.has(a.theme)&&validPrize(a.amount)&&
   validDate(a.day)&&['playing','ready','claimed'].includes(a.status)&&
   Number.isSafeInteger(a.seed)&&a.seed>=0&&a.seed<=1000000){
   const numbered=a.layout==='numbers',count=numbered?10:3;
   const cells=Array.isArray(a.cells)?[...new Set(a.cells.filter(v=>Number.isSafeInteger(v)&&v>=0&&v<(numbered?10:9)))].slice(0,count):[];
   if((a.status==='playing'&&cells.length<count)||(a.status!=='playing'&&cells.length===count))
    state.active={id:a.id,theme:a.theme,amount:a.amount,day:a.day,status:a.status,
     seed:a.seed,cells,...(numbered?{layout:'numbers'}:{})};
  }
  return state;
 }
 const symbols=seed=>Array.from({length:9},(_,i)=>['福','喜','財','祿','壽','龍','鳳','玉','金'][(seed+i*7)%9]);
 // New layout matches the reference: ten scratchable number/prize pairs and
 // five bonus gifts. Every award occupies exactly one of the fifteen spots.
 // Prize amounts are precommitted on purchase, not calculated from scratches.
 function cardNumbers(seed,amount){
  if(!Number.isSafeInteger(seed)||seed<0||seed>1000000||!validPrize(amount))return null;
  const winning=10+(seed%80),giftWin=amount>0&&seed%5===0,
   matchIndex=(Math.floor(seed/7)%10),bonusIndex=Math.floor(seed/5)%5;
  let x=(seed+0x9e3779b9)>>>0;
  const next=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};
  const used=new Set([winning]),tiles=[];
  for(let i=0;i<10;i++){
   let n;
   if(amount>0&&!giftWin&&i===matchIndex)n=winning;
   else{
    do{n=1+next()%99;}while(used.has(n));
    used.add(n);
   }
   const decoy=[2,5,10,15,20,30,50,100,200,500][next()%10];
   tiles.push({number:n,prize:amount>0&&!giftWin&&i===matchIndex?amount:decoy,
    match:n===winning});
  }
  const gifts=Array.from({length:5},(_,i)=>giftWin&&i===bonusIndex?amount:0);
  return {winning,tiles,gifts};
 }
 async function load({db,auth,uid}={}){
  if(!validUid(uid)||auth?.currentUser?.uid!==uid||!db?.collection)throw fail('invalid-account');
  const user=auth.currentUser,snap=await db.collection('profiles_v2').doc(uid).get();
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  if(!snap.exists)throw fail('profile-missing');
  return {state:norm(snap.data()?.storyStates?.[META]),currency:snap.data()?.currency};
 }
 async function run({db,auth,uid,kind,id,theme='dragon',roll,seed,cell,now=()=>Date.now()}={}){
  if(!validUid(uid)||auth?.currentUser?.uid!==uid||!db?.collection||!db?.runTransaction||
   !validId(id)||!['buy','scratch','reveal','claim'].includes(kind))throw fail('invalid-account');
  const at=now();
  if(!Number.isSafeInteger(at)||at<1||at>8640000000000000)throw fail('invalid-time');
  const day=new Date(at).toISOString().slice(0,10),user=auth.currentUser;
  const ref=db.collection('profiles_v2').doc(uid);
  const outcome=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)throw fail('profile-missing');
   if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
   const data=snap.data(),states=data.storyStates&&typeof data.storyStates==='object'?data.storyStates:{},
    state=norm(states[META]);
   if(!Number.isSafeInteger(data.currency)||data.currency<0||data.currency>MAX_WALLET)
    throw fail('invalid-wallet');
   let coins=data.currency,changed=false,status='applied',reward=null,questFields={};
   if(kind==='buy'){
    if(state.buyIds.includes(id))status='already-applied';
    else if(state.active&&state.active.status!=='claimed')throw fail('unfinished-ticket');
    else if(!themeSet.has(theme)||draw(roll)===null||
     !Number.isSafeInteger(seed)||seed<0||seed>1000000)throw fail('invalid-draw');
    else if(coins<PRICE)throw fail('not-enough-xu');
    else{
     const drawn=draw(roll);
     coins-=PRICE;state.total=Math.min(100000000,state.total+1);
     state.spent=Math.min(MAX_WALLET,state.spent+PRICE);
     state.album[theme]=Math.min(100000000,(state.album[theme]||0)+1);
     state.active={id,theme,amount:drawn.amount,seed,day,status:'playing',cells:[],layout:'numbers'};
     state.buyIds=[...state.buyIds,id].slice(-MAX_RECEIPTS);changed=true;
    }
   }else{
    if(!state.active||state.active.id!==id)throw fail('ticket-not-found');
    if(kind==='reveal'){
     if(state.active.layout!=='numbers')throw fail('invalid-layout');
     if(state.active.status!=='playing')status='already-applied';
     else{state.active.cells=[0,1,2,3,4,5,6,7,8,9];
      state.active.status='ready';changed=true;}
    }else if(kind==='scratch'){
     if(state.active.layout==='numbers')throw fail('invalid-layout');
     if(!Number.isInteger(cell)||cell<0||cell>8)throw fail('invalid-cell');
     if(state.active.cells.includes(cell)||state.active.status!=='playing')status='already-applied';
     else{state.active.cells.push(cell);if(state.active.cells.length===3)state.active.status='ready';changed=true;}
    }else if(state.active.status==='claimed')status='already-applied';
    else if(state.active.status!=='ready')throw fail('not-ready');
    else if(coins+state.active.amount>MAX_WALLET)throw fail('wallet-cap');
    else{
     coins+=state.active.amount;reward={amount:state.active.amount,
      tier:PRIZES.find(x=>x.amount===state.active.amount)?.tier};
     state.won=Math.min(MAX_WALLET,state.won+reward.amount);
     if(!state.prizes.includes(reward.amount))state.prizes.push(reward.amount);
     state.history=[...state.history,{id:state.active.id,theme:state.active.theme,
      amount:reward.amount,day:state.active.day}].slice(-MAX_HISTORY);
     state.active.status='claimed';changed=true;
    }
   }
   let nextStates={...states,[META]:state};
   if(kind==='claim'&&status==='applied'&&changed){
    const quest=questEvents.record({...data,storyStates:nextStates},
     {type:'FUN_CLAIM',eventId:id,day,source:'ticket'});
    const {storyStates:questStates,...fields}=quest.patch;
    questFields=fields;nextStates=questStates||nextStates;
   }
   if(changed)tx.update(ref,{currency:coins,storyStates:nextStates,...questFields});
   return {status,kind,currency:coins,state,storyStates:nextStates,reward,...questFields};
  });
  if(auth.currentUser!==user||auth.currentUser?.uid!==uid)throw fail('account-changed');
  return outcome;
 }
 return Object.freeze({META,PRICE,THEMES,PRIZES,draw,norm,symbols,cardNumbers,load,run});
});
