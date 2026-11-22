/* The JSON catalogue is the single editable source of motif names and patterns. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Catalogue=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SPECIAL=new Set(['Alle','50 nye','Likede','Egne']);
function validate(data){
 if(!data||!Array.isArray(data.models)||!data.models.length||!Array.isArray(data.categories))throw Error('Invalid catalogue');
 const ids=new Set(),categories=[];
 for(const c of data.categories){if(typeof c!=='string'||!c.trim()||SPECIAL.has(c))throw Error('Invalid category');if(!categories.includes(c))categories.push(c)}
 const models=data.models.map(m=>{
  if(!m||typeof m.id!=='string'||!/^[a-z0-9-]+$/.test(m.id)||ids.has(m.id))throw Error('Invalid or duplicate motif ID');ids.add(m.id);
  for(const key of ['name','cat'])if(typeof m[key]!=='string'||!m[key].trim())throw Error('Missing motif text');
  if(SPECIAL.has(m.cat))throw Error('Reserved category');
  if(!Array.isArray(m.p)||!m.p.length||m.p.length>24||!m.p.every(r=>typeof r==='string'&&r.length===m.p[0].length&&r.length>0&&r.length<=24&&/^[rAROYGgBbPpWKNTS.]+$/.test(r)))throw Error('Invalid pattern');
  const n=m.p.join('').replace(/\./g,'').length;if(n<1||n>(m.cat==='Klublogoer'?300:250))throw Error('Too many bricks');
  if(!categories.includes(m.cat))categories.push(m.cat);
  return {...m,p:m.p.slice()};
 });
 return {models,categories:categories.filter(c=>models.some(m=>m.cat===c))};
}
async function load(url,options={}){
 const controller=typeof AbortController!=='undefined'?new AbortController():null;
 const timer=controller?setTimeout(()=>controller.abort(),options.timeoutMs||15000):null;
 try{
  const response=await (options.fetch||globalThis.fetch)(url,{cache:'no-cache',...(controller?{signal:controller.signal}:{})});
  if(!response.ok)throw Error('Catalogue request failed');return validate(await response.json());
 }finally{if(timer!==null)clearTimeout(timer)}
}
return {load,validate};
});
