/* DUDU Arcade · Ngọc Phường — local-only stone appraisal and craft simulation.
 * Shared currency is fictional Arcade Xu (stored in tenths), NEVER main-wallet Xu.
 * Every stone's internal composition is fixed at purchase, including on reload.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalJadeCoreV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX=1000000000;
 const MAX_STONES=12;
 const MAX_VAULT=30;
 const MARKETS=Object.freeze([
  {name:'Chợ Đêm Vỉa Hè',short:'Chợ Đêm',price:50,skin:'Vỏ cuội xám',detail:'Hàng rẻ, phế thạch nhiều. Cơ hội đổi đời từ một viên nhỏ.',unlock:'Luôn mở'},
  {name:'Mỏ Sông Mộc Khảm',short:'Mộc Khảm',price:140,skin:'Cát vàng nhẵn',detail:'Thủy đầu dịu, ngọc đều màu, phù hợp người thận trọng.',unlock:'Bán 3 viên · Đèn cấp 2'},
  {name:'Hầm Quặng Mạc Tây Cát',short:'Mạc Tây Cát',price:420,skin:'Vỏ rỉ sét',detail:'Lô băng chủng cao giá, cần kỹ năng đoán thớ.',unlock:'Bán 12 viên · Cưa cấp 2'},
  {name:'Tử Địa Hắc Ô Sa',short:'Hắc Ô Sa',price:1350,skin:'Hắc sa dày',detail:'Đèn khó xuyên vỏ. Có cơ hội gặp Đế Vương Lục.',unlock:'Bán 25 viên · Đèn cấp 3 · Thợ cấp 2'},
  {name:'Rãnh Nứt Tàn Tích',short:'Tàn Tích',price:4000,skin:'Thiên thạch dị tinh',detail:'Khoáng thạch mang vân tinh tú, chỉ mở cho chủ xưởng lão luyện.',unlock:'Bán 40 viên · Giấy phép'}
 ]);
 const GRADES=Object.freeze(['Phế thạch','Đậu Chủng','Nhu Chủng','Phù Dung Chủng','Kim Ti Chủng','Băng Chủng','Kính Chủng','Long Thạch Chủng']);
 const COLORS=Object.freeze(['Bạch Ngọc','Thúy Lục','Dương Lục','Tử La Lan','Hồng Phỉ','Mặc Thúy','Đế Vương Lục','Tam Thải']);
 const COLOR_HEX=Object.freeze(['#e7f3e7','#41bc8f','#b2d76c','#b98de6','#e98679','#193a3d','#05ac68','#e9bb8b']);
 const FLAWS=Object.freeze(['perfect','fracture','inclusion','mutation','skin']);
 const FLAW_NAMES=Object.freeze({perfect:'Hoàn hảo',fracture:'Nứt ăn sâu',inclusion:'Hắc điểm',mutation:'Hóa băng',skin:'Kháo bì'});
 const CRAFTS=Object.freeze({bangle:{name:'Vòng tay',mult:1.75,min:5},pendant:{name:'Mặt dây chuyền',mult:1.45,min:2},ring:{name:'Mặt nhẫn',mult:1.25,min:1},beads:{name:'Chuỗi hạt',mult:1.12,min:1}});
 const gradeMult=[0,.85,1.25,1.8,2.7,4.2,6.5,11];
 const colorMult=[1,1.25,1.65,1.7,2.1,1.9,4.6,3.8];
 // C4.9: high-tier stones retain their rare jackpots without making every
 // average purchase fund the whole workshop. Legacy stones keep old pricing.
 const payoutScale=[1,.8,.34,.30,.15];
 const RESCUE_INTERVAL=10*60*1000;
 const gradeOdds=[
  [70,15,9,5,1,0,0,0],
  [20,12,28,23,11,5,1,0],
  [14,3,9,20,22,24,7,1],
  [38,1,3,9,16,20,10,3],
  [12,0,0,0,5,28,40,15]
 ];
 const colorOdds=[
  [28,32,17,12,6,5,0,0],
  [22,28,18,13,9,8,1,1],
  [19,27,15,15,10,10,2,2],
  [12,17,13,13,10,16,13,6],
  [10,15,12,15,13,12,11,12]
 ];
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 const integer=(n,min,max,fallback)=>Number.isSafeInteger(n)&&n>=min&&n<=max?n:fallback;
 const pick=(weights,r)=>{let x=r*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){x-=weights[i];if(x<0)return i;}return weights.length-1;};
 const randomFrom=seed=>{let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};};
 function unlocked(j,site){
  return site===0||site===1&&j.sold>=3&&j.lamp>=2||
   site===2&&j.sold>=12&&j.saw>=2||
   site===3&&j.sold>=25&&j.lamp>=3&&j.carver>=2||
   site===4&&j.sold>=40&&j.permit;
 }
 const fresh=()=>({bought:0,cut:0,sold:0,invested:0,received:0,lamp:1,saw:1,
  carver:1,permit:false,rescueReadyAt:0,active:null,stash:[],vault:[],
  inspected:[],album:{},exhibits:[],last:null});
 function validStone(v){
  if(!v||typeof v!=='object'||!['raw','window','cut','crafted'].includes(v.phase)||
   !Number.isSafeInteger(v.id)||v.id<1||v.id>1000000||
   !Number.isSafeInteger(v.site)||v.site<0||v.site>4||
   !Number.isSafeInteger(v.grade)||v.grade<0||v.grade>7||
   !Number.isSafeInteger(v.color)||v.color<0||v.color>7||
   !Number.isSafeInteger(v.size)||v.size<1||v.size>12||
   !FLAWS.includes(v.flaw)||!Number.isSafeInteger(v.seed)||v.seed<0||v.seed>4294967295||
   !Array.isArray(v.scans)||v.scans.length!==3||!v.scans.every(x=>typeof x==='boolean'))return null;
  if(v.phase==='crafted'&&!CRAFTS[v.craft])return null;
  return {id:v.id,site:v.site,grade:v.grade,color:v.color,size:v.size,
   flaw:v.flaw,seed:v.seed,phase:v.phase,scans:[...v.scans],
   payoutV:integer(v.payoutV,1,2,1),practice:v.practice===true,
   savedFracture:v.savedFracture===true,offer:integer(v.offer,0,MAX,0),
   cutValue:integer(v.cutValue,0,MAX,0),craft:CRAFTS[v.craft]?v.craft:null,
   craftValue:integer(v.craftValue,0,MAX,0)};
 }
 function norm(source){
  const j=fresh();if(!source||typeof source!=='object')return j;
  for(const field of ['bought','cut','sold','invested','received'])j[field]=integer(source[field],0,MAX,0);
  for(const field of ['lamp','saw','carver'])j[field]=integer(source[field],1,4,1);
  j.rescueReadyAt=integer(source.rescueReadyAt,0,Number.MAX_SAFE_INTEGER,0);
  j.permit=source.permit===true;
  j.active=validStone(source.active);
  // C4.13: only unfinished stones enter the waiting basket. Old saves with
  // an active stone continue unchanged; corrupt/duplicate stock is discarded.
  const seen=new Set(j.active?[j.active.id]:[]);
  if(Array.isArray(source.stash))for(const value of source.stash.slice(0,MAX_STONES)){
   const stone=validStone(value);
   if(stone&&['raw','window'].includes(stone.phase)&&!seen.has(stone.id)&&
     j.stash.length+(j.active?1:0)<MAX_STONES){j.stash.push(stone);seen.add(stone.id);}
  }
  if(Array.isArray(source.vault))for(const value of source.vault.slice(0,MAX_VAULT)){
   const stone=validStone(value);
   if(stone&&['cut','crafted'].includes(stone.phase)&&!seen.has(stone.id)&&
     j.vault.length<MAX_VAULT){j.vault.push(stone);seen.add(stone.id);}
  }
  if(Array.isArray(source.inspected))j.inspected=[...new Set(source.inspected.filter(x=>
   typeof x==='string'&&/^\d{1,7}:[0-4]:[0-2]$/.test(x)&&
   Number(x.split(':')[0])===j.bought+1))].slice(0,15);
  if(source.album&&typeof source.album==='object')for(let g=1;g<=7;g++)for(let c=0;c<8;c++){
   const key=g+'-'+c,n=integer(source.album[key],0,1000000,0);if(n)j.album[key]=n;
  }
  if(Array.isArray(source.exhibits))j.exhibits=source.exhibits.slice(0,40).filter(x=>
   x&&integer(x.grade,1,7,0)&&integer(x.color,0,7,-1)>=0&&integer(x.size,1,12,0)&&
   typeof x.craft==='string'&&CRAFTS[x.craft]).map(x=>({grade:x.grade,color:x.color,
    size:x.size,craft:x.craft,site:integer(x.site,0,4,0)}));
  if(source.last&&typeof source.last==='object'&&typeof source.last.label==='string')
   j.last={label:source.last.label.slice(0,110),value:integer(source.last.value,0,MAX,0)};
  return j;
 }
 function generate(site,id,roll){
  const seed=(Math.floor(clamp(Number.isFinite(roll)?roll:.5,0,.999999999)*4294967295) ^
   Math.imul(id,2654435761) ^ Math.imul(site+1,2246822519))>>>0;
  const rng=randomFrom(seed||1),grade=pick(gradeOdds[site],rng());
  let color=pick(colorOdds[site],rng());
  if(color===6&&site<3)color=1; // The Imperial-green deposit belongs to Hắc Ô Sa / Tàn Tích.
  const flaw=FLAWS[pick([15,35,25,8,17],rng())];
  return {id,site,grade,color,size:2+Math.floor(rng()*7)+(site>=2?1:0),
   flaw,seed,phase:'raw',scans:[false,false,false],payoutV:2,practice:false,savedFracture:false,
   offer:0,cutValue:0,craft:null,craftValue:0};
 }
 // A stall sample is fixed by the next stone ID, market and tray position.
 // Visible surface signs are only imperfect clues, never a guaranteed grade.
 function surface(stone){
  const size=stone.size>=8?'Cỡ lớn':stone.size>=5?'Cỡ vừa':'Cỡ nhỏ';
  const marks=stone.flaw==='fracture'?'Có nét rạn mờ':stone.flaw==='skin'?
   'Rêu bì đậm':stone.grade>=4&&stone.seed%3!==0?'Mãng đới nhạt':
   stone.seed%2?'Bì lốm đốm':'Vỏ ít dấu hiệu';
  return {size,marks,skin:MARKETS[stone.site].skin};
 }
 function marketOffer(j,site,slot){
  const id=j.bought+1;
  const seed=(Math.imul(id+17,1597334677)^Math.imul(site+7,2246822519)^
   Math.imul(slot+31,3266489917))>>>0;
  const stone=generate(site,id,seed/4294967296);
  const ask=Math.max(1,Math.round(MARKETS[site].price*(.8+(seed%9)*.05)));
  return {stone,ask,...surface(stone)};
 }
 const inspectionKey=(j,site,slot)=>`${j.bought+1}:${site}:${slot}`;
 const inspectFee=site=>[5,12,28,80,220][site];
 // Arcade-only market bulletin. One UTC day = one public quote; each hue
 // follows its own deterministic cycle, shared across every held specimen.
 function marketRate(color,now=Date.now()){
  const day=Math.floor((Number.isSafeInteger(now)&&now>=0?now:Date.now())/86400000);
  const pulse=Math.sin((day+color*5)*.91)*.24+
   Math.cos((day*3+color*7)*.37)*.095;
  return clamp(Math.round((1+pulse)*100),67,135);
 }
 function marketQuote(stone,now=Date.now()){
  if(!stone||!['window','cut','crafted'].includes(stone.phase))return null;
  const base=stone.phase==='window'?stone.offer:
   stone.phase==='crafted'?stone.craftValue:stone.cutValue;
  // Phế thạch has only recovery value and cannot gain speculative premiums.
  const rate=stone.grade===0||stone.flaw==='skin'?100:marketRate(stone.color,now);
  return {base,rate,value:clamp(Math.round(base*rate/100),1,MAX)};
 }
 function scanHint(stone,spot,lamp){
  const thick=stone.site===3,noise=randomFrom((stone.seed^Math.imul(spot+11,1357911))>>>0)();
  if(spot===0){
   if(thick&&lamp<4)return 'Vỏ hắc sa nuốt ánh đèn; khó đoán độ trong.';
   if(stone.grade===0)return noise>.25?'Ánh sáng bật ngược, bên trong khá đục.':'Có vệt sáng yếu, chưa kết luận được.';
   if(stone.grade>=5)return lamp>=2?'Thủy đầu sâu; ánh ngọc mát, có triển vọng băng/kính.':'Ánh sáng đi sâu qua vỏ, tín hiệu khả quan.';
   return stone.grade>=3?'Thấu sáng mức vừa; thớ có vẻ mịn.':'Ánh sáng mờ và tản, thớ khá thô.';
  }
  if(spot===1){
   if(stone.flaw==='skin')return 'Tùng hoa ngoài vỏ rất đẹp, nhưng dải xanh chỉ bám sát bì.';
   if(stone.grade>0&&stone.color>0&&stone.color!==5)return lamp>=3?
    'Mãng đới liền mạch, thấy ánh màu chạy sâu.':'Vân rêu xanh chạy theo thớ, có dấu hiệu ăn màu.';
   return noise>.45?'Vân ngoài vỏ loang lổ, khó nhận biết màu.':'Một vệt mãng đới nhạt, chưa rõ là thật.';
  }
  if(stone.flaw==='fracture')return lamp>=2?'Liệt văn giao nhau gần tâm. Lưỡi cưa tốt có thể cứu đá.':'Có đường rạn lờ mờ trên bì.';
  if(stone.flaw==='inclusion')return 'Vệt hắc điểm lẫn trong ánh rọi; có thể làm giảm giá.';
  if(stone.flaw==='perfect')return 'Bề mặt khá sạch, chưa thấy đường nứt đáng ngại.';
  return 'Một góc đá rọi ánh khác thường; chưa rõ là cơ hội hay bẫy.';
 }
 const baseValue=stone=>stone.grade===0?Math.max(1,Math.round(MARKETS[stone.site].price*.055)):
  Math.round(MARKETS[stone.site].price*1.45*gradeMult[stone.grade]*colorMult[stone.color]*
   (stone.size/5)*(stone.payoutV===2?payoutScale[stone.site]:1));
 function cutValue(stone,saw){
  if(stone.grade===0||stone.flaw==='skin')return Math.max(1,Math.round(MARKETS[stone.site].price*.05));
  let value=baseValue(stone);
  if(stone.flaw==='perfect')value*=1.5;
  if(stone.flaw==='inclusion')value*=.7;
  if(stone.flaw==='mutation')value*=1.45;
  // A better saw avoids most *cutting* fractures; intrinsic flaws still exist.
  if(stone.flaw==='fracture')value*=stone.savedFracture?.9:.4;
  return clamp(Math.round(value),1,MAX);
 }
 const cuttingFee=site=>[5,14,35,100,300][site];
 const windowFee=site=>[8,20,60,200,600][site];
 const actionFee=(stone,kind)=>stone.practice||stone.id===1&&stone.site===0?0:
  kind==='cut'?cuttingFee(stone.site):windowFee(stone.site);
 const rawSalvageValue=stone=>stone.phase==='raw'&&!stone.practice&&!(stone.id===1&&stone.site===0)?
  Math.floor(MARKETS[stone.site].price*.25):0;
 const upgradeCost=(j,type)=>type==='lamp'&&j.lamp<4?120*j.lamp*j.lamp:
  type==='saw'&&j.saw<4?180*j.saw*j.saw:
  type==='carver'&&j.carver<4?240*j.carver*j.carver:
  type==='permit'&&!j.permit?3000:null;
 const craftFee=(stone,type)=>Math.max(4,Math.round(MARKETS[stone.site].price*({bangle:.16,pendant:.1,ring:.08,beads:.055}[type])));
 function act(state,action,roll=.5,now=Date.now()){
  const j=state.jade;if(!j)return {ok:false,reason:'Chưa khởi tạo Ngọc Phường',state};
  const fail=reason=>({ok:false,reason,state});
  const succeed=label=>({ok:true,label,state});
  const charge=amount=>{if(state.coins<amount)return false;state.coins-=amount;j.invested=clamp(j.invested+amount,0,MAX);return true;};
  const credit=amount=>{state.coins=clamp(state.coins+amount,0,MAX);
   state.earned=clamp(state.earned+amount,0,MAX);j.received=clamp(j.received+amount,0,MAX);};
  const held=()=>j.stash.length+(j.active?1:0);
  const pick=/^jade-pick-([0-4])-([0-2])$/.exec(action||'');
  const pack=/^jade-buy-pack-([0-4])-(1|3|5)$/.exec(action||'');
  if(pick||pack){
   const site=Number((pick||pack)[1]),count=pick?1:Number(pack[2]);
   if(!unlocked(j,site))return fail('Bãi đá này chưa được mở khóa.');
   if(held()+count>MAX_STONES)return fail('Túi đá chỉ chứa tối đa '+MAX_STONES+' viên, kể cả viên trên bàn.');
   if(j.bought+count>1000000)return fail('Đã đạt giới hạn mẫu đá của xưởng.');
   const free=j.bought===0&&site===0?1:0;
   const cost=pick?(free?0:marketOffer(j,site,Number(pick[2])).ask):
    (count-free)*MARKETS[site].price;
   if(!charge(cost))return fail('Chưa đủ Xu Arcade để lấy '+count+' viên đá.');
   for(let i=0;i<count;i++){
    const offer=pick?marketOffer(j,site,Number(pick[2])):null;
    const id=j.bought+1,stone=offer?offer.stone:
     generate(site,id,(clamp(Number.isFinite(roll)?roll:.5,0,.999999)+i*.6180339887)%1);
    j.stash.push(stone);j.bought++;
   }
   j.inspected=[];
   return succeed('Đã mua '+count+' viên từ '+MARKETS[site].short+' · Túi đá '+held()+'/'+MAX_STONES+
    (free?' · Tặng viên đầu tiên':''));
  }
  const inspect=/^jade-inspect-([0-4])-([0-2])$/.exec(action||'');
  if(inspect){
   const site=Number(inspect[1]),slot=Number(inspect[2]);
   if(!unlocked(j,site))return fail('Quầy này chưa mở.');
   const key=inspectionKey(j,site,slot);
   if(j.inspected.includes(key))return fail('Mẫu này đã được rọi đèn tại quầy.');
   const fee=inspectFee(site);
   if(!charge(fee))return fail('Chưa đủ Xu Arcade để thử đèn tại quầy.');
   j.inspected.push(key);
   return succeed('Đã rọi đèn mẫu '+['A','B','C'][slot]+' · manh mối được ghi ngay trên khay chợ.');
  }
  const select=/^jade-select-(\d{1,2})$/.exec(action||'');
  if(select){
   if(j.active)return fail('Cất hoặc xử lý viên trên bàn trước khi chọn viên khác.');
   const index=Number(select[1]);if(index>=j.stash.length)return fail('Không tìm thấy viên đá trong túi.');
   j.active=j.stash.splice(index,1)[0];
   return succeed('Đã đưa mẫu #'+j.active.id+' lên bàn. Hãy soi ba điểm.');
  }
  if(action==='jade-store'){
   if(!j.active||!['raw','window'].includes(j.active.phase))
    return fail('Chỉ có thể cất đá chưa xẻ.');
   j.stash.unshift(j.active);j.active=null;
   return succeed('Đã cất viên đang soi vào túi. Có thể chọn viên khác.');
  }
  if(action==='jade-vault-store'){
   if(!j.active||!['cut','crafted'].includes(j.active.phase))
    return fail('Chỉ có thể gửi phôi hoặc ngọc thành phẩm vào kho.');
   if(j.vault.length>=MAX_VAULT)return fail('Kho ngọc đã đầy '+MAX_VAULT+' chỗ.');
   j.vault.unshift(j.active);j.active=null;
   return succeed('Đã niêm phong ngọc vào kho. Giá chào mua sẽ thay đổi theo ngày.');
  }
  const vaultSelect=/^jade-vault-select-(\d{1,2})$/.exec(action||'');
  if(vaultSelect){
   if(j.active)return fail('Hãy cất viên trên bàn trước khi mở kho ngọc.');
   const index=Number(vaultSelect[1]);
   if(index>=j.vault.length)return fail('Không tìm thấy vật phẩm này trong kho.');
   j.active=j.vault.splice(index,1)[0];
   return succeed('Đã mang ngọc #'+j.active.id+' từ kho ra bàn để bán hoặc chế tác.');
  }
  const vaultSell=/^jade-vault-sell-(\d{1,2})$/.exec(action||'');
  if(vaultSell){
   const index=Number(vaultSell[1]),saved=j.vault[index];
   if(!saved)return fail('Món ngọc này không còn trong kho.');
   const quote=marketQuote(saved,now);
   if(!quote)return fail('Không định giá được món ngọc này.');
   credit(quote.value);j.sold++;
   j.last={label:'Bán ngọc lưu kho #'+saved.id,value:quote.value};
   j.vault.splice(index,1);
   return succeed('Đã bán ngọc trong kho theo giá hôm nay · +'+(quote.value/10).toLocaleString('vi-VN',{maximumFractionDigits:1})+' Xu');
  }
  const buy=/^jade-buy-([0-4])$/.exec(action||'');
  if(buy){
   const site=Number(buy[1]);if(j.active)return fail('Hãy xử lý viên đá trên bàn trước.');
   if(!unlocked(j,site))return fail('Bãi đá này chưa được mở khóa.');
   if(held()>=MAX_STONES||j.bought>=1000000)return fail('Túi đá đã đầy hoặc hết chỗ cho mẫu mới.');
   const cost=j.bought===0&&site===0?0:MARKETS[site].price;
   if(!charge(cost))return fail('Chưa đủ Xu Arcade để mua lô đá.');
   j.bought++;j.active=generate(site,j.bought,roll);j.inspected=[];
   return succeed(cost?'Đã mang đá thô lên bàn. Hãy soi ba điểm.':'Tặng viên đá thử đầu tiên! Hãy soi ba điểm.');
  }
  if(action==='jade-rescue'){
   if(held())return fail('Hãy xử lý những viên đá thô đang có trước.');
   if(!j.bought)return fail('Bạn vẫn còn viên đá thử đầu tiên miễn phí.');
   if(state.coins>=MARKETS[0].price)return fail('Hãy dùng Xu Arcade hiện có để chọn đá.');
   if(!Number.isSafeInteger(now)||now<0||now<j.rescueReadyAt)return fail('Đá cứu vốn đang chờ hồi lại.');
   j.bought++;j.inspected=[];j.rescueReadyAt=now+RESCUE_INTERVAL;
   j.active=generate(0,j.bought,roll);j.active.practice=true;
   return succeed('✦ Nhận đá cứu vốn! Soi và xẻ miễn phí, chỉ có thể nhận lại một viên mỗi 10 phút.');
  }
  const tool=/^jade-upgrade-(lamp|saw|carver|permit)$/.exec(action||'');
  if(tool){
   const type=tool[1],cost=upgradeCost(j,type);if(cost===null)return fail('Đã đạt cấp cao nhất.');
   if(type==='permit'&&j.sold<25)return fail('Cần giao dịch ít nhất 25 viên để xin giấy phép.');
   if(!charge(cost))return fail('Chưa đủ Xu Arcade để nâng cấp.');
   if(type==='permit')j.permit=true;else j[type]++;
   return succeed(type==='permit'?'Đã có giấy phép Tàn Tích.':'Đã nâng cấp thiết bị xưởng ngọc.');
  }
  const stone=j.active;if(!stone)return fail('Hãy chọn một viên đá thô ở chợ.');
  if(action==='jade-sell-raw'){
   if(stone.phase!=='raw')return fail('Chỉ trả lại được đá chưa khai song.');
   const value=rawSalvageValue(stone);
   if(!value)return fail('Đá tặng không có giá thu mua thô. Hãy khai song hoặc xẻ miễn phí.');
   credit(value);j.last={label:'Thanh lý đá thô',value};j.active=null;
   return succeed('Đã bán đá thô thu hồi · +'+(value/10).toLocaleString('vi-VN',{maximumFractionDigits:1})+' Xu');
  }
  const scan=/^jade-scan-([012])$/.exec(action||'');
  if(scan){
   if(!['raw','window'].includes(stone.phase))return fail('Viên đá đã được xẻ.');
   const index=Number(scan[1]);if(stone.scans[index])return fail('Điểm này đã được soi rồi.');
   stone.scans[index]=true;
   return succeed(['Đã đọc thủy đầu.','Đã đọc vân ngọc.','Đã kiểm tra liệt văn.'][index]);
  }
  if(action==='jade-window'){
   if(stone.phase!=='raw')return fail('Viên đá đã được khai song.');
   if(!charge(actionFee(stone,'window')))return fail('Chưa đủ phí khai song.');
   stone.phase='window';
   const rawValue=stone.grade===0?MARKETS[stone.site].price*.12:
    stone.flaw==='skin'?MARKETS[stone.site].price*1.7:
    baseValue(stone)*(.58+(stone.seed%26)/100);
   stone.offer=clamp(Math.round(rawValue),1,MAX);
   return succeed('Đã mở cửa sổ. Thương nhân đưa ra giá chào mua!');
  }
  if(action==='jade-sell-window'){
   if(stone.phase!=='window')return fail('Cần khai song trước khi bán sang tay.');
   const value=marketQuote(stone,now).value;
   credit(value);j.sold++;j.last={label:'Sang tay đá đã khai song',value};j.active=null;
   return succeed('Đã chốt giá NPC · +'+(value/10).toLocaleString('vi-VN',{maximumFractionDigits:1})+' Xu');
  }
  if(action==='jade-cut'){
   if(!['raw','window'].includes(stone.phase))return fail('Đá đã được xẻ.');
   if(!charge(actionFee(stone,'cut')))return fail('Chưa đủ phí vận hành máy cưa.');
   // Predetermined damage roll; better saw changes the threshold, not the stone.
   stone.savedFracture=stone.flaw==='fracture'&&
    (stone.seed%1000)/1000<(.25/.35)*(j.saw-1)/3;
   if(stone.flaw==='mutation'&&stone.grade>0)stone.grade=Math.min(7,stone.grade+1);
   stone.cutValue=cutValue(stone,j.saw);stone.phase='cut';j.cut++;
   if(stone.grade>0&&stone.flaw!=='skin'){
    const key=stone.grade+'-'+stone.color;
    j.album[key]=clamp((j.album[key]||0)+1,0,1000000);
   }
   return succeed(stone.flaw==='skin'?'Kháo bì! Màu xanh chỉ nằm ngoài lớp vỏ.':
    stone.grade===0?'Đá phế! Chỉ có thể bán thu hồi.':
    'Đã lộ '+GRADES[stone.grade]+' · '+COLORS[stone.color]+'!');
  }
  const craft=/^jade-craft-(bangle|pendant|ring|beads)$/.exec(action||'');
  if(craft){
   if(stone.phase!=='cut'||stone.grade===0||stone.flaw==='skin')return fail('Chỉ chế tác được phôi ngọc đã cắt.');
   const type=craft[1],spec=CRAFTS[type];
   if(stone.size<spec.min)return fail('Phôi ngọc quá nhỏ cho thành phẩm này.');
   if(type==='bangle'&&stone.flaw==='fracture'&&!stone.savedFracture)return fail('Đá nứt tâm, không tiện được vòng nguyên khối.');
   const fee=craftFee(stone,type);if(!charge(fee))return fail('Chưa đủ phí chế tác.');
   stone.phase='crafted';stone.craft=type;
   stone.craftValue=clamp(Math.round(stone.cutValue*spec.mult*(1+.17*(j.carver-1))),1,MAX);
   return succeed('Thợ hoàn thành '+spec.name+'! Đem bán hoặc trưng bày.');
  }
  if(action==='jade-sell'){
   if(!['cut','crafted'].includes(stone.phase))return fail('Hãy cắt đá hoặc khai song trước.');
   const value=marketQuote(stone,now).value;
   credit(value);j.sold++;j.last={label:stone.phase==='crafted'?CRAFTS[stone.craft].name:'Phôi ngọc',value};j.active=null;
   return succeed('Chốt giao dịch · +'+(value/10).toLocaleString('vi-VN',{maximumFractionDigits:1})+' Xu');
  }
  if(action==='jade-exhibit'){
   if(stone.phase!=='crafted'||stone.grade===0||stone.flaw==='skin')return fail('Cần chế tác tác phẩm trước.');
   if(j.exhibits.length>=40)return fail('Tủ triển lãm đã đầy (40 tác phẩm).');
   j.exhibits.unshift({grade:stone.grade,color:stone.color,size:stone.size,craft:stone.craft,site:stone.site});
   j.last={label:'Đã cất '+CRAFTS[stone.craft].name+' vào tủ',value:0};j.active=null;
   return succeed('✦ Đã bổ sung tác phẩm vào Tủ Triển Lãm!');
  }
  return fail('Thao tác Ngọc Phường chưa hỗ trợ.');
 }
 return Object.freeze({fresh,norm,act,MARKETS,GRADES,COLORS,COLOR_HEX,FLAWS,FLAW_NAMES,
  CRAFTS,RESCUE_INTERVAL,unlocked,scanHint,baseValue,cutValue,cuttingFee,windowFee,
  actionFee,rawSalvageValue,upgradeCost,craftFee,generate,marketOffer,surface,
  MAX_STONES,MAX_VAULT,marketRate,marketQuote,inspectFee,inspectionKey});
});
