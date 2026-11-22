const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const BuildTasks=require('../build-tasks.js');

function catalogue(){
 const html=readFileSync(new URL('../index.html',`file://${__filename}`),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const catalogueData=JSON.parse(readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));
const catalogueNames=JSON.parse(readFileSync(new URL('../data/navne.json',`file://${__filename}`),'utf8'));catalogueData.models.forEach(m=>m.name=catalogueNames[m.id]);
 const context=vm.createContext({catalogueData,localStorage:{getItem:()=>null}});
 vm.runInContext(script.slice(0,script.indexOf('// ---------- list ----------'))+'\nBUILDS.push(...catalogueData.models.map(enrich));CATS.push(...catalogueData.categories);catalogueReady=true;this.models=BUILDS;',context);
 return Array.from(context.models);
}
const models=catalogue();

for(const builders of [2,3]) test(`all catalogue models: ${builders} builders get a deterministic complete plan with correct parity`,()=>{
 for(const model of models){
  for(const smallest of [null,...Array.from({length:builders},(_,i)=>i)]){
   const options={builderCount:builders,smallest};
   const plan=BuildTasks.createPlan(Array.from(model.p),options);
   assert.deepEqual(plan,BuildTasks.createPlan(Array.from(model.p),options));
   assert.equal(plan.total,model.total,model.id);
   assert.equal(plan.totals.reduce((a,b)=>a+b,0),model.total);
   const positions=new Set();
   plan.tasks.forEach((task,i)=>{
    assert.equal(task.owner,i%builders,model.id);
    assert.ok(task.n>0);
    assert.equal(task.n,task.tiles.length);
    assert.deepEqual(task.dependencies,i?[plan.tasks[i-1].id]:[]);
    const counts={};let gapped=false;
    task.tiles.forEach((tile,j)=>{
     assert.equal(tile.row,task.row);
     assert.equal(tile.y,tile.row);
     assert.equal(tile.c,model.p[tile.row][tile.x]);
     assert.equal(tile.o,(tile.x+tile.y)%2?'v':'h');
     const key=`${tile.x},${tile.row}`;
     assert.ok(!positions.has(key),`duplicate ${model.id} ${key}`);positions.add(key);
     counts[tile.c]=(counts[tile.c]||0)+1;
     if(j&&tile.x!==task.tiles[j-1].x+1)gapped=true;
    });
    assert.equal(task.directPlacement,gapped);
    assert.deepEqual(task.counts,counts);
    if(i)assert.ok(task.row>=plan.tasks[i-1].row,'assembly preserves absolute row order');
   });
   assert.equal(positions.size,model.total);
   if(smallest!==null&&plan.totals[smallest]>=Math.min(...plan.totals.filter((_,i)=>i!==smallest))){
    assert.ok(plan.assignmentNote,'explain geometry that prevents smaller total load');
   }
  }
 }
});

test('a gapped row keeps its absolute positions and explicitly instructs direct placement',()=>{
 const p=BuildTasks.createPlan(['..R...BB.','..RRRRBB.'],{builderCount:2});
 assert.equal(p.tasks[0].directPlacement,true);
 assert.deepEqual(p.tasks[0].tiles.map(t=>t.x),[2,6,7]);
 assert.ok(p.tasks[0].instruction.includes('næste rækker'));
 assert.equal(p.tasks[1].directPlacement,false);
});

test('smaller tasks give the chosen builder fewer bricks and retain alternating turns',()=>{
 for(const builderCount of [2,3])for(let smallest=0;smallest<builderCount;smallest++){
  const p=BuildTasks.createPlan(Array(8).fill('RRRRRRRRRRRR'),{builderCount,smallest});
  assert.ok(p.totals[smallest]<Math.min(...p.totals.filter((_,i)=>i!==smallest)));
  assert.ok(p.tasks.filter(t=>t.owner===smallest).every(t=>t.n>1),'wide regular rows avoid singleton turns');
 }
});

test('one-row motifs can be shared; tiny motifs explain unfilled builder places',()=>{
 const p=BuildTasks.createPlan(['RRRRRRRRR'],{builderCount:3});
 assert.deepEqual(p.totals,[3,3,3]);
 const tiny=BuildTasks.createPlan(['R'],{builderCount:3});
 assert.ok(tiny.assignmentNote);assert.equal(tiny.tasks.length,1);
});

test('ready and attached are separate; duplicate transitions do not skip tasks; undo restores confirmation',()=>{
 const plan=BuildTasks.createPlan(['RRR','BBB'],{builderCount:2});
 let state=BuildTasks.createSession(plan);
 assert.equal(BuildTasks.currentTask(plan,state),plan.tasks[0]);
 assert.deepEqual(BuildTasks.attach(plan,state),state,'cannot attach an unfinished piece');
 state=BuildTasks.markReady(plan,state);assert.equal(state.stage,'ready');
 assert.deepEqual(BuildTasks.markReady(plan,state),state);
 assert.equal(BuildTasks.undo(plan,state).stage,'building');
 state=BuildTasks.attach(plan,state);assert.equal(state.index,1);assert.equal(state.stage,'building');
 assert.deepEqual(BuildTasks.attach(plan,state),state,'a repeated attachment click cannot advance again');
 assert.deepEqual({...BuildTasks.undo(plan,state),signature:undefined},{...BuildTasks.markReady(plan,BuildTasks.createSession(plan)),signature:undefined});
 state=BuildTasks.attach(plan,BuildTasks.markReady(plan,state));
 assert.equal(state.stage,'done');assert.equal(BuildTasks.currentTask(plan,state),null);
 assert.equal(BuildTasks.undo(plan,state).stage,'ready');assert.equal(BuildTasks.undo(plan,state).index,1);
});

test('resume rejects a stale plan, new schema, invalid step or impossible completion',()=>{
 const plan=BuildTasks.createPlan(['RRR','BBB'],{builderCount:2});
 const saved=BuildTasks.markReady(plan,BuildTasks.createSession(plan));
 assert.deepEqual(BuildTasks.restoreSession(plan,JSON.parse(JSON.stringify(saved))),saved);
 const changed=BuildTasks.createPlan(['RRR','BBR'],{builderCount:2});
 assert.equal(BuildTasks.restoreSession(changed,saved),null);
 assert.equal(BuildTasks.restoreSession(BuildTasks.createPlan(['RRR','BBB'],{builderCount:3}),saved),null);
 for(const invalid of [{...saved,v:99},{...saved,index:-1},{...saved,index:0.5},{...saved,index:99},{...saved,index:2,stage:'building'},{...saved,stage:'done'},{...saved,signature:'changed'}]){
  assert.equal(BuildTasks.restoreSession(plan,invalid),null);
  assert.throws(()=>BuildTasks.currentTask(plan,invalid),TypeError);
 }
});

test('saved sessions walk every model exactly once and resume at each build/attachment boundary',()=>{
 for(const model of models){
  const plan=BuildTasks.createPlan(Array.from(model.p),{builderCount:2});
  let state=BuildTasks.createSession(plan),completed=0;
  while(state.stage!=='done'){
   assert.equal(BuildTasks.currentTask(plan,state).index,completed);
   state=BuildTasks.restoreSession(plan,JSON.parse(JSON.stringify(BuildTasks.markReady(plan,state))));
   assert.equal(state.stage,'ready');
   state=BuildTasks.restoreSession(plan,JSON.parse(JSON.stringify(BuildTasks.attach(plan,state))));
   completed++;
  }
  assert.equal(completed,plan.tasks.length);
 }
});

test('invalid input is rejected before allocating tasks',()=>{
 for(const pattern of [null,[],['...'],['R!'],[9]])assert.throws(()=>BuildTasks.createPlan(pattern),TypeError);
 for(const options of [{builderCount:1},{builderCount:4},{smallest:-1},{smallest:2},{smallest:0.5}])assert.throws(()=>BuildTasks.createPlan(['RR'],options),TypeError);
});
