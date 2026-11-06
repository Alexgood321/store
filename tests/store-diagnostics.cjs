'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../my_store_runtime.js'),'utf8');
const marker=source.lastIndexOf('})();');
const code=source.slice(0,marker)+
  'window.qa={diagnose:pluginDiagnostic,list:installedDiagnostics,show:showPluginDiagnostics,menu:showUpdateCenter,detail:showPluginDiagnosticDetail,setGrid:function(grid){installedGrid=grid;},setCatalog:function(v){LIVE_DATA=v;}};\n'+source.slice(marker);
const badURL='https://cdn.jsdelivr.net/gh/Alexgood321/store@main/torrent_styles_v2.js?v=1.2.1';
const goodURL='https://cdn.jsdelivr.net/gh/Alexgood321/lampa-plugins@main/surs.js';
function checkCard(value) {
 return {querySelector(s) {
   if(s!=='.extensions__item-code' || !value) return null;
   return {textContent:String(value),classList:{contains(){return false;}}};
 }};
}
function setup(){
 let failures=[badURL],loaded=[],modals=[];
 let entries=[{url:badURL,status:1},{url:goodURL,status:1}];
 const catalog={results:[{title:'System',results:[{name:'Torrent Styles',link:badURL},{name:'SURS Pro',link:goodURL}]}],meta:{tracked:{},last_checked_at:new Date().toISOString()}};
 const Lampa={Plugins:{errors:()=>failures,loaded:()=>loaded,get:()=>entries,save(){}},
   Storage:{get:(k,d)=>d,set(){}},Select:{show:function(s){modals.push(s);}},
   Noty:{show(){}},Reguest:function(){this.silent=(u,ok)=>ok(catalog);}};
 const browser={appready:false};
 vm.runInNewContext(code,{window:browser,Lampa,document:{},console,setTimeout(){},clearTimeout(){}});
 const qa=browser.qa;qa.setCatalog(catalog);
 qa.setGrid({querySelectorAll(){return [checkCard(200),checkCard(200)];}});
 return {qa,modals,failures,loaded,entries};
}
const a=setup();
const one=a.qa.diagnose(badURL,checkCard(200));
assert.equal(one.problem,true);assert.equal(one.failed,true);assert.equal(one.code,'200');
assert.match(one.summary,/Не удалось загрузить JS/);
assert.match(one.detail,/не сохранила причину/);
assert.match(one.detail,/не подтверждение запуска/);
assert.equal(a.qa.diagnose(goodURL,checkCard(200)).problem,false);
const noPattern=a.qa.diagnose(goodURL,checkCard(500));
assert.equal(noPattern.failed,false);assert.equal(noPattern.problem,true);
assert.match(noPattern.detail,/не распознано/);
const httpFail=a.qa.diagnose(goodURL,checkCard(404));
assert.match(httpFail.summary,/404/);
const notChecked=a.qa.diagnose(badURL,checkCard(null));
assert.match(notChecked.detail,/ещё не завершена/);
const issues=a.qa.list();
assert.equal(issues.length,1);assert.equal(issues[0].name,'Torrent Styles');
a.qa.show();
assert.equal(a.modals.length,1);
assert.equal(a.modals[0].items[0].title,'Torrent Styles');
a.modals[0].onSelect(a.modals[0].items[0]);
assert.equal(a.modals.length,2);
assert.ok(a.modals[1].items.some(x=>x.subtitle && x.subtitle.includes('не сохранила причину')));
a.loaded.push(badURL);
assert.match(a.qa.diagnose(badURL,checkCard(200)).summary,/позже загрузка отмечена/);
const b=setup();b.failures.length=0;
b.qa.show();assert.equal(b.modals[0].items[0].title,'Зафиксированных ошибок нет');
assert.ok(!source.includes('api.github.com'));
console.log('PASS diagnostics: startup URL error versus independent JS check 200/500/404, native details, runtime flags and safe unknown cause');
