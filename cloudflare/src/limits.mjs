// Pure logic shared by Worker and tests. Never trust usage counters from browsers.
export const USER_DAILY_LIMIT=120;
export const GLOBAL_DAILY_LIMIT=250;
export const MIN_INTERVAL_MS=5_000;
export const MAX_TOTAL_INPUT=12_000;
import {resolveModel} from './npc-models.mjs';
export function utcDay(ms) {return new Date(ms).toISOString().slice(0,10);}
export function validRequest(data, isAdmin=false) {
  if (!data || typeof data!=='object' || Array.isArray(data)) return null;
  if (!['chat','assist'].includes(data.purpose)) return null;
  if (data.purpose==='assist'&&!isAdmin) return null;
  if (typeof data.instruction!=='string'||!data.instruction.trim()||data.instruction.length>3000) return null;
  if (!Array.isArray(data.messages)||data.messages.length<1||data.messages.length>12) return null;
  const messages=[];
  let length=data.instruction.length;
  for(const message of data.messages){
    if(!message||!['user','model'].includes(message.role)||
      typeof message.text!=='string'||!message.text.trim()||message.text.length>5000) return null;
    length+=message.text.length;
    messages.push({role:message.role,parts:[{text:message.text}]});
  }
  if(length>MAX_TOTAL_INPUT||messages.at(-1).role!=='user')return null;
  // A model ID is accepted only from the server's explicit text-model allowlist.
  const model=data.purpose==='chat'?resolveModel(data.model):resolveModel(undefined);
  if(!model)return null;
  return {purpose:data.purpose,model,systemInstruction:{parts:[{text:data.instruction}]},contents:messages};
}
export function quotaFailure(user,global,now){
  if(Number(user?.calls||0)>=USER_DAILY_LIMIT)return 'daily-user';
  if(Number(global?.calls||0)>=GLOBAL_DAILY_LIMIT)return 'daily-global';
  if(Number(user?.active_until||0)>now)return 'in-flight';
  if(Number(user?.last_at||0)>0 && now-Number(user.last_at)<MIN_INTERVAL_MS)return 'cooldown';
  return null;
}
export function quotaMessage(code){
  switch(code){
    case 'daily-user':return 'Bạn đã sử dụng hết lượt NPC AI hôm nay. Hãy quay lại ngày mai.';
    case 'daily-global':return 'Tần số NPC AI của DUDU hôm nay đã đạt giới hạn. Hãy thử ngày mai.';
    case 'cooldown':return 'Vui lòng đợi ít nhất 5 giây giữa các yêu cầu AI.';
    case 'in-flight':return 'NPC đang trả lời tin nhắn trước, vui lòng đợi.';
    default:return 'Không thể xử lý lượt AI vào lúc này.';
  }
}
