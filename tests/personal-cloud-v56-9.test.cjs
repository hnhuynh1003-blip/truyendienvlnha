const {test}=require('node:test');
const assert=require('node:assert/strict');
const cloud=require('../js/personal-cloud-v56-9.js');
const sync=require('../js/personal-sync-v56-8.js');
const makeAccount=uid=>({uid,getIdToken:async()=>'mock-private-token'});
function stub(){const requests=[];
 return {requests,fetchFn:async(url,options)=>{
  requests.push({url,options});
  return {ok:true,status:200};
 }};
}
test('V56.9 writes only the current UID bookmark with an exact Firestore updateMask',async()=>{
 const a=stub();
 const outcome=await cloud.patch({account:makeAccount('reader-b'),projectId:'truyendienvl',
  storyId:'world-book.1',bookmark:{chIdx:7,chapterId:'chap-8',scrollTop:221,updatedAt:1720000000000},
  fetchFn:a.fetchFn,isCurrent:uid=>uid==='reader-b'});
 assert.equal(outcome.saved,true);
 assert.equal(a.requests.length,1);
 const {url,options}=a.requests[0];
 const request=new URL(url);
 assert.equal(request.pathname.endsWith('/profiles_v2/reader-b'),true);
 assert.equal(request.searchParams.get('currentDocument.exists'),'true');
 assert.equal(request.searchParams.get('updateMask.fieldPaths'),'readingBookmarksV568.`world-book.1`');
 assert.equal(options.method,'PATCH');
 const data=JSON.parse(options.body).fields;
 assert.deepEqual(Object.keys(data),['readingBookmarksV568']);
 assert.equal(data.readingBookmarksV568.mapValue.fields['world-book.1'].mapValue.fields.chIdx.integerValue,'7');
 assert.equal(JSON.stringify(data).includes('mock-private-token'),false);
 assert.equal(Object.hasOwn(data,'currency'),false);
 assert.equal(Object.hasOwn(data,'inventory'),false);
});
test('V56.9 phone settings write only personal appearance, never uploaded artwork',async()=>{
 const a=stub();
 await cloud.patch({account:makeAccount('reader-b'),projectId:'truyendienvl',
  appearance:{wallpaper:'v36-custom',mode:'personal',font:'be',size:'normal',
   readerFontSize:18,theme:'warm',updatedAt:1700000000000},
  fetchFn:a.fetchFn,isCurrent:()=>true});
 const fields=JSON.parse(a.requests[0].options.body).fields;
 assert.deepEqual(Object.keys(fields),['phoneAppearanceV568']);
 assert.equal(fields.phoneAppearanceV568.mapValue.fields.wallpaper.stringValue,'midnight');
 assert.equal(a.requests[0].url.includes('updateMask.fieldPaths=phoneAppearanceV568'),true);
});
test('V56.9 refuses access to a new user if account switched during token fetch',async()=>{
 let complete;
 const delayed=new Promise(resolve=>{complete=resolve});
 const account={uid:'user-a',getIdToken:async()=>{await delayed;return 'mock-private-token'}};
 let active='user-a',calls=0;
 const promise=cloud.patch({account,projectId:'truyendienvl',storyId:'novel',
  bookmark:{chIdx:1},fetchFn:async()=>{calls++;return {ok:true,status:200}},
  isCurrent:uid=>uid===active});
 active='user-b';complete();
 const result=await promise;
 assert.equal(result.skipped,true);
 assert.equal(calls,0);
});
test('V56.9 403 never claims saved and never grants account permissions',async()=>{
 await assert.rejects(()=>cloud.patch({account:makeAccount('reader-b'),projectId:'truyendienvl',
  appearance:{wallpaper:'sakura'},fetchFn:async()=>({ok:false,status:403}),
  isCurrent:()=>true}),err=>err.code==='permission-denied'&&err.httpStatus===403);
});
test('V56.9 migrates reader local bookmark even when novels[] is not loaded',()=>{
 const uid='reader-B',prefix='dudu-v2:'+encodeURIComponent(uid)+':';
 const kv=new Map([
  [prefix+encodeURIComponent('book-reader')+':bookmark',JSON.stringify({chIdx:5,scrollTop:333})],
  ['dudu-v2:reader-A:'+encodeURIComponent('book-other')+':bookmark',
    JSON.stringify({chIdx:99,scrollTop:999})]
 ]);
 const storage={length:kv.size,key:i=>[...kv.keys()][i],getItem:k=>kv.get(k)||null,
  setItem:(k,v)=>kv.set(k,v)};
 const profile={};
 const key=id=>prefix+encodeURIComponent(id)+':bookmark';
 assert.equal(sync.hydrateBookmarks(storage,profile,[],key),true);
 assert.equal(profile.readingBookmarksV568['book-reader'].chIdx,5);
 assert.equal(profile.readingBookmarksV568['book-other'],undefined);
});
