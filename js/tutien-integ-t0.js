/* INTEG-T0: navigation/presentation bridge only. No account, reward or identity API. */
(function(root){'use strict';
 const doc=root.document,appBase=new URL('../',doc.currentScript.src);let frame=null;
 function unmount(){frame?.remove();frame=null;doc.getElementById('cyber-phone')?.classList.remove('tutien-integ-open');}
 function render(){
  const host=doc.getElementById('dudu-v69-system-view');if(!host)return false;
  doc.getElementById('cyber-phone')?.classList.add('tutien-integ-open');
  if(frame?.isConnected)return true;
  host.replaceChildren();host.classList.add('tutien-integ-host');
  const nav=doc.createElement('div');nav.className='tutien-integ-toolbar';
  const badge=doc.createElement('span');badge.textContent='BẢN THỬ · MOCK ONLY';
  const back=doc.createElement('button');back.type='button';back.textContent='Về Library';back.onclick=()=>root.openPhoneApp('stories');nav.append(badge,back);
  frame=doc.createElement('iframe');frame.id='tutien-integ-frame';frame.title='Tu Tiên — phó bản ba ải, dữ liệu mock';
  // Fixed existing MOD-P2 URL. No MOD-P3, account UID, postMessage reward or asset bridge.
  frame.src=new URL('prototypes/tutien-combat-s/module/index.html?waves=1',appBase).href;
  frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.referrerPolicy='no-referrer';
  frame.addEventListener('load',()=>{const child=frame?.contentDocument;if(!child)return;child.documentElement.classList.add('cyber-phone-embedded');const link=child.createElement('link');link.rel='stylesheet';link.href=new URL('css/tutien-integ-t0-frame.css?v=vis-ux-r2',appBase).href;child.head.append(link);const bagStyle=child.createElement('link');bagStyle.rel='stylesheet';bagStyle.href=new URL('css/tutien-qiankun-vis-t2.css?v=1',appBase).href;child.head.append(bagStyle);const navStyle=child.createElement('link');navStyle.rel='stylesheet';navStyle.href=new URL('css/tutien-nav-skin-r1.css?v=1',appBase).href;child.head.append(navStyle);const equipmentStyle=child.createElement('link');equipmentStyle.rel='stylesheet';equipmentStyle.href=new URL('css/tutien-equipment-vis-t2e.css?v=1',appBase).href;child.head.append(equipmentStyle);const skin=child.createElement('script');skin.type='module';skin.src=new URL('js/tutien-vis-t1.mjs?v=vis-ux-r2',appBase).href;child.head.append(skin);});
  host.append(nav,frame);return true;
 }
 function sync(){const phone=doc.getElementById('cyber-phone'),panel=doc.getElementById('phone-app-system');if(frame&&(phone?.style.display!=='flex'||panel?.style.display!=='flex'))unmount();}
 doc.addEventListener('DOMContentLoaded',()=>{for(const id of ['cyber-phone','phone-app-system']){const e=doc.getElementById(id);if(e)new MutationObserver(sync).observe(e,{attributes:true,attributeFilter:['style']});}},{once:true});
 root.addEventListener('pagehide',unmount);root.DuduTuTienIntegT0=Object.freeze({render,unmount});
})(window);
