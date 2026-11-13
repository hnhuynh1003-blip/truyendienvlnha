/* DUDU V67.2 — mobile viewport and diary behavior for the legacy V43 companion.
 * Presentation only. No network, accounts, persistence, NPC history or rewards.
 */
(function(root){
 'use strict';
 const doc=root.document;
 if(!doc||root.DuduMessengerV672)return;
 const $=id=>doc.getElementById(id);
 const active=()=>doc.body?.classList?.contains('dudu-v672-chatting')===true &&
   $('phone-app-chat')?.classList?.contains('dudu-v43-companion-open')===true;
 function adjustViewport(){
   const phone=$('cyber-phone');
   if(!phone)return false;
   if(!active()){
     phone.style.removeProperty('--dudu-v672-viewport-top');
     phone.style.removeProperty('--dudu-v672-viewport-height');
     return false;
   }
   const view=root.visualViewport;
   if(view&&Number.isFinite(view.height)&&view.height>0){
     phone.style.setProperty('--dudu-v672-viewport-top',
       Math.max(0,view.offsetTop||0)+'px');
     phone.style.setProperty('--dudu-v672-viewport-height',
       Math.round(view.height)+'px');
   }else{
     phone.style.removeProperty('--dudu-v672-viewport-top');
     phone.style.removeProperty('--dudu-v672-viewport-height');
   }
   return true;
 }
 function closeTools(){
   const diary=$('dudu-v43-diary');
   if(diary?.open)diary.open=false;
 }
 function onLifecycle(event){
   const next=event?.detail;
   if(!next)return;
   if(!next.open||next.appId!=='chat'||next.conversation!=='dudu'){
     // DUDU's transient overlay must never cover other apps or a reopened inbox.
     if(doc.body?.classList?.contains('dudu-v672-chatting')){
       root.DuduCompanionV43?.hide?.();
     }
     closeTools();
   }
   adjustViewport();
 }
 function initialize(){
   doc.addEventListener('dudu:phone:lifecycle',onLifecycle);
   doc.addEventListener('pointerdown',event=>{
     const diary=$('dudu-v43-diary');
     if(!active()||!diary?.open||diary.contains(event.target))return;
     closeTools();
   });
   doc.addEventListener('keydown',event=>{
     const diary=$('dudu-v43-diary');
     if(!active()||!diary?.open||event.key!=='Escape')return;
     event.preventDefault();
     event.stopImmediatePropagation();
     closeTools();
   },true);
   root.visualViewport?.addEventListener?.('resize',adjustViewport);
   root.visualViewport?.addEventListener?.('scroll',adjustViewport);
   root.addEventListener?.('resize',adjustViewport);
   adjustViewport();
 }
 root.DuduMessengerV672=Object.freeze({version:2,adjustViewport,closeTools});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
})(typeof window!=='undefined'?window:{});
