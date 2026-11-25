/* P2A: honest-play, in-memory reading observation; no authority or rewards.
 * Samples monotonic time only during a visible, focused, recently active reader.
 * No storage, network calls, token access or modification of legacy rewards.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalReadingClockP2A=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const DEFAULTS=Object.freeze({idleMs:120000,maxGapMs:2500});
 const modes=new Set(['WEB','EPUB_R2','EPUB_V49']);
 const validId=x=>typeof x==='string'&&x.length>0&&x.length<=256;
 const validTime=x=>Number.isFinite(x)&&x>=0;
 const same=(a,b)=>a&&b&&a.uid===b.uid&&a.storyId===b.storyId&&a.chapterId===b.chapterId&&a.mode===b.mode&&a.revision===b.revision;
 function create({idleMs=DEFAULTS.idleMs,maxGapMs=DEFAULTS.maxGapMs}={}){
  if(!Number.isFinite(idleMs)||idleMs<=0||!Number.isFinite(maxGapMs)||maxGapMs<=0)throw Error('invalid-clock-policy');
  let ctx=null,last=null,lastActivity=null,total=0,chapterMs=0,wasEligible=false;
  function open(next,at){
   if(!next||![next.uid,next.storyId,next.chapterId].every(validId)||!modes.has(next.mode)||!validTime(at))return close();
   const clean={uid:next.uid,storyId:next.storyId,chapterId:next.chapterId,mode:next.mode,revision:String(next.revision||'')};
   if(ctx?.uid!==clean.uid)total=0;
   if(!same(ctx,clean))chapterMs=0;
   ctx=Object.freeze(clean);last=at;lastActivity=null;wasEligible=false;return snapshot();
  }
  function close(){ctx=null;last=null;lastActivity=null;total=0;chapterMs=0;wasEligible=false;return snapshot();}
  function pause(at){last=validTime(at)?at:null;lastActivity=null;wasEligible=false;return snapshot();}
  function activity(at){
   if(ctx&&validTime(at)&&(last===null||at>=last))lastActivity=at;
   return snapshot();
  }
  function sample({at,uid,readerOpen,visible,focused,online}={}){
   if(!ctx)return snapshot();
   if(uid!==ctx.uid)return close();
   if(!validTime(at)||last!==null&&at<last)return pause(at);
   if(!readerOpen||!visible||!focused||!online)return pause(at);
   const eligible=lastActivity!==null&&at>=lastActivity&&at-lastActivity<=idleMs;
   const delta=last===null?0:at-last;
   if(eligible&&wasEligible&&delta>0&&delta<=maxGapMs){total+=delta;chapterMs+=delta;}
   last=at;wasEligible=eligible;return snapshot();
  }
  function snapshot(){return Object.freeze({context:ctx,observedMs:Math.floor(total),chapterMs:Math.floor(chapterMs),
   active:wasEligible,awardExp:0,awardTuVi:0,authority:'CLIENT_OBSERVATION_ONLY'});}
  return Object.freeze({open,close,pause,activity,sample,snapshot});
 }
 // Pure simulation, no default rates. Millisecond remainder is conserved.
 function quote({observedMs,unitMs,expPerUnit,remainderMs=0}={}){
  if(![observedMs,unitMs,expPerUnit,remainderMs].every(Number.isSafeInteger)||
   observedMs<0||unitMs<=0||expPerUnit<=0||remainderMs<0||remainderMs>=unitMs||
   observedMs>Number.MAX_SAFE_INTEGER-remainderMs)throw Error('explicit-policy-required');
  const sum=observedMs+remainderMs,units=Math.floor(sum/unitMs),exp=units*expPerUnit;
  if(!Number.isSafeInteger(exp))throw Error('invalid-reward-quote');
  return Object.freeze({units,exp,remainderMs:sum%unitMs,simulation:true});
 }
 return Object.freeze({DEFAULTS,create,quote});
});
