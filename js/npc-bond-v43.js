/* V43.4 — NPC bond streaks, Sandbox only. Pure progression, zero rewards.
 * Each story/NPC owns its own record within that reader's existing profile.
 * Count ONLY successful, intentional in-game interactions, not chat inputs,
 * scripted greetings, failed gifts, prompt scrolls or speculative AI content.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduNpcBondV43=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MILESTONES=Object.freeze([3,7,14,30]);
 const TYPES=Object.freeze(['checkin','gift','conversation']);
 const empty=()=>({version:1,lastDay:'',current:0,best:0,totalDays:0});
 function validDay(day){
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const ms=Date.parse(day+'T00:00:00Z');
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===day;
 }
 function utcDay(now=Date.now()){
  return Number.isFinite(now)&&now>=0?
    new Date(now).toISOString().slice(0,10):'';
 }
 function norm(raw){
  const s=empty();
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return s;
  if(validDay(raw.lastDay))s.lastDay=raw.lastDay;
  for(const k of ['current','best','totalDays']){
   if(Number.isSafeInteger(raw[k])&&raw[k]>=0)s[k]=Math.min(raw[k],99999);
  }
  s.best=Math.max(s.current,s.best);
  if(!s.lastDay)s.current=0;
  return s;
 }
 function gap(from,to){
  if(!validDay(from)||!validDay(to))return null;
  return Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000);
 }
 function shownCurrent(raw,today=utcDay()){
  const s=norm(raw),delta=gap(s.lastDay,today);
  // Yesterday remains recoverable for today's interaction.
  return delta===0||delta===1?s.current:0;
 }
 function record(raw,{type,day=utcDay()}={}){
  const s=norm(raw);
  if(!TYPES.includes(type)||!validDay(day))return {ok:false,reason:'invalid-event',state:s};
  const delta=gap(s.lastDay,day);
  if(delta===0)return {ok:false,reason:'already-today',state:s};
  if(delta!==null&&delta<0)return {ok:false,reason:'past-day',state:s};
  const current=delta===1?Math.min(s.current+1,99999):1;
  const best=Math.max(s.best,current);
  const milestones=MILESTONES.filter(n=>s.best<n&&best>=n);
  return {ok:true,state:{version:1,lastDay:day,current,best,
    totalDays:Math.min(99999,s.totalDays+1)},milestones,type};
 }
 function favoriteChoice(previous,selected,unlockedIds=[]){
  const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
  if(!valid(selected)||!Array.isArray(unlockedIds)||!unlockedIds.includes(selected))
    return {ok:false,selected:valid(previous)?previous:''};
  return {ok:true,selected:previous===selected?'':selected};
 }
 return Object.freeze({MILESTONES,TYPES,empty,norm,utcDay,gap,
  shownCurrent,record,favoriteChoice});
});
