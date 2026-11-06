'use strict';
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads'),{performance}=require('node:perf_hooks');
if(!isMainThread&&workerData?.kind==='F45B2B'){
  const samples=[],sample=(phase,units)=>{const mem=process.memoryUsage();samples.push({phase,units,elapsedMs:performance.now(),heapUsed:mem.heapUsed,heapTotal:mem.heapTotal,rss:mem.rss});};
  sample('before-module-load',0);const g=require('./vanbao-motif-generator-f45b2b.js'),t=require('./vanbao-tactics-f45b2b.js');sample('ready',0);parentPort.postMessage({type:'ready'});
  try{sample('before-job',0);const start=performance.now(),observer=n=>{if(n%32===0){sample('during-job',n);parentPort.postMessage({type:'progress',sample:samples.at(-1)});}};
    const result=workerData.job.kind==='census'?t.census(workerData.job.board,{...workerData.job.options,observer}):g.generate(workerData.job.request,{observer});
    const generateMs=performance.now()-start;sample('after-job',result.stats?.workUnits||result.workUnits||0);
    const verifyStart=performance.now(),verified=result.puzzle?g.verifyRecord(result.puzzle).ok:null;const verifyMs=performance.now()-verifyStart;sample('after-verification',0);
    parentPort.postMessage({type:'result',result,telemetry:{generateMs,verifyMs,verified,samples,method:'Worker isolate heap snapshots at boundaries and every 32 work units; RSS process-wide, not a true peak'}});
  }catch(err){parentPort.postMessage({type:'result',result:{status:'ERROR'},telemetry:{error:err.message,samples}});}
}
class JobQueue{
  constructor({maxQueued=2}={}){if(!Number.isInteger(maxQueued)||maxQueued<0||maxQueued>2)throw Error('queue-cap');this.maxQueued=maxQueued;this.pending=[];this.active=null;this.closed=false;this.stats={started:0,terminated:0,maxActive:0,maxQueued:0};}
  submit(job,{signal,timeoutMs=1500,onProgress}={}){
    if(!job||!['generate','census'].includes(job.kind)||!Number.isInteger(timeoutMs)||timeoutMs<0||timeoutMs>30000)return Promise.resolve({status:'INVALID_REQUEST'});
    if(this.closed||signal?.aborted)return Promise.resolve({status:'CANCELLED'});
    if(this.active&&this.pending.length>=this.maxQueued)return Promise.resolve({status:'QUEUE_FULL'});
    return new Promise(resolve=>{const task={job,signal,timeoutMs,onProgress,resolve,enqueued:performance.now()};task.abort=()=>{if(this.active===task)void task.finish({status:'CANCELLED'});else{const i=this.pending.indexOf(task);if(i>=0)this.pending.splice(i,1);signal?.removeEventListener('abort',task.abort);resolve({status:'CANCELLED'});}};
      signal?.addEventListener('abort',task.abort,{once:true});this.pending.push(task);this.stats.maxQueued=Math.max(this.stats.maxQueued,this.active?this.pending.length:0);this.pump();if(signal?.aborted)task.abort();});
  }
  pump(){if(this.closed||this.active||!this.pending.length)return;const task=this.pending.shift();this.active=task;const start=performance.now(),parentSamples=[{phase:'before-worker',...process.memoryUsage()}],partialWorkerSamples=[];let w,done=false,timer,poll,readyMs=null,telemetry;
    task.finish=result=>{if(done)return task.finishing;done=true;clearTimeout(timer);clearInterval(poll);task.signal?.removeEventListener('abort',task.abort);
      task.finishing=(async()=>{if(w){await w.terminate();this.stats.terminated++;}parentSamples.push({phase:'after-terminate',...process.memoryUsage()});
      this.active=null;const delivered=task.signal?.aborted?{status:'CANCELLED'}:result;task.resolve({...delivered,jobMetrics:{startupMs:readyMs,totalMs:performance.now()-start,queueWaitMs:start-task.enqueued,telemetry,parentSamples,partialWorkerSamples}});this.pump();})();return task.finishing;};
    try{w=new Worker(__filename,{workerData:{kind:'F45B2B',job:task.job},resourceLimits:{maxOldGenerationSizeMb:32,maxYoungGenerationSizeMb:8,stackSizeMb:2}});}catch{void task.finish({status:'INVALID_REQUEST'});return;}
    this.stats.started++;this.stats.maxActive=Math.max(this.stats.maxActive,1);
    poll=setInterval(()=>parentSamples.push({phase:'poll-5ms',...process.memoryUsage()}),5);
    timer=setTimeout(()=>void task.finish({status:'TIMEOUT'}),task.timeoutMs);
    w.on('message',msg=>{if(done)return;if(msg.type==='ready')readyMs=performance.now()-start;else if(msg.type==='progress'){partialWorkerSamples.push(msg.sample);try{task.onProgress?.(msg.sample);}catch{void task.finish({status:'ERROR'});}}else if(msg.type==='result'){telemetry=msg.telemetry;void task.finish(task.signal?.aborted?{status:'CANCELLED'}:msg.result);}});
    w.once('error',err=>{telemetry={error:err.message};void task.finish({status:'ERROR'});});w.once('exit',()=>{if(!done)void task.finish({status:'ERROR'});});
    if(task.signal?.aborted)void task.finish({status:'CANCELLED'});
  }
  async close(){this.closed=true;for(const task of this.pending.splice(0)){task.signal?.removeEventListener('abort',task.abort);task.resolve({status:'CANCELLED'});}if(this.active)await this.active.finish({status:'CANCELLED'});}
  get state(){return{active:this.active?1:0,queued:this.pending.length,closed:this.closed,...this.stats};}
}
module.exports={JobQueue};
