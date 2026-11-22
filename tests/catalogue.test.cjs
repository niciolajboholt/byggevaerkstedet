const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Catalogue=require('../catalogue.js');
const source=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`),'utf8'));
test('the editable catalogue validates all 250 motifs without mutating its source',()=>{
 const before=JSON.stringify(source),result=Catalogue.validate(source);
 assert.equal(result.models.length,250);assert.equal(new Set(result.models.map(m=>m.id)).size,250);assert.equal(JSON.stringify(source),before);
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
 let init;const result=await Catalogue.load('/motifs',{fetch:async(u,o)=>{init=o;return{ok:true,json:async()=>source}}});assert.equal(result.models.length,250);assert.equal(init.cache,'no-cache');
});
test('catalogue request times out instead of blocking setup indefinitely',async()=>{
 await assert.rejects(Catalogue.load('/motifs',{timeoutMs:5,fetch:(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))}));
});
