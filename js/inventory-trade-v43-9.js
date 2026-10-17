/* DUDU V43.9 · Sandbox inventory circulation rules (pure, no network).
 * Trades and gift notes are account-local. Auctions are ESCROW DRAFTS,
 * not real player bids, money, collectibles, author mail or public comments.
 */
(function(root,factory){
 'use strict';
 const api=factory(typeof module==='object'&&module.exports?
  require('./item-catalog-v2.js'):root?.DuduItemCatalog,
  typeof module==='object'&&module.exports?
  require('./inventory-model-v42.js'):root?.DuduInventoryV42,
  typeof module==='object'&&module.exports?
  require('./economy-core-v43.js'):root?.DuduEconomyCoreV43);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduInventoryTradeV439=api;
})(typeof window!=='undefined'?window:null,function(catalog,model,core){
 'use strict';
 const VERSION=1,MAX_OWNED=500,DAILY_SALES=12,MAX_LISTINGS=8,MAX_HISTORY=30;
 const AUCTION_RANKS=Object.freeze(['B','A','S','SS','SSS']);
 const GOOD_IDS=new Set(catalog.items.filter(x=>x.scope==='COMMON'||x.scope==='REALM').map(x=>x.id));
 const dayKey=core.localDay;
 const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
 const isFiniteInt=n=>Number.isSafeInteger(n)&&n>=0;
 function state(raw,day=dayKey()){
  const blank={version:VERSION,day,sold:0,usedIds:[],listings:[],history:[]};
  if(!raw||typeof raw!=='object'||raw.version!==VERSION)return blank;
  const history=Array.isArray(raw.history)?raw.history.filter(x=>
   x&&['SELL','GIFT','LIST','CANCEL'].includes(x.action)&&
   valid(x.instanceId)&&valid(x.day)&&
   typeof x.name==='string').slice(-MAX_HISTORY):[];
  // V44.6: persist only drafts created from canonical B+ realm chapter
  // items. De-duplicate physical identities before allowing withdrawals.
  const listingIds=new Set(),escrowItems=new Set();
  const listings=Array.isArray(raw.listings)?raw.listings.filter(x=>{
   if(!x||!valid(x.id)||!x.item||typeof x.item!=='object'||
      !valid(x.item.instanceId)||!valid(x.day)||!isFiniteInt(x.ask)||
      x.ask<10||x.ask>5000||x.status!=='AWAITING_SERVER')return false;
   const canonical=known(x.item),origin=x.item.obtainedFrom;
   if(!canonical||canonical.scope!=='REALM'||
      !AUCTION_RANKS.includes(canonical.rank)||origin?.kind!=='CHAPTER'||
      !valid(origin.storyId)||!valid(origin.chapterId)||
      x.storyId!==origin.storyId||x.chapterId!==origin.chapterId||
      x.realm!==canonical.realmTag||x.id!=='auction-'+x.item.instanceId||
      listingIds.has(x.id)||escrowItems.has(x.item.instanceId))return false;
   listingIds.add(x.id);escrowItems.add(x.item.instanceId);
   return true;
  }).slice(0,MAX_LISTINGS):[];
  if(raw.day!==day)return {...blank,listings,history};
  return {...blank,
   sold:isFiniteInt(raw.sold)?Math.min(DAILY_SALES,raw.sold):0,
   usedIds:Array.isArray(raw.usedIds)?[...new Set(raw.usedIds.filter(valid))].slice(-80):[],
   listings,history};
 }
 function known(record){
  if(!record||typeof record!=='object'||!valid(record.instanceId))return null;
  if(record.discardable===false||record.unique===true||record.tradeable===false)return null;
  const id=record.id||record.itemId;
  const item=catalog.byId(id);
  if(!item||!GOOD_IDS.has(id)||item.id!==record.id||record.itemId!==item.id||
   item.unique||item.discardable===false||item.tradeable===false||
   item.name!==record.name||item.rank!==record.rank||item.scope!==record.scope||
   item.realmTag!==record.realmTag||item.type!==record.type)return null;
  if(!['SHOP','GLOBAL','CHAPTER','EVENT','STARTER'].includes(record.obtainedFrom?.kind))return null;
  // Only known catalog items, not arbitrary author, functional or DUDU records.
  return item;
 }
 function owned(inventory,itemInstanceId){
  if(!Array.isArray(inventory)||!valid(itemInstanceId))return null;
  const matches=inventory.filter(x=>x?.instanceId===itemInstanceId);
  return matches.length===1?matches[0]:null;
 }
 function recordHistory(s,action,item,day,extra={}){
  return [...s.history,{action,instanceId:item.instanceId,name:item.name,day,...extra}]
   .slice(-MAX_HISTORY);
 }
 function saleValue(item){
  const canonical=known(item);
  if(!canonical||canonical.scope!=='COMMON'||AUCTION_RANKS.includes(item.rank))
   return 0;
  const price=core.PRICES[item.id];
  const estimated=isFiniteInt(price)?Math.max(1,Math.floor(price*.35)):
   ({F:1,E:2,D:4,C:6}[item.rank]||0);
  return Math.min(30,estimated);
 }
 function sell({inventory,itemInstanceId,coins,tradeState,day=dayKey()}={}){
  const s=state(tradeState,day);
  const item=owned(inventory,itemInstanceId);
  if(!item)return {ok:false,reason:'not-owned'};
  if(!isFiniteInt(coins)||coins>1e9)return {ok:false,reason:'wallet-invalid'};
  const price=saleValue(item);
  if(!price)return {ok:false,reason:'not-sellable'};
  if(s.sold>=DAILY_SALES)return {ok:false,reason:'daily-limit'};
  if(s.usedIds.includes(itemInstanceId))return {ok:false,reason:'duplicate'};
  if(coins+price>1e9)return {ok:false,reason:'wallet-limit'};
  return {ok:true,price,coins:coins+price,
   inventory:inventory.filter(x=>x!==item),
   state:{...s,sold:s.sold+1,usedIds:[...s.usedIds,itemInstanceId].slice(-80),
    history:recordHistory(s,'SELL',item,day,{coins:price})}};
 }
 function lore(item,stories=[]){
  const detail=model.inspect(item);
  if(!detail)return null;
  const story=stories.find(s=>s?.id===detail.storyId);
  const chapter=story?.chapters?.find(c=>c?.id===detail.chapterId);
  const tag=chapter?.realmTag||story?.realmTag||null;
  const canonical=known(item);
  if(!canonical)return {eligible:false,reason:'locked',detail};
  if(!AUCTION_RANKS.includes(item.rank))
   return {eligible:false,reason:'not-rare',detail};
  if(item.scope==='REALM'){
   if(item.obtainedFrom?.kind!=='CHAPTER'||!story||!chapter||
      canonical.realmTag!==tag)
    return {eligible:false,reason:'source-mismatch',detail};
   return {eligible:true,detail,story,chapter,realm:canonical.realmTag};
  }
  // Canonical author-written collectibles stay non-tradeable until backend
  // ownership checks and author licensing are explicitly implemented.
  return {eligible:false,reason:'protected-story-collectible',detail};
 }
 function list({inventory,itemInstanceId,tradeState,stories,ask,day=dayKey()}={}){
  const s=state(tradeState,day),item=owned(inventory,itemInstanceId);
  if(!item)return {ok:false,reason:'not-owned'};
  if(s.listings.length>=MAX_LISTINGS)return {ok:false,reason:'listing-limit'};
  if(!Number.isSafeInteger(ask)||ask<10||ask>5000)return {ok:false,reason:'ask-invalid'};
  const condition=lore(item,stories);
  if(!condition?.eligible)return {ok:false,reason:condition?.reason||'not-eligible'};
  if(s.listings.some(x=>x.item.instanceId===itemInstanceId))
   return {ok:false,reason:'duplicate'};
  const id='auction-'+itemInstanceId;
  const listing={id,item,ask,day,
   storyId:condition.story.id,chapterId:condition.chapter.id,
   realm:condition.realm,status:'AWAITING_SERVER'};
  return {ok:true,inventory:inventory.filter(x=>x!==item),
   state:{...s,listings:[...s.listings,listing],
    history:recordHistory(s,'LIST',item,day,{ask})},listing};
 }
 function cancel({inventory,tradeState,listingId,day=dayKey()}={}){
  const s=state(tradeState,day);
  const row=s.listings.find(x=>x.id===listingId);
  if(!row)return {ok:false,reason:'not-listed'};
  if(!Array.isArray(inventory)||inventory.length>=MAX_OWNED)
   return {ok:false,reason:'inventory-full'};
  if(inventory.some(x=>x?.instanceId===row.item.instanceId))
   return {ok:false,reason:'duplicate'};
  return {ok:true,inventory:[row.item,...inventory],
   state:{...s,listings:s.listings.filter(x=>x!==row),
    history:recordHistory(s,'CANCEL',row.item,day)}};
 }
 function storyTargets(item,stories=[]){
  if(!known(item)||item.giftable===false)return [];
  const origin=item.obtainedFrom||{};
  return (Array.isArray(stories)?stories:[]).filter(story=>{
   if(!valid(story?.id)||!Array.isArray(story.chapters))return false;
   if(item.scope==='COMMON')return true;
   if(item.scope==='REALM'){
    if(origin.kind!=='CHAPTER'||origin.storyId!==story.id)return false;
    return story.chapters.some(ch=>(ch?.realmTag||story.realmTag)===item.realmTag);
   }
   return false;
  }).map(story=>({id:story.id,title:String(story.title||story.id).slice(0,80),
   chapters:story.chapters.filter(ch=>item.scope==='COMMON'||
    (ch?.realmTag||story.realmTag)===item.realmTag)
    .map(ch=>({id:ch.id,title:String(ch.title||ch.id).slice(0,80)}))}));
 }
 function storyGift({inventory,itemInstanceId,stories,storyId,chapterId=null,
  note='',tradeState,day=dayKey()}={}){
  const s=state(tradeState,day),item=owned(inventory,itemInstanceId);
  if(!item)return {ok:false,reason:'not-owned'};
  if(typeof note!=='string'||note.trim().length>160)return {ok:false,reason:'note-invalid'};
  const choice=storyTargets(item,stories).find(x=>x.id===storyId);
  if(!choice)return {ok:false,reason:'story-mismatch'};
  if(chapterId!==null&&!choice.chapters.some(x=>x.id===chapterId))
   return {ok:false,reason:'chapter-mismatch'};
  if(s.usedIds.includes(itemInstanceId))return {ok:false,reason:'duplicate'};
  return {ok:true,inventory:inventory.filter(x=>x!==item),
   state:{...s,usedIds:[...s.usedIds,itemInstanceId].slice(-80),
    history:recordHistory(s,'GIFT',item,day,{
     storyId,chapterId,note:note.trim(),scope:item.scope,
     recipientKind:'STORY_SANDBOX',deliveryStatus:'LOCAL_JOURNAL_ONLY'
    })}};
 }
 function actionStatus(item,stories){
  const detail=model.inspect(item);
  if(!detail)return null;
  const useable=detail.usageStatus!=='NOT_IMPLEMENTED';
  const buyback=saleValue(item);
  const auction=lore(item,stories);
  return {category:detail.category,usageStatus:detail.usageStatus,
   useable,buyback,auction:!!auction?.eligible,
   rare:AUCTION_RANKS.includes(detail.rank),
   giftTargets:storyTargets(item,stories).length,
   label:useable?'Có thể sử dụng':detail.category==='TOOL'?
    'Dụng cụ / đạo cụ — chưa có hiệu ứng tiêu hao':
    detail.scope==='DUDU'?'Kỷ vật được bảo vệ':
    'Vật phẩm lưu trữ / sưu tập'};
 }
 return Object.freeze({VERSION,DAILY_SALES,MAX_LISTINGS,AUCTION_RANKS,
  state,known,owned,saleValue,lore,sell,list,cancel,storyTargets,storyGift,
  actionStatus});
});
