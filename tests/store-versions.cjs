'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'my_store_runtime.js'), 'utf8');
new vm.Script(source, {filename:'my_store_runtime.js'});
const marker = '})();';
const last = source.lastIndexOf(marker);
assert.ok(last > 0);
const instrumented = source.slice(0,last) +
  "window.__storeTests = {" +
  "setMeta:function(value){LIVE_META=value;}," +
  "setData:function(value){LIVE_DATA=value;LIVE_META=value.meta.tracked;}," +
  "setOverride:function(name,value){LIVE_OVERRIDES[name]=value;}," +
  "applyLiveOverrides:applyLiveOverrides," +
  "findInstalled:findInstalled,matchingInstalled:matchingInstalled," +
  "isUpdateAvailable:isUpdateAvailable,replaceInstalled:replaceInstalled," +
  "rollbackUpdate:rollbackUpdate,metadataForURL:metadataForURL," +
  "versionText:versionText,runtimeSuffix:runtimeSuffix};\n" +
  source.slice(last);
const db = new Map();
const oldSha = '02f879c9d18f05b9bee19baf09d1203bae5f0e18';
const newSha = '41261ed85b2e4ca1ac7f7ef35785b1a4581c91ee';
const repo = 'Alexgood321/lampa-plugins';
const pathName = 'surs.js';
const oldUrl = 'https://cdn.jsdelivr.net/gh/'+repo+'@'+oldSha+'/'+pathName;
const newUrl = 'https://cdn.jsdelivr.net/gh/'+repo+'@'+newSha+'/'+pathName;
const records = [{url:oldUrl,status:1}];
let saves = 0;
const window = {appready:false,LampaShelfManager:{version:'3.8.2'}};
const Lampa = {
  Plugins:{get:()=>records.slice(),save:()=>{saves++;}},
  Storage:{get:(k,f)=>db.has(k)?db.get(k):f,set:(k,v)=>db.set(k,v)},
  Noty:{show:()=>{}}
};
vm.runInNewContext(instrumented, {window,Lampa,console,Date,Math,Uint8Array});
const t = window.__storeTests;
const oldMeta = {
  repo,path:pathName,ref:'main',owned:true,sha:oldSha,version:'3.8.2',
  link:oldUrl,published_at:'2026-11-04T11:13:39Z'
};
const newMeta = {
  repo,path:pathName,ref:'main',owned:true,sha:newSha,version:'3.8.3',
  link:newUrl,published_at:'2026-11-04T13:55:45Z'
};
let passed=0;
function check(label,fn){fn();process.stdout.write('✓ '+label+'\n');passed++;}

db.set('alexgood321_installed_version_cache_v1', {
  [oldUrl]:{version:'3.8.2',time:Date.now()}
});
t.setMeta({'SURS Pro':newMeta});
check('old commit is found by stable repository/path without installed name',()=>{
  assert.equal(t.findInstalled('SURS Pro',newMeta),records[0]);
  assert.equal(t.matchingInstalled('SURS Pro',newMeta).length,1);
  assert.equal(t.isUpdateAvailable('SURS Pro'),true);
});
check('old URL resolves new metadata for installed card',()=>{
  assert.equal(t.metadataForURL(oldUrl).name,'SURS Pro');
});
check('automatic URL replacement is saved and can be rolled back',()=>{
  assert.equal(t.replaceInstalled('SURS Pro',true),true);
  assert.equal(records[0].url,newUrl);
  assert.ok(saves>0);
  assert.equal(db.get('plugins'),undefined);
  assert.equal(t.rollbackUpdate(),true);
  assert.equal(records[0].url,oldUrl);
});
check('link version differs from currently executing SURS version',()=>{
  records[0].url=newUrl;
  assert.match(t.versionText(newUrl,'SURS Pro').text,/Сохранённая ссылка: 3\.8\.3/);
  assert.match(t.versionText(newUrl,'SURS Pro').text,/Запущена: 3\.8\.2/);
  assert.match(t.versionText(newUrl,'SURS Pro').text,/нужен перезапуск Lampa/);
});
check('when running SURS catches up, restart hint disappears',()=>{
  window.LampaShelfManager.version='3.8.3';
  assert.doesNotMatch(t.versionText(newUrl,'SURS Pro').text,/нужен перезапуск/);
});
check('verified manual GitHub revision overrides stale catalog data in session',()=>{
  const copied = JSON.parse(JSON.stringify(oldMeta));
  const data = {results:[{title:'Мои',results:[{name:'SURS Pro',version:'3.8.2',link:oldUrl}]}],
    meta:{tracked:{'SURS Pro':copied}}};
  t.setData(data);
  t.setOverride('SURS Pro',newMeta);
  t.applyLiveOverrides();
  assert.equal(data.meta.tracked['SURS Pro'].version,'3.8.3');
  assert.equal(data.results[0].results[0].link,newUrl);
});
console.log('My Store tests: '+passed+' passed.');
