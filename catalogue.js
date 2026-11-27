/* Motif names live in navne.json; patterns and categories live in motiver.json. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./spatial-core.js'));else root.Catalogue=factory(root.SpatialCore);})(typeof globalThis!=='undefined'?globalThis:this,function(SpatialCore){
'use strict';
const SPECIAL=new Set(['Alle','50 nye','Likede','Egne']);
const BANDS={easy:[1,59],medium:[60,84],hard:[85,300]};
function patternCount(p,max){
 if(!Array.isArray(p)||!p.length||p.length>24||!p.every(r=>typeof r==='string'&&r.length===p[0].length&&r.length>0&&r.length<=24&&/^[rAROYGgBbPpWKNTS.]+$/.test(r)))throw Error('Invalid pattern');
 const n=p.join('').replace(/\./g,'').length;if(n<1||n>max)throw Error('Too many bricks');return n;
}
function variantsFor(m,max){
 if(m.variants===undefined)return undefined;
 if(!m.variants||typeof m.variants!=='object'||Array.isArray(m.variants))throw Error('Invalid variants');
 const variants={};
 for(const [key,[min,upper]]of Object.entries(BANDS)){
  const p=m.variants[key]?.p,n=patternCount(p,max);if(n<min||n>Math.min(upper,max))throw Error('Wrong variant difficulty');
  const cells=new Set();p.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.')cells.add(x+','+y)}));
  const stack=[cells.values().next().value],seen=new Set();
  while(stack.length){const k=stack.pop();if(seen.has(k))continue;seen.add(k);const [x,y]=k.split(',').map(Number);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(x+dx)+','+(y+dy);if(cells.has(q)&&!seen.has(q))stack.push(q)}}
  if(seen.size!==cells.size)throw Error('Disconnected variant');
  variants[key]={...m.variants[key],p:p.slice()};
 }
 const n=patternCount(m.p,max),originalKey=n<60?'easy':n<85?'medium':'hard';
 if(JSON.stringify(variants[originalKey].p)!==JSON.stringify(m.p))throw Error('Original motif must remain available');
 return variants;
}
function copyScene(value){
 if(Array.isArray(value))return value.map(copyScene);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,copyScene(item)]));
 return value;
}
function spatialScene(m){
 if(Object.hasOwn(m,'p')||Object.hasOwn(m,'variants'))throw Error('Spatial motifs cannot contain flat patterns');
 if(typeof m.spatialTheme!=='string'||!m.spatialTheme.trim())throw Error('Missing spatial theme');
 if(m.preview!=='assets/spatial/'+m.id+'.svg')throw Error('Invalid spatial preview path');
 const scene=m.scene;
 if(!scene||scene.version!==1||scene.rotationUnit!=='radians'||!Array.isArray(scene.pieces)||scene.pieces.length<1||scene.pieces.length>250)throw Error('Invalid spatial scene');
 if(!SpatialCore||typeof SpatialCore.validateScene!=='function')throw Error('Spatial validator unavailable');
 const checked=SpatialCore.validateScene(scene,{maxPieces:250,require3D:true});
 if(!checked||checked.valid!==true)throw Error('Invalid spatial scene: '+(checked?.errors||[]).join('; '));
 return copyScene(scene);
}
function validate(data,names){
 if(names!==undefined&&(!names||typeof names!=='object'||Array.isArray(names)))throw Error('Invalid name list');
 if(!data||!Array.isArray(data.models)||!data.models.length||!Array.isArray(data.categories))throw Error('Invalid catalogue');
 const ids=new Set(),categories=[];
 for(const c of data.categories){if(typeof c!=='string'||!c.trim()||SPECIAL.has(c))throw Error('Invalid category');if(!categories.includes(c))categories.push(c)}
 const models=data.models.map(entry=>{
  const m=names===undefined?entry:{...entry,name:Object.hasOwn(names,entry.id)?names[entry.id]:undefined};
  if(!m||typeof m.id!=='string'||!/^[a-z0-9-]+$/.test(m.id)||ids.has(m.id))throw Error('Invalid or duplicate motif ID');ids.add(m.id);
  for(const key of ['name','cat'])if(typeof m[key]!=='string'||!m[key].trim())throw Error('Missing motif text');
  if(SPECIAL.has(m.cat))throw Error('Reserved category');
  if(m.kind==='spatial'){
   const scene=spatialScene(m);
   if(!categories.includes(m.cat))categories.push(m.cat);
   return {...m,scene};
  }
  const max=m.cat==='Klublogoer'?300:250;patternCount(m.p,max);
  const variants=variantsFor(m,max);
  if(!categories.includes(m.cat))categories.push(m.cat);
  return {...m,p:m.p.slice(),...(variants?{variants}:{})};
 });
 return {models,categories:categories.filter(c=>models.some(m=>m.cat===c))};
}
async function load(url,options={}){
 const controller=typeof AbortController!=='undefined'?new AbortController():null;
 const timer=controller?setTimeout(()=>controller.abort(),options.timeoutMs||15000):null;
 try{
  const fetcher=options.fetch||globalThis.fetch,init={cache:'no-cache',...(controller?{signal:controller.signal}:{})};
  const namesURL=options.namesUrl||url.slice(0,url.lastIndexOf('/')+1)+'navne.json';
  const [data,names]=await Promise.all([url,namesURL].map(async path=>{
   const response=await fetcher(path,init);if(!response.ok)throw Error('Catalogue request failed');return response.json();
  }));
  return validate(data,names);
 }finally{if(timer!==null)clearTimeout(timer)}
}
return {load,validate};
});
