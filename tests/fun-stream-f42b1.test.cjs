'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const m=require('../js/fun-stream-f42b1.js'),c=require('../js/item-catalog-v2.js'),r=require('../js/fun-vantvat-f31.js'),a=require('../js/item-visuals-v13.js');
const rows=m.entries(c,r,a),tick=()=>new Promise(resolve=>setImmediate(resolve));
test('F4.2B.1 flying metadata contains all 66 actual physical prizes, with canonical names, types, ranks and art',()=>{
 assert.equal(rows.length,66);assert.equal(new Set(rows.map(x=>x.id)).size,66);assert.equal(rows.filter(x=>x.hasOwnArt).length,66);assert.equal(new Set(rows.filter(x=>x.hasOwnArt).map(x=>x.imageSrc)).size,66,'each painted prize retains its own image');assert.equal(rows.filter(x=>!x.hasOwnArt).length,0);
 for(const row of rows){const item=c.byId(row.id);assert.equal(row.name,item.name);assert.equal(row.rank,item.rank);assert.equal(row.type,item.funCategory);assert.equal(row.realm,item.funRealm);assert.equal(row.imageSrc,a.visual(item).src);assert.ok(r.POOL.some(p=>p.itemId===row.id&&p.rank===row.rank&&p.weight>0));assert.ok(!row.src.includes('/f42b/sample-'));}
 assert.ok(Object.isFrozen(rows));assert.ok(rows.every(Object.isFrozen));
 const bad={...r,POOL:[...r.POOL,{itemId:rows[0].id,rank:'SSS',weight:1},{itemId:'not-a-prize',rank:'S',weight:1}]};assert.equal(m.entries(c,bad,a).length,66);
});
test('F4.2B.1 optimized thumbnails exist only for the 66 correctly matched catalog images',()=>{
 for(const row of rows.filter(x=>x.hasOwnArt)){const file=fs.readFileSync(path.join(__dirname,'..',row.src));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WEBP');assert.ok(file.length<50000,row.id);}
 assert.ok(rows.filter(x=>!x.hasOwnArt).every(x=>x.src.startsWith('data:image/svg')));
});
test('F4.2B.1 three-minute stream simulation rotates broadly, prevents adjacent duplicates and favors ordinary ranks',()=>{
 const poolBefore=JSON.stringify(r.POOL);
 for(const seed of [1,42,98765]){const f=m.flow(rows,{seed}),seen=new Set(),births=new Set(),recent=[],ranks={},modes=new Set();
  for(let frame=0;frame<5400;frame++){const slots=f.tick(1/30);assert.equal(new Set(slots.map(p=>p.entry.id)).size,slots.length);assert.equal(new Set(slots.map(p=>p.entry.src)).size,slots.length);
   for(const p of slots){seen.add(p.entry.id);modes.add(p.mode);if(births.has(p.serial))continue;births.add(p.serial);assert.ok(!recent.slice(-10).includes(p.entry.id));recent.push(p.entry.id);ranks[p.entry.rank]=(ranks[p.entry.rank]||0)+1;}}
  assert.ok(seen.size>=60,'distinct IDs: '+seen.size);assert.deepEqual([...modes].sort(),['cross','distant','portal']);assert.ok(f.emissions>=240);
  const common=(ranks.E||0)+(ranks.D||0)+(ranks.C||0)+(ranks.B||0),rare=(ranks.S||0)+(ranks.SS||0)+(ranks.SSS||0);assert.ok(common>f.emissions*.75);assert.ok(rare<f.emissions*.15);assert.ok(ranks.S>ranks.SS&&ranks.SS>ranks.SSS);
 }
 assert.equal(JSON.stringify(r.POOL),poolBefore,'display scheduling must not change draw odds');
});
test('F4.2B.1 perspective increases near size and provides crossing and far paths',()=>{const f=m.flow(rows,{seed:42}),slot=f.snapshot().find(p=>p.mode==='portal');const far=f.project({...slot,age:slot.duration*.1},400,600),near=f.project({...slot,age:slot.duration*.9},400,600);assert.ok(near.size>far.size*3);assert.ok(near.z<far.z);});
test('F4.2B.1 decode cache limits residency to 14 images and parallel loads to two',async()=>{
 const waiting=new Map();let peak=0,pending=0,maxPending=0;const released=[];
 const cache=m.cache({load:src=>{pending++;maxPending=Math.max(maxPending,pending);return new Promise(resolve=>waiting.set(src,()=>{pending--;resolve({src});}));},release:image=>{if(image)released.push(image.src);}});
 for(let batch=0;batch<6;batch++){cache.sync(Array.from({length:12},(_,i)=>'image-'+(batch*12+i)));for(let i=0;i<10;i++){await tick();for(const [src,resolve]of [...waiting]){waiting.delete(src);resolve();}await tick();peak=Math.max(peak,cache.stats().resident);}}
 assert.ok(peak<=14);assert.ok(maxPending<=2);assert.ok(released.length>40);cache.clear();await tick();assert.equal(cache.stats().resident,0);
});
test('F4.2B.1 failed images do not create a retry storm, and cleared caches ignore late loads',async()=>{
 let loads=0;const cache=m.cache({load:async()=>{loads++;throw Error('missing');}});cache.sync(['bad']);await tick();await tick();for(let i=0;i<100;i++)cache.sync(['bad']);await tick();assert.equal(loads,1);cache.clear();
 let resolve,changes=0,released=0;const pending=m.cache({load:()=>new Promise(r=>resolve=r),release:()=>released++,onChange:()=>changes++});pending.sync(['late']);await tick();pending.clear();resolve({});await tick();await tick();assert.equal(changes,0);assert.equal(pending.stats().resident,0);assert.equal(released,1);
});
test('F4.2B.1 audit tables list each real prize once and all 29 missing artworks',()=>{const root=path.join(__dirname,'..'),report=fs.readFileSync(path.join(root,'docs/VANTUONG_F42B1_IMAGE_AUDIT.md'),'utf8'),csv=fs.readFileSync(path.join(root,'docs/VANTUONG_F42B1_MISSING_ART.csv'),'utf8');for(const row of rows)assert.equal(report.split('| '+row.id+' |').length-1,1,row.id);assert.equal(csv.trim().split(/\r?\n/).length,30);for(const row of rows.filter(x=>!x.hasOwnArt))assert.ok(csv.includes('"'+row.id+'"'));});

test('F4.2D all 29 historical missing IDs now use their own approved WebP',()=>{const manifest=require('../docs/VANTUONG_F42D_IMAGE_MAPPING.json');assert.equal(manifest.entries.length,29);for(const entry of manifest.entries){const row=rows.find(x=>x.id===entry.id);assert.ok(row.hasOwnArt);assert.equal(row.imageSrc,entry.full.path);assert.equal(row.src,entry.thumbnail.path);assert.equal(row.rank,entry.rank);}});
