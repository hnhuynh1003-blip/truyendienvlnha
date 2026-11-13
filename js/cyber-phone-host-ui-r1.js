/* Presentation only: reserve the actual Sandbox banner height for every app. */
(function(){
 'use strict';
 function mount(){
  const phone=document.getElementById('cyber-phone');
  const banner=document.getElementById('dudu-sandbox-banner');
  if(!phone||!banner)return;
  let previous='';
  const measure=()=>{
   const value=Math.ceil(banner.getBoundingClientRect().height)+'px';
   if(value!==previous){phone.style.setProperty('--phone-host-safe-top',value);previous=value;}
  };
  measure();
  const observer=new ResizeObserver(measure);observer.observe(banner);
  window.addEventListener('resize',measure);
  window.addEventListener('pagehide',()=>{observer.disconnect();window.removeEventListener('resize',measure);},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
