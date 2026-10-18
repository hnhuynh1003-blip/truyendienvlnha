const {test}=require('node:test');
const assert=require('node:assert/strict');
const api=require('../js/firestore-profile-fallback-v56-7.js');

test('V56.7 decodes nested Firestore documents without dropping old V55 data',()=>{
 const fields={
  name:{stringValue:'Huỳnh Huỳnh'},
  currency:{integerValue:'345'},
  level:{integerValue:'12'},
  active:{booleanValue:true},
  inventory:{arrayValue:{values:[
   {mapValue:{fields:{
    id:{stringValue:'f1'},
    count:{integerValue:'2'}
   }}}
  ]}},
  storyStates:{mapValue:{fields:{
   'story-1':{mapValue:{fields:{
    chapter:{integerValue:'9'},collectedCharacters:{mapValue:{fields:{}}}
   }}}
  }}},
  readRewards:{mapValue:{fields:{}}},
  dailyReadLog:{mapValue:{fields:{day:{stringValue:'2026-10-18'},chapters:{arrayValue:{}}}}},
  date:{timestampValue:'2026-10-18T00:00:00Z'},
  nullable:{nullValue:null}
 };
 const result=api.decodeDocument({name:'projects/example/documents/profiles_v2/u',fields});
 assert.equal(result.name,'Huỳnh Huỳnh');
 assert.equal(result.currency,345);
 assert.equal(result.level,12);
 assert.equal(result.active,true);
 assert.deepEqual(result.inventory,[{id:'f1',count:2}]);
 assert.equal(result.storyStates['story-1'].chapter,9);
 assert.deepEqual(result.storyStates['story-1'].collectedCharacters,{});
 assert.deepEqual(result.readRewards,{});
 assert.deepEqual(result.dailyReadLog.chapters,[]);
 assert.equal(result.date,'2026-10-18T00:00:00Z');
 assert.equal(result.nullable,null);
});

test('V56.7 GET scope always uses the authenticated UID, not profile names', async()=>{
 const calls=[];
 const response={status:200,json:async()=>({
  name:'projects/truyendienvl/databases/(default)/documents/profiles_v2/user-a',
  fields:{currency:{integerValue:'99'}}
 })};
 const account={uid:'user-a',getIdToken:async()=> 'test-token-only'};
 const result=await api.read(account,'truyendienvl',async(url,options)=>{
  calls.push({url,options});return response;
 });
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/\/profiles_v2\/user-a$/);
 assert.equal(calls[0].options.method,'GET');
 assert.equal(result.exists,true);
 assert.equal(result.data().currency,99);
 assert.equal(JSON.stringify(result).includes('test-token-only'),false);
});

test('V56.7 REST missing document is non-destructive, HTTP 403 remains denied',async()=>{
 const account={uid:'user-b',getIdToken:async()=> 'mock'};
 const absent=await api.read(account,'truyendienvl',async()=>({status:404}));
 assert.equal(absent.exists,false);
 await assert.rejects(()=>api.read(account,'truyendienvl',async()=>({status:403})),
  error=>error.code==='permission-denied'&&error.httpStatus===403);
});

test('V56.7 invalid REST response is rejected rather than treating it as an empty profile',()=>{
 assert.throws(()=>api.decodeDocument({fields:{name:{stringValue:'ok'}},fake:1}).nonexistent.foo);
 assert.throws(()=>api.decodeDocument({fake:true}),error=>error.code==='profile/rest-invalid');
 assert.deepEqual(api.decodeDocument({name:'document-name'}),{});
});
