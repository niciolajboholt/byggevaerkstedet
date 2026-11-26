"""Ten small volumetric, stationary, piece-built vehicle models.
Coordinates are integer brick centers: X width, Y length/depth, Z up.
"""

def models():
    out=[]
    def model(n,name,build):
        c={}
        def box(x0,x1,y0,y1,z0,z1,color):
            for x in range(x0,x1+1):
                for y in range(y0,y1+1):
                    for z in range(z0,z1+1): c[x,y,z]=color
        def put(x,y,z,color): c[x,y,z]=color
        build(c,box,put)
        out.append(dict(number=n,name=name,theme='Køretøjer og skibe',cells=c))
    def roadwheels(b,axles,wide=2):
        # Stationary tires made entirely from ordinary black bricks.
        for x in (-wide,wide):
            for y in axles:b(x,x,y,y+1,0,1,'K')
    def car(c,b,p):
        roadwheels(b,(-3,2));b(-1,1,-4,4,1,1,'S')
        b(-1,1,-4,4,2,2,'R');b(-1,1,-1,1,3,3,'b')
        b(-1,1,-1,1,4,4,'R');b(0,0,-1,1,4,4,'W')
        b(-1,1,-5,-5,1,1,'S');p(-1,-4,2,'Y');p(1,-4,2,'Y')
        b(-1,1,4,4,3,3,'K');b(0,0,-4,-2,2,2,'W')
    model(11,'Lille racerbil',car)
    def sailboat(c,b,p):
        b(-1,1,-3,3,0,0,'B')
        for y in range(-5,6):
            w=0 if abs(y)==5 else 1 if abs(y)==4 else 2
            b(-w,w,y,y,1,1,'B')
            # A single-cell gunwale surrounds a shallow open hull.
            for x in range(-w,w+1):
                if abs(x)==w or abs(y)>=4:p(x,y,2,'W')
        b(0,0,-1,1,2,2,'N');b(0,0,0,0,3,10,'N')
        b(0,0,-3,3,4,4,'N')
        # Triangular cloth is one brick thick and joins mast and boom.
        for z in range(5,10):
            for y in range(1,10-z):p(0,y,z,'W')
        for z in range(5,8):
            for y in range(-(8-z),0):p(0,y,z,'R')
        p(0,1,10,'R');p(0,2,10,'R')
    model(12,'Sejlbåd',sailboat)
    def tractor(c,b,p):
        b(-1,1,-3,3,1,1,'g')
        for x in (-2,2):
            for dy,dz in [(0,0),(-1,1),(0,1),(1,1),(0,2)]:p(x,2+dy,dz,'K')
            b(x,x,-3,-2,0,1,'K');p(x,2,1,'Y');p(x,-2,1,'Y')
        b(-1,1,-3,-1,2,3,'G');b(-1,1,0,3,2,2,'G')
        for x in (-1,1):
            for y in (0,3):b(x,x,y,y,3,5,'G')
        b(-1,1,0,3,6,6,'G');b(-1,1,0,0,4,4,'b');b(-1,1,3,3,4,4,'b')
        b(1,1,-2,-2,4,6,'K');b(-1,1,-4,-4,1,1,'K')
        p(-1,-3,3,'Y');p(1,-3,3,'Y')
    model(13,'Traktor',tractor)
    def locomotive(c,b,p):
        roadwheels(b,(-4,-1,2));b(-1,1,-5,4,1,1,'R')
        # A plus-shaped boiler section gives a rounded volume without a solid block.
        for y in range(-4,1):
            for x,z in [(0,2),(-1,3),(0,3),(1,3),(0,4)]:p(x,y,z,'K')
        b(-1,1,1,4,2,2,'G')
        for x in (-1,1):
            for y in (1,4):b(x,x,y,y,3,5,'G')
        b(-1,1,1,4,6,6,'K');b(-1,1,1,1,4,4,'b')
        b(0,0,-3,-3,5,7,'K');b(-1,1,-3,-3,7,7,'K')
        p(0,-5,2,'Y');b(-2,2,-5,-5,1,1,'R')
    model(14,'Damplokomotiv',locomotive)
    def fireengine(c,b,p):
        roadwheels(b,(-4,2));b(-1,1,-5,4,1,2,'R')
        # Cab shell and equipment lockers support the roof ladder.
        b(-1,1,-5,-2,3,3,'b');b(-1,1,-5,-2,4,4,'R')
        b(-1,1,-1,4,3,3,'R')
        for y in (0,2,4):b(-1,1,y,y,3,3,'S')
        b(-1,-1,-3,4,5,5,'S');b(1,1,-3,4,5,5,'S')
        for y in (-3,-1,1,3):b(-1,1,y,y,5,5,'S')
        b(-1,1,4,4,4,4,'R');p(-1,-4,5,'B');p(1,-4,5,'B')
        p(-1,-5,2,'Y');p(1,-5,2,'Y');b(-1,1,-6,-6,1,1,'S')
    model(15,'Brandbil',fireengine)
    def helicopter(c,b,p):
        # Two long skids, four supports and a narrow belly.
        b(-2,-2,-3,3,0,0,'K');b(2,2,-3,3,0,0,'K')
        for y in (-2,2):b(-2,2,y,y,1,1,'S')
        b(-1,1,-2,2,2,2,'Y');b(-1,1,-3,2,3,3,'Y')
        b(-1,1,-2,1,4,4,'Y');b(-1,1,-3,-2,3,4,'b')
        b(0,0,3,7,3,3,'Y');b(0,0,7,7,4,5,'Y')
        b(-1,1,7,7,4,4,'K');b(0,0,0,0,5,7,'K')
        b(-5,5,0,0,7,7,'K');b(0,0,-4,4,7,7,'K')
        p(-5,0,7,'R');p(5,0,7,'R');p(0,-4,7,'R');p(0,4,7,'R')
    model(16,'Helikopter',helicopter)
    def formula(c,b,p):
        roadwheels(b,(-4,3));b(0,0,-6,5,1,1,'R')
        b(-1,1,-3,3,1,2,'R');b(-3,3,-6,-6,1,1,'R')
        b(-3,3,5,5,2,2,'R');b(-1,1,4,4,1,2,'R')
        b(-1,1,0,2,3,3,'R');p(0,0,3,'K');p(0,-1,3,'Y')
        b(0,0,-5,-2,2,2,'W');b(-1,1,3,3,3,3,'K')
    model(17,'Formelbil',formula)
    def pirate(c,b,p):
        b(-1,1,-4,4,0,0,'N')
        for y in range(-6,7):
            w=0 if abs(y)==6 else 1 if abs(y)==5 else 2
            b(-w,w,y,y,1,1,'N')
            for x in range(-w,w+1):
                if abs(x)==w or abs(y)>=5:p(x,y,2,'N')
        b(-1,1,2,4,2,2,'N');b(-1,1,3,4,3,3,'N')
        for y in (-2,2):
            b(0,0,y,y,2,9,'N');b(-2,2,y,y,7,7,'N')
            for z in (5,6,8):b(-2,2,y,y,z,z,'W')
        # Main flag, compact black skull mark, bow spar and cannons.
        b(0,0,-2,-2,10,10,'K');b(1,2,-2,-2,10,10,'K');p(1,-2,10,'W')
        b(0,0,-8,-6,2,2,'N')
        for x in (-3,3):
            for y in (-1,1):b(min(x,2 if x>0 else -2),max(x,2 if x>0 else -2),y,y,2,2,'K')
    model(18,'Piratskib',pirate)
    def titanic(c,b,p):
        # Long black hull, red waterline, white superstructure and exactly four funnels.
        for y in range(-8,9):
            w=0 if abs(y)==8 else 1 if abs(y)>=6 else 2
            b(-w,w,y,y,0,0,'R');b(-w,w,y,y,1,1,'K')
        b(-1,1,-6,6,2,2,'W');b(-1,1,-4,4,3,3,'W')
        b(0,0,-5,5,3,3,'W')
        for y in (-3,-1,1,3):
            b(0,0,y,y,4,5,'O');p(0,y,6,'K')
        for y in (-5,5):b(0,0,y,y,3,6,'N')
        for x in (-2,2):
            for y in (-3,0,3):p(x,y,2,'W')
        b(-1,1,-6,-6,3,3,'W')
    model(19,'Titanic i miniature',titanic)
    def rocket(c,b,p):
        # Freestanding stepped launch pad, service tower and a solidly seated rocket.
        b(-3,3,-2,2,0,0,'S');b(-2,2,3,3,0,0,'S')
        b(-1,1,-1,1,1,1,'R')
        for z in range(2,8):
            for x,y in [(0,0),(-1,0),(1,0),(0,-1),(0,1)]:p(x,y,z,'W')
        b(-1,1,0,0,8,8,'R');p(0,0,9,'R');p(0,0,10,'R')
        for x,y in [(-2,0),(2,0),(0,-2),(0,2)]:
            p(x,y,1,'R');p(x,y,2,'R')
        p(0,-1,6,'b');p(0,-1,5,'b')
        # A ladder-like launch tower touches the pad and a rocket-side gantry.
        for z in range(1,9):
            p(3,1,z,'S');p(3,-1,z,'S')
        for z in (2,4,6,8):b(3,3,-1,1,z,z,'S')
        b(1,3,0,0,6,6,'S')
    model(20,'Rumraket med rampe',rocket)
    return out

if __name__=='__main__':
    for m in models():
        c=m['cells']; seen={next(iter(c))};todo=list(seen)
        while todo:
            x,y,z=todo.pop()
            for q in ((x-1,y,z),(x+1,y,z),(x,y-1,z),(x,y+1,z),(x,y,z-1),(x,y,z+1)):
                if q in c and q not in seen:seen.add(q);todo.append(q)
        assert len(seen)==len(c),(m['name'],'disconnected',set(c)-seen)
        assert len(c)<=250,(m['name'],len(c))
        dims=tuple(max(q[a] for q in c)-min(q[a] for q in c)+1 for a in range(3))
        assert min(dims)>=3
        assert set(c.values())<=set('ROY GgBbPpWKNTSrA'.replace(' ',''))
        print(m['number'],m['name'],len(c),dims)
