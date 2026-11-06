'use strict';
const e=require('./vanbao-chess-f44.js'),m=require('./vanbao-puzzle-model-f45.js');
const VERSION='f45b2b-tactical-summary-v1';
function axes(board,targets){const set=new Set();for(const line of e.lines){const gaps=line.filter(i=>board[i]==='');if(gaps.length===1&&targets.includes(gaps[0])&&line.filter(i=>board[i]==='X').length===4){const d=line[1]-line[0];set.add(d===1?'0,1':d===9?'1,0':d===10?'1,1':'1,-1');}}return[...set].map(s=>s.split(',').map(Number));}
function fingerprint(board,proof){
  function walk(b,p,depth){if(!p||depth>3)return{invalid:true};const danger=m.immediate(b,'O').length,c=b.slice();c[p.move]='X';const targets=m.immediate(c,'X'),directions=axes(c,targets),relations=[];
    for(let i=0;i<directions.length;i++)for(let j=i+1;j<directions.length;j++){const a=directions[i],d=directions[j];relations.push(a[0]*d[0]+a[1]*d[1]===0?'ORTHOGONAL':'OBLIQUE');}
    const terminal=m.winners(c).has('X'),classes=new Set();let reply=null;
    if(!terminal)for(const o of m.legal(c)){const d=c.slice();d[o]='O';if(m.winners(d).has('O'))classes.add('O_WIN');else if(!m.legal(d).length)classes.add('DRAW');else if(m.immediate(d,'X').length)classes.add('IMMEDIATE_X_REPLY');else classes.add('NEEDS_CONTINUATION');}
    if(targets.length===1&&p.reply){const d=c.slice();d[targets[0]]='O';reply=walk(d,p.reply,depth+1);}
    return{terminal,dangerBefore:danger,winningTargets:terminal?0:targets.length,axisCount:terminal?0:directions.length,axisRelations:terminal?[]:relations.sort(),responseClasses:[...classes].sort(),forcedContinuation:reply};
  }
  const structure=walk(board,proof,1),depth=proof.moves||1;let motif='UNCLASSIFIED';
  if(structure.terminal)motif='FINISH_FIVE';
  else if(depth===2&&structure.dangerBefore===1&&structure.winningTargets>=2)motif='PARRY_FORK';
  else if(depth===2&&structure.dangerBefore===0&&structure.winningTargets>=2&&structure.axisCount===1)motif='LINEAR_FORK';
  else if(depth===2&&structure.dangerBefore===0&&structure.winningTargets>=2&&structure.axisCount>=2)motif='CROSS_DOUBLE_FOUR';
  else if(depth===3&&structure.dangerBefore===0&&structure.winningTargets===1&&structure.forcedContinuation?.winningTargets>=2)motif='FORCING_CHAIN';
  const abstract={version:VERSION,depth,structure};return{key:m.digest(m.stable(abstract)),motif,abstract,warning:'Similarity descriptor, not a proof of tactical equivalence'};
}
function budget(limit=50000,signal,observer){let units=0,exhausted=false;return{get units(){return units;},get exhausted(){return exhausted;},spend(){if(signal?.aborted||units>=limit){exhausted=true;return false;}units++;observer?.(units);return true;}};}
// Root-constrained adapter, because B1 prove's immediate-win shortcut may ignore
// rootMoves. Never credit a certificate for a different opening.
function proveRoot(board,move,horizon,ctx){
  const spend=()=>ctx.spend();if(!spend())return{status:'UNKNOWN_BUDGET'};
  if(!m.valid(board)||!m.legal(board).includes(move)||!Number.isInteger(horizon)||horizon<1||horizon>3)return{status:'INVALID'};
  const b=board.slice();b[move]='X';
  if(m.winners(b).has('X'))return{status:'PROVEN_WIN',proof:{move,finish:true,moves:1}};
  if(!m.legal(b).length)return{status:'PROVEN_DRAW',evidence:'last-stone draw'};
  const counters=m.immediate(b,'O');if(counters.length)return{status:'PROVEN_LOSS',countermove:counters[0],evidence:'O wins immediately'};
  if(horizon===1)return{status:'UNPROVEN',reason:'no immediate X win; no full-game loss claim'};
  const threats=m.immediate(b,'X');let proof;
  if(threats.length>=2)proof={move,moves:2,threats};
  else if(threats.length===1){b[threats[0]]='O';const reply=e.prove(b,horizon-1,null,{maxNodes:50000,signal:{get aborted(){return !spend();}}});if(reply)proof={move,moves:1+reply.moves,threats,reply};}
  if(!proof)return{status:ctx.exhausted?'UNKNOWN_BUDGET':'UNPROVEN',reason:'forcing adapter incomplete (quiet AND branches not searched)'};
  if(!e.verifyProof(board,proof,{maxNodes:50000,signal:{get aborted(){return !spend();}}})||!m.verifyPolicy(board,proof,horizon,spend).ok)return{status:ctx.exhausted?'UNKNOWN_BUDGET':'UNPROVEN'};
  return{status:'PROVEN_WIN',proof};
}
function exactValue(board,side,ctx){if(!ctx.spend())return null;const w=m.winners(board);if(w.has('X'))return 1;if(w.has('O'))return -1;const moves=m.legal(board);if(!moves.length)return 0;let best=side==='X'?-1:1,unknown=false;
  for(const i of moves){const b=board.slice();b[i]=side;const v=exactValue(b,side==='X'?'O':'X',ctx);if(v===null){unknown=true;continue;}best=side==='X'?Math.max(best,v):Math.min(best,v);if(side==='X'&&v===1||side==='O'&&v===-1)return v;}return unknown?null:best;
}
function census(board,{horizon=3,nodeBudget=50000,maxRoots=81,signal,observer}={}){
  if(!m.valid(board)||!Number.isInteger(horizon)||horizon<1||horizon>3||!Number.isInteger(nodeBudget)||nodeBudget<0||nodeBudget>50000||!Number.isInteger(maxRoots)||maxRoots<0||maxRoots>81)return{status:'INVALID'};
  const ctx=budget(nodeBudget,signal,observer),legal=m.legal(board),rows=[];
  for(const move of legal){let result;
    if(rows.length>=maxRoots||ctx.exhausted||signal?.aborted)result={status:'UNKNOWN_BUDGET'};
    else if(legal.length<=5){const b=board.slice();b[move]='X';const v=exactValue(b,'O',ctx);result=v===null?{status:'UNKNOWN_BUDGET'}:{status:v===1?'PROVEN_WIN':v===-1?'PROVEN_LOSS':'PROVEN_DRAW',evidence:'exhaustive small remaining tree'};}
    else result=proveRoot(board,move,horizon,ctx);
    rows.push({move,...result});
  }
  const unresolved=rows.filter(r=>['UNPROVEN','UNKNOWN_BUDGET'].includes(r.status)).length;
  return{status:signal?.aborted?'CANCELLED':unresolved?'INCOMPLETE':'COMPLETE',horizon,totalLegal:legal.length,immediateWins:m.immediate(board,'X'),winningRoots:rows.filter(r=>r.status==='PROVEN_WIN').map(r=>r.move),unresolvedRoots:unresolved,evaluatedRoots:rows.filter(r=>r.status!=='UNKNOWN_BUDGET').length,workUnits:ctx.units,rows,complete:unresolved===0,scope:legal.length<=5?'FULL_GAME_SMALL_TREE':'BOUNDED_FORCING_NOT_COMPLETE'};
}
module.exports={VERSION,fingerprint,budget,proveRoot,census};
