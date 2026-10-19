const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../js/ai-proxy.js'),'utf8');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');

function makeClient(){
  let handler=async()=>({ok:true,json:async()=>({text:'Chào bạn.',model:'@cf/zai-org/glm-4.7-flash',fallbackFrom:'gemini-3.5-flash-lite'})});
  const requests=[],timeouts=[],saved=new Map();
  const window={DuduNpcAutoModelV5611:{route:()=> 'gemini-3.5-flash-lite'}};
  const firebase={auth:()=>({currentUser:{uid:'reader-synthetic-uid',
    getIdToken:async()=> 'MOCK_NOT_REAL_TOKEN'}})};
  const context={window,firebase,localStorage:{
    getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),
    removeItem:k=>saved.delete(k)
  },AbortSignal:{timeout(ms){timeouts.push(ms);return {signal:true};}},
  fetch:async(...args)=>{requests.push(args);return handler(...args);},
  console:{warn:()=>{}}};
  vm.runInNewContext(source,context,{filename:'ai-proxy.js'});
  window.DuduAI.init(false);
  window.DuduAI.updateModelsFromStatus({models:[{id:'@cf/zai-org/glm-4.7-flash'}]});
  return {ai:window.DuduAI,requests,timeouts,setHandler(fn){handler=fn;}};
}
test('V58.2 AU/reader Gemini fallback response reports actual GLM and initial Gemini',async()=>{
 const c=makeClient();
 assert.equal(c.ai.setModel('gemini-3.5-flash-lite'),true);
 const r=await c.ai.generate('chat','NPC identity',[{role:'user',text:'Xin chào'}],'Xin chào');
 assert.equal(r.model,'@cf/zai-org/glm-4.7-flash');
 assert.equal(r.fallbackFrom,'gemini-3.5-flash-lite');
 assert.equal(c.requests.length,1,'client must not send a second API call for provider switching');
 assert.equal(c.timeouts[0],65000,'one Gemini plus one Workers fallback should fit browser deadline');
 assert.equal(JSON.parse(c.requests[0][1].body).model,'gemini-3.5-flash-lite');
});
test('V58.2 short status check stays short, chat timeout is explicit',async()=>{
 const c=makeClient();
 c.setHandler(async()=>{throw Object.assign(new Error('private token'),{name:'TimeoutError'});});
 const error=await c.ai.generate('chat','NPC',[{role:'user',text:'Hi'}],'Hi');
 assert.equal(error.code,'client-timeout');
 assert.match(error.error,/65 giây/);
 assert.ok(!JSON.stringify(error).includes('private token'));
 const status=await c.ai.status();
 assert.equal(status.code,'client-timeout');
 assert.deepEqual(c.timeouts,[65000,15000]);
});
test('V58.2 mobile device network interruption is not mislabeled as Google region restriction',async()=>{
 const c=makeClient();
 c.setHandler(async()=>{throw Object.assign(new Error('DNS blocked private'),{name:'TypeError'});});
 const r=await c.ai.generate('chat','NPC',[{role:'user',text:'Hi'}],'Hi');
 assert.equal(r.code,'client-network');
 assert.match(r.error,/Wi-Fi, DNS riêng/);
 assert.ok(!JSON.stringify(r).includes('DNS blocked private'));
 assert.doesNotMatch(r.error,/Gemini từ chối khu vực/);
});
test('V58.2 chat history keeps approved provider fallback attribution in NPC metadata',()=>{
 assert.match(html,/meta\.textContent=source\?'✦ '\+source\+' → '\+msg\.model\+' \(dự phòng\)'/);
 assert.match(html,/res\.fallbackFrom&&window\.DuduAI\?\.models/);
 assert.match(html,/src="js\/ai-proxy\.js\?v=58-2-mobile"/);
});
