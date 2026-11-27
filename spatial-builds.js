/* Ready spatial assembly guides. Scene geometry stays independent of camera and progress. */
(function(root){
'use strict';
const planCache=new Map();
let options={},view=null,model=null,viewer=null,viewerLibrary=null,viewerLoading=false,viewerFailed=false,generation=0,modelRenderKey='',mode='solo',settings={builderCount:2,names:['Jens','Alfred','Far'],smallest:null},plan=null,session=null,started=false,live=null,notice='',busy=false,whole=false,showFuture=true,lastView='angle';
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),unit=n=>n===1?'brik':'brikker';
function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{notice='Fremskridtet kunne ikke gemmes på denne enhed. Hold siden åben.';return false}}
function sceneSignature(){return root.SpatialCore.sceneSignature(model.scene)}
function key(){return JSON.stringify([model.id,sceneSignature(),mode,mode==='solo'?null:[settings.builderCount,settings.names.slice(0,settings.builderCount),settings.smallest]])}
function saved(){const records=read('bv_spatial_progress',{});return records&&typeof records==='object'?records[key()]:null}
function save(){if(!model||live||!started||!session)return;const records=read('bv_spatial_progress',{});write('bv_spatial_progress',{...(records&&typeof records==='object'?records:{}),[key()]:session})}
function makePlan(){const k=JSON.stringify([mode,sceneSignature(),mode==='solo'?2:settings.builderCount,mode==='solo'?null:settings.smallest]);if(!planCache.has(k))planCache.set(k,root.SpatialCore.createPlan(model.scene,{builderCount:mode==='solo'?2:settings.builderCount,smallest:mode==='solo'?null:settings.smallest,maxTaskSize:8,grouped:true}));return planCache.get(k)}
function person(i){return settings.names[i]||`Bygger ${i+1}`}
function colorEntry(c){const p=options.palette?.[c];return {name:Array.isArray(p)?p[0]:c,color:Array.isArray(p)?p[1]:p||'#777'}}
function materialHTML(counts){return Object.entries(counts).map(([c,n])=>{const p=colorEntry(c);return `<span class="spatial-material"><i style="background:${/^#[0-9a-f]{3,8}$/i.test(p.color)?p.color:'#777'}" aria-hidden="true"></i>${n} × ${escape(p.name)}</span>`}).join('')}
function allCounts(){const counts={};model.scene.pieces.forEach(p=>counts[p.c]=(counts[p.c]||0)+1);return counts}
function visible(){return !!model&&!view?.classList.contains('hide')}
function mount(){
 if(view)return;
 view=document.createElement('main');view.id='spatialView';view.className='hide spatial-guide';
 view.innerHTML=`<button type="button" class="back" id="spatialBack">← Alle motiver</button><div class="spatial-guide-title"><div><p class="eyebrow" id="spatialLabel">Rumligt byggeri</p><h1 id="spatialName"></h1><p class="meta" id="spatialMeta"></p></div><button type="button" class="icon-button" id="spatialFavorite" aria-label="Gem som favorit">♡</button></div><div id="spatialLiveStatus" class="spatial-live-status hide" role="status"></div><div id="spatialLiveActions" class="row hide"><button type="button" class="btn ghost" id="spatialSwitchLive">Skift bygger</button><button type="button" class="text-button" id="spatialCloseLive">Afslut byggerummet</button></div><p id="spatialNotice" class="spatial-notice hide" role="alert"></p><div class="spatial-guide-layout"><section class="spatial-model-column"><div class="spatial-step-heading"><h2 id="spatialPerson"></h2><p id="spatialStep" aria-live="polite"></p><progress id="spatialProgress" max="100" value="0" aria-label="Samlet byggefremskridt"></progress></div><p id="spatialInstruction" class="spatial-instruction" role="status"></p><div class="spatial-stage" id="spatialStage" role="img" aria-label="Drejelig rumlig Plus-Plus-model"></div><div class="spatial-loading" id="spatialLoading" role="status">Henter 3D-visningen…</div><button type="button" class="btn ghost hide" id="spatialRetry">Prøv 3D igen</button><div class="spatial-camera" role="group" aria-label="Drej og zoom 3D-modellen"><button type="button" data-spatial-view="front">Forfra</button><button type="button" data-spatial-view="side">Fra siden</button><button type="button" data-spatial-view="top">Ovenfra</button><button type="button" data-spatial-view="angle">Skråt</button><button type="button" data-spatial-zoom="1.25" aria-label="Zoom ind">＋</button><button type="button" data-spatial-zoom="0.8" aria-label="Zoom ud">−</button></div><div class="spatial-inspection"><button type="button" class="text-button" id="spatialWhole">Se hele modellen</button><label><input type="checkbox" id="spatialFuture" checked> Vis kommende brikker svagt</label></div><p class="meta spatial-camera-help">Træk for at dreje. Knib med to fingre for at zoome.</p></section><section class="spatial-instructions-column"><div id="spatialSetup"><h2>Gør klar til at bygge</h2><p>Se modellen fra alle sider, og find brikkerne frem.</p><p class="meta">Digitalt kontrolleret · endnu ikke fysisk prøvebygget.</p><div class="mode" id="spatialMode"><button type="button" data-mode="solo">Byg alene</button><button type="button" data-mode="together">Byg sammen</button></div><div id="spatialTeam" class="hide"><h3>Hvem bygger med?</h3><div class="chips" id="spatialCount"></div><div class="spatial-names" id="spatialNames"></div><button type="button" class="text-button" id="spatialSwap">⇄ Byt plads</button><label for="spatialSmallest">Fordeling af opgaver</label><select id="spatialSmallest"></select><p class="meta" id="spatialSplitInfo"></p></div><p class="meta" id="spatialResume" role="status"></p><button type="button" class="btn spatial-start" id="spatialStart">Start byggeriet</button><button type="button" class="btn ghost hide" id="spatialRestart">Start forfra</button><button type="button" class="btn ghost hide" id="spatialCreateLive">Byg på flere enheder</button></div><div id="spatialCurrentMaterials" class="hide"><h3>Til denne opgave</h3><div id="spatialTaskCounts" class="spatial-materials"></div></div><details id="spatialMaterials" open><summary>Alle brikker til modellen</summary><div id="spatialAllCounts" class="spatial-materials"></div></details><div id="spatialInvite" class="hide"><h3>Invitér de andre</h3><label for="spatialInviteLink">Delingslink</label><input id="spatialInviteLink" readonly><button type="button" class="btn ghost" id="spatialCopyInvite">Kopiér link</button></div><div id="spatialPeople" class="spatial-people hide"></div></section></div><div id="spatialNavigation" class="spatial-navigation hide"><button type="button" class="btn ghost" id="spatialPrevious">Fortryd trin</button><button type="button" class="btn" id="spatialNext">Mit stykke er klar</button></div>`;
 const after=$('builderView');if(after)after.after(view);else document.body.append(view);
 $('spatialBack').onclick=()=>{const callback=live?.leave;leave();if(callback)callback();else options.navigate?.('')};
 $('spatialFavorite').onclick=()=>{if(model)options.toggleFavorite?.(model.id);favorite()};
 $('spatialMode').querySelectorAll('button').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;started=false;session=null;whole=false;notice='';refresh()});
 $('spatialSwap').onclick=()=>{commitNames();[settings.names[0],settings.names[1]]=[settings.names[1],settings.names[0]];if(settings.smallest===0||settings.smallest===1)settings.smallest=1-settings.smallest;persistSettings();refresh()};
 $('spatialSmallest').onchange=()=>{settings.smallest=$('spatialSmallest').value===''?null:+$('spatialSmallest').value;persistSettings();refresh()};
 $('spatialStart').onclick=()=>begin(false);$('spatialRestart').onclick=async()=>{const op=generation;if(await confirm('Start dette byggeri forfra? Det gemte fremskridt for denne opsætning slettes.'))if(op===generation&&model)begin(true)};
 $('spatialNext').onclick=next;$('spatialPrevious').onclick=previous;
 $('spatialWhole').onclick=()=>{whole=!whole;refresh()};$('spatialFuture').onchange=()=>{showFuture=$('spatialFuture').checked;refresh()};
 $('spatialRetry').onclick=()=>{viewerFailed=false;ensureViewer(true)};
 view.querySelectorAll('[data-spatial-view]').forEach(b=>b.onclick=()=>{lastView=b.dataset.spatialView;viewer?.setView(lastView)});
 view.querySelectorAll('[data-spatial-zoom]').forEach(b=>b.onclick=()=>viewer?.zoom(+b.dataset.spatialZoom));
 $('spatialCreateLive').onclick=createLive;$('spatialSwitchLive').onclick=()=>live?.switchBuilder?.();$('spatialCloseLive').onclick=()=>live?.closeRoom?.();
 $('spatialCopyInvite').onclick=async()=>{try{await navigator.clipboard.writeText($('spatialInviteLink').value);$('spatialCopyInvite').textContent='Link kopieret'}catch{$('spatialInviteLink').focus();$('spatialInviteLink').select()}};
}
function init(next={}){options={...options,...next};mount();return root.SpatialBuilds}
function favorite(){const liked=!!options.isFavorite?.(model?.id);$('spatialFavorite').textContent=liked?'♥':'♡';$('spatialFavorite').setAttribute('aria-pressed',String(liked));$('spatialFavorite').setAttribute('aria-label',liked?'Fjern favorit':'Gem som favorit')}
function persistSettings(){write('bv_spatial_settings',settings)}
function commitNames(){view.querySelectorAll('#spatialNames input').forEach(el=>settings.names[+el.dataset.index]=el.value.trim().slice(0,80));persistSettings()}
function show(){['listView','detailView','builderView'].forEach(id=>$(id)?.classList.add('hide'));view.classList.remove('hide');document.body.classList.remove('building','task-building','live-building');document.body.classList.toggle('spatial-building',started||!!live)}
function open(next){
 if(!view)init();leave();if(!next||next.kind!=='spatial'||!next.scene)throw new TypeError('A spatial model is required');
 model=next;mode='solo';started=false;live=null;whole=false;showFuture=true;notice='';lastView='angle';
 const previous=read('bv_spatial_settings',{});settings={builderCount:[2,3].includes(previous.builderCount)?previous.builderCount:2,names:Array.isArray(previous.names)?[0,1,2].map((i)=>String(previous.names[i]||['Jens','Alfred','Far'][i]).slice(0,80)):['Jens','Alfred','Far'],smallest:Number.isInteger(previous.smallest)&&previous.smallest>=0&&previous.smallest<(previous.builderCount||2)?previous.smallest:null};
 plan=makePlan();session=null;show();refresh();ensureViewer();
}
function leave(){
 ++generation;save();viewer?.dispose();viewer=null;viewerLoading=false;viewerFailed=false;modelRenderKey='';model=null;plan=null;session=null;live=null;started=false;busy=false;notice='';view?.classList.add('hide');document.body.classList.remove('spatial-building');if($('spatialStage'))$('spatialStage').replaceChildren();
}
async function ensureViewer(retry=false){
 if(!model||viewerLoading||viewer||viewerFailed&&!retry)return;
 const operation=generation;viewerLoading=true;viewerFailed=false;loading();
 try{
  viewerLibrary=await options.loadRenderer();if(operation!==generation||!model)return;
  const factory=viewerLibrary.createSpatialViewer||viewerLibrary.createViewer;if(typeof factory!=='function')throw Error('Renderer unavailable');
  viewer=factory($('spatialStage'),{palette:options.palette,onFallback:()=>{if(operation===generation){$('spatialLoading').textContent='3D-visning i kompatibel tilstand';$('spatialLoading').classList.remove('hide')}}});
  modelRenderKey='';
 }catch{if(operation===generation){viewerFailed=true;notice='3D-visningen kunne ikke indlæses. Prøv igen med internetforbindelse.'}}
 finally{if(operation===generation){viewerLoading=false;refresh()}}
}
function loading(){if(!$('spatialLoading'))return;$('spatialLoading').classList.toggle('hide',!viewerLoading);$('spatialLoading').textContent='Henter 3D-visningen…';$('spatialRetry').classList.toggle('hide',!viewerFailed);view.querySelectorAll('.spatial-camera button').forEach(b=>b.disabled=!viewer)}
function setup(){
 $('spatialSetup').classList.remove('hide');$('spatialNavigation').classList.add('hide');$('spatialCurrentMaterials').classList.add('hide');$('spatialPeople').classList.add('hide');
 $('spatialPerson').textContent='Se, hvad I skal bygge';$('spatialStep').textContent='Drej modellen og gør brikkerne klar';$('spatialProgress').value=0;$('spatialInstruction').textContent='Byg en rumlig model af hele Plus-Plus-brikker. Hvert trin viser et lille stykke og dets plads på modellen.';
 $('spatialTeam').classList.toggle('hide',mode!=='together');$('spatialMode').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});
 $('spatialCount').innerHTML=[2,3].map(n=>`<button type="button" data-count="${n}" class="${settings.builderCount===n?'on':''}" aria-pressed="${settings.builderCount===n}">${n} byggere</button>`).join('');
 $('spatialCount').querySelectorAll('button').forEach(b=>b.onclick=()=>{commitNames();settings.builderCount=+b.dataset.count;if(settings.smallest>=settings.builderCount)settings.smallest=null;persistSettings();refresh()});
 $('spatialNames').innerHTML=Array.from({length:settings.builderCount},(_,i)=>`<label for="spatialName${i}">Bygger ${i+1}<input id="spatialName${i}" data-index="${i}" value="${escape(person(i))}" maxlength="80"></label>`).join('');
 $('spatialNames').querySelectorAll('input').forEach(el=>el.onchange=()=>{commitNames();refresh()});
 $('spatialSmallest').innerHTML='<option value="">Opgaver på skift</option>'+Array.from({length:settings.builderCount},(_,i)=>`<option value="${i}">Mindre opgaver til ${escape(person(i))}</option>`).join('');$('spatialSmallest').value=settings.smallest==null?'':String(settings.smallest);
 $('spatialSplitInfo').textContent=plan.totals.map((n,i)=>`${person(i)}: ${n} ${unit(n)}`).join(' · ')+(plan.assignmentNote?' · '+plan.assignmentNote:'');
 const previous=root.SpatialCore.restoreSession(plan,saved());$('spatialStart').textContent=previous?'Fortsæt byggeriet':'Start byggeriet';$('spatialStart').disabled=!viewer||busy;$('spatialRestart').classList.toggle('hide',!previous);$('spatialRestart').disabled=!viewer||busy;
 $('spatialResume').textContent=previous?'Dit fremskridt er gemt på denne enhed.':saved()?'Vejledningen er opdateret til større dele. Dette byggeri starter fra begyndelsen med den nye opdeling.':'I bygger et lille stykke ad gangen og sætter det på den samlede model.';
 $('spatialCreateLive').classList.toggle('hide',mode!=='together'||!options.createLive);$('spatialCreateLive').disabled=!viewer||busy;
}
function begin(restart){
 if(!viewer||!model)return;commitNames();plan=makePlan();
 if(restart){const records=read('bv_spatial_progress',{});delete records[key()];write('bv_spatial_progress',records)}
 session=root.SpatialCore.restoreSession(plan,restart?null:saved())||root.SpatialCore.createSession(plan);started=true;whole=false;notice='';$('spatialMaterials').open=false;refresh();$('spatialPerson').focus({preventScroll:true});
}
function stateForLocal(){
 const task=root.SpatialCore.currentTask(plan,session),ready=session.stage==='ready',complete=session.stage==='done';
 return {task,ready,complete,attached:session.index,placeable:ready,person:mode==='solo'?'Dit byggeri':`${person(task?.owner||0)} bygger`,disabled:false,waiting:''};
}
function stateForLive(){
 const r=live.room,me=live.me,task=plan.tasks.slice(r.attached).find(t=>t.owner===me),ready=!!task&&r.ready.includes(task.id),complete=r.attached>=plan.tasks.length,placeable=ready&&task.index===r.attached;
 return {task,ready,complete,attached:r.attached,placeable,person:`${r.builders[me]||'Du'} bygger`,disabled:live.busy||!live.connected||r.closed||r.expiresAt<=Date.now(),waiting:ready&&!placeable?`Dit stykke er klar. Vent på ${r.builders[plan.tasks[r.attached].owner]}, som sætter sit stykke på.`:!task&&!complete?'Dine opgaver er færdige. De andre bygger deres sidste stykker.':''};
}
function build(state){
 const {task,ready,complete,attached,placeable}=state;
 $('spatialSetup').classList.add('hide');$('spatialNavigation').classList.remove('hide');$('spatialCurrentMaterials').classList.toggle('hide',!task||complete);
 const placed=plan.tasks.slice(0,attached).reduce((n,t)=>n+t.n,0);$('spatialProgress').value=Math.round(placed/plan.total*100);
 $('spatialPerson').textContent=complete?'Flot bygget!':state.person;$('spatialPerson').tabIndex=-1;
 const mine=live?plan.tasks.filter(t=>t.owner===live.me):plan.tasks,number=task?mine.findIndex(t=>t.id===task.id)+1:mine.length;
 $('spatialStep').textContent=complete?`Hele modellen er samlet · ${plan.total} brikker`:task?`Trin ${number} af ${mine.length} · ${task.n} ${unit(task.n)}`:'Dine opgaver er færdige';
 $('spatialInstruction').textContent=complete?'I har bygget hele modellen. Drej den og se den fra alle sider.':state.waiting?state.waiting:!task?'Dit arbejde er færdigt. Følg den samlede fremdrift her.':ready?(attached===0?'Læg det første stykke på bordet som vist.':'Sæt stykket på den fremhævede plads på modellen. Drej visningen, hvis du vil se samlingen fra siden.'):'Byg dette lille stykke af de fremhævede brikker. På næste trin ser du, hvor det skal sættes på modellen.';
 if(task?.insertionDirection&&ready&&!state.waiting&&attached>0){const dirs=['fra højre','fra bagsiden','ovenfra'],neg=['fra venstre','forfra','nedefra'];const axis=task.insertionDirection.findIndex(n=>n);$('spatialInstruction').textContent+=' Før stykket ind '+(task.insertionDirection[axis]<0?dirs[axis]:neg[axis])+', som modellen er vendt fra start.';}
 if(task)$('spatialTaskCounts').innerHTML=materialHTML(task.counts);
 $('spatialNext').textContent=complete?'Færdig':!task?'Dine opgaver er færdige':ready?(placeable?'Stykket er sat på':'Venter på de andre'):'Mit stykke er klar';
 $('spatialNext').disabled=!viewer||busy||state.disabled||complete||!task||ready&&!placeable;
 const last=plan.tasks[attached-1];$('spatialPrevious').disabled=!viewer||busy||state.disabled||(live?!last||(live.me!==0&&last.owner!==live.me):!attached&&!ready);
 $('spatialPrevious').textContent=live?'Fortryd samling':'Fortryd trin';
 const names=live?live.room.builders:settings.names,count=live?names.length:mode==='solo'?0:settings.builderCount;
 $('spatialPeople').classList.toggle('hide',!count);$('spatialPeople').innerHTML=Array.from({length:count},(_,i)=>{const n=plan.tasks.slice(0,attached).filter(t=>t.owner===i).reduce((sum,t)=>sum+t.n,0);return `<span class="spatial-builder ${task?.owner===i?'current':''}">${escape(names[i]||`Bygger ${i+1}`)}<small>${n} / ${plan.totals[i]} brikker</small></span>`}).join('');
}
function syncViewer(state){
 if(!viewer||!model)return;
 const task=state?.task,isolated=started&&task&&!state.ready&&!state.complete&&!whole,visiblePieces=isolated?task.pieces:model.scene.pieces;
 const renderKey=[model.id,sceneSignature(),isolated?task.id:'all'].join('|');
 if(modelRenderKey!==renderKey){viewer.update({name:model.name,pieces:visiblePieces,palette:options.palette});modelRenderKey=renderKey;viewer.setView(lastView)}
 const attachedIds=started?(isolated?[]:plan.tasks.slice(0,state.attached).flatMap(t=>t.pieceIds)):model.scene.pieces.map(p=>p.id),currentIds=started&&task?task.pieceIds.filter(id=>!attachedIds.includes(id)):[];
 viewer.setStep({attachedIds,currentIds,showFuture:!isolated&&showFuture});
 $('spatialWhole').textContent=whole?'Se kun dette stykke':'Se hele modellen';$('spatialWhole').disabled=!started||!task||state.ready||state.complete;
 $('spatialFuture').disabled=isolated;$('spatialFuture').checked=showFuture;
}
function refresh(){
 if(!model||!view)return;show();plan=live?live.plan:makePlan();favorite();loading();
 $('spatialName').textContent=model.name;$('spatialMeta').textContent=`${model.scene.pieces.length} brikker · ${model.cat||'Rumligt byggeri'}`;$('spatialLabel').textContent=live?'Byg sammen · live':mode==='solo'?'Dit rumlige byggeri':'Byg sammen · på skift';
 const message=notice||live?.notice||'';$('spatialNotice').classList.toggle('hide',!message);$('spatialNotice').textContent=message;
 $('spatialLiveActions').classList.toggle('hide',!live);$('spatialSwitchLive').disabled=!!live?.busy;$('spatialCloseLive').classList.toggle('hide',!live||live.me!==0);$('spatialCloseLive').disabled=!!live?.busy||!!live?.room.closed;$('spatialAllCounts').innerHTML=materialHTML(allCounts());
 $('spatialLiveStatus').classList.toggle('hide',!live);if(live)$('spatialLiveStatus').textContent=typeof live.statusText==='function'?live.statusText():live.statusText||'Fælles byggeri';
 const link=live?(typeof live.inviteLink==='function'?live.inviteLink():live.inviteLink):'';$('spatialInvite').classList.toggle('hide',!link);$('spatialInviteLink').value=link||'';
 let state=null;if(started||live){state=live?stateForLive():stateForLocal();build(state);save()}else setup();syncViewer(state);
}
function next(event){if(live){live.next?.(event);return}if(!started||!viewer||busy||session.stage==='done')return;session=session.stage==='building'?root.SpatialCore.markReady(plan,session):root.SpatialCore.attach(plan,session);whole=false;refresh();$('spatialPerson').focus({preventScroll:true})}
function previous(){if(live){live.previous?.();return}if(!started||!viewer||busy)return;session=root.SpatialCore.undo(plan,session);whole=false;refresh()}
async function createLive(){
 if(busy||!model||!options.createLive)return;commitNames();const operation=generation;busy=true;refresh();
 try{await options.createLive(model,{builderCount:settings.builderCount,names:settings.names.slice(0,settings.builderCount),smallest:settings.smallest})}catch(e){if(operation===generation){notice=e?.message||'Byggerummet kunne ikke oprettes.';refresh()}}finally{if(operation===generation){busy=false;refresh()}}
}
function renderLive(context){
 if(!view)init();const next=context?.room?.model;if(!next?.scene)throw new TypeError('A spatial live model is required');
 const changed=!model||model.id!==next.id||sceneSignature()!==root.SpatialCore.sceneSignature(next.scene);
 if(changed){leave();model={...next,kind:'spatial',cat:next.cat||'Rumlige modeller'};whole=false;notice='';lastView='angle';showFuture=true}
 live=context;plan=context.plan;started=true;show();refresh();if(!viewer)ensureViewer();
}
async function confirm(message){return options.confirm?options.confirm(message):root.confirm(message)}
root.SpatialBuilds={init,open,leave,refresh,renderLive,active:()=>visible()};
})(globalThis);
