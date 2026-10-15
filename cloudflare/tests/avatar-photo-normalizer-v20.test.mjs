import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparePrivateAvatarVariant} from '../src/avatar-photo-normalizer-v20.mjs';
const png=(side=256)=>{
 const b=new Uint8Array(33);
 b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
 const dim=(n,i)=>{
   b[i]=(n>>>24)&255;b[i+1]=(n>>>16)&255;b[i+2]=(n>>>8)&255;b[i+3]=n&255;
 };
 dim(side,16);dim(side,20);b[24]=8;b[25]=6;return b;
};
const webp=(width=256,height=256)=>{
 const b=new Uint8Array(30);
 b.set([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0,0,0,0,0]);
 const w=width-1,h=height-1;
 b.set([w&255,(w>>>8)&255,(w>>>16)&255,
   h&255,(h>>>8)&255,(h>>>16)&255],24);
 return b;
};
const output=()=>({bytes:webp(),mime:'image/webp',fullyDecoded:true,
  metadataStripped:true,animated:false});
const trusted=()=>({quarantinedBytes:png(),originalMime:'image/png',
 uid:'readerUid',assetId:'asset-001',
 decodeAndTranscode:async()=>({...output(),mime:'image/webp'}),
 moderate:async()=>({approved:true,reviewerType:'trusted-server'})});
test('output only private normalized variants with a valid compressed signature',async()=>{
 const c=trusted();
 // A trusted codec must produce matching compressed bytes and MIME.
 const invalid={...c,decodeAndTranscode:async()=>({...output(),mime:'image/jpeg'})};
 assert.deepEqual(await preparePrivateAvatarVariant(invalid),
   {ok:false,code:'unsafe-output'});
 const result=await preparePrivateAvatarVariant(c);
 assert.equal(result.ok,true);
 assert.equal(result.publishable,false);
 assert.equal(result.mime,'image/webp');
 assert.equal(result.state,'PRIVATE_VARIANT_READY');
 assert.equal(Object.hasOwn(result,'url'),false);
});
test('normalizer refuses missing decoder/moderator, malformed or oversized originals',async()=>{
 for(const change of [
  {decodeAndTranscode:null},{moderate:null},
  {quarantinedBytes:new Uint8Array(10)},{originalMime:'image/svg+xml'}
 ]){
  const result=await preparePrivateAvatarVariant({...trusted(),...change});
  assert.equal(result.ok,false);
 }
});
test('output cannot bypass metadata removal, animation checks or moderation',async()=>{
 const base=trusted();
 for(const changed of [
   {...output(),metadataStripped:false},
   {...output(),fullyDecoded:false},
   {...output(),animated:true},
   {...output(),mime:'image/svg+xml'},
   {...output(),bytes:png(2048)},
   {...output(),bytes:new Uint8Array(33)}
 ]){
   const result=await preparePrivateAvatarVariant({...base,
     decodeAndTranscode:async()=>changed});
   assert.deepEqual(result,{ok:false,code:'unsafe-output'});
 }
 const unsafe=await preparePrivateAvatarVariant({...base,
   decodeAndTranscode:async()=>output(),
   moderate:async()=>({approved:true,reviewerType:'browser'})});
 assert.deepEqual(unsafe,{ok:false,code:'moderation-rejected'});
 const rejected=await preparePrivateAvatarVariant({...base,
   decodeAndTranscode:async()=>output(),
   moderate:async()=>({approved:false,reviewerType:'trusted-server'})});
 assert.deepEqual(rejected,{ok:false,code:'moderation-rejected'});
});
test('a trusted image processor must explicitly request clipping and EXIF removal',async()=>{
 const input=trusted();
 let argumentsSeen;
 input.decodeAndTranscode=async(x)=>{argumentsSeen=x;return output();};
 let moderationSeen;
 input.moderate=async(x)=>{moderationSeen=x;return {approved:true,reviewerType:'trusted-server'};};
 const done=await preparePrivateAvatarVariant(input);
 assert.equal(done.ok,true,'Trusted codec and server moderation approve private variant');
 assert.equal(done.publishable,false);
 assert.deepEqual(argumentsSeen.maxSide,512);
 assert.equal(argumentsSeen.stripMetadata,true);
 assert.equal(argumentsSeen.forceSquare,true);
 assert.equal(argumentsSeen.allowAnimation,false);
 assert.equal(moderationSeen.mime,'image/webp');
 assert.equal(moderationSeen.ownerUid,'readerUid');
});
test('new finalizer not wired to any Worker route, no public image URLs',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const index=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 const config=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 const source=fs.readFileSync(path.join(root,'src/avatar-photo-normalizer-v20.mjs'),'utf8');
 assert.doesNotMatch(index,/avatar-photo-normalizer-v20|preparePrivateAvatarVariant/);
 assert.match(config,/AVATAR_R2_ENABLED = "false"/);
 assert.doesNotMatch(source,/bucket\.put\(|publicUrl|setAvatar\(/);
});
