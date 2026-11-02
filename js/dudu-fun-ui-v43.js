/* DUDU FUN C2.5 — free daily rounds in Sandbox and personal main.
 * Main receipts are committed by the UID-scoped bridge. No cash prizes.
 */
(function(root){
 'use strict';
 const rules=root.DuduFunRulesV43;
 if(!rules)return;
 const $=id=>document.getElementById(id);
 const el=(tag,cls,text)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=String(text);
  return n;
 };
 const gold=(tag,cls,amount)=>el(tag,(cls?cls+' ':'')+'dudu-money-display--gold',amount);
 const withGold=(tag,cls,prefix,amount,suffix='')=>{
  const node=el(tag,cls);
  if(prefix)node.append(el('span','',prefix));
  node.append(gold('span','',amount));
  if(suffix)node.append(el('span','',suffix));
  return node;
 };
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 const signed=()=>!!currentUsername&&(sandbox()||
  (!!root.DuduAuth?.isReady?.()&&root.DuduAuth.uid()===currentUsername));
 const bridge=()=>root.DuduFunLiveBridgeC25;
 const lucky=()=>root.DuduPersonalScratchC28;
 const luckyBridge=()=>root.DuduScratchLiveBridgeC28;
 const blind=()=>root.DuduPersonalBlindBoxC29;
 const blindBridge=()=>root.DuduBlindBoxLiveBridgeC29;
 let liveUid=null,liveState=null,liveLoaded=false,liveLoading=false,liveError=false;
 let luckyUid=null,luckyState=null,luckyLoaded=false,luckyLoading=false,luckyError=false,
  luckyBusy=false,luckyCurrency=null,luckyTheme='dragon';
 let blindUid=null,blindState=null,blindLoaded=false,blindLoading=false,
  blindError=false,blindBusy=false,blindCurrency=null;
 // Visual-only, one-use celebration. It is never persisted with the receipt.
 let revealMoment=null,luckyOutcomeMoment=null;
 let scratchLocal={id:null,cells:new Set()};
 let noticeText='';
 // One shared in-flight FUN operation per page. Individual games already use
 // Firestore transactions/receipts; this stops ordinary fast cross-tab clicks
 // from racing stale balance displays or starting two purchases together.
 let funActionBusy=false;
 function stored(){
  if(sandbox())return userProfile.duduFunV43;
  return liveLoaded?liveState:null;
 }
 let open='box',hint=true,processing=false;
 const day=()=>!sandbox()&&root.DuduPersonalFunC25?
  root.DuduPersonalFunC25.utcDay():root.DuduEconomyCoreV43.localDay();
 function ensureLive(){
  if(sandbox())return;
  const uid=signed()?bridge()?.uid?.():null;
  if(uid!==liveUid){
   liveUid=uid;liveState=null;liveLoaded=false;liveLoading=false;
   liveError=false;noticeText='';
  }
  if(!uid||liveLoaded||liveLoading||liveError)return;
  liveLoading=true;
  void bridge().load().then(result=>{
   if(liveUid!==uid)return;
   liveState=result.state;liveLoaded=true;liveError=false;
  }).catch(error=>{
   if(liveUid!==uid)return;
   console.warn('DUDU FUN main read:',error?.reason||error?.message);
   liveError=true;
  }).finally(()=>{
   if(liveUid!==uid)return;
   liveLoading=false;render();
  });
 }
 function ensureLucky(){
  if(sandbox()||!lucky()||!luckyBridge())return;
  const uid=signed()?luckyBridge().uid?.():null;
  if(uid!==luckyUid){luckyUid=uid;luckyState=null;luckyLoaded=false;
   luckyLoading=false;luckyError=false;luckyCurrency=null;
   scratchLocal={id:null,cells:new Set()};luckyOutcomeMoment=null;}
  if(!uid||luckyLoaded||luckyLoading||luckyError)return;
  luckyLoading=true;
  void luckyBridge().load().then(result=>{
   if(luckyUid!==uid)return;
   luckyState=result.state;luckyCurrency=result.currency;luckyLoaded=true;luckyError=false;
  }).catch(error=>{if(luckyUid!==uid)return;luckyError=true;
   console.warn('DUDU Lucky card load:',error?.reason||error?.message);
  }).finally(()=>{if(luckyUid!==uid)return;luckyLoading=false;render();});
 }
 function ensureBlind(){
  if(sandbox()||!blind()||!blindBridge())return;
  const uid=signed()?blindBridge().uid?.():null;
  if(uid!==blindUid){blindUid=uid;blindState=null;blindLoaded=false;
   blindLoading=false;blindError=false;blindCurrency=null;revealMoment=null;}
  if(!uid||blindLoaded||blindLoading||blindError)return;
  blindLoading=true;
  void blindBridge().load().then(result=>{
   if(blindUid!==uid)return;
   blindState=result.state;blindCurrency=result.currency;blindLoaded=true;blindError=false;
  }).catch(error=>{if(blindUid!==uid)return;blindError=true;
   console.warn('DUDU blind box read:',error?.reason||error?.message);
  }).finally(()=>{if(blindUid!==uid)return;blindLoading=false;render();});
 }
 async function blindAction(kind,mode){
  if(!signed()||!blindLoaded||blindBusy||funActionBusy||!blindBridge()?.ready?.())return;
  const uid=blindUid;
  blindBusy=true;funActionBusy=true;message('');
  // Immediate button feedback while the existing Firestore transaction runs.
  const actionButton=document.querySelector('#dudu-fun-content-v43 .'+
   (kind==='claim'?'blind-reveal':mode==='free'?'blind-free':'blind-paid'));
  if(actionButton){actionButton.disabled=true;actionButton.textContent='✦ ĐANG XỬ LÝ…';}
  try{
   const opts={kind,id:kind==='start'?crypto.randomUUID():blindState.active?.id};
   if(kind==='start'){
    const roll=new Uint32Array(1);crypto.getRandomValues(roll);
    opts.roll=Math.floor(roll[0]/4294967296*blind().TOTAL);opts.mode=mode;
   }
   const response=await blindBridge().run(opts);
   if(uid!==blindUid||!signed())return;
   blindState=response.state;blindCurrency=response.currency;
   luckyCurrency=response.currency;
   if(kind==='start')message('');
   if(kind==='claim'&&response.status==='applied'&&response.reward){
    revealMoment={id:response.state?.active?.id,rank:response.reward.item.rank};
    message(response.reward.duplicate?
     'Trùng vật phẩm đã có · hoàn lại '+response.reward.returned+' Xu Vàng.':
     'Đã thêm '+response.reward.item.name+' vào Kho và Sổ Vạn Bảo!');
   }
  }catch(error){
   const reasons={'not-enough-xu':'Cần 20 Xu Vàng để mua thêm một hộp.',
    'inventory-full':'Kho đã đầy. Hãy dọn chỗ rồi thử lại nhé.',
    'unfinished-box':'Mở hộp đang chờ trước khi mua hộp mới.',
    'free-used':'Hôm nay đã nhận lượt miễn phí rồi.',
    'wallet-cap':'Ví đã đầy, hãy dùng bớt Xu Vàng trước.',
    'box-not-found':'Hộp này không còn ở đây. Hãy mở lại DUDU FUN.'};
   message(reasons[error?.reason]||root.DuduPersonalErrorC416?.message(error,
    'Chưa mở được hộp. Hãy thử lại.')||'Chưa mở được hộp. Hãy thử lại.');
   blindLoaded=false;blindError=false;
  }finally{blindBusy=false;funActionBusy=false;render();}
 }
 async function luckyAction(kind,cell){
  if(!signed()||!luckyLoaded||luckyBusy||funActionBusy||!luckyBridge()?.ready?.())return false;
  const uid=luckyUid,ticket=luckyState?.active;
  luckyBusy=true;funActionBusy=true;message('');
  try{
   const opts={kind,id:kind==='buy'?crypto.randomUUID():ticket?.id};
   if(kind==='buy'){
    const a=new Uint32Array(2);crypto.getRandomValues(a);
    opts.roll=Math.floor(a[0]/4294967296*1000000);
    opts.seed=a[1]%1000001;opts.theme=lucky().THEMES[a[1]%lucky().THEMES.length].id;
   }
   if(kind==='scratch')opts.cell=cell;
   const response=await luckyBridge().run(opts);
   if(uid!==luckyUid||!signed())return false;
   luckyState=response.state;luckyCurrency=response.currency;
   blindCurrency=response.currency;
   if(kind==='buy'){
    scratchLocal={id:response.state?.active?.id,cells:new Set()};
    luckyOutcomeMoment=null;
    message('Vé đã vào tay bạn! Hãy cào các số để dò giải.');
   }
   if(kind==='claim'&&response.status==='applied'){
    luckyOutcomeMoment={id:response.state?.active?.id,amount:response.reward.amount};
    message(response.reward.amount?
     '✦ '+response.reward.tier+' · +'+response.reward.amount+' Xu Vàng vào Ví!':
     'Lần này chưa trúng số. Chúc bạn may mắn ở vé tiếp theo!');
   }
   return true;
  }catch(error){
   const errors={'not-enough-xu':'Bạn cần ít nhất 10 Xu Vàng trong Ví để mua vé.',
    'unfinished-ticket':'Hãy cào và nhận giải của vé hiện tại trước nhé.',
    'wallet-cap':'Ví đã đầy, hãy dùng bớt Xu Vàng trước khi nhận.',
    'ticket-not-found':'Vé này đã được thay thế. Hãy tải lại trò chơi.',
    'not-ready':'Bạn cần cào đủ ba ô để nhận giải.'};
   message(errors[error?.reason]||root.DuduPersonalErrorC416?.message(error,
    'Chưa thực hiện được. Hãy kiểm tra kết nối rồi thử lại.')||
    'Chưa thực hiện được. Hãy kiểm tra kết nối rồi thử lại.');
   luckyLoaded=false;luckyError=false;
   return false;
  }finally{luckyBusy=false;funActionBusy=false;render();}
 }
 function rng(){
  const a=new Uint32Array(2);
  crypto.getRandomValues(a);
  return {roll:a[0]/4294967296,seed:a[1]%1000001};
 }
 function saveNewState(next){
  if(!signed()||!sandbox())return false;
  const old=userProfile.duduFunV43;
  try{
   userProfile.duduFunV43=next;
   saveCurrentAccount();return true;
  }catch(_){
   if(old===undefined)delete userProfile.duduFunV43;
   else userProfile.duduFunV43=old;
   return false;
  }
 }
 function message(msg){
  noticeText=msg;
  const notice=$('dudu-v43-fun-notice');
  if(notice)notice.textContent=msg;
 }
 async function liveAction(kind,options={}){
  if(!signed()||!liveLoaded||processing||funActionBusy||!bridge()?.ready?.())return false;
  const uid=liveUid,type=open;
  processing=true;funActionBusy=true;message('');
  try{
   const opts={kind,type,...options};
   if(kind==='begin')Object.assign(opts,rng());
   if(kind==='advance')opts.actionId=crypto.randomUUID();
   const result=await bridge().run(opts);
   if(liveUid!==uid||!signed())return false;
   liveState=result.state;liveLoaded=true;
   if(kind==='begin')hint=true;
   if(kind==='advance'&&type==='box')hint=!result.correct;
   if(kind==='claim'&&result.status==='applied'){
    if(Number.isSafeInteger(result.currency)){
     luckyCurrency=result.currency;blindCurrency=result.currency;
    }
    if(typeof showSystemAlert==='function')showSystemAlert('DUDU FUN · ĐÃ NHẬN',
     result.reward.kind==='COIN'?'+'+result.reward.amount+' Xu Vàng vào Ví.':
      result.reward.label+' đã vào Kho.');
   }
   return true;
  }catch(error){
   console.warn('DUDU FUN main action:',error?.code||error?.reason||error?.message);
   const reasons={'already-started':'Lượt chơi hôm nay đã bắt đầu.',
    'already-claimed':'Bạn đã nhận phần thưởng này rồi.',
    'not-ready-or-claimed':'Hoàn thành trò chơi trước khi nhận thưởng nhé.',
    'inventory-full':'Kho đã đầy. Hãy để trống một ô rồi nhận lại.',
    'wallet-cap':'Ví Xu Vàng đã đạt giới hạn.',
    'clock-backwards':'Ngày chơi chưa khớp. Hãy kiểm tra đồng hồ.'};
   message(reasons[error?.reason]||root.DuduPersonalErrorC416?.message(error,
    'Chưa thực hiện được. Hãy thử lại khi kết nối ổn định.')||
    'Chưa thực hiện được. Hãy thử lại khi kết nối ổn định.');
   // A second device may have changed the round; reread before retrying.
   liveState=null;liveLoaded=false;liveError=false;
   return false;
  }finally{processing=false;funActionBusy=false;render();}
 }
 function begin(theme){
  if(!sandbox()){void liveAction('begin',{theme});return;}
  if(!signed()||processing)return;
  processing=true;
  try{
   const random=rng();
   const result=rules.begin(stored(),{type:open,theme,
    roll:random.roll,seed:random.seed});
   if(!result.ok){message('Lượt hôm nay đã bắt đầu hoặc đã sử dụng.');return;}
   if(!saveNewState(result.state)){
    message('Không lưu được lượt chơi. Chưa tạo vé mới.');return;
   }
   hint=true;render();
  }finally{processing=false;}
 }
 function play(choice){
  if(!sandbox()){void liveAction('advance',{choice});return;}
  if(!signed()||processing)return;
  processing=true;
  try{
   const result=rules.advance(stored(),{type:open,choice});
   if(!result.ok)return;
   if(!saveNewState(result.state)){
    message('Chưa lưu được tiến độ. Hãy thử lại.');return;
   }
   if(open==='box'&&!result.correct)hint=true;
   else if(open==='box')hint=false;
   render();
  }finally{processing=false;}
 }
 function claim(){
  if(!sandbox())return liveAction('claim');
  if(!signed()||processing)return false;
  processing=true;
  try{
   const plan=rules.claim(stored(),{
    type:open,coins:userProfile.currency,
    inventory:userProfile.inventory
   });
   if(!plan.ok){
    const names={'inventory-full':'Kho đã đầy. Hãy dọn một ô trống rồi nhận lại.',
     'wallet-cap':'Ví Xu Vàng đã đạt giới hạn. Không thể nhận thêm.',
     'not-ready-or-claimed':'Hãy hoàn thành trò chơi trước khi nhận thưởng.'};
    message(names[plan.reason]||'Chưa đủ điều kiện nhận thưởng.');
    return false;
   }
   if(!sandbox()){
    if(!saveNewState(plan.state)){message('Không lưu được lượt chơi trên thiết bị.');return false;}
    render();
    message('Hoàn tất lượt giải trí! Kết quả chỉ mang tính minh họa, không cộng Xu Vàng hay vật phẩm.');
    return true;
   }
   // Commit the game reward AND its daily quest event in one local profile write.
   const event=root.DuduEconomyRuntimeV43?.prepareQuestEvent(
    'FUN_CLAIM',open+'-'+root.DuduEconomyCoreV43.localDay());
   const old={state:userProfile.duduFunV43,currency:userProfile.currency,
    inventory:userProfile.inventory,quests:userProfile.quests,
    economy:userProfile.economyV43,questState:userProfile.questV437};
   try{
    userProfile.duduFunV43=plan.state;
    userProfile.currency=plan.coins;
    userProfile.inventory=plan.inventory;
    if(event){
     userProfile.quests=event.quests;
     userProfile.economyV43=event.ledger;
     userProfile.questV437=event.questState;
    }
    saveCurrentAccount();
   }catch(_){
    userProfile.duduFunV43=old.state;
    userProfile.currency=old.currency;
    userProfile.inventory=old.inventory;
    userProfile.quests=old.quests;
    if(old.economy===undefined)delete userProfile.economyV43;
    else userProfile.economyV43=old.economy;
    if(old.questState===undefined)delete userProfile.questV437;
    else userProfile.questV437=old.questState;
    message('Không lưu được phần thưởng. Chưa ghi nhận nhận thưởng.');
    return false;
   }
   render();
   if(typeof updatePhoneUI==='function')updatePhoneUI();
   if(typeof showSystemAlert==='function')showSystemAlert('DUDU FUN · ĐÃ NHẬN THƯỞNG',
    plan.reward.kind==='COIN'?('+'+plan.reward.amount+' Xu Vàng Sandbox'):
    ('Đã nhận '+plan.reward.label+' vào Kho Sandbox'));
   return true;
  }finally{processing=false;}
 }
 function view(){
  return rules.norm(signed()?stored():null,day());
 }
 function updateHeaderBalance(){
  const chip=$('dudu-fun-header-balance');if(!chip)return;
  // Both receipts commit to the same account wallet. Per-game load snapshots
  // can be older than a prize claimed in the other tab, so never present them
  // as the current balance after the account mirror has been refreshed.
  const currency=walletBalance();
  chip.textContent=signed()?Number(currency).toLocaleString('vi-VN'):'Khách';
 }
 function walletBalance(){
  const accountMoney=Number(userProfile?.currency);
  if(Number.isSafeInteger(accountMoney)&&accountMoney>=0)return accountMoney;
  const snapshot=open==='ticket'?luckyCurrency:blindCurrency;
  return Number.isSafeInteger(snapshot)&&snapshot>=0?snapshot:0;
 }
 function chestArt(opened=false){
  const holder=el('span','vanbao-chest-art'+(opened?' is-open':''));
  const img=el('img');
  img.src='assets/van-bao/v2/van-bao-chest-'+(opened?'open':'closed')+'.webp';
  img.alt='';img.width=768;img.height=768;img.decoding='async';
  img.onerror=()=>{img.onerror=null;img.replaceWith(el('span','vanbao-chest-fallback','✦'));};
  holder.append(img);return holder;
 }
 function viewTreasure(item,preview=false){
  if(!item||document.querySelector('dialog.vanbao-artifact-dialog'))return;
  const dialog=el('dialog','vanbao-artifact-dialog rank-'+item.rank.toLowerCase());
  const content=el('div','vanbao-artifact-panel');
  const close=el('button','vanbao-artifact-close','×');
  close.type='button';close.setAttribute('aria-label','Đóng ảnh bảo vật');
  close.onclick=()=>dialog.close();
  const picture=el('div','vanbao-artifact-large');
  if(!root.DuduItemArtV13?.mount?.(picture,item))picture.textContent=item.icon||'✦';
  content.append(close,el('small','vanbao-artifact-rank','✦ '+item.rank),
   picture,el('strong','',item.name),el('p','',item.desc));
  if(preview)content.append(el('small','vanbao-artifact-status','Chỉ ngắm · không nhận vật phẩm'));
  dialog.append(content);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  document.body.append(dialog);
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  close.focus();
 }
 function featuredTreasure(){
  const showcase=el('section','blind-treasure-showcase is-compact');
  showcase.setAttribute('aria-label','Bảo vật tiêu biểu có thể sưu tập');
  showcase.append(el('small','blind-treasure-eyebrow','✦ SƯU TẦM'));
  const jewels=el('div','blind-treasure-featured');
  for(const id of ['fun-celestial-harp','fun-eternal-crown','fun-universe-egg']){
   const item=root.DuduItemCatalog?.byId(id);if(!item)continue;
   const card=el('button','blind-treasure-feature rank-'+item.rank.toLowerCase());
   card.type='button';card.title=item.name+' · Hạng '+item.rank;
   card.setAttribute('aria-label','Ngắm '+item.name+' · hạng '+item.rank);
   const art=el('span','blind-treasure-feature-art');
   if(!root.DuduItemArtV13?.mount?.(art,item))art.textContent=item.icon;
   card.append(art,el('b','',item.rank),el('small','',item.name));
   card.addEventListener('click',()=>viewTreasure(item,true));jewels.append(card);
  }
  showcase.append(jewels);return showcase;
 }
 // Sandbox shows the art as a read-only gallery, while retaining its older
 // local-only memory game; it never calls the paid or free receipt bridge.
 function sandboxTreasurePreview(rootNode){
  const panel=el('section','vanbao-sandbox-gallery');
  panel.append(el('strong','','✦ Tủ Vạn Bảo · Xem thử'),
   el('small','','19 bảo vật AI · Chỉ ngắm, không mua hoặc nhận đồ'));
  panel.append(featuredTreasure());
  const album=el('details','vanbao-sandbox-album');
  album.append(el('summary','','Ngắm toàn bộ 19 bảo vật ›'));
  const grid=el('div','vanbao-sandbox-grid');
  for(const item of root.DuduItemCatalog?.funCollectibles||[]){
   const tile=el('button','vanbao-sandbox-item rank-'+item.rank.toLowerCase());
   tile.type='button';tile.setAttribute('aria-label','Ngắm '+item.name);
   const art=el('span','vanbao-sandbox-art');
   if(!root.DuduItemArtV13?.mount?.(art,item))art.textContent=item.icon;
   tile.append(art,el('small','',item.name));
   tile.addEventListener('click',()=>viewTreasure(item,true));grid.append(tile);
  }
  album.append(grid);panel.append(album);rootNode.append(panel);
 }
 function blindBoxes(rootNode){
  if(!blind()||!blindLoaded){
   rootNode.append(el('p','dudu-fun-caption',blindError?
    'Chưa mở được quầy Hộp Mù.':'Đang chuẩn bị tủ báu vật…'));
   if(blindError){const retry=el('button','dudu-fun-start','Thử lại');
    retry.onclick=()=>{blindError=false;render();};rootNode.append(retry);}
   return;
  }
  const s=blindState,active=s.active,items=root.DuduItemCatalog?.funCollectibles||[];
  rootNode.append(featuredTreasure());
  if(active?.status==='sealed'){
   const stage=el('div','blind-opening-stage');
   stage.append(chestArt(false));
   const claim=el('button','dudu-fun-claim blind-reveal','✦ MỞ HỘP NGAY');
   claim.type='button';claim.disabled=blindBusy||funActionBusy;
   claim.addEventListener('click',()=>{void blindAction('claim');});
   stage.append(claim);rootNode.append(stage);
  }else{
   // Once a receipt is claimed, the relic replaces the chest. Show the
   // unopened showroom chest only before the player starts a new box.
   if(!active){
    const display=el('div','vanbao-chest-kiosk');
    display.append(chestArt(false));
    rootNode.append(display);
   }
   if(active?.status==='claimed'){
    const item=root.DuduItemCatalog?.byId(active.itemId);
    if(item){
     const reveal=el('div','blind-result rank-'+item.rank.toLowerCase());
     const isMoment=revealMoment?.id===active.id;
     if(isMoment){
      const band=['SSS','SS','S'].includes(item.rank)?'legend':
       ['B','A'].includes(item.rank)?'rare':'common';
      reveal.classList.add('vanbao-celebrating','vanbao-tier-'+band);
      const burst=el('div','vanbao-open-burst');burst.append(chestArt(true));
      reveal.append(burst);
      const skip=el('button','vanbao-skip','Bỏ qua ›');
      skip.type='button';skip.addEventListener('click',()=>{
       reveal.classList.remove('vanbao-celebrating');skip.remove();
      });reveal.append(skip);revealMoment=null;
     }
     const picture=el('div','blind-result-art');
     if(!root.DuduItemArtV13?.mount?.(picture,item))picture.textContent=item.icon;
     reveal.append(picture,el('strong','',item.name),
      el('span','',active.duplicate?'Hạng '+item.rank+' · Đã hoàn Xu':'Hạng '+item.rank+' · Đã vào Kho'));
     const inspect=el('button','vanbao-inspect','✧ Ngắm bảo vật');
     inspect.type='button';inspect.addEventListener('click',()=>viewTreasure(item,false));
     reveal.append(inspect);
     rootNode.append(reveal);
    }
   }
   const controls=el('div','blind-buy-actions');
   if(s.lastFreeDay!==day()){
    const free=el('button','dudu-fun-start blind-free','🎁 MỞ MIỄN PHÍ HÔM NAY');
    free.type='button';free.disabled=blindBusy||funActionBusy;
    free.addEventListener('click',()=>{void blindAction('start','free');});controls.append(free);
   }else controls.append(el('small','blind-free-done','✓ Đã dùng lượt tặng hôm nay'));
   const paid=withGold('button','dudu-fun-start blind-paid','✨ MUA HỘP · ',blind().PRICE);
   paid.type='button';paid.disabled=blindBusy||funActionBusy||walletBalance()<blind().PRICE;
   paid.addEventListener('click',()=>{void blindAction('start','paid');});
   controls.append(paid);rootNode.append(controls);
  }
  const heading=el('div','blind-album-heading');
  heading.append(el('strong','','✦ Sổ Vạn Bảo · '+s.album.length+'/'+items.length),
   el('small','','Đã mở '+s.total+' hộp · Trùng '+s.duplicate+' lần'));
  rootNode.append(heading);
  const bar=el('div','lucky-album-track'),fill=el('i','');
  fill.style.width=(s.album.length/items.length*100)+'%';bar.append(fill);rootNode.append(bar);
  const albumBook=el('details','vanbao-album-book');
  albumBook.append(el('summary','','Xem bộ sưu tập · '+s.album.length+'/'+items.length+' món ›'));
  const grid=el('div','blind-album-grid');
  for(const item of items){
   const owned=s.album.includes(item.id),tile=el(owned?'button':'div','blind-album-tile'+
    (owned?' owned':' locked')+' rank-'+item.rank.toLowerCase());
   if(owned){tile.type='button';tile.setAttribute('aria-label','Ngắm '+item.name);
    tile.addEventListener('click',()=>viewTreasure(item,false));}
   const picture=el('span','blind-album-art');
   picture.setAttribute('aria-hidden','true');
   if(!root.DuduItemArtV13?.mount?.(picture,item))picture.textContent='✧';
   tile.append(picture,el('small','',owned?item.name:'Bảo vật chưa tìm thấy'),
    el('b','',item.rank));grid.append(tile);
  }
  albumBook.append(grid);rootNode.append(albumBook);
  if(s.history?.length){
   const history=el('details','vanbao-pull-history');
   history.append(el('summary','','Lịch sử mở hộp · '+s.total+' lần'));
   for(const row of s.history.slice(-8).reverse()){
    const item=root.DuduItemCatalog?.byId(row.itemId);
    const line=el('div','vanbao-pull-row');
    line.append(el('span','',row.day+' · '+(row.mode==='free'?'Tặng':'Mua')),
     el('strong','',item?.name||'Bảo vật'),
     el('small','',row.duplicate?'Trùng · hoàn 4':'Hạng '+(item?.rank||'?')));
    history.append(line);
   }
   rootNode.append(history);
  }
  const odds=el('details','lucky-odds');
  odds.append(el('summary','','✦ Xem tỷ lệ từng phẩm chất'));
  const list=el('div','lucky-odds-list');
  for(const rank of ['SSS','SS','S','A','B','C','D','E']){
   const chance=blind().POOL.filter(p=>p.rank===rank).reduce((n,p)=>n+p.weight,0);
   const row=el('div','lucky-odds-row');
   row.append(el('span','','Hạng '+rank),
    el('b','',(chance/10000).toLocaleString('vi-VN',{maximumFractionDigits:4})+'%'));
   list.append(row);
  }
  odds.append(list,el('small','','Mọi hộp có cùng tỷ lệ. Trùng món đã có được hoàn 4 Xu Vàng; không tạo vật phẩm trùng.'));
  rootNode.append(odds);
  // Outstanding old C2.5 daily boxes remain claimable; we do not delete them.
  const legacy=view().rounds.box;
  if(legacy&&['playing','ready'].includes(legacy.status)){
   const older=el('details','dudu-fun-history');older.open=true;
   older.append(el('summary','','Hộp Mù cũ đang mở dở · hoàn tất để nhận quà'));
   const legacyHost=el('div','blind-legacy');boxes(legacyHost,legacy);
   older.append(legacyHost);rootNode.append(older);
  }
 }
 function boxes(rootNode,round){
  if(!round){
   rootNode.append(el('p','dudu-fun-caption',
    'Chọn một hộp theo sở thích. Ba hộp có cùng tỷ lệ thưởng.'));
   const group=el('div','dudu-fun-box-list');
   for(const [theme,label,icon] of [
    ['star','Tinh Tú','🌟'],['moon','Trăng Non','🌙'],['flower','Hoa Mộng','🌸']]){
    const button=el('button','dudu-fun-box',icon);
    button.type='button';button.dataset.theme=theme;
    button.append(el('small','',label));
    button.addEventListener('click',()=>begin(theme));
    group.append(button);
   }
   rootNode.append(group);
   return;
  }
  rootNode.append(el('p','dudu-fun-caption',
   round.status==='claimed'?'Hộp hôm nay đã mở. Ngày mai sẽ có hộp mới.':
   round.status==='ready'?'Đã giải đúng mật mã. Bạn có thể nhận phần thưởng.':
   'Nhớ chuỗi ba biểu tượng, sau đó chạm theo đúng thứ tự.'));
  if(round.status==='playing'){
   const lock=el('div','dudu-fun-code');
   lock.append(el('span','',hint?'Mật mã: ':'Đang nhập: '));
   if(hint)for(const code of rules.sequence(round.seed))
     lock.append(el('span','dudu-fun-code-symbol',rules.SYMBOLS[code]));
   else lock.append(el('strong','',round.step+'/3 đúng'));
   const show=el('button','dudu-fun-hint',hint?'Ẩn gợi ý':'Xem lại mật mã');
   show.type='button';show.addEventListener('click',()=>{hint=!hint;render();});
   lock.append(show);rootNode.append(lock);
   const options=el('div','dudu-fun-symbols');
   for(let i=0;i<rules.SYMBOLS.length;i++){
    const button=el('button','dudu-fun-symbol',rules.SYMBOLS[i]);
    button.type='button';button.setAttribute('aria-label','Chọn '+rules.SYMBOLS[i]);
    button.addEventListener('click',()=>play(i));options.append(button);
   }
   rootNode.append(options);
  }
  if(round.status==='ready')claimButton(rootNode);
  if(round.status==='claimed')rewardPanel(rootNode,round.reward);
 }
 function claimButton(target){
  const button=el('button','dudu-fun-claim','🎁 Nhận phần thưởng');
  button.type='button';button.addEventListener('click',claim);
  target.append(button);
 }
 function rewardPanel(target,reward){
  const r=el('div','dudu-fun-win');
  r.append(el('span','',reward.kind==='COIN'?'✦':'🎁'),
   reward.kind==='COIN'?withGold('strong','', '+',reward.amount):el('strong','',reward.label),
   el('small','',sandbox()?'Đã nhận trong Sandbox · quay lại ngày mai':
    'Đã nhận vào tài khoản · quay lại ngày mai'));
  target.append(r);
 }
 function lottery(rootNode,round){
  if(!sandbox()){numberLottery(rootNode);return;}
  if(!round){
   rootNode.append(el('p','dudu-fun-caption',
    'Một vé miễn phí hôm nay. Cào ba ô bất kỳ để mở giải.'));
   const buy=el('button','dudu-fun-start','🎟️ Nhận vé miễn phí');
   buy.type='button';buy.addEventListener('click',()=>begin('star'));
   rootNode.append(buy);return;
  }
  rootNode.append(el('p','dudu-fun-caption',
   round.status==='claimed'?'Vé hôm nay đã nhận giải.':
   round.status==='ready'?'Đã cào đủ ba ô. Nhận thưởng để hoàn tất.':
   'Chạm hoặc kéo qua ba ô để cào. Đã cào '+round.cells.length+'/3 ô.'));
  const card=el('div','dudu-fun-ticket-grid');
  for(let i=0;i<9;i++){
   const opened=round.cells.includes(i);
   const b=el('button','dudu-fun-scratch'+(opened?' is-open':''),opened?
    rules.SYMBOLS[(round.seed+i*7)%rules.SYMBOLS.length]:'✦');
   b.type='button';b.dataset.scratch=String(i);
   b.disabled=opened||round.status!=='playing';
   b.setAttribute('aria-label',opened?'Ô '+(i+1)+' đã mở':'Cào ô '+(i+1));
   b.addEventListener('click',()=>play(i));
   b.addEventListener('pointerdown',(event)=>{
    if(event.pointerType==='touch')event.preventDefault();
   });
   card.append(b);
  }
  rootNode.append(card);
  if(round.status==='ready')claimButton(rootNode);
  if(round.status==='claimed')rewardPanel(rootNode,round.reward);
 }
 // A successful Firestore claim causes exactly one visual pulse. Reloads and
 // duplicate claim acknowledgments must never replay a win animation.
 function takeLuckyOutcome(active){
  if(active?.status!=='claimed'||!luckyOutcomeMoment||
     luckyOutcomeMoment.id!==active.id)return '';
  const moment=luckyOutcomeMoment;luckyOutcomeMoment=null;
  return moment.amount>0?'win':'loss';
 }
 function luckyOddsSummary(rule){
  const total=rule.PRIZES.reduce((n,p)=>n+p.weight,0);
  const payout=rule.PRIZES.reduce((n,p)=>n+p.weight*p.amount,0)/total;
  const chance=predicate=>rule.PRIZES.filter(predicate)
   .reduce((n,p)=>n+p.weight,0)/total*100;
  const fmtPercent=n=>n.toLocaleString('vi-VN',{maximumFractionDigits:4})+'%';
  const overview=el('div','lucky-odds-overview');
  for(const [label,value] of [
   ['Lãi ròng',fmtPercent(chance(p=>p.amount>rule.PRICE))],
   ['Hòa vốn',fmtPercent(chance(p=>p.amount===rule.PRICE))],
   ['Lỗ ròng',fmtPercent(chance(p=>p.amount<rule.PRICE))]]){
   const stat=el('span','lucky-odds-stat');
   stat.append(el('small','',label),el('b','',value));overview.append(stat);
  }
  const signedNet=payout-rule.PRICE;
  const note=el('small','lucky-odds-math',
   'Giá '+rule.PRICE+' Xu · Trả trung bình '+payout.toLocaleString('vi-VN',
    {maximumFractionDigits:2})+' Xu/vé · Kỳ vọng '+
   (signedNet<0?'−':'+')+Math.abs(signedNet).toLocaleString('vi-VN',
    {maximumFractionDigits:2})+' Xu/vé. Đây là thống kê dài hạn, không bảo đảm kết quả từng vé.');
  return [overview,note];
 }
 function numberLottery(rootNode){
  const rule=lucky();
  if(!rule||!luckyLoaded){
   rootNode.append(el('p','dudu-fun-caption',luckyError?
    'Chưa mở được quầy vé. Hãy thử lại.':'Đang chuẩn bị vé cào…'));
   if(luckyError){const retry=el('button','dudu-fun-start','Thử lại');
    retry.addEventListener('click',()=>{luckyError=false;render();});rootNode.append(retry);}
   return;
  }
  const s=luckyState,a=s.active;
  if(a&&a.layout!=='numbers'&&a.status!=='claimed'){
   rootNode.append(el('p','dudu-fun-caption',
    'Vé kiểu cũ của bạn vẫn còn nguyên. Cào nốt và nhận giải trước khi đổi vé mới nhé.'));
   luckyLottery(rootNode);return;
  }
  // The tab and the printed ticket already identify the game and its price.
  // Keep the play area first, without a second gold-lettered headline.
  if(a?.layout==='numbers'){
   if(scratchLocal.id!==a.id)scratchLocal={id:a.id,cells:new Set()};
   const ticket=rule.cardNumbers(a.seed,a.amount);
   const outcome=takeLuckyOutcome(a);
   const card=el('div','lucky-number-card'+(outcome?' lucky-outcome-'+outcome:''));
   const top=el('div','lucky-number-top');
   top.append(el('i','','Vé số may mắn'),gold('b','',10));
   card.append(top);
   const banner=el('div','lucky-number-banner');
   banner.append(el('span','','✦ ✦ ✦'),el('strong','','WINNER'),
    el('small','','GIẢI CAO NHẤT 10.000 XU'));
   card.append(banner);
   const target=el('div','lucky-winning-number');
   const star=el('div','lucky-winning-star');
   star.append(el('small','','SỐ MAY MẮN'),el('strong','',ticket.winning));
   target.append(star,el('p','','Cào các số: trùng số may mắn sẽ trúng Xu Vàng ghi dưới ô. Năm hộp quà bên dưới có thể chứa lộc bất ngờ!'));
   card.append(target);
   const panel=el('div','lucky-number-panel');
   panel.append(el('b','','DÃY SỐ CỦA BẠN'));
   const grid=el('div','lucky-number-grid');
   function scratchCell(index){
    if(luckyBusy||a.status!=='playing'||scratchLocal.cells.has(index))return;
    scratchLocal.cells.add(index);
    const button=grid.children[index],entry=ticket.tiles[index];
    button.classList.remove('covered');button.classList.add('revealed');
    if(entry.match)button.classList.add('matched');
    button.replaceChildren(el('strong','',entry.number),
     gold('small','',entry.prize.toLocaleString('vi-VN')));
    button.setAttribute('aria-label','Số '+entry.number+' · '+entry.prize+' Xu Vàng');
    button.disabled=true;
    const counter=card.querySelector('.lucky-number-count');
    if(counter)counter.textContent='Đã cào '+scratchLocal.cells.size+'/10 ô';
    if(scratchLocal.cells.size===10)void luckyAction('reveal');
   }
   for(const [i,entry] of ticket.tiles.entries()){
    const opened=a.status!=='playing'||scratchLocal.cells.has(i),
     tile=el('button','lucky-number-cell'+(opened?' revealed':' covered')+
       (opened&&entry.match?' matched':''));
    tile.type='button';tile.disabled=opened||luckyBusy||funActionBusy;
    tile.setAttribute('aria-label',opened?'Số '+entry.number:'Cào ô số '+(i+1));
    if(opened)tile.append(el('strong','',entry.number),
     gold('small','',entry.prize.toLocaleString('vi-VN')));
    else tile.append(el('strong','','✦'),el('small','','CÀO'));
    tile.addEventListener('click',()=>scratchCell(i));grid.append(tile);
   }
   // Drag across cells as well as tap: works with mouse and touch in a narrow phone.
   let dragging=false;
   grid.addEventListener('pointerdown',event=>{
    if(a.status!=='playing')return;
    dragging=true;
    const i=[...grid.children].indexOf(event.target.closest('.lucky-number-cell'));
    if(i>=0)scratchCell(i);
   });
   grid.addEventListener('pointermove',event=>{
    if(!dragging||a.status!=='playing')return;
    const under=document.elementFromPoint(event.clientX,event.clientY);
    const tile=under?.closest?.('.lucky-number-cell');
    const i=[...grid.children].indexOf(tile);
    if(i>=0)scratchCell(i);
   });
   for(const type of ['pointerup','pointercancel','pointerleave'])
    grid.addEventListener(type,()=>{dragging=false;});
   panel.append(grid);card.append(panel);
   const ribbon=el('div','lucky-number-gifts');
   ribbon.append(el('b','','QUÀ BẤT NGỜ'));
   const gifts=el('div','lucky-gift-strip');
   for(let i=0;i<5;i++){
    const openGift=a.status!=='playing'||scratchLocal.cells.size===10,
     gift=el('span','lucky-gift'+(openGift&&ticket.gifts[i]?' is-prize':''));
    gift.append(el('strong','',openGift&&ticket.gifts[i]?'🧧':'🎁'),
     openGift&&ticket.gifts[i]?gold('small','',ticket.gifts[i].toLocaleString('vi-VN')):el('small','',openGift?'✧':'?'));
    gifts.append(gift);
   }
   ribbon.append(gifts);
   card.append(ribbon,el('div','lucky-number-count',
    a.status==='playing'?'Đã cào '+scratchLocal.cells.size+'/10 ô':
     a.amount?'TRÚNG '+a.amount.toLocaleString('vi-VN'):'CHƯA TRÚNG GIẢI'));
   card.append(el('small','lucky-number-foot','TRÙNG SỐ · NHẬN LỘC · MAY MẮN ĐẾN NHÀ'));
   rootNode.append(card);
   if(a.status==='ready'){
    const claim=a.amount?withGold('button','dudu-fun-claim lucky-claim','NHẬN ',a.amount.toLocaleString('vi-VN')):
     el('button','dudu-fun-claim lucky-claim','✓ HOÀN TẤT VÉ');
    claim.disabled=luckyBusy||funActionBusy;claim.addEventListener('click',()=>{void luckyAction('claim');});
    rootNode.append(claim);
   }
   if(a.status==='claimed')rootNode.append(el('p','lucky-last-win',a.amount?
    'Đã nhận '+a.amount.toLocaleString('vi-VN')+' Xu Vàng vào Ví. Mua vé tiếp thôi!':
    'Vé này không trúng. Có muốn thử tấm tiếp theo không?'));
  }
  if(!a||a.status==='claimed'){
   const buy=withGold('button','dudu-fun-start lucky-buy','🧧 MUA VÉ · ',rule.PRICE);
   buy.type='button';buy.disabled=luckyBusy||funActionBusy||walletBalance()<rule.PRICE;
   buy.addEventListener('click',()=>{void luckyAction('buy');});rootNode.append(buy);
  }
  const odds=el('details','lucky-odds');
  odds.append(el('summary','','✧ Luật thưởng · 13 mức giải và tỷ lệ'));
  odds.append(...luckyOddsSummary(rule));
  const list=el('div','lucky-odds-list');
  for(const prize of [...rule.PRIZES].reverse()){
   const row=el('div','lucky-odds-row');
    row.append(withGold('span','',prize.tier+' · ',prize.amount.toLocaleString('vi-VN')),
    el('b','',(prize.weight/10000).toLocaleString('vi-VN',{maximumFractionDigits:4})+'%'));
   list.append(row);
  }
  odds.append(list,el('small','',
   'Mỗi vé có xác suất độc lập. Kết quả được trình duyệt chọn và lưu khi mua vé, chưa có xác minh ngẫu nhiên từ máy chủ.'));
  rootNode.append(odds);
  if(s.history.length){
   const history=el('details','dudu-fun-history');
   history.append(el('summary','','Lịch sử vé cào · '+s.total+' lượt'));
   for(const h of s.history.slice(-8).reverse()){
    const line=el('div','dudu-fun-history-line');
    line.append(el('span','',h.day+' · Vé Vạn Phúc'),
     gold('strong','',h.amount.toLocaleString('vi-VN')));
    history.append(line);
   }
   rootNode.append(history);
  }
 }
 function luckyLottery(rootNode){
  const rule=lucky();
  if(!rule||!luckyLoaded){
   rootNode.append(el('p','dudu-fun-caption',luckyError?
    'Chưa tải được quầy vé của bạn. Hãy thử lại.':'Đang mở quầy vé may mắn…'));
   if(luckyError){const retry=el('button','dudu-fun-start','Thử lại');
    retry.addEventListener('click',()=>{luckyError=false;render();});rootNode.append(retry);}
   return;
  }
  const s=luckyState,active=s.active,
   theme=rule.THEMES.find(t=>t.id===(active?.theme||luckyTheme))||rule.THEMES[0];
  if(!active||active.status==='claimed'){
   const shelf=el('div','lucky-theme-grid');
   for(const design of rule.THEMES){
    const count=s.album[design.id]||0;
    const tile=el('button','lucky-theme lucky-theme-'+design.id+(luckyTheme===design.id?' selected':''));
    tile.type='button';tile.disabled=luckyBusy||funActionBusy;tile.setAttribute('aria-pressed',String(luckyTheme===design.id));
    tile.append(el('span','lucky-theme-icon',design.symbol),
     el('b','',design.name),el('small','',count?'Đã chọn '+count+' lượt':'Chọn mẫu vé'));
    tile.addEventListener('click',()=>{luckyTheme=design.id;render();});shelf.append(tile);
   }
   rootNode.append(shelf);
   const buy=withGold('button','dudu-fun-start lucky-buy','🧧 MUA VÉ · ',rule.PRICE);
   buy.disabled=luckyBusy||funActionBusy||walletBalance()<rule.PRICE;
   buy.type='button';buy.addEventListener('click',()=>{void luckyAction('buy');});
   rootNode.append(buy);
  }
  if(active){
   const design=rule.THEMES.find(t=>t.id===active.theme)||theme;
   const outcome=takeLuckyOutcome(active);
   const card=el('div','lucky-card lucky-theme-'+design.id+
    (outcome?' lucky-outcome-'+outcome:''));
   const heading=el('div','lucky-card-top');
   heading.append(el('b','','DUDU · 萬福'),el('small','','THẺ LỘC #'+active.id.slice(-6).toUpperCase()));
   card.append(heading);
   const emblem=el('div','lucky-card-emblem',design.symbol);
   emblem.append(el('small','',design.name));card.append(emblem);
   const grid=el('div','lucky-scratch-grid'),symbols=rule.symbols(active.seed);
   for(let i=0;i<9;i++){
    const opened=active.cells.includes(i);
    const tile=el('button','lucky-scratch-cell'+(opened?' opened':''),opened?symbols[i]:'✦');
    tile.type='button';tile.disabled=opened||active.status!=='playing'||luckyBusy||funActionBusy;
    tile.setAttribute('aria-label',opened?'Ô '+(i+1)+' đã cào':'Cào ô '+(i+1));
    tile.addEventListener('click',()=>{void luckyAction('scratch',i);});
    grid.append(tile);
   }
   card.append(grid);
   card.append(el('small','lucky-card-foot',active.status==='playing'?
    'CÀO '+active.cells.length+'/3 Ô ĐỂ MỞ LỘC':
    active.amount===0?'LẦN NÀY CHƯA TRÚNG GIẢI':
    '✦ '+rule.PRIZES.find(p=>p.amount===active.amount).tier.toUpperCase()+' · '+active.amount+' XU ✦'));
   rootNode.append(card);
   if(active.status==='ready'){
    const claim=active.amount?withGold('button','dudu-fun-claim lucky-claim','🧧 Nhận ',active.amount):
     el('button','dudu-fun-claim lucky-claim','✓ Hoàn tất lượt cào');
    claim.disabled=luckyBusy||funActionBusy;claim.addEventListener('click',()=>{void luckyAction('claim');});
    rootNode.append(claim);
   }
   if(active.status==='claimed')rootNode.append(el('p','lucky-last-win',
    active.amount?'✦ Đã nhận '+active.amount+' Xu Vàng · Chọn mẫu và mua vé tiếp!':
    'Vé này không trúng giải. Thử một vận may khác nhé!'));
  }
  // Historical theme counters remain in saved data, but tickets are never a
  // collectible album. Only the purchase/result history is displayed below.
  const odds=el('details','lucky-odds');
  odds.append(el('summary','','✧ Luật thưởng · 13 hạng giải và tỷ lệ'));
  odds.append(...luckyOddsSummary(rule));
  const list=el('div','lucky-odds-list');
  for(const prize of [...rule.PRIZES].reverse()){
   const row=el('div','lucky-odds-row');
   row.append(withGold('span','',prize.tier+' · ',prize.amount.toLocaleString('vi-VN')),
    el('b','',Number((prize.weight/10000).toFixed(4)).toLocaleString('vi-VN',{maximumFractionDigits:4})+'%'));
   list.append(row);
  }
  odds.append(list,el('small','',
   'Mỗi vé có xác suất độc lập. Kết quả được trình duyệt chọn và lưu khi mua vé, chưa có xác minh ngẫu nhiên từ máy chủ.'));
  rootNode.append(odds);
  if(s.history.length){
   const book=el('details','dudu-fun-history');
   book.append(el('summary','','Vé cào đã nhận giải ('+s.total+' lượt mua)'));
   for(const h of s.history.slice(-8).reverse()){
    const title=rule.THEMES.find(t=>t.id===h.theme)?.name||'Vạn Phúc';
    const line=el('div','dudu-fun-history-line');
    line.append(el('span','',h.day+' · '+title),gold('strong','',h.amount));
    book.append(line);
   }
   rootNode.append(book);
  }
 }
 function history(target,state){
  if(!state.history.length)return;
  const details=el('details','dudu-fun-history');
  const summary=el('summary','','Lịch sử phần thưởng ('+state.history.length+')');
  details.append(summary);
  for(const row of state.history.slice(-5).reverse()){
   const line=el('div','dudu-fun-history-line');
   line.append(el('span','',row.day+' · '+(row.type==='box'?'Hộp Mù':'Vé Số')),
    row.reward.kind==='COIN'?gold('strong','',row.reward.amount):el('strong','',row.reward.label));
   details.append(line);
  }
  target.append(details);
 }
 function render(){
  const host=$('dudu-fun-content-v43');if(!host)return false;
  updateHeaderBalance();
  ensureLive();
  if(!sandbox())ensureBlind();
  if(open==='ticket'&&!sandbox())ensureLucky();
  host.replaceChildren();
  if(!sandbox()&&signed()&&!liveLoaded){
   host.append(el('p','dudu-fun-guest',liveError?
    'Chưa tải được lượt chơi của bạn.':'Đang mở lượt chơi của bạn…'));
   if(liveError){
    const retry=el('button','dudu-fun-start','Thử lại');
    retry.type='button';retry.addEventListener('click',()=>{
     liveError=false;render();
    });host.append(retry);
   }
   return true;
  }
  if(!signed()){
   host.append(el('p','dudu-fun-guest',
    sandbox()?'Đăng nhập Sandbox để nhận lượt chơi riêng của tài khoản. Chưa có phần thưởng nào được tạo.':
    'Đăng nhập để khám phá hai trò chơi và nhận thưởng.'));
   return true;
  }
  const tabs=el('div','dudu-fun-tabs');
  for(const [type,label] of [['box','🎁 Vạn Bảo'],['ticket','🎟️ Vé Cào'],
   ['slot','🎰 Máy Quay']]){
   const button=el('button','dudu-fun-tab'+(open===type?' is-active':''),label);
   button.type='button';button.setAttribute('aria-pressed',String(open===type));
   button.addEventListener('click',()=>{open=type;hint=true;render();});
   tabs.append(button);
  }
  host.append(tabs);
  const content=el('section','dudu-fun-stage'+(open==='slot'?' is-slot':''));
  const state=view(),round=state.rounds[open];
  if(open==='slot'){
   if(root.DuduCasinoSlotUIV1?.mount)
    root.DuduCasinoSlotUIV1.mount({host:content,demo:true,
     sessionKey:'fun:'+currentUsername});
   else content.append(el('p','dudu-fun-caption','Máy Quay Vạn Tượng đang chuẩn bị…'));
  }else if(open==='box'){
   if(sandbox()){boxes(content,round);sandboxTreasurePreview(content);}
   else blindBoxes(content);
  }
  else lottery(content,round);
  host.append(content);
  host.append(el('p','dudu-fun-notice',noticeText));
  history(host,state);
  if(sandbox())host.append(el('small','dudu-fun-disclaimer',
   'Bản thử: Vé Số miễn phí mỗi ngày. Xu Vàng và vật phẩm chỉ thuộc Sandbox.'));
  return true;
 }
 function init(){
  const launch=$('dudu-fun-launch-v43');
  if(launch)launch.hidden=false;
 }
 root.DuduFunUIV43=Object.freeze({init,render});
 init();
})(typeof window!=='undefined'?window:{});
