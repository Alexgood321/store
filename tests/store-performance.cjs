'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const loader=fs.readFileSync(path.join(root,'my_store_loader.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'my_store_runtime.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'live_catalog.json'),'utf8'));
new vm.Script(loader); new vm.Script(runtime);

function cachedStartup() {
  const sha='78f217e936105a3efbd5999896ff8808f84be39d';
  const storage={alexgood321_store_boot_last_good_v1:{sha,version:'3.5.0'}};
  const requests=[], scripts=[];
  const browser={appready:true};
  const doc={
    createElement() {return {src:'',onload:null,onerror:null,parentNode:null};},
    head:{appendChild(script) {
      scripts.push(script.src);
      browser.__AlexgoodStoreRuntime={sha,version:'3.5.0',ready:true};
      browser.__AlexgoodStoreBootReady(browser.__AlexgoodStoreRuntime);
      if (script.onload) script.onload();
    }}
  };
  const lampa={
    Storage:{get:(key,f)=>Object.hasOwn(storage,key)?storage[key]:f,set:(key,v)=>{storage[key]=v;}},
    Reguest:function(){this.silent=(url,success,error)=>requests.push(url);},
    Noty:{show(){}}
  };
  vm.runInNewContext(loader,{window:browser,document:doc,Lampa:lampa,console,setTimeout(){}});
  assert.equal(browser.AlexgoodStoreBootstrap.state.status,'ready');
  assert.equal(scripts.length,1,'cached runtime started without network result');
  assert.equal(requests.length,1,'remote catalog still checks in parallel');
  assert.ok(scripts[0].includes(sha));
  assert.ok(browser.AlexgoodStoreBootstrap.state.metrics.boot_ms>=0);
}
cachedStartup();

const oldSha='a'.repeat(40);
catalog.meta.last_checked_at=new Date().toISOString().replace(/\.\d+Z$/,'Z');
catalog.meta.history=catalog.meta.history || {};
catalog.meta.history['SURS Pro']=[{sha:oldSha,version:'3.8.2',published_at:'2026-11-01T00:00:00Z'}];
const requests=[],settings={};
const browser={appready:false,__AlexgoodStoreCatalogSnapshot:{
  data:catalog,url:'https://raw.githubusercontent.com/Alexgood321/store/main/live_catalog.json?_v=123',
  received_at:Date.now()
}};
const lampa={
  Reguest:function(){this.silent=(url,success,error)=>{requests.push(url);error('unexpected request');};},
  Storage:{get:(key,f)=>Object.hasOwn(settings,key)?settings[key]:f,set:(key,v)=>{settings[key]=v;}},
  Plugins:{get:()=>[],loaded:()=>[],save(){}},
  Listener:{follow(){}},
  Noty:{show(){}}
};
const end=runtime.lastIndexOf('})();');
const instrumented=runtime.slice(0,end)+
  'window.__perfQA={load:loadLive,version:installedVersion,known:catalogIsKnownGood,'+
  'fresh:catalogIsFresh,performance:STORE_PERF};'+runtime.slice(end);
vm.runInNewContext(instrumented,{window:browser,Lampa:lampa,document:{},console,setTimeout(){},setInterval(){}});
let resolved=null;
browser.__perfQA.load((url,applied)=>{resolved={url,applied};},false,true,true);
assert.ok(resolved,'loader snapshot must be consumed');
assert.equal(requests.length,0,'shared catalog avoids duplicate startup HTTP request');
assert.equal(browser.__perfQA.performance.catalog_cache_hits,1);
assert.equal(browser.__perfQA.known(),true);
const oldUrl='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+oldSha+'/surs.js';
assert.equal(browser.__perfQA.version(oldUrl,catalog.meta.tracked['SURS Pro']),'3.8.2');
assert.equal(requests.length,0,'old pin version resolves from bounded catalog history');
assert.match(runtime,/skinObserver\.observe\(root, \{subtree:true,childList:true\}\)/);
assert.ok(!runtime.includes('My Store v3.4.5'),'version label must not be hard-coded');
assert.match(runtime,/CONFIG\.version \+ '";font-size:/);
console.log('PASS performance: local-first bootstrap, shared startup JSON, catalog history, filtered DOM observer and current version');
