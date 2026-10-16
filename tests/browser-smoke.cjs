// Run with: npm install --no-save playwright && node tests/browser-smoke.cjs
// Uses fake Firebase SDK responses; NEVER contacts the production Firestore project.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

async function main() {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filepath = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!filepath.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(filepath, (err, bytes) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': filepath.endsWith('.js') ? 'text/javascript' : filepath.endsWith('.css') ? 'text/css; charset=utf-8' : filepath.endsWith('.webp') ? 'image/webp' : 'text/html; charset=utf-8' }).end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const failures = [];
    page.on('pageerror', err => failures.push(err.message));
    await page.route('https://www.gstatic.com/firebasejs/**', async route => {
      const url = route.request().url();
      const app = url.includes('firebase-app-compat');
      const code = app ? `
        window.__firestoreWrites = [];
        window.firebase = {
          initializeApp() {},
          firestore() {
            return {
              collection() {
                return { doc() {
                  return {
                    set(data) { window.__firestoreWrites.push(data); return Promise.resolve(); },
                    get() { return Promise.resolve({exists:false, data(){return {}}}); },
                    onSnapshot() { return () => {}; }
                  };
                }};
              }
            };
          }
        };
        window.firebase.firestore.FieldValue = { serverTimestamp(){return 1;} };
      ` : '';
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: code });
    });
    await page.goto(`http://127.0.0.1:${port}/?sandbox=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.handleAuthSubmit === 'function' && !!document.getElementById('auth-username'));
    await page.waitForTimeout(800);
    await page.locator('#auth-username').fill('tester-a');
    await page.getByRole('button', { name: 'Đổi tài khoản thử' }).click();
    await page.waitForFunction(() => document.getElementById('account-status-btn').textContent.includes('tester-a'));
    await page.locator('#role-toggle-btn').click();

    const catalogSnapshot = await page.evaluate(() => ({
      count:window.DuduItemCatalog?.items.length,
      errors:window.DuduItemCatalog?.validate(),
      inventoryCount:userProfile.inventory.length,
      legacyRandomCount:MASTER_LOOT_TABLE.length,
      firestoreWrites:window.__firestoreWrites.length
    }));
    assert.equal(catalogSnapshot.count,70,'Catalog must load in the browser');
    assert.deepEqual(catalogSnapshot.errors,[],'Catalog schema is valid');
    assert.equal(catalogSnapshot.inventoryCount,2,'Defining 70 items must not grant inventory items');
    assert.equal(catalogSnapshot.legacyRandomCount,11,'Phase 1 must leave old loot pool untouched');
    assert.equal(catalogSnapshot.firestoreWrites,0,'Catalog has no backend writes');
    // V43: DUDU remains first contact even when no story NPC is unlocked.
    // All money/memory changes in this test are strictly local and rolled back.
    const companionSmoke=await page.evaluate(()=>{
      const backup=JSON.stringify(userProfile);
      const currencyBefore=Number(userProfile.currency);
      const prevOpen=document.getElementById('cyber-phone').style.display==='flex';
      if(!prevOpen)togglePhone();
      openPhoneApp('chat');
      const first=document.querySelector('#dudu-v33-inbox-list .dudu-v33-thread');
      const pinned=!!first?.classList.contains('dudu-v43-system-contact');
      const name=first?.textContent||'';
      first?.click();
      const app=document.getElementById('phone-app-chat');
      const panel=document.getElementById('dudu-v43-companion');
      const visible=app?.classList.contains('dudu-v43-companion-open')&&
        getComputedStyle(panel).display==='flex';
      const input=document.getElementById('dudu-v43-message-input');
      input.value='Hướng dẫn nhặt đồ';
      document.querySelector('.dudu-v43-composer').requestSubmit();
      const history=userProfile.duduCompanionV43?.messages||[];
      const scriptedHelp=history.some(m=>m.role==='model'&&/2 phút/.test(m.text));
      const chatCount=userProfile.duduCompanionV43?.chat?.count||0;
      const claim=document.getElementById('dudu-v43-checkin');
      claim.click();
      const currencyAfter=Number(userProfile.currency);
      const claimed=claim.disabled&&userProfile.duduCompanionV43.login.count===1;
      claim.click();
      const noDouble=Number(userProfile.currency)===currencyAfter;
      window.DuduCompanionV43.back();
      const back=app.classList.contains('dudu-v33-inbox');
      userProfile=JSON.parse(backup);saveCurrentAccount();
      phoneHome();if(!prevOpen)togglePhone();
      return {pinned,name,visible,scriptedHelp,chatCount,claimed,noDouble,back,
       increment:currencyAfter-currencyBefore,writes:window.__firestoreWrites.length};
    });
    assert.equal(companionSmoke.pinned,true,'DUDU must be the first conversation');
    assert.match(companionSmoke.name,/DUDU/);
    assert.equal(companionSmoke.visible,true,'DUDU companion UI opens inside Cyber Phone');
    assert.equal(companionSmoke.scriptedHelp,true,'DUDU can explain the real loot cooldown');
    assert.equal(companionSmoke.chatCount,1,'First valid conversation counts toward daily streak');
    assert.equal(companionSmoke.claimed,true,'Claim is one time per local day');
    assert.equal(companionSmoke.noDouble,true,'Repeated clicks cannot grant duplicate coins');
    assert.equal(companionSmoke.increment,3,'First Sandbox check-in awards three Xu');
    assert.equal(companionSmoke.back,true,'Return to contacts from DUDU');
    assert.equal(companionSmoke.writes,0,'DUDU Sandbox never calls production Firestore');

    const museumSandbox=await page.evaluate(async()=>{
      openPhoneApp('museum');
      await renderMuseum();
      const message=document.getElementById('museum-items').textContent;
      const writes=window.__firestoreWrites.length;
      phoneHome();
      return {message,writes};
    });
    assert.match(museumSandbox.message,/Sandbox không kết nối sổ sở hữu/);
    assert.equal(museumSandbox.writes,0,'Museum sandbox cannot mutate Firestore or live inventory');
    // Screenshot regression: guests see the preview album, not an empty Museum.
    // Guest state must never show any cached user's personal NPC milestones.
    const guestMuseum=await page.evaluate(async()=>{
      const savedUsername=currentUsername,savedProfile=userProfile;
      const phone=document.getElementById('cyber-phone');
      const phoneWasOpen=phone?.style.display==='flex';
      const firestoreCount=window.__firestoreWrites.length;
      try{
        if(!phoneWasOpen)togglePhone();
        currentUsername='';
        // Deliberately LEAVE prior user's profile object in memory:
        // a guest MUST NOT see that person's progress.
        openPhoneApp('museum');
        await renderMuseum();
        const album=document.getElementById('dudu-v43-memory-album');
        const museum=document.getElementById('phone-app-museum');
        const verified=museum.querySelector('.dudu-v27-museum-help');
        const options=album?.querySelectorAll('#dudu-v43-memory-source option').length;
        const cards=album?.querySelectorAll('.dudu-v43-memory-card').length;
        const earned=album?.querySelectorAll('.dudu-v43-memory-card.is-earned').length;
        const mountedFirst=!!album&&!!verified&&
          !!(album.compareDocumentPosition(verified)&Node.DOCUMENT_POSITION_FOLLOWING);
        const visible=!!album&&album.getBoundingClientRect().height>0;
        const hint=album?.textContent.includes('Chưa đăng nhập Sandbox');
        return {exists:!!album,mountedFirst,visible,options,cards,earned,hint,
          noWrites:window.__firestoreWrites.length===firestoreCount};
      }finally{
        currentUsername=savedUsername;userProfile=savedProfile;
        phoneHome();
        if(!phoneWasOpen&&phone.style.display==='flex')togglePhone();
      }
    });
    assert.deepEqual(guestMuseum,{
      exists:true,mountedFirst:true,visible:true,options:1,cards:6,earned:0,
      hint:true,noWrites:true
    },'Sandbox Museum must show 6 locked DUDU previews without requiring login');

    // V43.5 read-only Museum album: DUDU / unlocked NPC can be previewed,
    // but no sandbox milestone may become a real collectible or inventory item.
    const museumV435=await page.evaluate(async()=>{
      const story=novels[selectedNovelIndex],oldCharacters=story.characters;
      const oldUsername=currentUsername,oldProfile=userProfile;
      const backup=JSON.stringify(userProfile),writes=window.__firestoreWrites.length;
      const originalInventory=JSON.stringify(userProfile.inventory);
      const npc={id:'museum-v43-5-test',name:'NPC Kỷ Niệm',role:'Cố nhân'};
      try{
        story.characters=[...oldCharacters,npc];
        const p=getStoryProgress(story.id);
        p.collectedCharacters[npc.id]={id:npc.id,affinity:57,
          relationshipV2:{trust:30},
          npcBondV43:{version:1,lastDay:'2026-10-17',current:14,best:14,totalDays:14}};
        userProfile.duduCompanionV43={...DuduCompanionRulesV43.empty(),
          milestones:['dudu-letter-3','dudu-rose-7']};
        openPhoneApp('museum');
        await renderMuseum();
        const album=document.getElementById('dudu-v43-memory-album');
        const select=document.getElementById('dudu-v43-memory-source');
        const duduCards=album?.querySelectorAll('.dudu-v43-memory-card').length;
        const duduEarned=album?.querySelectorAll('.dudu-v43-memory-card.is-earned').length;
        const duduLabel=album?.querySelector('.dudu-v43-memory-counter')?.textContent;
        const serverNote=document.getElementById('museum-items')?.textContent||'';
        select.value=DuduMuseumMemoriesV43.ownerKey(story.id,npc.id);
        select.dispatchEvent(new Event('change',{bubbles:true}));
        const npcCards=album?.querySelectorAll('.dudu-v43-memory-card').length;
        const npcEarned=album?.querySelectorAll('.dudu-v43-memory-card.is-earned').length;
        const npcLabel=album?.querySelector('.dudu-v43-memory-counter')?.textContent;
        const preserved=[p.collectedCharacters[npc.id].affinity,
          p.collectedCharacters[npc.id].relationshipV2.trust];
        const noGrant=JSON.stringify(userProfile.inventory)===originalInventory &&
          window.__firestoreWrites.length===writes;
        // New UID must not inherit the previously selected account's album.
        currentUsername='v435-other-account';
        userProfile={storyStates:{},duduCompanionV43:undefined};
        DuduMuseumMemoriesUIV43.render();
        const other=document.getElementById('dudu-v43-memory-album');
        const isolated=other?.dataset.owner===currentUsername &&
          other.querySelectorAll('.dudu-v43-memory-card').length===6 &&
          other.querySelectorAll('.dudu-v43-memory-card.is-earned').length===0 &&
          other.querySelector('#dudu-v43-memory-source').options.length===1;
        return {duduCards,duduEarned,duduLabel,npcCards,npcEarned,npcLabel,
          serverNote,preserved,noGrant,isolated};
      }finally{
        currentUsername=oldUsername;
        userProfile=oldProfile;
        Object.assign(userProfile,JSON.parse(backup));
        story.characters=oldCharacters;
        DuduMuseumMemoriesUIV43.render();
        phoneHome();
      }
    });
    assert.equal(museumV435.duduCards,6);
    assert.equal(museumV435.duduEarned,2);
    assert.match(museumV435.duduLabel,/2\/6 mốc/);
    assert.equal(museumV435.npcCards,4);
    assert.equal(museumV435.npcEarned,3);
    assert.match(museumV435.npcLabel,/3\/4 mốc/);
    assert.match(museumV435.serverNote,/Sandbox không kết nối sổ sở hữu/);
    assert.deepEqual(museumV435.preserved,[57,30]);
    assert.equal(museumV435.noGrant,true);
    assert.equal(museumV435.isolated,true,'Switching UID must never reveal another reader album');


    // NPC editor: compact chapter picker keeps selection stable when expanding
    // and collapsing; a fresh chapter does not display all old NPC chips.
    const compactNpc=await page.evaluate(()=>{
      openEditChapterModal(0);
      const picker=document.getElementById('chapter-modal-npc-picker');
      const initially=[...picker.querySelectorAll('input')].map(i=>({id:i.value,checked:i.checked}));
      toggleChapterNpcPicker();
      const expanded=[...picker.querySelectorAll('input')].map(i=>i.value);
      toggleChapterNpcPicker();
      const after=[...picker.querySelectorAll('input')].filter(i=>i.checked).map(i=>i.value);
      closeModals();openCreateChapterModal();
      const empty=document.getElementById('chapter-modal-npc-picker').textContent;
      const initialCount=document.querySelectorAll('#chapter-modal-npc-picker input').length;
      closeModals();
      return {initially,expanded,after,empty,initialCount};
    });
    assert.deepEqual(compactNpc.initially,[{id:'c2',checked:true}],
      'Edit chapter starts with its own connected NPC only');
    assert.ok(compactNpc.expanded.length>compactNpc.initially.length,
      'Author can expand all active NPCs in Sổ Tay');
    assert.deepEqual(compactNpc.after,['c2'],
      'Opening/closing NPC search must not lose selected chapter IDs');
    assert.match(compactNpc.empty,/Chưa chọn NPC nào/);
    assert.equal(compactNpc.initialCount,0,
      'New chapter should not dump all previous NPCs onto the editor');

    // Author-only item editor: story catalog, NPC references and chapter linking.
    await page.evaluate(() => openEditStoryModal());
    await page.locator('#story-add-item-btn').click();
    await page.locator('#author-item-name').fill('Đồng hồ của Ôn Tri Hành');
    await page.locator('#author-item-desc').fill('Chiếc đồng hồ bỏ túi đã được nhắc trong truyện.');
    await page.locator('#author-item-rank').selectOption('A');
    await page.locator('#author-item-npc').selectOption('c2');
    await page.getByRole('button',{name:'Lưu vật phẩm'}).click();
    const storyItem = await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex],item=novel.specialItems?.[0];
      return {id:item?.id,storyId:item?.storyId,npcId:item?.npcId,
        scope:item?.scope,acquisition:item?.acquisition?.method,
        inventory:userProfile.inventory.length,writes:window.__firestoreWrites.length,
        returned:document.getElementById('story-modal').style.display==='flex'};
    });
    assert.match(storyItem.id,/^author-item-/);
    assert.equal(storyItem.storyId,'truyen-dien-vl');
    assert.equal(storyItem.npcId,'c2');
    assert.equal(storyItem.scope,'STORY');
    assert.equal(storyItem.acquisition,'COLLECTION_ONLY');
    assert.equal(storyItem.inventory,2,'Defining an item does not award it');
    assert.equal(storyItem.writes,0);
    assert.equal(storyItem.returned,true,'Item modal should return to story editor');

    await page.evaluate(()=>{closeModals();openEditChapterModal(0);});
    await page.locator('#chapter-story-item-picker').selectOption(storyItem.id);
    await page.getByRole('button',{name:'Gắn',exact:true}).click();
    await page.getByRole('button',{name:'Lưu Nội Dung'}).click();
    const linked = await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex];
      return {linked:novel.chapters[0].storyItemIds||[],
        storyItemCount:novel.specialItems.length,
        inventory:userProfile.inventory.length};
    });
    assert.deepEqual(linked.linked,[storyItem.id]);
    assert.equal(linked.storyItemCount,1,'Linking never copies or awards an item');
    assert.equal(linked.inventory,2);

    await page.evaluate(()=>openEditChapterModal(0));
    await page.locator('#chapter-add-item-btn').click();
    await page.locator('#author-item-name').fill('Bức thư chương đầu');
    await page.locator('#author-item-desc').fill('Một bức thư xuất hiện trong chương đầu.');
    await page.locator('#author-item-method').selectOption('CHAPTER_EVENT');
    await page.locator('#author-item-npc').selectOption('c2');
    await page.getByRole('button',{name:'Lưu vật phẩm'}).click();
    const chapterItem = await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex],item=novel.specialItems.find(x=>x.scope==='CHAPTER');
      return {id:item?.id,chapterId:item?.chapterId,storyId:item?.storyId,
        npcId:item?.npcId,method:item?.acquisition?.method,
        listCount:document.getElementById('chapter-author-items').children.length,
        errors:DuduAuthorItems.validateCollection(novel),
        inventory:userProfile.inventory.length,writes:window.__firestoreWrites.length};
    });
    assert.match(chapterItem.id,/^author-item-/);
    assert.equal(chapterItem.chapterId,'ch-1');
    assert.equal(chapterItem.npcId,'c2');
    assert.equal(chapterItem.method,'CHAPTER_EVENT');
    assert.deepEqual(chapterItem.errors,[]);
    assert.equal(chapterItem.listCount,1);
    assert.equal(chapterItem.inventory,2);
    assert.equal(chapterItem.writes,0);
    // Quick duplicate preserves fields but must allocate a distinct persistent ID.
    await page.evaluate(itemId=>openAuthorItemModal('chapter',itemId,true),chapterItem.id);
    assert.equal(await page.locator('#author-item-name').inputValue(),'Bức thư chương đầu');
    await page.locator('#author-item-name').fill('Bức thư bản thứ hai');
    await page.getByRole('button',{name:'Lưu vật phẩm'}).click();
    const cloned = await page.evaluate(()=>{
      const rows=DuduAuthorItems.list(novels[selectedNovelIndex],{chapterId:'ch-1'});
      return {count:rows.length,uniqueIds:new Set(rows.map(i=>i.id)).size,
        sameNpc:rows.every(i=>i.npcId==='c2'),
        sameChapter:rows.every(i=>i.chapterId==='ch-1'),
        inventory:userProfile.inventory.length};
    });
    assert.equal(cloned.count,2);
    assert.equal(cloned.uniqueIds,2);
    assert.equal(cloned.sameNpc,true);
    assert.equal(cloned.sameChapter,true);
    assert.equal(cloned.inventory,2);

    const readerBlocked = await page.evaluate(()=>{
      closeModals();userProfile.role='reader';applyUserRole();
      openAuthorItemModal('story');
      const hidden=document.getElementById('author-item-modal').style.display!=='flex';
      userProfile.role='admin';applyUserRole();
      return hidden;
    });
    assert.equal(readerBlocked,true,'Reader cannot open author item editor');

    // Archive is reversible and must never delete NPC definitions, public
    // chapter connections or existing collectible NPC references.
    await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex];
      novel.characters.push({id:'temp-npc-typo',name:'NPC GÕ NHẦM',role:'Thử'});
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      openPhoneApp('codex');
    });
    const typoCard=page.locator('.character-card').filter({hasText:'NPC GÕ NHẦM'});
    assert.equal(await typoCard.count(),1);
    await typoCard.locator('.dudu-v27-npc-admin > summary').click();
    page.once('dialog',dialog=>dialog.accept());
    await typoCard.getByRole('button',{name:'Lưu trữ'}).click();
    const archivedNpc=await page.evaluate(()=>{
      const story=novels[selectedNovelIndex];
      return {archived:story.characters.find(c=>c.id==='temp-npc-typo')?.archived,
        characterCount:story.characters.length,
        chapterLinks:[...(story.chapters[0].characterIds||[])],
        publicItemNpcIds:story.specialItems.map(x=>x.npcId),
        writes:window.__firestoreWrites.length};
    });
    assert.equal(archivedNpc.archived,true);
    assert.equal(archivedNpc.characterCount,5,'Archive preserves permanent NPC records');
    assert.deepEqual(archivedNpc.chapterLinks,['c2']);
    assert.ok(archivedNpc.publicItemNpcIds.includes('c2'));
    assert.equal(archivedNpc.writes,0);
    assert.equal(await typoCard.count(),0,'Archived NPC disappears from normal Codex');
    await page.getByRole('button',{name:/Xem NPC lưu trữ/}).click();
    const archivedCard=page.locator('.character-card').filter({hasText:'NPC GÕ NHẦM'});
    await archivedCard.locator('.dudu-v27-npc-admin > summary').click();
    await archivedCard.getByRole('button',{name:'Khôi phục'}).click();
    const restored=await page.evaluate(()=>novels[selectedNovelIndex].characters
      .find(c=>c.id==='temp-npc-typo')?.archived);
    assert.equal(restored,false,'Author can restore a wrongfully archived NPC');
    await page.evaluate(()=>{showArchivedNpcs=false;phoneHome();togglePhone();});

    // 4B: a secret draft MUST fail closed in sandbox and never be copied into
    // the publicly readable story library, even if the author clicks Save.
    await page.evaluate(()=>openEditStoryModal());
    await page.locator('#story-add-item-btn').click();
    await page.locator('#author-item-name').fill('BÍ MẬT NHÂN VẬT CHƯA CÔNG BỐ');
    await page.locator('#author-item-desc').fill('Tình tiết chỉ tác giả được xem.');
    await page.locator('#author-item-private').check();
    await page.getByRole('button',{name:'Lưu vật phẩm'}).click();
    const vaultOff = await page.evaluate(()=>{
      const publicLibrary=JSON.stringify(novels);
      const allStorage=Object.entries(localStorage).map(([key,val])=>key+'='+val).join(' ');
      return {
        editorOpen:document.getElementById('author-item-modal').style.display==='flex',
        error:document.getElementById('author-item-error').textContent,
        publicLeak:publicLibrary.includes('BÍ MẬT NHÂN VẬT CHƯA CÔNG BỐ'),
        localLeak:allStorage.includes('BÍ MẬT NHÂN VẬT CHƯA CÔNG BỐ'),
        writes:window.__firestoreWrites.length
      };
    });
    assert.equal(vaultOff.editorOpen,true,'Failed secret save must keep editor and typed draft');
    assert.match(vaultOff.error,/Kho bí mật chưa mở/);
    assert.equal(vaultOff.publicLeak,false,'No secret title in public novel JSON');
    assert.equal(vaultOff.localLeak,false,'No secret title in localStorage');
    assert.equal(vaultOff.writes,0,'No production Firestore write in sandbox');
    await page.evaluate(()=>cancelAuthorItemModal());

    // A mocked successful server response proves the private branch never
    // falls back to novel.specialItems/saveDB. No real network or Cloudflare call.
    await page.evaluate(()=>{
      window.__originalCollectiblesClient=window.DuduCollectiblesClient;
      window.__vaultFixture=[];
      window.DuduCollectiblesClient={
        ...window.__originalCollectiblesClient,
        savePrivateDraft:async body=>{
          window.__vaultFixture.push({
            storyId:body.storyId,chapterId:body.chapterId,
            itemId:'author-item-private-fixture',npcId:body.item.npcId||null,
            name:body.item.name,rank:body.item.rank,type:body.item.type,
            icon:body.item.icon,summary:body.item.desc,method:body.item.method
          });
          return {ok:true,itemId:'author-item-private-fixture'};
        },
        listPrivateDrafts:async(storyId,chapterId)=>({
          ok:true,items:window.__vaultFixture.filter(r=>r.storyId===storyId&&r.chapterId===chapterId)
        }),
        archivePrivateDraft:async()=>({ok:true}),
        previewPrivateDraft:async(storyId,itemId)=>{
          const draft=window.__vaultFixture.find(x=>x.storyId===storyId&&x.itemId===itemId);
          return {ok:!!draft,draft:draft?{...draft,updatedAt:1792051200000}:null,release:null};
        },
        publishPrivateDraft:async approval=>{
          window.__releaseApproval=approval;
          return {ok:true,storyId:approval.storyId,itemId:approval.itemId,
            method:'STORY_EVENT'};
        }
      };
    });
    await page.locator('#story-add-item-btn').click();
    await page.locator('#author-item-name').fill('KẾT THÚC CÒN GIẤU');
    await page.locator('#author-item-desc').fill('Thông tin không được đăng trước.');
    await page.locator('#author-item-method').selectOption('STORY_EVENT');
    await page.locator('#author-item-private').check();
    await page.getByRole('button',{name:'Lưu vật phẩm'}).click();
    await page.waitForFunction(()=>
      document.getElementById('story-private-items').textContent.includes('KẾT THÚC CÒN GIẤU'));
    const vaultMock = await page.evaluate(()=>{
      const serialized=JSON.stringify(novels);
      const storage=Object.entries(localStorage).map(([k,v])=>k+v).join('');
      const record=window.__vaultFixture[0];
      return {storyId:record?.storyId,itemId:record?.itemId,
        publicLeak:serialized.includes('KẾT THÚC CÒN GIẤU'),
        localLeak:storage.includes('KẾT THÚC CÒN GIẤU'),
        inventory:userProfile.inventory.length,
        writes:window.__firestoreWrites.length,
        privateList:document.getElementById('story-private-items').textContent};
    });
    assert.equal(vaultMock.storyId,'truyen-dien-vl');
    assert.equal(vaultMock.itemId,'author-item-private-fixture');
    assert.equal(vaultMock.publicLeak,false);
    assert.equal(vaultMock.localLeak,false);
    assert.equal(vaultMock.inventory,2);
    assert.equal(vaultMock.writes,0);
    assert.match(vaultMock.privateList,/Bản thảo chỉ tác giả xem/);

    await page.getByRole('button',{name:'Duyệt phát hành'}).click();
    await page.waitForFunction(()=>document.getElementById('author-release-modal').style.display==='flex');
    assert.match(await page.locator('#author-release-preview').textContent(),/KẾT THÚC CÒN GIẤU/);
    assert.equal(await page.locator('#author-release-approve').isDisabled(),false,
      'A story event draft may be approved after a fresh server preview');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#author-release-approve').click();
    const approved=await page.evaluate(()=>{
      const a=window.__releaseApproval||{};
      return {storyId:a.storyId,itemId:a.itemId,
        expectedUpdatedAt:a.expectedUpdatedAt,
        confirmPublicRelease:a.confirmPublicRelease,
        confirmRevealToOwner:a.confirmRevealToOwner,
        publicLeak:JSON.stringify(novels).includes('KẾT THÚC CÒN GIẤU'),
        writes:window.__firestoreWrites.length,
        inventory:userProfile.inventory.length};
    });
    assert.equal(approved.storyId,'truyen-dien-vl');
    assert.equal(approved.itemId,'author-item-private-fixture');
    assert.equal(approved.expectedUpdatedAt,1792051200000);
    assert.equal(approved.confirmPublicRelease,true);
    assert.equal(approved.confirmRevealToOwner,true);
    assert.equal(approved.publicLeak,false,'Approved server release must not mirror secrets into the public story');
    assert.equal(approved.writes,0);
    assert.equal(approved.inventory,2,'Publication must not grant the collectible to anybody');

    await page.evaluate(()=>{
      closeModals();
      window.DuduCollectiblesClient=window.__originalCollectiblesClient;
      delete window.__vaultFixture;
    });

    // Self-grant is strictly a confirmed author-side F STORY_EVENT test
    // control. Sandbox cannot call even the mocked grant method.
    const isolatedSelfTest=await page.evaluate(async()=>{
      const original=window.DuduCollectiblesClient;
      window.__selfGrantAttempts=0;
      const draft={storyId:'truyen-dien-vl',itemId:'author-item-only-test',
        chapterId:null,npcId:null,name:'Kỷ vật kiểm thử tự cấp',
        rank:'F',method:'STORY_EVENT',summary:'Fake data',updatedAt:1792051200000};
      window.DuduCollectiblesClient={...original,
        previewPrivateDraft:async()=>({ok:true,draft,release:{
          method:'STORY_EVENT',chapterId:null,disabled:false,publishedAt:1792051200000
        }}),
        grantStoryTestToSelf:async()=>{window.__selfGrantAttempts++;return {ok:true,alreadyOwned:false};}
      };
      try{
        openEditStoryModal();
        await openAuthorReleasePreview('story',{storyId:draft.storyId,
          itemId:draft.itemId,chapterId:null});
        const visible=document.getElementById('author-release-test-area').style.display;
        await testGrantStoryToSelf();
        const blockedAttempts=window.__selfGrantAttempts;
        cancelAuthorReleasePreview();
        window.DuduCollectiblesClient.previewPrivateDraft=async()=>({ok:true,
          draft:{...draft,chapterId:'ch-1',method:'CHAPTER_EVENT'},
          release:{method:'CHAPTER_EVENT',chapterId:'ch-1',disabled:false}});
        closeModals();
        openEditChapterModal(0);
        await openAuthorReleasePreview('chapter',{storyId:draft.storyId,
          itemId:draft.itemId,chapterId:'ch-1'});
        const chapterVisible=document.getElementById('author-release-test-area').style.display;
        cancelAuthorReleasePreview();
        closeModals();
        return {visible,blockedAttempts,chapterVisible,
          writes:window.__firestoreWrites.length,
          inventory:userProfile.inventory.length};
      }finally{window.DuduCollectiblesClient=original;}
    });
    assert.equal(isolatedSelfTest.visible,'block','Only verified F story test item shows self-grant control');
    assert.equal(isolatedSelfTest.blockedAttempts,0,'Sandbox may not grant even through a mocked gateway');
    assert.equal(isolatedSelfTest.chapterVisible,'none','CHAPTER_EVENT cannot expose admin self-grant');
    assert.equal(isolatedSelfTest.writes,0,'No production Firestore writes');
    assert.equal(isolatedSelfTest.inventory,2,'No local reward mutation');

    await page.evaluate(() => {
      openCreateChapterModal();
      document.getElementById('chapter-modal-title').value = 'Kiểm thử chương dài';
      document.getElementById('chapter-modal-content').value = 'Đoạn đầu kiểm thử.\\nĐoạn sau có thêm nhân vật.';
    });
    await page.getByRole('button', { name: '+ Tạo NPC' }).click();
    await page.locator('#char-input-name').fill('Nhân vật thử nghiệm');
    await page.locator('#char-input-aliases').fill('NPC thử, Người đưa tin');
    await page.locator('#char-input-origin').fill('Nguyên giới thử');
    await page.getByRole('button', { name: 'Lưu Nhân Vật' }).click();

    const verified = await page.evaluate(() => {
      const novel = novels[selectedNovelIndex];
      const char = novel.characters.find(x => x.name === 'Nhân vật thử nghiệm');
      const chapterOpen = document.getElementById('chapter-modal').style.display === 'flex';
      const content = document.getElementById('chapter-modal-content').value;
      const picked = char && [...document.querySelectorAll('#chapter-modal-npc-picker input:checked')].some(el => el.value === char.id);
      return { charId: char?.id, origin: char?.originWorld, chapterOpen, content, picked, unlocked: char && isNpcUnlocked(novel.id, char.id), writes: window.__firestoreWrites.length };
    });
    assert.ok(verified.charId, 'New NPC should exist');
    assert.equal(verified.origin, 'Nguyên giới thử');
    assert.equal(verified.chapterOpen, true, 'Chapter form should be visible again');
    assert.match(verified.content, /Đoạn đầu kiểm thử/);
    assert.equal(verified.picked, true, 'New NPC should be selected in chapter');
    assert.equal(verified.unlocked, false, 'Creating NPC must not grant chat access');
    assert.equal(verified.writes, 0, 'Sandbox must never write production Firestore');

    await page.evaluate(() => {
      chatHistories['truyen-dien-vl::c2'] = [{ role: 'user', text: 'private from tester-a' }];
      saveChatHistories();
      closeModals();
      openAuthModal();
    });
    await page.locator('#auth-username').fill('tester-b');
    await page.getByRole('button', { name: 'Đổi tài khoản thử' }).click();
    const swapped = await page.evaluate(() => ({
      username: currentUsername,
      chats: Object.values(chatHistories).flat().map(m => m.text),
      writes: window.__firestoreWrites.length
    }));
    assert.equal(swapped.username, 'tester-b');
    assert.ok(!swapped.chats.includes('private from tester-a'), 'Chat must remain scoped to tester-a');
    assert.equal(swapped.writes, 0);

    const npcEfficient = await page.evaluate(async () => {
      const novel = novels[selectedNovelIndex];
      const char = novel.characters.find(c => c.name === 'Nhân vật thử nghiệm');
      getStoryProgress(novel.id).collectedCharacters[char.id] = { affinity: 12 };
      activeChatNovelId = novel.id;
      renderChatDropdown();
      let remoteCalls = 0;
      let lastRequest = null;
      DuduAI.generate = async (purpose, instruction, messages) => {
        remoteCalls++;
        lastRequest = { purpose, instruction, messages };
        return { text: 'Tôi nghe đây, kể tôi nghe thêm nhé.' };
      };
      const input = document.getElementById('chat-user-input');
      input.value = 'Xin chào Nhân vật thử nghiệm!';
      await sendChatMessage();
      const conversationKey = chatKey(char.id, novel.id);
      const free = chatHistories[conversationKey].at(-1);
      const callsAfterGreeting = remoteCalls;

      char.note = 'a'.repeat(4000);
      const question = 'Bạn còn nhớ chuyện chúng ta đã trải qua không? ' + 'x'.repeat(1400);
      input.value = question;
      await sendChatMessage();
      const fullSaved = chatHistories[conversationKey].at(-2).text;
      return {
        freeSource: free?.source, freeText: free?.text,
        callsAfterGreeting, remoteCalls, purpose: lastRequest?.purpose,
        instructionLength: lastRequest?.instruction.length,
        remoteLastLength: lastRequest?.messages.at(-1).text.length,
        fullSavedLength: fullSaved.length,
        writes: window.__firestoreWrites.length
      };
    });
    assert.equal(npcEfficient.freeSource, 'script');
    assert.ok(npcEfficient.freeText.length > 15);
    assert.equal(npcEfficient.callsAfterGreeting, 0, 'Greetings must not call Gemini');
    assert.equal(npcEfficient.remoteCalls, 1, 'Story-specific chat still calls AI');
    assert.equal(npcEfficient.purpose, 'chat');
    assert.ok(npcEfficient.instructionLength < 2300, 'Long NPC notes stay within the 3000-character backend instruction cap');
    assert.ok(npcEfficient.remoteLastLength <= 1001, 'AI request is trimmed');
    assert.ok(npcEfficient.fullSavedLength > 1001, 'Full chat history remains saved');
    assert.equal(npcEfficient.writes, 0, 'Sandbox must stay isolated');

    const npcContinuity = await page.evaluate(async () => {
      const novel = novels[selectedNovelIndex];
      const char = novel.characters.find(c => c.name === 'Nhân vật thử nghiệm');
      const key = chatKey(char.id, novel.id);
      let apiCalls = 0;
      DuduAI.isConfigured = () => true;
      DuduAI.generate = async () => { apiCalls++; return {error:'AI mock unavailable'}; };
      const input = document.getElementById('chat-user-input');
      input.value = 'Cảm ơn!';
      await sendChatMessage();
      const afterFailure = chatHistories[key].length;
      const noFakeNpcReply = chatHistories[key].at(-1).role === 'user';
      const hasLegacyErrorBubble = chatHistories[key].some(m => m.role === 'system' && m.text.includes('AI mock unavailable'));
      const outageVisible = document.getElementById('chat-connection-status').style.display === 'block';
      const retryVisible = document.getElementById('chat-retry-btn').style.display === 'inline-block';
      DuduAI.generate = async () => { apiCalls++; return {text:'Tôi hiểu điều bạn muốn nói.'}; };
      await retryLastNpcReply();
      return {
        apiCalls, afterFailure, afterRetry:chatHistories[key].length,
        noFakeNpcReply, hasLegacyErrorBubble, outageVisible, retryVisible,
        restored:chatHistories[key].at(-1).text,
        hiddenAfterRetry:document.getElementById('chat-connection-status').style.display === 'none'
      };
    });
    assert.equal(npcContinuity.apiCalls, 2, 'Thanks after meaningful AI context should go to AI, and retry calls only once');
    assert.equal(npcContinuity.noFakeNpcReply, true);
    assert.equal(npcContinuity.hasLegacyErrorBubble, false, 'Error diagnostics must not impersonate NPC dialogue');
    assert.equal(npcContinuity.outageVisible, true);
    assert.equal(npcContinuity.retryVisible, true);
    assert.equal(npcContinuity.afterRetry, npcContinuity.afterFailure + 1, 'Retry must not duplicate user message');
    assert.equal(npcContinuity.hiddenAfterRetry, true);
    assert.match(npcContinuity.restored,/Tôi hiểu/);

    const npcLongMemory = await page.evaluate(async () => {
      const novel=novels[selectedNovelIndex];
      const char=novel.characters.find(c=>c.name==='Nhân vật thử nghiệm');
      const memory=npcMemoryStore(novel.id,char.id);
      const original=memory.list();
      const otherUser=DuduNpcMemory.open(localStorage,'tester-a',novel.id,char.id,true).list();
      const otherStory=DuduNpcMemory.open(localStorage,currentUsername,'different-story',char.id,true).list();
      const otherNpc=DuduNpcMemory.open(localStorage,currentUsername,novel.id,'different-npc',true).list();
      // Gift is recorded as local game interaction, not verified author canon.
      // R2 Sandbox requires an explicitly catalogued, giftable item.
      userProfile.inventory.unshift({...DuduItemCatalog.common[0]});
      const gift=userProfile.inventory[0].name;
      await executeGiftItem(char.id,0);
      const gifts=memory.list().filter(e=>e.type==='gift');
      let calledMessages=[];
      DuduAI.generate=async (purpose,instruction,messages)=>{
        calledMessages=messages;
        return {text:'Tôi nhớ chuyện ấy, nhưng hãy kể thêm nhé.'};
      };
      const input=document.getElementById('chat-user-input');
      input.value='Bạn còn nhớ món '+gift+' tôi đã tặng không?';
      await sendChatMessage();
      const hasMemoryRequest=calledMessages.some(m=>m.role==='user'&&m.text.includes('Nhật ký tương tác')&&m.text.includes(gift));
      // Diary stays inside the + menu, reads only this unlocked NPC's local memory.
      openPhoneApp('chat');
      document.querySelector('.dudu-v33-tabs [data-tab="all"]')?.click();
      const thread=[...document.querySelectorAll('#dudu-v33-inbox-list .dudu-v33-thread')]
        .find(el=>el.querySelector('strong')?.textContent===char.name);
      thread?.click();
      const diaryButton=document.getElementById('dudu-npc-diary-open');
      diaryButton?.click();
      const diaryVisible=!document.getElementById('dudu-npc-diary').hidden;
      const diaryHasGift=document.getElementById('dudu-npc-diary-list').textContent.includes(gift);
      const diaryCaveat=document.querySelector('.dudu-npc-diary-note')?.textContent.includes('không phải tình tiết chính thức');
      const diaryClosed=(()=>{DuduNpcDiary.close();return document.getElementById('dudu-npc-diary').hidden;})();
      window.confirm=()=>true;
      clearCurrentChat();
      return {
        originalCount:original.length,
        otherUser:otherUser.length,otherStory:otherStory.length,otherNpc:otherNpc.length,
        giftCount:gifts.length,giftProvenance:gifts[0]?.provenance,
        hasMemoryRequest,diaryVisible,diaryHasGift,diaryCaveat,diaryClosed,deleted:memory.list().length===0,
        chatCleared:(chatHistories[chatKey(char.id,novel.id)]||[]).length===0,
        writes:window.__firestoreWrites.length
      };
    });
    assert.ok(npcLongMemory.originalCount>=2,'Successful AI replies should become local conversation records');
    assert.equal(npcLongMemory.otherUser,0,'No other account memory leakage');
    assert.equal(npcLongMemory.otherStory,0,'No other story memory leakage');
    assert.equal(npcLongMemory.otherNpc,0,'No other NPC memory leakage');
    assert.equal(npcLongMemory.giftCount,1);
    assert.equal(npcLongMemory.giftProvenance,'game-local');
    assert.equal(npcLongMemory.hasMemoryRequest,true,'Relevant recorded gift must be recalled with untrusted provenance');
    assert.equal(npcLongMemory.diaryVisible,true,'NPC memory diary opens from the compact chat menu');
    assert.equal(npcLongMemory.diaryHasGift,true,'Diary shows the gift belonging to this NPC only');
    assert.equal(npcLongMemory.diaryCaveat,true,'Diary distinguishes player claims from story canon');
    assert.equal(npcLongMemory.diaryClosed,true,'Diary close restores the previous conversation');
    assert.equal(npcLongMemory.deleted,true,'Deleting conversation must delete related local memory');
    assert.equal(npcLongMemory.chatCleared,true);
    assert.equal(npcLongMemory.writes,0,'Sandbox must make no production writes');

    const lateAI = await page.evaluate(async () => {
      const novel=novels[selectedNovelIndex];
      const char=novel.characters.find(c=>c.name==='Nhân vật thử nghiệm');
      const key=chatKey(char.id,novel.id);
      let begin;
      const started=new Promise(resolve=>{begin=resolve;});
      let finish;
      DuduAI.generate=()=>new Promise(resolve=>{finish=resolve;begin();});
      document.getElementById('chat-user-input').value='Bạn còn nhớ bí mật của khu rừng không?';
      const pending=sendChatMessage();
      await started;
      window.confirm=()=>true;
      clearCurrentChat();
      finish({text:'Phản hồi AI đã đến muộn.'});
      await pending;
      return {
        chatCount:(chatHistories[key]||[]).length,
        memoryCount:npcMemoryStore(novel.id,char.id).list().length,
        storedKey:localStorage.getItem(scopedLocalKey('chats')),
        writes:window.__firestoreWrites.length
      };
    });
    assert.equal(lateAI.chatCount,0,'Late AI must not re-create a cleared conversation');
    assert.equal(lateAI.memoryCount,0,'Late AI must not re-create deleted NPC memories');
    assert.equal(lateAI.writes,0);

    // Phase 2: unique chapter rewards, real rarity and author-assigned realm only.
    const lootPhase2 = await page.evaluate(() => {
      const novel=novels[selectedNovelIndex];
      const ch=novel.chapters[0];
      const readKey=novel.id+'_'+(ch.id||0);
      userProfile.readRewards ||= {};
      delete userProfile.readRewards[readKey];
      const expBefore=userProfile.exp;
      readChapter(0);
      const expFirst=userProfile.exp;
      const alreadyCounted=userProfile.readRewards[readKey]===true;
      readChapter(0);
      const expSecond=userProfile.exp;
      const oldRandom=Math.random;
      Math.random=()=>0.999999;
      let base,scifi,freeOk,freeAgain,freeCountBefore,freeCountAfter,yesterdayRefresh,stillDailyLocked;
      try {
        freeCountBefore=userProfile.inventory.length;
        claimChapterLootDrop();
        freeOk=userProfile.lootedChapters[readKey]===DuduLootCadenceV42.dayKey();
        const drop=userProfile.inventory[0];
        base={id:drop.id,rank:drop.rank,scope:drop.scope,source:drop.obtainedFrom,
          namedChapter:drop.obtainedFrom?.storyId===novel.id};
        const countOnce=userProfile.inventory.length;
        claimChapterLootDrop();
        freeAgain=userProfile.inventory.length===countOnce;
        // An old, undated boolean from pre-V42 does not lock a chapter forever.
        // A prior-day claim becomes eligible again, then locks for today.
        const recordedToday=userProfile.lootedChapters[readKey];
        userProfile.lootedChapters[readKey]=DuduLootCadenceV42.dayKey(Date.now()-86400000);
        claimChapterLootDrop();
        yesterdayRefresh=userProfile.inventory.length===countOnce+1 &&
          userProfile.lootedChapters[readKey]===recordedToday;
        const countAfterRefresh=userProfile.inventory.length;
        claimChapterLootDrop();
        stillDailyLocked=userProfile.inventory.length===countAfterRefresh;
        const second={id:'phase2-realm-chapter',title:'Chương thử vị diện',
          content:'Nội dung dành cho kiểm thử thế giới.',realmTag:'SCIFI'};
        novel.chapters.push(second);
        readChapter(novel.chapters.length-1);
        claimChapterLootDrop();
        const item=userProfile.inventory[0];
        scifi={rank:item.rank,scope:item.scope,realmTag:item.realmTag,source:item.obtainedFrom,
          chapterClaim:userProfile.lootedChapters[novel.id+'_'+second.id]===DuduLootCadenceV42.dayKey()};
        const cooldownBefore=userProfile.inventory.length;
        const rollOne=rollLootDrop(false);
        const cooldownAfterOne=userProfile.inventory.length;
        const rollTwo=rollLootDrop(false);
        freeCountAfter=userProfile.inventory.length;
        scifi.rollOne=rollOne;
        scifi.rollTwo=rollTwo;
        scifi.cooldownBefore=cooldownBefore;
        scifi.cooldownAfterOne=cooldownAfterOne;
      } finally {
        Math.random=oldRandom;
      }
      return {
        expBefore,expFirst,expSecond,alreadyCounted,freeOk,freeAgain,
        yesterdayRefresh,stillDailyLocked,
        freeCountBefore,freeCountAfter,base,scifi,
        firestoreWrites:window.__firestoreWrites.length
      };
    });
    assert.equal(lootPhase2.alreadyCounted,true);
    assert.equal(lootPhase2.expFirst-lootPhase2.expBefore,5,'First chapter open gets a one-time reward');
    assert.equal(lootPhase2.expSecond,lootPhase2.expFirst,'Re-opening chapter must never repeat EXP');
    assert.equal(lootPhase2.freeOk,true);
    assert.equal(lootPhase2.freeAgain,true,'Same chapter cannot grant a second drop today');
    assert.equal(lootPhase2.yesterdayRefresh,true,'A previous-day chapter loot claim can be collected again');
    assert.equal(lootPhase2.stillDailyLocked,true,'The next repeated claim remains blocked on the same day');
    assert.equal(lootPhase2.base.scope,'COMMON','Untagged chapter must use global item pool');
    assert.equal(lootPhase2.base.rank,'B','Empty higher ranks must not silently become F');
    assert.equal(lootPhase2.base.namedChapter,true);
    assert.equal(lootPhase2.scifi.scope,'REALM');
    assert.equal(lootPhase2.scifi.realmTag,'SCIFI');
    assert.equal(lootPhase2.scifi.rank,'S');
    assert.equal(lootPhase2.scifi.chapterClaim,true);
    assert.equal(lootPhase2.scifi.rollOne,true);
    assert.equal(lootPhase2.scifi.rollTwo,false,'Cooldown must block repeated free loot button');
    assert.equal(lootPhase2.scifi.cooldownAfterOne,lootPhase2.scifi.cooldownBefore+1);
    assert.equal(lootPhase2.freeCountAfter,lootPhase2.scifi.cooldownAfterOne);
    assert.equal(lootPhase2.firestoreWrites,0,'Sandbox must not update production Firestore');

    const readDaily = await page.evaluate(() => {
      const novel=novels[selectedNovelIndex];
      const chapter=novel.chapters[0];
      const rewardKey=novel.id+'_'+(chapter.id||0);
      const quest=userProfile.quests.find(q=>q.id==='q_daily_read');
      quest.current=0;
      quest.claimed=false;
      userProfile.dailyReadLog={day:'2000-01-01',chapters:[]};
      const expBefore=userProfile.exp;
      readChapter(0);
      const counted=quest.current;
      readChapter(0);
      const countedAgain=quest.current;
      return {counted,countedAgain,expBefore,expAfter:userProfile.exp,
        rewarded:userProfile.readRewards[rewardKey]===true,
        day:userProfile.dailyReadLog.day,
        distinct:userProfile.dailyReadLog.chapters.length};
    });
    assert.equal(readDaily.counted,1,'Previously opened chapters may count towards a new-day quest');
    assert.equal(readDaily.countedAgain,1,'Same chapter must not repeat daily quest progress today');
    assert.equal(readDaily.expAfter,readDaily.expBefore,'Daily reading must never duplicate first-time EXP');
    assert.equal(readDaily.rewarded,true);
    assert.equal(readDaily.distinct,1);

    const realmEditor = await page.evaluate(() => {
      userProfile.role='admin'; // sandbox fixture only; never production Firebase
      applyUserRole();
      const novel=novels[selectedNovelIndex];
      const alreadyRewarded=userProfile.readRewards[novel.id+'_'+(novel.chapters[0].id||0)];
      openEditChapterModal(0);
      const select=document.getElementById('chapter-modal-realm-tag');
      const initiallyEmpty=select.value==='';
      select.value='CULTIVATION';
      saveChapterModal();
      openEditChapterModal(0);
      const persisted=document.getElementById('chapter-modal-realm-tag').value;
      const original=novel.chapters[0].realmTag;
      closeModals();
      return {initiallyEmpty,persisted,original,alreadyRewarded,
        stillRewarded:userProfile.readRewards[novel.id+'_'+(novel.chapters[0].id||0)],
        writes:window.__firestoreWrites.length};
    });
    assert.equal(realmEditor.initiallyEmpty,true);
    assert.equal(realmEditor.persisted,'CULTIVATION','Author-assigned chapter tag must survive save/reopen');
    assert.equal(realmEditor.original,'CULTIVATION');
    assert.equal(realmEditor.stillRewarded,realmEditor.alreadyRewarded,
      'Editing and reopening a chapter must not reset reading rewards');
    assert.equal(realmEditor.writes,0);

    const migratedLegacyChapter = await page.evaluate(()=>{
      userProfile.role='admin';applyUserRole();
      const novel=novels[selectedNovelIndex];
      const idx=novel.chapters.length;
      const oldKey=novel.id+'_'+idx;
      novel.chapters.push({title:'Chương cũ chưa ID',content:'Một chương di sản.',characterIds:[]});
      userProfile.lootedChapters[oldKey]=true;
      userProfile.readRewards[oldKey]=true;
      userProfile.dailyReadLog={day:new Date().toISOString().slice(0,10),chapters:[oldKey]};
      openEditChapterModal(idx);
      saveChapterModal();
      const ch=novel.chapters[idx];
      const nextKey=novel.id+'_'+ch.id;
      return {id:ch.id,loot:!!userProfile.lootedChapters[nextKey],
        read:!!userProfile.readRewards[nextKey],
        daily:userProfile.dailyReadLog.chapters.includes(nextKey),
        writes:window.__firestoreWrites.length};
    });
    assert.match(migratedLegacyChapter.id,/^ch-/);
    assert.equal(migratedLegacyChapter.loot,true,'Legacy loot claim survives stable chapter ID migration');
    assert.equal(migratedLegacyChapter.read,true,'Legacy read EXP claim survives migration');
    assert.equal(migratedLegacyChapter.daily,true,'Daily read log survives migration');
    assert.equal(migratedLegacyChapter.writes,0);

    // Switching to another sandbox identity must not reuse the previous
    // user's chapter loot claims, reading rewards or inventory instances.
    await page.evaluate(()=>openAuthModal());
    await page.locator('#auth-username').fill('tester-a');
    await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
    const otherAccountLoot = await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex];
      const taggedKey=novel.id+'_phase2-realm-chapter';
      return {
        username:currentUsername,
        claimed:!!userProfile.lootedChapters?.[taggedKey],
        rewarded:!!userProfile.readRewards?.[taggedKey],
        hasTaggedDrop:(userProfile.inventory||[]).some(item=>item.obtainedFrom?.chapterId==='phase2-realm-chapter'),
        writes:window.__firestoreWrites.length
      };
    });
    assert.equal(otherAccountLoot.username,'tester-a');
    assert.equal(otherAccountLoot.claimed,false,'Chapter claims must not leak between users');
    assert.equal(otherAccountLoot.rewarded,false,'One-time read rewards must not leak between users');
    assert.equal(otherAccountLoot.hasTaggedDrop,false,'Loot inventory must not leak between users');
    assert.equal(otherAccountLoot.writes,0);

    // R2/R3 sandbox gameplay: gift lifecycle, cap, persistence and no cloud writes.
    const relationshipSandbox = await page.evaluate(async () => {
      const novel=novels[selectedNovelIndex],char=novel.characters.find(x=>!x.archived);
      const beforeProfile=JSON.stringify(userProfile);
      const beforeActive=activeChatNovelId;
      activeChatNovelId=novel.id;
      const progress=getStoryProgress(novel.id);
      progress.collectedCharacters[char.id]={id:char.id,affinity:39,
        relationshipV2:{version:1,trust:0,stage:'ACQUAINTED',lastGiftAt:0,
          giftDayUtc:'',acceptedGiftCountUtc:0,acceptedInstanceIds:[]}};
      userProfile.inventory=[{...DuduItemCatalog.common[0]},{...DuduItemCatalog.common[0]}];
      const writesBefore=window.__firestoreWrites.length;
      const first=await executeGiftItem(char.id,0);
      const afterFirst={affinity:progress.collectedCharacters[char.id].affinity,
        trust:progress.collectedCharacters[char.id].relationshipV2.trust,
        count:userProfile.inventory.length};
      await executeGiftItem(char.id,0);
      const afterRetry={affinity:progress.collectedCharacters[char.id].affinity,
        count:userProfile.inventory.length};
      progress.collectedCharacters[char.id].relationshipV2.lastGiftAt=0;
      progress.collectedCharacters[char.id].relationshipV2.giftDayUtc='';
      progress.collectedCharacters[char.id].relationshipV2.acceptedGiftCountUtc=0;
      await executeGiftItem(char.id,0);
      const atCap={affinity:progress.collectedCharacters[char.id].affinity,
        count:userProfile.inventory.length};
      const stored=JSON.parse(localStorage.getItem(scopedLocalKey('profile'))||'null');
      const savedAffinity=stored?.storyStates?.[novel.id]?.collectedCharacters?.[char.id]?.affinity;
      const panel=document.getElementById('npc-relationship-r3-preview');
      const select=document.getElementById('chat-character-selector');
      select.value=char.id;
      switchChatCharacter();
      const panelText=panel.textContent;
      const writes=window.__firestoreWrites.length-writesBefore;
      userProfile=JSON.parse(beforeProfile);
      activeChatNovelId=beforeActive;
      saveCurrentAccount();
      return {afterFirst,afterRetry,atCap,savedAffinity,panelText,writes};
    });
    assert.deepEqual(relationshipSandbox.afterFirst,{affinity:40,trust:0,count:1});
    assert.deepEqual(relationshipSandbox.afterRetry,{affinity:40,count:1},
      'Immediate repeat cannot consume the second gift');
    assert.deepEqual(relationshipSandbox.atCap,{affinity:40,count:1},
      'At trust 0, a neutral gift cannot exceed 40 or consume the item');
    assert.equal(relationshipSandbox.savedAffinity,40,
      'Sandbox profile must persist relationship state before restoration');
    assert.match(relationshipSandbox.panelText,/Trần thiện cảm mới: 40\/100/);
    assert.equal(relationshipSandbox.writes,0,
      'Gift sandbox never writes production Firestore');

    // R4: switch among the THREE pre-existing NPC IDs. Never create/unlock in live data.
    const npcSwitches=await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex],ids=['c_otk','c_ttl','c_tct'];
      const original=JSON.stringify(userProfile),oldChat=activeChatNovelId;
      const select=document.getElementById('chat-character-selector');
      const previousOptions=select.innerHTML,previousValue=select.value;
      activeChatNovelId=novel.id;
      const previousCharacters=novel.characters;
      // Preview fixture only: reference existing canonical IDs, no publication.
      novel.characters=[...previousCharacters];
      for(const [i,id] of ids.entries()){
        if(!novel.characters.some(n=>n.id===id))
          novel.characters.push({id,name:['Ôn Tri Hành','Tô Thanh Lạc','Thẩm Cẩm Thư'][i]});
      }
      const state=getStoryProgress(novel.id);
      for(const [i,id] of ids.entries())
        state.collectedCharacters[id]={id,affinity:[39,65,90][i],
          relationshipV2:{version:1,trust:[0,25,60][i]}};
      select.innerHTML='';
      for(const id of ids){const opt=document.createElement('option');opt.value=id;opt.textContent=id;select.appendChild(opt);}
      const outputs=ids.map(id=>{
        select.value=id;switchChatCharacter();
        const panel=document.getElementById('npc-relationship-r3-preview');
        return {id,text:panel.textContent,displayed:panel.style.display,
          inCodex:!!panel.closest('#npc-v31-relation-host')};
      });
      select.innerHTML=previousOptions;select.value=previousValue;
      novel.characters=previousCharacters;
      userProfile=JSON.parse(original);activeChatNovelId=oldChat;
      return {outputs,writes:window.__firestoreWrites.length};
    });
    assert.equal(npcSwitches.outputs.length,3);
    assert.match(npcSwitches.outputs[0].text,/Thiện cảm: 39\/100[\s\S]*Tin tưởng: 0\/100/);
    assert.match(npcSwitches.outputs[1].text,/Thiện cảm: 65\/100[\s\S]*Tin tưởng: 25\/100/);
    assert.match(npcSwitches.outputs[2].text,/Thiện cảm: 90\/100[\s\S]*Tin tưởng: 60\/100/);
    assert.ok(npcSwitches.outputs.every(x=>
      x.displayed===(x.inCodex?'none':'block')),
      'NPC stats live inside character cards; no stale global progress above another NPC');
    assert.equal(npcSwitches.writes,0,'Switching NPC does not write Firestore');
    // Check compact panel fits narrow mobile view without document-level overflow.
    await page.setViewportSize({width:375,height:812});
    const phoneLayout=await page.evaluate(()=>{
      openPhoneApp('chat');
      const panel=document.getElementById('npc-relationship-r3-preview');
      return {docWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,
        help:!!document.getElementById('npc-relationship-r4-help'),panelWidth:panel.getBoundingClientRect().width};
    });
    assert.equal(phoneLayout.help,true);
    assert.ok(Number.isFinite(phoneLayout.panelWidth), 'Hidden phone panel must not cause layout exceptions');

    // R5/R6 + inventory: behavior in a browser with fake Firebase only.
    const expansionSmoke=await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex];
      const oldCharacters=novel.characters;
      const snapshot=JSON.stringify(userProfile);
      const originalChatNovel=activeChatNovelId;
      const oldOptions=document.getElementById('chat-character-selector').innerHTML;
      const oldSelection=document.getElementById('chat-character-selector').value;
      const oldTab=inventoryTab;
      const originals=Array.isArray(userProfile.inventory)?userProfile.inventory:[];
      const ids=['c_otk','c_ttl','c_tct'];
      novel.characters=[...oldCharacters];
      for(const [idx,id] of ids.entries())if(!novel.characters.some(c=>c.id===id)){
        novel.characters.push({id,name:['Ôn Tri Hành','Tô Thanh Lạc','Thẩm Cẩm Thư'][idx]});
      }
      activeChatNovelId=novel.id;
      const state=getStoryProgress(novel.id);
      state.collectedCharacters.c_otk={id:'c_otk',affinity:39,relationshipV2:{trust:0}};
      const writesBefore=window.__firestoreWrites.length;
      openPhoneApp('chat');
      const sel=document.getElementById('chat-character-selector');
      sel.value='c_otk';switchChatCharacter();
      const firstBefore=state.collectedCharacters.c_otk.relationshipV2.trust;
      npcDailyCheckin();
      const choiceVisible=document.getElementById('npc-daily-choice-card').style.display;
      npcSubmitDailyChoice('thoughtful');
      const afterFirst=state.collectedCharacters.c_otk.relationshipV2.trust;
      const saved=JSON.parse(localStorage.getItem(scopedLocalKey('profile'))||'{}');
      const savedTrust=saved.storyStates?.[novel.id]?.collectedCharacters?.c_otk?.relationshipV2?.trust;
      npcDailyCheckin();
      const afterRepeat=state.collectedCharacters.c_otk.relationshipV2.trust;
      const disabled=document.getElementById('npc-daily-checkin-btn').disabled;
      const portrait=document.getElementById('npc-portrait-v1').textContent;
      userProfile.inventory=[
        {...DuduItemCatalog.byId('f1')},
        {...DuduItemCatalog.byId('e3')},
        {...DuduItemCatalog.souvenirs[0]}
      ];
      inventoryTab='WEAPON';
      openPhoneApp('inventory');
      const filtered=document.getElementById('inventory-container').textContent;
      const search=document.getElementById('inventory-v2-search');
      search.value='DAO';
      renderInventory();
      const searchCount=document.getElementById('inventory-v2-count').textContent;
      discardItem(2);
      const protectedStillThere=userProfile.inventory.some(i=>i.scope==='DUDU');
      discardItem(1);
      const correctRemoved=userProfile.inventory.every(i=>i.id!=='e3')&&
        userProfile.inventory.some(i=>i.id==='f1');
      userProfile=JSON.parse(snapshot);saveCurrentAccount();
      novel.characters=oldCharacters;
      activeChatNovelId=originalChatNovel;inventoryTab=oldTab;
      sel.innerHTML=oldOptions;sel.value=oldSelection;
      return {firstBefore,afterFirst,afterRepeat,savedTrust,disabled,choiceVisible,portrait,
        filtered,searchCount,protectedStillThere,correctRemoved,
        writes:window.__firestoreWrites.length-writesBefore};
    });
    assert.equal(expansionSmoke.firstBefore,0);
    assert.equal(expansionSmoke.choiceVisible,'block','Daily trust uses a deliberate dialogue choice');
    assert.equal(expansionSmoke.afterFirst,3);
    assert.equal(expansionSmoke.afterRepeat,3,'One check-in per NPC/day');
    assert.equal(expansionSmoke.savedTrust,3,'Sandbox trust persists locally');
    assert.equal(expansionSmoke.disabled,true);
    assert.ok(expansionSmoke.portrait.length>0,'NPC avatar initials must render');
    assert.match(expansionSmoke.filtered,/Dao Gọt Trái Cây Cũ/);
    assert.equal(expansionSmoke.searchCount,'');
    assert.equal(expansionSmoke.protectedStillThere,true,'Souvenir must not be discarded');
    assert.equal(expansionSmoke.correctRemoved,true,'Filtering must not delete a different item');
    assert.equal(expansionSmoke.writes,0,'Sandbox R5 and inventory never write Firestore');

    // R7 author preview: preferences and secret milestone DRAFT remain sandbox-local.
    const npcR7Author=await page.evaluate(()=>{
      const story=novels[selectedNovelIndex];
      const npcIndex=(story.characters||[]).findIndex(c=>c&&c.id);
      if(npcIndex<0)return {missing:true};
      const originalCharacters=JSON.stringify(story.characters);
      const originalRole=userProfile.role;
      const previousChapter=story.chapters.find(ch=>ch.id);
      const originalStoryId=editingCharNovelId;
      const originalSelection=document.getElementById('codex-novel-selector').value;
      const writesBefore=window.__firestoreWrites.length;
      userProfile.role='admin';applyUserRole();
      renderCodexDropdown();
      document.getElementById('codex-novel-selector').value=story.id;
      const npc=story.characters[npcIndex],id=npc.id;
      openEditCharacterModal(npcIndex);
      const sectionVisible=document.getElementById('npc-r7-author-fields').style.display;
      document.getElementById('npc-r7-use-custom').checked=true;
      toggleNpcR7Custom();
      document.getElementById('npc-r7-liked').value='PRACTICAL';
      document.getElementById('npc-r7-disliked').value='DANGEROUS';
      document.getElementById('npc-r7-style').value='reserved';
      document.getElementById('npc-r7-portrait').value='https://evil.example/x.webp';
      document.getElementById('npc-r7-milestones').value=
        'r7-trust|'+previousChapter.id+'|30';
      saveCharacterModal();
      const invalidRejected=!story.characters[npcIndex].portraitPath;
      document.getElementById('npc-r7-portrait').value='assets/npc/test-r7.webp';
      saveCharacterModal();
      const after=story.characters[npcIndex];
      const key=DuduNpcAuthorR7.sandboxMilestoneDraftKey(story.id,id);
      const draft=JSON.parse(localStorage.getItem(key)||'null');
      const publicNovel=JSON.parse(localStorage.getItem('dudu-sandbox-library')||'[]')
        .find(n=>n.id===story.id);
      openEditCharacterModal(npcIndex);
      const reloadedPortrait=document.getElementById('npc-r7-portrait').value;
      const reloadedMilestone=document.getElementById('npc-r7-milestones').value;
      closeModals();
      const result={missing:false,sectionVisible,invalidRejected,
        preference:after.giftPreferences?.likedTags?.[0],
        portrait:after.portraitPath,reloadedPortrait,reloadedMilestone,
        draftOnly:draft?.verified===false&&draft?.milestones?.[0]?.chapterId===previousChapter.id,
        notPublic:!(publicNovel?.characters?.[npcIndex]?.milestones),
        originalCount:JSON.parse(originalCharacters).length,
        afterCount:story.characters.length,
        writes:window.__firestoreWrites.length-writesBefore};
      story.characters=JSON.parse(originalCharacters);
      localStorage.removeItem(key);
      userProfile.role=originalRole;applyUserRole();saveDB();
      editingCharNovelId=originalStoryId;
      document.getElementById('codex-novel-selector').value=originalSelection;
      return result;
    });
    assert.equal(npcR7Author.missing,false,'Sandbox fixture must have an NPC');
    assert.equal(npcR7Author.sectionVisible,'block');
    assert.equal(npcR7Author.invalidRejected,true,'External art URLs must be blocked');
    assert.equal(npcR7Author.preference,'PRACTICAL');
    assert.equal(npcR7Author.portrait,'assets/npc/test-r7.webp');
    assert.equal(npcR7Author.reloadedPortrait,'assets/npc/test-r7.webp');
    assert.match(npcR7Author.reloadedMilestone,/r7-trust\\|/);
    assert.equal(npcR7Author.draftOnly,true,'Milestones must stay unverified private drafts');
    assert.equal(npcR7Author.notPublic,true,'Milestones must not enter public novel');
    assert.equal(npcR7Author.originalCount,npcR7Author.afterCount,
      'Editing must not create or unlock extra NPCs');
    assert.equal(npcR7Author.writes,0,'R7 sandbox authoring cannot write Firestore');

    // V39 unified gallery — 72 original IDs + 4 HD anime, no personality labels.
    const portraitBrowser=await page.evaluate(async()=>{
      const story=novels[selectedNovelIndex];
      const idx=story.characters.findIndex(n=>n?.id);
      if(idx<0)return {missing:true};
      const original=JSON.stringify(story.characters);
      const originalRole=userProfile.role,priorNovel=editingCharNovelId;
      const beforeWrites=window.__firestoreWrites.length;
      userProfile.role='admin';applyUserRole();renderCodexDropdown();
      document.getElementById('codex-novel-selector').value=story.id;
      try{
        openEditCharacterModal(idx);
        const box=document.getElementById('npc-r8-gallery-panel');
        const collapsed=!box.open;
        const oldSectionsHidden=['npc-v28-art-pack','npc-v14-art-panel'].every(id=>
          getComputedStyle(document.getElementById(id)).display==='none');
        box.open=true;
        npcRenderPortraitChoices();
        const initiallyRendered=document.querySelectorAll('#npc-r8-gallery [data-portrait-id]').length;
        const seenAnime=!!document.querySelector('#npc-r8-gallery [data-portrait-id="portrait-f-01"]');
        const library=window.DuduNpcPortraitLibrary;
        const total=library.CATALOG.length;
        const female=library.search({gender:'female'}).length;
        const male=library.search({gender:'male'}).length;
        const IDnotMood=library.search({query:'trầm tĩnh'}).length===0&&
          library.search({query:'portrait-a-01'}).length===1;
        npcSelectPortraitPreset('portrait-a-01');
        const selectedId=document.getElementById('npc-r8-preset-id').value;
        const autoCollapsed=!box.open;
        saveCharacterModal();
        const saved=story.characters[idx].portraitPresetId;
        openEditCharacterModal(idx);
        const restored=document.getElementById('npc-r8-preset-id').value;
        const portrait=document.createElement('div');
        document.body.append(portrait);
        renderNpcPortraitPreview(portrait,story.characters[idx],story.id);
        const rendersAtlas=portrait.style.backgroundImage.includes('data:image/webp;base64')||
          portrait.style.backgroundImage.includes('female-anime-candidates-v15.webp');
        portrait.remove();
        npcSelectPortraitPreset('portrait-n-03');
        saveCharacterModal();
        openEditCharacterModal(idx);
        const legacyPreserved=document.getElementById('npc-r8-preset-id').value==='portrait-n-03';
        npcSelectPortraitPreset('portrait-f-07');
        saveCharacterModal();
        openEditCharacterModal(idx);
        const canvas=document.createElement('canvas');canvas.width=60;canvas.height=60;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#663399';ctx.fillRect(0,0,60,60);
        const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
        const file=new File([blob],'avatar.png',{type:'image/png'});
        await npcUploadPortrait({target:{files:[file],value:''}});
        const uploadId=document.getElementById('npc-r8-upload-id').value;
        const ownSrc=await library.readUpload(currentUsername||'sandbox-guest',story.id,uploadId);
        const otherSrc=await library.readUpload('not-the-user',story.id,uploadId);
        saveCharacterModal();
        const uploaded=story.characters[idx].portraitUploadId;
        openEditCharacterModal(idx);
        const lateUpload=npcUploadPortrait({target:{files:[file],value:''}});
        npcSelectPortraitPreset('portrait-m-02');
        await lateUpload;
        const raceSelected=document.getElementById('npc-r8-preset-id').value==='portrait-m-02'&&
          document.getElementById('npc-r8-upload-id').value==='';
        closeModals();
        return {missing:false,collapsed,oldSectionsHidden,initiallyRendered,seenAnime,
          total,female,male,IDnotMood,selectedId,autoCollapsed,saved,restored,
          rendersAtlas,legacyPreserved,uploadId,uploaded,
          ownSrc:typeof ownSrc==='string'&&ownSrc.startsWith('data:image/jpeg;base64,'),
          otherSrc,raceSelected,
          sameCount:story.characters.length===JSON.parse(original).length,
          writes:window.__firestoreWrites.length-beforeWrites};
      }finally{
        story.characters=JSON.parse(original);
        localStorage.setItem('dudu-sandbox-library',JSON.stringify(novels));
        userProfile.role=originalRole;applyUserRole();editingCharNovelId=priorNovel;
      }
    });
    assert.equal(portraitBrowser.missing,false);
    assert.equal(portraitBrowser.total,76);
    assert.equal(portraitBrowser.female,64);
    assert.equal(portraitBrowser.male,12);
    assert.equal(portraitBrowser.collapsed,true);
    assert.equal(portraitBrowser.oldSectionsHidden,true);
    assert.equal(portraitBrowser.initiallyRendered,24);
    assert.equal(portraitBrowser.seenAnime,true);
    assert.equal(portraitBrowser.IDnotMood,true);
    assert.equal(portraitBrowser.selectedId,'portrait-a-01');
    assert.equal(portraitBrowser.autoCollapsed,true);
    assert.equal(portraitBrowser.saved,'portrait-a-01');
    assert.equal(portraitBrowser.restored,'portrait-a-01');
    assert.equal(portraitBrowser.rendersAtlas,true);
    assert.equal(portraitBrowser.legacyPreserved,true);
    assert.ok(/^own-/.test(portraitBrowser.uploadId));
    assert.equal(portraitBrowser.uploaded,portraitBrowser.uploadId);
    assert.equal(portraitBrowser.ownSrc,true);
    assert.equal(portraitBrowser.otherSrc,null);
    assert.equal(portraitBrowser.raceSelected,true);
    assert.equal(portraitBrowser.sameCount,true);
    assert.equal(portraitBrowser.writes,0);

    // V15: fullscreen portraits use a locally bundled high-res WebP,
    // restore keyboard focus and cannot be opened for locked reader NPCs.
    await page.setViewportSize({width:375,height:812});
    const portraitV15=await page.evaluate(()=>{
      const story=novels[selectedNovelIndex];
      const originalCharacters=JSON.stringify(story.characters);
      const originalRole=userProfile.role;
      const beforeWrites=window.__firestoreWrites.length;
      userProfile.role='admin';applyUserRole();
      const npc=story.characters.find(c=>c?.id&&!c.archived);
      if(!npc)return {missing:true};
      npc.portraitAnimeId='anime-moon-blue';
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      openPhoneApp('codex');
      document.getElementById('codex-novel-selector').value=story.id;
      renderCodexList();
      const view=document.querySelector('#codex-container .dudu-npc-v12-card button[data-npc-portrait]');
      const actionExists=!!view;
      view?.click();
      const modal=document.getElementById('npc-v15-viewer');
      const stage=modal.querySelector('.npc-v15-stage');
      const rect=stage.getBoundingClientRect();
      return {missing:false,actionExists,
        duplicateViewerButtons:document.querySelectorAll('#codex-container .npc-v15-view-button').length,
        viewIsPhoto:view?.classList.contains('dudu-npc-v12-portrait'),
        open:modal.style.display==='flex',
        modalAria:modal.getAttribute('aria-hidden'),
        named:document.getElementById('npc-v15-title').textContent===npc.name,
        focus:document.activeElement?.id,
        fit:rect.left>=0&&rect.right<=innerWidth+1&&rect.top>=0&&rect.bottom<=innerHeight+1,
        viewerPortrait:document.getElementById('npc-v15-image').dataset.npcId,
        npcId:npc.id,beforeWrites,originalCharacters,originalRole};
    });
    assert.equal(portraitV15.missing,false);
    assert.equal(portraitV15.actionExists,true);
    assert.equal(portraitV15.viewIsPhoto,true);
    assert.equal(portraitV15.duplicateViewerButtons,0);
    assert.equal(portraitV15.open,true);
    assert.equal(portraitV15.modalAria,'false');
    assert.equal(portraitV15.named,true);
    assert.equal(portraitV15.focus,'npc-v15-close');
    assert.equal(portraitV15.fit,true);
    assert.equal(portraitV15.viewerPortrait,portraitV15.npcId);
    await page.waitForFunction(()=>
      document.getElementById('npc-v15-image')?.style.backgroundImage
        .includes('assets/npc/concepts/female-anime-candidates-v15.webp'),
      {timeout:10000});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#npc-v15-viewer').getAttribute('aria-hidden'),'true');
    assert.equal(await page.locator('#npc-v15-viewer').evaluate(x=>x.style.display),'none');
    assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('dudu-npc-v12-portrait')),true);
    // V27: Chat avatar itself opens the same viewer; no duplicate button.
    const chatPortraitV27=await page.evaluate(()=>{
      const story=novels[selectedNovelIndex];
      const npc=story.characters.find(c=>c?.id&&!c.archived);
      // Chat lists unlocked characters only. Grant a reversible, in-memory
      // preview unlock to exercise the viewer, without persistence or writes.
      const progress=getStoryProgress(story.id);
      const hadUnlock=Object.prototype.hasOwnProperty.call(progress.collectedCharacters,npc.id);
      const oldUnlock=progress.collectedCharacters[npc.id];
      const oldChatNovelId=activeChatNovelId;
      if(!hadUnlock)progress.collectedCharacters[npc.id]={id:npc.id,affinity:10};
      try{
        activeChatNovelId=story.id;
        openPhoneApp('chat');
        // V33 deliberately opens the inbox first. Navigate to the conversation
        // via the real contacts UI so the portrait opener can receive focus.
        document.querySelector('.dudu-v33-tabs button[data-tab="all"]')?.click();
        const thread=[...document.querySelectorAll('#dudu-v33-inbox-list .dudu-v33-thread')]
          .find(b=>b.querySelector('strong')?.textContent===npc.name);
        thread?.click();
        const selector=document.getElementById('chat-character-selector');
        selector.value=npc.id;
        switchChatCharacter();
        const portrait=document.getElementById('npc-portrait-v1');
        const enabled=portrait?.tagName==='BUTTON'&&!portrait.disabled;
        const noDuplicate=!document.getElementById('npc-v15-chat-view');
        portrait?.click();
        return {enabled,noDuplicate,
          open:document.getElementById('npc-v15-viewer').style.display==='flex',
          focus:document.activeElement?.id,
          buttonCount:document.querySelectorAll('#phone-app-chat .npc-v15-chat-button').length};
      }finally{
        activeChatNovelId=oldChatNovelId;
        if(hadUnlock)progress.collectedCharacters[npc.id]=oldUnlock;
        else delete progress.collectedCharacters[npc.id];
      }
    });
    assert.equal(chatPortraitV27.enabled,true);
    assert.equal(chatPortraitV27.noDuplicate,true);
    assert.equal(chatPortraitV27.open,true);
    assert.equal(chatPortraitV27.focus,'npc-v15-close');
    assert.equal(chatPortraitV27.buttonCount,0);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'npc-portrait-v1');
    const rejectedView=await page.evaluate(()=>{
      const story=novels[selectedNovelIndex];
      const npc=story.characters.find(x=>x?.id&&!x.archived);
      const progress=getStoryProgress(story.id);
      const before=progress.collectedCharacters[npc.id];
      delete progress.collectedCharacters[npc.id];
      userProfile.role='reader';applyUserRole();
      const result=openNpcPortraitViewer(npc,story.id);
      const hidden=document.getElementById('npc-v15-viewer').style.display==='none';
      if(before)progress.collectedCharacters[npc.id]=before;
      return {result,hidden};
    });
    assert.equal(rejectedView.result,false);
    assert.equal(rejectedView.hidden,true);
    const finalV15=await page.evaluate((data)=>{
      const story=novels[selectedNovelIndex];
      story.characters=JSON.parse(data.originalCharacters);
      userProfile.role=data.originalRole;applyUserRole();
      renderCodexList();
      return {writes:window.__firestoreWrites.length-data.beforeWrites};
    },portraitV15);
    assert.equal(finalV15.writes,0,'Opening portraits cannot write to Firestore');
    await page.evaluate(()=>{if(document.getElementById('cyber-phone').style.display==='flex')togglePhone();});


    const storyDatesBrowser=await page.evaluate(()=>{
      const story={updatedAt:'2026-10-15',
        chapters:[{updatedAt:'2026-10-09'},{updatedAt:'2026-10-11'}]};
      return {day:getNovelLatestDate(story),
        label:DuduStoryDates.display(getNovelLatestDate(story))};
    });
    assert.deepEqual(storyDatesBrowser,{day:'2026-10-15',label:'15/10/2026'});

    // V27 R2 — 360px phone settings, compact profile and non-destructive
    // overflow navigation; no author/story writes or account save mutation.
    await page.setViewportSize({width:360,height:760});
    const phoneR2=await page.evaluate(()=>{
      const phone=document.getElementById('cyber-phone');
      const wasOpen=phone.style.display==='flex';
      if(!wasOpen)togglePhone();
      try{
        openPhoneApp('settings');
        const beforeSandbox=document.body.classList.contains('dudu-phone-v11');
        const beforePhoneOpen=document.body.classList.contains('dudu-phone-open');
        const oldFont=document.documentElement.style.getPropertyValue('--read-size');
        const oldTheme=document.body.classList.contains('theme-warm')?'warm':
          document.body.classList.contains('theme-oled')?'oled':'default';
        setTheme('warm');
        const themePreserved=document.body.classList.contains('dudu-phone-v11')&&
          document.body.classList.contains('dudu-phone-open')&&
          document.querySelector('[data-dudu-theme="warm"]')?.getAttribute('aria-pressed')==='true';
        setReadingFontSize(21);
        const fontSelected=document.querySelector('[data-dudu-font-size="21"]')?.getAttribute('aria-pressed')==='true';
        const toolsCollapsed=!document.getElementById('dudu-v27-tools').open;
        const allThemeButtons=document.querySelectorAll('#phone-app-settings [data-dudu-theme]').length;
        setTheme(oldTheme);
        document.documentElement.style.setProperty('--read-size',oldFont);
        syncPhoneDisplayOptionsV27();
        openPhoneApp('profile');
        const profile=document.getElementById('phone-app-profile');
        const cards=[...profile.querySelectorAll('.dudu-v27-stat')];
        const bounds=phone.getBoundingClientRect();
        const inside=cards.every(x=>{
          const r=x.getBoundingClientRect();
          return r.left>=bounds.left-1&&r.right<=bounds.right+1;
        });
        const compact=cards.length===5&&
          getComputedStyle(profile.querySelector('.dudu-v27-stats')).gridTemplateColumns.split(' ').length===2;
        openPhoneApp('chat');
        // V33 moves the legacy ⋯ menu into its compact plus-menu header.
        // Accept either actual menu container; do not depend on removed DOM IDs.
        const more=document.getElementById('chat-v27-more')||
          document.querySelector('#phone-app-chat .dudu-v33-tools.in-header');
        if(more)more.open=true;
        const nestedDelete=!!more?.querySelector('[onclick="clearCurrentChat()"]');
        const directDelete=document.querySelector('#phone-app-chat>.phone-app-header>div>.btn[onclick="clearCurrentChat()"]')!==null;
        if(more)more.open=false;
        return {beforeSandbox,beforePhoneOpen,themePreserved,fontSelected,
          toolsCollapsed,allThemeButtons,inside,compact,nestedDelete,
          directDelete,phoneWidth:bounds.width};
      }finally{
        if(!wasOpen&&phone.style.display==='flex')togglePhone();
      }
    });
    assert.equal(phoneR2.beforeSandbox,true);
    assert.equal(phoneR2.beforePhoneOpen,true);
    assert.equal(phoneR2.themePreserved,true);
    assert.equal(phoneR2.fontSelected,true);
    assert.equal(phoneR2.toolsCollapsed,true);
    assert.equal(phoneR2.allThemeButtons,3);
    assert.equal(phoneR2.inside,true);
    assert.equal(phoneR2.compact,true);
    assert.equal(phoneR2.nestedDelete,true);
    assert.equal(phoneR2.directDelete,false);
    assert.ok(phoneR2.phoneWidth<=360);

    // V11 Cyber Phone: accessible shortcut navigation, responsive layout and
    // functional button feedback. Fake Firebase; absolutely no live writes.
    await page.setViewportSize({width:1280,height:800});
    const phoneDesktop=await page.evaluate(()=>{
      const phone=document.getElementById('cyber-phone');
      if(phone.style.display==='flex')togglePhone();
      togglePhone();
      const fab=document.getElementById('phone-fab');
      const shortcuts=[...document.querySelectorAll('#cyber-phone .app-icon')];
      const style=getComputedStyle(phone);
      const styleButton=getComputedStyle(shortcuts[0]);
      return {
        opened:phone.style.display==='flex',
        themed:document.body.classList.contains('dudu-phone-v11'),
        ariaExpanded:fab.getAttribute('aria-expanded'),
        ariaHidden:phone.getAttribute('aria-hidden'),
        clock:document.getElementById('phone-clock').textContent,
        appCount:shortcuts.length,
        nativeButtons:shortcuts.every(x=>x.tagName==='BUTTON'),
        phoneWidth:phone.getBoundingClientRect().width,
        cardRadius:styleButton.borderRadius,
        phoneBorder:style.borderTopColor,
        writes:window.__firestoreWrites.length
      };
    });
    assert.equal(phoneDesktop.opened,true);
    assert.equal(phoneDesktop.themed,true);
    assert.equal(phoneDesktop.ariaExpanded,'true');
    assert.equal(phoneDesktop.ariaHidden,'false');
    assert.match(phoneDesktop.clock,/^\d{2}:\d{2}$/);
    assert.equal(phoneDesktop.appCount,8);
    assert.equal(phoneDesktop.nativeButtons,true);
    assert.ok(phoneDesktop.phoneWidth>=350&&phoneDesktop.phoneWidth<=390);
    assert.notEqual(phoneDesktop.cardRadius,'0px');
    assert.notEqual(phoneDesktop.phoneBorder,'rgb(51, 65, 85)',
      'Phone must use new lavender border');
    await page.evaluate(()=>phoneHome());
    await page.getByRole('button',{name:'Mở Kho Đồ'}).click();
    const openedInventory=await page.evaluate(()=>({
      inventory:document.getElementById('phone-app-inventory').style.display,
      home:document.getElementById('phone-home-screen').style.display
    }));
    assert.equal(openedInventory.inventory,'flex');
    assert.equal(openedInventory.home,'none');
    await page.getByRole('button',{name:'Về màn hình chính của Cyber Phone'}).click();
    assert.equal(await page.locator('#phone-home-screen').evaluate(x=>x.style.display),'flex');
    await page.getByRole('button',{name:'Mở Liên Lạc'}).click();
    assert.equal(await page.locator('#phone-app-chat').evaluate(x=>x.style.display),'flex');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#cyber-phone').evaluate(x=>x.style.display),'none');
    assert.equal(await page.locator('#phone-fab').getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('#phone-fab').evaluate(x=>document.activeElement===x),true);
    for(const [width,height] of [[375,812],[320,640]]) {
      await page.setViewportSize({width,height});
      const layout=await page.evaluate(()=>{
        togglePhone();
        const phone=document.getElementById('cyber-phone');
        const rect=phone.getBoundingClientRect();
        const screen=phone.querySelector('.phone-screen').getBoundingClientRect();
        return {width:innerWidth,height:innerHeight,
          left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
          cardW:rect.width,screenW:screen.width,homeOverflow:
            document.getElementById('phone-home-screen').scrollWidth-
            document.getElementById('phone-home-screen').clientWidth};
      });
      assert.ok(layout.left>=0&&layout.right<=width+1,
        'Cyber Phone must fit narrow viewport width: '+JSON.stringify(layout));
      assert.ok(layout.top>=0&&layout.bottom<=height+1,
        'Cyber Phone must fit viewport height: '+JSON.stringify(layout));
      assert.ok(layout.screenW>200,'Cyber Phone content must remain usable');
      assert.ok(layout.homeOverflow<=1,'App icons must not cause horizontal overflow');
      await page.locator('#cyber-phone .phone-close-btn').click();
      assert.equal(await page.locator('#cyber-phone').evaluate(x=>x.style.display),'none');
    }
    await page.setViewportSize({width:1280,height:800});

    // V12: real DOM profile layout and read-only inventory inspector in sandbox.
    await page.setViewportSize({width:375,height:812});
    const dossierV12=await page.evaluate(()=>{
      const snapshot=JSON.stringify(userProfile);
      const oldTab=inventoryTab,oldSelection=inventoryDetailSelection;
      const initialWrites=window.__firestoreWrites.length;
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      openPhoneApp('codex');
      const novel=getSelectedCodexNovel();
      const char=(novel?.characters||[]).find(c=>!c.archived);
      if(!char)return {error:'no character fixture'};
      const progress=getStoryProgress(novel.id);
      progress.collectedCharacters[char.id]={id:char.id,affinity:52,relationshipV2:{trust:25}};
      renderCodexList();
      const card=document.querySelector('#codex-container .dudu-npc-v12-card');
      const top=card?.querySelector('.dudu-npc-v12-top');
      const portrait=card?.querySelector('.dudu-npc-v12-portrait');
      const profile=card?.querySelector('.dudu-npc-v12-summary')?.textContent||'';
      const profileData={
        count:document.querySelectorAll('#codex-container .dudu-npc-v12-card').length,
        layout:top?getComputedStyle(top).display:null,
        portraitWidth:portrait?.getBoundingClientRect().width||0,
        body:profile,
        actionCount:card?.querySelectorAll('.dudu-npc-v12-actions .btn').length||0,
        codexOverflow:document.getElementById('phone-app-codex').scrollWidth-
          document.getElementById('phone-app-codex').clientWidth
      };
      inventoryTab='ALL';
      const searchInput=document.getElementById('inventory-v2-search');
      const priorSearch=searchInput.value;
      searchInput.value='';
      userProfile.inventory=[
        {...DuduItemCatalog.byId('f1')},
        {...DuduItemCatalog.byId('e3')},
        {...DuduItemCatalog.souvenirs[0]}
      ];
      openPhoneApp('inventory');
      const inventoryBefore=JSON.stringify(userProfile.inventory);
      const rows=document.querySelectorAll('#inventory-container .dudu-inventory-v12-row').length;
      const first=document.querySelector('#inventory-container .dudu-inventory-v12-open');
      first?.click();
      const inspector=document.getElementById('inventory-v42-modal');
      const itemRows=[...document.querySelectorAll('#inventory-container .dudu-inventory-v12-row')];
      const artNodes=itemRows.flatMap(row=>[...row.querySelectorAll('img.dudu-item-v13-art')]);
      const illustrations={
        iconCount:artNodes.length,
        artPerRow:itemRows.map(row=>row.querySelectorAll('img.dudu-item-v13-art').length),
        allSvg:artNodes.every(img=>img.src.startsWith('data:image/svg+xml')),
        rarityCount:itemRows.filter(row=>!!row.dataset.rarity).length,
        inspectorArt:!!inspector.querySelector('img.dudu-item-v13-art'),
        ranks:itemRows.map(x=>x.dataset.rarity)
      };
      const details={
        illustrations,
        rows,
        visible:!inspector.hidden,
        modalInsidePhone:(()=>{
          const dialog=inspector.querySelector('.dudu-v42-modal-dialog')?.getBoundingClientRect();
          const phone=document.getElementById('cyber-phone').getBoundingClientRect();
          return !!dialog&&dialog.left>=phone.left&&dialog.right<=phone.right&&
            dialog.top>=phone.top&&dialog.bottom<=phone.bottom;
        })(),
        text:inspector.textContent,
        afterView:JSON.stringify(userProfile.inventory),
        openButtons:document.querySelectorAll('#inventory-container .dudu-inventory-v12-open').length
      };
      const close=inspector.querySelector('button[aria-label="Đóng chi tiết vật phẩm"]');
      close?.click();
      details.closed=inspector.hidden;
      document.querySelector('#inventory-container .dudu-v42-slot')?.click();
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
      details.escapeClosed=inspector.hidden;
      document.querySelector('#inventory-container .dudu-v42-slot')?.click();
      inspector.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      details.backdropClosed=inspector.hidden;
      details.sameInventory=details.afterView===inventoryBefore;
      details.writes=window.__firestoreWrites.length-initialWrites;
      userProfile=JSON.parse(snapshot);
      inventoryTab=oldTab;inventoryDetailSelection=oldSelection;
      searchInput.value=priorSearch;
      renderInventory();phoneHome();
      return {profileData,details};
    });
    assert.ok(!dossierV12.error,dossierV12.error||'Dossier fixture valid');
    assert.ok(dossierV12.profileData.count>=1);
    assert.equal(dossierV12.profileData.layout,'grid');
    assert.ok(dossierV12.profileData.portraitWidth>=70);
    assert.match(dossierV12.profileData.body,/Thiện cảm/);
    assert.match(dossierV12.profileData.body,/52\/100/);
    assert.match(dossierV12.profileData.body,/Tin tưởng/);
    assert.match(dossierV12.profileData.body,/25\/100/);
    assert.ok(dossierV12.profileData.actionCount>=2);
    assert.ok(dossierV12.profileData.codexOverflow<=1,
      'NPC cards must fit 375px phone without horizontal scrolling');
    assert.equal(dossierV12.details.illustrations.iconCount,3,
      JSON.stringify(dossierV12.details.illustrations));
    assert.deepEqual(dossierV12.details.illustrations.artPerRow,[1,1,1]);
    assert.equal(dossierV12.details.illustrations.allSvg,true);
    assert.equal(dossierV12.details.illustrations.rarityCount,3);
    assert.equal(dossierV12.details.illustrations.inspectorArt,true);
    assert.deepEqual(dossierV12.details.illustrations.ranks,['F','E','F']);
    assert.equal(dossierV12.details.rows,3);
    assert.equal(dossierV12.details.openButtons,3);
    assert.equal(dossierV12.details.visible,true);
    assert.equal(dossierV12.details.modalInsidePhone,true);
    assert.match(dossierV12.details.text,/Mẩu Bánh Mì Mốc/);
    assert.equal(dossierV12.details.closed,true);
    assert.equal(dossierV12.details.escapeClosed,true);
    assert.equal(dossierV12.details.backdropClosed,true);
    assert.equal(dossierV12.details.sameInventory,true);
    assert.equal(dossierV12.details.writes,0);

    // V27 R4 — wallpapers are purely local UI options, isolated by account.
    const wallpaperR4=await page.evaluate(()=>{
      const beforeUser=currentUsername;
      const beforeProfile=JSON.stringify(userProfile);
      const beforeWrites=window.__firestoreWrites.length;
      const aKey=DuduPhoneWallpaperV27.keyFor(beforeUser);
      const bKey=DuduPhoneWallpaperV27.keyFor('wallpaper-second-account');
      const originalA=localStorage.getItem(aKey);
      const originalB=localStorage.getItem(bKey);
      try{
        if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
        openPhoneApp('settings');
        const gallery=document.getElementById('dudu-v34-overlay');
        const choices=gallery?.querySelectorAll('[data-dudu-wallpaper-choice]')||[];
        const animeCount=gallery?.querySelectorAll('#dudu-v37-anime-panel [data-dudu-wallpaper-choice]').length||0;
        const initial=document.body.dataset.duduPhoneWallpaper;
        setPhoneWallpaperV27('sakura');
        const chosen=document.body.dataset.duduPhoneWallpaper;
        const selected=gallery?.querySelector('[data-dudu-wallpaper-choice="sakura"]')?.getAttribute('aria-pressed');
        const currentName=document.getElementById('dudu-v34-current-name')?.textContent;
        const beforeBackground=getComputedStyle(document.getElementById('phone-home-screen')).backgroundImage;
        currentUsername='wallpaper-second-account';
        renderPhoneWallpaperV27();
        const otherBefore=document.body.dataset.duduPhoneWallpaper;
        setPhoneWallpaperV27('jade');
        const otherChosen=document.body.dataset.duduPhoneWallpaper;
        currentUsername=beforeUser;
        updatePhoneUI();
        const back=document.body.dataset.duduPhoneWallpaper;
        const restoredBackground=getComputedStyle(document.getElementById('phone-home-screen')).backgroundImage;
        setPhoneWallpaperV27('../../unsafe');
        const invalidIgnored=document.body.dataset.duduPhoneWallpaper===back;
        return {
          initial,choices:choices.length,animeCount,chosen,selected,currentName,otherBefore,otherChosen,back,
          stylesDifferent:beforeBackground!==restoredBackground?false:beforeBackground.includes('radial-gradient'),
          invalidIgnored,unchanged:JSON.stringify(userProfile)===beforeProfile,
          writes:window.__firestoreWrites.length-beforeWrites
        };
      }finally{
        currentUsername=beforeUser;
        if(originalA===null)localStorage.removeItem(aKey);
        else localStorage.setItem(aKey,originalA);
        if(originalB===null)localStorage.removeItem(bKey);
        else localStorage.setItem(bKey,originalB);
        renderPhoneWallpaperV27();
        phoneHome();
      }
    });
    assert.equal(wallpaperR4.choices,15,'V44 gallery includes 4 calm, 4 world, 4 classic and 3 anime choices');
    assert.equal(wallpaperR4.animeCount,3,'Anime wallpapers live in the gallery, not Settings');
    assert.equal(wallpaperR4.currentName,'Hoa anh đào','V44 preview updates when wallpaper selection changes');
    assert.equal(wallpaperR4.chosen,'sakura');
    assert.equal(wallpaperR4.selected,'true');
    assert.equal(wallpaperR4.otherBefore,'midnight');
    assert.equal(wallpaperR4.otherChosen,'jade');
    assert.equal(wallpaperR4.back,'sakura');
    assert.equal(wallpaperR4.invalidIgnored,true);
    assert.equal(wallpaperR4.unchanged,true);
    assert.equal(wallpaperR4.writes,0);

    // V28 R5 — world/personal wallpaper tracks the currently selected story.
    // Test transitions on Cyber Phone without making any Firebase or story writes.
    const worldV28=await page.evaluate(()=>{
      const account=currentUsername,profileBefore=JSON.stringify(userProfile);
      const writes=window.__firestoreWrites.length;
      const owner=account||'sandbox-guest';
      const key=DuduMultiverseArtV28.keyFor(owner);
      const modeBefore=localStorage.getItem(key);
      const storedPersonal=DuduPhoneWallpaperV27.keyFor(owner);
      const personalBefore=localStorage.getItem(storedPersonal);
      const oldNovelIndex=selectedNovelIndex;
      const story=novels[oldNovelIndex];
      const hadGenre=story&&Object.prototype.hasOwnProperty.call(story,'genre');
      const oldGenre=story?.genre;
      const oldWorldId=story?.worldArtId;
      const hadWorldId=story&&Object.prototype.hasOwnProperty.call(story,'worldArtId');
      const oldChat=activeChatNovelId;
      try{
        if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
        openPhoneApp('settings');
        setPhoneWallpaperV27('jade');
        setPhoneWallpaperModeV28('world');
        const selected=document.querySelector('#dudu-v34-overlay [data-wallpaper-mode="world"]')?.getAttribute('aria-pressed');
        if(story){
          story.genre='Tiên hiệp';
          delete story.worldArtId;
          activeChatNovelId=null;
        }
        phoneHome();
        const matched=document.body.dataset.duduPhoneWallpaper;
        if(story)story.genre='Chưa phân loại';
        phoneHome();
        const fallback=document.body.dataset.duduPhoneWallpaper;
        setPhoneWallpaperModeV28('personal');
        const personal=document.body.dataset.duduPhoneWallpaper;
        const galleryIsPresent=!!document.getElementById('npc-v28-npc-gallery');
        return {
          selected,matched,fallback,personal,galleryIsPresent,
          saved:JSON.stringify(userProfile)===profileBefore,
          writes:window.__firestoreWrites.length-writes,
          modeCount:document.querySelectorAll('#dudu-v34-overlay [data-wallpaper-mode]').length
        };
      }finally{
        currentUsername=account;activeChatNovelId=oldChat;selectedNovelIndex=oldNovelIndex;
        if(story){
          if(hadGenre)story.genre=oldGenre;else delete story.genre;
          if(hadWorldId)story.worldArtId=oldWorldId;else delete story.worldArtId;
        }
        if(modeBefore===null)localStorage.removeItem(key);else localStorage.setItem(key,modeBefore);
        if(personalBefore===null)localStorage.removeItem(storedPersonal);
        else localStorage.setItem(storedPersonal,personalBefore);
        phoneHome();
      }
    });
    assert.equal(worldV28.selected,'true');
    assert.equal(worldV28.matched,'world-xianxia');
    assert.equal(worldV28.fallback,'jade');
    assert.equal(worldV28.personal,'jade');
    assert.equal(worldV28.galleryIsPresent,true);
    assert.equal(worldV28.modeCount,2);
    assert.equal(worldV28.saved,true);
    assert.equal(worldV28.writes,0);

    // V29 actual phone release: the main shortcut opens real story cards.
    const storyAppV29=await page.evaluate(()=>{
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      openPhoneApp('stories');
      const grid=document.getElementById('dudu-v29-story-grid');
      const buttons=[...grid.querySelectorAll('button.dudu-v29-read-button')];
      const validButtons=buttons.every(b=>b.type==='button'&&b.getAttribute('aria-label')?.startsWith('Mở truyện'));
      const noDuplicateHome=[...document.querySelectorAll('#phone-home-screen .app-icon')].every(b=>
        b.getAttribute('onclick')!=="openPhoneApp('profile')");
      const directStory=document.querySelector('#phone-home-screen .app-icon[onclick="openPhoneApp(\'stories\')"]');
      phoneHome();
      return {cards:grid.children.length,expected:novels.length,validButtons,
        directStory:!!directStory,noDuplicateHome};
    });
    assert.equal(storyAppV29.cards,storyAppV29.expected);
    assert.equal(storyAppV29.validButtons,true);
    assert.equal(storyAppV29.directStory,true);
    assert.equal(storyAppV29.noDuplicateHome,true);

    // All preview assets must decode in Chromium, not just pass RIFF header checks.
    const imageV29=await page.evaluate(async()=>{
      const images=[
        ...DuduMultiverseArtV28.NPC.map(n=>'./'+n.portraitPath),
        ...DuduMultiverseArtV28.NPC.map(n=>'./'+n.avatarPath),
        ...DuduMultiverseArtV28.WORLDS.map(w=>'./'+w.image)
      ];
      return await Promise.all(images.map(src=>new Promise(resolve=>{
        const img=new Image();img.onload=()=>resolve({src,ok:img.naturalWidth>0&&img.naturalHeight>0});
        img.onerror=()=>resolve({src,ok:false});img.src=src;
      })));
    });
    assert.equal(imageV29.length,16);
    assert.deepEqual(imageV29.filter(x=>!x.ok),[]);

    // V27 R3: inventory instances are individually selectable square tiles,
    // no repetitive open/discard action bars. Vứt only in confirmed inspector.
    const grid375=await page.evaluate(()=>{
      const saved=JSON.stringify(userProfile),beforeWrites=window.__firestoreWrites.length;
      const beforeSelection=inventoryDetailSelection,beforeTab=inventoryTab;
      const priorSearch=document.getElementById('inventory-v2-search').value;
      const oldConfirm=window.confirm;
      try{
        inventoryTab='ALL';inventoryDetailSelection=null;
        document.getElementById('inventory-v2-search').value='';
        userProfile.inventory=[
          {...DuduItemCatalog.byId('f1')},
          {...DuduItemCatalog.byId('e3')},
          {...DuduItemCatalog.souvenirs[0]}
        ];
        openPhoneApp('inventory');
        const grid=document.getElementById('inventory-container');
        const tiles=[...grid.querySelectorAll('.dudu-v27-inventory-slot')];
        const computed=getComputedStyle(grid);
        const card=tiles[0]?.getBoundingClientRect();
        const actualColumns=computed.gridTemplateColumns.split(' ').length;
        const right=grid.getBoundingClientRect().right;
        const widthOK=tiles.every(tile=>tile.getBoundingClientRect().right<=right+1);
        const discardOnTiles=tiles.some(tile=>!!tile.querySelector('.btn-danger'));
        const tileIconCount=tiles.filter(tile=>!!tile.querySelector('img.dudu-item-v13-art')).length;
        const before=JSON.stringify(userProfile.inventory);
        tiles[0].click();
        const inspector=document.getElementById('inventory-v42-modal');
        const open=!inspector.hidden;
        const inspectDiscard=inspector.querySelector('.dudu-v42-discard');
        window.confirm=()=>false;
        inspectDiscard?.click();
        const canceled=JSON.stringify(userProfile.inventory)===before;
        inspector.querySelector('[aria-label="Đóng chi tiết vật phẩm"]')?.click();
        const protectedTile=[...grid.querySelectorAll('.dudu-v27-inventory-slot')]
          .find(tile=>tile.textContent.includes('🔒'));
        protectedTile?.click();
        const protectedNoDiscard=!inspector.querySelector('.dudu-v42-discard');
        const protectedTag=!!protectedTile;
        const count=tiles.length;
        return {count,actualColumns,widthOK,open,canceled,protectedNoDiscard,
          protectedTag,discardOnTiles,tileIconCount,
          approxSquare:card?.width>=55&&card?.height>=card.width,
          writes:window.__firestoreWrites.length-beforeWrites};
      }finally{
        window.confirm=oldConfirm;
        userProfile=JSON.parse(saved);
        inventoryTab=beforeTab;inventoryDetailSelection=beforeSelection;
        document.getElementById('inventory-v2-search').value=priorSearch;
        renderInventory();phoneHome();
      }
    });
    assert.equal(grid375.count,3);
    assert.equal(grid375.actualColumns,3);
    assert.equal(grid375.widthOK,true);
    assert.equal(grid375.open,true);
    assert.equal(grid375.canceled,true);
    assert.equal(grid375.protectedNoDiscard,true);
    assert.equal(grid375.protectedTag,true);
    assert.equal(grid375.discardOnTiles,false);
    assert.equal(grid375.tileIconCount,3);
    assert.equal(grid375.approxSquare,true);
    assert.equal(grid375.writes,0);
    await page.setViewportSize({width:320,height:640});
    const grid320=await page.evaluate(()=>{
      const saved=JSON.stringify(userProfile),selection=inventoryDetailSelection;
      const tab=inventoryTab,search=document.getElementById('inventory-v2-search');
      const searchBefore=search.value;
      try{
        userProfile.inventory=[
          {...DuduItemCatalog.byId('f1')},
          {...DuduItemCatalog.byId('e3')},
          {...DuduItemCatalog.souvenirs[0]}
        ];
        inventoryTab='ALL';inventoryDetailSelection=null;search.value='';
        if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
        openPhoneApp('inventory');
        const grid=document.getElementById('inventory-container');
        return {
          cols:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          overflow:document.getElementById('phone-app-inventory').scrollWidth-
            document.getElementById('phone-app-inventory').clientWidth,
          tiles:grid.querySelectorAll('.dudu-v27-inventory-slot').length
        };
      }finally{
        userProfile=JSON.parse(saved);
        inventoryTab=tab;inventoryDetailSelection=selection;search.value=searchBefore;
        renderInventory();phoneHome();
      }
    });
    assert.equal(grid320.cols,2);
    assert.equal(grid320.tiles,3);
    assert.ok(grid320.overflow<=1,'Inventory grid must not overflow 320px phone');

    await page.setViewportSize({width:320,height:640});
    const narrowDossier=await page.evaluate(()=>{
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      openPhoneApp('codex');
      const phone=document.getElementById('cyber-phone');
      const content=document.getElementById('phone-app-codex');
      return {
        phoneRight:phone.getBoundingClientRect().right,
        overflow:content.scrollWidth-content.clientWidth,
        width:innerWidth
      };
    });
    assert.ok(narrowDossier.phoneRight<=narrowDossier.width+1);
    assert.ok(narrowDossier.overflow<=1);
    await page.evaluate(()=>{togglePhone();phoneHome();});
    await page.setViewportSize({width:1280,height:800});

    // V16: player avatar and decorative frame are a local profile choice only.
    await page.setViewportSize({width:375,height:812});
    const playerV16=await page.evaluate(async()=>{
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      const original=JSON.stringify(userProfile);
      const writesBefore=window.__firestoreWrites.length;
      updatePhoneUI();
      const initialAvatar=playerAvatarCurrentV16();
      const initialFrame=document.getElementById('player-avatar-v1').dataset.frame;
      openPlayerAvatarEditorV16();
      const modal=document.getElementById('player-avatar-v16-modal');
      const frames=document.querySelectorAll('#player-avatar-v16-frames button');
      const frameCount=frames.length;
      const locked=[...frames].filter(x=>x.disabled).length;
      selectPlayerAvatarKindV16('anime');
      const animeCount=document.querySelectorAll('#player-avatar-v16-preset-grid button').length;
      document.querySelectorAll('#player-avatar-v16-preset-grid button')[2].click();
      document.querySelectorAll('#player-avatar-v16-frames button')[3].click();
      const pending={
        kind:playerAvatarDraftV16.kind,
        frameId:playerAvatarDraftV16.frameId,
        presetId:playerAvatarDraftV16.presetId,
        unchanged:JSON.stringify(userProfile)===original
      };
      closePlayerAvatarEditorV16();
      openPlayerAvatarEditorV16();
      const cancelled=playerAvatarDraftV16.kind===initialAvatar.kind&&
        playerAvatarDraftV16.frameId===initialAvatar.frameId;
      selectPlayerAvatarKindV16('vector');
      const vectorCount=document.querySelectorAll('#player-avatar-v16-preset-grid button').length;
      const vectorTotal=DuduNpcPortraitLibrary.CATALOG.filter(p=>/^portrait-[fm]-\d{2}$/.test(p.id)).length;
      const moreButton=document.getElementById('player-avatar-v41-more');
      const hasMore=!!moreButton&&!moreButton.hidden;
      moreButton?.click();
      const nextPageCount=document.querySelectorAll('#player-avatar-v16-preset-grid button').length;
      document.querySelectorAll('#player-avatar-v16-preset-grid button')[4].click();
      document.querySelectorAll('#player-avatar-v16-frames button')[1].click();
      savePlayerAvatarV16();
      const saved=JSON.parse(localStorage.getItem(scopedLocalKey('profile'))||'{}').playerAvatar;
      const rendered={
        profile:document.getElementById('player-avatar-v1').dataset.frame,
        header:document.getElementById('player-avatar-header-v16').dataset.frame,
        home:document.getElementById('phone-player-avatar-v16').dataset.frame
      };
      openPlayerAvatarEditorV16();
      selectPlayerAvatarKindV16('upload');
      const canvas=document.createElement('canvas');
      canvas.width=48;canvas.height=48;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#a487db';ctx.fillRect(0,0,48,48);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const file=new File([blob],'player.png',{type:'image/png'});
      await uploadPlayerAvatarV16({target:{files:[file],value:''}});
      const uploadedId=playerAvatarDraftV16.uploadId;
      const ownImg=await DuduNpcPortraitLibrary.readUpload(
        playerAvatarOwnerV16(),DuduPlayerAvatarV16.SCOPE,uploadedId);
      const otherImg=await DuduNpcPortraitLibrary.readUpload(
        'another-user',DuduPlayerAvatarV16.SCOPE,uploadedId);
      savePlayerAvatarV16();
      const uploadSaved=userProfile.playerAvatar?.uploadId===uploadedId;
      const profileBytes=JSON.stringify(userProfile);
      userProfile=JSON.parse(original);
      saveCurrentAccount();
      return {initialFrame,initialAvatar,frameCount,locked,animeCount,pending,
        cancelled,vectorCount,vectorTotal,hasMore,nextPageCount,saved,rendered,uploadedId,uploadSaved,
        ownImg:typeof ownImg==='string'&&ownImg.startsWith('data:image/jpeg;base64,'),
        otherImg,smallProfile:profileBytes.length<original.length+300,
        writes:window.__firestoreWrites.length-writesBefore,
        dialogHidden:modal.style.display==='none'};
    });
    assert.equal(playerV16.initialFrame,'none');
    assert.equal(playerV16.frameCount,9);
    assert.equal(playerV16.locked,3);
    assert.equal(playerV16.animeCount,4);
    assert.deepEqual(playerV16.pending,{
      kind:'anime',frameId:'sakura',presetId:'anime-peach-court',unchanged:true
    });
    assert.equal(playerV16.cancelled,true);
    assert.equal(playerV16.vectorTotal,72,'All V40 F01–F60 and M01–M12 IDs remain available');
    assert.equal(playerV16.vectorCount,12,'V41 initially renders only 12 portraits for mobile');
    assert.equal(playerV16.hasMore,true,'Avatar gallery has a Load more control');
    assert.equal(playerV16.nextPageCount,24,'Load more reveals the next 12 portraits');
    assert.equal(playerV16.saved.kind,'vector');
    assert.equal(playerV16.saved.frameId,'moon');
    assert.equal(playerV16.saved.presetId,'portrait-f-05');
    assert.deepEqual(playerV16.rendered,{profile:'moon',header:'moon',home:'moon'});
    assert.match(playerV16.uploadedId,/^own-/);
    assert.equal(playerV16.uploadSaved,true);
    assert.equal(playerV16.ownImg,true);
    assert.equal(playerV16.otherImg,null,'One Sandbox user cannot load another local image key');
    assert.equal(playerV16.smallProfile,true,'Photo data must not be embedded in profile');
    assert.equal(playerV16.writes,0,'V16 never writes Firestore');
    assert.equal(playerV16.dialogHidden,true);
    await page.evaluate(()=>openPlayerAvatarEditorV16());
    const avatarLayout=await page.evaluate(()=>{
      const rect=document.querySelector('.dudu-avatar-v16-window').getBoundingClientRect();
      return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
        width:innerWidth,height:innerHeight};
    });
    assert.ok(avatarLayout.left>=0&&avatarLayout.right<=avatarLayout.width+1);
    assert.ok(avatarLayout.top>=0&&avatarLayout.bottom<=avatarLayout.height+1);
    // V21: real clicks on offline-only comparison; no profile/server writes.
    const beforeV21=await page.evaluate(()=>({
      profile:JSON.stringify(userProfile),
      writes:window.__firestoreWrites.length
    }));
    await page.getByRole('button',{
      name:'Thử so sánh avatar thiết bị với avatar mẫu máy chủ'
    }).click();
    assert.equal(await page.locator('#player-avatar-sync-review-v21').evaluate(x=>x.hidden),false);
    assert.match(await page.locator('#player-avatar-sync-review-status-v21').textContent(),
      /Hai phiên bản khác nhau/);
    await page.getByRole('button',{name:'Mô phỏng giữ trên thiết bị'}).click();
    assert.match(await page.locator('#player-avatar-sync-outcome-v21').textContent(),
      /Chưa gửi, chưa lưu/);
    await page.getByRole('button',{name:'Thử tình huống bảo vệ ảnh cục bộ'}).click();
    assert.match(await page.locator('#player-avatar-sync-review-status-v21').textContent(),
      /Ảnh tự tải chỉ nằm trên thiết bị/);
    assert.equal(await page.locator('#player-avatar-sync-keep-v21').isDisabled(),true);
    assert.equal(await page.locator('#player-avatar-sync-use-v21').isDisabled(),true);
    const afterV21=await page.evaluate(()=>({
      profile:JSON.stringify(userProfile),writes:window.__firestoreWrites.length
    }));
    assert.deepEqual(afterV21,beforeV21,
      'Previewing remote conflicts must never alter profile or Firestore');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#player-avatar-v16-modal').getAttribute('aria-hidden'),'true');
    assert.equal(await page.locator('#cyber-phone').evaluate(x=>x.style.display),'flex',
      'Closing player avatar editor cannot close the phone behind it');
    await page.evaluate(()=>openPlayerAvatarEditorV16());
    assert.equal(await page.locator('#player-avatar-sync-review-v21').evaluate(x=>x.hidden),true,
      'Reopening editor must discard previous demo server snapshot');
    await page.setViewportSize({width:320,height:640});
    const v21Mobile=await page.evaluate(()=>{
      renderPlayerAvatarSyncReviewV21('compare');
      const w=document.querySelector('.dudu-avatar-v16-window').getBoundingClientRect();
      const section=document.getElementById('player-avatar-sync-review-v21');
      return {left:w.left,right:w.right,top:w.top,bottom:w.bottom,
        overflow:section.scrollWidth-section.clientWidth,
        deviceWidth:innerWidth,deviceHeight:innerHeight};
    });
    assert.ok(v21Mobile.left>=0&&v21Mobile.right<=v21Mobile.deviceWidth+1);
    assert.ok(v21Mobile.top>=0&&v21Mobile.bottom<=v21Mobile.deviceHeight+1);
    assert.ok(v21Mobile.overflow<=1,'V21 comparison must not overflow narrow phone');
    await page.evaluate(()=>{closePlayerAvatarEditorV16();togglePhone();phoneHome();});
    await page.setViewportSize({width:1280,height:800});

    // V22: second visit with explicit staging opt-in; fake JWT and backend.
    // NEVER contacts Firebase Auth, Worker, Firestore or R2 services.
    await page.goto('http://127.0.0.1:'+port+'/?sandbox=1&avatarSync=staging',
      {waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof handleAuthSubmit==='function');
    await page.waitForTimeout(750);
    await page.evaluate(()=>openAuthModal());
    await page.locator('#auth-username').fill('uid_a');
    await page.getByRole('button',{name:'Đổi tài khoản thử'}).click();
    const stagingInit=await page.evaluate(()=>{
      // Re-establish the observable mock on page reload; no production SDK writes.
      window.__firestoreWrites=window.__firestoreWrites||[];
      window.__v22State={revision:0,avatar:{kind:'anime',
        presetId:'anime-moon-violet',frameId:'violet'},calls:[],auth:'uid_a'};
      window.firebase.auth=()=>({currentUser:{
        uid:window.__v22State.auth,getIdToken:async()=> 'verified-'+window.__v22State.auth}});
      window.DuduPlayerAvatarSyncV17={createClient:({getIdToken})=>({
        read:async()=>{
          const token=await getIdToken();
          window.__v22State.calls.push({method:'GET',token});
          return {ok:true,revision:window.__v22State.revision,
            avatar:{...window.__v22State.avatar},
            availableFrames:['none','moon','violet','sakura','cyber','starlight'],
            lockedFrames:['legend','soulbond','author'],uploadsEnabled:false};
        },
        save:async(avatar,expectedRevision)=>{
          const token=await getIdToken();
          window.__v22State.calls.push({method:'POST',token,expectedRevision,avatar});
          if(expectedRevision!==window.__v22State.revision)
            return {ok:false,code:'revision-conflict',
              revision:window.__v22State.revision};
          window.__v22State.avatar={...avatar};
          window.__v22State.revision++;
          return {ok:true,revision:window.__v22State.revision};
        }
      })};
      const original=JSON.stringify(userProfile);
      openPlayerAvatarEditorV16();
      return {visible:!document.getElementById('player-avatar-v22-panel').hidden,
        original,profile:userProfile.playerAvatar,
        owner:currentUsername,uid:avatarV22Identity()?.uid,
        firestore:window.__firestoreWrites.length};
    });
    assert.equal(stagingInit.visible,true);
    assert.equal(stagingInit.owner,stagingInit.uid);
    assert.equal(stagingInit.owner,'uid_a');
    await page.getByRole('button',{name:'Đọc staging'}).click();
    assert.equal(await page.locator('#player-avatar-v22-review').evaluate(x=>x.hidden),false);
    assert.match(await page.locator('#player-avatar-v22-remote').textContent(),/revision 0/);
    assert.equal(await page.locator('#player-avatar-v22-server').isDisabled(),false);
    assert.equal(await page.locator('#player-avatar-v22-keep').isDisabled(),false);
    assert.equal(await page.evaluate(()=>JSON.stringify(userProfile)),stagingInit.original,
      'Reading staging must not apply profile automatically');
    await page.getByRole('button',{name:'Xác nhận dùng avatar máy chủ'}).click();
    assert.match(await page.locator('#player-avatar-v22-status').textContent(),/Đã lưu bản staging/);
    assert.equal(await page.evaluate(()=>userProfile.playerAvatar?.presetId),'anime-moon-violet');
    assert.equal(await page.evaluate(()=>window.__v22State.calls.length),1,
      'Applying server snapshot must not send POST');
    await page.evaluate(()=>{userProfile.playerAvatar={
      kind:'anime',presetId:'anime-moon-blue',frameId:'moon'};saveCurrentAccount();});
    await page.getByRole('button',{name:'Đọc staging'}).click();
    await page.getByRole('button',{name:'Xác nhận giữ avatar thiết bị'}).click();
    assert.equal(await page.evaluate(()=>window.__v22State.revision),1);
    assert.equal(await page.evaluate(()=>window.__v22State.avatar.presetId),'anime-moon-blue');
    // A changed server revision results in 409 and requires fresh user choice.
    await page.evaluate(()=>{userProfile.playerAvatar={
      kind:'anime',presetId:'anime-peach-court',frameId:'sakura'};saveCurrentAccount();});
    await page.getByRole('button',{name:'Đọc staging'}).click();
    await page.evaluate(()=>{window.__v22State.revision=7;});
    await page.getByRole('button',{name:'Xác nhận giữ avatar thiết bị'}).click();
    assert.match(await page.locator('#player-avatar-v22-status').textContent(),/409/);
    assert.equal(await page.evaluate(()=>window.__v22State.avatar.presetId),'anime-moon-blue');
    // Browser-local photos must remain protected and never be POSTed.
    const photoV22=await page.evaluate(async()=>{
      userProfile.playerAvatar={kind:'upload',uploadId:'own-photo-example',
        presetId:'',frameId:'moon'};
      saveCurrentAccount();
      await avatarV22Inspect();
      return {
        status:document.getElementById('player-avatar-v22-status').textContent,
        keepDisabled:document.getElementById('player-avatar-v22-keep').disabled,
        serverDisabled:document.getElementById('player-avatar-v22-server').disabled,
        posts:window.__v22State.calls.filter(c=>c.method==='POST').length
      };
    });
    assert.match(photoV22.status,/Ảnh tự tải/);
    assert.equal(photoV22.keepDisabled,true);
    assert.equal(photoV22.serverDisabled,true);
    assert.equal(photoV22.posts,2);
    // UID mismatch refuses reading before any token/API operation.
    const foreignV22=await page.evaluate(async()=>{
      window.__v22State.auth='someone_else';
      const before=window.__v22State.calls.length;
      await avatarV22Inspect();
      return {changedCalls:window.__v22State.calls.length-before,
        status:document.getElementById('player-avatar-v22-status').textContent,
        photo:userProfile.playerAvatar.uploadId,
        writes:window.__firestoreWrites.length};
    });
    assert.equal(foreignV22.changedCalls,0);
    assert.match(foreignV22.status,/UID/);
    assert.equal(foreignV22.photo,'own-photo-example');
    assert.equal(foreignV22.writes,0);
    await page.evaluate(()=>closePlayerAvatarEditorV16());

    // V23 local avatar deletion: confirmation, safe fallback and UID isolation.
    const deletedV23=await page.evaluate(async()=>{
      const saved=JSON.stringify(userProfile);
      const owner=currentUsername;
      const id=DuduNpcPortraitLibrary.makeId();
      const canvas=document.createElement('canvas');
      canvas.width=48;canvas.height=48;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#9b8acc';ctx.fillRect(0,0,48,48);
      const picture=canvas.toDataURL('image/jpeg',.75);
      const scope=DuduPlayerAvatarV16.SCOPE;
      const made=await DuduNpcPortraitLibrary.saveUpload(owner,scope,id,picture);
      const other=await DuduNpcPortraitLibrary.saveUpload('second-user',scope,id,picture);
      userProfile.playerAvatar={kind:'upload',uploadId:id,presetId:'',frameId:'moon'};
      saveCurrentAccount();
      openPlayerAvatarEditorV16();
      const button=document.getElementById('player-avatar-v23-delete-local');
      const visible=button.style.display==='inline-flex';
      const originalConfirm=window.confirm;
      window.confirm=()=>false;
      const canceled=await deletePlayerAvatarLocalV23();
      const imageBefore=await DuduNpcPortraitLibrary.readUpload(owner,scope,id);
      window.confirm=()=>true;
      const deleted=await deletePlayerAvatarLocalV23();
      window.confirm=originalConfirm;
      const imageAfter=await DuduNpcPortraitLibrary.readUpload(owner,scope,id);
      const imageOther=await DuduNpcPortraitLibrary.readUpload('second-user',scope,id);
      const restored=userProfile.playerAvatar?.kind==='initials';
      closePlayerAvatarEditorV16();
      userProfile=JSON.parse(saved);saveCurrentAccount();
      await DuduNpcPortraitLibrary.deleteUpload('second-user',scope,id);
      return {made,other,visible,canceled,deleted,imageBefore:!!imageBefore,
        imageAfter,otherSafe:!!imageOther,restored,
        firestoreWrites:window.__firestoreWrites.length};
    });
    assert.equal(deletedV23.made,true);
    assert.equal(deletedV23.other,true);
    assert.equal(deletedV23.visible,true);
    assert.equal(deletedV23.canceled,false);
    assert.equal(deletedV23.imageBefore,true);
    assert.equal(deletedV23.deleted,true);
    assert.equal(deletedV23.imageAfter,null);
    assert.equal(deletedV23.otherSafe,true,
      'Deleting avatar must not touch other local user namespace');
    assert.equal(deletedV23.restored,true);
    assert.equal(deletedV23.firestoreWrites,0);

    // V30 A+B: real phone-space constraints, dock wiring and visible wallpaper.
    for(const width of [320,375,390]){
      await page.setViewportSize({width,height:640});
      const v30=await page.evaluate(()=>{
        if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
        phoneHome();
        const app=document.getElementById('phone-home-screen');
        const screen=document.querySelector('#cyber-phone .phone-screen');
        const dock=document.querySelector('#cyber-phone .dudu-v30-dock');
        const buttons=[...app.querySelectorAll('.app-icon')];
        const visibleAppIds=buttons.map(x=>x.getAttribute('onclick'));
        const avatar=document.getElementById('player-avatar-home-v16');
        const mini=document.getElementById('dudu-v30-account-meta');
        const owner=phoneWallpaperOwnerV27();
        const key=DuduPhoneWallpaperV27.keyFor(owner);
        const keyMode=DuduMultiverseArtV28.keyFor(owner);
        const old=localStorage.getItem(key),oldMode=localStorage.getItem(keyMode);
        try{
          setPhoneWallpaperV27('world-xianxia');
          const first=getComputedStyle(screen).backgroundImage;
          const firstWall=getComputedStyle(app).backgroundImage;
          setPhoneWallpaperV27('world-gothic');
          const second=getComputedStyle(screen).backgroundImage;
          const r=app.getBoundingClientRect(),d=dock.getBoundingClientRect();
          return {
            apps:buttons.length,visibleAppIds,
            dockCount:dock.querySelectorAll('.app-icon').length,
            profileHeight:avatar.getBoundingClientRect().height,
            profileVisible:getComputedStyle(avatar).display!=='none',
            miniText:mini.textContent,
            oldDashboard:getComputedStyle(app.querySelector('.phone-widgets')).clipPath,
            backgroundFirst:first.includes('sakura-lane.svg'),
            backgroundSecond:second.includes('aurora-night.svg'),
            changed:first!==second,
            homeClear:firstWall==='none',
            dockWithinHome:d.bottom<=r.bottom+3,
            horizontalOverflow:app.scrollWidth>app.clientWidth+2,
            mediaWidth:window.innerWidth
          };
        }finally{
          if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);
          if(oldMode===null)localStorage.removeItem(keyMode);else localStorage.setItem(keyMode,oldMode);
          renderPhoneWallpaperV27();
        }
      });
      assert.equal(v30.apps,8,'Home includes all 8 app shortcuts');
      assert.equal(v30.dockCount,4,'Dock has only four primary apps');
      assert.equal(v30.visibleAppIds.some(s=>s.includes("openPhoneApp('profile')")),false);
      assert.equal(v30.visibleAppIds.some(s=>s.includes("openPhoneApp('codex')")),true);
      assert.equal(v30.profileVisible,true);
      assert.ok(v30.profileHeight<80,'Avatar pill must be compact');
      assert.match(v30.miniText,/Lv\.\d+.*Xu/);
      assert.equal(v30.oldDashboard,'inset(50%)');
      assert.equal(v30.backgroundFirst,true,'V34 Xianxia fallback art visible as screen background');
      assert.equal(v30.backgroundSecond,true,'V34 Gothic fallback art visible as screen background');
      assert.equal(v30.changed,true,'Wallpaper choice visibly changes screen');
      assert.equal(v30.homeClear,true,'Home must not paint a second opaque layer');
      assert.equal(v30.dockWithinHome,true,'Dock fits inside Cyber Phone');
      assert.equal(v30.horizontalOverflow,false,'No home horizontal overflow');
    }
    await page.setViewportSize({width:1280,height:720});

    // V31: account-only phone fonts, live font/size switching and safe NPC
    // progress moved out of the chat screen. No cloud writes.
    const v31=await page.evaluate(()=>{
      const beforeWrites=window.__firestoreWrites.length;
      const owner=phoneWallpaperOwnerV27();
      const key=DuduPhoneTypographyV31.keyFor(owner);
      const old=localStorage.getItem(key);
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      try{
        openPhoneApp('settings');
        setPhoneFontV31('serif');setPhoneSizeV31('large');
        const phone=document.getElementById('cyber-phone');
        const serif=phone.style.getPropertyValue('--dudu-v31-font').includes('Noto Serif');
        const serifSize=phone.dataset.duduV31Size==='large';
        const serifSelected=document.querySelector('[data-dudu-v31-font="serif"]').getAttribute('aria-pressed');
        setPhoneFontV31('nunito');setPhoneSizeV31('normal');
        const nunito=phone.style.getPropertyValue('--dudu-v31-font').includes('Nunito');
        const otherOwner='v31-second-account';
        const other=DuduPhoneTypographyV31.read(localStorage,otherOwner);
        openPhoneApp('codex');
        const relationHost=document.getElementById('npc-v31-relation-host');
        const relationMoved=relationHost.contains(document.getElementById('npc-relationship-r3-preview'));
        const choiceMoved=relationHost.contains(document.getElementById('npc-daily-choice-card'));
        const checkins=document.querySelectorAll('#phone-app-codex .dudu-v31-progress-checkin').length;
        openPhoneApp('chat');
        const chatHeader=document.querySelector('#phone-app-chat .phone-app-header').textContent;
        const relationshipHidden=getComputedStyle(document.getElementById('npc-relationship-r3-preview')).display==='none' ||
          !document.getElementById('phone-app-chat').contains(document.getElementById('npc-relationship-r3-preview'));
        const chatStyles=getComputedStyle(document.getElementById('phone-app-chat'));
        const chatBackground=chatStyles.backgroundImage.includes('linear-gradient');
        const messages=getComputedStyle(document.getElementById('chat-messages-container'));
        return {serif,serifSize,serifSelected,nunito,other,relationMoved,choiceMoved,
          checkins,chatHeader,relationshipHidden,chatBackground,chatBoxTransparent:
          !messages.backgroundColor.includes('rgb(16, 29, 53)'),
          writes:window.__firestoreWrites.length-beforeWrites};
      } finally {
        if(old===null)localStorage.removeItem(key);else localStorage.setItem(key,old);
        renderPhoneTypographyV31();phoneHome();
      }
    });
    assert.equal(v31.serif,true);
    assert.equal(v31.serifSize,true);
    assert.equal(v31.serifSelected,'true');
    assert.equal(v31.nunito,true);
    assert.deepEqual(v31.other,{font:'be',size:'normal'});
    assert.equal(v31.relationMoved,true);
    assert.equal(v31.choiceMoved,true);
    assert.match(v31.chatHeader,/Liên Lạc/);
    assert.doesNotMatch(v31.chatHeader,/Tặng quà/);
    assert.equal(v31.relationshipHidden,true);
    assert.equal(v31.chatBackground,true);
    assert.equal(v31.chatBoxTransparent,true);
    assert.equal(v31.writes,0);

    // V32: unlocked NPC virtual red packets, single debit, no affinity rewards,
    // account-local storage; chat gift control present and modal keyboard-safe.
    const socialV32=await page.evaluate(()=>{
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      openPhoneApp('chat');
      const story=novels.find(n=>n.id===activeChatNovelId)||novels[selectedNovelIndex];
      const candidate=(story?.characters||[]).find(c=>!c.archived);
      if(!candidate)return {error:'missing NPC fixture'};
      const selected=document.getElementById('chat-character-selector');
      const progress=getStoryProgress(story.id);
      const oldProgress=structuredClone(progress);
      const beforeProfile=structuredClone(userProfile);
      const beforeAccount=currentUsername;
      const ledgerKey=scopedLocalKey('profile');
      const prevStored=localStorage.getItem(ledgerKey);
      const startWrites=window.__firestoreWrites.length;
      try{
        activeChatNovelId=story.id;
        currentUsername='v32-local-test';
        userProfile.currency=101;
        progress.collectedCharacters[candidate.id]=progress.collectedCharacters[candidate.id]||{id:candidate.id,affinity:21};
        renderChatDropdown();selected.value=candidate.id;switchChatCharacter();
        const giftBtn=document.getElementById('dudu-v32-gift-button');
        const packetBtn=document.getElementById('dudu-v32-envelope-button');
        const bothActive=!giftBtn.disabled&&!packetBtn.disabled;
        openRedPacketV32();
        const modal=document.getElementById('dudu-v32-envelope-overlay');
        const modalOpen=modal.style.display==='flex'&&modal.getAttribute('aria-hidden')==='false';
        const disabledHigh=[520,1314].every(v=>document.querySelector('[data-dudu-v32-amount="'+v+'"]').disabled);
        pickRedPacketV32(50);
        const beforeBalance=userProfile.currency;
        const beforeAffinity=progress.collectedCharacters[candidate.id].affinity;
        confirmRedPacketV32();
        const afterBalance=userProfile.currency;
        const afterAffinity=progress.collectedCharacters[candidate.id].affinity;
        const record=progress.redPacketsV32?.[candidate.id];
        const packetShown=!!document.querySelector('#chat-messages-container .dudu-v32-red-packet-card');
        const closed=modal.getAttribute('aria-hidden')==='true';
        confirmRedPacketV32();
        const doubleSafe=userProfile.currency===afterBalance&&record?.events.length===1;
        openRedPacketV32();
        const blocked=document.getElementById('dudu-v32-envelope-confirm').disabled;
        closeRedPacketV32();
        return {bothActive,modalOpen,disabledHigh,beforeBalance,afterBalance,
          beforeAffinity,afterAffinity,packetShown,closed,doubleSafe,
          cooldownBlocked:blocked,events:record?.events.length||0,
          firestoreWrites:window.__firestoreWrites.length-startWrites};
      }finally{
        userProfile=beforeProfile;currentUsername=beforeAccount;
        if(prevStored===null)localStorage.removeItem(ledgerKey);else localStorage.setItem(ledgerKey,prevStored);
        phoneHome();
      }
    });
    assert.equal(socialV32.bothActive,true);
    assert.equal(socialV32.modalOpen,true);
    assert.equal(socialV32.disabledHigh,true);
    assert.equal(socialV32.beforeBalance,101);
    assert.equal(socialV32.afterBalance,51);
    assert.equal(socialV32.beforeAffinity,socialV32.afterAffinity);
    assert.equal(socialV32.packetShown,true);
    assert.equal(socialV32.closed,true);
    assert.equal(socialV32.doubleSafe,true);
    assert.equal(socialV32.cooldownBlocked,true);
    assert.equal(socialV32.events,1);
    assert.equal(socialV32.firestoreWrites,0);

    // Mobile action sheet: controls stay within screen and remain tappable.
    for(const width of [320,375,390]){
      await page.setViewportSize({width,height:680});
      const sheetV32=await page.evaluate(()=>{
        if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
        openPhoneApp('chat');
        const story=novels.find(n=>n.id===activeChatNovelId)||novels[selectedNovelIndex];
        const npc=(story?.characters||[]).find(x=>!x.archived);
        if(!npc)return {missingFixture:true};
        const p=getStoryProgress(story.id);
        const prev=p.collectedCharacters[npc.id];
        const user=currentUsername;
        try{
          activeChatNovelId=story.id;
          currentUsername=user||'v32-mobile-fixture';
          p.collectedCharacters[npc.id]=prev||{id:npc.id,affinity:15};
          renderChatDropdown();
          document.getElementById('chat-character-selector').value=npc.id;
          switchChatCharacter();
          openRedPacketV32();
          const modal=document.getElementById('dudu-v32-envelope-sheet')||
            document.querySelector('.dudu-v32-envelope-sheet');
          const rect=modal.getBoundingClientRect();
          const scr=document.querySelector('#cyber-phone .phone-screen').getBoundingClientRect();
          const root=document.getElementById('dudu-v32-envelope-overlay');
          const minTop=rect.top>=scr.top-1;
          const fits=rect.right<=innerWidth+1&&rect.left>=-1&&rect.bottom<=innerHeight+1;
          const display=getComputedStyle(root).display;
          return {minTop,fits,display,buttons:modal.querySelectorAll('[data-dudu-v32-amount]').length,
            label:document.getElementById('dudu-v32-envelope-recipient').textContent};
        }finally{
          closeRedPacketV32();
          if(prev===undefined)delete p.collectedCharacters[npc.id];else p.collectedCharacters[npc.id]=prev;
          currentUsername=user;phoneHome();
        }
      });
      assert.equal(sheetV32.minTop,true,'sheet top stays within phone');
      assert.equal(sheetV32.fits,true,'red packet sheet fits '+width+'px screen');
      assert.equal(sheetV32.display,'flex');
      assert.equal(sheetV32.buttons,5);
    }
    await page.setViewportSize({width:1280,height:720});

    // V43.3: Sandbox-only unlock uses earned NPC-scoped fragments, key and Xu.
    const v43Soul=await page.evaluate(()=>{
      const story=novels[selectedNovelIndex];
      const oldChars=story.characters,oldChapters=story.chapters;
      const oldProfile=JSON.stringify(userProfile),oldIndex=selectedChapterIndex;
      const oldChat=activeChatNovelId;
      const writes=window.__firestoreWrites.length;
      const npc={id:'v43-soul-fixture',name:'Nhân vật V43 kiểm thử',role:'Cố nhân'};
      const a={id:'v43-fragment-a',title:'Chương mảnh A',characterIds:[npc.id],content:'Thử nghiệm'};
      const b={id:'v43-fragment-b',title:'Chương mảnh B',characterIds:[npc.id],content:'Thử nghiệm'};
      try{
        story.characters=[...oldChars,npc];story.chapters=[...oldChapters,a,b];
        selectedChapterIndex=story.chapters.length-2;
        const startCount=DuduSoulLinkV43.count(userProfile.soulLinkV43,story.id,npc.id);
        renderReaderChapterNpcs(a,story);
        const beforeCard=document.querySelector('#reader-soul-npc-list .dudu-v43-soul-chapter-hint')?.textContent||'';
        const tooEarly=DuduSoulLinkUIV43.link(story.id,npc.id);
        const first=DuduSoulLinkUIV43.recordChapter(story,a,Date.parse('2026-10-16T12:00:00Z'));
        const repeated=DuduSoulLinkUIV43.recordChapter(story,a,Date.parse('2026-10-16T12:00:00Z'));
        const second=DuduSoulLinkUIV43.recordChapter(story,b,Date.parse('2026-10-17T12:00:00Z'));
        const third=DuduSoulLinkUIV43.recordChapter(story,a,Date.parse('2026-10-18T12:00:00Z'));
        const ready=DuduSoulLinkV43.count(userProfile.soulLinkV43,story.id,npc.id);
        const firstQuest=DuduSoulLinkUIV43.claimQuest();
        const questAgain=DuduSoulLinkUIV43.claimQuest();
        const coinsBefore=userProfile.currency;
        userProfile.currency=100;
        const linked=DuduSoulLinkUIV43.link(story.id,npc.id);
        const coinsAfter=userProfile.currency;
        const linkedNpc=getStoryProgress(story.id).collectedCharacters[npc.id];
        const duplicate=DuduSoulLinkUIV43.link(story.id,npc.id);
        const duplicateCoins=userProfile.currency;
        renderReaderChapterNpcs(a,story);
        const chatButton=[...document.querySelectorAll('#reader-soul-npc-list button')].some(x=>x.textContent.includes('Trò Chuyện'));
        openPhoneApp('codex');
        const hasLedger=!!document.getElementById('dudu-v43-soul-summary');
        return {startCount,beforeCard,tooEarly,first,repeated,second,third,ready,
          firstQuest,questAgain,coinsBefore,linked,coinsAfter,linkedNpc,
          duplicate,duplicateCoins,chatButton,hasLedger,
          noWrites:window.__firestoreWrites.length===writes};
      }finally{
        story.characters=oldChars;story.chapters=oldChapters;
        userProfile=JSON.parse(oldProfile);selectedChapterIndex=oldIndex;
        activeChatNovelId=oldChat;
        saveCurrentAccount();
        phoneHome();
      }
    });
    assert.equal(v43Soul.startCount,0);
    assert.match(v43Soul.beforeCard,/0\/3 mảnh/);
    assert.equal(v43Soul.tooEarly,false);
    assert.deepEqual([v43Soul.first,v43Soul.repeated,v43Soul.second,v43Soul.third],[1,0,1,1]);
    assert.equal(v43Soul.ready,3);
    assert.equal(v43Soul.firstQuest,true);
    assert.equal(v43Soul.questAgain,false);
    assert.equal(v43Soul.linked,true);
    assert.equal(v43Soul.coinsAfter,80);
    assert.equal(v43Soul.linkedNpc?.linkedVia,'sandbox-soul-v43');
    assert.equal(v43Soul.duplicate,false);
    assert.equal(v43Soul.duplicateCoins,80);
    assert.equal(v43Soul.chatButton,true);
    assert.equal(v43Soul.hasLedger,true);
    assert.equal(v43Soul.noWrites,true,'V43.3 Sandbox must never write production Firestore');

    // V43 lifecycle: renamed NPCs stay connected by ID; reader hide is personal.
    const npcLifecycle=await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex];
      const originalCharacters=novel.characters,oldChatNovel=activeChatNovelId;
      const accountBackup=JSON.stringify(userProfile);
      const npc={id:'v43-reader-privacy',name:'Tên thử nghiệm cũ',role:'Cố nhân',note:'Ít nói',
        portraitPresetId:'portrait-f-01'};
      const key=DuduNpcLifecycleV43.hiddenKey(currentUsername,novel.id,IS_SANDBOX_MODE);
      const savedHidden=localStorage.getItem(key);
      const beforeWrites=window.__firestoreWrites.length;
      const out={};
      try {
        novel.characters=[...originalCharacters,npc];
        const profile=getStoryProgress(novel.id);
        profile.collectedCharacters[npc.id]={
          id:npc.id,name:npc.name,affinity:79,relationshipV2:{trust:38},
          novelTitle:novel.title,linkedVia:'sandbox-soul-v43'
        };
        activeChatNovelId=novel.id;
        if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
        openPhoneApp('chat');
        const tab=which=>document.querySelector('.dudu-v33-tabs button[data-tab="'+which+'"]')?.click();
        const thread=()=>[...document.querySelectorAll('#dudu-v33-inbox-list .dudu-v33-thread')]
          .find(b=>b.querySelector('strong')?.textContent===npc.name);
        tab('all');
        out.initial=!!thread();
        const row=thread()?.closest('.dudu-v43-contact-row');
        row?.querySelector('.dudu-v43-contact-toggle')?.click();
        out.hiddenInAll=!thread();
        tab('hidden');
        out.inHidden=!!thread();
        out.unchangedData=profile.collectedCharacters[npc.id].affinity===79 &&
          profile.collectedCharacters[npc.id].relationshipV2.trust===38;
        thread()?.closest('.dudu-v43-contact-row')?.querySelector('.dudu-v43-contact-toggle')?.click();
        tab('all');
        out.restored=!!thread();
        npc.name='Tên tác giả đã sửa';npc.role='Bạn đồng hành';
        npc.note='Dịu dàng';npc.portraitPresetId='portrait-f-22';
        const canonical=getStoryProgress(novel.id).collectedCharacters[npc.id];
        out.newName=canonical.name;
        out.newPortrait=canonical.portraitPresetId;
        out.trust=canonical.relationshipV2.trust;
        out.affinity=canonical.affinity;
        renderChatDropdown();
        window.duduV33Render?.();
        out.updatedInContacts=!!thread();
        DuduNpcEditor.archive(novel,npc.id);
        renderChatDropdown();window.duduV33Render?.();
        out.archivedNotInAll=!thread();
        tab('hidden');
        const archived=thread();
        out.archiveReadable=!!archived&&archived.textContent.includes('Tác giả đã lưu trữ');
        out.archiveHistoryPreserved=!!profile.collectedCharacters[npc.id]&&
          isNpcUnlocked(novel.id,npc.id);
        DuduNpcEditor.restore(novel,npc.id);
        renderChatDropdown();window.duduV33Render?.();
        tab('all');
        out.authorRestored=!!thread();
        out.noWrites=window.__firestoreWrites.length===beforeWrites;
        return out;
      }finally{
        novel.characters=originalCharacters;
        activeChatNovelId=oldChatNovel;
        userProfile=JSON.parse(accountBackup);
        if(savedHidden===null)localStorage.removeItem(key);
        else localStorage.setItem(key,savedHidden);
        saveCurrentAccount();
        phoneHome();
      }
    });
    assert.deepEqual(npcLifecycle,{
      initial:true,hiddenInAll:true,inHidden:true,unchangedData:true,
      restored:true,newName:'Tên tác giả đã sửa',newPortrait:'portrait-f-22',
      trust:38,affinity:79,updatedInContacts:true,archivedNotInAll:true,
      archiveReadable:true,archiveHistoryPreserved:true,authorRestored:true,noWrites:true
    },'Rename, author archive and personal hide must never erase progress or write Firestore');
    // V43.4: a chosen favorite gets independent, bounded interaction streaks.
    // A max-Trust NPC remains available for deliberate daily check-ins.
    const npcBondV43=await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex],oldCharacters=novel.characters;
      const before=JSON.stringify(userProfile),previousChat=activeChatNovelId;
      const writes=window.__firestoreWrites.length;
      const npc={id:'v43-bond-fixture',name:'Bạn gắn kết V43',role:'Cố nhân'};
      const other={id:'v43-bond-other',name:'Bạn khác',role:'Cố nhân'};
      try{
        novel.characters=[...oldCharacters,npc,other];
        const p=getStoryProgress(novel.id);
        p.collectedCharacters[npc.id]={id:npc.id,affinity:84,
          relationshipV2:{trust:100,lastCheckinUtc:''}};
        p.collectedCharacters[other.id]={id:other.id,affinity:30,
          relationshipV2:{trust:20}};
        if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
        openPhoneApp('codex');
        const overview=document.getElementById('dudu-v43-bond-overview');
        const visibleMilestones=overview?.querySelectorAll('.dudu-v43-bond-milestone').length===4 &&
          [...overview.querySelectorAll('.dudu-v43-bond-milestone')].map(n=>n.textContent).join(' ').includes('30 ngày');
        const soul=document.getElementById('dudu-v43-soul-summary');
        const compactSoul=soul?.tagName==='DETAILS'&&!soul.open;
        const overviewFirst=document.querySelector('#codex-container')?.firstElementChild===overview;
        const chosen=v43ChooseFavoriteNpc(novel.id,npc.id);
        const favorite=p.favoriteNpcV43;
        const pressed=[...document.querySelectorAll('#codex-container .dudu-v43-bond-favorite')]
         .some(b=>b.textContent.includes('♥')&&b.getAttribute('aria-pressed')==='true');
        npcCheckInFromCodexV31(novel.id,npc.id);
        const noStaleGlobal=document.getElementById('npc-relationship-r3-preview')?.style.display==='none';
        const choiceVisible=document.getElementById('npc-daily-choice-card').style.display==='block';
        npcSubmitDailyChoice('thoughtful');
        const v=p.collectedCharacters[npc.id];
        const streak=v.npcBondV43;
        const label=[...document.querySelectorAll('#codex-container .dudu-v43-bond-row')]
          .some(row=>row.textContent.includes('1 ngày gắn kết'));
        npcCheckInFromCodexV31(novel.id,npc.id);
        npcSubmitDailyChoice('casual');
        const duplicate=(v.npcBondV43.current===1&&v.npcBondV43.totalDays===1);
        const giftSameDay=v43RecordNpcBond(novel.id,npc.id,'gift')===null;
        const chatSameDay=v43RecordNpcBond(novel.id,npc.id,'conversation')===null;
        const otherNotTouched=!p.collectedCharacters[other.id].npcBondV43;
        const selectOther=v43ChooseFavoriteNpc(novel.id,other.id);
        const favoriteAfter=p.favoriteNpcV43;
        const oldStreakStillThere=v.npcBondV43.current===1;
        const removed=v43ChooseFavoriteNpc(novel.id,other.id);
        const unset=p.favoriteNpcV43==='';
        const accountIsolated=DuduNpcBondV43.norm({}).totalDays===0;
        return {visibleMilestones,compactSoul,overviewFirst,noStaleGlobal,
         chosen,favorite,pressed,choiceVisible,label,
         current:streak.current,total:streak.totalDays,trust:v.relationshipV2.trust,
         duplicate,giftSameDay,chatSameDay,otherNotTouched,
         selectOther,favoriteAfter,oldStreakStillThere,removed,unset,
         accountIsolated,noWrites:window.__firestoreWrites.length===writes};
      }finally{
        novel.characters=oldCharacters;userProfile=JSON.parse(before);
        activeChatNovelId=previousChat;
        saveCurrentAccount();phoneHome();
      }
    });
    assert.deepEqual(npcBondV43,{
      visibleMilestones:true,compactSoul:true,overviewFirst:true,noStaleGlobal:true,
      chosen:true,favorite:'v43-bond-fixture',pressed:true,choiceVisible:true,
      label:true,current:1,total:1,trust:100,duplicate:true,
      giftSameDay:true,chatSameDay:true,otherNotTouched:true,
      selectOther:true,favoriteAfter:'v43-bond-other',
      oldStreakStillThere:true,removed:true,unset:true,
      accountIsolated:true,noWrites:true
    },'V43.4 must preserve Trust, daily idempotence, favorites and account isolation');

    // V43.5 shop/quests bridge: real Sandbox UI, canonical IDs and guarded economy.
    const economyV43=await page.evaluate(()=>{
      const previous=JSON.stringify(userProfile),previousTab=questTab;
      const phone=document.getElementById('cyber-phone');
      const wasOpen=phone.style.display==='flex';
      const writes=window.__firestoreWrites.length;
      try{
        userProfile.currency=140;
        userProfile.economyV43=undefined;
        userProfile.questsDayV43=DuduEconomyCoreV43.localDay();
        userProfile.quests=structuredClone(userProfile.quests||[]);
        if(!wasOpen)togglePhone();
        openPhoneApp('shop');
        const marketFullWidth=getComputedStyle(
          document.getElementById('shop-items-container')).display==='block';
        const itemCards=()=>[...document.querySelectorAll('#shop-items-container [data-item-id]')];
        const common=itemCards().length;
        const hasLegacySss=itemCards().some(card=>
          card.dataset.itemId==='shop-sss'||card.dataset.itemId==='sss1');
        const tabs=[...document.querySelectorAll('#shop-items-container .dudu-v43-market-tab')];
        const clickTab=text=>tabs.find(b=>b.textContent===text)?.click();
        clickTab('Vị diện');
        const realmSelect=document.querySelector('#shop-items-container .dudu-v43-market-realm');
        realmSelect.value='CULTIVATION';
        realmSelect.dispatchEvent(new Event('change',{bubbles:true}));
        const realmCount=itemCards().length;
        const realmSafe=itemCards().every(card=>card.dataset.scope==='REALM');
        const noRealmPurchases=document.querySelectorAll(
          '#shop-items-container [data-scope="REALM"] button').length===0;
        const newTabs=[...document.querySelectorAll('#shop-items-container .dudu-v43-market-tab')];
        newTabs.find(b=>b.textContent==='Kỷ vật').click();
        const duduCount=itemCards().length;
        const noDuduPurchases=document.querySelectorAll(
          '#shop-items-container [data-scope="DUDU"] button').length===0;
        [...document.querySelectorAll('#shop-items-container .dudu-v43-market-tab')]
          .find(b=>b.textContent==='Mua sắm').click();
        const expBefore=userProfile.exp,levelBefore=userProfile.level;
        const success=buyShopItem('common-biscuit');
        const moneyAfter=userProfile.currency;
        const owned=userProfile.inventory[0];
        const buyAgain=buyShopItem('common-biscuit');
        const buyThird=buyShopItem('common-biscuit');
        const countBeforeBlocked=userProfile.inventory.length;
        const blocked=buyShopItem('common-biscuit');
        const noDuplicate=userProfile.inventory.length===countBeforeBlocked;
        const blockedSss=buyShopItem('shop-sss');
        const xpUnchanged=userProfile.exp===expBefore&&userProfile.level===levelBefore;
        const dailyCount=userProfile.economyV43.total;
        // Existing quest progress survives the first migration, resets once
        // on a new day, and cannot be exploited with the old manual reset.
        userProfile.questsDayV43='2026-10-15';
        let q=userProfile.quests.find(x=>x.id==='q_daily_loot');
        q.current=q.target;q.claimed=true;
        openPhoneApp('quests');
        q=userProfile.quests.find(x=>x.id==='q_daily_loot');
        const rolled=q.current===0&&q.claimed===false;
        const resetControl=document.querySelector(
          '#phone-app-quests .dudu-v27-quest-tools button');
        const resetDisabled=!!resetControl?.disabled &&
          resetControl.textContent.includes('Tự làm mới');
        const questStatus=!!document.querySelector(
          '#quests-container .dudu-v43-quest-status');
        const firstEvent=DuduEconomyRuntimeV43.questEvent('LOOT_SUCCESS','fixture-drop-v43');
        const firstProgress=q.current;
        const secondEvent=DuduEconomyRuntimeV43.questEvent('LOOT_SUCCESS','fixture-drop-v43');
        const afterDuplicate=q.current;
        refreshDailyQuests();
        const afterReset=q.current;
        return {common,marketFullWidth,hasLegacySss,realmCount,realmSafe,noRealmPurchases,
          duduCount,noDuduPurchases,success,moneyAfter,
          ownedId:owned.id,ownedOrigin:owned.obtainedFrom.kind,
          buyAgain,buyThird,blocked,noDuplicate,blockedSss,xpUnchanged,
          dailyCount,rolled,resetDisabled,questStatus,firstEvent,secondEvent,firstProgress,
          afterDuplicate,afterReset,noWrites:window.__firestoreWrites.length===writes};
      }finally{
        userProfile=JSON.parse(previous);
        questTab=previousTab;
        saveCurrentAccount();
        phoneHome();
        if(!wasOpen&&phone.style.display==='flex')togglePhone();
      }
    });
    assert.deepEqual(economyV43,{
      common:12,marketFullWidth:true,hasLegacySss:false,realmCount:5,realmSafe:true,
      noRealmPurchases:true,duduCount:15,noDuduPurchases:true,
      success:true,moneyAfter:132,ownedId:'common-biscuit',ownedOrigin:'SHOP',
      buyAgain:true,buyThird:true,blocked:false,noDuplicate:true,
      blockedSss:false,xpUnchanged:true,dailyCount:3,
      rolled:true,resetDisabled:true,questStatus:true,
      firstEvent:true,secondEvent:false,firstProgress:1,
      afterDuplicate:1,afterReset:1,noWrites:true
    },'DUDU V43.5 Sandbox shop uses canonical catalog and idempotent daily quests');

    // V43.5.2: catalog of author-created items is read-only, spoiler-gated,
    // scoped by story and never alters another player's inventory or server.
    const shopStoryV4352=await page.evaluate(()=>{
      const novel=novels[selectedNovelIndex];
      const priorChapters=novel.chapters,priorItems=novel.specialItems;
      const priorReads=userProfile.readRewards;
      const writes=window.__firestoreWrites.length;
      const originalBalance=userProfile.currency;
      const originalInventory=userProfile.inventory;
      const phone=document.getElementById('cyber-phone');
      const wasOpen=phone.style.display==='flex';
      const uid='v4352-';
      try{
        novel.chapters=[...priorChapters,{
          id:uid+'chapter',title:'Chương sau',content:'Thử',
          storyItemIds:[uid+'linked']
        }];
        novel.specialItems=[...(priorItems||[]),
          {id:uid+'free',name:'Thẻ của tác giả',rank:'D',type:'ITEM',
            scope:'STORY',storyId:novel.id,chapterId:null,
            published:true,acquisition:{method:'STORY_EVENT'}},
          {id:uid+'linked',name:'Bí mật cuối chương',rank:'A',type:'ITEM',
            scope:'STORY',storyId:novel.id,chapterId:null,
            published:true,acquisition:{method:'STORY_EVENT'}},
          {id:uid+'chapter-item',name:'Quà của chương',rank:'S',type:'ITEM',
            scope:'CHAPTER',storyId:novel.id,chapterId:uid+'chapter',
            published:true,acquisition:{method:'CHAPTER_EVENT'}},
          {id:uid+'archived',name:'Lưu trữ',rank:'SS',type:'ITEM',
            scope:'STORY',storyId:novel.id,chapterId:null,
            published:true,archived:true,acquisition:{method:'STORY_EVENT'}}
        ];
        userProfile.readRewards={};
        if(!wasOpen)togglePhone();
        openPhoneApp('shop');
        let tabs=[...document.querySelectorAll('.dudu-v43-market-tab')];
        tabs.find(b=>b.textContent==='Theo truyện').click();
        const select=document.querySelector('.dudu-v43-market-story');
        select.value=novel.id;select.dispatchEvent(new Event('change',{bubbles:true}));
        const present=id=>!!document.querySelector(
          '#shop-items-container [data-item-id="'+id+'"]');
        const visibleBefore=present(uid+'free')&&!present(uid+'linked')&&
          !present(uid+'chapter-item');
        const hiddenNote=[...document.querySelectorAll('.dudu-v43-market-locked')]
          .some(node=>node.textContent.includes('2 vật phẩm'));
        const previewOnly=document.querySelectorAll(
          '#shop-items-container [data-scope="STORY"] button, #shop-items-container [data-scope="CHAPTER"] button'
        ).length===0;
        userProfile.readRewards[novel.id+'_'+uid+'chapter']=true;
        renderShop();
        const visibleAfter=present(uid+'linked')&&present(uid+'chapter-item');
        const sourceText=[...document.querySelectorAll('.dudu-v43-market-provenance')]
          .some(el=>el.textContent.includes('Sự kiện chương'));
        const archivedHidden=!present(uid+'archived');
        const purchaseDenied=buyShopItem(uid+'chapter-item')===false;
        const item=DuduInventoryV42.inspect({
          ...DuduItemCatalog.byId('common-biscuit'),instanceId:'fixture-shop',
          obtainedFrom:{kind:'SHOP',source:'DUDU_MARKET'}
        });
        const shopSource=item?.acquisitionKind==='SHOP';
        const balanceSafe=userProfile.currency===originalBalance;
        const ownedSafe=userProfile.inventory===originalInventory;
        return {visibleBefore,hiddenNote,previewOnly,visibleAfter,
          sourceText,archivedHidden,purchaseDenied,shopSource,balanceSafe,
          ownedSafe,noWrites:window.__firestoreWrites.length===writes};
      }finally{
        novel.chapters=priorChapters;novel.specialItems=priorItems;
        userProfile.readRewards=priorReads;
        phoneHome();
        if(!wasOpen&&phone.style.display==='flex')togglePhone();
      }
    });
    assert.deepEqual(shopStoryV4352,{
      visibleBefore:true,hiddenNote:true,previewOnly:true,
      visibleAfter:true,sourceText:true,archivedHidden:true,
      purchaseDenied:true,shopSource:true,balanceSafe:true,ownedSafe:true,noWrites:true
    },'Story/chapter preview must hide unreached names, never mint items or cash');

    assert.deepEqual(failures, [], 'Browser should have no uncaught exceptions');
    console.log('Browser sandbox smoke PASS:', JSON.stringify(verified), JSON.stringify(swapped), JSON.stringify(npcEfficient));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
