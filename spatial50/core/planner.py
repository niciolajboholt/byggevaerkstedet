"""Physical Plus-Plus planning on a 3-unit centre lattice.

Public API generate(cells, name='', model_id='', max_pieces=250, seed=0,
                    attempts=120).
Cells: {(integer x, integer y, integer z): palette_code}. World position=3*cell.
Public Euler rotations are radians, order XYZ (matrix Rx @ Ry @ Rz, as THREE.Euler).
No omitted target cell is hidden: count/targetCount/omitted/complete are explicit.
Each insertion is certified by a nominal straight axis sweep against previously placed cubes.
"""
from __future__ import annotations
import hashlib,json,math,random
from collections import deque

H=tuple((x,0,0) for x in range(-2,3))+tuple((x,y,0) for x in (-1,1) for y in (-1,1))
NOTCHES=((0,-1,0),(0,1,0))
PROTRUSIONS=((-2,0,0),(2,0,0))+tuple((x,y,0) for x in (-1,1) for y in (-1,1))
AXES='xyz'
DIRECTIONS=((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1))
PALETTE=set('rAROYGgBbPpWKNTS')

def mm(a,b):return tuple(tuple(sum(a[i][k]*b[k][j] for k in range(3)) for j in range(3)) for i in range(3))
def rotation_matrix(euler):
 rx,ry,rz=[math.radians(v) for v in euler];cx,sx=round(math.cos(rx)),round(math.sin(rx));cy,sy=round(math.cos(ry)),round(math.sin(ry));cz,sz=round(math.cos(rz)),round(math.sin(rz))
 return mm(mm(((1,0,0),(0,cx,-sx),(0,sx,cx)),((cy,0,sy),(0,1,0),(-sy,0,cy))),((cz,-sz,0),(sz,cz,0),(0,0,1)))
def mv(m,v):return tuple(sum(m[i][j]*v[j] for j in range(3)) for i in range(3))
def plus(a,b):return tuple(x+y for x,y in zip(a,b))
def minus(a,b):return tuple(x-y for x,y in zip(a,b))
def local_points(euler,points):
 m=rotation_matrix(euler);return frozenset(mv(m,p) for p in points)

ORIENTATIONS=[]
for e in sorted(((x,y,z) for x in (0,90,180,270) for y in (0,90,180,270) for z in (0,90,180,270)),key=lambda e:(sum(v!=0 for v in e),sum(e),e)):
 m=rotation_matrix(e);long=next(i for i in range(3) if m[i][0]);wide=next(i for i in range(3) if m[i][1]);axes=(long,wide)
 if any(o['axisIndices']==axes for o in ORIENTATIONS):continue
 ORIENTATIONS.append(dict(axisIndices=axes,axes={'long':AXES[long],'wide':AXES[wide]},rotation=list(e),voxels=local_points(e,H),notches=local_points(e,NOTCHES),protrusions=local_points(e,PROTRUSIONS)))
ORIENTATIONS.sort(key=lambda o:o['axisIndices'])

def joint_local(a,b,offset):
 """A or B empty notch receives an actual B/A protruding cube."""
 av=a['voxels'];bv=frozenset(plus(p,offset) for p in b['voxels'])
 if av&bv:return False
 bn={plus(p,offset) for p in b['notches']};bp={plus(p,offset) for p in b['protrusions']}
 return bool((a['notches']&bp) or (bn&a['protrusions']))

def coarse_legal(a,b,delta):
 if sum(abs(v) for v in delta)!=1:return False
 q=next(i for i,v in enumerate(delta) if v)
 al,aw=a['axisIndices'];bl,bw=b['axisIndices']
 return (al==q and bw==q) or (aw==q and bl==q)

# Adjacent coarse cells can collide diagonally; precompute exact local relations.
REL={}
for dx in (-1,0,1):
 for dy in (-1,0,1):
  for dz in (-1,0,1):
   delta=(dx,dy,dz)
   if delta==(0,0,0):continue
   offset=tuple(3*v for v in delta)
   for ai,a in enumerate(ORIENTATIONS):
    for bi,b in enumerate(ORIENTATIONS):
     collision=bool(a['voxels']&{plus(p,offset) for p in b['voxels']})
     contact=not collision and coarse_legal(a,b,delta) and joint_local(a,b,offset)
     REL[delta,ai,bi]=(collision,contact)


def validate_mask(cells,max_pieces=250):
 if not isinstance(cells,dict) or not cells:raise ValueError('cells must be a nonempty dict of integer coordinate triples to palette codes')
 if len(cells)>max_pieces:raise ValueError(f'{len(cells)} target pieces exceeds limit {max_pieces}')
 for p,c in cells.items():
  if not isinstance(p,tuple) or len(p)!=3 or any(not isinstance(v,int) or isinstance(v,bool) for v in p):raise ValueError('cell coordinates must be integer (x,y,z) tuples')
  if c not in PALETTE:raise ValueError(f'unknown colour {c!r}')
 return sorted(cells,key=lambda p:(p[2],p[1],p[0]))

def add_ranges(ranges,voxels):
 for v in voxels:
  for axis in range(3):
   line=tuple(v[i] for i in range(3) if i!=axis);old=ranges[axis].get(line)
   ranges[axis][line]=(min(old[0],v[axis]),max(old[1],v[axis])) if old else (v[axis],v[axis])

def insertion(voxels,ranges):
 for axis,sign in [(2,1),(0,1),(0,-1),(1,1),(1,-1),(2,-1)]:
  clear=True
  for v in voxels:
   line=tuple(v[i] for i in range(3) if i!=axis);bounds=ranges[axis].get(line)
   if bounds and ((sign>0 and bounds[1]>v[axis]) or (sign<0 and bounds[0]<v[axis])):clear=False;break
  if clear:
   inward=[0,0,0];inward[axis]=-sign
   values=[b[1] if sign>0 else b[0] for b in ranges[axis].values()]
   outside=(max(values) if sign>0 else min(values)) if values else 0
   edge=min(v[axis] for v in voxels) if sign>0 else max(v[axis] for v in voxels)
   distance=max(3,sign*(outside-edge)+3);offset=[0,0,0];offset[axis]=sign*distance
   return dict(insertionDirection=inward,fromOffset=offset)
 return None

def support_stability(positions,voxels,margin=.1):
 com=[sum(p[i] for p in positions)/len(positions) for i in range(3)]
 ground=min(p[2] for p in voxels);points=sorted({(p[0]+dx,p[1]+dy) for p in voxels if p[2]==ground for dx in (-.5,.5) for dy in (-.5,.5)})
 def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
 lower=[]
 for point in points:
  while len(lower)>=2 and cross(lower[-2],lower[-1],point)<=0:lower.pop()
  lower.append(point)
 upper=[]
 for point in reversed(points):
  while len(upper)>=2 and cross(upper[-2],upper[-1],point)<=0:upper.pop()
  upper.append(point)
 hull=lower[:-1]+upper[:-1]
 distances=[cross(a,hull[(i+1)%len(hull)],com)/math.dist(a,hull[(i+1)%len(hull)]) for i,a in enumerate(hull)] if len(hull)>=3 else [-math.inf]
 return dict(supported=min(distances)>=margin-1e-8,com=com,groundZ=ground-.5,hull=[list(p) for p in hull],minimumMargin=min(distances),requiredMargin=margin,model='equal-mass-static-centre-of-mass')

def generate(cells,*,name='',model_id='',max_pieces=250,seed=0,attempts=120, level_supports=False):
 nodes=validate_mask(cells,max_pieces);node_set=set(nodes)
 near={p:[q for q in nodes if q!=p and max(abs(p[i]-q[i]) for i in range(3))<=1] for p in nodes}
 adjacent={p:[plus(p,d) for d in DIRECTIONS if plus(p,d) in node_set] for p in nodes}
 world_voxels={(p,o):[plus(tuple(3*v for v in p),q) for q in ORIENTATIONS[o]['voxels']] for p in nodes for o in range(6)}
 ground=[p for p in nodes if p[2]==min(q[2] for q in nodes)]
 supports={min(ground,key=lambda p:sx*p[0]+sy*p[1]) for sx,sy in ((1,1),(1,-1),(-1,1),(-1,-1))} if level_supports else set()
 allowed={p:{i for i,o in enumerate(ORIENTATIONS) if p not in supports or o['axisIndices'][0]==2} for p in nodes}
 rng=random.Random(seed);best=[];best_parents={};best_assigned={};best_reason='no_attempts';best_insertions={};best_supported=False
 # Prefer low-degree tips, but rotate start/orientation across deterministic retries.
 starts=sorted(nodes,key=lambda p:(len(adjacent[p]),p[2],p[1],p[0]))
 for attempt in range(max(1,attempts)):
  start=starts[0] if attempt==0 else rng.choice(starts[:max(1,len(starts)//2)])
  orientation=attempt%6 if attempt<6 else rng.randrange(6)
  if orientation not in allowed[start]:orientation=rng.choice(sorted(allowed[start]))
  ranges=[{}, {}, {}];insertions={start:insertion(world_voxels[start,orientation],ranges)};add_ranges(ranges,world_voxels[start,orientation])
  assigned={start:orientation};order=[start];parents={start:None};domains={p:allowed[p].copy() for p in nodes if p!=start}
  frontier=set(adjacent[start]);failed=False
  def constrain(p,ori):
   for q in near[p]:
    if q in domains:
     delta=minus(q,p)
     domains[q]={o for o in domains[q] if not REL[delta,ori,o][0]}
     if not domains[q]:return False
   return True
  if not constrain(start,orientation):failed=True
  while domains and not failed:
   choices=[]
   ranked=sorted(frontier,key=lambda p:(len(domains[p]),-sum(q in assigned for q in near[p]),rng.random()))
   for p in ranked:
    options=[]
    for o in domains[p]:
     certificate=insertion(world_voxels[p,o],ranges)
     if not certificate:continue
     parents_possible=[q for q in adjacent[p] if q in assigned and REL[minus(p,q),assigned[q],o][1]]
     if parents_possible:
      # Prefer orientations leaving future cells many compatible options.
      future=sum(sum(not REL[minus(q,p),o,n][0] for n in domains[q]) for q in near[p] if q in domains)
      reach=sum(any(REL[minus(q,p),o,n][1] for n in domains[q]) for q in adjacent[p] if q in domains)
      options.append((future+4*reach+rng.random()*(2 if attempt else .01),o,parents_possible[0],certificate))
    if options:
     choices.append((len(options),-len([q for q in near[p] if q in assigned]),rng.random(),p,options))
     # Bound expensive insertion/scoring work to the most constrained frontier.
     if len(choices)>=4:break
   if not choices:best_reason='no_legal_connected_frontier';break
   choices.sort(key=lambda t:t[:3]);_,_,_,p,options=choices[0]
   options.sort(key=lambda v:v[0],reverse=True);_,o,parent,certificate=options[0]
   insertions[p]=certificate;add_ranges(ranges,world_voxels[p,o])
   del domains[p];frontier.discard(p);assigned[p]=o;parents[p]=parent;order.append(p)
   frontier.update(q for q in adjacent[p] if q in domains)
   if not constrain(p,o):failed=True;best_reason='orientation_domain_exhausted'
  stable=False
  if len(order)==len(nodes):stable=support_stability([tuple(3*v for v in p) for p in order],[v for p in order for v in world_voxels[p,assigned[p]]])['supported']
  if len(order)>len(best) or (len(order)==len(nodes) and stable):best=order[:];best_assigned=assigned.copy();best_parents=parents.copy();best_insertions=insertions.copy();best_supported=stable
  if len(best)==len(nodes) and best_supported:break
 pieces=[];steps=[];ids={p:f'p{i+1:03}' for i,p in enumerate(best)}
 for p in best:
  ori=ORIENTATIONS[best_assigned[p]];parent=best_parents[p]
  pieces.append(dict(id=ids[p],c=cells[p],position=[3*v for v in p],grid=list(p),rotation=[math.radians(v) for v in ori['rotation']],axes=ori['axes'].copy()))
  steps.append(dict(pieceId=ids[p],parentId=ids[parent] if parent else None,**best_insertions[p],axis=AXES[next(i for i,v in enumerate(minus(p,parent)) if v)] if parent else None))
 omitted=[list(p) for p in nodes if p not in best_assigned]
 signature=hashlib.sha256(json.dumps([[p['id'],p['c'],p['position'],p['rotation']] for p in pieces],separators=(',',':')).encode()).hexdigest()
 stability=support_stability([p['position'] for p in pieces],[v for p in best for v in world_voxels[p,best_assigned[p]]])
 result=dict(id=model_id,name=name,version=1,pieces=pieces,steps=steps,count=len(pieces),targetCount=len(nodes),omitted=omitted,complete=not omitted,signature=signature,rotationOrder='XYZ',rotationUnit='radians',gridScale=3,validation={'method':'voxel-notch-joint-and-axis-sweep','stability':stability},stability=stability,buildable=not omitted and stability['supported'],assemblyMotionTested=True,assemblyMotionModel='nominal-unit-cube-straight-axis-insertion')
 if omitted:result['failureReason']=best_reason
 return result


def validate_scene(scene):
 pieces=scene['pieces'];occupied={};placed={};errors=[]
 for p in pieces:
  m=rotation_matrix([math.degrees(v) for v in p['rotation']]);vox={plus(p['position'],mv(m,q)) for q in H}
  overlap=[q for q in vox if q in occupied]
  if overlap:errors.append({'type':'collision','pieces':[p['id'],occupied[overlap[0]]],'voxel':list(overlap[0])})
  for q in vox:occupied[q]=p['id']
  placed[p['id']]=p
 ranges=[{}, {}, {}]
 for step in scene['steps']:
  p=placed[step['pieceId']];vox={plus(p['position'],mv(rotation_matrix([math.degrees(v) for v in p['rotation']]),q)) for q in H}
  desired=step.get('insertionDirection');certificate=insertion(vox,ranges)
  if desired is None or certificate is None:errors.append({'type':'blocked_insertion','piece':p['id']})
  elif sum(abs(v) for v in desired)!=1:errors.append({'type':'invalid_insertion_direction','piece':p['id']})
  else:
   axis=next(i for i,v in enumerate(desired) if v);sign=-desired[axis]
   for v in vox:
    b=ranges[axis].get(tuple(v[i] for i in range(3) if i!=axis))
    if b and ((sign>0 and b[1]>v[axis]) or (sign<0 and b[0]<v[axis])):errors.append({'type':'blocked_insertion','piece':p['id']});break
  add_ranges(ranges,vox)
  if step['parentId'] is None:continue
  a=placed[step['parentId']];b=placed[step['pieceId']];ma=rotation_matrix([math.degrees(v) for v in a['rotation']]);mb=rotation_matrix([math.degrees(v) for v in b['rotation']])
  aa={k:local_points([math.degrees(q) for q in a['rotation']],v) for k,v in [('voxels',H),('notches',NOTCHES),('protrusions',PROTRUSIONS)]};bb={k:local_points([math.degrees(q) for q in b['rotation']],v) for k,v in [('voxels',H),('notches',NOTCHES),('protrusions',PROTRUSIONS)]}
  if not joint_local(aa,bb,minus(b['position'],a['position'])):errors.append({'type':'invalid_joint','pieces':[a['id'],b['id']]})
 stability=support_stability([p['position'] for p in pieces],occupied)
 if not stability['supported']:errors.append({'type':'unsupported_centre_of_mass'})
 return {'valid':not errors,'errors':errors,'count':len(pieces),'voxelCount':len(occupied),'stability':stability}

if __name__=='__main__':
 for desc,mask in [('line',{(x,0,0):'R' for x in range(8)}),('cube',{(x,y,z):'Y' for x in range(2) for y in range(2) for z in range(2)}),('plate',{(x,0,z):'G' for x in range(6) for z in range(6)})]:
  r=generate(mask,attempts=40);print(desc,r['count'],r['complete'],validate_scene(r))
