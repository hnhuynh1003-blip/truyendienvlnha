import {renderQiankunBag} from '../../../js/tutien-qiankun-vis-t2.mjs';
import {projectTripBag} from './mock-trip.mjs';
const skin=new URL('../../../css/tutien-qiankun-vis-t2.css',import.meta.url).href,extra=new URL('./qiankun-run-bag.css',import.meta.url).href,icons=new URL('../../../assets/tu-tien/exploration-r3d/objects/',import.meta.url).href;
const names={herb:'Linh thảo',mineral:'Linh khoáng',egg:'Trứng bí ẩn'};
export function mountTripBag({anchor,opener,readState,qaCapacity=null}){
 const win=anchor.ownerDocument.defaultView,root=win.top.document,top=win.top,phone=root.getElementById('cyber-phone')||(win===top?root.body:null);if(!phone)throw Error('Cyber Phone root missing');
 for(const [id,href]of [['collection-qiankun-skin',skin],['collection-qiankun-run-skin',extra]])if(!root.getElementById(id)){const link=root.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;root.head.append(link);}
 const wrapper=root.createElement('div');wrapper.className='vis-ux-r2 collection-qiankun-portal';const scrim=root.createElement('div');scrim.className='collection-qiankun-scrim';scrim.hidden=true;
 const dialog=root.createElement('dialog');dialog.id='collection-qiankun-dialog';dialog.className='vis-panel vis-qiankun-active';dialog.setAttribute('aria-label','Túi Càn Khôn của chuyến thăm dò');
 const closeButton=root.createElement('button');closeButton.type='button';closeButton.className='vis-panel-close';closeButton.setAttribute('aria-label','Đóng Túi Phó Bản');
 const content=root.createElement('section');dialog.append(content,closeButton);wrapper.append(scrim,dialog);phone.append(wrapper);let disposed=false,historyOwned=false,pending=null,resolvePending=null,observer=null;
 function fit(){if(!dialog.open)return;let r=anchor.getBoundingClientRect(),x=r.left,y=r.top,cursor=win;while(cursor!==top){const box=cursor.frameElement.getBoundingClientRect();x+=box.left;y+=box.top;cursor=cursor.parent;}const w=Math.min(r.width-8,(r.height-12)*2/3,420),h=w*1.5;dialog.style.setProperty('--trip-bag-width',w+'px');dialog.style.left=(x+(r.width-w)/2)+'px';dialog.style.top=(y+(r.height-h)/2)+'px';}
 function refresh(){
  const view=projectTripBag(readState(),qaCapacity);renderQiankunBag(content,view.capacity);content.dataset.preview=String(qaCapacity!==null);dialog.dataset.runId=view.runId||'';dialog.dataset.environment=view.environment;content.dataset.capacity=view.capacity??'unknown';
  const status=content.querySelector('.qiankun-status');status.textContent='';status.hidden=true;
  const feedback=content.querySelector('.qiankun-feedback');feedback.textContent='';feedback.hidden=true;
  for(const slot of view.slots){const b=content.querySelector(`[data-bag-slot="${slot.number}"]`);b.dataset.slotState=slot.kind;b.querySelector('.qiankun-slot-state')?.remove();
   if(slot.item){const image=root.createElement('img');image.className='qiankun-item';image.src=icons+slot.item.scene+'/intact.png';image.alt=names[slot.item.scene]||'Vật phẩm';const count=root.createElement('span');count.className='qiankun-item-count';count.textContent='1';b.append(image,count);b.dataset.itemId=slot.item.id;}
   if(['held','locked','upgrade'].includes(slot.kind)){const state=root.createElement('img');state.className='qiankun-slot-state';state.alt='';state.src=new URL('../../../assets/tu-tien/vis-t2/web/'+(slot.kind==='upgrade'?'qiankun-upgrade-mark':'qiankun-lock-overlay')+'.webp',import.meta.url).href;b.append(state);}
   const label=slot.item?`${names[slot.item.scene]||'Vật phẩm'} · 1${slot.kind==='held'?' · giữ tạm':''}`:slot.kind==='open'?'Ô trống':slot.kind==='upgrade'?'Vị trí nâng cấp minh họa':'Ô khóa';b.setAttribute('aria-label',`Ô ${slot.number} · ${label}`);
   b.onclick=()=>{for(const n of content.querySelectorAll('[data-bag-slot]'))n.setAttribute('aria-pressed',String(n===b));feedback.textContent=label;feedback.hidden=false;};
  }
  content.querySelector('.qiankun-capacity span').textContent=`${view.used} / ${view.capacity} \u00f4`;
  const meter=content.querySelector('progress');meter.max=view.capacity??9;meter.value=Math.min(view.used,view.capacity??9);meter.setAttribute('aria-label',view.capacity===null?'Sức chứa chưa được xác nhận':'Sức chứa minh họa');
  const note=content.querySelector('.qiankun-note');note.textContent='';note.hidden=true;
  const upgrade=content.querySelector('.qiankun-upgrade');upgrade.disabled=true;upgrade.setAttribute('aria-label','Nâng cấp đang khóa');upgrade.querySelector('span').textContent=view.capacity===9?'Đủ 9 ô':'Nâng cấp · Khóa';upgrade.title=view.capacity===9?'Đã đủ 9 ô':'Chưa thể nâng cấp';
 }
 function onPop(){if(resolvePending){resolvePending();resolvePending=null;pending=null;}if(dialog.open)close(false);}
 function close(unwind=true){if(!dialog.open)return;dialog.close();scrim.hidden=true;observer?.disconnect();observer=null;top.removeEventListener('resize',fit);win.removeEventListener('resize',fit);const hadHistory=historyOwned;historyOwned=false;if(unwind&&hadHistory&&win.history.state?.collectionQiankun){pending=new Promise(r=>{resolvePending=r;});win.history.back();}if(opener.isConnected)opener.focus();}
 async function open(){if(disposed||dialog.open)return;if(pending)await Promise.race([pending,new Promise(r=>setTimeout(r,500))]);if(disposed||dialog.open)return;refresh();dialog.showModal();scrim.hidden=false;observer=new ResizeObserver(fit);observer.observe(anchor);top.addEventListener('resize',fit);win.addEventListener('resize',fit);fit();closeButton.focus();try{win.history.pushState({...win.history.state,collectionQiankun:true},'',win.location.href);historyOwned=true;}catch{/* Back is optional if restricted. */}}
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}else if(e.key==='Tab'){const controls=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(n=>n.getClientRects().length);if(controls.length){e.preventDefault();e.stopImmediatePropagation();const i=controls.indexOf(root.activeElement);controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();}}},true);closeButton.onclick=()=>close();dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 win.addEventListener('popstate',onPop);
 function dispose(){if(disposed)return;disposed=true;const hadHistory=historyOwned;close(false);try{if(hadHistory&&win.history.state?.collectionQiankun)win.history.replaceState({...win.history.state,collectionQiankun:false},'',win.location.href);}catch{}observer?.disconnect();win.removeEventListener('popstate',onPop);top.removeEventListener('resize',fit);win.removeEventListener('resize',fit);wrapper.remove();if(resolvePending)resolvePending();}
 return {open,close,refresh,dispose};
}
