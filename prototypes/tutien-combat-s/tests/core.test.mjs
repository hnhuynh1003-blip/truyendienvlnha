import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, newBattle, damage, intent, invalidReason } from '../combat-core.mjs';

const step = (b, action, potions = 1) => applyAction(b, { action, expectedRevision: b.revision }, potions);
function sequence(actions) { let b = newBattle('test'), potions = 1; for (const a of actions) { const out = step(b, a, potions); b = out.battle; potions -= out.consumed; } return { b, potions }; }

test('reference arithmetic, min damage and guard rounding', () => {
  assert.equal(damage(36, 1.5, 10), 44); assert.equal(damage(30, 2, 8, true), 26);
  assert.equal(damage(24, 2, 8), 40); assert.equal(damage(1, 1, 100, true), 1);
});
test('attack reference wins turn four with HP74 LL38; dead enemy does not act', () => {
  const { b } = sequence(['cleave', 'basic', 'basic', 'basic']);
  assert.deepEqual(b.log.map(r => [r.enemyHp, r.hp, r.ll]), [[66,148,32],[40,96,35],[14,74,38],[0,74,38]]);
  assert.equal(b.state, 'WON'); assert.equal(b.log.at(-1).enemyAction, null);
});
test('shield and weaken reference wins turn five HP114 LL17', () => {
  const { b } = sequence(['suppress', 'ward', 'basic', 'suppress', 'cleave']);
  assert.deepEqual(b.log.map(r => [r.enemyHp,r.hp,r.ll]), [[84,148,32],[84,136,26],[58,114,29],[32,114,23],[0,114,17]]);
  assert.equal(b.log[1].absorbed, 28); assert.equal(b.log[1].received, 12); assert.equal(b.state, 'WON');
});
test('cooldown rejects next two turns, ready turn four; rejected action is immutable', () => {
  let b = step(newBattle('cooldown'), 'cleave').battle;
  const before = structuredClone(b); assert.throws(() => step(b, 'cleave'), /lượt 4/); assert.deepEqual(b,before);
  b = step(b,'guard').battle; assert.throws(() => step(b,'cleave'), /lượt 4/);
  b = step(b,'basic').battle; assert.equal(b.turn,4); assert.equal(invalidReason(b,'cleave'),null);
});
test('no LL can still basic or guard; no overfill', () => {
  let b = newBattle('ll',148,0); assert.throws(() => step(b,'ward'), /Linh Lực/);
  b = step(b,'basic').battle; assert.equal(b.ll,3); b = step(b,'guard').battle; assert.equal(b.ll,9);
  assert.equal(step(newBattle('cap'),'guard').battle.ll,38);
});
test('shield absorbs then expires after its two enemy phases', () => {
  let b = step(newBattle('shield'),'ward').battle; assert.equal(b.shield.amount,28);
  b = step(b,'guard').battle; assert.equal(b.hp,148); assert.equal(b.shield,null);
  assert.equal(b.log[1].absorbed,26);
});
test('shield expiry without damage and duplicate shield rejection', () => {
  let b = newBattle('expiry'); b = step(b,'ward').battle;
  b.readyAt.ward=1; assert.throws(() => step(b,'ward'), /Khiên/);
  b.enemy.intents=['prepare']; b = step(b,'basic').battle; assert.equal(b.shield,null);
});
test('weaken survives prepare, affects one damaging attack, then clears', () => {
  let b=step(newBattle('weak'),'suppress').battle; assert.equal(intent(b).rawDamage,40);
  b=step(b,'guard').battle; assert.equal(b.hp,128); assert.equal(b.weaken,null);
  assert.equal(intent(b).rawDamage,22);
});
test('weaken cannot stack or refresh and expires without a hit', () => {
  let b=step(newBattle('expiry-weak'),'suppress').battle; b.readyAt.suppress=1;
  assert.throws(()=>step(b,'suppress'),/Suy yếu/); b.enemy.intents=['prepare'];
  b=step(b,'basic').battle; assert.equal(b.weaken,null);
});
test('potion only consumes when valid, clamps HP; retreat preserves consumption', () => {
  const full=newBattle('full'); assert.throws(()=>step(full,'potion'),/đầy/);
  const {b,potions}=sequence(['basic','basic','potion','retreat']);
  assert.equal(b.hp,109); assert.equal(b.state,'RETREATED'); assert.equal(potions,0);
  const low=newBattle('clamp',140); const out=step(low,'potion'); assert.equal(out.battle.hp,148); assert.equal(out.consumed,1);
  assert.throws(()=>step(newBattle('none',100),'potion',0),/Không còn/);
});
test('twelve guards lose; terminal actions rejected; no guard HP healing', () => {
  const {b}=sequence(Array(12).fill('guard')); assert.equal(b.state,'LOST'); assert.equal(b.hp,0); assert.equal(b.enemyHp,110);
  assert.throws(()=>step(b,'basic'),/kết thúc/);
});
test('revision mismatch and unknown commands do not mutate state', () => {
  const b=newBattle('reject'),copy=structuredClone(b);
  assert.throws(()=>applyAction(b,{action:'basic',expectedRevision:9}),/STALE_REVISION/);
  assert.throws(()=>step(b,'invented'),/không tồn tại/); assert.deepEqual(b,copy);
});
test('deterministic reducer, no Tu Vi/EXP added to fixture or result', () => {
  const b=newBattle('pure'); const a={action:'cleave',expectedRevision:0};
  assert.deepEqual(applyAction(b,a),applyAction(b,a)); assert.equal(b.revision,0);
  assert.equal('exp' in applyAction(b,a).battle,false); assert.equal('tuVi' in applyAction(b,a).battle,false);
});
