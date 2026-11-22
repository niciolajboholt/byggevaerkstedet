const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(new URL('../index.html',`file://${__filename}`),'utf8').replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(new URL('../'+src,`file://${__filename}`),'utf8')+'</script>');
const snapshotStorage=a=>Object.fromEntries(Array.from({length:a.w.localStorage.length},(_,i)=>{const key=a.w.localStorage.key(i);return [key,a.w.localStorage.getItem(key)]}));
function app(options={}){
 const errors=[];
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const d=new JSDOM(html,{url:options.url||'https://example.test/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  for(const [key,value] of Object.entries(options.storage||{}))w.localStorage.setItem(key,value);
  w.fetch=options.catalogueFetch|| (async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'))}));
  w.confirm=()=>true;
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
test('shared iPad alternates builders only after a task is built and attached',async()=>{
 const a=app();await a.settle();a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
 a.choose('[data-mode="together"]');a.click('teamStart');
 assert.equal(a.doc.querySelectorAll('#partTabs .task-builder').length,2);
 assert.match(a.doc.getElementById('buildPerson').textContent,/Jens/);
 a.click('next');assert.match(a.doc.getElementById('buildPerson').textContent,/Jens/);
 assert.equal(a.doc.getElementById('next').textContent,'Stykket er sat på');
 assert.equal(a.doc.getElementById('progressBar').getAttribute('aria-valuenow'),'0');
 a.click('next');assert.match(a.doc.getElementById('buildPerson').textContent,/Alfred/);
 assert.ok(+a.doc.getElementById('progressBar').getAttribute('aria-valuenow')>0);
 a.click('prev');assert.match(a.doc.getElementById('buildPerson').textContent,/Jens/);
 assert.equal(a.doc.getElementById('next').textContent,'Stykket er sat på');
 for(let i=0;i<100&&!a.doc.getElementById('next').disabled;i++)a.click('next');
 assert.equal(a.doc.getElementById('doneBox').classList.contains('hide'),false);
 assert.equal(a.doc.getElementById('progressBar').getAttribute('aria-valuenow'),'100');
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
test('setup offers shared-iPad tasks and live sync without obsolete screen sharing',async()=>{
 const a=app();await a.settle();a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
 a.choose('[data-mode="together"]');a.choose('#teamCount [data-n="3"]');
 assert.equal(a.doc.querySelector('.device-options,#teamMe,#shareLinks,#meInfo'),null);
 assert.ok(a.doc.getElementById('liveRoomCreate'));
 a.click('teamStart');assert.match(a.doc.getElementById('buildPerson').textContent,/Jens/);
 a.click('next');a.click('next');assert.match(a.doc.getElementById('buildPerson').textContent,/Alfred/);
 assert.deepEqual(a.errors,[]);a.close();
});
test('keyboard skip navigation focuses visible content without changing app route',async()=>{
 const a=app();await a.settle();a.click('skipLink');await a.settle();
 assert.equal(a.w.location.hash,'');assert.equal(a.doc.activeElement.id,'listView');
 a.choose('[data-id="motiver50-01"] .model-link');await a.settle();a.click('aloneStart');
 assert.equal(a.doc.getElementById('detailBack').getAttribute('aria-label'),'Tilbage til forberedelse');
 a.click('skipLink');assert.equal(a.doc.activeElement.id,'detailView');assert.deepEqual(a.errors,[]);a.close();
});
test('one-row own model still gives both builders a task and retains all bricks',async()=>{
 const a=app();await a.settle();a.choose('[data-nav="byg"]');await a.settle();a.w.eval('grid[1][1]="R";grid[1][2]="Y"');a.click('save');await a.settle();
 a.choose('[data-mode="together"]');a.click('teamStart');
 assert.match(a.doc.getElementById('buildPerson').textContent,/Jens/);
 a.click('next');a.click('next');assert.match(a.doc.getElementById('buildPerson').textContent,/Alfred/);
 a.click('next');a.click('next');assert.equal(a.doc.getElementById('progressBar').getAttribute('aria-valuenow'),'100');
 assert.deepEqual(a.errors,[]);a.close();
});
test('smallest part can be assigned to either named builder and survives swapping places',async()=>{
 const a=app();await a.settle();a.choose('[data-id="motiver50-02"] .model-link');await a.settle();a.choose('[data-mode="together"]');
 for(const i of [0,1]){
  a.choose(`#teamSplit [data-smallest="${i}"]`);
  const result=a.w.eval('JSON.stringify(parts.map(p=>({name:p.name,n:p.n})))');const parts=JSON.parse(result);
  assert.equal(parts[i].n,Math.min(...parts.map(p=>p.n)));
  assert.equal(a.doc.querySelector(`#teamSplit [data-smallest="${i}"]`).getAttribute('aria-pressed'),'true');
 }
 a.click('swapBuilders');
 assert.equal(a.doc.getElementById('builderName0').value,'Alfred');
 assert.equal(a.doc.getElementById('builderName1').value,'Jens');
 const saved=JSON.parse(a.w.localStorage.getItem('bv_team'));
 assert.equal(saved.smallest,0);assert.equal(saved.me,null);assert.equal(saved.split,'small');
 assert.equal(a.doc.querySelector('#teamSplit [data-smallest="0"]').textContent,'Mindre opgaver til Alfred');
 a.click('teamStart');assert.match(a.doc.getElementById('buildPerson').textContent,/Alfred/);
 assert.deepEqual(a.errors,[]);a.close();
});
test('smallest assignment preserves all bricks and physical assembly order for every motif and builder',async()=>{
 const a=app();await a.settle();
 const checks=JSON.parse(a.w.eval(`JSON.stringify(BUILDS.flatMap(b=>[2,3].flatMap(n=>Array.from({length:n},(_,selected)=>{
  cur=b;team.n=n;team.split='small';team.smallest=selected;buildParts();
  const physical=orderedParts();
  return {id:b.id,n,selected,minimum:Math.min(...parts.map(p=>p.n)),assigned:parts[selected].n,total:parts.reduce((s,p)=>s+p.n,0),expected:b.total,ordered:physical.every((p,i)=>!i||p.r0===physical[i-1].r1+1),first:physical[0].r0,last:physical.at(-1).r1,expectedLast:b.p.length-1};
 }))))`));
 for(const c of checks){assert.equal(c.assigned,c.minimum,`${c.id}: builder ${c.selected}`);assert.equal(c.total,c.expected);assert.ok(c.ordered);assert.equal(c.first,0);assert.equal(c.last,c.expectedLast)}
 assert.deepEqual(a.errors,[]);a.close();
});

test('solo resumes after leaving and reloading; restart is explicit and cancellable',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01'});await a.settle();a.click('aloneStart');
 for(let i=0;i<3;i++)a.click('next');
 a.click('detailBack');a.click('detailBack');await a.settle();a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
 assert.equal(a.doc.getElementById('aloneStart').textContent,'Fortsæt byggeriet');a.click('aloneStart');
 assert.match(a.doc.getElementById('rowTitle').textContent,/Række 4 af 10/);
 const b=app({url:a.w.location.href,storage:snapshotStorage(a)});await b.settle();b.click('aloneStart');
 assert.match(b.doc.getElementById('rowTitle').textContent,/Række 4 af 10/);
 b.click('detailBack');b.click('restartBuild');b.click('confirmCancel');await b.settle();b.click('aloneStart');
 assert.match(b.doc.getElementById('rowTitle').textContent,/Række 4 af 10/);
 b.click('detailBack');b.click('restartBuild');b.click('confirmAccept');await b.settle();
 assert.match(b.doc.getElementById('rowTitle').textContent,/Række 1 af 10/);
 assert.deepEqual(a.errors.concat(b.errors),[]);a.close();b.close();
});

test('shared tasks resume at placement after reload and changing distribution keeps separate progress',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01'});await a.settle();a.choose('[data-mode="together"]');a.click('teamStart');
 a.click('next');a.click('next');a.click('next');
 const b=app({url:a.w.location.href,storage:snapshotStorage(a)});await b.settle();b.click('teamStart');
 assert.match(b.doc.getElementById('buildPerson').textContent,/Alfred/);
 assert.equal(b.doc.getElementById('next').textContent,'Stykket er sat på');
 b.click('detailBack');b.choose('#teamSplit [data-smallest="0"]');assert.equal(b.doc.getElementById('teamStart').textContent,'Start byggeriet');
 b.choose('#teamSplit [data-s="even"]');b.click('teamStart');assert.match(b.doc.getElementById('buildPerson').textContent,/Alfred/);
 assert.equal(b.doc.getElementById('next').textContent,'Stykket er sat på');
 assert.deepEqual(a.errors.concat(b.errors),[]);a.close();b.close();
});

test('changed model geometry never resumes an incompatible row',async()=>{
 const model={id:'own-test',name:'Own',p:['RR','YY']};
 const a=app({url:'https://example.test/#m-own-test',storage:{bv_own:JSON.stringify([model])}});await a.settle();a.click('aloneStart');a.click('next');
 const storage=snapshotStorage(a);storage.bv_own=JSON.stringify([{...model,p:['RR','YY','BB']}]);
 const b=app({url:a.w.location.href,storage});await b.settle();
 assert.equal(b.doc.getElementById('aloneStart').textContent,'Start byggeriet');b.click('aloneStart');assert.match(b.doc.getElementById('rowTitle').textContent,/Række 1 af 3/);
 a.close();b.close();
});

test('shrinking drawing warns before removing bricks; undo restores dimensions and contents',async()=>{
 const a=app({url:'https://example.test/#byg'});await a.settle();
 const resize=n=>{a.doc.getElementById('size').value=String(n);a.doc.getElementById('size').dispatchEvent(new a.w.Event('change'))};
 resize(24);a.w.eval('grid[12][12]="R"');resize(10);a.click('confirmCancel');await a.settle();
 assert.equal(a.doc.getElementById('size').value,'24');assert.equal(a.w.eval('grid[12][12]'),'R');
 resize(10);a.click('confirmAccept');await a.settle();resize(24);a.click('undo');assert.equal(a.doc.getElementById('size').value,'10');
 a.click('undo');assert.equal(a.doc.getElementById('size').value,'24');assert.equal(a.w.eval('grid[12][12]'),'R');
 a.click('save');await a.settle();assert.match(a.doc.getElementById('total').textContent,/1 brikker/);assert.deepEqual(a.errors,[]);a.close();
});

test('shared links override reversed local names and lock complementary row assignments',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01'});await a.settle();a.choose('[data-mode="together"]');
 // Previously issued links remain readable, but are no longer generated in setup.
 const model=JSON.parse(a.w.eval('JSON.stringify(cur.p)'));
 const links=[0,1].map(me=>'https://example.test/#m-motiver50-01?team='+encodeURIComponent(JSON.stringify({v:1,p:model,n:2,names:['Jens','Alfred'],split:'even',smallest:1,me})));
 const screens=links.map(url=>app({url,storage:{bv_team:JSON.stringify({n:2,names:['Alfred','Jens'],split:'even'})}}));
 const assigned=[];
 for(const b of screens){await b.settle();assert.equal(b.doc.getElementById('swapBuilders').disabled,true);b.click('teamStart');assigned.push(JSON.parse(b.w.eval('JSON.stringify(parts[active])')));assert.deepEqual(b.errors,[])}
 assert.deepEqual(assigned.map(p=>p.name),['Jens','Alfred']);assert.equal(assigned[0].r1+1,assigned[1].r0);assert.equal(assigned.reduce((n,p)=>n+p.n,0),30);
 for(const b of screens)b.close();a.close();
});

test('outdated and malformed sharing links show a clear warning',async()=>{
 const plan={v:1,p:['R'],n:2,names:['Jens','Alfred'],split:'even',smallest:1,me:0};
 for(const encoded of [encodeURIComponent(JSON.stringify(plan)),'%bad']){
  const a=app({url:'https://example.test/#m-motiver50-01?team='+encoded});await a.settle();assert.match(a.doc.getElementById('resumeInfo').textContent,/beskadiget/);assert.deepEqual(a.errors,[]);a.close();
 }
});

test('category and collection filters retain keyboard focus after activation',async()=>{
 const a=app();await a.settle();a.click('filterOpen');
 a.doc.querySelector('#tabs [data-t="Magi"]').focus();a.choose('#tabs [data-t="Magi"]');assert.equal(a.doc.activeElement.dataset.t,'Magi');
 a.click('filterApply');a.doc.querySelector('[data-quick="50 nye"]').focus();a.choose('[data-quick="50 nye"]');assert.equal(a.doc.activeElement.dataset.quick,'50 nye');a.close();
});

test('keyboard drawing supports movement, placement, deletion, undo and saving',async()=>{
 const a=app({url:'https://example.test/#byg'});await a.settle();const pad=a.doc.getElementById('pad');pad.focus();
 const key=value=>pad.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
 key('ArrowRight');key('ArrowDown');key(' ');assert.match(a.doc.getElementById('padStatus').textContent,/Række 2, kolonne 2: Rød/);
 key('Delete');assert.match(a.doc.getElementById('padStatus').textContent,/kolonne 2: tom/);a.click('undo');
 assert.equal(a.w.eval('grid[1][1]'),'R');a.click('save');await a.settle();assert.match(a.doc.getElementById('total').textContent,/1 brik/);
 assert.deepEqual(a.errors,[]);a.close();
});

 test('smaller tasks remain assignable to the second builder on a one-row own model',async()=>{
 const a=app({url:'https://example.test/#m-own-small',storage:{bv_own:JSON.stringify([{id:'own-small',name:'Lille',p:['RRRR']}])}});await a.settle();
 a.choose('[data-mode="together"]');a.choose('#teamSplit [data-smallest="1"]');
 assert.equal(JSON.parse(a.w.localStorage.getItem('bv_team')).smallest,1);
 assert.match(a.doc.getElementById('splitInfo').textContent,/Alfred: 1 brikker/);
 a.click('teamStart');a.click('next');a.click('next');assert.match(a.doc.getElementById('buildPerson').textContent,/Alfred/);
 assert.match(a.doc.getElementById('rowTitle').textContent,/1 brik/);
 assert.deepEqual(a.errors,[]);a.close();
});

test('ordinary model opening defaults to shared iPad despite a saved dedicated-screen preference',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01',storage:{bv_mode:'"together"',bv_team:JSON.stringify({n:2,names:['Jens','Alfred'],split:'even',me:0})}});await a.settle();
 assert.ok(a.doc.querySelector('#teamSplit [data-s="even"]').textContent.includes('Opgaver på skift'));
 a.click('teamStart');assert.match(a.doc.getElementById('buildPerson').textContent,/Jens/);
 a.click('next');a.click('next');assert.match(a.doc.getElementById('buildPerson').textContent,/Alfred/);
 assert.deepEqual(a.errors,[]);a.close();
});

test('four new categories expose all 62 approved motifs and large crests remain visible by default',async()=>{
 const a=app();await a.settle();
 assert.equal(a.doc.querySelectorAll('#grid .card').length,250);
 for(const [cat,n] of [['Skibe',15],['Blomster',15],['Eksotiske dyr',15],['Klublogoer',17]]){
  a.choose(`.featured-categories [data-theme-category="${cat}"]`);
  assert.equal(a.doc.querySelectorAll('#grid .card').length,n);
  a.click('resetFilters');
 }
 a.choose('.featured-categories [data-theme-category="Klublogoer"]');
 a.doc.getElementById('pieceLimit').value='250';a.doc.getElementById('pieceLimit').dispatchEvent(new a.w.Event('change'));
 assert.equal(a.doc.querySelectorAll('#grid .card').length,8);
 a.click('resetFilters');assert.equal(a.doc.querySelectorAll('#grid .card').length,250);
 a.choose('[data-id="tema62-titanic"] .model-link');await a.settle();a.click('aloneStart');assert.match(a.doc.getElementById('rowTitle').textContent,/Række 1/);
 assert.deepEqual(a.errors,[]);a.close();
});

test('catalogue load failure can retry without touching saved user data',async()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));let calls=0;
 const storage={bv_likes:JSON.stringify(['motiver50-01'])};
 const a=app({storage,catalogueFetch:async()=>{if(!calls++)throw Error('offline');return {ok:true,json:async()=>data}}});await a.settle();
 assert.equal(a.doc.getElementById('catalogueStatus').getAttribute('role'),'alert');assert.equal(a.doc.getElementById('listView').inert,true);assert.equal(a.w.localStorage.getItem('bv_likes'),storage.bv_likes);
 a.click('catalogueRetry');await a.settle();assert.equal(a.doc.querySelectorAll('#grid .card').length,250);assert.equal(a.doc.getElementById('listView').inert,false);assert.deepEqual(a.errors,[]);a.close();
});
test('renaming a motif through JSON preserves its favourite and saved solo step',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01'});await a.settle();a.click('guideFavorite');a.click('aloneStart');a.click('next');const storage=snapshotStorage(a);a.close();
 const data=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));data.models.find(m=>m.id==='motiver50-01').name='Min stjernestav';
 const b=app({url:'https://example.test/#m-motiver50-01',storage,catalogueFetch:async()=>({ok:true,json:async()=>data})});await b.settle();
 assert.equal(b.doc.getElementById('dName').textContent,'Min stjernestav');assert.equal(b.doc.getElementById('guideFavorite').getAttribute('aria-pressed'),'true');assert.equal(b.doc.getElementById('aloneStart').textContent,'Fortsæt byggeriet');b.click('aloneStart');assert.match(b.doc.getElementById('rowTitle').textContent,/Række 2/);assert.deepEqual(b.errors,[]);b.close();
});
