// Synthetic live-room acceptance; credentials stay in memory and curl stdin.
const fs=require('node:fs'),{spawnSync}=require('node:child_process'),{randomUUID}=require('node:crypto');
const base='https://byggevaerkstedet-sync.nicolajbach12.workers.dev';
function req(path,method='GET',data,token){
 const cfg=[`url = ${JSON.stringify(base+path)}`,`request = ${JSON.stringify(method)}`,'max-time = 30'];
 if(data!==undefined)cfg.push('header = "Content-Type: application/json"','data = '+JSON.stringify(JSON.stringify(data)));
 if(token)cfg.push('header = '+JSON.stringify('Authorization: Bearer '+token));
 const r=spawnSync('curl',['--silent','--show-error','--config','-','--write-out','\n%{http_code}'],{input:cfg.join('\n'),encoding:'utf8'});
 if(r.status!==0)throw Error('Request transport failed');
 const newline=r.stdout.lastIndexOf('\n'),status=+r.stdout.slice(newline+1);let body;try{body=JSON.parse(r.stdout.slice(0,newline))}catch{throw Error('Non-JSON response '+status)}
 return {status,body};
}
function check(condition,label){if(!condition)throw Error(label)}
const catalogue=JSON.parse(fs.readFileSync(new URL('../data/motiver.json',`file://${__filename}`))),models=catalogue.models.filter(m=>m.kind==='spatial');
for(const m of [models[0],models.reduce((a,b)=>a.scene.pieces.length>b.scene.pieces.length?a:b)]){
 const payload={model:{id:'synthetic-'+m.id,name:'Digital 3D acceptance',kind:'spatial',scene:m.scene},builders:['Test A','Test B'],smallest:null};
 const created=req('/rooms','POST',payload);check(created.status===201,'Create '+m.id+' failed: '+created.status+' '+created.body.code);
 const {roomId,token}=created.body;const path='/rooms/'+roomId;let room=created.body.room;
 try{
  check(room.planVersion===3&&room.model.kind==='spatial','Wrong plan version');
  check(JSON.stringify(room.model.scene)===JSON.stringify(m.scene),'Scene changed in transit');
  const task=room.planId+'-001';
  for(const action of ['ready','attach','undo']){const result=req(path+'/commands','POST',{id:randomUUID(),expectedRevision:room.revision,action,...(action!=='undo'?{taskId:task}:{})},token);check(result.status===200,action+' failed '+result.status+' '+result.body.code);room=result.body.room;}
  check(room.attached===0&&room.ready.includes(task),'Undo changed prepared task');
  check(req(path,'GET',undefined,token).body.room.revision===room.revision,'Room did not persist');
  console.log('PASS',m.id,m.scene.pieces.length,'bricks: exact scene, v3 plan, ready, attach, undo and persistence');
 }finally{const r=req(path+'/commands','POST',{id:randomUUID(),expectedRevision:room.revision,action:'close'},token);check(r.status===200,'Synthetic room cleanup failed')}
}
