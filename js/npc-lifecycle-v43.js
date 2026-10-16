/* V43 editorial NPC lifecycle: canonical metadata is author-owned, reader
 * progress is reader-owned. Local contact hiding never deletes a character.
 * Pure, deterministic helpers; no Firestore or server mutation.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduNpcLifecycleV43=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const CANONICAL_FIELDS=Object.freeze(['name','role','note','aliases','originWorld','status',
  'portraitAnimeId','portraitPresetId','portraitUploadId','portraitPath',
  'giftPreferences']);
 const valid=id=>typeof id==='string'&&id.length>0&&id.length<=160;
 function updateLinked(story,storyProgress){
  if(!valid(story?.id)||!Array.isArray(story.characters)||!storyProgress||
    typeof storyProgress!=='object'||!storyProgress.collectedCharacters||
    typeof storyProgress.collectedCharacters!=='object')return 0;
  const canonical=new Map(story.characters.filter(c=>valid(c?.id)).map(c=>[c.id,c]));
  let updated=0;
  for(const [id,reader] of Object.entries(storyProgress.collectedCharacters)){
   const npc=canonical.get(id);
   if(!npc||!reader||typeof reader!=='object'||Array.isArray(reader))continue;
   let changed=false;
   for(const field of CANONICAL_FIELDS){
    if(Object.prototype.hasOwnProperty.call(npc,field)){
     const value=npc[field];
     if(JSON.stringify(reader[field])!==JSON.stringify(value)){
      reader[field]=value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;
      changed=true;
     }
    }else if(Object.prototype.hasOwnProperty.call(reader,field)){
     delete reader[field];changed=true;
    }
   }
   // Author archival is a view property, not a reason to delete an old link.
   if(reader.archived!==Boolean(npc.archived)){
    reader.archived=Boolean(npc.archived);changed=true;
   }
   if(reader.novelTitle!==story.title&&typeof story.title==='string'){
    reader.novelTitle=story.title;changed=true;
   }
   if(changed)updated++;
  }
  return updated;
 }
 function hiddenKey(uid,storyId,sandbox){
  if(!valid(uid)||!valid(storyId))return null;
  return (sandbox?'dudu-sandbox-v43:':'dudu-v43:')+
   'hidden-npc:'+encodeURIComponent(uid)+':'+encodeURIComponent(storyId);
 }
 function readHidden(storage,uid,storyId,sandbox){
  const key=hiddenKey(uid,storyId,sandbox);
  if(!key||!storage)return [];
  try{
   const value=JSON.parse(storage.getItem(key)||'[]');
   if(!Array.isArray(value))return [];
   return [...new Set(value.filter(valid))].slice(0,250);
  }catch(_){return [];}
 }
 function toggleHidden(storage,uid,storyId,npcId,sandbox,hidden){
  const key=hiddenKey(uid,storyId,sandbox);
  if(!key||!valid(npcId)||!storage||typeof hidden!=='boolean')return false;
  const next=readHidden(storage,uid,storyId,sandbox).filter(id=>id!==npcId);
  if(hidden)next.push(npcId);
  if(next.length>250)return false;
  try{
   if(next.length)storage.setItem(key,JSON.stringify(next));
   else storage.removeItem(key);
   return true;
  }catch(_){return false;}
 }
 function visibleContact(npc,hiddenIds,view){
  if(!npc||!valid(npc.id))return false;
  const hidden=Array.isArray(hiddenIds)&&hiddenIds.includes(npc.id);
  const archived=npc.archived===true;
  if(view==='hidden')return hidden||archived;
  if(view==='recent'||view==='all')return !hidden&&!archived;
  return false;
 }
 return Object.freeze({CANONICAL_FIELDS,updateLinked,hiddenKey,readHidden,
  toggleHidden,visibleContact});
});
