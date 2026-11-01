/* C4.39 — one quiet, illustrated room for four favorite Arcade discoveries.
 * It changes only account-scoped display preferences in localStorage.
 * The authoritative museum server shelf remains separate and untouched.
 */
(function(root){
 'use strict';
 const model=root.DuduArcadeShowcaseC439,folio=root.DuduArcadeTreasureUIV438,
  book=root.DuduArcadeTreasureC438;
 if(!model||!folio||!book||!root.document)return;
 const el=(tag,cls,label)=>{
  const node=root.document.createElement(tag);
  if(cls)node.className=cls;
  if(label!==undefined)node.textContent=String(label);
  return node;
 };
 const button=(label,cls,fn)=>{
  const node=el('button',cls,label);node.type='button';node.addEventListener('click',fn);
  return node;
 };
 let host=null,owner='',focus='';
 const identity=()=>folio.getIdentity?.()||null;
 const saveKey=id=>'dudu-arcade-showcase:v1:'+encodeURIComponent(id);
 function raw(){
  const id=identity();if(!id)return [];
  try{return root.localStorage?.getItem?.(saveKey(id))||[];}catch(_){return [];}
 }
 const snapshot=()=>folio.view?.()||book.snapshot(null);
 const visible=()=>model.visible(raw(),snapshot());
 function toggle(id){
  const ownerId=identity();
  if(!ownerId)return {ok:false,reason:'no-account',selected:[]};
  const result=model.toggle(raw(),id,snapshot());
  if(!result.ok)return result;
  try{root.localStorage.setItem(saveKey(ownerId),
   JSON.stringify({version:model.VERSION,selected:result.selected}));}
  catch(_){return {ok:false,reason:'unavailable',selected:visible()};}
  render();return result;
 }
 function isPinned(id){return visible().includes(id);}
 function open(){
  root.openPhoneApp?.('museum');
  root.DuduMuseumVaultC426?.showDisplay?.();
 }
 function openBook(){folio.open?.('museum');}
 function frame(item){
  const art=folio.portrait?.(item)||el('span','dudu-c439-fallback-art','✧');
  art.classList.add('dudu-c439-portrait');return art;
 }
 function stage(item){
  const scene=el('section','dudu-c439-scene');
  scene.dataset.rarity=item?.rarity||'empty';
  scene.setAttribute('aria-label',item?'Bệ chính: '+item.name:'Bệ chính chưa có vật phẩm');
  scene.append(el('div','dudu-c439-architecture'),el('span','dudu-c439-scene-caption',
   item?'✦ BỆ DANH DỰ':'◇ CHỜ NGƯỜI KHÁM PHÁ'));
  const light=el('div','dudu-c439-art-light');
  light.append(item?frame(item):el('span','dudu-c439-empty-sigil','✧'));
  scene.append(light,el('div','dudu-c439-plinth'),el('div','dudu-c439-plinth-foot'));
  const plaque=el('div','dudu-c439-plaque');
  plaque.append(el('small','',item?book.GAME_NAMES[item.game]+' · '+book.RARITIES[item.rarity]:'BỐN HÀNH TRÌNH'),
   el('strong','',item?item.name:'Một bệ đang đợi báu vật'));
  scene.append(plaque);return scene;
 }
 function render(){
  if(!host)return false;
  const id=identity();
  if(id!==owner){owner=id||'';focus='';}
  const view=snapshot(),pins=model.visible(raw(),view);
  if(!pins.includes(focus))focus=pins[0]||'';
  const selected=view.items.find(item=>item.id===focus&&item.owned)||null;
  host.replaceChildren();
  const intro=el('header','dudu-c439-intro');
  intro.append(el('span','dudu-c439-kicker','✧ ĐẠI SẢNH SƯU TẬP'),
   el('strong','','Tủ Trưng Bày'));
  const count=el('span','dudu-c439-counter',pins.length+' / '+model.MAX_SLOTS+' bệ');
  intro.append(count);
  host.append(intro,stage(selected));
  const slots=el('div','dudu-c439-slots');
  slots.setAttribute('role','group');slots.setAttribute('aria-label','Bốn bệ trưng bày cá nhân');
  for(let i=0;i<model.MAX_SLOTS;i++){
   const id=pins[i],item=view.items.find(x=>x.id===id&&x.owned);
   const b=button('','dudu-c439-slot'+(item?' is-filled':' is-empty')+
    (item&&focus===id?' is-current':''),()=>{
     if(item){focus=id;render();}else openBook();
    });
   b.setAttribute('aria-label',item?'Chọn bệ '+(i+1)+': '+item.name:
    'Bệ '+(i+1)+' trống, mở Sổ Báu Vật');
   b.setAttribute('aria-pressed',String(!!item&&focus===id));
   b.append(el('span','dudu-c439-slot-index','0'+(i+1)));
   if(item)b.append(frame(item));else b.append(el('span','dudu-c439-slot-empty','◇'));
   b.append(el('span','dudu-c439-slot-caption',item?item.name:'Bệ trống'));
   slots.append(b);
  }
  host.append(slots);
  const actions=el('div','dudu-c439-actions');
  actions.append(button(pins.length?'Đổi báu vật trong Sổ ›':'Chọn báu vật đầu tiên ›',
   'dudu-c439-open-book',openBook));
  if(selected){
   actions.append(button('Gỡ khỏi bệ','dudu-c439-remove',()=>toggle(selected.id)));
   actions.append(button('Đến '+book.GAME_NAMES[selected.game]+' ›','dudu-c439-go-game',()=>{
    root.DuduPersonalArcadeUIV1?.openGame?.(selected.game);
   }));
  }
  host.append(actions);
  const info=el('p','dudu-c439-description',selected?selected.displayStory:
   'Chọn những khám phá đáng nhớ từ Sổ Báu Vật để thắp sáng bốn bệ.');
  host.append(info);
  host.append(el('p','dudu-c439-footnote',
   'Tủ lưu cách trưng bày trên thiết bị. Kỷ vật Mùa 1 chỉ đang xem trước; kho sở hữu thật được xác minh riêng.'));
  return true;
 }
 function mount({container}={}){
  if(!container)return false;
  if(host!==container){host=container;owner='';focus='';}
  return render();
 }
 root.addEventListener?.('storage',event=>{
  const id=identity();
  if(host&&id&&(event.key===saveKey(id)||
   event.key==='dudu-personal-arcade:v1:'+encodeURIComponent(id)))render();
 });
 root.DuduArcadeShowcaseUIV439=Object.freeze({mount,render,toggle,isPinned,open});
})(typeof window!=='undefined'?window:{});
