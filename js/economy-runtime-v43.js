/* V43.5 economy bridge: Sandbox-only shop and daily quests.
 * Installs after the legacy inline application to preserve live behavior.
 * No Firestore, Cloudflare or verified collectibles writes.
 */
(function(root){
 'use strict';
 const core=root.DuduEconomyCoreV43;
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
  const plan=core.rolloverQuests(userProfile.quests,userProfile.questsDayV43);
  if(!plan.ok||(!plan.changed&&userProfile.questsDayV43===plan.day))return false;
  userProfile.questsDayV43=plan.day;
  if(plan.changed)userProfile.quests=plan.quests;
  saveCurrentAccount();
  return plan.changed;
 }
 function buy(itemId){
  if(!sandbox())return old.buy(itemId);
  if(!owner()){
   alertMessage('CẦN ĐĂNG NHẬP','Đăng nhập Sandbox trước khi mua vật phẩm.');
   return false;
  }
  const balance=userProfile.currency;
  const inventory=Array.isArray(userProfile.inventory)?userProfile.inventory:[];
  const plan=core.quotePurchase({
   itemId,coins:balance,state:userProfile.economyV43,
   inventoryCount:inventory.length
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
  const previous={coins:userProfile.currency,inventory:userProfile.inventory,
   ledger:userProfile.economyV43};
  try{
   userProfile.currency=plan.coins;
   userProfile.inventory=[item,...inventory];
   userProfile.economyV43=plan.state;
   saveCurrentAccount();
  }catch(_){
   userProfile.currency=previous.coins;
   userProfile.inventory=previous.inventory;
   if(previous.ledger===undefined)delete userProfile.economyV43;
   else userProfile.economyV43=previous.ledger;
   alertMessage('GIAO DỊCH CHƯA LƯU','Thiết bị chưa lưu được. Đã hoàn trả Xu và vật phẩm.');
   return false;
  }
  alertMessage('ĐÃ MUA THÀNH CÔNG',
    item.name+' (-'+plan.product.price+' Xu). Xem trong Kho Xuyên Thế Giới.');
  root.renderShop();
  return true;
 }
 function questEvent(type,eventId){
  if(!owner())return false;
  rotate();
  const plan=core.recordEvent(userProfile.economyV43,{type,eventId});
  if(!plan.ok)return false;
  userProfile.economyV43=plan.state;
  old.advanceQuest(plan.questId,1);
  return true;
 }
 root.renderShop=function(){
  if(!sandbox())return old.renderShop.apply(this,arguments);
  const host=document.getElementById('shop-items-container');
  const balance=document.getElementById('shop-currency-val');
  if(balance)balance.textContent=String(userProfile.currency||0);
  return root.DuduMarketUIV43?.render({
   host,coins:Number(userProfile.currency)||0,
   state:userProfile.economyV43,onBuy:buy
  })||false;
 };
 root.buyShopItem=buy;
 root.renderQuests=function(){
  if(sandbox())rotate();
  const result=old.renderQuests.apply(this,arguments);
  if(sandbox()){
   const reset=document.querySelector('#phone-app-quests .dudu-v27-quest-tools button');
   if(reset){
    reset.disabled=true;
    reset.classList.remove('btn-danger');
    reset.textContent='Tự làm mới theo ngày';
    reset.title='Nhiệm vụ hằng ngày chỉ được đặt lại khi chuyển sang ngày mới';
   }
   const host=document.getElementById('quests-container');
   if(host){
    const oldBanner=host.querySelector('.dudu-v43-quest-status');
    oldBanner?.remove();
    const banner=document.createElement('div');
    banner.className='dudu-v43-quest-status';
    const daily=(Array.isArray(userProfile.quests)?userProfile.quests:[])
      .filter(q=>q.type==='DAILY');
    const done=daily.filter(q=>q.claimed).length;
    banner.textContent='✦ Nhiệm vụ hôm nay · '+done+'/'+daily.length+
     ' đã nhận · Tự làm mới khi sang ngày mới';
    host.prepend(banner);
   }
  }
  return result;
 };
 root.advanceQuest=function(){
  if(sandbox())rotate();
  return old.advanceQuest.apply(this,arguments);
 };
 root.claimQuestReward=function(){
  if(sandbox())rotate();
  return old.claimQuestReward.apply(this,arguments);
 };
 root.refreshDailyQuests=function(){
  if(!sandbox())return old.refreshDailyQuests.apply(this,arguments);
  const menu=document.querySelector('#phone-app-quests .dudu-v27-quest-menu');
  if(menu)menu.open=false;
  rotate();
  alertMessage('NHIỆM VỤ HẰNG NGÀY',
   'Nhiệm vụ tự làm mới vào ngày mới. Không thể đặt lại thủ công để nhận Xu trùng.');
  root.renderQuests();
  return false;
 };
 root.DuduEconomyRuntimeV43=Object.freeze({buy,rotate,questEvent});
})(typeof window!=='undefined'?window:{});
