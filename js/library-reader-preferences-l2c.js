/* L2A: device-only typography for the shared Web/EPUB reader.
 * Keep the original storage key and legacy font IDs; never touch Phone,
 * bookmarks, cloud stories, Auth, or Firebase settings. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduReaderPreferencesL2C=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const KEY='dudu-reader-preferences-l2c';
  const DEFAULT=Object.freeze({
    font:'literata',size:18,theme:'dark',lineHeight:1.85,
    paragraph:1.2,width:68,align:'left'
  });
  const FONT_OPTIONS=Object.freeze([
    Object.freeze({id:'literata',label:'Literata · Sách'}),
    Object.freeze({id:'noto-serif',label:'Noto Serif · Cổ điển'}),
    Object.freeze({id:'lora',label:'Lora · Tiểu thuyết'}),
    Object.freeze({id:'be-vietnam-pro',label:'Be Vietnam Pro · Hiện đại'}),
    Object.freeze({id:'source-sans-3',label:'Source Sans 3 · Thoáng'})
  ]);
  const FONTS=Object.freeze({
    literata:"'Literata',Georgia,'Times New Roman',serif",
    'noto-serif':"'Noto Serif',Georgia,'Times New Roman',serif",
    lora:"'Lora',Georgia,'Times New Roman',serif",
    'be-vietnam-pro':"'Be Vietnam Pro',system-ui,'Segoe UI',Arial,sans-serif",
    'source-sans-3':"'Source Sans 3',system-ui,'Segoe UI',Arial,sans-serif",
    // Existing device preferences continue to render without migration.
    system:"system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif",
    serif:"'Noto Serif',Georgia,'Times New Roman',serif",
    mono:"ui-monospace,Consolas,'Courier New',monospace"
  });
  const LEGACY_LABELS=Object.freeze({
    system:'Kiểu cũ · Không chân',serif:'Kiểu cũ · Có chân',
    mono:'Kiểu cũ · Đơn cách'
  });
  // Google Fonts loads only the selected family, with system fallback offline.
  const FONT_STYLESHEETS=Object.freeze({
    literata:'https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&display=swap',
    'noto-serif':'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&display=swap',
    serif:'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&display=swap',
    lora:'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap',
    'be-vietnam-pro':'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&display=swap',
    'source-sans-3':'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap'
  });
  const THEMES=Object.freeze(['dark','sepia','light','soft']);
  const ALIGNS=Object.freeze(['left','justify']);
  const SIZES=Object.freeze(Array.from({length:13},(_,i)=>i+16));
  let state={...DEFAULT};
  let initialized=false;

  function stepped(value,min,max,step,fallback){
    const number=Number(value);
    if(!Number.isFinite(number)||number<min||number>max)return fallback;
    return Number((min+Math.round((number-min)/step)*step).toFixed(2));
  }
  function sanitize(input){
    return {
      font:Object.hasOwn(FONTS,input?.font)?input.font:DEFAULT.font,
      size:SIZES.includes(Number(input?.size))?Number(input.size):DEFAULT.size,
      theme:THEMES.includes(input?.theme)?input.theme:DEFAULT.theme,
      lineHeight:stepped(input?.lineHeight,1.5,2.2,.05,DEFAULT.lineHeight),
      paragraph:stepped(input?.paragraph,.6,1.8,.1,DEFAULT.paragraph),
      width:stepped(input?.width,52,72,4,DEFAULT.width),
      align:ALIGNS.includes(input?.align)?input.align:DEFAULT.align
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
  function ensureFont(font){
    if(typeof document==='undefined'||!document.head)return;
    const url=FONT_STYLESHEETS[font];
    if(!url||document.querySelector('link[data-dudu-reader-font="'+font+'"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href=url;link.dataset.duduReaderFont=font;
    document.head.appendChild(link);
  }
  function reflectFontChoice(select){
    if(!select)return;
    select.querySelectorAll('option[data-reader-legacy]').forEach(option=>option.remove());
    if(Object.hasOwn(LEGACY_LABELS,state.font)){
      const option=document.createElement('option');
      option.value=state.font;
      option.textContent=LEGACY_LABELS[state.font];
      option.dataset.readerLegacy='true';
      select.prepend(option);
    }
    select.value=state.font;
  }
  function apply(){
    if(typeof document==='undefined')return;
    const paper=document.getElementById('reader-paper');
    if(!paper)return;
    if(document.body?.classList.contains('dudu-reading-active'))ensureFont(state.font);
    paper.dataset.readerTheme=state.theme;
    paper.style.setProperty('--reader-font',FONTS[state.font]);
    paper.style.setProperty('--reader-size',state.size+'px');
    paper.style.setProperty('--reader-line-height',String(state.lineHeight));
    paper.style.setProperty('--reader-paragraph-gap',state.paragraph+'em');
    paper.style.setProperty('--reader-column-width',state.width+'ch');
    paper.style.setProperty('--reader-align',state.align==='justify'?'justify':'start');
    reflectFontChoice(document.getElementById('reader-font-choice'));
    for(const [id,value,output] of [
      ['reader-font-size',state.size,state.size+'px'],
      ['reader-line-height',state.lineHeight,state.lineHeight.toFixed(2)+'×'],
      ['reader-paragraph-space',state.paragraph,state.paragraph.toFixed(1)+'em'],
      ['reader-column-width',state.width,state.width+' ký tự']
    ]){
      const field=document.getElementById(id);
      const label=document.getElementById(id==='reader-font-size'?'reader-size-value':id+'-value');
      if(field)field.value=String(value);
      if(label)label.textContent=output;
    }
    document.querySelectorAll('#reader-settings-popover [data-reader-theme]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.readerTheme===state.theme));
    });
    document.querySelectorAll('#reader-settings-popover [data-reader-align]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.readerAlign===state.align));
    });
  }
  function change(next){
    state=sanitize({...state,...next});
    apply();
    if(typeof localStorage!=='undefined')save(localStorage,state);
  }
  function reset(){change(DEFAULT);}
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
    document.getElementById('reader-settings-reset').addEventListener('click',reset);
    document.getElementById('reader-font-choice').addEventListener('change',e=>change({font:e.target.value}));
    for(const [id,field] of [
      ['reader-font-size','size'],['reader-line-height','lineHeight'],
      ['reader-paragraph-space','paragraph'],['reader-column-width','width']
    ])document.getElementById(id).addEventListener('input',e=>change({[field]:Number(e.target.value)}));
    document.querySelectorAll('#reader-settings-popover [data-reader-theme]').forEach(button=>{
      button.addEventListener('click',()=>change({theme:button.dataset.readerTheme}));
    });
    document.querySelectorAll('#reader-settings-popover [data-reader-align]').forEach(button=>{
      button.addEventListener('click',()=>change({align:button.dataset.readerAlign}));
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
  return Object.freeze({KEY,DEFAULT,FONTS,FONT_OPTIONS,FONT_STYLESHEETS,
    sanitize,load,save,init,apply,close,toggle,change,reset});
});
