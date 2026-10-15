/* DUDU Studio NPC editorial lifecycle.
 * Archive, don't erase permanent NPC IDs; existing chapters, item references,
 * soul unlocks and reader chats must remain readable after an author hides one.
 * Pure helper: no Firebase writes, item grants or player-memory mutation.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduNpcEditor=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function usage(story,npcId){
    const chapters=(story?.chapters||[]).filter(ch=>Array.isArray(ch?.characterIds)&&ch.characterIds.includes(npcId));
    const publicItems=(story?.specialItems||[]).filter(item=>item?.npcId===npcId);
    return Object.freeze({chapterCount:chapters.length,itemCount:publicItems.length,
      chapterIds:chapters.map(ch=>ch.id).filter(Boolean),
      itemIds:publicItems.map(item=>item.id).filter(Boolean)});
  }
  function archive(story,npcId){
    const npc=(story?.characters||[]).find(c=>c?.id===npcId);
    if(!npc)return null;
    npc.archived=true; // preserve ID, chapter links and public item bindings.
    return npc;
  }
  function restore(story,npcId){
    const npc=(story?.characters||[]).find(c=>c?.id===npcId);
    if(!npc)return null;
    npc.archived=false;
    return npc;
  }
  function visible(story,selectedIds=[],expanded=false,query=''){
    const selected=new Set(selectedIds);
    const q=(query||'').trim().toLocaleLowerCase('vi');
    return (story?.characters||[]).filter(c=>{
      if(!c?.id)return false;
      const picked=selected.has(c.id);
      // Existing archived NPCs remain visible only if already selected;
      // they cannot be newly linked until explicitly restored.
      if(c.archived&&!picked)return false;
      if(!expanded&&!q&&!picked)return false;
      if(q&&!([c.name||'',...(Array.isArray(c.aliases)?c.aliases:[])]
          .join(' ').toLocaleLowerCase('vi').includes(q)))return false;
      return true;
    });
  }
  function activeCount(story){
    return (story?.characters||[]).filter(c=>c?.id&&!c.archived).length;
  }
  return Object.freeze({usage,archive,restore,visible,activeCount});
});
