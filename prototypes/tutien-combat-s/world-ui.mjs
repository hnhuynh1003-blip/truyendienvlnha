import {CLUES,LOCATIONS,equippedDefense} from './world-core.mjs';
import {specimenView,TREATMENTS} from './jade-adapter.mjs';
const questLabels={NOT_STARTED:'Chưa nhận',SOURCE_OPEN:'Đã mở hai đường tiếp cận',MATERIAL_SECURED:'Đã xử lý nguồn phôi',FINAL_ROUTE_OPEN:'Đã tới Cửa Sương',COMPLETE:'Hoàn thành'};
export function renderWorld(container,s,busy,send){
  container.replaceChildren();container.hidden=s.battle?.state==='ACTIVE';if(container.hidden)return;
  const w=s.world,el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
  const title=el('h2','Mở lối qua màn sương · khu thử nghiệm');container.append(title);
  const stage=el('p',questLabels[w.quest]);stage.id='world-stage';stage.dataset.state=w.quest;container.append(stage);
  const location=el('p',`Vị trí: ${LOCATIONS[w.location]}`);location.id='world-location';container.append(location);
  const gear=el('p',`Phôi: ${s.inventory.jadeBlank} · ${w.jade?(w.jade.variant==='WARD'?'Ngọc Hộ Thân':'Ngọc Dẫn Đường'):'Chưa chế ngọc'} · ${w.equipped?'Đã trang bị':'Chưa trang bị'}${equippedDefense(s)?' · Trận kế tiếp +2 Phòng Thủ':''}`);gear.id='world-gear';container.append(gear);
  if(w.jadeTrial)container.append(el('p',`Run MR3 riêng · Mẫu linh ngọc có thể dùng: ${w.jadeTrial.sample?1:0}. Không có phôi thứ hai từ cùng nguồn.`));
  const feedback=el('p',w.feedback);feedback.id='world-feedback';feedback.setAttribute('role','status');container.append(feedback);
  const actions=el('div');actions.className='world-actions';container.append(actions);
  function button(key,text,type,data={},disabled=false){const b=el('button',text);b.type='button';b.dataset.world=key;b.disabled=busy||disabled;b.addEventListener('click',()=>send(type,data));actions.append(b);}
  const go=(to,text=LOCATIONS[to])=>button(`move-${to}`,text,'MOVE',{to});
  if(w.quest==='NOT_STARTED')button('accept','Nhận nhiệm vụ','QUEST_ACCEPT');
  if(w.location==='safe'){if(w.quest!=='NOT_STARTED')go('fork');go('workshop');}
  if(w.location==='fork'){
    button('fight','Đường trực tiếp — chiến đấu','START',{purpose:'SOURCE'},s.hp===0);if(!s.hp)container.append(el('p','HP0: có thể về nghỉ hoặc tiếp tục khảo sát mà không cần chiến đấu.'));
    go('survey');go('workshop');if(w.sourceClaimed)go('fog');go('safe');
  }
  if(['survey','fog'].includes(w.location)){
    container.append(el('p','Đọc dấu gió, nước và rêu để chọn đường. Chọn sai được thử lại, không mất đồ/Tu Vi.'));
    for(const [clue,text]of Object.entries(CLUES)){
      button(`observe-${clue}`,`Quan sát ${({wind:'gió',water:'nước',moss:'rêu'})[clue]}${w.clues.includes(clue)?' — đã đọc':''}`,'OBSERVE',{clue},w.clues.includes(clue));
      if(w.clues.includes(clue))container.append(el('p',text));
    }
    if(w.location==='survey')for(const [choice,label]of [['LEFT','trái'],['CENTER','giữa'],['RIGHT','phải']])button(`survey-${choice}`,`Khảo sát lối ${label}`,'SOLVE_SURVEY',{choice},w.clues.length<3);
    else {
      button('cross-guide','Dùng Ngọc Dẫn Đường — hiện lối ẩn','CROSS_FOG',{method:'GUIDE'},!(w.jade?.variant==='GUIDE'&&w.equipped));
      button('cross-ward','Dùng Ngọc Hộ Thân — vượt tuyến gió','CROSS_FOG',{method:'WARD'},!(equippedDefense(s)&&w.clues.includes('wind')));
      for(const [choice,label]of [['LEFT','trái'],['CENTER','giữa'],['RIGHT','phải']])button(`cross-${choice}`,`Không dùng ngọc — chọn ${label}`,'CROSS_FOG',{method:'OBSERVE',choice},w.clues.length<3);
    }
    go('safe');go('fork');go('workshop');if(w.location==='survey'&&w.sourceClaimed)go('fog');
  }
  if(w.location==='workshop'){
   if(w.jadeTrial){
    const t=w.jadeTrial;
    if(t.sample){const view=specimenView();container.append(el('p',`Mẫu linh ngọc · ${view.surface.size} · ${view.surface.marks} · ${view.surface.skin}`));container.append(el('p','Đây là manh mối, chưa phải kết luận chắc chắn về phẩm chất. Quan sát đủ ba điểm trước khi chọn.'));
     for(let spot=0;spot<3;spot++){button(`jade-observe-${spot}`,`Quan sát ${['thủy đầu','vân ngọc','đường rạn'][spot]}${t.observed.includes(spot)?' — đã xem':''}`,'JADE_OBSERVE',{spot},t.observed.includes(spot));if(t.observed.includes(spot))container.append(el('p',view.hints[spot]));}
     if(t.observed.length===3){container.append(el('p','Đã có dấu hiệu thấu sáng, vân màu và đường rạn gần tâm; chưa xác nhận phẩm cấp. Chọn công dụng mong muốn, có thể đổi trước khi xác nhận.'));
      for(const [treatment,preview]of Object.entries(TREATMENTS))button(`jade-select-${treatment}`,preview.name,'JADE_SELECT',{treatment});
      if(t.selection){const p=TREATMENTS[t.selection];container.append(el('p',`Xem trước: ${p.effect} Xác nhận sẽ tiêu một mẫu; cấu hình không thể đổi sau commit.`));button('jade-confirm','Xác nhận chế tác','CRAFT',{variant:p.variant});}
     }
    }else container.append(el('p',w.jade?'Đã chế tác và lưu thành phẩm. Mẫu đã tiêu, không thể chế lại.':'Chưa có mẫu: đi chiến đấu hoặc khảo sát. Mỗi run chỉ có một quyền nhận.'));
   }else{
    container.append(el('p','Một Phôi Ngọc → một ngọc, chọn đúng một cấu hình. Không có tiền, thời gian chờ, cấp nghề hoặc đổi cấu hình miễn phí.'));
    button('craft-ward','Chế WARD — Hộ Thân','CRAFT',{variant:'WARD'},!s.inventory.jadeBlank||!!w.jade);
    button('craft-guide','Chế GUIDE — Dẫn Đường','CRAFT',{variant:'GUIDE'},!s.inventory.jadeBlank||!!w.jade);
   }
    go('safe');if(w.quest!=='NOT_STARTED')go('fork');if(w.sourceClaimed&&w.quest!=='NOT_STARTED')go('fog');
  }
  if(w.location==='marker'){button('mark','Đánh dấu tuyến — hoàn thành','MARK_ROUTE',{},w.routeMarked);go('safe');go('workshop');go('fog');}
  if(w.jade)button('equip',w.equipped?'Tháo ngọc (ngoài trận)':'Trang bị ngọc (ngoài trận)','EQUIP_JADE',{enabled:!w.equipped});
  if(w.routeMarked){const done=el('p',`Tuyến đã đánh dấu · ${w.completion.id} · MOCK_ONLY · không phát Tu Vi hoặc tiền.`);done.id='quest-complete';container.append(done);}
}
