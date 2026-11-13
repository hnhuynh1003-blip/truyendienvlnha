import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {request as httpRequest} from 'node:http';
import {Script} from 'node:vm';
import {readFileSync} from 'node:fs';
import {createOfflineRoleplayBrowserServer}
 from '../../tools/vangioi/author-roleplay-browser-server.mjs';

const host=async work=>{
 const server=await createOfflineRoleplayBrowserServer();
 try{return await work(server.url);}finally{await server.close();}
};
const post=async(url,path,data,headers={})=>{
 const response=await fetch(url+path,{method:'POST',headers:{Origin:url,
  'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 return {status:response.status,body:await response.json(),headers:response.headers};
};
const start=(url,entryId)=>post(url,'/api/start',{entryId});
const choose=(url,sessionId,choiceId,eventId,expectedRevision)=>
 post(url,'/api/choose',{sessionId,choiceId,eventId,expectedRevision});

test('G5C-P2 Node browser preview only binds loopback and never writes durable state',async()=>{
 await host(async url=>{
  assert.match(url,/^http:\/\/127\.0\.0\.1:\d+$/);
  const response=await fetch(url+'/'),page=await response.text();
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(page,/Bến Sương/);
  assert.match(page,/id="roles"/);
  assert.match(page,/id="choices"/);
  assert.match(page,/name="viewport"/);
  assert.match(page,/@media \(max-width:390px\)/);
  assert.equal(page.includes('PRIVATE_DEMO_CANON'),false);
  assert.equal(page.includes('https://'),false);
  assert.equal(page.includes('innerHTML'),false);
  const inline=page.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(inline);assert.doesNotThrow(()=>new Script(inline[1]));
 });
});

test('G5C-P2 browser catalog exposes two entry modes, no private canon or rights',async()=>{
 await host(async url=>{
  const response=await fetch(url+'/api/catalog'),data=await response.json();
  assert.equal(response.status,200);
  assert.deepEqual(data.entryProfiles.map(x=>x.mode),['native_extra','system_cover']);
  assert.equal(data.worldPublished,false);
  assert.equal(data.rightsVerified,false);
  assert.equal(data.saveCommitted,false);
  assert.equal(JSON.stringify(data).includes('PRIVATE_DEMO_CANON'),false);
 });
});

test('G5C-P2 two browser roles have distinct scripted reactions and valid choices',async()=>{
 await host(async url=>{
  const local=(await start(url,'entry-local')).body;
  const inspector=(await start(url,'entry-inspector')).body;
  assert.equal(local.ok,true);assert.equal(inspector.ok,true);
  assert.notEqual(local.sessionId,inspector.sessionId);
  assert.notEqual(local.view.roleReaction,inspector.view.roleReaction);
  assert.equal(local.view.revision,0);
  assert.deepEqual(local.view.choices.map(x=>x.choiceId),['choice-rescue','choice-beacon']);
  assert.equal(local.view.endingVerified,undefined);
  assert.equal(local.view.missionCompleted,false);
  assert.equal(local.view.productionAuthorized,false);
 });
});

test('G5C-P2 rescue branch ends narratively with no completion, reward, or save',async()=>{
 await host(async url=>{
  const s=(await start(url,'entry-local')).body;
  const a=await choose(url,s.sessionId,'choice-rescue',randomUUID(),0);
  assert.equal(a.status,200);assert.equal(a.body.view.sceneId,'scene-tower');
  assert.deepEqual(a.body.view.choices.map(x=>x.choiceId),['choice-finish-rescue']);
  const b=await choose(url,s.sessionId,'choice-finish-rescue',randomUUID(),1);
  assert.equal(b.body.view.narrativeEndingId,'ending-rescue');
  assert.deepEqual(b.body.view.choices,[]);
  for(const field of ['missionCompleted','rewardAuthorized','rewardCommitted',
   'saveCommitted','rightsVerified','productionAuthorized','worldPublished'])
   assert.equal(b.body.view[field],false);
 });
});

test('G5C-P2 beacon branch has a distinct ending and mutually exclusive transitions',async()=>{
 await host(async url=>{
  const s=(await start(url,'entry-inspector')).body;
  const a=await choose(url,s.sessionId,'choice-beacon',randomUUID(),0);
  assert.deepEqual(a.body.view.choices.map(x=>x.choiceId),['choice-finish-beacon']);
  const b=await choose(url,s.sessionId,'choice-finish-beacon',randomUUID(),1);
  assert.equal(b.body.view.narrativeEndingId,'ending-beacon');
  assert.equal((await choose(url,s.sessionId,'choice-rescue',randomUUID(),2)).status,409);
 });
});

test('G5C-P2 duplicated event retry after lost browser reply returns same revision and receipt state',async()=>{
 await host(async url=>{
  const s=(await start(url,'entry-local')).body,eventId=randomUUID();
  const a=await choose(url,s.sessionId,'choice-rescue',eventId,0);
  const retry=await choose(url,s.sessionId,'choice-rescue',eventId,0);
  assert.equal(a.status,200);assert.equal(retry.status,200);
  assert.equal(a.body.duplicate,false);assert.equal(retry.body.duplicate,true);
  assert.deepEqual(a.body.view,retry.body.view);
  assert.equal(retry.body.view.revision,1);
  const conflict=await choose(url,s.sessionId,'choice-beacon',eventId,0);
  assert.equal(conflict.status,409);
  assert.equal(conflict.body.code,'event-id-conflict');
 });
});

test('G5C-P2 concurrent browser choices serialize and only one stale revision succeeds',async()=>{
 await host(async url=>{
  const s=(await start(url,'entry-local')).body;
  const requests=await Promise.all([
   choose(url,s.sessionId,'choice-rescue',randomUUID(),0),
   choose(url,s.sessionId,'choice-beacon',randomUUID(),0)]);
  assert.deepEqual(requests.map(x=>x.status).sort(),[200,409]);
  assert.equal(requests.find(x=>x.status===200).body.view.revision,1);
 });
});

test('G5C-P2 client forged reward, fake user, revision and unknown entry are denied',async()=>{
 await host(async url=>{
  const missing=await start(url,'entry-admin');
  assert.equal(missing.status,400);
  assert.equal(missing.body.code,'unknown-entry');
  assert.equal((await post(url,'/api/start',{entryId:'entry-local',publisherApproved:true})).status,400);
  const s=(await start(url,'entry-local')).body;
  assert.equal((await post(url,'/api/choose',{sessionId:s.sessionId,
   choiceId:'choice-rescue',eventId:randomUUID(),expectedRevision:0,reward:999})).status,400);
  assert.equal((await choose(url,s.sessionId,'choice-rescue',randomUUID(),1)).status,409);
  assert.equal((await choose(url,randomUUID(),'choice-rescue',randomUUID(),0)).status,404);
 });
});

test('G5C-P2 localhost rejects forged Host/Origin, wrong content type and non-routes',async()=>{
 await host(async url=>{
  const denied=await post(url,'/api/start',{entryId:'entry-local'},
   {Origin:'https://evil.example'});
  assert.equal(denied.status,403);assert.equal(denied.body.code,'invalid-origin');
  // Undici fetch replaces Host with the URL host. Use raw HTTP to genuinely
  // send the hostile Host header instead of accidentally testing the normal one.
  const hostileHostStatus=await new Promise((resolve,reject)=>{
   const req=httpRequest(url+'/api/catalog',{headers:{Host:'evil.example'}},res=>{
    res.resume();res.on('end',()=>resolve(res.statusCode));
   });req.on('error',reject);req.end();
  });
  assert.equal(hostileHostStatus,403);
  assert.equal((await fetch(url+'/not-an-api')).status,404);
  const wrong=await fetch(url+'/api/start',{method:'POST',headers:{Origin:url,
   'Content-Type':'text/plain'},body:'{}'});
  assert.equal(wrong.status,400);
 });
});

test('G5C-P2 previous browser session never survives server restart',async()=>{
 const first=await createOfflineRoleplayBrowserServer();
 let oldSession;
 try{oldSession=(await start(first.url,'entry-local')).body.sessionId;}
 finally{await first.close();}
 await host(async url=>{
  const result=await choose(url,oldSession,'choice-rescue',randomUUID(),0);
  assert.equal(result.status,404);assert.equal(result.body.code,'unknown-session');
 });
});

test('G5C-P2 remains an unlinked local host: not an imported Worker or public page',()=>{
 const server=readFileSync(new URL('../../tools/vangioi/author-roleplay-browser-server.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('../../tools/vangioi/author-roleplay-browser-page.mjs',import.meta.url),'utf8');
 assert.match(server,/const HOST='127\.0\.0\.1'/);
 for(const bad of ['firebase-admin','wrangler deploy','firestore.rules','localStorage','indexedDB'])
  assert.equal((server+page).includes(bad),false);
 for(const path of ['../src/index.mjs','../../js/vangioi-creator.js']){
  const source=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.equal(source.includes('author-roleplay-browser'),false);
 }
});
