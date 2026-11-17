/* L6-P2C3: private Worker layout payload validator (pure, offline).
 * Identity and object access are checked separately by the Worker ACL.
 * Layout JSON is data only: never execute HTML or trust remote image URLs.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{3,120}$/;
const REV=/^r-[a-f0-9]{16,32}$/;
const valid=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
const fail=()=>{throw Error('Untrusted R2 EPUB layout');};
const collapse=text=>text.replace(/\s+/gu,' ').trim();
export const MAX_LAYOUT_BYTES=1048576;
export function validateLayoutBytes(bytes,{bookId,revisionId,chapterId,assetIds,chapterText}={}){
 if(!(bytes instanceof ArrayBuffer)&&!(bytes instanceof Uint8Array))fail();
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(!b.byteLength||b.byteLength>MAX_LAYOUT_BYTES)fail();
 let raw,record;
 try{raw=new TextDecoder('utf-8',{fatal:true}).decode(b);record=JSON.parse(raw);}
 catch{fail();}
 if(!valid(record,['schema','bookId','revisionId','chapterId','segments'])||record.schema!==1||
  !ID.test(record.bookId||'')||!REV.test(record.revisionId||'')||
  !ID.test(record.chapterId||'')||record.bookId!==bookId||
  record.revisionId!==revisionId||record.chapterId!==chapterId)fail();
 if(!(assetIds instanceof Set)||assetIds.size>3000||[...assetIds].some(x=>!ID.test(x))||
  !Array.isArray(record.segments)||!record.segments.length||record.segments.length>4000)fail();
 const segments=[];let textLength=0,imageCount=0,seenText=0;
 for(const value of record.segments){
  if(value?.type==='text'&&valid(value,['type','text'])){
   if(typeof value.text!=='string'||!value.text.trim()||value.text.length>220000||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value.text))fail();
   textLength+=value.text.length;seenText++;
   if(textLength>220000)fail();
   segments.push({type:'text',text:value.text});
  }else if(value?.type==='image'&&valid(value,['type','assetId','alt'])){
   if(!ID.test(value.assetId||'')||!assetIds.has(value.assetId)||
     typeof value.alt!=='string'||value.alt.length>180||
     /[\u0000-\u001F<>]/u.test(value.alt))fail();
   imageCount++;
   if(imageCount>300)fail();
   segments.push({type:'image',assetId:value.assetId,alt:value.alt});
  }else fail();
 }
 if(!seenText)fail();
 const clean={schema:1,bookId,revisionId,chapterId,segments};
 if(JSON.stringify(clean)!==raw)fail();
 if(chapterText!==undefined&&!layoutMatchesChapter(clean,chapterText))fail();
 return clean;
}
export function layoutMatchesChapter(layout,chapterText){
 return typeof chapterText==='string'&&
  collapse(layout.segments.filter(s=>s.type==='text').map(s=>s.text).join(' '))===
  collapse(chapterText);
}
