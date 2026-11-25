const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Catalogue=require('../catalogue.js');
const Tasks=require('../build-tasks.js');
const raw=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));
const names=JSON.parse(fs.readFileSync(new URL('../data/navne.json',`file://${__filename}`),'utf8'));
const models=Catalogue.validate(raw,names).models;
const H=[[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,-1],[-1,1],[1,-1],[1,1]];
const ranges={easy:[1,59],medium:[60,84],hard:[85,300]};
test('all 270 motifs contain exactly three progressively larger variants with their original preserved',()=>{
 assert.equal(models.length,270);assert.equal(Object.keys(names).length,270);
 for(const m of models){
  assert.deepEqual(Object.keys(m.variants).sort(),['easy','hard','medium']);
  const total=p=>p.join('').replace(/\./g,'').length;
  const n=total(m.p),key=n<60?'easy':n<85?'medium':'hard';assert.deepEqual(m.variants[key].p,m.p,m.name);
  assert.equal(new Set(Object.values(m.variants).map(v=>JSON.stringify(v.p))).size,3,m.name);
 }
});
for(const key of Object.keys(ranges))test(`all ${key} variants use complete connected bricks and produce exact solo/cooperative instructions`,()=>{
 for(const m of models){
  const p=m.variants[key].p,[min,max]=ranges[key],n=p.join('').replace(/\./g,'').length;
  assert.ok(n>=min&&n<=Math.min(max,m.cat==='Klublogoer'?300:250),m.name);
  assert.deepEqual([...new Set(p.join('').replace(/\./g,''))].sort(),[...new Set(m.p.join('').replace(/\./g,''))].sort(),m.name+' retains its palette');
  assert.ok(p.length<=24&&p[0].length<=24&&p.every(r=>r.length===p[0].length));
  const occupied=new Set(),cells=new Set();
  p.forEach((row,y)=>[...row].forEach((c,x)=>{
   if(c==='.')return;cells.add(x+','+y);
   const shape=(x+y)%2?H.map(([dx,dy])=>[dy,dx]):H;
   for(const [dx,dy]of shape){const q=(3*x+1+dx)+','+(3*y+1+dy);assert.ok(!occupied.has(q),m.name+' overlaps');occupied.add(q)}
  }));
  const pending=[cells.values().next().value],seen=new Set();
  while(pending.length){const k=pending.pop();if(seen.has(k))continue;seen.add(k);const [x,y]=k.split(',').map(Number);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(x+dx)+','+(y+dy);if(cells.has(q)&&!seen.has(q))pending.push(q)}}
  assert.equal(seen.size,cells.size,m.name+' is disconnected');assert.equal(occupied.size,n*9);
  for(const builders of [2,3])for(const smallest of [null,...Array.from({length:builders},(_,i)=>i)]){
   const plan=Tasks.createPlan(p,{builderCount:builders,smallest});assert.equal(plan.total,n);assert.equal(plan.totals.reduce((a,b)=>a+b,0),n);
   assert.equal(new Set(plan.tasks.flatMap(t=>t.tiles.map(k=>k.x+','+k.y))).size,n,m.name);
  }
 }
});
test('loader rejects missing, disconnected, mismatched and out-of-band variants',()=>{
 const cases=[m=>delete m.variants.easy,m=>m.variants.medium.p=['R'],m=>m.variants.hard.p=['R'.repeat(24)],m=>m.variants.easy.p=['R.R']];
 for(const mutate of cases){const bad=structuredClone(raw);mutate(bad.models[0]);assert.throws(()=>Catalogue.validate(bad,names))}
});

test('Titanic retains four separately capped yellow funnels at every difficulty',()=>{
 const m=models.find(m=>m.id==='tema62-titanic');
 for(const v of Object.values(m.variants)){
  const tops=[...v.p[0]].flatMap((c,x)=>c==='K'?[x]:[]);assert.equal(tops.length,4);
  for(const x of tops)assert.equal(v.p[1][x],'Y');
 }
});
