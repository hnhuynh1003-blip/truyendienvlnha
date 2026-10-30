/* DUDU personal arcade V1 — three local-only games. Never writes the real wallet.
 * State is deterministic given the time and a caller-supplied mining roll.
 * All coins in this module are *tenths* of a fictional game Xu.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalArcadeCoreV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const WATER_INTERVAL=15*60*1000,REPAIR_INTERVAL=4*60*1000;
 const GROW_INTERVAL=3*60*1000,BUBBLE_INTERVAL=90*1000;
 const MAX_COIN=1000000000,MAX_IDLE_MS=12*60*60*1000;
 // Values are tenths of game Xu. Manual clicks should matter without making
 // a single ore run worth several hundred Xu.
 const ORE_VALUES=Object.freeze({stone:2,coal:3,iron:6,crystal:20});
 const ORE_NAMES=Object.freeze({stone:'Đá',coal:'Than',iron:'Sắt',crystal:'Tinh thạch'});
 const CROPS=Object.freeze({bloom:{name:'Hoa sương',grow:GROW_INTERVAL,value:50},
  mint:{name:'Lá bạc hà',grow:GROW_INTERVAL*2,value:100},
  moon:{name:'Hoa nguyệt',grow:GROW_INTERVAL*3,value:200}});
 const ECONOMY_VERSION=2;
 const number=(value,min,max,fallback)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:fallback;
 const safeTime=t=>Number.isSafeInteger(t)&&t>=0?t:Date.now();
 const clamp=(n,max)=>Math.min(max,Math.max(0,n));
 const copy=value=>JSON.parse(JSON.stringify(value));
 const fresh=(now=Date.now())=>{
  const time=safeTime(now);
  return {version:1,lastAt:time,coins:0,earned:0,
   neon:{cpu:1,gpu:1,stations:1,router:1,skin:0,cooling:1,turboUntil:0,turboReadyAt:0,
    contracts:[],running:true,remainder:0,economyV:ECONOMY_VERSION},
   mine:{durability:100,pickLevel:1,drillLevel:1,lantern:1,cart:1,scanner:0,
    zone:0,charge:0,bursts:0,repairUntil:0,dug:0,
    ores:{stone:0,coal:0,iron:0,crystal:0}},
   garden:{water:1,waterCap:3,pondTier:1,waterAt:time,seeds:3,plots:2,
    crop:'bloom',sprinkler:0,rod:1,fish:0,rareFish:0,
    beds:[{status:'empty',readyAt:0,crop:'bloom'},{status:'empty',readyAt:0,crop:'bloom'}],
    bubbleAt:time+BUBBLE_INTERVAL,bubbleReady:false,bait:0,harvests:0}};
 };
 const maxDurability=mine=>100+25*(mine.pickLevel-1);
 const bubbleInterval=garden=>BUBBLE_INTERVAL-10000*(garden.pondTier-1);
 function norm(raw,now=Date.now()){
  const time=safeTime(now),fallback=fresh(time);
  if(!raw||raw.version!==1||typeof raw!=='object')return fallback;
  const source=raw,neon=source.neon||{},mine=source.mine||{},garden=source.garden||{};
  const state=copy(fallback);
  state.lastAt=number(source.lastAt,0,time,time);
  state.coins=number(source.coins,0,MAX_COIN,0);
  state.earned=number(source.earned,0,MAX_COIN,0);
  state.neon={cpu:number(neon.cpu,1,50,1),gpu:number(neon.gpu,1,20,1),
   stations:number(neon.stations,1,3,1),router:number(neon.router,1,10,1),
   skin:number(neon.skin,0,2,0),cooling:number(neon.cooling,1,5,1),
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
   dug:number(mine.dug,0,10000000,0),ores:{}};
  for(const ore of Object.keys(ORE_VALUES))
   state.mine.ores[ore]=number(mine.ores?.[ore],0,1000000,0);
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
  type==='station'&&state.neon.stations<3?800*state.neon.stations*state.neon.stations:
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
  state.lastAt=time;
  return state;
 }
 function act(raw,action,now=Date.now(),roll=0.5){
  const time=safeTime(now),state=advance(raw,time,0);
  const fail=reason=>({ok:false,reason,state});
  const succeed=(label)=>({ok:true,label,state});
  const garden=state.garden,mine=state.mine;
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
  const contract=/^neon-contract-([012])$/.exec(action||'');
  if(contract){
   const i=Number(contract[1]),ready=[state.neon.cpu>=2,state.neon.stations>=2,
    state.neon.router>=3][i];
   if(!ready||state.neon.contracts.includes(i))return fail('Đơn hàng chưa hoàn thành hoặc đã nhận');
   state.neon.contracts.push(i);give(state,[50,120,180][i]);
   return succeed('✦ Hoàn tất hợp đồng, nhận '+formatXu([50,120,180][i])+' Xu Arcade');
  }
  if(action==='cpu'||action==='gpu'){
   const cost=upgradeCost(state,action),level=state.neon[action];
   if(level>=(action==='cpu'?50:20))return fail('Đã nâng cấp tối đa');
   if(state.coins<cost)return fail('Chưa đủ Xu trong trò chơi');
   state.coins-=cost;state.neon[action]++;
   return succeed('Đã nâng cấp '+action.toUpperCase());
  }
  if(action==='station'){
   if(state.neon.stations>=3)return fail('Phòng máy đã mở đủ ba dàn');
   const cost=upgradeCost(state,'station');
   if(state.coins<cost)return fail('Chưa đủ Xu để lắp thêm dàn máy');
   state.coins-=cost;state.neon.stations++;
   return succeed('Đã lắp dàn máy số '+state.neon.stations);
  }
  if(['router','skin','cooling','pick-level','drill-level','lantern','cart',
   'water-cap','pond-tier','plots','sprinkler','rod'].includes(action)){
   const cost=upgradeCost(state,action);
   if(cost===null)return fail('Nâng cấp này đã đạt giới hạn');
   if(state.coins<cost)return fail('Chưa đủ Xu trò chơi để nâng cấp');
   state.coins-=cost;
   if(action==='router')state.neon.router++;
   if(action==='skin')state.neon.skin++;
   if(action==='cooling')state.neon.cooling++;
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
   const quality=mine.drillLevel-1,depth=mine.zone,scan=mine.scanner;
   const crystalThreshold=.95-.01*quality-.035*depth-.02*scan;
   const ironThreshold=.75-.01*quality-.07*depth-.015*scan;
   const coalThreshold=.45-.02*quality-.065*depth-.01*scan;
   const ore=value<coalThreshold?'stone':value<ironThreshold?'coal':
    value<crystalThreshold?'iron':'crystal';
   mine.durability--;mine.dug++;
   mine.ores[ore]=Math.min(1000000,mine.ores[ore]+1);
   if(charge)mine.charge=Math.min(maxCharge(mine),mine.charge+1);
   return ore;
  };
  if(action==='mine'){
   if(mine.repairUntil)return fail('Cuốc đang tự sửa chữa');
   if(!mine.durability)return fail('Cuốc đã hết độ bền');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt đào không hợp lệ');
   return succeed(dig(roll));
  }
  if(action==='mine-burst'){
   if(mine.repairUntil||mine.durability<3)return fail('Cuốc cần ít nhất 3 độ bền');
   if(mine.charge<5)return fail('Cần 5 năng lượng để phá mạch quặng');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt đào không hợp lệ');
   mine.charge-=5;mine.bursts++;
   const ores=[roll,(roll+.37)%1,(roll+.71)%1].map(v=>dig(v,false));
   return succeed('⚡ Phá mạch: '+ores.map(ore=>ORE_NAMES[ore]).join(' · '));
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
   if(!garden.bait)return fail('Chưa có mồi câu. Hãy thu bọt trên hồ');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt câu không hợp lệ');
   garden.bait--;garden.fish++;
   const rare=roll>=Math.max(.75,.94-.035*(garden.rod-1)-.02*(garden.pondTier-1));
   if(rare)garden.rareFish++;
   const reward=rare?100+20*(garden.rod-1):20+10*(garden.rod-1);
   give(state,reward);
   return succeed(rare?'✦ Cá ánh trăng! +'+formatXu(reward)+' Xu':'🐟 Câu được cá! +'+formatXu(reward)+' Xu');
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
  WATER_INTERVAL,REPAIR_INTERVAL,GROW_INTERVAL,BUBBLE_INTERVAL,ORE_VALUES,
  CROPS,maxCharge,zoneUnlocked,cropUnlocked,maxDurability,bubbleInterval});
});
