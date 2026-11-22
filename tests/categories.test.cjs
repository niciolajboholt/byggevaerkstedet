const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(new URL('../categories.js',`file://${__filename}`),'utf8');
function setup(){
 const d=new JSDOM('<section id="themeTiles"></section><h2 id="collectionTitle">Vælg et motiv</h2>',{runScripts:'outside-only'}),w=d.window,doc=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 w.eval(source);
 const featured=['Dyr','Magi','Køretøjer','Billogoer','Pokémon','Minecraft'];
 const builds=featured.concat('Halloween','Jul','Halloween').map((cat,i)=>({id:String(i),cat,p:['K']}));
 const selected=[],drawn=[];
 const explorer=w.CategoriesExplorer.create({getBuilds:()=>builds,getCategories:()=>['Alle','50 nye','Likede','Egne',...featured,'Halloween','Jul','Tom'],onSelect:cat=>selected.push(cat),draw:(c,p)=>drawn.push([c,p])});
 return {w,doc,explorer,builds,selected,drawn,close:()=>w.close()};
}
test('six compact themes are drawn from catalogue motifs and include counts',()=>{
 const a=setup();const buttons=a.doc.querySelectorAll('.featured-categories button');
 assert.equal(buttons.length,6);assert.deepEqual(Array.from(buttons,b=>b.dataset.themeCategory),['Dyr','Magi','Køretøjer','Billogoer','Pokémon','Minecraft']);assert.equal(a.drawn.length,6);
 assert.ok(Array.from(buttons).every(b=>b.textContent.includes('1 motiv')));
 buttons[3].click();assert.deepEqual(a.selected,['Billogoer']);assert.equal(a.doc.activeElement.id,'collectionTitle');a.close();
});
test('all themes dialog lists real categories, not special collections or empty categories',()=>{
 const a=setup();a.doc.querySelector('.all-themes-button').click();assert.equal(a.explorer.dialog.open,true);
 const buttons=a.doc.querySelectorAll('.all-themes-list button');assert.equal(buttons.length,8);
 assert.match(Array.from(buttons).find(b=>b.dataset.themeCategory==='Halloween').textContent,/2 motiver/);
 Array.from(buttons).find(b=>b.dataset.themeCategory==='Jul').click();assert.deepEqual(a.selected,['Jul']);assert.equal(a.explorer.dialog.open,false);assert.equal(a.doc.activeElement.id,'collectionTitle');a.close();
});
test('Escape closes the dialog and restores keyboard focus to its opener',()=>{
 const a=setup();const opener=a.doc.querySelector('.all-themes-button');opener.click();
 a.explorer.dialog.dispatchEvent(new a.w.Event('cancel',{cancelable:true}));assert.equal(a.explorer.dialog.open,false);assert.equal(a.doc.activeElement,opener);a.close();
});
test('refresh retains externally controlled visibility and rebuilds actual category counts',()=>{
 const a=setup();a.builds.push({id:'new',cat:'Billogoer',p:['Y']});a.explorer.refresh({visible:false,activeCategory:'Billogoer'});
 assert.ok(a.doc.getElementById('themeTiles').classList.contains('hide'));
 const logo=a.doc.querySelector('.featured-categories [data-theme-category="Billogoer"]');assert.match(logo.textContent,/2 motiver/);assert.equal(logo.getAttribute('aria-pressed'),'true');
 a.explorer.refresh({visible:true});assert.equal(a.doc.getElementById('themeTiles').classList.contains('hide'),false);a.close();
});
