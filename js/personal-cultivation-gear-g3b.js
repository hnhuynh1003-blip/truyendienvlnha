/* G3B personal cultivation shop. Draft launch prices; owner review before merge.
 * One unique copy per SKU, protected, no resale/consumption/loot/combat or Tu Vi.
 * Uses profiles_v2 transaction and existing currency/inventory, no second wallet. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalCultivationGearG3B=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const META='__duduCultivationGearG3B',SOURCE='DUDU_CULTIVATION_SHOP_G3B',MAX_ITEMS=500;
 const SLOTS=Object.freeze([['weapon','Vũ khí',true],['armor','Hộ giáp',true],['artifact','Pháp bảo',true],['ring','Nhẫn',true],['necklace','Dây chuyền',false],['bracelet','Vòng tay',false]].map(Object.freeze));
 const CATALOG=Object.freeze([
  ['sword','weapon','Thanh Phong Kiếm','Phàm phẩm','⚔',20,'F','WEAPON'],
  ['robe','armor','Thanh Vân Đạo Bào','Phàm phẩm','◈',30,'F','ITEM'],
  ['jade','artifact','Tụ Linh Ngọc','Phàm phẩm','✦',40,'F','ITEM'],
  ['ring','ring','Bích Ngọc Giới','Phàm phẩm','○',50,'F','ITEM'],
  ['necklace','necklace','Linh Ngọc Hạng Liên','Linh phẩm','◇',70,'E','ITEM'],
  ['bracelet','bracelet','Tử Ngọc Thủ Hoàn','Linh phẩm','◎',90,'E','ITEM']
 ].map(([key,slot,name,quality,icon,price,rank,type])=>Object.freeze({
  id:'g3-gear-'+key,itemId:'g3-gear-'+key,slot,name,quality,icon,price,rank,type,
  scope:'CULTIVATION_GEAR',realmTag:'CULTIVATION',unique:true,discardable:false,giftable:false,tradeable:false,
  desc:'Pháp khí phát triển nhân vật, không dùng cho chiến đấu.',
  artPath:'assets/tu-tien/g3-gear/g3-gear-'+key+'.webp'
 })));
 const product=id=>CATALOG.find(x=>x.id===id)||null;
 const unlocked=slot=>SLOTS.some(([k,,yes])=>k===slot&&yes);
 const instanceId=p=>'cultivation-g3b:'+p.id;
 const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const own=(x,k)=>Object.hasOwn(x,k);
 const wallet=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000;
 const fail=m=>{throw Error(m);};
 function productFor(record){
  const p=product(record?.id);
  if(!p||record.itemId!==p.id||record.instanceId!==instanceId(p)||
    record.scope!==p.scope||record.name!==p.name||record.type!==p.type||record.rank!==p.rank||
    record.slot!==p.slot||record.realmTag!==p.realmTag||record.unique!==true||record.discardable!==false||
    record.giftable!==false||record.tradeable!==false||record.obtainedFrom?.kind!=='SHOP'||
    record.obtainedFrom?.source!==SOURCE)return null;
  return p;
 }
 function instance(p){
  const {price,artPath,...fields}=p;
  return {...fields,instanceId:instanceId(p),obtainedFrom:{kind:'SHOP',source:SOURCE}};
 }
 function stateOf(data){
  if(!plain(data)||!wallet(data.currency)||!Array.isArray(data.inventory)||data.inventory.length>1000||
     !plain(data.storyStates))fail('Hồ sơ không hợp lệ');
  const old=data.storyStates[META];
  if(old!==undefined&&(!plain(old)||old.version!==1||!plain(old.purchases)||!plain(old.equipped)))fail('Dữ liệu pháp khí không hợp lệ');
  const purchases=old?.purchases||{},equipped=old?.equipped||{};
  for(const [id,receipt] of Object.entries(purchases)){
   const p=product(id);
   if(!p||!plain(receipt)||receipt.instanceId!==instanceId(p)||!Number.isSafeInteger(receipt.price)||receipt.price<=0||
    !Number.isSafeInteger(receipt.at)||receipt.at<=0)fail('Lịch sử mua không hợp lệ');
  }
  for(const [slot,id] of Object.entries(equipped)){
   const p=product(id);if(!p||p.slot!==slot||!unlocked(slot)||!own(purchases,id))fail('Trang bị không hợp lệ');
  }
  return {purchases,equipped};
 }
 function hasItem(data,p){
  const matches=data.inventory.filter(x=>x?.instanceId===instanceId(p)||x?.id===p.id||x?.itemId===p.id);
  return matches.length===1&&!!productFor(matches[0]);
 }
 function snapshot(data){
  try{
   const {purchases,equipped}=stateOf(data);
   return {currency:data.currency,power:null,slots:SLOTS.map(([key,label,open])=>{
    const p=product(equipped[key]);return {key,label,open,item:p&&hasItem(data,p)?p:null};
   }),catalog:CATALOG.map(p=>({...p,open:unlocked(p.slot),owned:own(purchases,p.id)&&hasItem(data,p),
    inconsistent:own(purchases,p.id)!==hasItem(data,p)||data.inventory.some(x=>x?.id===p.id||x?.itemId===p.id||x?.instanceId===instanceId(p))&&!hasItem(data,p),
    equipped:equipped[p.slot]===p.id&&hasItem(data,p)}))};
  }catch{return null;}
 }
 function plan(data,{kind,itemId,now=Date.now()}={}){
  if(!['purchase','equip','remove'].includes(kind))fail('Thao tác không hợp lệ');
  const p=product(itemId);if(!p||!unlocked(p.slot))fail('Ô trang bị chưa mở');
  const {purchases,equipped}=stateOf(data);
  const owned=hasItem(data,p),recorded=own(purchases,p.id);
  const collision=data.inventory.some(x=>x?.id===p.id||x?.itemId===p.id||x?.instanceId===instanceId(p));
  if(recorded!==owned||collision&&!owned)fail('Sở hữu pháp khí chưa đồng nhất');
  const nextPurchases={...purchases},nextEquipped={...equipped};
  let currency=data.currency,inventory=data.inventory;
  if(kind==='purchase'){
   if(owned)return {status:'already-applied',patch:null};
   if(data.inventory.length>=MAX_ITEMS)fail('Kho đã đầy 500 món');
   if(currency<p.price)fail('Không đủ Xu');
   if(!Number.isSafeInteger(now)||now<=0)fail('Thời gian không hợp lệ');
   currency-=p.price;inventory=[instance(p),...inventory];
   nextPurchases[p.id]={instanceId:instanceId(p),price:p.price,at:now};
  }else{
   if(!owned)fail('Chưa sở hữu pháp khí');
   if(kind==='equip'){
    if(equipped[p.slot]===p.id)return {status:'already-applied',patch:null};
    nextEquipped[p.slot]=p.id;
   }else{
    if(equipped[p.slot]!==p.id)return {status:'already-applied',patch:null};
    delete nextEquipped[p.slot];
   }
  }
  const storyStates={...data.storyStates,[META]:{version:1,purchases:nextPurchases,equipped:nextEquipped}};
  return {status:'applied',patch:kind==='purchase'?{currency,inventory,storyStates}:{storyStates}};
 }
 async function run({db,auth,uid,isCurrent,kind,itemId,now=Date.now()}={}){
  const owner=auth?.currentUser;
  const active=()=>typeof uid==='string'&&uid.length>0&&uid.length<=128&&!!owner&&owner.uid===uid&&auth.currentUser===owner&&isCurrent?.()===true;
  if(!active()||!db?.runTransaction||!db?.collection)fail('Phiên không hợp lệ');
  const ref=db.collection('profiles_v2').doc(uid);
  const result=await db.runTransaction(async tx=>{
   if(!active())fail('Phiên đã thay đổi');
   const snap=await tx.get(ref);
   if(!active()||!snap.exists)fail('Phiên hoặc hồ sơ không hợp lệ');
   const result=plan(snap.data(),{kind,itemId,now});
   if(!active())fail('Phiên đã thay đổi');
   if(result.patch)tx.update(ref,result.patch);
   return {status:result.status};
  });
  if(!active())fail('Phiên đã thay đổi');
  return result;
 }
 const mounted=new WeakMap();
 function mount(host,bridge){
  if(!host)return;
  const doc=host.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
  const section=title=>{const n=el('section');n.style.cssText='margin:10px 0;padding:12px;border:1px solid #789083;border-radius:12px;background:#18322d;color:#f0eee0';n.append(el('h3',title));return n;};
  const header=section('✦ Pháp Khí Các'),slots=section('Trang bị nhân vật'),shop=section('Pháp Khí Thương Thành');
  const summary=el('p'),grid=el('div'),rows=el('div'),status=el('p');status.setAttribute('role','status');
  grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px';
  header.append(summary,el('p','Lực Chiến: — · chờ công thức chính thức. Không dùng trang bị để chiến đấu.'));
  slots.append(grid);shop.append(el('p','Mỗi pháp khí mua tối đa một bản. Mua và lắp là hai thao tác riêng; hai ô cuối chưa mở.'),rows);
  let busy=false,live=true;
  const button=(label,fn,disabled)=>{const b=el('button',label);b.type='button';b.className='btn';b.style.cssText='min-height:44px;white-space:normal';b.disabled=!!disabled;b.onclick=fn;return b;};
  async function action(kind,p){
   if(!live||busy||!bridge?.ready?.())return;
   if(kind==='purchase'&&!doc.defaultView.confirm('Mua '+p.name+' với '+p.price+' Xu?'))return;
   busy=true;status.textContent='Đang xử lý…';paint();
   try{const result=await bridge.run({kind,itemId:p.id});
    if(live)status.textContent=result.synced?'Đã ghi nhận và đồng bộ.':'Đã ghi nhận; hồ sơ chưa đồng bộ. Không cần mua lại.';
   }catch(e){if(live)status.textContent='Chưa xác nhận được thao tác. '+(e?.message||'Hãy tải lại hồ sơ.');}
   finally{busy=false;if(live)paint();}
  }
  function paint(){
   if(!live)return;
   let view=null;try{view=bridge?.snapshot?.();}catch{}
   grid.replaceChildren();rows.replaceChildren();
   summary.textContent=view?'Xu Vàng hiện có: '+view.currency.toLocaleString('vi-VN'):'Chưa tải được hồ sơ thật. Đăng nhập để mua và lắp.';
   for(const [key,label,open] of SLOTS){
    const item=view?.slots.find(s=>s.key===key)?.item;
    const tile=el('div');tile.style.cssText='padding:8px;border:1px solid #779184;border-radius:8px;overflow-wrap:anywhere';
    tile.append(el('strong',label),el('p',!open?'Khóa · chờ cảnh giới':item?.name||'Ô trống'));
    if(item)tile.append(button('Tháo',()=>action('remove',item),busy));
    grid.append(tile);
   }
   for(const p of view?.catalog||CATALOG){
    const row=el('div');row.style.cssText='padding:8px 0;border-bottom:1px solid #536e60';
    row.append(el('strong',p.icon+' '+p.name),el('p',p.quality+' · '+p.price+' Xu'));
    const open=unlocked(p.slot);
    const label=!open?'Ô đang khóa':p.inconsistent?'Cần đối chiếu sở hữu':p.equipped?'Đang lắp':p.owned?'Lắp':'Mua';
    row.append(button(label,()=>action(p.owned?'equip':'purchase',p),busy||!view||!open||p.inconsistent||p.equipped||(!p.owned&&view.currency<p.price)));
    rows.append(row);
   }
  }
  clear(host);host.replaceChildren(header,slots,shop,status);
  mounted.set(host,{paint,dispose(){live=false;}});paint();
 }
 function clear(host){if(!host)return;mounted.get(host)?.dispose();mounted.delete(host);host.replaceChildren();}
 function refresh(host){if(host)mounted.get(host)?.paint();}
 return Object.freeze({META,SOURCE,SLOTS,CATALOG,productFor,snapshot,plan,run,mount,clear,refresh});
});
