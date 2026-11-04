'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'my_store_loader.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'my_store_runtime.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'live_catalog.json'), 'utf8'));

assert.ok(!loader.includes('api.github.com'), 'bootstrap must never call GitHub API');
assert.ok(!runtime.includes('api.github.com'), 'runtime must never call GitHub API');
assert.ok(catalog.meta.last_checked_at, 'catalog must carry central verification timestamp');

function loadBootScenario({failCatalog=false, stale=false}={}) {
  const requests=[], alerts=[], storage={}, expected=catalog.meta.tracked['My Store'];
  const browser = {appready:true};
  const doc = {
    createElement() { return {src:'',onload:null,onerror:null,parentNode:null}; },
    head:{appendChild(script){
      const sha = script.src.match(/@([a-f0-9]{40})\//)?.[1] ||
        script.src.match(/store\/([a-f0-9]{40})\//)?.[1];
      assert.ok(sha, 'loaded runtime must be SHA-pinned');
      browser.__AlexgoodStoreRuntime = {sha,version:expected.version,ready:true};
      browser.__AlexgoodStoreBootReady(browser.__AlexgoodStoreRuntime);
      script.onload();
    }}
  };
  const lampa = {
    Storage:{get:(k,d)=>Object.hasOwn(storage,k)?storage[k]:d,
      set:(k,v)=>{storage[k]=v;}},
    Noty:{show:msg=>alerts.push(msg)},
    Reguest:function(){this.silent=(url,ok,fail)=>{
      requests.push(url);
      if(url.includes('live_catalog.json')){
        if(failCatalog)return fail('offline');
        const data=JSON.parse(JSON.stringify(catalog));
        if(stale)data.meta.last_checked_at='2000-01-01T00:00:00Z';
        return ok(data);
      }
      if(url.includes('my_store_release.json'))return ok({
        runtime:{sha:expected.sha,path:'my_store_runtime.js',version:expected.version}
      });
      throw new Error('Unexpected bootstrap URL: '+url);
    }}
  };
  vm.runInNewContext(loader,{window:browser,document:doc,Lampa:lampa,console,setTimeout:()=>1});
  assert.equal(browser.AlexgoodStoreBootstrap.state.status,'ready');
  assert.equal(browser.AlexgoodStoreBootstrap.state.sha,expected.sha);
  assert.ok(storage.alexgood321_store_boot_last_good_v1);
  assert.ok(requests.every(url=>!url.includes('api.github.com')));
  return {requests,source:browser.AlexgoodStoreBootstrap.state.source,ready:browser.AlexgoodStoreBootstrap.state.status};
}

const fresh=loadBootScenario();
assert.equal(fresh.source,'central-catalog');
const fallback=loadBootScenario({failCatalog:true});
assert.equal(fallback.source,'release-manifest');
const outdated=loadBootScenario({stale:true});
assert.equal(outdated.source,'stale-catalog');

function loadRuntimeAutoUpdate() {
  const origin=runtime.lastIndexOf('})();');
  assert.ok(origin>0);
  const injected=runtime.slice(0,origin)+
    'window.__qa={load:loadLive,periodic:periodicCatalogCheck};'+runtime.slice(origin);
  const requests=[], saved=[];
  const installed=[{
    url:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-hdrezka@1111111111111111111111111111111111111111/rezka.js',
    name:'HDREZKA',status:1
  }];
  const storage={alexgood321_auto_own_v1:true};
  const app={
    Reguest:function(){this.silent=(url,success,fail)=>{
      requests.push(url);assert.ok(url.includes('live_catalog.json'));success(catalog);
    }},
    Plugins:{get:()=>installed,save:()=>saved.push(installed[0].url),loaded:()=>[]},
    Storage:{get:(k,d)=>Object.hasOwn(storage,k)?storage[k]:d,
      set:(k,v)=>{storage[k]=v;}},
    Noty:{show(){}},Listener:{follow(){}}
  };
  const browser={appready:false};
  vm.runInNewContext(injected,{
    window:browser,Lampa:app,document:{},console,
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1
  });
  let callback;
  browser.__qa.load((url,applied)=>{callback={url,applied};},true,true);
  assert.ok(callback.url.includes('live_catalog.json'));
  assert.ok(callback.applied.includes('HDREZKA'));
  assert.equal(installed[0].url,catalog.meta.tracked.HDREZKA.link);
  assert.equal(saved.length,1);
  assert.ok(storage.alexgood321_device_history_v1);
  assert.ok(requests.every(url=>!url.includes('api.github.com')));
  return requests.length;
}
const runtimeRequests=loadRuntimeAutoUpdate();
console.log('PASS centralized My Store: fresh/stale/fallback bootstrap, 0 client REST calls, automatic URL replacement; runtime catalog requests='+runtimeRequests);
