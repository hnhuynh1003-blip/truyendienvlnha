const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');

const root=join(__dirname,'..');
const index=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'css/library-reader-l2c.css'),'utf8');
const shellCss=readFileSync(join(root,'css/site-shell-v60.css'),'utf8');
const js=readFileSync(join(root,'js/library-reader-preferences-l2c.js'),'utf8');
const prefs=require('../js/library-reader-preferences-l2c.js');

test('L2A offers exactly five new Vietnamese reading font choices with lazy stylesheets',()=>{
  assert.deepEqual(prefs.FONT_OPTIONS.map(f=>f.id),[
    'literata','noto-serif','lora','be-vietnam-pro','source-sans-3'
  ]);
  for(const {id} of prefs.FONT_OPTIONS){
    assert.match(index,new RegExp('<option value="'+id+'">'));
    assert.ok(prefs.FONTS[id]);
    assert.match(prefs.FONT_STYLESHEETS[id],/^https:\/\/fonts\.googleapis\.com\/css2\?/);
    assert.match(prefs.FONT_STYLESHEETS[id],/&display=swap$/);
  }
  assert.match(js,/if\(document\.body\?\.classList\.contains\('dudu-reading-active'\)\)ensureFont/);
  assert.match(index,/DuduReaderPreferencesL2C\?\.apply\(\)/);
});

test('L2A accepts the old 3-field storage record without migration or data loss',()=>{
  const storage=new Map([[prefs.KEY,JSON.stringify({font:'mono',size:22,theme:'sepia'})]]);
  const adapter={
    getItem:key=>storage.get(key)||null,
    setItem:(key,value)=>storage.set(key,value)
  };
  const value=prefs.load(adapter);
  assert.deepEqual(value,{...prefs.DEFAULT,font:'mono',size:22,theme:'sepia'});
  assert.equal(prefs.save(adapter,value),true);
  assert.equal(prefs.load(adapter).font,'mono');
  assert.equal(storage.size,1);
  assert.equal(prefs.KEY,'dudu-reader-preferences-l2c');
});

test('L2A validates ranges, preserves Web and EPUB content, and does not touch Phone',()=>{
  assert.deepEqual(prefs.sanitize({
    font:'lora',size:21,theme:'soft',lineHeight:2.1,
    paragraph:1.6,width:60,align:'justify'
  }),{
    font:'lora',size:21,theme:'soft',lineHeight:2.1,
    paragraph:1.6,width:60,align:'justify'
  });
  assert.deepEqual(prefs.sanitize({
    font:'unknown',size:7,theme:'blue',lineHeight:10,
    paragraph:-1,width:200,align:'right'
  }),prefs.DEFAULT);
  assert.match(css,/\.reader-body \{[\s\S]*?--reader-line-height/);
  assert.match(css,/\.reader-body p \{[\s\S]*?--reader-paragraph-gap/);
  assert.match(css,/data-reader-theme=soft/);
  assert.match(css,/reader-setting-desktop-only \{display:none\}/);
  assert.match(index,/id="reader-settings-reset"/);
  assert.match(index,/data-reader-align="justify"/);
  assert.doesNotMatch(js,/firebase|firestore|updateDoc|setDoc|cyber-phone|phoneAppearanceV568/);
  assert.match(index,/paragraphs\.forEach\(p => \{/);
});

test('L2A reading themes have readable foreground/background contrast',()=>{
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const lum=hex=>rgb(hex).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const [hi,lo]=[lum(a),lum(b)].sort((x,y)=>y-x);return (hi+.05)/(lo+.05);};
  for(const [background,foreground] of [
    ['#131e2c','#e5e7ed'],['#f4e9d4','#382f28'],
    ['#f5f6f3','#232b32'],['#1d2a32','#dce5e1']
  ])assert.ok(contrast(background,foreground)>=7,background+' theme needs AAA contrast');
});

test('L2A mobile reading paper cancels the shell gutter without losing text padding',()=>{
  assert.match(shellCss,/body\.dudu-reading-active \.container \{padding:16px 19px 90px\}/);
  const mobile=css.slice(css.indexOf('@media(max-width:600px)'));
  assert.match(mobile,/\.reader-paper\[data-reader-theme\] \{[\s\S]*?margin-inline:-19px/);
  assert.match(mobile,/padding:clamp\(18px,4vw,22px\) clamp\(15px,4vw,18px\) 26px/);
  assert.match(mobile,/border-radius:0/);
  assert.match(index,/css\/library-reader-l2c\.css\?v=l2a-2/);
});

function mockReader(storageItems=new Map()){
  class Element {
    constructor(id=''){
      this.id=id;this.dataset={};this.attributes={};this.listeners={};this.value='';
      this.hidden=false;this.children=[];this.style={values:{},setProperty:(k,v)=>{this.style.values[k]=v;}};
    }
    addEventListener(type,fn){this.listeners[type]=fn;}
    setAttribute(name,value){this.attributes[name]=value;}
    getAttribute(name){return this.attributes[name];}
    querySelectorAll(selector){return selector==='option[data-reader-legacy]'?this.children.filter(e=>e.dataset.readerLegacy):[];}
    prepend(option){this.children.unshift(option);option.remove=()=>{this.children=this.children.filter(e=>e!==option);};}
    focus(){this.focused=true;}
  }
  const ids=['reader-paper','reader-settings-trigger','reader-settings-popover',
    'reader-settings-close','reader-settings-reset','reader-font-choice',
    'reader-font-size','reader-size-value','reader-line-height',
    'reader-line-height-value','reader-paragraph-space',
    'reader-paragraph-space-value','reader-column-width','reader-column-width-value'];
  const elements=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
  elements['reader-settings-popover'].hidden=true;
  const themeButtons=['dark','sepia','light','soft'].map(theme=>{
    const button=new Element();button.dataset.readerTheme=theme;return button;
  });
  const alignButtons=['left','justify'].map(align=>{
    const button=new Element();button.dataset.readerAlign=align;return button;
  });
  const fontLinks=[];
  let active=false;
  const document={
    readyState:'complete',head:{appendChild:link=>fontLinks.push(link)},
    body:{classList:{contains:name=>name==='dudu-reading-active'&&active}},
    getElementById:id=>elements[id],createElement:()=>new Element(),
    querySelectorAll:selector=>selector.includes('data-reader-theme')?themeButtons:
      selector.includes('data-reader-align')?alignButtons:[],
    querySelector:selector=>fontLinks.find(link=>selector.includes('"'+link.dataset.duduReaderFont+'"'))||null,
    addEventListener:()=>{}
  };
  const localStorage={
    getItem:key=>storageItems.get(key)||null,
    setItem:(key,value)=>storageItems.set(key,value)
  };
  const context={document,localStorage,window:{},console};
  runInNewContext(js,context);
  return {
    api:context.window.DuduReaderPreferencesL2C,elements,themeButtons,alignButtons,fontLinks,
    activate:()=>{active=true;context.window.DuduReaderPreferencesL2C.apply();},
    storageItems
  };
}

test('L2A settings interact live, load only the active font, and persist after reopening',()=>{
  const reader=mockReader();
  assert.equal(reader.fontLinks.length,0,'No external font request before a story is opened');
  reader.activate();
  assert.equal(reader.fontLinks.length,1);
  assert.equal(reader.fontLinks[0].dataset.duduReaderFont,'literata');
  reader.elements['reader-font-choice'].value='lora';
  reader.elements['reader-font-choice'].listeners.change({target:reader.elements['reader-font-choice']});
  reader.elements['reader-line-height'].listeners.input({target:{value:'2.1'}});
  reader.elements['reader-paragraph-space'].listeners.input({target:{value:'1.6'}});
  reader.elements['reader-column-width'].listeners.input({target:{value:'60'}});
  reader.themeButtons.find(button=>button.dataset.readerTheme==='soft').listeners.click();
  reader.alignButtons.find(button=>button.dataset.readerAlign==='justify').listeners.click();
  assert.equal(reader.elements['reader-paper'].dataset.readerTheme,'soft');
  assert.equal(reader.elements['reader-paper'].style.values['--reader-line-height'],'2.1');
  assert.equal(reader.elements['reader-paper'].style.values['--reader-paragraph-gap'],'1.6em');
  assert.equal(reader.elements['reader-paper'].style.values['--reader-column-width'],'60ch');
  assert.equal(reader.elements['reader-paper'].style.values['--reader-align'],'justify');
  assert.equal(reader.fontLinks.length,2,'Only Literata and Lora should load');
  const reopened=mockReader(reader.storageItems);
  reopened.activate();
  assert.equal(reopened.elements['reader-font-choice'].value,'lora');
  assert.equal(reopened.elements['reader-paper'].dataset.readerTheme,'soft');
  assert.equal(reopened.elements['reader-line-height'].value,'2.1');
  assert.equal(reopened.elements['reader-column-width'].value,'60');
  reopened.elements['reader-settings-reset'].listeners.click();
  assert.equal(reopened.elements['reader-paper'].dataset.readerTheme,prefs.DEFAULT.theme);
  assert.equal(JSON.parse(reader.storageItems.get(prefs.KEY)).font,prefs.DEFAULT.font);
});
