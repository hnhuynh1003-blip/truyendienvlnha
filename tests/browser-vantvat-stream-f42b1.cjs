'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{const seconds=Number(process.env.B1_OBSERVATION_SECONDS||15),browser=await chromium.launch({headless:true,...(process.env.DUDU_BROWSER_CHANNEL?{channel:process.env.DUDU_BROWSER_CHANNEL}:{})});
 try{const base=path.resolve(__dirname,'..'),page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true}),errors=[],requested=new Set();
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/stream-f42b1/'))requested.add(r.url());});
 await page.route('https://stream.local/**',async route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/assets/'))return route.fulfill({status:200,contentType:'image/webp',body:await fs.readFile(path.join(base,url.pathname.slice(1)))});
  return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#080d1b}#cyber-phone{width:min(100%,540px);margin:auto;padding:10px}</style><body class="dudu-phone-v11"><main id="cyber-phone"><div id="scene"></div></main>'});});
 await page.goto('https://stream.local/');for(const f of ['css/item-visuals-v13.css','css/dudu-fun-v43.css','css/fun-art-f42b.css'])await page.addStyleTag({path:path.join(base,f)});
 for(const f of ['world-items-v44-1','item-catalog-v2','item-visuals-v13','fun-vantvat-f31','fun-wheel-f39','fun-art-f42b','fun-stream-f42b1','fun-cosmos-f41'])await page.addScriptTag({path:path.join(base,'js',f+'.js')});
 await page.evaluate(()=>{window.longTasks=[];if(window.PerformanceObserver){new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push(e.duration);}).observe({entryTypes:['longtask']});}DuduCosmicHuntF41.mount({host:document.getElementById('scene')});});
 await page.waitForFunction(()=>DuduCosmicHuntF41.inspectStream()?.cache.resident>0);const seen=new Set(),births=new Set(),recent=[],ranks={},modes=new Set();let peakResident=0,peakPending=0;
 for(let i=0;i<seconds;i++){if(i===Math.floor(seconds/2))await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1000);
  const state=await page.evaluate(()=>{const s=DuduCosmicHuntF41.inspectStream();return{...s,valid:s.active.every(p=>{const item=DuduItemCatalog.byId(p.id);return item&&item.rank===p.rank&&item.name===p.name&&DuduFunVantVatF31.POOL.some(r=>r.itemId===p.id&&r.weight>0);})};});
  assert.equal(state.eligible,66);assert.equal(state.valid,true);assert.equal(new Set(state.active.map(p=>p.id)).size,state.active.length);assert.equal(new Set(state.active.map(p=>p.src)).size,state.active.length);assert.ok(state.active.every(p=>!p.src.includes('/f42b/sample-')));
  peakResident=Math.max(peakResident,state.cache.resident);peakPending=Math.max(peakPending,state.cache.pending);assert.ok(state.cache.resident<=14);assert.ok(state.cache.pending<=2);
  for(const p of [...state.active].sort((a,b)=>a.serial-b.serial)){seen.add(p.id);modes.add(p.mode);if(births.has(p.serial))continue;births.add(p.serial);assert.ok(!recent.slice(-8).includes(p.id),'near repeat '+p.id);recent.push(p.id);ranks[p.rank]=(ranks[p.rank]||0)+1;}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.ok(seen.size>=Math.min(45,12+Math.floor(seconds/3)),'observed diversity '+seen.size);assert.deepEqual([...modes].sort(),['cross','distant','portal']);
 const common=(ranks.E||0)+(ranks.D||0)+(ranks.C||0)+(ranks.B||0),rare=(ranks.S||0)+(ranks.SS||0)+(ranks.SSS||0);assert.ok(common>rare*3);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(250);const still=await page.evaluate(()=>DuduCosmicHuntF41.inspectStream().active.map(p=>[p.serial,p.age]));await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>DuduCosmicHuntF41.inspectStream().active.map(p=>[p.serial,p.age])),still);
 assert.deepEqual(errors,[]);const summary={seconds,distinct:seen.size,births:births.size,ranks,peakResident,peakPending,requestedThumbnails:requested.size,longTaskMaxMs:await page.evaluate(()=>Math.max(0,...longTasks))};
 if(process.env.B1_OBSERVATION_OUTPUT)await fs.writeFile(process.env.B1_OBSERVATION_OUTPUT,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));await page.evaluate(()=>DuduCosmicHuntF41.dispose());assert.equal(await page.locator('.f41-cosmos').count(),0);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
