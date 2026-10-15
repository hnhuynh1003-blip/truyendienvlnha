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
    assert.deepEqual(failures, [], 'Browser should have no uncaught exceptions');
    console.log('Browser sandbox smoke PASS:', JSON.stringify(verified), JSON.stringify(swapped));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
