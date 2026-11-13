/* C4.5 — advance personal quests only inside the transaction that committed
 * the underlying activity. No wallet, EXP or item grant occurs here.
 * A canonical event/day receipt prevents retrying an action for extra progress.
 */
(function(root,factory){
 'use strict';
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./economy-core-v43.js'):root?.DuduEconomyCoreV43,
  node?require('./quest-engine-v43-7.js'):root?.DuduQuestEngineV437);
 if(node)module.exports=api;
 if(root)root.DuduPersonalQuestEventsC45=api;
})(typeof window!=='undefined'?window:null,function(core,engine){
 'use strict';
 const META='__duduQuestEventsC45',MAX_EVENTS=300;
 const VALID_TYPES=new Set(['MARKET_PURCHASE','ITEM_USE','NPC_GIFT',
  'NPC_CHECKIN','DUDU_CHECKIN','FUN_CLAIM']);
 const DAILY={NPC_GIFT:'q_daily_npc',FUN_CLAIM:'q_daily_fun'};
 const fail=reason=>Object.assign(new Error(reason),{reason});
 const dayValid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&
  Number.isFinite(Date.parse(day+'T00:00:00Z'))&&
  new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;
 const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 function record(data,{type,eventId,day,source}={}){
  if(!VALID_TYPES.has(type)||!dayValid(day)||typeof eventId!=='string'||
     !eventId||eventId.length>96||
     (type==='FUN_CLAIM'&&!['box','ticket'].includes(source)))throw fail('invalid-quest-event');
  const states=isObject(data?.storyStates)?data.storyStates:{};
  const raw=isObject(states[META])?states[META]:{};
  const past=Array.isArray(raw.events)?raw.events.filter(x=>
   typeof x==='string'&&x.length<=130).slice(-MAX_EVENTS):[];
  const key=type==='FUN_CLAIM'?'FUN_CLAIM:'+source+':'+day:type+':'+eventId;
  if(past.includes(key))return {applied:false,patch:{}};
  const rows=engine.ensure(core.ensureQuests(data.quests||[]));
  const daily=core.rolloverQuests(rows,data.questsDayV43,day);
  if(!daily.ok||(data.questsDayV43&&data.questsDayV43>day))throw fail('clock-backwards');
  const weekly=engine.rotate(daily.quests,data.questV437,
   {day,previousDay:data.questsDayV43});
  if(!weekly.ok)throw fail('invalid-quests');
  const advanced=engine.progress(weekly.quests,weekly.state,{type,eventId,day});
  if(!advanced)throw fail('invalid-quest-event');
  const quests=DAILY[type]?core.applyQuestProgress(advanced.quests,DAILY[type]):advanced.quests;
  const events=[...new Set([...past,key])].slice(-MAX_EVENTS);
  return {applied:true,patch:{quests,questV437:advanced.state,
   questsDayV43:daily.day,storyStates:{...states,[META]:{version:1,events}}}};
 }
 return Object.freeze({META,record,MAX_EVENTS});
});
