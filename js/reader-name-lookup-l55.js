/* L5.5 lookup and reverse-meaning candidates. Data is loaded lazily in a
 * same-origin Worker; inferred Chinese combinations are never called originals. */
(function(root,factory){
 'use strict';const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReaderNameLookupL55=api;
})(typeof window!=='undefined'?window:typeof self!=='undefined'?self:null,function(root){
 'use strict';
 const norm=s=>typeof s==='string'?s.normalize('NFC').trim().replace(/\s+/gu,' '):'';
 const fold=s=>norm(s).toLocaleLowerCase('vi');
 const title=s=>norm(s).replace(/\p{L}[\p{L}\p{M}]*/gu,w=>w[0].toLocaleUpperCase('vi')+w.slice(1).toLocaleLowerCase('vi'));
 const surnames=new Set(('tần mặc ôn trần nguyễn lê lý lâm triệu vương trương lưu liễu tạ tô tiêu diệp hàn bạch mộ sở chu châu ngô đỗ đường đinh phùng phạm hoàng huỳnh hồ hứa hà cao la lục lương lữ mã nhạc nghiêm phó thẩm tống tôn từ tề uông vũ võ vệ vu yến giang khương dương đào đặng đồng đổng đoàn kim kiều khổng mạnh mai ninh phương trình quý quách thạch thiệu tào bùi lộc').split(' '));
 const compound=new Set(['âu dương','tư mã','thượng quan','nam cung','đông phương','độc cô','mộ dung','gia cát','hạ hầu','hoàng phủ','công tôn','tư đồ','tư không']);
 const stop=new Set(['nói','hỏi','đáp','cười','đứng','ngồi','đi','đến','rời','nhìn','nghe','gặp','gọi','đang','đã','sẽ','là','của','và','với','trong','cũng','bước','liền','vừa','đọc','quát','được','bị','vào','ngoài','trước','sau','rằng','ấy','này','nọ']);
 const ordinary=new Set(['tần suất','lâm vào','mặc dù','mặc kệ','hàn huyên','bình thường','thanh niên','minh bạch','từ từ','lý do','thành công','tâm tình','thiên nhiên','thanh âm','hứa hẹn','đường đi','phương hướng','vương quốc','cao cao']);
 const vernacular=new Set(('biết nếu rõ ràng núi sông thuyền trắng đen đỏ xanh gió mây mưa sấm chớp nắng đêm sáng tối nhớ nghĩ mong ước thương yêu giận buồn vui mừng xuống lên').split(' '));
 // A ranking prior, not a claim about any book's original character spelling.
 const literary=new Set([...('知舟明若清白雪山光月雲云風风雨林寒安寧宁玄辰星夜羽墨涵川溪然言瑤瑶青秋夏春冬夢梦心思遠远子玉蘭兰靈灵天海澤泽亦南北東东西西晨曦瑾瑜初')]);
 const han=/^\p{Script=Han}+$/u;
 const safeText=s=>typeof s==='string'&&!!norm(s)&&s.length<=200&&!/[<>\u0000-\u001f\u007f]/u.test(s);
 function create(charData,meaningData,initialPacks=[]){
  if(charData?.format!=='dudu-hanviet'||meaningData?.format!=='dudu-vietnamese-meanings'||!Array.isArray(meaningData.rows))throw Error('Bộ tra không đúng định dạng.');
  const chars=new Map(Object.entries(charData.characters||{})),baseRows=meaningData.rows;
  let reverse=new Map(),forward=new Map(),readings=new Map(),customNames=new Map(),packs=[],currentChars=new Map(chars);
  function index(){
   reverse=new Map();forward=new Map();readings=new Map();customNames=new Map();
   currentChars=new Map(chars);
   for(const pack of packs.filter(p=>p.kind==='readings'))for(const entry of pack.entries)if([...entry.hanzi].length===1)currentChars.set(entry.hanzi,entry.value.split(/[|;/]/u).map(norm));
   const add=(trad,simp,hv,meaning,source)=>{
    if(!safeText(hv)||!safeText(trad)||!han.test(trad))return;
    const item={hanzi:trad,reading:title(hv),meaning,source};
    for(const key of new Set([trad,simp])){if(!forward.has(key))forward.set(key,[]);const list=forward.get(key);if(list.length<12&&!list.some(r=>fold(r.reading)===fold(hv)&&r.meaning===meaning))list.push(item);}
    for(const part of fold(hv).split(' ')){if(!readings.has(part))readings.set(part,new Set());if([...trad].length===1)readings.get(part).add(trad);}
    for(const gloss of String(meaning||'').split(';')){
     const key=fold(gloss);if(!key||key.split(' ').length>4||key.length>48)continue;
     if(!reverse.has(key))reverse.set(key,[]);const list=reverse.get(key);
     if(!list.some(r=>r.hanzi===trad&&fold(r.reading)===fold(hv)))list.push({...item,meaning:gloss});
    }
   };
   for(const [char,values] of currentChars)for(const value of values){const k=fold(value);if(!readings.has(k))readings.set(k,new Set());readings.get(k).add(char);}
   for(const row of baseRows)add(row[0],row[1],row[2],row[3],'CVDICT');
   for(const pack of packs)for(const entry of pack.entries){
    if(pack.kind==='meanings'){
     const variants=transliterate(entry.hanzi,3);for(const hv of variants)add(entry.hanzi,entry.hanzi,hv,entry.value,pack.name);
    }else{
     for(const value of pack.kind==='readings'?entry.value.split(/[|;/]/u):[entry.value])add(entry.hanzi,entry.hanzi,norm(value),'',pack.name);
     if(pack.kind==='names')customNames.set(entry.hanzi,entry.value);
    }
   }
   for(const values of reverse.values())values.sort((a,b)=>Number(literary.has(b.hanzi))-Number(literary.has(a.hanzi))||a.reading.length-b.reading.length||a.hanzi.localeCompare(b.hanzi));
  }
  function transliterate(text,limit=6){
   let beam=[''];for(const char of [...text]){const values=currentChars.get(char);if(!values?.length)return [];beam=beam.flatMap(p=>values.slice(0,3).map(v=>norm(p+' '+v))).slice(0,limit);}return [...new Set(beam.map(title))];
  }
  function validatePack(input){
   if(input?.format!=='dudu-name-lookup-pack'||input.version!==1||!['names','readings','meanings'].includes(input.kind)||!Array.isArray(input.entries)||!input.entries.length||input.entries.length>50000)throw Error('Bộ tra cần 1–50.000 mục và loại dữ liệu hợp lệ.');
   if(!safeText(input.name)||input.name.length>90)throw Error('Tên bộ tra không hợp lệ.');
   const seen=new Set();const entries=input.entries.map(row=>{
    const h=norm(row?.hanzi),value=norm(row?.value);
    if(!h||[...h].length>20||!han.test(h)||!safeText(value)||value.length>180)throw Error('Mục tra cần chữ Hán = nội dung tiếng Việt, tối đa 180 ký tự.');
    if(input.kind==='readings'&&value.split(/[|;/]/u).some(v=>!/^\p{L}[\p{L}\p{M}]*$/u.test(norm(v))))throw Error('Mỗi phiên âm cần một từ; phân cách các âm bằng | hoặc ;.');
    if(seen.has(h))throw Error('Trùng chữ Hán trong bộ tra: '+h);seen.add(h);return {hanzi:h,value};
   });
   return {format:'dudu-name-lookup-pack',version:1,kind:input.kind,name:norm(input.name),entries};
  }
  function parsePack(text,{kind='names',name='Bộ tra cá nhân'}={}){
   if(typeof text!=='string'||text.length>8000000)throw Error('Bộ tra vượt giới hạn 8 MB.');
   if(text.trim().startsWith('{')){let parsed;try{parsed=JSON.parse(text);}catch(_){throw Error('JSON không hợp lệ.');}return validatePack(parsed);}
   const entries=[];
   for(const [i,line] of text.replace(/^\uFEFF/u,'').split(/\r?\n/u).entries()){
    const row=line.trim();if(!row||row.startsWith('#')||row.startsWith('//'))continue;
    const separator=row.indexOf('=');if(separator<1)throw Error('Dòng '+(i+1)+': cần định dạng chữ Hán = nội dung.');
    entries.push({hanzi:row.slice(0,separator),value:row.slice(separator+1)});
   }
   return validatePack({format:'dudu-name-lookup-pack',version:1,kind,name,entries});
  }
  function installPack(pack){const validated=validatePack(pack),next=packs.filter(p=>p.kind!==validated.kind).concat(validated);packs=next;index();return metadata();}
  function metadata(){return {version:1,build:'l55-1',characters:chars.size,meaningRows:baseRows.length,reverseTerms:reverse.size,sources:[{name:'Hán–Việt Pinyin',author:'Phong Phan',license:'MIT',url:'https://github.com/ph0ngp/hanviet-pinyin-wordlist'},{name:'CVDICT',author:'Phong Phan; nguồn CC-CEDICT',license:'CC BY-SA 4.0',url:'https://github.com/ph0ngp/CVDICT'}],packs:packs.map(p=>({kind:p.kind,name:p.name,count:p.entries.length}))};}
  function suggest(value,{profiles=[],forceMeaning=false}={}){
   const text=norm(value),key=fold(text);if(!text||text.length>90)return [];
   const results=new Map();
   const add=result=>{
    if(result.kind==='inferred'){
     const matches=profiles.filter(p=>fold(p.name)===fold(result.name)||p.aliases.some(a=>fold(a.to)===fold(result.name)));
     if(matches.length===1){result.profileId=matches[0].id;result.score+=.08;result.reason+=' · trùng nhân vật '+matches[0].name;}
     if(matches.length>1){result.automatic=false;result.ambiguous=true;result.reason+=' · trùng nhiều nhân vật';}
    }
    const k=fold(result.name)+(result.profileId?'@'+result.profileId:''),old=results.get(k);if(!old||result.score>old.score)results.set(k,result);
   };
   for(const p of profiles){
    const exact=p.aliases.filter(a=>fold(a.from)===key||fold(a.to)===key);
    for(const alias of exact)add({name:alias.to,score:1,kind:'confirmed',profileId:p.id,reason:'Cách gọi đã xác nhận trong truyện',parts:[],changed:fold(alias.to)!==key,automatic:false});
    if(key.split(' ').length>=2&&fold(p.name).endsWith(' '+key))add({name:title(text),score:.96,kind:'linked',profileId:p.id,reason:'Tên rút gọn của '+p.name,parts:[],changed:false,automatic:false});
    const a=key.split(' '),b=fold(p.name).split(' ');
    if(a.length>=2&&a.length===b.length&&[...a].sort().join(' ')===[...b].sort().join(' ')&&key!==fold(p.name))add({name:p.name,score:.94,kind:'linked',profileId:p.id,reason:'Các từ trùng tên đã lưu, có thể bị đảo vị trí',parts:[],changed:true,automatic:false});
   }
   if(han.test(text)){
    const known=customNames.get(text),direct=forward.get(text)||[];
    if(known)add({name:known,score:1,kind:'dictionary',reason:'Bộ tên riêng cá nhân',parts:[{from:text,to:known,hanzi:text,source:'Bộ tên riêng cá nhân'}],changed:true,automatic:false});
    for(const row of direct)add({name:row.reading,score:row.source==='CVDICT'?.94:.98,kind:'hanviet',reason:'Phiên âm chữ Hán đầu vào; cần kiểm tra cách đọc',parts:[{from:text,to:row.reading,hanzi:text,meaning:row.meaning,source:row.source}],changed:true,automatic:false});
    for(const hv of transliterate(text))add({name:hv,score:.90,kind:'hanviet',reason:'Ghép âm Hán–Việt từng chữ',parts:[{from:text,to:hv,hanzi:text,source:'Hán–Việt Pinyin'}],changed:true,automatic:false});
    return [...results.values()].sort((a,b)=>b.score-a.score).slice(0,6);
   }
   const tokens=key.split(' ');if(tokens.length>6||tokens.some(t=>!/^\p{L}[\p{L}\p{M}]*$/u.test(t)))return [...results.values()];
   const surnameSize=compound.has(tokens.slice(0,2).join(' '))?2:surnames.has(tokens[0])&&tokens.length>1?1:0;
   const prefix=tokens.slice(0,surnameSize),tail=tokens.slice(surnameSize);
   const allReadings=tail.every(t=>readings.has(t)&&!vernacular.has(t));
   if(allReadings&&!forceMeaning)add({name:title(text),score:.84,kind:'capitalization',reason:'Các âm đã có trong bộ Hán–Việt',parts:[],changed:false,automatic:false});
   if(!allReadings||forceMeaning){
    let beam=[{at:0,values:prefix,parts:[],quality:0,changes:0,ambiguous:false}];
    const complete=[];
    while(beam.length){const next=[];
     for(const state of beam){
      if(state.at===tail.length){complete.push(state);continue;}
      const offset=state.at;
      if(readings.has(tail[offset]))next.push({...state,at:offset+1,values:state.values.concat(tail[offset]),quality:state.quality+.55});
      for(let size=Math.min(4,tail.length-offset);size>=1;size--){
       const segment=tail.slice(offset,offset+size).join(' '),matches=reverse.get(segment)||[];
       for(const match of matches.slice(0,6)){
        if(match.reading.split(' ').length>3)continue;
        next.push({at:offset+size,values:state.values.concat(match.reading),parts:state.parts.concat({from:segment,to:match.reading,hanzi:match.hanzi,meaning:match.meaning,source:match.source}),quality:state.quality+size*.7+(literary.has(match.hanzi)?.16:0),changes:state.changes+Number(fold(match.reading)!==segment),ambiguous:state.ambiguous||matches.length>1});
       }
      }
     }
     // Bounded beam: no combinatorial growth on ambiguous Vietnamese meanings.
     const seen=new Set();beam=next.sort((a,b)=>b.quality-a.quality).filter(s=>{const k=s.at+':'+fold(s.values.join(' '));if(seen.has(k))return false;seen.add(k);return true;}).slice(0,24);
    }
    for(const item of complete){const name=title(item.values.join(' '));if(!item.changes||name.split(' ').length>(surnameSize?surnameSize+2:5))continue;
     const personalExact=item.parts.length===1&&fold(item.parts[0].from)===tail.join(' ')&&item.parts[0].source!=='CVDICT'&&!item.ambiguous;
     add({name,score:.65+Math.min(.2,item.quality/(tail.length||1)*.2)+(personalExact?.08:0),kind:'inferred',reason:'Tra ngược nghĩa Việt; chưa xác nhận tên gốc',parts:item.parts,changed:true,ambiguous:item.ambiguous,personalExact,automatic:!item.ambiguous&&!!surnameSize});
    }
   }
   return [...results.values()].sort((a,b)=>b.score-a.score||a.name.length-b.name.length).slice(0,6);
  }
  function detect(text){
   const tokens=Array.from(String(text).matchAll(/[\p{L}\p{M}]+/gu),m=>({text:m[0],key:fold(m[0]),start:m.index,end:m.index+m[0].length}));
   const spans=[],memo=new Map();
   for(let i=0;i<tokens.length;i++){
    const first=tokens[i],size=compound.has(first.key+' '+tokens[i+1]?.key)?2:surnames.has(first.key)?1:0;if(!size)continue;
    let best=null;
    for(let length=size+1;length<=Math.min(size+3,5);length++){
     const slice=tokens.slice(i,i+length);if(slice.length!==length)break;
     if(slice.some((w,j)=>j>0&&!/^\s+$/u.test(text.slice(slice[j-1].end,w.start))))break;
     if(slice.slice(size).some(w=>stop.has(w.key)))break;
     const from=slice.map(w=>w.text).join(' '),key=fold(from);if(ordinary.has(key))continue;
     if(!memo.has(key))memo.set(key,suggest(from));const options=memo.get(key);
     if(options.some(o=>o.kind==='inferred')||options.some(o=>o.kind==='capitalization'))best={from,start:first.start,end:slice.at(-1).end,suspect:options.some(o=>o.kind==='inferred')};
    }
    if(best)spans.push(best);
   }
   return spans;
  }
  packs=initialPacks.map(validatePack);index();
  return Object.freeze({suggest,detect,parsePack,validatePack,installPack,metadata,exportPacks:()=>packs.map(p=>({...p,entries:p.entries.map(e=>({...e}))})),clearPacks:()=>{packs=[];index();return metadata();}});
 }
 // Browser transport: a Worker keeps the 100k-row index off the reading thread.
 const scriptURL=root?.document?.currentScript?.src;
 let worker=null,ready=null,lastMetadata=null,requestId=0;
 const pending=new Map();
 function request(method,payload={},timeout=45000){return new Promise((resolve,reject)=>{
  const id=++requestId,timer=root.setTimeout(()=>{pending.delete(id);reject(Error('Tra cứu quá lâu. Bạn vẫn có thể nhập tên thủ công.'));},timeout);
  pending.set(id,{resolve,reject,timer});worker.postMessage({id,method,...payload});
 });}
 function reset(error){for(const p of pending.values()){root.clearTimeout(p.timer);p.reject(error);}pending.clear();worker?.terminate();worker=null;ready=null;lastMetadata=null;}
 function load(){
  if(ready)return ready;
  if(!root?.Worker||!scriptURL)return Promise.reject(Error('Trình duyệt chưa hỗ trợ bộ tra nền. Bạn có thể nhập tên thủ công.'));
  worker=new root.Worker(new URL('reader-name-lookup-worker-l55.js?v=l55-1',scriptURL));
  worker.onmessage=event=>{const message=event.data,p=pending.get(message.id);if(!p)return;pending.delete(message.id);root.clearTimeout(p.timer);if(message.error)p.reject(Error(message.error));else p.resolve(message.result);};
  worker.onerror=()=>reset(Error('Không tải được bộ tra. Hãy thử lại; chức năng sửa tên thủ công vẫn dùng được.'));
  ready=request('init').then(meta=>{lastMetadata=meta;return meta;}).catch(e=>{reset(e);throw e;});return ready;
 }
 async function call(method,payload){await load();const result=await request(method,payload);if(['install','clear','metadata'].includes(method))lastMetadata=result;return result;}
 return Object.freeze({create,norm,fold,title,load,metadata:()=>lastMetadata,suggest:(text,options)=>call('suggest',{text,options}),analyze:(text,entries)=>call('analyze',{text,entries}),previewPack:(text,options)=>call('preview',{text,options}),installPack:pack=>call('install',{pack}),clearPacks:()=>call('clear'),exportPacks:()=>call('export')});
});
