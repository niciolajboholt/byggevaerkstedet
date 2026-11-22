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
