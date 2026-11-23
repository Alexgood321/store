'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../my_store_runtime.js'),'utf8');
new vm.Script(source,{filename:'my_store_runtime.js'});
const end=source.lastIndexOf('})();');
assert.ok(end>0);
const instrumented=source.slice(0,end)+
  'window.qa={setData:function(v){LIVE_DATA=v;LIVE_META=v.meta.tracked;'+
  'LAST_LIVE_URL=CONFIG.catalog+"?_test=1";},notify:notifyNewCatalogReleases,'+
  'fresh:catalogIsFresh,available:isUpdateAvailable};\n'+source.slice(end);

const current=JSON.parse(fs.readFileSync(path.join(__dirname,'../live_catalog.json'),'utf8'));
const original=current.meta.tracked['SURS Pro'];
const older=current.meta.history['SURS Pro'].find(x=>x.version==='4.0.14');
assert.ok(older,'SURS 4.0.14 must exist in verified release history');

const db=new Map(), alerts=[];
const item={url:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+older.sha+'/surs.js',status:1};
const win={appready:false,LampaShelfManager:{version:'4.0.14'}};
const Lampa={
 Plugins:{get:()=>[item],save(){}},
 Storage:{get:(key,fallback)=>db.has(key)?db.get(key):fallback,
   set:(key,value)=>db.set(key,value)},
 Noty:{show:msg=>alerts.push(msg)},
 Listener:{follow(){}}
};
vm.runInNewContext(instrumented,{window:win,Lampa,document:{},console,
  Date,Math,Uint8Array,setTimeout(){},clearTimeout(){}});
const test=win.qa;
const data={meta:{last_checked_at:new Date().toISOString(),tracked:{'SURS Pro':{...original}},
  history:{'SURS Pro':current.meta.history['SURS Pro']}},results:current.results};
test.setData(data);
assert.equal(test.available('SURS Pro'),true);
let announced=test.notify([]);
assert.equal(announced.length,1,'available update announced once');
assert.match(alerts.at(-1),/SURS Pro 4\.0\.15/);
assert.equal(test.notify([]).length,0,'same SHA is not announced twice');
assert.equal(alerts.length,1);

const nextSHA='a'.repeat(40);
data.meta.tracked['SURS Pro']={...original,sha:nextSHA,version:'4.0.16',
  link:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+nextSHA+'/surs.js'};
test.setData(data);
assert.equal(test.notify([]).length,1,'later SHA produces next notice');
assert.equal(alerts.length,2);

const thirdSHA='b'.repeat(40);
data.meta.tracked['SURS Pro']={...original,sha:thirdSHA,version:'4.0.17',
  link:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+thirdSHA+'/surs.js'};
test.setData(data);
item.status=0;
assert.equal(test.notify([]).length,0,'disabled plugin is never announced');
assert.equal(alerts.length,2);
item.status=1;

data.meta.last_checked_at=new Date(Date.now()-13*60*60*1000).toISOString();
assert.equal(test.fresh(),false);
assert.equal(test.notify([]).length,0,'stale source is not announced');
data.meta.last_checked_at=new Date().toISOString();

data.meta.tracked['SURS Pro']={...original,sha:thirdSHA,version:'4.0.17',
  link:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+thirdSHA+'/surs.js'};
item.url=data.meta.tracked['SURS Pro'].link;
assert.equal(test.notify([]).length,1,'already-pinned newer SHA with older runtime signals restart');
assert.match(alerts.at(-1),/нужен перезапуск/);
assert.equal(alerts.length,3);

// Auto-replaced URLs have a separate notification and should be
// checkpointed without a duplicate update-available toast.
data.meta.tracked['SURS Pro']={...original,sha:'c'.repeat(40),version:'4.0.18',
  link:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+'c'.repeat(40)+'/surs.js'};
item.url='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+older.sha+'/surs.js';
test.setData(data);
assert.equal(test.notify(['SURS Pro']).length,0);
assert.equal(alerts.length,3);
assert.equal(test.notify([]).length,0,'auto-updated release is checkpointed');

// A running build newer than the catalog must never cause an older
// update notice or a silent downgrade.
data.meta.tracked['SURS Pro']={...original,sha:'d'.repeat(40),version:'4.0.19',
  link:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+'d'.repeat(40)+'/surs.js'};
win.LampaShelfManager.version='9.0.0';
test.setData(data);
assert.equal(test.notify([]).length,0);
assert.equal(alerts.length,3);

assert.match(source,/setInterval\(periodicCatalogCheck,60\*1000\)/,
  'foreground polling is once per minute');
assert.match(source,/Date\.now\(\) - lastLiveLoadAt > 60\*1000/,
  'foreground resumes stale catalog checks');
console.log('PASS My Store release alerts: SHA dedup, fresh/stale, disabled, restart, batch, downgrade, 60s polling');
