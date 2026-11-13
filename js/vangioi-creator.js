/* World Creator G3C — Vạn Giới authoring, independent from owner AI Core. Local draft QA only; server rights/submit stay closed. */
(function(root){
 'use strict';
 const doc=root.document,V=root.DuduWorldValidation,A=root.DuduArcPlan;
 let arcPlan=A.empty();
 if(!doc||!V)return;
 let owner=null,model=null,localId=null,dirty=false,serial=0,epoch=0,host=null,tab='overview',dbPromise=null;
 let report=null,jsonPending=false,jsonText='',counter=0,saving=false,dialog=null,returnFocus=null;
 const $=id=>doc.getElementById(id);
 const h=(tag,cl,text)=>{const n=doc.createElement(tag);if(cl)n.className=cl;if(text!==undefined)n.textContent=String(text);return n;};
 const button=(label,fn,cl='')=>{const n=h('button',cl,label);n.type='button';n.addEventListener('click',()=>{if(access())fn();});return n;};
 const currentUid=()=>root.DuduAuth?.isReady?.()===true?root.DuduAuth.uid():null;
 // Existing verified author permission, independent from the owner's AI console.
 const permitted=()=>!!currentUid()&&root.DuduAuth?.isAdmin?.()===true&&
  typeof canEditStories==='function'&&canEditStories()===true;
 const makeId=prefix=>prefix+'-'+root.crypto.randomUUID();
 const fresh=()=>({schemaVersion:'world-content-1',contentVersion:'1.0.0',story:{},maps:[],places:[],scenes:[],views:[],assets:[],
  cast:[],npcs:[],playerEntryProfiles:[],entry:{},entryPolicy:{},items:[],shops:[],missions:[],events:[],endings:[],
  playRequirements:{requiredVisitPlaceIds:[],requiredInteractNpcIds:[]},aiPolicy:{aiNpcRequested:false,allowAiRewards:false,allowAiWorldMutation:false}});
 const arr=key=>model[key]||[];
 function notice(text){const n=$('vg-message');if(n)n.textContent=text;}
 function syncAccess(){
  const next=currentUid();
  if(!permitted()||next!==owner){
   close();clearArt();
   host=null;owner=permitted()?next:null;model=null;localId=null;dirty=false;report=null;
   arcPlan=A.empty();jsonPending=false;jsonText='';tab='overview';serial++;epoch++;saving=false;
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
   if(value&&!options.some(([v])=>v===value))n.append(new Option('Tham chiếu chưa có: '+value,value));
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
  const user=owner,ticket=epoch,version=serial,id=localId||makeId('draft'),content=V.copyAuthoringContent(model),savedArcs=A.copy(arcPlan);
  saving=true;const b=$('vg-save');if(b)b.disabled=true;notice('Đang lưu trên thiết bị…');
  try{
   await storage('put',user,id,{format:'creator-local-1',uid:user,localId:id,updatedAt:Date.now(),content,arcPlan:savedArcs});
   if(!access()||owner!==user||epoch!==ticket)return;
   localId=id;if(serial===version)dirty=false;
   if($('vg-save-state'))$('vg-save-state').textContent=dirty?'Có thay đổi chưa lưu':'Đã lưu trên thiết bị · Chưa đồng bộ';
   notice(dirty?'Đã lưu bản trước. Có thay đổi mới chưa lưu.':'Đã lưu riêng cho tài khoản này trên thiết bị.');
  }catch{if(owner===user&&epoch===ticket)notice('Không lưu được trên thiết bị. Nội dung vẫn trong phiên; có thể xuất JSON để giữ lại.');}
  finally{if(owner===user&&epoch===ticket){saving=false;const n=$('vg-save');if(n)n.disabled=false;}}
 }
 function editable(content){
  const blank=fresh();delete blank.contentVersion;
  const value=structuredClone(content);return {...blank,...value,
   aiPolicy:{...blank.aiPolicy,...value.aiPolicy},playRequirements:{...blank.playRequirements,...value.playRequirements}};
 }
 function replace(content,id=null,plan=A.empty()){arcPlan=A.copy(plan);model=editable(content);localId=id;epoch++;serial++;dirty=id===null;report=null;jsonPending=false;jsonText='';saving=false;render();}
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
      const plan=stored.arcPlan===undefined?A.empty():A.copy(stored.arcPlan);
      replace(parsed.content,row.localId,plan);notice('Đã mở bản nháp trên thiết bị.');
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
   const text=await file.text();let envelope=JSON.parse(text),plan=A.empty();
   if(envelope?.format==='creator-arc-package-1'){
    if(Object.keys(envelope).some(k=>!['format','content','arcPlan'].includes(k)))throw Error('invalid-package');
    plan=A.copy(envelope.arcPlan);
   }else envelope=null;
   const parsed=V.parseDraft(envelope?JSON.stringify(envelope.content):text);
   if(!access()||owner!==user||epoch!==ticket)return;
   if(!parsed.ok){notice(parsed.code==='unsupported-version'?'Chỉ nhập hồ sơ world-content-1. Giữ nguyên tệp V0.1 để chuyển đổi riêng.':'Tệp sai định dạng; bản đang soạn vẫn được giữ.');return;}
   if(confirmReplace()){replace(parsed.content,null,plan);notice('Đã nhập nội dung nháp. Chưa xác minh nguồn, ảnh hoặc quyền sở hữu.');}
  }catch{if(owner===user&&epoch===ticket)notice('Không đọc được tệp; bản đang soạn vẫn được giữ.');}
 }
 // Local PNG previews are session-only and never imply a registry grant.
 const artImages=new Map();
 function clearArt(){for(const a of artImages.values())URL.revokeObjectURL(a.url);artImages.clear();}
 const formatKinds={portrait:['characterPortrait','npcPortrait'],sprite:['characterSprite'],illustration:['characterIllustration'],silhouette:['characterSilhouette'],avatar:['characterAvatar']};
 const formats=[['portrait','Chân dung'],['sprite','Nhân vật trong cảnh'],['illustration','Minh họa'],['silhouette','Bóng nhân vật'],['avatar','Avatar']];
 function decimal(label,path,value,min=0,max=1){
  const wrap=field(label,value,v=>{if(v==='')set(path,'',true);else set(path,Number(v));});
  const n=wrap.querySelector('input');n.type='number';n.min=String(min);n.max=String(max);n.step='0.01';return wrap;
 }
 async function pickArt(file,asset){
  if(!file)return;
  if(file.size>1024*1024){notice('Ảnh xem thử PNG tối đa 1 MiB.');return;}
  notice('Đang kiểm tra ảnh PNG…');
  const user=owner,ticket=epoch,pin=JSON.stringify([asset.assetId,asset.assetVersion,asset.kind,asset.contentHash]);
  const same=()=>access()&&owner===user&&epoch===ticket&&arr('assets').includes(asset)&&pin===JSON.stringify([asset.assetId,asset.assetVersion,asset.kind,asset.contentHash]);
  let url;
  try{
   const bytes=new Uint8Array(await file.arrayBuffer());if(!same())return;
   const image=await V.verifyLocalPngRaster(bytes);
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
   if(!same())return;
   if(asset.contentHash&&asset.contentHash!==hash){notice('Ảnh không trùng hash tham chiếu. Bản nháp và ảnh trước được giữ nguyên.');return;}
   url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
   const decoded=new Image();decoded.src=url;await decoded.decode();
   if(!same()){URL.revokeObjectURL(url);return;}
   if(decoded.naturalWidth!==image.width||decoded.naturalHeight!==image.height)throw Error('decode-mismatch');
   if(artImages.has(hash)){URL.revokeObjectURL(url);url=null;}
   else{artImages.set(hash,{url,width:image.width,height:image.height});url=null;}
   if(!asset.contentHash){asset.contentHash=hash;mark();}
   else report=null;
   render();notice('Đã mở ảnh xem thử trong phiên. Chưa tải lên hoặc duyệt ảnh.');
  }catch(error){
   if(url)URL.revokeObjectURL(url);
   if(owner===user&&epoch===ticket)notice(error?.message==='preview-limit'?'Ảnh vượt giới hạn xem thử trên thiết bị. Chọn bản nhẹ hơn; nháp và ảnh trước vẫn được giữ.':
    error?.message==='preview-unavailable'?'Trình duyệt chưa hỗ trợ kiểm tra PNG. Nháp và ảnh trước vẫn được giữ.':
    'PNG không hợp lệ hoặc không giải mã được. Bản nháp và ảnh trước được giữ nguyên.');
  }
 }
 function localArt(asset,cls='vg-art-image'){
  const stored=asset&&artImages.get(asset.contentHash);if(!stored)return h('div','vg-art-empty','Chưa chọn ảnh xem thử trong phiên này');
  const img=h('img',cls);img.src=stored.url;img.alt=asset.altText||'Ảnh xem thử của tác giả';img.loading='lazy';
  const fp=asset.focalPoint||[0.5,0.5],point=v=>Number.isFinite(v)&&v>=0&&v<=1?v:0.5;
  img.style.objectPosition=(point(fp[0])*100)+'% '+(point(fp[1])*100)+'%';
  img.addEventListener('error',()=>{if(img.isConnected)img.replaceWith(h('div','vg-art-empty','Ảnh xem thử bị lỗi. Chọn lại tệp PNG; cảnh vẫn được giữ.'));});return img;
 }
 function assetPreview(asset,index){
  const box=h('details','vg-art-tools');box.open=artImages.has(asset.contentHash);box.append(h('summary','','Ảnh xem thử & điểm lấy khung'));
  box.append(h('p','vg-muted','PNG tối đa 1 MiB, 16 triệu điểm ảnh, chỉ trong phiên này; không tải lên máy chủ. Hash có sẵn phải khớp tệp; hash trống sẽ được tính từ tệp mới.'));
  const upload=h('input');upload.type='file';upload.accept='.png,image/png';upload.setAttribute('aria-label','Chọn PNG xem thử');
  upload.addEventListener('change',()=>{if(access())pickArt(upload.files?.[0],asset);upload.value='';});box.append(upload);
  if(artImages.has(asset.contentHash))box.append(localArt(asset,'vg-art-thumb'),button('Bỏ ảnh xem thử',()=>{const a=artImages.get(asset.contentHash);if(a)URL.revokeObjectURL(a.url);artImages.delete(asset.contentHash);report=null;render();},'vg-quiet'));
  const fp=asset.focalPoint||[0.5,0.5];
  for(const [axis,label] of [[0,'Điểm lấy khung X (0–1)'],[1,'Điểm lấy khung Y (0–1)']]){
   const f=field(label,fp[axis],v=>{asset.focalPoint||=[0.5,0.5];asset.focalPoint[axis]=v===''?null:Number(v);mark();});
   const n=f.querySelector('input');n.type='number';n.min='0';n.max='1';n.step='0.01';box.append(f);
  }
  box.append(button('Dùng điểm giữa mặc định',()=>{delete asset.focalPoint;mark();render();},'vg-quiet'));
  return box;
 }
 function visualForms(panel){
  panel.append(h('h3','','Nhận diện thế giới'),lines('Bảng màu · mỗi dòng một ý','visualIdentity.palette',model.visualIdentity?.palette),
   lines('Dấu mốc nhận diện · mỗi dòng một ý','visualIdentity.landmarks',model.visualIdentity?.landmarks),
   bind('Bầu không khí','visualIdentity.mood',model.visualIdentity?.mood),bind('Phong cách hình ảnh','visualIdentity.artStyle',model.visualIdentity?.artStyle),
   h('h3','','Hồ sơ tạo hình nhân vật'),button('+ Thêm hồ sơ tạo hình',()=>{(model.characterVisuals||=[]).push({visualPriority:'supporting',identityNotes:'',fixedTraits:[],variants:[]});mark();render();}));
  arr('characterVisuals').forEach((v,i)=>{
   const p='characterVisuals.'+i,c=card('visual',v.characterId);
   c.append(field('Nhân vật tạo hình',v.characterId,x=>{
    if(arr('characterVisuals').some((y,k)=>k!==i&&y.characterId===x)){render();notice('Nhân vật này đã có hồ sơ tạo hình.');return;}
    if(v.variants?.some(look=>arr('characterAppearances').some(a=>a.variantId===look.variantId))){render();notice('Tạo hình đang được dùng trong cảnh. Đổi liên kết xuất hiện trước.');return;}
    if(x)v.characterId=x;else delete v.characterId;mark();render();
   },{options:choices(arr('cast'),'characterId','displayName')}),
    bind('Mức ưu tiên tạo hình',p+'.visualPriority',v.visualPriority,{omitEmpty:true,options:[['signature','Dấu ấn chính'],['supporting','Đồng hành'],['cameo','Khách mời'],['ambient','Bối cảnh'],['offscreen','Không xuất hiện trên ảnh']]}),
    bind('Ghi chú nhận diện nhân vật',p+'.identityNotes',v.identityNotes,{area:true}),lines('Đặc điểm cố định · mỗi dòng một ý',p+'.fixedTraits',v.fixedTraits));
   (v.variants||[]).forEach((look,j)=>{
    const q=p+'.variants.'+j,row=card('visual-variant',look.variantId);
    row.append(idLine(look.variantId),field('Dạng tạo hình',look.format,x=>{
     if(arr('characterAppearances').some(a=>a.variantId===look.variantId)){render();notice('Biến thể đang được dùng. Đổi liên kết xuất hiện trước khi đổi dạng.');return;}
     if(x)look.format=x;else delete look.format;delete look.assetId;mark();render();
    },{options:formats}),bind('Ảnh của tạo hình',q+'.assetId',look.assetId,{omitEmpty:true,options:choices(arr('assets').filter(a=>formatKinds[look.format]?.includes(a.kind)),'assetId','altText')}),
     bind('Biểu cảm',q+'.expression',look.expression),bind('Tư thế',q+'.pose',look.pose),bind('Nhãn trang phục',q+'.outfitTag',look.outfitTag),
     bind('Mốc thời gian tạo hình',q+'.timelineTag',look.timelineTag),bind('Ghi chú biến thể',q+'.artNote',look.artNote),
     button('Xóa biến thể tạo hình',()=>{if(referenced(look.variantId,'/characterVisuals/'+i+'/variants/'+j)){notice('Biến thể còn được dùng trong cảnh.');return;}v.variants.splice(j,1);mark();render();},'vg-quiet'));c.append(row);
   });
   c.append(button('+ Thêm biến thể tạo hình',()=>{(v.variants||=[]).push({variantId:makeId('variant')});mark();render();}),
    button('Xóa hồ sơ tạo hình',()=>{
     if((v.variants||[]).some(look=>arr('characterAppearances').some(a=>a.variantId===look.variantId))){notice('Hồ sơ còn biến thể đang dùng trong cảnh.');return;}
     model.characterVisuals.splice(i,1);mark();render();
    },'vg-quiet'));panel.append(c);
  });
  panel.append(h('h3','','Xuất hiện trong cảnh'),h('p','vg-muted','Điều kiện xuất hiện là nội dung nháp. Xem bố cục không chạy cờ hoặc đối thoại thật.'),
   button('+ Thêm lần xuất hiện',()=>{(model.characterAppearances||=[]).push({appearanceId:makeId('appearance'),requiredFlags:[],forbiddenFlags:[],suppressWhenPossessed:true,position:{anchor:'center',x:0.5,y:0.9,scale:1,layer:1}});mark();render();}));
  arr('characterAppearances').forEach((a,i)=>{
   const p='characterAppearances.'+i,c=card('appearance',a.appearanceId);
   const eligible=arr('characterVisuals').filter(v=>v.characterId===a.characterId).flatMap(v=>v.variants||[]).filter(v=>v.format!=='avatar');
   c.append(idLine(a.appearanceId),field('Nhân vật xuất hiện',a.characterId,x=>{if(x)a.characterId=x;else delete a.characterId;delete a.variantId;delete a.displayMode;mark();render();},{options:choices(arr('cast'),'characterId','displayName')}),
    bind('Góc nhìn xuất hiện',p+'.viewId',a.viewId,{omitEmpty:true,options:choices(arr('views'),'viewId','summary')}),
    field('Biến thể xuất hiện',a.variantId,x=>{const look=eligible.find(v=>v.variantId===x);if(look){a.variantId=x;a.displayMode=look.format;}else{delete a.variantId;delete a.displayMode;}mark();render();},
     {options:eligible.map(v=>[v.variantId,[formats.find(([k])=>k===v.format)?.[1],v.expression||v.outfitTag||v.variantId].join(' · ')])}),
    field('Lúc hiện nhân vật',a.showOn,x=>{if(x)a.showOn=x;else delete a.showOn;delete a.triggerRef;mark();render();},{options:[['scene_enter','Vào cảnh'],['dialogue_start','Bắt đầu hội thoại'],['event_flag','Theo cờ sự kiện']]}));
   if(a.showOn==='dialogue_start')c.append(bind('Lời thoại kích hoạt',p+'.triggerRef',a.triggerRef,{omitEmpty:true,options:arr('npcs').flatMap(n=>choices(n.dialogueNodes||[],'nodeId','text'))}));
   if(a.showOn==='event_flag')c.append(bind('Cờ kích hoạt xuất hiện',p+'.triggerRef',a.triggerRef));
   c.append(bind('Lúc ẩn nhân vật',p+'.hideOn',a.hideOn,{omitEmpty:true,options:[['dialogue_end','Kết thúc hội thoại'],['view_exit','Rời góc nhìn'],['flag_change','Đổi cờ'],['event_end','Kết thúc sự kiện']]}),
    lines('Cờ cần có khi xuất hiện',p+'.requiredFlags',a.requiredFlags),lines('Cờ cấm khi xuất hiện',p+'.forbiddenFlags',a.forbiddenFlags),
    bool('Ẩn hình của nhân vật khi người chơi đang nhập vai họ',p+'.suppressWhenPossessed',a.suppressWhenPossessed),
    bind('Neo bố cục',p+'.position.anchor',a.position?.anchor,{omitEmpty:true,options:[['left','Trái'],['center','Giữa'],['right','Phải'],['custom','Tự đặt']]}),
    decimal('Vị trí nhân vật X (0–1)',p+'.position.x',a.position?.x),decimal('Vị trí nhân vật Y (0–1)',p+'.position.y',a.position?.y),
    decimal('Tỷ lệ nhân vật (lớn hơn 0, tối đa 3)',p+'.position.scale',a.position?.scale,0.01,3),integer('Lớp hiển thị (0–20)',p+'.position.layer',a.position?.layer,0),
    bind('Mô tả khi thiếu ảnh',p+'.fallbackText',a.fallbackText),button('Xóa lần xuất hiện',()=>removeEntity('characterAppearances',i,'appearanceId'),'vg-quiet'));panel.append(c);
  });
 }

 function overview(panel){
  const grid=h('div','vg-grid');grid.append(
   bind('Tên tiểu thế giới','title',model.title),
   bind('Thể loại','genreId',model.genreId,{omitEmpty:true,options:[['ancient','Cổ đại'],['modern','Hiện đại'],['era','Niên đại'],['future','Tương lai'],['cultivation','Tu tiên'],['apocalypse','Mạt thế']]}),
   bind('Bậc đề nghị','requestedWorldRank',model.requestedWorldRank,{omitEmpty:true,options:['F','E','D','C','B','A','S'].map(x=>[x,x])}),
   bind('Phiên bản nội dung','contentVersion',model.contentVersion),
   bind('Mức nguy hiểm','dangerLevel',model.dangerLevel,{omitEmpty:true,options:[['low','Thấp'],['moderate','Vừa'],['high','Cao'],['extreme','Rất cao']]}));
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
    removeEntity('places',i,'placeId',{ignore:arr('maps').map((m,k)=>'/maps/'+k+'/placeIds'),after:()=>{for(const m of arr('maps'))m.placeIds=(m.placeIds||[]).filter(x=>x!==p.placeId);}});
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
    button('Xóa cảnh',()=>removeEntity('scenes',i,'sceneId',{ignore:arr('places').map((p,k)=>'/places/'+k+'/sceneIds'),after:syncPlaces}),'vg-quiet'));panel.append(card);
  });
  if(!arr('scenes').length)panel.append(h('p','vg-muted','Thêm nơi chốn và cảnh theo câu chuyện; không có quota cảnh theo bậc.'));
  views(panel);
 }
 function arcs(panel){
  panel.append(h('h3','','Kế hoạch theo arc'),h('p','vg-muted','Soạn từng chặng truyện; chưa cần nhập toàn bộ nhân vật và cảnh. Kế hoạch lưu riêng cùng nháp, chưa gửi duyệt hoặc chạy gameplay.'));
  panel.append(button('+ Thêm arc',()=>{
   if(arcPlan.arcs.length>=200){notice('Mỗi kế hoạch tối đa 200 arc; tiếp tục bằng gói kế hoạch riêng.');return;}
   arcPlan.arcs.push({arcId:makeId('arc'),title:'',mode:'manual',source:A.validSource(model.storySource)?structuredClone(model.storySource):null,
    startChapterId:'',endChapterId:'',opening:'',goal:'',ending:''});mark();render();
  }));
  arcPlan.arcs.forEach((a,i)=>{
   const card=h('section','vg-card');card.append(idLine(a.arcId));
   for(const [key,label]of [['title','Tên arc'],['startChapterId','Mã chương đầu'],['endChapterId','Mã chương cuối'],['opening','Mở đầu arc'],['goal','Mục tiêu arc'],['ending','Kết thúc arc']])
    {const f=field(label,a[key],value=>{a[key]=value;mark();},{area:['opening','goal','ending'].includes(key)});f.querySelector('input,textarea').maxLength=4000;card.append(f);}
   card.append(h('p','vg-muted',a.source?'Nguồn đã ghim: '+a.source.storyId+' / '+a.source.storyVersion:'Chưa ghim nguồn. Điền tham chiếu tại Nguồn & ảnh.'));
   const same=JSON.stringify(a.source)===JSON.stringify(model.storySource);
   if(a.source&&!same)card.append(h('p','vg-muted','Nguồn nháp đã đổi. Arc vẫn giữ bản ghim cũ; hãy kiểm tra trước khi cập nhật.'));
   card.append(button('Ghim nguồn hiện tại cho arc',()=>{
    if(!A.validSource(model.storySource)){notice('Cần đủ ID truyện, phiên bản và hash tại Nguồn & ảnh.');return;}
    if(a.source&&!root.confirm('Đổi nguồn ghim của arc? Kiểm tra lại phạm vi chương và nội dung chuyển thể.'))return;
    a.source=structuredClone(model.storySource);mark();render();
   }),button('Xóa arc',()=>{if(root.confirm('Xóa kế hoạch arc này?')){arcPlan.arcs.splice(i,1);mark();render();}},'vg-quiet'));
   card.append(h('p','vg-muted','Mã chương cần giữ ổn định theo nguồn. Quyền chuyển thể, thứ tự và sự tồn tại của chương chưa được máy chủ xác minh.'));
   panel.append(card);
  });
 }
 function exportArcPackage(){
  if(!canUseJson())return;
  const value={format:'creator-arc-package-1',content:V.copyAuthoringContent(model),arcPlan:A.copy(arcPlan)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'})),a=h('a');
  a.href=url;a.download='vangioi-arc-package.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  notice('Đã xuất nội dung và kế hoạch arc, gồm ghi chú bí mật của tác giả.');
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
    bind('Hash nội dung ảnh','assets.'+i+'.contentHash',a.contentHash,{omitEmpty:true}),
    bind('Mô tả ngắn, tránh lộ bí mật','assets.'+i+'.altText',a.altText),
    button('Xóa tham chiếu ảnh',()=>removeEntity('assets',i,'assetId'),'vg-quiet'),assetPreview(a,i));panel.append(card);
  });
 }
 // Structured content tools. All mutations are draft data, never engine actions.
 function toggle(label,value,change){
  const wrap=h('label','vg-toggle'),input=h('input');input.type='checkbox';input.checked=value===true;
  input.addEventListener('change',()=>{if(access())change(input.checked);});wrap.append(input,h('span','',label));return wrap;
 }
 const bool=(label,path,value)=>toggle(label,value,v=>set(path,v));
 const lines=(label,path,value)=>field(label,(value||[]).join('\n'),v=>set(path,v.split('\n').filter(x=>x.trim())),{area:true});
 const integer=(label,path,value,min=1)=>{
  const wrap=field(label,value,v=>{if(v==='')set(path,'',true);else set(path,Number(v));});
  const input=wrap.querySelector('input');input.type='number';input.min=String(min);input.max=String(Number.MAX_SAFE_INTEGER);input.step='1';return wrap;
 };
 function card(kind,value){const n=h('section','vg-card');n.dataset.vgKind=kind;if(value)n.dataset.vgId=value;return n;}
 function referenced(value,own,ignore=[]){
  // Conservative structural ID scan, never search story prose for an ID.
  const refs=[];
  function scan(v,path){
   if(path===own)return;
   if(!v||typeof v!=='object')return;
   for(const [k,x] of Object.entries(v)){
    const p=path+'/'+k;if(ignore.includes(p))continue;
    if((/Id$/.test(k)&&x===value)||(/Ids$/.test(k)&&Array.isArray(x)&&x.includes(value)))refs.push(p);
    scan(x,p);
   }
  }
  if(value)scan(model,'');
  return refs.length>0;
 }
 function removeEntity(key,index,idKey,{ignore=[],after}={}){
  if(referenced(arr(key)[index]?.[idKey],'/'+key+'/'+index,ignore)){notice('Mục này còn được tham chiếu. Đổi các liên kết trước khi xóa.');return;}
  model[key].splice(index,1);after?.();mark();render();
 }
 function targets(verb){
  const key={talk:['npcs','npcId','name'],collect:['items','itemId','name'],inspect:['items','itemId','name'],
   read:['items','itemId','name'],pickup:['items','itemId','name'],purchase:['items','itemId','name'],deliver:['items','itemId','name'],
   reach:['scenes','sceneId','summary'],move:['scenes','sceneId','summary'],focus:['views','viewId','summary'],
   survive:['events','eventId','trigger'],shop:['shops','shopId','name']}[verb];
  if(verb==='choose')return arr('views').flatMap(v=>choices(v.hotspots||[],'hotspotId','label'));
  return key?choices(arr(key[0]),key[1],key[2]):[];
 }
 function syncViews(){
  for(const s of arr('scenes'))if(s.sceneId)s.viewIds=arr('views').filter(v=>v.sceneId===s.sceneId&&v.viewId).map(v=>v.viewId);
 }
 function views(panel){
  panel.append(h('h3','','Góc nhìn & tương tác'),button('+ Thêm góc nhìn',()=>{
   const v={viewId:makeId('view'),kind:'text_only',summary:'',hotspots:[]};const s=arr('scenes').find(s=>s.sceneId);
   if(s)v.sceneId=s.sceneId;(model.views||=[]).push(v);syncViews();mark();render();
  }));
  arr('views').forEach((v,i)=>{
   const c=card('view',v.viewId),path='views.'+i;
   c.append(idLine(v.viewId),field('Cảnh của góc nhìn',v.sceneId,x=>{if(x)v.sceneId=x;else delete v.sceneId;syncViews();mark();},{options:choices(arr('scenes'),'sceneId','summary')}),
    bind('Kiểu góc nhìn',path+'.kind',v.kind,{omitEmpty:true,options:[['text_only','Văn bản'],['wide','Toàn cảnh'],['detail','Chi tiết'],['interior','Nội thất'],['illustration','Minh họa']]}),
    bind('Mô tả góc nhìn',path+'.summary',v.summary),
    bind('Ảnh góc nhìn',path+'.assetId',v.assetId,{omitEmpty:true,options:choices(arr('assets'),'assetId','altText')}));
   (v.hotspots||[]).forEach((point,j)=>{
    const p=path+'.hotspots.'+j,row=card('hotspot',point.hotspotId);
    row.append(idLine(point.hotspotId),bind('Nhãn tương tác',p+'.label',point.label),
     field('Hành động',point.action,x=>{if(x)point.action=x;else delete point.action;delete point.targetId;
      if(x==='pickup'&&!point.uniquePickupId)point.uniquePickupId=makeId('pickup');mark();render();},
      {options:[['inspect','Kiểm tra'],['pickup','Nhặt'],['read','Đọc'],['talk','Nói chuyện'],['focus','Xem chi tiết'],['move','Di chuyển'],['shop','Mua bán']]}),
     bind('Đối tượng tương tác',p+'.targetId',point.targetId,{omitEmpty:true,options:targets(point.action)}),
     bind('Cách thể hiện',p+'.presentation',point.presentation,{omitEmpty:true,options:[['text','Lựa chọn chữ'],['hotspot_overlay','Điểm trên ảnh'],['item_card','Thẻ vật phẩm'],['dialogue_reward','Qua hội thoại']]}),
     bind('Cờ hiện tương tác',p+'.visibleWhenFlag',point.visibleWhenFlag));
    if(point.action==='pickup')row.append(idLine(point.uniquePickupId));
    row.append(button('Xóa tương tác',()=>{if(referenced(point.hotspotId,'/views/'+i+'/hotspots/'+j)){notice('Tương tác còn được dùng bởi vật phẩm hoặc mục tiêu.');return;}v.hotspots.splice(j,1);mark();render();},'vg-quiet'));c.append(row);
   });
   c.append(button('+ Thêm tương tác',()=>{(v.hotspots||=[]).push({hotspotId:makeId('hotspot'),label:'',presentation:'text'});mark();render();}),
    button('Xóa góc nhìn',()=>removeEntity('views',i,'viewId',{ignore:arr('scenes').map((s,k)=>'/scenes/'+k+'/viewIds'),after:syncViews}),'vg-quiet'));panel.append(c);
  });
 }
 function roles(panel){
  panel.append(bind('Cảnh vào world','entry.entrySceneId',model.entry?.entrySceneId,{omitEmpty:true,options:choices(arr('scenes'),'sceneId','summary')}),
   field('Cách chọn vai',model.entryPolicy?.mode,v=>{set('entryPolicy.mode',v,true);if(v!=='fixed')delete model.entryPolicy.forcedEntryId;render();},{options:[['fixed','Vai cố định'],['player_choice','Người chơi chọn']]}));
  if(model.entryPolicy?.mode==='fixed')panel.append(bind('Vai cố định','entryPolicy.forcedEntryId',model.entryPolicy.forcedEntryId,{omitEmpty:true,options:choices(arr('playerEntryProfiles'),'entryId','label')}));
  panel.append(h('p','vg-muted','Vai nhập là nội dung kịch bản. Thẻ thông hành và quyền vào world vẫn cần máy chủ xác nhận.'),
   button('+ Thêm vai nhập',()=>{(model.playerEntryProfiles||=[]).push({entryId:makeId('entry'),label:'',initialKnownFacts:[],initialFlags:[]});mark();render();}));
  arr('playerEntryProfiles').forEach((p,i)=>{
   const path='playerEntryProfiles.'+i,c=card('entry',p.entryId);
   c.append(idLine(p.entryId),bind('Tên vai nhập',path+'.label',p.label),
    field('Kiểu nhập vai',p.mode,v=>{if(v)p.mode=v;else delete p.mode;if(v==='native_extra'&&!p.nativeSlotId)p.nativeSlotId=makeId('native');mark();render();},
     {options:[['cast_possession','Nhập vào nhân vật có sẵn'],['system_cover','Thân phận do hệ thống chuẩn bị'],['native_extra','Người bản địa ngoài dàn nhân vật']]}),
    bind('Cảnh bắt đầu của vai',path+'.startSceneId',p.startSceneId,{omitEmpty:true,options:choices(arr('scenes'),'sceneId','summary')}));
   if(p.mode==='cast_possession')c.append(bind('Nhân vật được nhập vai',path+'.castTargetId',p.castTargetId,{omitEmpty:true,options:choices(arr('cast').filter(x=>x.playableAsCast),'characterId','displayName')}));
   if(p.mode==='system_cover')c.append(bind('Tên thân phận chuẩn bị',path+'.coverName',p.coverName),
    bind('Tính xác thực trong truyện',path+'.identityAssurance',p.identityAssurance,{omitEmpty:true,options:[['verified','Hợp lệ trong bối cảnh'],['forged','Giấy tờ giả trong truyện'],['unknown','Chưa rõ']]}));
   if(p.mode==='native_extra')c.append(idLine(p.nativeSlotId),bind('Lịch sử và quan hệ bản địa',path+'.socialAnchorNotes',p.socialAnchorNotes,{area:true}));
   c.append(lines('Thông tin vai đã biết · mỗi dòng một ý',path+'.initialKnownFacts',p.initialKnownFacts),
    lines('Cờ ban đầu · mỗi dòng một cờ',path+'.initialFlags',p.initialFlags),
    button('Xóa vai nhập',()=>removeEntity('playerEntryProfiles',i,'entryId'),'vg-quiet'));panel.append(c);
  });
 }
 function characters(panel){
  panel.append(h('h3','','Dàn nhân vật'),button('+ Thêm nhân vật',()=>{
   (model.cast||=[]).push({characterId:makeId('character'),displayName:'',narrativeRole:'supporting',presence:'onstage',playableAsCast:false});mark();render();
  }));
  arr('cast').forEach((x,i)=>{
   const path='cast.'+i,c=card('character',x.characterId);
   c.append(idLine(x.characterId),bind('Tên nhân vật',path+'.displayName',x.displayName),
    bind('Vai trò trong truyện',path+'.narrativeRole',x.narrativeRole,{omitEmpty:true,options:[['protagonist','Nhân vật chính'],['supporting','Đồng hành'],['antagonist','Đối lập'],['cannon_fodder','Vai hi sinh'],['minor','Vai phụ'],['passerby','Người qua đường'],['cameo','Khách mời'],['mentioned','Được nhắc tới'],['group','Tập thể']]}),
    bind('Mức xuất hiện',path+'.presence',x.presence,{omitEmpty:true,options:[['onstage','Xuất hiện trực tiếp'],['offstage','Ở ngoài cảnh'],['mention_only','Chỉ được nhắc tới']]}),
    bool('Cho phép nhập vào nhân vật này',path+'.playableAsCast',x.playableAsCast),bind('Ghi chú nhân vật',path+'.storyNotes',x.storyNotes,{area:true}),
    button('Xóa nhân vật',()=>removeEntity('cast',i,'characterId'),'vg-quiet'));panel.append(c);
  });
  panel.append(h('h3','','NPC tương tác'),h('p','vg-muted','Tri thức NPC là giới hạn hiểu biết trong truyện. Đề nghị AI không kích hoạt AI hoặc cho phép AI cấp thưởng/đổi world.'),
   toggle('Đề nghị xét NPC AI',model.aiPolicy?.aiNpcRequested,v=>{
    model.aiPolicy||={aiNpcRequested:false,allowAiRewards:false,allowAiWorldMutation:false};model.aiPolicy.aiNpcRequested=v;mark();
   }),button('+ Thêm NPC',()=>{(model.npcs||=[]).push({npcId:makeId('npc'),name:'',mode:'scripted',interactionLevels:['scripted'],dialoguePolicy:'choice_tree',friendable:false,role:'',knowledge:[],dialogueNodes:[]});mark();render();}));
  arr('npcs').forEach((n,i)=>{
   const path='npcs.'+i,c=card('npc',n.npcId);
   c.append(idLine(n.npcId),bind('Tên NPC',path+'.name',n.name),
    bind('Liên kết nhân vật',path+'.characterId',n.characterId,{omitEmpty:true,options:choices(arr('cast'),'characterId','displayName')}),
    field('Chế độ NPC',n.mode,v=>{if(v)n.mode=v;else delete n.mode;
     if(v==='ai_candidate'&&!(n.interactionLevels||[]).includes('ai_candidate'))(n.interactionLevels||=[]).push('ai_candidate');
     if(v==='scripted')n.interactionLevels=(n.interactionLevels||[]).filter(x=>x!=='ai_candidate');mark();render();},
     {options:[['scripted','Kịch bản'],['ai_candidate','Đề nghị NPC AI']]}),
    bind('Cách đối thoại',path+'.dialoguePolicy',n.dialoguePolicy,{omitEmpty:true,options:[['no_dialogue','Không hội thoại'],['barks','Câu nói ngắn'],['choice_tree','Nhánh lựa chọn'],['stateful_tree','Nhánh theo trạng thái'],['service','Dịch vụ'],['ai_limited','AI có giới hạn']]}),
    bind('Cảnh giới thiệu NPC',path+'.introSceneId',n.introSceneId,{omitEmpty:true,options:choices(arr('scenes'),'sceneId','summary')}),
    bind('Vai trò NPC',path+'.role',n.role),bind('Tính cách NPC',path+'.personality',n.personality),
    lines('Tri thức NPC · mỗi dòng một điều được biết',path+'.knowledge',n.knowledge),bool('Có thể kết bạn theo kịch bản',path+'.friendable',n.friendable));
   const levels=h('fieldset','vg-levels');levels.append(h('legend','','Lớp tương tác'));
   for(const [key,name] of [['ambient','Bối cảnh'],['scripted','Kịch bản'],['stateful','Theo trạng thái'],['service','Dịch vụ'],['ai_candidate','Ứng viên AI']])
    levels.append(toggle(name,(n.interactionLevels||[]).includes(key),v=>{n.interactionLevels=[...new Set([...(n.interactionLevels||[]).filter(x=>x!==key),...(v?[key]:[])])];mark();}));
   c.append(levels);
   if(n.mode==='ai_candidate')c.append(bind('Lý do đề nghị AI',path+'.aiRequestNotes',n.aiRequestNotes,{area:true}));
   (n.dialogueNodes||[]).forEach((node,j)=>{
    const p=path+'.dialogueNodes.'+j,row=card('dialogue',node.nodeId);
    row.append(idLine(node.nodeId),bind('Lời thoại NPC',p+'.text',node.text,{area:true}));
    (node.choices||[]).forEach((choice,k)=>{
     const q=p+'.choices.'+k,option=card('dialogue-choice');
     option.append(bind('Lựa chọn hội thoại',q+'.label',choice.label),
      bind('Nút hội thoại tiếp theo',q+'.nextNodeId',choice.nextNodeId,{omitEmpty:true,options:choices(n.dialogueNodes||[],'nodeId','text')}),
      bind('Cờ sau lựa chọn',q+'.setFlag',choice.setFlag),button('Xóa lựa chọn',()=>{node.choices.splice(k,1);mark();render();},'vg-quiet'));row.append(option);
    });
    row.append(button('+ Thêm lựa chọn hội thoại',()=>{(node.choices||=[]).push({label:''});mark();render();}),
     button('Xóa lời thoại',()=>{
      if((n.dialogueNodes||[]).some(x=>(x.choices||[]).some(y=>y.nextNodeId===node.nodeId))||arr('characterAppearances').some(a=>a.showOn==='dialogue_start'&&a.triggerRef===node.nodeId)){
       notice('Lời thoại này còn được nối từ lựa chọn hoặc lần xuất hiện nhân vật.');return;}
      n.dialogueNodes.splice(j,1);mark();render();
     },'vg-quiet'));c.append(row);
   });
   c.append(button('+ Thêm lời thoại',()=>{(n.dialogueNodes||=[]).push({nodeId:makeId('dialogue'),text:'',choices:[]});mark();render();}),
    button('Xóa NPC',()=>removeEntity('npcs',i,'npcId'),'vg-quiet'));panel.append(c);
  });
 }
 function items(panel){
  panel.append(h('p','vg-muted','Đây là vật phẩm trong kịch bản và đề nghị mang ra ngoài; không tạo vật phẩm vào kho người chơi.'),
   button('+ Thêm vật phẩm',()=>{(model.items||=[]).push({itemId:makeId('item'),name:'',category:'quest',transferPolicy:'world_only',stackLimit:1,acquisitionMethods:[]});mark();render();}));
  arr('items').forEach((item,i)=>{
   const p='items.'+i,c=card('item',item.itemId);
   c.append(idLine(item.itemId),bind('Tên vật phẩm',p+'.name',item.name),bind('Mô tả vật phẩm',p+'.description',item.description,{area:true}),
    bind('Loại vật phẩm',p+'.category',item.category,{omitEmpty:true,options:[['quest','Nhiệm vụ'],['consumable','Tiêu hao'],['equipment','Trang bị'],['artifact','Bảo vật'],['souvenir','Kỷ niệm'],['evidence','Chứng cứ'],['currency','Tiền trong world']]}),
    bind('Chính sách mang ra ngoài',p+'.transferPolicy',item.transferPolicy,{omitEmpty:true,options:[['world_only','Chỉ trong world'],['extractable','Đề nghị được mang ra'],['review_required','Cần xét riêng']]}),
    integer('Giới hạn cộng dồn',p+'.stackLimit',item.stackLimit));
   (item.acquisitionMethods||[]).forEach((a,j)=>{
    const q=p+'.acquisitionMethods.'+j,row=card('acquisition');
    row.append(field('Cách nhận',a.type,v=>{item.acquisitionMethods[j]=v?{type:v}:{};mark();render();},
     {options:[['starting','Có từ đầu'],['pickup','Nhặt tại tương tác'],['questReward','Thưởng nhiệm vụ'],['shop','Mua tại cửa hàng'],['npcGift','NPC tặng'],['craft','Chế tạo']]}));
    if(a.type==='pickup'){
     const pickups=arr('views').flatMap(v=>(v.hotspots||[]).filter(h=>h.action==='pickup'&&h.targetId===item.itemId).map(h=>[h.hotspotId,h.label||h.hotspotId]));
     row.append(field('Tương tác nhặt vật phẩm',a.hotspotId,value=>{
      const v=arr('views').find(v=>(v.hotspots||[]).some(h=>h.hotspotId===value)),point=v?.hotspots.find(h=>h.hotspotId===value),scene=arr('scenes').find(s=>s.sceneId===v?.sceneId);
      item.acquisitionMethods[j]={type:'pickup',...(point?{hotspotId:point.hotspotId,...(point.uniquePickupId?{uniquePickupId:point.uniquePickupId}:{}),viewId:v.viewId,...(scene?.placeId?{placeId:scene.placeId}:{})}:{})};mark();render();
     },{options:pickups}),h('p','vg-muted','Chọn tương tác Nhặt trỏ tới vật phẩm này tại Địa điểm & cảnh.'));
    }
    if(a.type==='questReward')row.append(bind('Nhiệm vụ trao vật phẩm',q+'.missionId',a.missionId,{omitEmpty:true,options:choices(arr('missions'),'missionId','name')}));
    if(a.type==='shop')row.append(bind('Cửa hàng nguồn',q+'.shopId',a.shopId,{omitEmpty:true,options:choices(arr('shops').filter(shop=>(shop.stock||[]).some(s=>s.itemId===item.itemId)),'shopId','name')}),h('p','vg-muted','Chọn cửa hàng đã có vật phẩm này trong bảng hàng; cấu hình tại mục Cửa hàng.'));
    row.append(button('Xóa cách nhận',()=>{item.acquisitionMethods.splice(j,1);mark();render();},'vg-quiet'));c.append(row);
   });
   c.append(button('+ Thêm cách nhận',()=>{(item.acquisitionMethods||=[]).push({type:'starting'});mark();render();}),
    button('Xóa vật phẩm',()=>removeEntity('items',i,'itemId'),'vg-quiet'));panel.append(c);
  });
 }
 function shops(panel){
  panel.append(h('p','vg-muted','Soạn cửa hàng trong kịch bản. Giá và số lượng chưa phải sổ giao dịch; không trừ tiền hoặc cấp vật phẩm thật.'),
   button('+ Thêm cửa hàng',()=>{(model.shops||=[]).push({shopId:makeId('shop'),name:'',stock:[]});mark();render();}));
  arr('shops').forEach((shop,i)=>{
   const p='shops.'+i,c=card('shop',shop.shopId);
   c.append(idLine(shop.shopId),bind('Tên cửa hàng',p+'.name',shop.name),
    bind('Địa điểm cửa hàng',p+'.placeId',shop.placeId,{omitEmpty:true,options:choices(arr('places'),'placeId','name')}),
    bind('NPC bán hàng',p+'.merchantNpcId',shop.merchantNpcId,{omitEmpty:true,options:choices(arr('npcs'),'npcId','name')}),
    bind('Đơn vị tiền của cửa hàng',p+'.currencyItemId',shop.currencyItemId,{omitEmpty:true,options:choices(arr('items').filter(item=>item.category==='currency'),'itemId','name')}),
    h('p','vg-muted','Thêm vật phẩm loại Tiền trong world tại mục Vật phẩm trước khi chọn đơn vị tiền. Số lượng 0 là hết hàng trong cấu hình, không phải vô hạn.'));
   (shop.stock||[]).forEach((stock,j)=>{
    const q=p+'.stock.'+j,row=card('stock');
    row.append(field('Mặt hàng',stock.itemId,value=>{
     if(stock.itemId!==value&&!(shop.stock||[]).some((x,k)=>k!==j&&x.itemId===stock.itemId)&&arr('items').find(item=>item.itemId===stock.itemId)?.acquisitionMethods?.some(m=>m.type==='shop'&&m.shopId===shop.shopId)){
      render();notice('Vật phẩm đang khai cách nhận tại cửa hàng này. Đổi cách nhận trước khi thay mặt hàng.');return;
     }
     if(value)stock.itemId=value;else delete stock.itemId;mark();render();
    },{options:choices(arr('items').filter(item=>!(shop.stock||[]).some((s,k)=>k!==j&&s.itemId===item.itemId)),'itemId','name')}),
     integer('Giá trong kịch bản',q+'.price',stock.price,0),integer('Số lượng trong kịch bản',q+'.quantity',stock.quantity,0),
     button('Khai cách nhận qua cửa hàng',()=>{
      const item=arr('items').find(item=>item.itemId===stock.itemId);
      if(!item||!shop.shopId){notice('Chọn mặt hàng và bổ sung mã cửa hàng trước.');return;}
      item.acquisitionMethods||=[];
      if(!item.acquisitionMethods.some(m=>m.type==='shop'&&m.shopId===shop.shopId))item.acquisitionMethods.push({type:'shop',shopId:shop.shopId});
      mark();render();notice('Đã khai cách nhận cho vật phẩm; không phát sinh mua bán thật.');
     }),button('Xóa mặt hàng',()=>{
      if(!(shop.stock||[]).some((x,k)=>k!==j&&x.itemId===stock.itemId)&&arr('items').find(item=>item.itemId===stock.itemId)?.acquisitionMethods?.some(m=>m.type==='shop'&&m.shopId===shop.shopId)){
       notice('Vật phẩm còn khai cách nhận tại đây. Xóa hoặc đổi cách nhận trước.');return;
      }
      shop.stock.splice(j,1);mark();render();
     },'vg-quiet'));c.append(row);
   });
   c.append(button('+ Thêm mặt hàng',()=>{(shop.stock||=[]).push({price:0,quantity:0});mark();render();}),
    button('Xóa cửa hàng',()=>removeEntity('shops',i,'shopId'),'vg-quiet'));panel.append(c);
  });
 }

 function outcomes(panel){
  panel.append(h('h3','','Sự kiện kịch bản'),h('p','vg-muted','Điều kiện và cờ là mô tả nháp; Creator không thực thi biểu thức hoặc thay trạng thái chơi.'),
   button('+ Thêm sự kiện',()=>{(model.events||=[]).push({eventId:makeId('event'),trigger:'',requiredFlags:[],setFlags:[]});mark();render();}));
  arr('events').forEach((e,i)=>{
   const path='events.'+i,c=card('event',e.eventId);c.append(idLine(e.eventId),bind('Điều kiện sự kiện',path+'.trigger',e.trigger),
    lines('Cờ cần có trước sự kiện',path+'.requiredFlags',e.requiredFlags),lines('Cờ sau sự kiện',path+'.setFlags',e.setFlags),
    button('Xóa sự kiện',()=>removeEntity('events',i,'eventId'),'vg-quiet'));panel.append(c);
  });
  panel.append(h('h3','','Kết cục'),button('+ Thêm kết cục',()=>{(model.endings||=[]).push({endingId:makeId('ending'),title:'',requiredFlags:[]});mark();render();}));
  arr('endings').forEach((e,i)=>{
   const path='endings.'+i,c=card('ending',e.endingId);c.append(idLine(e.endingId),bind('Tên kết cục',path+'.title',e.title),
    bind('Kết quả kết cục',path+'.result',e.result,{omitEmpty:true,options:[['success','Thành công'],['partial','Một phần'],['failure','Thất bại']]}),
    lines('Cờ cần có để đến kết cục',path+'.requiredFlags',e.requiredFlags),button('Xóa kết cục',()=>removeEntity('endings',i,'endingId'),'vg-quiet'));panel.append(c);
  });
 }

 function missions(panel){
  panel.append(h('p','vg-muted','Phần thưởng chỉ là đề nghị trong hồ sơ, không cộng EXP hoặc vật phẩm thật.'),
   button('+ Thêm nhiệm vụ chính',()=>{(model.missions||=[]).push({missionId:makeId('mission'),name:'',summary:'',kind:'main',requiredForCompletion:true,objectives:[],rewardRequest:{exp:0,items:[]},replayPolicy:'repeat_no_reward'});mark();render();}));
  arr('missions').forEach((m,i)=>{
   const path='missions.'+i,c=card('mission',m.missionId);c.append(idLine(m.missionId),bind('Tên nhiệm vụ',path+'.name',m.name),
    bind('Tóm tắt nhiệm vụ',path+'.summary',m.summary,{area:true}),
    field('Loại nhiệm vụ',m.kind,v=>{if(v)m.kind=v;else delete m.kind;if(v!=='main')m.requiredForCompletion=false;mark();render();},
     {options:[['main','Chính'],['side','Phụ'],['hidden','Ẩn']]}),
    toggle('Bắt buộc để hoàn thành world',m.requiredForCompletion,v=>{if(v&&m.kind!=='main'){notice('Chỉ nhiệm vụ chính được bắt buộc để hoàn thành world.');render();return;}m.requiredForCompletion=v;mark();}),
    bind('Cảnh bắt đầu',path+'.startSceneId',m.startSceneId,{omitEmpty:true,options:choices(arr('scenes'),'sceneId','summary')}));
   (m.objectives||[]).forEach((o,j)=>{
    const p=path+'.objectives.'+j,row=card('objective',o.objectiveId);row.append(idLine(o.objectiveId),
     field('Hành động mục tiêu',o.verb,v=>{if(v)o.verb=v;else delete o.verb;delete o.targetId;mark();render();},
      {options:[['talk','Nói chuyện'],['collect','Thu thập'],['inspect','Kiểm tra'],['purchase','Mua'],['reach','Đến cảnh'],['choose','Chọn tương tác'],['survive','Vượt qua sự kiện'],['deliver','Giao vật phẩm']]}),
     bind('Đích mục tiêu',p+'.targetId',o.targetId,{omitEmpty:true,options:targets(o.verb)}),integer('Số lượng cần',p+'.requiredCount',o.requiredCount),
     button('Xóa mục tiêu',()=>{m.objectives.splice(j,1);mark();render();},'vg-quiet'));c.append(row);
   });
   c.append(button('+ Thêm mục tiêu',()=>{(m.objectives||=[]).push({objectiveId:makeId('objective'),requiredCount:1});mark();render();}),
    integer('EXP đề nghị',path+'.rewardRequest.exp',m.rewardRequest?.exp,0));
   (m.rewardRequest?.items||[]).forEach((r,j)=>{
    const p=path+'.rewardRequest.items.'+j,row=card('reward');row.append(bind('Vật phẩm thưởng đề nghị',p+'.itemId',r.itemId,{omitEmpty:true,options:choices(arr('items'),'itemId','name')}),
     integer('Số vật phẩm đề nghị',p+'.quantity',r.quantity),button('Xóa thưởng đề nghị',()=>{m.rewardRequest.items.splice(j,1);mark();render();},'vg-quiet'));c.append(row);
   });
   c.append(button('+ Đề nghị vật phẩm thưởng',()=>{m.rewardRequest||={exp:0,items:[]};(m.rewardRequest.items||=[]).push({quantity:1});mark();render();}),
    bind('Chơi lại nhiệm vụ',path+'.replayPolicy',m.replayPolicy,{omitEmpty:true,options:[['none','Không chơi lại'],['repeat_no_reward','Chơi lại không thưởng'],['repeat_review_required','Chơi lại cần xét duyệt']]}),
    button('Xóa nhiệm vụ',()=>removeEntity('missions',i,'missionId'),'vg-quiet'));panel.append(c);
  });
 }

 function advanced(panel){
  panel.append(h('p','vg-muted','Toàn bộ nội dung world-content-1, gồm vai nhập, NPC, vật phẩm, mục tiêu và kết cục. Áp dụng JSON để cập nhật các biểu mẫu.'));
  if(!jsonPending)jsonText=JSON.stringify(model,null,2);
  const edit=field('JSON nội dung',jsonText,v=>{jsonText=v;jsonPending=true;mark();},{area:true});edit.querySelector('textarea').rows=18;panel.append(edit);
  panel.append(button('Áp dụng JSON',()=>{
   const parsed=V.parseDraft(jsonText);if(!parsed.ok){notice('JSON chưa hợp lệ. Nội dung biểu mẫu trước vẫn được giữ.');return;}
   model=editable(parsed.content);jsonPending=false;jsonText='';mark();render();notice('Đã áp dụng nội dung JSON.');
  }),button('Hoàn tác phần JSON đang sửa',()=>{jsonPending=false;jsonText='';render();},'vg-quiet'));
 }
 function preview(panel){
  panel.append(h('p','vg-muted','Ảnh xem thử trong phiên, chưa duyệt phát hành. Xem bố cục nhân vật không xét điều kiện/cờ và không chạy gameplay.'));
  const controls=h('div','vg-grid'),box=h('section','vg-preview');box.id='vg-scene-preview';panel.append(controls,box);
  let sceneId='',viewId='',roleId='',ratio='wide',layout=false;
  const bounded=(v,min,max,fallback)=>Number.isFinite(v)&&v>=min&&v<=max?v:fallback;
  function draw(){
   controls.replaceChildren(field('Cảnh xem trước',sceneId,v=>{sceneId=v;viewId=arr('views').find(x=>x.sceneId===v)?.viewId||'';draw();},{options:choices(arr('scenes'),'sceneId','summary')}),
    field('Góc nhìn xem trước',viewId,v=>{viewId=v;draw();},{options:choices(arr('views').filter(v=>v.sceneId===sceneId),'viewId','summary')}),
    field('Khung xem trước',ratio,v=>{ratio=v||'wide';draw();},{options:[['wide','Ngang 16:9'],['portrait','Dọc 9:16']]}),
    field('Vai xem thử',roleId,v=>{roleId=v;draw();},{options:choices(arr('playerEntryProfiles'),'entryId','label')}),
    toggle('Xem bố cục nhân vật',layout,v=>{layout=v;draw();}));
   box.replaceChildren();
   const scene=arr('scenes').find(s=>s.sceneId===sceneId),view=arr('views').find(v=>v.viewId===viewId&&v.sceneId===sceneId),
    place=arr('places').find(p=>scene?.placeId&&p.placeId===scene.placeId),role=arr('playerEntryProfiles').find(p=>p.entryId===roleId),
    asset=arr('assets').find(a=>a.assetId===(view?.assetId||scene?.backgroundAssetId));
   box.append(h('div','vg-preview-seal','BẢN SOẠN THẢO · CHƯA PHÁT HÀNH'),h('h3','',place?.name||'Chưa đặt tên địa điểm'));
   const stage=h('div','vg-scene-stage vg-scene-'+ratio);stage.dataset.sceneId=sceneId;stage.append(localArt(asset));
   if(layout&&view)for(const a of arr('characterAppearances').filter(a=>a.viewId===view.viewId).sort((a,b)=>(a.position?.layer||0)-(b.position?.layer||0))){
    if(a.displayMode==='sprite'&&a.suppressWhenPossessed===true&&role?.mode==='cast_possession'&&role.castTargetId===a.characterId)continue;
    const look=arr('characterVisuals').filter(v=>v.characterId===a.characterId).flatMap(v=>v.variants||[]).find(v=>v.variantId===a.variantId);
    if(!look||look.format!==a.displayMode)continue;
    const art=arr('assets').find(x=>x.assetId===look.assetId),character=arr('cast').find(c=>c.characterId===a.characterId),
     layer=h('div','vg-character-layer');layer.dataset.vgPreviewCharacter=a.characterId;layer.dataset.appearanceId=a.appearanceId;
    const pos=a.position||{},x=bounded(pos.x,0,1,0.5),y=bounded(pos.y,0,1,0.9),scale=bounded(pos.scale,0.01,3,1),
     anchor=pos.anchor==='left'?0:pos.anchor==='right'?-100:-50;
    layer.style.left=x*100+'%';layer.style.top=y*100+'%';layer.style.zIndex=String(bounded(pos.layer,0,20,1));
    layer.style.transform='translate('+anchor+'%,-100%) scale('+scale+')';
    layer.append(artImages.has(art?.contentHash)?localArt(art,'vg-character-image'):h('span','vg-character-fallback',a.fallbackText||character?.displayName||'Nhân vật'));
    stage.append(layer);
   }
   box.append(stage,h('p','',view?.summary||scene?.summary||'Chọn một cảnh để xem lời dẫn.'));
  }
  draw();
 }

 const names={title:'Tên world',genreId:'Thể loại',requestedWorldRank:'Bậc đề nghị',dangerLevel:'Mức nguy hiểm',story:'Cốt truyện',
 storySource:'Nguồn truyện',worldCoverAssetId:'Ảnh bìa',assets:'Hình ảnh',maps:'Bản đồ',places:'Địa điểm',scenes:'Cảnh',views:'Góc nhìn',
 cast:'Dàn nhân vật',npcs:'NPC',playerEntryProfiles:'Vai nhập',entryPolicy:'Chọn vai nhập',entry:'Cảnh vào',items:'Vật phẩm',shops:'Cửa hàng',
 missions:'Nhiệm vụ',events:'Sự kiện',endings:'Kết cục',playRequirements:'Điều kiện chơi',aiPolicy:'Chính sách AI'};
 function artObservations(){
  return arr('assets').flatMap(asset=>{
   const local=artImages.get(asset.contentHash);
   return local&&asset.assetId&&asset.assetVersion&&asset.contentHash?
    [{assetId:asset.assetId,assetVersion:asset.assetVersion,contentHash:asset.contentHash,
     width:local.width,height:local.height,format:'png'}]:[];
  });
 }
 function qaSection(box,title,summary,items,labels,limit=7){
  const section=h('section','vg-qa-group');
  section.append(h('h3','',title),h('p','vg-muted',summary));
  if(items?.length){
   const ul=h('ul','vg-warning-list');
   for(const item of items.slice(0,limit)){
    const name=labels[item.code]||'Cần kiểm tra thêm';
    const vp=item.affectedViewports?.length?' · Khung: '+item.affectedViewports.join(', '):'';
    ul.append(h('li','',name+' ('+item.path+')'+vp));
   }
   section.append(ul);
   if(items.length>limit)section.append(h('small','','Còn '+(items.length-limit)+' điểm cần xem xét trong báo cáo.'));
  }
  box.append(section);
 }
 function renderReport(){
  const box=$('vg-report');if(!box)return;box.replaceChildren();box.parentElement.open=!!report;
  if(!report){box.append(h('p','vg-muted','Kiểm tra để tìm trường còn thiếu hoặc tham chiếu sai.'));return;}
  const errors=report.errors||[];
  box.append(h('strong','',errors.length?'Cần chỉnh '+errors.length+' mục':'Cấu trúc đủ để chuẩn bị hồ sơ'),
   h('p','vg-muted','Kiểm tra trên thiết bị; chưa xác minh quyền nguồn/ảnh và chưa gửi duyệt.'));
  const list=h('ul');
  const messages={'missing-reference':'Tham chiếu chưa tồn tại','cast-not-playable':'Nhân vật chưa được cho phép nhập vai',
   'native-history-required':'Bổ sung lịch sử và quan hệ bản địa','cover-identity-required':'Bổ sung tên và tính xác thực thân phận',
   'ai-needs-scripted-fallback':'NPC AI cần hội thoại kịch bản dự phòng','ai-request-not-declared':'Đề nghị NPC AI chưa được khai báo',
   'optional-mission-required':'Nhiệm vụ phụ hoặc ẩn không được bắt buộc hoàn thành world','required-main-mission':'Cần ít nhất một nhiệm vụ chính bắt buộc',
   'pickup-source-mismatch':'Nguồn nhặt vật phẩm chưa khớp với tương tác','pickup-not-declared-on-item':'Vật phẩm chưa khai cách nhận từ tương tác Nhặt',
   'duplicate-id':'Mã bị trùng','unfinished-todo':'Còn phần nội dung chưa viết xong','missing-background':'Cần tham chiếu nền cảnh','visual-asset-kind':'Dạng tạo hình chưa khớp loại ảnh','appearance-variant-mismatch':'Nhân vật hoặc dạng hiển thị chưa khớp biến thể','possessed-sprite-duplicate':'Cần ẩn sprite khi người chơi nhập vai nhân vật','contradictory-flags':'Một cờ đang vừa bắt buộc vừa bị cấm','shop-currency-kind':'Đơn vị tiền phải là vật phẩm loại Tiền trong world','duplicate-shop-stock':'Mặt hàng bị lặp trong cùng cửa hàng','shop-acquisition-stock-mismatch':'Cửa hàng được khai chưa có vật phẩm này trong bảng hàng'};
  for(const e of errors.slice(0,35)){
   const section=names[e.path.split('/')[1]]||'Hồ sơ';
   const message=e.code==='schema:required'?'Thiếu trường bắt buộc':e.code.startsWith('schema:')?'Sai định dạng hoặc giá trị':messages[e.code]||'Cần kiểm tra liên kết nội dung';
   list.append(h('li','',section+' · '+message+' ('+e.path+')'));
  }
  box.append(list);if(errors.length>35)box.append(h('small','','Đang hiển thị 35 mục đầu.'));
  const warnings=report.warnings||[];
  if(warnings.length){
   const labels={'shop-stock-no-acquisition':'Mặt hàng chưa khai cách nhận qua cửa hàng',
    'shop-stock-empty':'Mặt hàng đang hết trong cấu hình; kiểm tra mở bán hoặc bổ sung hàng',
    'shop-currency-source-review':'Đơn vị tiền chưa có cách nhận được khai báo',
    'purchase-source-review':'Mục tiêu mua chưa có nguồn mua được khai báo đầy đủ',
    'purchase-stock-review':'Số hàng được khai thấp hơn số cần mua; kiểm tra điều kiện bổ sung hàng',
    'unreachable-scenes-check-events':'Có cảnh chưa nối được theo đồ thị tĩnh; kiểm tra sự kiện hoặc đường chuyển',
    'engine-rule-review-required':'Điều kiện và sự kiện cần được kiểm bằng engine',
    'rebind-possessed-actor':'NPC cần được xử lý khi người chơi nhập vào chính nhân vật đó'};
   box.append(h('h3','','Cần xem xét kịch bản ('+warnings.length+')'));
   const notes=h('ul','vg-warning-list');
   for(const w of warnings.slice(0,20))notes.append(h('li','',(labels[w.code]||'Cần xem xét nội dung')+' ('+w.path+')'));
   box.append(notes,h('p','vg-muted','Nhắc xem xét không kết luận kịch bản chơi được, số dư đủ hoặc giao dịch sẽ thành công.'));
   if(warnings.length>20)box.append(h('small','','Đang hiển thị 20 nhắc xem xét đầu.'));
  }
  if(!report.valid){
   box.append(h('p','vg-muted','Chỉnh lỗi cấu trúc trước để mô phỏng đường đi và kiểm tra khung ảnh. Nháp vẫn có thể lưu theo quy tắc bản nháp.'));
   return;
  }
  if(report.reachability){
   const r=report.reachability;
   const entryModes={cast_possession:'Nhập vai nhân vật có sẵn',system_cover:'Thân phận hệ thống',native_extra:'Nhân vật bản địa'};
   const summary=r.status==='analysis-budget-exceeded'?
    'Hồ sơ vượt ngân sách phân tích kỹ thuật; chưa thể kết luận đường đi.':
    r.profiles.map((p,i)=>'Vai '+(i+1)+' ('+(entryModes[p.mode]||'Tác giả khai báo')+
    '): có thể tới '+(p.possibleSceneCount??'chưa xác định')+' cảnh, '+
    (p.unreachableSceneCount??'chưa xác định')+' cảnh chưa có đường khai báo.').join(' ');
   const labels={'profile-scene-no-declared-route':'Cảnh chưa có đường đến theo dữ liệu khai báo',
    'main-mission-start-no-route':'Không thấy đường tới cảnh mở nhiệm vụ chính',
    'main-objective-no-declared-source':'Mục tiêu chính thiếu đường đi hoặc nguồn được khai báo',
    'required-place-no-declared-route':'Địa điểm bắt buộc chưa có đường đến',
    'required-npc-intro-no-declared-route':'NPC bắt buộc chưa có đường đến cảnh xuất hiện',
    'transition-flag-not-producible':'Chưa thấy nguồn tạo cờ mở đường',
    'ending-flags-no-declared-source':'Kết thúc cần cờ chưa có nguồn được khai báo',
    'flag-closure-budget-exceeded':'Vượt ngân sách phân tích cờ',
    'analysis-budget-exceeded':'Vượt ngân sách phân tích' };
   qaSection(box,'Đường đi & nhiệm vụ · G3A',
    (summary||'Chưa có hồ sơ nhập vai.')+' Các đường chỉ là khả năng; Engine chưa xác nhận.',
    r.issues,labels);
   if(r.truncated)box.append(h('p','vg-muted','Danh sách cảnh báo đường đi đã được giới hạn; cần kiểm theo từng arc.'));
  }
  if(report.mobileAssets){
   const r=report.mobileAssets;
   const labels={'rendered-asset-unmeasured':'Ảnh đang dùng chưa có PNG xem thử trong phiên',
    'important-region-cropped':'Vùng quan trọng có thể bị cắt khỏi khung hình',
    'image-small-for-mobile-preview':'Ảnh nhỏ cần kiểm độ rõ khi xem trên điện thoại',
    'preview-image-upscaled':'Ảnh bị phóng lớn ở khung thử',
    'shared-background-across-places-needs-review':'Hai địa điểm đang dùng cùng một nền; xác nhận có chủ đích',
    'world-cover-reused-as-scene-needs-review':'Ảnh bìa đang dùng làm nền cảnh; kiểm tra bối cảnh',
    'hotspot-overlay-mobile-placement-unverified':'Vùng tương tác cần xem vị trí và kích thước chạm thực tế',
    'sprite-fallback-text-needs-review':'Hình nhân vật cần có mô tả khi ảnh không hiển thị',
    'sprite-no-alpha-in-observation':'Sprite cần xem lại nền trong suốt',
    'asset-observation-invalid':'Metadata ảnh không khớp pin hoặc bị trùng',
    'asset-qa-budget-or-input-invalid':'Chưa thể kiểm metadata ảnh' };
   qaSection(box,'Hình ảnh mobile · G3B',
    (r.status==='invalid-evidence'?'Metadata ảnh không hợp lệ; cần chọn lại ảnh xem thử. ':'')+
     'Đã đo '+r.observedAssetCount+'/'+r.renderedAssetCount+' ảnh đang dùng; '+
     r.unmeasuredAssetCount+' ảnh chưa có dữ liệu xem thử. '+
     'Khung 320/375/390/430 px chỉ là mô phỏng; vẫn cần xem ảnh, giấy phép và thiết bị thật.',
    r.issues,labels);
   if(r.truncated)box.append(h('p','vg-muted','Danh sách cảnh báo ảnh đã được giới hạn; cần kiểm theo từng arc.'));
  }

 }
 function render(){
  if(!host?.isConnected||!access())return;
  counter=0;host.replaceChildren();
  const app=h('section','vg-editor');app.id='dudu-world-creator';app.setAttribute('aria-label','World Creator');
  const header=h('div','vg-header');header.append(button('‹ Vạn Giới',close,'vg-quiet'),
   h('div','vg-kicker','DUDU STUDIO / WORLD CREATOR'),h('h2','','Xây một tiểu thế giới'));
  const state=h('p','vg-state',dirty?'Có thay đổi chưa lưu':localId?'Đã lưu trên thiết bị · Chưa đồng bộ':'Nháp mới trên thiết bị');state.id='vg-save-state';
  header.append(state);app.append(header);
  const toolbar=h('div','vg-actions'),saveButton=button('Lưu trên thiết bị',save,'vg-primary');saveButton.id='vg-save';saveButton.disabled=saving;
  toolbar.append(saveButton,button('Kiểm tra hồ sơ',()=>{if(canUseJson()){
   report=V.inspectCreatorQa(model,{assetObservations:artObservations()});
   renderReport();notice('Đã kiểm tra hồ sơ trên thiết bị. Cần Engine và reviewer kiểm trước khi phát hành.');
  }}));
  const submit=h('button','','Gửi duyệt');submit.type='button';submit.disabled=true;submit.setAttribute('aria-describedby','vg-backend-state');toolbar.append(submit);app.append(toolbar);
  const offline=h('p','vg-muted','Gửi duyệt chưa kết nối máy chủ. Bạn vẫn có thể soạn, lưu trên thiết bị và xuất bản nháp.');offline.id='vg-backend-state';app.append(offline);
  const menu=h('details','vg-files');menu.append(h('summary','','Bản nháp & tệp JSON'));
  const actions=h('div','vg-actions');actions.append(button('Nháp mới',()=>{if(confirmReplace()){replace(fresh());notice('Đã mở nháp mới.');}}),
   button('Mở nháp đã lưu',list),button('Xuất JSON',exportJson),button('Xuất kèm arc',exportArcPackage));
  const upload=h('input');upload.type='file';upload.accept='.json,application/json';upload.id='vg-import';upload.hidden=true;upload.setAttribute('aria-label','Nhập hồ sơ JSON');
  upload.addEventListener('change',()=>{if(access())importFile(upload.files?.[0]);upload.value='';});
  actions.append(button('Nhập JSON',()=>upload.click()));
  const listBox=h('div','vg-local-list');listBox.id='vg-local-list';menu.append(actions,upload,listBox);app.append(menu);
  const tabs=[['overview','Thông tin'],['arcs','Kế hoạch arc'],['scenes','Địa điểm & cảnh'],['resources','Nguồn & ảnh'],['visualForms','Tạo hình & bố cục'],['roles','Vai nhập'],['characters','Nhân vật & NPC'],['items','Vật phẩm'],['shops','Cửa hàng'],['missions','Nhiệm vụ'],['outcomes','Sự kiện & kết cục'],['advanced','Dữ liệu nâng cao'],['preview','Xem trước']];
  const nav=h('nav','vg-tabs');nav.setAttribute('aria-label','Các mục soạn world');
  for(const [key,label] of tabs){const b=button(label,()=>{tab=key;render();});b.setAttribute('aria-current',key===tab?'page':'false');nav.append(b);}app.append(nav);
  const panel=h('div','vg-panel');({overview,arcs,scenes,resources,visualForms,roles,characters,items,shops,missions,outcomes,advanced,preview}[tab]||overview)(panel);app.append(panel);
  const message=h('p','vg-message','');message.id='vg-message';message.setAttribute('role','status');app.append(message);
  const result=h('details','vg-checks');result.open=!!report;result.append(h('summary','','Kiểm tra nội dung'));
  const reportBox=h('div');reportBox.id='vg-report';result.append(reportBox);app.append(result);host.append(app);renderReport();
 }
 function close(){
  if(dialog){if(dialog.open&&typeof dialog.close==='function')dialog.close();dialog.remove();dialog=null;}
  host=null;
  if(returnFocus?.isConnected&&permitted())returnFocus.focus({preventScroll:true});
  returnFocus=null;
 }
 function open(){
  syncAccess();if(!permitted())return false;
  root.DuduSiteV60?.navigate?.('worlds');
  if(!dialog){
   returnFocus=doc.activeElement;
   dialog=h('dialog','vg-creator-dialog');dialog.id='vg-creator-dialog';
   dialog.setAttribute('aria-label','Soạn thế giới tại Vạn Giới');
   dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
   host=h('div','vg-dialog-content');dialog.append(host);doc.body.append(dialog);
  }
  owner=currentUid();if(!model){model=fresh();localId=null;dirty=false;}
  if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();}
  else{dialog.setAttribute('open','');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');}
  render();host?.querySelector('button')?.focus({preventScroll:true});return true;
 }
 root.DuduWorldCreator=Object.freeze({open,close,syncAccess,version:'G1N',backendConnected:false});
 doc.addEventListener('visibilitychange',syncAccess);root.addEventListener('pageshow',syncAccess);
 root.addEventListener('hashchange',()=>{if(dialog&&root.location.hash!=='#/worlds')close();});
})(window);
