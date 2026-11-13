/* C4.38 Sổ Báu Vật — phone-first, account-scoped, strictly observational. */
(function(root){
 'use strict';
 const book=root.DuduArcadeTreasureC438,core=root.DuduPersonalArcadeCoreV1;
 if(!book||!core||!root.document)return;
 const $=id=>root.document.getElementById(id);
 const make=(tag,cls,text)=>{
  const node=root.document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 };
 const freshFilters=()=>({game:'all',season:'all',rarity:'all',status:'all'});
 let filters=freshFilters(),visibleLimit=9,lastIdentity='',returnTo='arcade';
 const host=()=>$('dudu-treasure-content-c438');
 const showing=()=>$('phone-app-treasures')?.style.display==='flex';
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE;
 function identity(){
  if(sandbox())return typeof currentUsername!=='undefined'&&currentUsername?
   'sandbox:'+currentUsername:null;
  const id=root.DuduAuth?.uid?.();
  return root.DuduAuth?.isReady?.()&&typeof id==='string'&&id?id:null;
 }
 function readSave(id){
  if(!id)return null;
  try{
   const raw=root.localStorage?.getItem?.('dudu-personal-arcade:v1:'+encodeURIComponent(id));
   return raw?core.norm(JSON.parse(raw),Date.now()):null;
  }catch(_){return null;}
 }
 const newButton=(label,cls,handle)=>{
  const button=make('button',cls,label);button.type='button';
  button.addEventListener('click',handle);return button;
 };
 function toolbar(label,field,options){
  const row=make('div','dudu-c438-filter-row');
  row.setAttribute('role','group');row.setAttribute('aria-label',label);
  for(const [id,name] of options){
   const button=newButton(name,'dudu-c438-filter'+(filters[field]===id?' is-active':''),()=>{
    filters[field]=id;visibleLimit=9;render();if(host())host().scrollTop=0;
   });
   button.setAttribute('aria-pressed',String(filters[field]===id));
   row.append(button);
  }
  return row;
 }
 const orePositions={stone:['0%','0%'],coal:['25%','0%'],iron:['50%','0%'],
  copper:['75%','0%'],silver:['100%','0%'],gold:['0%','100%'],crystal:['25%','100%'],
  jade:['50%','100%'],meteor:['75%','100%'],relic:['100%','100%']};
 const fishPositions={reed:['0%','0%'],silver:['25%','0%'],blue:['50%','0%'],
  carp:['75%','0%'],koi:['100%','0%'],moonfish:['0%','100%'],
  crystal:['75%','100%'],dragon:['100%','100%']};
 const specializedFish=new Set(['glassfin','lantern','phoenix','fogveil','rainpetal','nightlamp']);
 const seasonPositions={neon:['0%','0%'],mine:['100%','0%'],
  garden:['0%','100%'],jade:['100%','100%']};
 function jadeArtIndex(g,c){
  return c===0?0:c===1?(g>=5?4:g>=4?9:1):c===2?2:
   c===3?(g>=6?10:3):c===4?(g<=2?11:6):c===5?7:c===6?5:8;
 }
 function portrait(item){
  const frame=make('span','dudu-c438-art-frame');frame.setAttribute('aria-hidden','true');
  if(item.concealed){frame.classList.add('is-secret');frame.append(make('span','dudu-c438-secret-mark','?'));return frame;}
  const art=make('span','dudu-c438-art dudu-c438-art-'+item.kind);
  if(item.kind==='ore'){
   const pos=orePositions[item.artId]||['0%','0%'];
   art.style.setProperty('--art-x',pos[0]);art.style.setProperty('--art-y',pos[1]);
  }else if(item.kind==='fish'){
   if(specializedFish.has(item.artId))art.dataset.species=item.artId;
   else{
    const pos=fishPositions[item.artId]||['0%','0%'];
    art.style.setProperty('--art-x',pos[0]);art.style.setProperty('--art-y',pos[1]);
   }
  }else if(item.kind==='jade'){
   const index=jadeArtIndex(item.grade,item.color),tile=index%6;
   art.dataset.atlas=index>=6?'special':'normal';
   art.style.setProperty('--art-x',['0%','50%','100%'][tile%3]);
   art.style.setProperty('--art-y',tile<3?'0%':'100%');
  }else if(item.kind==='season'){
   if(item.artId==='founder')art.dataset.founder='true';
   else{
    const pos=seasonPositions[item.artId]||['0%','0%'];
    art.style.setProperty('--art-x',pos[0]);art.style.setProperty('--art-y',pos[1]);
   }
  }else if(item.kind==='contract'){
   art.style.setProperty('--art-x',item.artId===1?'100%':'0%');
   art.style.setProperty('--art-y',item.artId===2?'100%':'0%');
  }
  frame.append(art);return frame;
 }
 function enterGame(item){
  if(item.season==='s01'){
   root.DuduPersonalArcadeUIV1?.openSeason?.();return;
  }
  root.DuduPersonalArcadeUIV1?.openGame?.(item.game);
 }
 function card(item){
  const row=make('article','dudu-c438-card');
  row.dataset.rarity=item.rarity;row.dataset.status=item.status;
  row.dataset.game=item.game;row.dataset.treasureId=item.concealed?'secret':item.id;
  row.append(portrait(item));
  const body=make('div','dudu-c438-card-body');
  const top=make('div','dudu-c438-card-top');
  top.append(make('span','dudu-c438-world',book.GAME_NAMES[item.game]||'Bốn hành trình'),
   make('span','dudu-c438-rarity',book.RARITIES[item.rarity]));
  body.append(top,make('strong','dudu-c438-name',item.displayName));
  const statusLabel=item.status==='owned'?'✦ Đã tìm thấy':item.status==='preview'?
   '◌ Xem trước · Chưa thể nhận':'◇ Chưa tìm thấy';
  body.append(make('small','dudu-c438-status',statusLabel));
  const detail=make('details','dudu-c438-detail');
  detail.append(make('summary','','Xem nguồn gốc'));
  const section=make('div','dudu-c438-detail-inside');
  section.append(make('p','',item.displayHint));
  section.append(make('p','dudu-c438-story',item.displayStory));
  section.append(make('small','',item.source+' · '+(item.season==='s01'?'Mùa 01':'Dài hạn')));
  if(item.status==='owned')section.append(make('small','',
   'Đã ghi nhận '+item.count.toLocaleString('vi-VN')+' lần · Ngày đầu: chưa ghi nhận'));
  section.append(newButton(item.season==='s01'?'Xem hộ chiếu mùa ›':'Đến '+book.GAME_NAMES[item.game]+' ›',
   'dudu-c438-go',()=>enterGame(item)));
  detail.append(section);body.append(detail);
  if(item.status==='owned'&&item.kind!=='fish'){
   const displaying=root.DuduArcadeShowcaseUIV439?.isPinned?.(item.id)===true;
   const label=displaying?'✦ Đang trưng bày':'◇ Đặt lên bệ';
   const pin=newButton(label,'dudu-c439-treasure-action'+(displaying?' is-showing':''),()=>{
    const result=root.DuduArcadeShowcaseUIV439?.toggle?.(item.id);
    render();
    if(result&&!result.ok){
     const reason=result.reason==='full'?'Tủ đủ 4 bệ. Gỡ một món để trưng bày báu vật mới.':
      'Chưa lưu được cách trưng bày. Bạn có thể thử lại.';
     const note=make('p','dudu-c439-notice',reason);
     note.setAttribute('role','status');host()?.prepend(note);
     root.setTimeout?.(()=>note.remove(),3500);
    }
   });
   pin.setAttribute('aria-pressed',String(displaying));body.append(pin);
  }
  row.append(body);return row;
 }
 function render(){
  const panel=host();if(!panel)return false;
  const id=identity();
  if(id!==lastIdentity){lastIdentity=id||'';filters=freshFilters();visibleLimit=9;}
  panel.replaceChildren();
  const state=readSave(id),bookView=book.snapshot(state);
  const hero=make('section','dudu-c438-hero');
  hero.append(make('small','','◈ BIÊN NIÊN BỐN CÕI'),
   make('strong','','Sổ Báu Vật'),
   make('p','','Mỗi lần khám phá là một dấu ấn không phai.'));
  const totals=make('div','dudu-c438-totals');
  totals.append(make('span','',bookView.owned+'/'+bookView.available+' đã tìm thấy'),
   make('span','',bookView.preview+' kỷ vật xem trước'));
  hero.append(totals);panel.append(hero);
  if(!id){
   panel.append(make('p','dudu-c438-empty',
    'Đăng nhập để mở lại nhật ký khám phá của riêng bạn.'));
   return true;
  }
  panel.append(newButton('✦ Xem Tủ Trưng Bày ›','dudu-c439-visit-display',()=>{
   root.DuduArcadeShowcaseUIV439?.open?.();
  }));
  panel.append(toolbar('Lọc theo game','game',[
   ['all','Bốn game'],['neon','Trạm Neon'],['mine','Địa Tầng 07'],
   ['garden','Vườn Sương'],['jade','Ngọc Phường']]));
  panel.append(toolbar('Lọc theo mùa','season',[
   ['all','Mọi thời kỳ'],['evergreen','Dài hạn'],['s01','Mùa 01']]));
  panel.append(toolbar('Lọc theo độ hiếm','rarity',[
   ['all','Mọi bậc'],['common','Thường'],['rare','Quý'],
   ['epic','Sử thi'],['mythic','Huyền thoại'],['legacy','Di sản']]));
  panel.append(toolbar('Lọc theo tình trạng','status',[
   ['all','Tất cả'],['owned','Đã tìm thấy'],['missing','Còn thiếu'],['preview','Xem trước']]));
  const results=book.select(bookView,filters);
  const summary=make('div','dudu-c438-result-count',results.length+' báu vật trong mục này');
  panel.append(summary);
  const grid=make('div','dudu-c438-grid');
  for(const item of results.slice(0,visibleLimit))grid.append(card(item));
  if(!results.length)grid.append(make('p','dudu-c438-empty',
   'Không có báu vật phù hợp. Thử đổi bộ lọc nhé.'));
  panel.append(grid);
  if(results.length>visibleLimit)panel.append(newButton('Xem thêm '+Math.min(9,results.length-visibleLimit)+' món ↓',
   'dudu-c438-more',()=>{visibleLimit+=9;render();}));
  panel.append(make('p','dudu-c438-footer',
   'Sổ ghi dấu phát hiện từ bốn trò chơi. Kỷ vật Mùa 1 chưa phát thưởng.'));
  return true;
 }
 function open(from='arcade'){
  returnTo=from==='honors'?'honors':from==='museum'?'museum':'arcade';
  root.openPhoneApp?.('treasures');
  if(identity()!==lastIdentity){lastIdentity=identity()||'';filters=freshFilters();}
  if(from==='museum'){filters.status='owned';visibleLimit=9;}
  render();return true;
 }
 function back(){root.openPhoneApp?.(returnTo);}
 function bind(){
  $('arcade-treasure-launch-c438')?.addEventListener('click',()=>open('arcade'));
  $('dudu-honor-treasure-launch-c438')?.addEventListener('click',()=>open('honors'));
  $('dudu-treasure-back-c438')?.addEventListener('click',back);
  root.addEventListener?.('storage',event=>{
   if(!showing()||!identity())return;
   if(event.key==='dudu-personal-arcade:v1:'+encodeURIComponent(identity()))render();
  });
 }
 root.DuduArcadeTreasureUIV438=Object.freeze({open,back,render,
  getIdentity:identity,view:()=>book.snapshot(readSave(identity())),portrait});
 bind();
})(typeof window!=='undefined'?window:{});
