/* C4.29 — local Arcade memory exhibits. Read-only mirrors of the existing
 * account-scoped game save, NEVER verified collectible grants or inventory.
 * C4.26's separate server-verified shelf remains authoritative for rewards.
 */
(function(root){
 'use strict';
 if(!root.document)return;
 const core=root.DuduPersonalArcadeCoreV1;
 const species=core?.FISH_SPECIES||{};
 const ids=Object.keys(species);
 const milestones=Object.freeze([
  {id:'neon',title:'Chủ Phố Đêm',sub:'Trạm Neon',goal:25,
   count:s=>s.neon.guestsServed,suffix:'khách',hint:'Phục vụ 25 khách'},
  {id:'mine',title:'Người Mở Mạch',sub:'Địa Tầng 07',goal:40,
   count:s=>s.mine.dug,suffix:'lượt đào',hint:'Đào 40 lượt'},
  {id:'garden',title:'Người Giữ Hồ',sub:'Vườn Sương',goal:5,
   count:s=>ids.filter(id=>s.garden.fishAlbum[id]>0).length,suffix:'loài',hint:'Tìm được 5 loài cá'},
  {id:'jade',title:'Tay Ngọc Đầu Tiên',sub:'Ngọc Phường',goal:12,
   count:s=>s.jade?.sold||0,suffix:'viên bán',hint:'Bán 12 viên ngọc'}
 ]);
 const $=(tag,cls,value)=>{
  const element=root.document.createElement(tag);
  if(cls)element.className=cls;
  if(value!==undefined)element.textContent=String(value);
  return element;
 };
 let host=null,owner='',isSandbox=false,wing='trophies',fishSelected='',trophySelected='neon',snapshot=null;
 const safeCount=n=>Number.isSafeInteger(n)&&n>=0?n:0;
 const discovered=s=>ids.filter(id=>safeCount(s.garden.fishAlbum[id])>0);
 function gameIdentity(){
  if(isSandbox)return owner?'sandbox:'+owner:null;
  const uid=root.DuduAuth?.isReady?.()&&root.DuduAuth?.uid?.();
  return typeof uid==='string'&&uid?uid:null;
 }
 function readSave(){
  if(!core)return null;
  const identity=gameIdentity();if(!identity)return null;
  try{
   const key='dudu-personal-arcade:v1:'+encodeURIComponent(identity);
   const raw=root.localStorage?.getItem?.(key);
   // Empty slot means progress has not started; don't fabricate a save.
   return raw?core.norm(JSON.parse(raw),Date.now()):null;
  }catch(_){return null;}
 }
 function addButton(parent,label,className,click){
  const b=$('button',className,label);b.type='button';b.addEventListener('click',click);parent.append(b);return b;
 }
 function fishPortrait(id,cls=''){
  const art=$('span','museum-c429-fish-art fish-'+id+' '+cls);
  art.setAttribute('aria-hidden','true');return art;
 }
 function selectedFish(s){
  const owned=discovered(s);
  if(!owned.includes(fishSelected))fishSelected=owned[0]||'';
  return fishSelected;
 }
 function updateWing(next){wing=next;paint();}
 function shell(){
  host.replaceChildren();
  const head=$('div','museum-c429-entrance');
  const text=$('div','');text.append($('small','','✦ KÝ ỨC ARCADE · LƯU TRÊN THIẾT BỊ'),
   $('strong','','Điện trưng bày của bạn'));
  head.append(text,$('span','museum-c429-total','0 / 4'));host.append(head);
  const nav=$('div','museum-c429-wings');nav.setAttribute('role','group');
  nav.setAttribute('aria-label','Chọn gian trưng bày Arcade');
  for(const [id,label] of [['trophies','Điện chiến tích'],['fish','Thủy Cung Sương']]){
   const b=addButton(nav,label,'museum-c429-wing',()=>updateWing(id));b.dataset.wing=id;
  }
  host.append(nav);
  const content=$('div','museum-c429-content');content.setAttribute('aria-live','polite');host.append(content);
  const foot=$('p','museum-c429-footnote',
   'Tiến trình Arcade là kỷ niệm lưu trên máy này. Kỷ vật thưởng thật được đối chiếu riêng ở mục “Kỷ vật thật”.');
  host.append(foot);
 }
 function stage(type){
  const scene=$('div','museum-c429-scene museum-c429-scene-'+type);
  const rays=$('div','museum-c429-rays');rays.setAttribute('aria-hidden','true');
  scene.append(rays);return scene;
 }
 function trophyHall(s,container){
  const scene=stage('trophies');
  scene.append($('small','museum-c429-scene-tag','BỐN HÀNH TRÌNH · BỐN BỆ VINH DANH'));
  const row=$('div','museum-c429-pedestals');
  for(const info of milestones){
   const count=info.count(s),done=count>=info.goal;
   const b=addButton(row,'','museum-c429-pedestal museum-c429-pedestal-'+info.id+
    (done?' is-earned':' is-dormant')+(trophySelected===info.id?' is-chosen':''),()=>{
     trophySelected=info.id;paint();});
   b.setAttribute('aria-label',info.title+' · '+(done?'Đạt mốc':'Chưa đạt mốc'));
   b.setAttribute('aria-pressed',String(trophySelected===info.id));
   const object=$('span','museum-c429-trophy-object');object.setAttribute('aria-hidden','true');
   b.append(object,$('small','',info.sub));
  }
  scene.append(row);container.append(scene);
  const item=milestones.find(m=>m.id===trophySelected)||milestones[0];
  const count=item.count(s),done=count>=item.goal;
  const card=$('div','museum-c429-status');
  const copy=$('div','');copy.append($('small','',done?'✦ CỘT MỐC ĐÃ ĐẠT':'◌ ĐANG CHINH PHỤC'),
   $('strong','',item.title),$('span','',done?item.hint+' · Đã hoàn thành':item.hint));
  const number=$('div','museum-c429-status-count',Math.min(count,item.goal)+'/'+item.goal);
  card.append(copy,number);container.append(card);
  const progress=$('div','museum-c429-meter');const bar=$('i','');
  bar.style.width=Math.min(100,Math.max(0,count/item.goal*100))+'%';progress.append(bar);
  container.append(progress);
  const seal=$('div','museum-c429-journey-count',
   milestones.filter(m=>m.count(s)>=m.goal).length+'/4 dấu ấn đã đạt · Chạm từng bệ để xem tiến trình');
  container.append(seal);
 }
 function aquarium(s,container){
  const owned=discovered(s),focus=selectedFish(s),fish=species[focus];
  const scene=stage('fish');scene.append($('small','museum-c429-scene-tag','HỒ SƯƠNG · ALBUM SINH VẬT'));
  for(let i=0;i<Math.min(3,owned.length);i++){
   const id=owned[i];scene.append(fishPortrait(id,'museum-c429-swimmer swimmer-'+i));
  }
  const shine=$('span','museum-c429-bubbles');shine.setAttribute('aria-hidden','true');scene.append(shine);
  if(!owned.length)scene.append($('strong','museum-c429-tank-empty','Hồ đang đợi dấu vây đầu tiên'));
  const badge=$('span','museum-c429-pond-progress',owned.length+'/'+ids.length+' LOÀI');
  scene.append(badge);container.append(scene);
  const detail=$('div','museum-c429-fish-focus');
  if(focus){
   detail.append(fishPortrait(focus,'museum-c429-focus-art'));
   const copy=$('div','');copy.append($('small','',fish.rarity.toLocaleUpperCase('vi-VN')),
    $('strong','',fish.name),$('span','',
     'Đã câu '+safeCount(s.garden.fishAlbum[focus])+' · Kỷ lục '+safeCount(s.garden.fishBest[focus])+' cm'));
   detail.append(copy);
  }else{
   detail.append($('span','museum-c429-fish-empty-mark','◇'));
   const copy=$('div','');copy.append($('strong','','Chưa có cá trưng bày'),
    $('span','','Ra Vườn Sương câu cá để mở từng ô album.'));
   detail.append(copy);
  }
  container.append(detail);
  const album=$('div','museum-c429-album');album.setAttribute('aria-label','Bộ sưu tập 14 loài cá');
  for(const id of [...owned,...ids.filter(key=>!owned.includes(key))]){
   const count=safeCount(s.garden.fishAlbum[id]),known=count>0;
   const b=addButton(album,'','museum-c429-specimen '+(known?'is-found':'is-hidden')+
    (id===focus?' is-selected':''),()=>{
     // Unknown silhouettes don't reveal secrets or pretend to be owned.
     if(known){fishSelected=id;paint();}
    });
   b.setAttribute('aria-label',known?species[id].name+', '+count+' con':'Loài chưa phát hiện, '+species[id].rarity);
   if(!known)b.disabled=true;
   b.append(known?fishPortrait(id):$('span','museum-c429-fish-silhouette','?'),
    $('small','',known?species[id].name:'Chưa biết'),$('b','',known?'×'+count:'◌'));
  }
  container.append(album);
  const action=addButton(container,'Đến Vườn Sương ›','museum-c429-go-garden',()=>{
   if(!root.DuduPersonalArcadeUIV1?.openGarden?.())root.openPhoneApp?.('arcade');
  });action.setAttribute('aria-label','Mở Arcade để đến Vườn Sương');
 }
 function paint(){
  if(!host)return;
  snapshot=readSave();
  const s=snapshot||core?.fresh?.(Date.now());if(!s)return;
  const value=milestones.filter(m=>m.count(s)>=m.goal).length;
  const total=host.querySelector('.museum-c429-total');if(total)total.textContent=value+' / 4';
  for(const tab of host.querySelectorAll('.museum-c429-wing')){
   const on=tab.dataset.wing===wing;tab.classList.toggle('is-active',on);
   tab.setAttribute('aria-pressed',String(on));
  }
  const content=host.querySelector('.museum-c429-content');if(!content)return;
  content.replaceChildren();
  if(!snapshot){
   const empty=$('p','museum-c429-not-started',
    'Chưa có tiến trình Arcade trên thiết bị này. Các bệ và ô cá sẽ sáng lên sau khi bạn chơi.');
   content.append(empty);
  }
  if(wing==='fish')aquarium(s,content);else trophyHall(s,content);
 }
 function mount({container,ownerKey='',sandbox=false}={}){
  if(!container||!core)return false;
  const changed=host!==container||owner!==ownerKey||isSandbox!==!!sandbox;
  host=container;
  if(changed){owner=ownerKey;isSandbox=!!sandbox;wing='trophies';fishSelected='';trophySelected='neon';shell();}
  paint();return true;
 }
 root.DuduMuseumGalleryC429=Object.freeze({mount,milestones});
})(typeof window!=='undefined'?window:{});
