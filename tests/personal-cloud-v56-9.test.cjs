const {test}=require('node:test');
const assert=require('node:assert/strict');
const cloud=require('../js/personal-cloud-v56-9.js');
const sync=require('../js/personal-sync-v56-8.js');
const makeAccount=uid=>({uid,getIdToken:async()=>'mock-private-token'});
function stub(){const requests=[];
 return {requests,fetchFn:async(url,options)=>{
  requests.push({url,options});
  return {ok:true,status:200,json:async()=>({updateTime:'2026-11-26T00:00:00.000000Z',fields:{}})};
 }};
}
test('V56.9 writes only the current UID bookmark with an exact Firestore updateMask',async()=>{
 const a=stub();
 const outcome=await cloud.patch({account:makeAccount('reader-b'),projectId:'truyendienvl',
  storyId:'world-book.1',bookmark:{chIdx:7,chapterId:'chap-8',scrollTop:221,updatedAt:1720000000000},
  fetchFn:a.fetchFn,isCurrent:uid=>uid==='reader-b'});
 assert.equal(outcome.saved,true);
 assert.equal(a.requests.length,2);
 assert.equal(a.requests[0].options.method,'GET');
 assert.equal(new URL(a.requests[0].url).searchParams.get('mask.fieldPaths'),'readingBookmarksV568.`world-book.1`');
 const {url,options}=a.requests[1];
 const request=new URL(url);
 assert.equal(request.pathname.endsWith('/profiles_v2/reader-b'),true);
 assert.equal(request.searchParams.get('currentDocument.exists'),null);
 assert.equal(request.searchParams.get('currentDocument.updateTime'),'2026-11-26T00:00:00.000000Z');
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
 assert.equal(a.requests[0].options.method,'GET');
 const fields=JSON.parse(a.requests[1].options.body).fields;
 assert.deepEqual(Object.keys(fields),['phoneAppearanceV568']);
 assert.equal(fields.phoneAppearanceV568.mapValue.fields.wallpaper.stringValue,'midnight');
 assert.equal(a.requests[1].url.includes('updateMask.fieldPaths=phoneAppearanceV568'),true);
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

const updateTime=n=>'2026-11-26T00:00:00.'+String(n).padStart(6,'0')+'Z';
const response=(status,body={})=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(body)});
const bookmark=(updatedAt,chIdx=1)=>({updatedAt,chIdx,chapterId:'chapter-'+chIdx,scrollTop:0});
function model(initial={}){
 let fields=structuredClone(initial),version=1,requests=[];
 const get=()=>structuredClone(fields);
 const fetchFn=async(url,opts)=>{
  const u=new URL(url);requests.push({url,method:opts.method});
  if(opts.method==='GET')return response(200,{updateTime:updateTime(version),fields:get()});
  assert.equal(opts.method,'PATCH');
  if(u.searchParams.get('currentDocument.updateTime')!==updateTime(version))return response(400,{error:{status:'FAILED_PRECONDITION'}});
  const data=JSON.parse(opts.body).fields;
  if(data.phoneAppearanceV568)fields.phoneAppearanceV568=data.phoneAppearanceV568;
  else{
   fields.readingBookmarksV568??={mapValue:{fields:{}}};
   Object.assign(fields.readingBookmarksV568.mapValue.fields,data.readingBookmarksV568.mapValue.fields);
  }
  version++;return response(200);
 };
 return {fetchFn,get,requests,bump:()=>version++};
}
const opts={account:makeAccount('reader-a'),projectId:'truyendienvl',isCurrent:()=>true};
test('CP013B A-03 delayed old bookmark cannot overwrite newer server preference',async()=>{
 const m=model(),storyId='novel';
 let release,entered;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const old=cloud.patch({...opts,storyId,bookmark:bookmark(1000,2),fetchFn:async(url,init)=>{
  if(init.method==='PATCH'){entered();await gate;}
  return m.fetchFn(url,init);
 }});
 await started;
 assert.equal((await cloud.patch({...opts,storyId,bookmark:bookmark(2000,3),fetchFn:m.fetchFn})).saved,true);
 release();assert.deepEqual(await old,{saved:false,superseded:true});
 const value=m.get().readingBookmarksV568.mapValue.fields.novel.mapValue.fields;
 assert.equal(value.updatedAt.integerValue,'2000');assert.equal(value.chIdx.integerValue,'3');
 assert.equal(m.requests.filter(x=>x.method==='PATCH').length,2);
});
test('CP013B A-03 old appearance and equal timestamps are superseded without patch',async()=>{
 const m=model({phoneAppearanceV568:cloud.fieldsAppearance({theme:'oled',updatedAt:2000})});
 for(const updatedAt of [1000,2000]){
  assert.deepEqual(await cloud.patch({...opts,appearance:{theme:'warm',updatedAt},fetchFn:m.fetchFn}),{saved:false,superseded:true});
 }
 assert.equal(m.requests.length,2);assert.ok(m.requests.every(x=>x.method==='GET'));
 assert.equal(m.get().phoneAppearanceV568.mapValue.fields.theme.stringValue,'oled');
});
test('CP013B A-03 unrelated profile conflict retries and preserves sibling and unknown fields',async()=>{
 const legacy=cloud.fieldsBookmark(bookmark(1000));legacy.mapValue.fields.extra={stringValue:'keep'};
 const sibling=cloud.fieldsBookmark(bookmark(3000,7));
 const m=model({readingBookmarksV568:{mapValue:{fields:{novel:legacy,other:sibling}}},currency:{integerValue:'42'}});
 let conflict=true;
 const result=await cloud.patch({...opts,storyId:'novel',bookmark:bookmark(2000,3),fetchFn:(url,init)=>{
  if(init.method==='PATCH'&&conflict){conflict=false;m.bump();}
  return m.fetchFn(url,init);
 }});
 assert.equal(result.saved,true);
 assert.equal(m.requests.length,4);
 assert.deepEqual(m.get().readingBookmarksV568.mapValue.fields.other,sibling);
 assert.equal(m.get().readingBookmarksV568.mapValue.fields.novel.mapValue.fields.extra.stringValue,'keep');
 assert.equal(m.get().currency.integerValue,'42');
});
test('CP013B A-03 conflict retries are bounded and arbitrary 400/403/429 do not retry',async()=>{
 for(const [status,body,expected] of [[412,{},6],[400,{error:{status:'FAILED_PRECONDITION'}},6],[409,{},6],[400,{error:{status:'INVALID_ARGUMENT'}},2],[403,{},2],[429,{},2]]){
  let calls=0;
  await assert.rejects(cloud.patch({...opts,storyId:'novel',bookmark:bookmark(1000),fetchFn:async(url,init)=>{
   calls++;return init.method==='GET'?response(200,{updateTime:updateTime(1),fields:{}}):response(status,body);
  }}),e=>expected===6?e.code==='personal-sync/conflict':e.httpStatus===status);
  assert.equal(calls,expected);
 }
});
test('CP013B A-03 malformed remote or missing version fails closed without blind patch',async()=>{
 for(const doc of [{fields:{}},{updateTime:updateTime(1),fields:{readingBookmarksV568:{stringValue:'invalid'}}},
 {updateTime:updateTime(1),fields:{readingBookmarksV568:{mapValue:{fields:{novel:{mapValue:{fields:{updatedAt:{stringValue:'bad'}}}}}}}}}]){
  let calls=0;await assert.rejects(cloud.patch({...opts,storyId:'novel',bookmark:bookmark(1000),fetchFn:async()=>{calls++;return response(200,doc);}}));
  assert.equal(calls,1);
 }
});
test('CP013B A-03 session change during GET or conflict prevents further writes',async()=>{
 for(const stopAt of ['GET','PATCH']){
  let active=true,calls=0;
  const result=await cloud.patch({...opts,storyId:'novel',bookmark:bookmark(1000),isCurrent:()=>active,fetchFn:async(url,init)=>{
   calls++;if(init.method===stopAt)active=false;
   return init.method==='GET'?response(200,{updateTime:updateTime(1),fields:{}}):response(412);
  }});
  assert.deepEqual(result,{skipped:true});assert.equal(calls,stopAt==='GET'?1:2);
 }
});
test('CP013B A-03 legacy timestamp zero can initialize absent target but cannot replace existing tie',async()=>{
 const m=model();
 assert.equal((await cloud.patch({...opts,storyId:'novel',bookmark:{chIdx:1},fetchFn:m.fetchFn})).saved,true);
 assert.deepEqual(await cloud.patch({...opts,storyId:'novel',bookmark:{chIdx:2},fetchFn:m.fetchFn}),{saved:false,superseded:true});
 assert.equal(m.get().readingBookmarksV568.mapValue.fields.novel.mapValue.fields.chIdx.integerValue,'1');
});
