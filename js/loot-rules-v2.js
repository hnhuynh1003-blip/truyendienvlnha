/* DUDU Loot Rules v2 — approved COMMON + explicitly tagged REALM items only.
 * Canonical story/chapter/NPC collectibles and DUDU memorabilia NEVER drop
 * from this random source. Client-only preview rules, not an anti-cheat backend.
 */
(function(root, factory){
  'use strict';
  const api=factory(typeof module==='object'&&module.exports?require('./item-catalog-v2.js'):root?.DuduItemCatalog);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduLootRules=api;
})(typeof window!=='undefined'?window:null,function(catalog){
  'use strict';
  // Legacy relative weights, expressed as integer probabilities out of 10,000.
  const BASE_WEIGHTS=Object.freeze({F:5000,E:3000,D:1200,C:500,B:200,A:70,S:25,SS:4,SSS:1});
  function realmTagFor(chapter,story){
    // Only author-assigned metadata counts. No AI guessing or story title matching.
    const tag=chapter?.realmTag ?? story?.realmTag ?? null;
    return typeof tag==='string'&&catalog.REALM_TAGS.includes(tag)?tag:null;
  }
  // F/E/D/C weights remain 100% rank-first. New items of rank B/A are
  // chapter-gated and cannot enter the RANDOM pool. Within an eligible rank,
  // story loot visibly favors world-specific items and new discoveries.
  const WORLD_CHANCE=0.65,UNSEEN_BOOST=3;
  function sample(random){
    const value=Number(random());
    if(!Number.isFinite(value))return null;
    return Math.max(0,Math.min(1-Number.EPSILON,value));
  }
  function pick({realmTag=null,random=Math.random,seenIds=[]}={}){
    const pool=catalog.previewDropPool({realmTag});
    if(!pool.length)return null;
    const groups=catalog.RANKS.map(rank=>({rank,weight:BASE_WEIGHTS[rank],
      choices:pool.filter(item=>item.rank===rank)}))
      .filter(group=>group.choices.length&&group.weight>0);
    if(!groups.length)return null;
    const total=groups.reduce((sum,group)=>sum+group.weight,0);
    const u=sample(random);if(u===null)return null;
    let target=u*total;
    let selected=groups[groups.length-1];
    for(const group of groups){
      if(target<group.weight){selected=group;break;}
      target-=group.weight;
    }
    let choices=selected.choices;
    if(realmTag){
      const realmChoices=choices.filter(x=>x.scope==='REALM'&&x.realmTag===realmTag);
      const commonChoices=choices.filter(x=>x.scope==='COMMON');
      if(realmChoices.length&&commonChoices.length){
        const sourceRoll=sample(random);if(sourceRoll===null)return null;
        choices=sourceRoll<WORLD_CHANCE?realmChoices:commonChoices;
      }
    }
    const known=new Set(Array.isArray(seenIds)?seenIds:[]);
    const weights=choices.map(x=>known.has(x.id)?1:UNSEEN_BOOST);
    const sum=weights.reduce((a,b)=>a+b,0);
    const v=sample(random);if(v===null)return null;
    let targetChoice=v*sum,record=choices[choices.length-1];
    for(let i=0;i<choices.length;i++){
      if(targetChoice<weights[i]){record=choices[i];break;}
      targetChoice-=weights[i];
    }
    return record?{item:record,rank:record.rank,realmTag:record.realmTag}:null;
  }
  function rewardFor(rank,random=Math.random){
    if(!catalog.RANKS.includes(rank))return null;
    const base=Math.max(0,Math.min(1-Number.EPSILON,Number(random())));
    if(!Number.isFinite(base))return null;
    const coins=rank==='SSS'?200:['S','SS'].includes(rank)?50:
      ['B','A'].includes(rank)?15:Math.floor(base*3)+1;
    const exp=rank==='SSS'?100:rank==='S'?40:10;
    return {coins,exp};
  }
  return Object.freeze({BASE_WEIGHTS,WORLD_CHANCE,UNSEEN_BOOST,realmTagFor,pick,rewardFor});
});
