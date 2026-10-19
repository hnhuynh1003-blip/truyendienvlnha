// V58 / V57.2 — Gemini >=3.1 only; gated Workers AI. Unknown client
// model IDs must not reach Gemini and must never trigger paid Pro endpoints.
export const DEFAULT_MODEL='gemini-3.5-flash-lite';
export const NPC_MODELS=Object.freeze([
  Object.freeze({id:'gemini-3.5-flash-lite',label:'3.5 Flash-Lite · nhanh, tiết kiệm'}),
  Object.freeze({id:'gemini-3.1-flash-lite',label:'3.1 Flash-Lite · nhẹ'}),
  Object.freeze({id:'gemini-3.6-flash',label:'3.6 Flash · nhập vai sâu'}),
  Object.freeze({id:'gemini-3.8-flash',label:'3.8 Flash · thông minh'})
]);
// V58 preserves V57.2's four Gemini IDs and rejects legacy models. Workers AI is separately
// allowlisted and visible ONLY when the server verifies explicit free-only gates.
export {WORKERS_AI_MODELS,isWorkersAiModel} from './ai-router-v58.mjs';
import {isWorkersAiModel} from './ai-router-v58.mjs';
const IDS=new Set(NPC_MODELS.map(x=>x.id));
export function resolveNpcModel(id){
  if(id===undefined||id===null||id==='')return DEFAULT_MODEL;
  return IDS.has(id)||isWorkersAiModel(id)?id:null;
}
export function allowedModel(id) {
  return typeof id==='string'&&IDS.has(id);
}
export function resolveModel(id){
  if(id===undefined||id===null||id==='')return DEFAULT_MODEL;
  return allowedModel(id)?id:null;
}
