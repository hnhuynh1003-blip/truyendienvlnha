'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,statSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const root=join(__dirname,'..');
const src=name=>readFileSync(join(root,name),'utf8');

test('Wallet P3 shows one owned Silver card, an upgrade sheet and an honest exchange preview',()=>{
 const html=src('index.html'),css=src('css/dudu-wallet-v1.css');
 assert.match(html,/id="phone-app-wallet"/);
 assert.match(html,/id="dudu-wallet-owner-name"/);
 assert.match(html,/id="dudu-wallet-visibility"[^>]+toggleDuduWalletVisibility/);
 assert.match(html,/data-wallet-card-tier="silver"/);
 assert.match(html,/id="dudu-wallet-tier-sheet" hidden/);
 assert.match(html,/id="dudu-wallet-upgrade-button"/);
 assert.doesNotMatch(html,/class="dudu-wallet-actions"/);
 assert.doesNotMatch(html,/class="dudu-wallet-mark">GOLD/);
 for(const tier of ['silver','gold','diamond'])assert.match(html,new RegExp('data-wallet-card-select="'+tier+'"'));
 assert.match(html,/id="dudu-wallet-card-preview" hidden/);
 assert.match(html,/dudu-bank-card-tier" id="dudu-wallet-card-tier">◈ SILVER/);
 assert.match(html,/CHƯA MỞ/);
 assert.match(html,/onclick="openPhoneApp\('shop'\)"/);
 assert.match(html,/onclick="openPhoneApp\('fun'\)"/);
 assert.match(html,/onclick="openPhoneApp\('arcade'\)"/);
 assert.match(html,/DuduPersonalArcadeUIV1\?\.openExchange\?\.\(\)/);
 assert.match(html,/CHƯA KÍCH HOẠT/);
 assert.match(html,/Không phải tài khoản ngân hàng hay tiền thật/);
 for(const tier of ['silver','gold','diamond']){
  assert.match(css,new RegExp('dudu-'+tier+'-card-p2\\.webp'));
  const art=statSync(join(root,'assets/wallet/dudu-'+tier+'-card-p2.webp'));
  assert.ok(art.size>50000&&art.size<350000,tier+' artwork stays mobile-friendly');
 }
 assert.match(css,/\.dudu-wallet-tier-sheet\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media \(max-width:355px\)/);
 assert.match(css,/aspect-ratio:1\.78/);
 assert.match(html,/Chỉ xem mẫu · Chưa thu phí hoặc kích hoạt đặc quyền/);
});

test('Wallet tier sheet always reverts to Silver when closed',()=>{
 const html=src('index.html');
 const start=html.indexOf('function toggleDuduWalletTierSheet(force)');
 const end=html.indexOf('// Wallet card controls are display-only',start);
 assert.ok(start>0&&end>start);
 const sheet={hidden:true};
 const button={attrs:{},setAttribute(key,value){this.attrs[key]=value;}};
 const selected=[];
 const ctx={document:{getElementById:id=>id==='dudu-wallet-tier-sheet'?sheet:button},
  selectDuduWalletCard:tier=>selected.push(tier)};
 vm.runInNewContext(html.slice(start,end),ctx);
 assert.equal(ctx.toggleDuduWalletTierSheet(),true);
 assert.equal(sheet.hidden,false);
 assert.equal(button.attrs['aria-expanded'],'true');
 assert.equal(ctx.toggleDuduWalletTierSheet(false),false);
 assert.equal(sheet.hidden,true);
 assert.deepEqual(selected,['silver']);
});

test('Rank selection changes the preview only, not ownership or balances',()=>{
 const html=src('index.html');
 const start=html.indexOf('function selectDuduWalletCard(tier)');
 const end=html.indexOf('let duduWalletMasked=false;',start);
 assert.ok(start>=0&&end>start);
 const source=html.slice(start,end);
 assert.doesNotMatch(source,/localStorage|userProfile|\.currency\s*=|firebase|saveCurrentAccount/);
 const card={dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
 const labels=new Map(['dudu-wallet-card-tier','dudu-wallet-card-edition','dudu-wallet-card-preview','dudu-wallet-brand-seal']
  .map(id=>[id,{textContent:'',hidden:false}]));
 const detailFrame={dataset:{}};
 const tabs=['silver','gold','diamond'].map(tier=>({dataset:{walletCardSelect:tier},attrs:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;}}));
 const details=['silver','gold','diamond'].map(tier=>({dataset:{walletTierDetail:tier},hidden:false}));
 const doc={querySelector:selector=>selector.includes('.dudu-bank-tier-details')?detailFrame:card,
  querySelectorAll:selector=>selector.includes('card-select')?tabs:details,
  getElementById:id=>labels.get(id)||null};
 const context={document:doc};vm.runInNewContext(source,context);
 assert.equal(context.selectDuduWalletCard('diamond'),true);
 assert.equal(card.dataset.walletCardTier,'diamond');
 assert.equal(labels.get('dudu-wallet-brand-seal').textContent,'◆');
 assert.equal(detailFrame.dataset.walletDetailTier,'diamond');
 assert.equal(labels.get('dudu-wallet-card-preview').hidden,false);
 assert.equal(details.find(d=>d.dataset.walletTierDetail==='diamond').hidden,false);
 assert.equal(details.find(d=>d.dataset.walletTierDetail==='silver').hidden,true);
 assert.equal(tabs.find(t=>t.dataset.walletCardSelect==='diamond').attrs['aria-pressed'],'true');
 assert.equal(context.selectDuduWalletCard('silver'),true);
 assert.equal(labels.get('dudu-wallet-card-preview').hidden,true);
 assert.equal(context.selectDuduWalletCard('platinum'),false);
});

test('Wallet P2 can mask only the display; legacy balance and Arcade state never change',()=>{
 const html=src('index.html');
 const start=html.indexOf('let duduWalletMasked=false;');
 const end=html.indexOf('function buyShopItem',start);
 assert.ok(start>=0&&end>start);
 const script=html.slice(start,end);
 assert.doesNotMatch(script,/\.currency\s*=|localStorage|firebase|setDoc|updateDoc|saveCurrentAccount/);
 const nodes=new Map();
 for(const id of ['dudu-wallet-system-amount','dudu-wallet-arcade-balance',
  'dudu-wallet-owner-name','dudu-wallet-visibility']){
  nodes.set(id,{textContent:'',attributes:{},setAttribute(key,value){this.attributes[key]=value;}});
 }
 const profile={currency:350,name:'An Du'};
 const context={document:{getElementById:id=>nodes.get(id)||null},
  window:{DuduPersonalArcadeUIV1:{peekBalance:()=>12500}},userProfile:profile};
 vm.runInNewContext(script,context);
 context.renderWallet();
 assert.equal(nodes.get('dudu-wallet-system-amount').textContent,'350');
 assert.equal(nodes.get('dudu-wallet-arcade-balance').textContent,12500);
 assert.equal(nodes.get('dudu-wallet-owner-name').textContent,'An Du');
 context.toggleDuduWalletVisibility();
 assert.equal(nodes.get('dudu-wallet-system-amount').textContent,'••••');
 assert.equal(nodes.get('dudu-wallet-visibility').attributes['aria-pressed'],'true');
 context.toggleDuduWalletVisibility();
 assert.equal(nodes.get('dudu-wallet-system-amount').textContent,'350');
 assert.equal(profile.currency,350);
});
