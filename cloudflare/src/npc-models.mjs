// V55 — fixed Gemini text model catalog for NPC comparison. Unknown client
// model IDs must not reach Gemini and must never trigger paid Pro endpoints.
export const DEFAULT_MODEL='gemini-3.5-flash-lite';
export const NPC_MODELS=Object.freeze([
  Object.freeze({id:'gemini-3.5-flash-lite',label:'3.5 Flash-Lite · nhanh, tiết kiệm'}),
  Object.freeze({id:'gemini-3.1-flash-lite',label:'3.1 Flash-Lite · nhẹ'}),
  Object.freeze({id:'gemini-3.6-flash',label:'3.6 Flash · nhập vai sâu'}),
  Object.freeze({id:'gemini-3.8-flash',label:'3.8 Flash · thông minh'}),
  Object.freeze({id:'gemini-3-flash-preview',label:'3 Flash Preview · so sánh'}),
  Object.freeze({id:'gemini-2.5-flash-lite',label:'2.5 Flash-Lite · cũ'}),
  Object.freeze({id:'gemini-2.5-flash',label:'2.5 Flash · cũ'})
]);
const IDS=new Set(NPC_MODELS.map(x=>x.id));
export function allowedModel(id) {
  return typeof id==='string'&&IDS.has(id);
}
export function resolveModel(id){
  if(id===undefined||id===null||id==='')return DEFAULT_MODEL;
  return allowedModel(id)?id:null;
}
