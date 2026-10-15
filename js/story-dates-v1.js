/* Story date utilities: no fabricated fallback and no UTC-day drift for Vietnam. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduStoryDates=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const TZ='Asia/Ho_Chi_Minh';
  function validDate(value){
    if(typeof value!=='string')return null;
    const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(value.trim());
    if(!m)return null;
    const [y,mo,d]=m.slice(1).map(Number);
    if(y<1970||y>9999||mo<1||mo>12||d<1||d>31)return null;
    const date=new Date(Date.UTC(y,mo-1,d));
    if(date.getUTCFullYear()!==y||date.getUTCMonth()+1!==mo||date.getUTCDate()!==d)return null;
    return value.trim();
  }
  function dateFrom(value){
    if(typeof value==='string')return validDate(value.slice(0,10));
    if(value instanceof Date&&!Number.isNaN(value.valueOf()))return localToday(value);
    // No Firestore timestamp conversion or inference without verified source.
    return null;
  }
  function localToday(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,
      year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return obj.year+'-'+obj.month+'-'+obj.day;
  }
  function latest(novel){
    if(!novel||typeof novel!=='object')return null;
    const dates=[dateFrom(novel.updatedAt),dateFrom(novel.createdAt)];
    for(const ch of Array.isArray(novel.chapters)?novel.chapters:[]){
      if(!ch||typeof ch!=='object')continue;
      dates.push(dateFrom(ch.updatedAt),dateFrom(ch.createdAt));
    }
    const known=dates.filter(Boolean);
    return known.length?known.sort().at(-1):null;
  }
  function display(value){
    const d=validDate(value);
    return d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'Chưa có ngày';
  }
  function ordering(value){
    const day=validDate(value);
    return day?Date.parse(day+'T00:00:00Z'):0;
  }
  return Object.freeze({TZ,validDate,localToday,latest,display,ordering});
});
