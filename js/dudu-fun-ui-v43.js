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
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 const signed=()=>!!currentUsername&&(sandbox()||
  (!!root.DuduAuth?.isReady?.()&&root.DuduAuth.uid()===currentUsername));
 const bridge=()=>root.DuduFunLiveBridgeC25;
 let liveUid=null,liveState=null,liveLoaded=false,liveLoading=false,liveError=false;
 let noticeText='';
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
  if(!signed()||!liveLoaded||processing||!bridge()?.ready?.())return false;
  const uid=liveUid,type=open;
  processing=true;message('');
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
    if(typeof showSystemAlert==='function')showSystemAlert('DUDU FUN · ĐÃ NHẬN',
     result.reward.kind==='COIN'?'+'+result.reward.amount+' Xu vào Ví.':
      result.reward.label+' đã vào Kho.');
   }
   return true;
  }catch(error){
   console.warn('DUDU FUN main action:',error?.reason||error?.message);
   const reasons={'already-started':'Lượt chơi hôm nay đã bắt đầu.',
    'already-claimed':'Bạn đã nhận phần thưởng này rồi.',
    'not-ready-or-claimed':'Hoàn thành trò chơi trước khi nhận thưởng nhé.',
    'inventory-full':'Kho đã đầy. Hãy để trống một ô rồi nhận lại.',
    'wallet-cap':'Ví đã đạt giới hạn Xu.',
    'clock-backwards':'Ngày chơi chưa khớp. Hãy kiểm tra đồng hồ.'};
   message(reasons[error?.reason]||'Chưa thực hiện được. Hãy thử lại khi kết nối ổn định.');
   // A second device may have changed the round; reread before retrying.
   liveState=null;liveLoaded=false;liveError=false;
   return false;
  }finally{processing=false;render();}
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
     'wallet-cap':'Ví Xu đã đạt giới hạn. Không thể nhận thêm.',
     'not-ready-or-claimed':'Hãy hoàn thành trò chơi trước khi nhận thưởng.'};
    message(names[plan.reason]||'Chưa đủ điều kiện nhận thưởng.');
    return false;
   }
   if(!sandbox()){
    if(!saveNewState(plan.state)){message('Không lưu được lượt chơi trên thiết bị.');return false;}
    render();
    message('Hoàn tất lượt giải trí! Kết quả chỉ mang tính minh họa, không cộng Xu hay vật phẩm.');
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
    plan.reward.kind==='COIN'?('+'+plan.reward.amount+' Xu Sandbox'):
    ('Đã nhận '+plan.reward.label+' vào Kho Sandbox'));
   return true;
  }finally{processing=false;}
 }
 function view(){
  return rules.norm(signed()?stored():null,day());
 }
 function heading(container){
  const top=el('div','dudu-fun-top');
  const name=el('div','dudu-fun-title');
  name.append(el('strong','','✦ DUDU FUN'),
    el('span','','Giải trí sau mỗi chương truyện'));
  const money=el('span','dudu-fun-balance',
    signed()?'🪙 '+userProfile.currency+' Xu':'Khách');
  top.append(name,money);
  container.append(top);
  const state=view(),status=rules.progress(state);
  const meter=el('div','dudu-fun-daily-meter');
  meter.append(el('strong','','Hoạt động hôm nay'),
    el('span','',status.done+'/2 đã hoàn thành'));
  const rail=el('div','dudu-fun-bar'),fill=el('span','dudu-fun-bar-fill');
  fill.style.width=(status.done/2*100)+'%';
  rail.append(fill);
  container.append(meter,rail);
  const caption=el('small','dudu-fun-disclaimer',
   sandbox()?'2 trò miễn phí/ngày · Xu và vật phẩm chỉ thuộc Sandbox · Không bán lượt chơi':
   '2 trò miễn phí/ngày · Nhận Xu và vật phẩm vào tài khoản của bạn');
  container.append(caption);
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
  r.append(el('span','',reward.kind==='COIN'?'🪙':'🎁'),
   el('strong','',reward.kind==='COIN'?'+'+reward.amount+' Xu':reward.label),
   el('small','',sandbox()?'Đã nhận trong Sandbox · quay lại ngày mai':
    'Đã nhận vào tài khoản · quay lại ngày mai'));
  target.append(r);
 }
 function lottery(rootNode,round){
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
 function history(target,state){
  if(!state.history.length)return;
  const details=el('details','dudu-fun-history');
  const summary=el('summary','','Lịch sử phần thưởng ('+state.history.length+')');
  details.append(summary);
  for(const row of state.history.slice(-5).reverse()){
   const line=el('div','dudu-fun-history-line');
   line.append(el('span','',row.day+' · '+(row.type==='box'?'Hộp Mù':'Vé Số')),
    el('strong','',row.reward.kind==='COIN'?row.reward.amount+' Xu':row.reward.label));
   details.append(line);
  }
  target.append(details);
 }
 function render(){
  const host=$('dudu-fun-content-v43');if(!host)return false;
  ensureLive();
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
  heading(host);
  if(!signed()){
   host.append(el('p','dudu-fun-guest',
    sandbox()?'Đăng nhập Sandbox để nhận lượt chơi riêng của tài khoản. Chưa có phần thưởng nào được tạo.':
    'Đăng nhập để khám phá hai trò chơi và nhận thưởng.'));
   return true;
  }
  const tabs=el('div','dudu-fun-tabs');
  for(const [type,label] of [['box','🎁 Hộp Mù'],['ticket','🎟️ Vé Số']]){
   const button=el('button','dudu-fun-tab'+(open===type?' is-active':''),label);
   button.type='button';button.setAttribute('aria-pressed',String(open===type));
   button.addEventListener('click',()=>{open=type;hint=true;render();});
   tabs.append(button);
  }
  host.append(tabs);
  const content=el('section','dudu-fun-stage');
  const state=view(),round=state.rounds[open];
  if(open==='box')boxes(content,round);
  else lottery(content,round);
  host.append(content);
  host.append(el('p','dudu-fun-notice',noticeText));
  history(host,state);
  host.append(el('small','dudu-fun-disclaimer',
   'Tỷ lệ Hộp Mù: 50% 5 Xu · 25% 9 Xu · 15% bánh quy · 10% đồ uống. Vé Số: 50% 3 Xu · 30% 6 Xu · 15% 10 Xu · 4% 20 Xu · 1% 40 Xu. Không bán vé hoặc đổi tiền thật.'));
  return true;
 }
 function init(){
  const launch=$('dudu-fun-launch-v43');
  if(launch)launch.hidden=false;
 }
 root.DuduFunUIV43=Object.freeze({init,render});
 init();
})(typeof window!=='undefined'?window:{});
