import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareAndStorePrivateVariant,privateVariantKey} from '../src/avatar-photo-finalize-v23.mjs';
import {deleteQuarantinedPhoto} from '../src/avatar-r2-quarantine.mjs';
const uid='firebase_owner_1',id='c7503b6e-506e-49e1-b7ba-6a92d98b177e';
const originalKey='drafts/players/'+uid+'/'+id+'.bin';
const png=()=>{
 const b=new Uint8Array(33);
 b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,
 0,0,1,0,0,0,1,0,8,6]);return b;
};
const webp=()=>{
 const b=new Uint8Array(30);
 b.set([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0,0,0,0,0]);
 const w=255,h=255;
 b.set([w&255,(w>>>8)&255,(w>>>16)&255,
    h&255,(h>>>8)&255,(h>>>16)&255],24);
 return b;
};
function fixture(){
 const objects=new Map([[originalKey,{bytes:png(),metadata:{format:'png'}}]]);
 let format=null,removed=false;
 const writes=[];
 const bucket={
  async get(key){
   const item=objects.get(key);
   return item?{size:item.bytes.length,
     customMetadata:item.metadata,
     arrayBuffer:async()=>item.bytes.slice().buffer}:null;
  },
  async put(key,bytes,options){
   writes.push({key,options});
   objects.set(key,{bytes:new Uint8Array(bytes),metadata:options.customMetadata});
  },
  async delete(key){objects.delete(key);}
 };
 const store={
  async ownPhotoDraft(){return {owned:!removed,variantFormat:format};},
  async markPrivateVariant(_,next){if(format)return {ok:false,code:'already-processed'};format=next;return {ok:true};},
  async removePhotoDraft(){removed=true;return {ok:true};}
 };
 const trusted={
  decodeAndTranscode:async()=>({
   bytes:webp(),mime:'image/webp',fullyDecoded:true,
   metadataStripped:true,animated:false
  }),
  moderate:async()=>({approved:true,reviewerType:'trusted-server'})
 };
 return {objects,writes,bucket,store,trusted};
}
test('V23 sanitizes only through independently injected decoder/moderation and keeps R2 private',async()=>{
 const f=fixture();const done=await prepareAndStorePrivateVariant({
  uid,assetId:id,bucket:f.bucket,store:f.store,now:1792000000000,...f.trusted
 });
 assert.deepEqual(done,{ok:true,assetId:id,status:'PRIVATE_APPROVED',
  publishable:false,bytes:30});
 const key=privateVariantKey(uid,id,'webp');
 assert.equal(key,'private/players/'+uid+'/'+id+'.webp');
 assert.equal(f.objects.size,2);
 assert.ok(f.objects.has(key));
 assert.equal(f.writes[0].options.httpMetadata.contentType,'application/octet-stream');
 assert.equal(f.writes[0].options.customMetadata.status,'PRIVATE_APPROVED');
 assert.ok(!Object.hasOwn(done,'url'));
 assert.equal((await prepareAndStorePrivateVariant({
  uid,assetId:id,bucket:f.bucket,store:f.store,now:1792000000001,...f.trusted
 })).code,'already-processed');
});
test('V23 deletes both quarantine original and processed private variant within owner scope',async()=>{
 const f=fixture();
 await prepareAndStorePrivateVariant({uid,assetId:id,bucket:f.bucket,store:f.store,
   now:1792000000000,...f.trusted});
 const done=await deleteQuarantinedPhoto({uid,assetId:id,bucket:f.bucket,store:f.store});
 assert.deepEqual(done,{ok:true});
 assert.equal(f.objects.size,0);
 assert.equal((await deleteQuarantinedPhoto({
   uid:'attacker',assetId:id,bucket:f.bucket,
   store:{ownPhotoDraft:async()=>({owned:false})}
 })).code,'not-found');
});
test('invalid owner, no quota slot, no decoder and rejected moderation never publish',async()=>{
 const f=fixture();
 const base={uid,assetId:id,bucket:f.bucket,store:f.store,now:1792000000000,...f.trusted};
 for(const change of [
  {uid:'../escape'},{assetId:'../../other'},{decodeAndTranscode:null},
  {moderate:async()=>({approved:false,reviewerType:'trusted-server'})}
 ]){
  const result=await prepareAndStorePrivateVariant({...base,...change});
  assert.equal(result.ok,false,JSON.stringify(change));
 }
 assert.equal(f.objects.size,1);
 assert.equal(f.writes.length,0);
 assert.equal(privateVariantKey('attacker/..',id,'webp'),null);
 assert.equal(privateVariantKey(uid,'not-uuid','webp'),null);
});
test('V23 source is never imported into a live upload route until vetted services exist',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const w=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 const config=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 const store=fs.readFileSync(path.join(root,'src/player-appearance.mjs'),'utf8');
 assert.doesNotMatch(w,/prepareAndStorePrivateVariant|avatar-photo-finalize-v23/);
 assert.match(w,/\/v1\/avatar-drafts\/mine/);
 assert.match(w,/listPrivatePhotoDrafts\(\)/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS photo_variants/);
 assert.match(store,/DELETE FROM photo_variants WHERE asset_id/);
 assert.match(config,/AVATAR_R2_ENABLED = "false"/);
 assert.doesNotMatch(config,/\[\[r2_buckets\]\]/);
});
