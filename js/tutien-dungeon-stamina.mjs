import {readResources,nextPointSeconds,formatTime} from '../prototypes/tutien-combat-s/collection/resource-state.mjs';
export function mountDungeonStamina(doc){
 const button=doc.getElementById('go-dungeon');if(!button||button.querySelector('.dungeon-stamina'))return;
 const label=button.querySelector(':scope > span:last-child');if(label)label.classList.add('dungeon-entry-label');
 const meter=doc.createElement('small');meter.className='dungeon-stamina';meter.setAttribute('aria-live','off');const value=doc.createElement('span'),clock=doc.createElement('span');clock.className='dungeon-stamina-clock';meter.append(value,clock);button.append(meter);
 const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('../css/tutien-dungeon-stamina.css',import.meta.url);doc.head.append(link);
 const win=doc.defaultView;let alive=true;
 function refresh(){if(!alive)return;try{const s=readResources(win.sessionStorage),seconds=nextPointSeconds(s);value.textContent=`⚡ ${s.stamina}/60`;clock.textContent=s.stamina<60?(s.stamina===0?'':'+1 ')+formatTime(seconds):'';clock.hidden=s.stamina===60;button.setAttribute('aria-label',`Đi phó bản · Thể Lực ${s.stamina}/60${s.stamina<60?' · Hồi tiếp '+formatTime(seconds):''}`);meter.dataset.stamina=s.stamina;meter.dataset.nextAt=s.staminaClock.nextAt??'';}catch{value.textContent='⚡ —';clock.hidden=true;meter.dataset.error='true';}}
 const timer=win.setInterval(refresh,1000);doc.addEventListener('visibilitychange',refresh);refresh();win.addEventListener('pagehide',()=>{alive=false;win.clearInterval(timer);doc.removeEventListener('visibilitychange',refresh);},{once:true});return {refresh};
}
