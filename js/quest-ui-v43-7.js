/* V43.7 — compact and accessible Quest 2.0 Cyber Phone view (Sandbox). */
(function(root){
 'use strict';
 const engine=root.DuduQuestEngineV437;
 if(!engine)return;
 let tab='ALL';
 const tabs=[['ALL','Tất cả'],['DAILY','Ngày'],['WEEKLY','Tuần'],
  ['STORY','Truyện'],['NPC','NPC'],['EVENT','Sự kiện']];
 const icons={DAILY:'☀️',WEEKLY:'🗓️',STORY:'📖',MAIN:'📖',NPC:'💝',EVENT:'🎊'};
 const labels={DAILY:'Hằng ngày',WEEKLY:'Hằng tuần',STORY:'Hành trình truyện',
  MAIN:'Chính tuyến',NPC:'Kết nối NPC',EVENT:'Sự kiện DUDU'};
 const $=(tag,cls,copy)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(copy!==undefined)el.textContent=String(copy);
  return el;
 };
 function render({host,quests=[],questState=null,signed=false,onClaim,readOnly=false}={}){
  if(!host)return false;
  host.replaceChildren();
  host.classList.add('dudu-v437-quest-root');
  const legacy=document.getElementById('quest-legacy-tabs-v43');
  if(legacy)legacy.hidden=true;
  if(!signed){
   const blank=$('div','dudu-v437-empty');
   blank.append($('strong','','🔒 Nhiệm vụ cá nhân'),
    $('p','',readOnly?'Đăng nhập Firebase để xem tiến độ hiện tại.':'Đăng nhập tài khoản thử nghiệm để lưu tiến độ và nhận thưởng trong Sandbox.'));
   host.append(blank);return true;
  }
  const rows=Array.isArray(quests)?quests:[];
  const stats=engine.stats(rows);
  const daily=rows.filter(q=>q?.type==='DAILY');
  const dailyDone=daily.filter(q=>q.claimed).length;
  const summary=$('section','dudu-v437-summary');
  const top=$('div','dudu-v437-summary-top');
  const words=$('div','dudu-v437-summary-copy');
  words.append($('small','','DUDU · NHIỆM VỤ 2.0'),
   $('strong','','Một chút tiến bộ mỗi ngày'));
  const completed=$('span','dudu-v437-counter',dailyDone+'/'+daily.length);
  completed.title='Nhiệm vụ ngày đã nhận thưởng';
  top.append(words,completed);
  const track=$('div','dudu-v437-track'),fill=$('span','dudu-v437-fill');
  fill.style.width=(daily.length?dailyDone/daily.length*100:0)+'%';
  track.append(fill);
  const note=$('p','dudu-v43-quest-status',
   '✦ '+stats.ready+' nhiệm vụ có thể nhận · Tự làm mới theo ngày/tuần');
  summary.append(top,track,note);
  host.append(summary);
  const nav=$('nav','dudu-v437-tabs');
  nav.setAttribute('aria-label','Lọc nhiệm vụ');
  for(const [id,name] of tabs){
   const count=rows.filter(q=>id==='ALL'||(id==='STORY'?
    q?.type==='STORY'||q?.type==='MAIN':q?.type===id)).length;
   const btn=$('button','dudu-v437-tab'+(tab===id?' is-active':''),name);
   btn.type='button';btn.setAttribute('aria-pressed',String(tab===id));
   btn.title=name+' · '+count+' nhiệm vụ';
   btn.addEventListener('click',()=>{tab=id;render({host,quests,questState,signed,onClaim,readOnly});});
   nav.append(btn);
  }
  host.append(nav);
  const caption=$('p','dudu-v437-subtitle',
   tab==='ALL'?'Hoàn thành hoạt động để mở phần thưởng':
   tab==='WEEKLY'?'Nhiệm vụ tuần làm mới vào Thứ Hai':
   tab==='EVENT'?'Sự kiện Hộp Mù/Vé Số miễn phí mỗi ngày':
   tab==='STORY'?'Mốc mở chương và hành trình chính tuyến':
   tab==='NPC'?'Kỷ niệm chỉ là tiến độ Sandbox; chưa phải kỷ vật máy chủ':
   'Lượt ngày tự làm mới lúc sang ngày mới');
  host.append(caption);
  const list=$('div','dudu-v437-cards');
  const visible=rows.filter(q=>tab==='ALL'||(tab==='STORY'?
   q?.type==='STORY'||q?.type==='MAIN':q?.type===tab));
  visible.sort((a,b)=>{
   const priority=q=>q.claimed?2:q.current>=q.target?0:1;
   return priority(a)-priority(b);
  });
  for(const q of visible){
   if(!q||!q.id)continue;
   const ready=!q.claimed&&Number(q.current)>=Number(q.target);
   const target=Math.max(1,Number(q.target)||1),current=Math.min(target,Math.max(0,Number(q.current)||0));
   const card=$('article','dudu-v437-card'+(ready?' is-ready':'')+(q.claimed?' is-claimed':''));
   card.dataset.questId=q.id;
   card.dataset.questType=q.type||'';
   const header=$('div','dudu-v437-row');
   const icon=$('span','dudu-v437-icon',q.icon||icons[q.type]||'✦');
   const text=$('div','dudu-v437-copy');
   const title=$('strong','',q.title||'Nhiệm vụ');
   const type=$('small','',labels[q.type]||q.type||'Nhiệm vụ');
   text.append(type,title);
   header.append(icon,text);
   const status=$('span','dudu-v437-status',
    q.claimed?'✓ Đã nhận':ready?'Sẵn sàng':current+'/'+target);
   header.append(status);
   card.append(header,$('p','dudu-v437-desc',q.desc||'Thực hiện hoạt động để nhận thưởng.'));
   const meter=$('div','dudu-v437-meter'),bar=$('span','');
   bar.style.width=(current/target*100)+'%';meter.append(bar);
   meter.setAttribute('role','progressbar');
   meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(target));
   meter.setAttribute('aria-valuenow',String(current));
   meter.setAttribute('aria-label','Tiến độ '+(q.title||'nhiệm vụ'));
   card.append(meter);
   const bottom=$('div','dudu-v437-row dudu-v437-bottom');
   const item=q.rewardItem?' · 🎁 1 vật phẩm':'';
   const reward=$('span','dudu-v437-reward','🪙 '+(q.rewardCoin||0)+
    ' Xu · ✦ '+(q.rewardExp||0)+' EXP'+item);
   bottom.append(reward);
   if(ready&&!readOnly&&typeof onClaim==='function'){
    const btn=$('button','dudu-v437-claim','Nhận ›');
    btn.type='button';btn.setAttribute('aria-label','Nhận thưởng '+q.title);
    btn.addEventListener('click',()=>onClaim(q.id));
    bottom.append(btn);
   }else if(ready&&readOnly){
    bottom.append($('span','dudu-v437-received','Chờ xác thực'));
   }else if(q.claimed){
    bottom.append($('span','dudu-v437-received','Hoàn tất'));
   }
   card.append(bottom);list.append(card);
  }
  if(!visible.length)list.append($('p','dudu-v437-empty',
   'Danh mục này hiện chưa có nhiệm vụ. Tiến độ cũ vẫn được bảo toàn.'));
  host.append(list);
  const s=engine.state(questState);
  const history=$('details','dudu-v437-history');
  history.append($('summary','', '🕘 Lịch sử nhận thưởng · '+s.history.length+' lần'));
  if(!s.history.length)history.append($('p','','Chưa có lần nhận thưởng nào được ghi ở bản V43.7.'));
  else for(const line of s.history.slice(-15).reverse()){
   const h=$('div','dudu-v437-history-line');
   h.append($('span','',line.day+' · '+line.title),
    $('strong','','+'+line.coins+' Xu / '+line.exp+' EXP'));
   history.append(h);
  }
  host.append(history,$('p','dudu-v437-disclaimer',readOnly?
   'Tiến độ tham khảo từ hồ sơ hiện tại. Nhận Xu, EXP hoặc vật phẩm phải được máy chủ xác thực.':
   'Chỉ là tiến độ và phần thưởng trên thiết bị Sandbox; không cấp kỷ vật thật hoặc quyền máy chủ.'));
  return true;
 }
 root.DuduQuestUIV437=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
