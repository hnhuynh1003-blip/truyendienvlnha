/* F4.4 freestyle five-in-a-row. Deterministic defense and proof-carrying puzzles. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DuduVanBaoChessF44=api;})(typeof window!=='undefined'?window:null,function(){'use strict';const SIZE=9,lines=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)for(const [dr,dc]of [[0,1],[1,0],[1,1],[1,-1]])if(r+dr*4<9&&c+dc*4>=0&&c+dc*4<9)lines.push(Array.from({length:5},(_,i)=>(r+dr*i)*9+c+dc*i));
 const empty=()=>Array(81).fill(''),legal=b=>b.map((v,i)=>v?'':i).filter(v=>v!==''),winner=b=>['X','O'].find(p=>lines.some(l=>l.every(i=>b[i]===p)))||null;
 function winning(b,p){const out=new Set();for(const line of lines){let count=0,gap=-1,bad=false;for(const i of line){if(b[i]===p)count++;else if(b[i]){bad=true;break;}else if(gap!==-1){bad=true;break;}else gap=i;}if(!bad&&count===4&&gap>=0)out.add(gap);}return[...out].sort((a,b)=>a-b);}
 function score(b,m,p){let value=0;for(const l of lines){if(!l.includes(m))continue;let own=0,other=0;for(const i of l){if(b[i]===p)own++;else if(b[i])other++;}if(!other)value+=[0,1,8,90,15000,100000][own];if(!own)value+=[0,1,6,65,12000,90000][other];}return value;}
 function candidates(b,p){return legal(b).sort((a,c)=>score(b,c,p)-score(b,a,p)||Math.abs(a%9-4)+Math.abs((a/9|0)-4)-Math.abs(c%9-4)-Math.abs((c/9|0)-4)||a-c);}
 // Terminal outcomes are relative to X; null proof means unproven, not draw/loss.
 function terminalState(b){
 if(!Array.isArray(b)||b.length!==81||!Array.from(b).every(v=>v===''||v==='X'||v==='O'))return 'invalid';
 const x=b.filter(v=>v==='X').length,o=b.filter(v=>v==='O').length;
 if(x!==o&&x!==o+1)return 'invalid';
 const wx=lines.some(l=>l.every(i=>b[i]==='X')),wo=lines.some(l=>l.every(i=>b[i]==='O'));
 if(wx&&wo||wx&&x!==o+1||wo&&x!==o)return 'invalid';
 if(wx||wo){const p=wx?'X':'O';if(!b.some((v,i)=>{if(v!==p)return false;const c=b.slice();c[i]='';return !winner(c);}))return 'invalid';return wx?'win':'loss';}
 return legal(b).length?'ongoing':'draw';
 }
 function proofBudget(options={}){
 const nodes=options.maxNodes??100000,depth=options.maxDepth??41,ms=options.timeoutMs??Infinity;
 let count=0;const deadline=ms===Infinity?Infinity:Date.now()+ms;
 return d=>Number.isInteger(nodes)&&nodes>=0&&Number.isInteger(depth)&&depth>=0&&ms>=0&&
 !options.signal?.aborted&&d<=depth&&++count<=nodes&&Date.now()<deadline;
 }
 function prove(board,moves=3,rootMoves=null,options={}){
 if(terminalState(board)!=='ongoing'||board.filter(v=>v==='X').length!==board.filter(v=>v==='O').length||!Number.isInteger(moves)||moves<1||moves>41||rootMoves!==null&&!Array.isArray(rootMoves))return null;
 const visit=proofBudget(options);
 function search(board,left,roots,depth){
 if(!visit(depth)||terminalState(board)!=='ongoing')return null;
 const b=board.slice(),wins=winning(b,'X');if(wins.length)return{move:wins[0],finish:true,moves:1};if(left<=1)return null;
 const danger=winning(b,'O');if(danger.length>1)return null;
 const choices=roots||(danger.length?[danger[0]]:candidates(b,'X'));
 for(const m of choices){if(!Number.isInteger(m)||m<0||m>=81||b[m]!=='')continue;
 b[m]='X';
 // No opponent responses on a full nonwinning board means draw, not proof.
 if(terminalState(b)!=='ongoing'||winning(b,'O').length){b[m]='';continue;}
 const threats=winning(b,'X');let reply=null,children=null,ok=true,max=1;
 if(threats.length>=2){max=2;}
 else if(threats.length===1){b[threats[0]]='O';reply=search(b,left-1,null,depth+1);b[threats[0]]='';ok=!!reply;max=1+(reply?.moves||0);}
 else if(roots&&left>=3){children={};for(const o of legal(b)){b[o]='O';const child=search(b,left-1,null,depth+1);b[o]='';if(!child){ok=false;break;}children[o]=child;max=Math.max(max,1+child.moves);}}
 else ok=false;
 b[m]='';if(ok)return{move:m,moves:max,threats,reply,children};
 }return null;
 }
 return search(board,moves,rootMoves,0);
 }
 function verifyProof(board,proof,options={}){
 const visit=proofBudget(options);
 function verify(board,proof,depth){
 if(!visit(depth)||terminalState(board)!=='ongoing'||board.filter(v=>v==='X').length!==board.filter(v=>v==='O').length||!proof||!Number.isInteger(proof.move)||proof.move<0||proof.move>=81||board[proof.move]!=='')return false;
 const b=board.slice();b[proof.move]='X';const state=terminalState(b);
 if(state==='win')return true;
 if(state!=='ongoing')return false;
 for(const o of legal(b)){b[o]='O';if(terminalState(b)!=='ongoing')return false;
 let next=proof.children?.[o];if(!next&&proof.threats?.length===1&&o===proof.threats[0])next=proof.reply;
 if(!next){const wins=winning(b,'X');if(!wins.length)return false;next={move:wins[0],finish:true};}
 if(!verify(b,next,depth+1))return false;b[o]='';
 }return true;
 }
 return verify(board,proof,0);
 }
 function canonical(b){const forms=[];for(let flip=0;flip<2;flip++)for(let turn=0;turn<4;turn++){const out=empty();for(let r=0;r<9;r++)for(let c=0;c<9;c++){let x=r,y=flip?8-c:c;for(let k=0;k<turn;k++){const t=x;x=y;y=8-t;}out[x*9+y]=b[r*9+c];}forms.push(out.map(v=>v||'.').join(''));}return forms.sort()[0];}
 function chooseO(board){const b=board.slice(),wins=winning(b,'O');if(wins.length)return wins[0];const block=winning(b,'X');if(block.length)return block[0];const moves=candidates(b,'O').slice(0,12);let best=moves[0],value=-Infinity;for(const m of moves){b[m]='O';let worst=Infinity;const replies=candidates(b,'X').slice(0,10);for(const x of replies){b[x]='X';const scoreX=winner(b)==='X'?1e8:winning(b,'X').length*20000+score(b,x,'X');worst=Math.min(worst,-scoreX);b[x]='';}b[m]='';const valueO=worst+score(b,m,'O')*.2;if(valueO>value){value=valueO;best=m;}}return best??null;}
 function play(puzzle,xMoves){const b=puzzle.board.slice(),seen=[];if(!Array.isArray(xMoves)||xMoves.length>41)return{ok:false};for(const x of xMoves){if(winner(b)||!Number.isInteger(x)||x<0||x>=81||b[x])return{ok:false};b[x]='X';seen.push(x);if(winner(b)==='X')return{ok:seen.length===xMoves.length,won:true,board:b};const o=chooseO(b);if(o===null)return{ok:true,draw:true,board:b};b[o]='O';if(winner(b)==='O')return{ok:seen.length===xMoves.length,lost:true,board:b};}return{ok:true,won:false,board:b};}
 return Object.freeze({SIZE,lines,empty,legal,winner,winning,candidates,terminalState,prove,verifyProof,canonical,chooseO,play});});
