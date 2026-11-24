/* Optional 3D inspection. Building progress and the 2D instruction canvas stay independent. */
(function(root){
'use strict';
let bundlePromise=null;
function loadBundle(){
 if(root.Brick3DRenderer?.createViewer)return Promise.resolve(root.Brick3DRenderer);
 if(bundlePromise)return bundlePromise;
 bundlePromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=new URL('vendor/three-viewer.js?v=0.187.0-1',document.baseURI).href;script.async=true;
  let settled=false;const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove();bundlePromise=null;reject(error)}else resolve(root.Brick3DRenderer)};
  const timer=setTimeout(()=>finish(Error('3D load timed out')),20000);
  script.onload=()=>finish(root.Brick3DRenderer?.createViewer?null:Error('3D renderer unavailable'));script.onerror=()=>finish(Error('3D load failed'));document.head.append(script);
 });return bundlePromise;
}
function init(options){
 if(document.getElementById('model3DOpen'))return;
 const openButton=document.createElement('button');openButton.id='model3DOpen';openButton.type='button';openButton.className='btn ghost model-3d-open';openButton.textContent='Se motivet i 3D';
 document.getElementById('modelViewport').after(openButton);
 const dialog=document.createElement('dialog');dialog.id='model3DDialog';dialog.className='model-3d-dialog';dialog.setAttribute('aria-labelledby','model3DTitle');
 dialog.innerHTML='<div class="model-3d-heading"><h2 id="model3DTitle">Se motivet i 3D</h2><button type="button" class="btn ghost" id="model3DClose" autofocus>Luk</button></div><p id="model3DStatus" class="meta" role="status">Henter 3D-visning…</p><div id="model3DStage" class="model-3d-stage" role="img" aria-label="Drejelig 3D-model"></div><div id="model3DFallback" class="hide"><canvas id="model3DFallbackCanvas" role="img" aria-label="Motivet set forfra"></canvas><button type="button" class="btn ghost" id="model3DRetry">Prøv 3D igen</button></div><div id="model3DControls" class="model-3d-controls" role="group" aria-label="3D-visning"><button type="button" class="btn ghost" id="model3DFront">Forfra</button><button type="button" class="btn ghost" id="model3DAngle">Skråt</button><button type="button" class="btn ghost" id="model3DZoomIn" aria-label="Zoom ind">＋</button><button type="button" class="btn ghost" id="model3DZoomOut" aria-label="Zoom ud">−</button></div><p class="meta model-3d-help">Træk for at dreje. Knib med to fingre for at zoome. Motivet er en flad mosaik med tykkelse på brikkerne.</p>';
 document.body.append(dialog);
 const get=id=>document.getElementById(id);let viewer=null,generation=0,model=null;
 const dispose=()=>{if(viewer){viewer.dispose();viewer=null}get('model3DStage').replaceChildren()};
 const controls=enabled=>get('model3DControls').querySelectorAll('button').forEach(b=>b.disabled=!enabled);
 function fallback(operation){
  if(operation!==generation||!dialog.open)return;
  dispose();controls(false);get('model3DStage').classList.add('hide');get('model3DFallback').classList.remove('hide');
  get('model3DStatus').textContent='3D kunne ikke vises lige nu. Her er motivet forfra.';get('model3DStatus').setAttribute('role','alert');
  options.draw(get('model3DFallbackCanvas'),model.p);
 }
 async function show(){
  model=options.getModel();if(!model)return;const operation=++generation;dispose();
  get('model3DTitle').textContent=model.name+' · 3D';get('model3DStatus').textContent='Henter 3D-visning…';get('model3DStatus').setAttribute('role','status');delete get('model3DStatus').dataset.failure;
  get('model3DFallback').classList.add('hide');get('model3DStage').classList.remove('hide');controls(false);
  if(!dialog.open)dialog.showModal();get('model3DClose').focus();
  try{
   const renderer=await (options.load||loadBundle)();if(operation!==generation||!dialog.open)return;
   viewer=renderer.createViewer(get('model3DStage'),{onContextLost:()=>{get('model3DStatus').dataset.failure='context-lost';fallback(operation)}});
   viewer.update({tiles:options.tiles(model),palette:options.palette,name:model.name});viewer.reset('angle');controls(true);
   get('model3DStage').setAttribute('aria-label',model.name+' bygget af hele Plus-Plus-brikker i 3D');get('model3DStatus').textContent='Drej modellen, og undersøg brikkernes form og tykkelse.';
  }catch(error){if(operation===generation)get('model3DStatus').dataset.failure=String(error?.message||'unknown');fallback(operation)}
 }
 function close(){++generation;dispose();if(dialog.open)dialog.close()}
 openButton.onclick=show;get('model3DRetry').onclick=show;get('model3DClose').onclick=close;
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 dialog.addEventListener('close',()=>{++generation;dispose();if(!document.getElementById('detailView').classList.contains('hide'))openButton.focus()});
 get('model3DFront').onclick=()=>viewer?.reset('front');get('model3DAngle').onclick=()=>viewer?.reset('angle');
 get('model3DZoomIn').onclick=()=>viewer?.zoom(1.25);get('model3DZoomOut').onclick=()=>viewer?.zoom(.8);
 root.addEventListener('hashchange',()=>{if(dialog.open)close()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open)close()});
 return {open:show,close};
}
root.Model3D={init};
})(globalThis);
