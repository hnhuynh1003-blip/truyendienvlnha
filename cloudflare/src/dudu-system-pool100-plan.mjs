// DUDU V72 — EDITORIAL BLUEPRINT ONLY. NOT IMPORTED BY THE LIVE WORKER.
// This does not create an account, change the V71 Durable Object, grant
// abilities or reveal the private origin to any player.
// For future reviewed migration to exactly 100 systems / 90 regular / 10 rogue.
export const PROPOSED_POOL_SIZE=100;
export const REGULAR_COUNT=90;
export const ROGUE_COUNT=10;

const domains=[
 ['quan-sat','quan sát dấu vết và chi tiết bị bỏ qua'],
 ['dieu-tra','xâu chuỗi các manh mối có bằng chứng'],
 ['thuong-luong','phân tích điểm chung khi thương lượng'],
 ['ngoai-giao','nhận diện liên hệ và quan hệ xã hội'],
 ['sinh-ton','định hướng hành động trong hoàn cảnh thiếu thốn'],
 ['van-chuyen','lập kế hoạch di chuyển và vận tải'],
 ['che-tao','đề xuất cách sử dụng công cụ sẵn có'],
 ['tri-thuc','đối chiếu tri thức đã được nhân vật biết'],
 ['phong-ho','nhận biết nguy cơ đối với ký chủ'],
 ['kham-pha','phát hiện cơ hội khám phá hợp lệ']
];
const situations=[
 ['ky-uc','khi hồi tưởng thông tin đã xác minh'],
 ['thoi-diem','khi thời gian và cơ hội bị giới hạn'],
 ['dia-diem','khi bối cảnh hoặc địa hình thay đổi'],
 ['doi-thoai','trong đối thoại với NPC'],
 ['truy-tim','khi truy tìm đối tượng đã được biết'],
 ['ket-noi','khi phối hợp với đồng đội'],
 ['lua-chon','khi đánh giá các nhánh lựa chọn'],
 ['rui-ro','khi cân nhắc rủi ro của quyết định'],
 ['tai-nguyen','khi nguồn lực đang khan hiếm'],
 ['hau-qua','khi xem xét hậu quả đã được ghi nhận']
];
function secureIndex(max){
 if(!Number.isInteger(max)||max<1||max>1000000)throw Error('invalid range');
 const bound=0x100000000;
 const limit=Math.floor(bound/max)*max;
 let n;
 do{n=globalThis.crypto.getRandomValues(new Uint32Array(1))[0];}
 while(n>=limit);
 return n%max;
}
export function buildPoolBlueprint(randomIndex=secureIndex){
 const slots=Array.from({length:PROPOSED_POOL_SIZE},(_,i)=>i);
 for(let i=slots.length-1;i>0;i--){
  const j=randomIndex(i+1);
  if(!Number.isInteger(j)||j<0||j>i)throw Error('invalid random index');
  [slots[i],slots[j]]=[slots[j],slots[i]];
 }
 const rogueSlots=new Set(slots.slice(0,ROGUE_COUNT));
 const rows=Array.from({length:PROPOSED_POOL_SIZE},(_,i)=>{
  const d=domains[Math.floor(i/10)],s=situations[i%10];
  return Object.freeze({
   systemNum:i+1,
   origin:rogueSlots.has(i)?'irregular':'regular', // server-only
   // Every system has a DISTINCT editorial perk key and advantage.
   perkKey:d[0]+':'+s[0],
   advantageDraft:'Có thiên hướng '+d[1]+' '+s[1]+'.',
   status:'editorial-only'
  });
 });
 return Object.freeze(rows);
}
export function validatePoolBlueprint(rows){
 if(!Array.isArray(rows)||rows.length!==100)return false;
 if(rows.filter(x=>x.origin==='regular').length!==90 ||
    rows.filter(x=>x.origin==='irregular').length!==10)return false;
 if(new Set(rows.map(x=>x.systemNum)).size!==100 ||
    new Set(rows.map(x=>x.perkKey)).size!==100)return false;
 return rows.every(x=>x.status==='editorial-only'&&
  typeof x.advantageDraft==='string'&&x.advantageDraft.length>25);
}
