/* Sandbox-only view: no Firebase or network dependencies. */
(function(root){
 'use strict';
 const mounts=new Map();
 const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 function render(options={}){
  const {host,sandbox,storyId,chapterId=null}=options;
  if(!host)return false;
  mounts.set(host,options);host.replaceChildren();host.hidden=true;
  if(!sandbox||!storyId)return false;
  host.hidden=false;
  const scope={storyId,chapterId};
  const box=E('section');box.className='dudu-v452-body';host.append(box);
  box.append(E('h3','Bình luận chung Sandbox'),E('p','testA/testB là vai ảo. Chung kho trên cùng trình duyệt và địa chỉ web; không đồng bộ thiết bị, trình duyệt hay chế độ ẩn danh.'));
  const role=E('select');role.setAttribute('aria-label','Vai ảo Sandbox');
  for(const name of root.DuduSandboxDiscussion.actors){const o=E('option',name);o.value=name;role.append(o)}
  role.value=options.actor||'testA';
  role.onchange=()=>render({...options,actor:role.value});box.append(role);
  const actor=role.value,status=E('p');status.setAttribute('role','status');
  const button=(text,fn)=>{const b=E('button',text);b.type='button';b.onclick=()=>{try{fn()}catch(e){status.textContent=e.message}};return b};
  try{
   const api=root.DuduSandboxDiscussion.create(root.localStorage);
   const redraw=()=>render({...options,actor});
   const inbox=api.inbox(actor,scope);
   box.append(E('p','Thông báo trả lời: '+inbox.filter(n=>!n.read).length+' chưa đọc'),button('Đánh dấu đã đọc',()=>{api.run(actor,{type:'read',...scope});redraw()}));
   for(const n of inbox)box.append(E('p',(n.read?'Đã đọc: ':'Mới: ')+n.commentId));
   const form=E('form'),input=E('textarea'),send=E('button','Gửi bình luận');
   input.maxLength=600;input.setAttribute('aria-label','Nội dung bình luận Sandbox');send.type='submit';
   if(options.parentId)form.append(E('p','Đang trả lời '+options.parentId),button('Hủy trả lời',()=>render({...options,actor,parentId:null})));
   form.append(input,send);form.onsubmit=e=>{e.preventDefault();try{
    api.run(actor,{type:'post',...scope,parentId:options.parentId||null,text:input.value,requestId:root.crypto.randomUUID()});
    render({...options,actor,parentId:null});
   }catch(err){status.textContent=err.message}};box.append(form);
   for(const c of api.list(scope)){
    const row=E('article');row.className='dudu-v452-comment'+(c.parentId?' nested':'');
    row.append(E('strong',c.actor),E('p',c.text));
    if(!c.parentId)row.append(button('Trả lời',()=>render({...options,actor,parentId:c.id})));
    const reason=E('select');reason.setAttribute('aria-label','Lý do báo cáo');
    for(const r of root.DuduSandboxDiscussion.reasons){const o=E('option',r);o.value=r;reason.append(o)}
    row.append(reason,button('Báo cáo',()=>{api.run(actor,{type:'report',commentId:c.id,reason:reason.value});redraw()}));box.append(row);
   }
   const reports=api.reports(scope);box.append(E('p','Báo cáo mô phỏng: '+reports.length));
   if(actor==='AUTHOR')for(const r of reports)box.append(E('p',r.actor+' · '+r.commentId+' · '+r.reason));
  }catch(e){status.textContent=e.message}
  box.append(status);return true;
 }
 root.addEventListener('storage',e=>{if(e.key===root.DuduSandboxDiscussion.KEY)for(const [host,o] of mounts)if(host.isConnected)render(o)});
 root.DuduSandboxDiscussionUI=Object.freeze({render});
})(window);
