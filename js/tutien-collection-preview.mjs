import {mountDungeonStamina} from './tutien-dungeon-stamina.mjs';
// One exploration entrance on the existing CTA. No combat source or persisted run is removed.
export function mountCollectionPreview(doc){
 mountDungeonStamina(doc);const button=doc.getElementById('go-dungeon');if(!button||doc.getElementById('collection-entrance'))return;
 const overlay=doc.createElement('section');overlay.id='collection-entrance';overlay.hidden=true;overlay.setAttribute('aria-label','Phó Bản Thăm Dò');overlay.style.cssText='position:fixed;inset:0;z-index:10000;background:#06292e;display:flex;flex-direction:column';
 const frame=doc.createElement('iframe');frame.title='Phó Bản Thăm Dò';frame.style.cssText='width:100%;height:100%;flex:1;min-height:0;border:0';frame.setAttribute('sandbox','allow-scripts allow-same-origin');overlay.append(frame);doc.body.append(overlay);
 const close=()=>{const child=frame.contentDocument;if(child&&!child.dispatchEvent(new frame.contentWindow.CustomEvent('collection:request-exit',{cancelable:true})))return;const retreat=frame.contentDocument?.getElementById('retreat');if(retreat?.disabled)return;if(retreat&&!frame.contentDocument.getElementById('scene').hidden)retreat.click();overlay.hidden=true;root.getElementById('cyber-phone')?.classList.remove('tutien-exploration-open');frame.contentDocument?.dispatchEvent(new frame.contentWindow.CustomEvent('collection:visibility',{detail:false}));button.focus();};
 const root=doc.defaultView.top.document;
 const onHostBack=e=>{if(!overlay.hidden&&e.target.closest?.('#phone-app-system .phone-back-btn')){e.preventDefault();e.stopImmediatePropagation();close();}};
 root.addEventListener('click',onHostBack,true);doc.defaultView.addEventListener('pagehide',()=>{root.removeEventListener('click',onHostBack,true);root.getElementById('cyber-phone')?.classList.remove('tutien-exploration-open');},{once:true});
 frame.addEventListener('load',()=>{frame.contentDocument?.addEventListener('collection:exit',close);frame.contentDocument?.dispatchEvent(new frame.contentWindow.CustomEvent('collection:visibility',{detail:!overlay.hidden}));});
 button.onclick=()=>{if(!frame.hasAttribute('src'))frame.src=new URL('../prototypes/tutien-combat-s/collection/index.html?layerkit=r3e1',import.meta.url).href;overlay.hidden=false;root.getElementById('cyber-phone')?.classList.add('tutien-exploration-open');frame.contentDocument?.dispatchEvent(new frame.contentWindow.CustomEvent('collection:visibility',{detail:true}));};
}
