/* Connected row pieces, ordered so each new piece joins the existing model. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.AssemblySteps=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const key=t=>`${t.x},${t.y}`;
 const neighbours=t=>[[t.x-1,t.y],[t.x+1,t.y],[t.x,t.y-1],[t.x,t.y+1]].map(p=>p.join(','));
 function create(pattern,options={}){
  if(!Array.isArray(pattern)||!pattern.length||!pattern.every(r=>typeof r==='string'&&/^[A-Za-z.]*$/.test(r)))throw new TypeError('Invalid pattern');
  const pending=[];
  pattern.forEach((row,y)=>{
   let run=[];
   const finish=()=>{if(run.length){pending.push(run);run=[]}};
   [...row].forEach((c,x)=>{if(c==='.')finish();else run.push({x,y,row:y,c,o:(x+y)%2?'v':'h'})});finish();
  });
  if(!pending.length)throw new TypeError('Empty pattern');
  const attached=new Set(),steps=[];let section=0;
  while(pending.length){
   let i=pending.findIndex(run=>run.some(t=>neighbours(t).some(k=>attached.has(k))));
   const startsSection=i<0;
   if(startsSection){i=0;section++}
   const run=pending[i],requested=options.capFor?options.capFor(steps.length):Infinity;
   if(!(requested>=1))throw new TypeError('Invalid task size');
   const limit=Math.min(run.length,Math.floor(requested)),touch=startsSection?0:run.findIndex(t=>neighbours(t).some(k=>attached.has(k)));
   const start=Math.max(0,Math.min(touch,run.length-limit)),tiles=run.slice(start,start+limit);
   const remaining=[run.slice(0,start),run.slice(start+limit)].filter(a=>a.length);pending.splice(i,1,...remaining);
   const counts={};tiles.forEach(t=>{attached.add(key(t));counts[t.c]=(counts[t.c]||0)+1});
   steps.push({index:steps.length,row:tiles[0].y,tiles,counts,n:tiles.length,section,startsSection});
  }
  return {steps,total:attached.size,sections:section};
 }
 return {create};
});
