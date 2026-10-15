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
      res.writeHead(200, { 'content-type': filepath.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' }).end(bytes);
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
      window.confirm=()=>true;
      clearCurrentChat();
      return {
        originalCount:original.length,
        otherUser:otherUser.length,otherStory:otherStory.length,otherNpc:otherNpc.length,
        giftCount:gifts.length,giftProvenance:gifts[0]?.provenance,
        hasMemoryRequest,deleted:memory.list().length===0,
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
      let base,scifi,freeOk,freeAgain,freeCountBefore,freeCountAfter;
      try {
        freeCountBefore=userProfile.inventory.length;
        claimChapterLootDrop();
        freeOk=userProfile.lootedChapters[readKey]===true;
        const drop=userProfile.inventory[0];
        base={id:drop.id,rank:drop.rank,scope:drop.scope,source:drop.obtainedFrom,
          namedChapter:drop.obtainedFrom?.storyId===novel.id};
        const countOnce=userProfile.inventory.length;
        claimChapterLootDrop();
        freeAgain=userProfile.inventory.length===countOnce;
        const second={id:'phase2-realm-chapter',title:'Chương thử vị diện',
          content:'Nội dung dành cho kiểm thử thế giới.',realmTag:'SCIFI'};
        novel.chapters.push(second);
        readChapter(novel.chapters.length-1);
        claimChapterLootDrop();
        const item=userProfile.inventory[0];
        scifi={rank:item.rank,scope:item.scope,realmTag:item.realmTag,source:item.obtainedFrom,
          chapterClaim:userProfile.lootedChapters[novel.id+'_'+second.id]};
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
        freeCountBefore,freeCountAfter,base,scifi,
        firestoreWrites:window.__firestoreWrites.length
      };
    });
    assert.equal(lootPhase2.alreadyCounted,true);
    assert.equal(lootPhase2.expFirst-lootPhase2.expBefore,5,'First chapter open gets a one-time reward');
    assert.equal(lootPhase2.expSecond,lootPhase2.expFirst,'Re-opening chapter must never repeat EXP');
    assert.equal(lootPhase2.freeOk,true);
    assert.equal(lootPhase2.freeAgain,true,'Same chapter cannot grant a second drop');
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
        return {id,text:document.getElementById('npc-relationship-r3-preview').textContent,
          displayed:document.getElementById('npc-relationship-r3-preview').style.display};
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
    assert.ok(npcSwitches.outputs.every(x=>x.displayed==='block'));
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
      return {firstBefore,afterFirst,afterRepeat,savedTrust,disabled,portrait,
        filtered,searchCount,protectedStillThere,correctRemoved,
        writes:window.__firestoreWrites.length-writesBefore};
    });
    assert.equal(expansionSmoke.firstBefore,0);
    assert.equal(expansionSmoke.afterFirst,3);
    assert.equal(expansionSmoke.afterRepeat,3,'One check-in per NPC/day');
    assert.equal(expansionSmoke.savedTrust,3,'Sandbox trust persists locally');
    assert.equal(expansionSmoke.disabled,true);
    assert.ok(expansionSmoke.portrait.length>0,'NPC avatar initials must render');
    assert.match(expansionSmoke.filtered,/Dao Gọt Trái Cây Cũ/);
    assert.match(expansionSmoke.searchCount,/1\/3/);
    assert.equal(expansionSmoke.protectedStillThere,true,'Souvenir must not be discarded');
    assert.equal(expansionSmoke.correctRemoved,true,'Filtering must not delete a different item');
    assert.equal(expansionSmoke.writes,0,'Sandbox R5 and inventory never write Firestore');

    assert.deepEqual(failures, [], 'Browser should have no uncaught exceptions');
    console.log('Browser sandbox smoke PASS:', JSON.stringify(verified), JSON.stringify(swapped), JSON.stringify(npcEfficient));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
