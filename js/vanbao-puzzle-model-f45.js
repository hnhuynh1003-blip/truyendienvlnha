'use strict';
// Offline Node model. Intentionally independent of the F44 solver geometry.
const {createHash}=require('node:crypto');
const RULES='freestyle9x9-v1',VERIFIER='f45b2a-ray-policy-v1';
const digest=s=>createHash('sha256').update(s).digest('hex');
function stable(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(stable).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';}
const legal=b=>Array.from({length:81},(_,i)=>i).filter(i=>b[i]==='');
function winners(b){const found=new Set();for(let r=0;r<9;r++)for(let c=0;c<9;c++)for(const [dr,dc]of [[0,1],[1,0],[1,1],[1,-1]]){const p=b[r*9+c];if(!p)continue;let n=1;while(n<5){const rr=r+dr*n,cc=c+dc*n;if(rr<0||rr>8||cc<0||cc>8||b[rr*9+cc]!==p)break;n++;}if(n===5)found.add(p);}return found;}
function valid(b,turn='X'){return turn==='X'&&Array.isArray(b)&&b.length===81&&Array.from(b).every(v=>v===''||v==='X'||v==='O')&&b.filter(v=>v==='X').length===b.filter(v=>v==='O').length&&winners(b).size===0;}
function transform(b,flip,rot){const out=Array(81).fill('');for(let r=0;r<9;r++)for(let c=0;c<9;c++){let x=r,y=flip?8-c:c;for(let i=0;i<rot;i++)[x,y]=[y,8-x];out[x*9+y]=b[r*9+c];}return out;}
function canonical(b,turn='X',rules=RULES){const forms=[];for(let f=0;f<2;f++)for(let r=0;r<4;r++)forms.push(transform(b,f,r).map(v=>v||'.').join(''));return rules+'|'+turn+'|'+forms.sort()[0];}
// Conservative motif descriptor: normalized X footprint, ignoring O background.
// This marks noise variants; it does NOT prove general tactical equivalence.
function coreKey(b){const forms=[];for(let f=0;f<2;f++)for(let r=0;r<4;r++){const a=transform(b,f,r),points=a.flatMap((v,i)=>v==='X'?[[i/9|0,i%9]]:[]);const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));forms.push(points.map(p=>[p[0]-x,p[1]-y].join(',')).sort().join(';'));}return RULES+'|X|core:'+forms.sort()[0];}
function immediate(b,p){return legal(b).filter(m=>{const c=b.slice();c[m]=p;return winners(c).has(p);});}
function verifyPolicy(board,proof,horizon,spend=()=>true){
  const stats={entries:0,opponentResponses:0,winLeaves:0,maxXDepth:0};let reason='INVALID_PROOF';const active=new Set();
  function visit(b,p,depth){
    if(!spend()){reason='UNKNOWN_BUDGET';return false;}stats.entries++;stats.maxXDepth=Math.max(stats.maxXDepth,depth);
    if(depth>horizon||!p||typeof p!=='object'||active.has(p)||!Number.isInteger(p.move)||!legal(b).includes(p.move)||winners(b).size)return false;
    active.add(p);const c=b.slice();c[p.move]='X';
    if(winners(c).has('X')){stats.winLeaves++;active.delete(p);return true;}
    const replies=legal(c);if(!replies.length){active.delete(p);return false;}
    for(const o of replies){if(!spend()){reason='UNKNOWN_BUDGET';active.delete(p);return false;}stats.opponentResponses++;const d=c.slice();d[o]='O';if(winners(d).size||!legal(d).length){active.delete(p);return false;}
      let next=p.children?.[o]||(p.threats?.length===1&&o===p.threats[0]?p.reply:null);
      // F44 certificate convention allows implicit immediate-X replies. Discover
      // them independently; never trust a threat/finish flag as evidence.
      if(!next){const m=immediate(d,'X')[0];if(m===undefined){active.delete(p);return false;}next={move:m};}
      if(!visit(d,next,depth+1)){active.delete(p);return false;}
    }active.delete(p);return true;
  }
  const ok=valid(board)&&Number.isInteger(horizon)&&horizon>=1&&horizon<=3&&visit(board,proof,1);
  return{ok,reason:ok?'PROVEN_WIN':reason,stats};
}
function verifyRecord(record,spend=()=>true){
  try{if(record.ruleset!==RULES||record.verifierVersion!==VERIFIER||record.generatorVersion!=='f45b2a-stems-v1'||record.difficultySpecVersion!=='f45b2a-experimental-depth-v1'||!valid(record.board,record.turn)||record.canonical!==canonical(record.board)||record.coreKey!==coreKey(record.board)||record.boardHash!==digest(stable(record.board))||record.proofHash!==digest(stable(record.proof)))return{ok:false,reason:'INVALID_RECORD'};
    return verifyPolicy(record.board,record.proof,record.horizon,spend);
  }catch{return{ok:false,reason:'INVALID_RECORD'};}
}
module.exports={RULES,VERIFIER,digest,stable,legal,winners,valid,transform,canonical,coreKey,immediate,verifyPolicy,verifyRecord};
