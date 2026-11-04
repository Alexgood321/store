'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'my_store_runtime.js'), 'utf8');
const end = source.lastIndexOf('})();');
assert.ok(end > 0);
const instrumented = source.slice(0,end) +
  'window.__versionQA = { running:runningVersion,display:versionDisplayState,' +
  'paint:decorateUpdateVersionRow };' + source.slice(end);

function node(tag) {
  return {
    tag, className:'', style:{cssText:''}, children:[], textContent:'',
    appendChild(child) { this.children.push(child); return child; }
  };
}
function open(plugins,started) {
  const window = {appready:false,rezka_plugin_started:started};
  const Lampa = {
    Manifest:{plugins},
    Storage:{get:(k,d)=>d,set(){}},
    Plugins:{get:()=>[],loaded:()=>[]},
    Listener:{follow(){}}
  };
  vm.runInNewContext(instrumented,{
    window,Lampa,document:{createElement:node},console,
    setTimeout(){return 1;},setInterval(){return 1;}
  });
  return window.__versionQA;
}
const manifest={component:'rezka_online',version:'1.7.2'};
const qa=open({rezka_online:manifest},true);

assert.equal(qa.running('HDREZKA'),'1.7.2');
let state=qa.display('HDREZKA','1.7.2','1.7.3',true);
assert.deepEqual(Array.from(state.badges,x=>x.label),['Сохранена','Каталог','Запущена']);
assert.deepEqual(Array.from(state.badges,x=>x.status),['newer','catalog','newer']);
assert.match(state.hint,/Доступна новая ссылка/);

state=qa.display('HDREZKA','1.7.3','1.7.3',false);
assert.deepEqual(Array.from(state.badges,x=>x.status),['current','catalog','newer']);
assert.match(state.hint,/Перезапустите Lampa/);

// Unconfirmed execution does not inherit the saved version.
const absent=open({},false);
state=absent.display('HDREZKA','1.7.3','1.7.3',false);
assert.equal(state.badges[2].version,'не подтверждена');
assert.equal(state.badges[2].status,'unknown');

// A central catalog can lag installed versions. Never label this as outdated.
state=qa.display('HDREZKA','1.7.4','1.7.3',false);
assert.equal(state.badges[0].status,'ahead');
assert.match(state.hint,/Автооткат не выполняется/);

// Manifest shape differs by Lampa generation.
assert.equal(open([manifest],true).running('HDREZKA'),'1.7.2');
assert.equal(open([manifest],false).running('HDREZKA'),'');

// Use DOM textContent, never parse version values as HTML.
let group=node('div'), appended=[];
const subtitle={
  length:1,
  empty(){appended=[];return this;},
  append(child){appended.push(child);return this;},
  css(){return this;}
};
qa.paint({find:selector=>selector==='.selectbox-item__subtitle'?subtitle:null},
  {versionDisplay:{
    badges:[
      {label:'Сохранена',version:'<img src=x onerror=alert(1)>',status:'current'},
      {label:'Каталог',version:'1.7.3',status:'catalog'},
      {label:'Запущена',version:'не подтверждена',status:'unknown'}
    ],hint:'Версия не подтверждена'
  }});
assert.equal(appended.length,2);
assert.equal(appended[0].children.length,3);
assert.equal(appended[0].children[0].children[1].textContent,
  '<img src=x onerror=alert(1)>');
assert.equal(appended[0].children[0].children[1].children.length,0);
assert.ok(appended[0].style.cssText.includes('flex-wrap:wrap'));

assert.ok(!source.includes('api.github.com'));
console.log('PASS My Store: three color-coded version badges, live HDREZKA manifest, restart warning, unknown status, no downgrade, safe textContent');
