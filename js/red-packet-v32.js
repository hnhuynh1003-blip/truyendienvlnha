/* V32 virtual-Xu red packets: local Sandbox or owner-scoped Firestore profile.
 * No cash, NPC wallet, verified NPC receipt, EXP or relationship rewards.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduRedPacketV32=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const DENOMINATIONS=Object.freeze([10,50,100,520,1314]);
  const MAX_PER_DAY=3;
  const COOLDOWN_MS=300000;
  const MAX_NOTE_LENGTH=60;
  const STATES=Object.freeze({SENT:'SENT',RECEIVED:'RECEIVED'});
  const REASONS=Object.freeze({
    'locked':'NPC chưa được mở khóa.',
    'insufficient':'Số xu trong tài khoản không đủ.',
    'daily-limit':'Đã gửi đủ ba phong bao cho NPC này hôm nay.',
    'cooldown':'Cần nghỉ 5 phút giữa hai lần gửi phong bao.',
    'invalid':'Không thể gửi phong bao lúc này.'
  });
  function normalizeRecord(record){
    return {
      day:typeof record?.day==='string'?record.day:'',
      count:Number.isSafeInteger(record?.count)&&record.count>=0?record.count:0,
      lastAt:Number.isSafeInteger(record?.lastAt)&&record.lastAt>=0?record.lastAt:0,
      events:Array.isArray(record?.events)?record.events.filter(e=>
        Number.isSafeInteger(e?.amount)&&DENOMINATIONS.includes(e.amount)&&
        typeof e.id==='string'&&e.id.length<=90&&
        Number.isSafeInteger(e.at)&&e.at>0).slice(-20).map(e=>({
          id:e.id,at:e.at,amount:e.amount,
          // Only a separate, confirmed NPC receipt may set RECEIVED.
          status:e.status===STATES.RECEIVED?STATES.RECEIVED:STATES.SENT,
          note:typeof e.note==='string'?e.note.slice(0,MAX_NOTE_LENGTH):''
        })):[]
    };
  }
  function evaluate({amount,balance,record,unlocked,now=Date.now()}={}){
    const fail=(reason)=>Object.freeze({ok:false,reason,message:REASONS[reason]||REASONS.invalid});
    if(!Number.isSafeInteger(now)||now<=0||
      !Number.isSafeInteger(amount)||!DENOMINATIONS.includes(amount)||
      !Number.isSafeInteger(balance)||balance<0)return fail('invalid');
    if(!unlocked)return fail('locked');
    if(balance<amount)return fail('insufficient');
    const rec=normalizeRecord(record);
    const day=new Date(now).toISOString().slice(0,10);
    const count=rec.day===day?rec.count:0;
    if(count>=MAX_PER_DAY)return fail('daily-limit');
    if(rec.lastAt>0 && now-rec.lastAt<COOLDOWN_MS)return fail('cooldown');
    return Object.freeze({ok:true,amount,day,count:count+1,balanceAfter:balance-amount});
  }
  function sanitizeNote(note){return String(note||'').trim().slice(0,MAX_NOTE_LENGTH);}
  function nextRecord(record,plan,{id,at,note}={}){
    if(!plan?.ok||typeof id!=='string'||!/^[a-zA-Z0-9][\w-]{3,85}$/.test(id)||
      !Number.isSafeInteger(at)||at<=0||plan.day!==new Date(at).toISOString().slice(0,10))
      return null;
    const rec=normalizeRecord(record);
    if(rec.events.some(x=>x.id===id))return null;
    return {
      day:plan.day,count:plan.count,lastAt:at,
      events:[...rec.events,{id,at,amount:plan.amount,
        status:STATES.SENT,note:sanitizeNote(note)}].slice(-20)
    };
  }
  // Chronological, role-local chat plus account/NPC envelope history. Pre-V32
  // messages have no timestamps: keep them together before dated events rather
  // than falsely claiming which side of a historic packet they were sent on.
  function timeline(messages,record){
    const chat=(Array.isArray(messages)?messages:[]).map((message,index)=>({
      kind:'message',message,at:Number.isSafeInteger(message?.at)&&message.at>0?
        message.at:-1,order:index
    }));
    const packets=normalizeRecord(record).events.map((packet,index)=>({
      kind:'packet',packet,at:packet.at,order:chat.length+index
    }));
    return [...chat,...packets].sort((a,b)=>a.at-b.at||a.order-b.order);
  }
  return Object.freeze({DENOMINATIONS,MAX_PER_DAY,COOLDOWN_MS,MAX_NOTE_LENGTH,
    STATES,REASONS,normalizeRecord,evaluate,nextRecord,sanitizeNote,timeline});
});
