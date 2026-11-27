/* Physical nine-cube Plus-Plus geometry, validator and connected 3D task plans.
 * Pose rotations: radians, Euler XYZ, matching THREE.Euler. Z is world up.
 * Nominal tab/notch grips, straight axis insertion and static balance are checked.
 * Plastic tolerances, grip strength and physical builds are not certified.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SpatialCore=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=3,PALETTE=new Set('rAROYGgBbPpWKNTS'),H=[[-2,0,0],[-1,0,0],[0,0,0],[1,0,0],[2,0,0],[-1,-1,0],[-1,1,0],[1,-1,0],[1,1,0]],NOTCHES=[[0,-1,0],[0,1,0]],PROTRUSIONS=[[-2,0,0],[2,0,0],[-1,-1,0],[-1,1,0],[1,-1,0],[1,1,0]];
const key=p=>p.join(','),add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
function mul(a,b){return a.map((row,i)=>row.map((_,j)=>row.reduce((sum,v,k)=>sum+v*b[k][j],0)))}
function matrix(rotation){
 const [x,y,z]=rotation,[cx,sx,cy,sy,cz,sz]=[Math.cos(x),Math.sin(x),Math.cos(y),Math.sin(y),Math.cos(z),Math.sin(z)].map(Math.round);
 return mul(mul([[1,0,0],[0,cx,-sx],[0,sx,cx]],[[cy,0,sy],[0,1,0],[-sy,0,cy]]),[[cz,-sz,0],[sz,cz,0],[0,0,1]]);
}
const mv=(m,p)=>m.map(row=>row.reduce((n,v,i)=>n+v*p[i],0));
function transformed(piece,points=H){const m=matrix(piece.rotation);return points.map(p=>add(piece.position,mv(m,p)))}
function poseValid(p){return p&&typeof p.id==='string'&&p.id.length>0&&PALETTE.has(p.c)&&Array.isArray(p.position)&&p.position.length===3&&p.position.every(n=>Number.isInteger(n)&&n%3===0)&&Array.isArray(p.rotation)&&p.rotation.length===3&&p.rotation.every(n=>Number.isFinite(n)&&Math.abs(n)<=Math.PI*20&&Math.abs(n/(Math.PI/2)-Math.round(n/(Math.PI/2)))<1e-7)}
function geometry(piece){return {piece,voxels:transformed(piece),notches:transformed(piece,NOTCHES),protrusions:transformed(piece,PROTRUSIONS),matrix:matrix(piece.rotation)}}
function contact(a,b){
 const av=new Set(a.voxels.map(key)),bv=new Set(b.voxels.map(key));if(a.voxels.some(p=>bv.has(key(p))))return null;
 for(const [notch,protrusion] of [[a,b],[b,a]]){
  const pins=new Set(protrusion.protrusions.map(key));
  for(const q of notch.notches){
   if(!pins.has(key(q)))continue;
   // The notch's two gripping cells must flank the received protrusion.
   const long=mv(notch.matrix,[1,0,0]);
   if(!av.has(key(q))&&!bv.has(key(q))){continue} // q belongs to the protrusion, never the notch body.
   const own=new Set(notch.voxels.map(key));
   if(own.has(key(add(q,long)))&&own.has(key(sub(q,long))))return {a:a.piece.id,b:b.piece.id,notchPiece:notch.piece.id,protrusionPiece:protrusion.piece.id,notch:q.slice()};
  }
 }
 return null;
}
function joint(a,b){if(!poseValid(a)||!poseValid(b))return null;return contact(geometry(a),geometry(b))}
function hash(text){let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619)>>>0;b=(Math.imul(b,33)^text.charCodeAt(i))>>>0}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0')}
function sceneSignature(scene){return 'spatial-v1-'+hash(JSON.stringify(scene.pieces.map(p=>[p.id,p.c,p.position,p.rotation.map(n=>Math.round(n/(Math.PI/2)))])))}
function supportStability(pieces,voxels,margin=.1){
 const com=[0,1,2].map(i=>pieces.reduce((n,p)=>n+p.position[i],0)/pieces.length),ground=Math.min(...voxels.map(p=>p[2])),map=new Map();
 for(const p of voxels)if(p[2]===ground)for(const dx of [-.5,.5])for(const dy of [-.5,.5])map.set(`${p[0]+dx},${p[1]+dy}`,[p[0]+dx,p[1]+dy]);
 const points=[...map.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lower=[],upper=[];for(const p of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p)}for(const p of points.slice().reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p)}
 const hull=lower.slice(0,-1).concat(upper.slice(0,-1)),distances=hull.map((a,i)=>{const b=hull[(i+1)%hull.length];return cross(a,b,com)/Math.hypot(b[0]-a[0],b[1]-a[1])}),minimumMargin=hull.length>=3?Math.min(...distances):-Infinity;
 return {supported:minimumMargin>=margin-1e-8,com,groundZ:ground-.5,hull,minimumMargin,requiredMargin:margin,model:'equal-mass-static-centre-of-mass'};
}
function validateScene(scene,{maxPieces=250,require3D=true,requireStability=true}={}){
 const errors=[],pieces=scene?.pieces;
 if(!Array.isArray(pieces)||pieces.length<1||pieces.length>maxPieces)return {valid:false,errors:[{type:'piece_count',limit:maxPieces}],count:Array.isArray(pieces)?pieces.length:0,voxelCount:0,edges:[],order:[]};
 if(scene.rotationUnit&&scene.rotationUnit!=='radians')errors.push({type:'rotation_unit'});
 if(scene.rotationOrder&&scene.rotationOrder!=='XYZ')errors.push({type:'rotation_order'});
 if(scene.count!=null&&scene.count!==pieces.length)errors.push({type:'count_mismatch'});
 const ids=new Set(),occupied=new Map(),geometries=[];
 for(const p of pieces){
  if(!poseValid(p)){errors.push({type:'invalid_pose',piece:p?.id});continue}
  if(ids.has(p.id)){errors.push({type:'duplicate_id',piece:p.id});continue}ids.add(p.id);
  const g=geometry(p);geometries.push(g);
  if(p.axes){const axes=['x','y','z'],long=axes[g.matrix.findIndex(row=>Math.abs(row[0])===1)],wide=axes[g.matrix.findIndex(row=>Math.abs(row[1])===1)];if(p.axes.long!==long||p.axes.wide!==wide)errors.push({type:'axes_mismatch',piece:p.id})}
  for(const q of g.voxels){const k=key(q);if(occupied.has(k))errors.push({type:'collision',pieces:[occupied.get(k),p.id],voxel:q});occupied.set(k,p.id)}
 }
 const edges=[],adjacency=new Map([...ids].map(id=>[id,[]]));
 const pins=new Map(),pairs=new Set();
 for(const g of geometries)for(const p of g.protrusions){const k=key(p);if(!pins.has(k))pins.set(k,[]);pins.get(k).push(g)}
 for(const a of geometries)for(const q of a.notches)for(const b of pins.get(key(q))||[]){
  if(a===b)continue;const id=[a.piece.id,b.piece.id].sort().join('|');if(pairs.has(id))continue;pairs.add(id);
  const edge=contact(a,b);if(edge){edges.push(edge);adjacency.get(edge.a).push(edge.b);adjacency.get(edge.b).push(edge.a)}
 }

 const order=[],seen=new Set();if(pieces[0]&&ids.has(pieces[0].id)){const queue=[pieces[0].id];for(let i=0;i<queue.length;i++){const id=queue[i];if(seen.has(id))continue;seen.add(id);order.push(id);for(const next of adjacency.get(id)||[])if(!seen.has(next))queue.push(next)}}
 if(seen.size!==pieces.length)errors.push({type:'disconnected',connected:seen.size,total:pieces.length});
 if(require3D&&pieces.length>1&&[0,1,2].some(axis=>new Set(pieces.filter(p=>poseValid(p)).map(p=>p.position[axis])).size<2))errors.push({type:'not_spatial',message:'The mask must occupy multiple centre coordinates on all three world axes.'});
 if(Array.isArray(scene.steps)){
  const placed=new Set(),stepsSeen=new Set(),ranges=[new Map(),new Map(),new Map()];
  for(const [stepIndex,s] of scene.steps.entries()){
   if(pieces[stepIndex]?.id!==s.pieceId)errors.push({type:'step_order_mismatch',piece:s.pieceId});
   if(!ids.has(s.pieceId)||stepsSeen.has(s.pieceId)){errors.push({type:'invalid_step',piece:s.pieceId});continue}
   if(s.parentId==null){if(placed.size)errors.push({type:'extra_root',piece:s.pieceId})}
   else if(!placed.has(s.parentId)||!edges.some(e=>(e.a===s.pieceId&&e.b===s.parentId)||(e.b===s.pieceId&&e.a===s.parentId)))errors.push({type:'invalid_attachment',piece:s.pieceId,parent:s.parentId});
   const g=geometries.find(g=>g.piece.id===s.pieceId),direction=s.insertionDirection,offset=s.fromOffset;
   if(!Array.isArray(direction)||direction.length!==3||direction.some(n=>!Number.isInteger(n)||Math.abs(n)>1)||direction.reduce((n,v)=>n+Math.abs(v),0)!==1)errors.push({type:'invalid_insertion_direction',piece:s.pieceId});
   else if(g){
    const axis=direction.findIndex(n=>n),sign=-direction[axis],line=v=>v.filter((_,i)=>i!==axis).join(',');
    const blocked=g.voxels.some(v=>{const b=ranges[axis].get(line(v));return b&&(sign>0?b[1]>v[axis]:b[0]<v[axis])});
    if(blocked)errors.push({type:'blocked_insertion',piece:s.pieceId});
    const goodOffset=Array.isArray(offset)&&offset.length===3&&offset.every(Number.isInteger)&&offset.every((v,i)=>i===axis?v*sign>0:v===0);
    if(!goodOffset)errors.push({type:'invalid_insertion_offset',piece:s.pieceId});
    else{const previous=[...ranges[axis].values()],edge=previous.length?(sign>0?Math.max(...previous.map(b=>b[1])):Math.min(...previous.map(b=>b[0]))):0;const nearest=sign>0?Math.min(...g.voxels.map(v=>v[axis]+offset[axis])):Math.max(...g.voxels.map(v=>v[axis]+offset[axis]));if(previous.length&&sign*(nearest-edge)<2)errors.push({type:'insertion_offset_inside_model',piece:s.pieceId})}
   }
   if(g)for(const v of g.voxels)for(let axis=0;axis<3;axis++){const k=v.filter((_,i)=>i!==axis).join(','),b=ranges[axis].get(k);ranges[axis].set(k,b?[Math.min(b[0],v[axis]),Math.max(b[1],v[axis])]:[v[axis],v[axis]])}
   placed.add(s.pieceId);stepsSeen.add(s.pieceId);
  }
  if(stepsSeen.size!==pieces.length)errors.push({type:'incomplete_steps'});
 }else errors.push({type:'missing_insertion_steps'});
 const stability=geometries.length?supportStability(geometries.map(g=>g.piece),geometries.flatMap(g=>g.voxels)):null;
 if(requireStability&&stability&&!stability.supported)errors.push({type:'unsupported_centre_of_mass',minimumMargin:stability.minimumMargin});
 return {valid:errors.length===0,errors,stability,count:pieces.length,voxelCount:occupied.size,edges,order,signature:errors.length?null:sceneSignature(scene)};
}
function insertionFor(voxels,previousVoxels,knownRanges){
 const ranges=knownRanges||[new Map(),new Map(),new Map()];
 if(!knownRanges)for(const v of previousVoxels)for(let axis=0;axis<3;axis++){const k=v.filter((_,i)=>i!==axis).join(','),b=ranges[axis].get(k);ranges[axis].set(k,b?[Math.min(b[0],v[axis]),Math.max(b[1],v[axis])]:[v[axis],v[axis]])}
 for(const [axis,sign]of [[2,1],[0,1],[0,-1],[1,1],[1,-1],[2,-1]]){
  if(voxels.some(v=>{const b=ranges[axis].get(v.filter((_,i)=>i!==axis).join(','));return b&&(sign>0?b[1]>v[axis]:b[0]<v[axis])}))continue;
  const direction=[0,0,0];direction[axis]=-sign;const values=[...ranges[axis].values()],edge=values.length?(sign>0?Math.max(...values.map(b=>b[1])):Math.min(...values.map(b=>b[0]))):0;
  const nearest=sign>0?Math.min(...voxels.map(v=>v[axis])):Math.max(...voxels.map(v=>v[axis])),distance=Math.max(3,sign*(edge-nearest)+3),offset=[0,0,0];offset[axis]=sign*distance;
  return {insertionDirection:direction,fromOffset:offset};
 }
 return null;
}
function createPlan(scene,{builderCount=2,smallest=null,maxTaskSize=4,require3D=true}={}){
 if(![2,3].includes(builderCount)||!Number.isInteger(maxTaskSize)||maxTaskSize<1||maxTaskSize>12||(smallest!==null&&(!Number.isInteger(smallest)||smallest<0||smallest>=builderCount)))throw new TypeError('Invalid builder/task settings');
 const validation=validateScene(scene,{require3D});if(!validation.valid)throw new TypeError('Invalid physical scene: '+JSON.stringify(validation.errors.slice(0,3)));
 const pieces=new Map(scene.pieces.map(p=>[p.id,p])),rank=new Map(scene.pieces.map((p,i)=>[p.id,i])),adjacency=new Map(scene.pieces.map(p=>[p.id,[]]));
 validation.edges.forEach(e=>{adjacency.get(e.a).push(e.b);adjacency.get(e.b).push(e.a)});adjacency.forEach(list=>list.sort((a,b)=>rank.get(a)-rank.get(b)));
 function build(cap){
  const placed=new Set(),previousVoxels=[],ranges=[new Map(),new Map(),new Map()],tasks=[];let cursor=0;
  while(cursor<scene.pieces.length){
   const owner=tasks.length%builderCount,limit=owner===smallest?cap:maxTaskSize,group=[],members=new Set();let certificate=null;
   for(let j=cursor;j<scene.pieces.length&&group.length<limit;j++){
    const id=scene.pieces[j].id;
    if(group.length&&!adjacency.get(id).some(q=>members.has(q)))break;
    const candidate=group.concat(id),voxels=candidate.flatMap(id=>transformed(pieces.get(id))),nextCertificate=insertionFor(voxels,previousVoxels,ranges);
    if(!nextCertificate)break;
    group.push(id);members.add(id);certificate=nextCertificate;
   }
   if(!group.length)throw new Error('Validated insertion order has no legal next task');
   const attachmentEdges=validation.edges.filter(e=>(members.has(e.a)&&placed.has(e.b))||(members.has(e.b)&&placed.has(e.a))),counts={};
   group.forEach(id=>{const p=pieces.get(id);counts[p.c]=(counts[p.c]||0)+1;placed.add(id);previousVoxels.push(...transformed(p));for(const v of transformed(p))for(let axis=0;axis<3;axis++){const k=v.filter((_,i)=>i!==axis).join(','),b=ranges[axis].get(k);ranges[axis].set(k,b?[Math.min(b[0],v[axis]),Math.max(b[1],v[axis])]:[v[axis],v[axis]])}});
   tasks.push({index:tasks.length,owner,pieceIds:group,pieces:group.map(id=>pieces.get(id)),tiles:group.map(id=>pieces.get(id)),row:0,n:group.length,counts,attachmentEdges,requiresPrevious:tasks.length>0,...certificate});
   cursor+=group.length;
  }
  const totals=Array(builderCount).fill(0);tasks.forEach(t=>totals[t.owner]+=t.n);return {tasks,totals};
 }

 let chosen=build(maxTaskSize),assignmentNote='';
 if(smallest!==null){for(let cap=Math.max(1,Math.ceil(maxTaskSize*.55));cap>=1;cap--){const c=build(cap);chosen=c;if(c.totals[smallest]<Math.min(...c.totals.filter((_,i)=>i!==smallest)))break}if(chosen.totals[smallest]>=Math.min(...chosen.totals.filter((_,i)=>i!==smallest)))assignmentNote='Denne lille figur kan ikke fordeles med færre brikker til den valgte bygger og faste turskift.'}
 if(chosen.totals.some(n=>n===0))assignmentNote='Figuren har for få opgaver til, at alle får en tur.';
 const signature=JSON.stringify({v:VERSION,scene:validation.signature,builderCount,smallest,maxTaskSize}),id='spatial-tasks-v3-'+hash(signature);
 chosen.tasks.forEach((t,i)=>{t.id=id+'-'+String(i+1).padStart(3,'0');t.dependencies=i?[chosen.tasks[i-1].id]:[]});
 return {v:VERSION,id,planId:id,signature,sceneSignature:validation.signature,tasks:chosen.tasks,totals:chosen.totals,total:scene.pieces.length,assignmentNote,assemblyMotionTested:true,assemblyMotionModel:'nominal-unit-cube-straight-axis-insertion'};
}
function createSession(plan){return {v:VERSION,planId:plan.id,signature:plan.signature,index:0,stage:'building'}}
function restoreSession(plan,saved){if(!saved||saved.v!==VERSION||saved.planId!==plan.id||saved.signature!==plan.signature||!Number.isInteger(saved.index)||saved.index<0||saved.index>plan.tasks.length||!['building','ready','done'].includes(saved.stage)||(saved.index===plan.tasks.length?saved.stage!=='done':saved.stage==='done'))return null;return {...saved}}
function state(plan,s){const clean=restoreSession(plan,s);if(!clean)throw new TypeError('Session does not match task plan');return clean}
function currentTask(plan,s){const clean=state(plan,s);return clean.stage==='done'?null:plan.tasks[clean.index]}
function markReady(plan,s){const clean=state(plan,s);return clean.stage==='building'?{...clean,stage:'ready'}:clean}
function attach(plan,s){const clean=state(plan,s);if(clean.stage!=='ready')return clean;const index=clean.index+1;return {...clean,index,stage:index===plan.tasks.length?'done':'building'}}
function undo(plan,s){const clean=state(plan,s);if(clean.stage==='ready')return {...clean,stage:'building'};return clean.index?{...clean,index:clean.index-1,stage:'ready'}:clean}
return {VERSION,H,NOTCHES,PROTRUSIONS,matrix,transformed,joint,insertionFor,supportStability,sceneSignature,validateScene,createPlan,createSession,restoreSession,currentTask,markReady,attach,undo};
});
