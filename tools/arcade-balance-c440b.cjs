/* C4.40B: reproducible, read-only Arcade balance scenarios.
 * Run: node tools/arcade-balance-c440b.cjs
 * All amounts are local Arcade Xu, not the spendable wallet.
 */
'use strict';
const arcade=require('../js/personal-arcade-core-v1.js');
const jade=require('../js/personal-jade-core-v1.js');
const START=1793510000000;
const SAMPLE_SIZE=20000;
const ROLL_STEP=.61803398875;
const xu=tenths=>+(tenths/10).toFixed(2);

function neonSession({stations=1,roomTier=1,seating=1,ambiance=1,snack=0,
 minutes=30,days=1}={}){
 let state=arcade.fresh(START);
 Object.assign(state.neon,{stations,roomTier,seating,ambiance,snack});
 for(let day=0;day<days;day++){
  const at=START+day*86400000+minutes*60000;
  state=arcade.advance(state,at,minutes*60000);
 }
 return {sessions:days,minutesPerSession:minutes,stations,
  coinsXu:xu(state.coins),guests:state.neon.guestsServed};
}

function jadeMarket(site,attempts=SAMPLE_SIZE){
 const market=jade.MARKETS[site],cost=market.price+jade.cuttingFee(site);
 const versions=[2,3].map(version=>{
  let total=0,wins=0,duds=0,best=0;
  for(let i=0;i<attempts;i++){
   const sample=jade.generate(site,i+1,(i*ROLL_STEP)%1);
   sample.payoutV=version;
   const paid=jade.cutValue(sample,1);
   total+=paid-cost;wins+=paid>cost;duds+=sample.grade===0;
   best=Math.max(best,paid);
  }
  return {version,netPerStoneXu:+(total/attempts/10).toFixed(2),
   profitablePct:+(wins/attempts*100).toFixed(1),
   wastePct:+(duds/attempts*100).toFixed(1),maxPayoutXu:xu(best)};
 });
 return {site,market:market.short,priceXu:xu(market.price),cutFeeXu:xu(jade.cuttingFee(site)),
  attempts,legacyV2:versions[0],newV3:versions[1]};
}

function mineSample(zone,attempts=1000){
 let state=arcade.fresh(START);
 state.mine.dug=160;state.mine.lantern=3;state.mine.zone=zone;
 let repairCycles=0;
 for(let i=0;i<attempts;i++){
  // Pure yield ceiling: hypothetical free repair between blocks of 100 digs.
  // No claim that the user can mine this quickly in real play.
  if(state.mine.durability===0){state.mine.durability=100;repairCycles++;}
  const result=arcade.act(state,'mine',START,(i*ROLL_STEP)%1);
  if(!result.ok)throw new Error(result.reason);
  state=result.state;
 }
 const sold=arcade.act(state,'sell-ores',START);
 if(!sold.ok)throw new Error(sold.reason);
 return {zone,digs:attempts,repairsIgnoredTime:repairCycles,
  grossXu:xu(sold.state.coins),per100DigsXu:+(sold.state.coins/attempts*10).toFixed(2),
  relicsFound:state.mine.found.relic,meteorsFound:state.mine.found.meteor};
}

function fishCatchCeiling(rod,pondTier,premium){
 const baseline=Math.max(.75,.94-.035*(rod-1)-.02*(pondTier-1));
 const threshold=premium?Math.max(.57,baseline-.18):baseline;
 const rareChance=1-threshold;
 const averageTenths=rareChance*(100+20*(rod-1))+
  (1-rareChance)*(20+10*(rod-1));
 const baitCostTenths=premium?30:14;
 // Assumes every cast succeeds and ignores time, snap-line losses and bubbles.
 return {rod,pondTier,premium,rarePct:+(rareChance*100).toFixed(1),
  netPerSuccessfulCastXu:xu(averageTenths-baitCostTenths)};
}

function report(){return {
 sampleSize:SAMPLE_SIZE,
 note:'Mô phỏng định lượng, không phải dữ liệu người chơi; các cấu hình nâng cấp cao là trạng thái giả định, không tính thời gian mua thiết bị.',
 neon:[neonSession(),neonSession({minutes:30,days:7}),
  neonSession({stations:3,seating:3,minutes:120}),
  neonSession({stations:7,roomTier:3,seating:5,ambiance:3,snack:2,minutes:60})],
 mine:[mineSample(0),mineSample(2)],
 garden:[fishCatchCeiling(1,1,false),fishCatchCeiling(1,1,true),
  fishCatchCeiling(5,5,false),fishCatchCeiling(5,5,true)],
 jade:jade.MARKETS.map((_,site)=>jadeMarket(site))};}

if(require.main===module)console.log(JSON.stringify(report(),null,2));
module.exports={neonSession,jadeMarket,mineSample,fishCatchCeiling,report,SAMPLE_SIZE};
