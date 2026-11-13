import { CHARACTER, ENVIRONMENT, OWNER_ID, SCHEMA_VERSION } from './fixture.mjs';
import { applyAction, newBattle, RuleError, clone } from './combat-core.mjs';
import { ensureWorld, validateWorld, recordBattleOutcome, equippedDefense, applyWorldCommand } from './world-core.mjs';
import {validateDungeon,checkDungeonCommand,recordDungeonOutcome} from './module/dungeon-state.mjs';
import {configureWave} from './module/waves-state.mjs';
import {freshExploration,configureExploration,applyExploration} from './module/exploration-state.mjs';

export const DB_NAME = 'dudu-prototype-tutien-s-mock-v1';
export function createRun(runId, ownerId = OWNER_ID) {
  return ensureWorld({ schemaVersion: SCHEMA_VERSION, environment: ENVIRONMENT, ownerId, runId, revision: 0,
    hp: CHARACTER.maxHp, ll: CHARACTER.maxLl, inventory: { healingPowder: 1, jadeBlank: 0 },
    encounterSequence: 0, battle: null, commands: {}, rewards: [], consumptions: [] });
}
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export function createJadeTrialRun(runId,ownerId=OWNER_ID){const s=createRun(runId,ownerId);s.world.jadeTrial={version:1,sample:null,observed:[],selection:null};return s;}
export function createExplorationRun(runId,ownerId=OWNER_ID){const s=createRun(runId,ownerId);s.dungeon=freshExploration();s.inventory.loot=[];return s;}
export function validateRun(s) {
  if (!s || s.schemaVersion !== SCHEMA_VERSION || s.environment !== ENVIRONMENT || typeof s.ownerId !== 'string' || typeof s.runId !== 'string' || !Number.isSafeInteger(s.revision) || !s.inventory || !s.commands || !Array.isArray(s.rewards) || !Array.isArray(s.consumptions)) throw new RuleError('UNSUPPORTED_SAVE', 'Dữ liệu mock không tương thích; không tự xóa hoặc reset.');
  if (!Number.isSafeInteger(s.inventory.healingPowder) || s.inventory.healingPowder < 0 || !Number.isSafeInteger(s.inventory.jadeBlank) || s.inventory.jadeBlank < 0 || !Number.isInteger(s.hp) || s.hp < 0 || s.hp > CHARACTER.maxHp || !Number.isInteger(s.ll) || s.ll < 0 || s.ll > CHARACTER.maxLl) throw new RuleError('INVALID_SAVE');
  if (s.battle && s.battle.rulesVersion !== 'slice-s-reference-1') throw new RuleError('UNSUPPORTED_SAVE', 'Phiên bản luật trận không tương thích; không tự chuyển đổi dữ liệu.');
  if(s.world)validateWorld(s);
  if(s.dungeon)validateDungeon(s);
  return s;
}

// Storage-independent transaction plan, also used by node tests.
export function planCommand(input, command) {
  validateRun(input);
  if (!command || typeof command.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(command.id)) throw new RuleError('INVALID_COMMAND_ID');
  if (command.ownerId !== input.ownerId || command.runId !== input.runId) throw new RuleError('WRONG_SCOPE');
  const fingerprint = canonical(command), prior = Object.hasOwn(input.commands,command.id) ? input.commands[command.id] : null;
  if (prior) {
    if (prior.fingerprint !== fingerprint) throw new RuleError('COMMAND_ID_REUSED');
    return { state: input, reply: clone(prior.reply), duplicate: true };
  }
  if (command.expectedRevision !== input.revision) throw new RuleError('STALE_REVISION');
  if (Object.keys(input.commands).length >= 5000) throw new RuleError('MOCK_COMMAND_LIMIT');
  if(input.dungeon)checkDungeonCommand(input,command);
  if(command.type==='NEXT_WAVE'&&![2,3].includes(input.dungeon?.version))throw new RuleError('NO_NEXT_WAVE');
  const s = clone(ensureWorld(input)); let granted = false;
  if (command.type === 'START'||command.type==='NEXT_WAVE') {
    if (s.battle?.state === 'ACTIVE') throw new RuleError('BATTLE_ACTIVE');
    if (!s.hp) throw new RuleError('REST_REQUIRED', 'Hãy nghỉ tại điểm an toàn trước khi bắt đầu.');
    s.encounterSequence++;
    s.battle = newBattle(`${s.runId}-encounter-${s.encounterSequence}`, s.hp, s.ll);
    if(s.dungeon)s.dungeon.status='ACTIVE';
    if(s.dungeon?.version===2)configureWave(s,command.type);
    if(s.dungeon?.version===3)configureExploration(s,command.type);
    const bonus=equippedDefense(s);s.battle.character.defense+=bonus;
    if(bonus)s.battle.character.accessoryId=s.world.jade.id;
    if(command.purpose==='SOURCE'){
      if(s.world.quest==='NOT_STARTED'||s.world.location!=='fork')throw new RuleError('WRONG_LOCATION','Nhận nhiệm vụ và tới Ngã rẽ trước.');
      s.world.location='direct';s.world.combatEncounterId=s.battle.id;s.world.feedback='';
    }
  } else if (command.type === 'REST') {
    if (s.battle?.state === 'ACTIVE') throw new RuleError('BATTLE_ACTIVE');
    s.hp = CHARACTER.maxHp; s.ll = CHARACTER.maxLl;
  } else if (command.type === 'ACTION') {
    if (!s.battle || command.encounterId !== s.battle.id) throw new RuleError('WRONG_ENCOUNTER');
    const out = applyAction(s.battle, { action: command.action, expectedRevision: s.battle.revision }, s.inventory.healingPowder);
    s.battle = out.battle; s.hp = out.battle.hp; s.ll = out.battle.ll;
    if (out.consumed) {
      s.inventory.healingPowder -= out.consumed;
      s.consumptions.push({ id: `consume-${command.id}`, commandId: command.id, itemId: 'healing-powder', quantity: out.consumed, environment: ENVIRONMENT });
    }
    if(s.dungeon)recordDungeonOutcome(s,command);else granted=recordBattleOutcome(s);
  } else if(s.dungeon?.version===3){applyExploration(s,command);}
  else { granted=applyWorldCommand(s,command).granted; }
  s.revision++;
  const reply = { commandId: command.id, revision: s.revision, outcome: s.battle?.state || 'SAFE', granted, environment: ENVIRONMENT };
  s.commands[command.id] = { fingerprint, reply: clone(reply) };
  validateRun(s);
  return { state: s, reply, duplicate: false };
}

export class MockRepository {
  constructor(db, ownerId = OWNER_ID, trialRunId = null) { this.db = db; this.ownerId = ownerId; this.trialRunId=trialRunId; }
  static open({ indexedDB = globalThis.indexedDB, name = DB_NAME, ownerId = OWNER_ID, trialRunId = null } = {}) {
    if (!indexedDB) return Promise.reject(new RuleError('STORAGE_UNAVAILABLE', 'Trình duyệt không hỗ trợ IndexedDB. Không chuyển sang lưu tạm giả transaction.'));
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 2);
      req.onupgradeneeded = () => {
        if(!req.result.objectStoreNames.contains('mockRuns'))req.result.createObjectStore('mockRuns', { keyPath: 'ownerId' });
        if(!req.result.objectStoreNames.contains('mockTrials'))req.result.createObjectStore('mockTrials', { keyPath: 'key' });
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new RuleError('STORAGE_BLOCKED', 'Hãy đóng tab prototype cũ rồi thử lại.'));
      req.onsuccess = () => { const repo = new MockRepository(req.result, ownerId, trialRunId); req.result.onversionchange = () => req.result.close(); resolve(repo); };
    });
  }
  // IDB readwrite transactions serialize competing tabs on this store. All writes
  // (state, command, potion debit, result, mock reward) are one record / one commit.
  transact(command = null) {
    return new Promise((resolve, reject) => {
      let tx, result, failure;
      const storeName=this.trialRunId?'mockTrials':'mockRuns',key=this.trialRunId?`${this.ownerId}:${this.trialRunId}`:this.ownerId;
      try { tx = this.db.transaction(storeName, 'readwrite'); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(clone(result));
      tx.onerror = () => { failure ||= tx.error; };
      tx.onabort = () => reject(failure || tx.error || new RuleError('STORAGE_FAILURE'));
      const store = tx.objectStore(storeName), req = store.get(key);
      const put=s=>store.put(this.trialRunId?{key,state:s}:s);
      req.onerror = () => { failure = req.error; };
      req.onsuccess = () => {
        try {
          let s = this.trialRunId?req.result?.state:req.result;
          if (!s) { if(this.trialRunId)throw new RuleError('UNKNOWN_RUN','Run thử không tồn tại; run gốc không bị xóa.');s = createRun(crypto.randomUUID(), this.ownerId); put(s); }
          validateRun(s);
          if (s.ownerId !== this.ownerId) throw new RuleError('WRONG_SCOPE');
          if(this.trialRunId&&s.runId!==this.trialRunId)throw new RuleError('WRONG_SCOPE');
          const upgraded=ensureWorld(s);if(upgraded!==s){s=upgraded;put(s);}
          if (command) {
            const plan = planCommand(s, command);
            if (!plan.duplicate) put(plan.state);
            result = { state: plan.state, reply: plan.reply, duplicate: plan.duplicate };
          } else result = { state: s };
        } catch (e) { failure = e; tx.abort(); }
      };
    });
  }
  async read() { return (await this.transact()).state; }
  dispatch(command) { return this.transact(command); }
  createTrial({jadeAdapter=false,exploration=false}={}) {
    return new Promise((resolve,reject)=>{
      let tx;try{tx=this.db.transaction('mockTrials','readwrite');}catch(e){reject(e);return;}
      const runId=(exploration?'mod-p3-':'')+crypto.randomUUID(),key=`${this.ownerId}:${runId}`,store=tx.objectStore('mockTrials');
      const get=store.get(key);get.onsuccess=()=>{if(get.result)tx.abort();else store.put({key,state:exploration?createExplorationRun(runId,this.ownerId):jadeAdapter?createJadeTrialRun(runId,this.ownerId):createRun(runId,this.ownerId)});};
      tx.oncomplete=()=>resolve(runId);tx.onabort=()=>reject(tx.error||new RuleError('STORAGE_FAILURE'));tx.onerror=()=>{};
    });
  }
  listRuns() {
    return new Promise((resolve,reject)=>{
      let tx;try{tx=this.db.transaction(['mockRuns','mockTrials'],'readonly');}catch(e){reject(e);return;}
      const original=tx.objectStore('mockRuns').get(this.ownerId),trials=tx.objectStore('mockTrials').getAll();
      tx.oncomplete=()=>resolve([{runId:original.result?.runId||null,trialRunId:null,label:'Run gốc — giữ nguyên'},...(trials.result||[]).filter(r=>r.state.ownerId===this.ownerId&&!r.state.dungeon).map(r=>({runId:r.state.runId,trialRunId:r.state.runId,label:`${r.state.world?.jadeTrial?'MR3 Ngọc':'Run thử'} ${r.state.runId.slice(0,8)}`}))]);
      tx.onabort=()=>reject(tx.error||new RuleError('STORAGE_FAILURE'));tx.onerror=()=>{};
    });
  }
  close() { this.db.close(); }
}
