/* World Bible V2B: deterministic offline schema and spoiler-safe NPC projections.
 * Pilot only: any facts shipped to the browser are NOT server-side secrets.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduWorldModelV2B=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const list=v=>Array.isArray(v)?v:[];
 const unique=v=>[...new Set(v)];
 function validate(w){
  const errs=[];
  if(!object(w)||w.schemaVersion!=='world-bible-v2b'||w.status!=='pilot_only')return ['invalid_world_schema'];
  if(!/^[a-z0-9-]+$/.test(w.worldId||'')||!['ancient','modern','era','future','cultivation','apocalypse'].includes(w.genreId))errs.push('world_identity');
  if(!object(w.places)||!has(w.places,w.defaultPlaceId))errs.push('missing_starting_place');
  for(const [id,p] of Object.entries(w.places||{})){
   if(!object(p)||p.placeId!==id||!p.publicName||!/^assets\/worlds\/[a-z0-9/_-]+\.svg$/.test(p.background||'')||!/^assets\/worlds\/[a-z0-9/_-]+\.webp$/.test(p.photo||''))errs.push('invalid_place:'+id);
   if(!Array.isArray(p.adjacent)||p.adjacent.some(to=>!has(w.places,to)))errs.push('invalid_routes:'+id);
  }
  for(const [id,p] of Object.entries(w.places||{}))for(const to of list(p.adjacent)){
   if(!list(w.places[to]?.adjacent).includes(id))errs.push('one_way_route:'+id+':'+to);
  }
  if(!object(w.facts)||!object(w.npcs)||!object(w.clues))errs.push('world_records');
  for(const [id,n] of Object.entries(w.npcs||{})){
   if(!object(n)||n.npcId!==id||!n.name||!n.role||!n.intro||!has(w.places,n.homePlaceId))errs.push('invalid_npc:'+id);
   if(!Array.isArray(n.knows)||n.knows.some(f=>!has(w.facts||{},f)))errs.push('invalid_npc_knowledge:'+id);
   for(const line of list(n.lines)){
    if(!line.text||list(line.requiresEvidence).some(e=>!has(w.clues||{},e)))errs.push('invalid_npc_line:'+id);
    if(line.factId&&(!has(w.facts||{},line.factId)||!n.knows.includes(line.factId)))errs.push('npc_unknown_fact:'+id);
   }
  }
  for(const [id,c] of Object.entries(w.clues||{})){
   if(!object(c)||c.id!==id||!c.label||!has(w.places,c.placeId)||!has(w.npcs,c.sourceNpcId))errs.push('invalid_clue:'+id);
  }
  return unique(errs);
 }
 function validateScenario(w,s){
  const errs=validate(w);
  if(!s||!object(s.scenes))return [...errs,'missing_scenes'];
  if(s.genreId!==w.genreId||s.worldId!==w.worldId)errs.push('scenario_world_identity');
  for(const [id,scene] of Object.entries(s.scenes)){
   if(!has(w.places,scene.placeId))errs.push('unknown_place:'+id);
   if(scene.npcId&&!has(w.npcs,scene.npcId))errs.push('unknown_npc:'+id);
   for(const choice of list(scene.choices)){
    if([...list(choice.requires),...list(choice.gainEvidence),
      ...list(choice.visibleIfEvidence),...list(choice.visibleAnyEvidence)]
      .some(e=>!has(w.clues,e)))errs.push('unknown_evidence:'+choice.id);
    if(choice.to&&has(s.scenes,choice.to)){
     const from=scene.placeId,to=s.scenes[choice.to].placeId;
     if(from!==to&&!list(w.places[from]?.adjacent).includes(to))errs.push('illegal_scene_jump:'+choice.id);
    }
   }
  }
  return unique(errs);
 }
 function conditionsMet(line,state){
  return list(line.requiresEvidence).every(e=>list(state.evidence).includes(e))&&
   list(line.requiresFlags).every(f=>list(state.flags).includes(f));
 }
 function npcView(w,npcId,state){
  if(!has(w.npcs,npcId))return null;
  const n=w.npcs[npcId];
  const match=list(n.lines).filter(x=>conditionsMet(x,state)).at(-1);
  // Never expose the world truth, full knowledge registry or unrevealed dialogue.
  return {npcId,name:n.name,role:n.role,intro:n.intro,text:match?match.text:n.intro};
 }
 function knownClues(w,evidence){
  return list(evidence).filter(id=>has(w.clues,id)).map(id=>({
   id,label:w.clues[id].label,placeId:w.clues[id].placeId
  }));
 }
 function placeView(w,placeId){
  if(!has(w.places,placeId))return null;
  const p=w.places[placeId];
  return {placeId,publicName:p.publicName,atmosphere:p.atmosphere||'',background:p.background,photo:p.photo};
 }
 return Object.freeze({validate,validateScenario,npcView,knownClues,placeView});
});
