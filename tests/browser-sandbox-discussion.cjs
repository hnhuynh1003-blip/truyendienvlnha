// Isolated browser harness. Blocks all network; exercises the actual Sandbox UI.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
test('Sandbox roles share board, replies, reports and scoped inbox in browser',async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();let external=0;
  await page.route('**/*',route=>{
   if(route.request().url()==='http://localhost/')return route.fulfill({contentType:'text/html',body:'<div id="board"></div>'});
   external++;return route.abort();
  });
  await page.goto('http://localhost/');
  await page.addScriptTag({path:path.resolve(__dirname,'../js/sandbox-discussion.js')});
  await page.addScriptTag({path:path.resolve(__dirname,'../js/sandbox-discussion-ui.js')});
  const render=async(actor='testA',chapterId='c1',sandbox=true)=>page.evaluate(({actor,chapterId,sandbox})=>{
   DuduSandboxDiscussionUI.render({host:document.getElementById('board'),sandbox,storyId:'s1',chapterId,actor});
  },{actor,chapterId,sandbox});
  await render();
  await page.getByRole('textbox').fill('Lời nhắn từ A');await page.getByRole('button',{name:'Gửi bình luận',exact:true}).click();
  await page.getByRole('combobox',{name:'Vai ảo Sandbox'}).selectOption('testB');
  assert.match(await page.locator('#board').innerText(),/Lời nhắn từ A/);
  await page.getByRole('button',{name:'Trả lời',exact:true}).click();
  await page.getByRole('textbox').fill('B trả lời');await page.getByRole('button',{name:'Gửi bình luận',exact:true}).click();
  await page.getByRole('button',{name:'Báo cáo',exact:true}).first().click();
  await page.getByRole('combobox',{name:'Vai ảo Sandbox'}).selectOption('testA');
  assert.match(await page.locator('#board').innerText(),/1 chưa đọc/);
  await page.getByRole('button',{name:'Đánh dấu đã đọc'}).click();
  assert.match(await page.locator('#board').innerText(),/0 chưa đọc/);
  await render('AUTHOR');assert.match(await page.locator('#board').innerText(),/testB · sandbox-comment-1 · SPAM/);
  await render('testA','c2');assert.doesNotMatch(await page.locator('#board').innerText(),/Lời nhắn từ A|B trả lời/);
  const saved=await page.evaluate(()=>localStorage.getItem(DuduSandboxDiscussion.KEY));
  await render('testA','c1',false);assert.equal(await page.locator('#board').isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem(DuduSandboxDiscussion.KEY)),saved);
  await render();assert.match(await page.locator('#board').innerText(),/B trả lời/);
  assert.equal(external,0);
 }finally{await browser.close()}
});
