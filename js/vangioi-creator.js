/* World Creator G1G. Local draft editing only; server rights/submit stay closed. */
(function(root){
 'use strict';
 const doc=root.document,V=root.DuduWorldValidation;
 if(!doc||!V)return;
 let owner=null,model=null,localId=null,dirty=false,serial=0,epoch=0,host=null,tab='overview',dbPromise=null;
 let report=null,jsonPending=false,jsonText='',counter=0,saving=false;
 const $=id=>doc.getElementById(id);
 const h=(tag,cl,text)=>{const n=doc.createElement(tag);if(cl)n.className=cl;if(text!==undefined)n.textContent=String(text);return n;};
 const button=(label,fn,cl='')=>{const n=h('button',cl,label);n.type='button';n.addEventListener('click',()=>{if(access())fn();});return n;};
 const currentUid=()=>root.DuduAuth?.isReady?.()===true?root.DuduAuth.uid():null;
 const permitted=()=>!!currentUid()&&root.DuduSystemAppsV69?.isAuthor?.()===true;
 const makeId=prefix=>prefix+'-'+root.crypto.randomUUID();
 const fresh=()=>({schemaVersion:'world-content-1',contentVersion:'1.0.0',story:{},maps:[],places:[],scenes:[],assets:[],missions:[]});
 const arr=key=>model[key]||[];
 function notice(text){const n=$('vg-message');if(n)n.textContent=text;}
 function syncAccess(){
  const next=currentUid();
  if(!permitted()||next!==owner){
   if(host?.isConnected)host.replaceChildren();
   host=null;owner=permitted()?next:null;model=null;localId=null;dirty=false;report=null;
   jsonPending=false;jsonText='';tab='overview';serial++;epoch++;saving=false;
  }
  return permitted();
 }
 function access(){syncAccess();return permitted()&&!!model&&owner===currentUid();}
 function mark(){
  dirty=true;serial++;report=null;
  const state=$('vg-save-state');if(state)state.textContent='Có thay đổi chưa lưu';
  const n=$('vg-report');if(n)n.replaceChildren(h('p','vg-muted','Nội dung đã đổi. Kiểm tra lại trước khi chuẩn bị hồ sơ.'));
 }
 function set(path,value,omitEmpty=false){
  const parts=path.split('.');let target=model;
  for(const key of parts.slice(0,-1))target=target[key]||(target[key]={});
  const key=parts.at(-1);if(omitEmpty&&value==='')delete target[key];else target[key]=value;
  mark();
 }
 function field(label,value,change,{area=false,options=null,omitEmpty=false}={}){
  const wrap=h('div','vg-field'),id='vg-field-'+(++counter),caption=h('label','',label);caption.htmlFor=id;
  wrap.append(caption);
  let n;
  if(options){
   n=h('select');n.append(new Option('Chưa chọn',''));
   for(const [v,text] of options)n.append(new Option(text,v));
  }else{n=h(area?'textarea':'input');if(area)n.rows=4;else n.type='text';}
  n.id=id;n.value=value??'';n.autocomplete='off';n.spellcheck=area;
  n.addEventListener(options?'change':'input',()=>{if(access())change(n.value,omitEmpty);});
  wrap.append(n);return wrap;
 }
 const bind=(label,path,value,options={})=>field(label,value,v=>set(path,v,options.omitEmpty),options);
 const choices=(rows,key,name)=>rows.filter(x=>typeof x[key]==='string').map(x=>[x[key],x[name]||x[key]]);
 function idLine(value){return h('small','vg-id',value||'Chưa có mã — bổ sung trong dữ liệu nâng cao');}
 function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
   if(!root.indexedDB){reject(Error('unavailable'));return;}
   const r=root.indexedDB.open('dudu-vangioi-creator-local-1',1);
   r.onupgradeneeded=()=>{const s=r.result.createObjectStore('drafts',{keyPath:['uid','localId']});s.createIndex('owner','uid');};
   r.onerror=()=>reject(Error('storage'));r.onblocked=()=>reject(Error('blocked'));
   r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();dbPromise=null;};resolve(r.result);};
  }).catch(error=>{dbPromise=null;throw error;});
  return dbPromise;
 }
 async function storage(op,user,id,value){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('drafts',op==='put'?'readwrite':'readonly'),s=tx.objectStore('drafts');
   const r=op==='put'?s.put(value):op==='list'?s.index('owner').getAll(user):s.get([user,id]);
   let result;r.onsuccess=()=>{result=r.result;};
   tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('storage'));
  });
 }
 function canUseJson(){if(jsonPending){notice('Áp dụng hoặc hoàn tác JSON đang sửa trước khi tiếp tục.');return false;}return true;}
 async function save(){
  if(!canUseJson()||saving)return;
  const valid=V.validateDraftContent(model);
  if(!valid.valid){report=valid;renderReport();notice('Có trường sai định dạng. Chỉnh lại trước khi lưu.');return;}
  const user=owner,ticket=epoch,version=serial,id=localId||makeId('draft'),content=V.copyAuthoringContent(model);
  saving=true;const b=$('vg-save');if(b)b.disabled=true;notice('Đang lưu trên thiết bị…');
  try{
   await storage('put',user,id,{format:'creator-local-1',uid:user,localId:id,updatedAt:Date.now(),content});
   if(!access()||owner!==user||epoch!==ticket)return;
   localId=id;if(serial===version)dirty=false;
   if($('vg-save-state'))$('vg-save-state').textContent=dirty?'Có thay đổi chưa lưu':'Đã lưu trên thiết bị · Chưa đồng bộ';
   notice(dirty?'Đã lưu bản trước. Có thay đổi mới chưa lưu.':'Đã lưu riêng cho tài khoản này trên thiết bị.');
  }catch{if(owner===user&&epoch===ticket)notice('Không lưu được trên thiết bị. Nội dung vẫn trong phiên; có thể xuất JSON để giữ lại.');}
  finally{if(owner===user&&epoch===ticket){saving=false;const n=$('vg-save');if(n)n.disabled=false;}}
 }
 function replace(content,id=null){model=structuredClone(content);localId=id;epoch++;serial++;dirty=id===null;report=null;jsonPending=false;jsonText='';saving=false;render();}
 function confirmReplace(){return !(dirty||jsonPending)||root.confirm('Thay bản đang soạn? Thay đổi chưa lưu sẽ không được giữ.');}
 async function list(){
  const user=owner,ticket=epoch;
  try{
   const rows=await storage('list',user);
   if(!access()||owner!==user||epoch!==ticket)return;
   const box=$('vg-local-list');box.replaceChildren();
   const valid=rows.filter(r=>r.uid===user&&r.format==='creator-local-1'&&typeof r.localId==='string').sort((a,b)=>b.updatedAt-a.updatedAt);
   if(!valid.length)box.append(h('p','vg-muted','Chưa có bản nháp trên thiết bị cho tài khoản này.'));
   for(const row of valid){
    box.append(button(row.content?.title||'World chưa đặt tên',async()=>{
     if(!confirmReplace())return;
     const u=owner,e=epoch,version=serial;notice('Đang mở bản nháp trên thiết bị…');
     try{
      const stored=await storage('get',u,row.localId);
      if(!access()||owner!==u||epoch!==e)return;
      if(serial!==version){notice('Nội dung vừa đổi. Mở lại nháp đã lưu khi bạn sẵn sàng thay bản đang soạn.');return;}
      if(stored?.uid!==u||stored.localId!==row.localId||stored.format!=='creator-local-1')throw Error('invalid');
      const parsed=V.parseDraft(JSON.stringify(stored.content));if(!parsed.ok)throw Error('invalid');
      replace(parsed.content,row.localId);notice('Đã mở bản nháp trên thiết bị.');
     }catch{if(owner===u&&epoch===e)notice('Bản nháp không đọc được. Bản đang soạn vẫn được giữ.');}
    }));
   }
  }catch{if(owner===user&&epoch===ticket)notice('Không đọc được kho nháp trên thiết bị.');}
 }
 function exportJson(){
  if(!canUseJson())return;
  const content=V.copyAuthoringContent(model),blob=new Blob([JSON.stringify(content,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=h('a');a.href=url;a.download='vangioi-world-draft.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Đã xuất bản nháp JSON. Tệp chứa cả ghi chú bí mật của tác giả.');
 }
 async function importFile(file){
  if(!file)return;
  if(file.size>2*1024*1024){notice('Tệp vượt giới hạn nhập 2 MiB.');return;}
  const user=owner,ticket=epoch;
  try{
   const parsed=V.parseDraft(await file.text());
   if(!access()||owner!==user||epoch!==ticket)return;
   if(!parsed.ok){notice(parsed.code==='unsupported-version'?'Chỉ nhập hồ sơ world-content-1. Giữ nguyên tệp V0.1 để chuyển đổi riêng.':'Tệp sai định dạng; bản đang soạn vẫn được giữ.');return;}
   if(confirmReplace()){replace(parsed.content);notice('Đã nhập nội dung nháp. Chưa xác minh nguồn, ảnh hoặc quyền sở hữu.');}
  }catch{if(owner===user&&epoch===ticket)notice('Không đọc được tệp; bản đang soạn vẫn được giữ.');}
 }
 function overview(panel){
  const grid=h('div','vg-grid');grid.append(
   bind('Tên tiểu thế giới','title',model.title),
   bind('Thể loại','genreId',model.genreId,{omitEmpty:true,options:[['ancient','Cổ đại'],['modern','Hiện đại'],['era','Niên đại'],['future','Tương lai'],['cultivation','Tu tiên'],['apocalypse','Mạt thế']]}),
   bind('Bậc đề nghị','requestedWorldRank',model.requestedWorldRank,{omitEmpty:true,options:['F','E','D','C','B','A','S'].map(x=>[x,x])}),
   bind('Phiên bản nội dung','contentVersion',model.contentVersion));
  panel.append(grid,h('p','vg-muted','Bậc đề nghị dành cho hồ sơ. Bậc chính thức cần được xét duyệt.'));
  for(const [key,label] of [['logline','Ý tưởng trong một câu'],['setting','Bối cảnh'],['playerRole','Vai trò người chơi'],['opening','Mở đầu'],['secretTruth','Sự thật ẩn · chỉ dành cho tác giả']])
   panel.append(bind(label,'story.'+key,model.story?.[key],{area:true}));
  for(const [key,label] of [['plotBeats','Nhịp truyện · mỗi dòng một ý'],['worldRules','Quy tắc thế giới · mỗi dòng một ý']])
   panel.append(field(label,(model.story?.[key]||[]).join('\n'),v=>set('story.'+key,v.split('\n').filter(x=>x.trim())),{area:true}));
 }
 function syncPlaces(){
  for(const p of arr('places'))if(p.placeId)p.sceneIds=arr('scenes').filter(s=>s.placeId===p.placeId&&s.sceneId).map(s=>s.sceneId);
 }
 function scenes(panel){
  panel.append(h('h3','','Địa điểm'),button('+ Thêm địa điểm',()=>{
   let map=arr('maps').find(m=>m.mapId);
   if(!map){map={mapId:makeId('map'),name:'Bản đồ chính',placeIds:[]};(model.maps||=[]).push(map);}
   const p={placeId:makeId('place'),mapId:map.mapId,name:'',sceneIds:[]};(model.places||=[]).push(p);(map.placeIds||=[]).push(p.placeId);mark();render();
  }));
  arr('places').forEach((p,i)=>{
   const card=h('section','vg-card');card.append(idLine(p.placeId),bind('Tên địa điểm','places.'+i+'.name',p.name));
   card.append(button('Xóa địa điểm',()=>{
    if(arr('scenes').some(s=>p.placeId&&s.placeId===p.placeId)){notice('Chuyển hoặc xóa các cảnh thuộc địa điểm này trước.');return;}
    model.places.splice(i,1);for(const m of arr('maps'))m.placeIds=(m.placeIds||[]).filter(x=>x!==p.placeId);mark();render();
   },'vg-quiet'));panel.append(card);
  });
  panel.append(h('h3','','Cảnh truyện'),button('+ Thêm cảnh',()=>{
   const s={sceneId:makeId('scene'),summary:'',viewIds:[],transitions:[]};
   const p=arr('places').find(x=>x.placeId);if(p)s.placeId=p.placeId;
   (model.scenes||=[]).push(s);syncPlaces();mark();render();
  }));
  arr('scenes').forEach((s,i)=>{
   const card=h('section','vg-card');card.append(idLine(s.sceneId),
    field('Địa điểm',s.placeId,v=>{if(v)s.placeId=v;else delete s.placeId;syncPlaces();mark();},{options:choices(arr('places'),'placeId','name')}),
    bind('Mô tả cảnh','scenes.'+i+'.summary',s.summary,{area:true}),
    bind('Ảnh nền tham chiếu','scenes.'+i+'.backgroundAssetId',s.backgroundAssetId,{omitEmpty:true,options:choices(arr('assets').filter(a=>['sceneBackground','sceneVariant'].includes(a.kind)),'assetId','altText')}));
   (s.transitions||[]).forEach((t,j)=>{
    const row=h('div','vg-card');row.append(bind('Chuyển tới cảnh','scenes.'+i+'.transitions.'+j+'.toSceneId',t.toSceneId,{omitEmpty:true,options:choices(arr('scenes'),'sceneId','summary')}),
     bind('Điều kiện chuyển cảnh','scenes.'+i+'.transitions.'+j+'.trigger',t.trigger),
     button('Xóa chuyển cảnh',()=>{s.transitions.splice(j,1);mark();render();},'vg-quiet'));card.append(row);
   });
   card.append(button('+ Đường chuyển cảnh',()=>{(s.transitions||=[]).push({trigger:''});mark();render();}),
    button('Xóa cảnh',()=>{model.scenes.splice(i,1);syncPlaces();mark();render();notice('Đã xóa cảnh. Kiểm tra lại các nhiệm vụ và đường chuyển tới cảnh này.');},'vg-quiet'));panel.append(card);
  });
  if(!arr('scenes').length)panel.append(h('p','vg-muted','Thêm nơi chốn và cảnh theo câu chuyện; không có quota cảnh theo bậc.'));
 }
 function resources(panel){
  panel.append(h('h3','','Nguồn truyện'),h('p','vg-muted','Tham chiếu nguồn và ảnh cần được máy chủ xác minh trước khi gửi duyệt. Chưa có kết nối chọn nguồn hoặc tải ảnh.'));
  for(const [key,label,options] of [['kind','Loại nguồn',{options:[['original','Sáng tác gốc'],['library','Thư viện'],['manuscript','Bản thảo']],omitEmpty:true}],
   ['storyId','Mã truyện',{omitEmpty:true}],['storyVersion','Phiên bản nguồn',{omitEmpty:true}],['contentHash','Hash nguồn đã đăng ký',{omitEmpty:true}]])
   panel.append(bind(label,'storySource.'+key,model.storySource?.[key],options));
  panel.append(h('h3','','Tham chiếu hình ảnh'),bind('Ảnh bìa world','worldCoverAssetId',model.worldCoverAssetId,{omitEmpty:true,options:choices(arr('assets').filter(a=>a.kind==='worldCover'),'assetId','altText')}),
   button('+ Thêm tham chiếu ảnh',()=>{(model.assets||=[]).push({assetId:makeId('art'),altText:''});mark();render();}));
  const kinds=[['worldCover','Bìa world'],['sceneBackground','Nền cảnh'],['sceneVariant','Biến thể cảnh'],['npcPortrait','Chân dung NPC'],['characterPortrait','Chân dung nhân vật'],['characterSprite','Nhân vật trong cảnh'],['characterIllustration','Minh họa nhân vật'],['characterSilhouette','Bóng nhân vật'],['characterAvatar','Avatar nhân vật'],['itemIcon','Vật phẩm'],['other','Khác']];
  arr('assets').forEach((a,i)=>{
   const card=h('section','vg-card');card.append(bind('Mã asset','assets.'+i+'.assetId',a.assetId,{omitEmpty:true}),
    bind('Loại hình ảnh','assets.'+i+'.kind',a.kind,{omitEmpty:true,options:kinds}),
    bind('Phiên bản asset','assets.'+i+'.assetVersion',a.assetVersion,{omitEmpty:true}),
    bind('Hash ảnh đã đăng ký','assets.'+i+'.contentHash',a.contentHash,{omitEmpty:true}),
    bind('Mô tả ngắn, tránh lộ bí mật','assets.'+i+'.altText',a.altText),
    button('Xóa tham chiếu ảnh',()=>{model.assets.splice(i,1);mark();render();notice('Đã xóa tham chiếu; kiểm tra lại ảnh bìa và nền cảnh.');},'vg-quiet'));panel.append(card);
  });
 }
 function missions(panel){
  panel.append(h('p','vg-muted','Mục tiêu, điều kiện và phần thưởng đề nghị cần được kiểm tra. Soạn nháp không phát nhiệm vụ hay thưởng thật.'),
   button('+ Thêm nhiệm vụ chính',()=>{(model.missions||=[]).push({missionId:makeId('mission'),name:'',summary:'',kind:'main',requiredForCompletion:true,objectives:[],rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'});mark();render();}));
  arr('missions').forEach((m,i)=>{
   const card=h('section','vg-card');card.append(idLine(m.missionId),bind('Tên nhiệm vụ','missions.'+i+'.name',m.name),
    bind('Tóm tắt nhiệm vụ','missions.'+i+'.summary',m.summary,{area:true}),
    bind('Cảnh bắt đầu','missions.'+i+'.startSceneId',m.startSceneId,{omitEmpty:true,options:choices(arr('scenes'),'sceneId','summary')}),
    h('p','vg-muted','Mục tiêu chi tiết, vai nhập, NPC, vật phẩm và kết cục: soạn tại Dữ liệu nâng cao.'),
    button('Xóa nhiệm vụ',()=>{model.missions.splice(i,1);mark();render();},'vg-quiet'));panel.append(card);
  });
 }
 function advanced(panel){
  panel.append(h('p','vg-muted','Toàn bộ nội dung world-content-1, gồm vai nhập, NPC, vật phẩm, mục tiêu và kết cục. Áp dụng JSON để cập nhật các biểu mẫu.'));
  if(!jsonPending)jsonText=JSON.stringify(model,null,2);
  const edit=field('JSON nội dung',jsonText,v=>{jsonText=v;jsonPending=true;mark();},{area:true});edit.querySelector('textarea').rows=18;panel.append(edit);
  panel.append(button('Áp dụng JSON',()=>{
   const parsed=V.parseDraft(jsonText);if(!parsed.ok){notice('JSON chưa hợp lệ. Nội dung biểu mẫu trước vẫn được giữ.');return;}
   model=structuredClone(parsed.content);jsonPending=false;jsonText='';mark();render();notice('Đã áp dụng nội dung JSON.');
  }),button('Hoàn tác phần JSON đang sửa',()=>{jsonPending=false;jsonText='';render();},'vg-quiet'));
 }
 function preview(panel){
  const box=h('section','vg-preview');box.id='vg-scene-preview';
  panel.append(h('p','vg-muted','Xem trước lời dẫn và địa điểm. Ảnh tham chiếu chưa được tải hoặc xác minh.'));
  const show=value=>{
   box.replaceChildren();
   const scene=arr('scenes').find(s=>s.sceneId===value),place=arr('places').find(p=>scene?.placeId&&p.placeId===scene.placeId);
   box.append(h('div','vg-preview-seal','BẢN SOẠN THẢO · CHƯA PHÁT HÀNH'),h('h3','',place?.name||'Chưa đặt tên địa điểm'),
    h('div','vg-art-empty','Chưa có hình nền để xem trước'),h('p','',scene?.summary||'Chọn một cảnh để xem lời dẫn.'));
  };
  panel.append(field('Cảnh xem trước','',show,{options:choices(arr('scenes'),'sceneId','summary')}));
  panel.append(box);show('');
 }
 const names={title:'Tên world',genreId:'Thể loại',requestedWorldRank:'Bậc đề nghị',dangerLevel:'Mức nguy hiểm',story:'Cốt truyện',
 storySource:'Nguồn truyện',worldCoverAssetId:'Ảnh bìa',assets:'Hình ảnh',maps:'Bản đồ',places:'Địa điểm',scenes:'Cảnh',views:'Góc nhìn',
 cast:'Dàn nhân vật',npcs:'NPC',playerEntryProfiles:'Vai nhập',entryPolicy:'Chọn vai nhập',entry:'Cảnh vào',items:'Vật phẩm',shops:'Cửa hàng',
 missions:'Nhiệm vụ',events:'Sự kiện',endings:'Kết cục',playRequirements:'Điều kiện chơi',aiPolicy:'Chính sách AI'};
 function renderReport(){
  const box=$('vg-report');if(!box)return;box.replaceChildren();box.parentElement.open=!!report;
  if(!report){box.append(h('p','vg-muted','Kiểm tra để tìm trường còn thiếu hoặc tham chiếu sai.'));return;}
  const errors=report.errors||[];
  box.append(h('strong','',errors.length?'Cần chỉnh '+errors.length+' mục':'Cấu trúc đủ để chuẩn bị hồ sơ'),
   h('p','vg-muted','Kiểm tra trên thiết bị; chưa xác minh quyền nguồn/ảnh và chưa gửi duyệt.'));
  const list=h('ul');
  for(const e of errors.slice(0,35)){
   const section=names[e.path.split('/')[1]]||'Hồ sơ';
   const message=e.code==='schema:required'?'Thiếu trường bắt buộc':e.code.startsWith('schema:')?'Sai định dạng hoặc giá trị':'Cần kiểm tra liên kết nội dung';
   list.append(h('li','',section+' · '+message+' ('+e.path+')'));
  }
  box.append(list);if(errors.length>35)box.append(h('small','','Đang hiển thị 35 mục đầu.'));
 }
 function render(){
  if(!host?.isConnected||!access())return;
  counter=0;host.replaceChildren();
  const app=h('section','vg-editor');app.id='dudu-world-creator';app.setAttribute('aria-label','World Creator');
  const header=h('div','vg-header');header.append(button('‹ Chủ Thần AU',()=>root.DuduSystemAppsV69.renderCore(),'vg-quiet'),
   h('div','vg-kicker','DUDU STUDIO / WORLD CREATOR'),h('h2','','Xây một tiểu thế giới'));
  const state=h('p','vg-state',dirty?'Có thay đổi chưa lưu':localId?'Đã lưu trên thiết bị · Chưa đồng bộ':'Nháp mới trên thiết bị');state.id='vg-save-state';
  header.append(state);app.append(header);
  const toolbar=h('div','vg-actions'),saveButton=button('Lưu trên thiết bị',save,'vg-primary');saveButton.id='vg-save';saveButton.disabled=saving;
  toolbar.append(saveButton,button('Kiểm tra hồ sơ',()=>{if(canUseJson()){report=V.inspectContent(model);renderReport();notice('Đã kiểm tra nội dung hiện tại.');}}));
  const submit=h('button','','Gửi duyệt');submit.type='button';submit.disabled=true;submit.setAttribute('aria-describedby','vg-backend-state');toolbar.append(submit);app.append(toolbar);
  const offline=h('p','vg-muted','Gửi duyệt chưa kết nối máy chủ. Bạn vẫn có thể soạn, lưu trên thiết bị và xuất bản nháp.');offline.id='vg-backend-state';app.append(offline);
  const menu=h('details','vg-files');menu.append(h('summary','','Bản nháp & tệp JSON'));
  const actions=h('div','vg-actions');actions.append(button('Nháp mới',()=>{if(confirmReplace()){replace(fresh());notice('Đã mở nháp mới.');}}),
   button('Mở nháp đã lưu',list),button('Xuất JSON',exportJson));
  const upload=h('input');upload.type='file';upload.accept='.json,application/json';upload.id='vg-import';upload.hidden=true;upload.setAttribute('aria-label','Nhập hồ sơ JSON');
  upload.addEventListener('change',()=>{if(access())importFile(upload.files?.[0]);upload.value='';});
  actions.append(button('Nhập JSON',()=>upload.click()));
  const listBox=h('div','vg-local-list');listBox.id='vg-local-list';menu.append(actions,upload,listBox);app.append(menu);
  const tabs=[['overview','Thông tin'],['scenes','Địa điểm & cảnh'],['resources','Nguồn & ảnh'],['missions','Nhiệm vụ'],['advanced','Dữ liệu nâng cao'],['preview','Xem trước']];
  const nav=h('nav','vg-tabs');nav.setAttribute('aria-label','Các mục soạn world');
  for(const [key,label] of tabs){const b=button(label,()=>{tab=key;render();});b.setAttribute('aria-current',key===tab?'page':'false');nav.append(b);}app.append(nav);
  const panel=h('div','vg-panel');({overview,scenes,resources,missions,advanced,preview}[tab]||overview)(panel);app.append(panel);
  const message=h('p','vg-message','');message.id='vg-message';message.setAttribute('role','status');app.append(message);
  const result=h('details','vg-checks');result.open=!!report;result.append(h('summary','','Kiểm tra nội dung'));
  const reportBox=h('div');reportBox.id='vg-report';result.append(reportBox);app.append(result);host.append(app);renderReport();
 }
 function mount(target){
  syncAccess();if(!permitted()||!target)return false;
  owner=currentUid();host=target;if(!model){model=fresh();localId=null;dirty=false;}
  render();return true;
 }
 root.DuduWorldCreator=Object.freeze({mount,syncAccess,version:'G1G',backendConnected:false});
 doc.addEventListener('visibilitychange',syncAccess);root.addEventListener('pageshow',syncAccess);
})(window);
