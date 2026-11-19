/* Browser-local queue. No network, credentials, persistence or backend allocation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DuduR2PersonalQueue=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function create({prepare,validateMetadata,cryptoApi=globalThis.crypto,onChange=()=>{}}={}){
  const entries=[],seen=new Set();let running=false,adding=false,halted=false,paused=false,sequence=0;
  const editable=e=>e&&['READY','METADATA','RETRY'].includes(e.state);
  const blocked=()=>running||adding||halted;
  function notify(){onChange();}
  return Object.freeze({
   entries:()=>entries.slice(),status:()=>({running,adding,halted,paused}),
   async add(files,{guard=()=>true}={}){
    if(blocked())return {added:0,duplicates:0,ignored:0,limited:0};
    adding=true;notify();const report={added:0,duplicates:0,ignored:0,limited:0};
    try{for(const file of Array.from(files||[])){
     if(!guard())break;
     if(!/\.epub$/i.test(file.name||'')){report.ignored++;continue;}
     if(entries.length>=500){report.limited++;continue;}
     // Bound memory before reading bytes; never hash arbitrary-sized folder files.
     const entry={id:++sequence,file,path:file.webkitRelativePath||file.name,metadata:{},chapters:0,selected:false,state:'BLOCKED',message:''};
     if(!Number.isSafeInteger(file.size)||file.size<1||file.size>30*1024*1024){entry.message='EPUB phải từ 1 byte đến 30 MiB.';entries.push(entry);report.added++;notify();continue;}
     let hash;
     try{hash=Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',await file.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');}
     catch{entry.message='Không đọc được EPUB trên thiết bị.';if(guard()){entries.push(entry);report.added++;notify();}continue;}
     if(!guard())break;
     if(seen.has(hash)){report.duplicates++;continue;}
     seen.add(hash);entry.sha256=hash;entries.push(entry);report.added++;
     entry.state='PREPARING';notify();
     try{const value=await prepare(file);if(!guard()){entry.state='BLOCKED';entry.message='Phiên đăng nhập đã đổi.';break;}
      entry.metadata={...value.metadata};entry.chapters=value.chapters;entry.hasCover=value.hasCover===true;entry.selected=true;
      entry.state=validateMetadata(entry.metadata)?'READY':'METADATA';entry.message='';
     }catch(error){entry.state='BLOCKED';entry.message=String(error?.message||'Không đọc được EPUB.').slice(0,240);}
     notify();
    }}finally{adding=false;notify();}return report;
   },
   edit(id,metadata){if(blocked())return false;const e=entries.find(x=>x.id===id);if(!editable(e))return false;e.metadata={...metadata};e.state=validateMetadata(e.metadata)?'READY':'METADATA';e.message='';notify();return true;},
   select(id,value){if(blocked())return false;const e=entries.find(x=>x.id===id);if(!editable(e))return false;e.selected=value===true;notify();return true;},
   selectAll(value){if(blocked())return;for(const e of entries)if(editable(e))e.selected=value===true;notify();},
   pause(){paused=true;notify();},
   clear(){if(blocked())return false;entries.length=0;seen.clear();notify();return true;},
   async run(execute,{guard=()=>true}={}){
    if(blocked())return false;running=true;paused=false;notify();
    try{for(const entry of entries){
     if(paused||!guard())break;
     if(!entry.selected||!['READY','RETRY'].includes(entry.state))continue;
     if(!validateMetadata(entry.metadata)){entry.state='METADATA';notify();continue;}
     entry.state='RUNNING';notify();let result;
     try{result=await execute(entry);}catch{result={kind:'unknown',message:'Không xác định kết quả. Dừng để đối soát.'};}
     if(result?.kind==='published'){entry.state='PUBLISHED';entry.selected=false;entry.message='Đã xuất bản.';}
     else if(result?.kind==='pre-dispatch'){entry.state='RETRY';entry.message='Chưa gửi request. Có thể sửa và thử lại thủ công.';}
     else{entry.state='UNKNOWN';entry.message='Đã dừng. Kiểm tra trạng thái trước khi nhập tiếp.';halted=true;}
     notify();if(halted)break;
    }}finally{running=false;notify();}return true;
   },
   reconcilePublished(){if(running||adding||!halted)return false;const e=entries.find(x=>x.state==='UNKNOWN');if(!e)return false;e.state='PUBLISHED';e.selected=false;e.message='GET đã xác nhận đúng sách/revision published.';halted=false;notify();return true;}
  });
 }
 return Object.freeze({create});
});
