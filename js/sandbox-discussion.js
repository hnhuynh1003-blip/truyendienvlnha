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
 function create(storage){
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
    if(action.parentId&&(!parent||parent.parentId||!scope(parent,action)))throw Error('Trả lời sai truyện/chương');
    if(s.comments.length>=1000)throw Error('Kho thử đã đầy');
    const c={id:'sandbox-comment-'+ ++s.seq,actor,text,requestId:action.requestId,storyId:action.storyId,chapterId:action.chapterId||null,parentId:parent?.id||null};
    s.comments.push(c);
    if(parent&&parent.actor!==actor)s.notifications.push({id:'sandbox-notice-'+ ++s.seq,to:parent.actor,commentId:c.id,storyId:c.storyId,chapterId:c.chapterId,read:false});
    storage.setItem(KEY,JSON.stringify(s));return c;
   }
   if(action.type==='report'){
    const c=s.comments.find(c=>c.id===action.commentId);
    if(!c||!reasons.includes(action.reason))throw Error('Báo cáo không hợp lệ');
    if(!s.reports.some(r=>r.actor===actor&&r.commentId===c.id))s.reports.push({actor,commentId:c.id,reason:action.reason,storyId:c.storyId,chapterId:c.chapterId});
   }else if(action.type==='read'){
    s.notifications.filter(n=>n.to===actor&&scope(n,action)).forEach(n=>n.read=true);
   }else throw Error('Thao tác không hợp lệ');
   storage.setItem(KEY,JSON.stringify(s));return true;
  }
  return {run,snapshot:read,list:s=>read().comments.filter(c=>scope(c,s)),inbox:(actor,s)=>read().notifications.filter(n=>n.to===actor&&scope(n,s)),reports:s=>read().reports.filter(r=>scope(r,s))};
 }
 return Object.freeze({KEY,actors,reasons,create});
});
