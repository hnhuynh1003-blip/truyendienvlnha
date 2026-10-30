/* DUDU V52 — legacy verified economy + personal Spark alternative.
 * V52 server calls remain isolated and read-only when disabled. Private Spark
 * accounts may opt into transactions on their own profile via the separate
 * DuduPersonalSparkItemsV1 module; neither path deploys Cloud Functions.
 */
(function(root){
 'use strict';
 if(!root||!root.document)return;
 const $=id=>document.getElementById(id);
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 const uid=()=>!sandbox()&&root.DuduAuth?.isReady?.()?root.DuduAuth.uid():null;
 const personal=()=>!!uid()&&root.DUDU_SPARK_ITEMS_V1_READY===true&&
  !!root.DuduPersonalSparkItemsV1;
 const endpoint=name=>{
  if(!root.firebase?.functions)throw Error('Firebase Functions chưa được tải.');
  return root.firebase.functions('asia-southeast1').httpsCallable(name);
 };
 const call=async(name,data={})=>(await endpoint(name)(data)).data;
 let snapshot=null,owner='',loading=null,busy=false;
 let personalBusy=false;
 const add=(tag,cls,text)=>{const node=document.createElement(tag);
  if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
 function panel(id,before){
  let host=$(id);if(host)return host;
  if(!before?.parentNode)return null;
  host=add('section','dudu-v52-status');host.id=id;
  host.setAttribute('aria-live','polite');before.parentNode.insertBefore(host,before);
  return host;
 }
 function disabled(message){
  return {enabled:false,message:message||'Ví Xu máy chủ chưa được bật. Số dư cũ chưa được xác thực.'};
 }
 async function load(force=false){
  const account=uid();
  if(!account){snapshot=disabled('Đăng nhập Firebase để xem tài sản đã xác thực.');owner='';return snapshot;}
  if(!force&&account===owner&&snapshot?.enabled)return snapshot;
  if(!force&&loading&&account===owner)return loading;
  if(owner!==account)snapshot=null;
  owner=account;
  loading=(async()=>{
   try{
    const result=await call('duduEconomyStatus');
    if(uid()!==account)return disabled('Phiên tài khoản đã thay đổi.');
    snapshot=result?.enabled===true?result:disabled(
     'Cửa hàng máy chủ chưa được kích hoạt; có thể xem hàng nhưng chưa giao dịch.');
   }catch(error){
    if(uid()===account){
     snapshot=disabled('Máy chủ kinh tế chưa sẵn sàng (Functions/App Check/Rules). Chưa thay đổi Xu hoặc Kho.');
     console.warn('DUDU economy status:',error?.code||'unavailable');
    }
   }finally{loading=null;}
   return snapshot||disabled('Chưa tải được trạng thái kinh tế.');
  })();
  return loading;
 }
 function banner(target,state,label){
  if(!target)return;
  target.replaceChildren();
  const heading=add('strong','',label);
  const note=add('small','',state.enabled?
   'Số dư thật: '+state.balance+' Xu · Kho: '+state.inventoryCount+' món · Ngày UTC: '+state.serverDay:
   state.message||'Kinh tế máy chủ chưa hoạt động.');
  target.append(heading,note);
 }
 function showMarket(state){
  const shop=$('shop-items-container'),box=$('dudu-v52-shop-status');
  if(!shop)return;
  banner(box,state,'🛡 DUDU MARKET · '+(state.enabled?'Ví xác thực':'Chế độ xem'));
  const legacyBalance=$('shop-currency-val');
  if(legacyBalance)legacyBalance.textContent=state.enabled?String(state.balance):
   'chưa xác thực ('+String(userProfile?.currency||0)+')';
  if(!root.DuduMarketUIV43)return;
  root.DuduMarketUIV43.render({
   host:shop,coins:state.enabled?state.balance:Number(userProfile?.currency)||0,
   state:state.enabled?{version:1,day:state.serverDay,
    total:state.daily?.total||0,counts:state.daily?.counts||{},events:[]}:userProfile?.economyV43,
   stories:typeof novels!=='undefined'?novels:[],
   readRewards:userProfile?.readRewards||{},
   functionalState:state.enabled?null:userProfile?.functionalV438,
   readOnly:!state.enabled,saleIds:state.enabled?state.saleIds:[],
   onBuy:purchase
  });
 }
 const personalPurchaseKey=account=>'dudu-personal-shop:pending:'+account;
 function showPersonalMarket(){
  if(!personal())return false;
  const shop=$('shop-items-container');if(!shop)return false;
  // The phone already has a shop title and wallet balance. Remove a stale
  // legacy status card, if present; personal purchases need no extra banner.
  $('dudu-v52-shop-status')?.remove?.();
  const balance=$('shop-currency-val');
  if(balance)balance.textContent=String(userProfile?.currency||0);
  return root.DuduMarketUIV43?.render({
   host:shop,coins:Number(userProfile?.currency)||0,state:null,
   stories:typeof novels!=='undefined'?novels:[],
   readRewards:userProfile?.readRewards||{},functionalState:null,
   personalMode:true,readOnly:false,
   saleIds:[...root.DuduEconomyCoreV43.SHOP_IDS,
    root.DuduEconomyCoreV43.SUPPLY_ID,root.DuduEconomyCoreV43.TOOL_ID,
    root.DuduEconomyCoreV43.PULSE_ID],
   onBuy:personalPurchase
  })||false;
 }
 async function personalPurchase(itemId){
  const account=uid(),engine=root.DuduPersonalSparkItemsV1;
  if(!personal()||personalBusy||!account||!engine)return false;
  const key=personalPurchaseKey(account);
  let pending=null;
  try{pending=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
  if(pending?.itemId!==itemId)pending=null;
  if(!pending)pending={itemId,requestId:engine.requestId('shop')};
  try{localStorage.setItem(key,JSON.stringify(pending));}
  catch(_){
   root.showSystemAlert?.('CHƯA MUA ĐƯỢC','Không lưu được mã giao dịch trên thiết bị.');
   return false;
  }
  personalBusy=true;
  try{
   const result=await engine.run({db:root.firebase.firestore(),auth:root.firebase.auth(),
    uid:account,kind:'purchase',requestId:pending.requestId,itemId});
   if(uid()!==account)return false;
   userProfile.currency=result.balance;
   userProfile.inventory=result.inventory;
   userProfile.storyStates=result.storyStates;
   localStorage.setItem('profile_'+account,JSON.stringify(userProfile));
   localStorage.removeItem(key);
   showPersonalMarket();
   root.renderWallet?.();
   root.showSystemAlert?.('ĐÃ MUA VẬT PHẨM',
    (result.status==='already-applied'?'Đã xác nhận lại đơn mua. ':'')+
    'Đồ đã vào Kho · Số dư: '+result.balance+' Xu.');
   return true;
  }catch(e){
   console.warn('DUDU Spark personal shop:',e?.message||'unavailable');
   root.showSystemAlert?.('CHƯA XÁC NHẬN ĐƠN MUA',
    'Kiểm tra kết nối rồi bấm mua lại đúng món này. Sẽ không trừ Xu hai lần.');
   return false;
  }finally{personalBusy=false;}
 }
 async function openShop(){
  if(sandbox())return;
  if(personal()){showPersonalMarket();return;}
  const shop=$('shop-items-container');if(!shop)return;
  const box=panel('dudu-v52-shop-status',shop);
  banner(box,disabled('Đang hỏi máy chủ Firebase…'),'🛡 DUDU MARKET');
  const state=await load(true);
  if(uid())showMarket(state);
  else banner(box,state,'🛡 DUDU MARKET');
 }
 const pendingKey=account=>'dudu-v52-purchase-pending:'+account;
 async function purchase(itemId){
  const account=uid();
  if(!account||owner!==account||busy||!snapshot?.enabled||
   !snapshot.saleIds?.includes(itemId))return false;
  let requestId='';
  try{
   const prior=JSON.parse(sessionStorage.getItem(pendingKey(account))||'null');
   requestId=prior?.itemId===itemId?prior.requestId:'';
  }catch(_){}
  if(!requestId)requestId=crypto.randomUUID();
  busy=true;
  try{
   sessionStorage.setItem(pendingKey(account),JSON.stringify({itemId,requestId}));
   const result=await call('duduEconomyPurchase',{itemId,requestId});
   if(uid()!==account)return false;
   sessionStorage.removeItem(pendingKey(account));
   if(!result?.ok)throw Error('Giao dịch chưa được xác nhận.');
   await load(true);showMarket(snapshot);
   root.showSystemAlert?.('MUA HÀNG THÀNH CÔNG',
    'Đã xác thực máy chủ: -'+result.price+' Xu. Vật phẩm nằm trong Kho máy chủ.');
   return true;
  }catch(e){
   // Unknown network outcome retains requestId for safe replay.
   if(['functions/failed-precondition','functions/invalid-argument',
     'functions/already-exists'].includes(e?.code))
    sessionStorage.removeItem(pendingKey(account));
   root.showSystemAlert?.('CHƯA XÁC NHẬN GIAO DỊCH',
    'Không trừ Xu phía trình duyệt. Kiểm tra kết nối rồi thử lại bằng yêu cầu cũ.');
   return false;
  }finally{busy=false;}
 }
 function buildQuest(state){
  const main=$('quests-container'),host=panel('dudu-v52-quest-status',main);
  if(!host)return;
  host.replaceChildren();
  host.append(add('strong','','🛡 Điểm danh máy chủ'));
  host.append(add('small','',state.enabled?
   'Nhận 8 Xu + 8 EXP một lần/ngày UTC; lưu trong ví máy chủ, không ghi vào hồ sơ Xu cũ.':
   state.message||'Chưa mở thưởng máy chủ.'));
  const button=add('button','btn btn-primary',
   state.enabled&&state.checkinDay===state.serverDay?'✓ Đã điểm danh':
   'Nhận điểm danh máy chủ');
  button.type='button';button.disabled=!state.enabled||
   state.checkinDay===state.serverDay||busy;
  button.onclick=async()=>{
   if(button.disabled||busy||!uid())return;
   const account=uid();button.disabled=true;busy=true;
   try{
    const receipt=await call('duduEconomyDailyCheckIn');
    if(uid()!==account)return;
    await load(true);buildQuest(snapshot);
    root.showSystemAlert?.('ĐIỂM DANH MÁY CHỦ',
     receipt.alreadyClaimed?'Đã ghi nhận hôm nay.':'+'+receipt.award.coins+
     ' Xu · +'+receipt.award.exp+' EXP đã được máy chủ xác thực.');
   }catch(error){
    if(uid()===account){
      button.disabled=false;
      root.showSystemAlert?.('CHƯA ĐIỂM DANH ĐƯỢC',
       'Chưa có xác nhận từ máy chủ. Hãy thử lại sau khi thiết lập Functions/App Check.');
    }
   }finally{busy=false;}
  };
  host.append(button);
 }
 async function openQuests(){
  if(sandbox())return;
  const main=$('quests-container');if(!main)return;
  const host=panel('dudu-v52-quest-status',main);
  banner(host,disabled('Đang kiểm tra quyền nhận thưởng…'),'🛡 Nhiệm vụ');
  buildQuest(await load(true));
 }
 async function openInventory(){
  if(sandbox())return;
  if(personal()){
   const old=$('dudu-v52-server-items');if(old)old.remove();
   return;
  }
  const container=$('inventory-container')||$('inventory-v12-detail')||
   $('phone-app-inventory')?.querySelector('.phone-app-header');
  if(!container)return;
  const block=panel('dudu-v52-server-items',container);
  if(!block)return;
  banner(block,disabled('Đang tải Kho máy chủ…'),'🛡 Vật phẩm xác thực');
  const state=await load(true);
  block.replaceChildren();
  block.append(add('strong','','🛡 Vật phẩm đã xác thực trên máy chủ'));
  block.append(add('small','',state.enabled?'Đang sở hữu '+state.inventoryCount+
   ' vật phẩm máy chủ. Hiển thị tối đa 30 vật phẩm gần nhất.':
   (state.message||'Kho máy chủ chưa kích hoạt.')));
  if(!state.enabled)return;
  for(const row of state.items||[]){
   const label=root.DuduItemCatalog?.byId?.(row.itemId);
   block.append(add('div','dudu-v52-item',
    (label?.icon||'🎁')+' '+(label?.name||row.itemId)+' · Máy chủ xác nhận'));
  }
 }
 root.DuduEconomyLiveV52=Object.freeze({openShop,openQuests,openInventory,load});
})(typeof window!=='undefined'?window:null);
