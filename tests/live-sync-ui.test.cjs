const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const Core=require('../sync/room-core.cjs');
const raw=fs.readFileSync(new URL('../index.html',`file://${__filename}`),'utf8');
const html=raw.replace(/<script src="([^"]+)"><\/script>/g,(_,src)=>'<script>'+fs.readFileSync(new URL('../'+src,`file://${__filename}`),'utf8')+'</script>');
function server(){
 let state=null;const sockets=new Set();const roomId='a'.repeat(32),host='h'.repeat(32),invite='i'.repeat(32),guest='g'.repeat(32);
 const visible=()=>Core.snapshot(state,state.participants.filter(p=>p.tokenHash).map(p=>p.index));
 const broadcast=()=>{for(const s of sockets)if(s.readyState===1)s.onmessage?.({data:JSON.stringify({type:'snapshot',room:visible()})})};
 const fetch=async(url,options={})=>{
  const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null,token=(options.headers?.Authorization||'').replace('Bearer ','');
  try{
   let data;
   if(path==='/rooms'){state=Core.newRoom(roomId,body,{hostHash:host,inviteHash:invite});data={roomId,token:host,inviteToken:invite,me:0,room:visible()}}
   else if(path.endsWith('/join')){state=Core.join(state,token,body.builder,guest);data={token:guest,me:body.builder,room:visible()};broadcast()}
   else if(path.endsWith('/commands')){const actor=Core.authenticate(state,token);state=Core.command(state,actor,body).room;data={room:visible()};broadcast()}
   else {Core.authenticate(state,token,true);data={room:visible()}}
   return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
  }catch(e){return new Response(JSON.stringify({code:e.code,message:e.message}),{status:e.status||500})}
 };
 const socketFor=w=>class{
  constructor(url,protocols){this.readyState=0;sockets.add(this);w.setTimeout(()=>{if(this.readyState!==0)return;this.readyState=1;this.onopen?.();this.onmessage?.({data:JSON.stringify({type:'snapshot',room:visible()})})},0)}
  send(message){if(message==='ping')this.onmessage?.({data:'pong'})}
  close(){this.readyState=3;sockets.delete(this)}
 };
 return {fetch,socketFor,get state(){return state},snapshot:visible};
}
function app(backend,url='https://example.test/#m-motiver50-01',storage={},tabStorage={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const d=new JSDOM(html,{url,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  w.fetch=(url,options)=>(String(url).endsWith('data/motiver.json')||String(url).endsWith('data/navne.json'))?Promise.resolve({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('../'+url,`file://${__filename}`),'utf8'))}):backend.fetch(url,options);w.WebSocket=backend.socketFor(w);w.scrollTo=()=>{};w.requestAnimationFrame=fn=>w.setTimeout(fn,0);
  for(const [k,v]of Object.entries(storage))w.localStorage.setItem(k,v);
  for(const [k,v]of Object.entries(tabStorage))w.sessionStorage.setItem(k,v);
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:30}):()=>{},set:()=>true});
 }});
 const w=d.window,doc=w.document;
 async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>w.setTimeout(r,5))}assert.ok(fn(),'UI condition did not settle')}
 return {w,doc,errors,click:id=>doc.getElementById(id).click(),choose:s=>doc.querySelector(s).click(),until,close:()=>w.close(),storage:()=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const k=w.localStorage.key(i);return[k,w.localStorage.getItem(k)]}))};
}
async function host(backend){const a=app(backend);await a.until(()=>a.doc.getElementById('dName').textContent==='Stjernestav');a.choose('[data-mode="together"]');a.click('liveRoomCreate');await a.until(()=>a.doc.getElementById('liveInviteLink'));return a}
async function pair(){const backend=server(),a=await host(backend),url=a.doc.getElementById('liveInviteLink').value,b=app(backend,url);await b.until(()=>b.doc.querySelector('[data-live-join="1"]'));b.choose('[data-live-join="1"]');await b.until(()=>b.doc.getElementById('buildPerson').textContent==='Alfred bygger'&&!b.doc.getElementById('next').disabled);return {backend,a,b,url}}
test('two isolated device UIs prepare simultaneously and only attach in model order',async()=>{
 const {backend,a,b}=await pair();assert.ok(a.doc.querySelector('#liveRoomQR svg'));assert.match(b.doc.getElementById('rowTitle').textContent,/række 2/);
 b.click('next');await b.until(()=>/Venter på Jens/.test(b.doc.getElementById('next').textContent));assert.equal(b.doc.getElementById('next').disabled,true);assert.equal(backend.state.attached,0);
 a.click('next');await a.until(()=>a.doc.getElementById('next').textContent==='Stykket er sat på'&&!a.doc.getElementById('next').disabled);
 a.click('next');await b.until(()=>b.doc.getElementById('next').textContent==='Stykket er sat på'&&!b.doc.getElementById('next').disabled);
 assert.equal(backend.state.attached,1);b.click('next');await b.until(()=>backend.state.attached===2&&!b.doc.getElementById('next').disabled);
 assert.match(a.doc.getElementById('rowTitle').textContent,/række 3/);assert.match(b.doc.getElementById('rowTitle').textContent,/række 4/);
 assert.deepEqual([...a.errors,...b.errors],[]);a.close();b.close();
});
test('role credentials resume after reload and retain a prepared waiting piece',async()=>{
 const {backend,a,b,url}=await pair();b.click('next');await b.until(()=>backend.state.ready.length===1&&!b.doc.getElementById('liveRoomCreate').disabled);
 const local=b.storage(),session=Object.fromEntries(Array.from({length:b.w.sessionStorage.length},(_,i)=>{const k=b.w.sessionStorage.key(i);return[k,b.w.sessionStorage.getItem(k)]}));b.close();
 // A reload preserves tab storage; seed it before scripts execute.
 const c=app(backend,url,local,session);
 await c.until(()=>c.doc.querySelector('[data-live-resume="1"]')||/Alfred bygger/.test(c.doc.getElementById('buildPerson').textContent));
 if(c.doc.querySelector('[data-live-resume="1"]'))c.choose('[data-live-resume="1"]');
 await c.until(()=>/Venter på Jens/.test(c.doc.getElementById('next').textContent));assert.equal(backend.state.attached,0);assert.deepEqual(c.errors,[]);a.close();c.close();
});
test('leaving a live room restores ordinary catalogue and local guide controls',async()=>{
 const backend=server(),a=await host(backend);a.click('detailBack');await a.until(()=>!a.doc.getElementById('listView').classList.contains('hide'));
 a.choose('[data-id="biler20-lille-bybil"] .model-link');await a.until(()=>a.doc.getElementById('dName').textContent==='Lille bybil');a.choose('[data-mode="alone"]');
 assert.equal(a.doc.getElementById('aloneStart').classList.contains('hide'),false);assert.equal(a.doc.getElementById('liveRoomPanel').classList.contains('hide'),true);
 a.click('aloneStart');assert.match(a.doc.getElementById('rowTitle').textContent,/Trin 1/);assert.deepEqual(a.errors,[]);a.close();
});
test('failed room creation returns to usable setup with a clear error',async()=>{
 const backend=server(),a=app(backend);await a.until(()=>a.doc.getElementById('dName').textContent==='Stjernestav');a.choose('[data-mode="together"]');
 a.w.fetch=async()=>{throw new Error('offline')};a.click('liveRoomCreate');await a.until(()=>/Forbindelsen er afbrudt/.test(a.doc.getElementById('resumeInfo').textContent));
 assert.equal(a.doc.getElementById('teamSetup').classList.contains('hide'),false);assert.equal(a.doc.getElementById('teamStart').disabled,false);assert.deepEqual(a.errors,[]);a.close();
});
test('malformed room invitation gives an accessible error and way back',async()=>{
 const a=app(server(),'https://example.test/#live=broken');await a.until(()=>a.doc.querySelector('#liveRoomPanel [role="alert"]'));
 assert.match(a.doc.querySelector('#liveRoomPanel [role="alert"]').textContent,/beskadiget/);a.choose('[data-live-leave]');await a.until(()=>!a.doc.getElementById('listView').classList.contains('hide'));assert.deepEqual(a.errors,[]);a.close();
});

test('host closing a room updates both devices without QR errors or further actions',async()=>{
 const {backend,a,b}=await pair();a.choose('[data-live-close]');await a.until(()=>a.doc.getElementById('confirmDialog').open);a.click('confirmAccept');
 await b.until(()=>backend.state.closed&&b.doc.getElementById('next').disabled);
 assert.match(a.doc.getElementById('liveRoomPanel').textContent,/afsluttet/);assert.match(b.doc.getElementById('liveRoomPanel').textContent,/afsluttet/);
 assert.equal(a.doc.getElementById('next').disabled,true);assert.deepEqual([...a.errors,...b.errors],[]);a.close();b.close();
});

test('undo confirmation cannot undo a newer piece attached by another device',async()=>{
 const {backend,a,b}=await pair();
 a.click('next');await a.until(()=>!a.doc.getElementById('next').disabled&&a.doc.getElementById('next').textContent==='Stykket er sat på');
 a.click('next');await a.until(()=>backend.state.attached===1&&!a.doc.getElementById('prev').disabled);
 b.click('next');await b.until(()=>!b.doc.getElementById('next').disabled&&b.doc.getElementById('next').textContent==='Stykket er sat på');
 a.click('prev');await a.until(()=>a.doc.getElementById('confirmDialog').open);
 b.click('next');await b.until(()=>backend.state.attached===2);
 a.click('confirmAccept');await a.until(()=>/ændret|opdateret/.test(a.doc.getElementById('liveRoomPanel').textContent));
 assert.equal(backend.state.attached,2);assert.deepEqual([...a.errors,...b.errors],[]);a.close();b.close();
});

test('room list restores a room from home in a new tab without the invitation link',async()=>{
 const backend=server(),a=await host(backend);
 await a.until(()=>!a.doc.getElementById('next').disabled);a.click('next');await a.until(()=>a.doc.getElementById('next').textContent==='Stykket er sat på');
 const saved=a.storage();a.close();
 const b=app(backend,'https://example.test/',saved);
 await b.until(()=>b.doc.getElementById('liveRoomsOpen'));b.click('liveRoomsOpen');
 assert.equal(b.doc.getElementById('liveRoomsDialog').open,true);
 assert.match(b.doc.getElementById('liveRoomsList').textContent,/Stjernestav.*Jens og Alfred/);
 assert.equal(b.doc.querySelectorAll('[data-room-open]').length,1);
 b.choose('[data-room-open="0"]');await b.until(()=>b.doc.getElementById('buildPerson').textContent==='Jens bygger'&&b.doc.getElementById('next').textContent==='Stykket er sat på');
 assert.deepEqual(b.errors,[]);b.close();
});
test('room list handles empty, expired and closed entries and removes only local access',async()=>{
 const backend=server(),a=app(backend,'https://example.test/');await a.until(()=>a.doc.getElementById('liveRoomsOpen'));a.click('liveRoomsOpen');
 assert.match(a.doc.getElementById('liveRoomsList').textContent,/ingen gemte byggerum/);a.click('liveRoomsClose');
 const record=(id,extra)=>({roomId:id.repeat(32),me:0,token:'h'.repeat(32),inviteToken:'i'.repeat(32),modelName:'Test',builders:['Jens','Alfred'],...extra});
 a.w.localStorage.setItem('bv_live_rooms_v1',JSON.stringify({['a'.repeat(32)+':0']:record('a',{expiresAt:Date.now()-1}),['b'.repeat(32)+':0']:record('b',{closed:true,expiresAt:Date.now()+10000})}));
 a.click('liveRoomsOpen');assert.match(a.doc.getElementById('liveRoomsList').textContent,/Udløbet/);assert.match(a.doc.getElementById('liveRoomsList').textContent,/Afsluttet/);
 assert.ok([...a.doc.querySelectorAll('[data-room-open]')].every(b=>b.disabled));
 a.choose('[data-room-forget="0"]');assert.equal(a.doc.querySelectorAll('[data-room-open]').length,1);
 assert.equal(backend.state,null);assert.deepEqual(a.errors,[]);a.close();
});

test('a club crest above 250 bricks can create a live room and take turns',async()=>{
 const backend=server(),a=app(backend,'https://example.test/');await a.until(()=>a.doc.querySelector('[data-id="tema62-manchester-city"] .model-link'));
 a.choose('[data-id="tema62-manchester-city"] .model-link');await a.until(()=>a.doc.getElementById('dName').textContent==='Manchester City');
 a.choose('[data-mode="together"]');a.click('liveRoomCreate');await a.until(()=>a.doc.getElementById('liveInviteLink')&&!a.doc.getElementById('next').disabled);
 assert.equal(backend.state.model.name,'Manchester City');assert.equal(backend.state.model.p.join('').replace(/\./g,'').length,277);
 a.click('next');await a.until(()=>a.doc.getElementById('next').textContent==='Stykket er sat på');assert.deepEqual(a.errors,[]);a.close();
});

test('selected difficulty is the immutable room pattern for every device and reload',async()=>{
 const backend=server(),a=app(backend,'https://example.test/#m-motiver50-01?level=hard');
 await a.until(()=>a.doc.querySelector('#variantOptions [aria-pressed="true"]'));
 assert.equal(a.doc.querySelector('#variantOptions [aria-pressed="true"]').dataset.level,'hard');
 const pattern=JSON.parse(a.w.eval('JSON.stringify(cur.p)'));
 const count=a.w.eval('cur.total'),oldButton=a.doc.querySelector('#variantOptions [data-level="easy"]');
 a.choose('[data-mode="together"]');a.click('liveRoomCreate');
 // A stale setup control cannot change geometry during creation or live play.
 oldButton.click();await a.until(()=>a.doc.getElementById('liveInviteLink'));
 assert.deepEqual(backend.state.model.p,pattern);assert.equal(backend.state.model.id,'motiver50-01');
 assert.equal(backend.state.model.p.join('').replace(/\./g,'').length,count);
 const url=a.doc.getElementById('liveInviteLink').value,b=app(backend,url);
 await b.until(()=>b.doc.querySelector('[data-live-join="1"]'));b.choose('[data-live-join="1"]');
 await b.until(()=>b.doc.getElementById('buildPerson').textContent==='Alfred bygger');
 assert.deepEqual(JSON.parse(b.w.eval('JSON.stringify(cur.p)')),pattern);
 assert.equal(b.doc.getElementById('introBox').classList.contains('hide'),true);
 const stored=a.storage();a.close();const resumed=app(backend,url,stored);
 await resumed.until(()=>resumed.doc.getElementById('buildPerson').textContent==='Jens bygger');
 assert.deepEqual(JSON.parse(resumed.w.eval('JSON.stringify(cur.p)')),pattern);
 assert.deepEqual(b.errors.concat(resumed.errors),[]);b.close();resumed.close();
});
