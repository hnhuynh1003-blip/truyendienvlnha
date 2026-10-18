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
  async function patch({account,projectId,storyId,bookmark,appearance,fetchFn,isCurrent,timeoutMs=10000}){
    if(!account?.uid||typeof account.getIdToken!=='function'||
      typeof fetchFn!=='function'||typeof isCurrent!=='function'||
      !/^[a-zA-Z0-9:-]{1,100}$/.test(projectId||''))throw new Error('Invalid cloud scope');
    if((storyId===undefined)===(appearance===undefined))throw new Error('One field at a time');
    const owner=account.uid;
    if(!isCurrent(owner))return {skipped:true};
    const values=storyId!==undefined
      ?{readingBookmarksV568:{mapValue:{fields:{[storyId]:fieldsBookmark(bookmark)}}}}
      :{phoneAppearanceV568:fieldsAppearance(appearance)};
    const mask=storyId!==undefined?fieldPath(storyId):'phoneAppearanceV568';
    const token=await account.getIdToken();
    if(!isCurrent(owner))return {skipped:true};
    const url='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(projectId)
      +'/databases/(default)/documents/profiles_v2/'+encodeURIComponent(owner)
      +'?updateMask.fieldPaths='+encodeURIComponent(mask)
      +'&currentDocument.exists=true';
    const abort=new AbortController();
    const timer=setTimeout(()=>abort.abort(),timeoutMs);
    try{
      const response=await fetchFn(url,{
        method:'PATCH',headers:{Authorization:'Bearer '+token,
          'Content-Type':'application/json'},
        body:JSON.stringify({fields:values}),cache:'no-store',signal:abort.signal
      });
      if(!isCurrent(owner))return {skipped:true};
      if(!response.ok) {
        const error=new Error('Firestore profile preference PATCH HTTP '+response.status);
        error.code=response.status===403?'permission-denied':'personal-sync/http';
        error.httpStatus=response.status;
        throw error;
      }
      return {saved:true};
    }finally{clearTimeout(timer);}
  }
  return Object.freeze({fieldPath,fieldsBookmark,fieldsAppearance,patch});
});
