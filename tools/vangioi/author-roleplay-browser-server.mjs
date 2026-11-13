#!/usr/bin/env node
// G5C-P2 local-only text browser demo. No deployment route or external listener.
// All state is ephemeral; all game decisions still pass G4A/G4B.
import {createServer} from 'node:http';
import {randomUUID,randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {prepareAuthorRoleplayOffline} from '../../cloudflare/src/vangioi-author-roleplay-offline.mjs';
import {lighthouseWorld,lighthouseEngineManifest,lighthousePlaytestScript}
 from '../../cloudflare/tests/fixtures/vangioi-author-playtest-world.mjs';
import {renderRoleplayBrowserPage} from './author-roleplay-browser-page.mjs';

const HOST='127.0.0.1',MAX_SESSIONS=64,MAX_BODY=4096;
const refused={fixtureOnly:true,worldPublished:false,missionCompleted:false,
 saveCommitted:false,rewardAuthorized:false,rewardCommitted:false,
 productionAuthorized:false,deviceVerified:false,rightsVerified:false};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
const exact=(v,keys)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const txt=(v,max=128)=>typeof v==='string'&&v.length>0&&v.length<=max;
const renderView=v=>({ok:true,revision:v.revision,sceneId:v.sceneId,title:v.title,
 narration:v.narration,dialogue:v.dialogue,roleReaction:v.roleReaction,
 choices:v.choices,narrativeEndingId:v.narrativeEndingId,...refused});

async function readJson(req){
 if(req.headers['content-type']!=='application/json')return {ok:false,code:'content-type'};
 let total=0,buffers=[];
 try{
  for await(const chunk of req){
   total+=chunk.length;if(total>MAX_BODY)return {ok:false,code:'payload-too-large'};
   buffers.push(chunk);
  }
  const raw=Buffer.concat(buffers).toString('utf8');
  return {ok:true,value:JSON.parse(raw)};
 }catch{return {ok:false,code:'invalid-json'};}
}

export async function createOfflineRoleplayBrowserServer({port=0}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw new TypeError('invalid-port');
 const world=lighthouseWorld();
 const play=await prepareAuthorRoleplayOffline(world,
  await lighthouseEngineManifest(world),await lighthousePlaytestScript(world));
 if(!play.ok)throw new Error('G5C-P2 fixture unavailable: '+play.code);
 const sessions=new Map(),nonce=randomBytes(18).toString('base64');
 const page=renderRoleplayBrowserPage(nonce);
 let origin='';
 const server=createServer(async(req,res)=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
   'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
   'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`};
  const send=(status,data)=>{
   res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});
   res.end(JSON.stringify(data));
  };
  try{
   // A browser opened via an alternate hostname or a hostile web page cannot
   // access this private local preview through DNS rebinding or cross-site POST.
   if(req.headers.host!==origin.slice(7))return send(403,{ok:false,code:'invalid-host'});
   const url=new URL(req.url,origin);
   if(req.method==='GET'&&url.pathname==='/'&&url.search===''){
    res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});
    return res.end(page);
   }
   if(req.method==='GET'&&url.pathname==='/api/catalog'&&url.search==='')
    return send(200,{ok:true,title:world.title,entryProfiles:play.entryProfiles,...refused});
   if(req.method==='POST'&&['/api/start','/api/choose'].includes(url.pathname)&&url.search===''){
    if(req.headers.origin!==origin)return send(403,{ok:false,code:'invalid-origin'});
    const parsed=await readJson(req);
    if(!parsed.ok)return send(parsed.code==='payload-too-large'?413:400,parsed);
    const data=parsed.value;
    if(url.pathname==='/api/start'){
     if(!exact(data,['entryId'])||!txt(data.entryId))return send(400,{ok:false,code:'invalid-start'});
     if(sessions.size>=MAX_SESSIONS)return send(429,{ok:false,code:'session-limit'});
     const started=await play.start(data.entryId,`local-${randomUUID()}`,`browser-${randomUUID()}`);
     if(!started.ok)return send(400,{ok:false,code:started.code});
     const sessionId=randomUUID(),record={session:started.session,queue:Promise.resolve()};
     sessions.set(sessionId,record);
     const view=await play.view(record.session);
     if(!view.ok){sessions.delete(sessionId);return send(409,{ok:false,code:view.code});}
     return send(200,{ok:true,sessionId,view:renderView(view)});
    }
    if(!exact(data,['sessionId','choiceId','eventId','expectedRevision'])||
     !uuid(data.sessionId)||!txt(data.choiceId,64)||!uuid(data.eventId)||
     !Number.isSafeInteger(data.expectedRevision)||data.expectedRevision<0)
     return send(400,{ok:false,code:'invalid-choice'});
    const record=sessions.get(data.sessionId);
    if(!record)return send(404,{ok:false,code:'unknown-session'});
    // Each isolated browser session has one writer. Concurrent requests cannot
    // read the same G4B revision and accidentally both become accepted.
    const task=record.queue.then(async()=>{
     const result=await play.choose(record.session,data);
     if(!result.ok)return {status:409,body:{ok:false,code:result.code}};
     const view=await play.view(result.session);
     if(!view.ok)return {status:409,body:{ok:false,code:view.code}};
     record.session=result.session;
     return {status:200,body:{ok:true,duplicate:result.duplicate,view:renderView(view)}};
    });
    record.queue=task.then(()=>undefined,()=>undefined);
    const result=await task;
    return send(result.status,result.body);
   }
   return send(404,{ok:false,code:'not-found'});
  }catch{return send(500,{ok:false,code:'local-demo-unavailable'});}
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(port,HOST,()=>{server.off('error',reject);resolve();});
 });
 origin=`http://${HOST}:${server.address().port}`;
 return Object.freeze({url:origin,server,close:()=>new Promise((resolve,reject)=>
  server.close(err=>err?reject(err):resolve()))});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const host=await createOfflineRoleplayBrowserServer();
 process.stdout.write('\nDUDU Studio — G5C-P2: bản chơi thử NHÁP trong máy cá nhân\n');
 process.stdout.write(`Mở trình duyệt tại: ${host.url}\n`);
 process.stdout.write('Chỉ mở trên 127.0.0.1; không phát hành, không lưu, không thưởng.\n');
 process.stdout.write('Nhấn Ctrl+C tại cửa sổ dòng lệnh để đóng bản thử.\n\n');
}
