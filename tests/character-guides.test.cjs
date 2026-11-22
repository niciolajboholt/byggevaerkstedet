const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const html = readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const catalogueData=JSON.parse(readFileSync(new URL('../data/motiver.json', `file://${__filename}`),'utf8'));
const context = vm.createContext({catalogueData, localStorage: { getItem: () => null } });
vm.runInContext(script.slice(0, script.indexOf('// ---------- list ----------')) + '\nBUILDS.push(...catalogueData.models.map(enrich));CATS.push(...catalogueData.categories);catalogueReady=true;this.models=BUILDS;this.palette=COLORS;this.squares=brickSquares;', context);
const ids = ['roed-kasket', 'groen-kasket', 'lyseroed-prinsesse', 'groen-dinosaur', 'pigget-skildpaddekonge', 'svampehat'];

const magicIds = ["loeveskjold", "slangeskjold", "oerneskjold", "graevlingeskjold", "troldmand-med-briller", "troldkvinde-med-boelget-haar", "roedhaaret-troldmand", "sneugle", "talende-hat", "gylden-vingebold", "troldmandsborg", "flyvende-kost"];
const themeCategories = {"lynmus": "Pokémon", "ildfirben": "Pokémon", "vand-skildpadde": "Pokémon", "froevaesen": "Pokémon", "roed-hvid-fangebold": "Pokémon", "brun-raev": "Pokémon", "groent-blokmonster": "Minecraft", "blokbygger": "Minecraft", "blokgris": "Minecraft", "diamantsvaerd": "Minecraft", "diamanthakke": "Minecraft", "graesblok": "Minecraft"};
const approved=JSON.parse(readFileSync(new URL("../data/approved-motifs-50.json", `file://${__filename}`), "utf8"));
const approvedId=b=>`motiver50-${String(b.number).padStart(2,"0")}`;
const approvedById=new Map(approved.models.map(b=>[approvedId(b),b]));
const guideIds = ids.concat(magicIds, Object.keys(themeCategories), [...approvedById.keys()]);

test('catalogue allows 300 bricks only for club crests and 250 for all other themes', () => {
  for (const b of context.models) {
    const limit=b.cat==='Klublogoer'?300:250;
    assert.ok(b.total > 0 && b.total <= limit, `${b.id}: ${b.total} bricks exceeds ${limit}`);
  }
});

test('catalogue has unique IDs and descriptive character and magic guides', () => {
  assert.equal(new Set(context.models.map(b => b.id)).size, context.models.length);
  for (const id of guideIds) {
    const b = context.models.find(b => b.id === id);
    assert.ok(b, id);
    assert.equal(b.cat, approvedById.get(id)?.group || themeCategories[id] || (magicIds.includes(id) ? 'Magi' : 'Figurer'));
    assert.ok(b.description && b.tip);
    assert.doesNotMatch(JSON.stringify(b), /mario|luigi|peach|yoshi|bowser|toad|nintendo|harry|potter|hermione|ron weasley|hedwig|hogwarts/i);
  }
});

test('Magi contains the previous twelve guides and five approved additions', () => {
  vm.runInContext('this.categories=CATS', context);
  assert.equal(context.categories.filter(c => c === 'Magi').length, 1);
  assert.deepEqual(Array.from(context.models.filter(b => b.cat === 'Magi'), b => b.id).sort(), magicIds.concat(approved.models.filter(b=>b.group==='Magi').map(approvedId)).sort());
});

for (const category of ['Pokémon', 'Minecraft']) test(`${category} retains its six guides and five approved additions`, () => {
  assert.equal(context.categories.filter(c => c === category).length, 1);
  const actual = Array.from(context.models.filter(b => b.cat === category), b => b.id).sort();
  assert.equal(actual.length, 11);
  assert.deepEqual(actual, Object.keys(themeCategories).filter(id => themeCategories[id] === category).concat(approved.models.filter(b=>b.group===category).map(approvedId)).sort());
});

const animals = JSON.parse(readFileSync(new URL('../data/approved-animals-20.json', `file://${__filename}`), 'utf8'));
const halloween = JSON.parse(readFileSync(new URL('../data/approved-halloween-40.json', `file://${__filename}`), 'utf8'));
const carsAndLogos = JSON.parse(readFileSync(new URL('../data/approved-cars-and-logos-20.json', `file://${__filename}`), 'utf8'));
const themes62 = JSON.parse(readFileSync(new URL('../data/approved-themes-62.json', `file://${__filename}`), 'utf8'));
for (const id of guideIds.concat(themes62.models.map(b=>b.id),animals.models.map(b=>b.id),halloween.models.map(b=>b.id),carsAndLogos.models.map(b=>b.id))) test(`${id}: whole bricks, no overlap, connected model, exact parts and row instructions`, () => {
  const b = context.models.find(b => b.id === id);
  const width = b.p[0].length;
  assert.match(b.p[0], /[^.]/, 'the first instruction places at least one brick');
  assert.match(b.p[b.p.length - 1], /[^.]/, 'the last instruction places at least one brick');
  const limit = 24;
  assert.ok(width <= limit && b.p.length <= limit, 'fits the supported guide dimensions');
  assert.ok(b.p.every(row => row.length === width), 'rectangular pattern');
  for (const row of b.p) for (const c of row) assert.ok(c === '.' || context.palette[c], `known colour ${c}`);
  const occupied = new Set();
  const positions = new Set(b.tiles.map(k => `${k.x},${k.y}`));
  const counts = {};
  for (const k of b.tiles) {
    counts[k.c] = (counts[k.c] || 0) + 1;
    assert.equal(k.o, (k.x + k.y) % 2 ? 'v' : 'h');
    const cells = context.squares(k);
    assert.equal(cells.length, 9);
    for (const [x, y] of cells) {
      const key = `${x},${y}`;
      assert.ok(!occupied.has(key), `overlapping brick at ${key}`);
      occupied.add(key);
    }
  }
  // Orthogonal neighbours on this alternating 3-unit lattice interlock.
  const seen = new Set();
  const pending = [b.tiles[0]];
  while (pending.length) {
    const { x, y } = pending.pop();
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (positions.has(`${x+dx},${y+dy}`)) pending.push({x:x+dx, y:y+dy});
    }
  }
  assert.equal(seen.size, b.total, 'all bricks interlock into one model');
  assert.equal(b.total, b.p.join('').replace(/\./g, '').length);
  assert.equal(b.total, Object.values(counts).reduce((sum, n) => sum + n, 0));
  assert.equal(JSON.stringify(counts), JSON.stringify(b.counts));
  // Execute the same row grouping function as the UI.
  vm.runInContext(script.match(/function rowRuns\(b,y\)\{[\s\S]*?\n\}/)[0], context);
  for (let y = 0; y < b.p.length; y++) {
    const runs = context.rowRuns(b, y);
    assert.equal(runs.map(([c,n]) => c.repeat(n)).join('').padEnd(width, '.'), b.p[y]);
  }
  console.log(`${b.name}: ${b.total} bricks, ${b.p.length} rows, ${Object.keys(counts).length} colours`);
});


test('all 50 approved motifs keep the collage geometry, names, levels, counts and numbering', () => {
  assert.equal(approved.models.length, 50);
  const added=context.models.filter(b=>b.collection==='motiver-50');
  assert.equal(added.length, 50);
  assert.deepEqual(Array.from(added,b=>b.collageNumber), Array.from({length:50},(_,i)=>i+1));
  for (const original of approved.models) {
    const b=added.find(b=>b.id===approvedId(original));
    assert.ok(b);
    assert.ok(b.name);
    assert.deepEqual(Array.from(b.p),original.p);
    assert.equal(b.total, original.bricks);
    assert.equal(b.level, original.level);
    assert.equal(JSON.stringify(b.counts),JSON.stringify(original.counts));
    assert.equal(b.cat,original.group);
    assert.ok(context.categories.includes(original.group));
  }
  assert.equal(context.categories.filter(c=>c==='50 nye').length,1);
});

test('all approved motifs can be partitioned for two or three builders without losing or repeating bricks', () => {
  vm.runInContext(script.match(/function splitRows\(b,weights\)\{[\s\S]*?\n\}/)[0], context);
  for (const original of approved.models) {
    const b=context.models.find(b=>b.id===approvedId(original));
    for (const weights of [[1,1],[1,1,1],[1,.55],[1,1,.55]]) {
      const parts=context.splitRows(b,weights);
      assert.equal(parts.length,weights.length);
      assert.equal(parts[0].r0,0);
      assert.equal(parts[parts.length-1].r1,b.p.length-1);
      parts.forEach((p,i)=>{assert.ok(p.r1>=p.r0);if(i)assert.equal(p.r0,parts[i-1].r1+1)});
      const assigned=parts.flatMap(p=>b.tiles.filter(t=>t.row>=p.r0&&t.row<=p.r1));
      assert.equal(assigned.length,b.total);
      assert.equal(new Set(assigned.map(t=>`${t.x},${t.y}`)).size,b.total);
    }
  }
});

 test('all 20 approved animals preserve the reviewed patterns and counts', () => {
  assert.equal(animals.models.length,20);
  assert.equal(context.models.filter(b=>b.collection==='dyr-20').length,20);
  for(const original of animals.models){
    const b=context.models.find(b=>b.id===original.id);
    assert.equal(b.cat,'Dyr');assert.ok(b.name);
    assert.equal(JSON.stringify(b.p),JSON.stringify(original.p));
    assert.equal(b.total,original.bricks);
  }
});

test('all 40 Halloween guides preserve approved patterns and have their own category', () => {
 assert.equal(halloween.models.length,40);
 assert.equal(context.categories.filter(c=>c==='Halloween').length,1);
 assert.equal(context.models.filter(b=>b.cat==='Halloween').length,40);
 for(const original of halloween.models){
  const b=context.models.find(b=>b.id===original.id);
  assert.equal(b.cat,'Halloween');assert.ok(b.name);
  assert.equal(JSON.stringify(b.p),JSON.stringify(original.p));
  assert.equal(b.total,original.bricks);
 }
});

test('approved revised selection retains exactly 6 cars and 14 logos with original patterns and counts', () => {
 assert.equal(carsAndLogos.models.length,20);
 assert.equal(context.categories.filter(c=>c==='Billogoer').length,1);
 const added=context.models.filter(b=>b.collection==='biler-og-logoer-20');
 assert.equal(added.length,20);
 assert.equal(added.filter(b=>b.cat==='Køretøjer').length,6);
 assert.equal(added.filter(b=>b.cat==='Billogoer').length,14);
 for(const original of carsAndLogos.models){
  const b=added.find(b=>b.id===original.id);
  assert.ok(b);assert.equal(b.cat,original.cat);assert.ok(b.name);
  assert.equal(JSON.stringify(b.p),JSON.stringify(original.p));
  assert.equal(b.total,original.bricks);
 }
 for(const name of ['Ferrari','Lamborghini','Porsche','McLaren']){
  assert.ok(added.some(b=>b.name===name && b.cat==='Billogoer'));
 }
});

 test('62 approved additions preserve reviewed patterns, four categories and all seventeen international crests',()=>{
 const added=context.models.filter(b=>b.collection==='temaer-62');assert.equal(added.length,62);
 for(const [cat,n] of [['Skibe',15],['Blomster',15],['Eksotiske dyr',15],['Klublogoer',17]]){
  assert.equal(added.filter(b=>b.cat===cat).length,n);assert.equal(context.categories.filter(c=>c===cat).length,1);
 }
 for(const m of themes62.models){const b=added.find(b=>b.id===m.id);assert.ok(b);assert.ok(b.name);assert.equal(JSON.stringify(b.p),JSON.stringify(m.p));assert.equal(b.total,m.bricks)}
 const clubs=added.filter(b=>b.cat==='Klublogoer');
 for(const name of ['Ajax','FC Porto','Manchester City','Tottenham Hotspur'])assert.ok(clubs.some(b=>b.name===name));
 assert.ok(!clubs.some(b=>['AaB','OB','AGF','Brøndby IF','F.C. København'].includes(b.name)));
 const titanic=added.find(b=>b.name==='Titanic');assert.equal(titanic.total,168);assert.equal([...titanic.p[0]].filter(c=>c==='K').length,4);
 });
