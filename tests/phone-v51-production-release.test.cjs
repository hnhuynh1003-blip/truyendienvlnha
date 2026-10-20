const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=file('index.html');
const market=file('js/market-ui-v43.js');
const economy=file('js/economy-runtime-v43.js');
const quests=file('js/quest-ui-v43-7.js');
const fun=file('js/dudu-fun-ui-v43.js');
const companion=file('js/companion-ui-v43.js');
const inbox=file('js/phone-inbox-v33.js');

test('V51 phone modules are all loaded with new cache tags',()=>{
 for(const mod of ['market-ui-v43','economy-runtime-v43','dudu-fun-ui-v43',
 'quest-ui-v43-7','phone-inbox-v33']){
  assert.match(html,new RegExp('src="js/'+mod+'\\.js\\?v=(?:51-1|52-1)"'),mod);
 }
 assert.match(html,/src="js\/companion-ui-v43\.js\?v=69-restore-1"/);
 assert.match(html,/src="js\/dudu-system-app-v69\.js\?v=70-2"/);
 assert.match(html,/src="js\/dudu-system-gate-v70\.js\?v=70-2"/);
 assert.match(html,/src="js\/dudu-core-ai-v70\.js\?v=70-2"/);
 assert.match(html,/id="dudu-fun-launch-v43"/);
 assert.match(html,/id="phone-app-fun"/);
 assert.match(html,/id="shop-items-container"/);
 assert.match(html,/id="quests-container"/);
});

test('V51 live market uses latest catalog but cannot buy client-side',()=>{
 assert.match(market,/readOnly=false/);
 assert.match(market,/button\.disabled=readOnly\|\|/);
 assert.match(market,/button\.textContent='Chưa mở'/);
 assert.match(economy,/const readOnly=!sandbox\(\);/);
 assert.match(economy,/state:userProfile\.economyV43,onBuy:buy,readOnly/);
 assert.match(economy,/CHƯA MỞ GIAO DỊCH/);
 assert.doesNotMatch(economy,/if\(!sandbox\(\)\)return old\.buy/);
});

test('V51 live quests include newer definitions while remote reward claims are blocked',()=>{
 assert.match(economy,/questsV437\?\.ensure\(core\.ensureQuests/);
 assert.match(economy,/onClaim:readOnly\?null:root\.claimQuestReward,readOnly/);
 assert.match(economy,/CHƯA MỞ NHẬN THƯỞNG/);
 assert.match(economy,/Bản chính không cho đặt lại thủ công/);
 assert.match(quests,/if\(ready&&!readOnly&&typeof onClaim==='function'\)/);
 assert.match(quests,/Chờ xác thực/);
});

test('V51 live FUN stores independent local rounds, not real Xu/inventory',()=>{
 assert.match(fun,/const localKey=\(\)=>signed\(\)&&!sandbox\(\)/);
 assert.match(fun,/dudu-fun:practice:v51:/);
 assert.match(fun,/localStorage\.setItem\(key,JSON\.stringify\(rules\.norm\(next\)\)\)/);
 const claim=fun.slice(fun.indexOf('function claim(){'),fun.indexOf('function view(){'));
 const early=claim.indexOf('if(!sandbox()){'),reward=claim.indexOf('userProfile.currency=plan.coins');
 assert.ok(early>=0&&reward>early);
 assert.match(claim.slice(early,reward),/return true/);
 assert.match(fun,/if\(launch\)launch\.hidden=false/);
});

test('V51 live DUDU contact uses local device messages and no check-in reward writes',()=>{
 assert.match(inbox,/root\.DuduCompanionV43\.inboxSummary\(\)/.source ? /DuduCompanionV43\.inboxSummary\(\)/ : /inboxSummary/);
 assert.match(inbox,/window\.DuduAuth\.uid\(\)===currentUsername/);
 assert.match(companion,/dudu:companion:local:v51:/);
 assert.match(companion,/localStorage\.setItem\(localKey\(\),JSON\.stringify\(rules\.norm\(next\)\)\)/);
 const checkin=companion.slice(companion.indexOf('function checkin(){'),companion.indexOf('function init(){'));
 const guarded=checkin.indexOf('if(!sandbox()){');
 const oldBalance=checkin.indexOf('const oldBalance=Number(userProfile.currency)');
 assert.ok(guarded>=0&&oldBalance>guarded);
 assert.match(checkin.slice(guarded,oldBalance),/return;/);
});
