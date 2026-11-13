/* G1N local arc planning only; source permissions and chapter existence need server verification. */
(function(root){
 'use strict';
 const keys=(o,allowed)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>allowed.includes(k));
 const str=(s,n=4000)=>typeof s==='string'&&s.length<=n;
 const id=s=>str(s,64)&&/^[a-z][a-z0-9-]{1,63}$/.test(s);
 const pin=s=>keys(s,['kind','storyId','storyVersion','contentHash'])&&['library','original','manuscript'].includes(s.kind)&&
  str(s.storyId,160)&&s.storyId.trim()&&str(s.storyVersion,100)&&s.storyVersion.trim()&&str(s.contentHash,64)&&/^[a-f0-9]{64}$/.test(s.contentHash);
 function inspect(plan){
  const errors=[],add=(code,path)=>errors.push({code,path});
  if(!keys(plan,['schemaVersion','arcs'])||plan.schemaVersion!=='arc-plan-1'||!Array.isArray(plan.arcs)||plan.arcs.length>200)
   return {valid:false,errors:[{code:'invalid-plan',path:'/'}]};
  const ids=new Set();
  plan.arcs.forEach((a,i)=>{
   const p='/arcs/'+i;
   if(!keys(a,['arcId','title','source','startChapterId','endChapterId','opening','goal','ending','mode'])||!id(a.arcId)||
    !['manual'].includes(a.mode)||!['title','startChapterId','endChapterId','opening','goal','ending'].every(k=>str(a[k]))||
    (a.source!==null&&!pin(a.source))){add('invalid-arc',p);return;}
   if(ids.has(a.arcId))add('duplicate-arc',p);ids.add(a.arcId);
  });
  return {valid:errors.length===0,errors};
 }
 function copy(plan){if(!inspect(plan).valid)throw Error('invalid-arc-plan');return JSON.parse(JSON.stringify(plan));}
 const api=Object.freeze({inspect,copy,empty:()=>({schemaVersion:'arc-plan-1',arcs:[]}),validSource:pin});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.DuduArcPlan=api;
})(typeof window==='object'?window:globalThis);
