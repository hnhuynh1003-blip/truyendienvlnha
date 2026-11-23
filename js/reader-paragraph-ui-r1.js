/* Local-only adapter. Re-renders text runs, never re-enters readChapter(). */
(function(root){
 'use strict';
 const M=root.DuduParagraphModelR1;let epoch=0,current=null,panel,select,area,status,undoButton,paragraphChoice,point=null;
 const positions=new WeakMap();
 const uid=()=>root.DuduAuth?.isReady?.()?root.DuduAuth.uid():null;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 function live(s){return current===s&&s.scope.uid===uid()&&s.host.isConnected;}
 function message(text){status.textContent=text;}
 function close(restore=true){if(panel&&!panel.hidden){panel.hidden=true;point=null;const s=current;if(restore&&s&&live(s)&&s.runs.every(r=>r.nodes.every(n=>n.isConnected)))paint(s);}}
 function paint(s){
  const y=root.scrollY;
  s.runs.forEach((run,i)=>{
   const fragment=document.createDocumentFragment(),nodes=[];
   const edges=[0,...s.cuts[i],run.text.length];
   for(let j=1;j<edges.length;j++){
    const raw=run.text.slice(edges[j-1],edges[j]).replace(/\n/g,' '),text=raw.trim();if(!text)continue;
    const p=el('p');s.binder(p,text);
    // During editing show source text for exact offsets, then restore aliases on Done.
    if(panel&&!panel.hidden)p.textContent=text;
    positions.set(p,{run:i,start:edges[j-1]+raw.length-raw.trimStart().length,text});
    fragment.append(p);nodes.push(p);
   }
   run.nodes[0].before(fragment);run.nodes.forEach(n=>n.remove());run.nodes=nodes;
  });
  point=null;root.scrollTo(0,y);
 }
 function update(){const s=current;if(!s||!live(s))return;const i=Number(select.value)||0;area.value=s.runs[i]?.text||'';undoButton.disabled=!s.history.length;
  paragraphChoice.replaceChildren(...[0,...s.cuts[i]].map((pos,j)=>{const o=el('option','Đoạn '+(j+1)+': '+s.runs[i].text.slice(pos,pos+65).trim());o.value=pos;return o;}));
  const count=s.cuts.reduce((n,c)=>n+c.length+1,0);
  message('Hiện có '+count+' đoạn. Bấm “Tự chia theo câu” để chia cả chương, hoặc chọn chữ rồi chia tại vị trí đó. Bấm Xong để đọc với bố cục đã lưu.');}
 function commit(cuts){const s=current;if(!s||!live(s))return;
  try{const data=M.record(s.scope,cuts);if(!M.validate(data,s.scope,s.runs.map(r=>r.text)))throw Error();localStorage.setItem(s.key,JSON.stringify(data));s.history.push(s.cuts.map(x=>x.slice()));if(s.history.length>30)s.history.shift();s.cuts=cuts;paint(s);update();}catch{message('Không lưu được bố cục. Chưa áp dụng thay đổi. Hãy sao lưu hoặc kiểm tra dung lượng trình duyệt.');}
 }
 function button(text,fn){const b=el('button',text);b.type='button';b.className='btn';b.addEventListener('click',fn);return b;}
 function init(){if(panel)return;
  panel=el('section');panel.id='reader-paragraph-panel-r1';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Chỉnh đoạn văn cá nhân');
  const box=el('div');box.className='paragraph-dialog-r1';box.append(el('h3','Chỉnh đoạn cá nhân'));
  const advanced=el('details');advanced.append(el('summary','Chia/gộp thủ công · Bố cục gốc · Sao lưu'));
  const label=el('label','Khối văn bản ');select=el('select');select.setAttribute('aria-label','Khối văn bản giữa các ảnh');select.addEventListener('change',()=>{point=null;update();});label.append(select);advanced.append(label);
  area=el('textarea');area.readOnly=true;area.setAttribute('aria-label','Chữ gốc: chạm hoặc dùng phím để đặt con trỏ chia đoạn');area.addEventListener('focus',()=>{point=null;});advanced.append(area);
  paragraphChoice=el('select');paragraphChoice.setAttribute('aria-label','Đi tới đầu đoạn để gộp');paragraphChoice.addEventListener('change',()=>{point=null;const pos=+paragraphChoice.value;area.focus();area.setSelectionRange(pos,pos);});advanced.append(paragraphChoice);
  const actions=el('div');actions.className='paragraph-actions-r1';
  const auto=button('Tự chia theo câu',()=>{const s=current;if(!s||!live(s))return;try{const cuts=s.runs.map((r,i)=>M.suggest(r.text,s.cuts[i]));if(JSON.stringify(cuts)===JSON.stringify(s.cuts))return message('Không tìm thấy điểm chia mới. Chọn chữ để chia thủ công; bố cục chưa thay đổi.');commit(cuts);message('Đã chia và lưu ngay trên trang đọc: '+s.cuts.reduce((n,c)=>n+c.length+1,0)+' đoạn. Bấm Xong — đọc tiếp. Có thể Hoàn tác.');}catch{message('Không thể tự chia chương này. Chọn một vị trí cụ thể để chia; bố cục chưa thay đổi.');}});auto.classList.add('paragraph-primary-r1');actions.append(auto);
  const manual=el('div');manual.className='paragraph-actions-r1';advanced.append(manual);
  manual.append(button('Chia tại con trỏ',()=>{const s=current;if(!s||!live(s))return;const i=point?.run??+select.value,pos=point?.offset??area.selectionStart,c=s.cuts.map(x=>x.slice());if(c[i].includes(pos))return message('Vị trí này đã là đầu đoạn, chưa có thay đổi. Chọn chữ ở giữa đoạn hoặc bấm Tự chia theo câu.');c[i]=[...new Set([...c[i],pos])].sort((a,b)=>a-b);if(!M.valid(s.runs[i].text,c[i]))return message('Chưa chọn điểm chia bên trong đoạn. Chọn chữ trong truyện hoặc bấm Tự chia theo câu.');commit(c);}),
   button('Gộp với đoạn trước',()=>{const s=current;if(!s||!live(s))return;const i=point?.run??+select.value,pos=point?.offset??area.selectionStart,c=s.cuts.map(x=>x.slice()),at=c[i].findLastIndex(x=>x<=pos);if(at<0)return message('Đặt con trỏ trong đoạn cần gộp với đoạn trước.');c[i].splice(at,1);commit(c);}));
  undoButton=button('Hoàn tác',()=>{const s=current;if(!s||!live(s)||!s.history.length)return;const previous=s.history.at(-1);try{localStorage.setItem(s.key,JSON.stringify(M.record(s.scope,previous)));s.history.pop();s.cuts=previous;paint(s);update();}catch{message('Không lưu được hoàn tác.');}});actions.append(undoButton,
   button('Xong — đọc tiếp',()=>close()));
  manual.append(button('Bố cục gốc',()=>{if(current&&live(current)&&root.confirm('Khôi phục bố cục gốc của chương này? Có thể hoàn tác trong phiên hiện tại.'))commit(current.runs.map(r=>r.originalCuts.slice()));}));
  advanced.append(button('Sao lưu chương',()=>{const s=current;if(!s||!live(s))return;const url=URL.createObjectURL(new Blob([JSON.stringify(M.record(s.scope,s.cuts))],{type:'application/json'})),a=el('a');a.href=url;a.download='dudu-paragraph-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),button('Phục hồi sao lưu',()=>input.click()));
  const input=el('input');input.type='file';input.accept='.json,application/json';input.hidden=true;
  input.addEventListener('change',async()=>{const s=current,file=input.files[0];input.value='';if(!s||!file||!live(s))return;try{if(file.size>500000)throw Error();const data=JSON.parse(await file.text());if(!live(s)||!M.validate(data,s.scope,s.runs.map(r=>r.text)))throw Error();if(root.confirm('Áp dụng vị trí từ sao lưu cho đúng tài khoản và chương này?'))commit(data.cuts);}catch{message('Không phục hồi: sai tài khoản, chương, fingerprint hoặc tệp không hợp lệ.');}});
  status=el('p');status.setAttribute('role','status');box.append(actions,status,advanced,input);panel.append(box);document.body.append(panel);panel.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.addEventListener('selectionchange',()=>{
   const s=current;if(!s||!live(s)||panel.hidden)return;
   const selection=root.getSelection();if(!selection?.anchorNode)return;
   const node=selection.anchorNode,p=node.nodeType===1?node.closest('p'):node.parentElement?.closest('p'),info=positions.get(p);
   if(!info||p.parentElement!==s.host)return;
   if(p.textContent!==info.text){point=null;return message('Tên hiển thị vừa thay đổi. Bấm Xong rồi mở Chỉnh đoạn lại để chọn đúng vị trí.');}
   const range=document.createRange();range.selectNodeContents(p);range.setEnd(node,selection.anchorOffset);
   point={run:info.run,offset:info.start+range.toString().length};
   message('Đã chọn vị trí trong truyện · khối '+(info.run+1)+'. Bấm Chia tại con trỏ hoặc Gộp với đoạn trước.');
  });
 }
 async function mount({host,book,chapter,content,revision='',binder,sources}){
  const mine=++epoch;close(false);current=null;const owner=uid();if(!owner)return;
  const runs=[];let run=null;for(const node of host.children){if(node.tagName==='P'&&sources.has(node)&&sources.get(node).trim()){if(!run){run={nodes:[],texts:[]};runs.push(run);}run.nodes.push(node);run.texts.push(sources.get(node));}else run=null;}
  if(!runs.length)return;runs.forEach(r=>{let offset=0;r.originalCuts=[];r.texts.forEach((t,i)=>{if(i)r.originalCuts.push(offset);offset+=t.length+1;});r.text=r.texts.join('\n');delete r.texts;});
  const signature=JSON.stringify([content,revision,Array.from(host.children,n=>n.tagName==='P'?sources.get(n):[n.tagName,n.alt||'']),runs.map(r=>r.text)]);
  try{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature));if(epoch!==mine||owner!==uid()||!host.isConnected)return;
   const scope={uid:owner,book,chapter,fingerprint:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')},s={scope,host,runs,binder,history:[],cuts:runs.map(r=>r.originalCuts.slice())};s.key=M.key(owner,book,chapter,scope.fingerprint);current=s;
   try{const raw=localStorage.getItem(s.key);if(raw){const data=JSON.parse(raw);if(M.validate(data,scope,runs.map(r=>r.text))){s.cuts=data.cuts;paint(s);}}}catch{/* Original reading stays available. */}
  }catch{/* Fingerprint unavailable: editing stays disabled. */}
 }
 function open(){init();const s=current;if(!s||!live(s)){root.alert('Cần đăng nhập và mở chương đã tải hoàn chỉnh để chỉnh đoạn.');return;}root.DuduReaderPreferencesL2C?.close();root.DuduReaderNamesL53?.setMode?.(false);s.host.before(panel);select.replaceChildren(...s.runs.map((r,i)=>{const o=el('option','Khối '+(i+1));o.value=i;return o;}));panel.hidden=false;paint(s);update();}
 root.addEventListener('dudu-auth-state-changed',()=>{const s=current;if(s&&s.scope.uid===uid())return;++epoch;close(false);if(s){s.cuts=s.runs.map(r=>r.originalCuts.slice());if(s.runs.every(r=>r.nodes.every(n=>n.isConnected)))paint(s);current=null;}});
 root.DuduReaderParagraphsR1=Object.freeze({mount,open});
})(window);
