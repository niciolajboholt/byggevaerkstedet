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
  w.fetch=(url,init)=>String(url).endsWith('prototyper-3d.json')?Promise.resolve({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../data/prototyper-3d.json',`file://${__filename}`),'utf8'))}):String(url).endsWith('navne.json')?Promise.resolve({ok:true,json:async()=>options.names||JSON.parse(fs.readFileSync(new URL('../data/navne.json',`file://${__filename}`),'utf8'))}):(options.catalogueFetch|| (async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'))})))(url,init);
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
 for(let i=0;i<20&&!a.doc.getElementById('next').disabled;i++)a.click('next');
 assert.equal(a.doc.getElementById('doneBox').classList.contains('hide'),false);
 a.click('prev');assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 11 af 11/);
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
 assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 2 af 11/);assert.deepEqual(a.errors,[]);a.close();
});
test('search, favourites, categories and piece limit combine correctly',async()=>{
 const a=app();await a.settle();const q=a.doc.getElementById('q');q.value='01';q.dispatchEvent(new a.w.Event('input'));
 assert.equal(a.doc.querySelectorAll('#grid .card').length,1);
 a.choose('[data-like="motiver50-01"]');a.choose('[data-quick="Likede"]');
 assert.equal(a.doc.querySelectorAll('#grid .card').length,1);
 a.click('filterOpen');assert.ok(a.doc.getElementById('filterDialog').open);
 a.doc.getElementById('diff').value='Svær';a.doc.getElementById('diff').dispatchEvent(new a.w.Event('change'));
 assert.equal(a.doc.querySelectorAll('#grid .card').length,1);
 a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
 assert.match(a.w.location.hash,/level=hard/);assert.match(a.doc.getElementById('dMeta').textContent,/Svær/);
 a.click('detailBack');await a.settle();
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
 assert.ok(a.doc.getElementById('variantSetup').classList.contains('hide'));
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
 assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 4 af 11/);
 const b=app({url:a.w.location.href,storage:snapshotStorage(a)});await b.settle();b.click('aloneStart');
 assert.match(b.doc.getElementById('rowTitle').textContent,/Trin 4 af 11/);
 b.click('detailBack');b.click('restartBuild');b.click('confirmCancel');await b.settle();b.click('aloneStart');
 assert.match(b.doc.getElementById('rowTitle').textContent,/Trin 4 af 11/);
 b.click('detailBack');b.click('restartBuild');b.click('confirmAccept');await b.settle();
 assert.match(b.doc.getElementById('rowTitle').textContent,/Trin 1 af 11/);
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
 assert.equal(b.doc.getElementById('aloneStart').textContent,'Start byggeriet');b.click('aloneStart');assert.match(b.doc.getElementById('rowTitle').textContent,/Trin 1 af 3/);
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
 assert.equal(a.doc.querySelectorAll('#grid .card').length,270);
 for(const [cat,n] of [['Skibe',15],['Blomster',15],['Eksotiske dyr',15],['Klublogoer',17]]){
  a.choose(`.featured-categories [data-theme-category="${cat}"]`);
  assert.equal(a.doc.querySelectorAll('#grid .card').length,n);
  a.click('resetFilters');
 }
 a.choose('.featured-categories [data-theme-category="Klublogoer"]');
 a.doc.getElementById('pieceLimit').value='250';a.doc.getElementById('pieceLimit').dispatchEvent(new a.w.Event('change'));
 assert.equal(a.doc.querySelectorAll('#grid .card').length,17);
 assert.ok(Array.from(a.doc.querySelectorAll('#grid .card .meta')).every(el=>+el.textContent.match(/(\d+) brikker/)[1]<=250));
 a.click('resetFilters');assert.equal(a.doc.querySelectorAll('#grid .card').length,270);
 a.choose('[data-id="tema62-titanic"] .model-link');await a.settle();a.click('aloneStart');assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 1/);
 assert.deepEqual(a.errors,[]);a.close();
});

test('catalogue load failure can retry without touching saved user data',async()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));let calls=0;
 const storage={bv_likes:JSON.stringify(['motiver50-01'])};
 const a=app({storage,catalogueFetch:async()=>{if(!calls++)throw Error('offline');return {ok:true,json:async()=>data}}});await a.settle();
 assert.equal(a.doc.getElementById('catalogueStatus').getAttribute('role'),'alert');assert.equal(a.doc.getElementById('listView').inert,true);assert.equal(a.w.localStorage.getItem('bv_likes'),storage.bv_likes);
 a.click('catalogueRetry');await a.settle();assert.equal(a.doc.querySelectorAll('#grid .card').length,270);assert.equal(a.doc.getElementById('listView').inert,false);assert.deepEqual(a.errors,[]);a.close();
});
test('renaming a motif through JSON preserves its favourite and saved solo step',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01'});await a.settle();a.click('guideFavorite');a.click('aloneStart');a.click('next');const storage=snapshotStorage(a);a.close();
 const data=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));const names=JSON.parse(fs.readFileSync(new URL('../data/navne.json',`file://${__filename}`),'utf8'));names['motiver50-01']='Min stjernestav';
 const b=app({url:'https://example.test/#m-motiver50-01',storage,names,catalogueFetch:async()=>({ok:true,json:async()=>data})});await b.settle();
 assert.equal(b.doc.getElementById('dName').textContent,'Min stjernestav');assert.equal(b.doc.getElementById('guideFavorite').getAttribute('aria-pressed'),'true');assert.equal(b.doc.getElementById('aloneStart').textContent,'Fortsæt byggeriet');b.click('aloneStart');assert.match(b.doc.getElementById('rowTitle').textContent,/Trin 2/);assert.deepEqual(b.errors,[]);b.close();
});


test('three difficulty choices retain one motif identity and separate solo progress by geometry',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01'});await a.settle();
 const original=JSON.parse(a.w.eval('JSON.stringify(cur.p)'));
 const selected=()=>a.doc.querySelector('#variantOptions [aria-pressed="true"]').dataset.level;
 assert.equal(a.doc.querySelectorAll('#variantOptions button').length,3);
 assert.deepEqual(Array.from(a.doc.querySelectorAll('#variantOptions button span'),b=>b.textContent),['Let','Mellem','Svær']);
 const originalLevel=selected();assert.deepEqual(JSON.parse(a.w.eval('JSON.stringify(cur.variants[cur.variantLevel||"'+originalLevel+'"].p)')),original);
 a.click('guideFavorite');a.click('aloneStart');a.click('next');a.click('detailBack');
 a.choose('#variantOptions [data-level="hard"]');await a.settle();
 assert.equal(selected(),'hard');assert.match(a.w.location.hash,/level=hard/);
 assert.equal(a.doc.getElementById('guideFavorite').getAttribute('aria-pressed'),'true');
 assert.equal(a.doc.getElementById('aloneStart').textContent,'Start byggeriet');
 assert.equal(a.w.eval('cur.total'),a.w.eval('pieces(cur.variants.hard.p).n'));
 a.click('aloneStart');assert.ok(a.doc.getElementById('variantSetup').classList.contains('hide'));
 a.click('next');a.click('next');a.click('detailBack');
 a.choose('#variantOptions [data-level="'+originalLevel+'"]');await a.settle();
 assert.equal(a.doc.getElementById('aloneStart').textContent,'Fortsæt byggeriet');a.click('aloneStart');
 assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 2 af 11/);
 const b=app({url:'https://example.test/#m-motiver50-01?level=hard',storage:snapshotStorage(a)});await b.settle();
 assert.equal(b.doc.querySelector('#variantOptions [aria-pressed="true"]').dataset.level,'hard');
 b.click('aloneStart');assert.match(b.doc.getElementById('rowTitle').textContent,/Trin 3/);
 assert.deepEqual(a.errors.concat(b.errors),[]);a.close();b.close();
});

test('difficulty and piece filters choose one matching version of each motif',async()=>{
 const a=app();await a.settle();
 for(const [label,key] of [['Let','easy'],['Mellem','medium'],['Svær','hard']]){
  a.doc.getElementById('diff').value=label;a.doc.getElementById('diff').dispatchEvent(new a.w.Event('change'));
  assert.equal(a.doc.querySelectorAll('#grid .card').length,270);
  a.choose('[data-id="motiver50-01"] .model-link');await a.settle();
  assert.match(a.w.location.hash,new RegExp('level='+key));
  assert.equal(a.doc.querySelector('#variantOptions [aria-pressed="true"]').dataset.level,key);
  assert.match(a.doc.getElementById('total').textContent,new RegExp(a.w.eval('cur.total')+' brikker'));
  a.click('detailBack');await a.settle();
 }
 a.click('resetFilters');a.doc.getElementById('pieceLimit').value='60';a.doc.getElementById('pieceLimit').dispatchEvent(new a.w.Event('change'));
 assert.equal(a.doc.querySelectorAll('#grid .card').length,270);
 assert.ok(Array.from(a.doc.querySelectorAll('#grid .card .meta')).every(el=>+el.textContent.match(/(\d+) brikker/)[1]<=60));
 a.choose('[data-id="tema62-titanic"] .model-link');await a.settle();assert.ok(a.w.eval('cur.total')<=60);
 assert.deepEqual(a.errors,[]);a.close();
});

test('selected variants build shared tasks, resume them and preserve legacy shared link geometry',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01?level=medium'});await a.settle();
 const pattern=JSON.parse(a.w.eval('JSON.stringify(cur.p)'));
 a.choose('[data-mode="together"]');a.click('teamStart');a.click('next');a.click('next');a.click('next');
 assert.ok(a.doc.getElementById('introBox').classList.contains('hide'));
 assert.equal(a.w.eval('CoopUI.enabled()'),true);
 const b=app({url:a.w.location.href,storage:snapshotStorage(a)});await b.settle();b.click('teamStart');
 assert.equal(b.doc.getElementById('next').textContent,'Stykket er sat på');
 assert.deepEqual(JSON.parse(b.w.eval('JSON.stringify(cur.p)')),pattern);
 const plan={v:1,p:pattern,n:2,names:['Jens %','Alfred'],split:'even',smallest:1,me:0};
 const c=app({url:'https://example.test/#m-motiver50-01?level=medium&team='+encodeURIComponent(JSON.stringify(plan))});await c.settle();
 assert.ok(c.doc.getElementById('variantSetup').classList.contains('hide'));assert.equal(c.doc.getElementById('teamStart').disabled,false);
 assert.equal(c.doc.getElementById('builderName0').value,'Jens %');
 c.click('unlockTeam');c.click('confirmAccept');await c.settle();
 assert.equal(c.w.location.hash,'#m-motiver50-01?level=medium');
 assert.equal(c.doc.querySelector('#variantOptions [aria-pressed="true"]').dataset.level,'medium');
 assert.deepEqual(a.errors.concat(b.errors,c.errors),[]);a.close();b.close();c.close();
});


test('unknown difficulty links keep the original pattern usable',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01?level=toString'});await a.settle();
 assert.equal(a.doc.getElementById('dName').textContent,'Stjernestav');
 assert.equal(a.w.eval('cur.total'),30);a.click('aloneStart');
 assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 1 af 11/);
 assert.deepEqual(a.errors,[]);a.close();
});

test('3D inspection uses the selected variant and does not change a solo build step or progress',async()=>{
 const a=app({url:'https://example.test/#m-motiver50-01?level=medium'});await a.settle();a.click('aloneStart');a.click('next');
 const title=a.doc.getElementById('rowTitle').textContent,progress=a.w.localStorage.getItem('bv_progress'),hash=a.w.location.hash;let data,disposed=0;
 a.w.Brick3DRenderer={createViewer:()=>({update:d=>data=d,reset:()=>{},zoom:()=>{},dispose:()=>disposed++})};
 a.click('model3DOpen');await a.settle();assert.ok(a.doc.getElementById('model3DDialog').open);
 assert.equal(data.tiles.length,a.w.eval('cur.total'));assert.equal(data.name,'Stjernestav');
 a.click('model3DFront');a.click('model3DClose');assert.equal(disposed,1);assert.equal(a.doc.getElementById('rowTitle').textContent,title);assert.equal(a.w.localStorage.getItem('bv_progress'),progress);assert.equal(a.w.location.hash,hash);assert.deepEqual(a.errors,[]);a.close();
});

test('Messi og CR7 theme opens all twenty approved motifs and their exact base guide',async()=>{
 const a=app();await a.settle();
 const theme=a.doc.querySelector('.featured-categories [data-theme-category="Messi og CR7"]');
 assert.ok(theme);assert.match(theme.textContent,/20 motiver/);theme.click();
 const cards=a.doc.querySelectorAll('#grid .card');assert.equal(cards.length,20);
 for(const card of cards){
  card.querySelector('.model-link').click();await a.settle();
  assert.equal(a.doc.querySelectorAll('#variantOptions button').length,3);
  assert.equal(a.doc.getElementById('model3DOpen').classList.contains('hide'),false);
 }
 assert.deepEqual(a.errors,[]);a.close();
});

test('solo Formula car builds attachable pieces, defers wheel rows, and resumes the exact piece',async()=>{
 const a=app({url:'https://example.test/#m-biler20-formelbil'});await a.settle();a.click('aloneStart');
 assert.equal(a.doc.getElementById('stepTitle').textContent,'Dette stykke');
 for(let i=0;i<16;i++)a.click('next');
 assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 17 af 20 · række 9 · 2 brikker/);
 assert.match(a.doc.getElementById('runs').textContent,/2 sort/);assert.doesNotMatch(a.doc.getElementById('runs').textContent,/tomme/);
 assert.match(a.doc.getElementById('taskInstruction').textContent,/sæt det fast/);
 const b=app({url:a.w.location.href,storage:snapshotStorage(a)});await b.settle();b.click('aloneStart');
 assert.equal(b.doc.getElementById('rowTitle').textContent,a.doc.getElementById('rowTitle').textContent);
 b.click('prev');assert.match(b.doc.getElementById('rowTitle').textContent,/Trin 16 af 20/);
 assert.deepEqual(a.errors.concat(b.errors),[]);a.close();b.close();
});
test('old row-only progress is kept but never mistaken for a connected step index',async()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));
 const m=raw.models.find(m=>m.id==='biler20-formelbil'),key=JSON.stringify([m.id,m.p,'alone',null]),saved={step:8,active:0,phase:'setup',parts:[]};
 const a=app({url:'https://example.test/#m-'+m.id,storage:{bv_progress:JSON.stringify({[key]:saved})}});await a.settle();
 assert.equal(a.doc.getElementById('aloneStart').textContent,'Start byggeriet');assert.match(a.doc.getElementById('resumeInfo').textContent,/ny byggerækkefølge/);
 a.click('aloneStart');assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 1 af 20/);
 assert.deepEqual(JSON.parse(a.w.localStorage.getItem('bv_progress'))[key],saved);assert.deepEqual(a.errors,[]);a.close();
});


test('prototype category exposes fifty approved concepts, filters them and returns to the building catalogue',async()=>{
 const a=app();await a.settle();a.choose('.featured-categories [data-theme-category="3D-prototyper"]');await a.settle();
 assert.equal(a.w.location.hash,'#3d-prototyper');assert.equal(a.doc.getElementById('prototypeView').classList.contains('hide'),false);
 assert.equal(a.doc.getElementById('listView').classList.contains('hide'),true);assert.equal(a.doc.querySelectorAll('.prototype-card').length,50);
 assert.match(a.doc.getElementById('prototypeCount').textContent,/50 af 50/);
 a.choose('[data-prototype-theme="Dyr"]');assert.equal(a.doc.querySelectorAll('.prototype-card').length,10);
 const q=a.doc.getElementById('prototypeSearch');q.value='pingvin';q.dispatchEvent(new a.w.Event('input'));assert.equal(a.doc.querySelectorAll('.prototype-card').length,1);
 a.choose('.prototype-card');assert.equal(a.doc.getElementById('prototypeDialog').open,true);assert.match(a.doc.getElementById('prototypeDialog').textContent,/Byggevejledningen er ikke klar/);
 assert.equal(a.doc.querySelector('#prototypeDialog a').getAttribute('href'),'assets/3d-prototypes/board-1.svg');
 a.doc.querySelector('#prototypeDialog button').click();a.click('prototypeBack');await a.settle();
 assert.equal(a.doc.getElementById('prototypeView').classList.contains('hide'),true);assert.equal(a.doc.querySelectorAll('#grid .card').length,270);assert.deepEqual(a.errors,[]);a.close();
});
