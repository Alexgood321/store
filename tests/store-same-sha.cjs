'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const runtime=fs.readFileSync(path.join(__dirname,'../my_store_runtime.js'),'utf8');
new vm.Script(runtime);
const point=runtime.lastIndexOf('})();');
assert.ok(point>0);
const injected=runtime.slice(0,point)+
  'window.__sameShaQA={set:function(data){LIVE_DATA=data;LIVE_META=data.meta.tracked;},'+
  'safe:automaticUpgradeIsSafe,verified:verifiedSameVersionRevision,'+
  'plan:getSafeBatchPlan,text:versionText,skipped:skippedBatchText};'+
  runtime.slice(point);
const oldSHA='a'.repeat(40),latestSHA='b'.repeat(40),unknownSHA='c'.repeat(40);
const repo='Alexgood321/lampa-sync-pro',file='lampa-sync-pro.js';
const url=sha=>'https://cdn.jsdelivr.net/gh/'+repo+'@'+sha+'/'+file;
const info={repo,path:file,ref:'main',owned:true,sha:latestSHA,version:'0.1.15',link:url(latestSHA)};
const manifest={results:[{title:'Мои',results:[{name:'Lampa Sync Pro',link:info.link}]}],
  meta:{tracked:{'Lampa Sync Pro':info},history:{'Lampa Sync Pro':[
    {sha:oldSHA,version:'0.1.15',published_at:'2026-11-07T01:00:00Z'},
    {sha:latestSHA,version:'0.1.15',published_at:'2026-11-07T02:00:00Z'}
  ]},last_checked_at:new Date().toISOString()}};
let installed={url:url(oldSHA),name:'Lampa Sync Pro',status:1};
const storage={};
const Lampa={Plugins:{get:()=>[installed]},Storage:{
    get:(k,def)=>Object.hasOwn(storage,k)?storage[k]:def,
    set:(k,v)=>{storage[k]=v;}
  },Listener:{follow(){}},
  Noty:{show(){}}};
const window={appready:false};
vm.runInNewContext(injected,{window,Lampa,document:{},console,setTimeout(){},setInterval(){}});
const qa=window.__sameShaQA;
qa.set(manifest);
assert.equal(qa.safe('Lampa Sync Pro',info),true,'known later SHA with identical version is safe');
assert.equal(qa.plan().items.length,1,'same-version forward commit must be included');
assert.equal(qa.plan().skipped.length,0,'no false skipped warning for known build');
assert.match(qa.text(installed.url,'Lampa Sync Pro').text,/Новая сборка: 0\.1\.15/);
assert.doesNotMatch(qa.text(installed.url,'Lampa Sync Pro').text,/Доступна: 0\.1\.15/);

installed.url=url(unknownSHA);
storage.alexgood321_installed_version_cache_v1={
  [installed.url]:{version:'0.1.15',time:Date.now()}
};
assert.equal(qa.safe('Lampa Sync Pro',info),false,'unknown SHA may not be upgraded');
assert.deepEqual(Array.from(qa.plan().skipped),['Lampa Sync Pro']);
assert.match(qa.skipped(qa.plan().skipped),/Lampa Sync Pro/);

installed.url=url(oldSHA);
manifest.meta.history['Lampa Sync Pro'].reverse();
assert.equal(qa.safe('Lampa Sync Pro',info),false,'older central SHA is not a forward update');
manifest.meta.history['Lampa Sync Pro'].reverse();
assert.equal(qa.safe('Lampa Sync Pro',info),true);
installed.url=url(latestSHA);
assert.equal(qa.plan().items.length,0,'already latest does not need upgrade');

installed.url=url(unknownSHA);
storage.alexgood321_installed_version_cache_v1[installed.url]={
  version:'0.1.16',time:Date.now()
};
assert.equal(qa.safe('Lampa Sync Pro',info),false,'newer local version cannot be downgraded');
console.log('PASS My Store: verified same-version forward SHA update, safe fallback, no downgrade, named skipped diagnostics');
