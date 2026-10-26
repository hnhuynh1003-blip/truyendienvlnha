import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectPngBytes,parseRegistryPng} from '../src/vangioi-png.mjs';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgkjP6DwAB6gFaZRSBGgAAAABJRU5ErkJggg==';
test('G1I shared PNG inspection handles a typed-array subview without hashing unrelated bytes',()=>{
 const raw=Buffer.from(PNG,'base64'),whole=new Uint8Array(raw.length+10);whole.set(raw,5);
 const view=whole.subarray(5,5+raw.length),r=inspectPngBytes(view);
 assert.equal(r.width,1);assert.equal(r.height,1);assert.deepEqual([...r.bytes],[...raw]);
 assert.deepEqual([...parseRegistryPng(PNG).bytes],[...raw]);
});
test('G1I raw inspection refuses non-byte input and disguised active documents',()=>{
 for(const bytes of [null,[],new ArrayBuffer(100),new TextEncoder().encode('<svg onload="x()"/>'),new Uint8Array(1024*1024+1)])
  assert.throws(()=>inspectPngBytes(bytes),/invalid-image/);
});

import {deflateSync} from 'node:zlib';
import {verifyLocalPngRaster} from '../../js/vangioi-local-png.mjs';
function chunk(type,data){
 const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);out.write(type,4);data.copy(out,8);
 let crc=0xffffffff;for(const b of out.subarray(4,-4)){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;
}
function rasterPng(raw,{compressed=false,interlaced=false,width=1,height=1}={}){
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;header[12]=interlaced?1:0;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',compressed?raw:deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
test('G1I preview validates real scanlines, including one-pixel Adam7 empty passes',async()=>{
 for(const interlaced of [false,true]){
  const r=await verifyLocalPngRaster(rasterPng(Buffer.from([0,10,30,50,255]),{interlaced}));assert.equal(r.width,1);
 }
});
test('G1I valid PNG chunk CRC does not bypass zlib, filter or raster-length checks',async()=>{
 for(const bytes of [rasterPng(Buffer.from('not-zlib'),{compressed:true}),rasterPng(Buffer.from([5,10,30,50,255])),
  rasterPng(Buffer.from([0,10,30])),rasterPng(Buffer.from([0,10,30,50,255,0]))]){
  assert.equal(inspectPngBytes(bytes).width,1);await assert.rejects(()=>verifyLocalPngRaster(bytes));
 }
});
test('G1I preview bound can reject a large raster while the server container contract is unchanged',async()=>{
 const bytes=rasterPng(Buffer.from([0,0,0,0,0]),{width:4001,height:4001});
 assert.equal(inspectPngBytes(bytes).width,4001);await assert.rejects(()=>verifyLocalPngRaster(bytes),/preview-limit/);
});
