"""Small freestanding character masks. Coordinates are X, depth Y, height Z."""
from collections import deque
import math


def models():
    result = []

    def box(c, xa, xb, ya, yb, za, zb, color, shell=False):
        for x in range(xa, xb + 1):
            for y in range(ya, yb + 1):
                for z in range(za, zb + 1):
                    if not shell or x in (xa, xb) or y in (ya, yb) or z in (za, zb):
                        c[x, y, z] = color

    def ball(c, cx, cy, cz, rx, ry, rz, color, hollow=False):
        for x in range(cx-rx, cx+rx+1):
            for y in range(cy-ry, cy+ry+1):
                for z in range(cz-rz, cz+rz+1):
                    d=((x-cx)/(rx+.25))**2+((y-cy)/(ry+.25))**2+((z-cz)/(rz+.25))**2
                    if d <= 1 and (not hollow or d >= .24):
                        c[x,y,z]=color

    def finish(number, name, theme, c):
        assert len(c) <= 250, (number, len(c))
        seen=set(); todo=[next(iter(c))]
        while todo:
            p=todo.pop()
            if p in seen: continue
            seen.add(p)
            x,y,z=p
            todo.extend(q for q in ((x-1,y,z),(x+1,y,z),(x,y-1,z),(x,y+1,z),(x,y,z-1),(x,y,z+1)) if q in c and q not in seen)
        assert len(seen)==len(c), (number, len(c)-len(seen))
        assert max(y for x,y,z in c)-min(y for x,y,z in c)>=2
        result.append(dict(number=number,name=name,theme=theme,cells=c))

    # Broad feet carry a hollow box body and a cubic head.
    c={}
    for x in (-2,1): box(c,x,x+1,-1,1,0,0,'K')
    for x in (-1,1): box(c,x,x,0,0,1,2,'S')
    box(c,-2,2,-1,1,3,5,'B',True)
    box(c,-1,1,-1,1,6,8,'S',True)
    for x in (-1,1): c[x,-1,7]='b'
    c[0,-1,4]='Y'
    for x in (-3,3): box(c,x,x,0,0,3,5,'S')
    c[0,0,9]='S';c[0,0,10]='R'
    finish(41,'Lille robot','Figurer',c)

    c={};box(c,-2,2,-2,2,0,0,'S')
    box(c,0,0,0,0,1,2,'W')
    ball(c,0,0,5,3,2,3,'W',True)
    # The lower hem joins the central supporting column.
    box(c,-1,1,-1,1,2,3,'W')
    for x in (-2,2): box(c,x,x,-1,0,2,2,'W')
    for x in (-1,1): c[x,-2,6]='K'
    c[0,-2,4]='K'
    finish(42,'Spøgelse på fod','Figurer',c)

    c={};box(c,-2,2,-2,2,0,0,'K');box(c,-1,1,-1,1,1,1,'Y')
    box(c,0,0,0,0,2,4,'Y');box(c,-1,1,-1,1,5,5,'Y')
    # Open rectangular cup: no solid internal block.
    box(c,-2,2,-2,2,6,8,'Y',True)
    for z in (7,8):
        for x in range(-1,2):
            for y in range(-1,2): c.pop((x,y,z),None)
    for x in (-4,4): box(c,x,x,0,0,6,8,'Y')
    for x in (-3,3):
        c[x,0,6]='Y';c[x,0,8]='Y'
    ball(c,0,0,10,1,1,1,'W')
    box(c,0,0,0,0,6,9,'Y');c[0,-1,10]='K'
    finish(43,'Fodboldpokal','Fodbold',c)

    c={};box(c,-4,4,-1,1,0,0,'G')
    box(c,-3,1,-1,1,1,1,'K');box(c,-3,1,-1,1,2,2,'R')
    box(c,0,1,-1,1,3,5,'R',True)
    for x in (-2,-1,0): c[x,-1,2]='W'
    ball(c,3,0,2,1,1,1,'W');c[3,-1,2]='K';c[3,0,3]='K'
    finish(44,'Støvle med bold','Fodbold',c)

    c={};box(c,-2,2,-1,1,0,0,'g')
    for x in (-1,1): box(c,x,x,0,1,1,2,'G')
    box(c,-1,1,-1,1,3,5,'G',True)
    box(c,-1,1,-1,1,6,7,'G',True);box(c,-1,1,-2,-1,6,6,'G')
    for x in (-1,1): c[x,-2,6]='Y';c[x,0,8]='Y'
    for sign in (-1,1):
        box(c,2*sign,2*sign,0,0,4,6,'g')
        box(c,3*sign,3*sign,0,0,5,7,'G')
        c[4*sign,0,6]='G'
    box(c,0,0,2,2,1,4,'G');box(c,0,0,3,3,0,2,'G')
    c[0,0,5]='Y';c[0,-1,4]='Y'
    finish(45,'Lille drage','Fantasidyr',c)

    c={};ball(c,0,0,2,3,2,2,'W',True)
    box(c,-2,2,-1,1,0,0,'W')
    ball(c,0,0,5,2,2,2,'W',True)
    ball(c,0,0,8,2,1,2,'W')
    box(c,-2,2,-1,1,10,10,'K');box(c,-1,1,-1,1,11,12,'K',True)
    for x in (-1,1): c[x,-1,8]='K'
    c[0,-2,8]='O'
    for z in (3,5): c[0,-2,z]='K'
    box(c,-2,2,-1,1,6,6,'R',True);box(c,1,1,-2,-2,4,6,'R')
    for x in (-3,3): box(c,x,x,0,0,4,5,'N')
    finish(46,'Snemand med hat','Figurer',c)

    # Forward head and long grounded tail balance the animal.
    c={}
    for y in (-1,1): box(c,0,2,y,y,0,0,'g');box(c,0,1,y,y,1,2,'G')
    box(c,-1,1,-1,1,3,5,'G',True)
    box(c,1,2,-1,1,5,7,'G',True)
    box(c,2,4,-1,1,7,8,'G',True)
    for y in (-1,1): c[3,y,8]='Y';c[4,y,7]='W';c[1,y*2,5]='G'
    box(c,-2,-2,-1,1,2,4,'G')
    box(c,-3,-3,-1,1,1,2,'G');box(c,-5,-4,0,0,0,1,'g')
    finish(47,'Tyrannosaurus','Fantasidyr',c)

    c={};box(c,-2,2,-1,1,0,0,'P')
    box(c,-1,1,-1,1,1,4,'B',True)
    box(c,-1,1,-1,1,5,6,'T')
    box(c,-1,1,-1,-1,4,5,'W');c[0,-1,3]='W'
    for x in (-1,1): c[x,-1,6]='K'
    box(c,-2,2,-1,1,7,7,'P')
    box(c,-1,1,-1,1,8,9,'P',True);c[0,0,10]='P';c[0,0,11]='Y'
    box(c,2,2,0,0,3,5,'B');c[3,0,4]='T'
    box(c,3,3,0,0,0,7,'N');ball(c,3,0,8,1,1,1,'b')
    c[2,0,0]='P'
    finish(48,'Troldmand med stav','Figurer',c)

    def player():
        c={};box(c,-3,3,-1,1,0,0,'G')
        for x in (-1,1):
            box(c,x,x,-1,0,1,1,'K');box(c,x,x,0,0,2,3,'W')
        box(c,-1,1,-1,1,4,4,'K')
        box(c,-1,1,-1,1,5,7,'b',True)
        box(c,0,0,-1,-1,5,7,'W')
        box(c,0,0,0,0,8,8,'T')
        box(c,-1,1,-1,1,9,10,'T',True)
        box(c,-1,1,-1,1,11,11,'K')
        for x in (-1,1): c[x,-1,10]='K'
        return c

    c=player()
    box(c,-1,1,-1,-1,9,9,'N')
    # Raised hands hold one compact gold cup in front of the player.
    for x in (-2,2): box(c,x,x,0,0,7,10,'T')
    for x in (-1,1): c[x,0,12]='T'
    for x in (-2,2): c[x,0,11]='T';c[x,0,12]='T'
    box(c,0,0,0,0,12,13,'Y')
    ball(c,0,0,15,1,1,1,'Y');box(c,-1,1,-1,1,13,13,'Y')
    finish(49,'Messi med pokal','Fodbold',c)

    c={};box(c,-4,4,-1,1,0,0,'G')
    for sign in (-1,1):
        box(c,3*sign,3*sign,-1,0,1,1,'K')
        box(c,min(2*sign,3*sign),max(2*sign,3*sign),0,0,2,2,'T')
        box(c,2*sign,2*sign,0,0,3,3,'T')
        box(c,sign,sign,0,0,3,4,'G')
    box(c,-1,1,-1,1,4,4,'G')
    box(c,-1,1,-1,1,5,7,'R',True)
    box(c,0,0,0,0,8,8,'T')
    box(c,-1,1,-1,1,9,10,'T',True);box(c,-1,1,-1,1,11,11,'K')
    for x in (-1,1): c[x,-1,10]='K'
    # Diagonal arms terminate in open hands; every step has an edge join.
    for sign in (-1,1):
        c[2*sign,0,7]='R';c[2*sign,0,6]='R'
        c[3*sign,0,6]='T';c[3*sign,0,5]='T';c[4*sign,0,5]='T'
    finish(50,'CR7 i Siu-positur','Fodbold',c)
    return result


if __name__ == '__main__':
    for m in models():
        cells=m['cells']
        dims=tuple(max(p[a] for p in cells)-min(p[a] for p in cells)+1 for a in range(3))
        print(m['number'],m['name'],len(cells),dims)
