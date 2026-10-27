/* Library Intake V1 — one entry point for the TWO existing library authoring
 * paths. Existing Library navigation and Vangioi authoring are elsewhere.
 * Presentation only:
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
  dialog.setAttribute('aria-label','Thêm truyện vào Thư viện');
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  const header=el('header','dudu-library-intake-header');
  const title=el('h2','','Thêm truyện vào Thư viện');
  const dismiss=el('button','dudu-library-intake-close','Đóng');
  dismiss.type='button';dismiss.addEventListener('click',close);
  header.append(title,dismiss);
  const intro=el('p','dudu-library-intake-intro',
   'Chọn cách thêm tác phẩm. Viết theo chương và nhập EPUB là hai cách đang hỗ trợ.');
  const choices=el('div','dudu-library-intake-grid');
  choices.append(
   action('✍️ Viết truyện theo chương',
    'Tạo tác phẩm bằng trình soạn hiện có.','manual'),
   action('📘 Nhập EPUB',
    'Đưa tệp EPUB vào trình nhập, tách chương và xem trước bản thảo.','epub'));
  const foot=el('p','dudu-library-intake-foot',
   'Chưa hỗ trợ nhập TXT, DOCX hoặc PDF. Truyện đã có trong Thư viện không cần tải lại để làm nguồn Vạn Giới; hãy mở Vạn Giới từ mục Thế giới.');
  dialog.append(header,intro,choices,foot);
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
