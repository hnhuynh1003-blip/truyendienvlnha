/* Fictional Sandbox discussion. One origin-local ledger, never account profiles. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduSandboxDiscussion=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const KEY='dudu-sandbox-shared-discussion-v1';
 const actors=['testA','testB','AUTHOR'];
 const reasons=['SPAM','HARASSMENT','SPOILER','OTHER'];
 const COOLDOWN_MS=6000, DUPLICATE_MS=600000, DAILY_LIMIT=30;
 const normalized=text=>text.trim().replace(/\s+/g,' ').toLocaleLowerCase();
 const day=ms=>new Date(ms).toISOString().slice(0,10);
 const visible=(c,all)=>!c.hidden&&(!c.parentId||all.some(p=>p.id===c.parentId&&!p.hidden));
 function create(storage,options={}){
  const now=typeof options.now==='function'?options.now:Date.now;
  const read=()=>{
   const raw=storage.getItem(KEY);
   const s=raw?JSON.parse(raw):{version:1,seq:0,comments:[],notifications:[],reports:[]};
   if(s.version!==1||!Number.isSafeInteger(s.seq)||!['comments','notifications','reports'].every(k=>Array.isArray(s[k])))throw Error('Dữ liệu Sandbox không hợp lệ');
   return s;
  };
  const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
  const scope=(a,b)=>a.storyId===b.storyId&&(a.chapterId||null)===(b.chapterId||null);
  function run(actor,action){
   if(!actors.includes(actor))throw Error('Vai ảo không hợp lệ');
   if(action.type==='reset'){
    if(actor!=='AUTHOR')throw Error('Chỉ AUTHOR Sandbox được đặt lại');
    storage.removeItem(KEY);return true;
   }
   const s=read();
   if(action.type==='post'){
    const text=typeof action.text==='string'?action.text.trim():'';
    if(!valid(action.storyId)||!(action.chapterId==null||valid(action.chapterId))||text.length<2||text.length>600||!valid(action.requestId))throw Error('Bình luận không hợp lệ');
    const old=s.comments.find(c=>c.requestId===action.requestId);
    if(old){
     if(old.actor!==actor||old.text!==text||!scope(old,action)||(old.parentId||null)!==(action.parentId||null))throw Error('Mã yêu cầu đã dùng');
     return old;
    }
    const parent=action.parentId?s.comments.find(c=>c.id===action.parentId):null;
    if(action.parentId&&parent?.hidden)throw Error('Không thể trả lời bình luận đã ẩn');
    if(action.parentId&&(!parent||parent.parentId||!scope(parent,action)))throw Error('Trả lời sai truyện/chương');
    if(s.comments.length>=1000)throw Error('Kho thử đã đầy');
    const stamp=now();
    if(!Number.isFinite(stamp)||stamp<0)throw Error('Thời gian không hợp lệ');
    const own=s.comments.filter(c=>c.actor===actor&&Number.isFinite(c.createdAt)&&c.createdAt>0&&c.createdAt<=stamp);
    if(own.some(c=>stamp-c.createdAt<COOLDOWN_MS))throw Error('Hãy đợi 6 giây trước khi bình luận tiếp');
    if(own.filter(c=>day(c.createdAt)===day(stamp)).length>=DAILY_LIMIT)throw Error('Đã đạt 30 bình luận trong ngày (UTC)');
    if(own.some(c=>scope(c,action)&&stamp-c.createdAt<DUPLICATE_MS&&normalized(c.text)===normalized(text)))throw Error('Bình luận trùng lặp trong 10 phút');
    const c={id:'sandbox-comment-'+ ++s.seq,actor,text,requestId:action.requestId,storyId:action.storyId,chapterId:action.chapterId||null,parentId:parent?.id||null,createdAt:stamp,hidden:false};
    s.comments.push(c);
    if(parent&&parent.actor!==actor)s.notifications.push({id:'sandbox-notice-'+ ++s.seq,to:parent.actor,from:actor,preview:text,createdAt:stamp,commentId:c.id,storyId:c.storyId,chapterId:c.chapterId,read:false});
    storage.setItem(KEY,JSON.stringify(s));return c;
   }
   if(action.type==='report'){
    const c=s.comments.find(c=>c.id===action.commentId);
    if(!c||!reasons.includes(action.reason)||!visible(c,s.comments))throw Error('Báo cáo không hợp lệ');
    if(!s.reports.some(r=>r.actor===actor&&r.commentId===c.id))s.reports.push({actor,commentId:c.id,reason:action.reason,storyId:c.storyId,chapterId:c.chapterId,createdAt:now()});
   }else if(action.type==='read'){
    s.notifications.filter(n=>n.to===actor&&scope(n,action)).forEach(n=>n.read=true);
   }else if(action.type==='moderate'){
    if(actor!=='AUTHOR')throw Error('Chỉ AUTHOR Sandbox được kiểm duyệt');
    if(typeof action.hidden!=='boolean')throw Error('Trạng thái kiểm duyệt không hợp lệ');
    const c=s.comments.find(c=>c.id===action.commentId);
    if(!c)throw Error('Không tìm thấy bình luận');
    c.hidden=action.hidden;c.moderatedBy=actor;c.moderatedAt=now();
   }else throw Error('Thao tác không hợp lệ');
   storage.setItem(KEY,JSON.stringify(s));return true;
  }
  return {run,snapshot:read,list:(s,viewer='testA')=>{if(!actors.includes(viewer))throw Error('Vai ảo không hợp lệ');const d=read();return d.comments.filter(c=>scope(c,s)&&(viewer==='AUTHOR'||visible(c,d.comments)))},inbox:(actor,s)=>read().notifications.filter(n=>n.to===actor&&scope(n,s)),reports:(s,viewer='AUTHOR')=>{if(viewer!=='AUTHOR')throw Error('Chỉ AUTHOR Sandbox được xem báo cáo');return read().reports.filter(r=>scope(r,s))}};
 }
 return Object.freeze({KEY,actors,reasons,COOLDOWN_MS,DUPLICATE_MS,DAILY_LIMIT,create});
});
