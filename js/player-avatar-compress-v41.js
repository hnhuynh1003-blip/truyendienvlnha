/* DUDU V41 — local-only player avatar resizing policy.
 * Large original images are decoded on the user's device; only bounded JPEG
 * data URLs go to the existing, user-scoped IndexedDB gallery.
 * No network requests and no change to save/account schema. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPlayerAvatarCompressV41=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_UPLOAD_BYTES=40*1024*1024;
 const MAX_PIXELS=48*1000*1000;
 const MAX_DATA_URL_CHARS=180000;
 const TYPES=Object.freeze(['image/jpeg','image/png','image/webp']);
 const STEPS=Object.freeze([
  [960,.88],[768,.86],[640,.85],[576,.83],[512,.81],
  [448,.79],[384,.77],[320,.75],[256,.73],[192,.69]
 ].map(([edge,quality])=>Object.freeze({edge,quality})));
 function validateFile(file){
  if(!file||!TYPES.includes(file.type))return 'invalid-type';
  if(!Number.isFinite(file.size)||file.size<16)return 'invalid-size';
  if(file.size>MAX_UPLOAD_BYTES)return 'too-large';
  return null;
 }
 function dimensions(image){
  const width=image?.naturalWidth||0,height=image?.naturalHeight||0;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
     width<1||height<1||width*height>MAX_PIXELS)return null;
  return {width,height};
 }
 function resize(image,{createCanvas,checkUrl,maxChars=MAX_DATA_URL_CHARS}={}){
  const size=dimensions(image);
  if(!size)throw new Error('unsupported-dimensions');
  if(typeof createCanvas!=='function'||typeof checkUrl!=='function')
   throw new Error('missing-encoder');
  const canvas=createCanvas(),ctx=canvas?.getContext?.('2d');
  if(!ctx)throw new Error('missing-canvas');
  const square=Math.min(size.width,size.height);
  const left=(size.width-square)/2,top=(size.height-square)/2;
  for(const {edge,quality} of STEPS){
   canvas.width=edge;canvas.height=edge;
   const painter=canvas.getContext('2d');
   if(!painter)throw new Error('missing-canvas');
   painter.imageSmoothingEnabled=true;
   painter.imageSmoothingQuality='high';
   painter.fillStyle='#19283a';
   painter.fillRect(0,0,edge,edge);
   painter.drawImage(image,left,top,square,square,0,0,edge,edge);
   const dataUrl=canvas.toDataURL('image/jpeg',quality);
   if(dataUrl.length<=maxChars&&checkUrl(dataUrl))
    return Object.freeze({dataUrl,edge,quality,bytes:Math.floor((dataUrl.length-dataUrl.indexOf(',')-1)*.75)});
  }
  throw new Error('encoded-too-large');
 }
 return Object.freeze({MAX_UPLOAD_BYTES,MAX_PIXELS,MAX_DATA_URL_CHARS,TYPES,STEPS,validateFile,dimensions,resize});
});
