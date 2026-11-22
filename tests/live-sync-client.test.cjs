const {test}=require('node:test');
const assert=require('node:assert/strict');
const Client=require('../live-sync-client.js');
const ID='a'.repeat(32),TOKEN='host_'+ 'x'.repeat(32),INVITE='invite_'+ 'y'.repeat(32),OTHER='member_'+ 'z'.repeat(32);
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),values};}
function snapshot(overrides={}){return {v:1,roomId:ID,model:{id:'car',name:'Bil',p:['RR','YY']},builders:['Jens','Alfred'],smallest:null,planId:'plan',revision:0,attached:0,ready:[],participants:[{index:0,claimed:true,connected:false},{index:1,claimed:false,connected:false}],expiresAt:Date.now()+86400000,closed:false,...overrides};}
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
function harness(options={}){
 const calls=[],statuses=[],rooms=[],errors=[],timers=new Map();let timerId=0;
 class Socket{
  static all=[];
  constructor(url,protocols){this.url=url;this.protocols=protocols;this.readyState=0;this.sent=[];Socket.all.push(this)}
  open(){this.readyState=1;this.onopen?.()}
  message(data){this.onmessage?.({data:typeof data==='string'?data:JSON.stringify(data)})}
  send(s){this.sent.push(s)}
  close(){this.readyState=3;this.onclose?.()}
 }
 const local=options.storage||storage(),tab=options.tabStorage||storage();
 const c=new Client({base:'https://sync.test',storage:local,sessionStorage:tab,WebSocket:options.noSocket?null:Socket,
  fetch:async(url,init)=>{calls.push({url,init});return (options.fetch||((url,init)=>response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})))(url,init)},
  uuid:()=> 'command-id-1',onRoom:r=>rooms.push(r),onStatus:s=>statuses.push(s),onError:e=>errors.push(e),
  setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id)});
 async function run(ms){const entry=[...timers].find(([,t])=>t.ms===ms);assert.ok(entry,'a timer exists for '+ms);timers.delete(entry[0]);await entry[1].fn()}
 return {c,calls,statuses,rooms,errors,timers,local,tab,Socket,run};
}
test('create persists participant credentials locally and sends WebSocket token in protocol, never URL',async()=>{
 const h=harness();await h.c.create({model:{id:'car',name:'Bil',p:['RR','YY']},builders:['Jens','Alfred'],smallest:null});
 assert.equal(h.calls[0].url,'https://sync.test/rooms');assert.equal(h.calls[0].init.method,'POST');
 const ws=h.Socket.all[0];assert.equal(ws.url,'wss://sync.test/rooms/'+ID+'/ws');assert.deepEqual(ws.protocols,['bv-sync',TOKEN]);assert.ok(!ws.url.includes(TOKEN));
 assert.equal(h.c.saved(ID,0).token,TOKEN);assert.equal(h.c.activeRole(ID),0);
 assert.equal(h.rooms[0].token,undefined);ws.open();assert.equal(h.c.status,'online');
 const url=h.c.inviteURL('https://app.test/#old');assert.ok(url.startsWith('https://app.test/#live='));assert.ok(!url.includes(TOKEN));assert.deepEqual(Client.parseInvite(url.split('#live=')[1]),{roomId:ID,inviteToken:INVITE});h.c.disconnect();
});
test('credentials are isolated by room and role while active builder is isolated by browser tab',async()=>{
 const local=storage(),a=harness({storage:local}),b=harness({storage:local,fetch:()=>response({roomId:ID,token:OTHER,me:1,room:snapshot({participants:[{index:0,claimed:true,connected:true},{index:1,claimed:true,connected:true}]})})});
 await a.c.create({});await b.c.join({roomId:ID,inviteToken:INVITE},1);
 assert.equal(a.c.activeRole(ID),0);assert.equal(b.c.activeRole(ID),1);assert.equal(a.c.saved(ID).token,TOKEN);assert.equal(b.c.saved(ID).token,OTHER);assert.equal(a.c.savedRoles(ID).length,2);
 const fresh=harness({storage:local});assert.equal(fresh.c.activeRole(ID),null);assert.equal(fresh.c.saved(ID),null);assert.deepEqual(fresh.c.savedRoles(ID).map(x=>x.me),[0,1]);
 a.c.disconnect();b.c.disconnect();fresh.c.disconnect();
});
test('snapshot revisions never regress and same-revision presence updates remain visible',async()=>{
 const h=harness();await h.c.create({});const ws=h.Socket.all[0];ws.open();
 ws.message({type:'snapshot',room:snapshot({revision:3,attached:1})});assert.equal(h.c.room.revision,3);
 ws.message({type:'snapshot',room:snapshot({revision:2,attached:0})});assert.equal(h.c.room.attached,1);
 ws.message({type:'snapshot',room:snapshot({revision:3,attached:1,participants:[{index:1,claimed:true,connected:true}]})});assert.equal(h.c.room.participants[0].connected,true);
 const n=h.errors.length;ws.message('pong');assert.equal(h.errors.length,n);h.c.disconnect();
});
test('commands carry owner authorization and revision and reject concurrent double submission',async()=>{
 let finish;const h=harness({fetch:(url,init)=>url.endsWith('/commands')?new Promise(r=>{finish=r}):response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})});
 await h.c.create({});const first=h.c.command('ready','task-1');await assert.rejects(h.c.command('ready','task-1'),e=>e.code==='busy');
 const request=h.calls.find(x=>x.url.endsWith('/commands'));assert.equal(request.init.headers.Authorization,'Bearer '+TOKEN);assert.deepEqual(JSON.parse(request.init.body),{id:'command-id-1',expectedRevision:0,action:'ready',taskId:'task-1'});
 finish(response({room:snapshot({revision:1,ready:['task-1']})}));await first;assert.equal(h.c.room.revision,1);assert.equal(h.c.pending,false);assert.equal(h.calls.filter(x=>x.url.endsWith('/commands')).length,1);h.c.disconnect();
});
test('revision conflict refreshes from returned authority without replaying the mutation',async()=>{
 const h=harness({fetch:(url)=>url.endsWith('/commands')?response({code:'revision_conflict',message:'stale',room:snapshot({revision:7,attached:2})},409):response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})});
 await h.c.create({});await assert.rejects(h.c.command('attach','task-1'),e=>e.code==='revision_conflict');assert.equal(h.c.room.revision,7);assert.equal(h.c.room.attached,2);assert.equal(h.calls.filter(x=>x.url.endsWith('/commands')).length,1);h.c.disconnect();
});
test('reconnect fetches the latest snapshot before opening a fresh authenticated socket',async()=>{
 let getCount=0;const h=harness({fetch:(url,init)=>init.method==='GET'?response({room:snapshot({revision:++getCount,attached:1})}):response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})});
 await h.c.create({});h.Socket.all[0].open();h.Socket.all[0].close();assert.equal(h.c.status,'reconnecting');await h.run(1000);
 assert.equal(h.c.room.revision,1);assert.equal(h.Socket.all.length,2);assert.equal(h.calls.filter(x=>x.init.method==='POST').length,1);h.c.disconnect();assert.equal(h.timers.size,0);
});
test('network mutation failure does not silently retry or optimistically attach anything',async()=>{
 const h=harness({fetch:(url,init)=>url.endsWith('/commands')?Promise.reject(new Error('lost')):init.method==='GET'?response({room:snapshot({revision:0,attached:0})}):response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})});
 await h.c.create({});await assert.rejects(h.c.command('attach','task-1'),e=>e.code==='connection');await Promise.resolve();await Promise.resolve();
 assert.equal(h.calls.filter(x=>x.url.endsWith('/commands')).length,1);assert.equal(h.c.room.attached,0);h.c.disconnect();
});
test('invalid invites and mismatched room snapshots are rejected before applying state',async()=>{
 for(const bad of ['%bad',encodeURIComponent('{}'),encodeURIComponent(JSON.stringify({roomId:'123',inviteToken:INVITE})),encodeURIComponent(JSON.stringify({roomId:ID,inviteToken:'short'}))])assert.throws(()=>Client.parseInvite(bad));
 const h=harness();await h.c.create({});assert.throws(()=>h.c.accept(snapshot({roomId:'b'.repeat(32)})),e=>e.code==='wrong_room');assert.equal(h.c.room.roomId,ID);h.c.disconnect();
});
test('fallback polling stays bounded and terminal expiry stops transport',async()=>{
 const h=harness({noSocket:true,fetch:(url,init)=>init.method==='GET'?response({code:'expired',message:'expired'},410):response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})});
 await h.c.create({});assert.equal(h.c.status,'polling');assert.equal(h.timers.size,1);await h.run(3000);assert.equal(h.c.status,'expired');assert.equal(h.timers.size,0);h.c.disconnect();
});
test('closed snapshots stop sockets and reject further commands',async()=>{
 const h=harness();await h.c.create({});h.Socket.all[0].open();h.Socket.all[0].message({type:'snapshot',room:snapshot({revision:1,closed:true})});
 assert.equal(h.c.status,'closed');assert.equal(h.Socket.all[0].readyState,3);assert.equal(h.timers.size,0);await assert.rejects(h.c.command('ready','t1'),e=>e.code==='closed');h.c.disconnect();
});

test('a pending room creation cannot restore credentials after leaving the page',async()=>{
 let finish;const h=harness({fetch:()=>new Promise(r=>{finish=r})});
 const pending=h.c.create({});h.c.disconnect();finish(response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()}));
 await assert.rejects(pending,e=>e.code==='cancelled');assert.equal(h.c.credentials,null);assert.equal(h.rooms.length,0);assert.equal(h.c.savedRoles(ID).length,0);assert.equal(h.Socket.all.length,0);
});

test('an obsolete reconnect failure cannot override a healthy newer connection',async()=>{
 let rejectOld;const h=harness({fetch:(url,init)=>init.method==='GET'?new Promise((resolve,reject)=>{rejectOld=reject}):response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})});
 await h.c.create({});h.Socket.all[0].open();h.Socket.all[0].close();
 const oldReconnect=h.run(1000);h.c.connect();h.Socket.all[1].open();assert.equal(h.c.status,'online');
 rejectOld(new Error('old failure'));await oldReconnect;assert.equal(h.c.status,'online');assert.equal(h.c.socket,h.Socket.all[1]);assert.equal(h.c.socket.readyState,1);assert.equal(h.errors.length,0);h.c.disconnect();
});
test('foreground refresh replaces an apparently open socket after background sleep',async()=>{
 const h=harness({fetch:(url,init)=>init.method==='GET'?response({room:snapshot({revision:2})}):response({roomId:ID,inviteToken:INVITE,token:TOKEN,me:0,room:snapshot()})});
 await h.c.create({});const old=h.Socket.all[0];old.open();await h.c.foreground();assert.equal(h.c.room.revision,2);assert.equal(old.readyState,3);assert.equal(h.Socket.all.length,2);h.Socket.all[1].open();assert.equal(h.c.status,'online');h.c.disconnect();
});
