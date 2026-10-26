// Synthetic Firebase SDK for local main-mode Creator browser acceptance only.
module.exports=function creatorFirebase(){
 const subscribers=new Set();
 const session={currentUser:null,onAuthStateChanged(fn){subscribers.add(fn);setTimeout(()=>fn(this.currentUser),0);return()=>subscribers.delete(fn);},
  async signOut(){this.currentUser=null;for(const fn of subscribers)await fn(null);}};
 window.__creatorLogin=async(uid,admin=false)=>{
  const user=uid?{uid,email:uid+'@example.test',displayName:uid,getIdToken:async()=> 'FAKE-CREATOR-JWT',
   getIdTokenResult:async()=>({claims:{admin}})}:null;
  session.currentUser=user;for(const fn of subscribers)await fn(user);
 };
 function firestore(){return {collection(name){return {doc(id){return {
  get:async()=>({exists:name==='profiles_v2',data:()=>({username:id,name:id,role:'admin',storyStates:{},collectedCharacters:{}})}),
  set:async()=>{window.__creatorWrites.push(name);throw Error('No external writes allowed');},
  onSnapshot:fn=>{setTimeout(()=>fn({exists:false}),0);return()=>{};}
 };}};}};}
 firestore.FieldValue={serverTimestamp:()=>1};window.__creatorWrites=[];
 window.firebase={initializeApp(){},firestore,auth:Object.assign(()=>session,{GoogleAuthProvider:class{}})};
};
