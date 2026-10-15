import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectImageHeader,privateObjectKey,IMAGE_LIMITS} from '../src/avatar-image-policy.mjs';

function png(width=256,height=256){
 const b=new Uint8Array(33);
 b.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
 b[16]=(width>>>24)&255;b[17]=(width>>>16)&255;b[18]=(width>>>8)&255;b[19]=width&255;
 b[20]=(height>>>24)&255;b[21]=(height>>>16)&255;b[22]=(height>>>8)&255;b[23]=height&255;
 b[24]=8;b[25]=6;return b;
}
function jpeg(width=256,height=256){
 const b=new Uint8Array(42);
 b.set([255,216,255,192,0,17,8,(height>>>8)&255,height&255,
   (width>>>8)&255,width&255,3,1,17,0,2,17,0,3,17,0,255,217]);
 return b;
}
function webp(width=256,height=256){
 const b=new Uint8Array(30);
 b.set([82,73,70,70,22,0,0,0,87,69,66,80,86,80,56,88,10,0,0,0,0,0,0,0]);
 const w=width-1,h=height-1;
 b.set([w&255,(w>>>8)&255,(w>>>16)&255,
        h&255,(h>>>8)&255,(h>>>16)&255],24);
 return b;
}
test('R2 policy accepts only header-consistent JPEG/PNG/WebP preflight',()=>{
 for(const [mime,data] of [
   ['image/png',png()],['image/jpeg',jpeg()],['image/webp',webp()]
 ]){
  const result=inspectImageHeader(data,mime);
  assert.equal(result.ok,true,mime);
  assert.equal(result.width,256);
  assert.equal(result.height,256);
  assert.equal(result.publishable,false);
  assert.equal(result.mustDecodeAndTranscode,true);
 }
 assert.equal(inspectImageHeader(png(),'image/jpeg').ok,false);
 assert.equal(inspectImageHeader(jpeg(),'image/png').ok,false);
 assert.equal(inspectImageHeader(webp(),'image/png').ok,false);
 assert.equal(inspectImageHeader(png(),'image/svg+xml').ok,false);
 assert.equal(inspectImageHeader('png','image/png').ok,false);
});
test('image preflight fails closed on size, dimensions and corrupted header',()=>{
 for(const [bytes,mime] of [
   [png(5000,100),'image/png'],
   [png(0,256),'image/png'],
   [png(4096,4096),'image/png'],
   [jpeg(1,1),'image/jpeg'],
   [webp(0,2),'image/webp'],
   [new Uint8Array(IMAGE_LIMITS.maxBytes+1),'image/jpeg']
 ])assert.equal(inspectImageHeader(bytes,mime).ok,false);
 const badWebP=webp();badWebP[4]=0;
 assert.equal(inspectImageHeader(badWebP,'image/webp').ok,false);
 const badJpeg=jpeg();badJpeg[0]=0;
 assert.equal(inspectImageHeader(badJpeg,'image/jpeg').ok,false);
});
test('server generates private R2 keys from verified UID and opaque UUID',()=>{
 const uuid='c7503b6e-506e-49e1-b7ba-6a92d98b177e';
 assert.equal(privateObjectKey('firebaseUID_123',uuid),
  'drafts/players/firebaseUID_123/'+uuid+'.bin');
 assert.equal(privateObjectKey('../victim',uuid),null);
 assert.equal(privateObjectKey('reader','../../photo'),null);
 assert.equal(privateObjectKey('reader','not-a-uuid'),null);
});
test('R2 upload is not enabled, no storage bucket bound yet',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');
 const root=path.resolve(import.meta.dirname,'..');
 const config=fs.readFileSync(path.join(root,'wrangler.toml'),'utf8');
 const worker=fs.readFileSync(path.join(root,'src/index.mjs'),'utf8');
 assert.match(config,/AVATAR_R2_ENABLED = "false"/);
 assert.doesNotMatch(config,/\[\[r2_buckets\]\]/);
 assert.doesNotMatch(worker,/R2\.put\(|\/v1\/player-avatar\/upload/);
});
