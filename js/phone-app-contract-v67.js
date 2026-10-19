/* DUDU V67.0 — shared read-only Cyber Phone app inventory.
 * This is a compatibility boundary, NOT proof of server availability.
 * Does not wrap legacy navigation, touch account data, grant permissions or initialize apps.
 */
(function(root){
 'use strict';
 if(!root||!root.document)return;
 const descriptors=[
  ['profile','Hồ sơ','retain','updatePhoneUI','account'],
  ['inventory','Kho đồ','retain','renderInventory','items'],
  ['author-mail','Thư tác giả','retain','renderAuthorMailV443','author'],
  ['lab-v445','Phòng thử nghiệm','sandbox','DuduMultiActorLabUIV445','lab'],
  ['museum','Bảo tàng','retain','renderMuseum','collectibles'],
  ['quests','Nhiệm vụ','bridge','renderQuests','quests'],
  ['stories','Truyện','retain','renderPhoneStoryListV29','stories'],
  ['codex','Nhân vật','retain','renderCodexList','npc'],
  ['chat','Liên lạc','modernize','renderChatDropdown','messaging'],
  ['shop','Cửa hàng','retain','renderShop','economy'],
  ['fun','DUDU FUN','retain','DuduFunUIV43','minigames'],
  ['settings','Cài đặt','retain','renderPhoneWallpaperV27','personalization']
 ];
 const specs=Object.freeze(descriptors.map(([id,label,decision,entrypoint,domain])=>Object.freeze({
   id,label,decision,entrypoint,domain,elementId:'phone-app-'+id
 })));
 const byId=Object.freeze(Object.fromEntries(specs.map(s=>[s.id,s])));
 function rendererPresent(spec){
   const provider=root[spec.entrypoint];
   return typeof provider==='function'||Boolean(provider&&typeof provider==='object');
 }
 function inspect(spec){
   const isSandbox=typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true;
   const phone=root.document.getElementById('cyber-phone');
   const panel=root.document.getElementById(spec.elementId);
   const launched=Boolean(phone?.style.display==='flex'&&panel?.style.display==='flex');
   const mounted=Boolean(panel);
   const entrypointDetected=rendererPresent(spec);
   // Strictly UI/source presence, NOT Firebase entitlement or backend health.
   const state=!mounted?'missing_mount':
     spec.decision==='sandbox'&&!isSandbox?'sandbox_only':
     !entrypointDetected?'missing_entrypoint':'code_present';
   return Object.freeze({
     id:spec.id,label:spec.label,domain:spec.domain,decision:spec.decision,
     elementId:spec.elementId,mounted,entrypointDetected,
     rendered:launched,state
   });
 }
 function get(id){
   const spec=byId[id];
   return spec?inspect(spec):null;
 }
 function snapshot(){return Object.freeze(specs.map(inspect));}
 function issues(){return Object.freeze(snapshot().filter(v=>
   v.state==='missing_mount'||v.state==='missing_entrypoint'
 ));}
 root.DuduPhoneAppsV67=Object.freeze({
   version:1,
   specs,
   get,
   snapshot,
   issues
 });
})(typeof window!=='undefined'?window:null);
