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
 const rarityWeight=Object.freeze({'Quý':1,'Hiếm':2,'Sử thi':3,'Huyền thoại':4});
 // Aquarium deliberately excludes common fish; the full 14-species journal
 // remains in Vườn Sương. No fish is sold, moved or granted by this module.
 const showcaseIds=Object.freeze(ids.filter(id=>rarityWeight[species[id].rarity]));
 const foundShowcase=s=>showcaseIds.filter(id=>s.garden.fishAlbum[id]>0)
  .sort((a,b)=>rarityWeight[species[b].rarity]-rarityWeight[species[a].rarity]||
   showcaseIds.indexOf(a)-showcaseIds.indexOf(b));
 const oreKinds=Object.keys(core?.ORE_VALUES||{});
 const distinctJade=s=>Object.values(s.jade?.album||{}).filter(n=>n>0).length;
 const trial=(label,target,read)=>Object.freeze({label,target,read});
 // Hard, multi-part mastery conditions mirror existing game progression.
 // They are observational museum seals, NOT duplicate claimable quests.
 const milestones=Object.freeze([
  {id:'neon',title:'Đế Chế Không Ngủ',sub:'Trạm Neon',steps:[
   trial('Khách phục vụ',250,s=>s.neon.guestsServed),
   trial('Phòng máy',3,s=>s.neon.roomTier),
   trial('Hợp đồng',3,s=>s.neon.contracts.length),
   trial('Mốc điều hành',4,s=>s.neon.milestones.length)]},
  {id:'mine',title:'Chưởng Mạch Địa Tầng',sub:'Địa Tầng 07',steps:[
   trial('Loại quặng',10,s=>oreKinds.filter(id=>s.mine.found[id]>0).length),
   trial('Mạch đã phá',25,s=>s.mine.bursts),
   trial('Cấp máy dò',3,s=>s.mine.scanner),
   trial('Cổ vật',1,s=>s.mine.found.relic)]},
  {id:'garden',title:'Thủ Hộ Nguyệt Hồ',sub:'Vườn Sương',steps:[
   trial('Luống thu hoạch',50,s=>s.garden.harvests),
   trial('Cấp hồ',4,s=>s.garden.pondTier),
   trial('Loài cá Quý+',5,s=>foundShowcase(s).length),
   trial('Cá Huyền thoại',1,s=>['dragon','phoenix'].filter(id=>s.garden.fishAlbum[id]>0).length)]},
  {id:'jade',title:'Đại Sư Ngọc Phường',sub:'Ngọc Phường',steps:[
   trial('Ngọc đã bán',40,s=>s.jade?.sold||0),
   trial('Giấy phép Tàn Tích',1,s=>s.jade?.permit?1:0),
   trial('Tác phẩm',5,s=>s.jade?.exhibits?.length||0),
   trial('Bộ sắc ngọc',12,distinctJade)]}
 ].map(item=>Object.freeze({...item,steps:Object.freeze(item.steps),goal:item.steps.length,
  count:s=>item.steps.filter(step=>step.read(s)>=step.target).length})));
 const $=(tag,cls,value)=>{
  const element=root.document.createElement(tag);
  if(cls)element.className=cls;
  if(value!==undefined)element.textContent=String(value);
  return element;
 };
 let host=null,owner='',isSandbox=false,wing='trophies',fishSelected='',trophySelected='neon',snapshot=null;
 const safeCount=n=>Number.isSafeInteger(n)&&n>=0?n:0;
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
  const owned=foundShowcase(s);
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
   b.setAttribute('aria-label',info.title+' · '+count+'/'+info.goal+' thử thách');
   b.setAttribute('aria-pressed',String(trophySelected===info.id));
   const object=$('span','museum-c429-trophy-object');object.setAttribute('aria-hidden','true');
   b.append(object,$('small','',info.sub));
  }
  scene.append(row);container.append(scene);
  const item=milestones.find(m=>m.id===trophySelected)||milestones[0];
  const count=item.count(s),done=count>=item.goal;
  const card=$('div','museum-c429-status');
  const copy=$('div','');copy.append($('small','',done?'✦ CỘT MỐC ĐÃ ĐẠT':'◌ ĐANG CHINH PHỤC'),
   $('strong','',item.title),$('span','',done?'Đã khắc đủ bốn ấn chiến tích':'Hoàn thành cả bốn thử thách để lưu dấu trong Bảo Tàng'));
  const number=$('div','museum-c429-status-count',Math.min(count,item.goal)+'/'+item.goal);
  card.append(copy,number);container.append(card);
  const progress=$('div','museum-c429-meter');const bar=$('i','');
  bar.style.width=Math.min(100,Math.max(0,count/item.goal*100))+'%';progress.append(bar);
  container.append(progress);
  const trials=$('div','museum-c430-trials');
  for(const step of item.steps){
   const value=safeCount(step.read(s)),complete=value>=step.target;
   const seal=$('div','museum-c430-trial'+(complete?' is-complete':''));
   seal.append($('span','museum-c430-trial-mark',complete?'✦':'◇'));
   const copy=$('div','');copy.append($('small','',step.label),
    $('strong','',Math.min(value,step.target)+'/'+step.target));
   seal.append(copy);trials.append(seal);
  }
  container.append(trials);
  const seal=$('div','museum-c429-journey-count',
   milestones.filter(m=>m.count(s)>=m.goal).length+'/4 dấu ấn đã đạt · Chạm từng bệ để xem tiến trình');
  container.append(seal);
 }
 function aquarium(s,container){
  const owned=foundShowcase(s),focus=selectedFish(s),fish=species[focus];
  const scene=stage('fish');scene.append($('small','museum-c429-scene-tag','THỦY CUNG · CÁ QUÝ TRỞ LÊN'));
  for(let i=0;i<owned.length;i++){
   const id=owned[i];scene.append(fishPortrait(id,'museum-c429-swimmer swimmer-'+i));
  }
  const shine=$('span','museum-c429-bubbles');shine.setAttribute('aria-hidden','true');scene.append(shine);
  if(!owned.length)scene.append($('strong','museum-c429-tank-empty','Đang đợi những loài cá quý đầu tiên'));
  const badge=$('span','museum-c429-pond-progress',owned.length+'/'+showcaseIds.length+' CÁ QUÝ');
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
    $('span','','Cá thường ở Sổ cá Vườn Sương; chỉ loài Quý trở lên được triển lãm.'));
   detail.append(copy);
  }
  container.append(detail);
  const album=$('div','museum-c429-album');album.setAttribute('aria-label','Cá quý đã câu và đủ điều kiện trưng bày');
  for(const id of owned){
   const count=safeCount(s.garden.fishAlbum[id]);
   const b=addButton(album,'','museum-c429-specimen is-found'+
    (id===focus?' is-selected':''),()=>{
     fishSelected=id;paint();
    });
   b.dataset.rarity=String(rarityWeight[species[id].rarity]);
   b.setAttribute('aria-label',species[id].name+', '+count+' con');
   b.append(fishPortrait(id),$('small','',species[id].name),
    $('em','museum-c429-rarity',species[id].rarity),$('b','','×'+count));
  }
  container.append(album);
  if(owned.length)container.append($('p','museum-c429-rare-note',
   'Chỉ trưng cá Quý, Hiếm, Sử thi và Huyền thoại đã câu. Các loài thường ở Sổ cá Vườn Sương.'));
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
