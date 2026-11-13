import { CHARACTER, ENEMY, SKILLS, ACTIONS, RULES_VERSION } from './fixture.mjs';

export class RuleError extends Error {
  constructor(code, message = code) { super(message); this.code = code; }
}
export const clone = value => structuredClone(value);
export const damage = (attack, coefficient, defense, guard = false) => Math.max(1, Math.floor(Math.max(1, attack * coefficient - defense) * (guard ? 0.5 : 1)));

export function newBattle(id, hp = CHARACTER.maxHp, ll = CHARACTER.maxLl) {
  if (typeof id !== 'string' || !id || !Number.isInteger(hp) || hp < 1 || hp > CHARACTER.maxHp || !Number.isInteger(ll) || ll < 0 || ll > CHARACTER.maxLl) throw new RuleError('INVALID_SNAPSHOT');
  return { id, rulesVersion: RULES_VERSION, state: 'ACTIVE', revision: 0, turn: 1,
    character: { ...CHARACTER }, enemy: { ...ENEMY, intents: [...ENEMY.intents] }, hp, ll, enemyHp: ENEMY.maxHp, phase: 0,
    readyAt: { cleave: 1, ward: 1, suppress: 1 }, shield: null, weaken: null, itemsUsed: 0, log: [], result: null };
}

export function intent(battle) {
  if (!battle || battle.state !== 'ACTIVE') return null;
  const kind = battle.enemy.intents[battle.phase];
  const attack = battle.enemy.attack * (battle.weaken ? 0.8 : 1);
  return { kind, rawDamage: kind === 'prepare' ? 0 : damage(attack, kind === 'heavy' ? 2 : 1, battle.character.defense) };
}

export function invalidReason(b, action, potionCount = 0) {
  if (!b || b.state !== 'ACTIVE') return 'Trận đã kết thúc hoặc chưa bắt đầu.';
  if (!ACTIONS.includes(action)) return 'Hành động không tồn tại.';
  const skill = SKILLS[action];
  if (skill && b.turn < b.readyAt[action]) return `Sẵn sàng từ lượt ${b.readyAt[action]}.`;
  if (skill && b.ll < skill.cost) return 'Cần 6 Linh Lực.';
  if (action === 'ward' && b.shield && b.shield.amount >= Math.floor(18 + 0.3 * b.character.attack)) return 'Khiên hiện tại chưa yếu hơn khiên mới.';
  if (action === 'suppress' && b.weaken) return 'Suy yếu hiện tại vẫn đang có hiệu lực.';
  if (action === 'potion' && potionCount < 1) return 'Không còn Hồi Sinh Tán.';
  if (action === 'potion' && b.hp === b.character.maxHp) return 'Sinh Mệnh đã đầy.';
  if (action === 'potion' && b.itemsUsed >= 2) return 'Đã dùng tối đa 2 đan trong trận.';
  return null;
}

// Pure reducer: does not mutate its inputs or read DOM, clocks, storage or RNG.
export function applyAction(input, { action, expectedRevision }, potionCount = 0) {
  if (expectedRevision !== input.revision) throw new RuleError('STALE_REVISION');
  const reason = invalidReason(input, action, potionCount);
  if (reason) throw new RuleError('INVALID_ACTION', reason);
  const b = clone(input), row = { turn: b.turn, action, dealt: 0, received: 0, absorbed: 0, healed: 0, enemyAction: null, events: [] };
  let consumed = 0;
  const skill = SKILLS[action];
  if (skill) { b.ll -= skill.cost; b.readyAt[action] = b.turn + skill.cooldown + 1; }
  if (action === 'basic') b.ll = Math.min(b.character.maxLl, b.ll + 3);
  if (action === 'guard') b.ll = Math.min(b.character.maxLl, b.ll + 6);
  if (['basic', 'cleave', 'suppress'].includes(action)) {
    row.dealt = damage(b.character.attack, action === 'cleave' ? 1.5 : 1, b.enemy.defense);
    b.enemyHp = Math.max(0, b.enemyHp - row.dealt);
  }
  if (action === 'ward') b.shield = { id: 'stone-ward', amount: Math.floor(18 + 0.3 * b.character.attack), expiresAfterPhase: b.turn + 1 };
  if (action === 'suppress') b.weaken = { id: 'water-weaken', attackMultiplier: 0.8, expiresAfterPhase: b.turn + 1 };
  if (action === 'potion') { row.healed = Math.min(35, b.character.maxHp - b.hp); b.hp += row.healed; b.itemsUsed++; consumed = 1; }
  if (action === 'retreat') b.state = 'RETREATED';
  else if (!b.enemyHp) b.state = 'WON';
  else {
    row.enemyAction = b.enemy.intents[b.phase];
    if (row.enemyAction !== 'prepare') {
      const hit = damage(b.enemy.attack * (b.weaken ? 0.8 : 1), row.enemyAction === 'heavy' ? 2 : 1, b.character.defense, action === 'guard');
      if (b.weaken) { b.weaken = null; row.events.push('Suy yếu đã áp dụng cho đòn này.'); }
      row.absorbed = Math.min(b.shield?.amount || 0, hit);
      if (b.shield) { b.shield.amount -= row.absorbed; if (!b.shield.amount) b.shield = null; }
      row.received = hit - row.absorbed; b.hp = Math.max(0, b.hp - row.received);
      if (!b.hp) b.state = 'LOST';
    }
    for (const field of ['shield', 'weaken']) if (b[field] && b[field].expiresAfterPhase <= b.turn) { b[field] = null; row.events.push(field === 'shield' ? 'Khiên hết hạn.' : 'Suy yếu hết hạn.'); }
  }
  b.revision++;
  row.hp = b.hp; row.ll = b.ll; row.enemyHp = b.enemyHp; row.shield = clone(b.shield); row.weaken = clone(b.weaken); row.readyAt = clone(b.readyAt);
  b.log.push(row);
  if (b.state === 'ACTIVE') { b.turn++; b.phase = (b.phase + 1) % b.enemy.intents.length; }
  else { b.shield = null; b.weaken = null; b.result = { encounterId: b.id, outcome: b.state, terminalRevision: b.revision, hp: b.hp, ll: b.ll }; }
  return { battle: b, consumed };
}
