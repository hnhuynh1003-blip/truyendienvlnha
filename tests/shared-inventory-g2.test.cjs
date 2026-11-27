const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const g=require('../js/shared-inventory-g2.js'),model=require('../js/inventory-model-v42.js');
const inventory=[{id:'cult-spirit-fragment',name:'Mảnh linh thạch',type:'ITEM',rank:'F',obtainedFrom:{kind:'CHAPTER',storyId:'private-story'}},{id:'test-weapon',name:'Kiếm thử',rank:'A',type:'WEAPON',instanceId:'private-instance'},{id:'food',name:'Bánh',type:'FOOD'}];
test('G2 projects existing equipment/material with provenance labels but no raw ownership IDs',()=>{
 const before=JSON.stringify(inventory),v=g.project({ready:true,inventory,model});
 assert.equal(v.total,3);assert.equal(v.equipment,1);assert.equal(v.material,1);
 assert.equal(v.items[0].name,'Kiếm thử');assert.equal(v.items[1].source,'CHAPTER');
 assert.doesNotMatch(JSON.stringify(v),/private-story|private-instance/);
 assert.equal(JSON.stringify(inventory),before);
});
test('G2 not-ready clears assets and bounded preview retains real group count',()=>{
 assert.deepEqual(g.project({ready:false,inventory,model}),{available:false,items:[]});
 const v=g.project({ready:true,inventory:Array.from({length:40},()=>inventory[1]),model});
 assert.equal(v.equipment,40);assert.equal(v.items.length,12);
});
test('G2 actual panel renders source, filters and clears old account on refresh',async()=>{
 const {mountSharedInventory}=await import('../js/tutien-shared-inventory-g2.mjs');
 const d={createElement(tag){return {tag,children:[],style:{},append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},setAttribute(){},textContent:''};}};
 const host=d.createElement('div');host.ownerDocument=d;let ready=true,opened=0;
 const ui=mountSharedInventory(host,()=>({snapshot:()=>g.project({ready,inventory,model}),open:()=>{opened++;}}));
 const panel=host.children[0],filters=panel.children[2],list=panel.children[3],open=panel.children[4];
 assert.match(list.children[0].textContent,/Kiếm thử/);filters.children[1].onclick();assert.match(list.children[0].textContent,/Chương truyện/);
 open.onclick();assert.equal(opened,1);ready=false;ui.refresh();assert.equal(list.children.length,0);assert.equal(open.disabled,true);assert.doesNotMatch(panel.children[1].textContent,/3 món/);
});
test('G2 routes via existing Kho and refreshes on profile and auth reset',()=>{
 const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 assert.match(read('index.html'),/DuduSharedInventoryBridgeG2=Object.freeze/);
 assert.match(read('index.html'),/openPhoneApp\('inventory'\);return true/);
 assert.match(read('js/auth-v2.js'),/DuduTuTienIntegT0\?\.refreshSharedInventory\?\.\(\)/);
 assert.match(read('js/tutien-vis-t1.mjs'),/mountSharedInventory\(inventory\)/);
});
