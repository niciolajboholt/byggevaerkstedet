const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Steps=require('../assembly-steps.js');
const models=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/motiver.json'))).models;
const key=t=>`${t.x},${t.y}`;
function verify(p){
 const plan=Steps.create(p),seen=new Set();
 for(const [i,step]of plan.steps.entries()){
  assert.ok(step.tiles.length);assert.equal(step.n,step.tiles.length);
  step.tiles.forEach((t,j)=>{assert.equal(t.c,p[t.y][t.x]);assert.equal(t.o,(t.x+t.y)%2?'v':'h');assert.ok(!seen.has(key(t)));if(j)assert.equal(t.x,step.tiles[j-1].x+1)});
  if(i)assert.ok(step.tiles.some(t=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(`${t.x+dx},${t.y+dy}`))),'every new piece attaches to the existing model');
  step.tiles.forEach(t=>seen.add(key(t)));
 }
 assert.equal(seen.size,p.join('').replace(/\./g,'').length);assert.equal(plan.sections,1);
 return plan;
}
test('all 810 difficulty guides have connected pieces, attachable prefixes and exact coverage',()=>{
 for(const m of models)for(const v of Object.values(m.variants)){try{verify(v.p)}catch(e){e.message=m.id+': '+e.message;throw e}}
});
test('Formula car wheels wait until a supporting row has been built',()=>{
 const m=models.find(m=>m.id==='biler20-formelbil');assert.ok(m);
 const plan=verify(m.p);assert.deepEqual(Steps.create(m.p),plan);
 const placed=new Set();let postponed=false;
 for(const step of plan.steps){
  if(step.row===8&&step.tiles[0].c==='K')assert.ok(step.tiles.some(t=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>placed.has(`${t.x+dx},${t.y+dy}`))));
  if(step.row<Math.max(-1,...plan.steps.slice(0,step.index).map(s=>s.row)))postponed=true;
  step.tiles.forEach(t=>placed.add(key(t)));
 }
 assert.ok(postponed,'deferred wheel pieces are added after the lower connecting row');
});
test('own disconnected drawings explicitly start separate sections; no invented connectors',()=>{
 const plan=Steps.create(['RR..B','....B']);assert.equal(plan.sections,2);assert.equal(plan.total,4);
 assert.deepEqual(plan.steps.map(s=>s.startsSection),[true,true,false]);
 assert.throws(()=>Steps.create(['...']));
});
