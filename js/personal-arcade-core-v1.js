/* DUDU personal arcade V1 — four local-only games. Never writes the real wallet.
 * State is deterministic given the time and a caller-supplied mining roll.
 * All coins in this module are *tenths* of a fictional game Xu.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalArcadeCoreV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const jadeGame=typeof module==='object'&&module.exports?
  require('./personal-jade-core-v1.js'):
  typeof window!=='undefined'?window.DuduPersonalJadeCoreV1:null;
 const WATER_INTERVAL=15*60*1000,REPAIR_INTERVAL=4*60*1000;
 const GROW_INTERVAL=3*60*1000,BUBBLE_INTERVAL=90*1000;
 const MAX_COIN=1000000000,MAX_IDLE_MS=12*60*60*1000;
 // Values are tenths of game Xu. Manual clicks should matter without making
 // a single ore run worth several hundred Xu.
 const ORE_VALUES=Object.freeze({stone:2,coal:3,iron:6,copper:9,silver:16,
  gold:28,crystal:38,jade:60,meteor:120,relic:500});
 const ORE_NAMES=Object.freeze({stone:'Đá',coal:'Than',iron:'Sắt',copper:'Đồng',
  silver:'Bạc',gold:'Vàng',crystal:'Tinh thạch',jade:'Ngọc bích',
  meteor:'Thiên thạch',relic:'Cổ vật'});
 const ORE_WEIGHTS=Object.freeze([
  Object.freeze([35,27,20,6,5,3,3,.6,.3,.1]),
  Object.freeze([25,22,21,9,8,6,5,2,1,1]),
  Object.freeze([12,13,18,14,12,10,9,5,4,3])
 ]);
 const CROPS=Object.freeze({bloom:{name:'Hoa sương',grow:GROW_INTERVAL,value:50},
  mint:{name:'Lá bạc hà',grow:GROW_INTERVAL*2,value:100},
  moon:{name:'Hoa nguyệt',grow:GROW_INTERVAL*3,value:200}});
 // Fish are discoveries, not tradable main-wallet items. Preserve the old
 // fish/rareFish totals for pre-C4.1 players without fabricating past catches.
 const FISH_SPECIES=Object.freeze({
  reed:Object.freeze({name:'Cá rô sương',rarity:'Thường',icon:'🐟',min:16,max:29,rare:false}),
  carp:Object.freeze({name:'Cá chép rêu',rarity:'Thường',icon:'🐠',min:24,max:47,rare:false}),
  silver:Object.freeze({name:'Cá vây bạc',rarity:'Thường',icon:'🐟',min:19,max:38,rare:false}),
  koi:Object.freeze({name:'Cá koi hoàng hôn',rarity:'Quý',icon:'🐠',min:26,max:54,rare:false}),
  blue:Object.freeze({name:'Cá lam ngọc',rarity:'Quý',icon:'🐟',min:22,max:41,rare:false}),
  moonfish:Object.freeze({name:'Cá nguyệt quang',rarity:'Hiếm',icon:'🌙',min:34,max:60,rare:true}),
  crystal:Object.freeze({name:'Cá pha lê',rarity:'Sử thi',icon:'💠',min:28,max:57,rare:true}),
  dragon:Object.freeze({name:'Long ngư tinh vân',rarity:'Huyền thoại',icon:'🐉',min:58,max:98,rare:true})
 });
 const FISH_BITE_MIN=3000,FISH_BITE_SPAN=3000,FISH_REEL_WINDOW=25000;
 const FISH_COMMON=['reed','carp','silver','koi','blue'];
 const FISH_RARE=['moonfish','crystal','dragon'];
 const NEON_SERVICE_INTERVAL=45000;
 const NEON_ORDER_COOLDOWN=90000,NEON_ORDER_MISS=30000;
 const NEON_ORDERS=Object.freeze([[0,1],[2,0],[1,2],[0,2],[2,1],[1,0]].map(x=>Object.freeze(x)));
 const neonOrderPattern=neon=>NEON_ORDERS[(neon.orderRound+neon.roomTier-1)%NEON_ORDERS.length];
 const NEON_ROOM_CAPACITY=[3,5,7];
 const neonCapacity=neon=>NEON_ROOM_CAPACITY[neon.roomTier-1]||3;
 const neonService=neon=>{
  const guests=Math.min(neon.stations,1+(neon.seating-1)+
   Math.floor((neon.ambiance-1)/2)+(neon.roomTier-1));
  // Arcade tenths, per occupied service session; expenses are never negative.
  const revenue=guests*(6+2*neon.snack+(neon.ambiance-1));
  const expense=1+neon.roomTier+guests+neon.snack;
  return {guests,revenue,expense,profit:Math.max(0,revenue-expense)};
 };
 function chooseFish(roll,threshold){
  const rare=roll>=threshold,scaled=rare?(roll-threshold)/(1-threshold):roll/threshold;
  const limits=rare?[.68,.94,1]:[.27,.52,.75,.91,1];
  return (rare?FISH_RARE:FISH_COMMON)[limits.findIndex(limit=>scaled<limit)];
 }
 const ECONOMY_VERSION=2;
 const number=(value,min,max,fallback)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:fallback;
 const safeTime=t=>Number.isSafeInteger(t)&&t>=0?t:Date.now();
 const clamp=(n,max)=>Math.min(max,Math.max(0,n));
 const copy=value=>JSON.parse(JSON.stringify(value));
 const fresh=(now=Date.now())=>{
  const time=safeTime(now);
  return {version:1,lastAt:time,coins:0,earned:0,
   neon:{cpu:1,gpu:1,stations:1,router:1,skin:0,cooling:1,turboUntil:0,turboReadyAt:0,
    contracts:[],running:true,remainder:0,economyV:ECONOMY_VERSION,
    roomTier:1,seating:1,ambiance:1,snack:0,guestsServed:0,serviceRevenue:0,
    operatingExpense:0,sessionMs:0,milestones:[],orderRound:0,orderStep:0,
    orderWon:0,orderStreak:0,orderReadyAt:0},
   mine:{durability:100,pickLevel:1,drillLevel:1,lantern:1,cart:1,scanner:0,
    zone:0,charge:0,bursts:0,repairUntil:0,dug:0,probes:0,probeHits:0,
    ores:Object.fromEntries(Object.keys(ORE_VALUES).map(ore=>[ore,0])),
    found:Object.fromEntries(Object.keys(ORE_VALUES).map(ore=>[ore,0]))},
   garden:{water:1,waterCap:3,pondTier:1,waterAt:time,seeds:3,plots:2,
    crop:'bloom',sprinkler:0,rod:1,fish:0,rareFish:0,
    beds:[{status:'empty',readyAt:0,crop:'bloom'},{status:'empty',readyAt:0,crop:'bloom'}],
    bubbleAt:time+BUBBLE_INTERVAL,bubbleReady:false,bait:0,harvests:0,
    line:null,fishAlbum:Object.fromEntries(Object.keys(FISH_SPECIES).map(id=>[id,0])),
    fishBest:Object.fromEntries(Object.keys(FISH_SPECIES).map(id=>[id,0]))},
   jade:jadeGame?jadeGame.fresh():null};
 };
 const maxDurability=mine=>100+25*(mine.pickLevel-1);
 const mineProbeTarget=mine=>(mine.probes*2+mine.zone+1)%3;
 const bubbleInterval=garden=>BUBBLE_INTERVAL-10000*(garden.pondTier-1);
 function norm(raw,now=Date.now()){
  const time=safeTime(now),fallback=fresh(time);
  if(!raw||raw.version!==1||typeof raw!=='object')return fallback;
  const source=raw,neon=source.neon||{},mine=source.mine||{},garden=source.garden||{};
  const state=copy(fallback);
  if(jadeGame)state.jade=jadeGame.norm(source.jade);
  state.lastAt=number(source.lastAt,0,time,time);
  state.coins=number(source.coins,0,MAX_COIN,0);
  state.earned=number(source.earned,0,MAX_COIN,0);
  const roomTier=number(neon.roomTier,1,3,1);
  state.neon={cpu:number(neon.cpu,1,50,1),gpu:number(neon.gpu,1,20,1),
   roomTier,stations:number(neon.stations,1,neonCapacity({roomTier}),1),
   router:number(neon.router,1,10,1),
   skin:number(neon.skin,0,2,0),cooling:number(neon.cooling,1,5,1),
   seating:number(neon.seating,1,5,1),ambiance:number(neon.ambiance,1,5,1),
   snack:number(neon.snack,0,3,0),
   guestsServed:number(neon.guestsServed,0,MAX_COIN,0),
   serviceRevenue:number(neon.serviceRevenue,0,MAX_COIN,0),
   operatingExpense:number(neon.operatingExpense,0,MAX_COIN,0),
   sessionMs:number(neon.sessionMs,0,NEON_SERVICE_INTERVAL-1,0),
   orderRound:number(neon.orderRound,0,1000000,0),
   orderStep:number(neon.orderStep,0,1,0),
   orderWon:number(neon.orderWon,0,1000000,0),
   orderStreak:number(neon.orderStreak,0,1000,0),
   orderReadyAt:number(neon.orderReadyAt,0,time+NEON_ORDER_COOLDOWN,0),
   milestones:Array.isArray(neon.milestones)?[0,1,2,3].filter(i=>neon.milestones.includes(i)):[],
   turboUntil:number(neon.turboUntil,0,time+15*60*1000,0),
   turboReadyAt:number(neon.turboReadyAt,0,time+30*60*1000,0),
   contracts:Array.isArray(neon.contracts)?[0,1,2].filter(i=>neon.contracts.includes(i)):[],
   economyV:ECONOMY_VERSION,
   running:neon.running!==false,
   // Convert unfinished sub-Xu earnings from the earlier 0.1 Xu/s economy.
   remainder:neon.economyV===ECONOMY_VERSION?
    number(neon.remainder,0,99999,0):number(neon.remainder,0,999,0)*100};
  const pickLevel=number(mine.pickLevel,1,4,1);
  state.mine={pickLevel,drillLevel:number(mine.drillLevel,1,5,1),
   lantern:number(mine.lantern,1,3,1),cart:number(mine.cart,1,4,1),
   scanner:number(mine.scanner,0,3,0),zone:number(mine.zone,0,2,0),
   charge:number(mine.charge,0,24,0),bursts:number(mine.bursts,0,10000000,0),
   durability:number(mine.durability,0,100+25*(pickLevel-1),100),
   repairUntil:number(mine.repairUntil,0,time+REPAIR_INTERVAL*2,0),
   dug:number(mine.dug,0,10000000,0),probes:number(mine.probes,0,1000000,0),
   probeHits:number(mine.probeHits,0,1000000,0),ores:{},found:{}};
  for(const ore of Object.keys(ORE_VALUES)){
   state.mine.ores[ore]=number(mine.ores?.[ore],0,1000000,0);
   state.mine.found[ore]=number(mine.found?.[ore],0,10000000,state.mine.ores[ore]);
  }
  if(!zoneUnlocked(state.mine,state.mine.zone))state.mine.zone=0;
  state.mine.charge=Math.min(state.mine.charge,maxCharge(state.mine));
  state.garden.waterCap=number(garden.waterCap,3,7,3);
  state.garden.pondTier=number(garden.pondTier,1,5,1);
  state.garden.water=number(garden.water,0,state.garden.waterCap,1);
  state.garden.waterAt=number(garden.waterAt,0,time,time);
  state.garden.seeds=number(garden.seeds,0,10000,3);
  state.garden.plots=number(garden.plots,2,4,2);
  state.garden.crop=CROPS[garden.crop]?garden.crop:'bloom';
  state.garden.sprinkler=number(garden.sprinkler,0,2,0);
  state.garden.rod=number(garden.rod,1,5,1);
  state.garden.fish=number(garden.fish,0,10000000,0);
  state.garden.rareFish=number(garden.rareFish,0,10000000,0);
  state.garden.beds=Array.from({length:state.garden.plots},(_,i)=>{
   const bed=garden.beds?.[i]||{};
   const status=['empty','dry','growing'].includes(bed.status)?bed.status:'empty';
   return {status,readyAt:status==='growing'?number(bed.readyAt,0,time+GROW_INTERVAL*4,time):0,
    crop:CROPS[bed.crop]?bed.crop:'bloom'};
  });
  state.garden.bubbleAt=number(garden.bubbleAt,0,time+BUBBLE_INTERVAL*2,time+BUBBLE_INTERVAL);
  state.garden.bubbleReady=garden.bubbleReady===true;
  state.garden.bait=number(garden.bait,0,10000,0);
  state.garden.harvests=number(garden.harvests,0,1000000,0);
  for(const id of Object.keys(FISH_SPECIES)){
   state.garden.fishAlbum[id]=number(garden.fishAlbum?.[id],0,10000000,0);
   state.garden.fishBest[id]=number(garden.fishBest?.[id],0,200,0);
  }
  const line=garden.line;
  if(line&&FISH_SPECIES[line.fishId]){
   const biteAt=number(line.biteAt,0,time+60000,0),
    escapeAt=number(line.escapeAt,0,time+60000,0);
   const rod=number(line.rod,1,5,1),size=number(line.size,1,200,0);
   if(biteAt&&escapeAt===biteAt+FISH_REEL_WINDOW&&size)
    state.garden.line={fishId:line.fishId,biteAt,escapeAt,rod,size};
  }
  return state;
 }
 // Thousandths of game Xu per second: starts at 0.01 Xu/s (36 Xu/hour),
 // with additive CPU/GPU gains rather than explosive multiplicative scaling.
 const rate=state=>(10+3*(state.neon.cpu-1)+4*(state.neon.gpu-1)+
  2*(state.neon.router-1)+2*(state.neon.cooling-1))*state.neon.stations;
 const maxCharge=mine=>12+4*(mine.cart-1);
 const zoneUnlocked=(mine,zone)=>zone===0||(zone===1&&mine.dug>=40&&mine.lantern>=2)||
  (zone===2&&mine.dug>=160&&mine.lantern>=3);
 const cropUnlocked=(garden,crop)=>crop==='bloom'||crop==='mint'&&garden.harvests>=10||
  crop==='moon'&&garden.harvests>=30;
 const upgradeCost=(state,type)=>type==='cpu'?400*state.neon.cpu*state.neon.cpu:
  type==='gpu'?900*state.neon.gpu*state.neon.gpu:
  type==='station'&&state.neon.stations<neonCapacity(state.neon)?800*state.neon.stations*state.neon.stations:
  type==='room-tier'&&state.neon.roomTier<3?[0,2400,8000][state.neon.roomTier]:
  type==='seating'&&state.neon.seating<5?300*state.neon.seating**2:
  type==='ambiance'&&state.neon.ambiance<5?220*state.neon.ambiance**2:
  type==='snack'&&state.neon.snack<3?500*(state.neon.snack+1)**2:
  type==='router'&&state.neon.router<10?300*state.neon.router*state.neon.router:
  type==='skin'&&state.neon.skin<2?600*(state.neon.skin+1)*(state.neon.skin+1):
  type==='cooling'&&state.neon.cooling<5?450*state.neon.cooling*state.neon.cooling:
  type==='pick-level'&&state.mine.pickLevel<4?500*state.mine.pickLevel*state.mine.pickLevel:
  type==='drill-level'&&state.mine.drillLevel<5?400*state.mine.drillLevel*state.mine.drillLevel:
  type==='lantern'&&state.mine.lantern<3?500*state.mine.lantern*state.mine.lantern:
  type==='cart'&&state.mine.cart<4?400*state.mine.cart*state.mine.cart:
  type==='water-cap'&&state.garden.waterCap<7?350*(state.garden.waterCap-2)*(state.garden.waterCap-2):
  type==='pond-tier'&&state.garden.pondTier<5?600*state.garden.pondTier*state.garden.pondTier:
  type==='plots'&&state.garden.plots<4?600*(state.garden.plots-1)*(state.garden.plots-1):
  type==='sprinkler'&&state.garden.sprinkler<2?500*(state.garden.sprinkler+1)**2:
  type==='rod'&&state.garden.rod<5?450*state.garden.rod**2:null;
 const give=(state,amount)=>{
  if(amount<=0)return;
  state.coins=clamp(state.coins+amount,MAX_COIN);
  state.earned=clamp(state.earned+amount,MAX_COIN);
 };
 function advance(raw,now=Date.now(),idleElapsedMs=0){
  const time=safeTime(now),state=norm(raw,time);
  const elapsed=Math.max(0,time-state.lastAt);
  // The caller only credits time measured while this browser tab was alive.
  // A re-opened tab passes zero; time regeneration continues independently.
  const idle=Math.min(MAX_IDLE_MS,elapsed,Math.max(0,Number(idleElapsedMs)||0));
  if(state.neon.running&&idle>0){
   const turboMs=Math.max(0,Math.min(time,state.neon.turboUntil)-Math.max(time-idle,state.lastAt));
   const milli=state.neon.remainder+(idle+turboMs)*rate(state);
   give(state,Math.floor(milli/100000));
   state.neon.remainder=milli%100000;
   const total=state.neon.sessionMs+idle;
   const sessions=Math.floor(total/NEON_SERVICE_INTERVAL);
   state.neon.sessionMs=total%NEON_SERVICE_INTERVAL;
   if(sessions){
    const service=neonService(state.neon);
    state.neon.guestsServed=clamp(state.neon.guestsServed+sessions*service.guests,MAX_COIN);
    state.neon.serviceRevenue=clamp(state.neon.serviceRevenue+sessions*service.revenue,MAX_COIN);
    state.neon.operatingExpense=clamp(state.neon.operatingExpense+sessions*service.expense,MAX_COIN);
    give(state,sessions*service.profit);
   }
  }
  if(state.mine.repairUntil&&time>=state.mine.repairUntil){
   state.mine.durability=maxDurability(state.mine);state.mine.repairUntil=0;
  }
  const garden=state.garden;
  if(garden.water<garden.waterCap){
   const refill=Math.floor(Math.max(0,time-garden.waterAt)/WATER_INTERVAL);
   if(refill>0){
    garden.water=Math.min(garden.waterCap,garden.water+refill);
    garden.waterAt=garden.water===garden.waterCap?time:garden.waterAt+refill*WATER_INTERVAL;
   }
  }else garden.waterAt=time;
  if(!garden.bubbleReady&&time>=garden.bubbleAt)garden.bubbleReady=true;
  if(garden.line&&time>garden.line.escapeAt)garden.line=null;
  state.lastAt=time;
  return state;
 }
 function act(raw,action,now=Date.now(),roll=0.5){
  const time=safeTime(now),state=advance(raw,time,0);
  const fail=reason=>({ok:false,reason,state});
  const succeed=(label,extras={})=>({ok:true,label,state,...extras});
  const garden=state.garden,mine=state.mine;
  if(/^jade-/.test(action||''))return jadeGame?
   jadeGame.act(state,action,roll,time):fail('Ngọc Phường chưa sẵn sàng');
  if(action==='toggle-neon'){
   state.neon.running=!state.neon.running;
   return succeed(state.neon.running?'Máy đã chạy':'Đã tạm dừng máy');
  }
  if(action==='neon-turbo'){
   if(!state.neon.running)return fail('Hãy bật dàn máy trước');
   if(time<state.neon.turboReadyAt)return fail('Hệ thống đang làm mát');
   state.neon.turboUntil=time+180000+30000*(state.neon.cooling-1);
   state.neon.turboReadyAt=time+600000;
   return succeed('⚡ Ép xung! Thu nhập tăng gấp đôi trong ít phút');
  }
  const orderAction=/^neon-order-([012])$/.exec(action||'');
  if(orderAction){
   const n=state.neon,choice=Number(orderAction[1]);
   if(!n.running)return fail('Hãy mở cửa Trạm Neon trước');
   if(time<n.orderReadyAt)return fail('Khách mới chưa tới quầy');
   const expected=neonOrderPattern(n)[n.orderStep];
   if(choice!==expected){
    n.orderRound++;n.orderStep=0;n.orderStreak=0;n.orderReadyAt=time+NEON_ORDER_MISS;
    return succeed('✕ Nhầm món! Khách sẽ quay lại sau');
   }
   if(n.orderStep===0){n.orderStep=1;return succeed('✓ Đã chuẩn bị món đầu tiên');}
   n.orderRound++;n.orderStep=0;n.orderWon++;n.orderStreak=Math.min(1000,n.orderStreak+1);
   n.orderReadyAt=time+NEON_ORDER_COOLDOWN;
   const bonus=3+Math.min(2,Math.floor(n.orderStreak/3));
   give(state,bonus);
   return succeed('✦ Phục vụ trọn đơn · +'+formatXu(bonus)+' Xu Arcade');
  }
  const contract=/^neon-contract-([012])$/.exec(action||'');
  if(contract){
   const i=Number(contract[1]),ready=[state.neon.cpu>=2,state.neon.stations>=2,
    state.neon.router>=3][i];
   if(!ready||state.neon.contracts.includes(i))return fail('Đơn hàng chưa hoàn thành hoặc đã nhận');
   state.neon.contracts.push(i);give(state,[50,120,180][i]);
   return succeed('✦ Hoàn tất hợp đồng, nhận '+formatXu([50,120,180][i])+' Xu Arcade');
  }
  const milestone=/^neon-milestone-([0123])$/.exec(action||'');
  if(milestone){
   const i=Number(milestone[1]),ready=[state.neon.guestsServed>=25,
    state.neon.guestsServed>=100,state.neon.roomTier>=2,
    state.neon.roomTier>=3][i];
   if(!ready||state.neon.milestones.includes(i))return fail('Mốc chưa đạt hoặc đã nhận thưởng');
   state.neon.milestones.push(i);give(state,[200,500,300,900][i]);
   return succeed('✦ Thành tựu phòng net · +'+formatXu([200,500,300,900][i])+' Xu Arcade');
  }
  if(action==='cpu'||action==='gpu'){
   const cost=upgradeCost(state,action),level=state.neon[action];
   if(level>=(action==='cpu'?50:20))return fail('Đã nâng cấp tối đa');
   if(state.coins<cost)return fail('Chưa đủ Xu trong trò chơi');
   state.coins-=cost;state.neon[action]++;
   return succeed('Đã nâng cấp '+action.toUpperCase());
  }
  if(action==='station'){
   if(state.neon.stations>=neonCapacity(state.neon))return fail('Hãy mở rộng mặt bằng trước khi lắp thêm dàn máy');
   const cost=upgradeCost(state,'station');
   if(state.coins<cost)return fail('Chưa đủ Xu để lắp thêm dàn máy');
   state.coins-=cost;state.neon.stations++;
   return succeed('Đã lắp dàn máy số '+state.neon.stations);
  }
  if(action==='room-tier'){
   if(state.neon.roomTier>=3)return fail('Đã mở rộng đến tầng cao nhất');
   if(state.neon.stations<neonCapacity(state.neon)||
    state.neon.guestsServed<(state.neon.roomTier===1?20:100))
    return fail('Cần đủ dàn máy và lượt khách để mở phòng mới');
   const cost=upgradeCost(state,action);
   if(state.coins<cost)return fail('Chưa đủ Xu Arcade để mở rộng');
   state.coins-=cost;state.neon.roomTier++;
   return succeed('✦ Mở rộng Trạm Neon lên phòng cấp '+state.neon.roomTier);
  }
  if(['router','skin','cooling','pick-level','drill-level','lantern','cart',
   'water-cap','pond-tier','plots','sprinkler','rod','seating','ambiance','snack'].includes(action)){
   const cost=upgradeCost(state,action);
   if(cost===null)return fail('Nâng cấp này đã đạt giới hạn');
   if(state.coins<cost)return fail('Chưa đủ Xu trò chơi để nâng cấp');
   state.coins-=cost;
   if(action==='router')state.neon.router++;
   if(action==='skin')state.neon.skin++;
   if(action==='cooling')state.neon.cooling++;
   if(action==='seating')state.neon.seating++;
   if(action==='ambiance')state.neon.ambiance++;
   if(action==='snack')state.neon.snack++;
   if(action==='pick-level')state.mine.pickLevel++;
   if(action==='drill-level')state.mine.drillLevel++;
   if(action==='lantern')state.mine.lantern++;
   if(action==='cart')state.mine.cart++;
   if(action==='water-cap')state.garden.waterCap++;
   if(action==='plots')state.garden.beds.push({status:'empty',readyAt:0,crop:'bloom'}),state.garden.plots++;
   if(action==='sprinkler')state.garden.sprinkler++;
   if(action==='rod')state.garden.rod++;
   if(action==='pond-tier'){
    state.garden.pondTier++;
    if(!state.garden.bubbleReady)state.garden.bubbleAt=Math.min(
     state.garden.bubbleAt,time+bubbleInterval(state.garden));
   }
   return succeed('Nâng cấp thành công');
  }
  const zoneAction=/^mine-zone-([012])$/.exec(action||'');
  if(zoneAction){
   const zone=Number(zoneAction[1]);
   if(!zoneUnlocked(mine,zone))return fail('Hầm này cần thêm lượt đào và đèn thám hiểm');
   mine.zone=zone;return succeed(['Đang khai thác tầng đất','Đã xuống mạch sắt','Đã đến hang tinh thạch'][zone]);
  }
  if(action==='mine-scanner'){
   if(mine.scanner>=3)return fail('Máy dò đã đạt cấp tối đa');
   if(mine.ores.iron<8||mine.ores.crystal<3)return fail('Cần 8 sắt và 3 tinh thạch để chế máy dò');
   mine.ores.iron-=8;mine.ores.crystal-=3;mine.scanner++;
   return succeed('✦ Máy dò tinh thể đã mạnh hơn');
  }
  const dig=(value,charge=true)=>{
   const quality=mine.drillLevel-1,scan=mine.scanner;
   const weights=[...ORE_WEIGHTS[mine.zone]];
   weights[0]-=quality+scan*1.5;
   weights[1]-=quality*.5;
   weights[5]+=quality*.75;
   weights[6]+=quality*.75;
   weights[7]+=scan*.7;
   weights[8]+=scan*.5;
   weights[9]+=scan*.3;
   let cumulative=0,ore='relic';
   for(const [index,key] of Object.keys(ORE_VALUES).entries()){
    cumulative+=weights[index]/100;
    if(value<cumulative){ore=key;break;}
   }
   const quantity=1+(mine.zone>0?1:0)+(mine.pickLevel>=3?1:0);
   mine.durability--;mine.dug++;
   mine.ores[ore]=Math.min(1000000,mine.ores[ore]+quantity);
   mine.found[ore]=Math.min(10000000,mine.found[ore]+quantity);
   if(charge)mine.charge=Math.min(maxCharge(mine),mine.charge+1);
   return {ore,quantity};
  };
  const probeAction=/^mine-probe-([012])$/.exec(action||'');
  if(probeAction){
   if(mine.repairUntil||mine.durability<1)return fail('Cần một cuốc còn dùng được');
   if(mine.charge<3)return fail('Cần 3 năng lượng để dò một ngách');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt dò không hợp lệ');
   const chosen=Number(probeAction[1]),target=mineProbeTarget(mine);
   mine.charge-=3;mine.probes++;
   if(chosen===target){
    mine.probeHits++;
    const mined=dig(Math.min(.999999,roll+.12),false);
    mine.ores[mined.ore]=Math.min(1000000,mine.ores[mined.ore]+1);
    mine.found[mined.ore]=Math.min(10000000,mine.found[mined.ore]+1);
    return succeed('✦ Đúng mạch! +'+(mined.quantity+1)+' '+ORE_NAMES[mined.ore],
     {ore:mined.ore,quantity:mined.quantity+1,hit:true});
   }
   mine.durability--;mine.dug++;
   mine.ores.stone=Math.min(1000000,mine.ores.stone+1);
   mine.found.stone=Math.min(10000000,mine.found.stone+1);
   return succeed('Mạch yếu · thu được 1 Đá',{ore:'stone',quantity:1,hit:false});
  }
  if(action==='mine'){
   if(mine.repairUntil)return fail('Cuốc đang tự sửa chữa');
   if(!mine.durability)return fail('Cuốc đã hết độ bền');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt đào không hợp lệ');
   const mined=dig(roll);
   return succeed(mined.ore,{quantity:mined.quantity});
  }
  if(action==='mine-burst'){
   if(mine.repairUntil||mine.durability<3)return fail('Cuốc cần ít nhất 3 độ bền');
   if(mine.charge<5)return fail('Cần 5 năng lượng để phá mạch quặng');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt đào không hợp lệ');
   mine.charge-=5;mine.bursts++;
   const ores=[roll,(roll+.37)%1,(roll+.71)%1].map(v=>dig(v,false));
   return succeed('⚡ Phá mạch: '+ores.map(hit=>hit.quantity+' '+ORE_NAMES[hit.ore]).join(' · '),
    {quantity:ores.reduce((sum,hit)=>sum+hit.quantity,0)});
  }
  if(action==='repair-wait'){
   if(mine.repairUntil||mine.durability===maxDurability(mine))return fail('Cuốc chưa cần sửa');
   mine.repairUntil=time+REPAIR_INTERVAL;
   return succeed('Bắt đầu tự sửa chữa trong 4 phút');
  }
  if(action==='repair-forge'){
   if(mine.durability===maxDurability(mine)||mine.repairUntil)return fail('Không thể rèn cuốc lúc này');
   if(mine.ores.coal<5||mine.ores.iron<2)return fail('Cần 5 than và 2 sắt để sửa ngay');
   mine.ores.coal-=5;mine.ores.iron-=2;mine.durability=maxDurability(mine);
   return succeed('Đã sửa cuốc bằng than và sắt');
  }
  if(action==='buy-oil'){
   if(mine.repairUntil||mine.durability===maxDurability(mine))return fail('Cuốc chưa cần bôi dầu');
   if(state.coins<150)return fail('Cần 15 Xu để mua dầu bôi trơn');
   state.coins-=150;mine.durability=Math.min(maxDurability(mine),mine.durability+25);
   return succeed('Bôi dầu: phục hồi 25 độ bền cuốc');
  }
  if(action==='buy-pick'){
   if(mine.durability===maxDurability(mine)&&!mine.repairUntil)return fail('Cuốc hiện tại vẫn còn nguyên');
   if(state.coins<800)return fail('Cần 80 Xu để mua cuốc mới');
   state.coins-=800;mine.durability=maxDurability(mine);mine.repairUntil=0;
   return succeed('Đã thay cuốc mới');
  }
  if(action==='sell-ores'){
   let total=0;
   for(const [ore,value] of Object.entries(ORE_VALUES)){
    total+=mine.ores[ore]*value;mine.ores[ore]=0;
   }
   if(!total)return fail('Chưa có quặng để bán');
   give(state,Math.floor(total*(1+.1*(mine.cart-1))));return succeed('Đã bán quặng');
  }
  if(action==='buy-seeds'){
   if(state.coins<100)return fail('Cần 10 Xu để mua 3 hạt giống');
   if(garden.seeds>9990)return fail('Kho hạt giống đã đầy');
   state.coins-=100;garden.seeds+=3;return succeed('Đã mua 3 hạt giống');
  }
  if(action==='catch-bubble'){
   if(!garden.bubbleReady)return fail('Hồ chưa có bọt khí để thu');
   garden.bubbleReady=false;garden.bubbleAt=time+bubbleInterval(garden);
   garden.bait=Math.min(10000,garden.bait+1);give(state,5);
   return succeed('Nhặt được mồi câu và 0,5 Xu');
  }
  if(action==='cast-line'){
   if(garden.line)return fail('Đã thả câu. Hãy chờ phao động');
   if(!garden.bait)return fail('Chưa có mồi câu. Hãy thu bọt trên hồ');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt câu không hợp lệ');
   const threshold=Math.max(.75,.94-.035*(garden.rod-1)-.02*(garden.pondTier-1));
   const fishId=chooseFish(roll,threshold),fish=FISH_SPECIES[fishId];
   const biteAt=time+FISH_BITE_MIN+Math.floor(roll*FISH_BITE_SPAN);
   const size=fish.min+Math.floor((fish.max-fish.min+1)*((roll*997)%1));
   garden.bait--;
   garden.line={fishId,biteAt,escapeAt:biteAt+FISH_REEL_WINDOW,rod:garden.rod,size};
   return succeed('🎣 Đã thả câu. Hãy nhìn phao và chờ cá cắn');
  }
  if(action==='reel-line'){
   const line=garden.line;
   if(!line)return fail('Chưa có dây câu đang chờ');
   if(time<line.biteAt)return fail('Cá chưa cắn câu');
   if(time>line.escapeAt)return fail('Cá đã tuột khỏi lưỡi câu');
   const fish=FISH_SPECIES[line.fishId];
   const reward=fish.rare?100+20*(line.rod-1):20+10*(line.rod-1);
   garden.line=null;garden.fish++;
   if(fish.rare)garden.rareFish++;
   garden.fishAlbum[line.fishId]=Math.min(10000000,garden.fishAlbum[line.fishId]+1);
   garden.fishBest[line.fishId]=Math.max(garden.fishBest[line.fishId],line.size);
   give(state,reward);
   return succeed(fish.icon+' '+fish.name+' · '+line.size+' cm · +'+formatXu(reward)+' Xu Arcade',
    {fishId:line.fishId,size:line.size});
  }
  const cropAction=/^crop-(bloom|mint|moon)$/.exec(action||'');
  if(cropAction){
   const crop=cropAction[1];if(!cropUnlocked(garden,crop))return fail('Hãy thu hoạch thêm để mở giống này');
   garden.crop=crop;return succeed('Đã chọn '+CROPS[crop].name);
  }
  if(action==='water-all'){
   if(!garden.sprinkler)return fail('Cần lắp hệ thống tưới trước');
   const dry=garden.beds.filter(b=>b.status==='dry');
   if(!dry.length)return fail('Không có luống cần tưới');
   if(!garden.water)return fail('Bình đã hết nước');
   const count=Math.min(dry.length,garden.water);
   dry.slice(0,count).forEach(b=>{
    b.status='growing';b.readyAt=time+Math.floor(CROPS[b.crop].grow*(garden.sprinkler>=2?.8:1));
   });
   garden.water-=count;if(garden.water<garden.waterCap)garden.waterAt=time;
   return succeed('💧 Đã tưới '+count+' luống');
  }
  if(action==='harvest-all'){
   const ready=garden.beds.filter(b=>b.status==='growing'&&time>=b.readyAt);
   if(!ready.length)return fail('Chưa có cây nào chín');
   let total=0;
   for(const bed of ready){total+=CROPS[bed.crop].value;bed.status='empty';bed.readyAt=0;
    garden.harvests++;garden.seeds=Math.min(10000,garden.seeds+1);}
   give(state,total);return succeed('✦ Thu '+ready.length+' luống: +'+formatXu(total)+' Xu Arcade');
  }
  const bedMatch=/^(plant|water|harvest)-([0-3])$/.exec(action||'');
  if(bedMatch){
   const index=Number(bedMatch[2]),bed=garden.beds[index],verb=bedMatch[1];
   if(!bed)return fail('Luống này chưa được mở');
   if(verb==='plant'){
    if(bed.status!=='empty'||!garden.seeds)return fail('Ô trồng chưa trống hoặc thiếu hạt');
    garden.seeds--;bed.crop=garden.crop;bed.status='dry';return succeed('Đã gieo '+CROPS[bed.crop].name+' ở ô '+(index+1));
   }
   if(verb==='water'){
    if(bed.status!=='dry'||!garden.water)return fail('Ô này không cần tưới hoặc bình đã hết nước');
    garden.water--;if(garden.water<garden.waterCap)garden.waterAt=time;
    bed.status='growing';bed.readyAt=time+Math.floor(CROPS[bed.crop].grow*(garden.sprinkler>=2?.8:1));
    return succeed('Cây bắt đầu lớn lên');
   }
   if(verb==='harvest'){
    if(bed.status!=='growing'||time<bed.readyAt)return fail('Cây chưa đến lúc thu hoạch');
    bed.status='empty';bed.readyAt=0;garden.harvests++;garden.seeds=Math.min(10000,garden.seeds+1);
    give(state,CROPS[bed.crop].value);return succeed('Thu '+CROPS[bed.crop].name+' +'+formatXu(CROPS[bed.crop].value)+' Xu và 1 hạt');
   }
  }
  return fail('Thao tác chưa được hỗ trợ');
 }
 const formatXu=tenths=>(tenths/10).toLocaleString('vi-VN',{maximumFractionDigits:1});
 return Object.freeze({fresh,norm,advance,act,rate,upgradeCost,formatXu,
  neonCapacity,neonService,NEON_SERVICE_INTERVAL,NEON_ORDER_COOLDOWN,neonOrderPattern,mineProbeTarget,
  WATER_INTERVAL,REPAIR_INTERVAL,GROW_INTERVAL,BUBBLE_INTERVAL,ORE_VALUES,ORE_NAMES,
  CROPS,FISH_SPECIES,FISH_REEL_WINDOW,maxCharge,zoneUnlocked,cropUnlocked,maxDurability,bubbleInterval,
  JADE:jadeGame});
});
