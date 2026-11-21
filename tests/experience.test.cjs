const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(new URL('../index.html',`file://${__filename}`),'utf8');
function app(){
 const errors=[];
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const d=new JSDOM(html,{url:'https://example.test/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  w.requestAnimationFrame=fn=>w.setTimeout(fn,0);w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:30}):()=>{},set:()=>true});
 }});
 const w=d.window,doc=w.document;
 const click=id=>doc.getElementById(id).click();
 const choose=(selector)=>doc.querySelector(selector).click();
 const settle=async()=>{for(let i=0;i<3;i++)await new Promise(r=>w.setTimeout(r,0))};
 return{w,doc,click,choose,settle,errors,close:()=>w.close()};
}
test('motif preview shows whole model and materials before starting; alone guide completes',async()=>{
 const a=app();await a.settle();a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
 assert.equal(a.doc.getElementById('dName').textContent,'Stjernestav');
 assert.equal(a.doc.body.classList.contains('building'),false);
 assert.match(a.doc.getElementById('total').textContent,/30 brikker/);
 a.click('aloneStart');assert.ok(a.doc.body.classList.contains('building'));
 for(let i=0;i<10;i++)a.click('next');
 assert.equal(a.doc.getElementById('doneBox').classList.contains('hide'),false);
 a.click('prev');assert.match(a.doc.getElementById('rowTitle').textContent,/Række 10 af 10/);
 a.click('overviewButton');assert.ok(a.doc.getElementById('overviewDialog').open);
 a.click('overviewClose');assert.equal(a.doc.getElementById('overviewDialog').open,false);
 assert.deepEqual(a.errors,[]);a.close();
});
test('cooperative guide keeps each builders progress and enables assembly',async()=>{
 const a=app();await a.settle();a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
 a.choose('[data-mode="together"]');a.click('teamStart');
 assert.equal(a.doc.querySelectorAll('#partTabs button').length,2);
 a.click('next');const first=a.doc.getElementById('rowTitle').textContent;
 assert.equal(a.doc.getElementById('progressBar').getAttribute('aria-valuenow'),'50');
 a.choose('#partTabs [data-i="1"]');a.choose('#partTabs [data-i="0"]');
 assert.equal(a.doc.getElementById('rowTitle').textContent,first);
 for(let i=0;i<10;i++)if(!a.doc.getElementById('next').disabled)a.click('next');
 a.choose('#partTabs [data-i="1"]');
 for(let i=0;i<10;i++)if(!a.doc.getElementById('next').disabled)a.click('next');
 a.choose('#partTabs [data-i="asm"]');assert.equal(a.doc.getElementById('assembleBox').classList.contains('hide'),false);
 assert.deepEqual(a.errors,[]);a.close();
});
test('appearance selection preserves guide progress and is saved for the device',async()=>{
 const a=app();await a.settle();a.choose('[data-theme="parent"]');
 assert.equal(a.w.localStorage.getItem('bv_appearance'),'"parent"');
 assert.equal(a.doc.documentElement.dataset.theme,'parent');
 a.choose('[data-id="motiver50-01"] .model-link');await a.settle();a.click('aloneStart');a.click('next');
 a.choose('[data-theme="child"]');await a.settle();
 assert.match(a.doc.getElementById('rowTitle').textContent,/Række 2 af 10/);assert.deepEqual(a.errors,[]);a.close();
});
test('search, favourites, categories and piece limit combine correctly',async()=>{
 const a=app();await a.settle();const q=a.doc.getElementById('q');q.value='01';q.dispatchEvent(new a.w.Event('input'));
 assert.equal(a.doc.querySelectorAll('#grid .card').length,1);
 a.choose('[data-like="motiver50-01"]');a.choose('[data-quick="Likede"]');
 assert.equal(a.doc.querySelectorAll('#grid .card').length,1);
 a.click('filterOpen');assert.ok(a.doc.getElementById('filterDialog').open);
 a.doc.getElementById('diff').value='Svær';a.doc.getElementById('diff').dispatchEvent(new a.w.Event('change'));
 assert.equal(a.doc.querySelectorAll('#grid .card').length,0);
 a.click('filterApply');a.click('resetFilters');
 assert.ok(a.doc.querySelectorAll('#grid .card').length>100);
 assert.deepEqual(a.errors,[]);a.close();
});
test('own drawing can be created, reopened and edited without losing catalogue data',async()=>{
 const a=app();await a.settle();a.choose('[data-nav="byg"]');await a.settle();
 // Exercise editor data through the existing application API; canvas rasterisation is browser QA.
 a.w.eval('grid[1][1]="R";grid[1][2]="Y"');
 a.doc.getElementById('ownName').value='Testmodel';a.click('save');await a.settle();
 assert.equal(a.doc.getElementById('dName').textContent,'Testmodel');
 assert.match(a.doc.getElementById('total').textContent,/2 brikker/);
 a.click('editOwn');await a.settle();
 assert.equal(a.doc.getElementById('ownName').value,'Testmodel');
 assert.deepEqual(a.errors,[]);a.close();
});
test('three builders and one-screen-per-builder assignment preserve exact parts',async()=>{
 const a=app();await a.settle();a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
 a.choose('[data-mode="together"]');a.choose('#teamCount [data-n="3"]');
 a.choose('#teamMe [data-me="1"]');a.click('teamStart');
 assert.equal(a.doc.querySelectorAll('#partTabs button').length,1);
 assert.equal(a.doc.querySelector('#partTabs button').textContent,'Alfred');
 assert.match(a.doc.getElementById('buildPerson').textContent,/Alfred/);
 a.click('overviewButton');assert.match(a.doc.getElementById('overviewLegend').textContent,/Jens.*Alfred.*Far/);
 assert.deepEqual(a.errors,[]);a.close();
});
test('keyboard skip navigation focuses visible content without changing app route',async()=>{
 const a=app();await a.settle();a.click('skipLink');await a.settle();
 assert.equal(a.w.location.hash,'');assert.equal(a.doc.activeElement.id,'listView');
 a.choose('[data-id="motiver50-01"] .model-link');await a.settle();a.click('aloneStart');
 assert.equal(a.doc.getElementById('detailBack').getAttribute('aria-label'),'Tilbage til forberedelse');
 a.click('skipLink');assert.equal(a.doc.activeElement.id,'detailView');assert.deepEqual(a.errors,[]);a.close();
});
test('one-row own model cannot select a non-existent dedicated builder',async()=>{
 const a=app();await a.settle();a.choose('[data-nav="byg"]');await a.settle();a.w.eval('grid[1][1]="R";grid[1][2]="Y"');a.click('save');await a.settle();
 a.w.eval('team.me=1');a.choose('[data-mode="together"]');
 assert.equal(a.doc.querySelectorAll('#teamMe [data-me="1"]').length,0);
 a.click('teamStart');assert.equal(a.doc.querySelectorAll('#partTabs button').length,1);
 a.click('next');assert.deepEqual(a.errors,[]);a.close();
});
