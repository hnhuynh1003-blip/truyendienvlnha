/* Library Intake V1 — one entry point for the TWO existing library authoring
 * paths and the Vangioi source-reference workflow. Presentation only:
 * no Firebase writes, new MIME formats, authority grants or auto-publication.
 */
(function(root){
 'use strict';
 const doc=root?.document;
 if(!doc)return;
 let dialog=null,returnFocus=null;
 const canWrite=()=>typeof root.canEditStories==='function'&&root.canEditStories()===true;
 const el=(tag,cls,value)=>{
  const node=doc.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=value;
  return node;
 };
 const sourceKinds=Object.freeze(['original','library','manuscript']);
 const formats=Object.freeze(['manual','epub']);

 function close(){
  if(dialog){
   if(dialog.open&&typeof dialog.close==='function')dialog.close();
   dialog.remove();dialog=null;
  }
  if(returnFocus?.isConnected&&typeof returnFocus.focus==='function')
   returnFocus.focus({preventScroll:true});
  returnFocus=null;
 }
 function handoff(kind){
  if(!canWrite()){close();return false;}
  close();
  if(kind==='manual'){
   if(typeof root.openStoryModal!=='function')return false;
   root.openStoryModal();return true;
  }
  if(kind==='epub'){
   if(typeof root.openEpubImportV48!=='function')return false;
   root.openEpubImportV48();return true;
  }
  if(kind==='library'){
   if(typeof root.DuduSiteV60?.navigate!=='function')return false;
   root.DuduSiteV60.navigate('library');return true;
  }
  if(kind==='vangioi')return root.DuduWorldCreator?.open?.()===true;
  return false;
 }
 function action(label,description,kind){
  const button=el('button','dudu-library-intake-choice');
  button.type='button';button.dataset.intake=kind;
  button.append(el('strong','',label),el('span','',description));
  button.addEventListener('click',()=>handoff(kind));
  return button;
 }
 function open(){
  if(!canWrite())return false;
  if(dialog){
   if(!dialog.open&&typeof dialog.showModal==='function')dialog.showModal();
   return true;
  }
  returnFocus=doc.activeElement;
  dialog=el('dialog','dudu-library-intake-dialog');
  dialog.id='dudu-library-intake-v1';
  dialog.setAttribute('aria-label','Đăng hoặc sử dụng nguồn truyện');
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  const header=el('header','dudu-library-intake-header');
  const title=el('h2','','Đưa truyện vào Thư viện');
  const dismiss=el('button','dudu-library-intake-close','Đóng');
  dismiss.type='button';dismiss.addEventListener('click',close);
  header.append(title,dismiss);
  const intro=el('p','dudu-library-intake-intro',
   'Chọn cách phù hợp với nguồn truyện. Viết theo chương và nhập EPUB là hai luồng đang có; không tự đăng công khai hay cấp quyền chuyển thể.');
  const choices=el('div','dudu-library-intake-grid');
  choices.append(
   action('✍️ Viết truyện theo chương',
    'Mở trình soạn tác phẩm hiện có. Chương, quyền lưu và đồng bộ giữ nguyên như trước.','manual'),
   action('📘 Nhập tệp EPUB',
    'Tách chương, xem trước, lưu bản thảo rồi xác nhận quyền trước khi xuất bản nếu hệ thống cho phép.','epub'));
  const reuse=el('section','dudu-library-intake-reuse');
  reuse.append(el('h3','','Dùng truyện có sẵn cho Vạn Giới'),
   el('p','',
    'Nếu tác phẩm đã có ở Thư viện, không cần đăng lại. Vạn Giới nhận tham chiếu mã truyện, phiên bản và hash nguồn; xác thực server và source picker hiện chưa hoạt động.'),
   action('📚 Xem truyện trong Thư viện',
    'Tìm tác phẩm đã đăng trước khi quyết định dùng làm nguồn.','library'),
   action('🌌 Mở công cụ tác giả Vạn Giới',
    'Chọn loại nguồn Sáng tác gốc / Thư viện / Bản thảo trong Nguồn & ảnh; đây là bản nháp offline.','vangioi'));
  const foot=el('p','dudu-library-intake-foot',
   'Lưu ý: JSON của Vạn Giới là hồ sơ world, không phải tệp truyện. Chưa có bộ nhập TXT, DOCX hoặc PDF; có thể soạn/dán nội dung trong trình viết chương.');
  dialog.append(header,intro,choices,reuse,foot);
  doc.body.append(dialog);
  if(typeof dialog.showModal==='function')dialog.showModal();
  else{dialog.setAttribute('open','');dialog.setAttribute('role','dialog');
   dialog.setAttribute('aria-modal','true');}
  dismiss.focus?.();
  return true;
 }
 root.DuduLibraryIntakeV1=Object.freeze({open,close,
  sourceKinds,formats,version:'library-intake-v1',backendConnected:false});
})(typeof window!=='undefined'?window:null);
