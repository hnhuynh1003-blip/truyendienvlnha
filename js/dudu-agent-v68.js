/* DUDU V68 - select personas inside the existing V67 Messenger.
 * NO client API keys. Only owner-authorized Firebase sessions may opt into
 * Hive through the separately gated Cloudflare Worker endpoint.
 * Companion history remains V43; other agents have UID/role-isolated storage.
 */
(function(root){
 'use strict';
 const agents=Object.freeze([
  Object.freeze({id:'companion',label:'DUDU đồng hành',
    intro:'Tớ là DUDU, người bạn đồng hành của cậu. Cần hướng dẫn đọc truyện hay dùng Cyber Phone, cứ hỏi nhé!'}),
  Object.freeze({id:'core',label:'DUDU Chủ Thần',
    intro:'Đây là kênh tìm hiểu luật Chủ Thần. Bảo hộ, khế ước và lưu trữ có thẩm quyền chưa được kích hoạt trong bản thử.'}),
  Object.freeze({id:'child-regular',label:'Hệ thống con · Chính quy',
    intro:'Bổn hệ thống đang ở khu thử nghiệm, chưa có hợp đồng hoặc quyền giao nhiệm vụ thật.'}),
  Object.freeze({id:'child-irregular',label:'Hệ thống con · Phi chính quy',
    intro:'Đừng vội hỏi bổn hệ thống từ đâu đến. Nhưng mọi lời hứa ở đây vẫn chỉ là đối thoại thử nghiệm.'})
 ]);
 const known=new Set(agents.map(a=>a.id));
 let agent='companion',optIn=false,owner='';
 const sandbox=()=>typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true;
 function uid(){
  if(typeof currentUsername!=='string'||!currentUsername)return '';
  if(sandbox())return 'sandbox:'+currentUsername;
  try{
   if(root.DuduAuth?.isReady?.()===true&&root.DuduAuth?.uid?.()===currentUsername)
     return 'firebase:'+currentUsername;
  }catch(_){}
  return '';
 }
 function syncOwner(){
  const next=uid();
  if(next!==owner){agent='companion';optIn=false;owner=next;}
  return next;
 }
 function agentId(){syncOwner();return agent;}
 function selectAgent(id){
  if(!known.has(id)||!syncOwner())return false;
  agent=id;
  return true;
 }
 function storeKey(id){
  if(id==='companion'||!known.has(id))return null;
  const identity=syncOwner();
  return identity?'dudu:v68:agent:'+identity+':'+id:null;
 }
 function readState(id=agentId()){
  const rules=root.DuduCompanionRulesV43;
  if(!rules||typeof rules.norm!=='function')return null;
  const key=storeKey(id);if(!key)return rules.norm(null);
  try{
   const saved=localStorage.getItem(key);
   if(saved)return rules.norm(JSON.parse(saved));
  }catch(_){}
  const draft=rules.norm(null);
  draft.welcomed=true;
  draft.messages=[{role:'model',text:agents.find(a=>a.id===id).intro}];
  return draft;
 }
 function saveState(next,id=agentId()){
  const key=storeKey(id);
  if(!key||!root.DuduCompanionRulesV43)return false;
  try{localStorage.setItem(key,JSON.stringify(root.DuduCompanionRulesV43.norm(next)));return true;}
  catch(_){return false;}
 }
 function worker(){
  return typeof WORKER_URL==='string'&&/^https:\/\/[^\s/]+$/.test(WORKER_URL)?
    WORKER_URL.replace(/\/+$/,''):'';
 }
 async function request(path,body){
  if(sandbox()||!syncOwner().startsWith('firebase:')||!worker()||
     !root.firebase?.auth?.()?.currentUser)return null;
  try{
   const user=root.firebase.auth().currentUser;
   if(user.uid!==owner.slice(9))return null;
   const token=await user.getIdToken();
   const response=await fetch(worker()+path,{
    method:body?'POST':'GET',
    headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
    cache:'no-store',signal:AbortSignal.timeout(31000)
   });
   return {ok:response.ok,status:response.status,
     data:await response.json().catch(()=>null)};
  }catch(_){return null;}
 }
 async function toggleAI(){
  if(optIn){optIn=false;return {ok:true,on:false,text:'Đã tắt AI; DUDU tiếp tục trả lời theo quy tắc.'};}
  const identity=syncOwner();
  if(!identity.startsWith('firebase:'))return {ok:false,on:false,
    text:'Chỉ tài khoản Firebase đã xác minh mới được thử AI. Sandbox dùng trả lời quy tắc.'};
  const response=await request('/v1/dudu-ai/status');
  if(!response?.ok||!response.data?.enabled)return {ok:false,on:false,
    text:'Hive/DeepSeek chưa được mở trên Worker hoặc đã hết 20 lượt thử. DUDU vẫn dùng kịch bản an toàn.'};
  if(syncOwner()!==identity)return {ok:false,on:false,text:'Phiên tài khoản đã đổi.'};
  optIn=true;
  return {ok:true,on:true,text:'AI thử nghiệm đã bật. Các tin nhắn tiếp theo có thể tiêu hao credit Hive.'};
 }
 function enabled(){syncOwner();return optIn&&!sandbox();}
 async function ask(id,history){
  if(!enabled()||!known.has(id))return {ok:false,code:'disabled'};
  const identity=syncOwner();
  const items=[];
  let chars=0;
  for(let i=history.length-1;i>=0&&items.length<10;i--){
   const item=history[i],txt=String(item?.text||'').trim().slice(0,500);
   if(!txt||!['user','model'].includes(item?.role))continue;
   if(chars+txt.length>3300)break;
   chars+=txt.length;items.unshift({role:item.role,text:txt});
  }
  if(!items.length||items.at(-1).role!=='user')return {ok:false,code:'bad-history'};
  const response=await request('/v1/dudu-ai/chat',{agentId:id,messages:items});
  if(syncOwner()!==identity)return {ok:false,code:'account-changed'};
  if(!response?.ok||typeof response.data?.text!=='string'){
   if(response?.status===429)optIn=false; // budget/cooldown; user must recheck
   return {ok:false,code:response?.data?.error?.code||'network'};
  }
  return {ok:true,text:response.data.text.slice(0,650),
   remaining:response.data.remaining};
 }
 root.DuduAgentV68=Object.freeze({
  version:1,agents,agentId,selectAgent,readState,saveState,toggleAI,enabled,ask
 });
})(typeof window!=='undefined'?window:{});
