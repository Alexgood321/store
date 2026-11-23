'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../my_store_runtime.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../live_catalog.json'),'utf8'));
const meta=data.meta.tracked['SURS Pro'];
const old=data.meta.history['SURS Pro'].find(e=>e.version==='4.0.15');
assert.ok(old,'SURS 4.0.15 is in verified history');
new vm.Script(source,{filename:'my_store_runtime.js'});
const pos=source.lastIndexOf('})();');
assert.ok(pos>0);
const instrumented=source.slice(0,pos)+
 'window.qa={set:function(c){LIVE_DATA=c;LIVE_META=c.meta.tracked;'+
 'LAST_LIVE_URL=CONFIG.catalog+"?_test=1";lastLiveLoadAt=Date.now();},'+
 'pending:pluginNeedsActivation,count:countPendingPluginActivations,'+
 'show:showUpdateCenter};\n'+source.slice(pos);

const storage=new Map(),screens=[],notices=[];
let installed={url:meta.link,status:1};
const win={appready:false,LampaShelfManager:{version:'4.0.15'}};
const Lampa={
 Plugins:{get:()=>[installed],save(){}},
 Storage:{get:(key,def)=>storage.has(key)?storage.get(key):def,
  set:(key,value)=>storage.set(key,value)},
 Select:{show:menu=>screens.push(menu)},
 Noty:{show:msg=>notices.push(msg)},
 Listener:{follow(){}}
};
vm.runInNewContext(instrumented,{window:win,Lampa,document:{},console,Date,Math,Uint8Array,
 setTimeout(){},clearTimeout(){}});
const t=win.qa;
data.meta.last_checked_at=new Date().toISOString();
t.set(data);

// Actual URL has already moved to 4.0.16, but JS in memory is 4.0.15.
assert.equal(t.pending('SURS Pro',meta,installed),true);
assert.equal(t.count(),1);
t.show(false,false);
let screen=screens.at(-1), row=screen.items.find(x=>x.name==='SURS Pro');
assert.equal(row.canUpdate,false,'no false URL update');
assert.equal(row.canRestart,true,'must offer explicit restart action');
assert.match(row.subtitle,/Запущена: 4\.0\.15/);
assert.match(screen.title,/Обновления плагинов \(1\)/);
screen.onSelect(row);
assert.match(screens.at(-1).title,/Перезапустить Lampa/);
assert.ok(screens.at(-1).items.some(item=>item.action==='do_reload'));

// After reboot the release matches. No more pending restart is offered.
win.LampaShelfManager.version='4.0.16';
assert.equal(t.count(),0);
t.show(false,false);
row=screens.at(-1).items.find(x=>x.name==='SURS Pro');
assert.equal(row.canRestart,false);
assert.equal(row.canUpdate,false);

// Original pinned URL on 4.0.15 still offers ordinary safe update.
installed.url='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@'+old.sha+'/surs.js';
win.LampaShelfManager.version='4.0.15';
assert.equal(t.count(),0);
t.show(false,false);
row=screens.at(-1).items.find(x=>x.name==='SURS Pro');
assert.equal(row.canUpdate,true);
assert.equal(row.canRestart,false);

// Latest URL installed but runtime did not initialize: show diagnostics,
// not a made-up successful running version.
installed.url=meta.link;
win.LampaShelfManager=null;
t.show(false,false);
row=screens.at(-1).items.find(x=>x.name==='SURS Pro');
assert.equal(row.canRestart,false);
assert.equal(row.unconfirmedSurs,true);
assert.match(row.subtitle,/запуск SURS не подтверждён/);

// Disabled SURS must not cause restart prompts.
installed.status=0;
win.LampaShelfManager={version:'4.0.15'};
assert.equal(t.count(),0);
t.show(false,false);
row=screens.at(-1).items.find(x=>x.name==='SURS Pro');
assert.equal(row.canRestart,false);
assert.equal(row.unconfirmedSurs,false);

// A running build newer than the catalog must never trigger a downgrade.
installed.status=1;
win.LampaShelfManager.version='9.0.0';
assert.equal(t.count(),0);
t.show(false,false);
row=screens.at(-1).items.find(x=>x.name==='SURS Pro');
assert.equal(row.canRestart,false);
assert.equal(row.canUpdate,false);
console.log('PASS My Store: SURS 4.0.15->4.0.16 saved URL, restart action, diagnostics, disabled/downgrade safety');
