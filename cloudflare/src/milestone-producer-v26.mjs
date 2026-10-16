/* DUDU V26 — SERVER-ONLY evidence receipt producer (not a public API).
 * Trusted adapters authenticate Firebase sessions and read authoritative,
 * independently verified story/chapter/NPC event records. Never inject client
 * localStorage, NPC affinity, browser timers or self-asserted proof.
 * Both secrets are private backend credentials, NEVER web env vars.
 */
import {V25TrustedMilestoneLedger} from './milestone-ledger-v25.mjs';
import {normalizeV25Receipt,receiptRole} from './milestone-receipt-v25.mjs';
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const validId=s=>typeof s==='string'&&ID.test(s);
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const time=(t,now)=>Number.isSafeInteger(t)&&t>0&&t<=now;
const failure=code=>({ok:false,code});
const boundedRequest=(request,fields)=>obj(request)&&
  Object.keys(request).every(k=>fields.includes(k))&&
  Object.keys(request).length===fields.length;
const enc=new TextEncoder();
const hex=buf=>Array.from(buf,b=>b.toString(16).padStart(2,'0')).join('');
const sourceMethodNames=[
  'authenticate','getStory','getChapter','getNpc',
  'getChapterEvidence','getBondEvidence'
];

export class V26TrustedMilestoneProducer{
  #sources;#ledger;#secrets;#clock;#newId;
  constructor({sources,ledger,secrets,now=Date.now,newId=()=>crypto.randomUUID()}={}){
    if(!obj(sources)||sourceMethodNames.some(n=>typeof sources[n]!=='function')||
      !(ledger instanceof V25TrustedMilestoneLedger)||
      !obj(secrets)||typeof secrets.approval!=='string'||
      typeof secrets.progress!=='string'||
      secrets.approval.length<32||secrets.progress.length<32||
      secrets.approval===secrets.progress||
      typeof now!=='function'||typeof newId!=='function')
      throw new TypeError('private verified sources, V25 ledger and isolated keys required');
    this.#sources=sources;this.#ledger=ledger;this.#secrets=secrets;
    this.#clock=now;this.#newId=newId;
  }
  async #principal(credential){
    // A caller-supplied {uid,admin} is NOT an authenticated principal.
    // The adapter MUST validate the JWT/session independently server-side.
    if(typeof credential!=='string'||credential.length<1||credential.length>12000)
      return null;
    const result=await this.#sources.authenticate(credential);
    return obj(result)&&result.verifiedBy==='FIREBASE_AUTH'&&
      validId(result.uid)&&typeof result.admin==='boolean'?result:null;
  }
  #now(){
    const n=this.#clock();
    return time(n,n)?n:null;
  }
  #id(){
    const id=this.#newId();
    return validId(id)?id:null;
  }
  async #sign(event,now){
    const full={eventId:this.#id(),kind:event.kind,issuedAt:now,...event};
    const normalized=normalizeV25Receipt(full,now);
    if(!normalized)return failure('receipt-invalid');
    const role=receiptRole(full.kind),secret=this.#secrets[role];
    if(!secret||!globalThis.crypto?.subtle)return failure('crypto-unavailable');
    const timestamp=String(now),rawBytes=enc.encode(JSON.stringify(full));
    const key=await crypto.subtle.importKey('raw',enc.encode(secret),
      {name:'HMAC',hash:'SHA-256'},false,['sign']);
    const signature=hex(new Uint8Array(await crypto.subtle.sign(
      'HMAC',key,enc.encode(timestamp+'.'+new TextDecoder().decode(rawBytes)))));
    // Call ingestSignedReceipt from a private backend process only.
    return {ok:true,rawBytes,timestamp,signature,now};
  }
  async #actor(credential,storyId,{author=false}={}){
    if(!validId(storyId))return null;
    const identity=await this.#principal(credential);
    if(!identity)return null;
    const story=await this.#sources.getStory(storyId);
    if(!obj(story)||story.id!==storyId||story.status!=='PUBLISHED'||
      !validId(story.ownerUid))return null;
    if(author&&(identity.admin!==true||story.ownerUid!==identity.uid))
      return null;
    return {identity,story};
  }
  async #chapter(storyId,chapterId){
    if(!validId(chapterId))return null;
    const chapter=await this.#sources.getChapter(storyId,chapterId);
    return obj(chapter)&&chapter.storyId===storyId&&
      chapter.chapterId===chapterId&&chapter.status==='PUBLISHED'?
      chapter:null;
  }
  async #npc(storyId,npcId){
    if(!validId(npcId))return null;
    const npc=await this.#sources.getNpc(storyId,npcId);
    return obj(npc)&&npc.storyId===storyId&&npc.npcId===npcId&&
      npc.status==='ACTIVE'?npc:null;
  }
  async authorPublish(request){
    const fields=['credential','storyId','milestoneId','frameId','chapterId',
      'npcId','minimumTrust','expectedRevision'];
    if(!boundedRequest(request,fields)||!validId(request.milestoneId)||
      !Number.isSafeInteger(request.expectedRevision)||
      request.expectedRevision<0||
      !['legend','soulbond'].includes(request.frameId))return failure('invalid-request');
    try{
      const now=this.#now();
      const actor=await this.#actor(request.credential,request.storyId,
        {author:true});
      if(!now||!actor||!await this.#chapter(request.storyId,request.chapterId))
        return failure('not-authorized-or-unpublished');
      if(request.frameId==='legend'?
        (request.npcId!==null||request.minimumTrust!==null):
        (!await this.#npc(request.storyId,request.npcId)||
         !Number.isInteger(request.minimumTrust)||
         request.minimumTrust<50||request.minimumTrust>100))
        return failure('invalid-milestone-scope');
      const head=this.#ledger.getApprovalHead(request);
      if((head?.revision||0)!==request.expectedRevision)
        return failure('approval-version-conflict');
      const revision=request.expectedRevision+1;
      return await this.#sign({kind:'APPROVAL_PUBLISHED',
        storyId:request.storyId,milestoneId:request.milestoneId,
        revision,frameId:request.frameId,chapterId:request.chapterId,
        npcId:request.npcId,minimumTrust:request.minimumTrust,
        reviewedAt:now},now);
    }catch(_){return failure('trusted-source-unavailable');}
  }
  async authorRevoke(request){
    if(!boundedRequest(request,['credential','storyId','milestoneId','expectedRevision'])||
      !validId(request.milestoneId)||
      !Number.isSafeInteger(request.expectedRevision)||
      request.expectedRevision<1)return failure('invalid-request');
    try{
      const now=this.#now();
      const actor=await this.#actor(request.credential,request.storyId,
        {author:true});
      if(!now||!actor)return failure('not-authorized-or-unpublished');
      const head=this.#ledger.getApprovalHead(request);
      if(!head||head.revision!==request.expectedRevision||
        head.status!=='APPROVED')return failure('approval-version-conflict');
      return await this.#sign({kind:'APPROVAL_REVOKED',
        storyId:request.storyId,milestoneId:request.milestoneId,
        revision:head.revision+1,reviewedAt:now},now);
    }catch(_){return failure('trusted-source-unavailable');}
  }
  async verifyChapter(request){
    if(!boundedRequest(request,['credential','storyId','chapterId']))
      return failure('invalid-request');
    try{
      const now=this.#now();
      const actor=await this.#actor(request.credential,request.storyId);
      if(!now||!actor||!await this.#chapter(request.storyId,request.chapterId))
        return failure('unauthorized-or-unpublished');
      const uid=actor.identity.uid;
      const evidence=await this.#sources.getChapterEvidence({
        uid,storyId:request.storyId,chapterId:request.chapterId
      });
      if(!obj(evidence)||evidence.uid!==uid||
        evidence.storyId!==request.storyId||
        evidence.chapterId!==request.chapterId||
        evidence.status!=='VERIFIED_COMPLETE'||
        evidence.verifiedBy!=='STORY_READ_SERVICE'||
        !time(evidence.completedAt,now))
        return failure('unverified-chapter');
      return await this.#sign({kind:'CHAPTER_VERIFIED',uid,
        storyId:request.storyId,chapterId:request.chapterId,
        completedAt:evidence.completedAt},now);
    }catch(_){return failure('trusted-source-unavailable');}
  }
  async verifyBond(request){
    if(!boundedRequest(request,['credential','storyId','milestoneId']))
      return failure('invalid-request');
    try{
      const now=this.#now();
      const actor=await this.#actor(request.credential,request.storyId);
      const approved=this.#ledger.getApproval(request);
      if(!now||!actor||!approved||approved.frameId!=='soulbond'||
        !await this.#npc(request.storyId,approved.npcId))
        return failure('unapproved-bond');
      const uid=actor.identity.uid;
      const evidence=await this.#sources.getBondEvidence({uid,
        storyId:request.storyId,npcId:approved.npcId,
        milestoneId:request.milestoneId});
      if(!obj(evidence)||evidence.uid!==uid||
        evidence.storyId!==request.storyId||
        evidence.npcId!==approved.npcId||
        evidence.milestoneId!==request.milestoneId||
        evidence.status!=='VERIFIED_BONDED'||
        evidence.verifiedBy!=='NPC_RELATIONSHIP_SERVICE'||
        !Number.isSafeInteger(evidence.trust)||
        evidence.trust<approved.minimumTrust||evidence.trust>100||
        !time(evidence.verifiedAt,now)||
        evidence.verifiedAt<approved.reviewedAt)
        return failure('unverified-bond');
      return await this.#sign({kind:'BOND_VERIFIED',uid,
        storyId:request.storyId,npcId:approved.npcId,
        milestoneId:request.milestoneId,trust:evidence.trust,
        verifiedAt:evidence.verifiedAt},now);
    }catch(_){return failure('trusted-source-unavailable');}
  }
  async completeMilestone(request){
    if(!boundedRequest(request,['credential','storyId','milestoneId']))
      return failure('invalid-request');
    try{
      const now=this.#now();
      const actor=await this.#actor(request.credential,request.storyId);
      const approved=this.#ledger.getApproval(request);
      if(!now||!actor||!approved||
        !await this.#chapter(request.storyId,approved.chapterId))
        return failure('unapproved-milestone');
      const uid=actor.identity.uid;
      const chapter=this.#ledger.getChapterProof({uid,
        storyId:request.storyId,chapterId:approved.chapterId});
      if(!chapter||chapter.completedAt<approved.reviewedAt||
        chapter.completedAt>now)return failure('chapter-proof-required');
      if(approved.frameId==='soulbond'){
        const bond=this.#ledger.getBondProof({uid,
          storyId:request.storyId,npcId:approved.npcId,
          milestoneId:request.milestoneId});
        if(!bond||bond.trust<approved.minimumTrust||
          bond.verifiedAt<approved.reviewedAt||
          bond.verifiedAt>now||
          !await this.#npc(request.storyId,approved.npcId))
          return failure('bond-proof-required');
      }
      const evidenceId=this.#id();
      if(!evidenceId)return failure('receipt-invalid');
      return await this.#sign({kind:'MILESTONE_COMPLETED',
        uid,storyId:request.storyId,milestoneId:request.milestoneId,
        approvalRevision:approved.revision,evidenceId,
        completedAt:now},now);
    }catch(_){return failure('trusted-source-unavailable');}
  }
}
