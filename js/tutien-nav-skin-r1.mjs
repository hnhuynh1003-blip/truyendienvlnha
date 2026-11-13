// Presentation decorator only. Existing buttons retain their callbacks and disabled state.
const ASSET='/assets/tu-tien/vis-t2-nav/assets/webp/';
export const NAV_ART=Object.freeze({stats:'nav-attributes',equipment:'nav-equipment',inventory:'nav-inventory',bag:'nav-dungeon-pouch',alchemy:'nav-alchemy',forge:'nav-forge'});
export function applyNavSkin(doc){
 const dock=doc.querySelector('.vis-stage-dock');if(!dock||dock.dataset.navSkin==='r1')return;
 const image=(name,cls)=>{const n=doc.createElement('img');n.className=cls;n.src=ASSET+name+'.webp';n.alt='';n.draggable=false;n.decoding='async';return n;};
 for(const button of dock.children){
  const key=button.dataset.openPanel,name=NAV_ART[key];if(!name)continue;
  const label=button.querySelector('span'); // Preserve live HTML label and the original button.
  const art=doc.createElement('span');art.className='vis-nav-art';art.setAttribute('aria-hidden','true');
  art.append(image(name,'vis-nav-image'),image('nav-selected-aura','vis-nav-aura'));
  if(key==='alchemy'||key==='forge'){const lock=doc.createElement('small');lock.className='vis-nav-lock-badge';lock.textContent='Khóa';art.append(lock);}
  button.replaceChildren(art,label);button.classList.add('vis-nav-button');button.dataset.navSelected='false';
  button.addEventListener('click',()=>{if(button.disabled)return;for(const b of dock.children)b.dataset.navSelected=String(b===button);});
 }
 const breakthrough=doc.getElementById('breakthrough'),dungeon=doc.getElementById('go-dungeon');
 for(const [button,name]of [[breakthrough,'nav-breakthrough-locked'],[dungeon,'nav-dungeon-action-plaque']]){
  const label=button.querySelector('span'),symbol=doc.createElement('span');symbol.className='vis-nav-primary-symbol';symbol.setAttribute('aria-hidden','true');
  symbol.append(image(name,'vis-nav-primary-image'));button.replaceChildren(symbol,label);button.classList.add('vis-nav-primary');
 }
 dock.dataset.navSkin='r1';doc.body.classList.add('vis-nav-skin-r1');
}
