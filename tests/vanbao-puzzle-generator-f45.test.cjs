'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const g=require('../js/vanbao-puzzle-generator-f45.js'),m=require('../js/vanbao-puzzle-model-f45.js'),e=require('../js/vanbao-chess-f44.js'),bank=require('../js/vanbao-puzzles-f44.js'),{generateWithDeadline}=require('../js/vanbao-puzzle-worker-f45.js');
const seed=n=>n.toString(16).padStart(64,'0'),request=(n=0,extra={})=>({seed:seed(n),difficulty:'EASY',...extra});
test('B2A deterministic byte-identical output and golden hash',()=>{const a=g.generate(request()),b=g.generate(request()),vectors=require('./fixtures/vanbao-f45-seeds.json');assert.equal(m.stable(a),m.stable(b));assert.equal(a.status,'CERTIFIED');assert.equal(a.puzzle.boardHash,vectors.seed0EasyBoardHash);assert.equal(m.digest(m.stable(a)),vectors.seed0EasyResultHash);});
test('B2A independent process replay has identical output',()=>{const run=()=>cp.execFileSync(process.execPath,['-e',"console.log(JSON.stringify(require('./js/vanbao-puzzle-generator-f45').generate({seed:'0'.repeat(64),difficulty:'EASY'})))"],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8'});assert.equal(run(),run());});
test('B2A rejects invalid seed, version, configuration and oversized exclusion input',()=>{
  for(const r of [{seed:'1'},{seed:'A'.repeat(64)},request(0,{generatorVersion:'future'}),request(0,{ruleset:'renju'}),request(0,{config:{attemptLimit:65}}),request(0,{config:{nodeBudget:Infinity}}),request(0,{config:{horizon:0}}),request(0,{config:{unknown:1}}),request(0,{excludeCanonicalKeys:Array(5001).fill('x')}),request(0,{excludeCoreKeys:['x'.repeat(513)]})])assert.equal(g.generate(r).status,'INVALID_REQUEST');
});
test('B2A randomness is seeded; wall clock does not choose a puzzle',()=>{const random=Math.random,now=Date.now;try{Math.random=()=>{throw Error('unseeded RNG');};Date.now=()=>0;const a=g.generate(request());Date.now=()=>1e12;assert.deepEqual(g.generate(request()),a);}finally{Math.random=random;Date.now=now;}});
test('B2A invalid boards and wrong turn fail independent validation',()=>{
  for(const b of [Array(81),Array(80).fill(''),Array(81).fill('Z'),['X',...Array(80).fill('')]])assert.equal(m.valid(b),false);
  assert.equal(m.valid(e.empty(),'O'),false);const both=e.empty();for(let i=0;i<5;i++){both[i]='X';both[i+9]='O';}assert.equal(m.valid(both),false);
});
test('B2A all eight D4 transforms share canonical key; colors/turn/rules do not',()=>{const b=g.generate(request()).puzzle.board,key=m.canonical(b);for(let f=0;f<2;f++)for(let r=0;r<4;r++)assert.equal(m.canonical(m.transform(b,f,r)),key);assert.notEqual(m.canonical(b,'O'),key);assert.notEqual(m.canonical(b,'X','renju'),key);assert.notEqual(m.canonical(b.map(v=>v==='X'?'O':v==='O'?'X':'')),key);});
test('B2A excludes exact and symmetry duplicates, and tracks per-request repeats',()=>{
  const first=g.generate(request(0,{config:{attemptLimit:1}})).puzzle,key=first.canonical;
  const excluded=g.generate(request(0,{excludeCanonicalKeys:[m.canonical(m.transform(first.board,1,1))],config:{attemptLimit:1}}));assert.equal(excluded.status,'EXHAUSTED');assert.equal(excluded.stats.rejected.duplicate,1);
  const next=g.generate(request(0,{excludeCanonicalKeys:[key],config:{attemptLimit:1}}));assert.equal(next.status,'EXHAUSTED');
});
test('B2A core filtering recognizes noise variants rather than counting them as new motifs',()=>{
  const a=g.generate(request(0)).puzzle,b=g.generate(request(4)).puzzle;assert.equal(a.coreKey,b.coreKey);
  const result=g.generate(request(0,{excludeCoreKeys:[a.coreKey],config:{attemptLimit:1}}));assert.equal(result.status,'EXHAUSTED');assert.equal(result.stats.rejected.coreDuplicate,1);
});
test('B2A repeated candidate stream is rejected within a request rather than looping',()=>{
  const vm=require('node:vm'),{createRequire}=require('node:module'),file=require.resolve('../js/vanbao-puzzle-generator-f45.js'),local=createRequire(file);
  const cryptoStub={createHash:()=>({update(){return this;},digest(){return Buffer.alloc(32);}})};
  const context={module:{exports:{}},Buffer,require:name=>name==='node:crypto'?cryptoStub:local(name)};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
  const r=context.module.exports.generate(request(0,{config:{horizon:1}}));
  assert.equal(r.status,'EXHAUSTED');assert.equal(r.stats.attempts,8);assert.equal(r.stats.rejected.duplicate,7);
});
test('B2A default generated output never matches the 12 curated canonical boards',()=>{const known=new Set(bank.map(p=>m.canonical(p.board)));for(let i=0;i<24;i++){const r=g.generate(request(i));if(r.status==='CERTIFIED'){assert.ok(!known.has(r.puzzle.canonical));assert.ok(e.verifyProof(r.puzzle.board,r.puzzle.proof));assert.ok(m.verifyRecord(r.puzzle).ok);}}});
test('B2A draw is never a proof, including a last empty square',()=>{const b=Array.from({length:81},(_,i)=>(Math.floor(i/9)+2*(i%9))%4<2?'X':'O');b[80]='';assert.equal(m.valid(b),true);assert.equal(m.verifyPolicy(b,{move:80},3).ok,false);assert.equal(e.prove(b,3,[80]),null);});
test('B2A last stone win is accepted before full-board draw',()=>{const b=[...'OXXXOXXOXOOXOXXOXXXOXOOXXOXOOOXXOOOXXXOOOXXOOOXXXXOOOOOOXXOOXXOXOXXOOXOOXXXXOOOXX'];b[65]='';assert.equal(m.verifyPolicy(b,{move:65},1).ok,true);});
test('B2A tampered hashes, rules, versions, board, moves and proof branches rejected',()=>{
  const p=g.generate(request()).puzzle;
  for(const patch of [{boardHash:'bad'},{proofHash:'bad'},{canonical:'bad'},{coreKey:'bad'},{generatorVersion:'future'},{verifierVersion:'old'},{difficultySpecVersion:'other'},{turn:'O'},{ruleset:'renju'},{proof:{move:-1}}])assert.equal(m.verifyRecord({...p,...patch}).ok,false);
  const forged=structuredClone(p.proof);forged.children={};forged.threats=[];forged.move=m.legal(p.board).find(x=>x!==p.proof.move&&m.verifyPolicy(p.board,{move:x},2).ok===false);assert.equal(m.verifyPolicy(p.board,forged,2).ok,false);
  const cyclic={move:p.proof.move};cyclic.children={0:cyclic};assert.equal(m.verifyRecord({...p,proof:cyclic}).ok,false);
  assert.equal(m.verifyPolicy(bank[8].board,{move:bank[8].proof.move},3).ok,false,'missing non-immediate continuation');
});
test('B2A all curated policies independently verify without mutating old bank',()=>{const before=JSON.stringify(bank);for(const p of bank)assert.ok(m.verifyPolicy(p.board,p.proof,p.expectedMoves).ok,p.id);assert.equal(JSON.stringify(bank),before);});
test('B2A node and attempt caps produce no unproven successes',()=>{
  for(const budget of [0,1,10,20]){const r=g.generate(request(0,{config:{nodeBudget:budget}}));assert.equal(r.status,'UNKNOWN_BUDGET');assert.ok(r.stats.workUnits<=budget);assert.ok(!r.puzzle);}
  const r=g.generate(request(0,{config:{attemptLimit:0}}));assert.equal(r.status,'EXHAUSTED');assert.equal(r.stats.attempts,0);
});
test('B2A proof byte cap, finite depth and independent-verifier budget cannot certify',()=>{
  assert.notEqual(g.generate(request(0,{config:{maxProofBytes:0}})).status,'CERTIFIED');
  assert.notEqual(g.generate(request(0,{config:{horizon:1}})).status,'CERTIFIED');
  const p=g.generate(request()).puzzle;assert.equal(m.verifyPolicy(p.board,p.proof,2,()=>false).reason,'UNKNOWN_BUDGET');assert.equal(m.verifyPolicy(p.board,p.proof,1).ok,false);
});
test('B2A synchronous cancellation and external deadline are distinct, never fallback',()=>{assert.equal(g.generate(request(0,{fallback:true}),{signal:{aborted:true}}).status,'CANCELLED');assert.equal(g.generate(request(0,{fallback:true}),{shouldStop:()=>true}).status,'TIMEOUT');let reads=0;const r=g.generate(request(),{signal:{get aborted(){return ++reads>30;}}});assert.equal(r.status,'CANCELLED');});
test('B2A fallback is explicit, certified, same requested band, and respects exclusions',()=>{
  const r=g.generate(request(0,{config:{attemptLimit:0},fallback:true}));assert.equal(r.status,'FALLBACK');assert.equal(r.puzzle.source,'CURATED_FALLBACK');assert.ok(m.verifyRecord(r.puzzle).ok);assert.equal(r.stats.fallbacks,1);
  const none=g.generate(request(0,{config:{attemptLimit:0},fallback:true,excludeCanonicalKeys:bank.map(p=>m.canonical(p.board))}));assert.equal(none.status,'EXHAUSTED');
  for(const difficulty of ['MEDIUM','HARD','MASTER','DUEL'])assert.equal(g.generate(request(0,{difficulty,fallback:true})).status,'NO_CONTENT');
});
test('B2A experimental difficulty is based on actual immediate-win census and proof depth',()=>{
  for(const difficulty of ['NOVICE','EASY']){const p=g.generate(request(1,{difficulty})).puzzle;assert.ok(p);const metrics=p.metrics;assert.equal(metrics.experimentalBand,difficulty);assert.equal(metrics.rootCountH1Complete,true);assert.equal(metrics.rootCountAtUpperH,'NOT_ENUMERATED');assert.equal(metrics.noWinThroughH,difficulty==='NOVICE'?0:1);assert.equal(p.horizon,difficulty==='NOVICE'?1:2);}
});
test('B2A no account/profile mutation and no runtime wiring',()=>{const profile={currency:17,exp:23,inventory:[{id:'old'}]},before=structuredClone(profile);g.generate(request(0,{profile}));assert.deepEqual(profile,before);const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');assert.doesNotMatch(html,/vanbao-puzzle-(?:generator|model|worker)-f45/);});
test('B2A offline worker replay agrees with pure generator',async()=>{assert.deepEqual(await generateWithDeadline(request(),{timeoutMs:10000}),g.generate(request()));});
test('B2A offline worker deadline/cancellation terminate without a puzzle',async()=>{
  assert.equal((await generateWithDeadline(request(),{timeoutMs:0})).status,'TIMEOUT');const abort=new AbortController();abort.abort();assert.equal((await generateWithDeadline(request(),{signal:abort.signal})).status,'CANCELLED');
  const running=new AbortController(),promise=generateWithDeadline(request(),{signal:running.signal});running.abort();assert.equal((await promise).status,'CANCELLED');
  assert.equal((await generateWithDeadline({...request(),bad:()=>{}})).status,'INVALID_REQUEST');
});
