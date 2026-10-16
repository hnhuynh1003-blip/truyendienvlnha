/* DUDU V24: server-only milestone proof adapter.
 * This module deliberately has NO public route, Firebase client read, local
 * affinity import or ambient secret. Trusted callbacks MUST query independent,
 * access-controlled server ledgers; never forward request JSON/localStorage.
 */
import {SERVER_AWARD_SOURCES} from './player-appearance-rules.mjs';
import {issueVerifiedFrameEvent} from './avatar-achievement-issuer-v20.mjs';

const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const id=v=>typeof v==='string'&&ID.test(v);
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const time=(v,now)=>Number.isSafeInteger(v)&&v>0&&v<=now;
const sourceFor=frameId=>Object.hasOwn(SERVER_AWARD_SOURCES,frameId)?
  SERVER_AWARD_SOURCES[frameId]:null;

/* All four callbacks must be server-controlled and independently queried.
 * Completion: a server-issued event, not a client claim.
 * Approval: immutable, versioned author/admin approval for one milestone.
 * Chapter proof: independent server-verified completion for the SAME UID.
 * Bond proof: independent server-verified NPC trust, never browser affinity.
 */
export function createV24EvidenceReader({
  loadCompletion,loadApproval,loadChapterProof,loadBondProof,now
}={}){
  if(![loadCompletion,loadApproval,loadChapterProof,loadBondProof]
    .every(f=>typeof f==='function')||!time(now,now))
    throw new TypeError('trusted milestone readers are required');
  return async ({uid,evidenceId,source}={})=>{
    if(!id(uid)||!id(evidenceId)||
      !Object.values(SERVER_AWARD_SOURCES).includes(source))return null;
    const completion=await loadCompletion({uid,evidenceId,source});
    if(!obj(completion)||completion.uid!==uid||
      completion.evidenceId!==evidenceId||completion.source!==source||
      !id(completion.storyId)||!id(completion.milestoneId)||
      !Number.isSafeInteger(completion.approvalRevision)||
      completion.approvalRevision<1||
      completion.status!=='VERIFIED_COMPLETE'||
      completion.verifiedBy!=='TRUSTED_SERVER'||
      !time(completion.completedAt,now))return null;

    const approval=await loadApproval({
      storyId:completion.storyId,milestoneId:completion.milestoneId
    });
    const frameId=source==='VERIFIED_STORY_MILESTONE'?'legend':'soulbond';
    if(!obj(approval)||approval.storyId!==completion.storyId||
      approval.milestoneId!==completion.milestoneId||
      approval.frameId!==frameId||
      approval.kind!==(frameId==='legend'?'STORY':'NPC_BOND')||
      approval.status!=='APPROVED'||approval.published!==true||
      approval.revision!==completion.approvalRevision||
      !id(approval.chapterId)||!time(approval.reviewedAt,now)||
      completion.completedAt<approval.reviewedAt)return null;

    // A signed frame is NOT proof of reading. Read a second, UID-scoped
    // server ledger row for the exact approved chapter.
    const chapter=await loadChapterProof({
      uid,storyId:completion.storyId,chapterId:approval.chapterId
    });
    if(!obj(chapter)||chapter.uid!==uid||
      chapter.storyId!==completion.storyId||
      chapter.chapterId!==approval.chapterId||
      chapter.status!=='VERIFIED_COMPLETE'||
      chapter.verifiedBy!=='TRUSTED_SERVER'||
      !time(chapter.completedAt,now)||
      chapter.completedAt>completion.completedAt)return null;

    if(frameId==='soulbond'){
      if(!id(approval.npcId)||completion.npcId!==approval.npcId||
        !Number.isInteger(approval.minimumTrust)||
        approval.minimumTrust<50||approval.minimumTrust>100)return null;
      const bond=await loadBondProof({
        uid,storyId:completion.storyId,npcId:approval.npcId,
        milestoneId:approval.milestoneId
      });
      if(!obj(bond)||bond.uid!==uid||
        bond.storyId!==completion.storyId||bond.npcId!==approval.npcId||
        bond.milestoneId!==approval.milestoneId||
        bond.status!=='VERIFIED_BONDED'||
        bond.verifiedBy!=='TRUSTED_SERVER'||
        !Number.isInteger(bond.trust)||bond.trust<approval.minimumTrust||
        bond.trust>100||!time(bond.verifiedAt,now)||
        bond.verifiedAt>completion.completedAt)return null;
    }else if(completion.npcId!=null||approval.npcId!=null){
      return null;
    }
    // Shape required by the existing V20 HMAC signer. No persistence,
    // no frame mutation and no reads/writes of legacy affinity.
    return Object.freeze({uid,evidenceId,source,completed:true,
      approved:true,serverVerified:true,completedAt:completion.completedAt});
  };
}

/* Called by a future audited backend job ONLY. Existing V19 webhook verifies
 * the returned signature, then V19 UID-scoped DO grants the unique frame.
 */
export async function issueV24MilestoneFrame({
  uid,frameId,evidenceId,now,readers,secret,newEventId
}={}){
  if(!sourceFor(frameId)||!id(uid)||!id(evidenceId)||
    !time(now,now)||!obj(readers))
    return {ok:false,code:'invalid-milestone-request'};
  let loadEvidence;
  try{loadEvidence=createV24EvidenceReader({...readers,now});}
  catch(_){return {ok:false,code:'trusted-readers-unavailable'};}
  return issueVerifiedFrameEvent({
    uid,frameId,evidenceId,now,loadEvidence,secret,newEventId
  });
}
