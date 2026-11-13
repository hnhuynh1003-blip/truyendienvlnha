// Dedicated website preview, loopback-only. Does not change the prototype server.
import http from 'node:http';import path from 'node:path';import {readFile,realpath} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export function previewHTML(html){return html.replace(/<script\b[^>]*src="https?:[^>]*><\/script>/gi,'').replace('<head>','<head><script src="/tools/tutien-integ-t0/offline-sdk.js"></script>').replace("if ('serviceWorker' in navigator)","if (false /* INTEG-T0 preview: no service worker */)");}
export function createServer(){return http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 const raw=req.url.split('?')[0];if(raw.includes('%')||raw.includes('\\')||raw.split('/').includes('..')){res.writeHead(403).end();return;}
 if(raw==='/tools/tutien-integ-t0/offline-font.css'){res.writeHead(200,{'content-type':'text/css','cache-control':'no-store'}).end(req.method==='HEAD'?undefined:'/* Preview uses installed system fonts only. */');return;}
 if((raw==='/manifest.webmanifest'||raw==='/manifest.json')){res.writeHead(200,{'content-type':'application/manifest+json'}).end(req.method==='HEAD'?undefined:JSON.stringify({name:'DUDU offline QA',start_url:'/?sandbox=1',display:'standalone',icons:[]}));return;}
 const p=raw==='/'?'/index.html':raw;
 if(!(p==='/index.html'||/^\/(js|css|assets|images|fonts|prototypes\/tutien-combat-s)\//.test(p)||p==='/tools/tutien-integ-t0/offline-sdk.js')){res.writeHead(403).end();return;}
 const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ico':'image/x-icon'};const ext=path.extname(p);
 if(!mime[ext]){res.writeHead(403).end();return;}
 try{const file=await realpath(path.resolve(root,'.'+p));if(!file.startsWith(root)){res.writeHead(403).end();return;}let bytes=await readFile(file);if(p==='/index.html')bytes=Buffer.from(previewHTML(bytes.toString('utf8')));
 if(p==='/js/phone-typography-v31.js')bytes=Buffer.from(bytes.toString('utf8').replace(/https:\/\/fonts\.googleapis\.com\/[^']+/g,'/tools/tutien-integ-t0/offline-font.css'));
 res.writeHead(200,{'content-type':mime[ext]+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; img-src 'self' data: blob:; font-src 'self' data:"});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404).end();}
 });}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.argv[2]||4180);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');createServer().listen(port,'127.0.0.1',()=>console.log(`DUDU INTEG-T0 MOCK_ONLY: http://127.0.0.1:${port}/?sandbox=1`));}
