const fs=require('node:fs'),path=require('node:path');const base=path.resolve(__dirname,'..'),e=require(path.join(base,'js/vanbao-chess-f44.js'));const seeds=[
 ['n01','Khép trận',[[4,2],[4,3],[4,4],[4,5]],[[4,1],[0,0],[1,2],[2,0]],1],
 ['n02','Nối mạch',[[4,1],[4,2],[4,3],[4,5]],[[0,0],[1,2],[2,0],[3,1]],1],
 ['n03','Tâm nhãn',[[4,1],[4,2],[4,4],[4,5]],[[0,0],[1,2],[2,0],[3,1]],1],
 ['n04','Một nhịp trước',[[4,2],[4,3],[4,4],[4,5]],[[1,2],[1,3],[1,4],[1,5]],1],
 ['e01','Hai cửa',[[4,3],[4,4],[4,5]],[[0,1],[1,3],[2,0]],2],
 ['e02','Mạch khuyết',[[4,2],[4,4],[4,5]],[[0,1],[1,3],[2,0]],2],
 ['e03','Song tuyến',[[4,1],[4,2],[4,3],[1,4],[2,4],[3,4]],[[0,0],[0,2],[0,6],[1,0],[2,1],[6,7]],2],
 ['e04','Hai khe hở',[[4,1],[4,2],[4,5],[1,4],[2,4],[5,4]],[[0,0],[0,2],[0,6],[1,0],[2,1],[6,7]],2],
 ['m01','Giao mạch',[[4,2],[4,3],[2,4],[3,4]],[[0,0],[0,2],[1,1],[7,6]],3,40],
 ['m02','Giao mạch khuyết',[[4,2],[4,5],[2,4],[5,4]],[[0,0],[0,2],[1,1],[7,6]],3,40],
 ['m03','Chéo xuyên tâm',[[4,2],[4,3],[2,2],[3,3]],[[0,1],[0,3],[1,0],[7,6]],3,40],
 ['m04','Khuyết chéo',[[4,2],[4,5],[2,2],[5,5]],[[0,1],[0,3],[1,0],[7,6]],3,40]
 ];const bank=[],prints=new Set();for(const [id,name,x,o,depth,first]of seeds){const board=e.empty();for(const [r,c]of x)board[r*9+c]='X';for(const [r,c]of o){if(board[r*9+c])throw Error('overlap');board[r*9+c]='O';}if(e.winner(board)||x.length!==o.length)throw Error('invalid '+id);const proof=e.prove(board,depth,first===undefined?null:[first]);if(!proof||!e.verifyProof(board,proof))throw Error('unproved '+id);const key=e.canonical(board);if(prints.has(key))throw Error('symmetry duplicate');prints.add(key);bank.push({id:'f44-'+id,name,size:9,first:'X',difficulty:depth===1?'NOVICE':depth===2?'EASY':'MEDIUM',expectedMoves:proof.moves,board,proof});console.log(id,proof.moves);}fs.writeFileSync(path.join(base,'js/vanbao-puzzles-f44.js'),"/* Verified offline: every legal O reply is covered. */\n(function(r){function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;}const bank="+JSON.stringify(bank)+";freeze(bank);if(typeof module==='object'&&module.exports)module.exports=bank;if(r)r.DuduVanBaoPuzzlesF44=bank;})(typeof window!=='undefined'?window:null);\n");console.log('Verified',bank.length);
