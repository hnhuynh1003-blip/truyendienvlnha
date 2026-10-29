/* L2C: Local reading-page preferences. Never read or change Cyber Phone settings. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduReaderPreferencesL2C=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const KEY='dudu-reader-preferences-l2c';
  const DEFAULT=Object.freeze({font:'system',size:18,theme:'dark'});
  const FONTS=Object.freeze({
    system:"system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif",
    serif:"'Noto Serif',Georgia,'Times New Roman',serif",
    mono:"ui-monospace,Consolas,'Courier New',monospace"
  });
  const THEMES=['dark','sepia','light'];
  const SIZES=[16,18,20,22,24,26];
  let state={...DEFAULT};
  let initialized=false;

  function sanitize(input){
    return {
      font:Object.hasOwn(FONTS,input?.font)?input.font:DEFAULT.font,
      size:SIZES.includes(Number(input?.size))?Number(input.size):DEFAULT.size,
      theme:THEMES.includes(input?.theme)?input.theme:DEFAULT.theme
    };
  }
  function load(storage){
    try{return sanitize(JSON.parse(storage.getItem(KEY)||'null'));}
    catch(_){return {...DEFAULT};}
  }
  function save(storage,prefs){
    try{storage.setItem(KEY,JSON.stringify(sanitize(prefs)));return true;}
    catch(_){return false;}
  }
  function apply(){
    if(typeof document==='undefined')return;
    const paper=document.getElementById('reader-paper');
    if(!paper)return;
    paper.dataset.readerTheme=state.theme;
    paper.style.setProperty('--reader-font',FONTS[state.font]);
    paper.style.setProperty('--reader-size',state.size+'px');
    const font=document.getElementById('reader-font-choice');
    const size=document.getElementById('reader-font-size');
    const output=document.getElementById('reader-size-value');
    if(font)font.value=state.font;
    if(size)size.value=String(state.size);
    if(output)output.textContent=state.size+'px';
    document.querySelectorAll('#reader-settings-popover [data-reader-theme]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.readerTheme===state.theme));
    });
  }
  function change(next){
    state=sanitize({...state,...next});
    apply();
    if(typeof localStorage!=='undefined')save(localStorage,state);
  }
  function close(restoreFocus){
    if(typeof document==='undefined')return;
    const popover=document.getElementById('reader-settings-popover');
    const trigger=document.getElementById('reader-settings-trigger');
    if(!popover||popover.hidden)return;
    popover.hidden=true;
    trigger?.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger?.focus();
  }
  function toggle(){
    const popover=document.getElementById('reader-settings-popover');
    const trigger=document.getElementById('reader-settings-trigger');
    if(!popover)return;
    const opening=popover.hidden;
    popover.hidden=!opening;
    trigger?.setAttribute('aria-expanded',String(opening));
    if(opening)document.getElementById('reader-font-choice')?.focus();
  }
  function init(){
    if(initialized||typeof document==='undefined')return;
    if(!document.getElementById('reader-settings-trigger'))return;
    initialized=true;
    if(typeof localStorage!=='undefined')state=load(localStorage);
    apply();
    document.getElementById('reader-settings-trigger').addEventListener('click',toggle);
    document.getElementById('reader-settings-close').addEventListener('click',()=>close(true));
    document.getElementById('reader-font-choice').addEventListener('change',e=>change({font:e.target.value}));
    document.getElementById('reader-font-size').addEventListener('input',e=>change({size:Number(e.target.value)}));
    document.querySelectorAll('#reader-settings-popover [data-reader-theme]').forEach(button=>{
      button.addEventListener('click',()=>change({theme:button.dataset.readerTheme}));
    });
    document.addEventListener('pointerdown',e=>{
      if(!e.target.closest?.('.reader-settings-anchor'))close();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape')close(true);
    });
  }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
  }
  return Object.freeze({KEY,DEFAULT,FONTS,sanitize,load,save,init,apply,close,toggle,change});
});
