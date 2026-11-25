const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../sync/room-core.cjs');
const Tasks=require('../build-tasks.js');
const at=1000000;
const input={model:{id:'test',name:'Prøve',p:['RRRR','YYYY','BBBB','GGGG']},builders:['Jens','Alfred'],smallest:null};
const credentials={hostHash:'host-hash',inviteHash:'invite-hash'};
const make=()=>Core.newRoom('a'.repeat(32),input,credentials,at);
const actor=index=>({index,host:index===0,invite:false});
const task=(r,n)=>Tasks.createPlan(r.model.p,{builderCount:r.builders.length,smallest:r.smallest}).tasks[n].id;
const cmd=(r,index,action,idn,taskIndex)=>Core.command(r,actor(index),{id:'command-'+idn,expectedRevision:r.revision,action,...(taskIndex===undefined?{}:{taskId:task(r,taskIndex)})},at).room;
function joined(){return Core.join(make(),'invite-hash',1,'second-hash',at)}
function rejects(fn,status,code){assert.throws(fn,e=>e.status===status&&e.code===code)}

test('create validates bounded model, palette, names and assignment',()=>{
 const room=make();assert.equal(room.revision,0);assert.equal(room.expiresAt,at+Core.TTL);
 for(const change of [{model:{...input.model,p:['Z']}},{model:{...input.model,p:Array(24).fill('R'.repeat(24))}},{builders:['A']},{smallest:2},{builders:['A','x'.repeat(41)]}])rejects(()=>Core.newRoom('r',{...input,...change},credentials,at),400,change.smallest===2?'invalid_assignment':change.builders?'invalid_builders':change.model.p[0]==='Z'?'invalid_pattern':'invalid_size');
});
test('credentials never appear in snapshots and invitation cannot issue commands',()=>{
 const r=make(),s=Core.snapshot(r,[0]);assert.equal(s.participants[0].connected,true);assert.equal(s.participants[1].claimed,false);
 assert.doesNotMatch(JSON.stringify(s),/host-hash|invite-hash|tokenHash|ledger/);
 assert.equal(Core.authenticate(r,'host-hash',false,at).index,0);assert.equal(Core.authenticate(r,'invite-hash',true,at).invite,true);
 rejects(()=>Core.authenticate(r,'invite-hash',false,at),401,'unauthorized');
 rejects(()=>Core.command(r,{invite:true,index:null},{},at),403,'forbidden');
});
test('join claims slots once and rejects invitation or role misuse',()=>{
 const r=joined();assert.equal(r.revision,1);assert.equal(Core.authenticate(r,'second-hash',false,at).index,1);
 rejects(()=>Core.join(r,'invite-hash',1,'third',at),409,'occupied');
 rejects(()=>Core.join(r,'wrong',1,'third',at),401,'unauthorized');
 rejects(()=>Core.join(r,'invite-hash',0,'third',at),409,'occupied');
});
test('both builders can prepare their next piece but attachment follows global order',()=>{
 let r=joined();r=cmd(r,1,'ready',1,1);assert.deepEqual(r.ready,[task(r,1)]);
 rejects(()=>cmd(r,1,'attach',2,1),409,'wait_for_turn');
 r=cmd(r,0,'ready',3,0);r=cmd(r,0,'attach',4,0);assert.equal(r.attached,1);assert.deepEqual(r.ready,[task(r,1)]);
 r=cmd(r,1,'attach',5,1);assert.equal(r.attached,2);assert.deepEqual(r.ready,[]);
});
test('only task owner can prepare/attach, each owner gets their first unplaced task',()=>{
 let r=joined();rejects(()=>cmd(r,0,'ready',1,1),409,'wrong_task');
 r=cmd(r,0,'ready',2,0);rejects(()=>cmd(r,0,'ready',3,2),409,'wrong_task');
 rejects(()=>cmd(r,1,'attach',4,0),403,'wrong_owner');
});
test('idempotent commands cannot attach twice even after revision changed',()=>{
 let r=joined();r=cmd(r,0,'ready',1,0);
 const c={id:'same-attach-id',expectedRevision:r.revision,action:'attach',taskId:task(r,0)};
 const a=Core.command(r,actor(0),c,at);assert.equal(a.room.attached,1);
 const b=Core.command(a.room,actor(0),c,at);assert.equal(b.duplicate,true);assert.equal(b.room.revision,a.room.revision);assert.equal(b.room.attached,1);
 rejects(()=>Core.command(a.room,actor(0),{...c,action:'ready'},at),409,'command_reused');
});
test('stale revisions fail without changing the room',()=>{
 const r=joined(),before=JSON.stringify(r);rejects(()=>Core.command(r,actor(0),{id:'stale-id',expectedRevision:0,action:'ready',taskId:task(r,0)},at),409,'revision_conflict');assert.equal(JSON.stringify(r),before);
});
test('undo preserves other prepared pieces and only host or last owner may undo',()=>{
 let r=joined();r=cmd(r,0,'ready',1,0);r=cmd(r,0,'attach',2,0);r=cmd(r,0,'ready',3,2);r=cmd(r,1,'ready',4,1);
 rejects(()=>cmd(r,1,'undo',5),403,'wrong_owner');
 r=cmd(r,0,'undo',6);assert.equal(r.attached,0);assert.deepEqual(new Set(r.ready),new Set([task(r,0),task(r,1),task(r,2)]));
 r=cmd(r,0,'attach',7,0);r=cmd(r,1,'attach',8,1);assert.deepEqual(r.ready,[task(r,2)]);
});
test('host closes room, other builders cannot, closed rooms cannot change or join',()=>{
 let r=joined();rejects(()=>cmd(r,1,'close',1),403,'host_only');r=cmd(r,0,'close',2);assert.equal(r.closed,true);
 rejects(()=>cmd(r,0,'ready',3,0),410,'closed');rejects(()=>Core.join(r,'invite-hash',1,'x',at),410,'closed');
});
test('expired or nonexistent room cannot be read or mutated',()=>{
 rejects(()=>Core.authenticate(null,'x',true,at),404,'not_found');const r=make();rejects(()=>Core.authenticate(r,'host-hash',false,r.expiresAt),410,'expired');
});
test('room persistence round-trip retains exact tasks, roles, ready state and idempotency',()=>{
 let r=joined();r=cmd(r,1,'ready',1,1);r=cmd(r,0,'ready',2,0);r=cmd(r,0,'attach',3,0);
 const loaded=JSON.parse(JSON.stringify(r));assert.deepEqual(Core.snapshot(loaded),Core.snapshot(r));assert.equal(Core.authenticate(loaded,'second-hash',false,at).index,1);assert.equal(Core.command(loaded,actor(0),{id:'command-3',expectedRevision:0,action:'attach',taskId:task(r,0)},at).duplicate,true);
});

// HTTP/RPC integration against the actual Worker/DO classes. SQLite host calls
// are a transactional in-memory adapter; deployment tests must exercise workerd.
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
function workerHarness(){
 const sockets=[];
 class FakeDurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env}}
 const context={Core,DurableObject:FakeDurableObject,Response,Request,Headers,URL,TextEncoder,TextDecoder,Uint8Array,Map,Set,Date,JSON,Math,Number,Array,Object,String,Error,crypto:webcrypto,btoa,WebSocketRequestResponsePair:class{constructor(request,response){this.request=request;this.response=response}}};
 let src=fs.readFileSync(new URL('../sync/worker.mjs',`file://${__filename}`),'utf8').replace(/^import .*;\n/gm,'').replace('export default {','const worker = {').replace(/export class /g,'class ');
 src+='\nthis.worker=worker;this.LiveRoom=LiveRoom;this.AdmissionGate=AdmissionGate;';vm.runInNewContext(src,context);
 const rooms=new Map();let allowed=true;
 function ctx(){let data=null;return {storage:{sql:{exec(query,...args){if(query.startsWith('INSERT INTO room'))data=args[0];if(query==='DELETE FROM room')data=null;return {toArray:()=>query.startsWith('SELECT data FROM room')&&data?[{data}]:[]}}},transactionSync(fn){const before=data;try{return fn()}catch(e){data=before;throw e}},async setAlarm(t){this.alarm=t}},getWebSockets:()=>sockets,acceptWebSocket:ws=>sockets.push(ws),setWebSocketAutoResponse(){}}}
 const env={ALLOWED_ORIGINS:'https://niciolajboholt.github.io',ADMISSION:{getByName:()=>({allow:async()=>allowed})},ROOMS:{getByName:id=>{if(!rooms.has(id))rooms.set(id,new context.LiveRoom(ctx(),env));return rooms.get(id)}}};
 return {fetch:(path,options={})=>context.worker.fetch(new Request('https://sync.test'+path,options),env),setAllowed:v=>allowed=v,rooms};
}
const requestOptions=(method,token,payload,origin='https://niciolajboholt.github.io')=>({method,headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{}),...(payload!==undefined?{'Content-Type':'application/json'}:{})},...(payload!==undefined?{body:JSON.stringify(payload)}:{})});
test('Worker HTTP routes unwrap RPC envelopes and broadcast-safe room snapshots',async()=>{
 const h=workerHarness();let response=await h.fetch('/rooms',requestOptions('POST',null,input));assert.equal(response.status,201);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://niciolajboholt.github.io');
 const created=await response.json();assert.equal(created.room.revision,0);assert.equal(created.room.ok,undefined);assert.match(created.token,/^[A-Za-z0-9_-]{32}$/);assert.match(created.roomId,/^[a-f0-9]{32}$/);
 response=await h.fetch('/rooms/'+created.roomId,requestOptions('GET',created.inviteToken));assert.equal(response.status,200);assert.equal((await response.json()).room.roomId,created.roomId);
 response=await h.fetch('/rooms/'+created.roomId+'/join',requestOptions('POST',created.inviteToken,{builder:1}));assert.equal(response.status,200);const joined=await response.json();assert.equal(joined.me,1);assert.equal(joined.room.revision,1);
 response=await h.fetch('/rooms/'+created.roomId+'/commands',requestOptions('POST',created.token,{id:'first-ready-id',expectedRevision:1,action:'ready',taskId:task(joined.room,0)}));assert.equal(response.status,200);assert.equal((await response.json()).room.revision,2);
});
test('Worker rejects unauthorized requests without revealing room snapshots',async()=>{
 const h=workerHarness(),created=await (await h.fetch('/rooms',requestOptions('POST',null,input))).json(),path='/rooms/'+created.roomId;
 for(const endpoint of [path,path+'/commands']){
  const r=await h.fetch(endpoint,requestOptions(endpoint.endsWith('/commands')?'POST':'GET','x'.repeat(32),endpoint.endsWith('/commands')?{id:'unauth-id',expectedRevision:0,action:'close'}:undefined));assert.equal(r.status,401);const body=await r.json();assert.equal(body.room,undefined);assert.equal(body.code,'unauthorized');assert.doesNotMatch(JSON.stringify(body),/Jens|Alfred|RRRR/);
 }
 const inviteWrite=await h.fetch(path+'/commands',requestOptions('POST',created.inviteToken,{id:'invite-id',expectedRevision:0,action:'close'}));assert.equal(inviteWrite.status,401);assert.equal((await inviteWrite.json()).room,undefined);
 const invalidJoin=await h.fetch(path+'/join',requestOptions('POST',created.inviteToken,null));assert.equal(invalidJoin.status,400);
});
test('Worker origin, body bounds, unknown routes and admission checks are enforced',async()=>{
 const h=workerHarness();let r=await h.fetch('/rooms',requestOptions('POST',null,input,'https://attacker.invalid'));assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
 r=await h.fetch('/rooms',requestOptions('POST',null,{padding:'x'.repeat(13000)}));assert.equal(r.status,413);
 r=await h.fetch('/rooms/not-a-room',requestOptions('GET','x'.repeat(32)));assert.equal(r.status,404);
 h.setAllowed(false);r=await h.fetch('/rooms',requestOptions('POST',null,input));assert.equal(r.status,429);
 r=await h.fetch('/health');assert.deepEqual(await r.json(),{ok:true,version:'1',planVersion:2});
});
test('Worker stale errors include current snapshot only to an authenticated participant',async()=>{
 const h=workerHarness(),created=await (await h.fetch('/rooms',requestOptions('POST',null,input))).json();
 await h.fetch('/rooms/'+created.roomId+'/join',requestOptions('POST',created.inviteToken,{builder:1}));
 const r=await h.fetch('/rooms/'+created.roomId+'/commands',requestOptions('POST',created.token,{id:'stale-http-id',expectedRevision:0,action:'ready',taskId:task(created.room,0)}));assert.equal(r.status,409);const e=await r.json();assert.equal(e.code,'revision_conflict');assert.equal(e.room.revision,1);assert.equal(e.room.attached,0);
});

test('targeted undo cannot undo a newer attachment after another builder updates the room',()=>{
 let r=joined();r=cmd(r,0,'ready',1,0);r=cmd(r,0,'attach',2,0);const target=task(r,0);
 r=cmd(r,1,'ready',3,1);r=cmd(r,1,'attach',4,1);const before=JSON.stringify(r);
 rejects(()=>Core.command(r,actor(0),{id:'targeted-undo-id',expectedRevision:r.revision,action:'undo',taskId:target},at),409,'wrong_task');
 assert.equal(JSON.stringify(r),before);
 const changed=Core.command(r,actor(0),{id:'correct-undo-id',expectedRevision:r.revision,action:'undo',taskId:task(r,1)},at).room;
 assert.equal(changed.attached,1);assert.ok(changed.ready.includes(task(r,1)));
});

test('room envelope accepts 300 whole bricks and rejects 301',()=>{
 const p=Array(15).fill('R'.repeat(20));
 const room=Core.newRoom('a'.repeat(32),{...input,model:{id:'large-crest',name:'Stort klublogo',p}},credentials,at);
 assert.equal(room.model.p.join('').replace(/\./g,'').length,300);
 assert.equal(Tasks.createPlan(room.model.p,{builderCount:2}).total,300);
 rejects(()=>Core.newRoom('a'.repeat(32),{...input,model:{...input.model,p:p.concat('R'.padEnd(20,'.'))}},credentials,at),400,'invalid_size');
});

test('new rooms pin the connected plan version; legacy rooms keep their exact task IDs',()=>{
 const current=make();assert.equal(current.planVersion,2);assert.equal(Core.snapshot(current).planVersion,2);
 const legacy=make(),old=Tasks.createPlan(legacy.model.p,{builderCount:legacy.builders.length,smallest:legacy.smallest,version:1});
 delete legacy.planVersion;legacy.planId=old.id;
 assert.equal(Core.snapshot(legacy).planVersion,1);
 const ready=Core.command(legacy,actor(0),{id:'legacy-ready-01',expectedRevision:legacy.revision,action:'ready',taskId:old.tasks[0].id},at).room;
 assert.ok(ready.ready.includes(old.tasks[0].id));assert.equal(ready.planId,old.id);
 assert.notEqual(current.planId,old.id);
});
