/* CASINO-DESIGN1 — REVIEWED GAME MATH AND SHOP DEFINITIONS ONLY.
 * Not loaded by index.html. Does not buy, roll for money, mint or spend Xu.
 * Later wallet-bound implementations require approved atomic server receipts.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduCasinoDesignV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION=1,MIN_BET=10,MAX_BET=50;
 const BETS=Object.freeze([10,20,50]);
 // Weights are percentages out of exactly 100. Every visible symbol is
 // independently precommitted before reveal; three HORIZONTAL paylines.
 const SYMBOLS=Object.freeze([
  {id:'star',name:'Tinh Tú',icon:'⭐',weight:26,triple:5},
  {id:'bell',name:'Chuông Ngọc',icon:'🔔',weight:22,triple:6},
  {id:'peach',name:'Đào Tiên',icon:'🍑',weight:18,triple:8},
  {id:'jade',name:'Bích Ngọc',icon:'💎',weight:14,triple:12},
  {id:'dragon',name:'Kim Long',icon:'🐉',weight:10,triple:20},
  {id:'phoenix',name:'Phượng Hoàng',icon:'🪶',weight:6,triple:35},
  {id:'crown',name:'Thiên Miện',icon:'👑',weight:4,triple:70}
 ].map(Object.freeze));
 const index=new Map(SYMBOLS.map(s=>[s.id,s]));
 const MAX_ROLL=1000000;
 // Payout multipliers are on the TOTAL spin bet, not on three separate bets.
 // A pair on one horizontal payline returns bet/10 (10% of the stake).
 function pick(roll){
  if(!Number.isSafeInteger(roll)||roll<0||roll>=MAX_ROLL)return null;
  let upper=0;
  for(const symbol of SYMBOLS){upper+=symbol.weight*10000;
   if(roll<upper)return symbol.id;}
  return null;
 }
 function grid(rolls){
  if(!Array.isArray(rolls)||rolls.length!==9)return null;
  const symbols=rolls.map(pick);
  if(symbols.some(s=>!s))return null;
  return [symbols.slice(0,3),symbols.slice(3,6),symbols.slice(6,9)];
 }
 function slotQuote({bet,rows}={}){
  if(!BETS.includes(bet)||!Array.isArray(rows)||rows.length!==3||
   !rows.every(row=>Array.isArray(row)&&row.length===3&&row.every(s=>index.has(s))))
   return {ok:false,reason:'invalid-spin'};
  const lines=rows.map((row,number)=>{
   const triple=row[0]===row[1]&&row[1]===row[2];
   const pair=!triple&&(row[0]===row[1]||row[0]===row[2]||row[1]===row[2]);
   const payout=triple?bet*index.get(row[0]).triple:pair?bet/10:0;
   return {line:number+1,kind:triple?'triple':pair?'pair':'none',payout};
  });
  const payout=lines.reduce((sum,line)=>sum+line.payout,0);
  return {ok:true,bet,payout,net:payout-bet,lines,
   outcome:payout>bet?'win':payout===bet?'even':'loss'};
 }
 function slotRtp(){
  let triples=0,pairs=0;
  for(const item of SYMBOLS){
   const p=item.weight/100;
   triples+=p*p*p*item.triple;
   pairs+=3*p*p*(1-p)*.1;
  }
  return 3*(triples+pairs);
 }
 // Five original tower stages; 2/3, 2/3, 1/2, 1/2, 1/3 safe paths.
 // Multipliers in tenths allow integer Xu for all valid bets. For each
 // cash-out stage E[payout] remains below the original stake before charms.
 const TOWER=Object.freeze([
  {floor:1,title:'Bậc Khai Môn',gates:3,safe:2,multiplierTenths:13},
  {floor:2,title:'Hành Lang Sao',gates:3,safe:2,multiplierTenths:20},
  {floor:3,title:'Gương Nguyệt',gates:2,safe:1,multiplierTenths:40},
  {floor:4,title:'Cổng Tinh Tú',gates:2,safe:1,multiplierTenths:80},
  {floor:5,title:'Đỉnh Vận Mệnh',gates:3,safe:1,multiplierTenths:240}
 ].map(Object.freeze));
 function towerQuote({bet,floor}={}){
  if(!BETS.includes(bet)||!Number.isSafeInteger(floor)||floor<1||floor>TOWER.length)
   return {ok:false,reason:'invalid-tower-quote'};
  const stage=TOWER[floor-1];
  return {ok:true,bet,floor,payout:bet*stage.multiplierTenths/10,
   multiplier:stage.multiplierTenths/10};
 }
 function towerRtp(){
  let reach=1;
  return TOWER.map(stage=>{
   reach*=stage.safe/stage.gates;
   return {floor:stage.floor,reach,rtp:reach*stage.multiplierTenths/10};
  });
 }
 // Proposed prices, NOT activated. Effects can influence real probabilities
 // only after economy review, odds simulation and owner approval.
 const SHOP=Object.freeze([
  {id:'casino-star-seal',name:'Ấn Khóa Trục',icon:'🌟',category:'consumable',game:'slot',price:12,
   effect:'lock-one-reel',limit:'one-per-spin'},
  {id:'casino-moon-reroll',name:'Bùa Đổi Trục',icon:'🌙',category:'consumable',game:'slot',price:15,
   effect:'reroll-one-reel',limit:'one-per-spin'},
  {id:'casino-lens',name:'Kính Thiên Cơ',icon:'🔮',category:'consumable',game:'tower',price:20,
   effect:'reveal-one-unsafe-gate',limit:'one-per-run'},
  {id:'casino-ward',name:'Hộ Mệnh Phù',icon:'🛡️',category:'consumable',game:'tower',price:25,
   effect:'return-quarter-stake-on-first-loss',limit:'one-per-run'},
  {id:'casino-violet-table',name:'Bàn Pha Lê Tím',icon:'💜',category:'decor',game:'shared',price:90,
   effect:'visual-only',limit:'permanent'},
  {id:'casino-royal-reels',name:'Khung Máy Hoàng Kim',icon:'🎰',category:'decor',game:'slot',price:180,
   effect:'visual-only',limit:'permanent'},
  {id:'casino-obsidian-cards',name:'Bộ Bài Hắc Nguyệt',icon:'🃏',category:'decor',game:'shared',price:120,
   effect:'visual-only',limit:'permanent'},
  {id:'casino-star-lantern',name:'Đèn Sao Vạn Giới',icon:'🏮',category:'decor',game:'shared',price:150,
   effect:'visual-only',limit:'permanent'}
 ].map(Object.freeze));
 const shopIndex=new Map(SHOP.map(item=>[item.id,item]));
 function validate(){
  const symbolSum=SYMBOLS.reduce((sum,item)=>sum+item.weight,0);
  return {ok:symbolSum===100&&index.size===SYMBOLS.length&&
   shopIndex.size===SHOP.length&&SHOP.every(item=>Number.isSafeInteger(item.price)&&
    item.price>0&&['consumable','decor'].includes(item.category)),
   symbolSum,slotRtp:slotRtp(),towerRtp:towerRtp()};
 }
 return Object.freeze({VERSION,MIN_BET,MAX_BET,BETS,SYMBOLS,SHOP,TOWER,
  pick,grid,slotQuote,slotRtp,towerQuote,towerRtp,
  item:id=>shopIndex.get(id)||null,validate});
});
