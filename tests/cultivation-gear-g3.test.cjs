const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const g=require('../js/cultivation-gear-g3.js');
test('G3 six slots, four starting unlocked, no price or power authorized',()=>{
 const p=g.createPreview(),v=p.view();assert.equal(v.slots.length,6);assert.equal(v.slots.filter(s=>s.unlocked).length,4);
 assert.equal(v.power,null);assert.ok(v.catalog.every(x=>x.price===null&&!x.forSale));assert.ok(v.slots.every(s=>s.item===null));
});
test('G3 preview equip/remove/reset rejects locked and unknown items; no ownership data',()=>{
 const p=g.createPreview();assert.equal(p.equip('g3-preview-sword'),true);assert.equal(p.equip('g3-preview-sword'),true);
 assert.equal(p.equip('g3-preview-necklace'),false);assert.equal(p.equip('unknown'),false);
 assert.equal(p.view().slots.filter(x=>x.item).length,1);assert.equal(p.view().power,null);
 assert.equal(p.remove('weapon'),true);assert.equal(p.remove('weapon'),false);
 p.equip('g3-preview-robe');p.reset();assert.ok(p.view().slots.every(x=>!x.item));
 assert.ok(g.createPreview().view().slots.every(x=>!x.item));
});
test('G3 source stays preview only, mount route and reset wiring present',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.doesNotMatch(read('js/cultivation-gear-g3.js'),/localStorage|sessionStorage|firebase|fetch\(|runTransaction/);
 assert.match(read('index.html'),/phone-app-cultivation-gear/);
 assert.match(read('index.html'),/DuduPersonalCultivationGearG3B\.mount\(host,window\.DuduCultivationGearBridgeG3B\)/);
 assert.match(read('js/auth-v2.js'),/DuduCultivationGearG3\?\.clear/);
 assert.match(read('js/tutien-shared-inventory-g2.mjs'),/openGearPreview/);
});
