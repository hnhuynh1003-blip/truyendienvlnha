/* C4.16 — Honest, account-safe error copy for personal Firestore actions.
 * Do not expose tokens, UIDs or raw server messages in the player UI.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduPersonalErrorC416=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function message(error,fallback='Giao dịch chưa được xác nhận. Hãy thử lại đúng thao tác.'){
  const code=error?.code||'';
  const reason=error?.reason||'';
  const details=String(error?.message||'');
  if(code==='permission-denied'||/missing or insufficient permissions/i.test(details))
   return 'Firebase từ chối quyền ghi hồ sơ (403). Cần kiểm tra Firestore Rules đang Published; chưa xác nhận thay đổi Xu hoặc Kho.';
  if(code==='unauthenticated'||reason==='invalid-account')
   return 'Phiên đăng nhập chưa hợp lệ. Hãy đăng nhập lại đúng tài khoản.';
  if(reason==='profile-missing'||/tài khoản chưa có hồ sơ trên máy chủ/i.test(details))
   return 'Hồ sơ chưa được tạo trên máy chủ. Hãy đăng nhập lại để khởi tạo hồ sơ, rồi thử thao tác này.';
  if(code==='unavailable'||code==='deadline-exceeded'||code==='cancelled')
   return 'Chưa nhận được phản hồi chắc chắn từ Firebase. Kiểm tra kết nối rồi thử lại đúng thao tác; không đổi món khi đang chờ đơn.';
  if(/không đủ xu/i.test(details))return 'Ví Xu không đủ để mua món này.';
  if(/kho đã đầy/i.test(details))return 'Kho đã đầy 500 món. Hãy dọn chỗ trước khi nhận thêm vật phẩm.';
  return fallback;
 }
 return Object.freeze({message});
});
