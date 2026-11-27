'use strict';
// One unit is 4 mm for the standard 20 × 12 × 4 mm piece. Positions are CENTRES.
// This is render geometry, not proof that a joint is physically manufacturable.
const THICKNESS=1;
const CELLS=Object.freeze([[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,-1],[-1,1],[1,-1],[1,1]].map(Object.freeze));
function brickOutline(inset=0){
 if(!Number.isFinite(inset)||inset<0||inset>=.2)throw new RangeError('Invalid inset');
 const occupied=new Set(CELLS.map(p=>p.join(','))),edges=new Map();
 for(const [x,y] of CELLS){
  if(!occupied.has(`${x},${y-1}`))edges.set(`${x},${y}`,[x+1,y]);
  if(!occupied.has(`${x+1},${y}`))edges.set(`${x+1},${y}`,[x+1,y+1]);
  if(!occupied.has(`${x},${y+1}`))edges.set(`${x+1},${y+1}`,[x,y+1]);
  if(!occupied.has(`${x-1},${y}`))edges.set(`${x},${y+1}`,[x,y]);
 }
 const first=edges.keys().next().value,boundary=[];let key=first;
 do{boundary.push(key.split(',').map(Number));const next=edges.get(key);if(!next||boundary.length>edges.size)throw Error('Invalid boundary');key=next.join(',')}while(key!==first);
 const corners=boundary.filter((p,i)=>{const a=boundary[(i+boundary.length-1)%boundary.length],b=boundary[(i+1)%boundary.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0])});
 return corners.map((p,i)=>{const a=corners[(i+corners.length-1)%corners.length],b=corners[(i+1)%corners.length],before=Math.hypot(p[0]-a[0],p[1]-a[1]),after=Math.hypot(b[0]-p[0],b[1]-p[1]);return [p[0]-.5+inset*(-(p[1]-a[1])/before-(b[1]-p[1])/after),p[1]-.5+inset*((p[0]-a[0])/before+(b[0]-p[0])/after)]});
}
function vector(v){return Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=1e5)}
function validatePieces(pieces){
 if(!Array.isArray(pieces)||pieces.length>1000)throw new TypeError('Use at most 1000 spatial pieces');
 const ids=new Set();return pieces.map(p=>{
  if(!p||typeof p.id!=='string'||!p.id.length||p.id.length>100||ids.has(p.id)||typeof p.c!=='string'||!p.c.length||!vector(p.position)||!vector(p.rotation))throw new TypeError('Invalid spatial piece');
  ids.add(p.id);return {id:p.id,c:p.c,position:[...p.position],rotation:[...p.rotation],...(typeof p.name==='string'?{name:p.name}:{})};
 });
}
// Matches THREE.Euler(rx, ry, rz, 'XYZ'): R = Rx * Ry * Rz.
function transformPoint(point,piece){
 let [x,y,z]=point;const [rx,ry,rz]=piece.rotation;
 [x,y]=[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz)];
 [x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)];
 [y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];
 return [x+piece.position[0],y+piece.position[1],z+piece.position[2]];
}
function pieceCorners(piece,thickness=THICKNESS){
 if(!Number.isFinite(thickness)||thickness<=0||thickness>3)throw new RangeError('Invalid brick thickness');
 return CELLS.flatMap(([x,y])=>[-.5,.5].flatMap(dx=>[-.5,.5].flatMap(dy=>[-thickness/2,thickness/2].map(z=>transformPoint([x+dx,y+dy,z],piece)))));
}
function spatialBounds(pieces,thickness=THICKNESS){
 if(!pieces.length)return null;
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of pieces)for(const point of pieceCorners(p,thickness))for(let i=0;i<3;i++){min[i]=Math.min(min[i],point[i]);max[i]=Math.max(max[i],point[i])}
 return {min,max,center:min.map((v,i)=>(v+max[i])/2),size:min.map((v,i)=>max[i]-v)};
}
function stepState(pieces,{attachedIds,currentIds,showFuture=true}={}){
 const ids=new Set(pieces.map(p=>p.id));
 function idSet(value,label){if(value==null)return null;if(!Array.isArray(value)&&!(value instanceof Set))throw new TypeError(label+' must be IDs');const set=new Set(value);for(const id of set)if(!ids.has(id))throw new TypeError('Unknown piece '+id);return set}
 const current=idSet(currentIds,'currentIds')||new Set(),attached=idSet(attachedIds,'attachedIds')||(attachedIds==null&&currentIds==null?new Set(ids):new Set());
 for(const id of current)if(attached.has(id))throw new TypeError('A piece cannot be current and attached at the same time');
 return pieces.map(p=>({id:p.id,state:current.has(p.id)?'current':attached.has(p.id)?'attached':showFuture?'future':'hidden'}));
}
module.exports={THICKNESS,CELLS,brickOutline,validatePieces,transformPoint,pieceCorners,spatialBounds,stepState};
