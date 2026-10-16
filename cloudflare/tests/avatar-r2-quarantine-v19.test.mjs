import {test} from 'node:test';
import assert from 'node:assert/strict';
import {putQuarantinedPhoto,deleteQuarantinedPhoto}
 from '../src/avatar-r2-quarantine.mjs';
const UID='firebase-user-17';
const IDS=['c7503b6e-506e-49e1-b7ba-6a92d98b177e',
'c7503b6e-506e-49e1-b7ba-6a92d98b177f',
'c7503b6e-506e-49e1-b7ba-6a92d98b1780',
'c7503b6e-506e-49e1-b7ba-6a92d98b1781'];
function png(){
 const b=new Uint8Array(33);
 b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,1,0,
   0,0,1,0,8,6]);return b;
}
function fixture(){
 const storage=new Map(),entries=new Map(),calls=[];
 const bucket={
   async put(key,bytes,options){calls.push(['put',key,options]);storage.set(key,bytes);},
   async delete(key){calls.push(['delete',key]);storage.delete(key);}
 };
 const store={
   async reservePhotoDraft(id){
     if(entries.size>=3)return {ok:false,code:'photo-quota'};
     entries.set(id,'PENDING');return {ok:true};
   },
   async finalizePhotoDraft(id){
     if(entries.get(id)!=='PENDING')return {ok:false};
     entries.set(id,'QUARANTINED');return {ok:true};
   },
   async abandonPhotoDraft(id){entries.delete(id);return {ok:true};},
   async ownPhotoDraft(id){return {owned:entries.get(id)==='QUARANTINED'};},
   async removePhotoDraft(id){entries.delete(id);return {ok:true};}
 };
 return {bucket,store,storage,entries,calls};
}
const opts=(x,id=IDS[0])=>({
 uid:UID,bytes:png(),mime:'image/png',now:1792000000000,uuid:id,
 bucket:x.bucket,store:x.store
});
test('R2 quarantines originals under derived private UID namespace only',async()=>{
 const f=fixture();
 const result=await putQuarantinedPhoto(opts(f));
 assert.deepEqual(result,{ok:true,assetId:IDS[0],status:'QUARANTINED',publishable:false});
 assert.equal(f.storage.size,1);
 const [verb,key,metadata]=f.calls[0];
 assert.equal(verb,'put');
 assert.equal(key,'drafts/players/'+UID+'/'+IDS[0]+'.bin');
 assert.equal(metadata.httpMetadata.contentType,'application/octet-stream');
 assert.equal(metadata.customMetadata.state,'QUARANTINED');
 assert.equal(Object.hasOwn(result,'url'),false);
 assert.equal(f.entries.get(IDS[0]),'QUARANTINED');
});
test('quota of three drafts, delete only owned UID namespace, no public GET',async()=>{
 const f=fixture();
 for(const id of IDS.slice(0,3))assert.equal((await putQuarantinedPhoto(opts(f,id))).ok,true);
 assert.deepEqual(await putQuarantinedPhoto(opts(f,IDS[3])),
   {ok:false,code:'photo-quota'});
 const wrong=await deleteQuarantinedPhoto({
   uid:'anotherUID',assetId:IDS[0],bucket:f.bucket,
   store:{ownPhotoDraft:async()=>({owned:false})}
 });
 assert.deepEqual(wrong,{ok:false,code:'not-found'});
 assert.equal(f.storage.size,3);
 assert.equal((await deleteQuarantinedPhoto({
   uid:UID,assetId:IDS[0],bucket:f.bucket,store:f.store
 })).ok,true);
 assert.equal(f.storage.size,2);
 assert.equal((await putQuarantinedPhoto(opts(f,IDS[3]))).ok,true);
});
test('bad formats, object IDs and broken storage never produce publishable image',async()=>{
 const f=fixture();
 const fake=opts(f);
 assert.equal((await putQuarantinedPhoto({...fake,mime:'image/svg+xml'})).ok,false);
 assert.equal((await putQuarantinedPhoto({...fake,uuid:'../../victim'})).ok,false);
 assert.equal((await putQuarantinedPhoto({...fake,uid:'../victim'})).ok,false);
 assert.equal(f.calls.length,0);
 const noStorage=fixture();
 noStorage.bucket.put=async()=>{throw Error('R2 down');};
 assert.deepEqual(await putQuarantinedPhoto(opts(noStorage)),
   {ok:false,code:'upload-unavailable'});
 assert.equal(noStorage.entries.size,0);
});
test('R2 is not bound and upload routes stay disabled',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const worker=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 const wrangler=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 assert.match(wrangler,/AVATAR_R2_ENABLED = "false"/);
 assert.doesNotMatch(wrangler,/\[\[r2_buckets\]\]/);
 assert.match(worker,/env\.AVATAR_R2_ENABLED!=='true'/);
 assert.match(worker,/verifyFirebaseIdToken\(req,env\.PROJECT_ID\)/);
 assert.match(worker,/putQuarantinedPhoto\(/);
 assert.match(worker,/deleteQuarantinedPhoto\(/);
 assert.match(worker,/getByName\('player-avatar-'\+identity\.uid\)/);
 assert.doesNotMatch(worker,/\.get\(.*assetId|publicUrl|signedUploadUrl/);
});
