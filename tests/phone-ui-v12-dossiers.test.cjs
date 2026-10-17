const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.resolve(__dirname,'../css/phone-ui-v12-dossiers.css'),'utf8');

test('NPC V12 profile is also read-only for verified live users; gift grants remain gated',()=>{
  assert.match(html,/if \(IS_SANDBOX_MODE \|\| \(window\.DuduAuth\?\.isReady/);
  assert.match(html,/if\(actionBar&&unlocked&&!c\.archived&&IS_SANDBOX_MODE\)/);
  assert.match(html,/DuduNpcRelationshipV2\.previewRelationship/);
  assert.match(html,/approvedMilestones:\[\],completedMilestones:\[\]/);
  assert.match(html,/class="dudu-npc-v12-portrait" data-npc-portrait="1"/);
  assert.match(html,/renderNpcPortraitPreview\(preview,c,novel\.id\)/);
  const block=html.slice(html.indexOf("div.classList.add('dudu-npc-v12-card');"),
    html.indexOf('container.appendChild(div);',html.indexOf('function renderCodexList()')));
  assert.doesNotMatch(block,/inventory\.splice|saveCurrentAccount\(|saveDB\(|unlockChapterCharacter\(/);
  assert.match(css,/body\.dudu-phone-v11 #cyber-phone \.dudu-npc-v12-top/);
});
test('inventory detail is read only, uses same object identity and safe DOM',()=>{
  const a=html.indexOf('function renderInventoryDetail()');
  // The V43.5.3 mutation handler is intentionally outside the read-only
  // V12 inspector; inspect only the original function boundary.
  const dedicated=html.indexOf('function useFunctionItemV43(',a);
  const b=dedicated>a?dedicated:html.indexOf('function renderInventory()',a);
  const fn=html.slice(a,b);
  assert.ok(a>0&&b>a);
  assert.match(fn,/inventory\.find\(i=>i===inventoryDetailSelection\)/);
  assert.match(fn,/panel\.replaceChildren\(\)/);
  assert.match(fn,/desc\.textContent=/);
  assert.doesNotMatch(fn,/inventory\.splice|saveCurrentAccount|innerHTML|rollLootDrop/);
  assert.match(html,/id="inventory-v12-detail"/);
  assert.match(html,/inventoryDetailSelection=item===inventoryDetailSelection\?null:item/);
});
test('responsive V12 profile/detail use scoped styles',()=>{
  assert.match(css,/grid-template-columns:88px minmax\(0,1fr\)/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/\.dudu-inventory-v12-row/);
  assert.match(css,/\.dudu-inventory-v12-detail-head/);
  assert.ok(!/(^|\n)\s*\.item-card\s*\{/.test(css));
});
