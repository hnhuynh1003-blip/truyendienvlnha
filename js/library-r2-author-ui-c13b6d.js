(function(){
  if(window.DuduC12AuthorPreview)return;
  const id=x=>document.getElementById('c12-'+x),config=window.DUDU_LIBRARY_R2_PREVIEW_CONFIG;
  const enabled=config?.enabled===true&&config?.authorImportEnabled===true;
  let controller=null,abort=null;
  const allowed=()=>enabled&&!IS_SANDBOX_MODE&&window.DuduAuth?.isAdmin?.()&&
    firebase.auth().currentUser?.uid===config.pilotOwnerUid;
  let sessionUid=null;
  const labels={idle:'Chưa chuẩn bị',parsing:'Đang đọc tệp EPUB…',ticket:'Đang xác nhận phiên nhập…',packaging:'Đang chuẩn bị nội dung và ảnh…',draft:'Đang tạo bản nháp…',staging:'Đang tải lên…',quarantined:'Tải lên hoàn tất. Hãy xác nhận xuất bản.',promoting:'Đang kiểm tra nội dung đã tải…',publishing:'Đang xác nhận xuất bản…',published:'Đã xuất bản. Có thể mở đọc.',blocked:'Đã dừng. Cần kiểm tra kết quả trước khi thử lại.'};
  const render=message=>{const state=controller?.status();id('status').textContent=message||labels[state?.status]||labels.idle;id('status').dataset.state=state?.status||'idle';id('publish').disabled=!allowed()||!state?.readyForOwnerConfirmation;document.getElementById('c13b3-read').disabled=!allowed()||!state?.published;id('start').disabled=!allowed()||!!state&&state.status!=='idle';};
  const syncAccess=()=>{
    const uid=allowed()?firebase.auth().currentUser.uid:null;
    id('open').hidden=!uid;
    if(sessionUid&&sessionUid!==uid){abort?.abort();id('dialog').close();controller=null;}
    sessionUid=uid;render();
  };
  const syncEpub=window.duduSyncEpubAccessR11;
  window.duduSyncEpubAccessR11=approved=>{syncAccess();return syncEpub?.(approved);};
  window.addEventListener('dudu-auth-state-changed',syncAccess);
  syncAccess();
  id('open').addEventListener('click',()=>{if(!allowed())return;id('dialog').showModal();render();});
  id('form').addEventListener('submit',e=>e.preventDefault());
  id('start').addEventListener('click',async()=>{
    if(!allowed()||!id('form').reportValidity())return;
    if(controller&&controller.status().status!=='idle')return;
    try{
      abort=new AbortController();
      controller=window.DuduLibraryR2AuthorImportL6C12.createController({enabled:true,
        getCurrentUser:()=>firebase.auth().currentUser,
        send:window.DuduLibraryR2AuthorImportL6C12.createTransport({workerBaseUrl:config.workerBaseUrl}),
        parseV48:window.DuduEpubImportV48.parse,sidecar:window.DuduEpubR2SidecarL6C11,
        uploader:window.DuduEpubStageL6P2C4,zipLib:window.JSZip,Parser:DOMParser,
        textV57:window.DuduEpubTextV57,cryptoApi:crypto});
      id('start').disabled=true;id('status').textContent='Đang chuẩn bị và tải lên';
      await controller.start({file:id('file').files[0],metadata:{title:id('title').value,
        author:id('author').value,description:id('description').value,genre:id('genre').value,
        publicationState:id('publication').value},signal:abort.signal,onProgress:p=>render('Đã tải '+p.completed+'/'+p.total+' phần')});render();
    }catch(error){render(error.message);}
  });
  id('publish').addEventListener('click',async()=>{
    if(!allowed()||!controller?.status().readyForOwnerConfirmation)return;
    id('publish').disabled=true;id('status').textContent='Đang kiểm tra và xuất bản…';
    try{await controller.publish({approve:true,expectedBookId:controller.status().bookId,signal:abort.signal});render();}
    catch(error){render(error.message);}
  });
  document.getElementById('c13b3-read').addEventListener('click',async()=>{
    if(!allowed()||!controller?.status().published)return;
    const bookId=controller.status().bookId,button=document.getElementById('c13b3-read');
    button.disabled=true;
    try{
      await refreshEpubCloudBooksV49();
      if(!allowed())throw Error('Phiên tác giả đã thay đổi.');
      const at=novels.findIndex(n=>n.id===bookId&&n._r2V1);
      if(at<0)throw Error('Chưa tải được truyện R2 vừa xuất bản; hãy tải lại danh sách.');
      id('dialog').close();document.getElementById('story-modal').style.display='none';
      openCover(at);readChapter(0);
    }catch(error){render(error.message);}
  });
  id('close').addEventListener('click',()=>id('dialog').close());
  id('dialog').addEventListener('close',()=>{if(controller&&!['idle','quarantined','published','blocked'].includes(controller.status().status))abort?.abort();});
  window.DuduC12AuthorPreview=Object.freeze({status:()=>controller?.status()||null,open:()=>id('open').click()});
})();
