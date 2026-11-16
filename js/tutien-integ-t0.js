/* Tu Tien presentation bridge. Combat and persistence stay inside the existing prototype. */
(function(root){'use strict';
 const doc=root.document,appBase=new URL('../',doc.currentScript.src);let frame=null,cleanup=null;
 function unmount(){cleanup?.();cleanup=null;frame?.remove();frame=null;doc.getElementById('cyber-phone')?.classList.remove('tutien-integ-open');}
 function render(){
  const host=doc.getElementById('dudu-v69-system-view');if(!host)return false;
  doc.getElementById('cyber-phone')?.classList.add('tutien-integ-open');
  if(frame?.isConnected)return true;
  host.replaceChildren();host.classList.add('tutien-integ-host','tutien-loading');
  const nav=doc.createElement('div');nav.className='tutien-integ-toolbar';
  const badge=doc.createElement('span');badge.textContent='BẢN THỬ · MOCK ONLY';
  const back=doc.createElement('button');back.type='button';back.textContent='Về Library';back.onclick=()=>root.openPhoneApp('stories');nav.append(badge,back);
  const loading=doc.createElement('div');loading.className='tutien-loading-view';
  const status=doc.createElement('p');status.setAttribute('role','status');status.textContent='Đang mở Động Phủ…';
  const retry=doc.createElement('button');retry.type='button';retry.textContent='Thử lại';retry.hidden=true;retry.onclick=()=>{unmount();render();};
  const leave=doc.createElement('button');leave.type='button';leave.textContent='Về Library';leave.onclick=back.onclick;
  loading.append(status,retry,leave);
  const current=doc.createElement('iframe');frame=current;current.id='tutien-integ-frame';current.title='Tu Tiên — phó bản ba ải, dữ liệu mock';
  // Hide before attaching: the raw prototype must never paint while its visual layers load.
  current.style.visibility='hidden';current.setAttribute('aria-hidden','true');current.setAttribute('aria-busy','true');
  current.src=new URL('prototypes/tutien-combat-s/module/index.html?waves=1&presentation=pages-r2-20261113',appBase).href;
  current.setAttribute('sandbox','allow-scripts allow-same-origin');current.referrerPolicy='no-referrer';
  let active=true,interval=null,deadline=null,decoding=false;
  const stop=()=>{root.clearInterval(interval);root.clearTimeout(deadline);};
  cleanup=()=>{active=false;stop();loading.remove();host.classList.remove('tutien-loading','tutien-home-stage');};
  const fail=()=>{if(!active)return;stop();status.textContent='Chưa tải được Động Phủ. Bạn có thể thử lại.';retry.hidden=false;loading.dataset.state='error';};
  deadline=root.setTimeout(fail,30000);
  current.addEventListener('load',()=>{
   if(!active||frame!==current)return;const child=current.contentDocument;if(!child){fail();return;}
   child.documentElement.classList.add('cyber-phone-embedded');let styles=0;
   for(const file of ['tutien-integ-t0-frame.css?v=vis-ux-r2','tutien-qiankun-vis-t2.css?v=1','tutien-nav-skin-r1.css?v=1','tutien-equipment-vis-t2e.css?v=1']){
    const link=child.createElement('link');link.rel='stylesheet';link.href=new URL('css/'+file,appBase).href;link.onload=()=>styles++;link.onerror=fail;child.head.append(link);
   }
   const skin=child.createElement('script');skin.type='module';skin.src=new URL('js/tutien-vis-t1.mjs?v=exploration-layout-20261117',appBase).href;skin.onerror=fail;child.head.append(skin);
   interval=root.setInterval(()=>{
    if(!active||decoding||styles!==4||child.getElementById('home-screen')?.dataset.visualReady!=='true')return;
    const images=[child.querySelector('.vis-cave'),child.querySelector('.vis-character')];
    if(images.some(i=>!i||!i.complete))return;if(images.some(i=>!i.naturalWidth)){fail();return;}
    decoding=true;Promise.all(images.map(i=>i.decode())).then(()=>root.requestAnimationFrame(()=>{
     if(!active||frame!==current||loading.dataset.state==='error')return;stop();current.style.visibility='visible';current.removeAttribute('aria-hidden');current.setAttribute('aria-busy','false');host.classList.remove('tutien-loading');loading.remove();
    })).catch(fail);
   },50);
  },{once:true});
  host.append(nav,current,loading);return true;
 }
 function sync(){const phone=doc.getElementById('cyber-phone'),panel=doc.getElementById('phone-app-system');if(frame&&(phone?.style.display!=='flex'||panel?.style.display!=='flex'))unmount();}
 doc.addEventListener('DOMContentLoaded',()=>{for(const id of ['cyber-phone','phone-app-system']){const e=doc.getElementById(id);if(e)new MutationObserver(sync).observe(e,{attributes:true,attributeFilter:['style']});}},{once:true});
 root.addEventListener('pagehide',unmount);root.DuduTuTienIntegT0=Object.freeze({render,unmount});
})(window);
