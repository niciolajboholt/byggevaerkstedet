"""Validate saved sculptures or explicitly rebuild masks and record every design revision."""
from pathlib import Path
import argparse,importlib.util,json,sys,time
sys.path.insert(0,str(Path(__file__).parent))
from planner import generate,validate_scene
ROOT=Path(__file__).parents[1]
parser=argparse.ArgumentParser();parser.add_argument('first',type=int,nargs='?',default=1);parser.add_argument('last',type=int,nargs='?',default=50);parser.add_argument('--rebuild',action='store_true');args=parser.parse_args()
source={}
for file in sorted((ROOT/'masks').glob('*.py')):
 spec=importlib.util.spec_from_file_location(file.stem,file);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 for m in mod.models():source[m['number']]=m
(ROOT/'generated').mkdir(exist_ok=True)
# Exact accepted poses are durable catalogue data. Never silently re-plan a saved guide.
catalogue=json.loads((ROOT.parent/'data/motiver.json').read_text())
existing={m['scene']['number']:m['scene'] for m in catalogue['models'] if m.get('kind')=='spatial'}
out=[];failures=[]
for number,m in sorted(source.items()):
 if not args.first<=number<=args.last:continue
 start=time.time();cells=m['cells'].copy();adjustments=[];scene=None if args.rebuild else existing.get(number)
 if not (scene and scene.get('complete') and validate_scene(scene)['valid']):
  for phase in range(12):
   scene=generate(cells,name=m['name'],model_id=f'spatial50-{number:02}',attempts=35,seed=number+1000*phase,level_supports=number in (9,19,21,46))
   if scene['complete'] and validate_scene(scene)['valid']:break
   missing=[tuple(p) for p in scene['omitted']]
   # Preserve the four separate orange funnels and black caps of Titanic.
   if number==19 and any(cells[p]=='O' or p in [(0,y,5) for y in(-3,-1,1,3)] for p in missing):continue
   adjustments+=missing;cells={p:c for p,c in cells.items() if p not in missing}
  if not scene['complete'] or not validate_scene(scene)['valid']:
   failures.append(number);print('FAILED',number,flush=True);continue
  scene.update(number=number,theme=m['theme'],designAdjustedCells=[list(p) for p in adjustments],physicallyTested=False)
 assert len(scene['pieces'])<=250 and scene['complete'] and validate_scene(scene)['valid']
 out.append(scene);print('READY',number,m['name'],scene['count'],'adjusted',len(scene.get('designAdjustedCells',[])),'seconds',round(time.time()-start,2),flush=True)
if failures:raise SystemExit('Unfinished designs: '+str(failures))
expected=args.last-args.first+1
if len(out)!=expected:raise SystemExit('Incomplete numbered collection')
(ROOT/'generated/final.json').write_text(json.dumps({'version':1,'models':out},ensure_ascii=False))
print('TOTAL',len(out),flush=True)
