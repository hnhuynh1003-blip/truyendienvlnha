import { MockRepository } from './mock-repository.mjs';
import { CHARACTER, SKILLS, OWNER_ID } from './fixture.mjs';
import { intent, invalidReason } from './combat-core.mjs';
import { actionIcon } from './ui-icons.mjs';
import { battlePresentation, cooldownRemaining } from './presentation.mjs';
import { renderWorld } from './world-ui.mjs';
import {createBattleAnimation} from './battle-animation.mjs';

const $ = id => document.getElementById(id);
const labels = { basic:'Đánh thường',guard:'Thủ thế',cleave:'Liệt Phong Trảm',ward:'Thạch Giáp Quyết',suppress:'Hàn Tuyền Chú',potion:'Hồi Sinh Tán',retreat:'Rút lui' };
const hints = {basic:'Hồi 3 LL',guard:'Thủ 50% · Hồi 6 LL',cleave:'6 LL · CD2 · ×1,5',ward:'6 LL · Khiên 28 · CD2',suppress:'6 LL · Suy yếu 20% · CD2',potion:'Hồi 35 HP · 1 lượt',retreat:'Không nhận thưởng thắng'};
const descriptions={basic:'Đòn thường hệ số ×1. Hồi 3 Linh Lực, không vượt tối đa.',guard:'Thủ thế giảm 50% sát thương pha địch hiện tại, hồi 6 Linh Lực. Không hồi HP.',cleave:'Tốn 6 Linh Lực. Đòn ×1,5. Sau khi dùng cần qua hai lượt hành động tiếp theo; dùng lượt 1 thì sẵn lại lượt 4.',ward:'Tốn 6 Linh Lực. Tạo khiên 28 cho tối đa hai pha địch. Không cộng dồn khiên cùng nhóm. CD2.',suppress:'Tốn 6 Linh Lực. Đòn ×1, giảm 20% Công Kích cho đòn địch kế tiếp, hết muộn nhất sau pha địch của lượt sau. Không cộng dồn. CD2.',potion:'Hồi tối đa 35 HP, tiêu một viên và một lượt. Không dùng khi HP đầy. Reload và Nghỉ mock không hoàn lại đan.',retreat:'Kết thúc trận ngay, trở về điểm an toàn, không nhận thưởng thắng. Giữ vật tư đã tiêu hao; không mất Tu Vi hoặc trang bị.'};
const shortNames={basic:'Thường',guard:'Thủ',cleave:'Trảm',ward:'Giáp',suppress:'Hàn'};
let repo, state, busy=false, disposed=false, channel, pendingRefresh=false;
const battleFX=createBattleAnimation({arena:$('arena'),event:$('visual-event'),skip:$('skip'),reduced:$('reduce-motion'),isDisposed:()=>disposed});
const buttons={};
for(const action of Object.keys(labels)) {
  const primary=Object.hasOwn(shortNames,action);
  const cell=document.createElement('div');cell.className=primary?'action-cell primary-action':'action-cell utility-action';
  const button=document.createElement('button');button.type='button';button.dataset.action=action;button.disabled=true;
  button.className=primary?'skill-button':'utility-button';button.setAttribute('aria-label',labels[action]);button.title=`${labels[action]} — ${hints[action]}`;
  button.append(actionIcon(action));
  const cost=document.createElement('span');cost.className='cost-tag';cost.setAttribute('aria-hidden','true');cost.textContent=SKILLS[action]?'6 LL':primary?'+LL':'';
  const cooldown=document.createElement('span');cooldown.className='cooldown-tag';cooldown.setAttribute('aria-hidden','true');cooldown.hidden=true;
  const caption=document.createElement('span');caption.className=primary?'short-label':'utility-label';caption.textContent=shortNames[action]|| (action==='potion'?'Đan':'Rút lui');
  const reason=document.createElement('span');reason.className='sr-only';reason.id=`reason-${action}`;button.setAttribute('aria-describedby',reason.id);
  button.append(cost,cooldown);if(!primary)button.append(caption);cell.append(button);if(primary)cell.append(caption);cell.append(reason);
  (primary?$('actions'):$(action==='potion'?'potion-slot':'retreat-slot')).append(cell);
  button.addEventListener('click',()=>send('ACTION',{action,encounterId:state?.battle?.id}));
  button.addEventListener('contextmenu',e=>{e.preventDefault();showInfo(action);});
  button.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();showInfo(action);}});
  const option=document.createElement('option');option.value=action;option.textContent=labels[action];$('skill-select').append(option);
  buttons[action]={button,reason,cost,cooldown};
}
function renderInfo(){const action=$('skill-select').value||'basic';$('skill-name').textContent=labels[action];$('skill-description').textContent=descriptions[action];$('skill-state').textContent=state?(invalidReason(state.battle,action,state.inventory.healingPowder)||'Sẵn sàng.'): 'Đang tải dữ liệu.';}
function showInfo(action){$('skill-select').value=action;$('skill-info').hidden=false;$('skill-info-toggle').setAttribute('aria-expanded','true');renderInfo();$('skill-select').focus({preventScroll:true});}
function closeInfo(){$('skill-info').hidden=true;$('skill-info-toggle').setAttribute('aria-expanded','false');$('skill-info-toggle').focus({preventScroll:true});}
$('skill-info-toggle').addEventListener('click',()=>{$('skill-info').hidden?showInfo($('skill-select').value):closeInfo();});
$('skill-info-close').addEventListener('click',closeInfo);
$('skill-select').addEventListener('change',renderInfo);
$('skill-info').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeInfo();}});
function failure(error) { $('error').hidden=false;$('error').textContent=`Chưa lưu/xử lý được: ${error.message || error.code}. Không coi thay đổi chưa commit là kết quả. Có thể tải lại để đối soát.`; }
function stopAnimation(){battleFX.stop();}
async function animate(action){await battleFX.play(action);}
function render(){
  if(!state||disposed)return;
  const b=state.battle,view=battlePresentation(state),active=view.active;
  $('arena').classList.toggle('is-safe',!active);$('enemy-hud').hidden=!view.enemyVisible;$('command-panel').hidden=!view.controlsVisible;
  document.querySelector('.safe-panel').hidden=active;$('safe-context').hidden=active;$('safe-context').textContent=view.context;
  $('player-hp').textContent=`${state.hp} / ${CHARACTER.maxHp}`;$('player-hp-bar').value=state.hp;
  $('player-ll').textContent=`${state.ll} / ${CHARACTER.maxLl}`;$('player-ll-bar').value=state.ll;
  $('enemy-hp').textContent=active?`${b.enemyHp} / 110`:'—';$('enemy-hp-bar').value=active?b.enemyHp:0;
  $('battle-label').textContent=view.location;$('turn-label').textContent=active?`Lượt ${b.turn} · Rev ${state.revision}`:b?`${view.resultTitle} · đã lưu`:'Trận mới chưa bắt đầu';
  $('player-status').textContent=active?(b?.shield?`Khiên ${b.shield.amount} · hết sau pha ${b.shield.expiresAfterPhase}`:'Không có khiên'):(state.hp===0?'Chưa hồi phục · nhấn Nghỉ mock':'Tại điểm an toàn');
  if(active&&b.character.accessoryId)$('player-status').textContent+=` · Ngọc Hộ Thân · Phòng Thủ ${b.character.defense}`;
  $('enemy-status').textContent=b?.weaken?`Suy yếu 20% · hết sau đòn kế hoặc pha ${b.weaken.expiresAfterPhase}`:'Không có suy yếu';
  const i=intent(b);$('intent').replaceChildren();
  const title=document.createElement('strong'),desc=document.createElement('span');
  title.textContent=i?({prepare:'◇ TỤ LỰC',heavy:'△ TRỌNG KÍCH',basic:'— CẮN'}[i.kind]):'— CHƯA GIAO CHIẾN';
  desc.textContent=i?(i.kind==='prepare'?'Không đánh. Pha sau sẽ trọng kích.':`Dự kiến ${i.rawDamage} trước thủ/khiên.`):'Không có thời gian chờ hoặc EXP thụ động.';$('intent').append(title,desc);
  for(const [a,v] of Object.entries(buttons)){
    const reason=invalidReason(b,a,state.inventory.healingPowder);
    v.button.disabled=busy||!active||!!reason;v.reason.textContent=reason||(SKILLS[a]?`Sẵn sàng · từ lượt ${b.readyAt[a]}`:'Sẵn sàng');
    const remaining=cooldownRemaining(b,a);v.cooldown.hidden=!remaining;v.cooldown.textContent=String(remaining);v.button.dataset.ready=String(!reason&&active&&!busy);
    if(a==='potion')v.cost.textContent=`×${state.inventory.healingPowder}`;
    v.button.setAttribute('aria-label',`${labels[a]}${SKILLS[a]?', 6 Linh Lực':''}${remaining?`, hồi chiêu còn ${remaining} lượt`:''}${a==='potion'?`, còn ${state.inventory.healingPowder} viên`:''}`);
  }
  renderInfo();
  renderWorld($('world-panel'),state,busy,send);
  $('run-create').disabled=busy;$('run-open').disabled=busy;$('run-select').disabled=busy;
  if($('jade-run-create'))$('jade-run-create').disabled=busy;
  $('start').disabled=busy||active||state.hp===0;$('rest').disabled=busy||active;
  $('inventory').textContent=`Hồi Sinh Tán: ${state.inventory.healingPowder} · Phôi ngọc mock: ${state.inventory.jadeBlank}`;
  $('save-status').textContent=busy?'Đang xử lý…':`Đã commit cục bộ · Rev ${state.revision}`;
  $('run-label').textContent=`MOCK_ONLY · Run ${state.runId} · ${state.battle?.id||'Chưa có encounter'}`;
  $('log').replaceChildren();
  for(const row of b?.log||[]){const li=document.createElement('li');li.textContent=`L${row.turn} · ${labels[row.action]}${row.dealt?` gây ${row.dealt}`:''}${row.healed?` hồi ${row.healed} HP`:''}. ${row.enemyAction==='prepare'?'Địch tụ lực.':row.enemyAction?`Địch đánh ${row.received} HP${row.absorbed?`, khiên đỡ ${row.absorbed}`:''}.`:'Địch không hành động.'} Còn ${row.hp} HP / ${row.ll} LL. ${row.events.join(' ')}`;$('log').append(li);}
  const terminal=b&&!active;$('result').hidden=!terminal;
  $('turn-feedback').textContent=b?.log.length?`Lượt ${b.log.at(-1).turn}: ${labels[b.log.at(-1).action]} · nhận ${b.log.at(-1).received} sát thương.`:'Chọn hành động. Xem mô tả qua Thông tin chiêu.';
  if(terminal){$('result-title').textContent=`${view.resultTitle} · kết quả trận gần nhất`;$('result-text').textContent=`Đã ở điểm an toàn. Kết quả trận được giữ nguyên; HP/LL hiện tại chỉ hồi khi bạn chọn Nghỉ mock. Vật tư đã dùng không hoàn lại.`;
    const receipt=state.rewards.find(r=>r.encounterId===b.id);$('receipt-text').textContent=receipt?`Đã cấp 1 phôi ngọc mock · ${receipt.id} · MOCK_ONLY · không thể đổi thành tài sản thật.`:b.state==='WON'?'Nguồn phôi trong run đã nhận trước đó (chiến đấu/khảo sát); không cấp thêm.':'Không nhận phần thưởng thắng.';}
}
async function renderRuns(){const runs=await repo.listRuns();$('run-select').replaceChildren();for(const r of runs){const option=document.createElement('option');option.value=r.trialRunId||'';option.textContent=r.label;$('run-select').append(option);}$('run-select').value=repo.trialRunId||'';}
async function switchRun(trialRunId){
  if(busy||disposed)return;busy=true;render();let next;
  try{
    next=await MockRepository.open({trialRunId:trialRunId||null});const saved=await next.read();repo.close();repo=next;state=saved;
    const url=new URL(location.href);url.hash=trialRunId?`run=${encodeURIComponent(trialRunId)}`:'';history.replaceState(null,'',url);
    await renderRuns();$('run-status').textContent=trialRunId?'Đang mở run thử riêng. Run gốc vẫn được giữ.':'Đang mở lại run gốc; dữ liệu được bảo tồn.';
  }catch(e){if(next&&next!==repo)next.close();failure(e);}finally{busy=false;render();}
}
$('run-open').addEventListener('click',()=>switchRun($('run-select').value));
const jadeCreate=document.createElement('button');jadeCreate.id='jade-run-create';jadeCreate.type='button';jadeCreate.textContent='Tạo run MR3 — thử ngọc riêng';$('run-create').after(jadeCreate);
jadeCreate.addEventListener('click',async()=>{if(busy||disposed)return;busy=true;render();let id;try{id=await repo.createTrial({jadeAdapter:true});}catch(e){failure(e);}finally{busy=false;render();}if(id)await switchRun(id);});
$('run-create').addEventListener('click',async()=>{if(busy||disposed)return;busy=true;render();let id;try{id=await repo.createTrial();}catch(e){failure(e);}finally{busy=false;render();}if(id)await switchRun(id);});
async function refresh(){if(disposed||!repo)return;if(busy){pendingRefresh=true;return;}try{state=await repo.read();render();}catch(e){failure(e);}}
async function send(type,extra={}) {
  if(busy||disposed||!state)return;busy=true;$('error').hidden=true;render();
  const command={id:crypto.randomUUID(),ownerId:OWNER_ID,runId:state.runId,expectedRevision:state.revision,type,...extra};
  try{
    await repo.dispatch(command);
    state=await repo.read();render();channel?.postMessage('commit');
    if(type==='ACTION')await animate(extra.action);
  }catch(e){failure(e);try{state=await repo.read();}catch{}}
  finally{busy=false;render();if(pendingRefresh){pendingRefresh=false;await refresh();}}
}
$('start').addEventListener('click',()=>send('START'));
$('rest').addEventListener('click',()=>send('REST'));
$('skip').addEventListener('click',stopAnimation);
$('reduce-motion').addEventListener('change',()=>{document.body.classList.toggle('reduced-motion',$('reduce-motion').checked);stopAnimation();});
$('library-info').addEventListener('click',()=>{$('library-message').hidden=!$('library-message').hidden;});
function visibility(){if(document.hidden)stopAnimation();else refresh();}
function focus(){refresh();}
function dispose(){disposed=true;stopAnimation();channel?.close();repo?.close();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus);}
document.addEventListener('visibilitychange',visibility);window.addEventListener('focus',focus);
window.addEventListener('pagehide',dispose,{once:true});
// A bfcache restoration requires reopening the closed database connection.
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
try {
  if(location.protocol==='file:')throw Error('Hãy dùng server localhost theo README; không mở bằng file://');
  const requestedRun=new URLSearchParams(location.hash.slice(1)).get('run');
  if(requestedRun&&!/^[a-zA-Z0-9-]{1,100}$/.test(requestedRun))throw Error('Run thử trong địa chỉ không hợp lệ; run gốc không bị thay đổi.');
  repo=await MockRepository.open({trialRunId:requestedRun||null});
  if('BroadcastChannel' in window){channel=new BroadcastChannel('tutien-s-mock-updates');channel.onmessage=refresh;}
  state=await repo.read();await renderRuns();render();
} catch(e){failure(e);$('save-status').textContent='Persistence chưa sẵn sàng';}
