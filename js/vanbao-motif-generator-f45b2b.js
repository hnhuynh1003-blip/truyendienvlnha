'use strict';
const crypto=require('node:crypto'),old=require('./vanbao-puzzle-generator-f45.js'),e=require('./vanbao-chess-f44.js'),m=require('./vanbao-puzzle-model-f45.js'),t=require('./vanbao-tactics-f45b2b.js'),bank=require('./vanbao-puzzles-f44.js');
const VERSION='f45b2b-motifs-v1',SPEC='f45b2b-structural-experimental-v1';
const STEMS=Object.freeze({
  FINISH_FIVE:{x:[36,37,38,39],o:[],reserve:[40],depth:1,band:'NOVICE'},
  LINEAR_FORK:{x:[38,39,40],o:[],reserve:[36,37,41,42],depth:2,band:'EASY'},
  CROSS_DOUBLE_FOUR:{x:[37,38,39,13,22,31],o:[36,4],reserve:[40,41,49],depth:2,band:'EASY'},
  PARRY_FORK:{x:[38,39,40],o:[5,14,23,32],reserve:[36,37,41,42],depth:2,band:'EASY'},
  FORCING_CHAIN:{x:[37,38,39,20,30],o:[36],reserve:[40,41,10,50,60,0],depth:3,band:'UNRATED'}
});
for(const s of Object.values(STEMS)){Object.freeze(s.x);Object.freeze(s.o);Object.freeze(s.reserve);Object.freeze(s);}
const known=new Set(bank.map(p=>m.canonical(p.board)));
function seeded(seed,domain,ctx){let block=0,words=[],at=0;return n=>{const bound=Math.floor(4294967296/n)*n;for(;;){if(!ctx.spend())throw Error('STOP');if(at===words.length){const suffix=Buffer.alloc(4);suffix.writeUInt32BE(block++);const d=crypto.createHash('sha256').update(VERSION+'\0'+domain+'\0').update(Buffer.from(seed,'hex')).update(suffix).digest();words=Array.from({length:8},(_,i)=>d.readUInt32BE(i*4));at=0;}const v=words[at++];if(v<bound)return v%n;}};}
function build(motif,rand){const s=STEMS[motif],positions=[...s.x,...s.o,...s.reserve],minR=Math.min(...positions.map(i=>i/9|0)),maxR=Math.max(...positions.map(i=>i/9|0)),minC=Math.min(...positions.map(i=>i%9)),maxC=Math.max(...positions.map(i=>i%9));
  const dr=rand(9-maxR+minR)-minR,dc=rand(9-maxC+minC)-minC,shift=i=>i+dr*9+dc,b=e.empty(),reserved=new Set(s.reserve.map(shift));s.x.forEach(i=>b[shift(i)]='X');s.o.forEach(i=>b[shift(i)]='O');
  const pool=m.legal(b).filter(i=>!reserved.has(i)&&((i/9|0)===0||(i/9|0)===8));
  let x=s.x.length,o=s.o.length;
  // A translated O four has a second winning end. The extra X must cap it;
  // otherwise the position is a two-ended loss rather than a parry puzzle.
  if(motif==='PARRY_FORK'&&dr>0){const cap=(dr-1)*9+5+dc;b[cap]='X';x++;const at=pool.indexOf(cap);if(at>=0)pool.splice(at,1);}
  while(x!==o){if(!pool.length)throw Error('POOL');const i=pool.splice(rand(pool.length),1)[0];if(x<o){b[i]='X';x++;}else{b[i]='O';o++;}}
  return m.transform(b,rand(2),rand(4));
}
function generate(request,control={}){
  if(request?.generatorVersion===old.VERSION)return old.generate(request,control);
  const invalid=()=>({status:'INVALID_REQUEST',generatorVersion:VERSION});
  if(!request||typeof request.seed!=='string'||!/^[0-9a-f]{64}$/.test(request.seed)||request.generatorVersion!==undefined&&request.generatorVersion!==VERSION)return invalid();
  const cfg={attemptLimit:8,nodeBudget:50000,...request.config};if(Object.keys(cfg).some(k=>!['attemptLimit','nodeBudget'].includes(k))||!Number.isInteger(cfg.attemptLimit)||cfg.attemptLimit<0||cfg.attemptLimit>32||!Number.isInteger(cfg.nodeBudget)||cfg.nodeBudget<0||cfg.nodeBudget>50000)return invalid();
  const sets={};for(const key of ['excludeCanonicalKeys','excludeExactKeys','excludeFingerprints']){const xs=request[key]||[];if(!Array.isArray(xs)||xs.length>5000||xs.some(s=>typeof s!=='string'||s.length>512))return invalid();sets[key]=new Set(xs);}
  if(request.motif!==undefined&&!Object.hasOwn(STEMS,request.motif))return invalid();
  if(request.motif&&request.difficulty&&STEMS[request.motif].band!==request.difficulty)return invalid();
  const motifNames=request.motif?[request.motif]:Object.keys(STEMS).filter(k=>!request.difficulty||STEMS[k].band===request.difficulty);
  if(!motifNames.length)return{status:'NO_CONTENT',generatorVersion:VERSION};
  const ctx=t.budget(cfg.nodeBudget,control.signal,control.observer),stats={attempts:0,invalid:0,unproven:0,duplicate:0,tacticalDuplicate:0,motifMismatch:0};
  const result=(status,puzzle)=>({status,generatorVersion:VERSION,seed:request.seed,config:cfg,stats:{...stats,workUnits:ctx.units},...(puzzle?{puzzle}:{})});
  const seen=new Set();
  for(let attempt=0;attempt<cfg.attemptLimit;attempt++){
    if(control.signal?.aborted)return result('CANCELLED');if(!ctx.spend())return result('UNKNOWN_BUDGET');stats.attempts++;
    let board,motif;try{const rand=seeded(request.seed,m.stable({cfg,motifNames,attempt}),ctx);motif=motifNames[rand(motifNames.length)];board=build(motif,rand);}catch{return result(ctx.exhausted?'UNKNOWN_BUDGET':'ERROR');}
    if(!m.valid(board)){stats.invalid++;continue;}
    const canonical=m.canonical(board),exact=m.RULES+'|X|'+board.map(v=>v||'.').join('');if(known.has(canonical)||sets.excludeCanonicalKeys.has(canonical)||sets.excludeExactKeys.has(exact)||seen.has(canonical)){stats.duplicate++;continue;}seen.add(canonical);
    const signal={get aborted(){return !ctx.spend();}},s=STEMS[motif],proof=e.prove(board,s.depth,null,{maxNodes:50000,signal});
    if(!proof||!e.verifyProof(board,proof,{maxNodes:50000,signal})){stats.unproven++;continue;}
    const verified=m.verifyPolicy(board,proof,s.depth,()=>ctx.spend());if(!verified.ok||ctx.exhausted){stats.unproven++;continue;}
    const fp=t.fingerprint(board,proof);if(fp.motif!==motif||verified.stats.maxXDepth!==s.depth){stats.motifMismatch++;continue;}
    if(sets.excludeFingerprints.has(fp.key)){stats.tacticalDuplicate++;continue;}
    return result('CERTIFIED',{source:'GENERATED',ruleset:m.RULES,generatorVersion:VERSION,verifierVersion:m.VERIFIER,difficultySpecVersion:SPEC,turn:'X',motif,experimentalBand:s.band,board,exact,canonical,coreKey:m.coreKey(board),boardHash:m.digest(m.stable(board)),proof,proofHash:m.digest(m.stable(proof)),horizon:s.depth,tactical:fp,verification:verified.stats});
  }
  return result(control.signal?.aborted?'CANCELLED':ctx.exhausted?'UNKNOWN_BUDGET':'EXHAUSTED');
}
function verifyRecord(p,spend=()=>true){
  if(p?.generatorVersion===old.VERSION)return m.verifyRecord(p,spend);
  try{if(p.generatorVersion!==VERSION||p.ruleset!==m.RULES||p.verifierVersion!==m.VERIFIER||p.difficultySpecVersion!==SPEC||!m.valid(p.board,p.turn)||p.canonical!==m.canonical(p.board)||p.coreKey!==m.coreKey(p.board)||p.exact!==m.RULES+'|X|'+p.board.map(v=>v||'.').join('')||p.boardHash!==m.digest(m.stable(p.board))||p.proofHash!==m.digest(m.stable(p.proof)))return{ok:false};
    const verified=m.verifyPolicy(p.board,p.proof,p.horizon,spend),fp=t.fingerprint(p.board,p.proof);return{...verified,ok:verified.ok&&fp.key===p.tactical.key&&fp.motif===p.motif&&STEMS[p.motif]?.band===p.experimentalBand&&STEMS[p.motif]?.depth===p.horizon};
  }catch{return{ok:false};}
}
module.exports={VERSION,SPEC,STEMS,generate,verifyRecord};
