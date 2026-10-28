// UI is served only by the 127.0.0.1 Node test host. Story prose is inserted
// through textContent, never HTML, and no JS/asset is loaded from the network.
export function renderRoleplayBrowserPage(nonce){
 return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><title>Bến Sương — DUDU Studio (thử offline)</title>
<style nonce="${nonce}">
*{box-sizing:border-box}html{min-height:100%;background:#081820}
body{margin:0;color:#f6f1e6;background:radial-gradient(ellipse at 70% -20%,#1c4c57 0%,transparent 53%),linear-gradient(155deg,#081820,#102a35 65%,#132c30);min-height:100vh;font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
button{font:inherit;cursor:pointer}button:disabled{cursor:wait;opacity:.58}
button:focus-visible{outline:3px solid #ffd991;outline-offset:4px}
.shell{width:min(740px,100%);margin:auto;padding:30px clamp(16px,4vw,42px) 70px}
.mast{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;border-bottom:1px solid #ffffff27;padding-bottom:20px}
.brand{font-weight:800;letter-spacing:.17em;font-size:.85rem;color:#f4d9a0}.mode{color:#a9c9cb;font-size:.76rem;border:1px solid #5d8188;padding:5px 12px;border-radius:999px}
.eyebrow{color:#c9b17d;letter-spacing:.2em;font-size:.74rem;text-transform:uppercase;font-weight:700;margin:32px 0 10px}
h1{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:clamp(2.3rem,8vw,4.25rem);line-height:1.09;letter-spacing:-.035em;margin:0 0 12px}
.lede{color:#c3d1d1;font-size:1.02rem;max-width:58ch;margin:0 0 26px}
.card{border:1px solid #83b4b24d;border-radius:18px;background:#142f38de;box-shadow:0 16px 40px #0003;padding:clamp(20px,4vw,32px)}
.intro{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.lantern{height:48px;width:48px;display:grid;place-items:center;border:1px solid #e7c18080;border-radius:14px;color:#f1d28f;font-size:1.4rem;background:linear-gradient(140deg,#554830,#1b333a)}
h2{font:500 1.48rem/1.25 Georgia,serif;margin:0}.muted{color:#a9bfc1;font-size:.89rem;margin:6px 0 0}
.roles,.choices{display:grid;gap:12px;margin-top:20px}
.choice{width:100%;text-align:left;color:#f9f3e7;border:1px solid #6f9a9a70;border-radius:12px;background:#23434a;padding:17px 20px;transition:background .15s,border-color .15s,transform .15s}
.choice:hover:not(:disabled){background:#2e5960;border-color:#eacb87;transform:translateY(-1px)}
.choice strong{display:block;font-size:1rem;font-weight:650}.choice small{color:#b8cdcc;font-size:.84rem;display:block;margin-top:4px}
.divider{height:1px;background:linear-gradient(90deg,#e2bf7770,transparent);margin:22px 0}
.scene-meta{display:flex;align-items:center;flex-wrap:wrap;gap:9px;color:#bed0cf;font-size:.81rem;margin-bottom:18px}
.tag{border:1px solid #8faca06b;border-radius:100px;padding:3px 10px}
.narration{font:1.2rem/1.8 Georgia,"Times New Roman",serif;white-space:pre-line;color:#f8f3e6;margin:0 0 24px}
.speech{border-left:3px solid #d6b573;padding:4px 0 4px 18px;color:#d4e5e0;white-space:pre-line;margin:0 0 14px}
.reaction{font-size:.93rem;background:#36535360;border-radius:10px;padding:12px 16px;color:#e4dbb8;white-space:pre-line;margin:12px 0 0}
.choice-title{font-size:.84rem;text-transform:uppercase;letter-spacing:.1em;color:#ddc18b;font-weight:700}
.ending{padding-top:15px;margin-top:24px;border-top:1px solid #d1b07870}
.ending-title{font:1.75rem Georgia,serif;color:#f3d28c;margin:10px 0}
.reset{color:#0e2a30;border:0;border-radius:10px;padding:13px 18px;background:#ebcb8c;font-weight:750;margin-top:10px}
.reset:hover{background:#f7dba7}
.note{font-size:.83rem;color:#94b6b8;margin:22px 2px 0;line-height:1.7}
.notice{margin:16px 0;color:#ffcf9f;min-height:1.5em;font-size:.9rem}
[hidden]{display:none!important}
@media (max-width:390px){.shell{padding-top:20px}.card{padding:18px}.mast{gap:8px}.choice{padding:15px}.narration{font-size:1.1rem}}
@media (prefers-reduced-motion:reduce){.choice{transition:none}}
</style></head><body>
<main class="shell">
<header class="mast"><span class="brand">DUDU STUDIO · VẠN GIỚI</span><span class="mode">CHẠY TRÊN MÁY · KHÔNG LƯU</span></header>
<p class="eyebrow">Bản thử tác giả · G5C-P2</p>
<h1>Ngọn đèn cuối<br>ở Bến Sương</h1>
<p class="lede">Bão đã phủ kín cầu cảng. Khi ngọn đèn yếu dần, lựa chọn của bạn sẽ quyết định điều gì còn lại sau đêm nay.</p>
<section id="start" class="card" aria-labelledby="start-title">
 <div class="intro"><span class="lantern" aria-hidden="true">✦</span><div><h2 id="start-title">Bạn là ai tại Bến Sương?</h2><p class="muted">Chọn một thân phận để bắt đầu kịch bản ngắn.</p></div></div>
 <div id="roles" class="roles" aria-live="polite"></div>
</section>
<section id="story" class="card" aria-live="polite" aria-label="Cảnh nhập vai" hidden>
 <div class="scene-meta"><span class="tag" id="role-name"></span><span id="scene-number"></span></div>
 <p id="narration" class="narration"></p>
 <p id="dialogue" class="speech"></p>
 <p id="reaction" class="reaction" hidden></p>
 <div id="choice-block"><div class="divider"></div><span class="choice-title">Bạn sẽ làm gì?</span><div id="choices" class="choices"></div></div>
 <div id="ending" class="ending" hidden><p class="eyebrow">Kết thúc kịch bản</p><p class="ending-title">Một đêm, hai điều không thể giữ</p><p class="muted">Đây chỉ là kết thúc câu chuyện: chưa xác nhận nhiệm vụ, không cấp EXP, Xu hay vật phẩm.</p><button class="reset" type="button" id="restart">Thử thân phận khác</button></div>
</section>
<p id="notice" class="notice" role="status" aria-live="polite"></p>
<p class="note">Bản thử hoàn toàn trong RAM, chỉ dùng lời thoại NPC có sẵn. Không có AI tự viết Canon, không kết nối tài khoản hoặc Kho, không phát hành thế giới và không lưu tiến trình khi đóng trình duyệt.</p>
</main>
<script nonce="${nonce}">
(()=>{
 'use strict';
 const byId=id=>document.getElementById(id);
 const start=byId('start'),story=byId('story'),roles=byId('roles'),choices=byId('choices');
 const notice=byId('notice');
 let current=null,sessionId=null,entryLabel='',pendingEvent=null,working=false;
 const announce=message=>{notice.textContent=message||'';};
 const button=(label,description,action)=>{
  const b=document.createElement('button');b.type='button';b.className='choice';
  const title=document.createElement('strong');title.textContent=label;b.append(title);
  if(description){const small=document.createElement('small');small.textContent=description;b.append(small);}
  b.addEventListener('click',action);return b;
 };
 async function request(path,payload){
  const response=await fetch(path,{method:payload?'POST':'GET',
   headers:payload?{'Content-Type':'application/json'}:{},
   body:payload?JSON.stringify(payload):undefined,credentials:'omit',cache:'no-store'});
  const value=await response.json();
  if(!response.ok||!value.ok)throw Error(value.code||'request-failed');
  return value;
 }
 const busy=value=>{working=value;document.querySelectorAll('.choice,.reset').forEach(b=>b.disabled=value);};
 function show(view){
  current=view;start.hidden=true;story.hidden=false;
  byId('role-name').textContent=entryLabel;
  byId('scene-number').textContent='Cảnh '+String(view.revision+1);
  byId('narration').textContent=view.narration;
  byId('dialogue').textContent=view.dialogue;
  const reaction=byId('reaction');reaction.textContent=view.roleReaction||'';
  reaction.hidden=!view.roleReaction;
  choices.replaceChildren();
  const ending=!!view.narrativeEndingId;
  byId('choice-block').hidden=ending;
  byId('ending').hidden=!ending;
  if(!ending)view.choices.forEach(x=>choices.append(button(x.label,'',()=>select(x.choiceId))));
  announce('');
  if(ending)byId('restart').focus();
  else choices.querySelector('button')?.focus();
 }
 async function begin(entry){
  if(working)return;
  busy(true);
  try{
   const result=await request('/api/start',{entryId:entry.entryId});
   entryLabel=entry.label;sessionId=result.sessionId;pendingEvent=null;show(result.view);
  }catch{announce('Không thể bắt đầu bản thử. Kiểm tra cửa sổ Node và thử lại.');}
  finally{busy(false);}
 }
 async function select(choiceId){
  if(working||!current||!sessionId)return;
  if(!pendingEvent||pendingEvent.choiceId!==choiceId)
   pendingEvent={choiceId,eventId:crypto.randomUUID(),expectedRevision:current.revision};
  busy(true);
  try{
   const result=await request('/api/choose',{sessionId,...pendingEvent});
   pendingEvent=null;show(result.view);
  }catch{announce('Lựa chọn chưa có phản hồi. Bấm lại cùng lựa chọn để thử nhận biên nhận cũ, hoặc làm mới trang để chơi lại.');}
  finally{busy(false);}
 }
 byId('restart').addEventListener('click',()=>{
  if(working)return;current=null;sessionId=null;pendingEvent=null;
  story.hidden=true;start.hidden=false;announce('');roles.querySelector('button')?.focus();
 });
 request('/api/catalog').then(result=>{
  roles.replaceChildren();
  const explain={native_extra:'Người đã quen con nước và Bà Lan.',
   system_cover:'Người lạ mang danh nghĩa thanh tra tín hiệu.'};
  result.entryProfiles.forEach(entry=>roles.append(button(entry.label,explain[entry.mode]||entry.mode,()=>begin(entry))));
 }).catch(()=>announce('Không kết nối được với bản thử trên máy. Hãy khởi động lại Node.'));
})();
</script></body></html>`;
}
