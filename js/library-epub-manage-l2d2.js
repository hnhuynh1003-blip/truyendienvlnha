/* L2D.2/C4.22: owner EPUB metadata, reversible unlisting and a separate,
 * archive-first, confirmed permanent deletion with retry after interruption.
 * Firestore Rules remain the authority; never delete on view/close/unlist.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DuduLibraryEpubManageL2D2=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const MAX_IMAGE=10*1024*1024;
 async function coverThumbnail(file){
  if(!file||!/^image\/(?:png|jpe?g|webp)$/i.test(file.type)||file.size>MAX_IMAGE)
   throw Error('Chọn ảnh PNG/JPEG/WebP dung lượng tối đa 10 MB');
  const objectUrl=URL.createObjectURL(file);
  try{
   const image=new Image();
   await new Promise((resolve,reject)=>{
    image.onload=resolve;image.onerror=()=>reject(Error('Không đọc được ảnh bìa'));
    image.src=objectUrl;
   });
   if(!image.naturalWidth||!image.naturalHeight)throw Error('Ảnh bìa không hợp lệ');
   for(const width of [300,250,210,170,130]){
    const scale=Math.min(1,width/image.naturalWidth);
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(image.naturalWidth*scale);
    canvas.height=Math.round(image.naturalHeight*scale);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.75,.62,.5]){
     const value=canvas.toDataURL('image/jpeg',quality);
     if(value.length<32000)return value;
    }
   }
   throw Error('Không thể nén ảnh bìa dưới giới hạn an toàn');
  }finally{URL.revokeObjectURL(objectUrl);}
 }

 function create({enabled=false,cloudApi,db,auth,canEdit,uid,refresh,onUnlisted=()=>{}}={}){
  let editing=null,busy=false;
  const id=value=>root?.document?.getElementById(value);
  const notice=(target,value,isError=false)=>{
   const el=id(target);if(!el)return;
   el.textContent=value;el.dataset.error=String(isError);
  };
  const available=()=>enabled&&typeof canEdit==='function'&&canEdit()&&
   auth?.()?.currentUser?.uid&&uid?.()===auth().currentUser.uid;
  const owns=book=>!!(available()&&book?._cloudV49&&book._ownerUidV49===uid());
  const options=()=>({db:db(),auth:auth()});
  const getField=name=>id('epub-manage-'+name);

  function openEditor(book){
   if(!owns(book)||busy)return false;
   editing={id:book.id,hadDesc:!!String(book.desc||''),cover:book.coverImage||''};
   for(const [field,value] of Object.entries({title:book.title,author:book.author,
    genre:book.genre,desc:book.desc,status:book.status})){
    getField(field).value=value||'';
   }
   getField('cover-file').value='';
   getField('remove-cover').checked=false;
   notice('epub-manage-feedback',book.desc?'':
    'EPUB cũ có thể lưu văn án ở chương riêng. Để trống nếu muốn giữ nguyên.');
   id('epub-manage-modal').style.display='flex';
   getField('title').focus();
   return true;
  }
  function closeEditor(){
   if(busy)return false;
   id('epub-manage-modal').style.display='none';editing=null;
   return true;
  }
  async function save(){
   if(!editing||!available()||busy)return false;
   const before=editing;
   busy=true;
   const button=id('epub-manage-save');if(button)button.disabled=true;
   notice('epub-manage-feedback','Đang kiểm tra và lưu thông tin…');
   try{
    const metadata={title:getField('title').value,author:getField('author').value,
     genre:getField('genre').value,publicationState:getField('status').value};
    const description=getField('desc').value;
    if(before.hadDesc||description.trim())metadata.desc=description;
    const file=getField('cover-file').files?.[0];
    if(file)metadata.coverImage=await coverThumbnail(file);
    else if(getField('remove-cover').checked)metadata.coverImage='';
    if(!available()||editing!==before)throw Error('Phiên tác giả đã thay đổi');
    await cloudApi.updatePublishedMetadata(before.id,{...options(),metadata});
    await refresh();
    id('epub-manage-modal').style.display='none';editing=null;
    return true;
   }catch(error){
    notice('epub-manage-feedback',error?.code==='permission-denied'?
     'Quyền sửa EPUB chưa được Firebase cho phép. Không có dữ liệu nào được lưu.':
     String(error?.message||'Không lưu được thông tin'),true);
    return false;
   }finally{busy=false;if(button)button.disabled=false;}
  }
  async function unlist(book){
   if(!owns(book)||busy)return false;
   if(!root.confirm('Gỡ "'+book.title+'" khỏi Thư viện công khai? '+
    'Toàn bộ chương và ID truyện vẫn được giữ để khôi phục.'))return false;
   busy=true;
   try{
    await cloudApi.setArchived(book.id,true,options());
    await refresh();
    onUnlisted();
    return true;
   }catch(error){
    root.alert(error?.code==='permission-denied'?
     'Firebase chưa cho phép gỡ EPUB. Dữ liệu vẫn nguyên vẹn.':
     String(error?.message||'Không thể gỡ EPUB'));
    return false;
   }finally{busy=false;}
  }
  async function showArchive(){
   if(!available()||busy)return false;
   id('epub-archive-modal').style.display='flex';
   const host=id('epub-archive-list');host.replaceChildren();
   notice('epub-archive-feedback','Đang tải tác phẩm đã gỡ…');
   try{
    const books=await cloudApi.archivedBooks(db(),auth());
    if(!available())throw Error('Phiên tác giả đã thay đổi');
    notice('epub-archive-feedback',books.length?'':'Chưa có tác phẩm EPUB nào được gỡ.');
    for(const book of books){
     const item=root.document.createElement('div');item.className='epub-archive-item';
     const copy=root.document.createElement('div');
     const title=root.document.createElement('strong');title.textContent=book.title;
     const meta=root.document.createElement('small');
     meta.textContent=book.chapterCount+' chương · '+book.publicationState+
      (book.status==='deleting'?' · Đang xóa dở':'');
     copy.append(title,meta);
     const controls=root.document.createElement('div');
     controls.className='epub-archive-controls';
     const restore=root.document.createElement('button');
     restore.type='button';restore.className='btn';restore.textContent='Khôi phục';
     restore.hidden=book.status==='deleting';
     restore.addEventListener('click',async()=>{
      if(!available()||busy||book.status!=='archived')return;
      busy=true;restore.disabled=true;
      notice('epub-archive-feedback','Đang khôi phục '+book.title+'…');
      try{
       await cloudApi.setArchived(book.id,false,options());
       await refresh();
       item.remove();
       notice('epub-archive-feedback','Đã khôi phục tác phẩm vào Thư viện.');
      }catch(error){
       notice('epub-archive-feedback',String(error?.message||'Không thể khôi phục'),true);
      }finally{busy=false;restore.disabled=false;}
     });
     const destroy=root.document.createElement('button');
     destroy.type='button';destroy.className='btn epub-archive-delete';
     destroy.textContent=book.status==='deleting'?'Tiếp tục xóa dở':'Xóa vĩnh viễn';
     destroy.addEventListener('click',async()=>{
      if(!available()||busy||!['archived','deleting'].includes(book.status))return;
      const typed=root.prompt('XÓA VĨNH VIỄN sẽ xóa truyện cùng tất cả chương và lịch sử sửa, KHÔNG THỂ KHÔI PHỤC.\n'+
       'Hãy nhập ĐÚNG tên tác phẩm để tiếp tục:\n'+book.title);
      if(typed!==book.title){
       if(typed!==null)notice('epub-archive-feedback','Tên xác nhận chưa đúng, chưa xóa gì.',true);
       return;
      }
      if(!root.confirm('Xác nhận lần cuối: xóa vĩnh viễn "'+book.title+'" và '+
       book.chapterCount+' chương khỏi Firebase?'))return;
      busy=true;restore.disabled=true;destroy.disabled=true;
      notice('epub-archive-feedback','Đang xóa an toàn "'+book.title+'"…');
      try{
       const outcome=await cloudApi.purgeArchived(book.id,{
        ...options(),confirmed:true,
        onProgress:progress=>notice('epub-archive-feedback',
         'Đang dọn "'+book.title+'": '+progress.chapters+' chương, '+
         progress.revisions+' bản sửa đã xóa. Đừng đóng trang.')
       });
       await refresh();
       item.remove();
       notice('epub-archive-feedback','Đã xóa vĩnh viễn "'+book.title+'" ('+
        outcome.chapters+' chương, '+outcome.revisions+' bản sửa).');
      }catch(error){
       notice('epub-archive-feedback',error?.code==='permission-denied'?
        'Firebase chưa cấp quyền xóa EPUB. Cần kiểm tra và triển khai Rules C4.22 đã được duyệt trước khi sử dụng.':
        'Chưa xóa hoàn tất: '+String(error?.message||'Lỗi kết nối')+
        '. Nếu đã bắt đầu, hãy dùng nút Tiếp tục xóa dở.',true);
       try{
        const latest=await cloudApi.archivedBooks(db(),auth());
        const retained=latest.find(value=>value.id===book.id);
        if(retained?.status==='deleting'){
         book.status='deleting';restore.hidden=true;
         destroy.textContent='Tiếp tục xóa dở';
         meta.textContent=book.chapterCount+' chương · Đang xóa dở';
        }
       }catch(_){/* A failed status refresh must not hide the original error. */}
      }finally{busy=false;restore.disabled=false;destroy.disabled=false;}
     });
     controls.append(restore,destroy);
     item.append(copy,controls);host.append(item);
    }
    return true;
   }catch(error){
    notice('epub-archive-feedback',error?.code==='permission-denied'?
     'Firebase chưa cho phép xem danh sách EPUB đã gỡ.':
     String(error?.message||'Không tải được danh sách'),true);
    return false;
   }
  }
  function closeArchive(){if(busy)return false;id('epub-archive-modal').style.display='none';return true;}
  return Object.freeze({enabled,owns,openEditor,closeEditor,save,unlist,showArchive,closeArchive});
 }
 return Object.freeze({create,coverThumbnail});
});
