// DUDU V67.2 messenger DOM contract. Run: node tests/dudu-messenger-v67-2.cjs
// Entirely local; no Firebase/Worker network and no production account writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'js/companion-ui-v43.js'),'utf8');
const rules=require(path.join(root,'js/companion-rules-v43.js'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/dudu-messenger-v67-2.css'),'utf8');
class Element {
  constructor(tag='div',id=''){
    this.tagName=tag.toUpperCase();this.id=id;this.children=[];
    this.events={};this.attributes={};this.style={};this.dataset={};this.value='';
    this.textContent='';this.open=false;this.disabled=false;
    this.scrollTop=0;this.scrollHeight=500;this.clientHeight=100;this.hidden=false;
    this._classes=new Set();
    const classes=this._classes;
    this.classList={add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));},
      contains(x){return classes.has(x);}};
  }
  set className(value){
    this._className=String(value);
    this._classes.clear();
    for(const name of this._className.split(/\\s+/).filter(Boolean))this._classes.add(name);
  }
  get className(){return this._className||'';}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(kind,fn){(this.events[kind] ||= []).push(fn);}
  dispatchEvent(event){
    for(const fn of this.events[event.type]||[])fn(event);
    return true;
  }
  focus(){this.focused=true;}
  requestSubmit(){this.dispatchEvent({type:'submit',preventDefault(){}});}
}
const app=new Element('section','phone-app-chat'),body=new Element('body');
const elements=[app];
function visit(node){
  if(node.id)elements.push(node);
  for(const child of node.children)visit(child);
}
const document={
  body,readyState:'complete',createElement(tag){return new Element(tag);},
  getElementById(id){
    elements.length=1;
    visit(app);
    return elements.find(e=>e.id===id)||null;
  },
  addEventListener(){}
};
let saved=0,updatedInbox=0;
const window={DuduCompanionRulesV43:rules,duduV33Render(){updatedInbox++;}};
const context={
  window,document,IS_SANDBOX_MODE:true,currentUsername:'reader-a',
  userProfile:{currency:50},novels:[{title:'Truyện thử'}],
  saveCurrentAccount(){saved++;},
  Event:class{constructor(type){this.type=type;}}
};
vm.runInNewContext(src,context,{filename:'companion-ui-v43.js',timeout:1500});
const api=window.DuduCompanionV43;
assert.ok(api);
assert.equal(elements[0],app);
const panel=document.getElementById('dudu-v43-companion');
assert.ok(panel);
assert.equal(panel.children.length,3,'Only header, messages and composer occupy space');
const head=panel.children[0],log=document.getElementById('dudu-v43-messages');
const diary=document.getElementById('dudu-v43-diary');
const form=panel.children[2],input=document.getElementById('dudu-v43-message-input');
const status=document.getElementById('dudu-v672-composer-status');
assert.equal(input.tagName,'TEXTAREA');
assert.equal(input.maxLength,500);
assert.equal(form.tagName,'FORM');
assert.ok(head.children.includes(diary),'Diary belongs to header menu');
assert.ok(diary.children.some(x=>x.classList.contains('dudu-v672-diary-contents')));
assert.ok(!panel.children.some(x=>x.classList.contains('dudu-v43-shortcuts')),
  'Quick prompts are not a persistent row');
assert.equal(diary.open,false);
api.open();
assert.equal(app.classList.contains('dudu-v43-companion-open'),true);
assert.equal(body.classList.contains('dudu-v672-chatting'),true);
assert.equal(context.userProfile.duduCompanionV43.messages.length,1,'Welcome survives existing V43 data contract');
input.value='Hướng dẫn nhặt đồ';
input.dispatchEvent({type:'input'});
assert.equal(form.children[1].disabled,false);
form.requestSubmit();
assert.equal(input.value,'');
assert.equal(form.children[1].disabled,true);
assert.equal(context.userProfile.duduCompanionV43.messages.length,3);
assert.ok(context.userProfile.duduCompanionV43.messages[2].text.includes('2 phút'));
assert.ok(saved>=2&&updatedInbox>=1);
const previousMessages=JSON.stringify(context.userProfile.duduCompanionV43.messages);
log.scrollHeight=700;log.clientHeight=120;log.scrollTop=90;
api.render();
assert.equal(log.scrollTop,90,'Do not yank reader from older message');
assert.equal(JSON.stringify(context.userProfile.duduCompanionV43.messages),previousMessages);
input.value='  ';
input.dispatchEvent({type:'input'});
assert.equal(form.children[1].disabled,true,'Whitespace-only drafts cannot send');
input.value='Tin nhắn có nhiều dòng';
input.dispatchEvent({type:'input'});
let prevented=false;
input.dispatchEvent({type:'keydown',key:'Enter',shiftKey:true,isComposing:false,keyCode:13,
 preventDefault(){prevented=true;}});
assert.equal(prevented,false,'Shift+Enter should allow newline');
input.dispatchEvent({type:'keydown',key:'Enter',shiftKey:false,isComposing:true,keyCode:229,
 preventDefault(){prevented=true;}});
assert.equal(prevented,false,'IME composition must not submit');
input.dispatchEvent({type:'keydown',key:'Enter',shiftKey:false,isComposing:false,keyCode:13,
 preventDefault(){prevented=true;}});
assert.equal(prevented,true);
assert.ok(context.userProfile.duduCompanionV43.messages.some(m=>m.text==='Tin nhắn có nhiều dòng'));
diary.open=true;
api.hide();
assert.equal(diary.open,false);
assert.equal(body.classList.contains('dudu-v672-chatting'),false);
assert.equal(app.classList.contains('dudu-v43-companion-open'),false);
assert.ok(css.includes('dudu-v672-chatting')&&css.includes('.dudu-v672-diary-contents'));
assert.ok(html.includes('js/companion-ui-v43.js?v=67-3'));
assert.ok(html.includes('css/dudu-messenger-v67-2.css?v=67-2'));
assert.ok(html.includes('js/dudu-messenger-v67-2.js?v=67-2'));
// V67.3 integrated chat: system facts render one explicit, harmless action.
const stewardSource=fs.readFileSync(path.join(root,'js/dudu-system-steward-v67-3.js'),'utf8');
window.DuduWorldTaxonomyV66={
 genres:[{name:'Cổ đại'}],missions:[{tier:'F',status:'seed',available:false}]
};
vm.runInNewContext(stewardSource,context,{timeout:1500});
const navCalls=[];
window.DuduSiteV60={navigate:route=>navCalls.push(route)};
api.open();
input.value='Thế giới';
input.dispatchEvent({type:'input'});
form.requestSubmit();
const latestBubble=log.children[log.children.length-1];
const action=latestBubble?.children.find(e=>e.classList.contains('dudu-v673-action'));
assert.ok(action,'Latest system answer should have one read-only navigation chip');
assert.equal(action.textContent,'Xem Vạn Giới ↗');
assert.equal(navCalls.length,0,'System advice must not auto-navigate');
action.dispatchEvent({type:'click'});
assert.equal(navCalls.join(','),'worlds','Button must navigate only after click');
assert.equal(window.DuduSystemStewardV673.openSafeView('grant_reward'),false);
console.log('DUDU V67.2/V67.3: messenger, history, keyboard and safe system action OK');
