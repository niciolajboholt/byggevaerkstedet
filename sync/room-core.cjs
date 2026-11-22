'use strict';
const BuildTasks = require('../build-tasks.js');
const TTL = 24 * 60 * 60 * 1000;
const COLORS = /^[rAROYGgBbPpWKNTS.]+$/;
class RoomError extends Error {
  constructor(status, code, message) { super(message); this.status=status; this.code=code; }
}
const fail=(status,code,message)=>{throw new RoomError(status,code,message)};
function validateCreate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400,'invalid_room','Ugyldigt byggeri.');
  const {model,builders}=input,smallest=input.smallest==null?null:input.smallest;
  if (!model || typeof model.id!=='string' || !model.id.length || model.id.length>120 || typeof model.name!=='string' || !model.name.trim() || model.name.length>100) fail(400,'invalid_model','Motivet er ugyldigt.');
  if (!Array.isArray(builders) || ![2,3].includes(builders.length) || !builders.every(n=>typeof n==='string'&&n.trim().length>0&&n.length<=40)) fail(400,'invalid_builders','Vælg to eller tre byggere med korte navne.');
  if (smallest!==null && (!Number.isInteger(smallest)||smallest<0||smallest>=builders.length)) fail(400,'invalid_assignment','Ugyldig opgavefordeling.');
  const p=model.p;
  if (!Array.isArray(p)||!p.length||p.length>24||!p.every(r=>typeof r==='string'&&r.length>0&&r.length<=24&&COLORS.test(r))) fail(400,'invalid_pattern','Motivet må højst være 24×24 felter.');
  const w=Math.max(...p.map(r=>r.length)),pattern=p.map(r=>r.padEnd(w,'.'));
  const count=pattern.join('').replace(/\./g,'').length;
  if (count<1||count>300) fail(400,'invalid_size','Motivet skal indeholde 1–300 brikker.');
  return {model:{id:model.id,name:model.name.trim(),p:pattern},builders:builders.map(n=>n.trim()),smallest};
}
function newRoom(roomId,input,credentials,now=Date.now()) {
  const clean=validateCreate(input),plan=BuildTasks.createPlan(clean.model.p,{builderCount:clean.builders.length,smallest:clean.smallest});
  return {v:1,roomId,...clean,planId:plan.id,revision:0,attached:0,ready:[],participants:clean.builders.map((_,index)=>({index,tokenHash:index===0?credentials.hostHash:null})),inviteHash:credentials.inviteHash,createdAt:now,expiresAt:now+TTL,closed:false,ledger:[]};
}
function ensureLive(room,now=Date.now()) {
  if(!room)fail(404,'not_found','Byggerummet findes ikke.');
  if(room.expiresAt<=now)fail(410,'expired','Byggerummet er udløbet. Opret et nyt byggeri.');
}
function authenticate(room,hash,allowInvite=false,now=Date.now()) {
  ensureLive(room,now);
  if(allowInvite&&hash===room.inviteHash)return {invite:true,index:null,host:false};
  const p=room.participants.find(p=>p.tokenHash&&p.tokenHash===hash);
  if(!p)fail(401,'unauthorized','Linket eller adgangen er ugyldig.');
  return {invite:false,index:p.index,host:p.index===0};
}
function snapshot(room,connected=[]) {
  return {v:1,roomId:room.roomId,model:room.model,builders:room.builders,smallest:room.smallest,planId:room.planId,revision:room.revision,attached:room.attached,ready:room.ready.slice(),participants:room.participants.map(p=>({index:p.index,claimed:!!p.tokenHash,connected:connected.includes(p.index)})),expiresAt:room.expiresAt,closed:room.closed};
}
function join(room,inviteHash,builder,tokenHash,now=Date.now()) {
  ensureLive(room,now);
  if(inviteHash!==room.inviteHash)fail(401,'unauthorized','Invitationen er ugyldig.');
  if(room.closed)fail(410,'closed','Byggerummet er lukket.');
  if(!Number.isInteger(builder)||builder<0||builder>=room.builders.length)fail(400,'invalid_builder','Vælg en gyldig bygger.');
  if(room.participants[builder].tokenHash)fail(409,'occupied','Denne bygger er allerede tilsluttet på en anden enhed.');
  const next=structuredClone(room);next.participants[builder].tokenHash=tokenHash;next.revision++;return next;
}
function command(room,actor,cmd,now=Date.now()) {
  ensureLive(room,now);
  if(!actor||actor.invite||!Number.isInteger(actor.index)||!room.participants[actor.index]?.tokenHash)fail(403,'forbidden','Du kan ikke ændre dette byggeri.');
  if(!cmd||typeof cmd!=='object'||Array.isArray(cmd)||typeof cmd.id!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(cmd.id)||!Number.isInteger(cmd.expectedRevision)||!['ready','attach','undo','close'].includes(cmd.action))fail(400,'invalid_command','Ugyldig handling.');
  const fingerprint=JSON.stringify([cmd.action,cmd.taskId??null]);
  const previous=room.ledger.find(x=>x.actor===actor.index&&x.id===cmd.id);
  if(previous){if(previous.fingerprint!==fingerprint)fail(409,'command_reused','Handlingen er allerede brugt.');return {room,duplicate:true};}
  if(room.closed)fail(410,'closed','Byggerummet er lukket.');
  if(cmd.expectedRevision!==room.revision)fail(409,'revision_conflict','Byggeriet er blevet opdateret. Prøv igen.');
  const plan=BuildTasks.createPlan(room.model.p,{builderCount:room.builders.length,smallest:room.smallest}),next=structuredClone(room);
  const global=plan.tasks[room.attached],own=plan.tasks.slice(room.attached).find(t=>t.owner===actor.index);
  if(cmd.action==='ready') {
    if(!own||cmd.taskId!==own.id)fail(409,'wrong_task','Byg din næste opgave først.');
    if(next.ready.includes(own.id))fail(409,'already_ready','Dit stykke er allerede klar.');
    next.ready.push(own.id);
  } else if(cmd.action==='attach') {
    if(!global||cmd.taskId!==global.id)fail(409,'wait_for_turn','Vent på, at de tidligere stykker er sat på.');
    if(global.owner!==actor.index)fail(403,'wrong_owner','Denne opgave tilhører en anden bygger.');
    if(!next.ready.includes(global.id))fail(409,'not_ready','Gør stykket klar først.');
    next.ready=next.ready.filter(id=>id!==global.id);next.attached++;
  } else if(cmd.action==='undo') {
    const last=plan.tasks[room.attached-1];
    if(!last)fail(409,'nothing_to_undo','Der er endnu ingen samling at fortryde.');
    if(cmd.taskId!=null&&cmd.taskId!==last.id)fail(409,'wrong_task','Den seneste samling er ændret. Opdatér status og prøv igen.');
    if(!actor.host&&last.owner!==actor.index)fail(403,'wrong_owner','Kun byggeren eller værten kan fortryde denne samling.');
    // Preserve future prepared pieces, even if the previous owner has another one ready.
    next.attached--;if(!next.ready.includes(last.id))next.ready.push(last.id);
  } else if(cmd.action==='close') {
    if(!actor.host)fail(403,'host_only','Kun værten kan afslutte byggerummet.');next.closed=true;
  }
  next.revision++;next.ledger.push({actor:actor.index,id:cmd.id,fingerprint});next.ledger=next.ledger.slice(-1024);
  return {room:next,duplicate:false};
}
module.exports={RoomError,TTL,validateCreate,newRoom,ensureLive,authenticate,snapshot,join,command};
