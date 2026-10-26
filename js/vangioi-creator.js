/* World Creator G1H — Vạn Giới authoring, independent from owner AI Core. Local draft editing only; server rights/submit stay closed. */
(function(root){
 'use strict';
 const doc=root.document,V=root.DuduWorldValidation;
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
   close();
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
 function editable(content){
  const blank=fresh();delete blank.contentVersion;
  const value=structuredClone(content);return {...blank,...value,
   aiPolicy:{...blank.aiPolicy,...value.aiPolicy},playRequirements:{...blank.playRequirements,...value.playRequirements}};
 }
 function replace(content,id=null){model=editable(content);localId=id;epoch++;serial++;dirty=id===null;report=null;jsonPending=false;jsonText='';saving=false;render();}
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
    button('Xóa tham chiếu ảnh',()=>removeEntity('assets',i,'assetId'),'vg-quiet'));panel.append(card);
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
    if(a.type==='shop')row.append(bind('Cửa hàng nguồn',q+'.shopId',a.shopId,{omitEmpty:true,options:choices(arr('shops'),'shopId','name')}));
    row.append(button('Xóa cách nhận',()=>{item.acquisitionMethods.splice(j,1);mark();render();},'vg-quiet'));c.append(row);
   });
   c.append(button('+ Thêm cách nhận',()=>{(item.acquisitionMethods||=[]).push({type:'starting'});mark();render();}),
    button('Xóa vật phẩm',()=>removeEntity('items',i,'itemId'),'vg-quiet'));panel.append(c);
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
  const messages={'missing-reference':'Tham chiếu chưa tồn tại','cast-not-playable':'Nhân vật chưa được cho phép nhập vai',
   'native-history-required':'Bổ sung lịch sử và quan hệ bản địa','cover-identity-required':'Bổ sung tên và tính xác thực thân phận',
   'ai-needs-scripted-fallback':'NPC AI cần hội thoại kịch bản dự phòng','ai-request-not-declared':'Đề nghị NPC AI chưa được khai báo',
   'optional-mission-required':'Nhiệm vụ phụ hoặc ẩn không được bắt buộc hoàn thành world','required-main-mission':'Cần ít nhất một nhiệm vụ chính bắt buộc',
   'pickup-source-mismatch':'Nguồn nhặt vật phẩm chưa khớp với tương tác','pickup-not-declared-on-item':'Vật phẩm chưa khai cách nhận từ tương tác Nhặt',
   'duplicate-id':'Mã bị trùng','unfinished-todo':'Còn phần nội dung chưa viết xong','missing-background':'Cần tham chiếu nền cảnh'};
  for(const e of errors.slice(0,35)){
   const section=names[e.path.split('/')[1]]||'Hồ sơ';
   const message=e.code==='schema:required'?'Thiếu trường bắt buộc':e.code.startsWith('schema:')?'Sai định dạng hoặc giá trị':messages[e.code]||'Cần kiểm tra liên kết nội dung';
   list.append(h('li','',section+' · '+message+' ('+e.path+')'));
  }
  box.append(list);if(errors.length>35)box.append(h('small','','Đang hiển thị 35 mục đầu.'));
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
  const tabs=[['overview','Thông tin'],['scenes','Địa điểm & cảnh'],['resources','Nguồn & ảnh'],['roles','Vai nhập'],['characters','Nhân vật & NPC'],['items','Vật phẩm'],['missions','Nhiệm vụ'],['outcomes','Sự kiện & kết cục'],['advanced','Dữ liệu nâng cao'],['preview','Xem trước']];
  const nav=h('nav','vg-tabs');nav.setAttribute('aria-label','Các mục soạn world');
  for(const [key,label] of tabs){const b=button(label,()=>{tab=key;render();});b.setAttribute('aria-current',key===tab?'page':'false');nav.append(b);}app.append(nav);
  const panel=h('div','vg-panel');({overview,scenes,resources,roles,characters,items,missions,outcomes,advanced,preview}[tab]||overview)(panel);app.append(panel);
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
 root.DuduWorldCreator=Object.freeze({open,close,syncAccess,version:'G1H',backendConnected:false});
 doc.addEventListener('visibilitychange',syncAccess);root.addEventListener('pageshow',syncAccess);
 root.addEventListener('hashchange',()=>{if(dialog&&root.location.hash!=='#/worlds')close();});
})(window);
