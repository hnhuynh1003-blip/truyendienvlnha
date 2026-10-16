/* DUDU Studio author's story/chapter collectibles v1.
 * Pure schema/validation only. NO RNG, NO rewards, NO Firebase requests.
 * Author definitions are part of the PUBLIC story library on the current
 * architecture; never store future-plot spoilers or unpublished secrets here.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduAuthorItems=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const RANKS=['F','E','D','C','B','A','S','SS','SSS'];
  const TYPES=['ITEM','FOOD','WEAPON'];
  const METHODS=['COLLECTION_ONLY','STORY_EVENT','CHAPTER_EVENT'];
  function str(value,max){
    return typeof value==='string'?value.trim().slice(0,max):'';
  }
  function normalize(input,{story,chapterId=null,previous=null}={}){
    if(!story||typeof story.id!=='string'||!story.id)throw Error('Không tìm thấy ID truyện.');
    if(!Array.isArray(story.characters)||!Array.isArray(story.chapters))throw Error('Dữ liệu truyện chưa hợp lệ.');
    if(chapterId!==null&&!story.chapters.some(ch=>ch.id===chapterId))
      throw Error('Chương chưa có ID hợp lệ. Hãy lưu chương trước.');
    const name=str(input?.name,70),description=str(input?.desc,240);
    const icon=str(input?.icon,12)||'🎁',rank=input?.rank,type=input?.type;
    if(!name)throw Error('Tên vật phẩm không được để trống.');
    if(!description)throw Error('Hãy nhập mô tả ngắn cho vật phẩm.');
    if(!RANKS.includes(rank))throw Error('Phẩm cấp không hợp lệ.');
    if(!TYPES.includes(type))throw Error('Loại vật phẩm không hợp lệ.');
    const npcId=input?.npcId||null;
    if(npcId!==null&&!story.characters.some(c=>c.id===npcId))
      throw Error('NPC không thuộc truyện này.');
    const method=input?.method||'COLLECTION_ONLY';
    if(!METHODS.includes(method))throw Error('Cách nhận vật phẩm chưa hợp lệ.');
    if(method==='CHAPTER_EVENT'&&chapterId===null)
      throw Error('Vật phẩm chương phải được gán vào một chương đã lưu.');
    const reserved=previous?.id;
    // Previously generated IDs are immutable; never accept arbitrary user-entered IDs.
    const id=reserved||('author-item-'+(typeof crypto!=='undefined'&&crypto.randomUUID?
      crypto.randomUUID() : Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)));
    const unique=input?.unique!==false;
    const giftable=input?.giftable===true;
    const scope=chapterId===null?'STORY':'CHAPTER';
    return {
      id,itemId:id,name,rank,type,icon,desc:description,description,
      scope,storyId:story.id,chapterId,npcId,
      // No author-defined collectibles can enter global/realm RNG.
      acquisition:{method}, unique,maxOwned:unique?1:null,
      giftable,tradeable:false,discardable:!unique,
      published:true,archived:previous?.archived||false,
      schemaVersion:2
    };
  }
  function validateCollection(story){
    const errors=[],ids=new Set();
    for(const item of Array.isArray(story?.specialItems)?story.specialItems:[]){
      if(!item||typeof item!=='object'){errors.push('Invalid item');continue;}
      if(!item.id||ids.has(item.id))errors.push('Duplicate/empty author item ID');
      ids.add(item.id);
      if(item.storyId!==story.id)errors.push('Wrong story '+item.id);
      if(item.scope==='CHAPTER'&&!story.chapters.some(ch=>ch.id===item.chapterId))errors.push('Missing chapter '+item.id);
      if(item.npcId&&!story.characters.some(c=>c.id===item.npcId))errors.push('Missing NPC '+item.id);
      if(!RANKS.includes(item.rank)||!TYPES.includes(item.type))errors.push('Bad rank/type '+item.id);
      if(!METHODS.includes(item.acquisition?.method))errors.push('Bad acquisition '+item.id);
      if(item.acquisition?.method==='RANDOM')errors.push('Unexpected random item '+item.id);
    }
    return errors;
  }
  function addOrEdit(story,input,{chapterId=null,itemId=null}={}){
    const existing=(story.specialItems||[]).find(x=>x.id===itemId);
    if(itemId&&!existing)throw Error('Vật phẩm cần sửa không còn tồn tại.');
    if(existing){
      if(existing.storyId!==story.id||existing.chapterId!==chapterId)
        throw Error('Không thể chuyển vật phẩm giữa truyện/chương bằng thao tác sửa.');
    }
    const record=normalize(input,{story,chapterId,previous:existing||null});
    // Avoid claiming a code-defined common/realm/DUDU ID as author-owned.
    if(!existing&&typeof window!=='undefined'&&window.DuduItemCatalog?.byId(record.id))
      throw Error('ID vật phẩm đã tồn tại.');
    if(!Array.isArray(story.specialItems))story.specialItems=[];
    if(existing)story.specialItems[story.specialItems.indexOf(existing)]=record;
    else story.specialItems.push(record);
    return record;
  }
  function archive(story,itemId){
    const item=(story.specialItems||[]).find(x=>x.id===itemId);
    if(!item)return false;
    item.archived=true;
    // Archived metadata remains for old inventory owners, but cannot be awarded later.
    return true;
  }
  function list(story,{chapterId=null,includeArchived=false}={}){
    return (story?.specialItems||[]).filter(x=>x?.storyId===story?.id
      && x.chapterId===chapterId && (includeArchived||!x.archived));
  }
  return Object.freeze({RANKS:Object.freeze(RANKS),TYPES:Object.freeze(TYPES),
    METHODS:Object.freeze(METHODS),normalize,validateCollection,addOrEdit,archive,list});
});
