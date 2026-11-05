'use strict';
// Local review only. No deployment, Firebase or production browser state.
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),port=Number(process.argv[2]??8787);
const server=http.createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/')pathname='/preview/reader-name-lookup-l55.html';
  if(pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
  const file=path.resolve(ROOT,'.'+pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain','.md':'text/plain','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)];
  if(!mime){res.writeHead(404).end();return;}
  const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);
 }catch(_){res.writeHead(404).end();}
});
server.listen(port,'127.0.0.1',()=>console.log('L55_PREVIEW http://127.0.0.1:'+server.address().port+'/'));
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
