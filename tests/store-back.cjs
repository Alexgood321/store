'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

const source=fs.readFileSync(path.resolve(__dirname,'../my_store_runtime.js'),'utf8');
new vm.Script(source,{filename:'my_store_runtime.js'});
const end=source.lastIndexOf('})();');
assert.ok(end>0);
const instrumented=source.slice(0,end)+
  'window.qa={setRoot:function(root){skinRoot=root;activeStoreDOM=root;},'+
  'bind:bindStoreBack,capture:captureStoreBack,close:closeStoreFromArrow,'+
  'key:onStoreBackKey,call:safeExecuteStoreBack,mounted:isStoreMounted,'+
  'onClose:onStoreClose,setNativeBack:function(fn){storeNativeBack=fn;},'+
  'guard:hasActiveOverlay,open:openStore,cleanup:releaseSkin};\n'+
  source.slice(end);

function setup({overlay=false,overlayName='select',focus='extensions_line',mounted=true}={}) {
  let activeName=focus,backHandler=function(){};
  let popup=overlay,nativeCloses=0,foreignBacks=0,shows=0;
  const child={},events=[],removed=[],network=[];
  const button={addEventListener(t,f,c){events.push({place:'button',t,f,c});},
    removeEventListener(t){removed.push('button:'+t);}};
  const selector={addEventListener(t,f){events.push({place:'selector',t,f});},
    removeEventListener(t){removed.push('selector:'+t);}};
  const root={parentNode:mounted?{}:null,classList:{add(){},remove(){}},
    contains(node){return node===child;},
    querySelector(q){return q==='.head-backward__button'?button:
      q==='.head-backward.selector'?selector:null;}};
  const document={
    body:{contains(el){return el===root&&Boolean(root.parentNode);}},
    querySelector(){return popup?{name:overlayName}:null;},
    addEventListener(t,f,c){events.push({place:'document',t,f,c});},
    removeEventListener(t){removed.push('document:'+t);}
  };
  const controller={
    enabled(){return {name:activeName,controller:{
      back:backHandler,link:{render(){return child;}}}};},
    windowTop(){return popup?{name:overlayName}:false;},
    back(){foreignBacks++;},
    toggle(name){activeName=name;}
  };
  const Lampa={
    Controller:controller,
    Storage:{get(k,d){return d;},set(){}},
    Plugins:{get(){return [];},loaded(){return [];},save(){}},
    Listener:{follow(){}},Noty:{show(){}},
    Extensions:{render(){return null;},show(){shows++;}},
    Reguest:function(){this.silent=(url,ok)=>network.push({url,ok});}
  };
  const browser={appready:false};
  vm.runInNewContext(instrumented,{window:browser,Lampa,document,console,
    setTimeout(){},clearTimeout(){},Date});
  const qa=browser.qa;
  qa.setRoot(root);
  qa.bind();
  function destroy(){nativeCloses++;root.parentNode=null;qa.onClose();}
  const invoke=(place,type,event)=>{
    const match=events.find(e=>e.place===place&&e.t===type);
    assert.ok(match,place+' '+type+' handler registered');
    match.f(event||{preventDefault(){},stopImmediatePropagation(){}});
  };
  return {qa,root,events,removed,network,invoke,destroy,
    back(fn){backHandler=fn;},focus(name){activeName=name;},
    overlay(value,name='select'){popup=value;overlayName=name;},
    nativeCloses(){return nativeCloses;},foreignBacks(){return foreignBacks;},
    shows(){return shows;}
  };
}

let passed=0;
function test(name,fn){fn();passed++;process.stdout.write('✓ '+name+'\n');}

test('pointer Back uses native store close and cleans up listeners',()=>{
  const a=setup();a.back(a.destroy);a.qa.capture();
  let handled=0;
  a.invoke('button','click',{preventDefault(){handled++;},
    stopImmediatePropagation(){handled++;}});
  assert.equal(a.nativeCloses(),1);
  assert.equal(handled,2);
  assert.equal(a.qa.mounted(),false);
  assert.ok(a.removed.includes('button:click'));
  assert.ok(a.removed.includes('selector:hover:enter'));
  assert.ok(a.removed.includes('document:keydown'));
});
test('TV Enter on focusable Back selector closes the same screen',()=>{
  const a=setup();a.back(a.destroy);a.qa.capture();
  a.invoke('selector','hover:enter');
  assert.equal(a.nativeCloses(),1);
});
test('lost Head focus: hardware Back closes store, not Activity',()=>{
  const a=setup();a.back(a.destroy);a.qa.capture();a.focus('head');
  let handled=0;
  a.invoke('document','keydown',{keyCode:10009,
    preventDefault(){handled++;},stopImmediatePropagation(){handled++;}});
  assert.equal(a.nativeCloses(),1);
  assert.equal(a.foreignBacks(),0);
  assert.equal(handled,2);
});
test('burst of three Back events closes store exactly once',()=>{
  const a=setup();a.back(a.destroy);a.qa.capture();
  for(let i=0;i<3;i++)a.qa.key({keyCode:27,preventDefault(){},
    stopImmediatePropagation(){}});
  assert.equal(a.nativeCloses(),1);
});
test('real Select or Modal takes precedence over store',()=>{
  for(const kind of ['select','modal']){
    const a=setup({overlay:true,overlayName:kind,focus:kind});
    a.back(()=>{a.overlay(false);});
    a.qa.setNativeBack(a.destroy);
    assert.equal(a.qa.guard(),true);
    a.invoke('document','keydown',{keyCode:27,
      preventDefault(){throw Error('Back swallowed');}});
    assert.equal(a.nativeCloses(),0);
    a.invoke('button','click');
    assert.equal(a.nativeCloses(),0);
    assert.equal(a.qa.guard(),false);
    a.invoke('document','keydown',{keyCode:27,preventDefault(){},
      stopImmediatePropagation(){}});
    assert.equal(a.nativeCloses(),1);
  }
});
test('stale Select controller without DOM overlay does not trap Back',()=>{
  const a=setup({focus:'select'});a.qa.setNativeBack(a.destroy);
  assert.equal(a.qa.guard(),false);
  a.invoke('document','keydown',{keyCode:27,preventDefault(){},
    stopImmediatePropagation(){}});
  assert.equal(a.nativeCloses(),1);
});
test('arrow over an overlay never invokes foreign Head.back',()=>{
  const a=setup({overlay:true,focus:'head'});
  a.qa.setNativeBack(a.destroy);
  a.invoke('button','click');
  assert.equal(a.nativeCloses(),0);
  assert.equal(a.foreignBacks(),0);
});
test('native callback throwing does not produce fake success or double back',()=>{
  const a=setup();
  a.qa.setNativeBack(()=>{throw Error('expected native close failure');});
  let swallowed=0;
  const result=a.qa.call({preventDefault(){swallowed++;},
    stopImmediatePropagation(){swallowed++;}},'test');
  assert.equal(result,false);
  assert.equal(swallowed,0);
  assert.equal(a.qa.mounted(),true);
  assert.equal(a.foreignBacks(),0);
});
test('unverified extensions controller cannot close unrelated views',()=>{
  const a=setup({focus:'head'});
  a.qa.setNativeBack(null);
  assert.equal(a.qa.call(null,'test'),false);
  assert.equal(a.qa.mounted(),true);
});
test('owner-matched extensions_line fallback still closes store',()=>{
  const a=setup();a.back(a.destroy);a.qa.setNativeBack(null);
  assert.equal(a.qa.call(null,'test'),true);
  assert.equal(a.nativeCloses(),1);
});
test('stale store DOM never matches an unrelated Extensions view',()=>{
  const a=setup();a.root.parentNode=null;
  assert.equal(a.qa.mounted(),false);
  assert.equal(a.qa.call(null,'test'),false);
});
test('opening lock blocks duplicate requests before native render',()=>{
  const a=setup({mounted:false});a.qa.open();a.qa.open();
  assert.equal(a.network.length,1);
  a.network[0].ok({results:[{title:'Empty',results:[]}],
    meta:{tracked:{},last_checked_at:new Date().toISOString()}});
  assert.equal(a.shows(),1);
});
test('test-only globals are absent from published runtime',()=>{
  assert.ok(!source.includes('__AlexgoodStoreQA'));
  assert.ok(!source.includes('__AlexgoodStoreOpen'));
});
console.log('PASS My Store Back v3.6.6: '+passed+' navigation/lifecycle regressions');
