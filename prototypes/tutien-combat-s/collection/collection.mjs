import {entryCostView} from './result-view.mjs';
import {valueFromPosition,mountForceControl} from './force-control.mjs';
import {advanceStamina,syncStamina,persistResources,nextPointSeconds,formatTime,entryEligibility} from './resource-state.mjs';
import {mountProfile} from './profile-card.mjs';
import {enterTripScene,restoreTrip,returnToTripPortal,finalizeTrip,hasTripBagRoom,commitFinalization} from './mock-trip.mjs';
import {mountTripBag} from './qiankun-run-bag.mjs';
import {mountResponsiveStage,placeStage,tileView} from './r3e-layout.mjs';
import {validateDiscovery} from './discovery.mjs';
import {SEARCH_CONFIG,upgradeDiscovery,searchEligibility,startSearch,cancelSearch,enterSearchArea,returnFromArea,finishSearch,commitMockCommand} from './search-session.mjs';
import {createState,begin,selectPoint,move,resolve,herbProfile,SEAMS,MOCK_CONFIG} from './model.mjs';
import layout from './r3d-layout/layout-map.mjs';

const $=id=>document.getElementById(id),asset=p=>new URL('../../../assets/tu-tien/exploration-r3e/'+p,import.meta.url).href,stage=$('stage');
let params;try{params=new URL(window.top.location.href).searchParams;}catch{params=new URL(location.href).searchParams;}
const demo=params.get('collectionDemo')==='1',seed=Number(params.get('seed')||17),s=createState(seed),storageKey='dudu.collection.r2f.mock.session.v1';
const names={herb:layout.dynamic_strings.herb_title,mineral:layout.dynamic_strings.mineral_title,egg:layout.dynamic_strings.egg_title},states={herb:{success:'harvested',active:'active'},mineral:{success:'extracted',active:'selected'},egg:{success:'collected',active:'active'}};
const descriptions={herb:'Thung l\u0169ng linh th\u1ea3o gi\u1eefa n\u00fai r\u1eebng.',mineral:'M\u1ea1ch linh kho\u00e1ng \u1ea9n trong hang tinh th\u1ec3.',egg:'M\u1ed9t t\u1ed5 tr\u1ee9ng b\u00ed \u1ea9n gi\u1eefa s\u00e0o c\u1ed5.'};
let phase=0,last=0,busy=false,generation=0;const input={force:55},visited=new Set([6]);
let loadFailure=false,view='portal',profileHUD=null;
const commandStorage=demo?{getItem(){return null},setItem(){}}:sessionStorage;
if(!demo)try{const raw=sessionStorage.getItem(storageKey);if(raw){const saved=JSON.parse(raw);restoreTrip(s,saved);if(saved.scene&&['herb','mineral','egg'].includes(saved.scene)&&saved.ended===false)Object.assign(s,saved);if(!Number.isSafeInteger(s.seed))s.seed=17;if(s.explorationDiscovery){validateDiscovery(s.explorationDiscovery);upgradeDiscovery(s);if(s.explorationDiscovery.phase==='ENTERED'&&!s.scene)finishSearch(s,'RETREATED');if(s.explorationDiscovery.phase==='RESULT')view='result';}if(s.collectionRuntime?.version===1){if(Number.isFinite(s.collectionRuntime.force))input.force=Math.max(0,Math.min(100,s.collectionRuntime.force));for(const n of s.collectionRuntime.visited||[])if(Number.isInteger(n)&&n>=0&&n<9)visited.add(n);}}}catch{loadFailure=true;}
if(!loadFailure)advanceStamina(s,Date.now());
function save(){if(demo)return true;if(loadFailure)return false;try{s.collectionRuntime={version:1,force:input.force,visited:[...visited]};persistResources(s,sessionStorage);return true;}catch{message('Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c phi\u00ean. H\u00e3y th\u1eed l\u1ea1i.');return false;}}
function perform(mutate){if(loadFailure)return {valid:false,reason:'storage'};try{return commitMockCommand(s,commandStorage,mutate);}catch{message('Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c thao t\u00e1c. Ch\u01b0a tr\u1eeb t\u00e0i nguy\u00ean; h\u00e3y th\u1eed l\u1ea1i.');return {valid:false,reason:'storage'};}}
function message(text){$('feedback').textContent=text;$('feedback').hidden=!text;}
function closeInjury(){$('injury-detail').hidden=true;$('injury').setAttribute('aria-expanded','false');}
function paintPhase(){$('pointer').style.transform=`translate(-50%,-50%) rotate(${phase*360}deg) translateY(-230%)`;$('timing').dataset.ready=String(phase>=MOCK_CONFIG.timingMin&&phase<=MOCK_CONFIG.timingMax);$('timing').setAttribute('aria-valuenow',Math.round(phase*100));}
function draw(){
 if(demo)advanceStamina(s,Date.now());save();paintResources();const scene=s.scene||view,done=['success','damaged'].includes(s.status),waiting=scene==='egg'&&s.position!==2;
 stage.dataset.scene=scene;placeStage(stage,scene);$('lobby').hidden=scene!=='portal';$('scene').hidden=!s.scene;$('result-screen').hidden=scene!=='result';$('footer').hidden=scene==='result';closeJournal();

 $('injury').hidden=!s.injury;$('injury-label').textContent=s.injury?'Nội Thương: '+s.injury:'';if(s.injury){$('injury-icon').src=new URL('../../../assets/tu-tien/exploration-portal-r1/ui_svg/injury_badge_light.svg',import.meta.url);$('injury-title').textContent='Nội Thương: '+s.injury;}else closeInjury();
 const bg=asset('backgrounds/'+(scene==='result'?'portal':scene)+'_clean.webp');if($('background').src!==bg)$('background').src=bg;


 $('action-label').textContent=!s.scene?layout.dynamic_strings.portal_action:scene==='egg'?(waiting?layout.dynamic_strings.egg_action_before_goal:layout.dynamic_strings.egg_action_after_goal):layout.dynamic_strings[scene+'_action'];
 $('retreat').disabled=busy;$('retreat').setAttribute('aria-label',scene==='portal'?'Trở về Động Phủ':'Trở về Cổng Thăm Dò');$('bag').setAttribute('aria-label','Túi đồ · '+(s.collectionRun?.phase==='ACTIVE'?s.bag.length:0)+' vật phẩm');
 $('retreat').setAttribute('aria-haspopup',!s.scene?'dialog':'false');$('retreat').setAttribute('aria-label',!s.scene?'Nh\u1eadt k\u00fd':'Tr\u1edf v\u1ec1 C\u1ed5ng Th\u0103m D\u00f2');$('retreat').querySelector('.r3e-round-icon').src=asset('ui/'+(!s.scene?'journal_icon.svg':'retreat_icon.svg'));if(!s.scene){if(view==='result')renderResult();return;}
 $('scene').dataset.kind=scene;$('scene').dataset.status=s.status;$('scene').dataset.force=input.force;$('scene').dataset.position=s.position;$('scene').dataset.result=s.lastResult?.reason||'';
 const objectSrc=asset(`objects/${scene}/${states[scene][s.status]||s.status}.png`);if($('object').src!==objectSrc)$('object').src=objectSrc;$('object').dataset.state=s.status;$('object').alt=scene==='egg'?'Tổ trứng bí ẩn, chưa xác định danh tính':scene==='herb'?'Linh thảo có thân rễ chắc':'Khối linh khoáng';
 $('force').disabled=busy||done;$('timing-wrap').hidden=scene==='mineral';$('timing-tap').disabled=busy||done||waiting||!hasTripBagRoom(s)||s.stamina<MOCK_CONFIG.staminaCost;$('timing-tap').querySelector('span').textContent=done?'Đã kết thúc':waiting?'Đến tổ \u0111\u1ec3 canh nh\u1ecbp':'Chạm nhịp';
 $('clue').textContent=scene==='herb'?herbProfile(s.seed).hint:scene==='mineral'?(s.point===null?'Quan sát ba mạch rồi chọn điểm tác động.':SEAMS[s.point].hint):waiting?'Chọn ô kề để đến tổ. Bẫy Lôi chưa lộ.':'Đã đến tổ. Chạm đúng nhịp linh khí.';
 for(const b of document.querySelectorAll('[data-point]')){const n=Number(b.dataset.point);b.setAttribute('aria-pressed',String(n===s.point));b.disabled=busy||done;b.setAttribute('aria-label',`Điểm ${n+1}: ${SEAMS[n].hint}`);}
 for(const b of $('grid').children){const p=Number(b.dataset.cell),adj=Math.abs(Math.floor(p/3)-Math.floor(s.position/3))+Math.abs(p%3-s.position%3)===1,v=tileView(s,p,visited);b.disabled=busy||done;b.setAttribute('aria-disabled',String(!adj||busy||done));b.setAttribute('aria-current',String(p===s.position));b.setAttribute('aria-label',`Ô ${p+1} · ${v.label}`);b.firstChild.src=asset('ui/tile_'+v.art+'.svg');b.dataset.revealed=String(v.art==='safe'||v.art==='hazard_revealed');}
 paintPhase();
}
function prepareSceneView(){const kind=s.scene;$('lobby').hidden=!!kind;$('scene').hidden=!kind;$('cracks').hidden=kind!=='mineral';$('grid').hidden=kind!=='egg';$('force-wrap').hidden=kind==='egg';$('force').value=input.force;$('force-value').textContent=input.force;}
function openScene(){if(loadFailure||s.scene)return;let result;try{result=enterSearchArea(s,commandStorage,{runId:'mock-trip-'+crypto.randomUUID()});}catch{message('Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c l\u01b0\u1ee3t v\u00e0o khu. H\u00e3y th\u1eed l\u1ea1i.');return;}if(!result.valid){message(shortage(result));return;}view='portal';generation++;phase=0;last=0;input.force=55;visited.clear();visited.add(6);prepareSceneView();closeInjury();message('');draw();}
function resultText(r){const force={force_low:'Lực quá yếu: chưa tách được nguyên liệu.',force_high:'Lực quá mạnh: nguyên liệu bị tổn hại.',force_ok:'Lực phù hợp.'},timing={timing_hit:'Đúng nhịp linh khí.',timing_miss:'Lệch nhịp linh khí.'};return [force[r.forceFeedback],timing[r.timingFeedback],r.reason==='hazard'?'Đã phát hiện Lôi ẩn.':null,r.success?'Thu thập thành công. Đã giữ trong túi.':'Thiên Lôi Phản Phệ. Vật phẩm đã có được giữ nguyên.'].filter(Boolean).join(' ');}
async function effects(r){if(!r.valid)return;const token=generation;message(resultText(r));if(r.lightning){busy=true;draw();for(const [file,label]of [['warning_violet.png','Thiên Lôi: cảnh báo'],['strike_violet_AI_original.png','Thiên Lôi: phản phệ'],['aftermath_violet.png','Linh khí lắng xuống']]){if(token!==generation)return;$('vfx').src=asset('vfx/'+file);$('vfx').hidden=false;$('vfx-label').textContent=label;await new Promise(resolve=>setTimeout(resolve,450));}$('vfx').hidden=true;$('vfx-label').textContent='';busy=false;}if(token===generation)draw();}
function collect(){if(!demo)syncStamina(s,sessionStorage);if(!s.scene){revealDiscovery();return;}if(busy||$('action').disabled)return;if(s.scene==='egg'&&s.position!==2){message('Chọn từng ô kề trên lưới để đến tổ trước.');return;}const r=perform(next=>resolve(next,{force:input.force,timing:phase}));if(r.reason==='storage')return;draw();if(!r.valid){message(r.reason==='stamina'?'Thể lực không đủ. Có thể rút lui.':'Hãy hoàn tất bước chuẩn bị trước.');return;}effects(r);}
$('injury').onclick=()=>{const show=$('injury-detail').hidden;$('injury-detail').hidden=!show;$('injury').setAttribute('aria-expanded',String(show));};$('injury-close').onclick=closeInjury;document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeInjury();closeJournal();}});document.addEventListener('pointerdown',e=>{if(!e.target.closest('#injury,#injury-detail'))closeInjury();});
for(const b of document.querySelectorAll('[data-point]'))b.onclick=()=>{if(selectPoint(s,Number(b.dataset.point))){draw();message('');}};
for(let p=0;p<9;p++){const b=document.createElement('button');b.dataset.cell=p;b.type='button';b.append(document.createElement('img'));b.firstChild.alt='';b.onclick=()=>{if(!demo)syncStamina(s,sessionStorage);const r=perform(next=>move(next,p));if(r.reason==='storage')return;if(!r.valid){message(r.reason==='stamina'?'Thể lực không đủ.':'Chỉ đi tới ô kề vị trí hiện tại.');return;}visited.add(p);draw();message('');if(r.nest)message('Đã đến tổ. Chạm vòng nhịp để thu thập.');if(r.lightning)effects(r);};$('grid').append(b);}
$('force').oninput=()=>{input.force=Number($('force').value);$('force-value').textContent=input.force;begin(s);draw();};
function dragForce(e){const range=$('force');if(range.disabled)return;e.preventDefault();const r=range.getBoundingClientRect(),localWidth=range.clientWidth,visualScale=r.width/localWidth,localX=(e.clientX-r.left)/visualScale;range.value=valueFromPosition(localX,localWidth);range.dispatchEvent(new Event('input',{bubbles:true}));}
mountForceControl($('force'));
$('force').addEventListener('pointerdown',e=>{if($('force').disabled)return;$('force').setPointerCapture(e.pointerId);dragForce(e);});$('force').addEventListener('pointermove',e=>{if($('force').hasPointerCapture(e.pointerId))dragForce(e);});$('force').addEventListener('pointerup',e=>{if($('force').hasPointerCapture(e.pointerId))$('force').releasePointerCapture(e.pointerId);});
$('timing-tap').onclick=collect;$('action').onclick=collect;
let bagPopup=null;
const retreatOrExit=()=>{if(busy||loadFailure||!s.scene)return;let r;try{r=returnFromArea(s,commandStorage);}catch{message('Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c chuy\u1ec3n c\u1ea3nh. H\u00e3y th\u1eed l\u1ea1i.');return;}if(!r.valid)return;generation++;view='portal';bagPopup?.close();prepareSceneView();closeInjury();message('');draw();};
$('retreat').onclick=()=>s.scene?retreatOrExit():openJournal();
$('bag').onclick=()=>bagPopup?.open();
if(demo){$('demo-tools').hidden=false;$('demo-label').textContent='Mô phỏng · seed '+s.seed;$('demo-reset').onclick=()=>{if(busy)return;generation++;Object.assign(s,createState(seed));visited.clear();visited.add(6);$('scene').hidden=true;$('lobby').hidden=false;message('');draw();window.scrollTo(0,0);};$('demo-clock').onchange=()=>{phase=$('demo-clock').value==='hit'?.5:.85;paintPhase();};}
function tick(now){if(!document.hidden&&s.scene&&!busy&&!['success','damaged'].includes(s.status)){if(demo&&$('demo-clock').value!=='live')phase=$('demo-clock').value==='hit'?.5:.85;else if(last)phase=(phase+Math.min(now-last,50)/1800)%1;paintPhase();}last=now;requestAnimationFrame(tick);}document.addEventListener('visibilitychange',()=>{last=0;});requestAnimationFrame(tick);let fitController=null,fitFrame=0,fitVisible=true;
function stopFit(){cancelAnimationFrame(fitFrame);fitFrame=0;fitController?.dispose();fitController=null;stage.dataset.fitReady='false';stage.dataset.fitActive='false';}
function startFit(){
 if(!fitVisible)return;const host=$('app');if(!host.clientWidth||!host.clientHeight){fitFrame=requestAnimationFrame(startFit);return;}
 if(!fitController)fitController=mountResponsiveStage({host,stage,scene:()=>s.scene||view});else fitController.update();
}
document.addEventListener('collection:visibility',e=>{fitVisible=e.detail===true;if(fitVisible){cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(startFit);}else {bagPopup?.close();stopFit();}});
window.addEventListener('pagehide',stopFit);window.addEventListener('pageshow',e=>{if(e.persisted&&fitVisible)startFit();});
bagPopup=mountTripBag({anchor:$('app'),opener:$('bag'),readState:()=>s,qaCapacity:demo&&params.has('bagQaCapacity')?Number(params.get('bagQaCapacity')):null});prepareSceneView();draw();startFit();window.addEventListener('pagehide',()=>{bagPopup.dispose();save();});


function shortage(gate){return gate.missing?'Thi\u1ebfu '+gate.missing+' Th\u1ec3 L\u1ef1c \u00b7 H\u1ed3i sau '+formatTime(gate.waitSeconds):'Ch\u01b0a th\u1ec3 th\u1ef1c hi\u1ec7n thao t\u00e1c.';}
function paintResources(){
 if(loadFailure){$('action').disabled=true;$('result-enter').disabled=true;$('search-note').textContent='Kh\u00f4ng \u0111\u1ecdc \u0111\u01b0\u1ee3c phi\u00ean. D\u1eef li\u1ec7u \u0111\u01b0\u1ee3c gi\u1eef nguy\u00ean.';return;}
 profileHUD?.refresh();
 const kind=s.explorationDiscovery?.scene,gate=kind?entryEligibility(s,kind):{allowed:false};
 $('result-enter').disabled=loadFailure||!gate.allowed;$('result-enter').title=gate.allowed?'':shortage(gate);
 const search=searchEligibility(s),terminal=['success','damaged'].includes(s.status);
 $('action').disabled=loadFailure||busy||(s.scene?(terminal||!hasTripBagRoom(s)||s.stamina<MOCK_CONFIG.staminaCost||(s.scene==='mineral'&&s.point===null)):!search.allowed);
 $('timing-tap').disabled=busy||terminal||(s.scene==='egg'&&s.position!==2)||!hasTripBagRoom(s)||s.stamina<MOCK_CONFIG.staminaCost;
 $('search-note').textContent=!search.allowed?shortage(search):search.cost===0?'K\u1ebft qu\u1ea3 \u0111ang ch\u1edd \u00b7 kh\u00f4ng tr\u1eeb th\u00eam':('D\u00f2 t\u00ecm: '+SEARCH_CONFIG.explorationSearchCost+' Th\u1ec3 L\u1ef1c');
 $('cost-hint').hidden=!s.scene||terminal||s.stamina>=MOCK_CONFIG.staminaCost;
 if(!$('cost-hint').hidden){const missing=MOCK_CONFIG.staminaCost-s.stamina;$('cost-hint').textContent=shortage({missing,waitSeconds:nextPointSeconds(s)+(missing-1)*60});}
}
function revealDiscovery(){
 if(loadFailure||s.scene||view==='result')return;let r;
 try{r=startSearch(s,commandStorage,{id:'mock-search-'+crypto.randomUUID()});}catch{message('Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c l\u01b0\u1ee3t d\u00f2. Ch\u01b0a tr\u1eeb Th\u1ec3 L\u1ef1c.');return;}
 if(!r.valid){message(shortage(r));paintResources();return;}view=r.discovery.phase==='RESULT'?'result':'portal';message('');draw();
}

// Presentation only: resolve the already-discovered scene and show existing R4 art.
function renderResult(){const kind=s.explorationDiscovery?.scene;if(!kind)return;$('background').src=asset('backgrounds/'+kind+'_clean.webp');$('result-image').src=asset('objects/'+kind+'/intact.png');$('result-name').textContent=names[kind];$('result-description').textContent=descriptions[kind];const cost=entryCostView(entryEligibility(s,kind).cost);$('result-cost').hidden=cost.hidden;$('result-cost').textContent=cost.text;}
$('result-back').onclick=()=>{try{const r=cancelSearch(s,commandStorage);if(!r.valid)return;view='portal';message('');draw();}catch{message('Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c vi\u1ec7c h\u1ee7y l\u01b0\u1ee3t d\u00f2. H\u00e3y th\u1eed l\u1ea1i.');}};
$('result-enter').onclick=()=>{if(view!=='result'||s.scene)return;openScene();};
function openJournal(){$('journal-content').textContent=s.explorationDiscovery?names[s.explorationDiscovery.scene]+'\n'+(s.lastResult?resultText(s.lastResult):'\u0110\u00e3 ph\u00e1t hi\u1ec7n \u0111\u1ecba \u0111i\u1ec3m.'):'Ch\u01b0a c\u00f3 k\u1ebft qu\u1ea3 th\u0103m d\u00f2.';$('journal').hidden=false;$('journal').showModal();$('retreat').setAttribute('aria-expanded','true');$('journal-close').focus();}
function closeJournal(){const panel=$('journal');if(panel.open)panel.close();panel.hidden=true;$('retreat').setAttribute('aria-expanded','false');}
$('journal-close').onclick=()=>{closeJournal();$('retreat').focus();};
$('journal').addEventListener('cancel',e=>{e.preventDefault();closeJournal();$('retreat').focus();});
$('journal').addEventListener('click',e=>{if(e.target!==$('journal'))return;const r=$('journal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){closeJournal();$('retreat').focus();}});
document.addEventListener('collection:request-exit',e=>{if(loadFailure)return;if(busy){e.preventDefault();return;}if(s.scene){retreatOrExit();if(s.scene){e.preventDefault();return;}}if(s.collectionRun?.phase==='ACTIVE'){try{commitFinalization(s,`finalize:${s.collectionRun.id}`,next=>{if(next.explorationDiscovery?.phase==='ENTERED')finishSearch(next,'TRIP_ENDED');if(!demo)persistResources(next,sessionStorage);});}catch{e.preventDefault();message('Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c chuy\u1ebfn. H\u00e3y th\u1eed l\u1ea1i.');}}});
profileHUD=mountProfile(document,{readResources:()=>s});
const resourceTimer=setInterval(()=>{if(!demo&&!loadFailure){save();paintResources();}},1000);
window.addEventListener('pagehide',()=>clearInterval(resourceTimer),{once:true});
