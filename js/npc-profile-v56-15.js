/* DUDU Studio V56.15 — three-layer NPC authoring profile.
 * Read-only compatibility with V55/V56 "note" string. Never migrates,
 * truncates, modifies or writes canonical NPC notes or player memory.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduNpcProfileV5615=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_INSTRUCTION=3000;
 const MARKERS=Object.freeze({traits:'[TÍNH CÁCH]',memory:'[KÝ ỨC CỐT TRUYỆN]',chat:'[CÁCH NHẮN TIN]'});
 const TEMPLATE=[
  MARKERS.traits,
  'Nghề nghiệp / vai trò: [nghề và vai trò].',
  'Bề ngoài: [ấn tượng ban đầu, ngắn gọn]. Bên trong: [động cơ, điểm yếu].',
  'Với người lạ: [cách cư xử]. Với người thân: [khác biệt].',
  'Chỉ nghiêm khắc hoặc tức giận KHI [tình huống cụ thể]; không áp thái độ đó lên mọi câu chào.',
  '',
  MARKERS.memory,
  '- [TỪ CHƯƠNG: 3] [Sự kiện đã xảy ra; chỉ NPC có liên quan mới biết].',
  '- [TỪ CHƯƠNG: 8] [Một ký ức khác đã được tác giả xác nhận].',
  'Không ghi tiết lộ quan trọng vào phần tính cách. Không có mốc chương thì ký ức không tự được AI kể.',
  '',
  MARKERS.chat,
  'Xưng hô: [cách xưng hô với người lạ / người thân].',
  'Độ dài: lời chào một câu; bình thường 1–2 câu; giải thích dài khi được yêu cầu.',
  'Tính cách thể hiện qua lời nhắn, không miêu tả cử chỉ, ánh mắt hay dựng cảnh.',
  'Không tự nhận người mới là bệnh nhân, người yêu hoặc nhân vật chính.'
 ].join('\n');
 function cleanText(t){return String(t||'').replace(/\r\n?/g,'\n').replace(/[\u200b\u200c\u200d\ufeff]/g,'').trim();}
 function norm(t){return cleanText(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();}
 function section(line){
  const s=norm(line).replace(/^#+\s*/,'').replace(/^\s*(?:i{1,3}|[123])\s*[.)]\s*/,'')
    .replace(/^\[|\]$/g,'').replace(/^\*+|\*+$/g,'').trim();
  if(/^tinh cach\b/.test(s))return 'traits';
  if(/^(?:ky uc|ky niem|cac dau moc|su kien cot truyen)\b/.test(s))return 'memory';
  if(/^(?:cach nhan tin|giao tiep|phong cach nhan tin|quy tac nhan tin)\b/.test(s))return 'chat';
  return null;
 }
 const GROUPS=[
  /lạnh lùng|nghiêm nghị|kiệm lời|ít nói|sắc sảo|thẳng thắn/i,
  /nguyên tắc|trách nhiệm|tâm huyết|quyết liệt|cẩn trọng/i,
  /tinh tế|dịu dàng|ấm áp|chu đáo|quan tâm|ân cần/i,
  /giàu tình cảm|trắc ẩn|dễ tổn thương|yếu mềm|thương cảm|xót xa/i,
  /với người lạ|khi mới quen|người mới|với bệnh nhân|chỉ khi|không vô cớ/i
 ];
 function balancedTraits(text,max=780){
  const lines=cleanText(text).split('\n').map(x=>x.trim().replace(/^[-•*]\s*/,'')).filter(Boolean);
  if(lines.join(' ').length<=max)return lines.join(' ').slice(0,max);
  const used=new Set(),picked=[];
  for(const re of GROUPS){
   const i=lines.findIndex((l,j)=>!used.has(j)&&re.test(l)&&l.length>7);
   if(i>=0){used.add(i);picked.push(lines[i].slice(0,155).replace(/\s+[^\s]*$/,''));}
  }
  if(!picked.length)for(const l of lines.slice(0,3))picked.push(l.slice(0,160));
  return picked.join(' | ').slice(0,max);
 }
 function parse(note){
  const original=cleanText(note);
  if(!original)return {traits:'',memory:'',chat:'',legacy:true};
  const lines=original.split('\n'),buckets={traits:[],memory:[],chat:[]};
  let group=null,marked=false;
  for(const line of lines){
   const heading=section(line);
   if(heading){group=heading;marked=true;continue;}
   if(group)buckets[group].push(line);
  }
  if(!marked)return {traits:balancedTraits(original),memory:'',chat:'',legacy:true};
  return {traits:balancedTraits(buckets.traits.join('\n')),
    memory:cleanText(buckets.memory.join('\n')),chat:cleanText(buckets.chat.join('\n')).slice(0,340),
    legacy:false};
 }
 function gateChapter(key,novel,readRewards){
  const chapters=novel?.chapters,done=readRewards;
  if(!Array.isArray(chapters)||!done||typeof done!=='object'||!novel?.id)return false;
  const text=String(key||'').trim();
  const idx=/^\d+$/.test(text)?Number(text)-1:chapters.findIndex(c=>c?.id===text);
  if(!Number.isInteger(idx)||idx<0||idx>=chapters.length)return false;
  const chapter=chapters[idx];
  const readKey=novel.id+'_'+(chapter?.id||idx);
  // V55's readRewards indicates opening that exact chapter, not verified reading.
  return done[readKey]===true;
 }
 function approvedMemory(memory,query,novel,readRewards){
  if(!memory||typeof query!=='string'||query.trim().length<3)return '';
  const lines=memory.split('\n'),out=[];
  const q=norm(query);
  const stop=new Set(['khong','trong','chuyen','nhung','nhieu','theo','nguoi',
    'minh','cung','chung','biet','muon','nghe','tung','thoi','gian','ban','cua',
    'nhin','dang','duoc','phai','nhan','nhieu','khien','nay','sao','chao']);
  const qWords=q.split(/[^a-z0-9]+/).filter(w=>w.length>=5&&!stop.has(w));
  // Proper names shorter than 5 characters require an exact multi-word match.
  const named=['tu du','te giac','bac ha','ung thu','cam thu','trong dem'];
  const namedMatches=named.filter(term=>q.includes(term));
  if(!qWords.length&&!namedMatches.length)return '';
  for(const line of lines){
   const match=line.match(/^\s*(?:[-•*]\s*)?\[TỪ CHƯƠNG:\s*([^\]]+)\]\s*(.+)$/i);
   if(!match||!gateChapter(match[1],novel,readRewards))continue;
   const content=cleanText(match[2]);
   const words=norm(content);
   if(qWords.some(w=>words.includes(w))||
      namedMatches.some(phrase=>words.includes(phrase)))out.push(content.slice(0,170));
   if(out.join(' ').length>=320)break;
  }
  return out.join(' ').slice(0,350);
 }
 function compile({char,novel,role,relation,roleInstruction,query,readRewards,messageGuidance}={}){
  const p=parse(char?.note);
  const who=cleanText(char?.name||'NPC').slice(0,110);
  const title=cleanText(novel?.title||'truyện').slice(0,110);
  const affinity=Number.isFinite(Number(relation?.affinity))?Math.min(100,Math.max(0,Math.round(relation.affinity))):0;
  const header='DUDU LINK: ĐÂY LÀ APP NHẮN TIN THÔNG THƯỜNG, KHÔNG PHẢI GAME NHẬP VAI THEO CẢNH. '+ 
    'Bạn chính là '+who+' đang trực tiếp nhắn tin; chỉ viết lời bạn gõ. Không kể ngôi ba, không tả cử chỉ/ánh mắt, không xuất [Hệ thống].';
  const identity=[
    'Tên người liên lạc/ID vai đã chọn (KHÔNG phải nhân vật khác):',
    cleanText(roleInstruction).slice(0,620)||
      ('Người liên lạc: '+cleanText(role?.name||'không rõ').slice(0,90)+'.'),
    'Tên giống nhau KHÔNG chứng minh cùng nhân vật; KHÔNG gán ký ức, bệnh án, quan hệ hoặc danh tính nhân vật truyện cho người đọc nếu chưa xác nhận.'
  ].join('\n');
  const persona=[
    'NPC: '+who+' — truyện '+title+'. Nghề/vai: '+cleanText(char?.role||'chưa rõ').slice(0,100)+'.',
    'TÍNH CÁCH ỔN ĐỊNH: '+(p.traits||'Giữ tính cách được tác giả xác định.').slice(0,670),
    'MỨC ĐỘ THÂN THIẾT hiện tại '+affinity+'/100. Không tự coi người lạ là người thân; thiện cảm thấp = kín đáo, KHÔNG mặc định xúc phạm.',
    'Chỉ nghiêm khắc khi ngữ cảnh cụ thể thật sự cần; lời làm quen không phải hành vi gây hại.'
  ].join('\n');
  const style='LỜI NHẮN: '+(p.chat||'Lời chào thường 1 câu; câu thường 1–2 câu. Dài hơn chỉ khi người đọc yêu cầu chi tiết.').slice(0,270);
  const memory=approvedMemory(p.memory,query,novel,readRewards);
  const memoryPart=memory?'SỰ KIỆN ĐÃ ĐƯỢC MỞ VÀ PHÙ HỢP CÂU HỎI (không tự đưa ra nếu không được hỏi): '+memory:'';
  const ending='ƯU TIÊN CAO NHẤT: phản hồi đúng TIN NHẮN MỚI NHẤT bằng 1–2 câu như người thật đang chat. '+ 
    'Không tự phát bệnh án, tình tiết cũ, giảng đạo hoặc độc thoại khi người đọc chỉ chào hỏi/làm quen. '+ 
    'Không suy diễn vai A/B/C, không tiết lộ tình tiết chưa mở. Cảm xúc chỉ thể hiện qua lời nói, tuyệt đối không viết văn tả cảnh.';
  const guide=cleanText(messageGuidance).slice(0,340);
  const required=[header,identity,persona,style,guide,ending].filter(Boolean);
  let result=required.join('\n');
  if(memoryPart&&result.length+memoryPart.length+1<=MAX_INSTRUCTION)
    result=[header,identity,persona,style,memoryPart,guide,ending].filter(Boolean).join('\n');
  // Required content has fixed per-field budgets. If exceptionally oversized,
  // omit optional author-style and trim only traits, never the final safety rules.
  if(result.length>MAX_INSTRUCTION){
   result=[header,identity,persona.slice(0,Math.max(300,persona.length-(result.length-MAX_INSTRUCTION)-30)),
     guide,ending].filter(Boolean).join('\n');
  }
  return result.length<=MAX_INSTRUCTION?result:result.slice(0,MAX_INSTRUCTION-ending.length-1)+'\n'+ending;
 }
 return Object.freeze({TEMPLATE,MARKERS,parse,balancedTraits,gateChapter,approvedMemory,compile,MAX_INSTRUCTION});
});
