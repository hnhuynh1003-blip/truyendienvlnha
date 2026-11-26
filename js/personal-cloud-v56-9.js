/* DUDU V56.9 — narrow authenticated Firestore REST saves for reader preferences.
 * Only touches readingBookmarksV568.<story> or phoneAppearanceV568 on the
 * already-existing /profiles_v2/<Firebase UID> document. No economy writes.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduPersonalCloudV569=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function fieldString(value){return {stringValue:String(value)};}
  function fieldInt(value){return {integerValue:String(Math.trunc(value))};}
  function fieldsBookmark(value){
    const clean=globalThis?.DuduPersonalSyncV568?.cleanBookmark?.(value) ||
      (typeof require==='function'?require('./personal-sync-v56-8.js').cleanBookmark(value):null);
    if(!clean)throw new Error('Invalid bookmark');
    return {mapValue:{fields:{
      chIdx:fieldInt(clean.chIdx),chapterId:fieldString(clean.chapterId),
      scrollTop:fieldInt(clean.scrollTop),updatedAt:fieldInt(clean.updatedAt)
    }}};
  }
  function fieldsAppearance(value){
    const clean=globalThis?.DuduPersonalSyncV568?.cleanAppearance?.(value) ||
      (typeof require==='function'?require('./personal-sync-v56-8.js').cleanAppearance(value):null);
    if(!clean)throw new Error('Invalid phone preference');
    return {mapValue:{fields:{
      wallpaper:fieldString(clean.wallpaper),mode:fieldString(clean.mode),
      font:fieldString(clean.font),size:fieldString(clean.size),
      readerFontSize:fieldInt(clean.readerFontSize),theme:fieldString(clean.theme),
      updatedAt:fieldInt(clean.updatedAt)
    }}};
  }
  function fieldPath(name){
    if(typeof name!=='string'||name.length<1||name.length>160||
      ['__proto__','constructor','prototype'].includes(name))throw new Error('Invalid story');
    return 'readingBookmarksV568.'+
      (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
        ?name:'`'+name.replace(/[\\`]/g,'\\$&')+'`');
  }
  // A masked GET + document updateTime precondition protects the existing
  // preference against delayed writes by other upgraded clients. No blind
  // fallback, create, broad read, or unbounded retry. Server wins timestamp ties.
  const MAX_ATTEMPTS=3,DATE_MAX=4102444800000;
  const map=value=>value&&typeof value==='object'&&value.mapValue&&
    typeof value.mapValue==='object'&&(!Object.hasOwn(value.mapValue,'fields')||
    value.mapValue.fields&&typeof value.mapValue.fields==='object'&&!Array.isArray(value.mapValue.fields));
  const mapFields=value=>value.mapValue.fields||{};
  function timestamp(value){
    if(!map(value))throw Object.assign(Error('Invalid remote preference'),{code:'personal-sync/invalid-remote'});
    const fields=mapFields(value);
    if(!Object.hasOwn(fields,'updatedAt'))return 0; // legacy preference without timestamp
    const raw=fields.updatedAt?.integerValue;
    if(typeof raw!=='string'||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>=DATE_MAX)
      throw Object.assign(Error('Invalid remote preference timestamp'),{code:'personal-sync/invalid-remote'});
    return Number(raw);
  }
  function readPreference(doc,storyId){
    if(!doc||typeof doc!=='object'||typeof doc.updateTime!=='string'||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(doc.updateTime)||
      !Number.isFinite(Date.parse(doc.updateTime))||
      (Object.hasOwn(doc,'fields')&&(!doc.fields||typeof doc.fields!=='object'||Array.isArray(doc.fields))))
      throw Object.assign(Error('Unconfirmed preference snapshot'),{code:'personal-sync/unconfirmed'});
    const fields=doc.fields||{};
    let value;
    if(storyId===undefined)value=Object.hasOwn(fields,'phoneAppearanceV568')?fields.phoneAppearanceV568:undefined;
    else if(Object.hasOwn(fields,'readingBookmarksV568')){
      const bookmarks=fields.readingBookmarksV568;
      if(!map(bookmarks))throw Object.assign(Error('Invalid remote bookmarks'),{code:'personal-sync/invalid-remote'});
      const rows=mapFields(bookmarks);
      if(Object.hasOwn(rows,storyId))value=rows[storyId];
    }
    return {updateTime:doc.updateTime,value};
  }
  function httpError(response){
    const error=new Error('Firestore profile preference HTTP '+response.status);
    error.code=response.status===403?'permission-denied':'personal-sync/http';
    error.httpStatus=response.status;
    return error;
  }
  const conflict=()=>Object.assign(Error('Preference changed during save'),{code:'personal-sync/conflict'});
  async function patch({account,projectId,storyId,bookmark,appearance,fetchFn,isCurrent,timeoutMs=10000}){
    if(!account?.uid||typeof account.getIdToken!=='function'||
      typeof fetchFn!=='function'||typeof isCurrent!=='function'||
      !/^[a-zA-Z0-9:-]{1,100}$/.test(projectId||''))throw new Error('Invalid cloud scope');
    if((storyId===undefined)===(appearance===undefined))throw new Error('One field at a time');
    const owner=account.uid;
    const active=()=>account.uid===owner&&isCurrent(owner)===true;
    if(!active())return {skipped:true};
    const mask=storyId!==undefined?fieldPath(storyId):'phoneAppearanceV568';
    const candidate=storyId!==undefined?fieldsBookmark(bookmark):fieldsAppearance(appearance);
    const candidateTime=timestamp(candidate);
    const token=await account.getIdToken();
    if(!active())return {skipped:true};
    const base='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(projectId)
      +'/databases/(default)/documents/profiles_v2/'+encodeURIComponent(owner);
    const encodedMask=encodeURIComponent(mask);
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const abort=new AbortController();
    const timer=setTimeout(()=>abort.abort(),timeoutMs);
    const request=(url,options)=>fetchFn(url,{...options,headers,cache:'no-store',signal:abort.signal});
    try{
      for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
        if(!active())return {skipped:true};
        if(abort.signal.aborted)throw Object.assign(Error('Preference timeout'),{code:'personal-sync/timeout'});
        const read=await request(base+'?mask.fieldPaths='+encodedMask,{method:'GET'});
        if(!active())return {skipped:true};
        if(!read.ok)throw httpError(read);
        const snapshot=readPreference(await read.json(),storyId);
        if(!active())return {skipped:true};
        if(snapshot.value!==undefined&&timestamp(snapshot.value)>=candidateTime)
          return {saved:false,superseded:true};
        // Preserve unknown fields of an existing preference; don't touch sibling
        // bookmarks, historical ownership, or any other profile field.
        const merged={mapValue:{fields:{...(snapshot.value===undefined?{}:mapFields(snapshot.value)),...mapFields(candidate)}}};
        const values=storyId!==undefined
          ?{readingBookmarksV568:{mapValue:{fields:{[storyId]:merged}}}}
          :{phoneAppearanceV568:merged};
        if(abort.signal.aborted)throw Object.assign(Error('Preference timeout'),{code:'personal-sync/timeout'});
        const response=await request(base+'?updateMask.fieldPaths='+encodedMask+
          '&currentDocument.updateTime='+encodeURIComponent(snapshot.updateTime),
          {method:'PATCH',body:JSON.stringify({fields:values})});
        if(!active())return {skipped:true};
        if(response.ok)return {saved:true};
        // Firestore REST may return HTTP 400 FAILED_PRECONDITION or 409 ABORTED.
        // Never retry permission, quota, network or arbitrary bad requests.
        let retryable=response.status===412||response.status===409;
        if(response.status===400){
          let body;try{body=await response.json();}catch(_){}
          if(!active())return {skipped:true};
          retryable=body?.error?.status==='FAILED_PRECONDITION';
        }
        if(!retryable)throw httpError(response);
      }
      throw conflict();
    }finally{clearTimeout(timer);}
  }
  return Object.freeze({fieldPath,fieldsBookmark,fieldsAppearance,patch});
});
