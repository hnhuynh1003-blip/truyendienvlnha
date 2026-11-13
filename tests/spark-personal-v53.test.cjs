const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const html=file('index.html');
const npc=require('../js/npc-chat-lite.js');
const importer=file('js/epub-import-v48.js');
const rules=file('security/firestore-spark-personal-v53.rules.review');

test('V53 Spark personal mode prevents Cloud Functions economy calls without touching sandbox',()=>{
 assert.match(html,/const DUDU_SPARK_PERSONAL_MODE = !IS_SANDBOX_MODE;/);
 for(const action of ['openInventory','openQuests']){
  assert.match(html,new RegExp('!IS_SANDBOX_MODE&&!DUDU_SPARK_PERSONAL_MODE\\)window\\.DuduEconomyLiveV52\\?\\.'+action+'\\(\\)'));
 }
 assert.match(html,/!IS_SANDBOX_MODE&&\(!DUDU_SPARK_PERSONAL_MODE\|\|window\.DUDU_SPARK_ITEMS_V1_READY===true\)/);
 assert.match(file('js/economy-live-v52.js'),/if\(personal\(\)\)\{showPersonalMarket\(\);return;\}/);
 assert.match(html,/document\.body\.classList\.add\('dudu-spark-personal-mode'\)/);
});
test('V53 offline NPC replies are clearly scripted, scoped and never award currency',()=>{
 const messages=[{role:'user',text:'Tôi gặp chuyện khó khăn hôm nay'}];
 const char={id:'lan',name:'Lan',role:'Cố nhân',status:'Bình thường',note:'Vui vẻ'};
 const name=npc.offlineReply('Bạn tên gì?',char,messages);
 const feeling=npc.offlineReply('Hôm nay tôi buồn',char,messages);
 const unknown=npc.offlineReply('Bạn có biết bí mật cuối truyện?',char,messages);
 assert.match(name.text,/Lan/);
 assert.match(feeling.text,/đang nghe|muốn kể|hôm nay/i);
 assert.match(unknown.text,/tác giả|chương|truyện/i);
 assert.equal(name.source,'offline-script');
 assert.equal(feeling.source,'offline-script');
 assert.equal(char.status,'Bình thường');
 const local=html.slice(html.indexOf('if(DUDU_SPARK_PERSONAL_MODE && !DUDU_NPC_AI_MODE) {',html.indexOf('async function sendChatMessage()')));
 assert.match(local,/DuduNpcLite\.offlineReply\(/);
 assert.match(local,/saveChatHistories\(\)/);
 assert.match(local,/return;/);
 assert.doesNotMatch(local.slice(0,local.indexOf('return;')),/DuduAI\.generate|userProfile\.currency\s*=|v43RecordNpcBond/);
 assert.match(html,/Mỗi ngày có giới hạn lượt trò chuyện/);
});
test('V53 EPUB supports Firestore Spark without Cloud Storage backup UI',()=>{
 assert.match(html,/sparkPersonal:DUDU_SPARK_PERSONAL_MODE/);
 assert.match(importer,/cloudBtn\.hidden=!!options\.sandbox\|\|!!options\.sparkPersonal/);
 assert.match(importer,/Spark miễn phí:/);
 assert.match(importer,/production\.importDraft\(/);
 assert.match(importer,/production\.publishDraft\(/);
});
test('V53 draft Rules preserve minimum author claim, private progress and published-only reads',()=>{
 assert.match(rules,/match \/studio_data\/main_library/);
 assert.match(rules,/match \/profiles_v2\/\{uid\}/);
 assert.match(rules,/match \/epub_stories_v49\/\{bookId\}/);
 assert.match(rules,/request\.auth\.token\.admin == true/);
 assert.match(rules,/request\.resource\.data\.status == 'importing'/);
 assert.match(rules,/resource\.data\.status == 'published'/);
 assert.match(rules,/match \/chapters\/\{chapterId\}/);
 assert.match(rules,/allow update, delete: if false/);
 assert.match(rules,/match \/economy_accounts_v52\/\{uid\}/);
 assert.match(rules,/match \/\{document=\*\*\}/);
});
