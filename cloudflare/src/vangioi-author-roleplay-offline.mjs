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
 if(!exact(s,s.entryBriefings===undefined?['version','contentHash','pages']:
  ['version','contentHash','pages','entryBriefings'])||
  s.version!=='g5c-author-demo-script-1'||s.contentHash!==await hashAuthoringJson(c)||
  !Array.isArray(s.pages)||s.pages.length!==c.scenes.length||s.pages.length>1600)
  return fail('script-pin-or-shape-invalid');
 const pages=new Map(),choices=new Map();
 const endings=new Map(c.endings.map(e=>[e.endingId,e]));
 const entryIds=new Set(c.playerEntryProfiles.map(e=>e.entryId));
 const entryBriefings=new Map();
 if(s.entryBriefings!==undefined){
  if(!Array.isArray(s.entryBriefings)||s.entryBriefings.length!==entryIds.size)
   return fail('invalid-entry-briefing');
  for(const briefing of s.entryBriefings){
   if(!exact(briefing,['entryId','worldContext','roleMemory','incitingIncident','objective','boundaries'])||
    !entryIds.has(briefing.entryId)||entryBriefings.has(briefing.entryId)||
    ['worldContext','roleMemory','incitingIncident','objective','boundaries'].some(key=>
     typeof briefing[key]!=='string'||!briefing[key].trim()||briefing[key].length>1200))
    return fail('invalid-entry-briefing');
   entryBriefings.set(briefing.entryId,briefing);
  }
 }
 for(const page of s.pages){
  if(!page||typeof page!=='object'||Array.isArray(page))
   return fail('invalid-script-page');
  const keys=['sceneId','narration','dialogue','choices'];
  if(page.endingId!==undefined)keys.push('endingId');
  if(page.entryNotes!==undefined)keys.push('entryNotes');
  if(page.context!==undefined)keys.push('context');
  if(page.roleScenes!==undefined)keys.push('roleScenes');
  if(page.returnNarration!==undefined)keys.push('returnNarration');
  if(page.returnDialogue!==undefined)keys.push('returnDialogue');
  if(!exact(page,keys)||
   !id(page.sceneId)||pages.has(page.sceneId)||!c.scenes.some(x=>x.sceneId===page.sceneId)||
   typeof page.narration!=='string'||!page.narration.trim()||page.narration.length>4000||
   typeof page.dialogue!=='string'||page.dialogue.length>4000||
   !Array.isArray(page.choices)||page.choices.length>20||
   (page.context!==undefined&&(typeof page.context!=='string'||!page.context.trim()||page.context.length>1000))||
   (page.returnNarration!==undefined&&(typeof page.returnNarration!=='string'||
    !page.returnNarration.trim()||page.returnNarration.length>4000))||
   (page.returnDialogue!==undefined&&(typeof page.returnDialogue!=='string'||page.returnDialogue.length>4000)))
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
  if(page.roleScenes!==undefined){
   if(!page.roleScenes||typeof page.roleScenes!=='object'||Array.isArray(page.roleScenes)||
    !Object.keys(page.roleScenes).length)return fail('invalid-role-scene');
   const pageChoiceIds=new Set(page.choices.map(choice=>choice.choiceId));
   for(const [entryId,override] of Object.entries(page.roleScenes)){
    if(!entryIds.has(entryId)||!override||typeof override!=='object'||Array.isArray(override))
     return fail('invalid-role-scene');
    const keys=Object.keys(override);
    if(!keys.length||keys.some(key=>!['narration','dialogue','choiceLabels',
     'returnNarration','returnDialogue'].includes(key))||
     (override.narration!==undefined&&(typeof override.narration!=='string'||
      !override.narration.trim()||override.narration.length>4000))||
     (override.dialogue!==undefined&&(typeof override.dialogue!=='string'||override.dialogue.length>4000))||
     (override.returnNarration!==undefined&&(typeof override.returnNarration!=='string'||
      !override.returnNarration.trim()||override.returnNarration.length>4000))||
     (override.returnDialogue!==undefined&&(typeof override.returnDialogue!=='string'||override.returnDialogue.length>4000)))
     return fail('invalid-role-scene');
    if(override.choiceLabels!==undefined){
     if(!override.choiceLabels||typeof override.choiceLabels!=='object'||
      Array.isArray(override.choiceLabels)||!Object.keys(override.choiceLabels).length||
      Object.entries(override.choiceLabels).some(([choiceId,text])=>
       !pageChoiceIds.has(choiceId)||!label(text)))return fail('invalid-role-scene');
    }
   }
  }
  pages.set(page.sceneId,page);
 }
 if(c.scenes.some(scene=>!pages.has(scene.sceneId)))return fail('missing-script-page');

 const readonly=async session=>{
  const checked=await inspectG4BSession(engine.plan,session);
  if(!checked.ok)return fail(checked.code);
  const state=checked.session.state,page=pages.get(state.sceneId);
  const override=page.roleScenes?.[checked.session.entryId];
  // G4B replay has already checked the entire event chain. Derive visits
  // from the immutable rule destinations instead of trusting client counters.
  const initialScene=engine.plan.entries.find(e=>e.entryId===checked.session.entryId).startSceneId;
  const visits=(state.sceneId===initialScene?1:0)+checked.session.events.filter(event=>
   engine.plan.rules.find(r=>r.ruleId===event.ruleId)?.toSceneId===state.sceneId).length;
  const returning=visits>1;
  const ending=endings.get(page.endingId);
  const eligibleEnding=ending&&ending.requiredFlags.every(f=>state.flags.includes(f));
  return freeze({ok:true,title:c.title,revision:checked.session.revision,
   entryId:checked.session.entryId,sceneId:state.sceneId,flags:[...state.flags],
   context:page.context||null,visitCount:visits,
   narration:returning?(override?.returnNarration??page.returnNarration??override?.narration??page.narration):
    (override?.narration??page.narration),
   dialogue:returning?(override?.returnDialogue??page.returnDialogue??override?.dialogue??page.dialogue):
    (override?.dialogue??page.dialogue),
   roleReaction:page.entryNotes?.[checked.session.entryId]||null,
   choices:page.choices.filter(choice=>applyG4ATransition(engine.plan,state,choice.ruleId).ok)
    .map(choice=>({choiceId:choice.choiceId,
     label:override?.choiceLabels?.[choice.choiceId]??choice.label})),
   // Narrative ending only; not an objective or reward acknowledgement.
   narrativeEndingId:eligibleEnding?page.endingId:null,...deny});
 };
 return Object.freeze({ok:true,version:AUTHOR_PLAYTEST_VERSION,
  entryProfiles:freeze(c.playerEntryProfiles.map(x=>({entryId:x.entryId,label:x.label,mode:x.mode}))),
  entryBriefings:freeze([...entryBriefings.values()]),
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
