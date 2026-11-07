'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../my_store_runtime.js'),'utf8');
const at=source.lastIndexOf('})();');
const code=source.slice(0,at)+
  'window.qa={setRoot:function(root){skinRoot=root;},bind:bindStoreBack,'+
  'repair:repairStoreBack,close:closeStoreFromArrow,key:onStoreBackKey,'+
  'cleanup:releaseSkin,open:openStore,capture:captureStoreBack,'+
  'rescue:tryNativeStoreRescue,onClose:onStoreClose};\n'+source.slice(at);

function setup(){
  const button={events:[],removed:[],addEventListener(t,f,c){this.events.push({t,f,c});},
    removeEventListener(t,f,c){this.removed.push({t,f,c});}};
  const document={events:[],removed:[],addEventListener(t,f,c){this.events.push({t,f,c});},
    removeEventListener(t,f,c){this.removed.push({t,f,c});}};
  const root={parentNode:{},classList:{remove(){}},
    contains(node){return Boolean(node && node.inside);},
    querySelector(q){return q==='.head-backward__button'?button:null;}};
  let name='extensions_line',modal=false,backs=0,shows=0;
  let controllerBack=function(){},controllerLink=null;
  const toggles=[],network=[];
  const controller={enabled(){return{name,controller:{back:controllerBack,link:controllerLink}};},
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
    nativeBack:f=>{controllerBack=f;},link:link=>{controllerLink=link;},
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

// Native Lampa Extensions.show() installs its own onBack closure. Capture
// exactly that closure before other plugins can move focus to the top header.
const lostTouch=setup();
let closedTouch=0;
lostTouch.name('extensions');
lostTouch.nativeBack(()=>{closedTouch++;lostTouch.qa.onClose();});
lostTouch.qa.capture();
lostTouch.name('head');
let prevented=0,stopped=0;
lostTouch.button.events[0].f({
  preventDefault(){prevented++;},
  stopImmediatePropagation(){stopped++;}
});
assert.equal(closedTouch,1,'lost-focus touch Back must close native store');
assert.equal(lostTouch.backs(),0,'do not invoke Head/Activity.back()');
assert.equal(lostTouch.toggles.length,0,'do not toggle focus before native onBack');
assert.equal(prevented,1);assert.equal(stopped,1);
assert.equal(lostTouch.button.removed.length,1,'native onClose removes click interceptor');
assert.equal(lostTouch.document.removed.length,1,'native onClose removes key listener');

// TV Back can arrive on document while Head owns focus. Consume only this
// broken-focus path, so native Keypad never closes unrelated Activity.
const lostTV=setup();
let closedTV=0,blocked=0,stoppedTV=0;
lostTV.name('extensions');
lostTV.nativeBack(()=>{closedTV++;lostTV.qa.onClose();});
lostTV.qa.capture();
lostTV.name('content');
lostTV.document.events[0].f({
  keyCode:10009,preventDefault(){blocked++;},
  stopImmediatePropagation(){stoppedTV++;}
});
assert.equal(closedTV,1,'hardware Back closes the store after focus loss');
assert.equal(blocked,1);assert.equal(stoppedTV,1);
assert.equal(lostTV.backs(),0);
assert.equal(lostTV.document.removed.length,1);

// When the store still owns focus, leave the keyboard event to Lampa.
// A Backspace in a text field must remain text editing.
const focused=setup();let focusedClose=0;
focused.name('extensions');
focused.nativeBack(()=>{focusedClose++;});
focused.qa.capture();
focused.document.events[0].f({keyCode:10009,preventDefault(){throw Error('native key swallowed');}});
assert.equal(focusedClose,0);
focused.document.events[0].f({keyCode:8,target:{tagName:'INPUT'},
  preventDefault(){throw Error('Backspace swallowed');}});
assert.equal(focusedClose,0);

// Popups take precedence. When active focus was stolen, restore the
// real native popup controller and let Lampa close it before the store.
const overlay=setup();let overlayClosed=0;
overlay.name('extensions');
overlay.nativeBack(()=>{overlayClosed++;});
overlay.qa.capture();
overlay.modal({name:'select'});overlay.name('head');
overlay.button.events[0].f({preventDefault(){},stopImmediatePropagation(){}});
assert.equal(overlayClosed,0,'do not close store behind visible popup');
assert.equal(overlay.toggles.length,1);
assert.equal(overlay.toggles[0].n,'select');
assert.equal(overlay.backs(),1);

// An extensions_line controller from a different DOM root is not our view.
// Use the saved native onBack rather than a stale line controller.
const staleLine=setup();let staleClosed=0;
staleLine.name('extensions');
staleLine.nativeBack(()=>{staleClosed++;staleLine.qa.onClose();});
staleLine.qa.capture();
staleLine.name('extensions_line');
staleLine.link({render:()=>({inside:false})});
staleLine.button.events[0].f({preventDefault(){},stopImmediatePropagation(){}});
assert.equal(staleClosed,1);
assert.equal(staleLine.backs(),0);

console.log('PASS My Store Back: native lost-focus rescue (touch/TV), modal priority, controller ownership, lifecycle cleanup');
console.log('PASS My Store Back: touch, TV, focus restoration, modal safety, cleanup, opening lock');
