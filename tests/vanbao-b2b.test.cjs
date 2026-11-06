'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const e=require('../js/vanbao-chess-f44'),m=require('../js/vanbao-puzzle-model-f45'),a=require('../js/vanbao-puzzle-generator-f45'),g=require('../js/vanbao-motif-generator-f45b2b'),t=require('../js/vanbao-tactics-f45b2b'),{JobQueue}=require('../js/vanbao-job-queue-f45b2b');
const seed=n=>n.toString(16).padStart(64,'0'),req=(motif='LINEAR_FORK',n=0,extra={})=>({seed:seed(n),motif,...extra});
test('B2B five motifs have independently verified examples and distinguishable structural fingerprints',()=>{
  const fingerprints=new Set();for(const motif of Object.keys(g.STEMS)){const r=g.generate(req(motif));assert.equal(r.status,'CERTIFIED',motif);const p=r.puzzle;assert.ok(m.valid(p.board));assert.ok(e.verifyProof(p.board,p.proof));assert.ok(g.verifyRecord(p).ok);assert.equal(p.tactical.motif,motif);assert.ok(!fingerprints.has(p.tactical.key));fingerprints.add(p.tactical.key);}
  assert.equal(fingerprints.size,5);
});
test('B2B parry motif has exactly one O winning point and loses immediately on ignoring it',()=>{
  for(let n=0;n<8;n++){const p=g.generate(req('PARRY_FORK',n)).puzzle;assert.ok(p);assert.deepEqual(m.immediate(p.board,'O'),[p.proof.move]);const other=m.legal(p.board).find(i=>i!==p.proof.move),r=t.proveRoot(p.board,other,2,t.budget());assert.equal(r.status,'PROVEN_LOSS');const b=p.board.slice();b[other]='X';b[r.countermove]='O';assert.ok(m.winners(b).has('O'));}
});
test('B2B chain is a forced block followed by a fork, not a renamed two-move fork',()=>{const p=g.generate(req('FORCING_CHAIN')).puzzle;assert.equal(p.horizon,3);assert.equal(p.experimentalBand,'UNRATED');assert.equal(p.proof.threats.length,1);assert.ok(p.proof.reply.threats.length>=2);assert.equal(m.verifyPolicy(p.board,p.proof,2).ok,false);assert.equal(m.verifyPolicy(p.board,{move:p.proof.move},3).ok,false);});
test('B2B fingerprint is invariant for D4 board AND corresponding proof coordinates',()=>{
  const p=g.generate(req('FORCING_CHAIN')).puzzle;
  for(let f=0;f<2;f++)for(let r=0;r<4;r++){
    const index=i=>{const marker=Array(81).fill('');marker[i]='X';return m.transform(marker,f,r).indexOf('X');};
    const convert=x=>{if(!x)return x;const y={...x,move:index(x.move)};if(x.threats)y.threats=x.threats.map(index).sort((a,b)=>a-b);if(x.reply)y.reply=convert(x.reply);if(x.children)y.children=Object.fromEntries(Object.entries(x.children).map(([o,c])=>[index(Number(o)),convert(c)]));return y;};
    const b=m.transform(p.board,f,r),proof=convert(p.proof);assert.ok(e.verifyProof(b,proof));assert.equal(t.fingerprint(b,proof).key,p.tactical.key);
  }
});
test('B2B distinguishes exact/D4 duplicate filtering from tactical similarity filtering',()=>{
  const request=req('LINEAR_FORK',0,{config:{attemptLimit:1}}),p=g.generate(request).puzzle;
  const exact=g.generate({...request,excludeExactKeys:[p.exact]});assert.equal(exact.status,'EXHAUSTED');assert.equal(exact.stats.duplicate,1);
  const symmetry=g.generate({...request,excludeCanonicalKeys:[m.canonical(m.transform(p.board,1,2))]});assert.equal(symmetry.status,'EXHAUSTED');
  const similar=g.generate({...request,excludeFingerprints:[p.tactical.key]});assert.equal(similar.status,'EXHAUSTED');assert.equal(similar.stats.tacticalDuplicate,1);
  const noise=g.generate(req('LINEAR_FORK',1)).puzzle;assert.notEqual(noise.canonical,p.canonical);assert.equal(noise.tactical.key,p.tactical.key);
});
test('B2B old version dispatch preserves B2A full golden vector byte-for-byte',()=>{const vectors=require('./fixtures/vanbao-f45-seeds.json'),request={seed:seed(0),difficulty:'EASY',generatorVersion:a.VERSION},r=g.generate(request);assert.deepEqual(r,a.generate(request));assert.equal(m.digest(m.stable(r)),vectors.seed0EasyResultHash);assert.ok(g.verifyRecord(r.puzzle).ok);});
test('B2B deterministic process replay and invalid/version/budget inputs',()=>{
  const p=g.generate(req());assert.deepEqual(g.generate(req()),p);const script="console.log(JSON.stringify(require('./js/vanbao-motif-generator-f45b2b').generate({seed:'0'.repeat(64),motif:'LINEAR_FORK'})))",run=()=>cp.execFileSync(process.execPath,['-e',script],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});assert.equal(run(),run());assert.equal(JSON.parse(run()).puzzle.boardHash,p.puzzle.boardHash);
  for(const request of [{seed:'wrong'},req('fake'),req('LINEAR_FORK',0,{generatorVersion:'bad'}),req('LINEAR_FORK',0,{config:{nodeBudget:50001}}),req('LINEAR_FORK',0,{excludeFingerprints:Array(5001).fill('x')})])assert.equal(g.generate(request).status,'INVALID_REQUEST');
  assert.equal(g.generate(req('LINEAR_FORK',0,{config:{nodeBudget:0}})).status,'UNKNOWN_BUDGET');assert.equal(g.generate(req('LINEAR_FORK',0,{config:{attemptLimit:0}})).status,'EXHAUSTED');assert.equal(g.generate({seed:seed(0),difficulty:'MASTER'}).status,'NO_CONTENT');
});
test('B2B clock and Math.random do not decide the new generator output',()=>{const random=Math.random,now=Date.now;try{Math.random=()=>{throw Error('random forbidden');};Date.now=()=>0;const a=g.generate(req());Date.now=()=>123456;assert.deepEqual(g.generate(req()),a);}finally{Math.random=random;Date.now=now;}});
test('B2B census constrains each opening even when B1 immediate shortcut ignores rootMoves',()=>{
  const p=g.generate(req('FINISH_FIVE')).puzzle,c=t.census(p.board,{horizon:1});assert.equal(c.totalLegal,m.legal(p.board).length);assert.deepEqual(c.winningRoots,c.immediateWins);assert.ok(c.rows.some(r=>r.status==='UNPROVEN'));assert.equal(c.complete,false);
});
test('B2B census five motif roots retain all independently verified forced policies',()=>{for(const motif of Object.keys(g.STEMS)){const p=g.generate(req(motif)).puzzle,r=t.proveRoot(p.board,p.proof.move,p.horizon,t.budget());assert.equal(r.status,'PROVEN_WIN',motif);assert.equal(r.proof.move,p.proof.move);assert.ok(m.verifyPolicy(p.board,r.proof,p.horizon).ok);}});
test('B2B small-tree census proves draw and final-stone win with no vacuous proof',()=>{
  const draw=Array.from({length:81},(_,i)=>(Math.floor(i/9)+2*(i%9))%4<2?'X':'O');draw[80]='';const c=t.census(draw);assert.equal(c.status,'COMPLETE');assert.equal(c.rows[0].status,'PROVEN_DRAW');
  const win=[...'OXXXOXXOXOOXOXXOXXXOXOOXXOXOOOXXOOOXXXOOOXXOOOXXXXOOOOOOXXOOXXOXOXXOOXOOXXXXOOOXX'];win[65]='';assert.equal(t.census(win).rows[0].status,'PROVEN_WIN');
  assert.equal(g.verifyRecord({...g.generate(req()).puzzle,board:draw}).ok,false);
});
test('B2B census invalid, incomplete root/depth budgets and cancellation are explicit',()=>{
  assert.equal(t.census(Array(81)).status,'INVALID');const p=g.generate(req('FORCING_CHAIN')).puzzle;
  const c=t.census(p.board,{maxRoots:2});assert.ok(c.unresolvedRoots>0);assert.equal(c.complete,false);assert.equal(c.evaluatedRoots,2);
  const zero=t.census(p.board,{nodeBudget:0});assert.equal(zero.winningRoots.length,0);assert.equal(zero.unresolvedRoots,zero.totalLegal);
  assert.equal(t.proveRoot(p.board,p.proof.move,2,t.budget()).status,'UNPROVEN');assert.equal(t.census(p.board,{signal:{aborted:true}}).status,'CANCELLED');
});
test('B2B altered/missing proof, hash, fingerprint and band cannot be verified',()=>{const p=g.generate(req('FORCING_CHAIN')).puzzle;for(const x of [{proof:{move:p.proof.move}},{proofHash:'bad'},{tactical:{key:'bad'}},{experimentalBand:'MASTER'},{generatorVersion:'unknown'}])assert.equal(g.verifyRecord({...p,...x}).ok,false);});
test('B2B bounded queue rejects overflow and cancels before execution',async()=>{
  const q=new JobQueue(),active=new AbortController(),queued=new AbortController();
  const first=q.submit({kind:'generate',request:req()},{signal:active.signal,timeoutMs:10000});
  const second=q.submit({kind:'generate',request:req()},{signal:queued.signal});const third=q.submit({kind:'generate',request:req()});
  assert.equal((await q.submit({kind:'generate',request:req()})).status,'QUEUE_FULL');queued.abort();assert.equal((await second).status,'CANCELLED');active.abort();assert.equal((await first).status,'CANCELLED');
  assert.equal((await third).status,'CERTIFIED');assert.equal(q.state.maxActive,1);assert.ok(q.state.maxQueued<=2);assert.equal(q.state.started,q.state.terminated);await q.close();
});
test('B2B worker successful job reports separate startup/generation/verification and sampled memory',async()=>{
  const q=new JobQueue(),r=await q.submit({kind:'generate',request:req('FORCING_CHAIN')},{timeoutMs:10000});assert.equal(r.status,'CERTIFIED');assert.ok(r.jobMetrics.startupMs>=0);assert.ok(r.jobMetrics.telemetry.generateMs>=0);assert.equal(r.jobMetrics.telemetry.verified,true);assert.ok(r.jobMetrics.telemetry.samples.some(s=>s.phase==='during-job'));assert.equal(q.state.active,0);await q.close();
});
test('B2B cancellation after actual work progress retains partial telemetry and returns no success',async()=>{
  const q=new JobQueue(),controller=new AbortController();const r=await q.submit({kind:'generate',request:req('FORCING_CHAIN')},{signal:controller.signal,timeoutMs:10000,onProgress:()=>controller.abort()});
  assert.equal(r.status,'CANCELLED');assert.equal(r.puzzle,undefined);assert.ok(r.jobMetrics.partialWorkerSamples.some(s=>s.units>=32));assert.equal(q.state.started,q.state.terminated);await q.close();
});
test('B2B timeout, immediate running cancel, close and repeated termination never return late successes',async()=>{
  const q=new JobQueue();assert.equal((await q.submit({kind:'generate',request:req()},{timeoutMs:0})).status,'TIMEOUT');
  for(let i=0;i<4;i++){const a=new AbortController(),job=q.submit({kind:'generate',request:req()},{signal:a.signal});a.abort();const r=await job;assert.equal(r.status,'CANCELLED');assert.equal(r.puzzle,undefined);}
  await q.close();assert.equal((await q.submit({kind:'generate',request:req()})).status,'CANCELLED');assert.equal(q.state.active,0);assert.equal(q.state.queued,0);assert.equal(q.state.started,q.state.terminated);
});
test('B2B only new offline modules: B1/B2A/bank golden source blobs and website remain unchanged',()=>{
  const files=['js/vanbao-chess-f44.js','tests/vanbao-proof-b1.test.cjs','js/vanbao-puzzle-generator-f45.js','js/vanbao-puzzle-model-f45.js','js/vanbao-puzzle-worker-f45.js','tests/fixtures/vanbao-f45-seeds.json','js/vanbao-puzzles-f44.js','index.html'];
  for(const f of files){const run=args=>cp.execFileSync('git',['--no-optional-locks',...args],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'}).trim();assert.equal(run(['hash-object',f]),run(['rev-parse','dc8df5d:'+f]),f);}
});
