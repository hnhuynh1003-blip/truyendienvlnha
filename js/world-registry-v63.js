/* DUDU World Atlas V63. Display-only registry: never grants access, rewards or account state.
 * Keep immutable worldId stable when attaching approved storyPromptId / scenarioId later.
 * Story/NPC links stay intentionally empty until verified and explicitly connected.
 */
(function(){
 'use strict';
 const starters=[
  {worldId:'dudu-w001',name:'Thị trấn Sương Mai',tier:'F',symbol:'⌂',kind:'Đời thường · khám phá',teaser:'Một thị trấn yên bình với những lời đồn chưa có lời giải.',tone:'mist',status:'planned'},
  {worldId:'dudu-w002',name:'Học viện Tinh Vân',tier:'F',symbol:'✧',kind:'Học đường · kỳ ảo',teaser:'Những lớp học bình thường che giấu các quy tắc kỳ lạ.',tone:'star',status:'planned'},
  {worldId:'dudu-w003',name:'Rừng Vọng Nguyệt',tier:'F',symbol:'☾',kind:'Thiên nhiên · bí ẩn',teaser:'Lối mòn đổi hướng khi trăng lên trên tán lá.',tone:'forest',status:'planned'},
  {worldId:'dudu-w004',name:'Cảng Lam Phong',tier:'E',symbol:'≈',kind:'Thám hiểm · hải trình',teaser:'Một bến cảng nhỏ nơi các chuyến tàu mang theo bí mật.',tone:'sea',status:'planned'},
  {worldId:'dudu-w005',name:'Phố Đèn Lạc',tier:'E',symbol:'◇',kind:'Đô thị · điều tra',teaser:'Các biển hiệu thắp sáng những con đường chỉ xuất hiện về đêm.',tone:'city',status:'planned'},
  {worldId:'dudu-w006',name:'Phế Tích Đồng Hồ',tier:'E',symbol:'◷',kind:'Di tích · giải đố',teaser:'Tàn tích cổ giữ lại dấu vết của một thời khắc bị quên.',tone:'clock',status:'planned'}
 ];
 const unknown=[
  {worldId:'dudu-u001',name:'Tọa độ Vô Danh',symbol:'?',signal:'Chưa xác định điểm đến',status:'unverified'},
  {worldId:'dudu-u002',name:'Vùng Nhiễu Sương',symbol:'?',signal:'Thông số thế giới không ổn định',status:'unverified'},
  {worldId:'dudu-u003',name:'Cổng Ngoài Bản Đồ',symbol:'?',signal:'Chưa đủ dữ liệu kiểm chứng',status:'unverified'}
 ];
 const frozen=rows=>Object.freeze(rows.map(item=>Object.freeze({
   ...item,storyPromptId:null,scenarioId:null,storyId:null,npcIds:Object.freeze([])
 })));
 window.DuduWorldRegistryV63=Object.freeze({
   version:1,starterWorlds:frozen(starters),unverifiedWorlds:frozen(unknown)
 });
})();
