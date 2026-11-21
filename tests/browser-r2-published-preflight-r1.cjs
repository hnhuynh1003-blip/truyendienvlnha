// Browser-only layout and queue test. No Firebase, R2 uploads or credentials.
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('R2 duplicate review: 170 candidates / 72 probable matches, 320–430px',async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:850}});
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<main id="epub-import-content" style="width:min(100%,450px);box-sizing:border-box">'+
   '<details class="r2-import-queue" open><summary id="c12-queue-summary">Danh sách EPUB</summary>'+
   '<p id="c12-duplicate-hint"></p><div id="c12-queue"></div></details></main>');
  await page.addStyleTag({path:path.join(root,'css/epub-import-v48.css')});
  await page.addScriptTag({path:path.join(root,'js/library-r2-personal-queue.js')});
  const result=await page.evaluate(async()=>{
    const q=DuduR2PersonalQueue.create({
     prepare:async f=>({metadata:{title:f.title,author:'Cùng tác giả'},chapters:3}),
     validateMetadata:m=>!!m.title&&!!m.author,
     cryptoApi:{subtle:{digest:async(_,buf)=>new Uint8Array(buf)}}
    });
    const files=Array.from({length:170},(_,i)=>({name:'Novel '+i+'.epub',title:'Novel '+i,
     size:50,arrayBuffer:async()=>Uint8Array.of(i+1).buffer}));
    await q.add(files);
    const known=Array.from({length:72},(_,i)=>({id:'epub-'+i.toString(16).padStart(32,'0'),
     title:'Novel '+i,author:'Cùng tác giả',chapterCount:3}));
    q.reviewCatalog(known);
    const rows=q.entries();
    const host=document.getElementById('c12-queue');
    for(const e of rows.filter(e=>e.state==='POSSIBLE_DUPLICATE').slice(0,3)){
     const row=document.createElement('div');row.className='dudu-epub-item r2-import-queue-row';
     const check=document.createElement('input');check.type='checkbox';check.disabled=true;
     const text=document.createElement('span');text.textContent=e.metadata.title+' — '+e.message;
     const edit=document.createElement('button');edit.className='btn';edit.textContent='Sửa thông tin';
     const override=document.createElement('button');override.className='btn';override.textContent='Đây là bản khác';
     row.append(check,text,edit,override);host.append(row);
    }
    document.getElementById('c12-duplicate-hint').textContent='72 sách nghi trùng đã được bỏ chọn.';
    return {total:rows.length,selected:rows.filter(e=>e.selected).length,
      probable:rows.filter(e=>e.state==='POSSIBLE_DUPLICATE').length};
  });
  assert.deepEqual(result,{total:170,selected:98,probable:72});
  for(const width of [320,355,390,430]){
   await page.setViewportSize({width,height:850});
   const values=await page.evaluate(()=>{
    const r=[...document.querySelectorAll('.r2-import-queue-row')].map(el=>{
     const box=el.getBoundingClientRect();
     const last=el.lastElementChild.getBoundingClientRect();
     return {width:box.width, right:box.right,overrideRight:last.right};});
    return {overflow:document.documentElement.scrollWidth-innerWidth,rows:r};
   });
   assert.ok(values.overflow<=2,'no page horizontal overflow at '+width+'px: '+values.overflow);
   assert.ok(values.rows.every(x=>x.right<=width+2&&x.overrideRight<=width+2),
     'override buttons must fit at '+width+'px');
  }
 }finally{await browser.close();}
});
