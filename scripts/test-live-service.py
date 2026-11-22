import urllib.request,urllib.error,json,uuid,os,concurrent.futures
BASE='https://byggevaerkstedet-sync.nicolajbach12.workers.dev'
def req(path,method='GET',data=None,token=None,origin=None):
 import subprocess
 cfg=['url = '+json.dumps(BASE+path),'request = '+json.dumps(method),'max-time = 25']
 if data is not None:cfg+=['header = "Content-Type: application/json"','data = '+json.dumps(json.dumps(data))]
 if token:cfg+=['header = '+json.dumps('Authorization: Bearer '+token)]
 if origin:cfg+=['header = '+json.dumps('Origin: '+origin)]
 r=subprocess.run(['curl','--silent','--show-error','--config','-','--write-out','\n%{http_code}'],input='\n'.join(cfg),capture_output=True,text=True,check=True)
 raw,status=r.stdout.rsplit('\n',1)
 try:body=json.loads(raw)
 except ValueError:body={'raw':raw[:200]}
 return int(status),body
assert req('/health')[1]['ok']
payload={'model':{'id':'synthetic-live','name':'Synkroniseringstest','p':['RRRR','YYYY','BBBB','GGGG']},'builders':['Jens','Alfred'],'smallest':None}
s,created=req('/rooms','POST',payload);assert s==201,(s,created)
rid=created['roomId'];base='/rooms/'+rid;invite=created['inviteToken'];host=created['token']
assert created['room']['revision']==0 and 'token' not in json.dumps(created['room'])
assert req(base,token='x'*32)[0]==401
s,bad=req(base+'/commands','POST',{'id':str(uuid.uuid4()),'expectedRevision':0,'action':'close'},'x'*32);assert s==401 and 'room' not in bad,(s,bad)
assert req(base,token=invite)[0]==200
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(lambda _:req(base+'/join','POST',{'builder':1},invite),[0,1]))
assert sorted(s for s,b in results)==[200,409],[(s,b.get('code')) for s,b in results]
joined=next(b for s,b in results if s==200);other=joined['token'];room=joined['room']
# Reproduce deterministic task IDs from row order: first and second task.
first=room['planId']+'-001';second=room['planId']+'-002'
def command(tok,action,task=None,rev=None,ident=None):
 cmd={'id':ident or str(uuid.uuid4()),'expectedRevision':room['revision'] if rev is None else rev,'action':action}
 if task:cmd['taskId']=task
 return req(base+'/commands','POST',cmd,tok)
s,r=command(other,'ready',second);assert s==200,(s,r);room=r['room'];assert second in room['ready']
s,r=command(host,'ready',first,rev=1);assert s==409 and r['code']=='revision_conflict'
s,r=command(host,'ready',first);assert s==200,(s,r);room=r['room']
s,r=command(other,'attach',second);assert s==409 and r['code']=='wait_for_turn'
ident=str(uuid.uuid4());oldrev=room['revision'];s,r=command(host,'attach',first,ident=ident);assert s==200,(s,r);room=r['room'];assert room['attached']==1
s,r=command(host,'attach',first,rev=oldrev,ident=ident);assert s==200 and r['room']['attached']==1 and r['room']['revision']==room['revision']
s,r=command(other,'attach',second);assert s==200,(s,r);room=r['room'];assert room['attached']==2
s,r=command(host,'undo');assert s==200,(s,r);room=r['room'];assert room['attached']==1 and second in room['ready']
assert req(base,token=host)[1]['room']['attached']==1
assert req(base,token=host,origin='https://evil.invalid')[0]==403
s,r=command(host,'close');assert s==200,(s,r)
large={**payload,'model':{'id':'synthetic-300','name':'300 brikker – test','p':['R'*20]*15}}
s,accepted=req('/rooms','POST',large);assert s==201,(s,accepted)
assert len(accepted['room']['model']['p'])==15
close={'id':str(uuid.uuid4()),'expectedRevision':0,'action':'close'}
assert req('/rooms/'+accepted['roomId']+'/commands','POST',close,accepted['token'])[0]==200
large['model']['p']=large['model']['p']+['R'+'.'*19]
s,rejected=req('/rooms','POST',large);assert s==400 and rejected['code']=='invalid_size',(s,rejected)
print('300-brick deployed boundary: 300 accepted and 301 rejected; synthetic room closed.')
print('Live HTTP runtime: create, private auth, atomic join race, parallel ready, revision conflict, ordered attach, deduplication, undo, persistence, origin and close passed.')
