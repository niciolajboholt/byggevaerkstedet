"""Render catalogue thumbnails from exact whole-brick poses, without image concepts."""
from pathlib import Path
import json,math,sys,html
ROOT=Path(__file__).parents[1]
sys.path.insert(0,str(ROOT/'spatial50/core'))
from planner import H,rotation_matrix,mv
COLORS=dict(zip('rAROYGgBbPpWKNTS',['#941b2b','#c59616','#d8383a','#ff8a1f','#f3d24a','#3f9a4e','#1f7a3a','#2e5f99','#7cc8f5','#8e5bd8','#ff8fc0','#ffffff','#2a2a2e','#8a5a33','#f0cca6','#9aa1ab']))
squares={(x,y) for x,y,z in H};edges={}
for x,y in squares:
 for adjacent,a,b in [((x,y-1),(x,y),(x+1,y)),((x+1,y),(x+1,y),(x+1,y+1)),((x,y+1),(x+1,y+1),(x,y+1)),((x-1,y),(x,y+1),(x,y))]:
  if adjacent not in squares:edges[a]=b
first=min(edges);points=[];p=first
while not points or p!=first:points.append(p);p=edges[p]
outline=[]
for i,p in enumerate(points):
 a,b=points[i-1],points[(i+1)%len(points)]
 if (p[0]-a[0])*(b[1]-p[1])!=(p[1]-a[1])*(b[0]-p[0]):outline.append((p[0]-.5,p[1]-.5))
D=(1,-1,.8);norm=math.sqrt(sum(v*v for v in D));D=tuple(v/norm for v in D)
RIGHT=(1/math.sqrt(2),1/math.sqrt(2),0);UP=(-D[2]/math.sqrt(2),D[2]/math.sqrt(2),math.sqrt(2)/norm)
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def project(p):return dot(p,RIGHT),-dot(p,UP)
def shade(color,k):return '#'+''.join(f'{min(255,round(int(color[i:i+2],16)*k)):02x}' for i in (1,3,5))
def render(model):
 faces=[]
 for piece in model['pieces']:
  matrix=rotation_matrix([math.degrees(v) for v in piece['rotation']]);center=piece['position']
  def transform(p):return tuple(a+b for a,b in zip(mv(matrix,p),center))
  polygons=[([(x,y,.5) for x,y in outline],(0,0,1)), ([(x,y,-.5) for x,y in reversed(outline)],(0,0,-1))]
  for i,(x,y) in enumerate(outline):
   a,b=outline[(i+1)%len(outline)];polygons.append(([(x,y,-.5),(a,b,-.5),(a,b,.5),(x,y,.5)],(b-y,x-a,0)))
  for vertices,normal in polygons:
   normal=mv(matrix,normal)
   if dot(normal,D)<=0:continue
   world=[transform(p) for p in vertices];depth=sum(dot(p,D) for p in world)/len(world)
   brightness=.78+.22*max(0,normal[2])+.08*max(0,-normal[1])
   faces.append((depth,[project(p) for p in world],shade(COLORS[piece['c']],brightness)))
 flat=[p for _,face,_ in faces for p in face];x0=min(x for x,y in flat);x1=max(x for x,y in flat);y0=min(y for x,y in flat);y1=max(y for x,y in flat);pad=max(x1-x0,y1-y0)*.08
 paths=[]
 for _,face,color in sorted(faces,key=lambda f:f[0]):
  paths.append('<path fill="'+color+'" d="M'+'L'.join(f'{x:.3f},{y:.3f}' for x,y in face)+'Z"/>')
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="{x0-pad:.3f} {y0-pad:.3f} {x1-x0+2*pad:.3f} {y1-y0+2*pad:.3f}" role="img"><title>{html.escape(model["name"])}</title><g stroke="#343b44" stroke-width=".045" stroke-linejoin="round">'+''.join(paths)+'</g></svg>\n'
if __name__=='__main__':
 source=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'spatial50/generated/final.json'
 models=json.loads(source.read_text())['models'];target=ROOT/'assets/spatial';target.mkdir(exist_ok=True)
 for m in models:(target/(m['id']+'.svg')).write_text(render(m))
 print('Rendered',len(models),'whole-brick thumbnails')
