// Loopback only; serves this prototype directory, never the DUDU repository root.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export function createServer({onTestReport}={}){
  const root=fileURLToPath(new URL('.',import.meta.url));
  const shared=fileURLToPath(new URL('../../js/personal-jade-core-v1.js',import.meta.url));
  return http.createServer(async(req,res)=>{
    if(onTestReport&&req.url==='/__browser-report'&&req.method==='POST'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>1024*1024){res.writeHead(413).end();return;}}
      try{const report=JSON.parse(body);res.writeHead(200).end('ok');onTestReport(report);}catch{res.writeHead(400).end();}return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    // Exact raw URL only: no query, encoded aliases, dynamic paths or directory access.
    if(req.url==='/__shared/personal-jade-core-v1.js'){
      try{const bytes=await readFile(shared);res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404).end();}return;
    }
    if(req.url.includes('%')||req.url.includes('\\')||req.url.split(/[/?]/).includes('..')){res.writeHead(403).end();return;}
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400).end();return;}
    const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!filename.startsWith(root)||pathname.startsWith('/__shared')||!['.html','.mjs','.css','.md'].includes(path.extname(filename))){res.writeHead(403).end();return;}
    try{const bytes=await readFile(filename);res.writeHead(200,{'content-type':({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8'})[path.extname(filename)],'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404).end('Prototype resource not found');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.argv[2]||4173);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
 const server=createServer();server.on('error',e=>{console.error(e.message);process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log(`Slice S MOCK_ONLY: http://127.0.0.1:${port}/`));
}
