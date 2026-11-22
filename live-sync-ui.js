/* Multi-device room interface. The local shared-iPad flow remains independent. */
(function(root){
'use strict';
let client=null,isActive=false,invite=null,room=null,plan=null,busy=false,loading=false,notice='',qrRenderer=null,loadingInvite=null,lastAction=-Infinity,lifecycle=0;
const $id=id=>document.getElementById(id),escText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unit=n=>n===1?'brik':'brikker';
function label(i){return room?.builders[i]||`Bygger ${i+1}`}
function ensureClient(){
 if(client)return client;
 client=new LiveRoomClient({base:root.BV_SYNC_API||undefined,onRoom:r=>{if(!isActive)return;adopt(r);notice='';render()},onStatus:()=>{if(isActive)render()},onError:e=>{notice=friendly(e);if(isActive)render()}});
 return client;
}
function friendly(error){
 const code=String(error?.code||'').toLowerCase();
 if(['connection','offline','network_error'].includes(code))return 'Forbindelsen er afbrudt. I kan gøre stykket klar på bordet. Vent med at bekræfte, til forbindelsen er tilbage.';
 if(['revision_conflict','stale_revision','conflict','stale','409'].includes(code))return 'En anden enhed nåede at opdatere byggeriet. Den nyeste fælles status er hentet. Prøv igen.';
 if(['slot_taken','already_claimed','builder_taken'].includes(code))return 'Denne bygger er allerede tilsluttet en anden enhed. Vælg en ledig bygger eller fortsæt med en gemt adgang.';
 if(['expired','410','room_expired','not_found','404'].includes(code))return 'Byggerummet er udløbet. Opret et nyt byggeri fra motivet.';
 if(['unauthorized','forbidden','401','403','invalid_token'].includes(code))return 'Adgangen til dette byggerum er ikke gyldig. Bed om et nyt delingslink.';
 if(['rate_limited','429','too_many_requests'].includes(code))return 'Der er lavet mange handlinger på kort tid. Vent lidt, og prøv igen.';
 if(code==='storage')return 'Adgangen kunne ikke gemmes på denne enhed. Hold siden åben, så I kan fortsætte.';
 return error?.message||'Byggerummet kunne ikke åbnes. Prøv igen.';
}
function panel(){return $id('liveRoomPanel')}
function showDetail(){
 $id('listView').classList.add('hide');$id('builderView').classList.add('hide');$id('detailView').classList.remove('hide');
 document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.classList.remove('on'));
}
function adopt(r){
 const candidate=BuildTasks.createPlan(r.model.p,{builderCount:r.builders.length,smallest:r.smallest});
 if(candidate.id!==r.planId)throw new LiveRoomClient.RoomError('plan_mismatch','Appens opgaveplan er ændret. Genindlæs appen på begge enheder, og prøv igen.');
 room=r;plan=candidate;
 cur=enrich({...r.model,cat:r.model.cat||'Byg sammen'});mode='together';
 $id('dName').textContent=cur.name;$id('dMeta').textContent=`${cur.total} brikker · ${r.builders.length} byggere · live`;
}
function statusText(){return ({online:'Live forbindelse',polling:'Forbundet · opdaterer automatisk',connecting:'Forbinder…',reconnecting:'Genopretter forbindelsen…',offline:'Ingen forbindelse',closed:'Byggerummet er afsluttet',expired:'Byggerummet er udløbet'})[client?.status]||'Forbinder…'}
function connected(){return ['online','polling'].includes(client?.status)}
function inviteLink(){try{return client.inviteURL(location.href,invite||client.credentials)}catch{return ''}}
function renderPanel(){
 const el=panel();if(!el)return;
 const shareOpen=el.querySelector('details')?.open||false,me=client?.credentials?.me,link=me!=null?inviteLink():'';
 if(loading){el.innerHTML='<p class="live-room-status" role="status">'+(loadingInvite?'Åbner byggerummet…':'Opretter byggerummet…')+'</p>';return}
 if(!room){el.innerHTML=`<p role="alert">${escText(notice||'Byggerummet kunne ikke åbnes.')}</p><button type="button" class="btn ghost" data-live-leave>Tilbage til motiver</button>`;el.querySelector('[data-live-leave]').onclick=()=>go('');return}
 const expired=room.expiresAt<=Date.now(),closed=room.closed||expired;
 const status=me==null?'Vælg, hvem der bygger på denne enhed':statusText();
 el.innerHTML=`<div class="live-panel-heading"><div><strong>Byg sammen · flere enheder</strong><p class="live-room-status" role="status"><span class="live-dot ${connected()?'online':''}" aria-hidden="true"></span>${escText(status)}</p></div>${me!=null?`<button class="text-button" type="button" data-live-switch ${busy?'disabled':''}>Skift bygger</button>`:''}</div>`+
 (notice?`<p class="live-room-notice" role="alert">${escText(notice)}</p>`:'')+
 (closed?`<p>${expired?'Byggerummet er udløbet.':'Dette fælles byggeri er afsluttet.'} I kan oprette et nyt fra et motiv.</p><button type="button" class="btn ghost" data-live-leave>Tilbage til motiver</button>`:
 me==null?joinMarkup():`<details class="live-share" ${shareOpen?'open':''}><summary>Invitér de andre byggere</summary><div class="live-share-body"><div class="live-qr" id="liveRoomQR" aria-label="QR-kode til byggerummet"></div><div><p>Åbn linket på den anden enhed, eller scan QR-koden. Vælg derefter en ledig bygger.</p><label for="liveInviteLink">Delingslink</label><input id="liveInviteLink" readonly value="${escText(link)}"><button type="button" class="btn ghost" data-live-copy>Kopiér link</button><p class="meta">Linket giver adgang til byggerummet og udløber efter 24 timer. Del det med dem, der bygger med.</p></div></div></details>`+
 (me===0?'<button type="button" class="text-button live-close" data-live-close>Afslut byggerummet</button>':''));
 el.querySelector('[data-live-leave]')?.addEventListener('click',()=>go(''));
 el.querySelector('[data-live-switch]')?.addEventListener('click',switchBuilder);
 el.querySelector('[data-live-copy]')?.addEventListener('click',async()=>{const input=$id('liveInviteLink');try{await navigator.clipboard.writeText(input.value);el.querySelector('[data-live-copy]').textContent='Link kopieret'}catch{input.focus();input.select();notice='Markér og kopiér linket fra feltet.';render()}});
 el.querySelector('[data-live-close]')?.addEventListener('click',closeRoom);
 el.querySelectorAll('[data-live-join]').forEach(b=>b.onclick=()=>claim(+b.dataset.liveJoin));
 el.querySelectorAll('[data-live-resume]').forEach(b=>b.onclick=()=>resumeRole(+b.dataset.liveResume));
 const qrHolder=$id('liveRoomQR');
 if(link&&qrHolder&&qrRenderer){try{qrRenderer(qrHolder,link)}catch{qrHolder.textContent='Brug delingslinket nedenfor.'}}
 else if(link&&qrHolder)qrHolder.textContent='Brug delingslinket nedenfor.';
 if(me==null&&!closed){const cv=el.querySelector('canvas');if(cv)drawGrid(cv,cur.p,{tiles:cur.tiles})}
}
function joinMarkup(){
 const saved=ensureClient().savedRoles(room.roomId),savedIndices=new Set(saved.map(c=>c.me));
 return `<div class="live-join-layout"><canvas width="180" height="180" aria-label="${escText(room.model.name)}"></canvas><div><h2>Hvem er du?</h2><p>Hver enhed viser én byggers opgaver. I kan bygge jeres næste stykke samtidig.</p><div class="live-join-builders">`+
 room.builders.map((n,i)=>{const claimed=room.participants?.find(p=>p.index===i)?.claimed;
 return savedIndices.has(i)?`<button type="button" class="btn" data-live-resume="${i}" ${busy?'disabled':''}>Fortsæt som ${escText(n)}</button>`:claimed?`<span class="live-slot-taken">${escText(n)} · allerede tilsluttet</span>`:`<button type="button" class="btn" data-live-join="${i}" ${busy?'disabled':''}>Jeg er ${escText(n)}</button>`}).join('')+
 '</div><p class="meta">En bygger kan kun tilsluttes én ny enhed. En tidligere tilsluttet enhed kan fortsætte med sin gemte adgang.</p></div></div>';
}
function hideNormalSetup(live){
 for(const id of ['modeBar','teamSetup','introBox','aloneStart','restartBuild','ownActionsPlaceholder','buildTip','dDescription','editOwn','delOwn','guideFavorite']){
  const el=$id(id);if(el)el.classList.toggle('hide',live||id==='ownActionsPlaceholder');
 }
}
function render(){
 if(!isActive)return;
 showDetail();const me=client?.credentials?.me,joined=me!=null&&room&&plan;
 started=!!joined;phase='build';showAll=false;
 document.body.classList.toggle('building',!!joined);document.body.classList.toggle('task-building',!!joined);document.body.classList.toggle('live-building',!!joined);
 panel()?.classList.remove('hide');hideNormalSetup(true);
 $id('detailBack').setAttribute('aria-label','Forlad byggerummet på denne enhed');$id('detailBack').querySelector('span').textContent='Alle motiver';
 const viewer=document.querySelector('#detailView .viewer');viewer.classList.toggle('hide',!joined);
 renderPanel();
 if(!joined)return;
 $id('buildHeading').classList.remove('hide');$id('taskInstruction').classList.remove('hide');$id('buildControls').classList.remove('hide');$id('partTabs').classList.remove('hide');
 $id('assembleBox').classList.add('hide');$id('partDone').classList.add('hide');$id('doneBox').classList.add('hide');
 $id('guideLabel').textContent='Byg sammen · live';$id('resumeInfo').textContent='Opgaver og fælles fremdrift gemmes i byggerummet. Adgangen til din bygger gemmes på denne enhed.';
 setCanvasWidth();$id('big').style.width=Math.min(parseFloat($id('big').style.width)||560,Math.max(160,window.innerHeight*.42))+'px';
 const task=plan.tasks.slice(room.attached).find(t=>t.owner===me),complete=room.attached>=plan.tasks.length,ready=!!task&&room.ready.includes(task.id),placeable=ready&&task.index===room.attached;
 const placed=plan.tasks.slice(0,room.attached),placedBricks=placed.reduce((n,t)=>n+t.n,0),pct=Math.round(placedBricks/plan.total*100);
 $id('prog').style.width=pct+'%';$id('progressBar').setAttribute('aria-valuenow',String(pct));
 $id('partTabs').innerHTML=room.builders.map((n,i)=>{const count=placed.filter(t=>t.owner===i).reduce((sum,t)=>sum+t.n,0),participant=room.participants?.find(p=>p.index===i),otherTask=plan.tasks.slice(room.attached).find(t=>t.owner===i),status=!participant?.claimed?'Ikke tilsluttet':otherTask&&room.ready.includes(otherTask.id)?'Stykke klar':participant.connected?'Bygger med':'Forbindelse afbrudt';return `<span class="task-builder ${i===me?'current':''}" style="--builder-color:${TEAM_COLORS[i]}">${escText(n)}${i===me?' · dig':''}<small>${count} / ${plan.totals[i]} brikker · ${escText(status)}</small></span>`}).join('');
 $id('partTabs').setAttribute('aria-label','Fælles fremdrift og byggernes status');
 const last=plan.tasks[room.attached-1],closed=room.closed||room.expiresAt<=Date.now();
 $id('prev').textContent='Fortryd samling';$id('prev').disabled=busy||client.pending||!connected()||closed||!last||(me!==0&&last.owner!==me);
 $id('next').disabled=busy||client.pending||!connected()||closed||complete||!task||(ready&&!placeable);
 $id('next').textContent=complete?'Færdig':!task?'Dine opgaver er færdige':ready?(placeable?'Stykket er sat på':`Venter på ${label(plan.tasks[room.attached].owner)}`):task.directPlacement?'Brikkerne er klar':'Mit stykke er klar';
 $id('all').classList.remove('hide');$id('all').textContent='Hele figuren';
 const view={attached:keys(placed),current:task&&ready?keys([task]):[],color:TEAM_COLORS[me]};
 drawGrid($id('overviewCanvas'),cur.p,{tiles:cur.tiles,taskView:view});
 $id('stepBox').classList.toggle('hide',!task||ready||complete||closed);
 if(complete){
  $id('buildPerson').textContent='Flot samarbejde!';$id('rowTitle').textContent=`Alle ${plan.tasks.length} opgaver er sat på`;$id('taskInstruction').textContent='I har bygget hele figuren sammen.';
  drawGrid($id('big'),cur.p,{tiles:cur.tiles});$id('big').setAttribute('aria-label','Den færdige fælles model');
  $id('doneBox').classList.remove('hide');$id('doneBox').textContent=`${cur.name} er færdig! Godt bygget, ${room.builders.join(' og ')}!`;renderParts(cur.counts,'Hele figuren');return;
 }
 $id('buildPerson').textContent=`${label(me)} bygger`;$id('buildPerson').style.color=TEAM_COLORS[me];
 if(!task||closed){
  drawGrid($id('big'),cur.p,{tiles:cur.tiles,taskView:view});$id('big').setAttribute('aria-label','Den samlede models aktuelle fremdrift');
  $id('rowTitle').textContent=!task?'Dine opgaver er færdige':'Byggerummet er afsluttet';
  $id('taskInstruction').textContent=closed?'Dette byggerum er afsluttet. Opret et nyt fra et motiv.':'Godt bygget! De andre gør deres sidste stykker færdige. Den fælles model opdateres her.';
  renderParts({},'Ingen flere brikker til dig');return;
 }
 const mine=plan.tasks.filter(t=>t.owner===me),num=mine.findIndex(t=>t.id===task.id)+1;
 $id('rowTitle').textContent=`Din opgave ${num} af ${mine.length} · række ${task.row+1} · ${task.n} ${unit(task.n)}`;
 if(ready){
  drawGrid($id('big'),cur.p,{tiles:cur.tiles,taskView:view});$id('big').setAttribute('aria-label',`Din plads i række ${task.row+1} er fremhævet. Grå brikker mangler endnu.`);
  const waiting=plan.tasks[room.attached];
  $id('taskInstruction').textContent=placeable?(task.directPlacement?'Læg brikkerne på de fremhævede pladser. De forbindes af denne eller senere rækker. Bekræft, når de ligger rigtigt.':'Sæt dit stykke på den fremhævede plads. Bekræft først, når stykket er sat på modellen.'):`Dit stykke er klar. Vent på, at ${label(waiting.owner)} har sat række ${waiting.row+1} på. Vi giver besked her, når det er din tur.`;
  renderParts(task.counts,placeable?'Dit stykke sættes på':'Dit stykke er klar');
 }else{
  const minX=Math.min(...task.tiles.map(t=>t.x)),maxX=Math.max(...task.tiles.map(t=>t.x)),row=Array(maxX-minX+1).fill('.');task.tiles.forEach(t=>row[t.x-minX]=t.c);
  drawGrid($id('big'),[row.join('')],{tiles:task.tiles.map(t=>({...t,x:t.x-minX,y:0,row:0})),compact:true});$id('big').setAttribute('aria-label',`Byg ${task.n} ${unit(task.n)} fra række ${task.row+1}. Bevar retningen og eventuelle mellemrum.`);
  drawTaskMaterials(task);
  $id('taskInstruction').textContent=task.directPlacement?'Find brikkerne og læg dem som vist med de tomme mellemrum. Senere rækker forbinder dem.':'Byg dit næste lille stykke. De andre kan samtidig bygge deres. Vi viser derefter, hvor dit stykke skal sidde.';
  $id('rowHint').textContent='Fra venstre mod højre · drej brikkerne som vist.';renderParts(task.counts,'Det skal du bruge til denne opgave');
 }
}
function keys(tasks){return tasks.flatMap(t=>t.tiles.map(k=>`${k.x},${k.y}`))}
function drawTaskMaterials(task){
 const cv=$id('rowPieces'),ctx=cv.getContext('2d'),css=cv.clientWidth||300,dpr=window.devicePixelRatio||1,cols=Math.min(8,task.n||1),rows=Math.ceil(task.n/cols)||1,h=Math.max(56,rows*45),u=Math.min(7,(css-8)/(cols*6));
 cv.width=css*dpr;cv.height=h*dpr;cv.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 task.tiles.forEach((k,i)=>drawBrick(ctx,4+(i%cols)*(css/cols)+u*2,Math.floor(i/cols)*45+12,u,{...k,x:0,y:0},false));
 cv.setAttribute('aria-label',`${task.n} ${unit(task.n)} til din opgave. Farver og antal står i listen.`);
 $id('runs').innerHTML=Object.entries(task.counts).map(([c,n])=>`<div class="run"><span class="sw" style="background:${COLORS[c][1]}"></span>${n} ${COLORS[c][0].toLowerCase()}</div>`).join('');
}
async function beginCreate(){
 if(busy||!cur)return;
 // Save a name still being edited before creating the shared immutable plan.
 document.querySelectorAll('#teamNames input').forEach(el=>team.names[+el.dataset.i]=el.value.trim());saveTeam();
 const maxBricks=cur.cat==='Klublogoer'?300:250;
 if(cur.total>maxBricks||cur.w>24||cur.p.length>24){$id('resumeInfo').textContent=`Live byggeri understøtter højst ${maxBricks} brikker på 24 × 24 felter.`;return}
 const operation=++lifecycle;busy=true;loading=true;loadingInvite=null;notice='';isActive=true;ensureClient();render();
 try{
  const data=await client.create({model:{id:cur.id,name:cur.name,p:cur.p},builders:Array.from({length:team.n},(_,i)=>team.names[i]||`Bygger ${i+1}`),smallest:team.split==='small'?smallestBuilder():null});
  if(operation!==lifecycle||!isActive)return;invite={roomId:data.roomId,inviteToken:data.inviteToken};location.hash='live='+encodeURIComponent(JSON.stringify(invite));
 }catch(e){if(operation!==lifecycle||!isActive)return;notice=friendly(e);isActive=false;started=false;client.disconnect();panel().classList.add('hide');document.querySelector('#detailView .viewer').classList.remove('hide');rootRender();$id('resumeInfo').textContent=notice}
 finally{if(operation===lifecycle){busy=false;loading=false;if(isActive)render()}}
}
function rootRender(){if(typeof renderApp==='function')renderApp();else if(typeof root.render==='function')root.render();else if(typeof render==='function'){/* Root calls its render when needed; avoid recursive local render. */}}
async function joinInvite(encoded){
 const c=ensureClient();let parsed;
 try{parsed=LiveRoomClient.parseInvite(encoded)}catch(e){c.disconnect();isActive=true;room=null;notice=friendly(e);loading=false;showDetail();render();return}
 if(isActive&&client.credentials?.roomId===parsed.roomId){invite={roomId:parsed.roomId,inviteToken:client.credentials.inviteToken||parsed.inviteToken};render();return}
 if(loadingInvite===encoded)return;
 const operation=++lifecycle;c.disconnect();isActive=true;room=null;plan=null;invite=parsed;loading=true;loadingInvite=encoded;notice='';showDetail();render();
 try{
  const role=c.activeRole(parsed.roomId)??c.savedRoles(parsed.roomId)[0]?.me;
  if(role!=null){try{if(await c.resume(parsed.roomId,role))return}catch(e){if(!['401','403','unauthorized','forbidden','invalid_token'].includes(String(e.code)))throw e}}
  const loaded=await c.loadInvite(parsed);if(operation===lifecycle&&isActive)adopt(loaded);
 }catch(e){if(operation===lifecycle&&isActive){notice=friendly(e);room=null}}
 finally{if(operation===lifecycle){loading=false;loadingInvite=null;if(isActive)render()}}
}
async function claim(index){
 if(busy)return;const operation=lifecycle;busy=true;notice='';render();
 try{await client.join(invite,index)}catch(e){if(operation!==lifecycle)return;notice=friendly(e);try{const loaded=await client.loadInvite(invite);if(operation===lifecycle)adopt(loaded)}catch{}}
 finally{if(operation===lifecycle){busy=false;render()}}
}
async function resumeRole(index){if(busy)return;const operation=lifecycle;busy=true;notice='';render();try{await client.resume(room.roomId,index)}catch(e){if(operation===lifecycle)notice=friendly(e)}finally{if(operation===lifecycle){busy=false;render()}}}
async function switchBuilder(){
 if(busy)return;
 const currentInvite=invite||{roomId:client.credentials.roomId,inviteToken:client.credentials.inviteToken};
 client.clearRole(currentInvite.roomId);client.disconnect();room=null;plan=null;isActive=false;await joinInvite(encodeURIComponent(JSON.stringify(currentInvite)));
}
async function next(event){
 if(!isActive||busy||!client?.credentials||!room)return;
 if(event?.isTrusted){const now=performance.now();if(now-lastAction<350)return;lastAction=now}
 const me=client.credentials.me,task=plan.tasks.slice(room.attached).find(t=>t.owner===me);if(!task)return;
 const ready=room.ready.includes(task.id);if(ready&&task.index!==room.attached)return;
 const operation=lifecycle;busy=true;notice='';render();try{await client.command(ready?'attach':'ready',task.id)}catch(e){if(operation===lifecycle)notice=friendly(e)}finally{if(operation===lifecycle){busy=false;render();$id('buildPerson').focus({preventScroll:true})}}
}
async function previous(){
 if(!room||busy||!room.attached)return;
 const operation=lifecycle,roomId=room.roomId,revision=room.revision,lastTaskId=plan.tasks[room.attached-1].id;
 if(!await confirmAction('Fortryd den seneste samling? Det sidste stykke skal lægges tilbage som klar på begge enheder.'))return;
 if(operation!==lifecycle||!isActive||room?.roomId!==roomId)return;
 if(room.revision!==revision){notice='Byggeriet blev opdateret på en anden enhed, mens du bekræftede. Se den nyeste samling, og prøv igen.';render();return}
 busy=true;notice='';render();try{await client.command('undo',lastTaskId)}catch(e){if(operation===lifecycle)notice=friendly(e)}finally{if(operation===lifecycle){busy=false;render()}}
}
async function closeRoom(){
 if(busy||!room)return;const operation=lifecycle,roomId=room.roomId;
 if(!await confirmAction('Afslut byggerummet for alle enheder? I kan stadig starte et nyt byggeri fra motivet.'))return;
 if(operation!==lifecycle||!isActive||room?.roomId!==roomId)return;
 busy=true;notice='';render();try{await client.command('close')}catch(e){if(operation===lifecycle)notice=friendly(e)}finally{if(operation===lifecycle){busy=false;render()}}
}
function openOverview(){
 if(!room||!plan)return;$id('overviewTitle').textContent=cur.name;$id('overviewDialog').showModal();
 const me=client?.credentials?.me,task=me!=null?plan.tasks.slice(room.attached).find(t=>t.owner===me):null;
 drawGrid($id('fullCanvas'),cur.p,{tiles:cur.tiles,taskView:{attached:keys(plan.tasks.slice(0,room.attached)),current:task&&room.ready.includes(task.id)?keys([task]):[],color:TEAM_COLORS[me||0]}});
 $id('overviewLegend').textContent=`${room.attached} af ${plan.tasks.length} opgaver er sat på. Grå brikker mangler endnu.`;
}
function clearActive(){
 if(!isActive)return;++lifecycle;isActive=false;loading=false;loadingInvite=null;busy=false;notice='';room=null;plan=null;invite=null;client?.disconnect();
 document.body.classList.remove('live-building','task-building','building');panel()?.classList.add('hide');document.querySelector('#detailView .viewer')?.classList.remove('hide');
 $id('modeBar')?.classList.remove('hide');$id('guideFavorite')?.classList.remove('hide');$id('buildPerson').style.color='';
}
function showRooms(){
 const c=ensureClient(),dialog=$id('liveRoomsDialog'),entries=Object.values(c.records()),groups=new Map();
 for(const saved of entries){
  if(!LiveRoomClient.validRoomId(saved?.roomId)||typeof saved.inviteToken!=='string'||!Number.isInteger(saved.me))continue;
  const old=groups.get(saved.roomId);if(!old||(saved.updatedAt||0)>(old.updatedAt||0))groups.set(saved.roomId,saved);
 }
 const rooms=[...groups.values()].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 $id('liveRoomsList').innerHTML=rooms.length?rooms.map((saved,i)=>{
  const expired=saved.expiresAt&&saved.expiresAt<=Date.now(),status=expired?'Udløbet':saved.closed?'Afsluttet':'Klar til at fortsætte';
  return `<article class="saved-room"><div><h3>${escText(saved.modelName||'Byggerum')}</h3><p>${escText((Array.isArray(saved.builders)?saved.builders:[]).join(' og '))}</p><p class="meta">${status}</p></div><div class="saved-room-actions"><button type="button" class="btn" data-room-open="${i}" ${expired||saved.closed?'disabled':''}>Fortsæt</button><button type="button" class="text-button" data-room-forget="${i}">Fjern fra listen</button></div></article>`;
 }).join(''):'<p>Du har ingen gemte byggerum endnu. Vælg et motiv, tryk Byg sammen og derefter Byg på flere enheder.</p>';
 dialog.querySelectorAll('[data-room-open]').forEach(button=>button.onclick=()=>{
  const saved=rooms[+button.dataset.roomOpen];dialog.close();go('live='+encodeURIComponent(JSON.stringify({roomId:saved.roomId,inviteToken:saved.inviteToken})));
 });
 dialog.querySelectorAll('[data-room-forget]').forEach(button=>button.onclick=()=>{
  const saved=rooms[+button.dataset.roomForget];for(const entry of entries)if(entry.roomId===saved.roomId)c.forget(entry.roomId,entry.me);
  showRooms();$id('liveRoomsHeading').focus();
 });
 if(!dialog.open)dialog.showModal();
}
function init(){
 if($id('liveRoomPanel'))return;
 const roomsButton=document.createElement('button');roomsButton.id='liveRoomsOpen';roomsButton.type='button';roomsButton.className='btn ghost live-rooms-open';roomsButton.textContent='Mine byggerum';roomsButton.onclick=showRooms;
 document.querySelector('.discovery-hero').after(roomsButton);
 const dialog=document.createElement('dialog');dialog.id='liveRoomsDialog';dialog.className='live-rooms-dialog';dialog.setAttribute('aria-labelledby','liveRoomsHeading');
 dialog.innerHTML='<div class="live-panel-heading"><h2 id="liveRoomsHeading" tabindex="-1">Mine byggerum</h2><button type="button" class="btn ghost" id="liveRoomsClose" autofocus>Luk</button></div><p class="meta">Rum, du har oprettet eller deltaget i på denne enhed. Rum udløber efter 24 timer. At fjerne et rum fra listen lukker det ikke for de andre.</p><div id="liveRoomsList"></div>';
 document.body.append(dialog);$id('liveRoomsClose').onclick=()=>dialog.close();
 const div=document.createElement('section');div.id='liveRoomPanel';div.className='live-room-panel hide';div.setAttribute('aria-label','Live byggerum');
 document.querySelector('#detailView .viewer').before(div);
 const btn=document.createElement('button');btn.id='liveRoomCreate';btn.type='button';btn.className='btn ghost live-create';btn.textContent='Byg på flere enheder';btn.onclick=beginCreate;
 $id('teamStart').after(btn);
 const hint=document.createElement('p');hint.className='meta live-create-hint';hint.textContent='Opret et fælles byggerum og invitér de andre med QR-kode eller link.';btn.after(hint);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isActive&&client?.credentials)client.foreground()});
 root.addEventListener('online',()=>{if(isActive&&client?.credentials)client.foreground()});
}
root.LiveSyncUI={init,active:()=>isActive,enabled:()=>isActive,render,beginCreate,joinInvite,next,previous,openOverview,clearActive,setQRRenderer:fn=>{qrRenderer=fn;if(isActive)render()}};
})(globalThis);
