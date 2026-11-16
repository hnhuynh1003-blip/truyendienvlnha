// Read-only adapter over the existing DUDU identity/avatar renderer. No storage/profile copy.
export function readCharacterView(doc){
 const root=doc.defaultView.top;let identity=null,selection=null;try{identity=root.DuduCultivationIdentityT0?.snapshot?.();selection=root.playerAvatarCurrentV16?.();}catch{}
 const source=root.document.getElementById('phone-player-avatar-v16');let avatar=null;
 const image=source?.querySelector('img'),atlas=source?.querySelector('.dudu-avatar-image');
 if(image?.getAttribute('src'))avatar={url:image.src,size:'cover',position:'center',available:image.complete&&image.naturalWidth>0};
 else if(atlas){const style=root.getComputedStyle(atlas),match=/^url\(["']?(.*?)["']?\)$/.exec(style.backgroundImage);if(match)avatar={url:match[1],size:style.backgroundSize,position:style.backgroundPosition,available:false};}
 const uid=identity?.uid??null;
 return Object.freeze({environment:root.document.body.classList.contains('dudu-sandbox-mode')?'SANDBOX':'READ_ONLY',characterId:uid,uid,displayName:identity?.name||doc.getElementById('home-title')?.textContent?.trim()||'',level:Number.isFinite(identity?.level)?identity.level:null,levelLabel:'—',combatPower:null,avatar,avatarSelection:selection?JSON.stringify(selection):'',initials:source?.querySelector('.dudu-avatar-initials')?.textContent||''});
}
export function watchCharacterView(doc,notify){
 const root=doc.defaultView.top,observer=new MutationObserver(refresh);let signature='',disposed=false;
 function refresh(){if(disposed)return;const view=readCharacterView(doc),next=JSON.stringify(view);if(next!==signature){signature=next;notify(view);}}
 for(const id of ['phone-player-avatar-v16','phone-player-name-v16']){const node=root.document.getElementById(id);if(node)observer.observe(node.parentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','src','data-avatar-token']});}
 const timer=doc.defaultView.setInterval(refresh,1000);root.addEventListener('storage',refresh);refresh();return ()=>{disposed=true;observer.disconnect();doc.defaultView.clearInterval(timer);root.removeEventListener('storage',refresh);};
}
export function mountHomeIdentity(doc){
 const title=doc.getElementById('home-title');if(!title)return;const update=()=>{const name=readCharacterView(doc).displayName;if(name&&title.textContent!==name)title.textContent=name;};
 const unwatch=watchCharacterView(doc,update),observer=new MutationObserver(update);observer.observe(title,{childList:true,subtree:true,characterData:true});update();doc.defaultView.addEventListener('pagehide',()=>{unwatch();observer.disconnect();},{once:true});
}
