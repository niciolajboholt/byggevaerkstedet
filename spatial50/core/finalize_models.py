"""Finalize complete, insertion-checked sculptures; explicitly record design simplifications."""
from pathlib import Path
import importlib.util,json,sys,time
sys.path.insert(0,str(Path(__file__).parent))
from planner import generate,validate_scene
ROOT=Path(__file__).parents[1]
source={}
for file in (ROOT/'masks').glob('*.py'):
 spec=importlib.util.spec_from_file_location(file.stem,file);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 for m in mod.models():source[m['number']]=m
existing={m['number']:m for m in json.loads((ROOT/'generated/models.partial.json').read_text())['models']}
out=[]
for number,m in sorted(source.items()):
 start=time.time();cells=m['cells'];adjustments=[];scene=existing.get(number)
 if scene and scene.get('complete') and validate_scene(scene)['valid']:pass
 else:
  for phase in range(4):
   scene=generate(cells,name=m['name'],model_id=f'spatial50-{number:02}',attempts=18 if phase==0 else 35,seed=number+1000*phase)
   if scene['complete'] and validate_scene(scene)['valid']:break
   if scene['omitted']:
    # This is an explicit design revision, not hidden omitted guide pieces.
    missing=[tuple(p) for p in scene['omitted']];adjustments+=missing
    cells={p:c for p,c in cells.items() if p not in missing}
  if not scene['complete'] or not validate_scene(scene)['valid']:
   print('FAILED',number,scene['count'],scene['targetCount'],validate_scene(scene),flush=True)
   (ROOT/'generated'/f'failed-{number}.json').write_text(json.dumps(scene));continue
 scene.update(number=number,theme=m['theme'],designAdjustedCells=[list(p) for p in adjustments],physicallyTested=False)
 assert len(scene['pieces'])<=250 and scene['complete'] and validate_scene(scene)['valid']
 out.append(scene);print('READY',number,m['name'],scene['count'],'adjusted',len(adjustments),'seconds',round(time.time()-start,2),flush=True)
 (ROOT/'generated'/'final.partial.json').write_text(json.dumps({'models':out},ensure_ascii=False))
(ROOT/'generated'/'final.json').write_text(json.dumps({'version':1,'models':out},ensure_ascii=False));print('TOTAL',len(out),flush=True)
