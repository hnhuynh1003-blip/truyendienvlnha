// V71 main-branch acceptance: production-mode frontend, never ?sandbox=1.
// External Firebase and Worker HTTP calls are intercepted in Chromium.
// The real source/UI under main is exercised; NO production writes or issued cards.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

function firebaseShim(){
  window.__mainV71Writes=[];
  const subscribers=new Set();
  const session={
    currentUser:null,
    onAuthStateChanged(fn){
      subscribers.add(fn);
      setTimeout(()=>fn(this.currentUser),0);
      return ()=>subscribers.delete(fn);
    },
    async signInWithEmailAndPassword(email,password){
      if(email!=='reader@example.test'||password!=='test-password'){
        const error=new Error('invalid credentials');
        error.code='auth/invalid-credential';throw error;
      }
      const user={
        uid:'main-test-reader',email,displayName:'Reader Main',
        getIdToken:async()=> 'FAKE-JWT-main-test-reader',
        getIdTokenResult:async()=>({claims:{admin:false}})
      };
      this.currentUser=user;
      for(const fn of subscribers)setTimeout(()=>fn(user),0);
      return {user};
    },
    async signOut(){
      this.currentUser=null;
      for(const fn of subscribers)await fn(null);
    }
  };
  function firestore(){
    return {collection(name){
      return {doc(id){
        return {
          get:async()=>({exists:name==='profiles_v2',
            data:()=>({username:id,name:'Reader Main',role:'admin',
              storyStates:{},collectedCharacters:{}})}),
          set:async data=>{window.__mainV71Writes.push(data);throw Error('Firestore write denied in browser test');},
          onSnapshot:fn=>{setTimeout(()=>fn({exists:false}),0);return ()=>{};}
        };
      }};
    }};
  }
  firestore.FieldValue={serverTimestamp:()=>1};
  window.firebase={
    initializeApp(){},
    firestore,
    auth:Object.assign(()=>session,{GoogleAuthProvider:class{}})
  };
}

(async()=>{
  const root=path.resolve(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const filename=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
    if(!filename.startsWith(root+path.sep)){
      res.writeHead(403).end();return;
    }
    fs.readFile(filename,(error,bytes)=>{
      if(error){res.writeHead(404).end();return;}
      const mime=/\.js$/.test(filename)?'text/javascript':
        /\.css$/.test(filename)?'text/css':'text/html; charset=utf-8';
      res.writeHead(200,{'content-type':mime}).end(bytes);
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();
  const errors=[];
  const validPass='DT-11111111-22222222-33333333-44444444';
  try{
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://www.gstatic.com/firebasejs/**',async route=>{
      const isApp=route.request().url().includes('firebase-app-compat');
      await route.fulfill({status:200,contentType:'application/javascript',
        body:isApp?'('+firebaseShim.toString()+')();':''});
    });
    // Replace only V71 Worker HTTP in the real production-mode browser context.
    // This avoids cross-origin preflight flakiness and ensures zero live writes.
    await page.addInitScript(pass=>{
      const originalFetch=window.fetch.bind(window);
      const state={stage:'locked',name:null,pact:'pending',rewards:0};
      const calls=[];
      function profile(){
        if(state.stage==='locked')return {
          stage:'locked',authoritative:true,
          passport:{state:'issued',expiresAt:Date.now()+86400000}
        };
        return {stage:state.stage,authoritative:true,worldAccess:false,
          host:{id:'KC-0123456789ABCDEFAB',name:state.name,level:1,exp:0,
            stats:{fortune:65,luck:66,agility:67,strength:68,appearance:69,
              intelligence:70,stamina:71,spirit:72},failures:0},
          system:{id:'DUDU-07',name:'Hệ thống DUDU-07',rank:'F',level:1,exp:0},
          pact:{status:state.pact,termsVersion:state.pact==='signed'?'v71-pilot-1':null},
          progress:{worlds:0,missions:0,achievements:0,rewards:state.rewards,items:0}};
      }
      window.__v71MainMock={state,calls};
      window.fetch=async(input,options={})=>{
        const url=typeof input==='string'?input:input?.url;
        if(typeof url!=='string'||!url.includes('/v1/system/'))return originalFetch(input,options);
        const method=options.method||'GET',endpoint=new URL(url).pathname;
        const authorization=options.headers?.Authorization||null;
        calls.push({path:endpoint,method,authorization});
        let status=200,reply;
        const signed=authorization==='Bearer FAKE-JWT-main-test-reader';
        const body=JSON.parse(options.body||'{}');
        if(!signed){status=401;reply={error:{code:'unauthenticated'}};}
        else if(endpoint==='/v1/system/me'&&method==='GET')reply=profile();
        else if(endpoint==='/v1/system/owner/issue-test-pass'){
          status=403;reply={error:{code:'owner-only'}};
        }else if(endpoint==='/v1/system/redeem'&&method==='POST'){
          if(body.code!==pass||state.stage!=='locked'){
            status=409;reply={error:{code:'invalid-pass'}};
          }else{state.stage='awaiting-name-or-pact';reply=profile();}
        }else if(endpoint==='/v1/system/register-name'&&method==='POST'){
          if(state.name){status=409;reply={error:{code:'name-already-registered'}};}
          else if(body.name!=='Thanh Vân'){status=400;reply={error:{code:'invalid-name'}};}
          else{state.name=body.name;reply=profile();}
        }else if(endpoint==='/v1/system/consent-pact'&&method==='POST'){
          if(body.accept!==true||body.termsVersion!=='v71-pilot-1'){
            status=400;reply={error:{code:'consent-required'}};
          }else{state.stage='linked';state.pact='signed';reply=profile();}
        }else{status=404;reply={error:{code:'not-found'}};}
        return new Response(JSON.stringify(reply),{status,headers:{'Content-Type':'application/json'}});
      };
    },validPass);

    const address='http://127.0.0.1:'+server.address().port+'/';
    await page.goto(address,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.DuduSystemAppsV69&&!!window.DuduAuth);
    assert.equal(await page.evaluate(()=>IS_SANDBOX_MODE),false,
      'main acceptance must NEVER enter Sandbox mode');
    await page.evaluate(()=>DuduSystemAppsV69.renderSystem());
    assert.equal(await page.locator('#dudu-v69-system-view > .dudu-v71-unavailable').count(),1);
    assert.equal(await page.locator('#dudu-v69-system-view form').count(),0);
    assert.equal(await page.evaluate(()=>window.__v71MainMock.calls.length),0,
      'guest must not call System Worker');

    await page.locator('#account-status-btn').click();
    await page.locator('#auth-email').fill('reader@example.test');
    await page.locator('#auth-password').fill('test-password');
    await page.locator('#auth-email-login-btn').click();
    await page.waitForFunction(()=>window.DuduAuth?.isReady?.()===true);
    assert.equal(await page.evaluate(()=>canEditStories()),false,
      'Firestore role=admin must not grant AU without Firebase custom claim');
    assert.equal(await page.evaluate(()=>DuduSystemAppsV69.isAuthor()),false);
    assert.equal(await page.evaluate(()=>DuduSystemAppsV69.renderCore()),false);

    await page.evaluate(()=>{
      if(document.getElementById('cyber-phone').style.display!=='flex')togglePhone();
      openPhoneApp('system');
    });
    await page.locator('#dudu-v69-system-view .dudu-v71-pass-form').waitFor({timeout:10000});
    assert.equal(await page.locator('#dudu-v69-system-view .dudu-v71-hero').count(),0);
    assert.equal((await page.evaluate(()=>DuduSystemClientV71.issueOwnerTestPass())).ok,false,
      'Reader cannot issue their own server pass');

    await page.locator('#dudu-v69-system-view input[aria-label="Mã Thẻ thông hành"]').fill('DT-FFFFFFFF-FFFFFFFF-FFFFFFFF-FFFFFFFF');
    await page.locator('#dudu-v69-system-view button[type="submit"]').click();
    await page.waitForFunction(()=>document.getElementById('dudu-v71-message')?.textContent.includes('409'));
    assert.equal(await page.locator('#dudu-v69-system-view .dudu-v71-hero').count(),0);

    await page.locator('#dudu-v69-system-view input[aria-label="Mã Thẻ thông hành"]').fill(validPass);
    await page.locator('#dudu-v69-system-view button[type="submit"]').click();
    await page.locator('#dudu-v69-system-view .dudu-v71-name-step').waitFor();
    assert.match(await page.locator('.dudu-v71-host-id').innerText(),/^ID KÝ CHỦ/);
    await page.locator('#dudu-v69-system-view input[aria-label="Đăng ký tên ký chủ"]').fill('Thanh Vân');
    await page.locator('#dudu-v69-system-view button[type="submit"]').click();
    await page.locator('#dudu-v69-system-view .dudu-v71-hero').waitFor();
    assert.match(await page.locator('.dudu-v71-hero').innerText(),/Thanh Vân/);
    assert.equal(await page.locator('.dudu-v71-pact-note').count(),1);
    assert.equal(await page.locator('.dudu-v71-connected').count(),0);

    await page.locator('.dudu-v71-consent input[type=checkbox]').check();
    await page.getByRole('button',{name:'KÝ KHẾ ƯỚC'}).click();
    await page.locator('.dudu-v71-connected').waitFor();
    assert.equal(await page.evaluate(()=>window.__v71MainMock.state.stage),'linked');
    assert.equal(await page.evaluate(()=>window.__v71MainMock.state.rewards),0,
      'no game rewards in V71');

    await page.getByRole('button',{name:/Chỉ số/}).click();
    assert.equal(await page.locator('#dudu-v69-status-popup .dudu-v69-stat').count(),8);
    assert.doesNotMatch(await page.locator('#dudu-v69-system-view').innerText(),
      /irregular|regular|private_temperament|nguồn gốc/i);

    await page.evaluate(async()=>{await DuduAuth.signout();DuduSystemAppsV69.syncAccess();});
    await page.locator('#dudu-v69-system-view > .dudu-v71-unavailable').waitFor({state:'attached'});
    // Signing out may close Cyber Phone; inspect the DOM even when the phone is hidden.
    assert.equal(await page.locator('#dudu-v69-system-view .dudu-v71-hero').count(),0,
      'former user System data must leave the DOM on sign-out');
    assert.equal(await page.locator('#dudu-v69-system-view form').count(),0);
    assert.equal(await page.locator('#dudu-v69-status-popup').count(),0);
    assert.equal(await page.evaluate(()=>window.__mainV71Writes.length),0);
    const calls=await page.evaluate(()=>window.__v71MainMock.calls);
    assert.ok(calls.length>=6,'main UI must exercise real production client API routes');
    assert.ok(calls.every(call=>call.authorization==='Bearer FAKE-JWT-main-test-reader'));
    assert.deepEqual(errors,[]);
    console.log('V71 MAIN production-mode browser PASS: guest → reader → pass → name → pact → 8 stats → signout; external writes=0');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
