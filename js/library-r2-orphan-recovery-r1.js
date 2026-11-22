(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DuduR2OrphanRecoveryR1=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const BOOK=/^epub-[a-f0-9]{32}$/,REV=/^r-[a-f0-9]{32}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
 const parse=raw=>{const p=JSON.parse(raw);if(!p||Object.keys(p).sort().join(',')!=='bookId,phase,revisionId,schema'||p.schema!==1||p.phase!=='draft'||!BOOK.test(p.bookId)||!REV.test(p.revisionId))throw Error('Phiên không thuộc phạm vi kết thúc an toàn.');return p;};
 const prefix=(uid,p)=>'dudu-r2-orphan-evidence:'+uid+':'+p.bookId+':'+p.revisionId+':';
 function receiptMatches(receipt,uid,p,proofId){return receipt?.uid===uid&&receipt.bookId===p.bookId&&receipt.revisionId===p.revisionId&&receipt.phase===p.phase&&receipt.proofId===proofId&&UUID.test(proofId||'')&&receipt.action==='CLOSE_ORPHAN_PENDING'&&receipt.emptyPrefixes===5&&Number.isSafeInteger(receipt.closedAt)&&receipt.closedAt>0;}
 function resolved({storage,uid,raw}){
  try{const p=parse(raw),start=prefix(uid,p);for(let i=0;i<storage.length;i++){const k=storage.key(i);if(!k?.startsWith(start))continue;const e=JSON.parse(storage.getItem(k));if(e?.schema===1&&e.raw===raw&&e.uid===uid&&e.state==='resolved'&&k===start+e.proof?.proofId&&receiptMatches(e.receipt,uid,p,e.proof?.proofId))return true;}}catch{}
  return false;
 }
 function create({storage,getUser,isAllowed,readRaw,send,confirm,refreshCatalog,catalogReady}){
  let running=false;
  return Object.freeze({async close(){
   if(running)return {released:false,code:'BUSY'};running=true;
   try{
    const user=getUser(),uid=user?.uid,raw=readRaw(uid);if(!uid||!isAllowed())throw Error('Phiên tác giả chưa sẵn sàng.');
    const p=parse(raw),same=()=>getUser()===user&&isAllowed()&&readRaw(uid)===raw;
    const inspect=await send('inspect',p);if(!same())throw Error('Phiên đã thay đổi; giữ nguyên pending.');
    const proof=inspect?.proof;
    if(inspect?.ok!==true||inspect.code!=='orphan-inspected'||inspect.classification!=='NOT_FOUND'||inspect.emptyPrefixes!==5||proof?.uid!==uid||proof.bookId!==p.bookId||proof.revisionId!==p.revisionId||proof.phase!==p.phase||!UUID.test(proof.proofId||''))throw Error('Worker chưa chứng minh phiên không tồn tại; giữ nguyên pending.');
    if(!await confirm('Worker vừa xác minh không có bản thảo và không có object R2 cho đúng phiên này. Đây KHÔNG phải xác nhận đã xuất bản. Kết thúc phiên sẽ giữ nguyên bản ghi gốc, lưu bằng chứng cục bộ và yêu cầu tải đầy đủ thư viện để kiểm tra trùng trước khi đăng lại. Bạn có xác nhận kết thúc phiên này?'))return {released:false,code:'CANCELLED'};
    if(!same())throw Error('Phiên đã thay đổi; giữ nguyên pending.');
    const key=prefix(uid,p)+proof.proofId;
    const evidence={schema:1,uid,raw,state:'backed-up',proof};
    const backup=JSON.stringify(evidence);storage.setItem(key,backup);if(storage.getItem(key)!==backup)throw Error('Không lưu được bản sao bằng chứng; giữ nguyên pending.');
    if(!same())throw Error('Phiên đã thay đổi; giữ nguyên pending.');
    const closed=await send('close',{...p,proofId:proof.proofId,action:'CLOSE_ORPHAN_PENDING'});
    if(!same())throw Error('Phiên đã thay đổi; giữ nguyên pending.');
    if(closed?.ok!==true||closed.code!=='orphan-closed'||!receiptMatches(closed.receipt,uid,p,proof.proofId))throw Error('Chưa xác nhận kết thúc phiên; giữ nguyên pending.');
    const final=JSON.stringify({...evidence,state:'resolved',receipt:closed.receipt});storage.setItem(key,final);if(storage.getItem(key)!==final)throw Error('Không lưu được biên bản kết thúc; giữ nguyên pending.');
    // Never remove/overwrite the original pending. An exact receipt resolves only this raw value.
    if(!same())return {released:false,code:'SESSION_CHANGED'};
    let refreshed=false;try{await refreshCatalog();refreshed=getUser()===user&&isAllowed()&&readRaw(uid)===raw&&catalogReady()===true;}catch{}
    return {released:true,catalogReady:refreshed,code:refreshed?'CLOSED_CATALOG_READY':'CLOSED_CATALOG_BLOCKED'};
   }catch{return {released:false,code:'UNVERIFIED'};}finally{running=false;}
  }});
 }
 function transport({workerBaseUrl,getUser,isAllowed,fetchFn=globalThis.fetch}){
  if(workerBaseUrl!=='https://dudu-library-l6-development.dudu-studio-ai.workers.dev')throw Error('Worker URL không hợp lệ.');
  return async(action,p)=>{
   if(!['inspect','close'].includes(action)||!BOOK.test(p.bookId||'')||!REV.test(p.revisionId||''))throw Error('SESSION');
   const user=getUser();if(!user||!isAllowed())throw Error('AUTH');const token=await user.getIdToken(false);if(getUser()!==user||!isAllowed())throw Error('AUTH');
   const body=action==='inspect'?{revisionId:p.revisionId,phase:p.phase}:{revisionId:p.revisionId,phase:p.phase,proofId:p.proofId,action:p.action};
   const response=await fetchFn(workerBaseUrl+'/v1/library/r2/catalog/'+p.bookId+'/orphan/'+action,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
   if(response.status!==200||!/application\/json/i.test(response.headers.get('Content-Type')||'')){await response.body?.cancel();throw Error('BACKEND');}
   const reader=response.body.getReader();let size=0,text='';const decoder=new TextDecoder();try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>4096)throw Error('BODY');text+=decoder.decode(r.value,{stream:true});}return JSON.parse(text+decoder.decode());}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  };
 }
 return Object.freeze({create,resolved,transport});
});
