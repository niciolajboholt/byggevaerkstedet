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
