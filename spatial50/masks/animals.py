"""Compact volumetric animal masks. Coordinates use Z up; each cell is one brick."""
from math import floor, ceil


def _box(c, x0, x1, y0, y1, z0, z1, color):
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            for z in range(z0, z1 + 1):
                c[x, y, z] = color


def _ellipsoid(c, center, radius, color):
    cx, cy, cz = center
    rx, ry, rz = radius
    for x in range(floor(cx-rx), ceil(cx+rx)+1):
        for y in range(floor(cy-ry), ceil(cy+ry)+1):
            for z in range(floor(cz-rz), ceil(cz+rz)+1):
                if ((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2 <= 1.001:
                    c[x, y, z] = color


def _path(c, points, color):
    """Join waypoints using face-connected, orthogonal segments."""
    p = list(points[0])
    c[tuple(p)] = color
    for target in points[1:]:
        for axis in range(3):
            while p[axis] != target[axis]:
                p[axis] += 1 if target[axis] > p[axis] else -1
                c[tuple(p)] = color


def _paint_front(c, condition, color):
    for p in list(c):
        if condition(*p):
            c[p] = color


def _perch(c):
    # Broad plinth and an offset tree trunk support the branch and both feet.
    _box(c,-2,2,-1,1,0,0,'N')
    _box(c,0,0,0,0,1,2,'N')
    _box(c,-3,3,0,0,3,3,'N')
    _box(c,-1,-1,0,0,4,4,'Y')
    _box(c,1,1,0,0,4,4,'Y')


def models():
    out=[]
    def save(number,name,c):
        out.append(dict(number=number,name=name,theme='Dyr',cells=c))

    # Broad orange feet and an upright, rounded black-and-white bird.
    c={}
    _box(c,-2,-1,-2,0,0,0,'O'); _box(c,1,2,-2,0,0,0,'O')
    _ellipsoid(c,(0,0,3),(2,1.5,3),'K')
    _ellipsoid(c,(0,0,6),(1.5,1.5,1.5),'K')
    _paint_front(c,lambda x,y,z:y<0 and abs(x)<=1 and 1<=z<=5,'W')
    _box(c,-3,-2,0,0,2,4,'K');_box(c,2,3,0,0,2,4,'K')
    c[-1,-1,6]=c[1,-1,6]='W'
    _box(c,0,0,-3,-1,6,6,'O')
    save(1,'Pingvin',c)

    # Low domed shell with four wide flippers and a forward-facing head.
    c={}
    _ellipsoid(c,(0,0,2),(3,2,1.5),'g')
    _paint_front(c,lambda x,y,z:z==3 and (x+y)%2==0,'Y')
    for x in (-2,2):
        for y in (-2,2):
            _box(c,x,x,y,y,0,2,'G')
            _box(c,x,x+(1 if x>0 else 0),y,y,0,0,'G')
    _box(c,3,4,-1,1,1,2,'G')
    c[4,-1,2]=c[4,1,2]='K'
    _path(c,[(-3,0,1),(-4,0,1)],'G')
    save(2,'Skildpadde',c)

    c={}
    _box(c,-1,-1,-1,1,0,0,'O');_box(c,1,1,-1,1,0,0,'O')
    _box(c,-1,-1,0,0,1,1,'O');_box(c,1,1,0,0,1,1,'O')
    _ellipsoid(c,(0,0,3),(2,1.5,2),'Y')
    _ellipsoid(c,(0,0,5),(1.5,1.5,1.5),'Y')
    c[-1,-1,5]=c[1,-1,5]='K'
    _box(c,0,0,-3,-1,4,4,'O')
    _box(c,-3,-2,0,0,3,3,'Y');_box(c,2,3,0,0,3,3,'Y')
    _path(c,[(0,0,6),(0,0,7),(1,0,7)],'Y')
    save(3,'Kylling',c)

    # Fish is a thick vertical body above a reef pedestal, with a fan-shaped tail.
    c={}
    _box(c,-3,3,-1,1,0,0,'T')
    _path(c,[(0,0,0),(0,0,3)],'r')
    _path(c,[(-2,0,0),(-2,0,2),(-1,0,2)],'P')
    _path(c,[(2,0,0),(2,0,1),(3,0,1)],'r')
    _ellipsoid(c,(0,0,5),(3,1.25,2),'Y')
    _paint_front(c,lambda x,y,z:x in (-1,1),'O')
    _box(c,-4,-3,-1,1,4,6,'B')
    _box(c,0,1,0,0,7,7,'B');_box(c,0,1,0,0,3,3,'B')
    c[2,-1,5]=c[2,1,5]='K'
    _box(c,3,3,0,0,5,5,'O')
    save(4,'Tropisk fisk',c)

    c={};_perch(c)
    _ellipsoid(c,(0,0,7),(2,1.5,2.5),'N')
    _box(c,-2,-2,0,0,9,10,'N');_box(c,2,2,0,0,9,10,'N')
    _paint_front(c,lambda x,y,z:y==-1 and abs(x)==1 and z in (8,9),'W')
    c[-1,-2,8]=c[1,-2,8]='K'
    c[0,-2,7]='Y';c[0,-1,7]='Y'
    _paint_front(c,lambda x,y,z:y==-1 and 5<=z<=6,'T')
    _box(c,-2,-2,0,0,6,8,'g');_box(c,2,2,0,0,6,8,'g')
    save(5,'Ugle',c)

    c={}
    for x in (-2,2):
        for y in (-1,1):_box(c,x,x,y,y,0,2,'K')
    _ellipsoid(c,(0,0,3),(2.5,1.5,1.5),'O')
    for x in (-2,2):
        for y in (-1,1): c[x,y,3]='O'
    _ellipsoid(c,(2,0,5),(1.5,1.5,1.5),'O')
    _box(c,2,4,-1,1,4,4,'W');c[4,0,4]='K'
    _box(c,2,2,-1,-1,6,7,'O');_box(c,2,2,1,1,6,7,'O')
    c[3,-1,5]=c[3,1,5]='K'
    _box(c,-4,-2,0,1,3,4,'O')
    _box(c,-5,-4,0,1,4,5,'O')
    _box(c,-6,-5,0,1,5,5,'W')
    save(6,'Ræv',c)

    c={}
    _ellipsoid(c,(0,0,2),(4,1.5,1.5),'g')
    _box(c,3,6,-1,1,1,2,'G')
    for x in (-2,2):
        for y in (-2,2):_box(c,x,x,y,y,0,2,'G')
    _box(c,-6,-3,0,0,1,2,'g');_box(c,-8,-6,0,0,1,1,'g')
    c[3,-1,3]=c[3,1,3]='Y'
    for x in (-3,-1,1):c[x,0,4]='G';c[x,0,3]='G'
    _paint_front(c,lambda x,y,z:x>=4 and z==1 and abs(y)==1,'W')
    save(7,'Krokodille',c)

    c={}
    for x in (-2,1):
        for y in (-1,1):
            _box(c,x,x,y,y,0,3,'Y');c[x,y,0]='N'
    _ellipsoid(c,(-.5,0,4),(2.5,1.5,1.5),'Y')
    _box(c,1,2,0,1,4,9,'Y')
    _box(c,1,4,0,1,9,10,'Y')
    c[4,0,9]=c[4,1,9]='T'
    _box(c,1,1,0,1,11,11,'N')
    c[2,-1,10]='Y';c[2,2,10]='Y'
    c[3,-1,10]='K';c[3,0,10]='K'
    _path(c,[(-3,0,4),(-4,0,4),(-4,0,2)],'N')
    _paint_front(c,lambda x,y,z:(x+2*z)%4==0 and y in (-1,1) and 3<=z<=8,'N')
    save(8,'Giraf',c)

    c={}
    for x in (-2,1):
        for y in (-1,1):_box(c,x,x,y,y,0,2,'S')
    _ellipsoid(c,(-.5,0,3.5),(2.5,2,2),'S')
    _ellipsoid(c,(2,0,4.5),(1.5,1.5,1.5),'S')
    _box(c,1,2,-2,-2,3,6,'S');_box(c,1,2,2,2,3,6,'S')
    _box(c,3,3,0,0,1,5,'S');_box(c,3,4,0,0,1,1,'S')
    c[3,-1,5]=c[3,1,5]='K'
    _path(c,[(-3,0,4),(-4,0,4),(-4,0,3)],'S')
    save(9,'Elefant',c)

    c={};_perch(c)
    _ellipsoid(c,(0,0,7),(1.5,1.5,2.5),'R')
    _ellipsoid(c,(0,0,10),(1.5,1.5,1.5),'R')
    _box(c,-2,-2,0,0,6,8,'B');_box(c,2,2,0,0,6,8,'B')
    _box(c,-2,-2,0,0,8,9,'Y');_box(c,2,2,0,0,8,9,'Y')
    # Tail angles backward behind the perch and remains attached to the rump.
    _box(c,-1,1,1,1,4,6,'B');_box(c,0,0,2,2,3,5,'B')
    c[-1,-1,10]=c[1,-1,10]='W'
    _box(c,0,0,-3,-1,9,10,'Y');c[0,-3,9]='K'
    save(10,'Papegøje på pind',c)
    return out
