const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {cells, brickCells, brickOutline, polygonArea, modelBounds, tilePosition} = require('../three/brick-geometry.cjs');
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/motiver.json'), 'utf8'));
const H = [[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,-1],[-1,1],[1,-1],[1,1]];
const key = p => p.join(',');
function contains(polygon, x, y) {
  let inside = false;
  for (let i=0,j=polygon.length-1; i<polygon.length; j=i++) {
    const a=polygon[i], b=polygon[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}

test('both Plus-Plus outlines enclose exactly the nine source squares, including concave notches', () => {
  for (const o of ['h','v']) {
    const outline = brickOutline(o), expected = o==='h'?H:H.map(([x,y])=>[y,x]);
    assert.equal(polygonArea(outline), 9);
    assert.equal(outline.length,20);
    assert.deepEqual(cells(o),expected);
    const occupied = new Set(expected.map(key));
    for (let x=-3;x<=3;x++) for (let y=-3;y<=3;y++) {
      assert.equal(contains(outline,x+.5,y+.5),occupied.has(`${x},${y}`), `${o} at ${x},${y}`);
    }
    const inset = brickOutline(o,.04);
    assert.ok(polygonArea(inset)<9 && polygonArea(inset)>8);
    for (const [x,y] of expected) assert.ok(contains(inset,x+.5,y+.5));
    for (let i=0;i<inset.length;i++) {
      const a=inset[i], b=inset[(i+1)%inset.length];
      assert.ok(a[0]===b[0] || a[1]===b[1], 'inset keeps axis-aligned edges');
    }
  }
});

test('brick placement uses exact flat-instruction coordinates and orientation bounds', () => {
  assert.deepEqual(tilePosition({x:2,y:3}),[7,10]);
  assert.deepEqual(modelBounds([{x:0,y:0,o:'h'}]),{minX:-1,minY:0,maxX:4,maxY:3});
  assert.deepEqual(modelBounds([{x:0,y:0,o:'v'}]),{minX:0,minY:-1,maxX:3,maxY:4});
  assert.deepEqual(modelBounds([]),null);
  assert.throws(()=>brickOutline('bad'));
  assert.throws(()=>brickOutline('h',.5));
  assert.throws(()=>tilePosition({x:NaN,y:0}));
});

test('all 750 variants preserve every source brick, colour, orientation, square, and overall bounds', () => {
  let variants=0;
  for (const model of raw.models) for (const variant of Object.values(model.variants)) {
    variants++;
    const tiles=[], expected=new Set(), colourCounts={};
    for (let y=0;y<variant.p.length;y++) for (let x=0;x<variant.p[y].length;x++) {
      const c=variant.p[y][x];
      if (c==='.') continue;
      tiles.push({x,y,c,o:(x+y)%2?'v':'h'});
      colourCounts[c]=(colourCounts[c]||0)+1;
      for (const [dx,dy] of H) {
        const [a,b]=(x+y)%2?[dy,dx]:[dx,dy];
        const square=`${3*x+1+a},${3*y+1+b}`;
        assert.ok(!expected.has(square), model.id+' source overlaps');
        expected.add(square);
      }
    }
    const actual=new Set(), actualColours={};
    for (const tile of tiles) {
      actualColours[tile.c]=(actualColours[tile.c]||0)+1;
      for (const square of brickCells(tile)) {
        assert.ok(!actual.has(key(square)),model.id+' rendered overlap');
        actual.add(key(square));
      }
    }
    assert.equal(tiles.length,variant.p.join('').replace(/\./g,'').length,model.id);
    assert.deepEqual(actualColours,colourCounts);
    assert.equal(actual.size,tiles.length*9);
    assert.deepEqual(actual,expected,model.id+' exact geometry');
    const all=[...expected].map(p=>p.split(',').map(Number));
    assert.deepEqual(modelBounds(tiles),{
      minX:Math.min(...all.map(p=>p[0])),minY:Math.min(...all.map(p=>p[1])),
      maxX:Math.max(...all.map(p=>p[0]))+1,maxY:Math.max(...all.map(p=>p[1]))+1
    });
  }
  assert.equal(variants,750);
});
