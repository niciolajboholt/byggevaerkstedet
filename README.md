# Byggeværkstedet

Plus-plus building guides for Jens and Alfred. A single static page (`index.html`):
original models, row-by-row instructions, and a 2D builder whose models are stored
in the browser (localStorage) on each device.

Hosted as a static site. To add models, edit the `BUILDS` array in `index.html`.

## Seks figurvejledninger

De seks nye modeller ligger først i kataloget og under **Figurer**. De bruger
beskrivende navne uden figurnavne, bogstaver eller logoer. Hver vejledning har en
kort beskrivelse, byggetip, farveopdelt brikliste og trin for hver række.

| Model | Brikker | Rækker | Farver |
| --- | ---: | ---: | ---: |
| Helten med rød kasket | 136 | 17 | 7 |
| Makkeren med grøn kasket | 119 | 19 | 7 |
| Prinsessen med gyldent hår | 184 | 20 | 8 |
| Den grønne ven med store sko | 140 | 18 | 5 |
| Kongen med det piggede skjold | 221 | 19 | 7 |
| Den lille ven med svampehat | 161 | 18 | 7 |

Alle seks bruger appens eksisterende Plus-Plus-geometri med skiftevis vandrette
og lodrette brikker. Testene kontrollerer hele brikker, ingen geometriske overlap,
sammenhængende modeller, gyldige farver, entydige ID'er, præcise briklister og
rækkernes instruktioner. Modellerne er digitalt kontrolleret, ikke fysisk prøvebygget.

Kør kontrollen uden at installere pakker:

```sh
node --test tests/character-guides.test.cjs
```

## Temaer og filtrering

Tre særskilte kategorier samler yderligere 20 vejledninger:

| Filter | Indhold | Antal vejledninger |
| --- | --- | ---: |
| Magi | Tre troldmandselever, postugle, talende hat, gylden vingebold, borg og flyvekost | 8 |
| Pokémon | Gul lynmus, ildfirben, vandskildpadde, frøvæsen, fangebold og brun ræv | 6 |
| Minecraft | Grønt blokmonster, blokbygger, blokgris, diamantsværd, diamanthakke og græsblok | 6 |

Tryk på et tema over kataloget. Søgefeltet og sværhedsfilteret kan bruges sammen
med det valgte tema. Modellerne findes også under **Alle** og kan likes som de
øvrige vejledninger. Beskrivende modelnavne er bevaret.

Alle 20 har beskrivelse, byggetip, rækkevejledning og automatisk optalt brikliste.
De digitale kontroller omfatter også kategoriernes præcise indhold og de seks
første figurmodeller. Modellerne er ikke fysisk prøvebygget.

## Fire kollegieskjolde

Under **Magi** findes fire kompakte skjolde uden tekst:

| Model | Farver og motiv | Brikker |
| --- | --- | ---: |
| Løvens våbenskjold | Rød/gul firedeling og en hel oprejst løve | 237 |
| Slangens kollegieskjold | Grøn og sølvgrå, slange | 237 |
| Ørnens kollegieskjold | Blå og bronze (brun), ørn | 237 |
| Grævlingens kollegieskjold | Gul og sort, grævling | 237 |

Alle fire er 17 × 19 brikfelter og har rækkevejledning, brikliste og byggetip.
Løveskjoldet er forenklet efter brugerens reference med hele løven og firedelingen.
Hjelm, bånd og ydre ornamenter er udeladt for at overholde brikgrænsen.
De samme model-ID'er bevarer links og likes. Magi indeholder 12 modeller.
Skjoldene er stiliserede Plus-Plus-fortolkninger og er ikke fysisk prøvebygget.

Genskab skjoldene med `python3 scripts/generate-house-guides.py` uden eksterne
pakker. Scriptet kontrollerer størrelsen, før det erstatter de fire modeller.

## Maksimum 250 brikker

Alle katalogets vejledninger må bruge højst **250 brikker**. Testpakken kontrollerer
samtlige modeller i `BUILDS`, også de oprindelige, og fejler ved en overskridelse.
Brikgrænsen gælder de medfølgende vejledninger; egne tegninger i 2D-editoren
bevarer deres eksisterende funktionalitet.

## De 50 godkendte kollagemotiver

De 50 motiver fra kollagen er lagt først i kataloget. Filteret **50 nye** samler
dem, og hvert kort og hver vejledning viser det oprindelige motivnummer 01–50.
Søg på et navn eller et tocifret motivnummer, fx `01` eller `47`.

- Tegninger, navne, farver, brikantal og sværhedsgrader matcher den godkendte kollage.
- 15 lette, 15 mellem og 20 svære modeller, på 30–199 brikker.
- Ti temaer: Magi, Minecraft, Pokémon, Platformspil, Dyr, Fantasi, Køretøjer,
  Rum og robotter, Natur og eventyr, Leg og hygge.
- Alle har brikliste, motivbeskrivelse og rækkevejledning og kan også bruges med
  **Byg sammen** med to eller tre byggere.

`data/approved-motifs-50.json` bevarer kollagens datagrundlag til kontrol af, at
appens brikmønstre og numre følger det godkendte oplæg. Testene sammenligner alle
50 modeller med dette grundlag og kontrollerer også brikfordelingen i Byg sammen.
De oprindelige modeller, links og gemte egne tegninger er bevaret.

## Ny designprøve — afventer visuel kontrol

Branchen `design/family-preview` indeholder den godkendte retning med farverig
børnevisning og rolig forældrevisning. Skiftet gemmes lokalt med `bv_appearance`.
Motiver åbner først en forberedelsesside med hele figuren, brikliste og valg mellem
alene/sammen. Under byggeri er rækkeknapperne fast placeret, og hver bygger ser sin
egen del i stor størrelse med adgang til hele figuren. Eksisterende model-ID'er,
mønstre, likes, egne tegninger og fordeling på separate enheder bevares.

Appen er fortsat statisk. `app.css` og `assets/icons/` skal udgives sammen med
`index.html`. Phosphor-ikonerne distribueres under MIT-licensen i
`assets/icons/LICENSE`. De eksisterende modeltegninger genereres fra de præcise
Plus-Plus-data, ikke fra billederne i designforslagene.

Lokal afprøvning:

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 4173 --strictPort
```

Rodadressen åbner `preview.html`, hvor mobil, iPad og stor skærm kan vælges.
`index.html` er selve appen uden prøverammen. `preview.html` er ikke en ny
produktionsforside. Appen har ingen runtime-afhængighed af npm eller Node.

`npm test` kører katalogtestene og seks forløbstest med jsdom. Canvas er stubbet i
forløbstestene; de erstatter ikke visuel browserkontrol. Se `design-qa.md` for den
konkrete previewblokering. **Ingen merge eller produktionsudgivelse er udført.**
