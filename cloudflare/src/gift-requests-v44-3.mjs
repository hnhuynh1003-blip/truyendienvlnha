/* V44.3: public gift request allowlist — NO recipient UID, grants or author proof. */
import {DESTINATIONS} from './gift-contract-v44.mjs';
const KEY=/^[A-Za-z0-9][\w:-]{0,159}$/;
const ID=x=>typeof x==='string'&&KEY.test(x);
export const GIFT_ACTIONS=Object.freeze(['ACCEPT','DECLINE','CANCEL']);
export function requestGift(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).some(x=>!['requestId','storyId','chapterId','itemInstanceId',
   'destination','note'].includes(x))||
  !ID(body.requestId)||!ID(body.storyId)||!ID(body.itemInstanceId)||
  (body.chapterId!=null&&!ID(body.chapterId))||
  !Object.values(DESTINATIONS).includes(body.destination)||
  body.destination==='NPC'||typeof(body.note??'')!=='string'||
  (body.note??'').trim().length>160)return null;
 return {requestId:body.requestId,storyId:body.storyId,
  chapterId:body.chapterId??null,itemInstanceId:body.itemInstanceId,
  destination:body.destination,note:body.note??''};
}
export function requestDecision(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).sort().join(',')!=='action,transferId'||
  !ID(body.transferId)||!GIFT_ACTIONS.includes(body.action))return null;
 return body;
}
