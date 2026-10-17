/* DUDU V43.7 — Sandbox-only quest engine. Pure plans; never grants server rewards. */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
  require('./economy-core-v43.js'):root?.DuduEconomyCoreV43,
  typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduQuestEngineV437=api;
})(typeof window!=='undefined'?window:null,function(core,catalog){
 'use strict';
 const VERSION=1,MAX_COINS=1e9,MAX_INV=500;
 const DEFINITIONS=Object.freeze([
  {id:'q_daily_dudu',type:'DAILY',title:'Lời Chào Mỗi Ngày',desc:'Điểm danh với DUDU một lần.',icon:'💬',target:1,rewardExp:8,rewardCoin:8},
  {id:'q_daily_tool',type:'DAILY',title:'Kích Hoạt Công Cụ',desc:'Dùng thành công 1 vật phẩm chức năng mới trong Kho.',icon:'🧰',target:1,rewardExp:8,rewardCoin:6},
  {id:'q_week_read',type:'WEEKLY',title:'Hành Trình Trang Sách',desc:'Mở 5 chương trong tuần (mỗi chương một lần/ngày).',icon:'📚',target:5,rewardExp:35,rewardCoin:35},
  {id:'q_week_loot',type:'WEEKLY',title:'Tay Săn Tàn Tích',desc:'Nhặt thành công 5 vật phẩm trong tuần.',icon:'🎒',target:5,rewardExp:30,rewardCoin:25},
  {id:'q_week_fun',type:'WEEKLY',title:'Người Bạn Giải Trí',desc:'Nhận thưởng DUDU FUN 3 lần trong tuần.',icon:'🎲',target:3,rewardExp:25,rewardCoin:20},
  {id:'q_week_shop',type:'WEEKLY',title:'Khách Hàng Thân Thiết',desc:'Mua 2 món hợp lệ ở DUDU MARKET trong tuần.',icon:'🛍️',target:2,rewardExp:15,rewardCoin:12},
  {id:'q_story_reader',type:'STORY',title:'Đi Qua Những Thế Giới',desc:'Mở 6 chương khác nhau (tính xuyên ngày và xuyên truyện).',icon:'📜',target:6,rewardExp:45,rewardCoin:30,rewardItem:'common-bottled-water'},
  {id:'q_npc_gifts',type:'NPC',title:'Người Trao Kỷ Niệm',desc:'Tặng thành công 4 món quà cho NPC đã mở khóa.',icon:'💝',target:4,rewardExp:30,rewardCoin:25,rewardItem:'common-biscuit'},
  {id:'q_npc_visits',type:'NPC',title:'Những Cuộc Gặp Gỡ',desc:'Hoàn thành 3 lượt gặp NPC hợp lệ theo ngày.',icon:'🤝',target:3,rewardExp:25,rewardCoin:20},
  {id:'q_event_fun',type:'EVENT',title:'Ngày Hội Hộp Mù',desc:'Nhận thưởng cả Hộp Mù và Vé Số trong cùng ngày.',icon:'✨',target:2,rewardExp:12,rewardCoin:10}
 ].map(x=>Object.freeze(x)));
 const DEFINITION_MAP=new Map(DEFINITIONS.map(x=>[x.id,x]));
 const EVENTS=Object.freeze({
  READ_CHAPTER:['q_week_read','q_story_reader'],
  LOOT_SUCCESS:['q_week_loot'],
  FUN_CLAIM:['q_week_fun','q_event_fun'],
  NPC_GIFT:['q_npc_gifts'],
  NPC_CHECKIN:['q_npc_visits'],
  MARKET_PURCHASE:['q_week_shop'],
  DUDU_CHECKIN:['q_daily_dudu'],
  ITEM_USE:['q_daily_tool']
 });
 const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
  Number.isFinite(Date.parse(d+'T00:00:00Z'))&&
  new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 function weekStart(day){
  if(!validDay(day))return '';
  const d=new Date(day+'T00:00:00Z');
  const back=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-back);
  return d.toISOString().slice(0,10);
 }
 function ensure(quests){
  const existing=Array.isArray(quests)?quests:[];
  const ids=new Set(existing.map(q=>q?.id));
  const extra=DEFINITIONS.filter(q=>!ids.has(q.id));
  return extra.length?[...existing,...extra.map(q=>({...q,current:0,claimed:false}))]:existing;
 }
 function state(raw,day=core.localDay()){
  const defaults={version:VERSION,week:weekStart(day),seenChapters:[],history:[]};
  if(!validDay(day)||!raw||typeof raw!=='object'||raw.version!==VERSION)return defaults;
  const seen=new Set(),seenChapters=[];
  if(Array.isArray(raw.seenChapters))for(const id of raw.seenChapters){
   if(typeof id==='string'&&id.length>0&&id.length<=96&&!seen.has(id)){
    seen.add(id);seenChapters.push(id);
    if(seenChapters.length>=600)break;
   }
  }
  const history=Array.isArray(raw.history)?raw.history.filter(h=>
   h&&typeof h.id==='string'&&h.id.length<=80&&validDay(h.day)&&
   typeof h.title==='string'&&h.title.length<=90&&
   Number.isSafeInteger(h.coins)&&h.coins>=0&&h.coins<=250&&
   Number.isSafeInteger(h.exp)&&h.exp>=0&&h.exp<=250).slice(-40)
   .map(h=>({id:h.id,day:h.day,title:h.title,coins:h.coins,
    exp:h.exp,itemId:typeof h.itemId==='string'?h.itemId:null})):[];
  return {...defaults,week:validDay(raw.week)?raw.week:defaults.week,seenChapters,history};
 }
 function rotate(quests,raw,{day=core.localDay(),previousDay=null}={}){
  if(!validDay(day)||!Array.isArray(quests))return {ok:false};
  const s=state(raw,day),week=weekStart(day);
  const resetWeek=s.week!==week&&s.week<week;
  const resetDay=validDay(previousDay)&&previousDay<day;
  const nextQuests=(resetWeek||resetDay)?quests.map(q=>{
   if((resetWeek&&q?.type==='WEEKLY')||(resetDay&&q?.type==='EVENT'))
    return {...q,current:0,claimed:false};
   return q;
  }):quests;
  return {ok:true,quests:nextQuests,state:{...s,week:resetWeek?week:s.week},
   changed:resetWeek||resetDay};
 }
 function progress(quests,raw,{type,eventId,day=core.localDay()}={}){
  if(!validDay(day)||!Object.hasOwn(EVENTS,type)||
    typeof eventId!=='string'||!eventId||eventId.length>96)return null;
  const s=state(raw,day);
  const isStory=type==='READ_CHAPTER';
  const isFirstStory=!s.seenChapters.includes(eventId);
  const nextSeen=isStory&&isFirstStory?
   [...s.seenChapters,eventId].slice(-600):s.seenChapters;
  const targeted=EVENTS[type];
  const next=ensure(quests).map(q=>{
   if(!targeted.includes(q?.id)||q.claimed===true||
     !Number.isSafeInteger(q.target)||q.target<=0||
     q.current>=q.target||
     (q.id==='q_story_reader'&&!isFirstStory))return q;
   return {...q,current:Math.min(q.target,Math.max(0,q.current||0)+1)};
  });
  return {quests:next,state:{...s,seenChapters:nextSeen}};
 }
 function reward({quests,questState,id,coins,exp,level,inventory,day=core.localDay()}={}){
  const s=state(questState,day);
  const reject=reason=>({ok:false,reason});
  const quest=Array.isArray(quests)?quests.find(q=>q?.id===id):null;
  if(!quest||quest.claimed||!Number.isSafeInteger(quest.target)||quest.target<=0||
    !Number.isSafeInteger(quest.current)||quest.current<quest.target)return reject('not-ready');
  const canonical=DEFINITION_MAP.get(id);
  // V44.8: the receipt survives a partially restored claimed flag.
  // Day/event quests may award again next day, weekly quests next week;
  // story/NPC/main quests are one-time achievements.
  const cadence=canonical?.type||quest.type;
  const alreadyAwarded=s.history.some(row=>row.id===id&&(
   cadence==='DAILY'||cadence==='EVENT'?row.day===day:
   cadence==='WEEKLY'?weekStart(row.day)===weekStart(day):true
  ));
  if(alreadyAwarded)return reject('duplicate-reward');
  const newCoin=canonical?canonical.rewardCoin:quest.rewardCoin;
  const newExp=canonical?canonical.rewardExp:quest.rewardExp;
  if(!Number.isSafeInteger(newCoin)||newCoin<0||newCoin>250||
    !Number.isSafeInteger(newExp)||newExp<0||newExp>250||
    !Number.isSafeInteger(coins)||coins<0||coins>MAX_COINS||
    !Number.isSafeInteger(level)||level<1||level>999||
    !Number.isSafeInteger(exp)||exp<0||exp>1e6||
    !Array.isArray(inventory))return reject('invalid-profile');
  const itemId=canonical?.rewardItem||null;
  if(itemId&&(inventory.length>=MAX_INV||!catalog?.byId(itemId)||
    catalog.byId(itemId).scope!=='COMMON'))
   return reject('inventory-full');
  let wallet=coins+newCoin,experience=exp+newExp,lv=level,levels=0;
  while(experience>=lv*100&&lv<999){
   experience-=lv*100;lv++;wallet+=30;levels++;
  }
  if(wallet>MAX_COINS)return reject('wallet-cap');
  const instanceId='quest-'+id+'-'+(quest.type==='WEEKLY'?weekStart(day):
   quest.type==='DAILY'||quest.type==='EVENT'?day:'once');
  const newInventory=itemId?[{...catalog.byId(itemId),instanceId,
    obtainedFrom:{kind:'EVENT',source:'DUDU_QUEST',eventId:instanceId}},...inventory]:inventory;
  if(itemId&&inventory.some(x=>x?.instanceId===instanceId))return reject('duplicate-reward');
  const newQuests=quests.map(q=>q?.id===id?{...q,claimed:true}:q);
  const title=String(canonical?.title||quest.title||'Nhiệm vụ').slice(0,90);
  return {ok:true,quests:newQuests,state:{...s,history:[...s.history,
   {id,day,title,coins:newCoin,exp:newExp,itemId}].slice(-40)},
   coins:wallet,exp:experience,level:lv,levelUps:levels,
   inventory:newInventory,award:{coins:newCoin,exp:newExp,itemId}};
 }
 function stats(quests){
  const rows=Array.isArray(quests)?quests:[];
  const eligible=rows.filter(q=>q&&Number.isSafeInteger(q.target)&&q.target>0);
  return {total:eligible.length,claimed:eligible.filter(q=>q.claimed).length,
   ready:eligible.filter(q=>!q.claimed&&q.current>=q.target).length};
 }
 return Object.freeze({VERSION,DEFINITIONS,EVENTS,weekStart,ensure,state,rotate,
  progress,reward,stats});
});
