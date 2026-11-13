import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPermitReplayRehearsal} from '../src/vangioi-permit-replay.mjs';

const STORY='epub-replay',HASH='a'.repeat(64),ID1='123e4567-e89b-42d3-a456-426614174001',
 ID2='123e4567-e89b-42d3-a456-426614174002';
const issue={seq:1,eventId:ID1,storyId:STORY,contentHash:HASH,revision:1,status:'active',happenedAt:1000};
const revoke={seq:2,eventId:ID2,storyId:STORY,contentHash:HASH,revision:2,status:'revoked',happenedAt:1000};
const req=new Request('https://offline.test/');
const key=e=>JSON.stringify([e.storyId,e.contentHash]);
function harness({history=[issue,revoke],initial={status:'active',revision:1}}={}){
 let db={checkpoint:0,replica:new Map()},current={...initial},failOnce=false,commits=0;
 const readEvents=async(_request,{after})=>{
  const events=history.filter(e=>e.seq>after).slice(0,50);
  return {ok:true,events,checkpoint:events.at(-1)?.seq??after,nextCursor:null};
 };
 const readPermit=async()=>({ok:true,permit:{storyId:STORY,contentHash:HASH,...current,
  authorizedUid:'private-user',proofRef:'PRIVATE_PROOF'}});
 const commitBatch=async({after,checkpoint,projections})=>{
  if(db.checkpoint!==after)throw Error('checkpoint-conflict');
  const next=new Map(db.replica);
  for(const p of projections){
   const old=next.get(key(p));
   if(old?.status==='revoked'&&p.status==='active')continue; // revoke wins
   if(old&&p.revision<old.revision)continue;
   if(old&&p.revision===old.revision&&p.status!==old.status)throw Error('revision-conflict');
   next.set(key(p),{status:p.status,revision:p.revision});
  }
  commits++;
  if(failOnce){failOnce=false;throw Error('synthetic-crash-before-atomic-commit');}
  db={checkpoint,replica:next}; // fake all-or-nothing sink
 };
 const build=()=>createPermitReplayRehearsal({listPermitEvents:readEvents,
  readAdaptationPermit:readPermit,commitBatch});
 return {build,setCurrent:v=>{current=v;},crash:()=>{failOnce=true;},state:()=>db,commits:()=>commits};
}

test('G1V replay can restart after crash without advancing checkpoint or missing revoke',async()=>{
 const history=[issue],h=harness({history,initial:{status:'active',revision:1}}),worker=h.build();
 h.crash();assert.equal((await worker(req,{after:0})).code,'sink-unavailable');
 assert.equal(h.state().checkpoint,0);assert.equal(h.state().replica.size,0);
 assert.equal((await h.build()(req,{after:h.state().checkpoint})).ok,true);
 assert.deepEqual(h.state().replica.get(key(issue)),{status:'active',revision:1});
 history.push(revoke);h.setCurrent({status:'revoked',revision:2});
 assert.equal((await h.build()(req,{after:h.state().checkpoint})).processed,1);
 assert.equal(h.state().checkpoint,2);
 assert.deepEqual(h.state().replica.get(key(issue)),{status:'revoked',revision:2});
 assert.equal((await h.build()(req,{after:2})).processed,0);
 assert.equal(h.commits(),3); // failed attempt, successful retry, then revoke
});

test('G1V late issue replay cannot resurrect previously revoked projection',async()=>{
 const h=harness({history:[issue,revoke],initial:{status:'revoked',revision:2}});
 assert.equal((await h.build()(req,{after:0})).ok,true);
 const snapshot=structuredClone([...h.state().replica]);
 assert.equal((await h.build()(req,{after:0})).code,'sink-unavailable'); // stale cursor rejected
 assert.deepEqual([...h.state().replica],snapshot);
 assert.deepEqual(h.state().replica.get(key(revoke)),{status:'revoked',revision:2});
});

test('G1V rejects forged, out-of-order and inconsistent outbox pages before sink write',async()=>{
 const badPages=[
  {ok:true,events:[revoke,issue],checkpoint:1,nextCursor:null},
  {ok:true,events:[issue,issue],checkpoint:1,nextCursor:null},
  {ok:true,events:[{...issue,contentHash:'PRIVATE_PROOF'}],checkpoint:1,nextCursor:null},
  {ok:true,events:[issue],checkpoint:2,nextCursor:null},
  {ok:true,events:[],checkpoint:1,nextCursor:null},
  {ok:true,events:[issue],checkpoint:1,nextCursor:1}
 ];
 for(const page of badPages){
  let wrote=false;const rehearse=createPermitReplayRehearsal({listPermitEvents:async()=>page,
   readAdaptationPermit:async()=>({ok:true,permit:{storyId:STORY,contentHash:HASH,status:'active',revision:1}}),
   commitBatch:async()=>{wrote=true;}});
  assert.equal((await rehearse(req,{after:0})).code,'authority-unavailable');assert.equal(wrote,false);
 }
});

test('G1V refuses stale or missing authority, passes baseline-required and denies invalid cursors',async()=>{
 for(const p of [{ok:false,code:'forbidden'},{ok:false,code:'baseline-required'}]){
  const r=createPermitReplayRehearsal({listPermitEvents:async()=>p,readAdaptationPermit:async()=>{},commitBatch:async()=>{}});
  assert.equal((await r(req,{after:0})).code,p.code);
 }
 let writes=0;const r=createPermitReplayRehearsal({listPermitEvents:async()=>({ok:true,events:[revoke],checkpoint:2,nextCursor:null}),
  readAdaptationPermit:async()=>({ok:true,permit:{storyId:STORY,contentHash:HASH,status:'active',revision:1}}),
  commitBatch:async()=>{writes++;}});
  assert.equal((await r(req,{after:1})).code,'authority-unavailable');
  assert.equal((await r(req,{after:'1'})).code,'invalid-request');
  assert.equal((await r(req,{after:-1})).code,'invalid-request');
  assert.equal(writes,0);
});

test('G1V never returns private permit fields in telemetry',async()=>{
 const h=harness({history:[issue],initial:{status:'active',revision:1}});
 const response=await h.build()(req,{after:0});
 assert.equal(response.ok,true);assert.equal(JSON.stringify(response).includes('PRIVATE_PROOF'),false);
 assert.equal(JSON.stringify([...h.state().replica]).includes('private-user'),false);
});

test('G1V replay consumes a 52-event backlog across 50-record pages without skipping checkpoints',async()=>{
 const history=Array.from({length:52},(_,i)=>({...issue,seq:i+1,
  eventId:`123e4567-e89b-42d3-a456-${String(i+1).padStart(12,'0')}`,
  storyId:`epub-page-${i}`}));
 let state={checkpoint:0,records:new Map()};
 const rehearse=createPermitReplayRehearsal({
  listPermitEvents:async(_r,{after})=>{
   const page=history.filter(e=>e.seq>after).slice(0,51),events=page.slice(0,50);
   return {ok:true,events,checkpoint:events.at(-1)?.seq??after,
    nextCursor:page.length>50?events.at(-1).seq:null};
  },
  readAdaptationPermit:async(_r,{storyId,contentHash})=>({ok:true,permit:{storyId,contentHash,status:'active',revision:1}}),
  commitBatch:async({after,checkpoint,projections})=>{
   assert.equal(state.checkpoint,after);
   const records=new Map(state.records);
   for(const p of projections)records.set(p.eventId,p.seq);
   state={checkpoint,records};
  }
 });
 const page1=await rehearse(req,{after:state.checkpoint});
 assert.equal(page1.processed,50);assert.equal(page1.nextCursor,50);
 const page2=await rehearse(req,{after:state.checkpoint});
 assert.equal(page2.processed,2);assert.equal(page2.nextCursor,null);
 assert.equal(state.records.size,52);assert.equal(state.checkpoint,52);
 assert.equal((await rehearse(req,{after:52})).processed,0);
});
