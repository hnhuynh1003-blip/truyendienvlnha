'use strict';
// Pure offline generator. No DOM, account, network, clock or uncontrolled RNG.
const {createHash}=require('node:crypto'),e=require('./vanbao-chess-f44.js'),m=require('./vanbao-puzzle-model-f45.js'),bank=require('./vanbao-puzzles-f44.js');
const VERSION='f45b2a-stems-v1',SPEC='f45b2a-experimental-depth-v1';
const DEFAULTS=Object.freeze({attemptLimit:8,nodeBudget:50000,horizon:2,maxExcludeKeys:5000,maxProofBytes:262144});
const CAPS=Object.freeze({attemptLimit:64,nodeBudget:50000,horizon:3,maxExcludeKeys:5000,maxProofBytes:262144});
const bankKeys=new Set(bank.map(p=>m.canonical(p.board))),bankCores=new Set(bank.map(p=>m.coreKey(p.board)));
function lp(s){const b=Buffer.from(s,'ascii'),n=Buffer.alloc(4);n.writeUInt32BE(b.length);return Buffer.concat([n,b]);}
function stream(seed,config,attempt,spend){let counter=0,words=[],pos=0;
  return n=>{if(!Number.isInteger(n)||n<1||n>0x100000000)throw Error('RNG_DOMAIN');const bound=Math.floor(0x100000000/n)*n;
    for(;;){if(!spend())throw Error('STOP');if(pos===words.length){const a=Buffer.alloc(8);a.writeUInt32BE(attempt,0);a.writeUInt32BE(counter++,4);const d=createHash('sha256').update(Buffer.concat([lp(VERSION),lp(m.RULES),lp(SPEC),lp(m.stable(config)),Buffer.from(seed,'hex'),a])).digest();words=Array.from({length:8},(_,i)=>d.readUInt32BE(i*4));pos=0;}const v=words[pos++];if(v<bound)return v%n;}
  };
}
function candidate(rand,difficulty){
  const b=e.empty(),row=rand(9),col=rand(5),family=rand(2),gap=rand(5);
  if(difficulty==='NOVICE'){for(let k=0;k<5;k++)if(k!==gap)b[row*9+col+k]='X';}
  else if(family===0){const r=rand(9),c=1+rand(4);for(let k=0;k<3;k++)b[r*9+c+k]='X';}
  else{const r=1+rand(7),c=1+rand(7);for(const [dr,dc]of [[-1,0],[1,0],[0,-1],[0,1]])b[(r+dr)*9+c+dc]='X';}
  const n=b.filter(v=>v==='X').length,pool=m.legal(b);for(let k=0;k<n;k++){const at=rand(pool.length),index=pool.splice(at,1)[0];b[index]='O';}
  return{board:m.transform(b,rand(2),rand(4)),family:difficulty==='NOVICE'?'line-gap-4':family===0?'open-three':'cross-fork'};
}
function generate(request,control={}){
  let config,exclude,excludeCore;
  try{if(!request||typeof request.seed!=='string'||!/^[0-9a-f]{64}$/.test(request.seed)||request.generatorVersion!==undefined&&request.generatorVersion!==VERSION||request.ruleset!==undefined&&request.ruleset!==m.RULES)throw Error();
    config={...DEFAULTS,...request.config};for(const key of Object.keys(config))if(!(key in CAPS)||!Number.isInteger(config[key])||config[key]<0||config[key]>CAPS[key])throw Error();if(config.horizon<1)throw Error();
    for(const xs of [request.excludeCanonicalKeys||[],request.excludeCoreKeys||[]])if(!Array.isArray(xs)||xs.length>config.maxExcludeKeys||xs.some(x=>typeof x!=='string'||x.length>512))throw Error();
    exclude=new Set(request.excludeCanonicalKeys||[]);excludeCore=new Set(request.excludeCoreKeys||[]);
  }catch{return{status:'INVALID_REQUEST',generatorVersion:VERSION};}
  const difficulty=request.difficulty||'EASY',stats={attempts:0,workUnits:0,rejected:{invalid:0,duplicate:0,coreDuplicate:0,unproven:0,wrongBand:0,proofSize:0},fallbacks:0};let stop=null;
  const spend=()=>{if(stop)return false;if(control.signal?.aborted){stop='CANCELLED';return false;}if(control.shouldStop?.()){stop='TIMEOUT';return false;}if(stats.workUnits>=config.nodeBudget){stop='UNKNOWN_BUDGET';return false;}stats.workUnits++;return true;};
  const result=(status,extra={})=>({status,generatorVersion:VERSION,ruleset:m.RULES,difficultySpecVersion:SPEC,seed:request.seed,difficulty,config,stats,...extra});
  if(!['NOVICE','EASY'].includes(difficulty))return result('NO_CONTENT');
  if(!spend())return result(stop);
  const seen=new Set(),seenCore=new Set();
  function certify(b,horizon){
    const signal={get aborted(){return !spend();}};
    const proof=e.prove(b,horizon,null,{maxNodes:config.nodeBudget,maxDepth:horizon,signal});
    if(!proof||stop||!e.verifyProof(b,proof,{maxNodes:config.nodeBudget,maxDepth:horizon,signal}))return null;
    const bytes=Buffer.byteLength(m.stable(proof));if(bytes>config.maxProofBytes){stats.rejected.proofSize++;return null;}
    const verification=m.verifyPolicy(b,proof,horizon,spend);if(!verification.ok||stop)return null;
    return{proof,verification,bytes};
  }
  function record(b,c,key,source,extra){const immediate=m.immediate(b,'X');return{source,ruleset:m.RULES,generatorVersion:VERSION,verifierVersion:m.VERIFIER,difficultySpecVersion:SPEC,turn:'X',board:b,canonical:key,coreKey:m.coreKey(b),boardHash:m.digest(m.stable(b)),proof:c.proof,proofHash:m.digest(m.stable(c.proof)),horizon:c.verification.stats.maxXDepth,metrics:{winUpperH:c.verification.stats.maxXDepth,noWinThroughH:immediate.length?0:1,rootWinCountAtH1:immediate.length,rootCountH1Complete:true,rootCountAtUpperH:'NOT_ENUMERATED',opponentResponses:c.verification.stats.opponentResponses,verifierEntries:c.verification.stats.entries,proofBytes:c.bytes,experimentalBand:difficulty,referenceSolveRate:'NOT_MEASURED'},...extra};}
  for(let attempt=0;attempt<config.attemptLimit;attempt++){
    if(!spend())break;stats.attempts++;
    let c;try{c=candidate(stream(request.seed,{...config,difficulty},attempt,spend),difficulty);}catch(err){if(err.message==='STOP')break;return result('ERROR');}
    const b=c.board;if(!m.valid(b)){stats.rejected.invalid++;continue;}
    const key=m.canonical(b),core=m.coreKey(b);
    if(bankKeys.has(key)||exclude.has(key)||seen.has(key)){stats.rejected.duplicate++;continue;}seen.add(key);
    if(excludeCore.has(core)){stats.rejected.coreDuplicate++;continue;}
    const repeatedCore=seenCore.has(core);seenCore.add(core);
    const immediate=m.immediate(b,'X').length;if(difficulty==='NOVICE'&&!immediate||difficulty==='EASY'&&immediate){stats.rejected.wrongBand++;continue;}
    const certificate=certify(b,config.horizon);if(!certificate){stats.rejected.unproven++;if(stop)break;continue;}
    if(certificate.verification.stats.maxXDepth!==(difficulty==='NOVICE'?1:2)){stats.rejected.wrongBand++;continue;}
    return result('CERTIFIED',{puzzle:record(b,certificate,key,'GENERATED',{family:c.family,novelty:{exactNewToF44:true,coreMatchesF44:bankCores.has(core),coreRepeatedWithinRequest:repeatedCore}})});
  }
  if(stop)return result(stop);
  if(request.fallback===true){
    const match=bank.filter(p=>p.difficulty===difficulty&&p.expectedMoves<=config.horizon).sort((a,b)=>a.id.localeCompare(b.id,'en'));
    for(const p of match){if(!spend())break;const key=m.canonical(p.board);if(exclude.has(key)||excludeCore.has(m.coreKey(p.board)))continue;
      const c=certify(p.board,config.horizon);if(c){stats.fallbacks++;return result('FALLBACK',{puzzle:record(p.board.slice(),c,key,'CURATED_FALLBACK',{curatedId:p.id})});}
    }if(stop)return result(stop);
  }
  return result('EXHAUSTED');
}
module.exports={VERSION,SPEC,DEFAULTS,CAPS,generate};
