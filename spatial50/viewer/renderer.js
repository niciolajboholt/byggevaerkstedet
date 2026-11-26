import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';
import geometry from './geometry.cjs';
const {THICKNESS,brickOutline,validatePieces,spatialBounds,stepState}=geometry;
const VIEWS={front:[0,-1,0],side:[1,0,0],top:[0,0,1],angle:[1,-1,.8],back:[0,1,0]};

/** Independent solid pieces in world-space XYZ; this does not infer or certify joints. */
export function createSpatialViewer(container,options={}){
 if(!container||typeof container.appendChild!=='function')throw new TypeError('A viewer container is required');
 const thickness=options.thickness??THICKNESS;
 if(!Number.isFinite(thickness)||thickness<=0||thickness>3)throw new RangeError('Invalid brick thickness');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,10000),model=new THREE.Group();camera.up.set(0,0,1);scene.add(model);
 const outline=brickOutline(.018),shape=new THREE.Shape(outline.map(([x,y])=>new THREE.Vector2(x,y)));
 // Each real piece is a solid in its own local XY plane, then transformed independently.
 const solid=new THREE.ExtrudeGeometry(shape,{depth:thickness-.024,steps:1,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,curveSegments:1});
 solid.translate(0,0,-thickness/2+.012);solid.computeVertexNormals();
 const edges=new THREE.EdgesGeometry(solid,20),meshes=new Map(),materials=new Set(),listeners=new Set();
 let renderer=null,controls=null,surface=null,software=false,disposed=false,pieces=[],states=[],bounds=null,name='',selectedId=null,width=1,height=1,stepOptions={},lights=[];
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 function lightScene(){
  lights.forEach(l=>scene.remove(l));lights=[];
  const ambient=software?new THREE.AmbientLight(new THREE.Color().setRGB(.58,.58,.58)):new THREE.AmbientLight(0xffffff,.85);
  const key=new THREE.DirectionalLight(0xffffff,software?.4:1.4);key.position.set(-25,40,65);
  const fill=new THREE.DirectionalLight(0xffffff,software?.08:.35);fill.position.set(30,-10,20);lights=[ambient,key,fill];lights.forEach(l=>scene.add(l));
 }
 function fit(){
  if(disposed)return;
  camera.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);
  let halfW=2,halfH=2;
  if(!box.isEmpty()){
   halfW=.1;halfH=.1;
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);halfW=Math.max(halfW,Math.abs(p.x));halfH=Math.max(halfH,Math.abs(p.y));
   }
  }
  const aspect=width/height,top=Math.max(halfH,halfW/aspect)*1.18;
  camera.top=top;camera.bottom=-top;camera.left=-top*aspect;camera.right=top*aspect;camera.near=.01;camera.far=Math.max(100,radius()*12);camera.updateProjectionMatrix();
 }
 function render(){if(disposed||!renderer)return;renderer.render(scene,camera);if(software)surface.style.backgroundColor='transparent'}
 function changed(){fit();render()}
 function radius(){return bounds?Math.max(2,Math.hypot(...bounds.size)/2):3}
 function announce(){surface?.setAttribute('aria-label',`${name||'Plus-Plus-model'} i rumlig 3D, ${pieces.length} brikker. ${states.filter(s=>s.state==='attached').length} sat på, ${states.filter(s=>s.state==='current').length} i dette trin.`)}
 function pointerDown(e){down={x:e.clientX,y:e.clientY}}
 function pointerUp(e){
  if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return}down=null;
  const rect=surface.getBoundingClientRect();if(!rect.width||!rect.height)return;
  pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const targets=[...meshes.values()].filter(m=>m.visible&&m.userData.state!=='future');
  const hit=raycaster.intersectObjects(targets,false)[0];inspect(hit?hit.object.userData.id:null);
 }
 function contextLost(e){
  e.preventDefault();if(disposed||software)return;
  options.onContextLost?.();installRenderer(true);resize();render();options.onFallback?.('svg');
 }
 function installRenderer(forceSVG){
  const oldTarget=controls?.target.clone()||new THREE.Vector3();
  controls?.removeEventListener('change',changed);controls?.dispose();
  surface?.removeEventListener('pointerdown',pointerDown);surface?.removeEventListener('pointerup',pointerUp);surface?.removeEventListener('webglcontextlost',contextLost);
  renderer?.renderLists?.dispose();renderer?.dispose?.();surface?.remove();
  let canvas=null,context=null;software=!!forceSVG;
  if(!software){
   try{canvas=document.createElement('canvas');context=canvas.getContext('webgl2',{alpha:true,antialias:true});if(!context)throw Error('WebGL2 unavailable');renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true})}
   catch{context?.getExtension?.('WEBGL_lose_context')?.loseContext();software=true}
  }
  if(software){renderer=new SVGRenderer();renderer.setPrecision(3);renderer.overdraw=.1}
  renderer.setPixelRatio?.(Math.min(globalThis.devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  surface=renderer.domElement;surface.style.cssText='display:block;width:100%;height:100%;touch-action:none;background:transparent';surface.setAttribute('role','img');surface.tabIndex=0;container.appendChild(surface);
  surface.addEventListener('pointerdown',pointerDown);surface.addEventListener('pointerup',pointerUp);if(!software)surface.addEventListener('webglcontextlost',contextLost);
  controls=new OrbitControls(camera,surface);controls.enableDamping=false;controls.enablePan=false;controls.minZoom=.5;controls.maxZoom=6;controls.rotateSpeed=.7;controls.zoomSpeed=.8;
  controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;controls.target.copy(oldTarget);controls.addEventListener('change',changed);
  lightScene();announce();
 }
 function paletteColor(c,palette){const entry=palette[c],color=Array.isArray(entry)?entry[1]:entry;if(typeof color!=='string'||!/^#[0-9a-f]{3,8}$/i.test(color))throw new TypeError('Missing colour '+c);return color}
 function setStep(next={}){
  if(disposed)return;const checked=stepState(pieces,next);stepOptions={attachedIds:next.attachedIds==null?undefined:Array.from(next.attachedIds),currentIds:next.currentIds==null?undefined:Array.from(next.currentIds),showFuture:next.showFuture!==false};states=checked;
  for(const {id,state}of states){const mesh=meshes.get(id);mesh.userData.state=state;mesh.visible=state!=='hidden';const ghost=state==='future';mesh.material.transparent=ghost;mesh.material.opacity=ghost?.14:1;mesh.material.depthWrite=!ghost;mesh.material.emissive.setHex(state==='current'?0x181000:0x000000);mesh.renderOrder=ghost?-1:state==='current'?2:0;const line=mesh.children[0];line.visible=!ghost;line.material.color.set(state==='current'?'#ed8a16':id===selectedId?'#164ddd':'#343b44');line.material.linewidth=state==='current'||id===selectedId?2:1;mesh.material.needsUpdate=true}
  if(selectedId&&!meshes.get(selectedId)?.visible)selectedId=null;announce();render();emit('step');
 }
 function update(input={}){
  if(disposed)return;
  const next=validatePieces(input.pieces||[]),palette=input.palette||options.palette||{};next.forEach(p=>paletteColor(p.c,palette));
  // Validate everything before disposing the previously visible valid model.
  const nextStep={attachedIds:input.attachedIds,currentIds:input.currentIds,showFuture:input.showFuture};stepState(next,nextStep);const nextBounds=spatialBounds(next,thickness);
  model.clear();materials.forEach(m=>m.dispose());materials.clear();meshes.clear();pieces=next;bounds=nextBounds;name=String(input.name||'');selectedId=null;
  model.position.set(...(bounds?bounds.center.map(v=>-v):[0,0,0]));
  for(const p of pieces){
   const material=new THREE.MeshLambertMaterial({color:paletteColor(p.c,palette)}),lineMaterial=new THREE.LineBasicMaterial({color:'#343b44',transparent:true,opacity:.7});materials.add(material);materials.add(lineMaterial);
   const mesh=new THREE.Mesh(solid,material);mesh.position.set(...p.position);mesh.rotation.set(...p.rotation,'XYZ');mesh.userData={id:p.id,state:'attached'};mesh.add(new THREE.LineSegments(edges,lineMaterial));model.add(mesh);meshes.set(p.id,mesh);
  }
  setStep(nextStep);resize();setView('angle');emit('model');
 }
 function setView(view='angle'){
  if(disposed)return;if(!VIEWS[view])throw new TypeError('Unknown camera view');const distance=radius()*4;
  camera.position.copy(new THREE.Vector3(...VIEWS[view]).normalize().multiplyScalar(distance));camera.up.set(...(view==='top'?[0,1,0]:[0,0,1]));controls.target.set(0,0,0);camera.zoom=1;camera.lookAt(controls.target);fit();controls.update();render();emit('view');
 }
 function zoom(factor){if(disposed)return;if(!Number.isFinite(factor)||factor<=0)throw new RangeError('Invalid zoom factor');camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.5,6);camera.updateProjectionMatrix();controls.update();render();emit('view')}
 function rotate({x=0,y=0,z=0}={}){
  if(disposed)return;if(![x,y,z].every(Number.isFinite))throw new TypeError('Rotation deltas must be finite radians');const e=new THREE.Euler(x,y,z,'XYZ');camera.position.sub(controls.target).applyEuler(e).add(controls.target);camera.up.applyEuler(e).normalize();camera.lookAt(controls.target);controls.update();fit();render();emit('view');
 }
 function inspect(id){
  if(disposed)return null;if(id!==null&&!meshes.has(id))throw new TypeError('Unknown piece '+id);selectedId=id;setStep(stepOptions);
  const piece=id===null?null:pieces.find(p=>p.id===id),selection=piece?{...piece,position:[...piece.position],rotation:[...piece.rotation],state:meshes.get(id).userData.state}:null;
  options.onSelect?.(selection);emit('select',selection);return selection;
 }
 function getState(){return {name,pieceCount:pieces.length,thickness,softwareRenderer:software,selectedId,states:states.map(s=>({...s})),bounds:bounds?{min:[...bounds.min],max:[...bounds.max],center:[...bounds.center],size:[...bounds.size]}:null,camera:{position:camera.position.toArray(),up:camera.up.toArray(),zoom:camera.zoom}}}
 function emit(type,selection){const event={type,state:getState(),...(type==='select'?{selection}:{})};listeners.forEach(fn=>fn(event))}
 function resize(){if(disposed)return;const rect=container.getBoundingClientRect();width=Math.max(1,Math.round(rect.width));height=Math.max(1,Math.round(rect.height));renderer.setPixelRatio?.(Math.min(globalThis.devicePixelRatio||1,2));renderer.setSize(width,height,false);fit();render()}
 installRenderer(options.forceSVG===true);
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(container);if(!observer)globalThis.addEventListener('resize',resize);
 resize();setView('angle');
 function dispose(){
  if(disposed)return;disposed=true;observer?.disconnect();if(!observer)globalThis.removeEventListener('resize',resize);controls.removeEventListener('change',changed);controls.dispose();surface.removeEventListener('pointerdown',pointerDown);surface.removeEventListener('pointerup',pointerUp);surface.removeEventListener('webglcontextlost',contextLost);model.clear();materials.forEach(m=>m.dispose());materials.clear();meshes.clear();solid.dispose();edges.dispose();scene.clear();renderer.renderLists?.dispose();renderer.dispose?.();renderer.forceContextLoss?.();surface.remove();listeners.clear();
 }
 return {update,setStep,setView,reset:setView,zoom,rotate,inspect,getState,resize,subscribe(fn){if(typeof fn!=='function')throw new TypeError('A listener is required');listeners.add(fn);return()=>listeners.delete(fn)},dispose};
}
export const createViewer=createSpatialViewer;
