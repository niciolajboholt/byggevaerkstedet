"""Original compact architectural sculptures on a nominal brick-centre grid."""
def models():
 out=[]
 def new(n,name):return {'number':n,'name':name,'theme':'Små verdener','cells':{}}
 def box(m,x0,x1,y0,y1,z0,z1,c,shell=False):
  for x in range(x0,x1+1):
   for y in range(y0,y1+1):
    for z in range(z0,z1+1):
     if not shell or x in (x0,x1) or y in (y0,y1) or z in (z0,z1):m['cells'][x,y,z]=c
 def roof(m,x0,x1,y0,y1,z,c):
  while x0<=x1 and y0<=y1:
   box(m,x0,x1,y0,y1,z,z,c);x0+=1;x1-=1;y0+=1;y1-=1;z+=1
 m=new(31,'Lille sommerhus');box(m,0,4,0,4,0,3,'Y',True);box(m,2,2,0,0,0,2,'K');box(m,0,0,1,2,2,2,'b');box(m,4,4,1,2,2,2,'b');roof(m,0,4,0,4,4,'R');out.append(m)
 m=new(32,'Telt med lejrbål');box(m,0,6,0,4,0,0,'G')
 for z in range(1,4):
  for x in {z-1,z,6-z,7-z}:
   if 0<=x<=6:box(m,x,x,1,4,z,z,'O')
 # Shared ground connects the separate fire to the tent.
 box(m,7,8,1,3,0,0,'N');box(m,7,8,2,2,1,1,'R');box(m,7,7,2,2,2,2,'Y');out.append(m)
 m=new(33,'Fyrtårn');box(m,0,4,0,4,0,0,'S');box(m,1,3,1,3,1,5,'W',True);box(m,1,3,1,3,3,3,'R');box(m,0,4,0,4,6,6,'R');box(m,1,3,1,3,7,7,'Y',True);roof(m,0,4,0,4,8,'R');m['cells'].pop((2,2,3),None);out.append(m)
 m=new(34,'Borgtårn');box(m,0,4,0,4,0,4,'S',True);box(m,2,2,0,0,0,2,'K')
 for x in (0,2,4):
  for y in (0,4):box(m,x,x,y,y,5,5,'S')
 for y in (0,2,4):
  for x in (0,4):box(m,x,x,y,y,5,5,'S')
 out.append(m)
 m=new(35,'Bro over en å');box(m,0,8,0,4,0,0,'B');box(m,0,1,1,3,1,2,'S');box(m,7,8,1,3,1,2,'S');box(m,0,8,1,3,3,3,'N')
 for y in (1,3):
  box(m,0,8,y,y,4,4,'N')
 out.append(m)
 m=new(36,'Lille togstation');box(m,0,7,0,5,0,0,'S');box(m,1,5,1,4,1,3,'Y',True);box(m,3,3,1,1,1,2,'K');box(m,1,1,2,3,2,2,'b');box(m,5,5,2,3,2,2,'b');roof(m,1,5,1,4,4,'R');out.append(m)
 m=new(37,'Træhytte');box(m,0,4,0,4,0,0,'G');box(m,2,2,2,2,1,2,'N');box(m,0,4,0,4,3,3,'N');box(m,1,3,1,3,4,5,'N',True);box(m,2,2,1,1,4,4,'K');roof(m,0,4,0,4,6,'g')
 # A stair beside the trunk supports one edge of the raised platform.
 for z in range(1,4):box(m,0,z-1,0,0,z,z,'A')
 out.append(m)
 m=new(38,'Japansk pagode');box(m,0,4,0,4,0,0,'S');box(m,1,3,1,3,1,2,'R',True);box(m,0,4,0,4,3,3,'B');box(m,1,3,1,3,4,5,'R',True);roof(m,0,4,0,4,6,'B');box(m,2,2,2,2,9,9,'Y');out.append(m)
 m=new(39,'Troldmandstårn');box(m,0,4,0,4,0,0,'G');box(m,1,3,1,3,1,5,'S',True);box(m,1,1,2,2,2,2,'b');box(m,3,3,2,2,4,4,'b');roof(m,0,4,0,4,6,'P');out.append(m)
 m=new(40,'Mini-fodboldstadion');box(m,0,8,0,6,0,0,'G');box(m,0,8,0,0,1,1,'S');box(m,0,8,6,6,1,1,'S');box(m,0,0,1,5,1,1,'S');box(m,8,8,1,5,1,1,'S');box(m,0,8,0,0,2,2,'B');box(m,0,8,6,6,2,2,'B');box(m,0,0,1,5,2,2,'B');box(m,8,8,1,5,2,2,'B')
 box(m,4,4,1,5,0,0,'W');box(m,1,1,2,4,1,1,'W');box(m,7,7,2,4,1,1,'W');out.append(m)
 return out
if __name__=='__main__':
 for m in models():print(m['number'],m['name'],len(m['cells']))
