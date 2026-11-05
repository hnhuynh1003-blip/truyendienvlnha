// node tests/browser-auth-private.cjs
// An isolated headless browser with fake Firebase SDK responses, NO production writes.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(filename, (err, bytes) => {
      if (err) { res.writeHead(404).end(); return; }
      const mime = filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8';
      res.writeHead(200, {'content-type': mime}).end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
    const context = await browser.newContext(); // no cookies or saved/autofilled credentials
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    await page.route('https://www.gstatic.com/firebasejs/**', async route => {
      const isApp = route.request().url().includes('firebase-app-compat');
      const mock = isApp ? `
        (() => {
          const authObservers = new Set();
          const userSession = {
            currentUser: null,
            onAuthStateChanged(fn) {
              authObservers.add(fn);
              setTimeout(() => fn(this.currentUser), 0);
              return () => authObservers.delete(fn);
            },
            async signInWithEmailAndPassword(email, password) {
              if (email !== 'reader@example.test' || password !== 'testing-secret') {
                const err = new Error('Invalid credential'); err.code = 'auth/invalid-credential'; throw err;
              }
              const user = {uid:'reader-uid', email, displayName:'Reader',
                getIdTokenResult:async () => ({claims:{}})};
              this.currentUser = user;
              for (const fn of authObservers) setTimeout(() => fn(user), 0);
              return {user};
            },
            async signOut() {
              this.currentUser=null;
              await Promise.all([...authObservers].map(fn => fn(null)));
            }
          };
          const firestore = function() {
            return {collection(name) { return {doc(id) {
              return {
                get:async () => ({exists:name==='profiles_v2',data:()=>({
                  username:id, name:'Reader', role:'admin', storyStates:{},collectedCharacters:{}
                })}),
                set:async () => {throw new Error('Mock should not write production');},
                onSnapshot:fn => { setTimeout(()=>fn({exists:false}),0);return ()=>{}; }
              };
            }}; }};
          };
          firestore.FieldValue = {serverTimestamp(){return 'test-time';}};
          const firebase = {
            initializeApp() {},
            firestore,
            auth: Object.assign(() => userSession,{GoogleAuthProvider:class{}})
          };
          window.firebase = firebase;
        })();
      ` : '';
      await route.fulfill({status:200, contentType:'application/javascript', body:mock});
    });
    await page.goto('http://127.0.0.1:' + server.address().port + '/', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => typeof window.DuduAuth !== 'undefined' && document.getElementById('account-status-btn').textContent.includes('Khách'));
    // Guest can read public novels without a forced login prompt.
    assert.notEqual(await page.locator('#auth-modal').evaluate(el => el.style.display), 'flex');
    assert.equal(await page.locator('#stat-personal-reading').innerText(), '0');
    await page.locator('#account-status-btn').click();
    await page.waitForFunction(() => document.getElementById('auth-modal').style.display === 'flex');
    assert.equal(await page.locator('#auth-email').inputValue(), '');
    assert.equal(await page.locator('#auth-password').inputValue(), '');

    await page.locator('#auth-email-login-btn').click();
    assert.match(await page.locator('#auth-status-message').innerText(), /chưa nhập email/i);
    await page.locator('#auth-email').fill('reader@example.test');
    await page.locator('#auth-email-login-btn').click();
    assert.match(await page.locator('#auth-status-message').innerText(), /chưa nhập mật khẩu/i);

    await page.locator('#auth-password').fill('wrong-password');
    await page.locator('#auth-email-login-btn').click();
    assert.match(await page.locator('#auth-status-message').innerText(), /Email hoặc mật khẩu chưa đúng/i);

    await page.locator('#auth-password').fill('testing-secret');
    await page.locator('#auth-email-login-btn').click();
    try {
      await page.waitForFunction(() => document.getElementById('account-status-btn').textContent.includes('reader@example.test') ||
        document.getElementById('account-status-btn').textContent.includes('Reader'), {timeout:12000});
    } catch (error) {
      const snapshot = await page.evaluate(() => ({
        label: document.getElementById('account-status-btn')?.textContent,
        feedback: document.getElementById('auth-status-message')?.textContent,
        authUid: window.firebase?.auth?.()?.currentUser?.uid || null,
        duduUid: window.DuduAuth?.uid?.() || null,
        authReady: window.DuduAuth?.isReady?.() || false
      }));
      console.error('Firebase mock sign-in diagnostic (no private credentials):',
        JSON.stringify(snapshot), 'pageErrors:', JSON.stringify(pageErrors));
      throw error;
    }
    const result = await page.evaluate(() => ({
      username:currentUsername, role:userProfile.role,
      canEdit:canEditStories(), loggedIn:DuduAuth.isReady(),
      authModalVisible: document.getElementById('auth-modal').style.display === 'flex'
    }));
    assert.equal(result.username, 'reader-uid');
    assert.equal(result.role, 'reader', 'Firestore stored role=admin must not elevate user');
    assert.equal(result.canEdit, false);
    assert.equal(result.loggedIn, true);
    assert.equal(result.authModalVisible, false);
    assert.equal(await page.evaluate(()=>DuduFeaturesT0.worlds),false);assert.equal(await page.evaluate(()=>typeof DuduStoryEngineV2B),'undefined');assert.equal(await page.evaluate(()=>typeof DuduSystemClientV71),'undefined');assert.equal(await page.locator('[data-d60-route="worlds"]').count(),0);await page.evaluate(()=>DuduSiteV60.navigate('worlds'));assert.equal(await page.evaluate(()=>DuduSiteV60.page),'home');assert.equal(await page.evaluate(()=>DuduSiteV60.worldsPaused),true);assert.equal(await page.locator('#d60-worlds-list a[href*="playtests/"],#d60-worlds-list a[href*="dudu-pilot"]').count(),0);const before=await page.evaluate(()=>JSON.stringify(userProfile));await page.evaluate(()=>{DuduPhoneLifecycleV671.refresh();if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();openPhoneApp('system');});await page.waitForTimeout(250);await page.getByRole('button',{name:'Thiên Mệnh cũ',exact:true}).waitFor({timeout:5000});assert.equal(await page.evaluate(()=>JSON.stringify(userProfile)),before);for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await page.evaluate(()=>openPhoneApp('core-console'));assert.equal(await page.evaluate(()=>DuduFeaturesT0.worlds),false);
    await page.getByRole('button',{name:'Thiên Mệnh cũ',exact:true}).click();await page.waitForFunction(()=>typeof DuduSystemClientV71==='object');assert.equal(await page.evaluate(()=>typeof DuduStoryEngineV2B),'undefined');assert.equal(await page.evaluate(()=>JSON.stringify(userProfile)),before);const archive=await context.newPage();for(const route of ['dudu-pilot.html','playtests/ben-suong/','playtests/he-thong-erro/','playtests/tang-may-9/']){await archive.goto('http://127.0.0.1:'+server.address().port+'/'+route);await archive.getByRole('heading',{name:'Vạn Giới đã lưu trữ'}).waitFor();assert.equal(await archive.evaluate(()=>typeof DuduPilotUIV1),'undefined');assert.equal(await archive.locator('script[type="module"]').count(),0);}await archive.close();
    assert.deepEqual(pageErrors, []);
    console.log('T0 transition, archived routes, no lazy world initialization, preserved profile and Auth PASS:', JSON.stringify(result));
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => {console.error(err);process.exitCode=1;});
