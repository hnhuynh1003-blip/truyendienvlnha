// Actual standalone pilot UI, session reload and cross-route revisits. No external writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),errors=[],outside=[];
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}
   const ext=path.extname(file),type={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'}[ext]||'text/html; charset=utf-8';
   res.writeHead(200,{'Content-Type':type}).end(bytes);
  });
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
  const base='http://127.0.0.1:'+server.address().port;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   if(route.request().url().startsWith(base+'/'))return route.continue();
   outside.push(route.request().url());return route.abort();
  });
  const open=async()=>{await page.goto(base+'/dudu-pilot.html',{waitUntil:'load'});await page.locator('#dudu-pilot-standalone-start').click();};
  const dialog=page.locator('#dudu-pilot-dialog-v1');
  const action=async id=>{
   const label=await page.evaluate(id=>Object.values(DuduPilotFStoryV2B.scenes).flatMap(s=>s.choices).find(c=>c.id===id).label,id);
   await dialog.getByText(label,{exact:true}).click();
  };
  const walk=async ids=>{for(const id of ids)await action(id);};
  const saved=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('dudu:pilot-f-casefile-v8:guest')));
  for(const approach of [['talk_maid','ask_maid_steps','follow_maid_observation'],['visit_store','look_coal_marks','trace_to_kitchen']]){
   await open();await dialog.getByRole('button',{name:'Làm lại từ đầu',exact:true}).click();
   await walk(['enter_case','take_case',...approach,'check_coal_bin']);
   assert.match(await dialog.locator('.dudu-pilot-reaction').innerText(),/tìm thấy túi thuốc/);
   await walk(['bundle_to_deduce','theory_back','visit_kitchen']);
   assert.equal(await dialog.getByText('Mở thùng than nơi vệt bụi dừng lại',{exact:true}).count(),0);
   await open(); // Reload same session at kitchen; read real sessionStorage, no state injection.
   assert.equal(await dialog.getByText('Mở thùng than nơi vệt bụi dừng lại',{exact:true}).count(),0);
   await walk(['review_recovered_bundle','open_hidden_note','record_receipt','inspect_blue_knot','record_knot',
    'bundle_to_deduce','theory_back','talk_maid','ask_maid_steps','follow_maid_observation','review_recovered_bundle',
    'bundle_to_deduce','theory_back','visit_store','look_coal_marks','trace_to_kitchen','review_recovered_bundle']);
   assert.equal(await dialog.locator('.dudu-pilot-reaction').count(),0);
   const state=await saved();assert.equal(state.evidence.filter(e=>e==='medicine_bundle').length,1);
   assert.equal(state.log.filter(e=>e.choiceId==='check_coal_bin').length,1);
   assert.ok(state.evidence.includes('care_receipt')&&state.evidence.includes('military_knot'));
   await dialog.locator('.dudu-pilot-evidence summary').click();
   assert.match(await dialog.locator('.dudu-pilot-evidence').innerText(),/Túi thuốc/);
   await walk(['bundle_to_deduce','theory_back','talk_keeper','inspect_register','note_key_log',
    'open_theories','theory_guard','prove_by_ledger','motive_emergency','close_case_publicly']);
   assert.match(await dialog.locator('.dudu-pilot-result').innerText(),/ĐÃ GIẢI ÁN/);
  }
  for(const width of [320,375,390,430,1280]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.ok(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1));
  }
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  assert.equal(await page.evaluate(()=>DuduPilotFStoryV2B.rewardsEnabled),false);
  console.log('Quan Dao item browser PASS: NPC/store routes, pickup once, reload, revisit evidence, both solve, mobile/desktop; external requests=0');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
