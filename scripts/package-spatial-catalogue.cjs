// Install only a complete, validated set of fifty sculptures; preserve every flat motif.
const fs=require('node:fs'),path=require('node:path'),Core=require('../spatial-core.js');
const root=path.resolve(__dirname,'..'),source=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,'spatial50/generated/final.json'),'utf8'));
const numbers=new Set();
for(const m of source.models){
 const checked=Core.validateScene(m);
 if(!Number.isInteger(m.number)||m.number<1||m.number>50||numbers.has(m.number)||!m.complete||m.omitted.length||m.targetCount!==m.pieces.length||!checked.valid)throw Error('Unfinished sculpture '+m.number+': '+JSON.stringify(checked.errors));
 numbers.add(m.number);
}
if(numbers.size!==50)throw Error('All fifty sculptures are required');
const file=path.join(root,'data/motiver.json'),namesFile=path.join(root,'data/navne.json');
const data=JSON.parse(fs.readFileSync(file)),names=JSON.parse(fs.readFileSync(namesFile));
data.models=data.models.filter(m=>m.kind!=='spatial');
for(const scene of source.models.sort((a,b)=>a.number-b.number)){
 const {name,theme,number}=scene;names[scene.id]=name;
 data.models.push({id:scene.id,kind:'spatial',cat:'3D-figurer',collection:'spatial-50',spatialNumber:number,spatialTheme:theme,description:`${name} bygget som en rumlig figur af hele Plus-Plus-brikker.`,tip:'Drej modellen og se samlingen fra flere sider. Hold om den samlede del, mens du sætter den næste brik på.',preview:`assets/spatial/${scene.id}.svg`,scene});
}
if(!data.categories.includes('3D-figurer'))data.categories.push('3D-figurer');
require('../catalogue.js').validate(data,names);
const compact=[];const marker='__BV_COMPACT_SCENE_';if(JSON.stringify(data).includes(marker))throw Error('Reserved serialization marker');
const formatted=JSON.stringify(data,(key,value)=>key==='scene'?(compact.push(JSON.stringify(value)),marker+(compact.length-1)):value,2).replace(/"__BV_COMPACT_SCENE_(\d+)"/g,(_,i)=>compact[+i]);
if(JSON.stringify(JSON.parse(formatted))!==JSON.stringify(data))throw Error('Scene serialization changed data');
fs.writeFileSync(file,formatted+'\n');fs.writeFileSync(namesFile,JSON.stringify(names,null,2)+'\n');
console.log('Installed 50 checked spatial guides alongside',data.models.length-50,'unchanged flat motifs');
