// G1V: isolated permit-outbox replay rehearsal. Not a live subscriber or grant issuer.
// Callbacks are installed by trusted test/staging host code, never request JSON.

const validSeq=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
const validHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const validStory=v=>typeof v==='string'&&!!v.trim()&&v.length<=160&&!/[\p{C}]/u.test(v);
const validId=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const fail=code=>({ok:false,code});

function validatedPage(page,after){
 if(!page||page.ok!==true||!Array.isArray(page.events)||page.events.length>50||
  !validSeq(page.checkpoint)||(page.nextCursor!==null&&page.nextCursor!==page.checkpoint))throw Error('invalid-outbox-page');
 let previous=after;
 const seen=new Set();
 for(const e of page.events){
  if(!e||typeof e!=='object'||!validSeq(e.seq)||e.seq<=previous||!validId(e.eventId)||seen.has(e.eventId)||
   !validStory(e.storyId)||!validHash(e.contentHash)||
   !((e.status==='active'&&e.revision===1)||(e.status==='revoked'&&e.revision===2))||
   !validSeq(e.happenedAt))throw Error('invalid-outbox-event');
  previous=e.seq;seen.add(e.eventId);
 }
 if(page.checkpoint!==previous||(page.nextCursor!==null&&page.events.length!==50))throw Error('invalid-outbox-cursor');
 return page.events;
}

function validatedAuthority(result,event){
 const p=result?.ok===true?result.permit:null;
 if(!p||p.storyId!==event.storyId||p.contentHash!==event.contentHash||
  !((p.status==='active'&&p.revision===1)||(p.status==='revoked'&&p.revision===2))||
  p.revision<event.revision||(event.status==='revoked'&&p.status!=='revoked'))
  throw Error('invalid-authority-state');
 return {eventId:event.eventId,seq:event.seq,storyId:event.storyId,
  contentHash:event.contentHash,status:p.status,revision:p.revision};
}

/**
 * Rehearses one page. commitBatch MUST atomically persist both projections
 * and its checkpoint, compare-and-swapping `after`. This module cannot
 * enforce atomicity on an external sink and grants no access rights.
 */
export function createPermitReplayRehearsal({listPermitEvents,readAdaptationPermit,commitBatch}={}){
 if(typeof listPermitEvents!=='function'||typeof readAdaptationPermit!=='function'||typeof commitBatch!=='function')
  throw new TypeError('G1V requires trusted readers and an atomic rehearsal sink');
 return async function rehearse(request,{after}={}){
  if(!validSeq(after))return fail('invalid-request');
  let page;
  try{page=await listPermitEvents(request,{after});}catch{return fail('authority-unavailable');}
  if(page?.ok!==true)return fail(['unauthenticated','forbidden','baseline-required'].includes(page?.code)?page.code:'authority-unavailable');
  let projections;
  try{
   const events=validatedPage(page,after);
   projections=[];
   for(const event of events){
    const current=await readAdaptationPermit(request,{storyId:event.storyId,contentHash:event.contentHash});
    projections.push(validatedAuthority(current,event));
   }
  }catch{return fail('authority-unavailable');}
  try{
   // Empty page does not advance the checkpoint or write the sink.
   if(projections.length)await commitBatch({after,checkpoint:page.checkpoint,projections});
  }catch{return fail('sink-unavailable');}
  return {ok:true,processed:projections.length,checkpoint:page.checkpoint,nextCursor:page.nextCursor};
 };
}
