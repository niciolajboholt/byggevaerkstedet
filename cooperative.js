/* Shared-screen task UI. The pure BuildTasks plan is also the future device contract. */
(function(root){
'use strict';
let plan=null,session=null,key=null,lastActionAt=-Infinity;
const enabled=()=>mode==='together'&&!sharedPlan&&team.me==null;
const progressKey=()=>JSON.stringify(['cooperative-tasks-v2',cur.id,cur.p,team.n,team.names.slice(0,team.n),team.split,team.split==='small'?smallestBuilder():null]);
function getPlan(){
 const next=BuildTasks.createPlan(cur.p,{builderCount:team.n,smallest:team.split==='small'?smallestBuilder():null});
 if(!plan||plan.id!==next.id)plan=next;
 return plan;
}
function getSaved(){return progressRecords()[progressKey()]}
function save(){
 if(!started||!session)return;
 const records=progressRecords();records[progressKey()]={v:2,taskSession:session};progressSaved=store.set('bv_progress',records);
}
function begin(restart=false){
 if(shareWarning)return;
 getPlan();key=progressKey();
 if(restart){const records=progressRecords();delete records[key];store.set('bv_progress',records)}
 session=BuildTasks.restoreSession(plan,restart?null:getSaved()?.taskSession)||BuildTasks.createSession(plan);
 started=true;phase='build';showAll=false;render();window.scrollTo(0,0);$('buildPerson').focus({preventScroll:true});
}
function name(i){return team.names[i]||`Bygger ${i+1}`}
const unit=n=>n===1?'brik':'brikker';
function renderSetupTasks(){
 // Keep the existing name editor and the older multi-screen links compatible.
 const selected=team.smallest;renderSetup();
 if(Number.isInteger(selected)&&selected>=0&&selected<team.n&&team.smallest!==selected){team.smallest=selected;saveTeam()}
 getPlan();
 $('taskSplitLabel').textContent='Hvordan skal opgaverne fordeles?';
 $('teamSplit').innerHTML=`<button data-s="even" class="${team.split==='even'?'on':''}" aria-pressed="${team.split==='even'}">Opgaver på skift</button>`+
 Array.from({length:team.n},(_,i)=>`<button data-s="small" data-smallest="${i}" class="${team.split==='small'&&smallestBuilder()===i?'on':''}" aria-pressed="${team.split==='small'&&smallestBuilder()===i}">Mindre opgaver til ${esc(name(i))}</button>`).join('');
 $('teamSplit').querySelectorAll('button').forEach(b=>b.onclick=()=>{team.split=b.dataset.s;if(b.dataset.smallest!=null)team.smallest=+b.dataset.smallest;saveTeam();render()});
 $('splitInfo').textContent=plan.totals.map((n,i)=>`${name(i)}: ${n} brikker`).join(' · ')+(plan.assignmentNote?' · '+plan.assignmentNote:'');
 $('meInfo').textContent='På én fælles iPad skiftes I automatisk efter hver opgave. På flere skærme bygger I fortsat større dele; fremdrift synkroniseres ikke mellem skærmene endnu.';
 const all=$('teamMe').querySelector('[data-me=""]');if(all)all.textContent='Fælles iPad · på skift';
 drawGrid($('big'),cur.p,{tiles:cur.tiles});
 $('teamStart').textContent=getSaved()?'Fortsæt byggeriet':'Start byggeriet';
 $('teamStart').disabled=!!shareWarning;
 $('restartBuild').classList.toggle('hide',!getSaved());
 $('resumeInfo').textContent=shareWarning||(!progressSaved?'Fremskridtet kunne ikke gemmes. Hold siden åben.':getSaved()?'Jeres opgaver og fremskridt er gemt på denne iPad.':'I bygger et lille stykke ad gangen og sætter det på den fælles model.');
}
function displayBase(){
 document.body.classList.toggle('building',started);
 document.body.classList.toggle('task-building',started);
 $('detailBack').setAttribute('aria-label',started?'Tilbage til forberedelse':'Tilbage til alle motiver');
 document.querySelectorAll('#modeBar button').forEach(b=>{b.classList.toggle('on',b.dataset.mode==='together');b.setAttribute('aria-pressed',String(b.dataset.mode==='together'))});
 $('introBox').classList.toggle('hide',started);$('aloneStart').classList.add('hide');
 $('teamSetup').classList.toggle('hide',started);$('buildHeading').classList.toggle('hide',!started);
 $('buildControls').classList.toggle('hide',!started);$('partTabs').classList.toggle('hide',!started);
 $('assembleBox').classList.add('hide');$('partDone').classList.add('hide');$('doneBox').classList.add('hide');
 $('guideLabel').textContent=started?'Byg sammen · på skift':'Dit næste byggeri';
 $('taskInstruction').classList.toggle('hide',!started);
 $('buildTip').classList.toggle('hide',started||!cur.tip);
}
function taskPiece(task){
 const minX=Math.min(...task.tiles.map(t=>t.x)),maxX=Math.max(...task.tiles.map(t=>t.x));
 const row=Array(maxX-minX+1).fill('.');task.tiles.forEach(t=>row[t.x-minX]=t.c);
 const tiles=task.tiles.map(t=>({...t,x:t.x-minX,y:0,row:0}));
 drawGrid($('big'),[row.join('')],{tiles,compact:true});
 $('big').setAttribute('aria-label',`${name(task.owner)} bygger ${task.n} ${unit(task.n)} fra række ${task.row+1}. Brikkernes retning følger modellen.`);
}
function taskMaterials(task){
 const cv=$('rowPieces'),ctx=cv.getContext('2d'),css=cv.clientWidth||300,dpr=window.devicePixelRatio||1;
 const cols=Math.min(8,task.n||1),rows=Math.ceil(task.n/cols)||1,h=Math.max(56,rows*45),u=Math.min(7,(css-8)/(cols*6));
 cv.width=css*dpr;cv.height=h*dpr;cv.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 task.tiles.forEach((k,i)=>drawBrick(ctx,4+(i%cols)*(css/cols)+u*2,Math.floor(i/cols)*45+12,u,{...k,x:0,y:0},false));
 cv.setAttribute('aria-label',`${task.n} ${unit(task.n)} til opgaven. Farver og antal står i listen.`);
 $('runs').innerHTML=Object.entries(task.counts).map(([c,n])=>`<div class="run"><span class="sw" style="background:${COLORS[c][1]}"></span>${n} ${COLORS[c][0].toLowerCase()}</div>`).join('');
}
function keys(tasks){return tasks.flatMap(t=>t.tiles.map(k=>`${k.x},${k.y}`))}
function viewState(includeCurrent=true){
 const task=BuildTasks.currentTask(plan,session);
 return {attached:keys(plan.tasks.slice(0,session.index)),current:includeCurrent&&task?keys([task]):[],color:task?TEAM_COLORS[task.owner]:TEAM_COLORS[0]};
}
function overview(){
 $('overviewTitle').textContent=cur.name;$('overviewDialog').showModal();
 drawGrid($('fullCanvas'),cur.p,{tiles:cur.tiles,taskView:started&&session?viewState():null});
 $('overviewLegend').textContent=started&&session?`${session.index} af ${plan.tasks.length} opgaver er sat på. Grå brikker mangler endnu.`:'I bygger et stykke ad gangen og sætter det på den fælles model.';
}
function render(){
 getPlan();displayBase();
 if(!started){renderSetupTasks();return}
 if(key!==progressKey()||!session){key=progressKey();session=BuildTasks.restoreSession(plan,getSaved()?.taskSession)||BuildTasks.createSession(plan)}
 save();$('restartBuild').classList.add('hide');$('resumeInfo').textContent=progressSaved?'':'Fremskridtet kunne ikke gemmes. Hold siden åben, og frigør plads i browseren.';
 setCanvasWidth();
 $('big').style.width=Math.min(parseFloat($('big').style.width)||560,Math.max(160,window.innerHeight*.42))+'px';
 const complete=session.stage==='done',task=BuildTasks.currentTask(plan,session),ready=session.stage==='ready';
 const attached=plan.tasks.slice(0,session.index),counts=Array.from({length:team.n},(_,i)=>attached.filter(t=>t.owner===i).reduce((sum,t)=>sum+t.n,0));
 $('partTabs').innerHTML=counts.map((n,i)=>`<span class="task-builder ${task&&task.owner===i?'current':''}" style="--builder-color:${TEAM_COLORS[i]}">${esc(name(i))}<small>${n} / ${plan.totals[i]} brikker</small></span>`).join('');
 $('partTabs').setAttribute('aria-label','Byggernes fælles fremdrift');
 const placed=attached.reduce((sum,t)=>sum+t.n,0),percent=Math.round(placed/cur.total*100);
 $('prog').style.width=percent+'%';$('progressBar').setAttribute('aria-valuenow',String(percent));
 $('prev').disabled=session.index===0&&!ready;$('prev').textContent='Fortryd trin';
 $('next').disabled=complete;$('next').textContent=complete?'Færdig':ready?'Stykket er sat på':task.directPlacement?'Brikkerne er klar':'Mit stykke er klar';
 $('stepBox').classList.toggle('hide',complete||ready);
 $('all').classList.remove('hide');$('all').textContent='Hele figuren';
 drawGrid($('overviewCanvas'),cur.p,{tiles:cur.tiles,taskView:viewState()});
 if(complete){
  $('buildPerson').textContent='Flot samarbejde!';$('rowTitle').textContent=`Alle ${plan.tasks.length} opgaver er sat på`;
  $('taskInstruction').textContent='I har bygget hele figuren sammen.';
  drawGrid($('big'),cur.p,{tiles:cur.tiles});$('big').setAttribute('aria-label','Den færdige model');
  $('doneBox').classList.remove('hide');$('doneBox').textContent=`${cur.name} er færdig! Godt bygget, ${Array.from({length:team.n},(_,i)=>name(i)).join(' og ')}!`;
  renderParts(cur.counts,'Hele figuren');return;
 }
 $('buildPerson').textContent=`${gen(name(task.owner))} tur`;
 $('buildPerson').style.color=TEAM_COLORS[task.owner];
 $('rowTitle').textContent=`Opgave ${session.index+1} af ${plan.tasks.length} · række ${task.row+1} · ${task.n} ${unit(task.n)}`;
 if(ready){
  drawGrid($('big'),cur.p,{tiles:cur.tiles,taskView:viewState()});
  $('big').setAttribute('aria-label',`Sæt ${gen(name(task.owner))} stykke på den fremhævede plads i række ${task.row+1}. Grå brikker mangler endnu.`);
  const earlier=new Set(keys(attached)),joins=task.tiles.some(k=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>earlier.has(`${k.x+dx},${k.y+dy}`)));
  $('taskInstruction').textContent=task.directPlacement||!joins?'Læg brikkerne på de fremhævede pladser. De forbindes af denne eller de næste rækker. Grå brikker viser det, I mangler.':'Sæt stykket på den fremhævede plads. Grå brikker viser det, I mangler.';
  renderParts(task.counts,`${name(task.owner)} sætter på`);
 }else{
  taskPiece(task);taskMaterials(task);
  $('taskInstruction').textContent=task.directPlacement?'Find brikkerne, og læg dem som vist med de tomme mellemrum. På næste trin ser I deres pladser på modellen.':'Byg dette lille stykke. På næste trin viser vi, hvor det skal sættes på den fælles model.';
  $('rowHint').textContent=task.directPlacement?'Bevar de tomme pladser mellem brikkerne. Senere rækker forbinder dem.':'Fra venstre mod højre · drej brikkerne som vist.';
  renderParts(task.counts,`${name(task.owner)} skal bruge nu`);
 }
}
function next(event){
 if(event?.isTrusted){const now=performance.now();if(now-lastActionAt<350)return;lastActionAt=now}
 session=session.stage==='building'?BuildTasks.markReady(plan,session):BuildTasks.attach(plan,session);render();$('buildPerson').focus({preventScroll:true})}
function previous(){session=BuildTasks.undo(plan,session);render()}
root.CoopUI={enabled,render,begin,progressKey,next,previous,overview};
})(globalThis);
