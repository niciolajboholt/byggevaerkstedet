#!/usr/bin/env python3
"""Rebuild the three computed whole-brick guides from validated base patterns.

Each cell is a complete Plus-Plus brick, with orientation determined by x+y.
Area resampling changes the actual motif's size; it never adds count-only pads.
Thin contour cells and small, contrasting colour components receive priority.
The base guide is retained exactly in the band containing its original count.

Usage: python scripts/generate-difficulty-variants.py [--review-dir PATH] [--check]
The review directory receives a machine-readable validation report and sheets.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import heapq
import json
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PALETTE={'r':'#941b2b','A':'#c59616','R':'#d8383a','O':'#ff8a1f','Y':'#f3d24a','G':'#3f9a4e','g':'#1f7a3a','B':'#2e5f99','b':'#7cc8f5','P':'#8e5bd8','p':'#ff8fc0','W':'#ffffff','K':'#2a2a2e','N':'#8a5a33','T':'#f0cca6','S':'#9aa1ab'}
BANDS={'easy':(1,59,55),'medium':(60,84,75),'hard':(85,250,112)}
DIRECTIONS=((0,-1),(-1,0),(1,0),(0,1))
BRICK=((-2,0),(-1,0),(0,0),(1,0),(2,0),(-1,-1),(-1,1),(1,-1),(1,1))

# Four legacy motifs had detached rays, petals, antennae or an arm. These
# source-coordinate connectors repair those features before generating variants.
# Assignment is idempotent and intentionally limited to these four base guides.
BASE_REPAIRS={
    'sol':{(2,1):'O',(3,2):'O',(8,1):'O',(7,2):'O',(2,9):'O',(3,8):'O',(8,9):'O',(7,8):'O'},
    'blomst':{(4,6):'p'},
    'sommerfugl':{(5,0):'K',(7,0):'K',(6,1):'K'},
    'dino':{(11,7):'G'},
}
def repair_base(model):
    changes=[]; rows=[list(r) for r in model['p']]
    for (x,y),color in BASE_REPAIRS.get(model['id'],{}).items():
        assert rows[y][x] in ('.',color),('repair would replace existing color',model['id'],x,y)
        if rows[y][x]!=color:changes.append([x,y,rows[y][x],color])
        rows[y][x]=color
    model['p']=[''.join(r) for r in rows]
    return changes

# Reviewed simplifications retain all four separately capped Titanic funnels.
REVIEWED_OVERRIDES={
 ('tema62-titanic','easy'):[
  '..K..K..K..K...', '..Y..Y..Y..Y...', '..WbWbWbWbWWW..',
  'WWWWWWWWWWWWWWW', '.KKKKKKKKKKKKK.', '...RRRRRRRRR...'],
 ('tema62-titanic','medium'):[
  '..K...K...K...K...', '..Y...Y...Y...Y...', '..WWWWWWWWWWWWWW..',
  '.WbWbWbWbWbWbWWWW.', 'WWWWWWWWWWWWWWWWWW', '.KKKKKKKKKKKKKKKK.',
  '...RRRRRRRRRRRR...'],
}
# Small colours that collided in a shared resampling cell: pumpkin stalk,
# yellow flame centre and the turtle king's red hair. Coordinates refer to
# the deterministic compact output and preserve each motif's actual feature.
DETAIL_REPAIRS={
 ('halloween20-graeskarkaret','easy'):{(3,0):'N'},
 ('ildfirben','easy'):{(8,6):'Y'},
 ('pigget-skildpaddekonge','easy'):{(5,0):'R'},
}
def reviewed_detail(model_id,level,rows,info):
    if (model_id,level) in DETAIL_REPAIRS:
        grid=[list(r) for r in rows]
        for (x,y),c in DETAIL_REPAIRS[model_id,level].items():grid[y][x]=c
        rows=[''.join(r) for r in grid]
        info={**info,'reviewedDetailCells':[[x,y,c] for (x,y),c in DETAIL_REPAIRS[model_id,level].items()]}
    return rows,info

def count(rows): return sum(c!='.' for r in rows for c in r)
def band(rows): return 'easy' if count(rows)<60 else 'medium' if count(rows)<85 else 'hard'
def squares(x,y): return {(3*x+1+(dy if (x+y)%2 else dx),3*y+1+(dx if (x+y)%2 else dy)) for dx,dy in BRICK}
def components(cells):
    todo=set(cells); out=[]
    while todo:
        seed=min(todo); seen={seed}; q=[seed]; todo.remove(seed)
        for x,y in q:
            for dx,dy in DIRECTIONS:
                v=(x+dx,y+dy)
                if v in todo: todo.remove(v); seen.add(v); q.append(v)
        out.append(seen)
    return sorted(out,key=lambda c:(-len(c),min(c)))
def trim(rows):
    xy=[(x,y) for y,r in enumerate(rows) for x,c in enumerate(r) if c!='.']
    x0=min(x for x,y in xy);x1=max(x for x,y in xy);y0=min(y for x,y in xy);y1=max(y for x,y in xy)
    return [r[x0:x1+1] for r in rows[y0:y1+1]]
def validate(rows,level,limit):
    assert rows and len({len(r) for r in rows})==1,'nonrectangular'
    assert max(len(rows),len(rows[0]))<=24,'dimension limit'
    assert set(''.join(rows)) <= set(PALETTE)|{'.'},'unknown colour'
    n=count(rows);lo,hi,_=BANDS[level];hi=limit if level=='hard' else hi
    assert lo<=n<=hi,(level,n)
    occ=set()
    for y,r in enumerate(rows):
        for x,c in enumerate(r):
            if c!='.':
                q=squares(x,y); assert not occ&q,'overlapping whole bricks';occ |=q
    assert len(components(occ))==1,'disconnected brick geometry'
    return n

def area_data(src,w,h):
    """Exact source-cell overlap per output cell; no image interpolation colours."""
    sw,sh=len(src[0]),len(src); data={};coverage={}
    for y in range(h):
        ya,yb=y*sh/h,(y+1)*sh/h
        for x in range(w):
            xa,xb=x*sw/w,(x+1)*sw/w; weights=Counter()
            for sy in range(int(ya),min(sh,math.ceil(yb))):
                for sx in range(int(xa),min(sw,math.ceil(xb))):
                    c=src[sy][sx]
                    if c!='.': weights[c]+=(min(xb,sx+1)-max(xa,sx))*(min(yb,sy+1)-max(ya,sy))
            total=sum(weights.values());coverage[x,y]=total/((xb-xa)*(yb-ya))
            data[x,y]=weights
    return data,coverage

def connect(cells,coverage,w,h):
    """Restore only sampled thin connections, following maximal source coverage."""
    added=set()
    for _ in range(10):
        groups=components(cells)
        if len(groups)<=1:return cells,added
        main=groups[0]; goals=set().union(*groups[1:]); todo=[]; dist={};prev={}
        for p in main:dist[p]=0;heapq.heappush(todo,(0,p))
        found=None
        while todo:
            cost,p=heapq.heappop(todo)
            if cost!=dist[p]:continue
            if p in goals:found=p;break
            x,y=p
            for dx,dy in DIRECTIONS:
                v=(x+dx,y+dy)
                if not(0<=v[0]<w and 0<=v[1]<h):continue
                # Zero source support is expensive: never use an outside pad.
                nc=cost+(0 if v in cells else 1+12*(1-coverage[v])**2)
                if nc<dist.get(v,1e9):dist[v]=nc;prev[v]=p;heapq.heappush(todo,(nc,v))
        if found is None:return cells,added
        path=[];p=found
        while p not in main:path.append(p);p=prev[p]
        if any(coverage[p]<=0 for p in path):return cells,added
        for p in path:
            if p not in cells:cells.add(p);added.add(p)
    return cells,added

def colorize(src,cells,data,w,h):
    """Retain isolated eyes and other small colour islands after area sampling."""
    result={p:max(data[p],key=lambda c:(data[p][c],c)) for p in cells}
    sw,sh=len(src[0]),len(src)
    colors=Counter(c for r in src for c in r if c!='.')
    features=[]
    for c in colors:
        for comp in components({(x,y) for y,r in enumerate(src) for x,v in enumerate(r) if v==c}):
            # Large regions already survive majority sampling. Small contrasting
            # islands deserve one representative if the target covers them.
            if len(comp)<=max(4,count(src)*.045):features.append((len(comp),c,comp))
    reserved=set()
    for size,c,comp in sorted(features,key=lambda f:(f[0],f[1],min(f[2]))):
        candidates=[]
        for p in cells:
            x,y=p;xa,xb=x*sw/w,(x+1)*sw/w;ya,yb=y*sh/h,(y+1)*sh/h
            support=sum(max(0,min(xb,sx+1)-max(xa,sx))*max(0,min(yb,sy+1)-max(ya,sy)) for sx,sy in comp)
            if support>0:candidates.append((support,p))
        if candidates:
            _,p=max(candidates,key=lambda t:(t[0],result[t[1]]==c,t[1] not in reserved,tuple(-v for v in t[1])))
            if p not in reserved or result[p]==c:result[p]=c;reserved.add(p)
    # Preserve every base colour, choosing its strongest covered target cell.
    for c in sorted(colors,key=lambda c:colors[c]):
        if c not in result.values():
            options=[(data[p].get(c,0),p) for p in cells if p not in reserved]
            if options:
                support,p=max(options)
                if support>0:result[p]=c;reserved.add(p)
    return [''.join(result.get((x,y),'.') for x in range(w)) for y in range(h)]

def make_variant(src,level):
    lo,hi,target=BANDS[level];src=trim(src);sw,sh=len(src[0]),len(src);n=count(src)
    ideal=math.sqrt(target/n); iw,ih=sw*ideal,sh*ideal
    # Stretch very tall/long models only enough to stay within the 24-cell limit.
    if ih>24:iw*=ih/24;ih=24
    if iw>24:ih*=iw/24;iw=24
    candidates=[]
    dims=sorted({(max(2,min(24,round(iw)+dx)),max(2,min(24,round(ih)+dy))) for dx in range(-2,3) for dy in range(-2,3)})
    for w,h in dims:
        data,cov=area_data(src,w,h)
        for threshold in (.28,.36,.44,.50,.56,.64,.72):
            cells={p for p in cov if cov[p]>=threshold}
            if not cells:continue
            cells,added=connect(cells,cov,w,h)
            if not lo<=len(cells)<=hi or len(components(cells))>1:continue
            rows=trim([''.join(max(data[x,y],key=lambda c:(data[x,y][c],c)) if (x,y) in cells else '.' for x in range(w)) for y in range(h)])
            # Area mismatch measures actual silhouette overlap, plus modest
            # penalties for aspect distortion, count and restored connections.
            mismatch=sum((1-cov[p]) if p in cells else cov[p] for p in cov)/(w*h)
            aspect=abs(math.log((w/h)/(sw/sh)))
            missing=len(set(''.join(src))-set(''.join(rows))-{'.'})
            score=mismatch*5+aspect*.48+abs(len(cells)-target)/target*.18+len(added)*.025+missing*.8
            candidates.append((score,rows,cells,data,{'size':[w,h],'threshold':threshold,'restoredContourCells':len(added),'silhouetteError':round(mismatch,4),'aspectLogError':round(aspect,4)}))
    if not candidates:raise ValueError(f'No supported connected candidate for {level}, {sw}x{sh}, {n}')
    _,_,cells,data,info=min(candidates,key=lambda c:(c[0],c[1]))
    w,h=info['size']
    rows=trim(colorize(src,cells,data,w,h))
    return rows,info

def render_sheets(models,names,out):
    from PIL import Image,ImageDraw,ImageFont
    fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    font=ImageFont.truetype(fontpath,13);small=ImageFont.truetype(fontpath,11)
    cw,ch=420,180
    for batch in range(math.ceil(len(models)/25)):
        group=models[batch*25:(batch+1)*25]
        image=Image.new('RGB',(cw*5,ch*5+42),'#edf1ea');d=ImageDraw.Draw(image)
        d.text((12,10),f'Difficulty guide review {batch+1} — Easy / Medium / Hard — complete alternating bricks',font=font,fill='#183d32')
        for i,m in enumerate(group):
            ox=(i%5)*cw;oy=42+(i//5)*ch
            d.rectangle((ox+3,oy+2,ox+cw-3,oy+ch-3),fill='white')
            d.text((ox+8,oy+5),f"{batch*25+i+1}. {names.get(m['id'],m['id'])}",font=font,fill='#183d32')
            for j,level in enumerate(BANDS):
                rows=m['variants'][level]['p'];pieces=[(c,squares(x,y)) for y,r in enumerate(rows) for x,c in enumerate(r) if c!='.']
                points=set().union(*(q for c,q in pieces));x0=min(x for x,y in points);x1=max(x for x,y in points)+1;y0=min(y for x,y in points);y1=max(y for x,y in points)+1
                unit=min(124/(x1-x0),123/(y1-y0));bx=ox+j*140+(140-(x1-x0)*unit)/2-x0*unit;by=oy+29+(123-(y1-y0)*unit)/2-y0*unit
                for c,q in pieces:
                    for x,y in q:d.rectangle((round(bx+x*unit),round(by+y*unit),round(bx+(x+1)*unit),round(by+(y+1)*unit)),fill=PALETTE[c])
                    for x,y in q:
                        for dx,dy,edge in ((0,-1,(x,y,x+1,y)),(0,1,(x,y+1,x+1,y+1)),(-1,0,(x,y,x,y+1)),(1,0,(x+1,y,x+1,y+1))):
                            if (x+dx,y+dy) not in q:
                                a,b,cx,cy=edge;d.line((bx+a*unit,by+b*unit,bx+cx*unit,by+cy*unit),fill='#5d6267',width=1)
                d.text((ox+j*140+10,oy+158),f'{level}: {count(rows)}',font=small,fill='#33493b')
        image.save(out/f'contact-{batch+1:02}.png')

def render_details(models,names,out):
    """Large comparisons for thin silhouettes, badges and reviewed repairs."""
    from PIL import Image,ImageDraw,ImageFont
    ids=['tema62-titanic','halloween20-spindelvaev','dyr20-blaeksprutte',
         'biler20-formelbil','halloween20-skelet','biler20-audi',
         'halloween20-hjemsoegt-hus','halloween20-varulv','troldmandsborg',
         'halloween20-spoegelsetrae','tema62-barcelona','tema62-bayern-muenchen',
         'tema62-atletico-madrid','sol','blomst','sommerfugl','dino',
         'halloween20-graeskarkaret','ildfirben','pigget-skildpaddekonge']
    lookup={m['id']:m for m in models};font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
    for batch in range(4):
        image=Image.new('RGB',(960,5*320),'white');d=ImageDraw.Draw(image)
        for i,model_id in enumerate(ids[batch*5:batch*5+5]):
            m=lookup[model_id];top=i*320
            d.text((12,top+8),names.get(model_id,model_id),font=font,fill='#183d32')
            for j,level in enumerate(BANDS):
                rows=m['variants'][level]['p'];pieces=[(c,squares(x,y)) for y,r in enumerate(rows) for x,c in enumerate(r) if c!='.']
                pts=set().union(*(q for c,q in pieces));x0=min(x for x,y in pts);x1=max(x for x,y in pts)+1;y0=min(y for x,y in pts);y1=max(y for x,y in pts)+1
                u=min(300/(x1-x0),245/(y1-y0));ox=j*320+(320-(x1-x0)*u)/2-x0*u;oy=top+39+(245-(y1-y0)*u)/2-y0*u
                for c,q in pieces:
                    for x,y in q:d.rectangle((round(ox+x*u),round(oy+y*u),round(ox+(x+1)*u),round(oy+(y+1)*u)),fill=PALETTE[c])
                    for x,y in q:
                        for dx,dy,e in ((0,-1,(x,y,x+1,y)),(0,1,(x,y+1,x+1,y+1)),(-1,0,(x,y,x,y+1)),(1,0,(x+1,y,x+1,y+1))):
                            if (x+dx,y+dy) not in q:
                                a,b,cx,cy=e;d.line((ox+a*u,oy+b*u,ox+cx*u,oy+cy*u),fill='#5d6267',width=1)
                d.text((j*320+20,top+290),f'{level} · {count(rows)} bricks',font=font,fill='#183d32')
        image.save(out/f'detail-{batch+1:02}.png')

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--review-dir',type=Path);ap.add_argument('--check',action='store_true');args=ap.parse_args()
    path=ROOT/'data/motiver.json';payload=json.loads(path.read_text());report=[]
    for m in payload['models']:
        repairs=repair_base(m)
        base=m['p'];original=band(base);variants={};entries={}
        for level in BANDS:
            if level==original:rows,info=list(base),{'method':'unchanged-original'}
            elif (m['id'],level) in REVIEWED_OVERRIDES:rows,info=list(REVIEWED_OVERRIDES[m['id'],level]),{'method':'reviewed-four-funnel-simplification'}
            else:rows,info=make_variant(base,level)
            if level!=original:rows,info=reviewed_detail(m['id'],level,rows,info)
            validate(rows,level,300 if m['cat']=='Klublogoer' else 250)
            flags=[]
            if info.get('silhouetteError',0)>.12:flags.append('large-silhouette-reduction')
            if info.get('aspectLogError',0)>.25:flags.append('aspect-compression')
            if info.get('restoredContourCells',0)>3:flags.append('thin-contour-restoration')
            if m['cat'] in {'Klublogoer','Billogoer'} and level!='hard':flags.append('simplified-badge-lettering')
            variants[level]={'p':rows};entries[level]={'count':count(rows),'dimensions':[len(rows[0]),len(rows)],'lostColors':sorted(set(''.join(base))-set(''.join(rows))-{'.'}),'reviewFlags':flags,**info}
        assert variants[original]['p']==base
        if args.check:assert m.get('variants')==variants,('stale variant',m['id'])
        else:m['variants']=variants
        report.append({'id':m['id'],'category':m['cat'],'baseSha256':hashlib.sha256(json.dumps(base,separators=(',',':')).encode()).hexdigest(),'originalBand':original,'baseConnectivityRepair':[[x,y,c] for (x,y),c in BASE_REPAIRS.get(m['id'],{}).items()],'variants':entries})
    if not args.check:path.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    if args.review_dir:
        args.review_dir.mkdir(parents=True,exist_ok=True)
        (args.review_dir/'validation.json').write_text(json.dumps({'models':len(report),'guides':len(report)*3,'physicallyTested':False,'algorithm':'498 deterministic area-resampled variants, 2 reviewed Titanic simplifications, 250 retained base guides; 4 legacy base connectivity repairs','modelsReport':report},ensure_ascii=False,indent=2)+'\n')
        names=json.loads((ROOT/'data/navne.json').read_text())
        render_sheets(payload['models'],names,args.review_dir)
        render_details(payload['models'],names,args.review_dir)
    print(json.dumps({'models':len(report),'guides':len(report)*3,'counts':{level:[min(x['variants'][level]['count'] for x in report),max(x['variants'][level]['count'] for x in report)] for level in BANDS},'mode':'check' if args.check else 'write'}))
if __name__=='__main__':main()
