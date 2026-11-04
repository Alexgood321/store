'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'my_store_runtime.js'),'utf8');
const original=JSON.parse(fs.readFileSync(path.join(root,'live_catalog.json'),'utf8'));
const ending=source.lastIndexOf('})();');
assert.ok(ending>0);
const code=source.slice(0,ending)+
  'window.__batchQA={sync:syncHeaderBatchButton,run:runHeaderBatch,'+
  'plan:getSafeBatchPlan,rollback:rollbackOwnedBatch,show:showUpdateCenter};\n'+
  source.slice(ending);
const KEY='alexgood321_store_header_batch_v1';

function scenario({enabled=false,playing=false,stale=false,saveFails=false,older=true}={}) {
  const catalog=JSON.parse(JSON.stringify(original));
  catalog.meta.last_checked_at=stale?'2000-01-01T00:00:00Z':
    new Date().toISOString().replace(/\.\d+Z$/,'Z');
  const installed=[
    {name:'SURS Pro',url:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+'1'.repeat(40)+'/surs.js',status:1},
    {name:'HDREZKA',url:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-hdrezka@'+'2'.repeat(40)+'/rezka.js',status:1},
    {name:'NUM Series Pro',url:catalog.meta.tracked['NUM Series Pro'].link,status:1},
    {name:'Home Categories Pro',url:'https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+'3'.repeat(40)+'/home_categories.js',status:0}
  ];
  const previous=installed.map(x=>x.url);
  const local={
    [KEY]:enabled,
    alexgood321_installed_version_cache_v1:{
      [installed[0].url]:{version:older?'3.8.3':'3.9.0',time:Date.now()},
      [installed[1].url]:{version:older?'1.7.3':'1.7.9',time:Date.now()},
      [installed[3].url]:{version:'1.9.0',time:Date.now()}
    }
  };
  const notices=[],network=[],timers=[],buttons=[],selection=[];
  let saved=0,reloaded=0;
  function button(action) {
    const btn={action,removed:false,classes:new Set(),badge:{length:1},
      addClass(v){this.classes.add(v);return this;},
      removeClass(v){this.classes.delete(v);return this;},
      toggleClass(v,yes){if(yes)this.classes.add(v);else this.classes.delete(v);return this;},
      css(){return this;},attr(){return this;},on(event,fn){this['on:'+event]=fn;return this;},
      find(q){
        if(q!=='.alex-store-header-batch-count')throw Error('unknown badge');
        const b=this.badge;
        b.css=()=>b;b.text=x=>{b.value=x;return b;};
        b.toggle=x=>{b.visible=x;return b;};return b;
      },
      remove(){this.removed=true;return this;}
    };
    return btn;
  }
  const browser={appready:false,location:{reload(){reloaded++;}}};
  const Lampa={
    Storage:{get:(k,d)=>Object.hasOwn(local,k)?local[k]:d,set:(k,v)=>{local[k]=v;}},
    Plugins:{get:()=>installed,loaded:()=>[],save(){saved++;if(saveFails)throw Error('simulated save failure');}},
    Head:{addIcon(svg,action){const item=button(action);item.svg=svg;buttons.push(item);return item;}},
    Player:{opened:()=>playing},
    Select:{show(o){selection.push(o);}},
    Noty:{show(t){notices.push(t);}},
    Listener:{follow(){}},
    Reguest:function(){this.silent=(url,ok,no)=>{
      network.push(url);
      if(url.includes('live_catalog.json'))ok(catalog);
      else no('unexpected '+url);
    }}
  };
  vm.runInNewContext(code,{window:browser,Lampa,
    document:{},console,
    setTimeout(fn,delay){timers.push({fn,delay});return timers.length;},
    clearTimeout(){},setInterval(){return 1;}});
  function flush(){
    let i=0;
    while(timers.length && ++i<30)timers.shift().fn();
    assert.ok(i<30,'timer loop');
  }
  return {browser,Lampa,local,notices,network,buttons,installed,previous,
    selection,flush,saveCount:()=>saved,reloads:()=>reloaded};
}

// Disabled by default, and enable/disable are independent of auto-update.
const setup=scenario();
setup.browser.__batchQA.sync();
assert.equal(setup.buttons.length,0);
setup.browser.__batchQA.show(true,false);
const manage=setup.selection.at(-1);
assert.ok(manage.items.some(x=>x.action==='header_batch_toggle'));
manage.onSelect({action:'header_batch_toggle'});
assert.equal(setup.local[KEY],true);
assert.equal(setup.buttons.length,1);
setup.browser.__batchQA.sync();
assert.equal(setup.buttons.length,1,'must not duplicate header icon');
setup.selection.at(-1).onSelect({action:'header_batch_toggle'});
assert.equal(setup.local[KEY],false);
assert.equal(setup.buttons[0].removed,true);
assert.equal(setup.saveCount(),0);

// Normal single press. Two newer semantic versions, one current, one disabled.
// One Plugins.save(), one group rollback, then safe restart outside player.
const good=scenario({enabled:true});
good.browser.__batchQA.sync();
assert.equal(good.buttons.length,1);
good.buttons[0].action();
assert.equal(good.saveCount(),1);
assert.equal(good.local.alexgood321_batch_backup_v1.items.length,2);
assert.equal(good.installed[0].url,original.meta.tracked['SURS Pro'].link);
assert.equal(good.installed[1].url,original.meta.tracked.HDREZKA.link);
assert.equal(good.installed[2].url,good.previous[2]);
assert.equal(good.installed[3].url,good.previous[3]);
assert.ok(good.notices.some(x=>x.includes('Обновлено ссылок: 2')));
assert.ok(good.network.every(x=>!x.includes('api.github.com')));
good.flush();
assert.equal(good.reloads(),1);

// A second tap within the same run must not apply the same batch twice.
good.buttons[0].action();
assert.equal(good.saveCount(),1);

// Restore last bulk operation.
assert.equal(good.browser.__batchQA.rollback(),true);
assert.deepEqual(good.installed.map(x=>x.url),good.previous);

// Active player: update saved URLs but never interrupt playback.
const watching=scenario({enabled:true,playing:true});
watching.browser.__batchQA.sync();
watching.buttons[0].action();
watching.flush();
assert.equal(watching.saveCount(),1);
assert.equal(watching.reloads(),0);
assert.ok(watching.notices.some(x=>x.includes('Просмотр не прерывается')));

// If central verification is outdated, never alter plugin URLs.
const outdated=scenario({enabled:true,stale:true});
outdated.browser.__batchQA.sync();
outdated.buttons[0].action();
assert.equal(outdated.saveCount(),0);
assert.deepEqual(outdated.installed.map(x=>x.url),outdated.previous);
assert.ok(outdated.notices.some(x=>x.includes('Массовое обновление отменено')));

// An installed version newer than the catalog must not be downgraded.
const newer=scenario({enabled:true,older:false});
newer.browser.__batchQA.sync();
newer.buttons[0].action();
assert.equal(newer.saveCount(),0);
assert.deepEqual(newer.installed.map(x=>x.url),newer.previous);

// The header button also restarts Lampa to load a newer My Store core
// even when no installed plugin URL needs replacing.
const core=scenario({enabled:true,older:false});
core.browser.__AlexgoodStoreRuntime={
  ready:true,version:'3.3.0',sha:'f'.repeat(40)
};
core.browser.__batchQA.sync();
core.buttons[0].action();
core.flush();
assert.equal(core.saveCount(),0);
assert.equal(core.reloads(),1);
assert.ok(core.notices.some(x=>x.includes('ядра My Store')));

// Failed persistence rolls back in-memory URLs; no forced restart.
const fail=scenario({enabled:true,saveFails:true});
fail.browser.__batchQA.sync();
fail.buttons[0].action();
fail.flush();
assert.deepEqual(fail.installed.map(x=>x.url),fail.previous);
assert.equal(fail.reloads(),0);
assert.ok(fail.notices.some(x=>x.includes('Не удалось сохранить')));

assert.ok(!source.includes('api.github.com'));
console.log('PASS header one-click: default OFF, enable/hide, no duplicates, safe multi-update, group rollback, player guard, stale check, no downgrade, core-only restart, save failure, zero REST calls');
