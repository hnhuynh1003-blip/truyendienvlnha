import {readCharacterView,watchCharacterView} from '../../../js/tutien-character-view.mjs';
import {createState} from './model.mjs';
import {STAMINA_RULE,nextPointSeconds,formatTime} from './resource-state.mjs';
// Shared view contract: DUDU account identity/avatar via the canonical renderer; resources from the
// existing exploration state. No profile writes, account avatar clone or new stats.
export function projectHud(character,resources,now=Date.now()){
 return {...character,hp:resources.hp,maxHp:createState().hp,stamina:resources.stamina,maxStamina:STAMINA_RULE.maximum,injury:resources.injury,nextRecoveryAt:resources.staminaClock?.nextAt??null,recoverySeconds:resources.staminaClock?nextPointSeconds(resources,now):0};
}
export function mountProfile(doc,{readResources}={}){
 const parent=doc.defaultView.parent.document,host=doc.getElementById('profile-avatar');let profile=readCharacterView(parent),token=0,current=null,disposed=false;
 function avatar(view){
  host.dataset.ownerUid=view.uid||'';host.setAttribute('aria-label',view.displayName||'Character');const url=view.avatar?.url||'',fingerprint=JSON.stringify([view.uid,view.avatarSelection,view.avatar]);if(fingerprint===current){const fallback=host.querySelector('.r3e-avatar-fallback');if(fallback)fallback.textContent=view.initials||(Array.from(view.displayName.trim())[0]||'\u25c7').toUpperCase();return;}current=fingerprint;const generation=++token;
  host.style.backgroundImage='none';host.dataset.avatarStatus=url?'loading':'missing';host.replaceChildren();
  const fallback=doc.createElement('span');fallback.className='r3e-avatar-fallback';fallback.textContent=(Array.from(view.displayName.trim())[0]||'◇').toUpperCase();fallback.hidden=!!url;host.append(fallback);host.setAttribute('aria-label',view.displayName||'Chân dung nhân vật');
  if(!url)return;const image=new doc.defaultView.Image();const show=()=>{if(disposed||generation!==token)return;host.style.backgroundImage=`url(${JSON.stringify(url)})`;host.style.backgroundSize=view.avatar.size||'cover';host.style.backgroundPosition=view.avatar.position||'center';host.dataset.avatarStatus='ready';fallback.hidden=true;};image.onload=show;if(view.avatar.available)show();image.onerror=()=>{if(disposed||generation!==token)return;host.dataset.avatarStatus='error';fallback.hidden=false;};image.src=url;
 }
 function refresh(){if(disposed)return;const view=readResources?projectHud(profile,readResources()):profile;avatar(view);doc.getElementById('profile-name').textContent=view.displayName;doc.getElementById('profile-level').textContent=view.level!=null?'Cấp '+view.level:view.levelLabel;doc.getElementById('combat-power').textContent=Number.isFinite(view.combatPower)?view.combatPower.toLocaleString('vi-VN'):'—';
  if(readResources){doc.getElementById('hp').textContent=`${view.hp}/${view.maxHp}`;doc.getElementById('hpbar').style.width=`${Math.max(0,Math.min(100,view.hp/view.maxHp*100))}%`;doc.getElementById('stamina').textContent=`${view.stamina}/${view.maxStamina}`;doc.getElementById('staminabar').style.width=`${Math.max(0,Math.min(100,view.stamina/view.maxStamina*100))}%`;doc.getElementById('profile-recovery').textContent=view.stamina<view.maxStamina?'+1 '+formatTime(view.recoverySeconds):'';}
 }
 host.onclick=()=>doc.defaultView.top.openPlayerAvatarEditorV16?.();
 const unwatch=watchCharacterView(parent,next=>{profile=next;refresh();});doc.defaultView.addEventListener('pagehide',()=>{disposed=true;token++;unwatch();},{once:true});return {refresh,dispose(){disposed=true;token++;unwatch();}};
}
