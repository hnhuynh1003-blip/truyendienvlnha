'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const BASE=Date.UTC(2026,10,25);
function storage(){
 const m=new Map(),counts={length:0,key:0,get:0,set:0,remove:0};let keys=null;
 return {m,counts,reset(){for(const key in counts)counts[key]=0;},
  get length(){counts.length++;return m.size;},key(i){counts.key++;return (keys??=[...m.keys()])[i]??null;},
  getItem(k){counts.get++;return m.get(k)??null;},setItem(k,v){counts.set++;m.set(k,v);keys=null;},
  removeItem(k){counts.remove++;m.delete(k);keys=null;}};
}
function runtime({store=storage(),start=BASE,uid='a',ready=true,submit,source,slotsApi,capacity}={}){
 let mono=0,wall=start,calls=0,quests=0;
 const events={},documentEvents={},timers=[],node={textContent:'',hidden:true,dataset:{}};
 const clock=require('../../js/personal-reading-clock-p2a.js').create();
 const slots=slotsApi||require('../../js/personal-reading-slots-p2c.js');
 let q;
 const window={localStorage:store,scrollY:0,DuduPersonalReadingClockP2A:{create:()=>clock},
  DuduPersonalReadingPolicyP2C:{policy:require('../../js/personal-reading-policy-p2c.js').policy},
  DuduPersonalReadingSlotsP2C:{create:slots.create,queue:opts=>(q=slots.queue({...opts,storage:store,now:()=>wall,capacity}))},
  DuduAuth:{uid:()=>uid},DuduReadingRewardBridgeP2C:{ready:u=>ready&&u===uid,
   submit:async(u,s)=>{calls++;return submit?submit(u,s,calls):{status:'applied',awardExp:s.length/3};},
   quest:async()=>{quests++;return true;}},
  addEventListener:(e,f)=>(events[e]??=[]).push(f),dispatchEvent(event){for(const fn of events[event.type]||[])fn(event);}};
 const context={window,document:{getElementById:id=>id==='reader-exp-live-p2d'?node:id==='reader-view'?{style:{display:'block'}}:null,
  hasFocus:()=>true,hidden:false,addEventListener:(e,f)=>(documentEvents[e]??=[]).push(f)},navigator:{onLine:true},
  performance:{now:()=>mono},Date:class extends Date{static now(){return wall;}},
  setInterval:(fn,ms)=>{timers.push({fn,ms,active:true});return timers.length;},clearInterval:id=>{if(timers[id-1])timers[id-1].active=false;},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},Event:class{constructor(type){this.type=type;}}};
 vm.runInNewContext(source||fs.readFileSync(path.join(__dirname,'../../js/personal-reading-runtime-p2a.js'),'utf8'),context);
 const api=window.DuduPersonalReadingRuntimeP2A;
 return {api,window,node,clock,store,events,timers,queue:()=>q,calls:()=>calls,quests:()=>quests,
  setTime:m=>{mono=m;wall=start+m;},setWall:w=>wall=w,setUid:u=>uid=u,setReady:v=>ready=v,
  setOnline:v=>context.navigator.onLine=v,
  event:e=>window.dispatchEvent(new context.Event(e)),
  tick(){for(const timer of [...timers])if(timer.active)timer.fn();},
  open(){api.open({uid,storyId:'book',chapterId:'chapter',mode:'WEB',currentUid:()=>uid});},
  start(){this.open();clock.activity(mono);this.tick();}};
}
const drain=()=>new Promise(resolve=>setImmediate(resolve));
async function reading180(options={}){
 const r=runtime(options);r.start();await drain();
 for(let second=1;second<=10800;second++){
  r.setTime(second*1000);if(second%60===0)r.clock.activity(second*1000);
  r.tick();await drain();
 }
 r.tick();await drain();return r;
}
module.exports={BASE,storage,runtime,drain,reading180};
