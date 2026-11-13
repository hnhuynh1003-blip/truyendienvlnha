/* DUDU Library L3 — read-only genre matching for published Web and EPUB metadata.
 * No story mutation, Firestore queries, profile writes or search-index migration.
 */
(function(root,factory){
 const api=factory();
 if(root)root.DuduLibrarySmartFilterL3=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const DEFAULT=Object.freeze({include:[],exclude:[],mode:'AND',status:'ALL',source:'ALL',minChapters:0});
 const normalize=value=>String(value??'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d')
  .toLocaleLowerCase('vi').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 const internalTag=key=>key==='epub'||key==='nhap epub'||key==='chua phan loai';
 function genres(book){
  const raw=Array.isArray(book?.genre)?book.genre:String(book?.genre??'').split(/[,;|/\n]+/);
  const seen=new Set();
  return raw.map(value=>String(value??'').trim().replace(/\s+/g,' '))
   .filter(label=>{
    const key=normalize(label);
    if(!key||internalTag(key)||seen.has(key))return false;
    seen.add(key);return true;
   });
 }
 function catalogGenres(books){
  const found=new Map();
  for(const book of Array.isArray(books)?books:[]){
   for(const label of genres(book)){
    const key=normalize(label);
    if(found.has(key))found.get(key).count++;
    else found.set(key,{key,label,count:1});
   }
  }
  return [...found.values()].sort((a,b)=>a.label.localeCompare(b.label,'vi'));
 }
 function state(value={}){
  const clean=items=>[...new Set((Array.isArray(items)?items:[])
   .map(normalize).filter(key=>key&&!internalTag(key)))].slice(0,150);
  const exclude=clean(value.exclude);
  const excluded=new Set(exclude);
  return {include:clean(value.include).filter(key=>!excluded.has(key)),exclude,
   mode:value.mode==='OR'?'OR':'AND',
   status:['ALL','Đang ra','Hoàn thành'].includes(value.status)?value.status:'ALL',
   source:['ALL','WEB','EPUB'].includes(value.source)?value.source:'ALL',
   minChapters:Math.min(100000,Math.max(0,Math.trunc(Number(value.minChapters)||0)))};
 }
 function cycle(input,tag){
  const key=normalize(tag);const next=state(input);
  if(!key||internalTag(key))return next;
  if(next.include.includes(key)){
   next.include=next.include.filter(item=>item!==key);next.exclude.push(key);
  }else if(next.exclude.includes(key)){
   next.exclude=next.exclude.filter(item=>item!==key);
  }else next.include.push(key);
  return state(next);
 }
 function remove(input,kind,tag){
  const next=state(input),key=normalize(tag);
  if(kind==='include'||kind==='exclude')next[kind]=next[kind].filter(item=>item!==key);
  else if(kind==='status')next.status='ALL';
  else if(kind==='source')next.source='ALL';
  else if(kind==='minChapters')next.minChapters=0;
  return state(next);
 }
 function matches(book,input){
  const selected=state(input);
  if(selected.status!=='ALL'&&normalize(book?.status)!==normalize(selected.status))return false;
  if(selected.source==='EPUB'&&!book?._cloudV49)return false;
  if(selected.source==='WEB'&&book?._cloudV49)return false;
  if((book?.chapters?.length||0)<selected.minChapters)return false;
  const tags=new Set(genres(book).map(normalize));
  if(selected.exclude.some(tag=>tags.has(tag)))return false;
  if(!selected.include.length)return true;
  return selected.mode==='AND'?selected.include.every(tag=>tags.has(tag)):
   selected.include.some(tag=>tags.has(tag));
 }
 return Object.freeze({DEFAULT,normalize,genres,catalogGenres,state,cycle,remove,matches});
});
