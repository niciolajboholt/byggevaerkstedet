const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
const source=fs.readFileSync(new URL('../model-3d.js',`file://${__filename}`),'utf8');
function app(options={}){
 const dom=new JSDOM('<main id="detailView"><div id="modelViewport"></div></main>',{url:'https://example.test/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.eval(source);const calls=[],viewers=[],model={id:'one',name:'Prøve',p:['RY'],tiles:[{x:0,y:0,c:'R',o:'h'},{x:1,y:0,c:'Y',o:'v'}]},palette={R:['Rød','#d8383a'],Y:['Gul','#f3d24a']};
 const renderer={createViewer:(container,config)=>{const viewer={config,dispose:()=>calls.push(['dispose']),update:data=>calls.push(['update',data]),reset:view=>calls.push(['reset',view]),zoom:factor=>calls.push(['zoom',factor])};viewers.push(viewer);calls.push(['create',container]);return viewer}};
 let current=model,loads=0;const api=w.Model3D.init({getModel:()=>current,tiles:m=>m.tiles,palette,draw:(canvas,p)=>calls.push(['draw',p]),load:options.load|| (async()=>{loads++;return renderer})});
 return {w,d,api,calls,viewers,model,palette,renderer,get loads(){return loads},set modelValue(m){current=m},close:()=>w.close()};
}
test('3D is lazy, uses exact current tiles and exposes accessible view and zoom controls',async()=>{
 const a=app();assert.equal(a.loads,0);await a.api.open();assert.equal(a.loads,1);assert.equal(a.d.getElementById('model3DDialog').open,true);
 const data=a.calls.find(c=>c[0]==='update')[1];assert.deepEqual(data.tiles,a.model.tiles);assert.equal(data.palette,a.palette);
 a.d.getElementById('model3DFront').click();a.d.getElementById('model3DZoomIn').click();a.d.getElementById('model3DZoomOut').click();
 assert.ok(a.calls.some(c=>c[0]==='reset'&&c[1]==='front'));assert.ok(a.calls.some(c=>c[0]==='zoom'&&c[1]===1.25));
 a.d.getElementById('model3DClose').click();assert.equal(a.d.getElementById('model3DDialog').open,false);assert.equal(a.calls.filter(c=>c[0]==='dispose').length,1);assert.equal(a.d.activeElement.id,'model3DOpen');a.close();
});
test('closing during lazy loading cannot create a late GPU viewer',async()=>{
 let resolve;const a=app({load:()=>new Promise(r=>resolve=r)});const pending=a.api.open();a.api.close();resolve(a.renderer);await pending;
 assert.equal(a.viewers.length,0);assert.equal(a.d.getElementById('model3DDialog').open,false);a.close();
});
test('unsupported 3D falls back to the exact front pattern and can retry',async()=>{
 let fail=true;const a=app({load:async()=>{if(fail)throw Error('unsupported');return a.renderer}});await a.api.open();
 assert.equal(a.d.getElementById('model3DStatus').getAttribute('role'),'alert');assert.equal(a.d.getElementById('model3DControls').querySelector('button').disabled,true);assert.deepEqual(a.calls.find(c=>c[0]==='draw')[1],a.model.p);
 fail=false;await a.api.open();assert.equal(a.d.getElementById('model3DStatus').getAttribute('role'),'status');assert.equal(a.viewers.length,1);a.api.close();a.close();
});
test('WebGL context loss disposes the scene and preserves a usable 2D inspection',async()=>{
 const a=app();await a.api.open();a.viewers[0].config.onContextLost();assert.equal(a.calls.filter(c=>c[0]==='dispose').length,1);assert.equal(a.d.getElementById('model3DFallback').classList.contains('hide'),false);a.api.close();assert.equal(a.calls.filter(c=>c[0]==='dispose').length,1);a.close();
});
test('navigation closes the scene and reopening uses the newly selected difficulty',async()=>{
 const a=app();await a.api.open();a.w.dispatchEvent(new a.w.HashChangeEvent('hashchange'));assert.equal(a.d.getElementById('model3DDialog').open,false);
 const next={...a.model,name:'Ny udgave',p:['R'],tiles:[a.model.tiles[0]]};a.modelValue=next;await a.api.open();assert.equal(a.d.getElementById('model3DTitle').textContent,'Ny udgave · 3D');assert.deepEqual(a.calls.filter(c=>c[0]==='update').at(-1)[1].tiles,next.tiles);a.api.close();a.close();
});
test('Escape closes the modal and releases resources without changing the current motif',async()=>{
 const a=app();await a.api.open();a.d.getElementById('model3DDialog').dispatchEvent(new a.w.Event('cancel',{cancelable:true}));assert.equal(a.d.getElementById('model3DDialog').open,false);assert.equal(a.w.location.hash,'');assert.equal(a.calls.filter(c=>c[0]==='dispose').length,1);a.close();
});
