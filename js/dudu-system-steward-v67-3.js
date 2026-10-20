/* DUDU V67.3 System Steward: read-only knowledge and intent routing.
 * Important: client UI can explain available features, never certify pact,
 * rank, mission assignment, balances, rewards, or account entitlements.
 * No AI call, storage, Firebase write, network or privileged tool calls.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduSystemStewardV673=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const normalize=v=>String(v||'').normalize('NFD')
   .replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d')
   .toLowerCase().replace(/\s+/g,' ').trim();
 const topicRules=Object.freeze([
   ['pact',/(khe uoc|kh[eê] uoc|giao uoc|ky ket|ky hop dong|ky contract|hop dong he thong)/],
   ['progress',/(thang cap|cap he thong|cap bac|exp|kinh nghiem|len cap|rank|xep hang|thanh tich he thong)/],
   ['mission',/(nhiem vu|pho ban|quest|f\/e|cap f|cap e|nhiem vu so cap|nhiem vu ngau nhien)/],
   ['world',/(van gioi|the gioi|co dai|hien dai|nien dai|tu tien|mat the|tuong lai|chu de truyen)/],
   ['wallet',/(so du|vi xu|tien xu|bao nhieu xu|kiem tra xu|tai san|qua thuong|nhan thuong|cong xu|tang xu|phat xu|\bxu\b)/],
   ['account',/(tai khoan|dang nhap|firebase|ho so|dang xuat|uid|quyen tac gia)/],
   ['system',/(he thong|dudu co the|dudu lam gi|tinh nang|trang thai|cong cu|giup do)/]
 ]);
 function intent(input){
   const text=normalize(input);
   if(!text)return null;
   for(const [name,re] of topicRules)if(re.test(text))return name;
   return null;
 }
 function account(){
   const sandbox=typeof IS_SANDBOX_MODE!=='undefined'&&IS_SANDBOX_MODE===true;
   const current=typeof currentUsername==='string'?currentUsername:'';
   if(sandbox)return Object.freeze({status:current?'sandbox':'guest',verified:false});
   const auth=root?.DuduAuth;
   let userId='',ready=false;
   try{userId=String(auth?.uid?.()||'');ready=auth?.isReady?.()===true;}catch(_){}
   const verified=!!userId&&ready&&current===userId;
   return Object.freeze({status:verified?'verified':userId?'loading':'guest',verified});
 }
 function catalog(){
   const tax=root?.DuduWorldTaxonomyV66;
   if(!tax||!Array.isArray(tax.genres)||!Array.isArray(tax.missions))
     return Object.freeze({status:'unavailable',genres:[],total:0,f:0,e:0});
   const genres=tax.genres.filter(g=>typeof g.name==='string').map(g=>g.name);
   const missions=tax.missions.filter(m=>m?.status==='seed'&&m.available===false);
   return Object.freeze({
     status:'preview',genres:Object.freeze(genres),
     total:missions.length,f:missions.filter(m=>m.tier==='F').length,
     e:missions.filter(m=>m.tier==='E').length
   });
 }
 function snapshot(){
   return Object.freeze({
     account:account(),
     catalog:catalog(),
     pact:Object.freeze({status:'not_launched',verified:false}),
     progression:Object.freeze({status:'not_launched',systemRank:null,systemExp:null}),
     assignments:Object.freeze({status:'not_launched',active:null}),
     rewards:Object.freeze({status:'unavailable',serverVerified:false}),
     ai:Object.freeze({status:'scripted',purpose:'steward-not-authorized'})
   });
 }
 function response(question,{legacyReply=null,titles=[]}={}){
   const target=intent(question);
   if(!target)return null; // Existing V43 companion handles small-talk/reading tips.
   const facts=snapshot(),c=facts.catalog;
   const intro='Tớ là DUDU, người hướng dẫn của hệ thống. ';
   if(target==='pact'){
     return intro+'Đầu tiên cậu cần hoàn thành nhiệm vụ mở đầu trong ứng dụng Nhiệm vụ. '
       +'Chỉ khi máy chủ xác minh và cấp Thẻ thông hành, cậu mới có thể xin ký khế ước với hệ thống con. '
       +'Sau khế ước mới mở xuyên truyện, kỹ năng và nâng cấp. '
       +'Hiện chưa có dịch vụ phát thẻ và ký khế ước thật, tớ chưa thể ký thay cậu.';
   }
   if(target==='progress'){
     return 'Cấp hệ thống và cấp nhiệm vụ là hai thứ khác nhau. F/E là nhóm nhiệm vụ sơ cấp; '
       +'thăng cấp phải dựa trên kết quả được máy chủ xác nhận. '
       +'Hiện chưa có dịch vụ tiến trình hệ thống để tớ đọc cấp hoặc EXP thật. '
       +'Chỉ số cấp nhân vật đang hiển thị trong Hồ sơ không tự động là cấp xuyên giới.';
   }
   if(target==='mission'){
     return c.status==='preview'
       ?'Kho tín hiệu hiện có '+c.total+' ý tưởng phó bản sơ cấp ('+c.f+' cấp F, '
        +c.e+' cấp E) để xem trước. Chúng chưa được xuất bản thành nhiệm vụ chơi thật. '
        +'Khi hoàn thiện khế ước và bộ máy nhiệm vụ, hệ thống mới được phân phối phó bản đủ điều kiện và xác thực kết quả.'
       :'Bộ điều phối nhiệm vụ chưa được triển khai. Tớ chưa có phó bản thật để giao, '
        +'và không thể tự cộng kinh nghiệm hoặc xác nhận hoàn thành.';
   }
   if(target==='world'){
     return c.status==='preview'
       ?'Vạn Giới hiện chia thành '+c.genres.length+' nhóm lớn: '+c.genres.join(', ')
        +'. Mỗi nhóm có nhiều hạt nhân phó bản F/E. '
        +'Đây là kho ý tưởng xem trước, không phải cổng xuyên giới đã mở.'
       :'Tớ chưa tải được danh mục Vạn Giới. Điều đó không có nghĩa một thế giới đã mở khóa.';
   }
   if(target==='wallet'){
     return 'Xu, vật phẩm và phần thưởng thật cần nguồn xác minh từ máy chủ. '
       +'Tớ chưa có quyền kiểm tra số dư trực tiếp trong cuộc trò chuyện này. '
       +'Cậu có thể vào Cửa hàng hoặc Kho để xem mục tài sản máy chủ nếu dịch vụ đã được bật. '
       +'Tớ không tự cộng Xu, trao vật phẩm hay xác nhận giao dịch bằng lời nhắn.';
   }
   if(target==='account'){
     const status=facts.account.status;
     return status==='verified'
       ?'Tài khoản Firebase và hồ sơ hiện đã báo sẵn sàng trên thiết bị này. '
        +'Thông tin khế ước, cấp xuyên giới và phần thưởng vẫn chưa có dịch vụ xác minh riêng.'
       :status==='sandbox'
        ?'Cậu đang ở chế độ Sandbox, dữ liệu thử nghiệm không đại diện cho quyền và vật phẩm thật.'
        :status==='loading'
         ?'Firebase đã có phiên đăng nhập nhưng hồ sơ chưa được xác nhận tải xong. '
          +'Tớ sẽ không xem đây là tài khoản đã sẵn sàng để nhận nhiệm vụ.'
         :'Hiện chưa có hồ sơ Firebase được xác minh. Cậu có thể mở Hồ sơ để đăng nhập hoặc kiểm tra trạng thái tài khoản.';
   }
   if(target==='system'){
     return intro+'Tớ có thể giải thích kho Vạn Giới, nhiệm vụ F/E, khế ước và hướng dẫn cậu dùng Cyber Phone. '
       +'Đang ở giai đoạn xây dựng nên tớ chỉ tra cứu thông tin công khai, không điều khiển cấp bậc, nhiệm vụ, tiền hay NPC. '
       +'Những thao tác có tác động sẽ cần máy chủ xác nhận riêng.';
   }
   return null;
 }
 const allowedViews=Object.freeze({
   worlds:Object.freeze({id:'worlds',label:'Xem Vạn Giới'}),
   quests:Object.freeze({id:'quests',label:'Mở Nhiệm vụ'}),
   system:Object.freeze({id:'system',label:'Xem Hệ Thống'}),
   shop:Object.freeze({id:'shop',label:'Xem Cửa hàng'}),
   profile:Object.freeze({id:'profile',label:'Mở Hồ sơ'})
 });
 function suggestedAction(question){
   const topic=intent(question);
   if(topic==='world')return allowedViews.worlds;
   if(topic==='mission')return allowedViews.quests;
   if(topic==='pact'||topic==='progress')return allowedViews.system;
   if(topic==='wallet')return allowedViews.shop;
   if(topic==='account')return allowedViews.profile;
   return null;
 }
 function openSafeView(id){
   // Invoked only by an explicit UI click. Never derived from LLM output.
   // These are NAVIGATION ONLY: no quest/reward/pact backend actions.
   if(!Object.prototype.hasOwnProperty.call(allowedViews,id))return false;
   if(id==='worlds'){
     if(typeof root?.DuduSiteV60?.navigate!=='function')return false;
     root.DuduSiteV60.navigate('worlds');
     if(root?.document?.getElementById('cyber-phone')?.style.display==='flex'){
       root.DuduCompanionV43?.hide?.();
       root.togglePhone?.();
     }
     return true;
   }
   const panelId=['shop','quests','system'].includes(id)?id:'profile';
   if(typeof root?.openPhoneApp!=='function')return false;
   root.openPhoneApp(panelId);
   return true;
 }
 const api=Object.freeze({
   version:3,intent,snapshot,reply:response,suggestedAction,openSafeView,
   capabilities:Object.freeze([
     'public_world_catalog','mission_previews','pact_explanation',
     'progression_explanation','account_readiness','wallet_guidance'
   ]),
   canSignPact:()=>false,
   canAssignMission:()=>false,
   canGrantReward:()=>false
 });
 return api;
});
