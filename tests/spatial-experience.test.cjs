const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(new URL('../index.html',`file://${__filename}`),'utf8').replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(new URL('../'+src,`file://${__filename}`),'utf8')+'</script>');
function app(options={}){
 const errors=[],renders=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(html,{url:options.url||'https://example.test/#m-spatial50-01',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  for(const[k,v]of Object.entries(options.storage||{}))w.localStorage.setItem(k,v);
  w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../'+String(url),`file://${__filename}`),'utf8'))});
  w.requestAnimationFrame=fn=>w.setTimeout(fn,0);w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{},set:()=>true});
  w.Spatial3D={createSpatialViewer(){let ids=[];return{update(input){ids=input.pieces.map(p=>p.id);renders.push({type:'model',ids})},setStep(s){assert.ok(s.currentIds.every(id=>ids.includes(id)));assert.ok(!s.currentIds.some(id=>s.attachedIds.includes(id)));renders.push({type:'step',...JSON.parse(JSON.stringify(s))})},setView(){},zoom(){},dispose(){renders.push({type:'dispose'})}}}};
 }});
 const w=dom.window,doc=w.document;
 return{w,doc,errors,renders,click:id=>doc.getElementById(id).click(),settle:async()=>{for(let i=0;i<4;i++)await new Promise(r=>w.setTimeout(r,0))},storage:()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)])),close:()=>w.close()};
}
test('spatial solo uses one brick per step, shows placement, resumes and completes the same sculpture',async()=>{
 const a=app();await a.settle();assert.equal(a.doc.getElementById('spatialName').textContent,'Pingvin');assert.equal(a.doc.getElementById('spatialStart').disabled,false);
 a.click('spatialStart');assert.match(a.doc.getElementById('spatialStep').textContent,/Trin 1 af 78 · 1 brik/);
 a.click('spatialNext');assert.match(a.doc.getElementById('spatialNext').textContent,/sat på/);a.click('spatialNext');
 const b=app({storage:a.storage()});await b.settle();assert.equal(b.doc.getElementById('spatialStart').textContent,'Fortsæt byggeriet');b.click('spatialStart');assert.match(b.doc.getElementById('spatialStep').textContent,/Trin 2 af 78/);
 for(let i=0;i<160&&!b.doc.getElementById('spatialNext').disabled;i++)b.click('spatialNext');
 assert.equal(b.doc.getElementById('spatialPerson').textContent,'Flot bygget!');assert.equal(b.doc.getElementById('spatialProgress').value,100);
 assert.deepEqual(a.errors.concat(b.errors),[]);a.close();b.close();
});
test('cooperative sculpture alternates only after placement, supports named smaller tasks, undo and cancellation',async()=>{
 const a=app();await a.settle();a.doc.querySelector('#spatialMode [data-mode="together"]').click();
 const select=a.doc.getElementById('spatialSmallest');select.value='0';select.dispatchEvent(new a.w.Event('change'));
 assert.match(a.doc.getElementById('spatialSplitInfo').textContent,/Jens:.*Alfred:/);
 a.click('spatialStart');assert.equal(a.doc.getElementById('spatialPerson').textContent,'Jens bygger');
 a.click('spatialNext');assert.equal(a.doc.getElementById('spatialPerson').textContent,'Jens bygger');
 a.click('spatialNext');assert.equal(a.doc.getElementById('spatialPerson').textContent,'Alfred bygger');
 a.click('spatialPrevious');assert.equal(a.doc.getElementById('spatialPerson').textContent,'Jens bygger');
 a.click('spatialBack');await a.settle();a.w.location.hash='m-spatial50-01';await a.settle();a.doc.querySelector('#spatialMode [data-mode="together"]').click();
 assert.equal(a.doc.getElementById('spatialStart').textContent,'Fortsæt byggeriet');
 const before=a.w.localStorage.getItem('bv_spatial_progress');a.click('spatialRestart');a.click('confirmCancel');await a.settle();assert.equal(a.w.localStorage.getItem('bv_spatial_progress'),before);
 assert.deepEqual(a.errors,[]);a.close();
});
test('resizing preserves the active 3D scene, step and saved progress',async()=>{
 const a=app();await a.settle();a.click('spatialStart');a.click('spatialNext');a.click('spatialNext');
 const step=a.doc.getElementById('spatialStep').textContent,disposals=a.renders.filter(r=>r.type==='dispose').length;
 a.w.dispatchEvent(new a.w.Event('resize'));await new Promise(r=>a.w.setTimeout(r,250));
 assert.equal(a.doc.getElementById('spatialView').classList.contains('hide'),false);assert.equal(a.doc.getElementById('spatialStep').textContent,step);assert.equal(a.renders.filter(r=>r.type==='dispose').length,disposals);assert.deepEqual(a.errors,[]);a.close();
});
