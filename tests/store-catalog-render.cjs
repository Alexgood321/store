'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const runtime=fs.readFileSync(path.join(__dirname,'../my_store_runtime.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../live_catalog.json'),'utf8'));
assert.ok(catalog.results.some(g=>g.title==='Мои' &&
  g.results.some(p=>p.name==='Lampa Sync Pro')),
  'public catalog must include registered plugin');
catalog.meta.last_checked_at=new Date().toISOString().replace(/\.\d+Z$/,'Z');
const calls=[],blobs=[],revoked=[];
const win={appready:false,
  Blob:class Blob {constructor(parts,opts){this.parts=parts;this.opts=opts;}},
  URL:{
    createObjectURL(blob){blobs.push(blob);return 'blob:https://lampa.example/catalog-1';},
    revokeObjectURL(url){revoked.push(url);}
  }};
const Lampa={
  Reguest:function(){this.silent=(url,onSuccess)=>{calls.push(url);onSuccess(catalog);};},
  Storage:{get:(k,def)=>def,set(){}},
  Plugins:{get:()=>[],loaded:()=>[],save(){}},
  Extensions:{show(opts){win.__storeShow=opts;},render(){return null;}},
  Listener:{follow(){}},
  Manifest:{plugins:{}},
  Noty:{show(){}}
};
const end=runtime.lastIndexOf('})();');
assert.ok(end>0);
const instrumented=runtime.slice(0,end)+
  'window.__storeRenderQA={open:openStore,release:releaseNativeStoreURL,'+
  'native:nativeStoreURL,load:loadLive};'+runtime.slice(end);
vm.runInNewContext(instrumented,{window:win,Lampa,document:{},console,
  setTimeout(){return 1;},setInterval(){return 1;}});
win.__storeRenderQA.open();
assert.equal(calls.length,1,'open must fetch current catalog exactly once');
assert.equal(blobs.length,1,'native Lampa receives an in-memory snapshot');
assert.equal(win.__storeShow.store,'blob:https://lampa.example/catalog-1');
const received=JSON.parse(blobs[0].parts.join(''));
assert.ok(received.results.find(g=>g.title==='Мои')
  .results.some(p=>p.name==='Lampa Sync Pro'));
assert.equal(received.meta.tracked['Lampa Sync Pro'].version,catalog.meta.tracked['Lampa Sync Pro'].version);
win.__storeShow.onClose();
assert.deepEqual(revoked,['blob:https://lampa.example/catalog-1']);
delete win.Blob;
win.__storeRenderQA.load(()=>{},true,true,true);
const normal=win.__storeRenderQA.native(calls[calls.length-1]);
assert.ok(normal.startsWith('https://raw.githubusercontent.com/'),
  'legacy TV without Blob must use remote JSON');
console.log('PASS My Store: one verified catalog for native Lampa; missing-card regression and Blob cleanup');
