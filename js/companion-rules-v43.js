/* V43.0–V43.2: pure companion rules. No network, storage or game effects. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduCompanionRulesV43=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ID='dudu-system-guide';
 const COIN_DAYS=Object.freeze([3,4,5,6,7,8,12]);
 const MILESTONES=Object.freeze([
  {day:3,id:'dudu-letter-3',name:'Lá Thư Đầu Tiên',icon:'✉️'},
  {day:7,id:'dudu-rose-7',name:'Bông Hồng Tình Bạn',icon:'🌹'},
  {day:14,id:'dudu-ribbon-14',name:'Dải Lụa Gắn Kết',icon:'🎀'},
  {day:30,id:'dudu-kindred-30',name:'Ấn Ký Tri Kỷ',icon:'💞'},
  {day:60,id:'dudu-team-60',name:'Huy Chương Đồng Đội',icon:'🏅'},
  {day:90,id:'dudu-bond-90',name:'Huy Hiệu Đồng Hành',icon:'🌟'}
 ].map(x=>Object.freeze(x)));
 const empty=()=>({login:{day:'',count:0,best:0},chat:{day:'',count:0,best:0},
  lastSeenDay:'',lastGreetingDay:'',welcomed:false,milestones:[],messages:[]});
 function localDay(ms=Date.now()){
  const d=new Date(ms),pad=n=>String(n).padStart(2,'0');
  return Number.isFinite(d.getTime())?
   d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()):'';
 }
 function distance(a,b){
  if(!/^\d{4}-\d\d-\d\d$/.test(a||'')||!/^\d{4}-\d\d-\d\d$/.test(b||''))return null;
  const calc=s=>{const [y,m,d]=s.split('-').map(Number);const n=Date.UTC(y,m-1,d);
   return new Date(n).toISOString().slice(0,10)===s?n:NaN;};
  const p=calc(a),q=calc(b);
  return Number.isFinite(p)&&Number.isFinite(q)?Math.round((q-p)/86400000):null;
 }
 function norm(x){
  const blank=empty();
  if(!x||typeof x!=='object'||Array.isArray(x))return blank;
  const normRun=r=>({
   day:typeof r?.day==='string'?r.day.slice(0,10):'',
   count:Number.isSafeInteger(r?.count)?Math.min(9999,Math.max(0,r.count)):0,
   best:Number.isSafeInteger(r?.best)?Math.min(9999,Math.max(0,r.best)):0
  });
  const safeMessages=Array.isArray(x.messages)?x.messages.filter(m=>
   (m?.role==='user'||m?.role==='model')&&typeof m.text==='string')
   .slice(-50).map(m=>({role:m.role,text:m.text.slice(0,550)})):[];
  return {login:normRun(x.login),chat:normRun(x.chat),
   lastSeenDay:typeof x.lastSeenDay==='string'?x.lastSeenDay:'',
   lastGreetingDay:typeof x.lastGreetingDay==='string'?x.lastGreetingDay:'',
   welcomed:x.welcomed===true,milestones:Array.isArray(x.milestones)?
    [...new Set(x.milestones.filter(id=>MILESTONES.some(m=>m.id===id)))]:[],
   messages:safeMessages};
 }
 function increment(run,today){
  if(run.day===today)return {ok:false,run,reason:'already-today'};
  const delta=distance(run.day,today);
  const count=delta===1?run.count+1:1;
  return {ok:true,run:{day:today,count,best:Math.max(run.best,count)}};
 }
 function checkin(state,today=localDay()){
  const s=norm(state);
  if(!today)return {ok:false,state:s,reason:'invalid-day'};
  const next=increment(s.login,today);
  if(!next.ok)return {ok:false,state:s,reason:next.reason};
  return {ok:true,state:{...s,login:next.run},
   coins:COIN_DAYS[(next.run.count-1)%7]};
 }
 function chat(state,text,today=localDay()){
  const s=norm(state),t=String(text||'').trim();
  if(!today||t.length<4||t.length>500)return {ok:false,state:s,reason:'invalid-message'};
  const next=increment(s.chat,today);
  if(!next.ok)return {ok:false,state:s,reason:next.reason};
  const attained=MILESTONES.filter(m=>next.run.count>=m.day&&!s.milestones.includes(m.id));
  return {ok:true,state:{...s,chat:next.run,
    milestones:[...s.milestones,...attained.map(m=>m.id)]},
   attained};
 }
 function reply(input,titles=[]){
  const raw=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/đ/g,'d').toLowerCase();
  if(/(goi y|gioi thieu|truyen gi|doc gi|thich truyen)/.test(raw)){
   const available=(Array.isArray(titles)?titles:[]).filter(t=>typeof t==='string'&&t.trim()).slice(0,2);
   return available.length?'Nếu cậu muốn tìm truyện, thử xem: '+available.join(' hoặc ')+'. Cậu thích thể loại nào nhất?':
    'Cậu thích truyện tu tiên, hiện đại hay bí ẩn? Tớ có thể giúp cậu tìm trong thư viện DUDU.';
  }
  if(/(nhat do|kho do|vat pham|bo suu tap)/.test(raw))return 'Cậu có thể nhặt đồ ở Kho mỗi 2 phút, hoặc tìm trong chương một lần mỗi ngày. Đồ phổ thông trùng nhau sẽ được xếp gọn ×N.';
  if(/(linh hon|ket noi|mo khoa|npc)/.test(raw))return 'Nhân vật ở mỗi truyện có quá trình kết nối riêng. Hệ thống nhặt mảnh linh hồn và mở khóa bằng vật phẩm đang được phát triển, chưa kích hoạt đâu nhé.';
  if(/(diem danh|chuoi|phan thuong|qua tang)/.test(raw))return 'Mở Nhật ký điểm danh trong cuộc trò chuyện này để nhận Xu thử nghiệm mỗi ngày. Trò chuyện mỗi ngày sẽ ghi dấu những kỷ niệm tình bạn.';
  if(/(cam on|thank)/.test(raw))return 'Có gì đâu! Cậu muốn tìm hiểu Kho Đồ hay tìm một bộ truyện để đọc tiếp không?';
  if(/(chao|hello|hi\b|hey)/.test(raw))return 'Chào cậu! Hôm nay có gì muốn kể không, hay để tớ gợi ý một câu chuyện?';
  if(/(buon|met|chan|lo lang)/.test(raw))return 'Nghe có vẻ hôm nay không dễ dàng nhỉ. Nếu muốn kể đôi chút thì tớ nghe đây. Hoặc ta có thể tìm một câu chuyện nhẹ nhàng để đổi không khí.';
  return 'Tớ nghe đây. Cậu muốn chia sẻ thêm, tìm một truyện hợp gu hay cần tớ hướng dẫn tính năng nào của DUDU?';
 }
 return Object.freeze({ID,COIN_DAYS,MILESTONES,empty,norm,localDay,distance,increment,checkin,chat,reply});
});
