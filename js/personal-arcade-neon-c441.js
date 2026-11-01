/* C4.41A — local-only staged Neon guest events.
 * This is gameplay progress, never a verified Honor title, item or server reward.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalArcadeNeonC441=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_TIME=Number.MAX_SAFE_INTEGER;
 const CONTRACTS=Object.freeze([
  {
   id:'vip',name:'Đêm Hẹn Khách VIP',guest:'Bà chủ Vân · khách quen phố đêm',
   story:'Một nhóm khách muốn thuê trọn góc máy. Họ đánh giá chất lượng phục vụ, không chỉ tốc độ kiếm tiền.',
   souvenir:'Thẻ Hội Viên Đêm',
   needs:[['stations',2,'2 dàn máy'],['seating',2,'Ghế cấp 2']],
   choices:[
    {id:'comfort',name:'Không gian êm ái',detail:'Đầu tư không gian, phục vụ nhiều lượt ổn định.',
     cost:250,orders:5,streak:2,needs:[['ambiance',2,'Không gian cấp 2']]},
    {id:'speed',name:'Phòng máy tốc độ',detail:'Lượt phục vụ ít hơn nhưng phải giữ combo chính xác.',
     cost:400,orders:3,streak:3,needs:[['cpu',3,'CPU cấp 3'],['router',2,'Mạng cấp 2']]},
    {id:'classic',name:'Góc máy hoài niệm',detail:'Trưng ánh đèn đặc biệt, giữ khách quay lại.',
     cost:350,orders:4,streak:2,needs:[['skin',1,'LED cấp 1']]}
   ]
  },
  {
   id:'esport',name:'Giải Đấu Bình Minh',guest:'Tuyển thủ Kỳ · đội tranh tài',
   story:'Đội tuyển yêu cầu máy ổn định và một quầy khách không mắc lỗi trong chuỗi giải đấu.',
   souvenir:'Cúp Mạch Neon',
   needs:[['roomTier',2,'Phòng cấp 2'],['stations',4,'4 dàn máy'],['router',3,'Mạng cấp 3']],
   choices:[
    {id:'balanced',name:'Giải đấu cân bằng',detail:'Đầu tư vừa phải, lịch đấu dài hơn.',
     cost:900,orders:8,streak:3,needs:[['cooling',2,'Tản nhiệt cấp 2']]},
    {id:'broadcast',name:'Truyền hình trực tiếp',detail:'Tổ chức nhanh, yêu cầu đường truyền và khán đài tốt.',
     cost:1400,orders:6,streak:4,needs:[['ambiance',3,'Không gian cấp 3']]},
    {id:'pro',name:'Máy thi đấu chuyên nghiệp',detail:'Đầu tư mạnh để rút ngắn lịch, khó giữ chuỗi phục vụ.',
     cost:2000,orders:5,streak:5,needs:[['cpu',7,'CPU cấp 7'],['cooling',3,'Tản nhiệt cấp 3']]}
   ]
  },
  {
   id:'archive',name:'Dạ Hội Máy Cổ',guest:'Người giữ máy cũ · nhà sưu tầm ẩn danh',
   story:'Những cỗ máy mang ký ức của khu phố. Một buổi trưng bày chỉ thành công khi phòng máy phục vụ thật sự tốt.',
   souvenir:'Mô Hình Phố Đêm',
   needs:[['roomTier',3,'Phòng cấp 3'],['stations',6,'6 dàn máy'],
    ['ambiance',3,'Không gian cấp 3'],['skin',1,'LED cấp 1']],
   choices:[
    {id:'gallery',name:'Triển lãm tinh tế',detail:'Chuẩn bị tỉ mỉ, đủ thời gian để đón nhiều lượt khách.',
     cost:2500,orders:12,streak:4,needs:[['seating',4,'Ghế cấp 4']]},
    {id:'night',name:'Dạ tiệc ánh đèn',detail:'Không gian kỳ ảo, quầy khách phải giữ nhịp đều.',
     cost:3500,orders:9,streak:5,needs:[['ambiance',4,'Không gian cấp 4']]},
    {id:'legacy',name:'Đêm máy huyền thoại',detail:'Chi phí cao, những lượt phục vụ cuối phải thật chính xác.',
     cost:5000,orders:7,streak:6,needs:[['cpu',10,'CPU cấp 10'],['cooling',4,'Tản nhiệt cấp 4']]}
   ]
  }
 ].map(spec=>Object.freeze({...spec,
  needs:Object.freeze(spec.needs.map(Object.freeze)),
  choices:Object.freeze(spec.choices.map(choice=>Object.freeze({...choice,
   needs:Object.freeze(choice.needs.map(Object.freeze))})))})));
 const validNum=(value,min,max,fallback)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:fallback;
 const fresh=()=>({version:1,selected:null,active:null,done:[]});
 const byId=id=>CONTRACTS.find(contract=>contract.id===id)||null;
 const missing=(neon,needs)=>needs.filter(([field,min])=>!(neon?.[field]>=min)).map(([, ,label])=>label);
 function norm(raw,neon){
  const state=fresh();if(!raw||typeof raw!=='object')return state;
  const completed=new Set();
  if(Array.isArray(raw.done))for(const record of raw.done.slice(0,3)){
   const contract=byId(record?.id),choice=contract?.choices.find(x=>x.id===record?.choice);
   if(contract&&choice&&!completed.has(contract.id)){
    state.done.push({id:contract.id,choice:choice.id,
     at:validNum(record.at,0,MAX_TIME,0)});completed.add(contract.id);
   }
  }
  const selected=byId(raw.selected);
  if(selected&&!completed.has(selected.id))state.selected=selected.id;
  const id=raw.active?.id,contract=byId(id);
  const choice=contract?.choices.find(x=>x.id===raw.active?.choice);
  const startOrders=validNum(raw.active?.startOrders,0,1000000,-1);
  if(contract&&choice&&!completed.has(contract.id)&&startOrders>=0&&
    startOrders<=validNum(neon?.orderWon,0,1000000,0)){
   state.active={id:contract.id,choice:choice.id,startOrders,
    streak:Math.min(validNum(raw.active.streak,0,1000,0),
     Math.max(0,validNum(neon?.orderWon,0,1000000,0)-startOrders)),
    at:validNum(raw.active.at,0,MAX_TIME,0)};
   state.selected=contract.id;
  }
  return state;
 }
 function eligible(neon,program,contract){
  const index=CONTRACTS.indexOf(contract);
  return index>=0&&(index===0||program.done.some(x=>x.id===CONTRACTS[index-1].id))&&
   missing(neon,contract.needs).length===0;
 }
 function progress(neon){
  const program=neon?.program||fresh(),active=program.active;
  const contract=byId(active?.id);
  const choice=contract?.choices.find(x=>x.id===active?.choice);
  if(!contract||!choice)return null;
  const orders=Math.max(0,(neon.orderWon||0)-active.startOrders);
  const streak=active.streak;
  return {contract,choice,orders,streak,
   ready:orders>=choice.orders&&streak>=choice.streak};
 }
 function recordOrder(neon,correct){
  const active=neon?.program?.active;
  if(!active)return;
  active.streak=correct?Math.min(1000,active.streak+1):0;
 }
 function act(state,action,time=Date.now()){
  const neon=state.neon,program=neon.program;
  const fail=reason=>({ok:false,reason,state});
  const succeed=label=>({ok:true,label,state});
  const open=/^neon-event-open-([012])$/.exec(action||'');
  if(open){
   if(program.active)return fail('Hãy hoàn tất chương trình đang diễn ra trước.');
   const contract=CONTRACTS[Number(open[1])];
   if(program.done.some(x=>x.id===contract.id))return fail('Kỷ vật chương trình này đã nhận.');
   program.selected=contract.id;
   return succeed('Đang xem kế hoạch '+contract.name);
  }
  if(action==='neon-event-back'){
   if(program.active)return fail('Chương trình đã khởi động. Hoàn thành để nhận kỷ vật.');
   program.selected=null;return succeed('Đã đóng kế hoạch sự kiện');
  }
  const pick=/^neon-event-pick-([012])$/.exec(action||'');
  if(pick){
   if(program.active)return fail('Bạn đang tổ chức một chương trình khác.');
   const contract=byId(program.selected);
   if(!contract||!eligible(neon,program,contract))return fail('Hạ tầng hoặc hành trình trước chưa đủ để tổ chức.');
   const choice=contract.choices[Number(pick[1])];
   const req=missing(neon,choice.needs);
   if(req.length)return fail('Còn thiếu: '+req.join(', '));
   if(state.coins<choice.cost)return fail('Chưa đủ Xu Arcade để đầu tư cho phương án này.');
   state.coins-=choice.cost;
   program.active={id:contract.id,choice:choice.id,startOrders:neon.orderWon,streak:0,at:time};
   return succeed('✦ '+contract.name+' · '+choice.name+'! Hãy phục vụ các đơn tại quầy.');
  }
  if(action==='neon-event-claim'){
   const status=progress(neon);
   if(!status||!status.ready)return fail('Cần hoàn thành đủ đơn và combo phục vụ đã chọn.');
   if(program.done.some(x=>x.id===status.contract.id))return fail('Kỷ vật đã được ghi nhận.');
   program.done.push({id:status.contract.id,choice:status.choice.id,at:time});
   program.active=null;program.selected=null;
   return succeed('✦ Đã lưu kỷ vật '+status.contract.souvenir+' tại Trạm Neon (chỉ trên thiết bị)!');
  }
  return fail('Thao tác sự kiện chưa được hỗ trợ.');
 }
 return Object.freeze({CONTRACTS,fresh,norm,missing,eligible,progress,recordOrder,act});
});
