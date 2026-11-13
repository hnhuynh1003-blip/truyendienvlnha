// Slice M rules. No DOM, clock, network, RNG, economy or cultivation writes.
import { RuleError, clone } from './combat-core.mjs';
import { ENVIRONMENT } from './fixture.mjs';
import {TREATMENTS} from './jade-policy.mjs';

export const QUEST_STATES = ['NOT_STARTED','SOURCE_OPEN','MATERIAL_SECURED','FINAL_ROUTE_OPEN','COMPLETE'];
export const LOCATIONS = {safe:'Điểm an toàn',fork:'Ngã rẽ',direct:'Đường trực tiếp',survey:'Đường khảo sát',workshop:'Bàn chế tác',fog:'Cửa sương',marker:'Điểm đánh dấu tuyến'};
export const CLUES = Object.freeze({
  wind:'Cỏ rạp về bên phải: lối phải đón gió trực diện. Muốn đi tuyến gió cần nhận diện luồng gió và có Ngọc Hộ Thân.',
  water:'Dòng nước ở lối giữa đổ xuống khe sâu. Lối giữa không có nền đá liên tục.',
  moss:'Dải rêu sáng nối liền trên phiến đá bên trái, không có khoảng đứt. Đây là dấu hiệu một lối đi vững.'
});
const fail=(code,message)=>{throw new RuleError(code,message);};
export function ensureWorld(input) {
  if(input.world) { validateWorld(input); return input; }
  const s=clone(input);
  // Old S first-win receipts and actual unspent jade are evidence of the SAME
  // source entitlement. Never mint a second jade merely because M was added.
  const claimed=s.inventory.jadeBlank>0||s.rewards.some(r=>r.itemId==='jade-blank'&&r.quantity>0);
  s.world={version:1,quest:'NOT_STARTED',location:'safe',clues:[],surveySolved:false,sourceClaimed:claimed,
    craft:'NOT_CRAFTED',jade:null,equipped:null,combatEncounterId:null,passage:null,routeMarked:false,completion:null,feedback:''};
  return s;
}
export function validateWorld(s) {
  const w=s.world;
  if(!w||w.version!==1||!QUEST_STATES.includes(w.quest)||!Object.hasOwn(LOCATIONS,w.location)||!Array.isArray(w.clues)||new Set(w.clues).size!==w.clues.length||w.clues.some(c=>!Object.hasOwn(CLUES,c))||typeof w.sourceClaimed!=='boolean'||typeof w.routeMarked!=='boolean')fail('INVALID_WORLD','Dữ liệu khám phá không tương thích; không tự reset.');
  if(!['NOT_CRAFTED','CRAFTED_WARD','CRAFTED_GUIDE'].includes(w.craft))fail('INVALID_WORLD','Trạng thái chế tác không hợp lệ.');
  if(w.jade&&(!['WARD','GUIDE'].includes(w.jade.variant)||w.jade.id!==`${s.runId}-jade-1`||w.craft!==`CRAFTED_${w.jade.variant}`))fail('INVALID_WORLD','Ngọc không khớp run hoặc cấu hình.');
  if((w.craft!=='NOT_CRAFTED')!==!!w.jade||w.equipped!==null&&w.equipped!==w.jade?.id||w.routeMarked!==(w.quest==='COMPLETE')||w.routeMarked!==!!w.completion)fail('INVALID_WORLD','Trạng thái ngọc/nhiệm vụ không nhất quán.');
  if(w.jadeTrial){const t=w.jadeTrial;if(t.version!==1||!Array.isArray(t.observed)||new Set(t.observed).size!==t.observed.length||t.observed.some(x=>![0,1,2].includes(x))||t.selection!==null&&!Object.hasOwn(TREATMENTS,t.selection)||s.inventory.jadeBlank!==0||t.sample&&(t.sample.id!==`sample-${s.runId}`||t.sample.ownerId!==s.ownerId||t.sample.runId!==s.runId||t.sample.quantity!==1)||!!t.sample!==(w.sourceClaimed&&!w.jade))fail('INVALID_SPECIMEN','Mẫu ngọc không hợp lệ; không tự sửa save.');}
}
export function grantSource(s,source,encounterId=null) {
  const w=s.world;let granted=false;
  if(!w.sourceClaimed){
    w.sourceClaimed=true;
    if(w.jadeTrial)w.jadeTrial.sample={id:`sample-${s.runId}`,ownerId:s.ownerId,runId:s.runId,quantity:1,definitionId:'mock-jade-specimen-v1',environment:ENVIRONMENT};else s.inventory.jadeBlank++;
    s.rewards.push({id:`reward-${s.runId}`,entitlement:`${s.ownerId}:${s.runId}:first-win`,encounterId,source,environment:ENVIRONMENT,itemId:w.jadeTrial?'jade-specimen':'jade-blank',quantity:1,productionRedeemable:false});granted=true;
  }
  if(w.quest==='SOURCE_OPEN')w.quest='MATERIAL_SECURED';
  return granted;
}
export function recordBattleOutcome(s) {
  const w=s.world,b=s.battle;if(!b||b.state==='ACTIVE')return false;
  const granted=b.state==='WON'?grantSource(s,'combat',b.id):false;
  if(w.combatEncounterId===b.id){w.location='safe';w.combatEncounterId=null;w.feedback=b.state==='WON'?'Đã xử lý đường trực tiếp. Phôi dùng chung một nguồn với khảo sát.':'Đã về điểm an toàn. Có thể nghỉ hoặc đi khảo sát, không mất quyền hoàn thành.';}
  return granted;
}
export function equippedDefense(s) {return s.world?.jade?.variant==='WARD'&&s.world.equipped===s.world.jade.id?2:0;}
export function applyWorldCommand(s,c) {
  if(s.battle?.state==='ACTIVE')fail('BATTLE_ACTIVE','Không di chuyển, chế tác hoặc đổi ngọc giữa trận.');
  const w=s.world;let granted=false;
  if(c.type==='QUEST_ACCEPT') {
    if(w.quest==='NOT_STARTED')w.quest=w.sourceClaimed?'MATERIAL_SECURED':'SOURCE_OPEN';
    w.feedback=w.sourceClaimed?'Phôi/quyền nhận cũ được bảo tồn; không cấp lại.':'Mở lối qua màn sương: đi chiến đấu hoặc khảo sát để tiếp cận nguồn phôi.';
  } else if(c.type==='MOVE') {
    if(!Object.hasOwn(LOCATIONS,c.to)||c.to==='direct')fail('INVALID_DESTINATION','Địa điểm không hợp lệ.');
    const links={safe:['fork','workshop'],fork:['safe','survey','workshop','fog'],survey:['safe','fork','workshop','fog'],workshop:['safe','fork','fog'],fog:['safe','fork','workshop'],marker:['safe','workshop','fog']};
    if(!links[w.location]?.includes(c.to))fail('NO_ROUTE','Không có đường đi từ vị trí này.');
    if(w.quest==='NOT_STARTED'&&c.to!=='workshop'&&c.to!=='safe')fail('QUEST_NOT_STARTED','Hãy nhận nhiệm vụ trước khi khám phá.');
    if(c.to==='fog'&&(!w.sourceClaimed||w.quest==='NOT_STARTED'))fail('SOURCE_REQUIRED','Hãy xử lý một trong hai đường tiếp cận trước.');
    w.location=c.to;w.feedback='';
    if(c.to==='fog'&&w.quest==='MATERIAL_SECURED')w.quest='FINAL_ROUTE_OPEN';
  } else if(c.type==='OBSERVE') {
    if(!['survey','fog'].includes(w.location)||!Object.hasOwn(CLUES,c.clue))fail('INVALID_OBSERVATION','Không thể xem dấu hiệu này tại đây.');
    if(!w.clues.includes(c.clue))w.clues.push(c.clue);w.feedback=CLUES[c.clue];
  } else if(c.type==='SOLVE_SURVEY') {
    if(w.location!=='survey'||w.quest==='NOT_STARTED')fail('WRONG_LOCATION','Cần tới đường khảo sát.');
    if(w.clues.length!==3)fail('CLUES_REQUIRED','Quan sát đủ ba dấu hiệu trước khi chọn tuyến.');
    if(!['LEFT','CENTER','RIGHT'].includes(c.choice))fail('INVALID_CHOICE','Lựa chọn không hợp lệ.');
    if(c.choice!=='LEFT')w.feedback='Chưa đúng: lối phải đón gió, lối giữa dẫn xuống khe. Xem lại dải rêu bên trái; có thể chọn lại, không mất tài nguyên.';
    else {w.surveySolved=true;granted=grantSource(s,'survey');w.feedback=granted?(w.jadeTrial?'Đã nhận một mẫu linh ngọc mock. Không cấp thêm Phôi Ngọc; đến bàn chế tác để quan sát.':'Đã tìm nguồn Phôi Ngọc: +1 phôi mock.'):'Đã khảo sát đúng. Nguồn nguyên liệu đã được nhận trước đó; không cấp thêm.';}
  } else if(c.type==='JADE_OBSERVE'||c.type==='JADE_SELECT'){
    const t=w.jadeTrial;if(w.location!=='workshop'||!t?.sample)fail('SAMPLE_REQUIRED','Cần mẫu ngọc tại bàn chế tác.');
    if(c.type==='JADE_OBSERVE'){if(![0,1,2].includes(c.spot))fail('INVALID_SPOT','Điểm soi không hợp lệ.');if(!t.observed.includes(c.spot))t.observed.push(c.spot);w.feedback='Đã ghi điểm quan sát; dấu hiệu từ helper gốc hiển thị bên dưới.';}
    else {if(t.observed.length!==3||!Object.hasOwn(TREATMENTS,c.treatment))fail('OBSERVATION_REQUIRED','Quan sát đủ ba điểm rồi chọn hướng xử lý.');t.selection=c.treatment;w.feedback=TREATMENTS[c.treatment].effect;}
  } else if(c.type==='CRAFT') {
    if(w.location!=='workshop')fail('WRONG_LOCATION','Cần tới bàn chế tác.');
    if(!['WARD','GUIDE'].includes(c.variant))fail('INVALID_VARIANT','Chỉ được chọn WARD hoặc GUIDE.');
    if(w.craft!=='NOT_CRAFTED')fail('ALREADY_CRAFTED','Ngọc đã cam kết cấu hình; không chế lại miễn phí.');
    const t=w.jadeTrial;
    if(t){if(!t.sample||t.observed.length!==3||!t.selection||TREATMENTS[t.selection].variant!==c.variant)fail('PREVIEW_REQUIRED','Cần mẫu, ba dấu hiệu và lựa chọn khớp thành phẩm xem trước.');}
    else if(s.inventory.jadeBlank<1)fail('MATERIAL_REQUIRED','Chưa có Phôi Ngọc. Có thể đi khảo sát, không cần thắng trận.');
    const input=t?t.sample.id:null;
    if(t)t.sample=null;else s.inventory.jadeBlank--;
    w.jade={id:`${s.runId}-jade-1`,variant:c.variant,environment:ENVIRONMENT};w.craft=`CRAFTED_${c.variant}`;
    s.consumptions.push({id:`consume-${c.id}`,commandId:c.id,itemId:t?'jade-specimen':'jade-blank',quantity:1,environment:ENVIRONMENT,...(t?{inputInstanceId:input,outputInstanceId:w.jade.id,treatment:t.selection,rulesVersion:'jade-adapter-1'}:{})});
    if(t)t.receipt={id:`craft-${c.id}`,commandId:c.id,ownerId:s.ownerId,runId:s.runId,environment:ENVIRONMENT,productionRedeemable:false,inputInstanceId:input,outputInstanceId:w.jade.id,variant:c.variant,treatment:t.selection,rulesVersion:'jade-adapter-1'};
    w.feedback='Đã chế một ngọc. Trang bị ngoài trận để dùng công dụng; không có EXP nghề hoặc thời gian chờ.';
  } else if(c.type==='EQUIP_JADE') {
    if(!w.jade||typeof c.enabled!=='boolean')fail('JADE_REQUIRED','Chưa có ngọc hoặc lựa chọn trang bị không hợp lệ.');
    w.equipped=c.enabled?w.jade.id:null;w.feedback=c.enabled?'Đã trang bị. Snapshot trận cũ không thay đổi.':'Đã tháo ngọc. Không xóa hoặc đổi cấu hình.';
  } else if(c.type==='CROSS_FOG') {
    if(w.location!=='fog'||!['FINAL_ROUTE_OPEN','COMPLETE'].includes(w.quest))fail('WRONG_LOCATION','Cần tới Cửa Sương.');
    if(!['GUIDE','WARD','OBSERVE'].includes(c.method))fail('INVALID_CHOICE','Cách vượt cửa không hợp lệ.');
    if(c.method==='GUIDE'&&!(w.jade?.variant==='GUIDE'&&w.equipped===w.jade.id))fail('GUIDE_REQUIRED','Cần trang bị Ngọc Dẫn Đường; hoặc chọn quan sát để đi không cần ngọc.');
    if(c.method==='WARD'&&!(equippedDefense(s)&&w.clues.includes('wind')))fail('WARD_REQUIRED','Cần trang bị Ngọc Hộ Thân và đọc dấu gió trước; luôn có đường quan sát thay thế.');
    if(c.method==='OBSERVE'){
      if(w.clues.length!==3)fail('CLUES_REQUIRED','Quan sát đủ ba dấu hiệu.');
      if(!['LEFT','CENTER','RIGHT'].includes(c.choice))fail('INVALID_CHOICE','Hãy chọn một tuyến.');
      if(c.choice!=='LEFT'){w.feedback='Lối đó chưa an toàn. Rêu liên tục bên trái chỉ đường vững; có thể thử lại, không mất Tu Vi hoặc đồ.';return {granted:false};}
    }
    w.passage=c.method;w.location='marker';w.feedback=c.method==='GUIDE'?'Ngọc hiện lối ẩn. Ngọc vẫn được giữ nguyên.':c.method==='WARD'?'Ngọc bảo vệ giúp vượt tuyến gió đã nhận diện.':'Đã suy luận được đường trái an toàn mà không cần chế tác.';
  } else if(c.type==='MARK_ROUTE') {
    if(w.location!=='marker'||!w.passage)fail('WRONG_LOCATION','Hãy vượt Cửa Sương trước khi đánh dấu.');
    if(!w.routeMarked){w.quest='COMPLETE';w.routeMarked=true;w.completion={id:`complete-${s.runId}`,commandId:c.id,method:w.passage,environment:ENVIRONMENT};}
    w.feedback='Hoàn thành: Mở lối qua màn sương. Tuyến đã được đánh dấu. Không phát EXP/Tu Vi, Xu hoặc phôi mới.';
  } else fail('UNKNOWN_COMMAND','Lệnh khám phá không tồn tại.');
  return {granted};
}
