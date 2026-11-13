// VIS-T2E-R1: read-only presentation. No equipment, stat, inventory or persistence commands.
const BASE=new URL('../assets/tu-tien/vis-t2e/web/phap-khi-cac-',import.meta.url).href;
export const EQUIPMENT_SLOTS=Object.freeze([['weapon','Vũ khí'],['armor','Hộ giáp'],['artifact','Pháp bảo'],['ring','Nhẫn'],['necklace','Dây chuyền'],['bracelet','Vòng tay']].map(Object.freeze));
export function equipmentView(key){const slot=EQUIPMENT_SLOTS.find(s=>s[0]===key);if(!slot)throw Error('Unknown equipment slot');return Object.freeze({key,label:slot[1],equipped:key==='weapon',name:key==='weapon'?'Kiếm cố định':null,quality:null,image:null,attributes:null,description:null});}
export function mountEquipment(root,dialog,identity){
 const d=root.ownerDocument,el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;},img=(name,cls,alt='')=>{const n=el('img',cls);n.src=BASE+name+'.webp';n.alt=alt;n.decoding='async';return n;};
 root.replaceChildren();root.classList.add('pkc');
 const scene=img('main-background','pkc-background'),figure=img('female-cultivator','pkc-character','Nữ tu sĩ đứng toàn thân');
 const heading=el('h3','pkc-title','Pháp Khí Các'),who=el('p','pkc-identity',identity),note=el('p','pkc-summary'),hint=el('p','pkc-hint','Chọn một ô trang bị');hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');
 note.textContent=`Đã trang bị ${EQUIPMENT_SLOTS.filter(([key])=>equipmentView(key).equipped).length} / ${EQUIPMENT_SLOTS.length}`;
 const main=el('div','pkc-main');main.append(scene,figure,heading,who,note,hint);root.append(main);
 // The old detail PNG has fixed empty stat boxes and two decorative action buttons.
 // Reuse the existing square jade frame instead; never paint false fields onto those boxes.
 const overlay=el('section','pkc-detail');overlay.id='vis-sword-details';overlay.hidden=true;overlay.setAttribute('role','region');overlay.setAttribute('aria-labelledby','pkc-item-title');
 const backdrop=el('div','pkc-detail-shade'),panel=el('div','pkc-detail-art');panel.append(img('equipment-slot-empty','pkc-detail-background'));
 const content=el('div','pkc-detail-content'),title=el('h3','pkc-detail-title'),name=el('p','pkc-detail-name'),state=el('p','pkc-detail-state','Đang trang bị');title.id='pkc-item-title';
 const back=el('button','pkc-detail-back','Trở về Pháp Khí Các');back.type='button';
 const x=el('button','pkc-detail-close');x.type='button';x.setAttribute('aria-label','Đóng chi tiết, trở về Pháp Khí Các');x.append(img('close-button',''));
 let selected=null;
 function closeDetail(e){e?.stopPropagation();overlay.hidden=true;main.inert=false;dialog.classList.remove('pkc-detail-open');if(selected){selected.setAttribute('aria-expanded','false');selected.focus();}}
 back.onclick=x.onclick=closeDetail;backdrop.onclick=closeDetail;
 overlay.addEventListener('click',e=>e.stopPropagation());
 content.append(title,name,state,back);panel.append(content,x);overlay.append(backdrop,panel);
 const buttons=[];
 for(const [key,label]of EQUIPMENT_SLOTS){const view=equipmentView(key),b=el('button','pkc-slot');b.type='button';b.dataset.slot=key;b.dataset.equipped=String(view.equipped);b.setAttribute('aria-label',label+' · '+(view.equipped?view.name+' đang trang bị':'Chưa trang bị'));b.setAttribute('aria-pressed','false');if(view.equipped){b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls',overlay.id);b.id='vis-sword';}
 b.append(img('equipment-slot-empty','pkc-slot-frame'),img('icon-'+key,'pkc-slot-icon'),img('selected-overlay','pkc-slot-selected'),el('span','pkc-slot-label',label),el('small','pkc-slot-status',view.equipped?'Đang dùng':'Trống'));
 b.onclick=e=>{e.stopPropagation();selected=b;for(const q of buttons)q.setAttribute('aria-pressed',String(q===b));
 if(!view.equipped){hint.textContent=label+' · Chưa trang bị';return;}
 title.textContent=view.label;name.textContent=view.name;hint.textContent='Chọn một ô trang bị';b.setAttribute('aria-expanded','true');overlay.hidden=false;main.inert=true;dialog.classList.add('pkc-detail-open');x.focus();};buttons.push(b);main.append(b);}
 root.append(overlay);
 dialog.addEventListener('cancel',e=>{if(!overlay.hidden){e.preventDefault();closeDetail(e);}});
 dialog.addEventListener('close',()=>{overlay.hidden=true;main.inert=false;dialog.classList.remove('pkc-detail-open');});
 return {reset(){overlay.hidden=true;main.inert=false;dialog.classList.remove('pkc-detail-open');hint.textContent='Chọn một ô trang bị';for(const b of buttons){b.setAttribute('aria-pressed','false');if(b.hasAttribute('aria-expanded'))b.setAttribute('aria-expanded','false');}}};
}
