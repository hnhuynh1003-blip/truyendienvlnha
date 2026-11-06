'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const e=require('../js/vanbao-chess-f44.js');
const fullDraw=()=>Array.from({length:81},(_,i)=>(Math.floor(i/9)+2*(i%9))%4<2?'X':'O');
test('B1 last empty square is a draw, never a winning certificate',()=>{
  const board=fullDraw();board[80]='';
  assert.equal(e.winner(board),null);assert.deepEqual(e.legal(board),[80]);
  assert.equal(e.prove(board,3,[80]),null);
});
test('B1 verifier rejects vacuous proof after last nonwinning move',()=>{
  const board=fullDraw();board[80]='';
  assert.equal(e.verifyProof(board,{move:80,moves:1,children:{}}),false);
});
// Independent oracle: no engine lines, winner, legal, prove or verifyProof calls.
function refWinner(b){
  const found=new Set();
  for(let r=0;r<9;r++)for(let c=0;c<9;c++)for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
    const p=b[r*9+c];if(!p)continue;let n=1;
    while(n<5){const rr=r+dr*n,cc=c+dc*n;if(rr<0||rr>=9||cc<0||cc>=9||b[rr*9+cc]!==p)break;n++;}
    if(n===5)found.add(p);
  }
  return found;
}
const refLegal=b=>Array.from({length:81},(_,i)=>i).filter(i=>b[i]==='');
function oracle(b,turn='X'){
  const won=refWinner(b);if(won.has('X'))return 'win';if(won.has('O'))return 'loss';
  const moves=refLegal(b);if(!moves.length)return 'draw';
  const results=moves.map(m=>{const c=b.slice();c[m]=turn;return oracle(c,turn==='X'?'O':'X');});
  if(turn==='X')return results.includes('win')?'win':results.includes('draw')?'draw':'loss';
  return results.includes('loss')?'loss':results.includes('draw')?'draw':'win';
}
function refVerify(b,p){
  if(refWinner(b).size||!p||!refLegal(b).includes(p.move))return false;
  const c=b.slice();c[p.move]='X';if(refWinner(c).has('X'))return true;
  const replies=refLegal(c);if(!replies.length)return false;
  return replies.every(o=>{
    const d=c.slice();d[o]='O';if(refWinner(d).size)return false;
    let next=p.children?.[o]||(p.threats?.length===1&&o===p.threats[0]?p.reply:null);
    if(!next){const x=refLegal(d).find(m=>{const a=d.slice();a[m]='X';return refWinner(a).has('X');});next={move:x};}
    return refVerify(d,next);
  });
}
const fullWin=()=>[...'OXXXOXXOXOOXOXXOXXXOXOOXXOXOOOXXOOOXXXOOOXXOOOXXXXOOOOOOXXOOXXOXOXXOOXOOXXXXOOOXX'];
test('B1 independent oracle: final move wins before board-full draw check',()=>{
  const b=fullWin();b[65]='';assert.equal(oracle(b),'win');
  const p=e.prove(b,1);assert.equal(p.move,65);assert.ok(e.verifyProof(b,p));assert.ok(refVerify(b,p));
  assert.equal(e.terminalState(fullWin()),'win');assert.equal(e.prove(fullWin()),null);
  assert.equal(e.verifyProof(fullWin(),{move:65}),false);
});
test('B1 terminal contract: ongoing, loss, draw and invalid are separate',()=>{
  assert.equal(e.terminalState(e.empty()),'ongoing');assert.equal(e.terminalState(fullDraw()),'draw');
  const lost=e.empty();[0,1,2,3,4].forEach(i=>lost[i]='O');[9,11,13,15,17].forEach(i=>lost[i]='X');
  assert.equal(oracle(lost),'loss');assert.equal(e.terminalState(lost),'loss');
  assert.equal(e.prove(lost),null);assert.equal(e.verifyProof(lost,{move:18}),false);
  const both=e.empty();[0,1,2,3,4].forEach(i=>both[i]='O');[9,10,11,12,13].forEach(i=>both[i]='X');
  assert.equal(e.terminalState(both),'invalid');assert.equal(e.prove(both),null);assert.equal(e.verifyProof(both,{move:40}),false);
  const postWin=e.empty();[0,1,2,3,4,72,73,74,75,76].forEach(i=>postWin[i]='X');
  [9,11,13,15,17,27,29,31,33].forEach(i=>postWin[i]='O');assert.equal(e.terminalState(postWin),'invalid');
  for(const b of [[],Array(81).fill('Z'),Array(81),['X',...Array(80).fill('O')]]){
    assert.equal(e.terminalState(b),'invalid');assert.equal(e.prove(b),null);assert.equal(e.verifyProof(b,{move:0}),false);
  }
  const wrongTurn=e.empty();wrongTurn[40]='X';assert.equal(e.prove(wrongTurn),null);assert.equal(e.verifyProof(wrongTurn,{move:41}),false);
});
test('B1 independent exhaustive small trees reject all false winning certificates',()=>{
  const source=fullDraw();let checked=0;
  for(let k=0;k<60;k++){
    const b=source.slice(); // start from a full board, remove 3 X and 2 O
    const x=source.flatMap((v,i)=>v==='X'?[i]:[]),o=source.flatMap((v,i)=>v==='O'?[i]:[]);
    for(let j=0;j<3;j++)b[x[(k+j*13)%x.length]]='';
    for(let j=0;j<2;j++)b[o[(k+j*17)%o.length]]='';
    assert.equal(refLegal(b).length,5);
    const expected=oracle(b),p=e.prove(b,3,refLegal(b));
    if(p){assert.equal(expected,'win');assert.ok(refVerify(b,p));assert.ok(e.verifyProof(b,p));}
    else assert.ok(['win','loss','draw'].includes(expected)); // bounded forcing solver is intentionally incomplete
    for(const m of refLegal(b))assert.equal(e.verifyProof(b,{move:m}),refVerify(b,{move:m}));
    checked++;
  }
  assert.equal(checked,60);
});
test('B1 counterattack and false, occupied, out-of-range or cyclic proof rejected',()=>{
  const b=e.empty();[0,1,2,3].forEach(i=>b[i]='O');[18,20,22,24].forEach(i=>b[i]='X');
  assert.equal(e.prove(b,3,[40]),null);assert.equal(e.verifyProof(b,{move:40,finish:true}),false);
  for(const move of [-1,81,1.5,'40',0])assert.equal(e.verifyProof(b,{move}),false);
  const p={move:40};p.children={4:p};assert.equal(e.verifyProof(b,p),false);
  assert.equal(e.prove(b,3,[-1,81,1.5,'40',0]),null);
});
test('B1 resource limits and cancellation never become a winning proof',()=>{
  const p=require('../js/vanbao-puzzles-f44.js')[8],before=JSON.stringify(p.board);
  for(const options of [{maxNodes:0},{maxDepth:0},{timeoutMs:0},{signal:{aborted:true}},{maxNodes:-1}]){
    assert.equal(e.prove(p.board,3,[p.proof.move],options),null);
    assert.equal(e.verifyProof(p.board,p.proof,options),false);
  }
  let reads=0;assert.equal(e.verifyProof(p.board,p.proof,{signal:{get aborted(){return ++reads>2;}}}),false);
  for(const depth of [0,-1,NaN,Infinity,42])assert.equal(e.prove(p.board,depth),null);
  assert.equal(JSON.stringify(p.board),before);
});
test('B1 all 12 unchanged authored certificates pass independent every-response verification',()=>{
  const bank=require('../js/vanbao-puzzles-f44.js');assert.equal(bank.length,12);
  for(const p of bank){assert.ok(refVerify(p.board,p.proof),p.id);assert.ok(e.verifyProof(p.board,p.proof),p.id);
    const fresh=e.prove(p.board,p.expectedMoves,[p.proof.move]);assert.ok(fresh,p.id);assert.ok(refVerify(p.board,fresh),p.id);
  }
});
module.exports={fullDraw,fullWin,refWinner,oracle,refVerify};
