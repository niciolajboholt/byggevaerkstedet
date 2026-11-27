"""Ten sculptural nature masks on the integer brick-center grid (Z up)."""


def models():
    result = []

    def put(c, x, y, z, color):
        c[x, y, z] = color

    def line(c, start, end, color):
        # Orthogonal stair steps keep every branch physically connected.
        q = list(start)
        c[tuple(q)] = color
        for axis in (2, 0, 1):
            while q[axis] != end[axis]:
                q[axis] += 1 if end[axis] > q[axis] else -1
                c[tuple(q)] = color

    def disk(c, cx, cy, z, rx, ry, color):
        for x in range(cx-rx, cx+rx+1):
            for y in range(cy-ry, cy+ry+1):
                if ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1.05:
                    c[x,y,z] = color

    def ring(c, radius, z, color):
        for x in range(-radius, radius+1):
            for y in range(-radius, radius+1):
                if max(abs(x), abs(y)) == radius:
                    c[x,y,z] = color

    def pot(c, color='O'):
        # A broad floor and hollow walls provide depth without a dense solid block.
        disk(c, 0, 0, 0, 3, 2, color)
        for z in (1,2):
            for x in range(-2,3):
                for y in range(-2,3):
                    if max(abs(x),abs(y)) == 2:
                        c[x,y,z] = color
        line(c,(-2,0,1),(2,0,1),'N')
        line(c,(0,-2,1),(0,2,1),'N')
        c[0,0,2] = 'N'

    def leaf(c, start, end, color='G'):
        line(c,start,end,color)
        x,y,z=end
        # A transverse leaf blade makes the foliage genuinely three-dimensional.
        line(c,(x,y-1,z),(x,y+1,z),color)

    def finish(n, name, c):
        result.append({'number':n,'name':name,'theme':'Natur','cells':c})

    # 21: a cup-shaped flower, with petals surrounding an open yellow throat.
    c={};pot(c)
    line(c,(0,0,2),(0,0,8),'G')
    leaf(c,(0,0,4),(-2,0,6));leaf(c,(0,0,5),(2,1,7))
    for z,r in [(8,1),(9,2),(10,2)]:
        for x in range(-r,r+1):
            for y in range(-r,r+1):
                if r-1 <= abs(x)+abs(y) <= r:c[x,y,z]='R'
        if z==8:c[0,0,z]='Y'
    for x,y in [(-2,0),(2,0),(0,-2),(0,2)]:c[x,y,11]='R'
    finish(21,'Tulipan i potte',c)

    # 22: an overhanging red cap on a narrow white stalk.
    c={};disk(c,0,0,0,3,2,'G')
    line(c,(0,0,0),(0,0,5),'W')
    for z in range(1,5):c[1,0,z]='W'
    disk(c,0,0,5,4,3,'R');disk(c,0,0,6,3,2,'R')
    for x,y in [(-2,0),(1,1),(2,-1),(0,-1)]:c[x,y,6]='W'
    line(c,(-1,0,7),(1,0,7),'R')
    finish(22,'Svamp med stor hat',c)

    # 23: saguaro arms occupy different depth planes above a terracotta pot.
    c={};pot(c,'O');line(c,(0,0,2),(0,0,11),'G')
    line(c,(0,0,6),(-3,0,6),'G');line(c,(-3,0,6),(-3,0,9),'G')
    line(c,(0,0,7),(3,0,7),'g');line(c,(3,0,7),(3,1,10),'g')
    line(c,(0,0,4),(0,-2,4),'G');line(c,(0,-2,4),(0,-2,7),'G')
    for x,y,z in [(0,0,12),(-3,0,10),(3,1,11)]:
        c[x,y,z]='p';c[x-1,y,z]='p';c[x+1,y,z]='p';c[x,y-1,z]='Y'
    finish(23,'Kaktus i potte',c)

    # 24: open branching wood supports three leaf fans and red apples.
    c={};disk(c,0,0,0,4,3,'G');line(c,(0,0,0),(0,0,7),'N')
    for end in [(-3,0,7),(3,1,8),(0,-3,9)]:
        line(c,(0,0,5),end,'N')
        x,y,z=end
        disk(c,x,y,z,2,2,'G')
        line(c,(x,y,z),(x,y,z+1),'g')
        line(c,(x-1,y,z+1),(x+1,y,z+1),'G')
        c[x+1,y,z-1]='R';c[x-1,y,z-1]='R'
    finish(24,'Æbletræ',c)

    # 25: a large upright radial sunflower with a brown disk facing forward.
    c={};pot(c,'T');line(c,(0,0,2),(0,0,10),'G')
    leaf(c,(0,0,4),(-3,-1,6));leaf(c,(0,0,6),(3,1,8))
    for x in range(-2,3):
        for z in range(9,14):
            if x*x+(z-11)**2<=5:c[x,0,z]='N'
    for a,b in [(-3,11),(3,11),(0,8),(0,14),(-2,9),(2,9),(-2,13),(2,13)]:
        c[a,0,b]='Y'
        if a: c[a,0,b+1 if b<=11 else b-1]='Y'
        else:c[1,0,b]='Y';c[-1,0,b]='Y'
    line(c,(0,-1,10),(0,-1,12),'T');line(c,(0,1,10),(0,1,12),'N')
    finish(25,'Solsikke i potte',c)

    # 26: curved trunk and four separate palm fronds above a sandy island.
    c={};disk(c,0,0,0,4,3,'T');disk(c,0,0,0,2,1,'G')
    line(c,(0,0,0),(0,0,3),'N');line(c,(0,0,3),(1,0,6),'N')
    line(c,(1,0,6),(2,0,9),'N')
    for end in [(-2,0,8),(6,0,8),(2,-4,8),(2,4,8)]:
        line(c,(2,0,9),end,'G')
        x,y,z=end
        if y==0:line(c,(x,y-1,z),(x,y+1,z),'g')
        else:line(c,(x-1,y,z),(x+1,y,z),'g')
    c[1,0,8]='N';c[2,1,8]='N'
    finish(26,'Palme på en ø',c)

    # 27: a narrow hollow blue vase holds a layered rose.
    c={};disk(c,0,0,0,2,2,'B')
    for z in range(1,4):ring(c,1,z,'B')
    line(c,(0,0,0),(0,0,9),'G');leaf(c,(0,0,5),(-2,0,6))
    for z in (9,10):
        for x,y in [(-2,0),(-1,-1),(0,-2),(1,-1),(2,0),(1,1),(0,2),(-1,1)]:
            c[x,y,z]='R'
        line(c,(-2,0,z),(2,0,z),'R')
        line(c,(0,-2,z),(0,2,z),'R')
    line(c,(-1,0,11),(1,0,11),'p');line(c,(0,-1,11),(0,1,11),'R')
    finish(27,'Rose i vase',c)

    # 28: three blossoms branch in three dimensions from a common vase.
    c={};pot(c,'B')
    for end,color in [((-3,0,8),'p'),((3,1,9),'Y'),((0,-3,10),'P')]:
        line(c,(0,0,2),end,'G');x,y,z=end
        for dx,dy,dz in [(0,0,0),(-1,0,0),(1,0,0),(0,-1,0),(0,1,0),(0,0,1)]:
            c[x+dx,y+dy,z+dz]=color
        c[x,y,z]='O'
    leaf(c,(0,0,4),(2,2,6))
    finish(28,'Lille blomsterbuket',c)

    # 29: concentric stepped rock terraces and a bright recessed crater.
    c={};disk(c,0,0,0,4,4,'S')
    for r,z in [(3,1),(2,2),(1,3)]:
        ring(c,r,z,'N' if z<3 else 'K')
        for x,y in [(r,0),(-r,0),(0,r),(0,-r)]:
            c[x,y,z-1]='S'
            # The inward bridge supports the next terrace.
            if r>1:c[x-(1 if x>0 else -1 if x<0 else 0),y-(1 if y>0 else -1 if y<0 else 0),z]='S'
    c[0,0,3]='O';c[0,0,2]='R'
    line(c,(0,-1,3),(0,-4,0),'R')
    finish(29,'Vulkan',c)

    # 30: branching coral supports a small blue fish by its tail.
    c={};disk(c,0,0,0,4,3,'T')
    for start,end,color in [((-2,0,0),(-2,0,6),'R'),((1,1,0),(1,1,4),'P'),((0,-2,0),(0,-2,5),'O')]:
        line(c,start,end,color);x,y,z=end
        line(c,(x,y,z-2),(x-2,y,z-2),color)
        line(c,(x-2,y,z-2),(x-2,y,z-1),color)
        line(c,(x,y,z-1),(x+1,y,z-1),color)
    line(c,(-2,0,6),(0,0,6),'R')
    for x,z in [(0,6),(1,5),(1,6),(1,7),(2,5),(2,6),(2,7),(3,6),(4,6)]:c[x,0,z]='B'
    c[3,0,6]='K';c[2,-1,6]='b';c[2,1,6]='b'
    finish(30,'Koralrev',c)
    return result
