// VIS-T2 presentation only. No storage, inventory, license or upgrade commands.
const ASSET=new URL('../assets/tu-tien/vis-t2/web/',import.meta.url).href;
export function qiankunView(previewCapacity=null){
 if(previewCapacity!==null&&(!Number.isInteger(previewCapacity)||previewCapacity<1||previewCapacity>9))throw Error('Invalid UI preview capacity');
 const preview=previewCapacity!==null;
 return Object.freeze({title:'Túi Càn Khôn',preview,capacity:previewCapacity,maximum:9,used:0,
  status:preview?'Minh họa · Không sở hữu':'Chưa mở',
  reason:preview?'Chỉ minh họa · Không lưu':'Cần giấy phép nghề đầu tiên',
  cost:'Chi phí chưa được duyệt',
  slots:Object.freeze(Array.from({length:9},(_,i)=>Object.freeze({number:i+1,kind:preview&&i<previewCapacity?'open':preview&&i===previewCapacity?'upgrade':'locked'})))});
}
export function renderQiankunBag(root,previewCapacity=null){
 const d=root.ownerDocument,view=qiankunView(previewCapacity);
 const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 const img=(name,cls)=>{const n=el('img',cls);n.loading='lazy';n.src=ASSET+name+'.webp';n.alt='';n.decoding='async';n.draggable=false;return n;};
 root.classList.add('qiankun-bag');root.dataset.preview=String(view.preview);root.dataset.capacity=view.capacity??'unavailable';
 const base=img('tutien-qiankun-popup-base','qiankun-base');base.width=640;base.height=960;
 const title=el('h2','qiankun-title',view.title),status=el('p','qiankun-status',view.status);
 const grid=el('div','qiankun-grid vis-bag-slots');grid.setAttribute('role','group');grid.setAttribute('aria-label','Chín ô Túi Phó Bản');
 const feedback=el('p','qiankun-feedback',view.reason);feedback.id='qiankun-feedback';feedback.setAttribute('role','status');
 for(const slot of view.slots){
  const b=el('button','qiankun-slot');b.type='button';b.dataset.slotState=slot.kind;b.dataset.bagSlot=String(slot.number);
  const label=slot.kind==='open'?'Ô trống minh họa':slot.kind==='upgrade'?'Ô nâng cấp minh họa':'Đang khóa';
  b.setAttribute('aria-label',`Ô ${slot.number} · ${label}`);b.setAttribute('aria-pressed','false');
  b.append(img('qiankun-slot-open','qiankun-slot-frame'));
  if(slot.kind!=='open')b.append(img(slot.kind==='upgrade'?'qiankun-upgrade-mark':'qiankun-lock-overlay','qiankun-slot-state'));
  b.onclick=()=>{for(const n of grid.children)n.setAttribute('aria-pressed',String(n===b));feedback.textContent=`Ô ${slot.number} · ${label}.`;};
  grid.append(b);
 }
 const capacity=el('div','qiankun-capacity');
 capacity.append(el('span','',view.preview?`${view.used} / ${view.capacity} ô · Minh họa`:`Chưa mở · Tối đa ${view.maximum} ô`));
 const meter=el('progress');meter.max=view.maximum;meter.value=view.capacity??0;meter.setAttribute('aria-label',view.preview?'Sức chứa minh họa':'Túi chưa mở, chưa có sức chứa');capacity.append(meter);
 const upgrade=el('button','qiankun-upgrade');upgrade.type='button';upgrade.disabled=true;upgrade.title=view.cost;upgrade.setAttribute('aria-describedby',feedback.id);upgrade.setAttribute('aria-label','Nâng cấp chưa khả dụng · '+view.cost);
 upgrade.append(img('qiankun-upgrade-button',''),el('span','','Nâng cấp · Khóa'));
 const note=el('p','qiankun-note',view.cost);
 root.replaceChildren(base,title,status,grid,capacity,feedback,upgrade,note);
 return root;
}
export function createQiankunBag(doc){return renderQiankunBag(doc.createElement('section'));}
