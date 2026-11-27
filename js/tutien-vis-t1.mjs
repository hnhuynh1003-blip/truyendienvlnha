import {mountHomeIdentity} from './tutien-character-view.mjs';
import {mountSharedInventory} from './tutien-shared-inventory-g2.mjs?v=1';
// VIS-T1: presentation only, inside the integrated iframe. No repository or write API.
import {CHARACTER} from '../prototypes/tutien-combat-s/fixture.mjs';
import {actionIcon} from '../prototypes/tutien-combat-s/ui-icons.mjs';
import {readStats} from './tutien-view-ux-r2.mjs?v=pages-r2-20261113';
import {createQiankunBag,renderQiankunBag} from './tutien-qiankun-vis-t2.mjs?v=pages-r2-20261113';
import {mountEquipment} from './tutien-equipment-vis-t2e.mjs?v=pages-r2-20261113';
import {applyNavSkin} from './tutien-nav-skin-r1.mjs?v=pages-r2-20261113';
import {mountCollectionPreview} from './tutien-collection-preview.mjs?v=layout-20261117';
const doc=document,$=id=>doc.getElementById(id),home=$('home-screen');
if(home&&!doc.getElementById('vis-t1-hero')){
 doc.body.classList.add('vis-t1');
 const el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 const base=new URL('../assets/tu-tien/vis-t1/',import.meta.url).href;
 const variants=[['female-01','Ngọc xanh','tutien-meditation-female-01.png'],['female-02','Băng lam','tutien-meditation-female-02.png'],['female-03','Trắng vàng','tutien-meditation-female-03.png'],['character','Thanh ngọc','tutien-meditation-character.png']];
 const hero=el('div','vis-hero');hero.id='vis-t1-hero';
 const cave=el('img','vis-cave');cave.src=base+'tutien-cultivation-cave-v2.png';cave.alt='Động phủ giữa tiên sơn, cổng ngọc và pháp trận';cave.width=1086;cave.height=1448;cave.fetchPriority='high';cave.decoding='async';
 const figure=el('img','vis-character');figure.id='vis-t1-character';figure.width=1254;figure.height=1254;figure.src=base+variants[0][2];figure.alt='Nữ tu sĩ đạo bào ngọc xanh đang tọa thiền';figure.fetchPriority='high';figure.decoding='async';
 const identity=el('div','vis-identity');identity.append(el('span','vis-kicker','TĨNH TÂM · ĐỘNG PHỦ'),$('home-title'),$('realm-view'));
 const loadStatus=el('p','vis-art-status','Đang tải hình minh họa…');loadStatus.setAttribute('role','status');
 const ready=()=>{if(cave.complete&&cave.naturalWidth&&figure.complete&&figure.naturalWidth)loadStatus.hidden=true;};
 for(const img of [cave,figure]){img.addEventListener('load',ready);img.addEventListener('error',()=>{loadStatus.hidden=false;loadStatus.textContent='Chưa tải được hình. Các nút gameplay vẫn dùng bình thường.';});}ready();
 // Layout only: background and figure share the original cave artwork coordinates.
 const artPlane=el('div','vis-art-plane');artPlane.append(cave,figure);
 hero.append(artPlane,identity,loadStatus);
 const left=el('div','vis-scene');left.append(hero);
 const looks=el('details','vis-looks');looks.append(el('summary','','Hình minh họa · 4 ngoại hình mock'));
 const picker=el('div','vis-appearance-picker');picker.setAttribute('role','group');picker.setAttribute('aria-label','Chọn hình minh họa, không thay nhân vật hoặc chỉ số');
 // Other PNGs are only requested on selection, not eagerly for hidden thumbnails.
 let selected=variants[0][0];
 for(const [id,label,file] of variants){const b=el('button','',label);b.type='button';b.dataset.appearance=id;b.setAttribute('aria-pressed',String(id===selected));b.onclick=async()=>{selected=id;for(const v of picker.children)v.setAttribute('aria-pressed',String(v===b));hero.setAttribute('aria-busy','true');loadStatus.hidden=false;loadStatus.textContent='Đang tải hình minh họa…';try{const next=new Image();next.src=base+file;await next.decode();if(selected!==id)return;figure.src=next.src;figure.alt=`Tu sĩ tọa thiền · ${label} · hình minh họa mock`;await figure.decode();if(selected===id){hero.setAttribute('aria-busy','false');ready();}}catch{if(selected===id){hero.setAttribute('aria-busy','false');loadStatus.hidden=false;loadStatus.textContent='Chưa tải được ngoại hình; hình trước và gameplay được giữ nguyên.';}}};picker.append(b);}
 looks.append(picker,el('p','vis-note','Chỉ đổi hình trong phiên xem; không đổi avatar tài khoản, nhân vật hay thuộc tính.'));left.append(looks);
 const side=el('div','vis-overview');
 const progress=home.querySelector('.cultivation');progress.classList.add('vis-progress');
 const actions=home.querySelector('.module-buttons');actions.classList.add('vis-primary-actions');
 const oldEquipment=home.querySelector('details');
 const info=el('details','vis-test-info');info.append(el('summary','','Thông tin thử nghiệm · MOCK ONLY'));
 for(const n of [...home.querySelectorAll(':scope > p.muted'),$('breakthrough-note')])if(n)info.append(n);
 if(oldEquipment)info.append(oldEquipment);
 const stats=el('section','vis-stats');stats.setAttribute('aria-label','Thuộc tính snapshot mock');
 const cards=el('dl','vis-stat-grid');
 const statValues=new Map();
 for(const [key,label] of [['hp','Sinh Mệnh'],['ll','Linh Lực'],['attack','Công Kích'],['defense','Phòng Thủ']]){const card=el('div'),value=el('dd');value.dataset.stat=key;value.textContent='Đang đọc…';card.append(el('dt','',label),value);if(key==='hp'||key==='ll'){const meter=el('progress');meter.setAttribute('aria-label',label);card.append(meter);}statValues.set(key,card);cards.append(card);}stats.append(cards);
 const statSource=el('details','vis-stat-source');statSource.append(el('summary','','Nguồn chỉ số'),el('p','','MOD-P2 dùng fixture 148 HP / 38 LL / 36 Công Kích / 8 Phòng Thủ. Kiếm đã nằm trong Công Kích 36; chưa có phân rã bonus kiếm hoặc điểm phân phối. Khi có trận đang chạy, dùng character snapshot của chính trận đó. Thủ thế, khiên, suy yếu là hiệu ứng xử lý từng pha, không tự cộng vào chỉ số nền.'));stats.append(statSource);
 const equipment=el('section','vis-equipment');
 const grid=el('div','vis-gear-grid'),sword=el('button','vis-gear','');sword.type='button';sword.id='vis-sword';sword.setAttribute('aria-expanded','false');sword.setAttribute('aria-controls','vis-sword-details');sword.setAttribute('aria-label','Xem kiếm cố định đang trang bị');sword.append(actionIcon('basic'),el('span','','Kiếm cố định'),el('small','','Đang trang bị'));grid.append(sword);
 sword.querySelector('span').textContent='Vũ khí';sword.dataset.slot='weapon';
 const rune=(kind)=>{const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('aria-hidden','true');
  const paths={armor:'M7 5 12 3l4 5 4-5 5 2 4 7-5 3v13H8V15l-5-3Z',artifact:'M16 3 27 16 16 29 5 16Z M16 9v14M10 16h12',ring:'M10 7 16 3l6 4-6 7Z M11 12a9 9 0 1 0 10 0',necklace:'M4 5q0 17 12 22Q28 22 28 5 M16 17l4 5-4 5-4-5Z',bracelet:'M5 16a11 11 0 1 0 22 0 11 11 0 1 0-22 0 M8 16a8 8 0 1 0 16 0 8 8 0 1 0-16 0',bag:'M11 3h10l-2 6q10 8 8 15-1 5-11 5T5 24Q3 17 13 9Z M11 10h10',stats:'M7 27V17h4v10M14 27V10h4v17M21 27V4h4v23',alchemy:'M11 3h10M13 3v8L5 25q-1 4 4 4h14q5 0 4-4l-8-14V3 M10 20h12',forge:'M5 7 11 3l11 9-4 6Z M18 17l10 11',looks:'M16 3a6 6 0 1 0 0 12 6 6 0 1 0 0-12 M5 29q0-12 11-12t11 12',lock:'M8 14V9a8 8 0 0 1 16 0v5M6 14h20v15H6Z M16 19v5',dungeon:'M6 29V10l10-7 10 7v19M12 29V15h8v14M3 29h26'};
  const path=doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[kind]||paths.artifact);svg.append(path);return svg;};
 for(const [key,label]of [['armor','Hộ giáp'],['artifact','Pháp bảo'],['ring','Nhẫn'],['necklace','Dây chuyền'],['bracelet','Vòng tay']]){const slot=el('div','vis-gear vis-empty');slot.dataset.slot=key;slot.setAttribute('aria-label',label+' · Ô trống');slot.append(rune(key),el('span','',label),el('small','','Ô trống'));grid.append(slot);}
 const detail=el('div','vis-item-detail');detail.id='vis-sword-details';detail.hidden=true;detail.setAttribute('role','region');detail.setAttribute('aria-label','Chi tiết kiếm cố định');detail.append(el('strong','','Kiếm cố định · fixture'),el('p','','Đã nằm trong Công Kích 36. Không cộng bonus lần nữa; không truy cập hoặc thay đổi Kho thật.'));
 detail.prepend(actionIcon('basic'));detail.append(el('p','vis-note','Phẩm chất, bonus riêng và so sánh thay thế: fixture chưa định nghĩa. Kiếm cố định, chưa hỗ trợ tháo/trang bị trong MOD-P2. Phụ kiện generic ở run legacy không được tự gán vào ba ô trang sức.'));
 const close=el('button','','Đóng chi tiết');close.type='button';const toggle=()=>{detail.hidden=!detail.hidden;sword.setAttribute('aria-expanded',String(!detail.hidden));};sword.onclick=toggle;close.onclick=()=>{toggle();sword.focus();};detail.append(close);equipment.append(grid,detail);
 const locked=el('div','vis-locked');for(const label of ['Luyện Đan','Rèn Khí']){const b=el('button','',label+' · Chưa mở');b.type='button';b.disabled=true;locked.append(b);}
 const condition=$('home-condition');condition.classList.add('vis-current-condition');
 side.append(progress,actions,condition,$('home-rest'),stats,equipment,locked,info);
 const layout=el('div','vis-home-layout');layout.append(left,side);home.replaceChildren(layout);
 // Move existing technical details rather than discard the mock disclosure/receipt view.
 const debug=doc.querySelector('.module-debug');if(debug){debug.hidden=false;debug.classList.add('vis-technical');debug.querySelector('summary').textContent='Kiểm thử nâng cao · receipt / run';}

 // VIS-T1R1: one stage, one on-demand dialog. Existing gameplay nodes keep their handlers.
 doc.body.classList.add('vis-t1r1');
 const dialog=el('dialog','vis-panel');dialog.id='vis-panel';dialog.setAttribute('aria-labelledby','vis-panel-title');
 const panelHead=el('header','vis-panel-head'),panelTitle=el('h2');panelTitle.id='vis-panel-title';
 const dismiss=el('button','vis-panel-close','Đóng');dismiss.type='button';dismiss.setAttribute('aria-label','Đóng bảng, trở về động phủ');
 panelHead.append(panelTitle,dismiss);const panelBody=el('div','vis-panel-body');dialog.append(panelHead,panelBody);
 const equipmentUI=mountEquipment(equipment,dialog,[$('home-title').textContent,$('realm-view').textContent].join(' ? '));
 const panels=new Map(),dock=el('nav','vis-stage-dock');dock.setAttribute('aria-label','Chức năng Tu Tiên');
 let opener=null;
 const shut=()=>dialog.close();dismiss.onclick=shut;
 dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)shut();}});
 function addPanel(key,title,node,label=title){
  node.hidden=true;node.dataset.panel=key;panelBody.append(node);panels.set(key,node);
  const b=el('button','vis-stage-tool',label);b.type='button';b.dataset.openPanel=key;b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls',dialog.id);
  b.onclick=async()=>{opener=b;for(const n of panels.values())n.hidden=true;node.hidden=false;panelTitle.textContent=title;dialog.classList.toggle('vis-qiankun-active',key==='bag');dialog.classList.toggle('vis-pkc-active',key==='equipment');if(key==='equipment')equipmentUI.reset();
   if(key==='bag')renderQiankunBag(node); // Reopening always returns to the real unavailable mock contract.
   node.querySelector('.vis-read-error')?.remove();
   if(key==='inventory'){
    node.querySelector('p').textContent='Đang đọc vật tư mock…';
    sharedInventory.refresh();
   }
   if(key==='stats'){delete stats.dataset.snapshotRevision;for(const card of statValues.values()){card.querySelector('dd').textContent='Đang đọc…';card.querySelector('progress')?.removeAttribute('value');}}
   dialog.showModal();panelBody.scrollTop=0;dismiss.focus();
   if(key==='stats'||key==='inventory')try{const view=await readStats();
    if(key==='inventory')node.querySelector('p').textContent=`Hồi Sinh Tán: ${view.healingPowder} · Kho vật tư mock lâu dài của run, không phải Túi Phó Bản.`;
    else{for(const k of ['hp','ll','attack','defense']){const card=statValues.get(k),max=k==='hp'?view.maxHp:view.maxLl;card.querySelector('dd').textContent=k==='hp'||k==='ll'?`${view[k]} / ${max}`:String(view[k]);if(card.querySelector('progress')){card.querySelector('progress').max=max;card.querySelector('progress').value=view[k];}}stats.dataset.snapshotRevision=String(view.revision);statSource.dataset.source=view.source;let source=statSource.querySelector('.vis-live-source');if(!source){source=el('p','vis-live-source');statSource.append(source);}source.textContent='Nguồn hiện tại: '+view.source;}
   }catch(e){if(key==='stats')for(const card of statValues.values()){card.querySelector('dd').textContent='Không khả dụng';}else node.querySelector('p').textContent='Chưa đọc được vật tư.';const error=el('p','vis-note vis-read-error','Không đọc được snapshot mock. Hãy đóng bảng và thử lại.');node.append(error);}
  };return b;
 }
 const statPanel=el('div');condition.hidden=true;statPanel.append(stats,$('home-rest'));info.append(condition);
 dock.append(addPanel('stats','Thuộc tính',statPanel),addPanel('equipment','Trang bị',equipment));
 const inventory=el('div');inventory.append(el('p','','Vật tư mock'),el('p','vis-note','Chỉ đọc vật tư của prototype. Không kết nối Kho hoặc Ví DUDU vào trận mock; không nhận hay tiêu vật phẩm tại đây.'));
 const sharedInventory=mountSharedInventory(inventory);
 window.DuduSharedInventoryRefreshG2=sharedInventory.refresh;
 dock.append(addPanel('inventory','Kho chung & vật tư thử',inventory,'Kho'));
 const bag=createQiankunBag(doc);
 dock.append(addPanel('bag','Túi Phó Bản',bag));
 for(const [key,title,license]of [['alchemy','Luyện Đan','Giấy phép Luyện Đan'],['forge','Rèn Khí','Giấy phép Rèn Khí']]){
  const n=el('div');n.append(el('p','',title+' đang khóa.'),el('p','','Điều kiện dự kiến: '+license+'. Nghề và giấy phép chưa triển khai trong bản mock.'));
  const b=addPanel(key,title+' · Đang khóa',n,title+' · Khóa');b.setAttribute('aria-label',title+' đang khóa, xem điều kiện giấy phép');dock.append(b);
 }
 const accountEdit=el('button','vis-account-avatar-edit','\u0110\u1ed5i avatar t\u00e0i kho\u1ea3n');accountEdit.type='button';accountEdit.dataset.editAccountAvatar='true';accountEdit.onclick=()=>{dialog.close();window.top.openPlayerAvatarEditorV16?.();};looks.prepend(accountEdit);
 looks.open=true;const appearance=addPanel('looks','Ngoại hình minh họa',looks,'Ngoại hình');appearance.classList.add('vis-appearance-open');
 const test=el('div');test.append(info);if(debug)test.append(debug);const testButton=addPanel('test','Thông tin thử nghiệm',test,'Mock');testButton.classList.add('vis-test-open');
 const footer=el('div','vis-stage-footer');footer.append(actions,dock);
 actions.querySelector('#breakthrough').textContent='Đột phá · Khóa';actions.querySelector('#breakthrough').title='Cơ chế đột phá chưa triển khai';
 progress.classList.add('vis-stage-progress');
 // UI symbols, not image assets or gameplay types. Keep the original gameplay buttons.
 for(const [button,kind,label]of [[actions.querySelector('#go-dungeon'),'dungeon','Đi phó bản'],[actions.querySelector('#breakthrough'),'lock','Đột phá']]){button.replaceChildren(rune(kind),el('span','',label));button.setAttribute('aria-label',label+(kind==='lock'?' · Đang khóa':''));}
 for(const b of dock.children){const key=b.dataset.openPanel,kind={stats:'stats',equipment:'armor',inventory:'artifact',bag:'bag',alchemy:'alchemy',forge:'forge'}[key];const label={stats:'Thuộc tính',equipment:'Trang bị',inventory:'Kho',bag:'Túi Phó Bản',alchemy:'Luyện Đan',forge:'Rèn Khí'}[key];b.replaceChildren(rune(kind),el('span','',label));b.classList.add('vis-rune-button');b.setAttribute('aria-label',label+(['alchemy','forge'].includes(key)?' · Đang khóa, xem giấy phép':''));}
 appearance.replaceChildren(rune('looks'),el('span','','Ngoại hình'));appearance.classList.add('vis-rune-button');
 doc.body.classList.add('vis-ux-r2');
 hero.append(progress,appearance,testButton,footer);
 layout.replaceChildren(hero);home.append(dialog);
 applyNavSkin(doc);
 // Let the existing host reclaim its redundant mock toolbar while the home stage is visible.
 const frame=window.frameElement,host=frame?.closest('.tutien-integ-host');
 if(host){const sync=()=>host.classList.toggle('tutien-home-stage',!home.hidden);sync();new MutationObserver(sync).observe(home,{attributes:true,attributeFilter:['hidden']});}
 // No content cards below the scene. The stage uses the iframe's available viewport.
 mountHomeIdentity(doc);
 mountCollectionPreview(doc);
 home.dataset.visualReady='true';
}
