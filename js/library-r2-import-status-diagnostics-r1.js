/* DUDU Studio — R2 pending-import status diagnostics (read-only).
 * Errors are intentionally coarse: no JWT, UID, bookId, revisionId or body data.
 * Never authorize clearing the local pending record from an error response.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DuduR2ImportStatusDiagnosticR1=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const fixed=Object.freeze({
    401:'Worker từ chối phiên Firebase. Kiểm tra đăng nhập/quyền tác giả.',
    403:'Worker từ chối quyền truy cập phiên nhập. Không xóa dấu phiên.',
    404:'Không thấy endpoint hoặc sách tại URL kiểm tra. Không suy ra truyện chưa đăng.',
    405:'Worker không chấp nhận GET trạng thái ở endpoint này.',
    409:'Worker báo xung đột trạng thái. Cần đối soát phía máy chủ.',
    429:'Worker giới hạn tần suất. Không thử đăng lại.'
  });
  function classify(status){
    if(!Number.isInteger(status)||status<100||status>599)
      return Object.freeze({code:'NETWORK',message:'Không nhận được phản hồi HTTP từ Worker. Giữ nguyên phiên nhập.'});
    const msg=fixed[status]||(status>=500
      ?'Worker hoặc dịch vụ phụ thuộc đang lỗi. Giữ nguyên phiên nhập.'
      :'Không có xác nhận published hợp lệ. Giữ nguyên phiên nhập.');
    return Object.freeze({code:'HTTP_'+status,
      message:'Không lấy được trạng thái (HTTP '+status+'). '+msg});
  }
  return Object.freeze({classify});
});
