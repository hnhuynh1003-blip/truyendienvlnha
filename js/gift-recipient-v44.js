/* V44.0: reader-safe destination descriptions only.
 * A public story's editable author fields, display name and browser profile
 * do NOT prove recipient ownership. No gift crosses accounts in this module.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduGiftRecipientV44=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MODES=Object.freeze({
  STORY_SANDBOX:'STORY_SANDBOX',
  AUTHOR:'AUTHOR',CHAPTER:'CHAPTER',NPC:'NPC'
 });
 function preview(story,mode=MODES.STORY_SANDBOX){
  if(!story||typeof story.id!=='string'||!story.id)
   return Object.freeze({enabled:false,mode,reason:'story-unavailable',
    title:'Chưa chọn được truyện'});
  if(mode===MODES.STORY_SANDBOX)return Object.freeze({
    enabled:true,mode,storyId:story.id,
    title:'Ủng hộ truyện · nhật ký Sandbox',
    description:'Chỉ lưu lời nhắn trên thiết bị của bạn. Quà không đến tác giả, không hiển thị trong bình luận công khai.',
    delivered:false,verified:false
  });
  if(mode===MODES.AUTHOR)return Object.freeze({
    enabled:false,mode,storyId:story.id,title:'Tặng tác giả · chưa mở',
    description:'Cần liên kết tác giả với Firebase UID đã xác minh và sổ vật phẩm máy chủ; không dựa vào tên hiển thị hay vai trò tự chọn.',
    delivered:false,verified:false,reason:'author-server-binding-required'
  });
  return Object.freeze({enabled:false,mode,storyId:story.id,
    title:'Chưa mở chuyển quyền sở hữu',
    description:'Cần quy trình máy chủ phù hợp với loại người nhận.',
    delivered:false,verified:false,reason:'destination-unavailable'});
 }
 function label(entry){
  if(!entry||entry.action!=='GIFT')return '';
  return entry.recipientKind==='STORY_SANDBOX'||
   entry.recipientKind===undefined?
   'Thiệp ủng hộ · chỉ lưu Sandbox':'Chờ xác minh người nhận';
 }
 return Object.freeze({MODES,preview,label});
});
