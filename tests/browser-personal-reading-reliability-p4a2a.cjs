// Real same-origin tabs, isolated browser profile, no Firebase or external requests.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
test('browser: two tabs retain durable union and Web Locks coordinate submission',async()=>{
 const {chromium}=require('playwright');
 const server=http.createServer((req,res)=>{
  const file=req.url==='/slots.js'?'personal-reading-slots-p2c.js':req.url==='/runtime.js'?'personal-reading-runtime-p2a.js':null;
  res.setHeader('content-type',file?'application/javascript':'text/html');
  res.end(file?fs.readFileSync(path.join(__dirname,'../js',file)):'<!doctype html><title>Local queue fixture</title>');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext();
  await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  const a=await context.newPage(),b=await context.newPage(),url='http://127.0.0.1:'+server.address().port;
  const slot=Math.floor(Date.now()/10000)*10000-60000;
  for(const page of [a,b]){await page.goto(url);await page.addScriptTag({url:url+'/slots.js'});
   await page.evaluate(()=>{window.q=DuduPersonalReadingSlotsP2C.queue();q.bind('a');});}
  await Promise.all([a.evaluate(s=>q.push('a',[s,s+10000,s+20000]),slot),b.evaluate(s=>q.push('a',[s+30000,s+40000,s+50000]),slot)]);
  // Chromium delivers cross-process storage updates asynchronously.
  await Promise.all([a.waitForFunction(()=>q.size()===6),b.waitForFunction(()=>q.size()===6)]);
  await a.reload();await a.addScriptTag({url:url+'/slots.js'});assert.equal(await a.evaluate(()=>{window.q=DuduPersonalReadingSlotsP2C.queue();q.bind('a');return q.size();}),6);
  let calls=0,active=0,peak=0;
  for(const page of [a,b]){
   await page.exposeFunction('submitFixture',async()=>{calls++;active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,100));active--;return {status:'already-credited'};});
   await page.evaluate(()=>{
    window.DuduPersonalReadingClockP2A={create:()=>({snapshot:()=>({}),close(){}})};
    window.DuduAuth={uid:()=> 'a'};
    window.DuduReadingRewardBridgeP2C={ready:()=>true,submit:()=>window.submitFixture()};
   });
   await page.addScriptTag({url:url+'/runtime.js'});
  }
  await Promise.all([a.evaluate(()=>window.dispatchEvent(new Event('online'))),b.evaluate(()=>window.dispatchEvent(new Event('online')))]);
  await a.waitForFunction(()=>q.size()===0);assert.equal(peak,1);assert.equal(calls,1);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

test('browser: mobile CPU proxy measures bounded storage at 360, 1080 and 8640 slots',async()=>{
 const {chromium}=require('playwright');
 const source=fs.readFileSync(path.join(__dirname,'../js/personal-reading-slots-p2c.js'));
 const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/slots.js'?'application/javascript':'text/html');res.end(req.url==='/slots.js'?source:'<!doctype html><title>Local capacity fixture</title>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({url:'/slots.js'});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  const metrics=await page.evaluate(()=>{
   const results=[];
   for(const count of [360,1080,8640]){
    localStorage.clear();const wall=Math.floor(Date.now()/10000)*10000,uid='a'.repeat(28);
    const prefix='dudu:reading:pending:v1:personal-reading-v1:'+uid+':';let bytes=0;
    for(let i=0;i<10000;i++)localStorage.setItem('unrelated:'+i,'x');
    let at=performance.now();
    for(let i=count;i>0;i--){const key=prefix+(wall-i*10000);localStorage.setItem(key,'1');bytes+=2*(key.length+1);}
    const seedMs=performance.now()-at;
    const q=DuduPersonalReadingSlotsP2C.queue({now:()=>wall});at=performance.now();q.bind(uid);
    const restoreMs=performance.now()-at,pending=q.status().pending;
    at=performance.now();for(let i=0;i<3600;i++){q.maintain();q.status();}const idle3600CallsMs=performance.now()-at;
    at=performance.now();const t=q.begin(uid);const beginMs=performance.now()-at;
    at=performance.now();q.settle(t,{status:'already-credited'});const ackMs=performance.now()-at;
    results.push({count,bytes,seedMs,restoreMs,idle3600CallsMs,beginMs,ackMs,pending,afterAck:q.status().pending});
   }
   return results;
  });
  for(const row of metrics){assert.equal(row.pending,row.count);assert.equal(row.afterAck,row.count-60);}
  if(process.env.P4A2B_METRICS_PATH)fs.writeFileSync(process.env.P4A2B_METRICS_PATH,JSON.stringify({cpuThrottle:4,viewport:'390x844',unrelatedKeys:10000,results:metrics},null,2));
  console.log('P4A2B_MOBILE_PROXY',JSON.stringify(metrics));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});

test('browser: Reader exposes pending, persistence/expiry/overflow warnings and only confirmed EXP',async()=>{
 const {chromium}=require('playwright');
 const badge=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<div id="reader-exp-live-p2d"[^>]*><\/div>/)[0];
 const server=http.createServer((req,res)=>{
  const file=req.url==='/slots.js'?'personal-reading-slots-p2c.js':req.url==='/runtime.js'?'personal-reading-runtime-p2a.js':null;
  res.setHeader('content-type',file?'application/javascript':'text/html; charset=utf-8');
  res.end(file?fs.readFileSync(path.join(__dirname,'../js',file)):'<!doctype html><style>body{font:16px sans-serif;padding:20px}.reading-time-badge{font-size:12px;line-height:1.6}</style><div id="reader-view" style="display:block">'+badge+'</div>');
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('dialog',()=>{throw Error('Unexpected native alert');});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({url:'/slots.js'});
  await page.evaluate(()=>{
   const slot=Math.floor(Date.now()/10000)*10000-10000,prefix='dudu:reading:pending:v1:personal-reading-v1:a:';
   localStorage.setItem(prefix+slot,'1');localStorage.setItem(prefix+(slot-86400000),'1');
   const createQueue=DuduPersonalReadingSlotsP2C.queue;
   window.DuduPersonalReadingSlotsP2C={create:DuduPersonalReadingSlotsP2C.create,queue:opts=>(window.fixtureQueue=createQueue({...opts,capacity:1}))};
   window.DuduPersonalReadingClockP2A={create:()=>({snapshot:()=>({chapterMs:0}),open(){},close(){},pause(){},sample:()=>({active:false,observedMs:0,chapterMs:0})})};
   window.fixtureReady=false;window.DuduAuth={uid:()=> 'a'};
   window.DuduReadingRewardBridgeP2C={ready:()=>fixtureReady,submit:async()=>({status:'applied',awardExp:2})};
  });
  await page.addScriptTag({url:'/runtime.js'});
  await page.evaluate(()=>{
   DuduPersonalReadingRuntimeP2A.open({uid:'a',currentUid:()=> 'a'});
   fixtureQueue.push('a',[Math.floor(Date.now()/10000)*10000-20000]);
   const original=Storage.prototype.key;Storage.prototype.key=()=>{throw Error('storage unavailable');};
   try{fixtureQueue.sync();}finally{Storage.prototype.key=original;}
   window.dispatchEvent(new Event('online'));
  });
  const badgeNode=page.locator('#reader-exp-live-p2d');
  assert.equal(await badgeNode.getAttribute('aria-live'),'polite');assert.equal(await badgeNode.isVisible(),true);
  const pending=await badgeNode.textContent();
  assert.match(pending,/0 EXP \u0111\u00e3 x\u00e1c nh\u1eadn/);assert.match(pending,/10s/);
  assert.match(pending,/L\u1ed7i l\u01b0u/);assert.match(pending,/H\u1ebft h\u1ea1n: 1/);assert.match(pending,/\u0110\u1ea7y h\u00e0ng \u0111\u1ee3i: 1/);
  assert.equal(await badgeNode.evaluate(n=>n.scrollWidth<=n.clientWidth),true);
  if(process.env.P4A2B_SCREENSHOT_PATH)await page.screenshot({path:process.env.P4A2B_SCREENSHOT_PATH});
  await page.evaluate(()=>{fixtureReady=true;window.dispatchEvent(new Event('online'));});
  await page.waitForFunction(()=>document.getElementById('reader-exp-live-p2d').textContent.includes('+2 EXP'));
  const committed=await badgeNode.textContent();assert.match(committed,/Ch\u1edd \u0111\u1ed3ng b\u1ed9 0s/);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
