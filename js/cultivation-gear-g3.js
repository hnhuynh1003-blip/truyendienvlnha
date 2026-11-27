/* G3 design preview: deliberately separate from real inventory, wallet and combat.
 * The catalog is not a sale authorization. All prices and power weights are pending.
 * Nothing persists; the session preview is discarded on mount/clear. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduCultivationGearG3=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SLOTS=Object.freeze([
  ['weapon','Vũ khí',true],['armor','Hộ giáp',true],['artifact','Pháp bảo',true],
  ['ring','Nhẫn',true],['necklace','Dây chuyền',false],['bracelet','Vòng tay',false]
 ].map(Object.freeze));
 const CATALOG=Object.freeze([
  ['g3-preview-sword','weapon','Thanh Phong Kiếm','Phàm phẩm','⚔'],
  ['g3-preview-robe','armor','Thanh Vân Đạo Bào','Phàm phẩm','◈'],
  ['g3-preview-jade','artifact','Tụ Linh Ngọc','Phàm phẩm','✦'],
  ['g3-preview-ring','ring','Bích Ngọc Giới','Phàm phẩm','○'],
  ['g3-preview-necklace','necklace','Linh Ngọc Hạng Liên','Linh phẩm','◇'],
  ['g3-preview-bracelet','bracelet','Tử Ngọc Thủ Hoàn','Linh phẩm','◎']
 ].map(([id,slot,name,quality,icon])=>Object.freeze({id,slot,name,quality,icon,price:null,forSale:false})));
 function createPreview(){
  const selected=new Map();
  function view(){
   return {preview:true,power:null,slots:SLOTS.map(([key,label,unlocked])=>({
    key,label,unlocked,item:CATALOG.find(x=>x.id===selected.get(key))||null
   })),catalog:CATALOG};
  }
  function equip(id){
   const item=CATALOG.find(x=>x.id===id);
   if(!item||!SLOTS.some(([key,,unlocked])=>key===item.slot&&unlocked))return false;
   selected.set(item.slot,id);return true;
  }
  function remove(slot){return selected.delete(slot);}
  return Object.freeze({view,equip,remove,reset(){selected.clear();}});
 }
 function mount(host){
  if(!host)return null;
  const preview=createPreview(),doc=host.ownerDocument;
  const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
  const button=(label,action,disabled=false)=>{const b=el('button',label);b.type='button';b.className='btn';b.style.cssText='min-height:44px;white-space:normal';b.disabled=disabled;b.onclick=action;return b;};
  const section=(title)=>{const n=el('section');n.style.cssText='margin:10px 0;padding:12px;border-radius:12px;border:1px solid #789083;background:#18322d;color:#f0eee0';n.append(el('h3',title));return n;};
  const header=section('✦ Thử phối trang bị');
  header.append(el('p','Bản thiết kế · không sở hữu vật phẩm, không trừ Xu, không dùng để chiến đấu.'),el('p','Lực Chiến: — (công thức chưa được duyệt)'));
  const gear=section('Sáu ô trang bị'),grid=el('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px';gear.append(grid);
  const shop=section('Pháp Khí Thương Thành · danh mục dự kiến'),rows=el('div');
  shop.append(el('p','Chưa mở bán. Thử lắp chỉ để xem bố cục; sau khi mở bán, trang bị phải thuộc Kho chung.'),rows);
  const status=el('p');status.setAttribute('role','status');
  function paint(message=''){
   const view=preview.view();grid.replaceChildren();rows.replaceChildren();
   for(const s of view.slots){
    const tile=el('div');tile.style.cssText='padding:8px;border:1px solid #779184;border-radius:8px;overflow-wrap:anywhere';
    tile.append(el('strong',s.label),el('p',!s.unlocked?'Khóa · chờ mốc cảnh giới':s.item?s.item.name+' · Minh họa':'Ô trống'));
    if(s.item)tile.append(button('Tháo thử',()=>{preview.remove(s.key);paint('Đã tháo bản xem thử.');}));
    grid.append(tile);
   }
   for(const item of view.catalog){
    const row=el('div');row.style.cssText='padding:8px 0;border-bottom:1px solid #536e60';
    const slot=view.slots.find(x=>x.key===item.slot);
    row.append(el('strong',item.icon+' '+item.name),el('p',slot.label+' · '+item.quality+' · Chưa định giá'));
    row.append(button(slot.unlocked?'Lắp thử':'Ô đang khóa',()=>{if(preview.equip(item.id))paint('Đã lắp thử '+item.name+'. Không thay đổi tài sản.');},!slot.unlocked));
    rows.append(row);
   }
   status.textContent=message||'Chọn một mẫu trong danh mục để thử lắp.';
  }
  header.append(button('Xóa phối thử',()=>{preview.reset();paint();}));
  host.replaceChildren(header,gear,shop,status);paint();return preview;
 }
 function clear(host){host?.replaceChildren();}
 return Object.freeze({SLOTS,CATALOG,createPreview,mount,clear});
});
