/* Served ONLY by the loopback preview. No real Firebase SDK or service connection. */
(function(){'use strict';
 const url=new URL(location.href);url.searchParams.set('sandbox','1');history.replaceState(null,'',url);
 const denied=()=>Promise.reject(Error('INTEG-T0 preview: live service disabled'));
 const empty={exists:false,data:()=>undefined,docs:[],empty:true,forEach:()=>{}};
 const ref={get:async()=>empty,set:denied,update:denied,delete:denied,add:denied,onSnapshot:()=>()=>{},where(){return this;},orderBy(){return this;},limit(){return this;},collection(){return this;},doc(){return this;}};
 const db={...ref,settings(){},enablePersistence:denied,runTransaction:denied,batch:()=>({set(){throw Error('disabled');},commit:denied})};
 const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>null,increment:()=>{throw Error('disabled');},delete:()=>{throw Error('disabled');}};firestore.Timestamp={now:()=>({toMillis:()=>Date.now()}),fromMillis:n=>({toMillis:()=>n})};
 const auth=()=>({currentUser:null,onAuthStateChanged:fn=>{queueMicrotask(()=>fn(null));return()=>{};},signOut:async()=>{},signInWithPopup:denied});
 window.firebase=Object.freeze({initializeApp:()=>({options:{projectId:'INTEG-T0-MOCK_ONLY'}}),app:()=>({options:{projectId:'INTEG-T0-MOCK_ONLY'}}),firestore,auth,storage:()=>({ref:()=>({put:denied,getDownloadURL:denied})}),functions:()=>({httpsCallable:()=>denied})});
})();
