/* Read-only status reconciliation tests. No production credentials, writes or cloud calls. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/library-r2-author-ui-c13b6d.js'),'utf8');
const a=source.indexOf(' function classifyRecovery('),b=source.indexOf(' function render(',a);
const c=source.indexOf(" id('status-check').addEventListener('click'"),d=source.indexOf(" document.getElementById('c13b3-read')",c);
assert.ok(a>0&&b>a&&c>0&&d>c,'recovery logic exists');
const helper=source.slice(a,b),handler=source.slice(c,d);
const book='epub-'+'a'.repeat(32),rev='r-'+'b'.repeat(32),pendingRecord={schema:1,phase:'blocked',bookId:book,revisionId:rev};
function makeCase({data={code:'import-status',found:true,bookId:book,revision:rev,status:'published'},http=200,pending=pendingRecord}={}){
 let callback,removed=0,requests=0,reconciled=0,rendered='';
 const owner='fixture-owner',user={getIdToken:async force=>{assert.equal(force,false);return 'fixture-token';}};
 const status={textContent:''};
 const context={pending:()=>pending,sessionUid:owner,allowed:()=>true,busy:false,
  queue:{status:()=>({running:false,adding:false}),reconcilePublished:()=>{reconciled++;return true;}},
  firebase:{auth:()=>({currentUser:user})},config:{workerBaseUrl:'https://dudu-library-l6-development.dudu-studio-ai.workers.dev'},
  id:key=>key==='status'?status:{addEventListener:(event,fn)=>{assert.equal(event,'click');callback=fn;}},
  render:message=>{rendered=message;status.textContent=message;},renderQueue:()=>{},
  controller:null,abort:null,preparedFile:null,lastPublishedBook:null,
  localStorage:{removeItem:()=>{removed++;}},key:()=>owner,
  URL,TextDecoder,Uint8Array,Response,
  fetch:async(url,options)=>{requests++;assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(url.pathname,'/v1/library/r2/catalog/'+book+'/status');return Response.json(data,{status:http});}
 };
 vm.createContext(context);vm.runInContext(helper+'\n'+handler,context);
 return {run:async()=>{await callback();return {removed,requests,reconciled,rendered,lastPublishedBook:context.lastPublishedBook,busy:context.busy};}};
}
for(const [name,overrides,kind,clears]of [
 ['published exact',{},'xuất bản đúng',true],
 ['importing',{data:{code:'import-status',found:true,bookId:book,revision:rev,status:'importing'}},'importing',false],
 ['draft',{data:{code:'import-status',found:true,bookId:book,revision:rev,status:'draft'}},'chưa published',false],
 ['not found',{data:{code:'import-status',found:false}},'chưa tìm thấy',false],
 ['wrong revision',{data:{code:'import-status',found:true,bookId:book,revision:'r-'+'c'.repeat(32),status:'published'}},'không khớp',false],
 ['wrong book',{data:{code:'import-status',found:true,bookId:'epub-'+'c'.repeat(32),revision:rev,status:'published'}},'không khớp',false],
 ['archived',{data:{code:'import-status',found:true,bookId:book,revision:rev,status:'archived'}},'archived',false],
 ['deleting',{data:{code:'import-status',found:true,bookId:book,revision:rev,status:'deleting'}},'deleting',false],
 ['unknown status',{data:{code:'import-status',found:true,bookId:book,revision:rev,status:'INVALID'}},'không được hỗ trợ',false],
 ['unknown schema',{data:{code:'unknown',found:true,bookId:book,revision:rev,status:'published'}},'không xác định',false],
 ['HTTP 401',{http:401},'hết hiệu lực',false],
 ['HTTP 403',{http:403},'từ chối quyền',false],
 ['HTTP 503',{http:503},'chưa đọc được trạng thái',false],
 ['no bookId',{pending:{...pendingRecord,bookId:null}},'chưa có mã sách',false]
 ])test('pending GET: '+name,async()=>{
  const result=await makeCase(overrides).run();
  assert.equal(result.removed,clears?1:0);
  assert.equal(result.reconciled,clears?1:0);
  assert.equal(result.requests,name==='no bookId'?0:1);
  assert.equal(result.busy,false);
  assert.ok(result.rendered.includes(kind),result.rendered);
 });
test('must keep owner check and precise pending clearance; no POST or force unlock',()=>{
 assert.match(source,/if\(!allowed\(\)\|\|busy\|\|queue\.status\(\)\.running/);
 assert.match(source,/if\(outcome\.kind==='published'\)\{localStorage\.removeItem/);
 assert.match(source,/data\.bookId!==p\.bookId\|\|data\.revision!==p\.revisionId/);
 assert.match(source,/method:'GET'/);
 assert.doesNotMatch(handler,/method:'POST'/);
 assert.match(source,/beforeunload/);
 assert.match(source,/Chỉ đóng tab khi có thông báo/);
 assert.match(source,/Chưa hoàn tất, đừng đóng tab/);
});
