'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('C2.4d selling from the current inventory inspector is a single intentional tap',()=>{
 const view=read('js/inventory-view-v42.js');
 const sale=view.match(/if\(tradeStatus\?\.buyback&&typeof args\.onSell==='function'\)\{([\s\S]*?)\n  \}/);
 assert.ok(sale,'sale action exists inside the item inspector');
 assert.match(sale[1],/Bán · \+'/);
 assert.match(sale[1],/sell\.disabled=tradeStatus\.busy===true/);
 assert.match(sale[1],/args\.inventory\[entry\.index\]!==entry\.item/);
 assert.match(sale[1],/args\.onSell\(entry\.item\)/);
 assert.doesNotMatch(sale[1],/confirm\(/);
});

test('C2.4d legacy fallback also sells without confirm, while discard still warns',()=>{
 const html=read('index.html');
 const fallback=html.match(/sell\.textContent='Bán · \+'\+buyback\+' Xu';([\s\S]*?)actions\.append\(sell\)/);
 assert.ok(fallback);
 assert.match(fallback[1],/sell\.disabled=personalItemBusy/);
 assert.match(fallback[1],/personalInventoryAction\('sell',item\)/);
 assert.doesNotMatch(fallback[1],/confirm\(/);
 assert.match(html,/if\(!confirm\('Vứt '\+String\(item\.name/);
 assert.match(read('js/inventory-view-v42.js'),/if\(!confirm\('Vứt 1 '\+detail\.name/);
 assert.match(html,/inventory-view-v42\.js\?v=c24d-1/);
});
