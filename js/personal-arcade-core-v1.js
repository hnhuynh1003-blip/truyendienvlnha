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
 const ECONOMY_VERSION=2;
 const number=(value,min,max,fallback)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:fallback;
 const safeTime=t=>Number.isSafeInteger(t)&&t>=0?t:Date.now();
 const clamp=(n,max)=>Math.min(max,Math.max(0,n));
 const copy=value=>JSON.parse(JSON.stringify(value));
 const fresh=(now=Date.now())=>{
  const time=safeTime(now);
  return {version:1,lastAt:time,coins:0,earned:0,
   neon:{cpu:1,gpu:1,stations:1,running:true,remainder:0,economyV:ECONOMY_VERSION},
   mine:{durability:100,repairUntil:0,dug:0,ores:{stone:0,coal:0,iron:0,crystal:0}},
   garden:{water:1,waterAt:time,seeds:3,beds:[{status:'empty',readyAt:0},{status:'empty',readyAt:0}],
    bubbleAt:time+BUBBLE_INTERVAL,bubbleReady:false,bait:0,harvests:0}};
 };
 function norm(raw,now=Date.now()){
  const time=safeTime(now),fallback=fresh(time);
  if(!raw||raw.version!==1||typeof raw!=='object')return fallback;
  const source=raw,neon=source.neon||{},mine=source.mine||{},garden=source.garden||{};
  const state=copy(fallback);
  state.lastAt=number(source.lastAt,0,time,time);
  state.coins=number(source.coins,0,MAX_COIN,0);
  state.earned=number(source.earned,0,MAX_COIN,0);
  state.neon={cpu:number(neon.cpu,1,50,1),gpu:number(neon.gpu,1,20,1),
   stations:number(neon.stations,1,3,1),economyV:ECONOMY_VERSION,
   running:neon.running!==false,
   // Convert unfinished sub-Xu earnings from the earlier 0.1 Xu/s economy.
   remainder:neon.economyV===ECONOMY_VERSION?
    number(neon.remainder,0,99999,0):number(neon.remainder,0,999,0)*100};
  state.mine={durability:number(mine.durability,0,100,100),
   repairUntil:number(mine.repairUntil,0,time+REPAIR_INTERVAL*2,0),
   dug:number(mine.dug,0,10000000,0),ores:{}};
  for(const ore of Object.keys(ORE_VALUES))
   state.mine.ores[ore]=number(mine.ores?.[ore],0,1000000,0);
  state.garden.water=number(garden.water,0,3,1);
  state.garden.waterAt=number(garden.waterAt,0,time,time);
  state.garden.seeds=number(garden.seeds,0,10000,3);
  state.garden.beds=Array.from({length:2},(_,i)=>{
   const bed=garden.beds?.[i]||{};
   const status=['empty','dry','growing'].includes(bed.status)?bed.status:'empty';
   return {status,readyAt:status==='growing'?number(bed.readyAt,0,time+GROW_INTERVAL*2,time):0};
  });
  state.garden.bubbleAt=number(garden.bubbleAt,0,time+BUBBLE_INTERVAL*2,time+BUBBLE_INTERVAL);
  state.garden.bubbleReady=garden.bubbleReady===true;
  state.garden.bait=number(garden.bait,0,10000,0);
  state.garden.harvests=number(garden.harvests,0,1000000,0);
  return state;
 }
 // Thousandths of game Xu per second: starts at 0.01 Xu/s (36 Xu/hour),
 // with additive CPU/GPU gains rather than explosive multiplicative scaling.
 const rate=state=>(10+3*(state.neon.cpu-1)+4*(state.neon.gpu-1))*state.neon.stations;
 const upgradeCost=(state,type)=>type==='cpu'?400*state.neon.cpu*state.neon.cpu:
  type==='gpu'?900*state.neon.gpu*state.neon.gpu:
  type==='station'&&state.neon.stations<3?800*state.neon.stations*state.neon.stations:null;
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
   const milli=state.neon.remainder+idle*rate(state);
   give(state,Math.floor(milli/100000));
   state.neon.remainder=milli%100000;
  }
  if(state.mine.repairUntil&&time>=state.mine.repairUntil){
   state.mine.durability=100;state.mine.repairUntil=0;
  }
  const garden=state.garden;
  if(garden.water<3){
   const refill=Math.floor(Math.max(0,time-garden.waterAt)/WATER_INTERVAL);
   if(refill>0){
    garden.water=Math.min(3,garden.water+refill);
    garden.waterAt=garden.water===3?time:garden.waterAt+refill*WATER_INTERVAL;
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
  if(action==='mine'){
   if(mine.repairUntil)return fail('Cuốc đang tự sửa chữa');
   if(!mine.durability)return fail('Cuốc đã hết độ bền');
   if(typeof roll!=='number'||roll<0||roll>=1)return fail('Lượt đào không hợp lệ');
   const ore=roll<0.45?'stone':roll<0.75?'coal':roll<0.95?'iron':'crystal';
   mine.durability--;mine.dug++;
   mine.ores[ore]=Math.min(1000000,mine.ores[ore]+1);
   return succeed(ore);
  }
  if(action==='repair-wait'){
   if(mine.repairUntil||mine.durability===100)return fail('Cuốc chưa cần sửa');
   mine.repairUntil=time+REPAIR_INTERVAL;
   return succeed('Bắt đầu tự sửa chữa trong 4 phút');
  }
  if(action==='repair-forge'){
   if(mine.durability===100||mine.repairUntil)return fail('Không thể rèn cuốc lúc này');
   if(mine.ores.coal<5||mine.ores.iron<2)return fail('Cần 5 than và 2 sắt để sửa ngay');
   mine.ores.coal-=5;mine.ores.iron-=2;mine.durability=100;
   return succeed('Đã sửa cuốc bằng than và sắt');
  }
  if(action==='buy-oil'){
   if(mine.repairUntil||mine.durability===100)return fail('Cuốc chưa cần bôi dầu');
   if(state.coins<150)return fail('Cần 15 Xu để mua dầu bôi trơn');
   state.coins-=150;mine.durability=Math.min(100,mine.durability+25);
   return succeed('Bôi dầu: phục hồi 25 độ bền cuốc');
  }
  if(action==='buy-pick'){
   if(mine.durability===100&&!mine.repairUntil)return fail('Cuốc hiện tại vẫn còn nguyên');
   if(state.coins<800)return fail('Cần 80 Xu để mua cuốc mới');
   state.coins-=800;mine.durability=100;mine.repairUntil=0;
   return succeed('Đã thay cuốc mới, độ bền 100/100');
  }
  if(action==='sell-ores'){
   let total=0;
   for(const [ore,value] of Object.entries(ORE_VALUES)){
    total+=mine.ores[ore]*value;mine.ores[ore]=0;
   }
   if(!total)return fail('Chưa có quặng để bán');
   give(state,total);return succeed('Đã bán quặng');
  }
  if(action==='buy-seeds'){
   if(state.coins<100)return fail('Cần 10 Xu để mua 3 hạt giống');
   if(garden.seeds>9990)return fail('Kho hạt giống đã đầy');
   state.coins-=100;garden.seeds+=3;return succeed('Đã mua 3 hạt giống');
  }
  if(action==='catch-bubble'){
   if(!garden.bubbleReady)return fail('Hồ chưa có bọt khí để thu');
   garden.bubbleReady=false;garden.bubbleAt=time+BUBBLE_INTERVAL;
   garden.bait=Math.min(10000,garden.bait+1);give(state,5);
   return succeed('Nhặt được mồi câu và 0,5 Xu');
  }
  const bedMatch=/^(plant|water|harvest)-([01])$/.exec(action||'');
  if(bedMatch){
   const index=Number(bedMatch[2]),bed=garden.beds[index],verb=bedMatch[1];
   if(verb==='plant'){
    if(bed.status!=='empty'||!garden.seeds)return fail('Ô trồng chưa trống hoặc thiếu hạt');
    garden.seeds--;bed.status='dry';return succeed('Đã gieo hạt ở ô '+(index+1));
   }
   if(verb==='water'){
    if(bed.status!=='dry'||!garden.water)return fail('Ô này không cần tưới hoặc bình đã hết nước');
    garden.water--;if(garden.water===2)garden.waterAt=time;
    bed.status='growing';bed.readyAt=time+GROW_INTERVAL;
    return succeed('Cây bắt đầu lớn lên');
   }
   if(verb==='harvest'){
    if(bed.status!=='growing'||time<bed.readyAt)return fail('Cây chưa đến lúc thu hoạch');
    bed.status='empty';bed.readyAt=0;garden.harvests++;garden.seeds=Math.min(10000,garden.seeds+1);
    give(state,50);return succeed('Thu hoạch +5 Xu và 1 hạt giống');
   }
  }
  return fail('Thao tác chưa được hỗ trợ');
 }
 const formatXu=tenths=>(tenths/10).toLocaleString('vi-VN',{maximumFractionDigits:1});
 return Object.freeze({fresh,norm,advance,act,rate,upgradeCost,formatXu,
  WATER_INTERVAL,REPAIR_INTERVAL,GROW_INTERVAL,BUBBLE_INTERVAL,ORE_VALUES});
});
