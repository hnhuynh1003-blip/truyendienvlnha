const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const content=fs.readFileSync(path.join(root,'js/npc-premium-v40.js'),'utf8');
const browser={};
vm.runInNewContext(content,{window:browser});
const v40=browser.DuduNpcPremiumV40;
const variants=[
  ...Array.from({length:60},(_,i)=>'portrait-f-'+String(i+1).padStart(2,'0')),
  ...Array.from({length:12},(_,i)=>'portrait-m-'+String(i+1).padStart(2,'0'))
];
test('V40 maps 72 stable IDs to seven genuine WebP atlases',()=>{
 assert.equal(variants.length,72);
 assert.equal(new Set(variants).size,72);
 const visited=new Set();
 for(const id of variants){
  const info=v40.infoFor(id),style=v40.styleFor(id);
  assert.ok(info,id);assert.ok(style,id);
  assert.equal(info.id,id);
  assert.ok(info.col>=0&&info.col<info.cols);
  assert.ok(info.row>=0&&info.row<info.rows);
  assert.equal(info.gender,id.includes('-f-')?'f':'m');
  const abs=path.resolve(root,info.path);
  assert.ok(abs.startsWith(root+path.sep));
  const data=fs.readFileSync(abs);
  assert.ok(data.length>10000,info.path);
  assert.equal(data.toString('ascii',0,4),'RIFF');
  assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.equal(data.readUInt32LE(4)+8,data.length);
  assert.ok(style.image.includes(info.path));
  visited.add(info.path);
 }
 assert.equal(visited.size,7);
 assert.equal(v40.styleFor('portrait-f-00'),null);
 assert.equal(v40.styleFor('portrait-f-61'),null);
 assert.equal(v40.styleFor('portrait-m-13'),null);
 assert.equal(v40.styleFor('portrait-n-01'),null);
});
test('V40 prioritizes premium portraits in the compact editor and runtime',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const editor=fs.readFileSync(path.join(root,'js/npc-portrait-v39.js'),'utf8');
 const library=require('../js/npc-portrait-library-v1.js');
 assert.deepEqual(library.CATALOG.slice(0,3).map(x=>x.id),
   ['portrait-f-01','portrait-f-02','portrait-f-03']);
 assert.ok(html.includes('src="js/npc-premium-v40.js?v=1"'));
 assert.ok(html.indexOf('js/npc-premium-v40.js?v=1')<
   html.indexOf('js/npc-portrait-v39.js?v=2'));
 assert.match(html,/DuduNpcPremiumV40\?\.paint\(element,preset\)/);
 assert.match(editor,/DuduNpcPremiumV40\?\.paint\(node,id\)/);
 assert.doesNotMatch(html,/const recommended=DuduNpcPersonaR6\.previewNpc\(npc\)\?\.previewPortraitPresetId/);
});
