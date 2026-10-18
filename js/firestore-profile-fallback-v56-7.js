/* DUDU V56.7 — authenticated, read-only Firestore profile fallback.
 * This is never an authorization bypass: Google Firestore REST enforces the
 * same deployed Security Rules for the same signed-in Firebase ID token.
 * No mutation, local profile migration, or cross-UID reads.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduFirestoreProfileFallbackV567=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  function decodeValue(v,depth=0){
    if(!v||typeof v!=='object'||depth>45)return null;
    if(own(v,'nullValue'))return null;
    if(own(v,'booleanValue'))return v.booleanValue===true;
    if(own(v,'integerValue'))return Number(v.integerValue);
    if(own(v,'doubleValue'))return Number(v.doubleValue);
    if(own(v,'stringValue'))return String(v.stringValue);
    if(own(v,'timestampValue'))return String(v.timestampValue);
    if(own(v,'referenceValue'))return String(v.referenceValue);
    if(own(v,'bytesValue'))return String(v.bytesValue);
    if(own(v,'geoPointValue'))return {
      latitude:Number(v.geoPointValue?.latitude)||0,
      longitude:Number(v.geoPointValue?.longitude)||0
    };
    if(own(v,'arrayValue')){
      const arr=v.arrayValue?.values;
      return Array.isArray(arr)?arr.map(item=>decodeValue(item,depth+1)):[];
    }
    if(own(v,'mapValue'))return decodeFields(v.mapValue?.fields,depth+1);
    return null;
  }
  function decodeFields(fields,depth=0){
    if(!fields||typeof fields!=='object'||Array.isArray(fields)||depth>45)return {};
    const entries=Object.entries(fields).filter(([key])=>
      key!=='__proto__'&&key!=='prototype'&&key!=='constructor');
    return Object.fromEntries(entries.map(([key,value])=>[key,decodeValue(value,depth+1)]));
  }
  function decodeDocument(payload){
    if(!payload||typeof payload!=='object'||!payload.fields||
       typeof payload.fields!=='object'||Array.isArray(payload.fields)){
      // A valid empty Firestore document has no fields property.
      if(payload?.name&&payload.fields===undefined)return {};
      throw Object.assign(new Error('Invalid Firestore REST document'),{code:'profile/rest-invalid'});
    }
    return decodeFields(payload.fields);
  }
  function httpError(status){
    const err=new Error('Firestore REST HTTP '+status);
    err.code=status===403?'permission-denied':
      status===401?'unauthenticated':'profile/rest-http';
    err.httpStatus=status;
    return err;
  }
  async function read(account,projectId,fetchFn,timeoutMs=10000){
    if(!account?.uid||!account.getIdToken||typeof fetchFn!=='function'||
      typeof projectId!=='string'||!/^[a-zA-Z0-9:-]{1,100}$/.test(projectId)){
      throw Object.assign(new Error('Invalid profile read scope'),{code:'profile/rest-scope'});
    }
    const uid=account.uid;
    const token=await account.getIdToken();
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const url='https://firestore.googleapis.com/v1/projects/'
        +encodeURIComponent(projectId)+'/databases/(default)/documents/profiles_v2/'
        +encodeURIComponent(uid);
      const response=await fetchFn(url,{
        method:'GET',headers:{Authorization:'Bearer '+token},
        cache:'no-store',signal:controller.signal
      });
      if(response.status===404)return {exists:false,data:()=>null,source:'rest'};
      if(response.status!==200)throw httpError(response.status);
      const document=await response.json();
      const data=decodeDocument(document);
      return {exists:true,data:()=>data,source:'rest'};
    }finally{clearTimeout(timer);}
  }
  return Object.freeze({decodeValue,decodeFields,decodeDocument,read});
});
