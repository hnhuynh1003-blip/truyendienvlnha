const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('probe accepts only constant catalog stages; unknown or cross-category stages never render',async()=>{
 const source=fs.readFileSync(path.join(root,'js/firebase-worker-get-probe-c13b6d.js'),'utf8');
 const body=source.slice(source.indexOf('  const known503 ='),source.indexOf('  async function getStatus('));
 const context={TextDecoder,Uint8Array};vm.createContext(context);vm.runInContext(body+';globalThis.read=readKnown503Code;',context);
 for(const [code,stage,expected] of [['catalog-list-unavailable','FIRESTORE_HTTP_429','FIRESTORE_HTTP_429'],['catalog-list-unavailable','PRIVATE RAW ERROR',''],['server-auth-unavailable','FIRESTORE_HTTP_429',''],['catalog-list-unavailable','OAUTH_FETCH',''],['server-auth-unavailable','OAUTH_FETCH','OAUTH_FETCH']]){
  const result=await context.read(Response.json({code,stage},{status:503}));assert.equal(result.stage,expected);
 }
 const huge=await context.read(Response.json({code:'catalog-list-unavailable',stage:'FIRESTORE_HTTP_429',raw:'x'.repeat(3000)},{status:503}));assert.equal(huge.stage,'');
});
// All status fixtures are synthetic; no production session is used.
const OWNER='fixture-owner',BOOK='epub-'+'a'.repeat(32),REV='r-'+'b'.repeat(32);
for(const [name,change,http,clears] of [
 ['published exact',{},200,true],['not published',{status:'importing'},200,false],['wrong revision',{revision:'r-'+'c'.repeat(32)},200,false],['wrong book',{bookId:'epub-'+'c'.repeat(32)},200,false],['not found',{found:false},200,false],['wrong code',{code:'other'},200,false],['quota error',{},503,false],['auth error',{},401,false]
])test('actual pending client handler: '+name,async()=>{
 const source=fs.readFileSync(path.join(root,'js/library-r2-author-ui-c13b6d.js'),'utf8');
 const start=source.indexOf(" id('status-check').addEventListener("),end=source.indexOf(" document.getElementById('c13b3-read')",start);
 assert.ok(start>0&&end>start);
 let handler,removed=0,posts=0,reconciled=0;
 const record={bookId:BOOK,revisionId:REV},user={getIdToken:async()=>'fixture'};
 const context={sessionUid:OWNER,allowed:()=>true,busy:false,queue:{status:()=>({running:false,adding:false}),reconcilePublished:()=>{reconciled++;}},pending:()=>record,firebase:{auth:()=>({currentUser:user})},config:{workerBaseUrl:'https://dudu-library-l6-development.dudu-studio-ai.workers.dev'},id:()=>({addEventListener:(event,fn)=>{handler=fn;},textContent:''}),render:()=>{},renderQueue:()=>{},controller:null,abort:null,preparedFile:null,lastPublishedBook:null,localStorage:{removeItem:()=>{removed++;}},key:uid=>'fixture:'+uid,URL,TextDecoder,Uint8Array,fetch:async(url,options)=>{if(options.method!=='GET')posts++;return Response.json({code:'import-status',found:true,bookId:BOOK,revision:REV,status:'published',...change},{status:http});}};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);await handler();assert.equal(removed,clears?1:0);assert.equal(reconciled,clears?1:0);assert.equal(posts,0);assert.equal(context.busy,false);
});

// Run the complete public probe with in-memory Firebase and HTTP fixtures.
// Constants are read from already-public frontend code, never live credentials.
const probeSource=fs.readFileSync(path.join(root,'js/firebase-worker-get-probe-c13b6d.js'),'utf8');
const publicConstant=name=>{const m=probeSource.match(new RegExp("const "+name+" = '([^']+)';"));assert.ok(m);return m[1];};
function probe({uid=publicConstant('OWNER'),claims={},body={code:'catalog-list-unavailable',stage:'FIRESTORE_HTTP_429'},http=503,anonymousHttp=401}={}){
 class Element{constructor(){this.children=[];this.style={};this.handlers={};this.attrs={};}appendChild(e){this.children.push(e);}addEventListener(e,f){this.handlers[e]=f;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}}
 const panel=new Element(),now=Date.now(),calls=[],timers=new Map();let tokenReads=0,bodyReads=0,refreshes=0;
 const user={uid,getIdTokenResult:async force=>{assert.equal(force,true);refreshes++;return {claims:{sub:publicConstant('OWNER'),admin:true,aud:publicConstant('PROJECT'),iss:'https://securetoken.google.com/'+publicConstant('PROJECT'),exp:Math.floor(now/1000)+3600,...claims},issuedAtTime:new Date(now-10000).toISOString(),expirationTime:new Date(now+3600000).toISOString(),get token(){tokenReads++;return 'synthetic-token-'.repeat(10);}};}};
 const auth={currentUser:user,app:{options:{projectId:publicConstant('PROJECT')}},onAuthStateChanged:()=>{}};
 const forbidden=()=>{throw Error('FORBIDDEN_SIDE_EFFECT');};
 const context={document:{getElementById:id=>id==='firebase-owner-check'?panel:null,createElement:()=>new Element()},firebase:{auth:()=>auth},location:{origin:publicConstant('SITE_ORIGIN')},window:{addEventListener:()=>{}},URL,Date,AbortController,Uint8Array,TextDecoder,IS_SANDBOX_MODE:false,setTimeout:fn=>{timers.set(timers.size+1,fn);return timers.size;},clearTimeout:id=>timers.delete(id),console:{log:forbidden,warn:forbidden,error:forbidden},localStorage:{setItem:forbidden,removeItem:forbidden},fetch:async(url,init)=>{calls.push({url,init});assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');assert.equal(url,publicConstant('WORKER_ORIGIN')+'/v1/library/r2/catalog/books');if(calls.length===1)return {status:anonymousHttp,body:{cancel:async()=>{}},json:forbidden,text:forbidden};const r=Response.json(body,{status:http}),getReader=r.body.getReader.bind(r.body);r.body.getReader=()=>{bodyReads++;return getReader();};return r;}};
 vm.createContext(context);vm.runInContext(probeSource,context);
 const host=panel.children[0],button=host.children[0],output=host.children[1];return {button,output,calls,auth,stats:()=>({tokenReads,bodyReads,refreshes}),click:()=>button.handlers.click()};
}
test('complete probe: only authenticated 503 displays allowlisted catalog stage',async()=>{const p=probe();await p.click();assert.equal(p.calls.length,2);assert.equal(p.calls[0].init.headers.Authorization,undefined);assert.ok(p.calls[1].init.headers.Authorization.startsWith('Bearer '));assert.match(p.output.textContent,/STAGE_FIRESTORE_HTTP_429/);assert.match(p.output.textContent,/HTTP 503/);assert.deepEqual(p.stats(),{tokenReads:1,bodyReads:1,refreshes:1});});
test('complete probe: legacy generic 503 remains supported',async()=>{const p=probe({body:{code:'catalog-list-unavailable'}});await p.click();assert.match(p.output.textContent,/BACKEND_catalog-list-unavailable/);assert.doesNotMatch(p.output.textContent,/STAGE_/);});
test('complete probe: unknown stages and raw extra fields never render',async()=>{const p=probe({body:{code:'catalog-list-unavailable',stage:'SYNTHETIC_UNTRUSTED_DETAIL',raw:'SYNTHETIC_UNTRUSTED_DETAIL'}});await p.click();assert.doesNotMatch(p.output.textContent,/SYNTHETIC_UNTRUSTED_DETAIL|STAGE_/);});
test('complete probe: successful catalog bodies are never consumed by diagnostics',async()=>{const p=probe({http:200,body:{books:['SYNTHETIC_PRIVATE_CONTENT']}});await p.click();assert.equal(p.stats().bodyReads,0);assert.doesNotMatch(p.output.textContent,/SYNTHETIC_PRIVATE_CONTENT/);});
for(const [name,options] of [['other user',{uid:'fixture-nonowner'}],['missing admin',{claims:{admin:false}}],['string admin',{claims:{admin:'true'}}],['expired token',{claims:{exp:1}}],['wrong audience',{claims:{aud:'fixture-other-project'}}],['wrong issuer',{claims:{iss:'https://fixture.invalid'}}]])test('complete probe: '+name+' causes zero requests',async()=>{const p=probe(options);await p.click();assert.equal(p.calls.length,0);assert.equal(p.stats().tokenReads,0);});
test('complete probe: anonymous HTTP 200 stops before bearer dispatch',async()=>{const p=probe({anonymousHttp:200});await p.click();assert.equal(p.calls.length,1);assert.equal(p.stats().tokenReads,0);});
