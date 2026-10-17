/* V44.2 server policy: browser content is never trusted for privileges. */
export const COMMENT_LIMITS=Object.freeze({maxText:600,minText:2,
 cooldownMs:45000,daily:20,maxCommentsPerThread:5000});
export const REPORT_REASONS=Object.freeze(['SPAM','HARASSMENT','SPOILER','OTHER']);
const ID=/^[a-zA-Z0-9][\w:-]{0,159}$/;
export function validId(x){return typeof x==='string'&&ID.test(x)}
export function scope(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  !validId(input.storyId)|| (input.chapterId!==null&&
  input.chapterId!==undefined&&!validId(input.chapterId)))return null;
 return {storyId:input.storyId,chapterId:input.chapterId||null};
}
export function postBody(body){
 const s=scope(body);
 if(!s||Object.keys(body).some(k=>!['storyId','chapterId','text',
  'parentId','requestId','displayName'].includes(k))||
  !validId(body.requestId)|| (body.parentId!==null&&
   body.parentId!==undefined&&!validId(body.parentId))||
  typeof body.text!=='string'||body.text.trim().length<COMMENT_LIMITS.minText||
  body.text.trim().length>COMMENT_LIMITS.maxText||
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body.text)||
  (body.displayName!==undefined&&
   (typeof body.displayName!=='string'||body.displayName.length>50)))return null;
 return {...s,text:body.text.trim(),parentId:body.parentId||null,
  requestId:body.requestId,displayName:body.displayName?.trim()||'Độc giả'};
}
export function reportBody(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).sort().join(',')!=='commentId,reason'||
  !validId(body.commentId)||!REPORT_REASONS.includes(body.reason))return null;
 return {commentId:body.commentId,reason:body.reason};
}
export function moderatorBody(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).sort().join(',')!=='commentId,hidden'||
  !validId(body.commentId)||typeof body.hidden!=='boolean')return null;
 return {commentId:body.commentId,hidden:body.hidden};
}
export function registerBody(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).sort().join(',')!=='chapterIds,storyId'||
  !validId(body.storyId)||!Array.isArray(body.chapterIds)||
  body.chapterIds.length>500||
  body.chapterIds.some(x=>!validId(x))||
  new Set(body.chapterIds).size!==body.chapterIds.length)return null;
 return {storyId:body.storyId,chapterIds:body.chapterIds};
}
