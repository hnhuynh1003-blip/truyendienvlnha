/* V44.8: execute the actual inline Sandbox save function in a tiny VM.
 * A storage quota failure must not advance the discoverable world collection.
 * No website, Firebase service, or account data is accessed.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function saveCurrentAccount() {');
const end=html.indexOf('function openAuthModal()',start);
assert.ok(start>=0&&end>start,'inline save function exists on main');
const source=html.slice(start,end).trim();
function setup(throws=false,withCollection=true,renderThrows=false){
 const profile={currency:80,inventory:[{instanceId:'new-item'}],
  collectionV441:{found:['old-item']},quests:[],exp:0,level:1};
 const writes=[],phone=[];
 const collection={record:(previous,inventory)=>({
  found:[...previous.found,...inventory.map(x=>x.instanceId)]
 })};
 const ctx={IS_SANDBOX_MODE:true,currentUsername:'sandbox-uid',
  userProfile:profile,window:{DuduWorldCollectionV441:withCollection?collection:null},
  DuduWorldCollectionV441:collection,DEFAULT_SYSTEM_QUESTS:[],
  scopedLocalKey:key=>'sandbox-uid:'+key,
  updatePhoneUI:()=>{
   if(renderThrows)throw Error('render crash after persisted commit');
   phone.push(true);
  },
  console:{warn:()=>{}},
  localStorage:{setItem:(key,value)=>{
   if(throws)throw Error('QuotaExceededError');
   writes.push({key,value,collectionAtWrite:profile.collectionV441.found.slice()});
  }}};
 vm.createContext(ctx);
 const save=vm.runInContext('('+source+')',ctx);
 return {save,profile,writes,phone};
}
test('V44.8: failed storage write does not leak new discovered items to memory',()=>{
 const {save,profile,writes,phone}=setup(true);
 assert.throws(()=>save(),/QuotaExceededError/);
 assert.deepEqual(profile.collectionV441,{found:['old-item']});
 assert.equal(writes.length,0);
 assert.equal(phone.length,0);
});
test('V44.8: successful write stores atomic inventory/collection snapshot',()=>{
 const {save,profile,writes,phone}=setup();
 save();
 assert.equal(writes.length,1);
 assert.equal(writes[0].key,'sandbox-uid:profile');
 assert.deepEqual(writes[0].collectionAtWrite,['old-item'],
  'the live collection must only change AFTER localStorage succeeded');
 const saved=JSON.parse(writes[0].value);
 assert.deepEqual(saved.collectionV441.found,['old-item','new-item']);
 assert.equal(saved.inventory[0].instanceId,'new-item');
 assert.deepEqual(profile.collectionV441.found,['old-item','new-item']);
 assert.equal(phone.length,1);
});
test('V44.8: no world collection module retains original profile behavior',()=>{
 const {save,profile,writes}=setup(false,false);
 save();
 assert.equal(writes.length,1);
 assert.deepEqual(profile.collectionV441,{found:['old-item']});
});

test('V44.9: a UI refresh exception does not roll back an already committed profile',()=>{
 const {save,profile,writes,phone}=setup(false,true,true);
 assert.doesNotThrow(()=>save());
 assert.equal(writes.length,1,'disk commit must survive a Phone render error');
 assert.deepEqual(profile.collectionV441.found,['old-item','new-item']);
 assert.equal(phone.length,0,'mocked UI failed as requested');
});
