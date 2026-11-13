'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const art=require('../js/fun-art-f42b.js'),catalog=require('../js/item-catalog-v2.js'),rule=require('../js/fun-vantvat-f31.js');
const root=path.resolve(__dirname,'..'),bytes=p=>fs.readFileSync(path.join(root,p));
const files=[...Object.values(art.background),art.gate,...art.samples.map(x=>x.src),...Object.values(art.effects)];
function chunks(buf){const out=[];for(let p=12;p+8<=buf.length;){out.push(buf.toString('ascii',p,p+4));const n=buf.readUInt32LE(p+4);p+=8+n+n%2;}return out;}
test('F4.2B ships eleven optimized WebP variants and keeps the approved reference composites out of gameplay',()=>{
 assert.equal(files.length,11);assert.equal(new Set(files).size,11);let total=0;
 for(const file of files){const b=bytes(file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length<600000,file);total+=b.length;}
 assert.ok(total<2100000);assert.ok(files.every(x=>!(/KeyVisual|Preview|.png/i.test(x))));
});
test('F4.2B gate, all samples and rare FX preserve encoded transparency',()=>{
 for(const file of [art.gate,...art.samples.map(x=>x.src),...Object.values(art.effects)])assert.ok(chunks(bytes(file)).includes('ALPH'),'alpha channel missing: '+file);
});
test('F4.2B sample art is scenery only and cannot introduce catalog prizes, ranks, odds or values',()=>{
 assert.equal(art.samples.length,5);assert.deepEqual(art.samples.map(x=>x.rank),['D','A','S','SS','SSS']);
 assert.deepEqual(Object.keys(art.rewardMappings),[]);assert.equal(catalog.funVantVat.length,66);assert.equal(rule.PRICE,25);
 for(const sample of art.samples){assert.equal(sample.catalogId,null);assert.equal(sample.role,'SCENERY_ONLY');assert.ok(!rule.POOL.some(p=>p.itemId===sample.src));}
 assert.deepEqual(Object.keys(art.effects),['S','SS','SSS']);assert.equal(art.effects.D,undefined);assert.equal(art.effects.A,undefined);
});
test('F4.2B original reference pack remains bounded and asset declarations precede the current scene',()=>{
 const initial=bytes(art.background.mobile).length+bytes(art.gate).length+art.samples.reduce((n,x)=>n+bytes(x.src).length,0);
 assert.ok(initial<700000);const html=bytes('index.html').toString('utf8');assert.ok(html.includes('css/fun-art-f42b.css?v=f42b1-1'));
 assert.ok(html.indexOf('js/fun-art-f42b.js?v=f42b-1')<html.indexOf('js/fun-cosmos-f41.js?v=f42b1-1'));
});
