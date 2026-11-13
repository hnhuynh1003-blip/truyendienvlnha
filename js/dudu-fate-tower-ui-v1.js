/* FUN-TOWER1 — in-FUN tower practice screen, no wallet operations. */
(function(root){
 'use strict';
 const rules=root.DuduFateTowerV1;
 if(!rules)return;
 const PREFIX='dudu-fate-tower-preview-v1:',volatile=new Map();
 const glyphs=['✦','☽','❖'];
 let moment=null,feedback='';
 const validUid=uid=>typeof uid==='string'&&uid.length>0&&uid.length<=128;
 function el(tag,cls,text){
  const node=root.document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 }
 function read(uid){
  if(!validUid(uid))return rules.norm(null);
  let data=volatile.get(uid);
  try{const stored=root.sessionStorage?.getItem(PREFIX+uid);
   if(stored)data=JSON.parse(stored);}catch(_){/* Private browsing fallback. */}
  return rules.norm(data);
 }
 function save(uid,state){
  volatile.set(uid,state);
  try{root.sessionStorage?.setItem(PREFIX+uid,JSON.stringify(state));}
  catch(_){/* Still playable this tab; no wallet value is stored. */}
 }
 function layout(){
  if(!root.crypto?.getRandomValues)throw Error('Chưa có nguồn ngẫu nhiên an toàn');
  const values=new Uint32Array(16);root.crypto.getRandomValues(values);
  let index=0;
  return rules.FLOORS.map(f=>{
   const slots=Array.from({length:f.gates},(_,i)=>i);
   for(let i=slots.length-1;i>0;i--){
    const j=values[index++]%(i+1);
    [slots[i],slots[j]]=[slots[j],slots[i]];
   }
   return slots.slice(0,f.safe).sort((a,b)=>a-b);
  });
 }
 function newId(){
  if(!root.crypto?.randomUUID)throw Error('Trình duyệt chưa hỗ trợ tạo lượt chơi');
  return root.crypto.randomUUID();
 }
 function run(uid,action){
  if(!validUid(uid))return;
  const response=action(read(uid));
  if(!response?.ok){
   feedback=response?.reason==='in-progress'?'Hãy chốt hoặc hoàn thành lượt đang chơi.':
    'Lượt này đã thay đổi. Hãy chọn trên tầng hiện tại.';
   render(lastHost,{uid});return;
  }
  save(uid,response.state);
  feedback='';moment={uid,kind:response.result||'start'};
  render(lastHost,{uid});
 }
 let lastHost=null;
 function render(host,{uid}={}){
  if(!host)return false;
  lastHost=host;
  const state=read(uid),r=state.run,stage=el('div','dudu-tower-shell');
  const flash=moment?.uid===uid?moment.kind:null;
  if(flash)stage.className+=' dudu-tower-moment-'+flash;
  moment=null;
  stage.append(el('div','dudu-tower-art'));
  const content=el('div','dudu-tower-content');
  content.append(el('div','dudu-tower-eyebrow','✧ DUDU FUN · THỬ THÁCH MAY MẮN'),
   el('h3','dudu-tower-title','THÁP VẬN MỆNH'),
   el('p','dudu-tower-caption','Leo tiếp để tăng điểm, hoặc dừng để giữ điểm. Một lần trượt sẽ mất toàn bộ điểm của lượt này.'));
  const stats=el('div','dudu-tower-stats');
  stats.append(el('span','','✦ Kỷ lục thử: '+state.best+' điểm'),
   el('span','','↻ Đã thử: '+state.played+' lượt'));
  content.append(stats);
  const track=el('div','dudu-tower-track');
  for(let i=0;i<rules.FLOORS.length;i++){
   const step=el('span','dudu-tower-step'+(r&&r.floor>i?' is-clear':'')+
    (r?.status==='playing'&&r.floor===i?' is-next':''),String(i+1));
   step.title=rules.FLOORS[i].title;track.append(step);
  }
  content.append(track);
  const panel=el('section','dudu-tower-play');
  if(!r){
   panel.append(el('strong','dudu-tower-status','Năm tầng đang đợi bạn'),
    el('p','dudu-tower-small','Bắt đầu miễn phí, không giới hạn lượt. Mỗi tầng có những cổng an toàn được chọn trước khi bước vào.'));
   const start=el('button','dudu-tower-primary','✦ BẮT ĐẦU LEO THÁP');
   start.type='button';start.addEventListener('click',()=>{
    try{run(uid,s=>rules.start(s,{id:newId(),layout:layout()}));}
    catch(_){feedback='Không tạo được lượt thử. Hãy kiểm tra trình duyệt.';
     render(host,{uid});}
   });panel.append(start);
  }else if(r.status==='playing'){
   const floor=rules.FLOORS[r.floor];
   panel.append(el('small','dudu-tower-floor','TẦNG '+(r.floor+1)+' / '+rules.FLOORS.length),
    el('strong','dudu-tower-status',floor.title),
    el('p','dudu-tower-small','Chọn một cổng. Tỷ lệ qua tầng: '+floor.safe+'/'+floor.gates+
     ' · Qua được sẽ có '+floor.points+' điểm thử.'));
   const gates=el('div','dudu-tower-gates');
   for(let i=0;i<floor.gates;i++){
    const choice=el('button','dudu-tower-gate');
    choice.type='button';choice.setAttribute('aria-label','Chọn cổng '+(i+1)+' tầng '+(r.floor+1));
    choice.append(el('span','dudu-tower-glyph',glyphs[i]),
     el('small','','Cổng '+(i+1)));
    choice.addEventListener('click',()=>run(uid,s=>rules.choose(s,
     {id:r.id,floor:r.floor,gate:i})));
    gates.append(choice);
   }
   panel.append(gates);
   if(r.floor>0){
    const bank=el('button','dudu-tower-primary dudu-tower-bank',
     '✓ CHỐT '+rules.FLOORS[r.floor-1].points+' ĐIỂM');
    bank.type='button';bank.addEventListener('click',()=>run(uid,s=>rules.bank(s,
     {id:r.id,floor:r.floor})));panel.append(bank);
   }
  }else{
   const result=r.status==='lost'?'☄ THÁP ĐÃ THỬ THÁCH BẠN':
    r.status==='crowned'?'✦ CHẠM ĐỈNH VẬN MỆNH':'✦ ĐÃ CHỐT ĐIỂM AN TOÀN';
   panel.append(el('strong','dudu-tower-status',result),
    el('p','dudu-tower-final',r.status==='lost'?
     'Mất điểm của lượt này, kỷ lục trước vẫn được giữ.':
     'Bạn giữ được '+r.banked+' điểm thử!'));
   const restart=el('button','dudu-tower-primary','↻ THỬ LẠI NGAY');
   restart.type='button';restart.addEventListener('click',()=>{
    try{run(uid,s=>rules.start(s,{id:newId(),layout:layout()}));}
    catch(_){feedback='Chưa tạo được lượt mới.';render(host,{uid});}
   });panel.append(restart);
  }
  if(feedback)panel.append(el('p','dudu-tower-feedback',feedback));
  content.append(panel);
  const details=el('details','dudu-tower-rules'),summary=el('summary','','Tỷ lệ qua tầng và điểm chốt ›');
  details.append(summary);
  for(const o of rules.odds()){
   details.append(el('div','dudu-tower-rule-row',
    'Tầng '+o.floor+' · '+o.title+' · '+o.safe+'/'+o.gates+' cổng an toàn · '+o.points+' điểm'));
  }
  content.append(details,
   el('small','dudu-tower-preview-note',
    'BẢN THỬ · Điểm Tháp chỉ để trải nghiệm, không phải Xu Vàng/Tiền Xanh, không vào Ví hay bảng xếp hạng chính thức.'));
  stage.append(content);host.replaceChildren(stage);
  return true;
 }
 root.DuduFateTowerUIV1=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
