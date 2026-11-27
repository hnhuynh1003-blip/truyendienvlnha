// Separate account projection within the existing inventory dialog; never alters mock combat.
const SOURCES={CHAPTER:'Chương truyện',GLOBAL:'Kho chung / nhặt đồ',SHOP:'Market',STARTER:'Khởi đầu',EVENT:'Sự kiện'};
export function mountSharedInventory(host,bridge=()=>host.ownerDocument.defaultView.top.DuduSharedInventoryBridgeG2){
 const d=host.ownerDocument,el=(tag,text)=>{const n=d.createElement(tag);if(text)n.textContent=text;return n;};
 const panel=el('section');panel.id='tutien-shared-inventory-g2';panel.setAttribute('aria-label','Kho chung tài khoản');
 panel.style.cssText='margin-top:14px;padding:12px;border:1px solid #76928a;border-radius:12px;background:#152c30;color:#eef6ed';
 const title=el('h3','Kho chung · tài khoản DUDU'),status=el('p');status.setAttribute('role','status');
 const note=el('p','Chỉ xem tài sản chung, không phải trang bị đang dùng trong trận. Chưa thể mặc, rèn hoặc chuyển vào phó bản.');
 const filters=el('div');filters.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
 const list=el('ul');list.style.cssText='margin:8px 0;padding-left:20px;overflow-wrap:anywhere';
 const open=el('button','Mở Kho chung');open.type='button';open.style.minHeight='44px';
 let category='EQUIPMENT';
 const buttons=[];
 for(const [key,label] of [['EQUIPMENT','Trang bị'],['MATERIAL','Nguyên liệu']]){
  const b=el('button',label);b.type='button';b.style.minHeight='44px';
  b.onclick=()=>{category=key;refresh();};buttons.push([key,b]);filters.append(b);
 }
 function refresh(){
  // Clear first even when a session resets or bridge is unavailable.
  list.replaceChildren();let state;
  try{state=bridge()?.snapshot();}catch{/* unavailable */}
  const ready=state?.available===true;
  open.disabled=!ready;filters.hidden=!ready;list.hidden=!ready;
  for(const [key,b] of buttons){b.setAttribute('aria-pressed',String(key===category));b.textContent=(key==='EQUIPMENT'?'Trang bị':'Nguyên liệu')+(ready?' ('+(key==='EQUIPMENT'?state.equipment:state.material)+')':'');}
  if(!ready){status.textContent='Chưa có hồ sơ đã xác thực. Không hiển thị dữ liệu tài khoản.';return;}
  const count=category==='EQUIPMENT'?state.equipment:state.material;
  status.textContent='Kho tài khoản: '+state.total+' món · '+count+' '+(category==='EQUIPMENT'?'trang bị':'nguyên liệu')+' · '+(count>12?'12 món đầu':'xem trong Kho chung');
  for(const item of state.items.filter(x=>x.category===category)){
   const row=el('li',item.name+' · '+item.rank+' · '+item.world+(SOURCES[item.source]?' · '+SOURCES[item.source]:''));list.append(row);
  }
  if(!count)list.append(el('li','Chưa có vật phẩm thuộc nhóm này.'));
 }
 open.onclick=()=>{try{bridge()?.open();}catch{/* account unavailable */}};
 const gear=el('button','Thử phối trang bị · Pháp Khí Các');gear.type='button';gear.style.cssText='min-height:44px;display:block;margin:8px 0';
 gear.onclick=()=>{try{bridge()?.openGearPreview?.();}catch{/* preview unavailable */}};
 panel.append(title,status,filters,list,open,note,gear);host.append(panel);refresh();return {refresh};
}
