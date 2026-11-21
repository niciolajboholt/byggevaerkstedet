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

Under **Magi** findes nu også fire stiliserede skjolde uden tekst:

| Model | Farver og motiv | Brikker |
| --- | --- | ---: |
| Løvens våbenskjold | Rød/gul firedeling, hel oprejst løve, hjelm og løvværk | 1525 |
| Slangens kollegieskjold | Grøn og sølvgrå, slange | 338 |
| Ørnens kollegieskjold | Blå og bronze (brun), ørn | 338 |
| Grævlingens kollegieskjold | Gul og sort, grævling | 338 |

Slange-, ørne- og grævlingskjoldene er 19 × 22 brikfelter. Løveskjoldet er
omtegnet efter brugerens reference og er 49 × 56 felter. Alle har rækkevejledning,
brikliste og byggetip. Store modeller kan forstørres 2× og 3× med rulning i tegningen.
Magi-filteret indeholder dermed 12 modeller. Skjoldene er tilpasset brikkernes
geometri og er ikke nøjagtige gengivelser af officielle våbenskjolde.

Løveskjoldet bevarer samme ID (`loeveskjold`), så eksisterende links og likes
fortsat virker. Referencebilledet bruges som visuelt grundlag; appen indeholder
en selvstændig briktegning, ikke en indlejret kopi af billedet. Båndet er uden tekst.

Den geometriske tegning kan genskabes med `python3 scripts/generate-lion-guide.py`
(kræver Pillow). Scriptet ændrer kun løvemodellen og tilføjer de nødvendige farver,
hvis de mangler. Zoom bevarer det aktuelle byggetrin.
