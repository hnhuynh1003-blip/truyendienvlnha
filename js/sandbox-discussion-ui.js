/* Sandbox-only view: no Firebase or network dependencies. */
(function(root){
 'use strict';
 const mounts=new Map();
 const fmt=ts=>Number.isFinite(ts)?new Date(ts).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Trước V46';
 const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 function render(options={}){
  const {host,sandbox,storyId,chapterId=null}=options;
  if(!host)return false;
  mounts.set(host,options);host.replaceChildren();host.hidden=true;
  if(!sandbox||!storyId)return false;
  host.hidden=false;
  const scope={storyId,chapterId};
  const box=E('section');box.className='dudu-v452-body dudu-sandbox-v46';host.append(box);
  box.append(E('h3','Bình luận chung Sandbox · V46'),E('p','testA, testB và AUTHOR là vai ảo. Dữ liệu chỉ chia sẻ trên cùng trình duyệt/địa chỉ web; không đồng bộ thiết bị khác.'));
  const role=E('select');role.setAttribute('aria-label','Vai ảo Sandbox');
  for(const name of root.DuduSandboxDiscussion.actors){const o=E('option',name);o.value=name;role.append(o)}
  role.value=options.actor||'testA';
  role.onchange=()=>render({...options,actor:role.value,parentId:null});box.append(E('label','Chọn vai ảo:'),role);
  const actor=role.value,status=E('p',options.notice||'');
  mounts.set(host,{...options,actor});status.setAttribute('role','status');
  const button=(text,fn)=>{const b=E('button',text);b.type='button';b.onclick=()=>{try{fn()}catch(e){status.textContent=e.message}};return b};
  try{
   const api=root.DuduSandboxDiscussion.create(root.localStorage);
   const redraw=(notice)=>render({...options,actor,parentId:null,notice});
   const inbox=api.inbox(actor,scope);
   const updates=E('section');updates.className='dudu-sandbox-v46-section';
   updates.append(E('h4','Thông báo trả lời: '+inbox.filter(n=>!n.read).length+' chưa đọc'),button('Đánh dấu đã đọc',()=>{api.run(actor,{type:'read',...scope});redraw('Đã đọc thông báo.')}));box.append(updates);
   const all=api.snapshot().comments;
   for(const n of inbox.slice().reverse()){
    const c=all.find(c=>c.id===n.commentId);
    const text=n.preview||c?.text||'Bình luận trước V46';
    const notice=E('div');notice.className='dudu-sandbox-v46-notice'+(n.read?'':' unread');
    notice.append(E('strong',(n.read?'Đã đọc · ':'Mới · ')+(n.from||c?.actor||'Người khác')),E('small',fmt(n.createdAt||c?.createdAt)),E('p',text));
    updates.append(notice);
   }
   const form=E('form'),input=E('textarea'),send=E('button','Gửi bình luận');
   input.maxLength=600;input.setAttribute('aria-label','Nội dung bình luận Sandbox');send.type='submit';
   if(options.parentId)form.append(E('p','Đang trả lời '+options.parentId),button('Hủy trả lời',()=>render({...options,actor,parentId:null})));
   const hint=E('p','30 bình luận/ngày UTC · 6 giây giữa các lượt · chặn bình luận trùng trong 10 phút');
   form.append(input,send,hint);form.className='dudu-sandbox-v46-form';form.onsubmit=e=>{e.preventDefault();try{
    api.run(actor,{type:'post',...scope,parentId:options.parentId||null,text:input.value,requestId:root.crypto.randomUUID()});
    redraw('Đã đăng bình luận Sandbox.');
   }catch(err){status.textContent=err.message}};box.append(form);
   for(const c of api.list(scope,actor)){
    const row=E('article');row.className='dudu-v452-comment dudu-sandbox-v46-comment'+(c.parentId?' nested':'')+(c.hidden?' hidden-comment':'');
    row.append(E('strong',c.actor+' · '+fmt(c.createdAt)),E('p',c.text));if(c.hidden)row.append(E('p','Đã ẩn bởi AUTHOR Sandbox'));
    if(!c.parentId&&!c.hidden)row.append(button('Trả lời',()=>render({...options,actor,parentId:c.id})));
    const reason=E('select');reason.setAttribute('aria-label','Lý do báo cáo');
    for(const r of root.DuduSandboxDiscussion.reasons){const o=E('option',r);o.value=r;reason.append(o)}
    if(!c.hidden)row.append(reason,button('Báo cáo',()=>{api.run(actor,{type:'report',commentId:c.id,reason:reason.value});redraw('Đã lưu báo cáo Sandbox.')})); 
    if(actor==='AUTHOR')row.append(button(c.hidden?'Khôi phục':'Ẩn bình luận',()=>{
     api.run(actor,{type:'moderate',commentId:c.id,hidden:!c.hidden});redraw(c.hidden?'Đã khôi phục bình luận.':'Đã ẩn bình luận.');
    }));
    box.append(row);
   }
   if(actor==='AUTHOR'){
    const reports=api.reports(scope,'AUTHOR');const queue=E('section');queue.className='dudu-sandbox-v46-section';
    queue.append(E('h4','Báo cáo mô phỏng: '+reports.length));
    for(const r of reports){const c=all.find(c=>c.id===r.commentId);queue.append(E('p',r.actor+' · '+r.commentId+' · '+r.reason+(c?.hidden?' · đã ẩn':' · đang hiển thị')))}
    queue.append(button('Đặt lại bình luận Sandbox',()=>{
     if(root.confirm('Chỉ xóa bình luận, thông báo và báo cáo chung của Sandbox? Không ảnh hưởng tài khoản, Xu, Kho hoặc dữ liệu chính thức.')){
      api.run('AUTHOR',{type:'reset'});redraw('Đã đặt lại kho bình luận Sandbox.');
     }
    }));
    box.append(queue);
   }
  }catch(e){status.textContent=e.message}
  box.append(status);return true;
 }
 root.addEventListener('storage',e=>{if(e.key===root.DuduSandboxDiscussion.KEY)for(const [host,o] of mounts)if(host.isConnected)render(o)});
 root.DuduSandboxDiscussionUI=Object.freeze({render});
})(window);
