/* V43.5 economy bridge: Sandbox-only shop and daily quests.
 * Installs after the legacy inline application to preserve live behavior.
 * No Firestore, Cloudflare or verified collectibles writes.
 */
(function(root){
 'use strict';
 const core=root.DuduEconomyCoreV43;
 const questsV437=root.DuduQuestEngineV437;
 const functionalV438=root.DuduFunctionalItemsV438;
 if(!core||typeof root.renderShop!=='function'||typeof root.buyShopItem!=='function')
   return;
 const old={
  renderShop:root.renderShop,buy:root.buyShopItem,
  renderQuests:root.renderQuests,advanceQuest:root.advanceQuest,
  claimQuestReward:root.claimQuestReward,
  refreshDailyQuests:root.refreshDailyQuests
 };
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 const owner=()=>sandbox()&&typeof currentUsername==='string'&&!!currentUsername;
 const alertMessage=(title,description)=>{
  if(typeof showSystemAlert==='function')showSystemAlert(title,description);
 };
 function rotate(){
  if(!owner()||!Array.isArray(userProfile.quests))return false;
  const old={quests:userProfile.quests,day:userProfile.questsDayV43,
   state:userProfile.questV437};
  const baseline=core.ensureQuests(userProfile.quests);
  const extended=questsV437?questsV437.ensure(baseline):baseline;
  const plan=core.rolloverQuests(extended,old.day);
  if(!plan.ok)return false;
  const weekly=questsV437?.rotate(plan.quests,old.state,
   {day:plan.day,previousDay:old.day})||{ok:true,quests:plan.quests,state:old.state};
  if(!weekly.ok)return false;
  const needsSave=extended!==old.quests||plan.changed||weekly.changed||
   old.day!==plan.day||JSON.stringify(old.state||null)!==JSON.stringify(weekly.state||null);
  if(!needsSave)return false;
  try{
   userProfile.quests=weekly.quests;
   userProfile.questsDayV43=plan.day;
   if(questsV437)userProfile.questV437=weekly.state;
   saveCurrentAccount();
   return plan.changed||Boolean(weekly.changed);
  }catch(_){
   userProfile.quests=old.quests;
   if(old.day===undefined)delete userProfile.questsDayV43;
   else userProfile.questsDayV43=old.day;
   if(old.state===undefined)delete userProfile.questV437;
   else userProfile.questV437=old.state;
   return false;
  }
 }
 function prepareQuestEvent(type,eventId){
  if(!owner())return null;
  rotate();
  const plan=core.recordEvent(userProfile.economyV43,{type,eventId});
  if(!plan.ok)return null;
  const current=core.applyQuestProgress(userProfile.quests,plan.questId);
  const next=questsV437?.progress(current,userProfile.questV437,{type,eventId});
  if(questsV437&&!next)return null;
  return {ledger:plan.state,quests:next?.quests||current,
   questState:next?.state||userProfile.questV437,questId:plan.questId};
 }
 function buy(itemId){
  if(!sandbox()){
   alertMessage('CHƯA MỞ GIAO DỊCH','Bạn có thể xem danh mục mới. Mua vật phẩm trên tài khoản thật cần xác thực máy chủ.');
   return false;
  }
  if(!owner()){
   alertMessage('CẦN ĐĂNG NHẬP','Đăng nhập Sandbox trước khi mua vật phẩm.');
   return false;
  }
  const balance=userProfile.currency;
  const inventory=Array.isArray(userProfile.inventory)?userProfile.inventory:[];
  const product=core.preview({tab:'COMMON'}).find(item=>item.id===itemId);
  const coupon=functionalV438?.discount(userProfile.functionalV438,{
   itemId,price:product?.price||0});
  const discount=coupon?.amount||0;
  const plan=core.quotePurchase({
   itemId,coins:balance,state:userProfile.economyV43,
   inventoryCount:inventory.length,discount
  });
  if(!plan.ok){
   const descriptions={
    'not-for-sale':'Không bán trực tiếp vật phẩm hiếm, kỷ vật hệ thống hoặc đồ độc quyền truyện.',
    'daily-limit':'Hôm nay bạn đã đạt giới hạn mua vật phẩm.',
    'not-enough-coins':'Bạn không đủ Xu.',
    'invalid-balance-or-cap':'Giao dịch chưa hợp lệ hoặc Kho đồ đã đầy.'
   };
   alertMessage('CHƯA MUA ĐƯỢC',descriptions[plan.reason]||'Giao dịch chưa thể thực hiện.');
   return false;
  }
  const instanceId='shop-'+(typeof crypto!=='undefined'&&crypto.randomUUID?
   crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
  const item=core.instance(plan.product,instanceId);
  if(!item)return false;
  const couponRedemption=discount?functionalV438?.redeem(
   userProfile.functionalV438,{itemId,price:plan.product.price}):null;
  if(discount&&(!couponRedemption?.ok||couponRedemption.amount!==discount))return false;
  const event=prepareQuestEvent('MARKET_PURCHASE',instanceId);
  const previous={coins:userProfile.currency,inventory:userProfile.inventory,
   ledger:userProfile.economyV43,quests:userProfile.quests,
   questState:userProfile.questV437,functional:userProfile.functionalV438};
  try{
   userProfile.currency=plan.coins;
   userProfile.inventory=[item,...inventory];
   userProfile.economyV43=event?{...plan.state,events:event.ledger.events}:plan.state;
   if(couponRedemption)userProfile.functionalV438=couponRedemption.state;
   if(event){
    userProfile.quests=event.quests;
    userProfile.questV437=event.questState;
   }
   saveCurrentAccount();
  }catch(_){
   userProfile.currency=previous.coins;
   userProfile.inventory=previous.inventory;
   if(previous.ledger===undefined)delete userProfile.economyV43;
   else userProfile.economyV43=previous.ledger;
   userProfile.quests=previous.quests;
   if(previous.questState===undefined)delete userProfile.questV437;
   else userProfile.questV437=previous.questState;
   if(previous.functional===undefined)delete userProfile.functionalV438;
   else userProfile.functionalV438=previous.functional;
   alertMessage('GIAO DỊCH CHƯA LƯU','Thiết bị chưa lưu được. Đã hoàn trả Xu và vật phẩm.');
   return false;
  }
  alertMessage('ĐÃ MUA THÀNH CÔNG',
    item.name+' (-'+plan.charged+' Xu'+
    (plan.discount?' · giảm '+plan.discount+' Xu bằng phiếu':'')+
    '). Xem trong Kho Xuyên Thế Giới.');
  root.renderShop();
  return true;
 }
 function questEvent(type,eventId){
  const plan=prepareQuestEvent(type,eventId);
  if(!plan)return false;
  const prior={ledger:userProfile.economyV43,quests:userProfile.quests,
   questState:userProfile.questV437};
  try{
   userProfile.economyV43=plan.ledger;
   userProfile.quests=plan.quests;
   if(questsV437)userProfile.questV437=plan.questState;
   saveCurrentAccount();
  }catch(_){
   if(prior.ledger===undefined)delete userProfile.economyV43;
   else userProfile.economyV43=prior.ledger;
   userProfile.quests=prior.quests;
   if(prior.questState===undefined)delete userProfile.questV437;
   else userProfile.questV437=prior.questState;
   return false;
  }
  if(typeof root.renderQuests==='function')root.renderQuests();
  return true;
 }
 root.renderShop=function(){
  const readOnly=!sandbox();
  const host=document.getElementById('shop-items-container');
  const balance=document.getElementById('shop-currency-val');
  if(balance)balance.textContent=String(userProfile.currency||0);
  return root.DuduMarketUIV43?.render({
   host,coins:Number(userProfile.currency)||0,
   state:userProfile.economyV43,onBuy:buy,readOnly,
   stories:typeof novels!=='undefined'?novels:[],
   readRewards:userProfile.readRewards||{},
   functionalState:userProfile.functionalV438
  })||false;
 };
 root.buyShopItem=buy;
 function personalQuestPreview(){
  const rows=questsV437?.ensure(core.ensureQuests(userProfile.quests||[]))||[];
  const day=new Date().toISOString().slice(0,10);
  if(userProfile.questsDayV43&&userProfile.questsDayV43>day)
   return {quests:rows,state:userProfile.questV437};
  const daily=core.rolloverQuests(rows,userProfile.questsDayV43,day);
  if(!daily.ok)return {quests:rows,state:userProfile.questV437};
  const weekly=questsV437?.rotate(daily.quests,userProfile.questV437,
   {day,previousDay:userProfile.questsDayV43});
  if(!weekly?.ok)return {quests:daily.quests,state:userProfile.questV437};
  // UI-only preview: an actual profile write/claim must still transact.
  return {quests:weekly.quests,state:weekly.state};
 }
 root.renderQuests=function(){
  const signedMain=!sandbox()&&!!(root.DuduAuth?.isReady?.()&&
   root.DuduAuth.uid()===currentUsername&&root.DuduPersonalProgressC23);
  const readOnly=!sandbox()&&!signedMain;
  if(!readOnly)rotate();
  const personalPreview=signedMain?personalQuestPreview():null;
  const reset=document.querySelector('#phone-app-quests .dudu-v27-quest-tools button');
  if(reset){
   reset.disabled=true;reset.classList.remove('btn-danger');
   reset.textContent='Tự làm mới theo ngày';
   reset.title='Không thể đặt lại thủ công để nhận Xu trùng';
  }
  if(questsV437&&root.DuduQuestUIV437)
   return root.DuduQuestUIV437.render({
    host:document.getElementById('quests-container'),
    quests:signedMain?personalPreview.quests:
      readOnly?(questsV437?.ensure(core.ensureQuests(Array.isArray(userProfile.quests)?userProfile.quests:[]))||[]):owner()?userProfile.quests:[],
    questState:signedMain?personalPreview.state:readOnly?userProfile.questV437:owner()?userProfile.questV437:null,
    signed:signedMain||(!readOnly?owner():!!(root.DuduAuth?.isReady?.()&&root.DuduAuth.uid()===currentUsername)),
    onClaim:readOnly?null:root.claimQuestReward,readOnly,personalMode:signedMain
   });
  return old.renderQuests.apply(this,arguments);
 };
 root.advanceQuest=function(){
  if(!sandbox())return false;
  rotate();
  return old.advanceQuest.apply(this,arguments);
 };
 root.claimQuestReward=function(id){
  if(!sandbox()){
   return root.personalClaimQuestC23?.(id)||false;
  }
  if(!owner()||!questsV437)return false;
  rotate();
  const plan=questsV437.reward({
   quests:userProfile.quests,questState:userProfile.questV437,id,
   coins:userProfile.currency,exp:userProfile.exp,level:userProfile.level,
   inventory:userProfile.inventory
  });
  if(!plan.ok){
   const reasons={'inventory-full':'Kho đã đầy, hãy dọn chỗ trước khi nhận.',
    'wallet-cap':'Ví Xu đã chạm giới hạn.',
    'not-ready':'Nhiệm vụ chưa hoàn thành hoặc đã nhận.',
    'duplicate-reward':'Vật phẩm thưởng đã tồn tại.'};
   alertMessage('CHƯA NHẬN ĐƯỢC',reasons[plan.reason]||
    'Dữ liệu phần thưởng chưa hợp lệ.');
   return false;
  }
  const oldState={quests:userProfile.quests,questV437:userProfile.questV437,
   currency:userProfile.currency,exp:userProfile.exp,level:userProfile.level,
   inventory:userProfile.inventory};
  try{
   userProfile.quests=plan.quests;
   userProfile.questV437=plan.state;
   userProfile.currency=plan.coins;
   userProfile.exp=plan.exp;userProfile.level=plan.level;
   userProfile.inventory=plan.inventory;
   saveCurrentAccount();
  }catch(_){
   Object.assign(userProfile,oldState);
   if(oldState.questV437===undefined)delete userProfile.questV437;
   alertMessage('LƯU THẤT BẠI','Chưa nhận Xu, EXP hoặc vật phẩm. Hãy thử lại.');
   return false;
  }
  root.renderQuests();
  alertMessage('NHIỆM VỤ HOÀN TẤT','+'+plan.award.coins+' Xu · +'+
   plan.award.exp+' EXP'+(plan.award.itemId?' · Tặng 1 vật phẩm vào Kho':'')+
   (plan.levelUps?' · Thăng '+plan.levelUps+' cấp':''));
  return true;
 };
 root.refreshDailyQuests=function(){
  if(!sandbox()){
   alertMessage('NHIỆM VỤ HẰNG NGÀY','Bản chính không cho đặt lại thủ công hoặc nhận thưởng lặp.');
   return false;
  }
  const menu=document.querySelector('#phone-app-quests .dudu-v27-quest-menu');
  if(menu)menu.open=false;
  rotate();
  alertMessage('NHIỆM VỤ HẰNG NGÀY',
   'Nhiệm vụ tự làm mới vào ngày mới. Không thể đặt lại thủ công để nhận Xu trùng.');
  root.renderQuests();
  return false;
 };
 root.DuduEconomyRuntimeV43=Object.freeze({buy,rotate,prepareQuestEvent,questEvent});
})(typeof window!=='undefined'?window:{});
