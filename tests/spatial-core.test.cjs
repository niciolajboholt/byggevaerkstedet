const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Core=require('../spatial-core.js');
const Geometry=require('../spatial50/viewer/geometry.cjs');
const raw=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));
const models=raw.models.filter(m=>m.kind==='spatial');
const voxelKey=p=>p.join(',');
test('all fifty numbered sculptures use real whole bricks, legal grips, exact coverage, clear insertion and nominal balance',()=>{
 assert.equal(models.length,50);assert.equal(new Set(models.map(m=>m.spatialNumber)).size,50);
 for(const m of models){
  const s=m.scene,r=Core.validateScene(s);assert.equal(r.valid,true,m.id+JSON.stringify(r.errors));
  assert.equal(s.complete,true);assert.equal(s.targetCount,s.pieces.length);assert.deepEqual(s.omitted,[]);
  assert.equal(s.physicallyTested,false);assert.ok(s.pieces.length<=250);assert.equal(r.voxelCount,s.pieces.length*9);
  assert.ok(fs.existsSync(new URL('../'+m.preview,`file://${__filename}`)));assert.equal(m.p,undefined);
  const bounds=Geometry.spatialBounds(s.pieces);assert.ok(bounds.size.every(n=>n>3));
  for(const p of s.pieces){
   const voxels=Core.transformed(p);assert.equal(new Set(voxels.map(voxelKey)).size,9);
   // Rendered outlines and validator cubes share the same centred world-space geometry.
   for(const q of Geometry.pieceCorners(p))assert.ok(q.every((n,i)=>n>=bounds.min[i]-1e-8&&n<=bounds.max[i]+1e-8));
  }
 }
});
test('every cooperative distribution has connected subassemblies, rigid insertion, alternating turns and no lost bricks',()=>{
 for(const m of models)for(const builders of [2,3])for(const smallest of [null,...Array.from({length:builders},(_,i)=>i)]){
  const plan=Core.createPlan(m.scene,{builderCount:builders,smallest});
  const covered=new Set(),placedVoxels=[];
  for(const [i,t] of plan.tasks.entries()){
   assert.equal(t.owner,i%builders);assert.equal(t.n,t.pieceIds.length);assert.equal(Object.values(t.counts).reduce((a,b)=>a+b,0),t.n);
   const seen=new Set([t.pieceIds[0]]);for(let pass=0;pass<t.n;pass++)for(const p of t.pieces)if(t.pieces.some(q=>seen.has(q.id)&&Core.joint(p,q)))seen.add(p.id);
   assert.equal(seen.size,t.n,m.id+' disconnected task');
   if(i)assert.ok(t.attachmentEdges.some(e=>covered.has(e.a)||covered.has(e.b)));
   const group=t.pieces.flatMap(p=>Core.transformed(p));assert.ok(Core.insertionFor(group,placedVoxels),m.id+' blocked group');
   t.pieceIds.forEach(id=>{assert.ok(!covered.has(id));covered.add(id)});placedVoxels.push(...group);
  }
  assert.equal(covered.size,m.scene.pieces.length);assert.equal(plan.total,covered.size);assert.equal(plan.totals.reduce((a,b)=>a+b,0),covered.size);
 }
});
test('validator rejects blocked assembly, incorrect centres, reordered steps and unstable sculptures',()=>{
 const fixture=require('./fixtures/spatial-cube.json');
 for(const mutate of [s=>s.steps[1].fromOffset=[0,0,0],s=>s.pieces[0].position=[1,0,0],s=>s.steps.reverse(),s=>s.pieces[0].position[2]-=300]){
  const s=structuredClone(fixture);mutate(s);assert.equal(Core.validateScene(s).valid,false);
 }
});
test('completed and ready sessions restore exactly, and incompatible progress is rejected',()=>{
 const plan=Core.createPlan(require('./fixtures/spatial-cube.json'),{maxTaskSize:1});let s=Core.createSession(plan);
 while(s.stage!=='done'){const ready=Core.markReady(plan,s);assert.equal(Core.attach(plan,s).index,s.index);s=Core.attach(plan,ready)}
 assert.equal(s.index,plan.tasks.length);assert.deepEqual(Core.restoreSession(plan,s),s);
 assert.equal(Core.undo(plan,s).stage,'ready');assert.equal(Core.restoreSession(plan,{...s,signature:'other'}),null);
});
test('Titanic retains four orange funnels with separate black caps',()=>{
 const m=models.find(m=>m.spatialNumber===19);assert.ok(m);
 for(const y of [-3,-1,1,3]){
  assert.ok(m.scene.pieces.some(p=>p.grid[0]===0&&p.grid[1]===y&&p.grid[2]===4&&p.c==='O'));
  assert.ok(m.scene.pieces.some(p=>p.grid[0]===0&&p.grid[1]===y&&p.grid[2]===5&&p.c==='K'));
 }
});
test('grouped guides reduce steps across all fifty figures while every part can be built and attached',()=>{
 let steps=0,bricks=0,multi=0;
 for(const m of models){
  const plan=Core.createPlan(m.scene,{grouped:true,maxTaskSize:8}),covered=new Set(),previous=[];
  for(const task of plan.tasks){
   const internal=[];
   for(const p of task.pieces){assert.ok(!covered.has(p.id));assert.ok(Core.insertionFor(Core.transformed(p),internal));internal.push(...Core.transformed(p));covered.add(p.id)}
   assert.ok(Core.insertionFor(internal,previous));previous.push(...internal);
   const connected=new Set([task.pieceIds[0]]);for(let k=0;k<task.n;k++)for(const p of task.pieces)if(task.pieces.some(q=>connected.has(q.id)&&Core.joint(p,q)))connected.add(p.id);
   assert.equal(connected.size,task.n);assert.ok(task.n<=8);if(task.n>1)multi++;
  }
  assert.equal(covered.size,m.scene.pieces.length);assert.ok(plan.tasks.length<m.scene.pieces.length/2,m.id);steps+=plan.tasks.length;bricks+=plan.total;
 }
 assert.ok(steps<bricks/3);assert.ok(multi>steps/2);
});
