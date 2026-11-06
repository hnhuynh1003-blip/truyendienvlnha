'use strict';
// Node-only offline worker boundary; never loaded by the website.
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
if(!isMainThread&&workerData?.kind==='F45B2A'){
  try{parentPort.postMessage(require('./vanbao-puzzle-generator-f45.js').generate(workerData.request));}catch{parentPort.postMessage({status:'ERROR'});}
}
function generateWithDeadline(request,{timeoutMs=1500,signal}={}){
  if(!Number.isInteger(timeoutMs)||timeoutMs<0||timeoutMs>30000)return Promise.resolve({status:'INVALID_REQUEST'});
  if(signal?.aborted)return Promise.resolve({status:'CANCELLED'});
  return new Promise(resolve=>{
    let w;try{w=new Worker(__filename,{workerData:{kind:'F45B2A',request},resourceLimits:{maxOldGenerationSizeMb:32,maxYoungGenerationSizeMb:8,stackSizeMb:2}});}catch{resolve({status:'INVALID_REQUEST'});return;}
    let settled=false;const finish=async result=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);await w.terminate();resolve(result);};
    const abort=()=>void finish({status:'CANCELLED'}),timer=setTimeout(()=>void finish({status:'TIMEOUT'}),timeoutMs);
    signal?.addEventListener('abort',abort,{once:true});w.once('message',r=>void finish(r));w.once('error',()=>void finish({status:'ERROR'}));w.once('exit',()=>{if(!settled)void finish({status:'ERROR'});});
    if(signal?.aborted)abort();
  });
}
module.exports={generateWithDeadline};
