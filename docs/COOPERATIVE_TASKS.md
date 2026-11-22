# Byg sammen: små opgaver på skift

## Leveret 22. november 2026

Forsiden viser seks kompakte kategorier: Dyr, Magi, Køretøjer, Billogoer,
Pokémon og Minecraft. Alle temaer viser alle aktuelle, ikke-tomme kategorier.
Søgning, brikgrænse og sværhedsgrad bruger fortsat katalogets fælles filtre.

På en fælles iPad består hver tur af at gøre et lille stykke klar og dernæst
bekræfte dets placering på den samlede model. Først derefter skifter byggeren.
Normalt er et stykke én række. Ved mindre opgaver til en valgt bygger kan en
række deles over flere ture. De absolutte koordinater og vandret/lodret
brikretning bevares, også når et stykke vises isoleret.

Rækker med mellemrum må ikke fremstilles som ét fysisk sammenhængende stykke.
De vises som brikker, der lægges på deres viste pladser; efterfølgende rækker
kan forbinde dem. Samlingens styrke er ikke fysisk prøvebygget.

Fortryd trin går fra klar tilbage til bygning, eller fra en ny tur tilbage til
forrige stykkes placering. Gemte forløb adskilles efter motiv, geometri,
navnerækkefølge, antal byggere og valgt opgavefordeling. Det gamle lager med
personlige større dele bevares separat. Eksisterende v1-delingslinks og den
avancerede visning til en bestemt bygger anvender fortsat det tidligere flow.
Det fremgår i opsætningen, at der endnu ikke er live synkronisering.

## Filer

- `build-tasks.js`: ren, deterministisk opgavemotor til browser og Node.
- `cooperative.js` / `.css`: fælles iPad, materialer, placering og turskift.
- `categories.js` / `.css`: kategorikort og tilgængelig temaoversigt.
- `index.html`: integration og eksisterende katalog/enkeltbyggeri/deling.

## Datakontrakt til næste etape

`BuildTasks.createPlan(pattern, {builderCount, smallest})` producerer samme
plan på alle enheder. Planen har versionsnummer, signatur, stabilt id,
opgaver med ejerindeks, afhængigheder, brikker og farveantal samt total pr.
bygger. Opgave-ejere refererer til en låst, fælles navnerækkefølge.

`createSession`, `markReady`, `attach`, `undo` og `restoreSession` ejer de
validerede tilstandsovergange. En lokal session har `index` og `stage`:
`building`, `ready` eller `done`. Alle opgaver før `index` er sat på. Den
næste opgave kan kun sættes på efter bekræftelsen klar.

Denne kontrakt er ikke i sig selv en synkroniseringsserver. Fase 2 skal
oprette en fælles session med låst plan og enhedsrolle. Enheder kan forberede
næste egne opgaver parallelt, mens påsætningen fortsat følger afhængighederne.

Foreslåede serverkommandoer: markér opgave klar, bekræft påsætning og fortryd
seneste påsætning. Hver kommando skal indeholde sessionsrevision og et unikt
kommando-id. Serveren skal afvise forkerte ejere/planer, deduplikere gentagelser
og sikre én autoritativ rækkefølge. En genforbundet enhed henter hele den
aktuelle session, før den sender gamle ændringer. Fremtidige opgaver i gang
må ikke blive nulstillet, når en anden bygger sætter et stykke på.

Hold live synkronisering i en separat implementering og deployment. Denne
leverance opretter ingen backendressourcer, konti eller betalingsaftaler.

## Verifikation

Automatiske tests dækker hele katalogets geometri og alle 2-/3-personers
kombinationer med hver mulig modtager af mindre opgaver, samt turskift,
placering, fortryd, genindlæsning, filtre, kategorier og gamle delingslinks.
Canvas- og touchadfærd kræver også browserkontrol; jsdom erstatter ikke dette.

## Live synkronisering leveret 22. november 2026

Fra Byg sammen kan et fælles byggerum nu oprettes med **Byg på flere enheder**.
Værten er første bygger; de øvrige vælger en ledig rolle via QR eller link.
Hver enhed har sin egen kø og kan gøre næste stykke klar parallelt. Serveren
bekræfter påsætninger i modellens rækkefølge og sender fælles status til alle.

Den tidligere foreslåede backend er implementeret i `sync/`, klient og live-UI
i `live-sync-client.js` og `live-sync-ui.js`. QR-koder laves lokalt med den
MIT-licenserede generator i `vendor/`; invitationslinket sendes ikke til en
QR-tjeneste. Brugerfladen på én iPad og eksisterende v1-links er bevaret.

Et byggerum udløber 24 timer efter oprettelsen. Deltageradgang gemmes lokalt,
separat pr. rum og bygger; aktiv rolle er separat pr. browserfane. Gemte tokens
kan genoptage en optaget rolle efter genindlæsning, men invitationen alene kan
ikke overtage den. En deltager kan vælge Skift bygger og fortsætte med en anden
gemt eller ledig rolle. Mistet lokal adgang kan kræve et nyt byggerum.

Forbindelsesbrud markerer tilstanden tydeligt. Ukendte udfald af en handling
bliver ikke automatisk gentaget; klienten henter først serverens nyeste status.
WebSockets genoprettes med stigende ventetid og en rolig HTTP-fallback. Når en
iPad kommer i forgrunden, hentes status, og forbindelsen oprettes på ny.
Fortryd knyttes til den konkrete seneste samling; ændres byggeriet, mens
bekræftelsen er åben, skal brugeren tage stilling igen.

Backenddeploy og kildebundle er registreret i `sync/deployment.json`.
Cloudflare-kontoen er bekræftet på Free; ingen abonnementer eller andre
Workers er ændret. Workers Free sætter selv CPU-grænsen. WebSocket-opbevaring
bruger hibernation, og begrænsninger for oprettelser/handlinger er beskrevet i
`sync/README.md`. De almindelige Cloudflare-kvoter deles fortsat på kontoen.

### Verifikation og rollback

- Node-tests: katalog, lokal bygning, pure room logic, Worker/DO HTTP-harness,
  transport/reconnect og to isolerede UI-sessioner med forskellige lagre.
- Den reelle Cloudflare SQLite/RPC-tjeneste er testet med syntetisk model:
  privat adgang, samtidig rolleclaim, parallel klargøring, revisioner,
  samlerækkefølge, idempotens, fortryd, persistens, Origin og afslutning.
- `python3 scripts/test-live-service.py` gentager en afgrænset serverkontrol;
  den opretter et syntetisk byggerum og afslutter det igen.
- Browserkontrol af offentlig app: oprettelse, invitation, to byggerroller,
  WebSocket-status, opdateringer mellem faner, genindlæsning og afslutning.
  Dette erstatter ikke en fysisk prøve på familiens to iPads.
- Frontend kan rulles tilbage til commit `b00072d` uden at ændre det lokale
  Byg sammen. Undlad at slette Durable Object-navnerum ved en frontendrollback.
  Backenden kan blive stående, så eksisterende rum udløber normalt efter 24 timer.
