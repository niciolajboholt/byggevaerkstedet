const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Catalogue=require('../catalogue.js');
const raw=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));
const names=JSON.parse(fs.readFileSync(new URL('../data/navne.json',`file://${__filename}`),'utf8'));
const source=Catalogue.validate(raw,names);
test('the editable catalogue validates all motifs without mutating its source',()=>{
 const before=JSON.stringify(source),result=Catalogue.validate(source);
 assert.equal(result.models.length,raw.models.length);assert.equal(new Set(result.models.map(m=>m.id)).size,raw.models.length);assert.equal(JSON.stringify(source),before);
 result.models[0].name='Nyt navn';assert.notEqual(source.models[0].name,'Nyt navn');
});
test('renames and new categories are taken directly from the JSON model',()=>{
 const changed=structuredClone(source);changed.models[0].name='Mit nye navn';changed.models[0].cat='Nyt tema';
 const result=Catalogue.validate(changed);assert.equal(result.models[0].name,'Mit nye navn');assert.ok(result.categories.includes('Nyt tema'));
});
test('malformed patterns, duplicate IDs and category-specific brick overflow are rejected',()=>{
 for(const change of [d=>d.models.push(d.models[0]),d=>d.models[0].p=['Z'],d=>d.models[0].p=['R'.repeat(20)].concat(Array(15).fill('R'.repeat(20))),d=>d.models[0].p=['R','RR']]){
  const bad=structuredClone(source);change(bad);assert.throws(()=>Catalogue.validate(bad));
 }
});
test('HTTP and JSON failures reject; successful catalogue loads revalidate the cache',async()=>{
 await assert.rejects(Catalogue.load('/motifs',{fetch:async()=>({ok:false})}));
 await assert.rejects(Catalogue.load('/motifs',{fetch:async()=>({ok:true,json:async()=>{throw Error('invalid JSON')}})}));
 let init;const result=await Catalogue.load('/motifs',{fetch:async(u,o)=>{init=o;return{ok:true,json:async()=>u.endsWith('navne.json')?names:raw}}});assert.equal(result.models.length,raw.models.length);assert.equal(init.cache,'no-cache');
});
test('catalogue request times out instead of blocking setup indefinitely',async()=>{
 await assert.rejects(Catalogue.load('/motifs',{timeoutMs:5,fetch:(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))}));
});

test('one name per motif is required and the name list has one editable row for every motif',()=>{
 assert.equal(Object.keys(names).length,raw.models.length);assert.equal(fs.readFileSync(new URL('../data/navne.json',`file://${__filename}`),'utf8').trim().split('\n').length,raw.models.length+2);
 assert.ok(raw.models.every(m=>!Object.hasOwn(m,'name')));
 const renamed={...names,[raw.models[0].id]:'Mit nye navn'};assert.equal(Catalogue.validate(raw,renamed).models[0].name,'Mit nye navn');
 const missing={...names};delete missing[raw.models[0].id];assert.throws(()=>Catalogue.validate(raw,missing));assert.throws(()=>Catalogue.validate(raw,{...names,[raw.models[0].id]:' '}));
});
test('a missing name file fails loading instead of silently showing outdated names',async()=>{
 await assert.rejects(Catalogue.load('data/motiver.json',{fetch:async url=>url.endsWith('navne.json')?{ok:false}:{ok:true,json:async()=>raw}}));
});

// Four actual tab/notch joints form a dogleg spanning X, Y and Z.
function spatialFixture(){
 return {id:'spatial-test',name:'Rumlig test',cat:'3D-figurer',kind:'spatial',spatialTheme:'Natur',preview:'assets/spatial/spatial-test.svg',scene:{
  version:1,rotationUnit:'radians',rotationOrder:'XYZ',gridScale:3,
  pieces:[
   {id:'p001',c:'R',position:[0,0,0],rotation:[0,0,0],axes:{long:'x',wide:'y'}},
   {id:'p002',c:'Y',position:[3,0,0],rotation:[Math.PI/2,0,Math.PI/2],axes:{long:'z',wide:'x'}},
   {id:'p003',c:'G',position:[3,0,3],rotation:[Math.PI/2,0,0],axes:{long:'x',wide:'z'}},
   {id:'p004',c:'B',position:[6,0,3],rotation:[0,0,Math.PI/2],axes:{long:'y',wide:'x'}},
   {id:'p005',c:'P',position:[6,3,3],rotation:[0,Math.PI/2,0],axes:{long:'z',wide:'y'}}
  ],
  steps:[{pieceId:'p001',parentId:null,axis:null},{pieceId:'p002',parentId:'p001',axis:'x'},{pieceId:'p003',parentId:'p002',axis:'z'},{pieceId:'p004',parentId:'p003',axis:'x'},{pieceId:'p005',parentId:'p004',axis:'y'}],
  count:5,targetCount:5,omitted:[],complete:true,assemblyMotionTested:false
 }};
}
function spatialCatalogue(model=spatialFixture()){
 return {categories:['3D-figurer'],models:[model]};
}
test('spatial scenes validate real legal joints and preserve an independent exact scene',()=>{
 const data=spatialCatalogue(),before=structuredClone(data);
 const result=Catalogue.validate(data),again=Catalogue.validate(result);
 assert.deepEqual(data,before);assert.deepEqual(result.models[0].scene,data.models[0].scene);
 assert.deepEqual(again,result);assert.equal(result.models.length,1);
 assert.equal(Object.hasOwn(result.models[0],'p'),false);
 result.models[0].scene.pieces[0].position[0]=999;
 result.models[0].scene.steps[0].axis='z';
 assert.deepEqual(data,before);
});
test('spatial collision, floating bricks and non-quarter-turn rotation are rejected',()=>{
 for(const change of [
  m=>m.scene.pieces[1].position=[0,0,0],
  m=>m.scene.pieces[1].position=[30,0,0],
  m=>m.scene.pieces[1].rotation=[0,0,Math.PI/4],
  m=>m.scene.pieces[1].rotation=[0,0,NaN]
 ]){
  const model=spatialFixture();change(model);
  assert.throws(()=>Catalogue.validate(spatialCatalogue(model)),/spatial scene/i);
 }
});
test('spatial records require safe previews, valid metadata and at most 250 actual bricks',()=>{
 for(const change of [
  m=>m.preview='assets/spatial/../test.svg',
  m=>m.preview='https://example.com/spatial-test.svg',
  m=>m.preview='assets/spatial/other-id.svg',
  m=>m.spatialTheme=' ',
  m=>m.scene.version=2,
  m=>m.scene.rotationUnit='degrees',
  m=>m.scene.pieces=[],
  m=>m.scene.pieces=m.scene.pieces.slice(0,2),
  m=>m.scene.pieces=Array.from({length:251},()=>structuredClone(m.scene.pieces[0])),
  m=>m.p=['R'],
  m=>m.variants={},
  m=>m.id='invalid/id',
  m=>m.name=' '
 ]){
  const model=spatialFixture();change(model);
  assert.throws(()=>Catalogue.validate(spatialCatalogue(model)));
 }
});
test('spatial names still come from the separate editable name file',()=>{
 const data=spatialCatalogue(),id=data.models[0].id;delete data.models[0].name;
 const result=Catalogue.validate(data,{[id]:'Et nyt rumligt navn'});
 assert.equal(result.models[0].name,'Et nyt rumligt navn');
 assert.throws(()=>Catalogue.validate(data,{}));
});
