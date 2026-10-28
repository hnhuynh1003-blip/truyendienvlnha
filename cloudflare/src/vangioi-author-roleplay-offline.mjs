// G5C-P: OFFLINE author-made roleplay prototype over G4A/G4B.
// Never import into Worker, Creator live UI, reward/session writers or public
// world routes. Script text is a projection; ONLY G4A may change flags/scene.
import {copyAuthoringContent,copyAuthoringJson,hashAuthoringJson}
 from './vangioi-authoring.mjs';
import {prepareG4AEngine,applyG4ATransition} from './vangioi-engine-g4a.mjs';
import {createG4BSession,inspectG4BSession,applyG4BEvent,G4B_EVENT_VERSION}
 from './vangioi-engine-g4b.mjs';
import {inspectCreatorQa} from '../../js/vangioi-creator-validation-entry.mjs';

export const AUTHOR_PLAYTEST_VERSION='g5c-author-roleplay-offline-1';
const fail=code=>Object.freeze({ok:false,code,fixtureOnly:true,
  missionCompleted:false,saveCommitted:false,rewardAuthorized:false,productionAuthorized:false});
const deny=Object.freeze({fixtureOnly:true,worldPublished:false,missionCompleted:false,
  saveCommitted:false,rewardAuthorized:false,rewardCommitted:false,productionAuthorized:false,
  deviceVerified:false,rightsVerified:false,endingVerified:false});
const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===fields.length&&Object.keys(v).every(k=>fields.includes(k));
const label=v=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

export async function prepareAuthorRoleplayOffline(world,manifest,script){
 let c,m,s;
 try{c=copyAuthoringContent(world);m=copyAuthoringJson(manifest);s=copyAuthoringJson(script);}
 catch{return fail('invalid-input');}
 const qa=inspectCreatorQa(c);
 if(!qa.valid||qa.reachability.profiles.some(p=>p.status==='analysis-budget-exceeded')||
  qa.reachability.issues.some(i=>['main-mission-start-no-route',
   'main-objective-no-declared-source'].includes(i.code)))return fail('world-qa-blocked');
 const engine=await prepareG4AEngine(c,m);if(!engine.ok)return fail('g4a-'+engine.code);
 if(!exact(s,['version','contentHash','pages'])||
  s.version!=='g5c-author-demo-script-1'||s.contentHash!==await hashAuthoringJson(c)||
  !Array.isArray(s.pages)||s.pages.length!==c.scenes.length||s.pages.length>1600)
  return fail('script-pin-or-shape-invalid');
 const pages=new Map(),choices=new Map();
 const endings=new Map(c.endings.map(e=>[e.endingId,e]));
 const entryIds=new Set(c.playerEntryProfiles.map(e=>e.entryId));
 for(const page of s.pages){
  if(!page||typeof page!=='object'||Array.isArray(page))
   return fail('invalid-script-page');
  const keys=['sceneId','narration','dialogue','choices'];
  if(page.endingId!==undefined)keys.push('endingId');
  if(page.entryNotes!==undefined)keys.push('entryNotes');
  if(!exact(page,keys)||
   !id(page.sceneId)||pages.has(page.sceneId)||!c.scenes.some(x=>x.sceneId===page.sceneId)||
   typeof page.narration!=='string'||!page.narration.trim()||page.narration.length>4000||
   typeof page.dialogue!=='string'||page.dialogue.length>4000||
   !Array.isArray(page.choices)||page.choices.length>20)
   return fail('invalid-script-page');
  if(page.entryNotes!==undefined&&(!page.entryNotes||typeof page.entryNotes!=='object'||
   Array.isArray(page.entryNotes)||!Object.keys(page.entryNotes).length||
   Object.entries(page.entryNotes).some(([key,value])=>
    !entryIds.has(key)||typeof value!=='string'||!value.trim()||value.length>500)))
   return fail('invalid-entry-reaction');
  const rules=engine.plan.rules.filter(x=>x.fromSceneId===page.sceneId);
  if(page.choices.length!==rules.length||
   (page.endingId!==undefined&&(!endings.has(page.endingId)||page.choices.length)))
   return fail('script-rule-coverage-mismatch');
  const seenRules=new Set();
  for(const choice of page.choices){
   if(!exact(choice,['choiceId','ruleId','label'])||!id(choice.choiceId)||
    !id(choice.ruleId)||!label(choice.label)||choices.has(choice.choiceId)||
    seenRules.has(choice.ruleId)||!rules.some(r=>r.ruleId===choice.ruleId))
    return fail('invalid-script-choice');
   seenRules.add(choice.ruleId);
   choices.set(choice.choiceId,{sceneId:page.sceneId,ruleId:choice.ruleId,label:choice.label});
  }
  pages.set(page.sceneId,page);
 }
 if(c.scenes.some(scene=>!pages.has(scene.sceneId)))return fail('missing-script-page');

 const readonly=async session=>{
  const checked=await inspectG4BSession(engine.plan,session);
  if(!checked.ok)return fail(checked.code);
  const state=checked.session.state,page=pages.get(state.sceneId);
  const ending=endings.get(page.endingId);
  const eligibleEnding=ending&&ending.requiredFlags.every(f=>state.flags.includes(f));
  return freeze({ok:true,title:c.title,revision:checked.session.revision,
   entryId:checked.session.entryId,sceneId:state.sceneId,flags:[...state.flags],
   narration:page.narration,dialogue:page.dialogue,
   roleReaction:page.entryNotes?.[checked.session.entryId]||null,
   choices:page.choices.filter(choice=>applyG4ATransition(engine.plan,state,choice.ruleId).ok)
    .map(choice=>({choiceId:choice.choiceId,label:choice.label})),
   // Narrative ending only; not an objective or reward acknowledgement.
   narrativeEndingId:eligibleEnding?page.endingId:null,...deny});
 };
 return Object.freeze({ok:true,version:AUTHOR_PLAYTEST_VERSION,
  entryProfiles:freeze(c.playerEntryProfiles.map(x=>({entryId:x.entryId,label:x.label,mode:x.mode}))),
  start:async(entryId,playerId='demo-visitor',worldInstanceId='demo-local')=>{
   const started=await createG4BSession(engine.plan,{entryId,playerId,worldInstanceId});
   return started.ok?freeze({ok:true,session:started.session,...deny}):fail(started.code);
  },
  view:readonly,
  choose:async(session,{choiceId,eventId,expectedRevision}={})=>{
   const chosen=choices.get(choiceId);
   if(!chosen)return fail('unknown-choice');
   const checked=await inspectG4BSession(engine.plan,session);
   if(!checked.ok)return fail(checked.code);
   const event={version:G4B_EVENT_VERSION,eventId,
    playerId:checked.session.playerId,worldInstanceId:checked.session.worldInstanceId,
    expectedRevision,ruleId:chosen.ruleId};
   const applied=await applyG4BEvent(engine.plan,checked.session,event);
   if(!applied.ok)return fail(applied.code);
   return freeze({ok:true,duplicate:applied.duplicate,session:applied.session,
    receipt:applied.receipt,...deny});
  }
 });
}
