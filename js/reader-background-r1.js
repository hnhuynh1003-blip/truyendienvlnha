/* READER-BG R1: device-only full-paper backgrounds from the existing Phone V38/V39 catalog.
 * No wallet, inventory, Firebase, EPUB transport or Phone preference writes.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)root.DuduReaderBackgroundR1=api;
})(typeof window!=='undefined'?window:null,function(host){
  'use strict';
  const PREFIX='dudu-reader-bg-r1:';
  const DEFAULT=Object.freeze({enabled:false,id:'v38-moon',opacity:72});
  const OWNER_RE=/^[A-Za-z0-9_-]{1,170}$/;
  const ASSET_RE=/^[a-z0-9-]+\.webp$/;
  const doc=host?.document||null;
  let selected={...DEFAULT},activeOwner=null,panel=null,initialized=false;
  let imageRequestUrl=null,imageReady=false,imageFailed=false;

  function catalog(){return host?.DuduWallpaperCatalogV38||null;}
  function entry(id,source=catalog()){
    return typeof id==='string'&&Array.isArray(source?.ITEMS)?
      source.ITEMS.find(item=>item.id===id)||null:null;
  }
  function assetPath(item){
    if(!item||!ASSET_RE.test(item.asset))return null;
    const folder=item.folder||'v38';
    if(!['v38','v39'].includes(folder))return null;
    return 'assets/wallpapers/'+folder+'/'+item.asset;
  }
  // A relative url() in a custom property is resolved against the stylesheet
  // where var() is consumed (css/reader-background-r1.css), not index.html.
  // Produce an absolute same-origin URL so GitHub Pages subpaths work.
  function assetUrl(item,base=doc?.baseURI){
    const path=assetPath(item);
    if(!path||!base)return null;
    try{
      const url=new URL(path,base);
      const root=new URL(base);
      return url.origin===root.origin&&['https:','http:'].includes(url.protocol)?url.href:null;
    }catch(_){return null;}
  }
  function ensureImage(url){
    if(!url)return false;
    if(imageRequestUrl!==url){
      imageRequestUrl=url;imageReady=false;imageFailed=false;
      const image=new host.Image();
      image.onload=()=>{
        if(imageRequestUrl!==url)return;
        imageReady=image.naturalWidth>0;imageFailed=!imageReady;
        apply();
      };
      image.onerror=()=>{
        if(imageRequestUrl!==url)return;
        imageReady=false;imageFailed=true;
        apply();
      };
      image.src=url;
    }
    return imageReady;
  }
  function sanitize(input,source=catalog()){
    const item=entry(input?.id,source);
    const opacity=Number(input?.opacity);
    return {
      enabled:input?.enabled===true,
      id:item&&assetPath(item)?item.id:DEFAULT.id,
      opacity:Number.isInteger(opacity)&&opacity>=65&&opacity<=90?opacity:DEFAULT.opacity
    };
  }
  function keyFor(owner){
    return typeof owner==='string'&&OWNER_RE.test(owner)?PREFIX+owner:null;
  }
  function read(storage,owner,source=catalog()){
    const key=keyFor(owner);
    if(!key||!storage?.getItem)return {...DEFAULT};
    try{return sanitize(JSON.parse(storage.getItem(key)||'null'),source);}
    catch(_){return {...DEFAULT};}
  }
  function save(storage,owner,value,source=catalog()){
    const key=keyFor(owner);
    if(!key||!storage?.setItem)return false;
    try{storage.setItem(key,JSON.stringify(sanitize(value,source)));return true;}
    catch(_){return false;}
  }
  function canUse(id,source=catalog(),storage=null,owner=null){
    const item=entry(id,source);
    if(!assetPath(item)||typeof source?.allowed!=='function')return false;
    try{return source.allowed('wallpaper',id,storage,owner)===true;}
    catch(_){return false;}
  }
  function owner(){
    let value=null;
    try{
      if(typeof host?.phoneWallpaperOwnerV27==='function')
        value=host.phoneWallpaperOwnerV27();
    }catch(_){}
    return typeof value==='string'&&OWNER_RE.test(value)?value:'guest';
  }
  function storage(){
    try{return host?.localStorage||null;}catch(_){return null;}
  }
  function label(item,allowed){
    if(item.kind==='premium')return allowed?'Đã sở hữu':String(item.price)+' Xu · Mua trong Cyber Phone';
    if(item.kind==='gift')return allowed?'Đã nhận quà':'Quà chưa nhận';
    return 'Miễn phí';
  }
  function create(tag,className,content){
    const el=doc.createElement(tag);
    if(className)el.className=className;
    if(content!==undefined)el.textContent=content;
    return el;
  }
  function makePanel(){
    const anchor=doc.querySelector('#reader-settings-popover .reader-theme-choices');
    if(!anchor||doc.getElementById('reader-bg-r1'))return;
    panel=create('section','reader-bg-r1');
    panel.id='reader-bg-r1';
    panel.setAttribute('aria-label','Hình nền đọc truyện');
    const top=create('div','reader-bg-r1-top');
    const title=create('strong','','Hình nền trang đọc');
    const toggleLabel=create('label','reader-bg-r1-toggle');
    const toggle=create('input');
    toggle.id='reader-bg-r1-enabled';toggle.type='checkbox';
    toggleLabel.append(toggle,doc.createTextNode(' Sử dụng'));
    top.append(title,toggleLabel);
    const note=create('p','reader-bg-r1-help','Dùng chung hình nền đã sở hữu · chọn nền trang đọc độc lập.');
    const grid=create('div','reader-bg-r1-grid');
    grid.id='reader-bg-r1-grid';
    for(const item of catalog()?.ITEMS||[]){
      const path=assetPath(item);
      if(!path)continue;
      const button=create('button','reader-bg-r1-choice');
      button.type='button';button.dataset.readerBgId=item.id;
      button.setAttribute('aria-label','Chọn '+item.name);
      const image=create('img');image.src=path;image.alt='';
      image.loading='lazy';image.decoding='async';image.width=180;image.height=260;
      const name=create('span','reader-bg-r1-name',item.name);
      const state=create('span','reader-bg-r1-kind');
      button.append(image,name,state);
      button.addEventListener('click',()=>{
        if(canUse(item.id,catalog(),storage(),owner()))commit({enabled:true,id:item.id});
      });
      grid.append(button);
    }
    const opacityWrap=create('div','reader-bg-r1-opacity');
    const opacityLabel=create('label');
    opacityLabel.htmlFor='reader-bg-r1-opacity';
    opacityLabel.append(doc.createTextNode('Độ phủ '));
    const output=create('output');output.id='reader-bg-r1-opacity-value';
    opacityLabel.append(output);
    const slider=create('input');slider.id='reader-bg-r1-opacity';
    slider.type='range';slider.min='65';slider.max='90';slider.step='1';
    slider.addEventListener('input',()=>commit({opacity:Number(slider.value)}));
    opacityWrap.append(opacityLabel,slider);
    const status=create('p','reader-bg-r1-status');
    status.id='reader-bg-r1-status';status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    toggle.addEventListener('change',()=>commit({enabled:toggle.checked}));
    panel.append(top,note,grid,opacityWrap,status);
    anchor.after(panel);
  }
  function render(){
    if(!panel)return;
    const source=catalog(),store=storage(),who=owner();
    const toggle=doc.getElementById('reader-bg-r1-enabled');
    const slider=doc.getElementById('reader-bg-r1-opacity');
    const output=doc.getElementById('reader-bg-r1-opacity-value');
    if(toggle)toggle.checked=selected.enabled;
    if(slider){slider.value=String(selected.opacity);slider.disabled=!selected.enabled;}
    if(output)output.textContent=selected.opacity+'%';
    panel.querySelectorAll('[data-reader-bg-id]').forEach(button=>{
      const item=entry(button.dataset.readerBgId,source);
      const allowed=canUse(button.dataset.readerBgId,source,store,who);
      button.disabled=!allowed;
      button.setAttribute('aria-pressed',String(selected.enabled&&selected.id===button.dataset.readerBgId));
      const badge=button.querySelector('.reader-bg-r1-kind');
      if(badge&&item)badge.textContent=label(item,allowed);
    });
    const usable=canUse(selected.id,source,store,who);
    const status=doc.getElementById('reader-bg-r1-status');
    if(status){status.textContent=!selected.enabled?'':
      !usable?'Hình nền chưa có quyền sử dụng; tạm dùng màu trang đọc.':
      imageFailed?'Không tải được ảnh nền. Đang dùng màu trang đọc; mở lại cài đặt để thử lại.':
      !imageReady?'Đang tải ảnh nền; tạm dùng màu trang đọc.':
      '';
      status.hidden=!status.textContent;
    }
  }
  function apply(){
    if(!doc)return false;
    const paper=doc.getElementById('reader-paper');
    if(!paper)return false;
    const item=entry(selected.id),allowed=canUse(selected.id,catalog(),storage(),owner());
    const url=allowed?assetUrl(item):null;
    const ready=selected.enabled&&url?ensureImage(url):false;
    if(ready){
      paper.dataset.readerBg=selected.id;
      paper.style.setProperty('--reader-r1-photo','url("'+url+'")');
      paper.style.setProperty('--reader-r1-shade',String(selected.opacity/100));
    }else{
      paper.removeAttribute('data-reader-bg');
      paper.style.removeProperty('--reader-r1-photo');
      paper.style.removeProperty('--reader-r1-shade');
    }
    render();
    return !!ready;
  }
  function refresh(forceRead=false){
    const who=owner();
    if(who!==activeOwner||forceRead){
      activeOwner=who;
      selected=read(storage(),who);
      if(imageFailed){imageRequestUrl=null;imageFailed=false;}
    }
    return apply();
  }
  function commit(patch){
    selected=sanitize({...selected,...patch});
    if(selected.enabled&&imageFailed){imageRequestUrl=null;imageFailed=false;}
    save(storage(),owner(),selected);
    apply();
    return {...selected};
  }
  function reset(){return commit(DEFAULT);}
  function init(){
    if(initialized||!doc)return;
    if(!doc.getElementById('reader-paper'))return;
    initialized=true;
    makePanel();
    refresh(true);
    doc.getElementById('reader-settings-reset')?.addEventListener('click',reset);
    doc.getElementById('reader-settings-trigger')?.addEventListener('click',()=>refresh(true));
    host.addEventListener('dudu-auth-state-changed',()=>refresh(true));
    host.addEventListener('dudu-account-changed',()=>refresh(true));
    host.addEventListener('storage',event=>{
      if(event.key===null||event.key.startsWith(PREFIX)||event.key.startsWith('dudu-sandbox:phone-studio:v38:'))
        refresh(true);
    });
    doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)refresh(true);});
  }
  if(doc){
    if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
  }
  return Object.freeze({PREFIX,DEFAULT,entry,assetPath,assetUrl,sanitize,keyFor,read,save,canUse,
    init,apply,refresh,commit,reset});
});
