/* F4.2B.1 — public prize-derived scenery only. Never draws loot or edits profile state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduVantVatStreamF42B1=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 // Display cadence only; these numbers are never supplied to the reward engine.
 const DISPLAY_WEIGHTS=Object.freeze({F:16,E:16,D:12,C:9,B:5,A:3,S:2,SS:1,SSS:.5});
 // Existing fallback glyphs retain their identity; strip only their inventory card chrome.
 function scenerySvg(src){
  if(!src.startsWith('data:image/svg'))return src;
  try{const split=src.indexOf(','),svg=decodeURIComponent(src.slice(split+1));if(!svg.includes('<text '))return src;
   return src.slice(0,split+1)+encodeURIComponent(svg.replace(/<rect\b[^>]*\/>/g,'').replace(/<circle\b[^>]*\/>/g,''));
  }catch(_){return src;}
 }
 function entries(catalog,rule,art){
  const seen=new Set(),rows=[];
  for(const prize of rule?.POOL||[]){const item=catalog?.byId?.(prize.itemId);
   if(!item||item.collectionSet!=='VAN_VAT'||item.rank!==prize.rank||!(prize.weight>0)||seen.has(item.id))continue;
   const visual=art?.visual?.(item);if(!visual?.src)continue;seen.add(item.id);
   const hasOwnArt=!visual.src.startsWith('data:');
   rows.push(Object.freeze({id:item.id,name:item.name,type:item.funCategory||item.type,rank:item.rank,
    realm:item.funRealm||'ORIGIN',imageSrc:visual.src,hasOwnArt,
    src:hasOwnArt?'assets/van-tuong/stream-f42b1/'+item.id+'.webp':scenerySvg(visual.src)}));
  }
  return Object.freeze(rows);
 }
 function random(seed){let state=(seed>>>0)||0x6d2b79f5;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};}
 function selector(rows,{seed=Date.now(),recentLimit=14}={}){
  const rand=random(seed),groups=new Map(),recent=[],credits={};
  for(const row of rows){if(!groups.has(row.rank))groups.set(row.rank,[]);groups.get(row.rank).push(row);}
  for(const [rank,list]of groups){for(let i=list.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[list[i],list[j]]=[list[j],list[i]];}credits[rank]=rand()*.5;}
  function pick(active=[]){
   const ids=new Set(active.filter(Boolean).map(x=>x.id)),sources=new Set(active.filter(Boolean).map(x=>x.src));
   const ranks=[...groups.keys()],total=ranks.reduce((n,r)=>n+(DISPLAY_WEIGHTS[r]||1),0);
   for(const rank of ranks)credits[rank]+=(DISPLAY_WEIGHTS[rank]||1);
   const ordered=[...ranks].sort((a,b)=>credits[b]-credits[a]);let chosen=null;
   for(const relaxed of [false,true]){for(const rank of ordered){const list=groups.get(rank);
     const index=list.findIndex(x=>!ids.has(x.id)&&!sources.has(x.src)&&(relaxed||!recent.includes(x.id)));
     if(index>=0){chosen=list.splice(index,1)[0];list.push(chosen);credits[rank]-=total;break;}}
    if(chosen)break;}
   if(!chosen)return null;
   recent.push(chosen.id);while(recent.length>recentLimit)recent.shift();return chosen;
  }
  return Object.freeze({pick});
 }
 function flow(rows,{seed=Date.now(),count=12}={}){
  const rand=random(seed),choose=selector(rows,{seed}),slots=[];let emitted=0;
  function replace(slot,initial=false){const entry=choose.pick(slots.filter(x=>x!==slot).map(x=>x.entry));
   if(!entry){slot.entry=null;return;}slot.entry=entry;slot.age=0;slot.serial=++emitted;
   slot.mode=['portal','cross','distant'][slot.index%3];slot.duration=slot.mode==='portal'?9+rand()*4:slot.mode==='cross'?6+rand()*3:5+rand()*3;
   slot.lane=rand();slot.side=rand()<.5?-1:1;slot.bend=(rand()-.5)*.8;slot.tilt=(rand()-.5)*.45;
   if(initial)slot.age=slot.duration*(.12+rand()*.65);
  }
  for(let i=0;i<Math.min(count,rows.length);i++){const slot={index:i,entry:null};slots.push(slot);replace(slot,true);}
  function tick(seconds=0){const dt=Number.isFinite(seconds)?Math.max(0,Math.min(seconds,1)):0;
   for(const slot of slots){slot.age+=dt;if(slot.age>=slot.duration)replace(slot);}
   return slots;
  }
  function project(slot,w,h,time=0,cameraX=0,cameraY=0){
   const t=Math.min(1,slot.age/slot.duration),cx=w*.5,cy=h*.42;let x,y,z,size;
   if(slot.mode==='portal'){z=1.4-t*1.22;const angle=slot.lane*Math.PI*2;
    x=cx+Math.cos(angle)*w*.085/z+Math.sin(t*3+slot.bend)*w*.035;
    y=cy+Math.sin(angle)*h*.08/z;size=Math.min(w*.29,w*.056/z);
   }else if(slot.mode==='cross'){z=.4+slot.lane*.35;
    x=(slot.side>0?-.2+1.4*t:1.2-1.4*t)*w;y=(.17+slot.lane*.65+Math.sin(t*Math.PI)*slot.bend*.14)*h;
    size=w*(.12+(1-z)*.1);
   }else{z=1.3+slot.lane*.3;
    x=(slot.side>0?1.1-t*1.2:-.1+t*1.2)*w;y=(.15+slot.lane*.55+Math.sin(t*4)*.025)*h;size=w*.055;
   }
   x+=cameraX*(1-z);y+=cameraY*(1-z);
   return {x,y,z,size,angle:slot.tilt+Math.sin(time*.0003+slot.index)*.12,
    alpha:slot.mode==='distant'?.32:Math.min(.95,.38+(1.5-z)*.5),visible:x>-size&&x<w+size&&y>-size&&y<h+size};
  }
  return Object.freeze({tick,project,snapshot:()=>slots.map(s=>({...s})),get emissions(){return emitted;}});
 }
 function cache({load,release=()=>{},onChange=()=>{},limit=14,concurrent=2}={}){
  if(typeof load!=='function')throw Error('image-loader-required');
  const map=new Map();let desired=[],pending=0,clock=0,disposed=false,requests=0;
  function trim(){while(map.size>=limit){const unused=[...map].filter(([src,e])=>!desired.includes(src)&&e.state!=='loading').sort((a,b)=>a[1].last-b[1].last)[0];
    if(!unused)return false;if(unused[1].image)release(unused[1].image);map.delete(unused[0]);}return true;}
  function pump(){if(disposed)return;
   for(const src of desired){if(pending>=concurrent)break;if(map.has(src))continue;if(!trim())break;
    const entry={state:'loading',image:null,last:++clock};map.set(src,entry);pending++;requests++;
    Promise.resolve().then(()=>load(src)).then(image=>{if(disposed){release(image);return;}entry.image=image;entry.state='ready';},()=>{entry.state='failed';}).finally(()=>{
     pending--;if(!disposed){onChange();pump();}
    });
   }
  }
  function sync(sources){if(disposed)return;desired=[...new Set(sources)].slice(0,limit);
   for(const src of desired){const entry=map.get(src);if(entry)entry.last=++clock;}pump();}
  return Object.freeze({sync,get:src=>map.get(src)?.state==='ready'?map.get(src).image:null,
   stats:()=>({resident:map.size,pending,requests,queued:desired.filter(s=>!map.has(s)).length}),
   clear(){if(disposed)return;disposed=true;desired=[];for(const e of map.values())if(e.image)release(e.image);map.clear();}});
 }
 return Object.freeze({entries,selector,flow,cache,DISPLAY_WEIGHTS});
});
