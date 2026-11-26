/* Approved visual concepts stay separate from validated building patterns. */
(function(root){
 'use strict';
 let view,dialog,grid,search,filters,status,models=null,pending=null,theme='',opener=null,visible=false,navigate;
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node};
 function validate(data){
  if(data?.status!=='visual-concept'||data.buildValidated!==false||!Array.isArray(data.models)||data.models.length!==50)throw Error('Invalid prototype catalogue');
  const ids=new Set(),numbers=new Set();
  for(const m of data.models){
   if(typeof m.id!=='string'||ids.has(m.id)||!Number.isInteger(m.number)||m.number<1||m.number>50||numbers.has(m.number)||typeof m.name!=='string'||!m.name.trim()||typeof m.theme!=='string'||!/^assets\/3d-prototypes\/board-[1-5]\.svg$/.test(m.board)||!m.crop||![m.crop.x,m.crop.y,m.crop.w,m.crop.h].every(Number.isFinite)||m.crop.x<0||m.crop.y<0||m.crop.w<=0||m.crop.h<=0||m.crop.x+m.crop.w>1024||m.crop.y+m.crop.h>1536)throw Error('Invalid prototype');
   ids.add(m.id);numbers.add(m.number);
  }
  return data.models;
 }
 function picture(m,large=false){
  const box=el('div','prototype-picture'+(large?' large':''));
  box.setAttribute('role','img');box.setAttribute('aria-label',`Billedprototype ${m.number}: ${m.name}`);
  const image=el('img');image.src=m.board;image.alt='';image.loading='lazy';image.decoding='async';
  // Present the approved sheet through a CSS viewport; source pixels stay unchanged.
  image.style.width=(1024/m.crop.w*100)+'%';image.style.left=(-m.crop.x/m.crop.w*100)+'%';image.style.top=(-m.crop.y/m.crop.w*100)+'%';
  box.style.aspectRatio=m.crop.w+'/'+m.crop.h;box.append(image);return box;
 }
 function openModel(m,button){
  opener=button;dialog.replaceChildren();
  const head=el('div','dialog-heading');const heading=el('h2','',String(m.number).padStart(2,'0')+' · '+m.name);heading.id='prototypeDialogTitle';
  const close=el('button','btn ghost','Luk');close.type='button';close.onclick=()=>dialog.close();head.append(heading,close);
  dialog.append(head,picture(m,true),el('p','prototype-notice','Visuelt koncept. Brikgeometri, samlinger, stabilitet og højst 250 brikker er endnu ikke verificeret. Byggevejledningen er ikke klar.'));
  const sheet=el('a','btn ghost','Se hele planchen');sheet.href=m.board;sheet.target='_blank';sheet.rel='noopener';dialog.append(sheet);dialog.showModal();close.focus();
 }
 function render(){
  const query=search.value.trim().toLocaleLowerCase('da');
  const selected=models.filter(m=>(!theme||m.theme===theme)&&(!query||(m.name+' '+m.number+' '+m.theme).toLocaleLowerCase('da').includes(query)));
  status.textContent=selected.length+' af 50 prototyper';grid.replaceChildren();
  for(const m of selected){
   const button=el('button','prototype-card');button.type='button';button.dataset.prototypeId=m.id;
   button.append(picture(m),el('span','prototype-number',String(m.number).padStart(2,'0')),el('strong','',m.name),el('span','prototype-badge','Billedprototype'));
   button.onclick=()=>openModel(m,button);grid.append(button);
  }
  if(!selected.length)grid.append(el('p','meta','Ingen prototyper matcher. Prøv et andet navn eller tema.'));
 }
 async function open(){
  if(models){render();if(visible)document.getElementById('prototypeTitle').focus();return}
  if(pending)return pending;
  status.textContent='Henter 3D-prototyper…';
  pending=(async()=>{
   try{
    const response=await fetch('data/prototyper-3d.json',{cache:'no-cache'});if(!response.ok)throw Error('HTTP');models=validate(await response.json());
    filters.replaceChildren();for(const name of ['',...new Set(models.map(m=>m.theme))]){
     const b=el('button','btn ghost',name||'Alle 50');b.type='button';b.dataset.prototypeTheme=name;b.setAttribute('aria-pressed',String(name===theme));
     b.onclick=()=>{theme=name;filters.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()};filters.append(b);
    }
    render();if(visible)document.getElementById('prototypeTitle').focus();
   }catch{
    models=null;status.textContent='Prototyperne kunne ikke hentes. Dine byggerier er bevaret.';grid.replaceChildren();const retry=el('button','btn','Prøv igen');retry.type='button';retry.id='prototypeRetry';retry.onclick=open;grid.append(retry);
   }finally{pending=null}
  })();return pending;
 }
 function setVisible(show){
  visible=show;if(!view)return;view.classList.toggle('hide',!show);
  if(!show&&dialog.open)dialog.close();
 }
 function init(options){
  navigate=options.navigate;view=el('main','hide prototype-view');view.id='prototypeView';
  const back=el('button','btn ghost','Tilbage til motiver');back.type='button';back.id='prototypeBack';back.onclick=()=>navigate('');
  const heading=el('h1','','3D-prototyper');heading.id='prototypeTitle';heading.tabIndex=-1;view.setAttribute('aria-labelledby',heading.id);
  const notice=el('p','prototype-notice','50 visuelle forslag til rumlige modeller. Brikgeometri, samlinger, stabilitet og højst 250 brikker er endnu ikke verificeret. Her kan I se billederne; byggevejledningerne er ikke klar.');
  search=el('input');search.type='search';search.id='prototypeSearch';search.placeholder='Find en prototype';search.setAttribute('aria-label','Søg i 3D-prototyper');search.oninput=()=>{if(models)render()};
  filters=el('div','prototype-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Tema for 3D-prototyper');
  status=el('p','meta');status.id='prototypeCount';status.setAttribute('role','status');grid=el('div','prototype-grid');grid.id='prototypeGrid';
  view.append(back,heading,notice,search,filters,status,grid);document.getElementById('builderView').after(view);
  dialog=el('dialog','prototype-dialog');dialog.id='prototypeDialog';dialog.setAttribute('aria-labelledby','prototypeDialogTitle');dialog.addEventListener('close',()=>{if(visible&&opener?.isConnected)opener.focus()});document.body.append(dialog);
 }
 root.PrototypeGallery={init,open,setVisible,validate};
})(globalThis);
