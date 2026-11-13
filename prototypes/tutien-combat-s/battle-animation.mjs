// Slice S's existing CSS/VFX playback, shared by both presentations.
// State and damage are already committed before play(); no gameplay callbacks.
export function createBattleAnimation({arena,event,skip,reduced,isDisposed=()=>false}){
 let animation=null,release=null;
 function stop(){animation?.cancel();animation=null;arena.classList.remove('playing');skip.disabled=true;release?.();release=null;}
 async function play(action){
  if(isDisposed()||reduced.checked||matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;
  arena.dataset.animationAction=action;arena.classList.add('playing');skip.disabled=false;
  animation=event.animate([{opacity:0},{opacity:1},{opacity:0}],{duration:680});
  await Promise.race([animation.finished.catch(()=>{}),new Promise(resolve=>{release=resolve;})]);stop();
 }
 return {play,stop};
}
