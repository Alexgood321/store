'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../my_store_runtime.js'),'utf8');
const at=source.lastIndexOf('})();');
const code=source.slice(0,at)+
  'window.qa={setRoot:function(root){skinRoot=root;},bind:bindStoreBack,'+
  'repair:repairStoreBack,close:closeStoreFromArrow,key:onStoreBackKey,'+
  'cleanup:releaseSkin,open:openStore};\n'+source.slice(at);

function setup(){
  const button={events:[],removed:[],addEventListener(t,f,c){this.events.push({t,f,c});},
    removeEventListener(t,f,c){this.removed.push({t,f,c});}};
  const document={events:[],removed:[],addEventListener(t,f,c){this.events.push({t,f,c});},
    removeEventListener(t,f,c){this.removed.push({t,f,c});}};
  const root={parentNode:{},classList:{remove(){}},
    querySelector(q){return q==='.head-backward__button'?button:null;}};
  let name='extensions_line',modal=false,backs=0,shows=0;
  const toggles=[],network=[];
  const controller={enabled(){return{name,controller:{back(){}}};},
    toggle(n,force){toggles.push({n,force});name='extensions_line';},
    windowTop(){return modal;},back(){backs++;}};
  const browser={appready:false};
  const Lampa={Controller:controller,Storage:{get:(k,d)=>d,set(){}},
    Plugins:{get:()=>[],loaded:()=>[],save(){}},Listener:{follow(){}},
    Extensions:{render(){return null;},show(){shows++;}},
    Reguest:function(){this.silent=(url,ok)=>network.push({url,ok});}};
  vm.runInNewContext(code,{window:browser,Lampa,document,console,setTimeout(){},clearTimeout(){}});
  const qa=browser.qa;qa.setRoot(root);qa.bind();
  return{qa,button,root,document,name:n=>{name=n;},modal:v=>{modal=v;},
    toggles,network,backs:()=>backs,shows:()=>shows};
}
const a=setup();const arrow=a.button.events[0];assert.equal(arrow.t,'click');assert.equal(arrow.c,true);
let cancel=0,stop=0;arrow.f({preventDefault(){cancel++;},stopImmediatePropagation(){stop++;}});
assert.equal(a.backs(),1);assert.equal(a.toggles.length,0);assert.equal(cancel,1);assert.equal(stop,1);
const b=setup();b.name('head');b.button.events[0].f({preventDefault(){},stopImmediatePropagation(){}});
assert.equal(b.toggles.length,1);assert.equal(b.toggles[0].n,'extensions');assert.equal(b.backs(),1);
const tv=setup();tv.name('content');tv.document.events[0].f({keyCode:10009});
assert.equal(tv.toggles.length,1);assert.equal(tv.backs(),0,'native Lampa handles hardware Back');
const popup=setup();popup.name('select');popup.modal(true);popup.button.events[0].f({preventDefault(){},stopImmediatePropagation(){}});
assert.equal(popup.toggles.length,0);assert.equal(popup.backs(),1);
const detached=setup();detached.root.parentNode=null;detached.qa.close({preventDefault(){throw Error('closed view');}});
assert.equal(detached.backs(),0);
const disposed=setup();disposed.qa.cleanup();assert.equal(disposed.button.removed.length,1);
assert.equal(disposed.document.removed.length,1);
const concurrency=setup();concurrency.qa.setRoot(null);concurrency.qa.open();concurrency.qa.open();
assert.equal(concurrency.network.length,1,'duplicate openings blocked');
concurrency.network[0].ok({results:[{title:'Empty',results:[]}],meta:{tracked:{},last_checked_at:new Date().toISOString()}});
assert.equal(concurrency.shows(),1);
console.log('PASS My Store Back: touch, TV, focus restoration, modal safety, cleanup, opening lock');
