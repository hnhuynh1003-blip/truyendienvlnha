/* V43.5.2: safe read-only public item index for known stories/chapters.
 * A definition in the publicly readable story library is NOT an owned item
 * or a release/award. Avoid previewing chapter-linked names before reading.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduStoryMarketV43=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ranks=new Set(['F','E','D','C','B','A','S','SS','SSS']);
 const types=new Set(['FOOD','ITEM','WEAPON']);
 const methods=Object.freeze({
  COLLECTION_ONLY:'Sưu tập / kỷ niệm',
  STORY_EVENT:'Sự kiện truyện',
  CHAPTER_EVENT:'Sự kiện chương'
 });
 const validId=s=>typeof s==='string'&&s.length>0&&s.length<=160;
 function availableStory(stories,storyId){
  return Array.isArray(stories)?stories.find(x=>x?.id===storyId)||null:null;
 }
 function index({stories=[],storyId=null,readRewards={}}={}){
  const story=availableStory(stories,storyId);
  if(!story||!Array.isArray(story.specialItems))return {story:null,items:[],hidden:0};
  const chapters=Array.isArray(story.chapters)?story.chapters:[];
  const read=(readRewards&&typeof readRewards==='object'&&!Array.isArray(readRewards))?
    readRewards:{};
  const seen=new Set(),items=[];let hidden=0;
  for(const record of story.specialItems.slice(0,500)){
   if(!record||typeof record!=='object'||record.archived===true||
      record.published!==true||record.storyId!==story.id||
      !validId(record.id)||seen.has(record.id)||
      !ranks.has(record.rank)||!types.has(record.type)||
      !Object.hasOwn(methods,record.acquisition?.method))continue;
   seen.add(record.id);
   const chapterIndex=record.chapterId===null||record.chapterId===undefined?
     -1:chapters.findIndex(ch=>ch?.id===record.chapterId);
   const scope=record.scope;
   if(scope==='CHAPTER'&&chapterIndex<0)continue;
   if(scope==='STORY'&&record.chapterId!=null)continue;
   if(scope!=='STORY'&&scope!=='CHAPTER')continue;
   // A chapter item or a story item bound to future chapter(s) is shown
   // only after the reader has visited at least one relevant chapter.
   const relatedIndexes=scope==='CHAPTER'?[chapterIndex]:
     chapters.map((ch,i)=>Array.isArray(ch?.storyItemIds)&&
       ch.storyItemIds.includes(record.id)?i:-1).filter(i=>i>=0);
   const visit=(i)=>read[story.id+'_'+(chapters[i]?.id||i)]===true;
   if(relatedIndexes.length&&!relatedIndexes.some(visit)){
    hidden++;continue;
   }
   const id=record.id;
   items.push(Object.freeze({id,itemId:id,name:String(record.name||'Vật phẩm').slice(0,80),
     desc:String(record.desc||record.description||'').slice(0,240),
     icon:typeof record.icon==='string'?record.icon.slice(0,12):'🎁',
     rank:record.rank,type:record.type,scope,storyId:story.id,
     chapterId:scope==='CHAPTER'?record.chapterId:null,
     method:record.acquisition.method,sourceLabel:methods[record.acquisition.method],
     storyTitle:String(story.title||'Tác phẩm').slice(0,90),
     chapterTitle:scope==='CHAPTER'?String(chapters[chapterIndex]?.title||'Chương').slice(0,90):null,
     npcId:validId(record.npcId)?record.npcId:null,
     forSale:false,verified:false,claimable:false}));
  }
  return Object.freeze({story:Object.freeze({id:story.id,
    title:String(story.title||'Tác phẩm').slice(0,90)}),
    items:Object.freeze(items),hidden});
 }
 function options(stories=[]){
  if(!Array.isArray(stories))return [];
  const ids=new Set();
  return stories.filter(s=>{
   if(!validId(s?.id)||ids.has(s.id))return false;ids.add(s.id);return true;
  }).map(s=>({id:s.id,title:String(s.title||'Tác phẩm').slice(0,90)}));
 }
 return Object.freeze({index,options});
});
