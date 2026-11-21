# Authored geometric layout based on the supplied visual reference.
# The attachment is not used as a pixel source; every output cell is one brick.
from PIL import Image, ImageDraw
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
W,H=1000,1240
im=Image.new('L',(W,H),0);d=ImageDraw.Draw(im)
codes={'.':0,'K':1,'Y':2,'r':3,'R':4,'S':5,'W':6,'A':7,'p':8}
def poly(points,c,outline=None,width=22):
 d.polygon(points,fill=codes[c])
 if outline:d.line(points+[points[0]],fill=codes[outline],width=width,joint='curve')
def line(points,c,width):d.line(points,fill=codes[c],width=width,joint='curve')
def ellipse(box,c):d.ellipse(box,fill=codes[c])
# Flowing red/gold mantling, behind the helmet and shield.
left=[(445,190),(390,210),(355,245),(300,225),(255,205),(205,220),(160,245),(125,280),(105,325),(110,385),(78,440),(65,490),(100,555),(135,595),(175,625),(155,685),(180,735),(170,790),(195,840),(195,895),(235,950),(280,980),(340,945),(355,835),(355,470),(425,415),(470,270)]
poly(left,'K')
poly([(1000-x,y) for x,y in left],'K')
# Feathered gold flourishes at the shoulders.
for pts in [
 [(130,290),(165,235),(210,220),(245,245),(230,215),(280,225),(305,260),(340,270),(275,280),(220,265),(190,285)],
 [(300,285),(250,305),(185,310),(145,335),(160,300),(205,285)],
 [(210,595),(255,630),(275,675),(245,705),(195,710),(170,685),(175,650),(205,635),(225,650),(210,680),(235,675),(240,655)],
 [(225,910),(275,930),(310,960),(280,990),(240,975),(255,950),(225,945)]
]:
 poly(pts,'Y','K',14);poly([(1000-x,y) for x,y in pts],'Y','K',14)
# Layered red leaves leave black gaps between the curls.
for pts in [
 [(425,210),(390,260),(355,295),(320,320),(370,305),(390,285),(380,335),(340,365),(295,385),(325,345),(285,365),(255,370),(300,325),(340,280)],
 [(160,320),(195,335),(220,375),(215,410),(180,445),(140,455),(170,420),(175,390),(150,375),(140,395),(115,385),(110,350),(125,330)],
 [(250,355),(265,400),(240,445),(200,475),(155,480),(190,455),(215,420)],
 [(110,425),(120,465),(155,485),(185,490),(160,525),(135,545),(150,510),(120,495),(105,520),(90,555),(95,490)],
 [(175,505),(200,530),(230,550),(240,590),(220,575),(195,560),(205,595),(175,580),(155,545)],
 [(280,400),(330,390),(375,360),(350,405),(315,430),(285,440)],
 [(225,740),(255,780),(260,825),(280,855),(270,900),(245,875),(240,835),(215,860),(210,815)],
 [(280,820),(305,850),(325,890),(315,930),(295,910),(285,880)]
]:
 poly(pts,'r');poly([(1000-x,y) for x,y in pts],'r')
# Gold crest above the helmet: a pointed sun/moon ornament.
poly([(470,160),(505,30),(530,30),(575,105),(590,75),(615,130),(650,155),(620,175),(630,200),(535,205)],'Y','K',18)
poly([(510,82),(535,130),(550,180),(500,155)],'A','K',12)
ellipse((455,78,535,168),'K');ellipse((460,85,525,162),'Y')
poly([(458,116),(490,109),(480,135),(458,140)],'K')
# Helmet and visor, connected to the shield below.
poly([(440,198),(510,183),(565,205),(580,262),(573,320),(625,395),(584,456),(493,483),(430,428),(435,355),(420,292)],'S','K',24)
poly([(449,210),(473,220),(459,265),(442,255)],'W','K',14)
poly([(432,279),(473,294),(548,275),(551,296),(474,316),(430,302)],'K')
line([(435,331),(475,344),(534,328)],'K',15)
line([(447,352),(461,402),(441,431)],'K',14)
poly([(544,315),(570,317),(590,353),(558,342)],'K')
for y in [335,357,379]:line([(548,y),(564,y+4)],'W',11)
# Red twisted torse across the helmet.
poly([(416,194),(435,168),(470,163),(485,153),(515,161),(545,154),(565,170),(596,172),(615,192),(610,211),(575,216),(545,205),(510,213),(475,204),(440,217),(418,211)],'r','K',14)
line([(438,182),(470,190),(490,176),(520,190),(545,176),(575,194)],'R',14)
# Outer shield, gold rim and quartered red/gold field.
outer=[(278,447),(508,416),(754,447),(748,667),(721,817),(662,923),(579,1007),(518,1057),(428,1000),(350,918),(304,797),(284,641)]
poly(outer,'Y','K',26)
inner=[(303,471),(511,444),(729,472),(723,667),(697,805),(640,906),(565,982),(518,1024),(444,977),(372,900),(328,787),(310,639)]
mask=Image.new('1',(W,H));md=ImageDraw.Draw(mask);md.polygon(inner,fill=1)
quarters=Image.new('L',(W,H),codes['r']);qd=ImageDraw.Draw(quarters)
qd.rectangle((519,0,W,699),fill=codes['Y']);qd.rectangle((0,700,518,H),fill=codes['Y'])
im.paste(quarters,(0,0),mask);d=ImageDraw.Draw(im)
line(inner+[inner[0]],'K',14)
# Curled tail, behind the body; the dark outline separates gold from gold.
tail=[(580,800),(674,803),(698,773),(680,731),(651,692),(627,647),(625,603),(647,555),(680,537),(708,542),(726,565),(726,600),(709,643),(689,669)]
line(tail,'K',40);line(tail,'A',22)
poly([(680,825),(705,854),(698,886),(678,867),(672,846)],'A','K',14)
# Raised lion, facing left. Continuous silhouette: head, lifted paws, body and hind feet.
lion=[(575,464),(551,474),(532,461),(515,485),(486,495),(471,514),(448,532),(458,550),(482,550),(495,541),(509,552),(514,568),(490,581),(468,580),(457,565),(457,590),(482,600),(512,589),(520,619),(453,612),(411,592),(398,571),(380,558),(390,538),(390,514),(376,503),(370,533),(357,535),(349,507),(335,500),(335,521),(346,544),(329,540),(314,555),(326,573),(347,574),(352,601),(375,615),(387,631),(424,644),(457,655),(469,677),(427,691),(391,678),(365,666),(367,648),(351,638),(342,652),(330,653),(320,645),(316,659),(330,673),(312,679),(305,694),(320,709),(352,716),(389,726),(432,725),(467,710),(490,716),(491,751),(514,786),(494,821),(464,837),(438,824),(435,808),(416,795),(404,805),(408,825),(394,821),(387,836),(401,853),(394,869),(410,884),(433,879),(471,893),(518,875),(541,854),(547,900),(523,930),(503,931),(493,920),(478,928),(483,945),(469,957),(484,970),(511,969),(536,981),(559,961),(576,940),(582,909),(594,875),(611,855),(601,823),(596,792),(606,767),(594,739),(603,714),(586,685),(605,658),(595,629),(610,598),(595,573),(605,547),(590,528),(604,503),(583,492)]
# Mane and rear shadow sit slightly outside the golden contour.
poly([(564,455),(601,467),(621,491),(613,514),(637,536),(625,561),(638,590),(624,619),(641,646),(624,680),(637,715),(618,747),(628,780),(617,824),(632,855),(610,898),(590,936),(562,941),(563,837),(550,741),(541,638),(548,550)],'K')
poly(lion,'A','K',18)
# Gold highlights make the foreleg and chest readable.
line([(542,608),(532,644),(510,674)],'Y',17)
line([(564,689),(554,733),(570,775),(564,820)],'Y',16)
line([(420,622),(465,635),(493,628)],'Y',14)
ellipse((531,501,549,518),'K')
poly([(459,561),(468,573),(493,570),(485,582),(462,583),(450,573)],'p')
# Silver claws on raised and lower paws.
for x,y in [(329,499),(373,502),(315,551),(313,645),(303,684),(403,796),(387,835),(474,930),(468,954)]:
 poly([(x-8,y+4),(x,y-9),(x+13,y-4),(x+3,y+10)],'S')
# Gold scroll under the shield, no lettering at this brick scale.
# A dark fastening behind the scroll joins it to the shield point.
line([(518,1038),(518,1065)],"K",55)
def ribbon(points,c,outline,width):poly([(x,y-70) for x,y in points],c,outline,width)
ribbon([(276,1014),(320,1033),(310,1061),(288,1074),(315,1096),(406,1127),(514,1137),(625,1117),(721,1082),(705,1055),(694,1035),(740,1017),(779,1033),(805,1080),(785,1129),(731,1165),(638,1194),(524,1210),(411,1196),(320,1166),(255,1127),(234,1090),(245,1047)],'Y','K',22)
line([(x,y-70) for x,y in [(278,1096),(355,1132),(445,1158),(535,1165),(645,1146),(748,1108)]],'A',18)
# Discretize the authored composition into complete brick slots.
cols,rows=49,61
rev={v:k for k,v in codes.items()}
grid=[[rev[im.getpixel((int((x+.5)*W/cols),int((y+.5)*H/rows)))] for x in range(cols)] for y in range(rows)]
# Drop isolated one-cell tips caused by discretizing ornamental flourishes.
occupied={(x,y) for y,row in enumerate(grid) for x,c in enumerate(row) if c!='.'}
components=[]
while occupied:
 start=occupied.pop();comp={start};pending=[start]
 while pending:
  x,y=pending.pop()
  for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
   n=(x+dx,y+dy)
   if n in occupied:occupied.remove(n);comp.add(n);pending.append(n)
 components.append(comp)
components.sort(key=len,reverse=True)
print('Components:',[len(c) for c in components])
for comp in components[1:]:
 if len(comp)>12:raise ValueError('A major ornament needs a physical connection')
 for x,y in comp:grid[y][x]='.'
while all(c=='.' for c in grid[0]):grid.pop(0)
while all(c=='.' for c in grid[-1]):grid.pop()
p=[''.join(r) for r in grid]
rows=len(p)
html=(root/'index.html').read_text()
if 'r:["Mørkerød"' not in html:html=html.replace('const COLORS = {','const COLORS = {\n  r:["Mørkerød","#941b2b"], A:["Okkerguld","#c59616"],')
lines=html.splitlines()
for i,l in enumerate(lines):
 if l.strip().startswith('{"id": "loeveskjold"'):
  b=json.loads(l.strip().rstrip(','));b.update(name='Løvens våbenskjold',description='Våbenskjold efter billedreferencen: rød/gul firedeling, oprejst gylden løve med løftede poter og buet hale, sølvgrå hjelm, rødt løvværk og gyldent bånd. En detaljeret Plus-Plus-fortolkning uden tekst.',tip='Stort projekt: byg ornamenter og hjelm øverst som små dele, der samles med skjoldet længere nede. Rød/gul firedeling danner baggrunden; okkerguld og sort tegner den hele løve. Slut med det gyldne bånd.',p=p)
  lines[i]=' '+json.dumps(b,ensure_ascii=False)+','
(root/'index.html').write_text('\n'.join(lines)+'\n')
print('Bricks:',sum(c!='.' for r in p for c in r),'Size:',cols,rows)
