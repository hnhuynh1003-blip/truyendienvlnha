/* DUDU V31: scoped, device-local typography options for Cyber Phone.
 * Never modifies novel reading font, Firebase data, or another account.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduPhoneTypographyV31=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const FONTS=Object.freeze([
    Object.freeze({id:'be',label:'Be Vietnam Pro',family:'"Be Vietnam Pro", "Segoe UI", sans-serif',
      url:'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap'}),
    Object.freeze({id:'quicksand',label:'Quicksand',family:'"Quicksand", "Segoe UI", sans-serif',
      url:'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap'}),
    Object.freeze({id:'nunito',label:'Nunito',family:'"Nunito", "Segoe UI", sans-serif',
      url:'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap'}),
    Object.freeze({id:'serif',label:'Noto Serif',family:'"Noto Serif", Georgia, serif',
      url:'https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;500;600;700&display=swap'})
  ]);
  const SIZES=Object.freeze(['small','normal','large']);
  const PREFIX='dudu-sandbox:phone-type:v31:';
  const DEFAULT=Object.freeze({font:'be',size:'normal'});
  const FONT_IDS=new Set(FONTS.map(x=>x.id));
  function keyFor(owner){return typeof owner==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(owner)?PREFIX+owner:null;}
  function normalize(value){
    return Object.freeze({font:FONT_IDS.has(value?.font)?value.font:DEFAULT.font,
      size:SIZES.includes(value?.size)?value.size:DEFAULT.size});
  }
  function read(storage,owner){
    const key=keyFor(owner);if(!key||!storage||typeof storage.getItem!=='function')return DEFAULT;
    try{return normalize(JSON.parse(storage.getItem(key)||'null'));}
    catch(_){return DEFAULT;}
  }
  function write(storage,owner,value){
    const key=keyFor(owner);
    if(!key||!storage||typeof storage.setItem!=='function'||!value ||
      !FONT_IDS.has(value.font)||!SIZES.includes(value.size))return false;
    try{storage.setItem(key,JSON.stringify({font:value.font,size:value.size}));return true;}
    catch(_){return false;}
  }
  function fontById(id){return FONTS.find(x=>x.id===id)||FONTS[0];}
  return Object.freeze({FONTS,SIZES,DEFAULT,keyFor,normalize,read,write,fontById});
});
