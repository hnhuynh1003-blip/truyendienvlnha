const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const perf=require('../js/epub-catalog-perf-r1.js');
const r2=require('../js/library-epub-r2-client-l6p2c5c3.js');
const turn=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness(){
 let user={uid:'fixture-a'},allowed=true;
 const calls={v49:[],r2:[]},views=[];let starts=0;
 const load=name=>options=>{const d=deferred();calls[name].push({...d,...options});return d.promise;};
 const catalog=perf.create({session:()=>user,ready:()=>allowed,loadV49:load('v49'),loadR2:load('r2'),onBooks:b=>views.push(b),beforeRefresh:()=>{starts++;}});
 const resolve=(index=0,books=[])=>{calls.v49[index].resolve(books);calls.r2[index].resolve(books);};
 return {catalog,calls,views,resolve,starts:()=>starts,account:u=>{user=u;},access:b=>{allowed=b;}};
}
test('overlapping automatic auth/library refreshes share exact in-flight promise and one loader pair',async()=>{
 const h=harness(),p=h.catalog.refresh();for(let i=0;i<9;i++)assert.equal(h.catalog.refresh(),p);
 await turn();assert.equal(h.starts(),1);assert.equal(h.calls.v49.length,1);assert.equal(h.calls.r2.length,1);
 h.resolve();await p;assert.deepEqual(h.catalog.snapshot().states,{v49:'success',r2:'success'});
 assert.deepEqual(h.catalog.snapshot().requests,{automaticCalls:10,freshCalls:0,inFlightJoins:9,v49LoaderStarts:1,r2LoaderStarts:1});
});
test('completed results are never reused as a later refresh',async()=>{
 const h=harness();let p=h.catalog.refresh();await turn();h.resolve();await p;
 p=h.catalog.refresh();assert.notEqual(h.catalog.snapshot().states.r2,'success');await turn();assert.equal(h.calls.r2.length,2);h.resolve(1);await p;
});
test('fresh publish preflight supersedes background flight and observes catalog additions',async()=>{
 const h=harness(),background=h.catalog.refresh();await turn();h.calls.r2[0].onPage([{id:'old'}]);
 const fresh=h.catalog.refresh({fresh:true});assert.notEqual(fresh,background);assert.notEqual(h.catalog.snapshot().states.r2,'success');
 assert.equal(h.calls.r2[0].signal.aborted,true);assert.equal(h.catalog.refresh(),fresh);
 await turn();h.calls.v49[1].resolve([]);h.calls.r2[1].resolve([{id:'newly-published'}]);await fresh;
 h.resolve(0,[{id:'stale'}]);await background;assert.deepEqual(h.views.at(-1),[{id:'newly-published'}]);
});
test('same UID with new Firebase user object cannot share the old flight',async()=>{
 const h=harness(),old=h.catalog.refresh();await turn();h.account({uid:'fixture-a'});const next=h.catalog.refresh();assert.notEqual(next,old);
 await turn();h.resolve(1,[{id:'new-session'}]);await next;h.resolve(0,[{id:'old-session'}]);await old;assert.equal(h.views.at(-1)[0].id,'new-session');
});
test('account switch prevents late data and old finalizer from clearing new flight',async()=>{
 const h=harness(),old=h.catalog.refresh();await turn();h.account({uid:'fixture-b'});const next=h.catalog.refresh();await turn();await old;
 assert.equal(h.catalog.refresh(),next);h.resolve(1,[{id:'account-b'}]);await next;h.resolve(0,[{id:'account-a'}]);await turn();assert.equal(h.views.at(-1)[0].id,'account-b');
});
test('revocation synchronously clears catalog, cancels requests and blocks late partial pages',async()=>{
 const h=harness(),p=h.catalog.refresh();await turn();h.calls.r2[0].onPage([{id:'partial'}]);h.access(false);h.catalog.invalidate();
 assert.deepEqual(h.views.at(-1),[]);assert.equal(h.calls.r2[0].signal.aborted,true);h.calls.r2[0].onPage([{id:'late'}]);h.resolve();await p;
 await h.catalog.refresh();assert.equal(h.calls.r2.length,1);assert.deepEqual(h.views.at(-1),[]);
 h.access(true);const next=h.catalog.refresh();await turn();assert.equal(h.calls.r2.length,2);h.resolve(1);await next;
});
test('partial page plus backend failure never becomes a successful preflight; next explicit refresh can recover',async()=>{
 const h=harness(),p=h.catalog.refresh({fresh:true});await turn();h.calls.r2[0].onPage([{id:'partial'}]);h.calls.v49[0].resolve([]);h.calls.r2[0].reject(Object.assign(Error(),{code:'HTTP_5XX'}));await p;
 assert.equal(h.catalog.snapshot().states.r2,'HTTP_5XX');assert.deepEqual(h.views.at(-1),[]);
 const next=h.catalog.refresh({fresh:true});await turn();h.resolve(1);await next;assert.equal(h.catalog.snapshot().states.r2,'success');
});
function book(i){return {id:'epub-'+i.toString(16).padStart(32,'0'),title:'Synthetic',author:'Fixture',description:'',revision:'r-'+'a'.repeat(32),chapters:[{id:'chapter-001',title:'Chapter',wordCount:1}]};}
test('single-flight integrates with real R2 pagination: every page required, no stale cache',async()=>{
 const user={uid:'fixture-owner',getIdToken:async()=>'synthetic'.repeat(20)},data=Array.from({length:43},(_,i)=>book(i+1));let requests=0;
 const client=r2.create({enabled:true,workerBaseUrl:'https://fixture.invalid',auth:()=>({currentUser:user}),firestoreReader:()=>{},storageAdapter:{create:()=>({})},fetchFn:async url=>{requests++;const cursor=new URL(url).searchParams.get('after')||'';const books=data.filter(b=>b.id>cursor).slice(0,20);return Response.json({ok:true,books,nextAfter:books.length===20?books.at(-1).id:null});}});
 let output=[];const catalog=perf.create({session:()=>user,ready:()=>true,loadV49:async()=>[],loadR2:o=>client.listPublished(o),beforeRefresh:()=>client.invalidateCatalog(),onBooks:b=>{output=b;}});
 await Promise.all(Array.from({length:8},()=>catalog.refresh()));assert.equal(requests,3);assert.equal(output.length,43);assert.equal(catalog.snapshot().states.r2,'success');
 data.push(book(44));data[0].revision='r-'+'b'.repeat(32);await catalog.refresh({fresh:true});assert.equal(requests,6);assert.equal(output.length,44);assert.equal(output[0]._r2Revision,data[0].revision);
 data.splice(0,1);await catalog.refresh({fresh:true});assert.equal(requests,9);assert.equal(output.length,43);assert.ok(!output.some(b=>b.id===book(1).id));
});
test('integration wrappers invalidate R2 only when work starts, and publish/compare explicitly require fresh reads',()=>{
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ui=fs.readFileSync(path.join(root,'js/library-r2-author-ui-c13b6d.js'),'utf8');
 const start=html.indexOf('    function refreshEpubCloudBooksV49('),end=html.indexOf('    // Auth event',start),wrapper=html.slice(start,end);
 assert.match(wrapper,/epubCatalogPerfR1.refresh\(options\)/);assert.doesNotMatch(wrapper,/invalidateCatalog/);
 assert.match(html,/beforeRefresh:\(\)=>\{\s*epubCatalogRestoreR1=false;\s*l6R2PreviewClient\?\.invalidateCatalog\(\);/);
 assert.equal((ui.match(/refreshEpubCloudBooksV49\(\{fresh:true\}\)/g)||[]).length,3);
 assert.equal((html.match(/(?:onPublished|refresh):\(\)=>refreshEpubCloudBooksV49\(\{fresh:true\}\)/g)||[]).length,3);
 assert.ok(ui.includes("data.bookId!==p.bookId||data.revision!==p.revisionId"));
 assert.ok(ui.includes("case 'published':return {kind:'published'"));
});

for(const [name,change,http,clears] of [
 ['published exact',{},200,true],['importing',{status:'importing'},200,false],['wrong revision',{revision:'r-'+'c'.repeat(32)},200,false],['wrong book',{bookId:'epub-'+'c'.repeat(32)},200,false],['not found',{found:false},200,false],['wrong code',{code:'other'},200,false],['backend failure',{},503,false],['authentication failure',{},401,false]
])test('unchanged pending reconciliation: '+name,async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../js/library-r2-author-ui-c13b6d.js'),'utf8'),start=source.indexOf(" id('status-check').addEventListener("),end=source.indexOf(" document.getElementById('c13b3-read')",start);
 assert.ok(start>0&&end>start);
 const BOOK='epub-'+'a'.repeat(32),REV='r-'+'b'.repeat(32),owner='fixture-owner',user={getIdToken:async()=>'synthetic'};let handler,removed=0,gets=0;
 const ctx={sessionUid:owner,allowed:()=>true,busy:false,queue:{status:()=>({running:false,adding:false}),reconcilePublished:()=>{}},pending:()=>({bookId:BOOK,revisionId:REV}),firebase:{auth:()=>({currentUser:user})},config:{workerBaseUrl:'https://dudu-library-l6-development.dudu-studio-ai.workers.dev'},id:()=>({addEventListener:(e,fn)=>{handler=fn;},textContent:''}),render:()=>{},renderQueue:()=>{},controller:null,abort:null,preparedFile:null,lastPublishedBook:null,localStorage:{removeItem:()=>{removed++;}},key:()=>owner,URL,TextDecoder,Uint8Array,fetch:async(url,options)=>{assert.equal(options.method,'GET');gets++;return Response.json({code:'import-status',found:true,bookId:BOOK,revision:REV,status:'published',...change},{status:http});}};
 vm.createContext(ctx);const ca=source.indexOf(' function classifyRecovery(');vm.runInContext(source.slice(ca,source.indexOf(' function render(',ca))+'\n'+source.slice(start,end),ctx);await handler();assert.equal(removed,clears?1:0);assert.equal(gets,1);
});
