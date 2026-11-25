# Byggeværkstedet

Plus-plus building guides for Jens and Alfred. A single static page (`index.html`):
original models, row-by-row instructions, and a 2D builder whose models are stored
in the browser (localStorage) on each device.

Hosted as a static site. Motif names are loaded from **`data/navne.json`** (one name per line). Categories, descriptions and patterns are loaded from **`data/motiver.json`**. `index.html` contains the application UI and code.

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

## Brikgrænser

Katalogets vejledninger må bruge højst **250 brikker**, bortset fra **Klublogoer**, som må bruge op til **300 brikker**. Testpakken kontrollerer
samtlige modeller fra `data/motiver.json`, også de oprindelige, og fejler ved en overskridelse.
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

## Ny designprøve

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
npm run dev -- --port 4173
```

Rodadressen åbner `preview.html`, hvor mobil, iPad og stor skærm kan vælges.
`index.html` er selve appen uden prøverammen. `preview.html` er ikke en ny
produktionsforside. Appen har ingen runtime-afhængighed af npm eller Node.

`npm test` kører katalogtestene og otte forløbstest med jsdom. Canvas er stubbet i
forløbstestene; de erstatter ikke visuel browserkontrol. Browserkontrol på mobil- og iPad-størrelser er gennemført på den private
prøveadresse; se `design-qa.md` for evidens og afgrænsninger. **Ingen merge eller produktionsudgivelse er udført.**

Privat prøveadresse: https://byggevaerkstedet-designproeve.nicolajbach12.chatgpt.site/

## UX-rettelser, 21. november 2026

Designet ovenfor blev udgivet i PR #8. Den efterfølgende rettelsesrunde ligger
separat på `fix/ux-progress-and-sharing` og er endnu ikke udgivet.

- `bv_progress` gemmer byggefremskridt pr. motiv, præcis geometri, byggemåde og
  navngiven fordeling. Fortsæt gendanner rækkerne; Start forfra kræver bekræftelse.
  Fremskridt synkroniseres ikke mellem enheder.
- Størrelsesskift i tegneværktøjet advarer før beskæring. Fortryd gendanner både
  feltstørrelse og brikker. Der er endnu ingen automatisk tegningskladde.
- Katalogmotiver har ét delingslink pr. bygger under Flere skærme. Linket
  fastholder navnerækkefølge, fordeling og geometri. Ændringer kræver, at alle
  får nye links. Egne modeller bruges fortsat på den enhed, hvor de er gemt.
- Mobil har en fast Start/Fortsæt-knap. Tema- og samlingsvalg bevarer fokus.
  Tegnefeltet kan betjenes med piletaster, Enter/mellemrum og Delete.

Prøveserveren lytter kun på `127.0.0.1`. Den kan ikke åbnes fra en anden enhed.
105 tests bestod i rettelsesrunden. På værter, der blokerer Node-underprocesser,
kan de samme tests køres med `node --test --test-isolation=none tests/*.test.cjs`.
Se `docs/ux-fixes-2026-11-21.md` for browserkontrol og begrænsninger.

## 62 nye motiver

Den godkendte samling indeholder 15 skibe (inklusive Titanic med fire skorstene), 15 blomster, 15 eksotiske dyr og 17 internationale klublogoer. Ajax, FC Porto, Manchester City og Tottenham er alle med. Mønstre og brikantal bevares i `data/approved-themes-62.json`. De fire kategorier findes på forsiden og under Filtre.

## Ret navne nemt

Åbn **[data/navne.json](data/navne.json)** på GitHub og vælg blyanten. Filen indeholder kun 270 navne, ét pr. linje, sorteret efter navn. Ret teksten til højre og gem med Commit changes:

```json
"tema62-titanic": "Titanic"
```

Behold nøglen til venstre (motivets ID), anførselstegn og kommaer. Appen kobler automatisk navnene til tegningerne. Favoritter, links og fremskridt bevares ved navneændringer. Opdatér siden efter udgivelsen for at hente de nye navne.

`data/motiver.json` indeholder kategorier, beskrivelser og brikmønstre uden en ekstra kopi af navnene. Her kan `cat`, `description`, `tip` og `p` redigeres. `categories` styrer rækkefølgen af temaerne, og nye kategorier i `cat` kommer automatisk med. Et nyt motiv skal have samme nye ID i begge filer.

`data/approved-*.json` er historiske gennemgangsdata til kontrol af mønstre og brikantal; de skal ikke rettes ved almindelige navneændringer.

`catalogue.js` indlæser og validerer de to filer parallelt og genvaliderer browserens cache. Ved en ugyldig eller manglende fil viser appen en fejlbesked med Prøv igen. Brugerens gemte data slettes ikke.

## Tre sværhedsgrader pr. motiv

Alle 270 katalogmotiver har `variants.easy.p`, `variants.medium.p` og `variants.hard.p` i `data/motiver.json`: 810 byggevejledninger i alt. Let bruger 1–59 brikker, Mellem 60–84 og Svær 85–250 (op til 300 for Klublogoer). Navnefilen indeholder stadig kun 270 navne, da udgaverne deler navn og stabilt motiv-ID.

Vælg udgaven under Vælg sværhedsgrad før byggeriet. Kort og søgefiltre viser fortsat ét kort pr. motiv; et sværhedsfilter viser den tilsvarende udgave. Et rent brikloft beholder den oprindelige udgave, hvis den passer, ellers den største udgave under loftet.

Delingslinks med `?level=easy`, `?level=medium` eller `?level=hard` fastholder udgaven. Links uden level åbner det oprindelige motiv. Favoritter er fælles for udgaverne; gemt fremdrift bruger både ID og brikmønster, så de tre udgaver har separate fremskridt. Et live byggerum fastholder altid det mønster, det blev oprettet med.

De nye mønstre er skabt ud fra originalernes silhuetter og farver med deterministisk skalering, forenkling og bevarelse af små farvedetaljer. De er visuelt gennemgået på sammenligningsplancher og kontrolleret for brikantal, overlap, sammenhæng og opgavefordeling. De er ikke fysisk prøvebygget. Fire ældre originaler (sol, blomst, sommerfugl og dinosaur) har fået små forbindelser, fordi de tidligere havde løse dele. De øvrige 246 originalmønstre er bevaret præcist.

Generator: `python scripts/generate-difficulty-variants.py --review-dir /tmp/variant-review`. `--check` kontrollerer, at de lagrede udgaver svarer til generatoren. Ved ændring af et originalt mønster skal de tre udgaver regenereres; ved en navneændring er det fortsat nok at rette `data/navne.json`.

## Undersøg motivet i 3D

Knappen **Se motivet i 3D** åbner en drejelig visning af det valgte motiv og den valgte sværhedsgrad. Hver brik bruger den samme sammenhængende ni-felts Plus-Plus-kontur og retning som 2D-vejledningen, med en lille plasttykkelse og afrundede kanter. Motiverne forbliver flade mosaikker; de er ikke ombygget til rumlige skibe, dyr eller bygninger.

Træk med én finger for at dreje og knib med to for at zoome. Knapperne Forfra, Skråt og zoom gør de samme funktioner tilgængelige uden berøringsbevægelser. Luk eller Escape vender tilbage til det samme byggetrin. Scenen lukkes også ved navigation eller baggrundslægning. Uden WebGL2 bruges Three.js’ SVGRenderer som softwarebaseret 3D-visning med de samme brikker og betjening. Ved afbrudt indlæsning eller tabt grafikforbindelse vises den almindelige fronttegning med mulighed for at prøve igen.

Three.js 0.187.0 og OrbitControls ligger i den lokale, færdigbyggede `vendor/three-viewer.js`, som først indlæses ved åbning af 3D-vinduet. Ingen ekstern CDN bruges. Der tegnes ved ændringer og ikke i en permanent animationsløkke; pixelratio begrænses til 2. Grafikressourcer, controls, observationslyttere og WebGL-kontekst frigives ved lukning.

Kildekode: `three/renderer.js`, `three/brick-geometry.cjs` og `model-3d.js`. Genbyg med `npm ci --ignore-scripts` og `npm run build:3d`; den færdige bundle skal committes sammen med kilden. MIT-licensen for Three.js findes i `vendor/three.LICENSE`.

### Messi og CR7

20 approved football motifs (10 Messi and 10 Cristiano Ronaldo) are grouped under **Messi og CR7**, including a featured theme tile. The selected original patterns are preserved exactly; every motif also supports the existing three difficulty levels, solo/cooperative guides and 3D inspection.

### Connected solo assembly steps

`assembly-steps.js` splits each row into contiguous pieces and defers a piece until it touches the existing assembly. The solo guide highlights only that piece and labels both its step and source row. All 810 catalogue variants are checked for connected pieces, attachable prefixes, original orientation and complete coverage. Disconnected custom drawings explicitly start separate sections.

Solo progress uses `connected-solo-v1` so an earlier row index cannot skip pieces in the new order. Earlier records remain untouched and setup explains why the revised guide starts from step one. Shared-iPad and live-room task protocols remain compatible with their existing plans.
