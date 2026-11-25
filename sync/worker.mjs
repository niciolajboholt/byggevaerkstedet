import {DurableObject} from 'cloudflare:workers';
import Core from './room-core.cjs';
const {RoomError,validateCreate,newRoom,ensureLive,authenticate,snapshot,join,command}=Core;
const ROOM_ID=/^[a-f0-9]{32}$/;
const TOKEN=/^[A-Za-z0-9_-]{32,100}$/;
const MAX_BODY=12000;
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const token=()=>{const a=crypto.getRandomValues(new Uint8Array(24));return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const bearer=r=>{const h=r.headers.get('Authorization')||'';return /^Bearer [A-Za-z0-9_-]{32,100}$/.test(h)?h.slice(7):''};
function allowedOrigin(origin,env){return (env.ALLOWED_ORIGINS||'https://niciolajboholt.github.io').split(',').map(x=>x.trim()).includes(origin)}
async function body(request,max=MAX_BODY){
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw new RoomError(415,'content_type','Send JSON.');
 if(Number(request.headers.get('content-length'))>max)throw new RoomError(413,'too_large','Handlingen er for stor.');
 const reader=request.body?.getReader();if(!reader)throw new RoomError(400,'invalid_json','Handlingen mangler.');
 let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new RoomError(413,'too_large','Handlingen er for stor.')}chunks.push(value)}
 const merged=new Uint8Array(size);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength}
 try{return JSON.parse(new TextDecoder().decode(merged))}catch{throw new RoomError(400,'invalid_json','Ugyldig JSON.')}
}
function unwrap(out){if(out.ok)return out.value;const e=new RoomError(out.status||500,out.code||'server_error',out.message||'Byggerummet kunne ikke opdateres.');if(out.room)e.room=out.room;throw e}
function errorResponse(e,room=e.room){const known=e instanceof RoomError;return json({code:known?e.code:'server_error',message:known?e.message:'Byggerummet kunne ikke opdateres. Prøv igen.',...(room?{room}: {})},known?e.status:500)}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin'),isWs=request.headers.get('Upgrade')?.toLowerCase()==='websocket';
  // Cross-site HTTP is allowed only from the app. Requests without Origin remain
  // usable by authenticated API clients; browser WebSockets always require it.
  if((origin&&!allowedOrigin(origin,env))||(isWs&&!allowedOrigin(origin,env)))return errorResponse(new RoomError(403,'origin_denied','Denne side kan ikke åbne byggerummet.'));
  const cors=origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}:{};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  try{
   let response;
   if(url.pathname==='/health'&&request.method==='GET')response=json({ok:true,version:'1',planVersion:2});
   else if(url.pathname==='/rooms'&&request.method==='POST'){
    const payload=validateCreate(await body(request));
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const admission=env.ADMISSION.getByName(await hash(ip));
    if(!await admission.allow())throw new RoomError(429,'rate_limited','Der er oprettet mange byggerier. Vent lidt og prøv igen.');
    const roomId=crypto.randomUUID().replace(/-/g,''),hostToken=token(),inviteToken=token();
    const room=unwrap(await env.ROOMS.getByName(roomId).create(roomId,payload,{hostHash:await hash(hostToken),inviteHash:await hash(inviteToken)}));
    response=json({roomId,inviteToken,token:hostToken,me:0,room},201);
   }else{
    const match=url.pathname.match(/^\/rooms\/([a-f0-9]{32})(?:\/(join|commands|ws))?$/);
    if(!match||!ROOM_ID.test(match[1]))throw new RoomError(404,'not_found','Siden findes ikke.');
    const [,roomId,action]=match,stub=env.ROOMS.getByName(roomId);
    if(action==='ws'){
     if(!isWs||request.method!=='GET')throw new RoomError(426,'upgrade_required','Åbn en WebSocket-forbindelse.');
     return stub.fetch(request);
    }
    const raw=bearer(request);if(!TOKEN.test(raw))throw new RoomError(401,'unauthorized','Adgang til byggerummet mangler.');
    const digest=await hash(raw);
    if(!action&&request.method==='GET')response=json({room:unwrap(await stub.read(digest))});
    else if(action==='join'&&request.method==='POST'){
     const input=await body(request,1000),newToken=token();
     if(!input||typeof input!=='object'||Array.isArray(input))throw new RoomError(400,'invalid_builder','Vælg en gyldig bygger.');
     const room=unwrap(await stub.join(digest,input.builder,await hash(newToken)));
     response=json({token:newToken,me:input.builder,room});
    }else if(action==='commands'&&request.method==='POST')response=json(unwrap(await stub.command(digest,await body(request,2000))));
    else throw new RoomError(405,'method_not_allowed','Handlingen understøttes ikke.');
   }
   const headers=new Headers(response.headers);for(const [k,v] of Object.entries(cors))headers.set(k,v);
   return new Response(response.body,{status:response.status,headers});
  }catch(e){
   // RPC exceptions are serialized by the Workers runtime, so our DO public
   // methods return a typed result envelope and the Worker unwraps it below.
   const response=errorResponse(e),headers=new Headers(response.headers);for(const [k,v]of Object.entries(cors))headers.set(k,v);
   return new Response(response.body,{status:response.status,headers});
  }
 }
};

export class LiveRoom extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.sql=ctx.storage.sql;this.rates=new Map();
  this.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)');
  this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
 }
 load(){const rows=this.sql.exec('SELECT data FROM room WHERE id=1').toArray();return rows.length?JSON.parse(rows[0].data):null}
 write(room){this.sql.exec('INSERT INTO room(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(room))}
 connected(){return [...new Set(this.ctx.getWebSockets().filter(ws=>ws.readyState===1).map(ws=>ws.deserializeAttachment()?.index).filter(Number.isInteger))]}
 visible(room){return snapshot(room,this.connected())}
 run(fn){try{return {ok:true,value:fn()}}catch(e){return {ok:false,status:e.status||500,code:e.code||'server_error',message:e instanceof RoomError?e.message:'Byggerummet kunne ikke opdateres.'}}}
 async create(roomId,payload,credentials){
  const out=this.run(()=>this.ctx.storage.transactionSync(()=>{if(this.load())throw new RoomError(409,'exists','Byggerummet findes allerede.');const room=newRoom(roomId,payload,credentials);this.write(room);return this.visible(room)}));
  if(out.ok)await this.ctx.storage.setAlarm(out.value.expiresAt);return out;
 }
 read(digest){return this.run(()=>{const room=this.load();authenticate(room,digest,true);return this.visible(room)})}
 join(digest,builder,newHash){
  const out=this.run(()=>this.ctx.storage.transactionSync(()=>{const next=join(this.load(),digest,builder,newHash);this.write(next);return this.visible(next)}));
  if(out.ok)this.broadcast();return out;
 }
 command(digest,cmd){
  const now=Date.now(),rate=this.rates.get(digest)||{at:now,n:0};if(now-rate.at>60000){rate.at=now;rate.n=0}rate.n++;this.rates.set(digest,rate);
  if(rate.n>120)return {ok:false,status:429,code:'rate_limited',message:'Vent et øjeblik før næste handling.'};
  let authorized=false;
  const out=this.run(()=>this.ctx.storage.transactionSync(()=>{const room=this.load(),actor=authenticate(room,digest);authorized=true;const next=command(room,actor,cmd);if(!next.duplicate)this.write(next.room);return {room:this.visible(next.room)}}));
  if(out.ok)this.broadcast();else if(authorized){const room=this.load();if(room)out.room=this.visible(room)}return out;
 }
 broadcast(){
  const room=this.load();if(!room)return;
  const data=JSON.stringify({type:'snapshot',room:this.visible(room)});
  for(const ws of this.ctx.getWebSockets()){try{ws.send(data)}catch{}}
 }
 async fetch(request){
  try{
   if(!allowedOrigin(request.headers.get('Origin'),this.env))throw new RoomError(403,'origin_denied','Denne side kan ikke åbne byggerummet.');
   const protocols=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(s=>s.trim());
   if(protocols.length!==2||protocols[0]!=='bv-sync'||!TOKEN.test(protocols[1]))throw new RoomError(401,'unauthorized','WebSocket-adgang mangler.');
   const digest=await hash(protocols[1]),room=this.load(),actor=authenticate(room,digest);
   if(room.closed)throw new RoomError(410,'closed','Byggerummet er lukket.');
   if(this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment()?.index===actor.index).length>=3)throw new RoomError(429,'connections','For mange forbindelser til samme bygger.');
   const [client,server]=Object.values(new WebSocketPair());
   this.ctx.acceptWebSocket(server,[`builder-${actor.index}`]);
   server.serializeAttachment({index:actor.index,digest,window:Date.now(),messages:0});
   this.broadcast();
   return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'bv-sync'}});
  }catch(e){return errorResponse(e)}
 }
 webSocketMessage(ws,message){
  try{
   if(typeof message!=='string'||message.length>2000)throw new RoomError(413,'too_large','Handlingen er for stor.');
   const attachment=ws.deserializeAttachment(),now=Date.now();
   if(!attachment)throw new RoomError(401,'unauthorized','Forbindelsen mangler adgang.');
   if(now-attachment.window>60000){attachment.window=now;attachment.messages=0}
   if(++attachment.messages>120){ws.close(1008,'For mange beskeder');return}
   ws.serializeAttachment(attachment);
   let data;try{data=JSON.parse(message)}catch{throw new RoomError(400,'invalid_json','Ugyldig JSON.')}
   if(data.type!=='command')throw new RoomError(400,'invalid_command','Ugyldig handling.');
   const result=this.command(attachment.digest,data.command);
   if(!result.ok)ws.send(JSON.stringify({type:'error',code:result.code,message:result.message,...(result.room?{room:result.room}:{})}));
  }catch(e){try{ws.send(JSON.stringify({type:'error',code:e.code||'server_error',message:e instanceof RoomError?e.message:'Forbindelsen kunne ikke opdateres.'}))}catch{}}
 }
 webSocketClose(ws,code,reason){try{ws.close(code>=1000&&code<5000&&![1004,1005,1006,1015].includes(code)?code:1000,reason)}catch{}this.broadcast()}
 webSocketError(ws){try{ws.close(1011,'Forbindelsen blev afbrudt')}catch{}this.broadcast()}
 async alarm(){
  const room=this.load();if(room&&room.expiresAt>Date.now()){await this.ctx.storage.setAlarm(room.expiresAt);return}
  for(const ws of this.ctx.getWebSockets()){try{ws.send(JSON.stringify({type:'error',code:'expired',message:'Byggerummet er udløbet.'}));ws.close(1000,'Udløbet')}catch{}}
  this.sql.exec('DELETE FROM room');
 }
}
export class AdmissionGate extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;this.sql.exec('CREATE TABLE IF NOT EXISTS gate (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)')}
 async allow(){
  const now=Date.now(),day=Math.floor(now/86400000),minute=Math.floor(now/60000);
  const allowed=this.ctx.storage.transactionSync(()=>{const old=this.sql.exec('SELECT data FROM gate WHERE id=1').toArray(),s=old.length?JSON.parse(old[0].data):{};if(s.day!==day){s.day=day;s.daily=0}if(s.minute!==minute){s.minute=minute;s.count=0}if(s.daily>=30||s.count>=6)return false;s.daily++;s.count++;this.sql.exec('INSERT INTO gate(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',JSON.stringify(s));return true});
  await this.ctx.storage.setAlarm(now+86400000);return allowed;
 }
 alarm(){this.sql.exec('DELETE FROM gate')}
}
