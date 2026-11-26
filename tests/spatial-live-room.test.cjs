'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const Core=require('../sync/room-core.cjs');
const Tasks=require('../build-tasks.js');
const Client=require('../live-sync-client.js');
const ID='a'.repeat(32),at=1000000,P=Math.PI/2;
const freshScene=()=>({rotationUnit:'radians',rotationOrder:'XYZ',pieces:[
 {id:'a',c:'R',position:[0,0,0],rotation:[0,0,0]},
 {id:'b',c:'B',position:[3,0,0],rotation:[0,0,P]},
 {id:'c',c:'G',position:[3,3,0],rotation:[0,P,0]},
 {id:'d',c:'Y',position:[3,3,3],rotation:[P,0,0]},
 {id:'e',c:'R',position:[6,3,3],rotation:[0,0,P]},
 {id:'f',c:'B',position:[6,6,3],rotation:[0,P,0]},
 {id:'g',c:'G',position:[6,6,6],rotation:[P,0,0]},
 {id:'h',c:'Y',position:[9,6,6],rotation:[0,0,P]}
],steps:'abcdefgh'.split('').map((pieceId,i)=>{const axis=i===0?2:(i-1)%3,insertionDirection=[0,0,0],fromOffset=[0,0,0];insertionDirection[axis]=-1;fromOffset[axis]=12;return {pieceId,parentId:i?'abcdefgh'[i-1]:null,insertionDirection,fromOffset}})});
const input=()=>({model:{id:'spatial-proof',name:'Rumlig prøve',kind:'spatial',scene:freshScene()},builders:['Jens','Alfred'],smallest:null});
const make=()=>Core.newRoom(ID,input(),{hostHash:'host-hash',inviteHash:'invite-hash'},at);
const plan=room=>Tasks.createPlan(room.model.scene,{builderCount:room.builders.length,smallest:room.smallest,version:room.planVersion});
const actor=i=>({index:i,host:i===0,invite:false});
function issue(room,index,action,id,taskId){return Core.command(room,actor(index),{id,expectedRevision:room.revision,action,...(taskId?{taskId}:{})},at)}
function rejects(fn,code='invalid_scene'){assert.throws(fn,e=>e instanceof Core.RoomError&&e.code===code)}
function malformed(){
 const out=[];
 let s=freshScene();s.pieces[3].position=[30,30,30];out.push(['floating',s]);
 s=freshScene();s.pieces[3].position=s.pieces[0].position.slice();s.pieces[3].rotation=s.pieces[0].rotation.slice();out.push(['overlap',s]);
 s=freshScene();s.pieces[1].rotation=[0,0,.4];out.push(['nonorthogonal',s]);
 s=freshScene();s.pieces[1].position=[Infinity,0,0];out.push(['nonfinite',s]);
 s=freshScene();s.pieces[1].position=[300,0,0];out.push(['bounds',s]);
 s=freshScene();s.pieces[1].id='a';out.push(['duplicate',s]);
 s=freshScene();s.pieces[1].c='Z';out.push(['palette',s]);
 s=freshScene();s.steps[1].fromOffset=[0,0,0];out.push(['invalid insertion',s]);
 s=freshScene();s.steps=[];out.push(['missing assembly',s]);
 s=freshScene();s.pieces=Array.from({length:251},(_,i)=>({...s.pieces[0],id:'p'+i}));out.push(['piece limit',s]);
 return out;
}
test('spatial room stores exact poses and kind without a fabricated 2D pattern',()=>{
 const room=make();assert.equal(room.v,1);assert.equal(room.planVersion,3);
 assert.equal(room.model.kind,'spatial');assert.equal(room.model.p,undefined);assert.deepEqual(room.model.scene,freshScene());
 const snapshot=Core.snapshot(room);assert.deepEqual(snapshot.model.scene,freshScene());assert.equal(snapshot.planVersion,3);
 assert.equal(plan(room).total,8);assert.ok(plan(room).tasks.every(t=>t.tiles.every(p=>Array.isArray(p.position)&&Array.isArray(p.rotation))));
 assert.doesNotMatch(JSON.stringify(snapshot),/host-hash|invite-hash|tokenHash|ledger/);
 const source=input();const clean=Core.validateCreate(source);source.model.scene.pieces[0].position[0]=90;assert.equal(clean.model.scene.pieces[0].position[0],0);
});
test('spatial ready, owner, global turn, attach, undo, persistence and duplicate handling round-trip',()=>{
 let room=Core.join(make(),'invite-hash',1,'member-hash',at);
 const tasks=plan(room).tasks;assert.ok(tasks.length>=2);
 const first=tasks[0],second=tasks[1];
 rejects(()=>issue(room,(first.owner+1)%2,'attach','wrong-owner-01',first.id),'wrong_owner');
 room=issue(room,first.owner,'ready','spatial-ready-01',first.id).room;
 const command={id:'spatial-attach-01',expectedRevision:room.revision,action:'attach',taskId:first.id};
 room=Core.command(room,actor(first.owner),command,at).room;
 assert.equal(room.attached,1);
 assert.equal(Core.command(JSON.parse(JSON.stringify(room)),actor(first.owner),command,at).duplicate,true);
 room=issue(room,second.owner,'ready','spatial-ready-02',second.id).room;
 room=issue(room,second.owner,'attach','spatial-attach-02',second.id).room;
 const before=JSON.parse(JSON.stringify(room));room=issue(room,0,'undo','spatial-undo-01',second.id).room;
 assert.equal(room.attached,1);assert.ok(room.ready.includes(second.id));assert.deepEqual(room.model.scene,before.model.scene);
 assert.deepEqual(Core.snapshot(JSON.parse(JSON.stringify(room))),Core.snapshot(room));
 assert.equal(plan(room).id,room.planId);
});
test('untrusted spatial creation rejects floating, overlapping, malformed and oversized poses',()=>{
 for(const [label,scene] of malformed())assert.throws(()=>Core.validateCreate({...input(),model:{...input().model,scene}}),e=>e instanceof Core.RoomError&&e.code==='invalid_scene',label);
 rejects(()=>Core.validateCreate({...input(),model:{...input().model,p:['R']}}));
 rejects(()=>Core.validateCreate({...input(),model:{...input().model,kind:undefined}}));
 const scene=freshScene();scene.note='x'.repeat(120000);rejects(()=>Core.validateCreate({...input(),model:{...input().model,scene}}),'too_large');
});
test('client accepts exact v3 spatial snapshots and validates invitation reads before exposure',async()=>{
 const room=Core.snapshot(make()),client=new Client({WebSocket:null,storage:null,sessionStorage:null,fetch:async()=>({ok:true,json:async()=>({room})})});
 assert.equal(client.accept(room).model.scene.pieces.length,8);
 assert.deepEqual((await client.loadInvite({roomId:ID,inviteToken:'x'.repeat(32)})).model.scene,freshScene());
 for(const [,scene] of malformed())assert.throws(()=>client.accept({...room,revision:room.revision+1,model:{...room.model,scene}}),e=>e.code==='bad_snapshot');
 assert.throws(()=>client.accept({...room,planVersion:2}),e=>e.code==='bad_snapshot');
 assert.equal(client.room,room);
 const bad={...room,model:{...room.model,scene:{...freshScene(),pieces:[]}}};client.fetch=async()=>({ok:true,json:async()=>({room:bad})});
 await assert.rejects(client.loadInvite({roomId:ID,inviteToken:'x'.repeat(32)}),e=>e.code==='bad_snapshot');
 client.disconnect();
});
function workerHarness(){
 class FakeDurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}
 const context={Core,DurableObject:FakeDurableObject,Response,Request,Headers,URL,TextEncoder,TextDecoder,Uint8Array,Map,Set,Date,JSON,Math,Number,Array,Object,String,Error,crypto:webcrypto,btoa,WebSocketRequestResponsePair:class{}};
 let source=fs.readFileSync(new URL('../sync/worker.mjs',`file://${__filename}`),'utf8').replace(/^import .*;\n/gm,'').replace('export default {','const worker = {').replace(/export class /g,'class ');
 vm.runInNewContext(source+'\nthis.worker=worker;this.LiveRoom=LiveRoom;',context);
 const rooms=new Map();
 function ctx(){let stored=null;return {storage:{sql:{exec(q,...args){if(q.startsWith('INSERT INTO room'))stored=args[0];return {toArray:()=>q.startsWith('SELECT data FROM room')&&stored?[{data:stored}]:[]}}},transactionSync(fn){const before=stored;try{return fn()}catch(e){stored=before;throw e}},async setAlarm(){}},getWebSockets:()=>[],setWebSocketAutoResponse(){}}}
 const env={ADMISSION:{getByName:()=>({allow:async()=>true})},ROOMS:{getByName:id=>{if(!rooms.has(id))rooms.set(id,new context.LiveRoom(ctx(),env));return rooms.get(id)}}};
 return (path,payload,token)=>context.worker.fetch(new Request('https://sync.test'+path,{method:payload==null?'GET':'POST',headers:{Origin:'https://niciolajboholt.github.io',...(payload!=null?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(payload!=null?{body:typeof payload==='string'?payload:JSON.stringify(payload)}:{})}),env);
}
test('Worker admits bounded spatial envelopes above12k, preserves scenes over HTTP and keeps mutation limits',async()=>{
 const fetch=workerHarness(),payload=input();payload.model.scene.note='x'.repeat(13000);
 let r=await fetch('/rooms',payload);assert.equal(r.status,201);const created=await r.json();
 assert.equal(created.room.model.kind,'spatial');assert.equal(created.room.model.scene.note.length,13000);
 r=await fetch('/rooms/'+created.roomId,null,created.inviteToken);assert.equal(r.status,200);assert.deepEqual((await r.json()).room.model.scene,payload.model.scene);
 const t=plan(created.room).tasks[0];
 r=await fetch('/rooms/'+created.roomId+'/commands',{id:'http-ready-spatial',expectedRevision:0,action:'ready',taskId:t.id},created.token);assert.equal(r.status,200);
 r=await fetch('/rooms',{...payload,padding:'x'.repeat(120000)});assert.equal(r.status,413);
 r=await fetch('/rooms',{model:{id:'flat',name:'Flat',p:['RR']},builders:['A','B'],padding:'x'.repeat(13000)});assert.equal(r.status,413);
 r=await fetch('/rooms',' '.repeat(13000)+JSON.stringify({model:{id:'flat',name:'Flat',p:['RR']},builders:['A','B']}));assert.equal(r.status,413);
 r=await fetch('/rooms/'+created.roomId+'/commands',{id:'http-command-large',expectedRevision:1,action:'ready',padding:'x'.repeat(2100)},created.token);assert.equal(r.status,413);
});
