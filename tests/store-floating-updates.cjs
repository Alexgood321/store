'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'my_store_runtime.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'live_catalog.json'), 'utf8'));
catalog.meta.last_checked_at = new Date().toISOString();
const meta = catalog.meta.tracked['SURS Pro'];
assert.match(meta.version, /^\d+\.\d+\.\d+$/, 'SURS release uses semantic versioning');
assert.equal(catalog.meta.history['SURS Pro'].at(-1).sha,meta.sha,
  'catalog must contain the current SURS SHA in revision history');

const mark = '})();';
const at = source.lastIndexOf(mark);
assert.ok(at > 0, 'store runtime must have its IIFE terminator');
const instrumented = source.slice(0, at) +
  'window.__qa = {' +
  'setCatalog:function(data){LIVE_DATA=data;LIVE_META=data.meta.tracked;' +
    'LAST_LIVE_URL=CONFIG.catalog+"?_v=test";lastLiveLoadAt=Date.now();},' +
  'isUpdateAvailable:isUpdateAvailable,automaticUpgradeIsSafe:automaticUpgradeIsSafe,' +
  'canPinVerifiedRelease:canPinVerifiedRelease,pinVerifiedRelease:pinVerifiedRelease,' +
  'showUpdateCenter:showUpdateCenter,replaceInstalled:replaceInstalled,' +
  'rollbackUpdate:rollbackUpdate,versionText:versionText,' +
  'notifyGitHubCheck:notifyGitHubCheck};' +
  source.slice(at);

const floating = 'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/surs.js';
let installed = [{url:floating, status:1}];
let running = '4.0.12';
let saves = 0;
const menus = [];
const notices = [];
const db = new Map();
db.set('alexgood321_installed_version_cache_v1', {
  [floating]:{version:meta.version,time:Date.now()}
});
const window = {appready:false,LampaShelfManager:{version:running}};
const Lampa = {
  Plugins:{get:()=>installed, save:()=>{saves++;}},
  Storage:{
    get:(key,fallback)=>db.has(key)?db.get(key):fallback,
    set:(key,value)=>db.set(key,value)
  },
  Noty:{show:message=>notices.push(message)},
  Select:{show:menu=>menus.push(menu)},
  Listener:{follow(){}}
};
vm.runInNewContext(instrumented,{
  window, Lampa, document:{}, console, Date, Math, Uint8Array,
  setTimeout:()=>1, clearTimeout(){}, setInterval:()=>1
});
const t=window.__qa;
t.setCatalog(catalog);

// The CDN now serves 4.0.13, yet Lampa still executes 4.0.12.
// The old implementation incorrectly said there was no update.
assert.equal(t.isUpdateAvailable('SURS Pro'),true);
assert.equal(t.automaticUpgradeIsSafe('SURS Pro',meta),true);
assert.equal(t.versionText(floating,'SURS Pro').update,true);
t.showUpdateCenter(false,false);
assert.equal(menus.at(-1).items.find(x=>x.name==='SURS Pro').canUpdate,true);
assert.equal(t.replaceInstalled('SURS Pro',true),true);
assert.equal(installed[0].url,meta.link);
assert.equal(t.rollbackUpdate(),true);
assert.equal(installed[0].url,floating);

// If the SURS script did not start at all, never automatically update based
// on an unverifiable @main URL. Offer explicit pinned release + rollback.
window.LampaShelfManager=null;
assert.equal(t.isUpdateAvailable('SURS Pro'),false);
assert.equal(t.automaticUpgradeIsSafe('SURS Pro',meta),false);
assert.equal(t.canPinVerifiedRelease('SURS Pro',meta),true);
t.notifyGitHubCheck([],0);
assert.match(notices.at(-1),/запуск не подтверждён/);
t.showUpdateCenter(false,false);
const menu=menus.at(-1);
const row=menu.items.find(x=>x.name==='SURS Pro');
assert.equal(row.canPin,true);
assert.equal(row.canUpdate,false);
menu.onSelect(row);
menus.at(-1).onSelect({action:'confirm'});
assert.equal(installed[0].url,meta.link);
assert.equal(t.rollbackUpdate(),true);
assert.equal(installed[0].url,floating);

// A currently executing release must NOT keep appearing as an update.
window.LampaShelfManager={version:meta.version};
assert.equal(t.isUpdateAvailable('SURS Pro'),false);
assert.equal(t.canPinVerifiedRelease('SURS Pro',meta),false);
t.showUpdateCenter(false,false);
assert.equal(menus.at(-1).items.find(x=>x.name==='SURS Pro').canPin,false);
assert.equal(menus.at(-1).items.find(x=>x.name==='SURS Pro').canUpdate,false);

// Unknown immutable revisions must never be silently overwritten.
window.LampaShelfManager=null;
installed[0].url='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+
  'f'.repeat(40)+'/surs.js';
assert.equal(t.isUpdateAvailable('SURS Pro'),true);
assert.equal(t.automaticUpgradeIsSafe('SURS Pro',meta),false);
assert.equal(t.canPinVerifiedRelease('SURS Pro',meta),false);

// Cached @main newer than the central catalog must not be downgraded.
installed[0].url=floating;
const cache=db.get('alexgood321_installed_version_cache_v1');
cache[floating]={version:'99.0.0',time:Date.now()};
window.LampaShelfManager={version:running};
assert.equal(t.isUpdateAvailable('SURS Pro'),false);
assert.equal(t.automaticUpgradeIsSafe('SURS Pro',meta),false);
assert.equal(t.canPinVerifiedRelease('SURS Pro',meta),false);

// If the floating source version is unknown, an older running version alone
// cannot authorize automatic replacement. Explicit manual SHA pin is allowed.
cache[floating]={version:'',time:Date.now()};
assert.equal(t.isUpdateAvailable('SURS Pro'),true);
assert.equal(t.automaticUpgradeIsSafe('SURS Pro',meta),false);
assert.equal(t.canPinVerifiedRelease('SURS Pro',meta),true);
const before=saves;
assert.equal(t.replaceInstalled('SURS Pro',true),false);
assert.equal(saves,before);
assert.ok(saves>=4,'upgrades and rollbacks must call Lampa.Plugins.save()');
console.log('PASS My Store: floating URLs, live version, manual SHA pin, rollback, downgrade safety');
