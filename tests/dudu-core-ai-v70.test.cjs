const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../js/dudu-core-ai-v70.js'),'utf8');
function setup({sandbox=false,admin=false,uid='uid-1',enabled=true}={}){
 let requests=[];
 const user={uid,getIdToken:async()=> 'signed-jwt-for-unit-test'};
 const win={
  DuduAuth:{isReady:()=>true,isAdmin:()=>admin,uid:()=>uid},
  DuduAI:{workerBase:'https://dudu-ai-staging.example.workers.dev'},
  firebase:{auth:()=>({currentUser:user})}
 };
 const env={window:win,IS_SANDBOX_MODE:sandbox,

  AbortSignal,fetch:async(url,options)=>{
   requests.push({url,options});
   if(url.endsWith('/status'))return {
    ok:true,json:async()=>({enabled,limit:20,remaining:20})};
   return {ok:true,json:async()=>({text:'Luật được phân tích trong chế độ thử, chưa thi hành.',remaining:19})};
  }};
 vm.runInNewContext(code,env,{filename:'dudu-core-ai-v70.js',timeout:1600});
 return {api:win.DuduCoreAIV70,requests};
}
test('V70 Core refuses paid calls for guests, regular readers and sandbox AU',async()=>{
 for(const opts of [{admin:false},{admin:true,sandbox:true}]){
  const {api,requests}=setup(opts);
  const result=await api.ask('Đề xuất một quy tắc bảo hộ ký chủ.');
  assert.equal(result.ok,false);
  assert.equal(requests.length,0);
 }
});
test('V70 Core checks paid Worker availability before owner prompt and has no game tools',async()=>{
 const {api,requests}=setup({admin:true});
 const reply=await api.ask('Hãy phân tích quy tắc bảo hộ ký chủ bằng bằng chứng.');
 assert.equal(reply.ok,true);
 assert.equal(requests.length,2);
 assert.ok(requests[0].url.endsWith('/v1/dudu-ai/status'));
 assert.ok(requests[1].url.endsWith('/v1/dudu-ai/chat'));
 assert.equal(requests[1].options.headers.Authorization,'Bearer signed-jwt-for-unit-test');
 const body=JSON.parse(requests[1].options.body);
 assert.equal(body.agentId,'core');
 assert.deepEqual(JSON.parse(JSON.stringify(body.messages)),[
  {role:'user',text:'Hãy phân tích quy tắc bảo hộ ký chủ bằng bằng chứng.'}]);
 assert.equal(requests.filter(x=>/grant|reward|sanction|punish|profile/.test(x.url)).length,0);
});
test('V70 Core fail-closed if Hive is disabled even with valid AU token',async()=>{
 const {api,requests}=setup({admin:true,enabled:false});
 const r=await api.ask('Hãy xem xét kết quả phó bản vừa được xác minh.');
 assert.equal(r.ok,false);assert.equal(requests.length,1);
 assert.match(r.message,/chưa được kích hoạt/);
});
