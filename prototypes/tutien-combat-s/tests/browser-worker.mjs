import { MockRepository } from '../mock-repository.mjs';
import {openModule} from '../module/module-repository.mjs';
const peer=window.opener||window.parent;
let repo;
window.addEventListener('message',async e=>{
 if(e.origin!==location.origin||e.source!==peer)return;
 try{
  if(e.data.kind==='open')repo=e.data.module?await openModule({name:e.data.name,ownerId:e.data.ownerId,edition:e.data.edition}):await MockRepository.open({name:e.data.name,ownerId:e.data.ownerId,trialRunId:e.data.trialRunId||null});
  const value=e.data.kind==='dispatch'?await repo.dispatch(e.data.command):await repo.read();
  peer.postMessage({id:e.data.id,ok:true,value},location.origin);
 }catch(err){peer.postMessage({id:e.data.id,ok:false,code:err.code||err.name,message:err.message},location.origin);}
});
peer.postMessage({ready:true},location.origin);
