// DUDU V68: same Messenger, four identity-isolated personas, explicit owner-only AI.
const assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/dudu-agent-v68.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const chat=fs.readFileSync(path.join(root,'js/companion-ui-v43.js'),'utf8');
const rules=require(path.join(root,'js/companion-rules-v43.js'));
const records=new Map(),calls=[];
const storage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)};
const user={uid:'owner',getIdToken:async()=> 'SIGNED_TEST_JWT'};
const win={DuduCompanionRulesV43:rules,DuduAuth:{
  isReady:()=>true,uid:()=>user.uid
},firebase:{auth:()=>({currentUser:user})}};
const context={
  window:win,currentUsername:'owner',IS_SANDBOX_MODE:false,
  localStorage:storage,WORKER_URL:'https://dudu-ai-staging.example.workers.dev',
  AbortSignal,fetch:async(url,init)=>{
    calls.push({url,init});
    return url.endsWith('/status')
      ?{ok:true,status:200,json:async()=>({enabled:true,limit:20,remaining:20})}
      :{ok:true,status:200,json:async()=>({text:'Tớ đã nghe.',remaining:19})};
  }
};
vm.runInNewContext(source,context,{filename:'dudu-agent-v68.js'});
const api=win.DuduAgentV68;
(async()=>{
 assert.equal(api.version,1);
 assert.equal(api.agents.length,4);
 assert.equal(api.agentId(),'companion');
 assert.equal(api.enabled(),false);
 assert.equal(calls.length,0,'No silent paid calls');
 assert.equal(api.selectAgent('forged-admin'),false);
 assert.equal(api.selectAgent('core'),true);
 const core=api.readState();
 assert.match(core.messages[0].text,/Chủ Thần/);
 core.messages.push({role:'user',text:'Hướng dẫn'});
 assert.equal(api.saveState(core),true);
 api.selectAgent('child-irregular');
 const rogue=api.readState();
 assert.equal(rogue.messages.some(m=>m.text==='Hướng dẫn'),false,
  'Core text must not leak into another agent');
 rogue.messages.push({role:'user',text:'Bí mật'});
 assert.equal(api.saveState(rogue),true);
 api.selectAgent('core');
 assert.equal(api.readState().messages.at(-1).text,'Hướng dẫn');
 assert.equal(calls.length,0);
 const enabled=await api.toggleAI();
 assert.equal(enabled.ok,true);
 assert.equal(api.enabled(),true);
 assert.equal(calls.length,1,'Enable queries status only');
 assert.equal(calls[0].init.method,'GET');
 const reply=await api.ask('core',[{role:'user',text:'Chào Chủ Thần'}]);
 assert.equal(reply.ok,true);assert.equal(reply.text,'Tớ đã nghe.');
 assert.equal(calls.length,2);
 assert.equal(calls[1].init.method,'POST');
 assert.equal(JSON.parse(calls[1].init.body).agentId,'core');
 assert.match(calls[1].init.headers.Authorization,/SIGNED_TEST_JWT/);
 assert.ok(!source.includes('HIVE_API_KEY')&&!chat.includes('HIVE_API_KEY'));
 assert.ok(html.includes('js/dudu-agent-v68.js?v=68-1'));
 assert.ok(html.indexOf('js/dudu-agent-v68.js')<html.indexOf('js/companion-ui-v43.js'));
 assert.match(chat,/DuduAgentV68/);
 assert.match(chat,/awaitingAi/);
 await api.toggleAI();
 assert.equal(api.enabled(),false);
 user.uid='different';context.currentUsername='different';
 assert.equal(api.agentId(),'companion','Account switch must reset role');
 assert.equal(api.enabled(),false);
 assert.equal(api.readState('core').messages.some(m=>m.text==='Hướng dẫn'),false,
  'New UID cannot see previous Core transcript');
 context.IS_SANDBOX_MODE=true;context.currentUsername='sandbox-1';
 assert.equal(api.agentId(),'companion');
 assert.equal((await api.toggleAI()).ok,false,'Sandbox cannot call paid provider');
 assert.equal(calls.length,2,'No Hive network for Sandbox');
 console.log('DUDU V68 owner-only persona selection, local memory and AI opt-in PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
