import {openModule} from './module-repository.mjs';
import {CULTIVATION_VIEW,FLOOR} from './dungeon-state.mjs';
import {OWNER_ID,CHARACTER,SKILLS} from '../fixture.mjs';
import {intent,invalidReason} from '../combat-core.mjs';
import {cooldownRemaining} from '../presentation.mjs';
import {actionIcon} from '../ui-icons.mjs';
import {createBattleAnimation} from '../battle-animation.mjs';
import {WAVES,chainOpen} from './waves-state.mjs';
import {p3ChainOpen,behaviorText} from './exploration-state.mjs';
import {renderExploration,renderLoot} from './exploration-ui.mjs';
const explorationMode=new URLSearchParams(location.search).get('explore')==='1';
const wavesMode=new URLSearchParams(location.search).get('waves')==='1';
if(wavesMode){document.querySelector('.eyebrow').textContent='DUDU STUDIO · MOD-P2';document.title='Tu Tiên · Ba ải và boss · MOCK ONLY';}
if(explorationMode){document.querySelector('.eyebrow').textContent='DUDU STUDIO · MOD-P3';document.title='Tu Tiên · Cơ duyên trong phó bản · MOCK ONLY';}
const $=id=>document.getElementById(id),labels={basic:'Đánh thường',guard:'Thủ thế',cleave:'Liệt Phong Trảm',ward:'Thạch Giáp Quyết',suppress:'Hàn Tuyền Chú',potion:'Hồi Sinh Tán',retreat:'Rút lui'},short={basic:'Thường',guard:'Thủ',cleave:'Trảm',ward:'Giáp',suppress:'Hàn'};
const descriptions={basic:'Đòn thường, hồi 3 Linh Lực.',guard:'Giảm 50% sát thương pha địch hiện tại, hồi 6 Linh Lực.',cleave:'6 Linh Lực, đòn ×1,5. Hồi chiêu hai lượt hành động tiếp theo.',ward:'6 Linh Lực, khiên 28 bảo vệ tối đa hai pha địch. Hồi chiêu hai lượt.',suppress:'6 Linh Lực, đòn thường và suy yếu 20% cho đòn địch tiếp theo, tối đa hai pha. Hồi chiêu hai lượt.',potion:'Hồi tối đa 35 HP, tiêu một viên và một lượt. Không dùng khi đầy HP.',retreat:'Kết thúc trận. Không mất Tu Vi/trang bị; đan đã dùng không hoàn lại.'};
let repo,state,busy=false,disposed=false,channel,pending=false;
let presentingResult=false;
const battleFX=createBattleAnimation({arena:$('arena'),event:$('visual-event'),skip:$('skip'),reduced:$('reduce-motion'),isDisposed:()=>disposed});
let screen=['home','floor','prepare','combat','result','exploration'].includes(location.hash.slice(1))?location.hash.slice(1):'home';
const buttons={};
for(const [action,label]of Object.entries(labels)){
 const primary=Object.hasOwn(short,action),cell=document.createElement('div'),b=document.createElement('button'),cost=document.createElement('span'),cooldown=document.createElement('span'),caption=document.createElement('span');
 cell.className=primary?'action-cell primary-action':'action-cell utility-action';b.type='button';b.dataset.action=action;b.className=primary?'skill-button':'utility-button';b.append(actionIcon(action));cost.className='cost-tag';cost.setAttribute('aria-hidden','true');cooldown.className='cooldown-tag';cooldown.setAttribute('aria-hidden','true');caption.className=primary?'short-label':'utility-label';caption.textContent=short[action]||(action==='potion'?'Đan':'Rút lui');b.append(cost,cooldown);if(!primary)b.append(caption);cell.append(b);if(primary)cell.append(caption);(primary?$('actions'):$(action==='potion'?'potion-slot':'retreat-slot')).append(cell);
 b.addEventListener('click',()=>send('ACTION',{action,encounterId:state?.battle?.id,completedAt:Date.now()}));
 const option=document.createElement('option');option.value=action;option.textContent=label;$('skill-select').append(option);buttons[action]={b,cost,cooldown};
}
function show(next){if(next!=='combat')battleFX.stop();screen=next;history.replaceState(null,'',`#${next}`);render();}
function failure(e){$('module-error').hidden=false;$('module-error').textContent=`Chưa xác nhận được: ${e.message||e.code}. Không coi thay đổi chưa lưu là kết quả. Tải lại để đối soát.`;}
function info(){const a=$('skill-select').value;$('skill-description').textContent=descriptions[a];$('skill-reason').textContent=invalidReason(state?.battle,a,state?.inventory.healingPowder)||'Sẵn sàng';}
function render(){
 if(!state||disposed)return;const b=state.battle,d=state.dungeon,active=b?.state==='ACTIVE';
 if(screen==='exploration'&&(d.version!==3||!['BETWEEN','EXPLORING'].includes(d.status)))screen=active?'combat':'home';
 if(screen==='combat'&&!active&&!presentingResult)screen=b?'result':'prepare';if(screen==='result'&&(!b||active))screen=active?'combat':'home';
 for(const s of ['home','floor','prepare','combat','result','exploration'])$(s+'-screen').hidden=screen!==s;
 $('home-back').hidden=screen==='home';$('save-note').textContent=busy?'Đang lưu…':'Đã lưu cục bộ';$('save-note').dataset.revision=state.revision;
 $('realm-view').textContent=CULTIVATION_VIEW.realm;$('cultivation-text').textContent=`Tu Vi giả lập: ${CULTIVATION_VIEW.tuVi} / ${CULTIVATION_VIEW.next}`;$('equipment-view').textContent=CULTIVATION_VIEW.weapon;
 const inChain=d.version===3?p3ChainOpen(state):d.version===2&&chainOpen(state);
 $('home-condition').textContent=`Sinh Mệnh ${state.hp}/${CHARACTER.maxHp} · Linh Lực ${state.ll}/${CHARACTER.maxLl}${active?' · Trận đang tạm dừng, có thể tiếp tục trong phó bản.':inChain?' · Chuỗi đang dở; tiếp tục ải kế trong phó bản.':''}`;
 const status={NOT_STARTED:'Chưa bắt đầu',ACTIVE:'Đang chiến đấu · tiếp tục',WON:'Đã thắng',LOST:'Thất bại · có thể thử lại',RETREATED:'Đã rút lui · có thể thử lại'};
 const waveName=d.version>=2?`${d.waveIndex===2?'Boss':'Ải'} ${d.waveIndex+1}/3`:'Tầng 1';
 $('choose-floor').querySelector('strong').textContent=d.version===2?'Tầng 1 · Ba ải Nham thú':'Tầng 1 · Nham thú';
 $('floor-status').textContent=d.version>=2?`${waveName} · ${['BETWEEN','EXPLORING'].includes(d.status)?'Điểm an toàn, có thể khám phá hoặc đi tiếp':status[d.status]}`:status[d.status];$('clear-status').textContent=d.cleared?'Đã vượt tầng 1. Chơi lại không cấp thưởng một lần.':'Chưa vượt tầng 1.';
 $('prepare-resources').textContent=`Bạn: ${state.hp}/148 HP · ${state.ll}/38 Linh Lực · Hồi Sinh Tán: ${state.inventory.healingPowder}`;
 $('prepare-reason').textContent=active?'Đã có trận đang dở; tiếp tục trận cũ.':!state.hp?'Cần Nghỉ mock để hồi HP trước khi bắt đầu.':'Sẵn sàng. Nghỉ hồi HP/LL nhưng không hoàn đan.';
 $('begin-floor').textContent=active||inChain?'Tiếp tục':'Bắt đầu';$('begin-floor').disabled=busy||!active&&!state.hp;
 for(const id of ['home-rest','prepare-rest'])$(id).disabled=busy||active||inChain;
 if(d.version>=2){$('prepare-title').textContent='Chuẩn bị · Chuỗi ba ải';$('prepare-title').nextElementSibling.textContent=d.version===3?'Tiểu Nham Thú → Linh thảo tùy chọn → Nham Thú → Ổ trứng tùy chọn → Boss.':'Tiểu Nham Thú → Nham Thú → Nham Thú Vương (boss).';$('prepare-title').nextElementSibling.nextElementSibling.textContent='Giữ HP, Linh Lực và đan qua ba trận; không hồi đầy giữa ải. Cooldown và hiệu ứng kết thúc theo từng trận.';if(inChain)$('prepare-reason').textContent='Chuỗi đang dở: tiếp tục từ danh sách tầng, không nghỉ hồi đầy giữa ải.';}
 for(const id of ['go-dungeon','choose-floor','replay-floor','home-back','floors-back','result-home'])$(id).disabled=busy;
 if($('p3-trial-create'))$('p3-trial-create').disabled=busy;
 if(b){
  $('battle-name').textContent=d.version>=2?`${waveName} · ${b.enemy.label}`:'TẦNG 1 · NHAM THÚ';$('arena').classList.toggle('is-boss',!!b.enemy.boss);document.querySelector('.fighter.enemy h2').textContent=b.enemy.label;document.querySelector('.enemy-heading>span').textContent=b.enemy.boss?'BOSS · Nham Thú Vương':b.enemy.label;
  $('battle-turn').textContent=`Lượt ${b.turn}`;$('enemy-hp').textContent=`${b.enemyHp} / ${b.enemy.maxHp}`;$('enemy-hp-bar').max=b.enemy.maxHp;$('enemy-hp-bar').value=b.enemyHp;$('player-hp').textContent=`${b.hp} / 148`;$('player-hp-bar').value=b.hp;$('player-ll').textContent=`${b.ll} / 38`;$('player-ll-bar').value=b.ll;
  const i=intent(b);$('intent').textContent=i?(i.kind==='prepare'?'◇ Tụ lực · không đánh; pha sau trọng kích.':i.kind==='heavy'?`△ Trọng kích · dự kiến ${i.rawDamage} sát thương trước thủ/khiên.`:`— Cắn · dự kiến ${i.rawDamage} sát thương trước thủ/khiên.`):'Trận đã kết thúc.';
  if(i&&b.enemy.boss)$('intent').textContent=i.kind==='prepare'?'◇ Boss tụ lực · tiếp theo là HAI trọng kích liên tiếp.':i.kind==='heavy'?`△ Boss trọng kích ${b.phase===1?'1/2 · pha sau còn trọng kích':'2/2 · pha sau cắn'} · dự kiến ${i.rawDamage} trước thủ/khiên.`:`— Boss cắn · dự kiến ${i.rawDamage} trước thủ/khiên; pha sau tụ lực.`;
  if(i&&d.version===3&&d.waveIndex===0)$('intent').textContent=b.phase===0?'Lẩn tránh · không đánh pha này; pha sau lộ thân và cắn.':`Lộ thân · cắn dự kiến ${i.rawDamage} trước thủ/khiên; sau đó lại lẩn tránh.`;
  $('player-status').textContent=b.shield?`Khiên ${b.shield.amount}`:'Không có khiên';$('enemy-status').textContent=b.weaken?'Suy yếu 20%':'Không có suy yếu';
  if(d.version===3&&behaviorText(state))$('enemy-status').textContent=`${behaviorText(state)}${b.weaken?' · Suy yếu 20%':''}`;
  const row=b.log.at(-1);$('turn-feedback').textContent=row?`${labels[row.action]}${row.dealt?`: gây ${row.dealt} sát thương`:''}. ${row.enemyAction==='prepare'?'Địch tụ lực.':row.enemyAction?`Nhận ${row.received} sát thương${row.absorbed?`, khiên đỡ ${row.absorbed}`:''}.`:'Địch không hành động.'}`:'Đọc ý định đối thủ rồi chọn hành động; không có thời gian đếm ngược.';
  $('result-title').textContent={WON:'Chiến thắng · Tầng 1',LOST:'Chiến bại · Tầng 1',RETREATED:'Đã rút lui'}[b.state]||'';
  $('result-description').textContent=b.state==='WON'?'Đã hạ Nham thú. Có thể quay về Tu Tiên hoặc chơi lại.':'Đã trở về an toàn. Không mất Tu Vi hoặc trang bị; vật tư đã sử dụng không hoàn lại.';
  $('result-progress').textContent=d.cleared?'Thành tích vượt tầng đã lưu. Không cấp EXP, Tu Vi, Xu hoặc vật phẩm.':'Chưa vượt tầng. Có thể nghỉ hồi HP/LL rồi thử lại.';
  if(d.version>=2){const between=['BETWEEN','EXPLORING'].includes(d.status);$('result-title').textContent=between?`Đã thắng ${waveName} · ${b.enemy.label}`:d.status==='WON'?'Hoàn thành tầng 1 · Boss đã bị hạ':d.status==='LOST'?`Thất bại tại ${waveName}`:`Đã rút lui tại ${waveName}`;$('result-description').textContent=between?`Còn ${state.hp} HP / ${state.ll} Linh Lực / ${state.inventory.healingPowder} đan. Không hồi đầy khi sang ải; nút tiếp tục mở trận kế.`:'Chuỗi đã kết thúc. Không mất Tu Vi hoặc trang bị; vật tư đã dùng không hoàn lại.';$('result-progress').textContent=between?'Chưa hoàn thành lượt này: cần đánh bại boss. Không cấp receipt hoàn thành giữa ải.':d.status==='WON'?'Đã lưu thành tích vượt tầng. Receipt một lần; không phát Xu, EXP, Tu Vi hoặc vật phẩm.':'Có thể nghỉ ở Tu Tiên rồi bắt đầu lại từ ải 1.';$('replay-floor').textContent=between?d.version===3?`Tiếp tục → ${d.waveIndex===0?'Bãi linh thảo':'Ổ trứng'}`:`Tiếp tục → ${d.waveIndex===1?'Boss 3/3':'Ải 2/3'}`:'Chơi lại chuỗi ba ải';if(d.version===3&&!between)$('result-progress').textContent+=(d.status!=='WON'?' Chưa nhận thưởng vượt tầng.':'')+' Túi chiến lợi phẩm đã commit được giữ nguyên.';}
 }
 for(const [action,v]of Object.entries(buttons)){
  const reason=invalidReason(b,action,state.inventory.healingPowder),cd=cooldownRemaining(b,action);v.b.disabled=busy||!!reason;v.b.title=`${labels[action]} — ${reason||descriptions[action]}`;v.b.setAttribute('aria-label',`${labels[action]}: ${reason||descriptions[action]}`);v.b.dataset.ready=String(!reason&&!busy);v.cost.textContent=action==='potion'?`×${state.inventory.healingPowder}`:SKILLS[action]?'6 LL':Object.hasOwn(short,action)?'+LL':'';v.cooldown.hidden=!cd;v.cooldown.textContent=cd;
 }
 if(d.version===3&&screen==='exploration')renderExploration($('exploration-screen'),state,busy,send);renderLoot($('loot-bag'),state);
 info();$('debug-state').textContent=JSON.stringify({environment:state.environment,ownerId:state.ownerId,runId:state.runId,revision:state.revision,dungeon:d},null,2);
}
async function refresh(){if(disposed||!repo)return;if(busy){pending=true;return;}try{state=await repo.read();render();}catch(e){failure(e);}}
async function send(type,extra={}){
 if(!repo||!state||busy||disposed)return;busy=true;$('module-error').hidden=true;render();
 const c={id:crypto.randomUUID(),ownerId:OWNER_ID,runId:state.runId,expectedRevision:state.revision,type,...extra};
 try{const committed=await repo.dispatch(c);state=await repo.read();if(type==='START'||type==='NEXT_WAVE')screen='combat';if(['OPEN_EVENT','HERB_PICK','EGG_STEP'].includes(type))screen='exploration';if(type==='RETREAT_SAFE')screen='result';presentingResult=type==='ACTION'&&state.battle.state!=='ACTIVE';render();channel?.postMessage('commit');if(type==='ACTION'&&!committed.duplicate)await battleFX.play(extra.action);if(presentingResult){presentingResult=false;screen='result';}history.replaceState(null,'',`#${screen}`);}
 catch(e){failure(e);try{state=await repo.read();}catch{}}
 finally{presentingResult=false;busy=false;render();if(pending){pending=false;await refresh();}}
}
$('home-back').onclick=()=>show('home');$('go-dungeon').onclick=()=>show('floor');$('choose-floor').onclick=()=>show(state.battle?.state==='ACTIVE'?'combat':['BETWEEN','EXPLORING'].includes(state.dungeon.status)?state.dungeon.version===3?'exploration':'result':'prepare');$('floors-back').onclick=()=>show('floor');$('result-home').onclick=()=>show('home');$('replay-floor').onclick=()=>['BETWEEN','EXPLORING'].includes(state.dungeon.status)?state.dungeon.version===3?show('exploration'):send('NEXT_WAVE',{encounterId:state.battle.id}):show('prepare');
$('begin-floor').onclick=()=>state.battle?.state==='ACTIVE'?show('combat'):state.dungeon.status==='BETWEEN'?send('NEXT_WAVE',{encounterId:state.battle.id}):send('START',{floorId:FLOOR.id});for(const id of ['home-rest','prepare-rest'])$(id).onclick=()=>send('REST');$('skill-select').onchange=info;
$('skip').onclick=()=>battleFX.stop();$('reduce-motion').onchange=()=>{document.body.classList.toggle('reduced-motion',$('reduce-motion').checked);battleFX.stop();};
function visible(){if(document.hidden)battleFX.stop();else refresh();}document.addEventListener('visibilitychange',visible);window.addEventListener('focus',refresh);
window.addEventListener('pagehide',()=>{disposed=true;battleFX.stop();channel?.close();repo?.close();document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',refresh);},{once:true});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
if(explorationMode){const b=document.createElement('button');b.type='button';b.textContent='Tạo run MOD-P3 thử riêng — giữ túi hiện tại';b.id='p3-trial-create';b.onclick=async()=>{if(busy||!repo)return;busy=true;render();try{const id=await repo.createTrial({exploration:true});const url=new URL(location.href);url.searchParams.set('trial',id);url.hash='home';location.assign(url);}catch(e){failure(e);busy=false;render();}};document.querySelector('.module-debug').append(b);}
try{repo=await openModule({edition:explorationMode?'explore':wavesMode?'waves':'single',explorationRunId:explorationMode?new URLSearchParams(location.search).get('trial'):null});if('BroadcastChannel'in window){channel=new BroadcastChannel(explorationMode?'tutien-module-p3-updates':wavesMode?'tutien-module-p2-updates':'tutien-module-p1-updates');channel.onmessage=refresh;}state=await repo.read();render();}catch(e){failure(e);$('save-note').textContent='Chưa mở được lưu trữ';for(const id of ['go-dungeon','home-rest','choose-floor','begin-floor'])$(id).disabled=true;}
