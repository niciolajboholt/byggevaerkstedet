'use strict';

// Coordinates are the same unit-square corners used by the flat instructions.
const H = Object.freeze([[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,-1],[-1,1],[1,-1],[1,1]].map(Object.freeze));
function cells(orientation = 'h') {
  if (orientation !== 'h' && orientation !== 'v') throw new TypeError('Invalid brick orientation');
  return H.map(([x,y]) => orientation === 'h' ? [x,y] : [y,x]);
}
function tilePosition(tile) {
  if (!Number.isFinite(tile.x) || !Number.isFinite(tile.y)) throw new TypeError('Invalid brick position');
  return [3 * tile.x + 1, 3 * tile.y + 1];
}
function brickCells(tile) {
  const [x,y] = tilePosition(tile);
  return cells(tile.o).map(([dx,dy]) => [x + dx,y + dy]);
}
function polygonArea(points) {
  return points.reduce((sum,p,i) => {
    const q = points[(i + 1) % points.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  },0) / 2;
}
function brickOutline(orientation = 'h', inset = 0) {
  if (!Number.isFinite(inset) || inset < 0 || inset >= .25) throw new RangeError('Invalid brick inset');
  const squares = cells(orientation), occupied = new Set(squares.map(p => p.join(','))), edges = new Map();
  for (const [x,y] of squares) {
    if (!occupied.has(`${x},${y-1}`)) edges.set(`${x},${y}`,[x+1,y]);
    if (!occupied.has(`${x+1},${y}`)) edges.set(`${x+1},${y}`,[x+1,y+1]);
    if (!occupied.has(`${x},${y+1}`)) edges.set(`${x+1},${y+1}`,[x,y+1]);
    if (!occupied.has(`${x-1},${y}`)) edges.set(`${x},${y+1}`,[x,y]);
  }
  const first = edges.keys().next().value, boundary = [];
  let key = first;
  do {
    boundary.push(key.split(',').map(Number));
    const next = edges.get(key);
    if (!next || boundary.length > edges.size) throw new Error('Invalid brick boundary');
    key = next.join(',');
  } while (key !== first);
  const points = boundary.filter((p,i) => {
    const a = boundary[(i + boundary.length - 1) % boundary.length], b = boundary[(i + 1) % boundary.length];
    return (p[0]-a[0])*(b[1]-p[1]) !== (p[1]-a[1])*(b[0]-p[0]);
  });
  // All corners are right angles; the sum of the inward edge normals is
  // the exact intersection of the two offset lines, including concave corners.
  return points.map((p,i) => {
    const a = points[(i + points.length - 1) % points.length], b = points[(i + 1) % points.length];
    const before = Math.hypot(p[0]-a[0],p[1]-a[1]), after = Math.hypot(b[0]-p[0],b[1]-p[1]);
    return [p[0] + inset * (-(p[1]-a[1])/before - (b[1]-p[1])/after),
      p[1] + inset * ((p[0]-a[0])/before + (b[0]-p[0])/after)];
  });
}
function modelBounds(tiles) {
  if (!tiles.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const tile of tiles) for (const [x,y] of brickCells(tile)) {
    minX = Math.min(minX,x); minY = Math.min(minY,y);
    maxX = Math.max(maxX,x+1); maxY = Math.max(maxY,y+1);
  }
  return {minX,minY,maxX,maxY};
}
module.exports = {cells,tilePosition,brickCells,brickOutline,polygonArea,modelBounds};
