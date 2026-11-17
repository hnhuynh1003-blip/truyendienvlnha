'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.route('http://localhost:38412/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Offline EPUB fixture</title>'}));
  await page.goto('http://localhost:38412/');
  await page.addScriptTag({path:path.join(root,'js','library-epub-r2-manifest-l6p2a.js')});
  await page.addScriptTag({path:path.join(root,'js','library-epub-assets-l6p2c2.js')});
  const data=await page.evaluate(async()=>{
   const enc=new TextEncoder();
   const png=Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3]);
   const jpeg=Uint8Array.from([255,216,255,224,0,2,9]);
   const gif=Uint8Array.from([71,73,70,56,57,97,1,2,3]);
   const container='<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/package.opf"/></rootfiles></container>';
   const opf='<package xmlns="http://www.idpf.org/2007/opf"><metadata><meta name="cover" content="cover"/></metadata><manifest><item id="chapter1" href="chap1.xhtml" media-type="application/xhtml+xml"/><item id="pic" href="images/bi%20mat.png" media-type="image/png"/><item id="cover" href="../images/cover.jpg" media-type="image/jpeg"/><item id="unused" href="images/extra.gif" media-type="image/gif"/></manifest><spine><itemref idref="chapter1"/></spine></package>';
   const xhtml='<!doctype html><html><body><h2>Chương 1</h2><p>Tu vi <em>tăng</em>.<img src="images/bi%20mat.png" alt="Ảnh pháp bảo"> Sau ảnh.</p><p>Giữ ảnh bìa<img src="../images/cover.jpg"/> và kết thúc.</p></body></html>';
   const rawEntries={
    'META-INF/':{dir:true,content:''},'META-INF/container.xml':{content:container},
    'OPS/':{dir:true,content:''},'OPS/package.opf':{content:opf},'OPS/chap1.xhtml':{content:xhtml},
    'OPS/images/bi mat.png':{content:png},'images/cover.jpg':{content:jpeg},
    'OPS/images/extra.gif':{content:gif}
   };
   const fileEntry=(f)=>({dir:!!f.dir,_data:{uncompressedSize:typeof f.content==='string'?enc.encode(f.content).length:f.content.length},
    async async(type){if(type==='string')return f.content;
      if(type==='uint8array')return typeof f.content==='string'?enc.encode(f.content):f.content;
      throw Error('unsupported test async type');}});
   const zip={files:Object.fromEntries(Object.entries(rawEntries).map(([k,v])=>[k,fileEntry(v)])),file(p){return this.files[p]||null;}};
   const lib={async loadAsync(input,opts){if(!opts.checkCRC32)throw Error('CRC must be required');return zip;}};
   const mockFile=new File([Uint8Array.from([80,75,3,4,1,2,3,4,5])],'tac-pham.epub',{type:'application/epub+zip'});
   const parsed={chapters:[{sourcePath:'OPS/chap1.xhtml',title:'Chương 1',content:'Chương 1\n\nTu vi tăng. Sau ảnh.\n\nGiữ ảnh bìa và kết thúc.'}]};
   const assets=DuduEpubAssetsL6P2C2;
   const check=(...args)=>assets.extract(...args);
   const opts={zipLib:lib,Parser:DOMParser,cryptoApi:crypto};
   const out=await check(mockFile,parsed,opts);
   DuduEpubR2ManifestL6P2A.validate(out.manifest);
   const roles=out.assets.map(x=>({id:x.id,role:x.role,mime:x.mime,sourcePath:x.sourcePath,bytes:x.bytes}));
   const segments=out.layouts[0].segments;
   let failed={};
   const rejections={
    external:'<p><img src="https://other.example/evil.png"/></p>',
    traversal:'<p><img src="../../escape.png"/></p>',
    svg:'<p><svg><image href="images/bi%20mat.png"/></svg></p>',
    inlineStyle:'<p style="background-image: url(images/bi%20mat.png)">Chương 1</p>',
    data:'<p><img src="data:image/png;base64,AAAA" /></p>',
    unmanifested:'<p><img src="images/no.png" /></p>',
    srcset:'<p><img src="images/bi%20mat.png" srcset="images/bi%20mat.png 2x" /></p>'
   };
   for(const [key,content] of Object.entries(rejections)){
    rawEntries['OPS/chap1.xhtml'].content=content;
    try{await check(mockFile,parsed,opts);failed[key]='UNEXPECTED SUCCESS';}
    catch(e){failed[key]=String(e.message).slice(0,160);}
   }
   rawEntries['OPS/chap1.xhtml'].content=xhtml;
   rawEntries['OPS/package.opf'].content=opf.replace('image/png','image/svg+xml');
   try{await check(mockFile,parsed,opts);failed.vector='UNEXPECTED SUCCESS';}
   catch(e){failed.vector=String(e.message);}
   rawEntries['OPS/package.opf'].content=opf;
   rawEntries['OPS/images/bi mat.png'].content=Uint8Array.from([0,0,0,0]);
   try{await check(mockFile,parsed,opts);failed.badSignature='UNEXPECTED SUCCESS';}
   catch(e){failed.badSignature=String(e.message);}
   rawEntries['OPS/images/bi mat.png'].content=png;
   return {manifest:out.manifest,roles,segments,imageCount:out.layouts[0].imageCount,
    extracted:out.assets.length,originalLength:out.originalBytes.length,
    cutoverReady:out.cutoverReady,failed};
  });
  assert.equal(data.cutoverReady,false);
  assert.equal(data.extracted,3);
  assert.equal(data.imageCount,2);
  assert.equal(data.manifest.chapters.length,1);
  assert.deepEqual(data.manifest.assets.map(a=>a.role).sort(),['cover','illustration','illustration']);
  assert.equal(data.roles.find(x=>x.sourcePath==='OPS/images/extra.gif').mime,'image/gif');
  assert.deepEqual(data.segments.filter(s=>s.type==='image').map(x=>x.assetId),[
   data.roles.find(x=>x.sourcePath==='OPS/images/bi mat.png').id,
   data.roles.find(x=>x.sourcePath==='images/cover.jpg').id
  ]);
  assert.match(data.segments[0].text,/Chương 1/);
  assert.match(data.segments.map(s=>s.text||'').join(' '),/Sau ảnh/);
  for(const [key,msg] of Object.entries(data.failed))assert.ok(msg.startsWith('Không thể giữ nguyên ảnh EPUB:'),key+': '+msg);
  assert.deepEqual(errs,[]);
  console.log('PASS L6-P2C2 EPUB image extraction, order, all manifest images, safe path and fail-closed unsupported assets');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
