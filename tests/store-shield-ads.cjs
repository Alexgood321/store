'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const seed=JSON.parse(fs.readFileSync(path.join(base,'catalog_seed.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(base,'sync_sources.json'),'utf8'));
const runtime=fs.readFileSync(path.join(base,'my_store_runtime.js'),'utf8');
const NAME='Lampa Shield Ads';
const publisher='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/shield-ads/lampa-shield-ads.js';
const pluginName='alexgood321/lampa-plugins/shield-ads/lampa-shield-ads.js';
const own=seed.results.find(g=>g.title==='Мои');
const system=seed.results.find(g=>g.title==='Системные и ТВ');
for(const section of [own,system]) {
  assert.ok(section,'catalog section missing');
  const items=section.results.filter(item=>item.name===NAME);
  assert.equal(items.length,1,'Shield Ads must occur exactly once per section');
  assert.equal(items[0].link,publisher);
  assert.equal(items[0].version,'1.0.0');
  assert.ok(items[0].descr.includes('VAST'));
}
assert.deepEqual(JSON.parse(JSON.stringify(config.tracked[NAME])),{
  repo:'Alexgood321/lampa-plugins',path:'shield-ads/lampa-shield-ads.js',ref:'main',owned:true
});
const code=runtime.slice(0,runtime.lastIndexOf('})();'))+
  'window.qa={parse:parseSourceVersion,own:isOwnInstalledPlugin,'+
  'key:installedGithubKey,match:matchingInstalled,plan:getSafeBatchPlan,'+
  'safe:automaticUpgradeIsSafe,available:isUpdateAvailable,setMeta:function(k,m){LIVE_META[k]=m;}};\n'+
  runtime.slice(runtime.lastIndexOf('})();'));
const previous='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+
  '1111111111111111111111111111111111111111/shield-ads/lampa-shield-ads.js';
const latest='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+
  '2222222222222222222222222222222222222222/shield-ads/lampa-shield-ads.js';
const installed=[{url:previous,name:NAME,status:1}];
const cached={
  alexgood321_installed_version_cache_v1:{
    [previous]:{version:'0.9.0',time:Date.now()}
  }
};
const lampa={
  Plugins:{get:()=>installed,loaded:()=>[],save(){}},
  Storage:{get:(k,d)=>Object.hasOwn(cached,k)?cached[k]:d,set:(k,v)=>{cached[k]=v;}}
};
const browser={appready:false};
vm.runInNewContext(code,{window:browser,Lampa:lampa,console,document:{},
  setTimeout(){return 1;},clearTimeout(){}});
const qaApi=browser.qa;
const header='/**\n * Lampa Shield Ads v1.0.0\n * Test.\n */\n(function () { var x=1; })();';
assert.equal(qaApi.parse(header),'1.0.0');
assert.equal(qaApi.key(previous),pluginName);
assert.equal(qaApi.key(publisher),pluginName);
assert.equal(qaApi.own(previous),true);
assert.equal(qaApi.own(publisher),true);
const meta={repo:'Alexgood321/lampa-plugins',path:'shield-ads/lampa-shield-ads.js',
  sha:'2222222222222222222222222222222222222222',
  ref:'main',version:'1.0.0',owned:true,link:latest};
qaApi.setMeta(NAME,meta);
assert.equal(qaApi.match(NAME,meta).length,1,'@SHA installed copy matched');
assert.equal(qaApi.available(NAME),true,'older SHA is recognized');
assert.equal(qaApi.safe(NAME,meta),true,'older semantic version can be upgraded');
const plan=qaApi.plan();
assert.equal(plan.items.length,1,'one-click update includes Shield Ads');
assert.equal(plan.items[0].to,latest);
installed[0].status=0;
assert.equal(qaApi.plan().items.length,0,'disabled plugins are never rewritten');
installed[0].status=1;
cached.alexgood321_installed_version_cache_v1[previous].version='1.0.0';
assert.equal(qaApi.safe(NAME,meta),false,'same semantic version must not auto-upgrade');
assert.ok(!runtime.includes('api.github.com'),'plugin client must not use GitHub REST');
console.log('PASS Lampa Shield Ads: own catalog, live version parsing, installed matching, safe batch update and disabled protection');
