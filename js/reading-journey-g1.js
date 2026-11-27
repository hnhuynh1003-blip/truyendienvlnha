/* G1: read-only reading journey. No persistence, requests, rewards or realm conversion. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReadingJourneyG1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const META='__duduReadingP2B',HEX_LENGTH=2160,SLOT_SECONDS=10;
 const integer=n=>Number.isSafeInteger(n)&&n>=0?n:null;
 function summarize({ready=false,sandbox=false,profile=null,policy=null,now=Date.now()}={}){
  if(sandbox||!ready||!profile)return {available:false,sandbox:!!sandbox};
  const result={available:true,level:integer(profile.level),exp:integer(profile.exp),
   coins:integer(profile.currency),items:Array.isArray(profile.inventory)?profile.inventory.length:null,reading:null};
  if(!policy||!Number.isSafeInteger(policy.dailyMaxMinutes)||policy.dailyMaxMinutes<1||
    policy.dailyMaxMinutes>1440||!Number.isSafeInteger(policy.expPerMinute)||policy.expPerMinute<1||
    !Number.isFinite(now)||Math.abs(now)>8640000000000000)return result;
  const meta=profile.storyStates?.[META];
  const day=new Date(now).toISOString().slice(0,10);
  const cap=policy.dailyMaxMinutes*60;
  if(meta===undefined){result.reading={day,seconds:0,cap,lifetime:0};return result;}
  if(!meta||meta.version!==1||meta.policyId!==policy.id||
    meta.expPerMinute!==policy.expPerMinute||meta.dailyMaxMinutes!==policy.dailyMaxMinutes||
    !meta.days||typeof meta.days!=='object'||Array.isArray(meta.days)||
    integer(meta.lifetimeObservedMs)===null||meta.lifetimeObservedMs%10000!==0)return result;
  const row=meta.days[day];
  let slots=0;
  if(row!==undefined){
   const bits=row?.bits;
   if(typeof bits!=='string'||bits.length!==HEX_LENGTH||!/^[0-9a-f]+$/.test(bits))return result;
   for(const ch of bits){const n=parseInt(ch,16);slots+=(n&1)+((n>>1)&1)+((n>>2)&1)+((n>>3)&1);}
  }
  const seconds=slots*SLOT_SECONDS,lifetime=meta.lifetimeObservedMs/1000;
  if(seconds>cap||seconds>lifetime)return result;
  result.reading={day,seconds,cap,lifetime};
  return result;
 }
 const time=s=>Math.floor(s/60)+' phút'+(s%60?' '+s%60+' giây':'');
 const number=n=>n===null?'—':n.toLocaleString('vi-VN');
 function render(doc,input){
  const host=doc.getElementById('reading-journey-g1');if(!host)return;
  const state=summarize(input),q=name=>host.querySelector('[data-journey-'+name+']');
  const set=(name,value)=>{const el=q(name);if(el)el.textContent=value;};
  q('account').hidden=!state.available;
  for(const button of host.querySelectorAll('[data-journey-personal]'))button.disabled=!state.available;
  set('status',state.available?'Tiến trình từ hồ sơ đang tải của bạn · dùng chung giữa các ứng dụng.':
   state.sandbox?'Sandbox tách biệt; không hiển thị tiến trình tài khoản thật.':'Đăng nhập và tải xong hồ sơ để xem tiến trình cá nhân.');
  set('level',state.available?'Lv.'+number(state.level)+' · '+number(state.exp)+' EXP':'—');
  set('coins',state.available?number(state.coins):'—');
  set('items',state.available?number(state.items)+' món':'—');
  const reading=state.reading,bar=q('bar');
  bar.hidden=!reading;bar.max=reading?.cap||1;bar.value=reading?.seconds||0;
  set('day',reading?'Đọc đã ghi nhận hôm nay (UTC): '+time(reading.seconds)+' / '+time(reading.cap):
   state.available?'Chưa xác định được thời gian đọc từ hồ sơ.':'');
  set('total',reading?'Tổng thời gian đọc đã ghi nhận: '+time(reading.lifetime):'');
 }
 const clear=doc=>render(doc,{ready:false});
 return Object.freeze({summarize,render,clear});
});
