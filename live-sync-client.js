/* Authenticated room transport. HTTP mutations are acknowledged; WebSockets broadcast snapshots. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(()=>require('./spatial-core.js'));else root.LiveRoomClient=factory(()=>root.SpatialCore);})(typeof globalThis!=='undefined'?globalThis:this,function(resolveSpatialCore){
'use strict';
const ROOM=/^[a-f0-9]{32}$/i;
const STORE='bv_live_rooms_v1';
class RoomError extends Error{constructor(code,message,room){super(message);this.name='RoomError';this.code=code;this.room=room}}
class LiveRoomClient{
 constructor(options={}){
  this.base=(options.base||'https://byggevaerkstedet-sync.nicolajbach12.workers.dev').replace(/\/$/,'');
  this.fetch=options.fetch||globalThis.fetch.bind(globalThis);this.WebSocket=options.WebSocket===undefined?globalThis.WebSocket:options.WebSocket;
  this.storage=options.storage===undefined?globalThis.localStorage:options.storage;this.tabStorage=options.sessionStorage===undefined?globalThis.sessionStorage:options.sessionStorage;
  this.onRoom=options.onRoom||(()=>{});this.onStatus=options.onStatus||(()=>{});this.onError=options.onError||(()=>{});
  this.delay=options.setTimeout||globalThis.setTimeout.bind(globalThis);this.cancel=options.clearTimeout||globalThis.clearTimeout.bind(globalThis);
  this.uuid=options.uuid||(()=>globalThis.crypto.randomUUID());this.room=null;this.credentials=null;this.socket=null;this.timer=null;this.pollTimer=null;this.pingTimer=null;this.attempt=0;this.generation=0;this.disposed=false;this.pending=false;this.status='offline';
 }
 static validRoomId(value){return typeof value==='string'&&ROOM.test(value)}
 static parseInvite(encoded){
  let invite;try{invite=JSON.parse(decodeURIComponent(encoded))}catch{throw new RoomError('bad_invite','Delingslinket er beskadiget. Bed om et nyt link.')}
  if(!invite||!ROOM.test(invite.roomId||'')||typeof invite.inviteToken!=='string'||!/^[A-Za-z0-9_-]{20,256}$/.test(invite.inviteToken))throw new RoomError('bad_invite','Delingslinket er beskadiget. Bed om et nyt link.');
  return {roomId:invite.roomId,inviteToken:invite.inviteToken};
 }
 inviteURL(baseURL,invite=this.credentials){
  if(!invite?.inviteToken||!ROOM.test(invite.roomId||''))throw new RoomError('missing_invite','Der mangler et delingslink.');
  return baseURL.split('#')[0]+'#live='+encodeURIComponent(JSON.stringify({roomId:invite.roomId,inviteToken:invite.inviteToken}));
 }
 records(){try{const x=JSON.parse(this.storage?.getItem(STORE)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}}
 activeRole(roomId){try{const n=JSON.parse(this.tabStorage?.getItem('bv_live_active_'+roomId)||'null');return Number.isInteger(n)?n:null}catch{return null}}
 savedRoles(roomId){return Object.values(this.records()).filter(c=>c.roomId===roomId&&Number.isInteger(c.me)&&(!c.expiresAt||c.expiresAt>Date.now())).sort((a,b)=>a.me-b.me)}
 saved(roomId,me=this.activeRole(roomId)){return me==null?null:this.records()[roomId+':'+me]||null}
 clearRole(roomId){try{this.tabStorage?.removeItem('bv_live_active_'+roomId)}catch{}}
 remember(c){
  try{const all=this.records();all[c.roomId+':'+c.me]={roomId:c.roomId,token:c.token,me:c.me,inviteToken:c.inviteToken,expiresAt:this.room?.expiresAt,modelName:this.room?.model?.name,builders:this.room?.builders,closed:!!this.room?.closed,updatedAt:Date.now()};
   this.tabStorage?.setItem('bv_live_active_'+c.roomId,JSON.stringify(c.me));
   const recent=Object.entries(all).slice(-50);this.storage?.setItem(STORE,JSON.stringify(Object.fromEntries(recent)));return true;
  }catch{this.onError(new RoomError('storage','Adgangen kunne ikke gemmes på denne enhed. Hold siden åben.'));return false}
 }
 forget(roomId,me=this.activeRole(roomId)){try{const all=this.records();delete all[roomId+':'+me];this.storage?.setItem(STORE,JSON.stringify(all));if(this.activeRole(roomId)===me)this.clearRole(roomId)}catch{}}
 setStatus(status){if(status!==this.status){this.status=status;this.onStatus(status)}}
 validateSnapshot(room){
  if(!room||room.v!==1||!ROOM.test(room.roomId||'')||!room.model||!Array.isArray(room.builders)||!Number.isInteger(room.revision)||room.revision<0||!Number.isInteger(room.attached)||room.attached<0||!Array.isArray(room.ready))throw new RoomError('bad_snapshot','Byggerummet svarede ikke som forventet. Prøv at åbne linket igen.');
  if(room.model.kind==='spatial'||room.model.scene!=null){
   const model=room.model,scene=model.scene;
   if(model.kind!=='spatial'||model.p!=null||room.planVersion!==3||typeof model.id!=='string'||!model.id.length||model.id.length>120||typeof model.name!=='string'||!model.name.trim()||model.name.length>100||![2,3].includes(room.builders.length)||!room.builders.every(n=>typeof n==='string'&&n.trim()&&n.length<=40)||!scene||typeof scene!=='object'||Array.isArray(scene)||!Array.isArray(scene.pieces)||scene.pieces.length<1||scene.pieces.length>250)throw new RoomError('bad_snapshot','Det rumlige byggeri har en ugyldig beskrivelse.');
   const ids=new Set();
   for(const piece of scene.pieces){
    if(!piece||typeof piece!=='object'||typeof piece.id!=='string'||!piece.id.length||piece.id.length>120||ids.has(piece.id)||typeof piece.c!=='string'||!/^[rAROYGgBbPpWKNTS]$/.test(piece.c)||!Array.isArray(piece.position)||piece.position.length!==3||!piece.position.every(n=>Number.isFinite(n)&&Math.abs(n)<=256)||!Array.isArray(piece.rotation)||piece.rotation.length!==3||!piece.rotation.every(n=>Number.isFinite(n)&&Math.abs(n)<=Math.PI*20&&Math.abs(n/(Math.PI/2)-Math.round(n/(Math.PI/2)))<1e-8))throw new RoomError('bad_snapshot','Det rumlige byggeri har ugyldige brikpositioner.');
    ids.add(piece.id);
   }
   if(room.attached>scene.pieces.length||room.ready.length>scene.pieces.length||!room.ready.every(id=>typeof id==='string'&&id.length>0&&id.length<=200))throw new RoomError('bad_snapshot','Det rumlige byggeri har ugyldig fremdrift.');
   let serialized;try{serialized=JSON.stringify(scene)}catch{throw new RoomError('bad_snapshot','Det rumlige byggeri kan ikke læses.')}
   if(new TextEncoder().encode(serialized).byteLength>120000)throw new RoomError('bad_snapshot','Det rumlige byggeri er for stort.');
   try{const core=resolveSpatialCore();if(!core||!core.validateScene(scene,{maxPieces:250,require3D:true}).valid)throw new Error('invalid scene')}catch{throw new RoomError('bad_snapshot','Brikkerne i det rumlige byggeri har ugyldige samlinger.')}
  }
  return room;
 }
 accept(room){
  this.validateSnapshot(room);
  if(this.credentials&&room.roomId!==this.credentials.roomId)throw new RoomError('wrong_room','Byggerummet passer ikke til denne enhed.');
  if(this.room&&room.roomId===this.room.roomId&&room.revision<this.room.revision)return this.room;
  this.room=room;if(this.credentials)this.remember(this.credentials);this.onRoom(room);
  if(room.closed){this.setStatus('closed');this.stopTransport()}
  else if(room.expiresAt<=Date.now()){this.setStatus('expired');this.stopTransport()}
  return room;
 }
 async request(path,{method='GET',token,body}={}){
  let response;try{response=await this.fetch(this.base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'})}catch{throw new RoomError('connection','Forbindelsen er afbrudt. Vi prøver at forbinde igen.')}
  let data;try{data=await response.json()}catch{throw new RoomError('bad_response','Byggerummet svarede ikke som forventet.')}
  if(!response.ok)throw new RoomError(data.code||String(response.status),data.message||'Handlingen kunne ikke gennemføres.',data.room);
  return data;
 }
 async create(input){
  this.disconnect();this.disposed=false;const generation=this.generation;const data=await this.request('/rooms',{method:'POST',body:input});
  if(this.disposed||generation!==this.generation)throw new RoomError('cancelled','Handlingen er afbrudt.');
  this.credentials={roomId:data.roomId,token:data.token,me:data.me,inviteToken:data.inviteToken};this.accept(data.room);this.remember(this.credentials);this.connect();return data;
 }
 async loadInvite(invite){
  if(!ROOM.test(invite?.roomId||''))throw new RoomError('bad_invite','Delingslinket er beskadiget.');
  const data=await this.request('/rooms/'+invite.roomId,{token:invite.inviteToken});const room=this.validateSnapshot(data.room||data);if(room.roomId!==invite.roomId)throw new RoomError('wrong_room','Invitationen passer ikke til byggerummet.');return room;
 }
 async join(invite,builder){
  this.disconnect();this.disposed=false;const generation=this.generation;
  const data=await this.request('/rooms/'+invite.roomId+'/join',{method:'POST',token:invite.inviteToken,body:{builder}});
  if(this.disposed||generation!==this.generation)throw new RoomError('cancelled','Handlingen er afbrudt.');
  this.credentials={roomId:invite.roomId,token:data.token,me:data.me,inviteToken:invite.inviteToken};this.accept(data.room);this.remember(this.credentials);this.connect();return data;
 }
 async resume(roomId,me=this.activeRole(roomId)){
  const saved=this.saved(roomId,me);if(!saved||typeof saved.token!=='string'||!Number.isInteger(saved.me))return false;
  this.disconnect();this.disposed=false;this.credentials=saved;
  try{await this.refresh();this.connect();return true}catch(e){if(['401','403','unauthorized','forbidden','expired','410','not_found','404'].includes(e.code))this.forget(roomId,me);if(this.credentials===saved)this.credentials=null;throw e}
 }
 async refresh(){
  if(!this.credentials)throw new RoomError('not_joined','Tilslut en bygger først.');
  const {roomId,token}=this.credentials,generation=this.generation,data=await this.request('/rooms/'+roomId,{token});
  if(this.disposed||generation!==this.generation||this.credentials?.token!==token)throw new RoomError('cancelled','Handlingen er afbrudt.');
  return this.accept(data.room||data);
 }
 connect(){
  if(this.disposed||!this.credentials||this.room?.closed||this.room?.expiresAt<=Date.now())return;
  this.stopTransport();const generation=++this.generation;this.setStatus(this.attempt?'reconnecting':'connecting');
  if(!this.WebSocket){this.setStatus('polling');this.schedulePoll(generation);return}
  let socket;
  try{socket=new this.WebSocket(this.base.replace(/^http/,'ws')+'/rooms/'+this.credentials.roomId+'/ws',['bv-sync',this.credentials.token])}catch{this.reconnectLater(generation);return}
  this.socket=socket;
  socket.onopen=()=>{if(generation!==this.generation||this.disposed)return;this.attempt=0;this.setStatus('online');this.ping(generation);};
  socket.onmessage=event=>{if(generation!==this.generation||this.disposed||event.data==='pong')return;try{const data=JSON.parse(event.data);if(data.type==='snapshot')this.accept(data.room);else if(data.type==='error'){if(data.room)this.accept(data.room);this.onError(new RoomError(data.code,data.message||'Handlingen kunne ikke gennemføres.'))}}catch(e){this.onError(e instanceof RoomError?e:new RoomError('bad_message','En opdatering kunne ikke læses. Vi henter den fælles status igen.'));this.refresh().catch(()=>{})}};
  socket.onclose=()=>{if(generation!==this.generation||this.disposed||this.room?.closed)return;this.socket=null;this.reconnectLater(generation)};
  socket.onerror=()=>{if(generation!==this.generation||this.disposed)return;this.setStatus('reconnecting')};
 }
 ping(generation){
  this.pingTimer=this.delay(()=>{if(generation!==this.generation||this.disposed)return;try{if(this.socket?.readyState===1)this.socket.send('ping')}catch{}this.ping(generation)},30000);
 }
 schedulePoll(generation){
  if(this.pollTimer)return;
  this.pollTimer=this.delay(async()=>{
   if(generation!==this.generation||this.disposed)return;this.pollTimer=null;
   try{
    await this.refresh();if(generation!==this.generation||this.disposed)return;
    if(!this.room?.closed)this.setStatus('polling');
   }catch(e){
    if(generation!==this.generation||this.disposed)return;
    this.setStatus(e.code==='expired'||e.code==='410'?'expired':'offline');this.onError(e);
    if(['expired','410','closed','unauthorized','401','403','404','not_found'].includes(String(e.code)))this.stopTransport();
   }
   if(generation===this.generation&&!this.disposed&&!this.room?.closed)this.schedulePoll(generation);
  },3000);
 }
 reconnectLater(generation){
  if(generation!==this.generation||this.disposed||this.timer||this.room?.closed)return;
  this.setStatus('reconnecting');if(this.pingTimer)this.cancel(this.pingTimer);this.pingTimer=null;
  this.schedulePoll(generation);const wait=Math.min(15000,1000*2**Math.min(this.attempt++,4));
  this.timer=this.delay(async()=>{
   if(generation!==this.generation||this.disposed)return;this.timer=null;
   try{
    await this.refresh();if(generation!==this.generation||this.disposed)return;this.connect();
   }catch(e){
    if(generation!==this.generation||this.disposed)return;
    this.setStatus(['expired','410','closed'].includes(e.code)?'expired':'offline');this.onError(e);
    if(!['expired','410','closed','unauthorized','401','403','404','not_found'].includes(String(e.code)))this.reconnectLater(generation);else this.stopTransport();
   }
  },wait);
 }
 async foreground(){
  if(!this.credentials||this.disposed)return;
  const generation=this.generation;
  try{
   await this.refresh();if(generation!==this.generation||this.disposed)return;
   // Mobile Safari can retain OPEN on a dead backgrounded socket. Replace it.
   this.connect();
  }catch(e){
   if(generation!==this.generation||this.disposed)return;
   this.setStatus('offline');this.onError(e);this.reconnectLater(generation);
  }
 }
 async command(action,taskId){
  if(this.pending)throw new RoomError('busy','Vent på den igangværende opdatering.');
  if(!this.credentials||!this.room)throw new RoomError('not_joined','Tilslut en bygger først.');
  if(this.room.closed)throw new RoomError('closed','Byggerummet er afsluttet.');
  this.pending=true;
  const credentials=this.credentials,command={id:this.uuid(),expectedRevision:this.room.revision,action,...(taskId?{taskId}:{})};
  try{const data=await this.request('/rooms/'+credentials.roomId+'/commands',{method:'POST',token:credentials.token,body:command});if(this.disposed||this.credentials?.token!==credentials.token)throw new RoomError('cancelled','Handlingen er afbrudt.');this.accept(data.room);return this.room}
  catch(e){if(e.room&&!this.disposed&&this.credentials?.token===credentials.token)this.accept(e.room);if(e.code==='connection'&&!this.disposed){this.setStatus('offline');this.foreground().catch(()=>{})}throw e}
  finally{if(this.credentials?.token===credentials.token||!this.credentials)this.pending=false}
 }
 stopTransport(){
  ++this.generation;
  for(const name of ['timer','pollTimer','pingTimer']){if(this[name])this.cancel(this[name]);this[name]=null}
  if(this.socket){this.socket.onclose=null;this.socket.onmessage=null;this.socket.onerror=null;this.socket.onopen=null;try{this.socket.close(1000,'leave')}catch{}this.socket=null}
 }
 disconnect(){this.disposed=true;this.stopTransport();this.pending=false;this.setStatus('offline');this.room=null;this.credentials=null;this.attempt=0}
}
LiveRoomClient.RoomError=RoomError;
return LiveRoomClient;
});
