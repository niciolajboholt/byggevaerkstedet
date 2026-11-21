"""Rebuild the four house shields within the maximum of 250 whole bricks."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPANS = [(1,15)] + [(0,16)]*7 + [(1,15)]*2 + [(2,14)]*2 + [(3,13)]*2 + [(4,12),(5,11),(6,10),(7,9),(8,8)]
LION = [
    '......AAA....',
    '.....AAKAA...',
    '....AAAAAA...',
    '.A..AKKAAA...',
    '.AAAA.AAAA.A.',
    '..AAA.AAAA.A.',
    '.AAAAAAA...A.',
    '.AA...AAA.AA.',
    '......AAAAA..',
    '...AAAAAAA...',
    '..AAA.AAAA...',
    '......AAA....',
    '.....AAAA....',
]
SPECS = [
    ('loeveskjold', 'Løvens våbenskjold', 'r', 'Y', LION,
     'Rød/gul firedeling med en hel oprejst løve, løftede poter og buet hale. Skjoldet er forenklet efter billedreferencen og bygget uden hjelm og ydre ornamenter for at holde sig under 250 brikker.',
     'Byg den gyldne skjoldkant og den firedelte baggrund række for række. Okkerguld er løven, og sort adskiller den fra de gule felter. Slut med skjoldets spids.'),
    ('slangeskjold', 'Slangens kollegieskjold', 'g', 'S', [
        '.....SSSSS...', '...SSSWWKWS..', '..SSS.WWWWS..', '..SSS........', '..SSSS.......', '...SSSSS.....', '.....SSSSS...', '.......SSSS..', '........SSS..', '........SSS..', '..SS...SSSS..', '..SSSSSSSS...', '....SSSS.....'],
     'Et grønt skjold med sølvgrå kant og en snoet sølvgrå slange. Kompakt Plus-Plus-fortolkning uden tekst.',
     'Byg den sølvgrå kant omkring det grønne felt. Slangen slynger sig som et S. Hvid og sort markerer hovedet og øjet.'),
    ('oerneskjold', 'Ørnens kollegieskjold', 'B', 'N', [
        '.....NNN.....', '.....NKN.....', 'N....NYN....N', 'NN...NNN...NN', 'NNN..NNN..NNN', 'NNNNNNNNNNNNN', '.NNNNNNNNNNN.', '..NNNNNNNNN..', '...NNNNNNN...', '....NNNNN....', '....YNNNY....', '.....NNN.....', '....NNNNN....'],
     'Et blåt skjold med bronze repræsenteret af brunt og en ørn med udbredte vinger. Kompakt Plus-Plus-fortolkning uden tekst.',
     'Byg den brune kant og de brede ørnevinger. Bevar de blå mellemrum mellem fjerene. Den gule brik i hovedet er næbbet.'),
    ('graevlingeskjold', 'Grævlingens kollegieskjold', 'Y', 'K', [
        '..KK.....KK..', '.KWWK...KWWK.', '.KWWWKKKWWWK.', '.KKWWKKKWWKK.', 'KKKWWKKKWWKKK', 'KKWKWKKKWKWKK', 'KKWWWKKKWWWKK', '.KKWWKKKWWKK.', '.KKWWWWWWWKK.', '..KKWWWWWKK..', '...KWWKWWK...', '....WWKWW....', '.....WWW.....'],
     'Et gult skjold med sort kant og et grævlingehoved med sorte og hvide striber. Kompakt Plus-Plus-fortolkning uden tekst.',
     'Byg den sorte kant omkring den gule baggrund. Hvide striber går ned fra ørerne. Slut med snuden og skjoldets spids.'),
]


def patterns():
    mask = {(x,y) for y,(left,right) in enumerate(SPANS) for x in range(left,right+1)}
    neighbours = [(1,0),(-1,0),(0,1),(0,-1)]
    border_cells = {(x,y) for x,y in mask if any((x+dx,y+dy) not in mask for dx,dy in neighbours)}
    for id, name, bg, border, motif, description, tip in SPECS:
        grid = [['.']*17 for _ in SPANS]
        for x,y in mask:
            grid[y][x] = border if (x,y) in border_cells else (('r' if (x<8)==(y<9) else 'Y') if id=='loeveskjold' else bg)
        art = {}
        for my,row in enumerate(motif):
            assert len(row)==13, (id,my,len(row))
            for mx,c in enumerate(row):
                x,y=mx+2,my+2
                if c!='.':
                    assert (x,y) in mask and (x,y) not in border_cells, (id,x,y)
                    art[x,y]=c
        if id=='loeveskjold':
            for x,y in art:
                for dx,dy in neighbours:
                    n=x+dx,y+dy
                    if n in mask and n not in border_cells and n not in art:
                        grid[n[1]][n[0]]='K'
        for (x,y),c in art.items():
            grid[y][x]=c
        p=[''.join(row) for row in grid]
        assert sum(c!='.' for row in p for c in row)<=250
        yield dict(id=id,name=name,cat='Magi',description=description,tip=tip,p=p)


def main():
    path=ROOT/'index.html'
    models={b['id']:b for b in patterns()}
    lines=path.read_text().splitlines()
    updated=set()
    for i,line in enumerate(lines):
        if not line.lstrip().startswith('{"id": '):
            continue
        old=json.loads(line.strip().rstrip(','))
        if old['id'] in models:
            new=models[old['id']]
            lines[i]=' '+json.dumps(new,ensure_ascii=False)+','
            updated.add(old['id'])
    assert updated==set(models), 'Each existing shield must be replaced'
    path.write_text('\n'.join(lines)+'\n')
    for b in models.values():
        print(b['name'],sum(c!='.' for row in b['p'] for c in row),'brikker')


if __name__=='__main__':
    main()
