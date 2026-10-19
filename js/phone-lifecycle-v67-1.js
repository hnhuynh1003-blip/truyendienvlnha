/* DUDU V67.1 — Cyber Phone lifecycle adapter.
 * Coordinates existing navigation without replacing legacy app renderers.
 * No storage, Firestore, AI requests, game rewards or permission changes.
 */
(function(root){
 'use strict';
 if(!root?.document||root.DuduPhoneLifecycleV671)return;
 const doc=root.document, id=x=>doc.getElementById(x);
 const apps=()=>root.DuduPhoneAppsV67?.specs||[];
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true;
 const accountKey=()=>{
   if(sandbox())return 'sandbox:'+(typeof currentUsername==='string'?currentUsername:'');
   // The auth UID exists before Firestore finishes loading; don't infer
   // that an authenticated user has a usable profile or verified permissions.
   let uid=null;
   try{uid=root.DuduAuth?.uid?.()||root.firebase?.auth?.()?.currentUser?.uid||null;}
   catch(_){}
   return uid?'firebase:'+uid:'guest';
 };
 let installed=false,owner=accountKey(),last=null,queued=false,identityChanged=false;
 function state(){
   const phone=id('cyber-phone'),open=phone?.style.display==='flex';
   const active=apps().find(a=>id(a.elementId)?.style.display==='flex')||null;
   const home=id('phone-home-screen')?.style.display==='flex';
   const appId=open&&active?active.id:null;
   const chat=id('phone-app-chat');
   let conversation=null;
   if(appId==='chat'){
     conversation=chat?.classList.contains('dudu-v43-companion-open')?'dudu':
       chat?.classList.contains('dudu-v33-chat-open')?'npc':'inbox';
   }
   return Object.freeze({
     open:!!open,appId,home:!!open&&!!home&&!active,
     conversation,accountChanged:identityChanged
   });
 }
 function emit(reason,force=false){
   identityChanged=false;
   const next=state(),changed=force||!last||
     last.open!==next.open||last.appId!==next.appId||
     last.home!==next.home||last.conversation!==next.conversation;
   if(!changed)return next;
   last=next;
   if(typeof root.CustomEvent==='function'&&typeof doc.dispatchEvent==='function')
     doc.dispatchEvent(new root.CustomEvent('dudu:phone:lifecycle',{
       detail:Object.freeze({reason,open:next.open,appId:next.appId,
         home:next.home,conversation:next.conversation,accountChanged:force})
     }));
   return next;
 }
 function scrubVolatile(){
   // Leave persisted per-UID conversation and NPC identity data untouched.
   for(const inputId of ['dudu-v43-message-input','chat-user-input']){
     const input=id(inputId);
     if(input)input.value='';
   }
   id('chat-messages-container')?.replaceChildren();
   id('dudu-v43-messages')?.replaceChildren();
   const roleEditor=id('dudu-v56-role-editor');
   if(roleEditor)roleEditor.hidden=true;
   root.DuduCompanionV43?.hide?.();
   const chat=id('phone-app-chat');
   chat?.classList.remove('dudu-v43-companion-open','dudu-v33-chat-open');
   chat?.classList.add('dudu-v33-inbox');
 }
 function onAccountChanged(){
   const next=accountKey();
   if(owner===next)return false;
   owner=next;
   identityChanged=true;
   // Close BEFORE another account can view the old account's app.
   if(id('cyber-phone')?.style.display==='flex'&&typeof root.togglePhone==='function'){
     try{root.togglePhone();}catch(e){console.warn('DUDU phone close on account switch:',e);}
   }
   scrubVolatile();
   // With the phone closed, reset its navigation to a neutral home surface.
   if(typeof root.phoneHome==='function'){
     try{root.phoneHome();}catch(e){console.warn('DUDU phone home on account switch:',e);}
   }
   emit('account-change',true);
   return true;
 }
 function refresh(reason='refresh'){
   onAccountChanged();
   return emit(reason);
 }
 function enqueue(reason){
   if(queued)return;
   queued=true;
   queueMicrotask(()=>{queued=false;refresh(reason);});
 }
 function wrap(name,reason){
   const original=root[name];
   if(typeof original!=='function')return;
   const adapted=function(){
     const beforeOwner=accountKey();
     if(owner!==beforeOwner)onAccountChanged();
     const result=original.apply(this,arguments);
     if(name==='openPhoneApp'&&arguments[0]!=='chat')
       root.DuduCompanionV43?.hide?.();
     enqueue(reason);
     return result;
   };
   root[name]=adapted;
 }
 function init(){
   if(installed)return;
   installed=true;
   owner=accountKey();
   // V33 inbox is installed at DOMContentLoaded; wrap the final V33 layer,
   // not the original early, to retain inbox and direct NPC navigation.
   for(const name of ['openPhoneApp','phoneHome','togglePhone'])wrap(name,name);
   const watched=[id('cyber-phone'),id('phone-home-screen'),id('phone-app-chat'),
     ...apps().map(a=>id(a.elementId))].filter(Boolean);
   if(typeof root.MutationObserver==='function'){
     const observer=new root.MutationObserver(()=>enqueue('view-change'));
     for(const item of new Set(watched))
       observer.observe(item,{attributes:true,attributeFilter:item.id==='phone-app-chat'?['style','class']:['style']});
   }
   // Auth observer is read-only: it never signs a user in or reads a profile.
   if(!sandbox()){
     try{
       const auth=root.firebase?.auth?.();
       if(typeof auth?.onAuthStateChanged==='function')
         auth.onAuthStateChanged(()=>enqueue('auth-change'),()=>{});
     }catch(e){console.warn('DUDU phone session observer:',e?.code||'unavailable');}
   }
   emit('initialized',true);
 }
 root.DuduPhoneLifecycleV671=Object.freeze({
   version:1,init,refresh,onAccountChanged,get state(){return state();}
 });
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null);
