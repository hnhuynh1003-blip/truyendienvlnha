/* V45.1 — optional live-UID PILOT diagnostics inside Sandbox phone only.
 * Separate from fictional V44.5 actors. No live Firestore, gifts, Xu or
 * inventory accesses. No network calls until explicit user interaction.
 */
(function(root){
 'use strict';
 const el=(tag,className,copy)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(copy!==undefined)node.textContent=String(copy);
  return node;
 };
 const roleLabel={READER_A:'Độc giả A',READER_B:'Độc giả B',
  AUTHOR:'Tác giả (Pilot)'};
 const errors={
  'pilot-disabled':'Pilot Firebase chưa mở trên Worker staging.',
  'pilot-config-incomplete':'Staging chưa đủ 3 UID và mã vùng lưu trữ riêng.',
  'pilot-forbidden':'UID hiện tại không thuộc nhóm ba tài khoản Pilot.',
  unauthenticated:'Phiên Firebase chưa hợp lệ hoặc đã hết hạn.',
  'pilot-login-required':'Hãy đăng nhập Google vào phiên Pilot riêng.',
  'pilot-check-required':'Hãy xác nhận quyền Pilot trước khi mở bình luận.',
  'unknown-scope':'Truyện/chương chưa được quản trị viên đăng ký ở staging.',
  cooldown:'Bình luận quá nhanh. Hãy thử lại sau.',
  'daily-limit':'Tài khoản đã đạt giới hạn bình luận trong ngày.',
  'session-changed':'Tài khoản đã đổi, hãy xác minh Pilot lại.',
  'invalid-scope':'Mã truyện hoặc chương không hợp lệ.',
  'invalid-comment':'Nội dung bình luận cần từ 2 đến 600 ký tự.',
  'network-unavailable':'Không thể kết nối Worker staging.',
  timeout:'Kết nối staging quá thời hạn.',
  'login-failed':'Không hoàn tất đăng nhập Google.',
  'endpoint-denied':'Tính năng không thuộc phạm vi Pilot V45.1.'
 };
 const client=()=>root.DuduPilotClientV451;
 let api=null,host=null,busy=false,notice='',kind='info',rows=[];
 let scopeInput={storyId:'',chapterId:'',text:''},requestId=null;
 let status=null;
 function use(){if(!api)api=client()?.create();return api}
 const explain=res=>errors[res?.code]||
   (typeof res?.code==='string'?'Máy chủ phản hồi: '+res.code:
   'Không hoàn tất thao tác. Vui lòng kiểm tra kết nối.');
 function inform(text,isError=false){notice=text;kind=isError?'error':'info'}
 function action(label,fn,cls=''){
  const b=el('button','dudu-v451-btn '+cls,label);
  b.type='button';b.disabled=busy;
  b.addEventListener('click',fn);
  return b;
 }
 async function perform(fn){
  if(busy)return;
  busy=true;render({host,sandbox:true});
  try{await fn()}catch(_){inform('Không thể xử lý thao tác Pilot.',true)}
  finally{busy=false;render({host,sandbox:true})}
 }
 function field(label,value,key,placeholder,multi=false){
  const wrap=el('label','dudu-v451-field');
  wrap.append(el('span','',label));
  const input=el(multi?'textarea':'input','',undefined);
  if(!multi)input.type='text';
  if(multi)input.rows=3;
  input.value=value;input.placeholder=placeholder;
  input.maxLength=multi?600:160;
  input.addEventListener('input',()=>{
   scopeInput[key]=input.value;requestId=null;
  });
  wrap.append(input);return wrap;
 }
 function render({host:nextHost,sandbox=false}={}){
  if(nextHost)host=nextHost;
  if(!host)return false;
  host.replaceChildren();
  if(!sandbox||!client()){
   host.hidden=true;return false;
  }
  host.hidden=false;
  const box=el('section','dudu-v451');
  box.append(el('div','dudu-v451-kicker','PILOT V45.1 · STAGING'),
   el('h3','', 'Kiểm thử UID Firebase thật'),
   el('p','dudu-v451-note',
    'Khác phòng giả lập A/B/Tác giả ở trên: đây là phiên Google độc lập, chỉ liên hệ Worker staging. Không đọc hồ sơ, Kho hay Xu thật.'));
  const instance=use(),session=instance?.session()||{signed:false};
  const identity=el('div','dudu-v451-identity',
   session.signed?'Phiên Firebase: '+session.uidHint+
    (session.approved?' · '+(roleLabel[session.role]||'Đã xác thực'):
    ' · Chưa được xác minh Pilot'):
    'Chưa đăng nhập tài khoản thử nghiệm');
  box.append(identity);
  const toolbar=el('div','dudu-v451-actions');
  if(!session.signed)toolbar.append(action('Đăng nhập Google Pilot',()=>perform(async()=>{
   const result=await instance.login();
   inform(result.ok?'Đã đăng nhập phiên riêng. Chọn “Kiểm tra quyền Pilot”.':
    explain(result),!result.ok);
  }),'primary'));
  else{
   toolbar.append(action('Kiểm tra quyền Pilot',()=>perform(async()=>{
    const result=await instance.status();
    status=result.ok?result:null;
    inform(result.ok?'UID được phép: '+(roleLabel[result.role]||result.role)+
      '. Kết nối tới vùng staging riêng.':explain(result),!result.ok);
   }),'primary'));
   toolbar.append(action('Đăng xuất Pilot',()=>perform(async()=>{
    await instance.logout();rows=[];status=null;requestId=null;
    inform('Đã đóng phiên Google Pilot; dữ liệu Sandbox giả lập không đổi.');
   })));
  }
  box.append(toolbar);
  if(session.approved&&status?.ok){
   const flags=el('div','dudu-v451-flags',
    'Bình luận: '+(status.gates?.comments?'Đã bật':'Chưa mở')+
    ' · Quà: '+(status.gates?.gifts?'Thử nghiệm':'Chưa mở')+
    ' · Chuyển sở hữu: '+(status.gates?.settlement?
      'Cần kiểm tra thêm khóa server':'KHÓA'));
   box.append(flags);
   const area=el('div','dudu-v451-form');
   area.append(field('Mã truyện',scopeInput.storyId,'storyId','story-id'),
    field('Mã chương (có thể để trống)',scopeInput.chapterId,
     'chapterId','chapter-id'),
    field('Nội dung bình luận thử',scopeInput.text,'text',
     'Lời nhắn giữa các tài khoản Pilot…',true));
   box.append(area);
   const buttons=el('div','dudu-v451-actions');
   buttons.append(action('Đọc bình luận staging',()=>perform(async()=>{
    const result=await instance.list(scopeInput.storyId,
     scopeInput.chapterId||null);
    if(result.ok){rows=Array.isArray(result.comments)?
      result.comments.slice(-30):[];
      inform('Đã lấy '+rows.length+' bình luận từ staging.');}
    else inform(explain(result),true);
   })));
   buttons.append(action('Gửi bình luận thử',()=>perform(async()=>{
    if(!requestId){
     if(typeof crypto==='undefined'||!crypto.randomUUID){
      inform('Trình duyệt thiếu mã yêu cầu an toàn.',true);return;
     }
     requestId='v451-'+crypto.randomUUID();
    }
    const result=await instance.post({...scopeInput,
     chapterId:scopeInput.chapterId||null,requestId});
    if(result.ok){
     requestId=null;scopeInput.text='';
     inform(result.alreadyPosted?'Yêu cầu đã được ghi trước đó; không đăng lặp.':
      'Đã lưu bình luận thử trên staging.');
    }else inform(explain(result),true);
   }),'primary'));
   box.append(buttons);
   if(rows.length){
    const feed=el('div','dudu-v451-feed');
    feed.append(el('strong','','Thảo luận staging ('+rows.length+')'));
    for(const row of rows.slice(-10)){
     const line=el('article','dudu-v451-comment');
     line.append(el('span','',row.name||'Độc giả'),
      el('p','',row.text||''));
     feed.append(line);
    }
    box.append(feed);
   }
  }
  const footer=el('p','dudu-v451-status'+(kind==='error'?' is-error':''),
   notice||'Chưa gửi yêu cầu nào. Pilot chỉ hoạt động khi Worker được bật và UID thuộc allowlist.');
  footer.setAttribute('role','status');box.append(footer);
  box.append(el('small','dudu-v451-disclaimer',
   'Chỉ dùng tài khoản kiểm thử. Không phát quà, không đổi quyền tác giả, không đồng bộ Firestore.'));
  host.append(box);
  return true;
 }
 root.DuduPilotLabUIV451=Object.freeze({render});
})(typeof window!=='undefined'?window:{});
