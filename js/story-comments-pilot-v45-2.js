/* V45.2: shared comments for book/chapter, only through V45 pilot staging.
 * The old V44.2 local comment journal remains separate and never migrates
 * silently. No default sign-in, network calls, Firestore or item entitlements.
 */
(function(root){
 'use strict';
 const E=(tag,cl,value)=>{
  const n=document.createElement(tag);
  if(cl)n.className=cl;
  if(value!==undefined)n.textContent=String(value);
  return n;
 };
 const KEY=(storyId,chapterId)=>JSON.stringify([storyId,chapterId||null]);
 let requestId=null,lastKey='',lastReply=null;
 const lastSnapshot=new Map();
 function message(result){
  const labels={
   'pilot-disabled':'Worker staging chưa mở Pilot; bình luận chưa thể đồng bộ.',
   'pilot-config-incomplete':'Worker chưa có đủ UID thử nghiệm và namespace riêng.',
   'pilot-forbidden':'Tài khoản Firebase này chưa được phép tham gia Pilot.',
   'pilot-login-required':'Hãy đăng nhập Google Pilot trong Điện thoại → Phòng Thử Nghiệm.',
   'pilot-check-required':'Hãy bấm “Kiểm tra quyền Pilot” trong Điện thoại → Phòng Thử Nghiệm.',
   'unknown-scope':'Truyện hoặc chương chưa được đăng ký vào sổ bình luận staging.',
   'unauthenticated':'Phiên Firebase không hợp lệ; cần xác minh Pilot lại.',
   'invalid-comment':'Nội dung bình luận không hợp lệ (2–600 ký tự).',
   'invalid-scope':'Mã truyện hoặc chương không hợp lệ cho Pilot.',
   'cooldown':'Hãy đợi ít nhất 45 giây giữa hai bình luận.',
   'daily-limit':'Tài khoản đã đủ 20 bình luận trong ngày.',
   'idempotency-conflict':'Mã gửi lại không khớp nội dung đã gửi.',
   'session-changed':'Bạn đã đổi tài khoản; nội dung của phiên cũ không được hiển thị.',
   'pilot-admin-required':'Chỉ tài khoản tác giả Pilot có quyền admin Firebase mới đăng ký scope.',
   'network-unavailable':'Không kết nối được Worker staging; chưa ghi bình luận.',
   'timeout':'Kết nối staging quá hạn; kiểm tra danh sách trước khi gửi lại.',
   'invalid-register':'Mã truyện/chương không hợp lệ để đăng ký.'
  };
  return labels[result?.code]||'Máy chủ chưa xử lý: '+(result?.code||'không xác định');
 }
 const session=()=>root.DuduPilotClientV451?.getShared?.();
 function render({host,storyId,chapterId=null,storyTitle='',chapterTitle='',
  chapterIds=[],sandbox=false}={}){
  if(!host)return false;
  host.replaceChildren();
  if(!sandbox||!storyId||!session()){
   host.hidden=true;return false;
  }
  host.hidden=false;
  const key=KEY(storyId,chapterId);
  host.dataset.pilotScope=key;
  const api=session(),auth=api.session(),current=lastSnapshot.get(key);
  const container=E('details','dudu-v452-shell');
  // Shared board is primary; private journal underneath is not shared.
  container.open=true;
  container.append(E('summary','dudu-v452-head',
   '🌐 Bình luận chung Pilot · '+(chapterId?'Chương':'Truyện')));
  const body=E('div','dudu-v452-body');
  body.append(E('p','dudu-v452-explain',
   'A và B chỉ thấy bình luận của nhau khi đã đăng nhập Pilot và Worker staging được bật. '+
   'Các bình luận từng lưu trong hồ sơ riêng không tự chuyển sang đây.'));
  body.append(E('div','dudu-v452-scope',chapterId?
   (chapterTitle||'Chương truyện'):(storyTitle||'Tác phẩm')));
  const status=E('p','dudu-v452-status',
   auth.approved?'Đã xác minh '+auth.role+' · Dữ liệu bình luận chung staging.':
   'Chưa kết nối bình luận chung. Tài khoản Sandbox thông thường chỉ lưu bình luận riêng.');
  status.setAttribute('role','status');
  const validScope=root.DuduPilotClientV451.cleanScope(storyId,chapterId);
  if(!validScope){
   body.append(E('p','dudu-v452-status',
    'Mã truyện/chương không tương thích với sổ staging; chưa thể gửi bình luận.'));
   container.append(body);host.append(container);return true;
  }
  const controls=E('div','dudu-v452-controls');
  const makeButton=(name,fn,klass='')=>{
   const btn=E('button','dudu-v452-button '+klass,name);
   btn.type='button';btn.addEventListener('click',fn);
   return btn;
  };
  const redraw=()=>{
   if(host.dataset.pilotScope===key)render({host,storyId,chapterId,
    storyTitle,chapterTitle,chapterIds,sandbox});
  };
  if(!auth.approved){
   const openPhone=makeButton('Mở điện thoại để đăng nhập Pilot',()=>{
    if(typeof root.openPhoneApp==='function'){
     root.openPhoneApp('lab-v445');
     const phone=document.getElementById('cyber-phone');
     if(phone&&phone.style.display!=='flex'&&
       typeof root.togglePhone==='function')root.togglePhone();
    }else status.textContent='Vào Điện thoại → Phòng Thử Nghiệm → Đăng nhập Google Pilot.';
   });
   controls.append(openPhone,makeButton('Kiểm tra lại phiên',redraw));
  }else{
   controls.append(makeButton('Tải bình luận chung',async()=>{
    const button=controls.querySelector('button');button.disabled=true;
    status.textContent='Đang tải bình luận chung từ Worker staging…';
    const who=api.session();
    const res=await api.list(storyId,chapterId);
    button.disabled=false;
    if(host.dataset.pilotScope!==key)return;
    if(!res.ok||!who.approved){
     status.textContent=message(res);return;
    }
    lastSnapshot.set(key,{comments:Array.isArray(res.comments)?res.comments:[],
     sessionRevision:who.sessionRevision});
    redraw();
   },'primary'));
   if(auth.canManagePilot){
    controls.append(makeButton('Đăng ký mục thử (admin)',async()=>{
     const safeIds=Array.isArray(chapterIds)?
      chapterIds.filter(x=>typeof x==='string'&&
       root.DuduPilotClientV451.cleanScope(storyId,x)).slice(0,500):[];
     if(safeIds.length!==(chapterIds||[]).length){
      status.textContent='Danh sách chương không hợp lệ; chưa đăng ký.';return;
     }
     const result=await api.register(storyId,safeIds);
     if(host.dataset.pilotScope===key)status.textContent=result.ok?
      'Đã đăng ký truyện/chương vào staging. Hãy bấm “Tải bình luận chung”.':
      message(result);
    }));
   }
  }
  body.append(controls);
  if(auth.approved){
   const form=E('form','dudu-v452-form');
   const textarea=E('textarea','dudu-v452-input');
   textarea.placeholder='Bình luận này sẽ được chia sẻ trong nhóm Pilot A/B…';
   textarea.maxLength=600;textarea.rows=2;
   const submit=E('button','dudu-v452-button primary','Gửi bình luận chung');
   submit.type='submit';
   const replyBadge=E('div','dudu-v452-reply','');
   if(lastReply?.key===key){
    replyBadge.textContent='Đang trả lời một bình luận Pilot';
    replyBadge.append(makeButton('Hủy trả lời',()=>{
     lastReply=null;requestId=null;redraw();
    }));
   }
   form.append(textarea,replyBadge,submit);
   form.addEventListener('submit',async e=>{
    e.preventDefault();
    const text=textarea.value.trim();
    if(!text||text.length<2||text.length>600){
     status.textContent='Nội dung cần từ 2 đến 600 ký tự.';return;
    }
    if(lastKey!==key){lastKey=key;requestId=null}
    if(!requestId){
     if(!root.crypto?.randomUUID){
      status.textContent='Không có bộ tạo mã yêu cầu an toàn.';return;
     }
     requestId='v452-'+root.crypto.randomUUID();
    }
    const sessionRevision=api.session().sessionRevision;
    submit.disabled=true;status.textContent='Đang gửi bình luận chung…';
    const result=await api.post({storyId,chapterId,requestId,
     parentId:lastReply?.key===key?lastReply.commentId:null,text});
    submit.disabled=false;
    if(host.dataset.pilotScope!==key||sessionRevision!==api.session().sessionRevision)return;
    if(!result.ok){
     status.textContent=message(result);return;
    }
    requestId=null;lastReply=null;textarea.value='';
    status.textContent=result.alreadyPosted?
     'Bình luận đã được gửi trước đó, không tạo bản trùng.':
     'Đã ghi vào sổ staging. Bấm “Tải bình luận chung” để xem.';
    // Immediately reload after a confirmed server write; never display
    // a client-predicted comment before a server receipt exists.
    const refreshed=await api.list(storyId,chapterId);
    if(host.dataset.pilotScope===key&&refreshed.ok){
     lastSnapshot.set(key,{comments:refreshed.comments||[],sessionRevision});
     redraw();
    }
   });
   body.append(form);
  }
  // Cache only belongs to verified Pilot session. No localStorage persistence.
  const visible=auth.approved&&current?.sessionRevision===auth.sessionRevision&&
   Array.isArray(current.comments)?current.comments:[];
  const listing=E('div','dudu-v452-list');
  if(!visible.length)listing.append(E('p','dudu-v452-empty',
   'Chưa tải bình luận chung hoặc mục thử chưa có bình luận.'));
  for(const comment of visible.slice(-50)){
   const article=E('article','dudu-v452-comment'+(comment.parentId?' nested':''));
   article.append(E('strong','',comment.name||'Độc giả'),
    E('p','',comment.text||''));
   if(!comment.parentId&&auth.approved){
    article.append(makeButton('↪ Trả lời',()=>{
     lastReply={key,commentId:comment.id};
     requestId=null;redraw();
    }));
   }
   listing.append(article);
  }
  body.append(listing,status,
   E('small','dudu-v452-foot','Chỉ staging · Chỉ nhóm Firebase Pilot · Không gắn quà, không chuyển Xu hoặc vật phẩm.'));
  container.append(body);host.append(container);
  return true;
 }
 root.DuduStoryPilotCommentsV452=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
