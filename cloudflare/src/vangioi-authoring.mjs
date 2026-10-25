// G1B authoring policy and immutable submission preparation.
// NOT imported by the live Worker. Repository callbacks must be trusted server
// reads. A prepared result is not persisted approval, publication or game access.
import {verifyFirebaseIdToken} from './auth.mjs';

export const AUTHORING_FIELDS=Object.freeze([
 'schemaVersion','contentVersion','title','genreId','requestedWorldRank',
 'dangerLevel','contentTags','estimatedMinutes','story','visualIdentity',
 'worldCoverAssetId','assets','maps','places','scenes','views','cast',
 'characterVisuals','characterAppearances','npcs','playerEntryProfiles',
 'entryPolicy','items','shops','missions','events','endings','playRequirements','aiPolicy'
]);
const fields=new Set(AUTHORING_FIELDS);
const roles=new Set(['collaborator','reviewer','publisher']);
const actions=new Set(['read_draft','edit_draft','submit_draft','read_submission','review_submission']);
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{1,63}$/.test(v);
const uid=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\p{C}]/u.test(v);
const revision=v=>Number.isSafeInteger(v)&&v>=1;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const strings=(v,valid)=>Array.isArray(v)&&v.every(valid)&&new Set(v).size===v.length;
const denied=(code='forbidden')=>Object.freeze({ok:false,code});
const success=Object.freeze({ok:true});

// Clone only JSON data. Refuse accessors/non-plain objects and reserved keys;
// no JS expressions or callbacks are accepted as authoring content.
function cloneJson(value){
 let nodes=0;
 function visit(v,depth){
  if(++nodes>100000||depth>64)throw Error('content-limit');
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number'&&Number.isFinite(v))return v;
  if(!plain(v)&&!Array.isArray(v))throw Error('non-json-content');
  if(Object.getOwnPropertySymbols(v).length)throw Error('non-json-content');
  const descriptors=Object.getOwnPropertyDescriptors(v);
  for(const [key,d] of Object.entries(descriptors)){
   if(d.get||d.set||(!d.enumerable&&!(Array.isArray(v)&&key==='length')))
    throw Error('non-json-content');
  }
  if(Array.isArray(v)){
   if(Object.keys(v).length!==v.length||Object.keys(v).some((k,i)=>k!==String(i)))
    throw Error('non-json-content');
   return v.map(x=>visit(x,depth+1));
  }
  const out={};
  for(const key of Object.keys(v).sort()){
   if(['__proto__','prototype','constructor'].includes(key))throw Error('reserved-key');
   out[key]=visit(v[key],depth+1);
  }
  return out;
 }
 const result=visit(value,0);
 if(new TextEncoder().encode(JSON.stringify(result)).length>2*1024*1024)
  throw Error('content-limit');
 return result;
}
function freeze(value){
 if(value&&typeof value==='object'){
  Object.values(value).forEach(freeze);Object.freeze(value);
 }
 return value;
}
function contentCopy(value){
 const copy=cloneJson(value);
 if(!plain(copy)||Object.keys(copy).some(k=>!fields.has(k)))throw Error('invalid-authoring-fields');
 return freeze(copy);
}
async function hash(value){
 const bytes=new TextEncoder().encode(JSON.stringify(cloneJson(value)));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
  .map(b=>b.toString(16).padStart(2,'0')).join('');
}
function validWorld(w,worldId){
 return plain(w)&&w.worldId===worldId&&uid(w.ownerUid)&&revision(w.draftRevision)&&
  revision(w.accessRevision)&&['draft','submitted','inReview','approved'].includes(w.draftState)&&
  strings(w.contributorUids,uid);
}
function validMember(m,worldId,userId){
 return plain(m)&&m.worldId===worldId&&m.uid===userId&&m.status==='active'&&
  strings(m.roles,x=>roles.has(x))&&m.roles.length>0&&
  strings(m.editSections,x=>fields.has(x));
}
function validDraft(d,w){
 return plain(d)&&d.worldId===w.worldId&&d.revision===w.draftRevision&&d.state===w.draftState;
}
function sameAuthority(a,b){
 return a.who.uid===b.who.uid&&a.w.ownerUid===b.w.ownerUid&&
  a.w.accessRevision===b.w.accessRevision&&a.w.draftRevision===b.w.draftRevision&&
  a.w.draftState===b.w.draftState&&JSON.stringify(a.member)===JSON.stringify(b.member);
}
function permission(w,m,userId,action,sections){
 const owner=w.ownerUid===userId;
 const member=validMember(m,w.worldId,userId)?m:null;
 const collaborator=member?.roles.includes('collaborator')===true;
 const reviewer=member?.roles.includes('reviewer')===true;
 const publisher=member?.roles.includes('publisher')===true;
 if(action==='read_draft')return owner||collaborator;
 if(action==='edit_draft')return w.draftState==='draft'&&sections.length>0&&
  (owner||(collaborator&&sections.every(k=>member.editSections.includes(k))));
 if(action==='submit_draft')return owner&&w.draftState==='draft';
 if(action==='read_submission')return owner||collaborator||reviewer||publisher;
 if(action==='review_submission')return reviewer&&!owner&&!collaborator&&
  !w.contributorUids.includes(userId)&&['submitted','inReview'].includes(w.draftState);
 return false;
}

// Pure policy for a writer's synchronous transaction. Records and actorUid
// MUST come from trusted storage / a verified request, never from JSON claims.
export function isAuthoringActionAllowed({world,member,actorUid,action,sections=[]}={}){
 return id(world?.worldId)&&uid(actorUid)&&validWorld(world,world.worldId)&&
  actions.has(action)&&strings(sections,x=>fields.has(x))&&
  permission(world,member,actorUid,action,sections);
}

export {contentCopy as copyAuthoringContent,cloneJson as copyAuthoringJson,hash as hashAuthoringJson};

export async function verifySubmissionIntegrity(snapshot){
 // Integrity only, never authentication: recomputing a hash cannot grant a role.
 try{
  const s=cloneJson(snapshot);
  if(!plain(s)||Object.keys(s).sort().join(',')!==
   'content,draftRevision,snapshotHash,snapshotVersion,submittedAt,submittedBy,validatorVersion,worldId')return false;
  if(s.snapshotVersion!=='vangioi-submission-1'||!id(s.worldId)||!revision(s.draftRevision)||
   !uid(s.submittedBy)||!Number.isSafeInteger(s.submittedAt)||s.submittedAt<0||
   typeof s.validatorVersion!=='string'||!s.validatorVersion.trim()||s.validatorVersion.length>100||
   !/^[a-f0-9]{64}$/.test(s.snapshotHash))return false;
  contentCopy(s.content);
  const {snapshotHash,...payload}=s;
  return snapshotHash===await hash(payload);
 }catch{return false;}
}

export function createAuthoringService({projectId,readWorld,readMembership,readDraft,
 readSubmission,validateContent,verify=verifyFirebaseIdToken,now=Date.now}={}){
 if(!/^[a-z0-9-]{1,64}$/.test(projectId||'')||
  [readWorld,readMembership,readDraft,verify,now].some(f=>typeof f!=='function'))
  throw new TypeError('Authoring service requires trusted identity and repository adapters');

 async function resolve(request,{worldId,action,sections=[]}={}){
  if(!id(worldId)||!actions.has(action)||!strings(sections,x=>fields.has(x)))
   return denied('invalid-request');
  try{
   const who=await verify(request,projectId);
   if(!who||!uid(who.uid))return denied('unauthenticated');
   const w=cloneJson(await readWorld(worldId));
   // Missing worlds and missing rights share one outward result.
   if(!validWorld(w,worldId))return denied();
   const m=cloneJson(await readMembership(worldId,who.uid));
   if(!permission(w,m,who.uid,action,sections))return denied();
   return {ok:true,who:{uid:who.uid},w,member:m};
  }catch{return denied('authoring-unavailable');}
 }

 async function authorize(request,input){
  const auth=await resolve(request,input);
  return auth.ok?success:auth;
 }

 async function viewDraft(request,{worldId}={}){
  const auth=await resolve(request,{worldId,action:'read_draft'});
  if(!auth.ok)return auth;
  try{
   const draft=await readDraft(worldId);
   if(!validDraft(draft,auth.w))return denied('revision-conflict');
   const content=contentCopy(draft.content);
   const allowed=auth.w.ownerUid===auth.who.uid?AUTHORING_FIELDS:auth.member.editSections;
   const projection=Object.fromEntries(Object.entries(content).filter(([key])=>allowed.includes(key)));
   const fresh=await resolve(request,{worldId,action:'read_draft'});
   if(!fresh.ok)return fresh;
   if(!sameAuthority(auth,fresh))
    return denied('revision-conflict');
   return freeze({ok:true,worldId,revision:draft.revision,content:projection});
  }catch{return denied('authoring-unavailable');}
 }

 async function prepareSubmission(request,{worldId,expectedRevision}={}){
  if(!revision(expectedRevision))return denied('invalid-request');
  const auth=await resolve(request,{worldId,action:'submit_draft'});
  if(!auth.ok)return auth;
  if(auth.w.draftRevision!==expectedRevision)return denied('revision-conflict');
  if(typeof validateContent!=='function')return denied('validator-unavailable');
  try{
   const draft=await readDraft(worldId);
   if(!validDraft(draft,auth.w))return denied('revision-conflict');
   const content=contentCopy(draft.content);
   const verdict=await validateContent(content);
   // The callback is trusted backend code; a field inside a JSON file cannot
   // substitute for this verdict. No optional schema/semantic validation.
   if(!plain(verdict)||verdict.readyForReview!==true||!Array.isArray(verdict.errors)||
    verdict.errors.length||typeof verdict.validatorVersion!=='string'||
    !verdict.validatorVersion.trim()||verdict.validatorVersion.length>100)
    return denied('content-not-ready');
   const submittedAt=now();
   if(!Number.isSafeInteger(submittedAt)||submittedAt<0)return denied('authoring-unavailable');
   const payload={snapshotVersion:'vangioi-submission-1',worldId,draftRevision:expectedRevision,
    submittedBy:auth.who.uid,submittedAt,validatorVersion:verdict.validatorVersion,content};
   const snapshot=freeze({...payload,snapshotHash:await hash(payload)});
   // Detect revocation/ownership changes while async validation was running.
   // A future writer MUST still compare all preconditions within its commit transaction.
   const fresh=await resolve(request,{worldId,action:'submit_draft'});
   if(!fresh.ok)return fresh;
   const current=await readDraft(worldId);
   if(!sameAuthority(auth,fresh)||
    !validDraft(current,fresh.w)||JSON.stringify(contentCopy(current.content))!==JSON.stringify(content))
    return denied('revision-conflict');
   return freeze({ok:true,prepared:true,requiresAtomicCommit:true,snapshot,
    preconditions:{worldId,ownerUid:auth.who.uid,draftRevision:expectedRevision,
     accessRevision:auth.w.accessRevision,draftState:'draft'},
    nextDraftHeader:{worldId,revision:expectedRevision,state:'submitted',snapshotHash:snapshot.snapshotHash}});
  }catch{return denied('authoring-unavailable');}
 }

 async function prepareDraftEdit(request,{worldId,expectedRevision,patch}={}){
  if(!revision(expectedRevision)||expectedRevision===Number.MAX_SAFE_INTEGER)
   return denied('invalid-request');
  let change;
  try{change=contentCopy(patch);}catch{return denied('invalid-content');}
  // Derive sections from actual changed data. A separate client-provided
  // list of claimed sections is never used to authorize a write.
  const sections=Object.keys(change);
  const auth=await resolve(request,{worldId,action:'edit_draft',sections});
  if(!auth.ok)return auth;
  if(auth.w.draftRevision!==expectedRevision)return denied('revision-conflict');
  try{
   const draft=await readDraft(worldId);
   if(!validDraft(draft,auth.w))return denied('revision-conflict');
   const before=contentCopy(draft.content);
   const content=contentCopy({...before,...change});
   const fresh=await resolve(request,{worldId,action:'edit_draft',sections});
   if(!fresh.ok)return fresh;
   const current=await readDraft(worldId);
   if(!sameAuthority(auth,fresh)||!validDraft(current,fresh.w)||
    JSON.stringify(contentCopy(current.content))!==JSON.stringify(before))return denied('revision-conflict');
   return freeze({ok:true,prepared:true,requiresAtomicCommit:true,
    preconditions:{worldId,ownerUid:auth.w.ownerUid,draftRevision:expectedRevision,
     accessRevision:auth.w.accessRevision,draftState:'draft'},
    nextDraft:{worldId,revision:expectedRevision+1,state:'draft',content},
    nextWorldHeader:{worldId,draftRevision:expectedRevision+1,draftState:'draft',
     contributorUids:[...new Set([...auth.w.contributorUids,auth.who.uid])].sort()}});
  }catch{return denied('authoring-unavailable');}
 }

 async function viewSubmission(request,{worldId,snapshotHash,forReview=false}={}){
  if(!/^[a-f0-9]{64}$/.test(snapshotHash||'')||typeof forReview!=='boolean')return denied('invalid-request');
  const action=forReview?'review_submission':'read_submission';
  const auth=await resolve(request,{worldId,action});
  if(!auth.ok)return auth;
  if(typeof readSubmission!=='function')return denied('authoring-unavailable');
  try{
   const stored=cloneJson(await readSubmission(worldId,snapshotHash));
   if(!await verifySubmissionIntegrity(stored)||stored.worldId!==worldId||stored.snapshotHash!==snapshotHash)
    return denied('invalid-submission');
   if(forReview&&(stored.draftRevision!==auth.w.draftRevision||stored.submittedBy===auth.who.uid))
    return denied('revision-conflict');
   const fresh=await resolve(request,{worldId,action});
   if(!fresh.ok)return fresh;
   if(!sameAuthority(auth,fresh))return denied('revision-conflict');
   // Collaborators only receive their section projection, also in a snapshot.
   // Reviewers/publishers and owner have full submitted-content read permission.
   if(auth.w.ownerUid!==auth.who.uid&&auth.member.roles.includes('collaborator')){
    const content=Object.fromEntries(Object.entries(stored.content)
     .filter(([key])=>auth.member.editSections.includes(key)));
    return freeze({ok:true,worldId,draftRevision:stored.draftRevision,snapshotHash,content:cloneJson(content)});
   }
   return freeze({ok:true,snapshot:cloneJson(stored)});
  }catch{return denied('authoring-unavailable');}
 }

 return Object.freeze({authorize,viewDraft,prepareDraftEdit,prepareSubmission,viewSubmission});
}
