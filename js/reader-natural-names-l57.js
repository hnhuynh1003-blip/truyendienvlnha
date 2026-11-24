/* L5.7: local suggestion presentation only. No inferred original spelling. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduReaderNaturalNamesL57=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=v=>typeof v==='string'?v.normalize('NFC').trim().replace(/\s+/gu,' '):'';
 const fold=v=>norm(v).toLocaleLowerCase('vi');
 // Whole-name editorial examples, not translations or evidence of surname/gender.
 const editorial=new Map([['khi dã',['Kỳ Dã']],['nhưng chân',['Nhược Chân']]]);
 function groups(value,items=[]){
  const from=norm(value);if(!from||from.length>90||!/^\p{L}[\p{L}\p{M}\s]*$/u.test(from))return [];
  const standard=[],natural=[],seen=new Set();
  const add=(list,item)=>{const key=fold(item.name)+'@'+(item.profileId||'');if(seen.has(key))return;seen.add(key);list.push({...item,parts:item.parts||[],automatic:false});};
  const confirmed=items.filter(i=>i.kind==='confirmed');
  for(const item of items){
   if(!norm(item.name)||!Array.isArray(item.parts))continue;
   if(['hanviet','dictionary'].includes(item.kind)&&/^\p{Script=Han}+$/u.test(from))
    add(standard,{...item,reason:'Tra chữ Hán đầu vào; cần đối chiếu cách đọc. '+item.reason});
   else if(item.kind==='inferred'&&item.parts.length&&item.parts.every(p=>p.hanzi&&p.source))
    add(standard,{...item,reason:'Có căn cứ bộ tra, suy ngược từ nghĩa; KHÔNG xác nhận chữ Hán gốc. '+item.reason});
   else if(['confirmed','linked'].includes(item.kind))
    add(natural,{...item,reason:item.kind==='confirmed'?'Cách gọi bạn đã xác nhận trong truyện.':item.reason+' · Chọn đúng hồ sơ trước khi xác nhận.'});
  }
  // Never override a confirmed identity or guess how to alter a known surname/gender.
  if(!confirmed.length)for(const name of editorial.get(fold(from))||[])
   add(natural,{name,kind:'editorial',reason:'Phương án biên tập, không phải bản dịch xác thực. Chưa biết họ/giới tính; hãy đối chiếu nhân vật.',parts:[]});
  return [
   {id:'standard',label:'Chuẩn Hán–Việt',note:'Chỉ xác thực cách đọc theo bộ tra; tên gốc vẫn cần đối chiếu.',items:standard.slice(0,3)},
   {id:'natural',label:'Tên tự nhiên',note:'Biên tập hoặc cách gọi đã duyệt; không suy đoán danh tính.',items:natural.slice(0,3)},
   {id:'keep',label:'Giữ nguyên',note:'Không thay đổi tên ban đầu.',items:[{name:from,kind:'keep',reason:'Giữ nguyên tên được chọn.',parts:[],automatic:false}]}
  ];
 }
 return Object.freeze({groups});
});
