// G4A — an offline, deterministic condition/action interpreter for version-pinned
// authoring snapshots. Not a Worker route, game runtime, reward or save writer.
import {inspectContent} from './vangioi-content.mjs';
import {copyAuthoringContent,copyAuthoringJson,hashAuthoringJson} from './vangioi-authoring.mjs';

export const G4A_ENGINE_VERSION='g4a-rules-1';
const MAX_RULES=512,MAX_ACTIONS=8,MAX_NODES=48,MAX_DEPTH=6,MAX_FLAGS=256;
const flagName=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(v);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&
 Object.keys(v).every(k=>keys.includes(k));
const fail=(code,path='/')=>({ok:false,code,path});
const freeze=v=>{
 if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}
 return v;
};

function compileCondition(value,path,budget,depth=0){
 if(depth>MAX_DEPTH||++budget.nodes>MAX_NODES)throw {code:'condition-budget',path};
 if(!plain(value)||typeof value.op!=='string')throw {code:'invalid-condition',path};
 if(value.op==='flag_set'||value.op==='flag_unset'){
  if(!exact(value,['op','flag'])||!flagName(value.flag))throw {code:'invalid-condition',path};
  return {op:value.op,flag:value.flag};
 }
 if(value.op==='all'||value.op==='any'){
  if(!exact(value,['op','conditions'])||!Array.isArray(value.conditions)||
    !value.conditions.length||value.conditions.length>16)
   throw {code:'invalid-condition',path};
  return {op:value.op,conditions:value.conditions.map((c,i)=>
   compileCondition(c,`${path}/conditions/${i}`,budget,depth+1))};
 }
 throw {code:'unknown-condition',path};
}

function compileActions(value,destination,path){
 if(!Array.isArray(value)||!value.length||value.length>MAX_ACTIONS)
  throw {code:'invalid-actions',path};
 let enters=0;const modified=new Set();
 const actions=value.map((a,i)=>{
  const at=`${path}/${i}`;
  if(!plain(a))throw {code:'invalid-action',path:at};
  if(a.op==='set_flag'||a.op==='clear_flag'){
   if(!exact(a,['op','flag'])||!flagName(a.flag)||modified.has(a.flag))
    throw {code:'invalid-action',path:at};
   modified.add(a.flag);return {op:a.op,flag:a.flag};
  }
  if(a.op==='enter_scene'){
   if(!exact(a,['op','sceneId'])||a.sceneId!==destination||
     i!==value.length-1||++enters!==1)throw {code:'invalid-action',path:at};
   return {op:a.op,sceneId:a.sceneId};
  }
  throw {code:'unknown-action',path:at};
 });
 if(enters!==1)throw {code:'missing-enter-scene',path};
 return actions;
}

// Manifest is a sidecar, not a new field in world-content-1 or a rewrite of
// the old free-text transition.trigger. Only a declared scene edge can move.
export async function prepareG4AEngine(world,manifest){
 if(!inspectContent(world).valid)return fail('invalid-world');
 let c,m;
 try{c=copyAuthoringContent(world);m=copyAuthoringJson(manifest);}catch{return fail('invalid-manifest');}
 if(!exact(m,['version','contentVersion','contentHash','rules'])||
  m.version!==G4A_ENGINE_VERSION||m.contentVersion!==c.contentVersion||
  typeof m.contentHash!=='string'||!/^[a-f0-9]{64}$/.test(m.contentHash)||
  !Array.isArray(m.rules)||m.rules.length>MAX_RULES)return fail('invalid-manifest');
 if(m.contentHash!==await hashAuthoringJson(c))return fail('stale-world');
 const scenes=new Map(c.scenes.map(s=>[s.sceneId,s])),ids=new Set(),edges=new Set(),rules=[];
 for(const [i,rule] of m.rules.entries()){
  const path=`/rules/${i}`;
  if(!exact(rule,['ruleId','fromSceneId','transitionIndex','condition','actions'])||
   typeof rule.ruleId!=='string'||!/^[a-z][a-z0-9-]{1,63}$/.test(rule.ruleId)||
   ids.has(rule.ruleId))return fail('invalid-rule',path);
  ids.add(rule.ruleId);
  const from=scenes.get(rule.fromSceneId);
  if(!from||!Number.isSafeInteger(rule.transitionIndex)||rule.transitionIndex<0||
   rule.transitionIndex>=(from.transitions||[]).length)return fail('missing-edge',path);
  const edgeKey=rule.fromSceneId+':'+rule.transitionIndex;
  if(edges.has(edgeKey))return fail('duplicate-edge-rule',path);
  edges.add(edgeKey);
  const edge=from.transitions[rule.transitionIndex];
  if(!scenes.has(edge.toSceneId))return fail('missing-edge',path);
  try{
   const condition=compileCondition(rule.condition,path+'/condition',{nodes:0});
   const actions=compileActions(rule.actions,edge.toSceneId,path+'/actions');
   rules.push({ruleId:rule.ruleId,fromSceneId:rule.fromSceneId,
    toSceneId:edge.toSceneId,requiredFlag:edge.requiredFlag||null,condition,actions});
  }catch(e){return fail(e.code||'invalid-rule',e.path||path);}
 }
 return {ok:true,plan:freeze({engineVersion:G4A_ENGINE_VERSION,
  contentHash:m.contentHash,contentVersion:c.contentVersion,
  sceneIds:c.scenes.map(s=>s.sceneId),
  entries:c.playerEntryProfiles.map(p=>({entryId:p.entryId,startSceneId:p.startSceneId,
   initialFlags:[...(p.initialFlags||[])]})),rules})};
}

function validPlan(plan){
 return plain(plan)&&plan.engineVersion===G4A_ENGINE_VERSION&&
  Array.isArray(plan.sceneIds)&&Array.isArray(plan.entries)&&Array.isArray(plan.rules);
}
function validState(plan,state){
 return exact(state,['sceneId','flags'])&&plan.sceneIds.includes(state.sceneId)&&
  Array.isArray(state.flags)&&state.flags.length<=MAX_FLAGS&&
  state.flags.every(flagName)&&new Set(state.flags).size===state.flags.length;
}

export function startG4AEngine(plan,entryId){
 if(!validPlan(plan))return fail('invalid-plan');
 const entry=plan.entries.find(p=>p.entryId===entryId);
 if(!entry)return fail('unknown-entry');
 const state={sceneId:entry.startSceneId,flags:[...new Set(entry.initialFlags)].sort()};
 if(!validState(plan,state))return fail('invalid-entry-flags');
 return {ok:true,state};
}

function matches(condition,flags){
 if(condition.op==='flag_set')return flags.has(condition.flag);
 if(condition.op==='flag_unset')return !flags.has(condition.flag);
 if(condition.op==='all')return condition.conditions.every(x=>matches(x,flags));
 if(condition.op==='any')return condition.conditions.some(x=>matches(x,flags));
 return false;
}

// Every call produces a new candidate state. No mutation, persistence,
// inventory, money, EXP, mission grant or outcome authority exists here.
export function applyG4ATransition(plan,state,ruleId){
 if(!validPlan(plan))return fail('invalid-plan');
 if(!validState(plan,state))return fail('invalid-state');
 const rule=plan.rules.find(r=>r.ruleId===ruleId);
 if(!rule)return fail('unknown-rule');
 if(rule.fromSceneId!==state.sceneId)return fail('wrong-scene');
 const flags=new Set(state.flags);
 if((rule.requiredFlag&&!flags.has(rule.requiredFlag))||!matches(rule.condition,flags))
  return fail('condition-not-met');
 for(const a of rule.actions){
  if(a.op==='set_flag')flags.add(a.flag);
  else if(a.op==='clear_flag')flags.delete(a.flag);
 }
 if(flags.size>MAX_FLAGS)return fail('flag-budget');
 return {ok:true,state:{sceneId:rule.toSceneId,flags:[...flags].sort()},
  appliedRuleId:rule.ruleId,engineVerified:false,productionAuthorized:false};
}
